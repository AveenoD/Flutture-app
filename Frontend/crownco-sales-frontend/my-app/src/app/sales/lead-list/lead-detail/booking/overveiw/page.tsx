"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  type RefObject,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Phone,
  ChatCircle,
  ShareNetwork,
  CheckCircle,
  WarningCircle,
  X,
  Envelope,
  File,
  Plus,
  Info,
  PaperPlaneTilt,
  Microphone,
  Paperclip,
  Calendar,
} from "phosphor-react";
import { DataCard } from "../../../../../../components/ui/card/dataCard";
import { StatusType } from "../../../../../../components/ui/badges";
import { PriceBreakdownCard, PriceBreakdownItem } from "../../../../../../components/ui/card/priceBreakdownCard";
import { RemarksSection } from "../../../../../../components/ui/remarksSection";
import { DataTable, Column } from "../../../../../../components/ui/dataTabel";
import { Download, Trash, ArrowClockwise } from "phosphor-react";
import { apiFetch } from "../../../../../../lib/apiClient";
import {
  deleteBookingDocument,
  listBookingDocuments,
  uploadBookingDocumentToB2,
  type BookingDocumentRow,
} from "../../../../../../lib/bookingDocuments";
import { useAppSelector } from "../../../../../../store/hooks";
import { toast } from "sonner";
import { getLeadSummary, type LeadSummary } from "../../../../../../lib/leads";

type BookingDocumentTypeId =
  | "pancard"
  | "aadharcard"
  | "booking_agreement"
  | "passport_photo"
  | "electricity_bill"
  | "voter_id"
  | "driving_license"
  | "bank_passbook";

const bookingDocumentTypes: Array<{
  id: BookingDocumentTypeId;
  label: string;
}> = [
  { id: "aadharcard", label: "Aadhar Card" },
  { id: "pancard", label: "Pan Card" },
  { id: "booking_agreement", label: "Booking Agreement" },
  { id: "passport_photo", label: "Passport Size Photograph" },
  { id: "electricity_bill", label: "Electricity Bill" },
  { id: "voter_id", label: "Voter ID" },
  { id: "driving_license", label: "Driving License" },
  { id: "bank_passbook", label: "Bank Passbook" },
];

// 5/total is shown in the UI mock; remaining docs are optional.
const requiredBookingDocumentTypes: BookingDocumentTypeId[] = [
  "aadharcard",
  "pancard",
  "passport_photo",
  "booking_agreement",
  "electricity_bill",
];

function normalizeBookingDocType(t: string | undefined | null): string {
  return String(t ?? "")
    .trim()
    .toLowerCase();
}

interface FollowUpData {
  id: number;
  backendId?: string;
  fullName: string;
  avatar: string;
  date: string;
  time: string;
  status: "pending" | "completed" | "missed";
}

/** Approved quotation snapshot from list/detail API (snake_case JSON) */
type ApprovedQuotationSnapshot = {
  id: string;
  quotation_version: number;
  quotation_status: string;
  base_price?: number | null;
  parking_price?: number | null;
  infrastructure_cost?: number | null;
  development_charges?: number | null;
  water_charges?: number | null;
  mseb_charges?: number | null;
  legal_charges?: number | null;
  stamp_duty?: number | null;
  registration_fee?: number | null;
  gst?: number | null;
  vat?: number | null;
  one_time_maintenance?: number | null;
  discount_name?: string | null;
  discount_price?: number | null;
  customer_name?: string | null;
  customer_contact?: string | null;
  additional_charges?: Array<{ label?: string; amount?: number | null }>;
};

function pickNum(n: unknown): number {
  return typeof n === "number" && !Number.isNaN(n) ? n : 0;
}

/** Plain amount string for booking inputs (aligned with booking API numeric fields). */
function formatAmountForInputFromQuote(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return String(Math.round(n));
}

/** Sales UI dropdown labels → API `payment_mode` enum (Postgres). */
function mapSalesPaymentModeToApi(ui: string): string {
  const key = String(ui ?? "").trim();
  const map: Record<string, string> = {
    UPI: "upi",
    Cheque: "cheque",
    "Net Banking": "net_banking",
    DD: "dd",
  };
  return map[key] ?? "upi";
}

