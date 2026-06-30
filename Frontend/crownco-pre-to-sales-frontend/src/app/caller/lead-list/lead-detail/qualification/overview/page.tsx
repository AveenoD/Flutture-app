"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LeadProfileCard,
  CallRecordingList,
  RemarksSection,
  LeadCardDrawer,
  Button,
  SkeletonLoader,
  EmptyState,
} from "@/components/ui";
import type { LeadProfile } from "@/components/ui/cards/LeadProfileCard";
import type { CallRecording } from "@/components/ui/lists/CallRecordingList";
import type { Remark } from "@/components/ui/sections/RemarksSection";
import { XCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLeadStore } from "@/contexts/LeadContext";

// Sample call recordings
const SAMPLE_CALLS: CallRecording[] = [
  {
    id: "1",
    title: "Initial Inquiry Call",
    duration: "5:45",
    createdAt: "Today, 2:30 PM",
    transcription:
      "This is a sample transcription of the call recording. It would contain the full text of what was said during the call. The client showed interest in 2BHK units and asked about pricing and location details. They mentioned their budget is around 50-60 lakhs and are looking for properties in Pune area. The client also inquired about home loan options and preferred payment plans.",
  },
  {
    id: "2",
    title: "Follow-up on Budget",
    duration: "3:20",
    createdAt: "Yesterday, 5:40 PM",
    transcription:
      "Follow-up call regarding budget clarification. Client confirmed their budget range and asked about available units in Maaz Palace and Zara Palace projects. Discussed payment plans and EMI options. Client expressed interest in scheduling a site visit for the upcoming weekend.",
  },
];

// Sample remarks
const SAMPLE_REMARKS: Remark[] = [
  {
    id: "1",
    text: "Interested in 2BHK, budget 50L–60L, prefers Maaz Palace / Zara Palace.",
    createdAt: "Today, 10:20 AM",
  },
  {
    id: "2",
    text: "Asked for site visit on weekend, family will join.",
    createdAt: "Yesterday, 5:45 PM",
  },
];

// Remark suggestions
const REMARK_SUGGESTIONS = [
  "Very hot lead, wants to close in this month.",
  "Need to share updated price sheet and floor plan.",
  "Ask about home loan eligibility and tie-up banks.",
];

function QualificationOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "1"; // Get from URL, default to '1' for now
  const { getLeadById } = useLeadStore();

  // State management
  const [lead, setLead] = useState<LeadProfile | null>(null);
  const [recordings, setRecordings] = useState<CallRecording[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [hasLeadCard, setHasLeadCard] = useState(false);
  const [createdLeadCardData, setCreatedLeadCardData] = useState<any>(null);

  // Fetch lead data
  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setIsLoading(true);

        const storedLead = getLeadById(leadId);
        if (!storedLead) {
          setLead(null);
          setRecordings([]);
          setRemarks([]);
          setHasLeadCard(false);
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
        setRecordings(SAMPLE_CALLS);
        setRemarks(SAMPLE_REMARKS);
        setHasLeadCard(false); // Will be set to true after lead card is created
      } catch (error) {
        console.error("Error fetching lead data:", error);
        toast.error("Failed to load lead data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadData();
  }, [leadId, getLeadById]);

  const handleRejected = () => {
    // Navigate to rejected form with lead ID
    router.push(`/caller/lead-list/rejected-form?leadId=${leadId}`);
  };

  const handleQualified = async () => {
    // Validation: Check if lead card is created
    if (!hasLeadCard) {
      toast.error("Please create a lead card before qualifying this lead");
      setIsLeadDrawerOpen(true);
      return;
    }

    // Validation: Check if at least one remark exists
    if (remarks.length === 0) {
      toast.error("Please add at least one remark before qualifying");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // TODO: API call to update lead status
      // const response = await fetch(`/api/leads/${leadId}/qualify`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     status: 'qualified',
      //     remarks: remarks,
      //     stage: 'communication'
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to qualify lead');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Lead qualified successfully! Moving to communication stage...");
      
      // Navigate to next stage with lead ID
      router.push(`/caller/lead-list/lead-detail/communication/overview?leadId=${leadId}`);
    } catch (error) {
      console.error('Error qualifying lead:', error);
      toast.error("Failed to qualify lead. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleLeadCardSubmit = async (values: any) => {
    try {
      // TODO: API call to save/update lead card
      // const response = await fetch(`/api/leads/${leadId}/lead-card`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(values)
      // });
      // if (!response.ok) throw new Error('Failed to save lead card');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Store created lead card data
      setCreatedLeadCardData(values);
      setHasLeadCard(true);
      setIsLeadDrawerOpen(false);
      toast.success("Lead card saved successfully!");
      
      // Update lead data if needed
      if (lead) {
        setLead({
          ...lead,
          name: values.name,
          phone: values.phone,
          email: values.email || lead.email,
          source: values.source || lead.source,
        });
      }
    } catch (error) {
      console.error('Error saving lead card:', error);
      toast.error("Failed to save lead card. Please try again.");
    }
  };

  const handleRecordingPlay = (call: CallRecording) => {
    // TODO: Implement actual audio playback
    console.log("Play recording:", call);
    toast.info(`Playing: ${call.title}`);
  };

  const handleRecordingDownload = (call: CallRecording) => {
    // TODO: Implement actual download
    console.log("Download recording:", call);
    toast.info(`Downloading: ${call.title}`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <SkeletonLoader type="card" height="8rem" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <SkeletonLoader type="card" height="20rem" />
            <SkeletonLoader type="card" height="8rem" />
          </div>
          <SkeletonLoader type="card" height="28rem" />
        </div>
      </div>
    );
  }

  // Empty state
  if (!lead) {
    return (
      <EmptyState
        variant="no-data"
        title="Lead not found"
        description="The lead you're looking for doesn't exist or has been removed."
        action={{
          label: "Back to Lead List",
          onClick: () => router.push('/caller/lead-list')
        }}
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Lead Summary */}
      <section>
        <LeadProfileCard lead={lead} variant="detailed" />
      </section>

      {/* Main Two Column Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Call Recordings + Create Lead Card CTA */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
            <CallRecordingList
              title="Call Recordings"
              recordings={recordings}
              maxItems={5}
              onPlay={handleRecordingPlay}
              onDownload={handleRecordingDownload}
              className="bg-transparent border-none p-0"
            />
          </div>

          {/* Create/Update Lead Card CTA */}
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                  {hasLeadCard ? "Update Lead Card" : "Create Lead Card"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {hasLeadCard
                    ? "Update qualification details for this lead."
                    : "Save qualification details as a structured lead card for later stages."}
                </p>
              </div>
              <Button
                size="sm"
                variant={hasLeadCard ? "outline" : "primary"}
                onClick={() => setIsLeadDrawerOpen(true)}
              >
                {hasLeadCard ? "Update" : "Create"}
              </Button>
            </div>
            {hasLeadCard && createdLeadCardData && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-start gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-emerald-700 mb-2">
                      Lead Card Created Successfully
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">Name:</span>
                        <span>{createdLeadCardData.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">Phone:</span>
                        <span>{createdLeadCardData.phone}</span>
                      </div>
                      {createdLeadCardData.email && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">Email:</span>
                          <span>{createdLeadCardData.email}</span>
                        </div>
                      )}
                      {createdLeadCardData.source && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">Source:</span>
                          <span>{createdLeadCardData.source}</span>
                        </div>
                      )}
                      {(createdLeadCardData.budgetMin || createdLeadCardData.budgetMax) && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">Budget:</span>
                          <span>
                            {createdLeadCardData.budgetMin && createdLeadCardData.budgetMax
                              ? `₹${(createdLeadCardData.budgetMin / 100000).toFixed(1)}L – ₹${(createdLeadCardData.budgetMax / 100000).toFixed(1)}L`
                              : createdLeadCardData.budgetMin
                              ? `₹${(createdLeadCardData.budgetMin / 100000).toFixed(1)}L+`
                              : createdLeadCardData.budgetMax
                              ? `Up to ₹${(createdLeadCardData.budgetMax / 100000).toFixed(1)}L`
                              : "Not specified"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Remarks Section */}
        <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
          <RemarksSection
            title="Qualification Remarks"
            initialRemarks={remarks}
            suggestions={REMARK_SUGGESTIONS}
            onChange={setRemarks}
            className="bg-transparent border-none p-0"
          />
        </div>
      </section>

      {/* Bottom Actions */}
      <section className="mt-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="text-xs sm:text-sm text-slate-500">
            Step 1 of 5: Qualification – decide if this lead should move
            forward.
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={handleRejected}
              disabled={isSubmitting}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Mark as Rejected
            </Button>
            <Button
              variant="primary"
              onClick={handleQualified}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Qualified & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Lead Card Drawer */}
      <LeadCardDrawer
        open={isLeadDrawerOpen}
        onClose={() => setIsLeadDrawerOpen(false)}
        initialValues={{
          name: createdLeadCardData?.name || lead.name,
          phone: createdLeadCardData?.phone || lead.phone,
          email: createdLeadCardData?.email || lead.email || "",
          source: createdLeadCardData?.source || lead.source || "",
          budgetMin: createdLeadCardData?.budgetMin,
          budgetMax: createdLeadCardData?.budgetMax,
        }}
        onSubmit={handleLeadCardSubmit}
      />
    </div>
  );
}

// Main component with Suspense for useSearchParams
export default function QualificationOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 sm:space-y-8">
          <SkeletonLoader type="card" height="8rem" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <SkeletonLoader type="card" height="20rem" />
              <SkeletonLoader type="card" height="8rem" />
            </div>
            <SkeletonLoader type="card" height="28rem" />
          </div>
        </div>
      }
    >
      <QualificationOverviewContent />
    </Suspense>
  );
}