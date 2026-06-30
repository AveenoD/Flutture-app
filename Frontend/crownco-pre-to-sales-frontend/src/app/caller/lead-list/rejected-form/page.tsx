"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LeadProfileCard,
  RemarksSection,
  Button,
  Breadcrumbs,
} from "@/components/ui";
import type { LeadProfile } from "@/components/ui/cards/LeadProfileCard";
import type { Remark } from "@/components/ui/sections/RemarksSection";
import { XCircle, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Sample lead (future: read from URL or context)
const SAMPLE_LEAD: LeadProfile = {
  id: "1",
  name: "Rajesh Kumar",
  phone: "+91 98765 43210",
  email: "rajesh@example.com",
  status: "veryhot",
  source: "Website",
  location: "Pune, Maharashtra",
  budgetLabel: "₹50L – ₹60L",
  priority: "high",
};

// Rejection reasons
const REJECTION_REASONS = [
  "Budget mismatch",
  "Not interested",
  "Location not suitable",
  "Timeline mismatch",
  "Found better option",
  "Duplicate lead",
  "Invalid contact",
  "Other",
];

// Remark suggestions for rejection
const REJECTION_REMARK_SUGGESTIONS = [
  "Customer budget was too low for available properties.",
  "Customer found a property from another builder.",
  "Customer is not ready to make a decision right now.",
  "Contact information provided was incorrect.",
];

export default function RejectedFormPage() {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReason) {
      toast.error("Please select a rejection reason");
      return;
    }

    setIsSubmitting(true);

    // Future: API call to mark lead as rejected
    // await markLeadAsRejected(leadId, { reason: selectedReason, remarks });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Lead marked as rejected successfully");
    setIsSubmitting(false);
    router.push("/caller/lead-list");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumbs */}
        <div className="mb-4 sm:mb-6">
          <Breadcrumbs
            items={[
              { label: "Lead List", href: "/caller/lead-list" },
              { label: "Reject Lead", isCurrent: true },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-red-100 text-red-600">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Reject Lead
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Please provide a reason for rejecting this lead. This information
            will help improve future lead qualification.
          </p>
        </div>

        {/* Lead Summary */}
        <section className="mb-6 sm:mb-8">
          <LeadProfileCard lead={SAMPLE_LEAD} variant="detailed" />
        </section>

        {/* Rejection Form */}
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Rejection Reason */}
          <section className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              Rejection Reason
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold border transition-colors text-left ${
                    selectedReason === reason
                      ? "bg-red-50 border-red-500 text-red-700"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </section>

          {/* Rejection Remarks */}
          <section className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm">
            <RemarksSection
              title="Rejection Remarks"
              initialRemarks={remarks}
              suggestions={REJECTION_REMARK_SUGGESTIONS}
              onChange={setRemarks}
              className="bg-transparent border-none p-0"
            />
          </section>

          {/* Actions */}
          <section className="flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-200 pt-4 sm:pt-6">
            <Button
              type="button"
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 border-red-600 text-white w-full sm:w-auto"
              disabled={isSubmitting || !selectedReason}
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-1" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </section>
        </form>
      </div>
    </div>
  );
}

