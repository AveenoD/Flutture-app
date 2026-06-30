"use client";

import React, { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LeadProfileCard,
  RemarksSection,
  ActivityFeed,
  Tabs,
  Button,
  Drawer,
  SkeletonLoader,
  EmptyState,
  DownloadCard,
} from "@/components/ui";
import type { LeadProfile } from "@/components/ui/cards/LeadProfileCard";
import type { Remark } from "@/components/ui/sections/RemarksSection";
import type { Document } from "@/components/ui/cards/DownloadCard";
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Home,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useLeadStore } from "@/contexts/LeadContext";

type Payment = {
  id: string;
  type: "booking-amount" | "down-payment" | "installment" | "final-payment";
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: "pending" | "paid" | "overdue";
  method?: string;
};

type BookingStatus = "draft" | "confirmed" | "completed" | "cancelled";

const INITIAL_BOOKING = {
  bookingId: "BK-2024-001",
  project: "Maaz Palace",
  unit: "Wing A, Flat 701, 7th Floor",
  config: "2BHK",
  carpetArea: 865,
  finalPrice: 56_900_000,
  bookingDate: "Today",
  status: "confirmed" as BookingStatus,
};

const SAMPLE_DOCUMENTS: Document[] = [
  {
    id: "1",
    name: "Booking Agreement.pdf",
    type: "agreement",
    uploadedAt: "Today, 11:30 AM",
    size: "2.4 MB",
    status: "verified",
  },
  {
    id: "2",
    name: "Aadhar Card - Rajesh Kumar.pdf",
    type: "id-proof",
    uploadedAt: "Today, 11:35 AM",
    size: "1.2 MB",
    status: "verified",
  },
  {
    id: "3",
    name: "Booking Amount Receipt.pdf",
    type: "payment-receipt",
    uploadedAt: "Today, 11:40 AM",
    size: "856 KB",
    status: "uploaded",
  },
];

const SAMPLE_PAYMENTS: Payment[] = [
  {
    id: "1",
    type: "booking-amount",
    amount: 2_000_000,
    dueDate: "Today",
    paidDate: "Today, 11:45 AM",
    status: "paid",
    method: "Bank Transfer",
  },
  {
    id: "2",
    type: "down-payment",
    amount: 5_000_000,
    dueDate: "15 days from today",
    status: "pending",
  },
  {
    id: "3",
    type: "installment",
    amount: 10_000_000,
    dueDate: "30 days from today",
    status: "pending",
  },
];

const COMPLETE_JOURNEY = [
  {
    id: "qualification",
    type: "lead" as const,
    title: "Qualification Completed",
    description: "Lead qualified and moved to communication stage.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    badge: "Qualified",
  },
  {
    id: "communication-1",
    type: "call" as const,
    title: "Initial Call",
    description: "Discussed budget and property preferences. Very interested in 2BHK.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
    badge: "02:15",
  },
  {
    id: "site-visit-1",
    type: "visit" as const,
    title: "First Visit - Maaz Palace",
    description: "Customer liked location and connectivity. Parking appreciated.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    badge: "Completed",
  },
  {
    id: "negotiation-1",
    type: "quotation" as const,
    title: "Price Negotiation",
    description: "Final all-inclusive price agreed: ₹56.9L after festive discount.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    badge: "Locked",
  },
  {
    id: "booking",
    type: "booking" as const,
    title: "Booking Confirmed",
    description: "Booking amount paid. Agreement signed. Booking ID: BK-2024-001",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
    badge: "Confirmed",
  },
];