function formatInrBookingLine(amount: number): string {
  if (amount === 0) return "₹0";
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) {
    return `₹${(amount / 10_000_000).toLocaleString("en-IN", {
      maximumFractionDigits: 4,
    })} Cr`;
  }
  if (abs >= 100_000) {
    const L = amount / 100_000;
    return `₹${Number.isInteger(L) ? L.toFixed(0) : L.toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatBookingQuotationTotal(amount: number): string {
  const cr = amount / 10_000_000;
  if (cr >= 1) {
    return `₹${cr.toFixed(4)} Cr`;
  }
  if (amount >= 100_000) {
    const L = amount / 100_000;
    return `₹${L.toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getApprovedQuotationLineItems(q: ApprovedQuotationSnapshot) {
  const mainDefs: [string, number][] = [
    ["Base Price", pickNum(q.base_price)],
    ["Parking", pickNum(q.parking_price)],
    ["Infrastructure", pickNum(q.infrastructure_cost)],
    ["Development Charges", pickNum(q.development_charges)],
    ["Water Charges", pickNum(q.water_charges)],
    ["MSEB Charges", pickNum(q.mseb_charges)],
    ["Legal Charges", pickNum(q.legal_charges)],
    ["Stamp Duty", pickNum(q.stamp_duty)],
    ["Registration Fee", pickNum(q.registration_fee)],
    ["GST", pickNum(q.gst)],
    ["VAT", pickNum(q.vat)],
    ["One Time Maintenance", pickNum(q.one_time_maintenance)],
  ];

  const mainLines = mainDefs
    .filter(([, v]) => v !== 0)
    .map(([label, amount]) => ({ label, amount }));

  const rawAddl = Array.isArray(q.additional_charges) ? q.additional_charges : [];
  const addonLines = rawAddl
    .map((row) => ({
      label: String(row.label ?? "").trim() || "Charge",
      amount: pickNum(row.amount),
    }))
    .filter((r) => r.amount !== 0);

  const mainSum = mainLines.reduce((s, l) => s + l.amount, 0);
  const addonSum = addonLines.reduce((s, l) => s + l.amount, 0);
  const disc = pickNum(q.discount_price);
  const total = mainSum + addonSum - disc;

  return { mainLines, addonLines, total };
}

function pickApprovedFromList(list: unknown): ApprovedQuotationSnapshot | null {
  if (!Array.isArray(list)) return null;
  const approved: ApprovedQuotationSnapshot[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const q = raw as ApprovedQuotationSnapshot;
    if (String(q.quotation_status ?? "").toLowerCase() !== "approved") continue;
    if (q.id == null || q.id === "") continue;
    approved.push(q);
  }
  if (approved.length === 0) return null;
  return approved.reduce((best, cur) => {
    const v = Number(cur.quotation_version) || 0;
    const bv = Number(best.quotation_version) || 0;
    return v >= bv ? cur : best;
  }, approved[0]);
}

type ApprovedQuotationUiProps = {
  q: ApprovedQuotationSnapshot;
  projectLabel: string;
  customerName: string;
  customerPhone: string;
  /** main card vs share drawer */
  variant: "card" | "drawer";
};

function ApprovedQuotationUi({
  q,
  projectLabel,
  customerName,
  customerPhone,
  variant,
}: ApprovedQuotationUiProps) {
  const { mainLines, addonLines, total } = useMemo(
    () => getApprovedQuotationLineItems(q),
    [q]
  );
  const disc = pickNum(q.discount_price);
  const discountTitle =
    (q.discount_name && String(q.discount_name).trim()) || "Discount";

  const labelCls =
    variant === "card"
      ? "text-[15px] text-[#64748B]"
      : "text-sm text-[var(--sidebar-text-muted)] font-medium";
  const valueCls =
    variant === "card"
      ? "text-[15px] font-semibold text-[var(--foreground)]"
      : "text-sm text-[var(--foreground)] font-semibold";
  const rowPad = variant === "card" ? "py-2.5" : "py-2.5";

  const Row = ({
    label,
    value,
    valueClassName,
  }: {
    label: string;
    value: string;
    valueClassName?: string;
  }) => (
    <div
      className={`flex justify-between items-center ${rowPad} border-b border-[#f1f5f9]`}
    >
      <span className={labelCls}>{label}</span>
      <span className={valueClassName ?? valueCls}>{value}</span>
    </div>
  );

  return (
    <>
      {variant === "card" && (
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle
            size={28}
            weight="fill"
            className="text-green-600 shrink-0"
          />
          <span className="text-sm font-bold text-green-700 uppercase tracking-wide">
            Approved quotation
          </span>
        </div>
      )}
      <Row label="Quotation" value={`v${q.quotation_version ?? "—"}`} />
      <Row
        label="Project"
        value={projectLabel && projectLabel !== "—" ? projectLabel : "—"}
      />

      {mainLines.map((line) => (
        <Row
          key={line.label}
          label={line.label}
          value={formatInrBookingLine(line.amount)}
        />
      ))}
      {addonLines.map((line, i) => (
        <Row
          key={`${line.label}-${i}`}
          label={line.label}
          value={formatInrBookingLine(line.amount)}
        />
      ))}

      {disc > 0 && (
        <Row
          label={`Discount (${discountTitle})`}
          value={`- ${formatInrBookingLine(disc)}`}
          valueClassName={
            variant === "card"
              ? "text-[15px] font-semibold text-[var(--foreground)]"
              : "text-sm text-[var(--foreground)] font-semibold"
          }
        />
      )}

      <div
        className={
          variant === "card"
            ? "border-t border-slate-200 my-3"
            : "border-t border-[#f1f5f9] my-2"
        }
      />

      <div
        className={`flex justify-between items-center ${rowPad} border-b border-[#f1f5f9]`}
      >
        <span
          className={
            variant === "card"
              ? "text-base font-bold text-[var(--foreground)]"
              : "text-sm font-bold text-[var(--foreground)]"
          }
        >
          Total Price
        </span>
        <span
          className={
            variant === "card"
              ? "text-base font-bold text-[var(--primary-base)]"
              : "text-sm font-bold text-[var(--primary-base)]"
          }
        >
          {formatBookingQuotationTotal(total)}
        </span>
      </div>

      <div
        className={
          variant === "card"
            ? "border-t border-slate-200 my-3"
            : "border-t border-[#f1f5f9] my-2"
        }
      />

      <Row label="Customer" value={customerName || "—"} />
      <Row label="Phone" value={customerPhone || "—"} />
    </>
  );
}

export default function BookingOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const userType = useAppSelector((state) => state.auth.user?.user_type);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const effectiveUserType = hasMounted ? userType : undefined;
  const isSalesUser = effectiveUserType === "sales";
  const isManagerUser =
    effectiveUserType === "manager" ||
    effectiveUserType === "general-manager" ||
    (effectiveUserType as string | undefined) === "general_manager";
  /** Align with backend ListBookingDocuments (sales + manager + GM). */
  const canViewBookingDocuments =
    isSalesUser || isManagerUser;

  // Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "followups">("overview");
  
  // State management
  const [finalPrice, setFinalPrice] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [dateOfFirstToken, setDateOfFirstToken] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isEmiEnabled, setIsEmiEnabled] = useState(false);
  const [isEmiSectionVisible, setIsEmiSectionVisible] = useState(false);
  const [isExtraChargesEnabled, setIsExtraChargesEnabled] = useState(false);
  const [isExtraChargesSectionVisible, setIsExtraChargesSectionVisible] =
    useState(false);
  const [maintenanceCharges, setMaintenanceCharges] = useState("");
  const [legalCharges, setLegalCharges] = useState("");
  const [stampDuty, setStampDuty] = useState("");
  const [parking, setParking] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [monthlyEmi, setMonthlyEmi] = useState("");
  const [bankName, setBankName] = useState("");
  const [remarks, setRemarks] = useState<string[]>([]);
  const [newRemark, setNewRemark] = useState("");
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);
  const [isDocDrawerOpen, setIsDocDrawerOpen] = useState(false);
  /** Booking documents from API (B2 keys; list response includes presigned URLs when B2 is configured). */
  const [bookingServerDocs, setBookingServerDocs] = useState<
    BookingDocumentRow[]
  >([]);
  const [isBookingDocsLoading, setIsBookingDocsLoading] = useState(false);
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [selectedBookingDocumentTypeId, setSelectedBookingDocumentTypeId] =
    useState<BookingDocumentTypeId>("aadharcard");
  const [docRemark, setDocRemark] = useState("");

  // Follow-ups data
  const [followUpsData, setFollowUpsData] = useState<FollowUpData[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFollowUps, setSelectedFollowUps] = useState<number[]>([]);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  /** Mobile + desktop each render a file input; refs must be separate. */
  const bookingPaymentProofInputMobileRef = useRef<HTMLInputElement>(null);
  const bookingPaymentProofInputDesktopRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Lead data
  const [leadData, setLeadData] = useState({
    id: 1,
    name: "—",
    phone: "—",
    avatar: "/Avatar_images.png",
    budget: "—",
    propertyName: "—",
    timeAgo: "—",
    location: "—",
    status: "cold" as StatusType,
    source: "—",
  });

  // Remarks are stored on a lead_stage row. Sales can add remarks only on property_visit stage
  // (backend rule), while GM/Manager can add on booking stage.
  const [stageId, setStageId] = useState<string | null>(null);
  const [stageRemarksRaw, setStageRemarksRaw] = useState<string>("");

  const splitStageRemarksToBullets = (raw: string): string[] => {
    const normalized = raw ?? "";
    if (!normalized.trim()) return [];
    return normalized
      .split(/\r?\n+/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) =>
        r
          .replace(/^[-•\u2022]\s*/, "")
          .replace(/^\d+\.\s*/, "")
          .trim()
      );
  };

  // Load lead profile + booking follow-ups + stage remarks from backend.
  useEffect(() => {
    if (!leadId) return;

    const run = async () => {
      try {
        const summary: LeadSummary = await getLeadSummary(leadId);
        const lead = summary.lead;

        const budget =
          lead.budget_min != null && lead.budget_max != null
            ? `₹${lead.budget_min}L - ₹${lead.budget_max}L`
            : lead.budget_min != null
              ? `₹${lead.budget_min}L`
              : lead.budget_max != null
                ? `Up to ₹${lead.budget_max}L`
                : "N/A";

        const propertyName =
          summary.interested_property?.project_title ??
          lead.project_title ??
          "—";

        const timeAgo = lead.created_at
          ? new Date(lead.created_at).toLocaleString()
          : "—";

        setLeadData({
          id: 1,
          name: lead.name ?? "—",
          phone: lead.phone ?? "—",
          avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(
            lead.id ?? leadId
          )}`,
          budget,
          propertyName,
          timeAgo,
          location: lead.city ?? "—",
          status: (lead.lead_temperature as StatusType | null) ?? "cold",
          source: lead.source ?? "—",
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[BookingOverview] Failed to load lead profile", err);
      }
    };

    void run();
  }, [leadId]);

  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      try {
        const res = await apiFetch<any>(
          `/api/v1/leads/${encodeURIComponent(leadId)}/stages/by-type/booking`
        );
        const apiFollowUps: Array<any> = res.data?.follow_ups ?? [];

        const mapped = Array.isArray(apiFollowUps)
          ? apiFollowUps.map((f, index) => {
              const d = f.followup_date ? new Date(f.followup_date) : null;
              const dateStr = d ? d.toLocaleDateString() : "";
              const timeStr = d
                ? d.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              const statusRaw = (f.status || "").toLowerCase();
              const status: FollowUpData["status"] =
                statusRaw === "completed"
                  ? "completed"
                  : statusRaw === "missed"
                    ? "missed"
                    : "pending";

              const remarkText = (f.remark ?? "").trim();

              return {
                id: index + 1,
                backendId: String(f.id ?? ""),
                fullName: remarkText || "Follow-up",
                avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(
                  String(f.id ?? index)
                )}`,
                date: dateStr,
                time: timeStr,
                status,
              };
            })
          : [];

        setFollowUpsData(mapped);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[BookingOverview] Failed to load booking follow-ups", err);
        setFollowUpsData([]);
      }
    };

    void run();
  }, [leadId]);

  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      if (!hasMounted) return;

      const stageTypeForRemarks = isSalesUser ? "property_visit" : "booking";
      try {
        const res = await apiFetch<any>(
          `/api/v1/leads/${encodeURIComponent(
            leadId
          )}/stages/by-type/${encodeURIComponent(stageTypeForRemarks)}`
        );
        const stage = res.data?.stage ?? null;
        const id = stage?.id ?? null;
        const raw = typeof stage?.remarks === "string" ? stage.remarks : "";
        setStageId(id);
        setStageRemarksRaw(raw);
        setRemarks(splitStageRemarksToBullets(raw));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[BookingOverview] Failed to load remarks", err);
        setStageId(null);
        setStageRemarksRaw("");
        setRemarks([]);
      }
    };

    void run();
  }, [leadId, hasMounted, isSalesUser]);

  // Backend may return 404 if booking row (lead_bookings) isn't created yet.
  // In that case, UI should show "pending" state instead of error noise.
  const [bookingFetchState, setBookingFetchState] = useState<
    "idle" | "loading" | "ready" | "not_found" | "error"
  >("idle");

  // Sales "Booking" gate: allow submit only when at least one quotation is manager-approved.
  // This keeps booking consistent even if someone opens /booking page directly.
  const [bookingHasApprovedQuotation, setBookingHasApprovedQuotation] = useState<
    boolean | null
  >(null);
  const [isBookingQuotationGateLoading, setIsBookingQuotationGateLoading] =
    useState(false);
  const [approvedQuotationDetail, setApprovedQuotationDetail] =
    useState<ApprovedQuotationSnapshot | null>(null);
  /** From GET /booking — used to lock sales UI after submit (token_received / confirmed). */
  const [bookingRecordStatus, setBookingRecordStatus] = useState<string | null>(
    null
  );
  /** Last quotation id sales forwarded via POST /booking/submit (localStorage per lead). */
  const [lastForwardedQuotationId, setLastForwardedQuotationId] = useState<
    string | null
  >(null);

  const refreshBookingQuotationGate = async () => {
    if (!leadId) return;
    setIsBookingQuotationGateLoading(true);
    try {
      const res = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(
          leadId
        )}/quotations?page=1&limit=20`
      );
      const list = res.data?.quotations ?? [];
      const chosen = pickApprovedFromList(list);
      setBookingHasApprovedQuotation(Boolean(chosen));
      setApprovedQuotationDetail(chosen);
    } catch {
      setBookingHasApprovedQuotation(false);
      setApprovedQuotationDetail(null);
    } finally {
      setIsBookingQuotationGateLoading(false);
    }
  };

  useEffect(() => {
    if (!leadId) return;
    if (!hasMounted) return;
    void refreshBookingQuotationGate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, hasMounted]);

  useEffect(() => {
    if (!leadId || !hasMounted || !canViewBookingDocuments) return;
    let cancelled = false;
    (async () => {
      setIsBookingDocsLoading(true);
      try {
        const list = await listBookingDocuments(leadId);
        if (!cancelled) setBookingServerDocs(list);
      } catch {
        if (!cancelled) setBookingServerDocs([]);
      } finally {
        if (!cancelled) setIsBookingDocsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId, hasMounted, canViewBookingDocuments]);

  useEffect(() => {
    if (!leadId || typeof window === "undefined") return;
    setLastForwardedQuotationId(
      localStorage.getItem(`crownco_sales_booking_forward_qid:${leadId}`)
    );
  }, [leadId]);

  useEffect(() => {
    if (bookingRecordStatus !== "confirmed" || !leadId) return;
    if (typeof window === "undefined") return;
    localStorage.removeItem(`crownco_sales_booking_forward_qid:${leadId}`);
    setLastForwardedQuotationId(null);
  }, [bookingRecordStatus, leadId]);

  // Sales: direct URL to booking without any approved quotation → back to negotiation.
  useEffect(() => {
    if (!leadId || !hasMounted || !isSalesUser) return;
    if (isBookingQuotationGateLoading) return;
    if (bookingHasApprovedQuotation !== false) return;
    toast.error(
      "You need at least one manager-approved quotation before booking. Go to Negotiation to get a quotation approved."
    );
    router.replace(
      `/sales/lead-list/lead-detail/negotiation/overveiw?leadId=${encodeURIComponent(leadId)}`
    );
  }, [
    leadId,
    hasMounted,
    isSalesUser,
    isBookingQuotationGateLoading,
    bookingHasApprovedQuotation,
    router,
  ]);

  // Load booking price/tokens and prefill Booking Price section.
  // Note: backend currently allows fetching booking only for `sales`.
  const refreshBooking = async () => {
    if (!leadId) return;
    try {
      setBookingFetchState("loading");
      const res = await apiFetch<any>(
        `/api/v1/leads/${encodeURIComponent(leadId)}/booking`
      );
      const booking = res.data?.booking;
      if (!booking) return;

      const toStr = (v: unknown) =>
        v === null || v === undefined || v === "" ? "" : String(v);
      const toIntStr = (v: unknown) => {
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? String(Math.round(n)) : "";
      };

      setFinalPrice(toIntStr(booking.final_total_price));
      setAdvanceAmount(toIntStr(booking.token_amount));
      setDateOfFirstToken(toStr(booking.token_date));

      const allowedPm = ["UPI", "Cheque", "Net Banking", "DD"];
      const pmRaw = toStr(booking.payment_mode) || "UPI";
      setPaymentMode(allowedPm.includes(pmRaw) ? pmRaw : "UPI");

      setIsEmiEnabled(Boolean(booking.emi_applicable));
      setIsEmiSectionVisible(Boolean(booking.emi_applicable));
      setLoanAmount(toIntStr(booking.loan_amount));
      setInterestRate(toIntStr(booking.interest_rate));
      setTenureMonths(toIntStr(booking.tenure_months));
      setDownPayment(toIntStr(booking.down_payment));
      setMonthlyEmi(toIntStr(booking.monthly_emi));
      setBankName(toStr(booking.bank_name));

      setIsExtraChargesEnabled(Boolean(booking.extra_charges_applicable));
      setIsExtraChargesSectionVisible(
        Boolean(booking.extra_charges_applicable)
      );
      setMaintenanceCharges(toIntStr(booking.maintenance_charges));
      setLegalCharges(toIntStr(booking.legal_charges));
      setStampDuty(toIntStr(booking.stamp_duty));
      setParking(toIntStr(booking.parking_charges));
      setBookingRecordStatus(
        typeof booking.booking_status === "string"
          ? String(booking.booking_status).toLowerCase()
          : null
      );
      setBookingFetchState("ready");
    } catch (err) {
      const status = (err as any)?.status as number | undefined;
      const msg: string = (err as any)?.message || "";

      if (status === 404 || msg.toLowerCase().includes("not found")) {
        setBookingFetchState("not_found");
        setBookingRecordStatus(null);
        setFinalPrice("");
        setAdvanceAmount("");
        setDateOfFirstToken("");
        return;
      }

      setBookingRecordStatus(null);
      setBookingFetchState("error");
      // eslint-disable-next-line no-console
      console.error("[BookingOverview] Failed to load booking", err);
    }
  };

  useEffect(() => {
    if (!leadId) return;
    if (!hasMounted) return;
    void refreshBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, hasMounted]);

  // Calculate breakdown values (deal total comes from approved quotation when present)
  const parseCurrency = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/[₹,\s]/g, "")) || 0;
  };

  const formatCurrency = (amount: number) => {
    return "₹" + Math.round(amount).toLocaleString("en-IN");
  };

  const quotationTotalAmount = useMemo(() => {
    if (!approvedQuotationDetail) return 0;
    return getApprovedQuotationLineItems(approvedQuotationDetail).total;
  }, [approvedQuotationDetail]);

  const approvedQuotationTotalLabel = useMemo(() => {
    if (!approvedQuotationDetail || quotationTotalAmount <= 0) return null;
    return formatBookingQuotationTotal(quotationTotalAmount);
  }, [approvedQuotationDetail, quotationTotalAmount]);

  const displayCustomerName = useMemo(
    () =>
      approvedQuotationDetail?.customer_name?.trim() || leadData.name,
    [approvedQuotationDetail, leadData.name]
  );
  const displayCustomerPhone = useMemo(
    () =>
      approvedQuotationDetail?.customer_contact?.trim() || leadData.phone,
    [approvedQuotationDetail, leadData.phone]
  );

  // After booking GET settles, fill empty fields from manager-approved quotation (avoids race with refreshBooking clearing values).
  useEffect(() => {
    if (!approvedQuotationDetail) return;
    if (
      bookingFetchState === "loading" ||
      bookingFetchState === "idle"
    ) {
      return;
    }
    const q = approvedQuotationDetail;
    const { total } = getApprovedQuotationLineItems(q);

    setFinalPrice((prev) => {
      if (String(prev ?? "").trim() !== "") return prev;
      if (total > 0) return formatAmountForInputFromQuote(total);
      return prev;
    });

    setMaintenanceCharges((prev) => {
      if (String(prev ?? "").trim() !== "") return prev;
      return formatAmountForInputFromQuote(pickNum(q.one_time_maintenance));
    });
    setLegalCharges((prev) => {
      if (String(prev ?? "").trim() !== "") return prev;
      return formatAmountForInputFromQuote(pickNum(q.legal_charges));
    });
    setStampDuty((prev) => {
      if (String(prev ?? "").trim() !== "") return prev;
      return formatAmountForInputFromQuote(pickNum(q.stamp_duty));
    });
    setParking((prev) => {
      if (String(prev ?? "").trim() !== "") return prev;
      return formatAmountForInputFromQuote(pickNum(q.parking_price));
    });

    const anyExtra =
      pickNum(q.one_time_maintenance) +
      pickNum(q.legal_charges) +
      pickNum(q.stamp_duty) +
      pickNum(q.parking_price);
    if (anyExtra > 0) {
      setIsExtraChargesEnabled(true);
      setIsExtraChargesSectionVisible(true);
    }
  }, [approvedQuotationDetail, bookingFetchState]);

  const finalDealPrice =
    quotationTotalAmount > 0 ? quotationTotalAmount : parseCurrency(finalPrice);
  const totalExtraCharges = 0;
  const totalPayable = finalDealPrice + totalExtraCharges;
  const amountReceived = parseCurrency(advanceAmount);
  const balancePending = totalPayable - amountReceived;

  const PAYMENT_MODE_OPTIONS = [
    "UPI",
    "Cheque",
    "Net Banking",
    "DD",
  ] as const;

  // EMI calculation (updates monthlyEmi state for API / drawer even though card hides the field)
  useEffect(() => {
    if (isEmiSectionVisible && loanAmount && interestRate && tenureMonths) {
      const loan = parseCurrency(loanAmount);
      const rate = parseFloat(interestRate) || 0;
      const tenure = parseFloat(tenureMonths) || 0;

      if (loan > 0 && rate > 0 && tenure > 0) {
        const monthlyRate = rate / 12 / 100;
        const emi =
          (loan * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
          (Math.pow(1 + monthlyRate, tenure) - 1);

        if (!isNaN(emi) && isFinite(emi)) {
          setMonthlyEmi(formatCurrency(emi));
        }
      }
    }
  }, [loanAmount, interestRate, tenureMonths, isEmiSectionVisible]);

  /**
   * Lock sales "Forward to Manager" only while manager is reviewing the *same* forward:
   * - After first submit: token_received + same approved quotation id as last forward → locked.
   * - New manager-approved quotation (different id, or booking row total ≠ current quote total) → unlocked.
   * - After manager confirms: locked (confirmed).
   */
  const isSalesBookingSubmitted = useMemo(() => {
    if (!isSalesUser || bookingFetchState !== "ready") return false;
    if (bookingRecordStatus === "confirmed") return true;

    const bookingTotal = parseCurrency(finalPrice);
    const quoteTotal = quotationTotalAmount;
    const priceMismatch =
      quoteTotal > 0 && Math.abs(bookingTotal - quoteTotal) > 1;

    if (bookingRecordStatus === "token_received") {
      if (priceMismatch) return false;
      if (lastForwardedQuotationId === null) return true;
      if (
        approvedQuotationDetail?.id &&
        lastForwardedQuotationId === approvedQuotationDetail.id
      ) {
        return true;
      }
      return false;
    }

    return false;
  }, [
    isSalesUser,
    bookingFetchState,
    bookingRecordStatus,
    finalPrice,
    quotationTotalAmount,
    lastForwardedQuotationId,
    approvedQuotationDetail?.id,
  ]);

  const salesForwardButtonLabel = useMemo(() => {
    if (!isSalesUser) return "";
    if (bookingRecordStatus === "confirmed") return "Booking submitted";
    if (isSalesBookingSubmitted) return "Booking submitted";
    if (bookingRecordStatus === "token_received") return "Forward to Manager";
    return "Approve & Forward to Manager";
  }, [isSalesUser, isSalesBookingSubmitted, bookingRecordStatus]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSalesBookingSubmitted) {
      e.target.value = "";
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit. Please choose a smaller file.");
        return;
      }
      setUploadedFile(file);
    }
  };

  // Handle remark functions
  const appendRemarkToStage = async (text: string) => {
    if (!leadId || !stageId) {
      toast.error("Remarks are not available for this lead stage yet.");
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    const prevRaw = stageRemarksRaw ?? "";
    const nextRaw = prevRaw.trimEnd() ? `${prevRaw.trimEnd()}\n${trimmed}` : trimmed;

    await apiFetch(
      `/api/v1/leads/${encodeURIComponent(
        leadId
      )}/stages/${encodeURIComponent(stageId)}/remarks`,
      {
        method: "PATCH",
        body: { remarks: nextRaw },
      }
    );

    setStageRemarksRaw(nextRaw);
    setRemarks(splitStageRemarksToBullets(nextRaw));
  };

  const handleAddRemark = async () => {
    const trimmed = newRemark.trim();
    if (!trimmed) return;

    try {
      await appendRemarkToStage(trimmed);
      setNewRemark("");
    } catch (err: any) {
      const backendMsg: string = err?.message || "";
      if (backendMsg.includes("Lead is not assigned to you")) {
        toast.error(
          isSalesUser
            ? "Remark not allowed: lead must be assigned to you (Sales allowed only on property visit stage)."
            : "Remark not allowed: lead must be assigned to you."
        );
        return;
      }
      toast.error(backendMsg || "Failed to add remark");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newRemark.trim()) {
      handleAddRemark();
    }
  };

  const followUpText = "Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.";

  const handleAddFollowUp = async () => {
    try {
      await appendRemarkToStage(followUpText);
    } catch (err: any) {
      const backendMsg: string = err?.message || "";
      toast.error(backendMsg || "Failed to add follow-up reminder");
    }
  };

  // Follow-ups handlers
  const handleSelectFollowUp = (id: string | number) => {
    const numId = typeof id === "string" ? parseInt(id) : id;
    setSelectedFollowUps((prev) =>
      prev.includes(numId) ? prev.filter((item) => item !== numId) : [...prev, numId]
    );
  };

  const handleSelectAllFollowUps = () => {
    if (selectedFollowUps.length === filteredFollowUps.length) {
      setSelectedFollowUps([]);
    } else {
      setSelectedFollowUps(filteredFollowUps.map((item) => item.id));
    }
  };

  const handleExport = () => {
    console.log("Exporting follow-ups:", selectedFollowUps.length > 0 ? selectedFollowUps : "all");
  };

  const handleRefresh = () => {
    console.log("Refreshing follow-ups");
    setSearchQuery("");
    setSelectedFollowUps([]);
  };

  const handleDelete = () => {
    console.log("Deleting selected follow-ups:", selectedFollowUps);
    setSelectedFollowUps([]);
  };

  // Filter follow-ups based on search
  const filteredFollowUps = followUpsData.filter((item) =>
    item.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Follow-ups columns
  const followUpColumns: Column<FollowUpData>[] = [
    {
      key: "fullName",
      header: "FULL NAME",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image
              src={row.avatar}
              alt={row.fullName}
              fill
              className="rounded-full object-cover"
              sizes="32px"
            />
          </div>
          <span className="text-sm text-[#2D3748] font-medium">{row.fullName}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "DATE",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-[#2D3748]">{row.date}</span>
      ),
    },
    {
      key: "time",
      header: "TIME",
      sortable: true,
      render: (row) => (
        <span className="text-sm text-[#2D3748]">{row.time}</span>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      sortable: false,
      render: (row) => {
        const statusConfig = {
          pending: { color: "#F6AD55", text: "Pending" },
          completed: { color: "#38B2AC", text: "Completed" },
          missed: { color: "#DC2626", text: "Missed" },
        };
        const config = statusConfig[row.status];
        return (
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config.color }}
            ></span>
            <span className="text-sm text-[#2D3748]">{config.text}</span>
          </div>
        );
      },
    },
  ];

  /** Merge server list with a doc we know was just saved (GET can lag or fail briefly). */
  const mergeBookingDocList = (
    prev: BookingDocumentRow[],
    saved: BookingDocumentRow
  ): BookingDocumentRow[] => {
    const key = normalizeBookingDocType(saved.document_type);
    const without = prev.filter(
      (d) =>
        normalizeBookingDocType(d.document_type) !== key && d.id !== saved.id
    );
    return [...without, saved];
  };

  // Handle document upload → presigned PUT to B2, then POST metadata (manager can list GET).
  const handleDocFileUpload = async (files: FileList | null) => {
    if (!files || !leadId) return;
    const file = files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`File "${file.name}" exceeds 10MB limit.`);
      return;
    }
    setIsDocUploading(true);
    try {
      const saved = await uploadBookingDocumentToB2({
        leadId,
        file,
        documentType: selectedBookingDocumentTypeId,
        remarks: docRemark.trim() || undefined,
        quotationId: approvedQuotationDetail?.id ?? null,
      });
      setBookingServerDocs((prev) => mergeBookingDocList(prev, saved));

      let list: BookingDocumentRow[] = [];
      try {
        list = await listBookingDocuments(leadId);
      } catch {
        list = [];
      }
      if (list.length > 0) {
        setBookingServerDocs(list);
      } else {
        setBookingServerDocs((prev) => mergeBookingDocList(prev, saved));
      }
      toast.success("Document uploaded to secure storage.");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Upload failed.";
      toast.error(msg);
    } finally {
      setIsDocUploading(false);
    }
  };


  // Format currency on blur
  const handleCurrencyBlur = (
    value: string,
    setter: (value: string) => void
  ) => {
    const numValue = value.replace(/[₹,\s]/g, "");
    if (numValue && !isNaN(parseFloat(numValue))) {
      setter(formatCurrency(parseFloat(numValue)));
    }
  };

  // Share functions
  const shareViaEmail = () => {
    const subject = encodeURIComponent("Booking Details - Crown Heights");
    const dealLine = approvedQuotationTotalLabel
      ? `From approved quotation: ${approvedQuotationTotalLabel}\n`
      : `Deal total: ${formatCurrency(finalDealPrice)}\n`;
    const body = encodeURIComponent(
      `Booking Details:\n\n${dealLine}Token amount: ${advanceAmount || "—"}\nPayment mode: ${paymentMode}\n\nTotal payable: ${formatCurrency(totalPayable)}\nAmount received: ${formatCurrency(amountReceived)}\nBalance pending: ${formatCurrency(balancePending)}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaWhatsApp = () => {
    const dealLine = approvedQuotationTotalLabel
      ? `From approved quotation: ${approvedQuotationTotalLabel}\n`
      : `Deal total: ${formatCurrency(finalDealPrice)}\n`;
    const message = encodeURIComponent(
      `*Booking Details - Crown Heights*\n\n${dealLine}Token amount: ${advanceAmount || "—"}\nPayment mode: ${paymentMode}\n\nTotal payable: ${formatCurrency(totalPayable)}\nAmount received: ${formatCurrency(amountReceived)}\nBalance pending: ${formatCurrency(balancePending)}`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  // Sales: submit booking (token received) → lead goes to deal, booking goes to GM/Manager for confirm.
  // Manager/GM: confirm booking.
  const handleApprove = async () => {
    if (!leadId) return;
    if (isSalesUser) {
      if (isSalesBookingSubmitted) return;
      if (isBookingQuotationGateLoading) return;
      if (bookingHasApprovedQuotation !== true) {
        toast.error(
          "None of your quotations is approved by the manager. Please get at least one quotation approved before booking."
        );
        return;
      }
      try {
        // Match Example Flutter: PATCH booking (token, payment, EMI, charges) then POST submit.
        if (bookingFetchState === "ready") {
          const patch: Record<string, unknown> = {};
          const tokenAmt = parseCurrency(advanceAmount);
          if (tokenAmt > 0) patch.token_amount = tokenAmt;
          patch.payment_mode = mapSalesPaymentModeToApi(paymentMode);
          if (finalDealPrice > 0) patch.final_total_price = finalDealPrice;
          const td = dateOfFirstToken.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(td)) {
            patch.token_date = td;
          }

          if (isEmiSectionVisible) {
            patch.emi_applicable = isEmiEnabled;
            if (isEmiEnabled) {
              const la = parseCurrency(loanAmount);
              const dp = parseCurrency(downPayment);
              const ir = parseFloat(String(interestRate).replace(/[^0-9.]/g, "")) || 0;
              const tm = parseInt(String(tenureMonths), 10);
              const mi = parseCurrency(monthlyEmi);
              if (la > 0) patch.loan_amount = la;
              if (dp > 0) patch.down_payment = dp;
              if (ir > 0) patch.interest_rate = ir;
              if (!Number.isNaN(tm) && tm > 0) patch.tenure_months = tm;
              if (mi > 0) patch.monthly_emi = mi;
              const bn = bankName.trim();
              if (bn) patch.bank_name = bn;
            }
          }

          if (isExtraChargesSectionVisible) {
            patch.extra_charges_applicable = isExtraChargesEnabled;
            const mc = parseCurrency(maintenanceCharges);
            const lc = parseCurrency(legalCharges);
            const sd = parseCurrency(stampDuty);
            const pk = parseCurrency(parking);
            if (mc > 0) patch.maintenance_charges = mc;
            if (lc > 0) patch.legal_charges = lc;
            if (sd > 0) patch.stamp_duty = sd;
            if (pk > 0) patch.parking_charges = pk;
          }

          await apiFetch(
            `/api/v1/leads/${encodeURIComponent(leadId)}/booking`,
            { method: "PATCH", body: patch }
          );
        }

        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/booking/submit`,
          { method: "POST", body: {} }
        );
        if (approvedQuotationDetail?.id && typeof window !== "undefined") {
          const key = `crownco_sales_booking_forward_qid:${leadId}`;
          localStorage.setItem(key, approvedQuotationDetail.id);
          setLastForwardedQuotationId(approvedQuotationDetail.id);
        }
        toast.success("Booking submitted; forwarded to Manager/GM for confirmation");
        await refreshBooking();
        try {
          const list = await listBookingDocuments(leadId);
          setBookingServerDocs(list);
        } catch {
          /* ignore */
        }
      } catch (err: any) {
        const status: number | undefined = err?.status;
        const msg: string = err?.message || "";
        if (status === 404 || msg.toLowerCase().includes("not found")) {
          toast.error(
            "Booking row abhi create nahi hui: Presales/Manager ko negotiation se booking stage par forward karna hoga, tab hi submit ho payega."
          );
          return;
        }
        if (msg.includes("NO_UPDATES") || msg.toLowerCase().includes("no fields to update")) {
          toast.error(
            "Booking update failed: token amount ya payment details check karein, phir retry."
          );
          return;
        }
        toast.error(msg || "Failed to submit booking");
      }
      return;
    }
    if (isManagerUser) {
      if (bookingFetchState === "not_found") {
        toast.error(
          "Booking details pending: GM/Manager approval ke baad booking create hoti hai."
        );
        return;
      }
      try {
        await apiFetch(
          `/api/v1/leads/${encodeURIComponent(leadId)}/booking/confirm`,
          { method: "POST", body: {} }
        );
        toast.success("Booking confirmed");
        await refreshBooking();
      } catch (err: any) {
        toast.error(err?.message || "Failed to confirm booking");
      }
    }
  };

  // Reject: go to rejected-form with leadId (same as negotiation).
  const handleReject = () => {
    if (leadId) {
      router.push(
        `/sales/lead-list/rejected-form?leadId=${encodeURIComponent(leadId)}`
      );
    } else {
      router.push("/sales/lead-list/rejected-form");
    }
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isShareDrawerOpen || isDocDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isShareDrawerOpen, isDocDrawerOpen]);

  const clearBookingPaymentProofInputs = () => {
    if (bookingPaymentProofInputMobileRef.current) {
      bookingPaymentProofInputMobileRef.current.value = "";
    }
    if (bookingPaymentProofInputDesktopRef.current) {
      bookingPaymentProofInputDesktopRef.current.value = "";
    }
  };

  /** Shared Booking Price fields (mobile + desktop) — matches TOKEN & PAYMENT / EMI mock */
  const renderBookingPriceCardBody = (opts: {
    uploadPadding: string;
    paymentProofInputRef: RefObject<HTMLInputElement | null>;
  }) => {
    const { uploadPadding, paymentProofInputRef } = opts;
    return (
      <>
        <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-[#64748B] uppercase mb-3">
          Token &amp; payment
        </p>

        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-medium text-[var(--sidebar-text-sub)]">
            Token amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#64748B] font-medium z-10">
              ₹
            </span>
            <input
              type="text"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              onBlur={() =>
                handleCurrencyBlur(advanceAmount, setAdvanceAmount)
              }
              onFocus={(e) => {
                e.target.value = e.target.value.replace(/[₹,\s]/g, "");
              }}
              placeholder="Enter token amount"
              readOnly={isSalesBookingSubmitted}
              disabled={isSalesBookingSubmitted}
              className="w-full pl-8 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-sm sm:text-[15px] text-[var(--foreground)] hover:bg-[#fafafa] focus:outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-selected)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          {approvedQuotationTotalLabel ? (
            <p className="text-xs text-[#64748B] pt-0.5">
              From approved quotation:{" "}
              <span className="font-semibold text-[var(--foreground)]">
                {approvedQuotationTotalLabel}
              </span>
            </p>
          ) : (
            <p className="text-xs text-[#94a3b8] pt-0.5">
              Approve a quotation in negotiation to show the deal total here.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-medium text-[var(--sidebar-text-sub)]">
            Payment mode
          </label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            disabled={isSalesBookingSubmitted}
            className="w-full px-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-sm sm:text-[15px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-selected)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {PAYMENT_MODE_OPTIONS.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        <div
          onClick={() => {
            if (isSalesBookingSubmitted) return;
            paymentProofInputRef.current?.click();
          }}
          className={`border-2 border-dashed border-[var(--sidebar-border-color)] rounded-xl ${uploadPadding} text-center transition-all bg-[var(--surface-neutral)] ${
            isSalesBookingSubmitted
              ? "opacity-60 cursor-not-allowed"
              : "cursor-pointer hover:border-[var(--primary-base)] hover:bg-[var(--primary-selected)]"
          }`}
        >
          {uploadedFile ? (
            <>
              <CheckCircle
                size={28}
                weight="fill"
                className="text-[var(--success)] mx-auto mb-2 sm:mb-3 sm:w-8 sm:h-8"
              />
              <p className="font-medium text-xs sm:text-sm text-[var(--sidebar-text-sub)] mb-1 break-words px-2">
                {uploadedFile.name}
              </p>
              <small className="text-[var(--sidebar-text-muted)] text-[10px] sm:text-xs">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </small>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSalesBookingSubmitted) return;
                  setUploadedFile(null);
                  clearBookingPaymentProofInputs();
                }}
                disabled={isSalesBookingSubmitted}
                className="mt-2 sm:mt-3 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[var(--error)] text-white rounded-md text-[10px] sm:text-xs hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </>
          ) : (
            <>
              <Plus
                size={28}
                weight="regular"
                className="text-[var(--primary-base)] mx-auto mb-2 sm:mb-3 sm:w-8 sm:h-8"
              />
              <p className="font-medium text-xs sm:text-sm text-[var(--sidebar-text-sub)] mb-1 break-words px-2">
                Upload receipt or payment proof (PDF/JPG)
              </p>
              <small className="text-[var(--sidebar-text-muted)] text-[10px] sm:text-xs flex items-center justify-center gap-1">
                <Info size={10} weight="regular" className="sm:w-3 sm:h-3" />
                Max file size 10 MB
              </small>
            </>
          )}
          <input
            ref={paymentProofInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={isSalesBookingSubmitted}
            className="hidden"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--sidebar-border-color)]">
          <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-[#64748B] uppercase">
            EMI / loan
          </p>
          <label
            className={`relative inline-flex items-center shrink-0 ${
              isSalesBookingSubmitted ? "cursor-not-allowed opacity-70" : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={isEmiSectionVisible}
              onChange={(e) => {
                if (isSalesBookingSubmitted) return;
                const on = e.target.checked;
                setIsEmiSectionVisible(on);
                setIsEmiEnabled(on);
              }}
              disabled={isSalesBookingSubmitted}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-[#d1d5db] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary-selected)] rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-base)]" />
          </label>
        </div>

        {isEmiSectionVisible && (
          <div className="space-y-4 pt-2 animate-fadeIn">
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-[var(--sidebar-text-sub)]">
                Down payment
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#64748B] font-medium">
                  ₹
                </span>
                <input
                  type="text"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  onBlur={() =>
                    handleCurrencyBlur(downPayment, setDownPayment)
                  }
                  onFocus={(e) => {
                    e.target.value = e.target.value.replace(/[₹,\s]/g, "");
                  }}
                  placeholder="Enter down payment"
                  readOnly={isSalesBookingSubmitted}
                  disabled={isSalesBookingSubmitted}
                  className="w-full pl-8 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-sm sm:text-[15px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-selected)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-[var(--sidebar-text-sub)]">
                Loan amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#64748B] font-medium">
                  ₹
                </span>
                <input
                  type="text"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  onBlur={() =>
                    handleCurrencyBlur(loanAmount, setLoanAmount)
                  }
                  onFocus={(e) => {
                    e.target.value = e.target.value.replace(/[₹,\s]/g, "");
                  }}
                  placeholder="Enter loan amount"
                  readOnly={isSalesBookingSubmitted}
                  disabled={isSalesBookingSubmitted}
                  className="w-full pl-8 pr-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-sm sm:text-[15px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-selected)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium text-[var(--sidebar-text-sub)]">
                  Interest %
                </label>
                <input
                  type="text"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="e.g. 8.5"
                  readOnly={isSalesBookingSubmitted}
                  disabled={isSalesBookingSubmitted}
                  className="w-full px-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-sm sm:text-[15px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-selected)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium text-[var(--sidebar-text-sub)]">
                  Tenure (months)
                </label>
                <input
                  type="text"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  placeholder="e.g. 240"
                  readOnly={isSalesBookingSubmitted}
                  disabled={isSalesBookingSubmitted}
                  className="w-full px-4 py-3 border border-[var(--sidebar-border-color)] rounded-lg bg-white text-sm sm:text-[15px] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-selected)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {isSalesBookingSubmitted && (
          <p className="text-xs text-[var(--success)] font-medium mt-2">
            Submitted — pending manager confirmation
          </p>
        )}
        <button
          type="button"
          onClick={handleApprove}
          disabled={
            isSalesUser &&
            (isBookingQuotationGateLoading ||
              bookingHasApprovedQuotation !== true ||
              isSalesBookingSubmitted)
          }
          className="w-full mt-4 sm:mt-5 flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-[var(--primary-base)] to-[var(--secondary-base)] text-white rounded-lg font-semibold text-xs sm:text-sm hover:from-[var(--primary-hover)] hover:to-[var(--secondary-hover)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none"
        >
          {isSalesBookingSubmitted
            ? "Booking submitted"
            : salesForwardButtonLabel || "Submit Booking Details"}
        </button>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Tabs */}
        <div className="flex gap-6 sm:gap-10 border-b border-[var(--sidebar-border-color)] mb-6 sm:mb-8 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors relative whitespace-nowrap ${
              activeTab === "overview"
                ? "text-[var(--primary-base)]"
                : "text-[var(--sidebar-text-sub)]"
            }`}
          >
            Overview
            {activeTab === "overview" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`px-4 sm:px-5 md:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors relative whitespace-nowrap ${
              activeTab === "followups"
                ? "text-[var(--primary-base)]"
                : "text-[var(--sidebar-text-sub)]"
            }`}
          >
            Follow Ups
            {activeTab === "followups" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]"></span>
            )}
          </button>
        </div>

        {activeTab === "overview" ? (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7">
          {/* Left Column */}
          <div className="space-y-6 order-1 lg:order-1">
            {/* Lead Profile */}
            <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors order-1">
              <h2 className="text-lg font-semibold mb-4 text-slate-900">
                Lead Profile
              </h2>
              <div className="space-y-4">
                <DataCard
                  id={leadData.id}
                  name={displayCustomerName}
                  phone={displayCustomerPhone}
                  avatar={leadData.avatar}
                  budget={leadData.budget}
                  propertyName={leadData.propertyName}
                  timeAgo={leadData.timeAgo}
                  location={leadData.location}
                  status={leadData.status}
                  source={leadData.source}
                />
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <button className="bg-[var(--primary-base)] text-white py-3 rounded-lg font-semibold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-[var(--primary-hover)] transition-colors">
                    <Phone size={18} weight="regular" />
                    <span>Call Now</span>
                  </button>
                  <button
                    onClick={() =>
                      router.push(
                        leadId
                          ? `/sales/lead-list/chat-now?leadId=${leadId}`
                          : "/sales/lead-list/chat-now"
                      )
                    }
                    className="bg-white border-2 border-[var(--primary-base)] text-[var(--primary-base)] py-3 rounded-lg font-semibold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-[var(--primary-selected)] transition-colors"
                  >
                    <ChatCircle size={18} weight="regular" />
                    <span>Chat Now</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Breakdown Card — manager-approved quotation replaces Final Breakdown */}
            <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors order-2 lg:order-2">
              {isBookingQuotationGateLoading && !approvedQuotationDetail ? (
                <>
                  <h2 className="text-lg font-semibold mb-4 text-slate-900">
                    Final Breakdown
                  </h2>
                  <p className="text-sm text-slate-500 py-6 text-center">
                    Loading quotation…
                  </p>
                </>
              ) : approvedQuotationDetail ? (
                <ApprovedQuotationUi
                  q={approvedQuotationDetail}
                  projectLabel={leadData.propertyName}
                  customerName={displayCustomerName}
                  customerPhone={displayCustomerPhone}
                  variant="card"
                />
              ) : (
                <>
                  <h2 className="text-lg font-semibold mb-4 text-slate-900">
                    Final Breakdown
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-3 border-b border-[#f1f5f9]">
                      <span className="text-[15px] text-[var(--foreground)]">
                        Final Deal Price
                      </span>
                      <span className="font-semibold text-[15px]">
                        {formatCurrency(finalDealPrice)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-4 border-t-2 border-[var(--sidebar-border-color)] mt-3">
                      <span className="font-bold text-base text-[var(--foreground)]">
                        Total Payable (Incl. Charges)
                      </span>
                      <span className="font-bold text-base text-[var(--success)]">
                        {formatCurrency(totalPayable)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 border-b border-[#f1f5f9]">
                      <span className="text-[15px] text-[var(--foreground)]">
                        Amount Received
                      </span>
                      <span className="font-semibold text-[15px] text-[var(--error)]">
                        - {formatCurrency(amountReceived)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3 text-lg font-bold text-[var(--success)]">
                      <span>Balance Pending</span>
                      <span>{formatCurrency(balancePending)}</span>
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => setIsShareDrawerOpen(true)}
                className="w-full mt-5 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-[var(--primary-base)] to-[var(--secondary-base)] text-white rounded-lg font-semibold text-sm hover:from-[var(--primary-hover)] hover:to-[var(--secondary-hover)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <ShareNetwork size={18} weight="regular" />
                Share
              </button>
            </section>

            {/* Booking Price - Mobile version (shown on mobile, hidden on desktop) */}
            <section className="bg-white rounded-xl p-5 border-2 border-dashed border-[var(--primary-base)] shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors order-3 lg:hidden">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 pb-3 border-b-2 border-dashed border-[var(--primary-base)]">
                Booking Price
              </h2>
              {/* Mobile parity: booking==null (not_found) par warning note dikhata nahi. */}

              <div className="space-y-5">
                {renderBookingPriceCardBody({
                  uploadPadding: "p-6 sm:p-8 md:p-10",
                  paymentProofInputRef: bookingPaymentProofInputMobileRef,
                })}
              </div>
            </section>

            {/* Documents Card */}
            <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors order-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Required Documents
                </h2>
                <button
                  onClick={() => setIsDocDrawerOpen(true)}
                  className="text-sm text-[var(--primary-base)] font-medium hover:underline"
                >
                  See All →
                </button>
              </div>
              {(() => {
                const hasDoc = (docType: BookingDocumentTypeId) =>
                  bookingServerDocs.some(
                    (d) =>
                      normalizeBookingDocType(d.document_type) ===
                      normalizeBookingDocType(docType)
                  );
                const uploadedCount = requiredBookingDocumentTypes.filter((id) =>
                  hasDoc(id)
                ).length;

                const display = requiredBookingDocumentTypes.slice(0, 3);

                return (
                  <>
                    {isBookingDocsLoading ? (
                      <p className="text-xs text-[var(--sidebar-text-muted)] py-2">
                        Loading documents…
                      </p>
                    ) : null}
                    <div className="space-y-2.5">
                      {display.map((id) => {
                        const type = bookingDocumentTypes.find((t) => t.id === id);
                        if (!type) return null;
                        const ok = hasDoc(id);
                        return (
                          <div
                            key={id}
                            className="flex items-center gap-3 p-3.5 border border-[var(--sidebar-border-color)] rounded-lg bg-white hover:bg-[var(--surface-neutral)] transition-colors"
                          >
                            {ok ? (
                              <CheckCircle
                                size={18}
                                weight="fill"
                                className="text-[var(--success)]"
                              />
                            ) : (
                              <WarningCircle
                                size={18}
                                weight="fill"
                                className="text-[var(--warning)]"
                              />
                            )}
                            <span className="text-sm text-[var(--foreground)]">
                              {type.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <small className="text-[var(--primary-base)] font-medium mt-2 block">
                      {uploadedCount}/{requiredBookingDocumentTypes.length} Uploaded
                    </small>
                  </>
                );
              })()}
            </section>

            {/* Remarks Card */}
            <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors order-5">
              <h2 className="text-lg font-semibold mb-4 text-slate-900">
                Remarks
              </h2>
              
              <RemarksSection remarks={remarks} className="mb-4 sm:mb-6" />

              {/* Follow-up Card */}
              <div className="bg-white border border-[#E3E6F0] rounded-xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                  <span className="text-xs sm:text-sm text-[#718096] flex-1">
                    Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.
                  </span>
                  <button
                    onClick={handleAddFollowUp}
                    className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded-full border border-[#E3E6F0] bg-[#F8FAFC] flex items-center justify-center text-base sm:text-lg font-semibold hover:bg-[#E3E6F0] transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Remark Input */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 bg-[#F8F9FC] border border-[#E3E6F0] rounded-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 flex items-center gap-1.5 sm:gap-2">
                  <span className="text-sm sm:text-base">😊</span>
                  <input
                    type="text"
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Add a new remark..."
                    className="flex-1 border-none bg-transparent outline-none text-xs sm:text-sm text-[#2D3748] placeholder:text-[#718096]"
                  />
                  <div className="flex gap-2 sm:gap-3 text-[#718096]">
                    <button
                      type="button"
                      className="cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept="*/*";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            alert("File attached: " + file.name);
                          }
                        };
                        input.click();
                      }}
                      title="Attach file"
                    >
                      <Paperclip size={16} weight="regular" className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                      onClick={() => {
                        // Open date picker or calendar
                        const dateInput = document.createElement("input");
                        dateInput.type = "date";
                        dateInput.onchange = (e) => {
                          const date = (e.target as HTMLInputElement).value;
                          if (date) {
                            setNewRemark((prev) => (prev ? prev + " " + date : date));
                          }
                        };
                        dateInput.click();
                      }}
                      title="Add date"
                    >
                      <Calendar size={16} weight="regular" className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={
                    newRemark.trim()
                      ? handleAddRemark
                      : () => {
                          if ("webkitSpeechRecognition" in window) {
                            const recognition = new (window as any).webkitSpeechRecognition();
                            recognition.continuous = false;
                            recognition.interimResults = false;

                            recognition.onresult = (event: any) => {
                              const transcript = event.results[0][0].transcript;
                              setNewRemark(transcript);
                            };

                            recognition.onerror = (event: any) => {
                              alert("Speech recognition error: " + event.error);
                            };

                            recognition.start();
                          } else {
                            alert("Speech recognition not supported in this browser");
                          }
                        }
                  }
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all flex-shrink-0 ${
                    newRemark.trim() ? "cursor-pointer" : "cursor-default"
                  }`}
                  disabled={false}
                  title={newRemark.trim() ? "Send remark" : "Voice input"}
                >
                  {newRemark.trim() ? (
                    <PaperPlaneTilt size={16} weight="fill" className="sm:w-[18px] sm:h-[18px]" />
                  ) : (
                    <Microphone size={16} weight="fill" className="sm:w-[18px] sm:h-[18px]" />
                  )}
                </button>
              </div>
            </section>
          </div>

          {/* Right Column - Booking Card - Hidden on mobile, shown on desktop */}
          <div className="space-y-6 hidden lg:block lg:order-2">
            <section className="bg-white rounded-xl p-5 border-2 border-dashed border-[var(--primary-base)] shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-lg font-semibold mb-4 text-slate-900 pb-3 border-b-2 border-dashed border-[var(--primary-base)]">
                Booking Price
              </h2>
              {/* Mobile parity: booking==null (not_found) par warning note dikhata nahi. */}

              <div className="space-y-5">
                {renderBookingPriceCardBody({
                  uploadPadding: "p-10",
                  paymentProofInputRef: bookingPaymentProofInputDesktopRef,
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Action Footer - Outside grid, at bottom like negotiation & site-visit */}
        <div className="mt-4 sm:mt-5 lg:mt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <button
              onClick={handleReject}
              className="flex-1 bg-white border border-[#718096] text-[#718096] py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:bg-[#F8F9FC] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <X size={18} weight="regular" className="flex-shrink-0" />
              <span>Reject Booking (Add Reason)</span>
            </button>
            <button
              onClick={handleApprove}
                  disabled={
                    isSalesUser &&
                    (isBookingQuotationGateLoading ||
                      bookingHasApprovedQuotation !== true ||
                      isSalesBookingSubmitted)
                  }
              className="flex-1 bg-[var(--primary-base)] text-white py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:opacity-95 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
            >
              <span>
                {isManagerUser
                  ? "Confirm Booking"
                  : salesForwardButtonLabel || "Approve & Forward to Manager"}
              </span>
              <span className="text-lg sm:text-xl">≫</span>
            </button>
          </div>
        </div>
        </>
        ) : (
          <div>
            <DataTable
              data={filteredFollowUps}
              columns={followUpColumns}
              getRowId={(row) => row.id}
              searchPlaceholder="Search..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onColumnClick={() => {
                console.log("Column visibility");
              }}
              actions={[
                {
                  label: "Export",
                  icon: <Download size={16} weight="regular" />,
                  onClick: handleExport,
                  variant: "default",
                  showLabel: false,
                },
                {
                  label: "Refresh",
                  icon: <ArrowClockwise size={16} weight="regular" />,
                  onClick: handleRefresh,
                  variant: "default",
                  showLabel: false,
                },
                {
                  label: "Delete",
                  icon: <Trash size={16} weight="regular" />,
                  onClick: handleDelete,
                  variant: "danger",
                  showLabel: false,
                  disabled: selectedFollowUps.length === 0,
                },
              ]}
              selectable={true}
              selectedRows={selectedFollowUps}
              onSelectRow={handleSelectFollowUp}
              onSelectAll={handleSelectAllFollowUps}
              pagination={true}
              currentPage={followUpPage}
              totalPages={Math.ceil(filteredFollowUps.length / itemsPerPage)}
              totalItems={filteredFollowUps.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setFollowUpPage}
              onItemsPerPageChange={setItemsPerPage}
              emptyMessage="No follow-ups found"
              renderActions={(row) => (
                <button
                  className="text-[var(--primary-base)] text-sm font-medium hover:underline"
                  onClick={() => {
                    // Navigate to follow-up detail page
                    const query = leadId
                      ? row.backendId
                        ? `?leadId=${encodeURIComponent(leadId)}&followUpId=${encodeURIComponent(String(row.backendId))}`
                        : `?leadId=${encodeURIComponent(leadId)}`
                      : "";
                    router.push(
                      `/sales/lead-list/lead-detail/booking/overveiw/follow-up-detail${query}`
                    );
                  }}
                >
                  View Detail
                </button>
              )}
            />
          </div>
        )}
      </div>

      {/* Share Drawer */}
      {isShareDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end backdrop-blur-sm"
          onClick={() => setIsShareDrawerOpen(false)}
        >
          <div
            className="bg-white h-full w-full md:w-[500px] max-w-[90vw] shadow-2xl flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[var(--sidebar-border-color)] px-5 py-5 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">
                Booking Details
              </h3>
              <button
                onClick={() => setIsShareDrawerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[var(--surface-neutral)] text-[var(--sidebar-text-muted)] flex items-center justify-center transition-colors"
              >
                <X size={24} weight="regular" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6">
              <div>
                <h4 className="text-base font-semibold text-[var(--foreground)] mb-3 pb-2 border-b-2 border-[var(--sidebar-border-color)]">
                  Booking Price Details
                </h4>
                <div className="space-y-2.5">
                  {approvedQuotationTotalLabel && (
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        From approved quotation
                      </span>
                      <span className="text-sm text-[var(--primary-base)] font-semibold">
                        {approvedQuotationTotalLabel}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                    <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                      Token amount
                    </span>
                    <span className="text-sm text-[var(--foreground)] font-semibold">
                      {advanceAmount || "Not entered"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                      Payment mode
                    </span>
                    <span className="text-sm text-[var(--foreground)] font-semibold">
                      {paymentMode}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {approvedQuotationDetail ? (
                  <h4 className="text-base font-semibold text-[var(--foreground)] mb-3 pb-2 border-b-2 border-[var(--sidebar-border-color)] flex items-center gap-2">
                    <CheckCircle
                      size={22}
                      weight="fill"
                      className="text-green-600 shrink-0"
                    />
                    <span className="text-green-700 uppercase tracking-wide text-sm font-bold">
                      Approved quotation
                    </span>
                  </h4>
                ) : (
                  <h4 className="text-base font-semibold text-[var(--foreground)] mb-3 pb-2 border-b-2 border-[var(--sidebar-border-color)]">
                    Final Breakdown
                  </h4>
                )}
                {isBookingQuotationGateLoading && !approvedQuotationDetail ? (
                  <p className="text-sm text-[var(--sidebar-text-muted)] py-3">
                    Loading quotation…
                  </p>
                ) : approvedQuotationDetail ? (
                  <ApprovedQuotationUi
                    q={approvedQuotationDetail}
                    projectLabel={leadData.propertyName}
                    customerName={displayCustomerName}
                    customerPhone={displayCustomerPhone}
                    variant="drawer"
                  />
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Final Deal Price
                      </span>
                      <span className="text-sm text-[var(--foreground)] font-semibold">
                        {formatCurrency(finalDealPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Total Payable (Incl. Charges)
                      </span>
                      <span className="text-sm text-[var(--success)] font-semibold">
                        {formatCurrency(totalPayable)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Amount Received
                      </span>
                      <span className="text-sm text-[var(--error)] font-semibold">
                        - {formatCurrency(amountReceived)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Balance Pending
                      </span>
                      <span className="text-sm text-[var(--success)] font-semibold">
                        {formatCurrency(balancePending)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {isEmiSectionVisible && (
                <div>
                  <h4 className="text-base font-semibold text-[var(--foreground)] mb-3 pb-2 border-b-2 border-[var(--sidebar-border-color)]">
                    EMI Details
                  </h4>
                  <div className="bg-[var(--surface-neutral)] p-4 rounded-lg space-y-2.5">
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Loan Amount
                      </span>
                      <span className="text-sm text-[var(--foreground)] font-semibold">
                        {loanAmount || "Not entered"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Interest Rate
                      </span>
                      <span className="text-sm text-[var(--foreground)] font-semibold">
                        {interestRate ? `${interestRate}%` : "Not entered"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Tenure
                      </span>
                      <span className="text-sm text-[var(--foreground)] font-semibold">
                        {tenureMonths
                          ? `${tenureMonths} Months`
                          : "Not entered"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Down Payment
                      </span>
                      <span className="text-sm text-[var(--foreground)] font-semibold">
                        {downPayment || "Not entered"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5 border-b border-[#f1f5f9]">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Monthly EMI
                      </span>
                      <span className="text-sm text-[var(--success)] font-semibold">
                        {monthlyEmi || "Not entered"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-sm text-[var(--sidebar-text-muted)] font-medium">
                        Bank/Financial Institution
                      </span>
                      <span className="text-sm text-[var(--foreground)] font-semibold">
                        {bankName || "Not entered"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {uploadedFile && (
                <div>
                  <h4 className="text-base font-semibold text-[var(--foreground)] mb-3 pb-2 border-b-2 border-[var(--sidebar-border-color)]">
                    Uploaded Documents
                  </h4>
                  <div className="flex items-center gap-3 p-3 bg-[var(--surface-neutral)] rounded-lg">
                    <File size={24} weight="regular" className="text-[var(--primary-base)]" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {uploadedFile.name}
                      </div>
                      <div className="text-xs text-[var(--sidebar-text-muted)]">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[var(--sidebar-border-color)] p-5 flex flex-col sm:flex-row gap-3">
              <button
                onClick={shareViaEmail}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[var(--error)] text-white rounded-lg font-semibold text-sm hover:bg-[#dc2626] hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <Envelope size={18} weight="regular" />
                Email
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#25d366] text-white rounded-lg font-semibold text-sm hover:bg-[#20ba5a] hover:-translate-y-0.5 hover:shadow-md transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Drawer */}
      {isDocDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end backdrop-blur-sm"
          onClick={() => setIsDocDrawerOpen(false)}
        >
          <div
            className="bg-white h-full w-full md:w-[600px] max-w-[90vw] shadow-2xl flex flex-col overflow-y-auto border-l-4 border-[var(--primary-base)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[var(--sidebar-border-color)] px-5 py-5 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">
                Upload Document
              </h3>
              <button
                onClick={() => setIsDocDrawerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-[var(--surface-neutral)] text-[var(--sidebar-text-muted)] flex items-center justify-center transition-colors"
              >
                <X size={24} weight="regular" />
              </button>
            </div>

            <div className="flex-1 p-6">
              {/* Step-1: Mobile jaisa doc-type select */}
              <div className="space-y-2.5 mb-6">
                {bookingDocumentTypes.map((t) => {
                  const selected = t.id === selectedBookingDocumentTypeId;
                  const uploaded = bookingServerDocs.some(
                    (d) =>
                      normalizeBookingDocType(d.document_type) ===
                      normalizeBookingDocType(t.id)
                  );
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedBookingDocumentTypeId(t.id)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border transition-colors ${
                        selected
                          ? "border-[var(--primary-base)] bg-[var(--primary-selected)]"
                          : "border-[var(--sidebar-border-color)] bg-white hover:bg-[var(--surface-neutral)]"
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        {uploaded ? (
                          <CheckCircle
                            size={18}
                            weight="fill"
                            className="text-[var(--success)] shrink-0"
                          />
                        ) : (
                          <File
                            size={18}
                            weight="regular"
                            className="text-[var(--primary-base)] shrink-0"
                          />
                        )}
                        <span className="text-sm font-medium text-[var(--foreground)] truncate">
                          {t.label}
                        </span>
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                          selected
                            ? "text-[var(--primary-base)]"
                            : "text-[var(--sidebar-text-muted)]"
                        }`}
                      >
                        {uploaded ? "Uploaded" : "Select"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                onClick={() => docFileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("bg-[var(--primary-selected)]");
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("bg-[var(--primary-selected)]");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("bg-[var(--primary-selected)]");
                  void handleDocFileUpload(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed border-[var(--primary-base)] rounded-xl p-16 text-center hover:bg-[var(--primary-selected)] transition-all bg-[var(--surface-neutral)] mb-6 ${
                  isDocUploading
                    ? "opacity-60 pointer-events-none cursor-wait"
                    : "cursor-pointer"
                }`}
              >
                <div className="w-15 h-15 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center text-3xl mx-auto mb-4">
                  <Plus size={28} weight="regular" />
                </div>
                <div className="text-sm text-[var(--sidebar-text-sub)] mb-2">
                  Drag and drop or click to choose file
                </div>
                <div className="text-xs text-[var(--sidebar-text-muted)] flex items-center justify-center gap-1.5">
                  <Info size={12} weight="regular" />
                  <span>Max file size 10 MB</span>
                </div>
                <input
                  ref={docFileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  disabled={isDocUploading}
                  onChange={(e) => void handleDocFileUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Selected type file preview */}
              {(() => {
                const selectedDoc = bookingServerDocs.find(
                  (d) =>
                    normalizeBookingDocType(d.document_type) ===
                    normalizeBookingDocType(selectedBookingDocumentTypeId)
                );
                const selectedType = bookingDocumentTypes.find(
                  (x) => x.id === selectedBookingDocumentTypeId
                );
                if (!selectedType) return null;

                return (
                  <div className="mb-6">
                    {selectedDoc ? (
                      <div className="flex items-center justify-between gap-4 p-4 bg-[var(--surface-neutral)] border border-[var(--sidebar-border-color)] rounded-lg">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {selectedType.label}
                          </p>
                          <p className="text-xs text-[var(--sidebar-text-muted)] truncate">
                            {selectedDoc.document_name}
                          </p>
                          {selectedDoc.document_front_photo_url &&
                          selectedDoc.document_front_photo_url.startsWith(
                            "http"
                          ) ? (
                            <a
                              href={selectedDoc.document_front_photo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--primary-base)] font-medium mt-1 inline-block"
                            >
                              Open file
                            </a>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={isDocUploading || !leadId}
                          onClick={async () => {
                            if (!leadId || !selectedDoc) return;
                            try {
                              await deleteBookingDocument(leadId, selectedDoc.id);
                              setBookingServerDocs((prev) =>
                                prev.filter((d) => d.id !== selectedDoc.id)
                              );
                              toast.success("Document removed.");
                            } catch (e: unknown) {
                              const msg =
                                e && typeof e === "object" && "message" in e
                                  ? String((e as { message: string }).message)
                                  : "Could not remove document.";
                              toast.error(msg);
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-[var(--error)] text-white flex items-center justify-center hover:bg-[#dc2626] hover:scale-110 transition-all flex-shrink-0 disabled:opacity-50"
                          title="Remove"
                        >
                          <X size={14} weight="regular" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-center text-[var(--sidebar-text-muted)] py-4 text-sm">
                        Upload {selectedType.label}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-[var(--sidebar-text-sub)] mb-2">
                  Remark
                </label>
                <textarea
                  value={docRemark}
                  onChange={(e) => setDocRemark(e.target.value)}
                  placeholder="Add Remark For This Documents"
                  maxLength={500}
                  className="w-full min-h-[100px] p-3 border-2 border-[var(--sidebar-border-color)] rounded-lg text-sm font-inherit resize-y focus:outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-selected)] transition-all"
                />
                <div className="text-right text-xs text-[var(--sidebar-text-muted)] mt-1">
                  {docRemark.length}/500
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