const BOOKING_REMARK_SUGGESTIONS = [
  "Customer wants possession within 6 months.",
  "All documents verified and payment received.",
  "Customer requested staggered payment plan.",
  "Handover date confirmed with customer.",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

function BookingOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "1";
  const { getLeadById } = useLeadStore();

  const [lead, setLead] = useState<LeadProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [booking, setBooking] = useState(INITIAL_BOOKING);
  const [completeJourney, setCompleteJourney] = useState(COMPLETE_JOURNEY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("documents");
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] =
    useState<Document["type"]>("other");

  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setIsLoading(true);

        const storedLead = getLeadById(leadId);
        if (!storedLead) {
          setLead(null);
          setBooking(INITIAL_BOOKING);
          setDocuments([]);
          setPayments([]);
          setRemarks([]);
          setCompleteJourney(COMPLETE_JOURNEY);
          return;
        }

        const mappedLead: LeadProfile = {
          id: storedLead.id,
          name: storedLead.name,
          phone: storedLead.phone,
          email: storedLead.email,
          status: storedLead.status,
          source: storedLead.source,
          location: "—",
          budgetLabel:
            storedLead.budgetMin && storedLead.budgetMax
              ? `₹${(storedLead.budgetMin / 100000).toFixed(1)}L – ₹${(
                  storedLead.budgetMax / 100000
                ).toFixed(1)}L`
              : undefined,
          priority: storedLead.priority ?? "medium",
        };

        setLead(mappedLead);
        setBooking(INITIAL_BOOKING);
        setDocuments(SAMPLE_DOCUMENTS);
        setPayments(SAMPLE_PAYMENTS);
        setRemarks([]);
        setCompleteJourney(COMPLETE_JOURNEY);
      } catch (error) {
        console.error("Error fetching booking data:", error);
        toast.error("Failed to load booking data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadData();
  }, [leadId, getLeadById]);

  const tabs = [
    { id: "documents", label: "Documents", count: documents.length },
    {
      id: "payments",
      label: "Payments",
      count: payments.filter((p) => p.status === "pending").length,
    },
    { id: "journey", label: "Complete Journey" },
  ];

  const paymentSummary = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const paid = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = total - paid;
    return { total, paid, pending };
  }, [payments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const validTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

    const invalidFiles: string[] = [];
    Array.from(files).forEach((file) => {
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!validTypes.includes(fileExtension)) {
        invalidFiles.push(file.name);
      }
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (exceeds 10MB)`);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`Invalid files: ${invalidFiles.join(", ")}`);
      return;
    }

    try {
      setIsUploading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newDocuments: Document[] = Array.from(files).map((file, index) => ({
        id: String(documents.length + index + 1),
        name: file.name,
        type: uploadDocumentType,
        uploadedAt: "Just now",
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        status: "uploaded" as const,
      }));

      setDocuments((prev) => [...newDocuments, ...prev]);
      toast.success(`${files.length} document(s) uploaded successfully`);
      setIsUploadDrawerOpen(false);
      setUploadDocumentType("other");
      e.target.value = "";
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleMarkCompleted = async () => {
    const bookingAmountPaid = payments.some(
      (p) => p.type === "booking-amount" && p.status === "paid"
    );
    if (!bookingAmountPaid) {
      toast.error(
        "Please ensure booking amount is paid before marking as completed"
      );
      return;
    }

    const hasAgreement = documents.some((d) => d.type === "agreement");
    if (!hasAgreement) {
      toast.error(
        "Please upload booking agreement before marking as completed"
      );
      return;
    }

    if (remarks.length === 0) {
      toast.error(
        "Please add at least one booking remark before marking as completed"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setBooking((prev) => ({ ...prev, status: "completed" as BookingStatus }));
      toast.success("Booking marked as completed successfully!");
    } catch (error) {
      console.error("Error marking booking as completed:", error);
      toast.error("Failed to mark booking as completed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      toast.info(`Downloading ${doc.name}...`);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document. Please try again.");
    }
  };

  const handleCloseUploadDrawer = () => {
    setIsUploadDrawerOpen(false);
    setUploadDocumentType("other");
  };

  const getPaymentTypeLabel = (type: Payment["type"]) => {
    const labels: Record<Payment["type"], string> = {
      "booking-amount": "Booking Amount",
      "down-payment": "Down Payment",
      installment: "Installment",
      "final-payment": "Final Payment",
    };
    return labels[type];
  };

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <SkeletonLoader type="card" height="8rem" />
        <SkeletonLoader type="card" height="10rem" />
        <div className="space-y-4">
          <SkeletonLoader type="card" height="20rem" />
          <SkeletonLoader type="card" height="15rem" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <EmptyState
        variant="no-data"
        title="Lead not found"
        description="The lead you're looking for doesn't exist or has been removed."
        action={{
          label: "Back to Lead List",
          onClick: () => router.push("/caller/lead-list"),
        }}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section>
        <LeadProfileCard lead={lead} variant="detailed" />
      </section>

      <section>
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full">
              <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Booking Confirmed
                </h2>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-700 whitespace-nowrap">
                  {booking.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-slate-500 mb-0.5 sm:mb-1">
                    Booking ID
                  </div>
                  <div className="font-semibold text-slate-900 break-words">
                    {booking.bookingId}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5 sm:mb-1">
                    Project / Unit
                  </div>
                  <div className="font-semibold text-slate-900 break-words">
                    {booking.project} – {booking.unit}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5 sm:mb-1">
                    Final Price
                  </div>
                  <div className="font-semibold text-emerald-600 break-words">
                    {formatCurrency(booking.finalPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-0.5 sm:mb-1">
                    Booking Date
                  </div>
                  <div className="font-semibold text-slate-900 break-words">
                    {booking.bookingDate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="default"
          className="mb-4"
        />

        {activeTab === "documents" && (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="primary"
                onClick={() => setIsUploadDrawerOpen(true)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Upload className="w-4 h-4" />
                <span className="whitespace-nowrap">Upload Document</span>
              </Button>
            </div>

            <DownloadCard
              documents={documents}
              onDownload={handleDownloadDocument}
              title="Uploaded Documents"
              emptyMessage="No documents uploaded yet. Use Upload Document to add files."
            />
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-4 sm:space-y-5">
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Payment Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-slate-300 mb-1">Total Amount</div>
                  <div className="text-base sm:text-lg font-bold break-words">
                    {formatCurrency(paymentSummary.total)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-300 mb-1">Paid</div>
                  <div className="text-base sm:text-lg font-bold text-emerald-400 break-words">
                    {formatCurrency(paymentSummary.paid)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-300 mb-1">Pending</div>
                  <div className="text-base sm:text-lg font-bold text-orange-400 break-words">
                    {formatCurrency(paymentSummary.pending)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4">
                Payment Schedule
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors gap-3"
                  >
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900">
                          {getPaymentTypeLabel(payment.type)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                            payment.status === "paid"
                              ? "bg-emerald-50 text-emerald-600"
                              : payment.status === "overdue"
                              ? "bg-red-50 text-red-600"
                              : "bg-orange-50 text-orange-600"
                          }`}
                        >
                          {payment.status === "paid"
                            ? "Paid"
                            : payment.status === "overdue"
                            ? "Overdue"
                            : "Pending"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-500">
                        <span className="font-semibold text-slate-700 whitespace-nowrap">
                          {formatCurrency(payment.amount)}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="whitespace-nowrap">
                          Due: {payment.dueDate}
                        </span>
                        {payment.paidDate && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="whitespace-nowrap">
                              Paid: {payment.paidDate}
                            </span>
                          </>
                        )}
                        {payment.method && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="whitespace-nowrap">
                              via {payment.method}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "journey" && (
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm">
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <Home className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              Complete Lead Journey
            </h3>
            <ActivityFeed
              title=""
              activities={completeJourney}
              maxItems={20}
              showViewMore={false}
              className="bg-transparent shadow-none p-0"
            />
          </div>
        )}
      </section>

      <section>
        <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
          <RemarksSection
            title="Booking Remarks"
            initialRemarks={remarks}
            suggestions={BOOKING_REMARK_SUGGESTIONS}
            onChange={setRemarks}
            className="bg-transparent border-none p-0"
          />
        </div>
      </section>

      <section className="mt-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="text-xs sm:text-sm text-slate-500">
            Step 5 of 5: Booking – final confirmation, document upload, and
            payment tracking. Journey complete!
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
              onClick={() =>
                router.push(
                  `/caller/lead-list/lead-detail/negotiation/overview?leadId=${leadId}`
                )
              }
              disabled={isSubmitting}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Back to Negotiation
            </Button>
            <Button
              variant="primary"
              onClick={handleMarkCompleted}
              disabled={isSubmitting || booking.status === "completed"}
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : booking.status === "completed" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Completed
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      <Drawer
        title="Upload Document"
        open={isUploadDrawerOpen}
        onClose={handleCloseUploadDrawer}
      >
        <div className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Document Type
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
              value={uploadDocumentType}
              onChange={(e) =>
                setUploadDocumentType(e.target.value as Document["type"])
              }
            >
              <option value="agreement">Booking Agreement</option>
              <option value="id-proof">ID Proof</option>
              <option value="address-proof">Address Proof</option>
              <option value="payment-receipt">Payment Receipt</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Select File(s)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 sm:p-8 text-center hover:border-[var(--primary-base)] transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center gap-2 ${
                  isUploading
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                {isUploading ? (
                  <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                )}
                <div className="text-xs sm:text-sm text-slate-600">
                  {isUploading ? (
                    <span className="font-semibold">Uploading...</span>
                  ) : (
                    <>
                      <span className="font-semibold text-[var(--primary-base)]">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </>
                  )}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500">
                  PDF, JPG, PNG, DOC (Max 10MB per file)
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-slate-600"
              onClick={handleCloseUploadDrawer}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default function BookingOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 sm:space-y-8">
          <SkeletonLoader type="card" height="8rem" />
          <SkeletonLoader type="card" height="10rem" />
          <div className="space-y-4">
            <SkeletonLoader type="card" height="20rem" />
            <SkeletonLoader type="card" height="15rem" />
          </div>
        </div>
      }
    >
      <BookingOverviewContent />
    </Suspense>
  );
}
