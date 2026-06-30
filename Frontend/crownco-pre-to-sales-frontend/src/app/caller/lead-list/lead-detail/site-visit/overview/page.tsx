"use client";

import React, { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LeadProfileCard,
  ScheduledVisits,
  RemarksSection,
  Drawer,
  Button,
  ActivityFeed,
  SkeletonLoader,
  EmptyState,
  PropertyVisitCard,
} from "@/components/ui";
import type { LeadProfile } from "@/components/ui/cards/LeadProfileCard";
import type { Remark } from "@/components/ui/sections/RemarksSection";
import type { VisitDetail, VisitStatus } from "@/components/ui/cards/PropertyVisitCard";
import { Calendar, MapPin, Clock, XCircle, CheckCircle2, Plus, RefreshCw, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useLeadStore } from "@/contexts/LeadContext";

// Visit type matching ScheduledVisits component structure
type Visit = {
  name: string;
  avatar: string;
  time: string;
  status: VisitStatus;
};

// Sample visits for ScheduledVisits component
const SAMPLE_VISITS: Visit[] = [
  {
    name: "Maaz Palace – First Visit",
    avatar: "/pexels-karola-g-6345317.jpg",
    time: "Today, 4:00 PM",
    status: "pending",
  },
  {
    name: "Zara Palace – Revisit",
    avatar: "/pexels-karola-g-6345317.jpg",
    time: "Tomorrow, 11:30 AM",
    status: "revisit",
  },
  {
    name: "Maaz Palace – Completed Visit",
    avatar: "/pexels-karola-g-6345317.jpg",
    time: "Yesterday, 5:00 PM",
    status: "completed",
  },
];

const SAMPLE_VISIT_DETAILS: VisitDetail[] = [
  {
    id: "1",
    project: "Maaz Palace",
    property: "2BHK, Wing A, Flat 301",
    date: "Today",
    time: "4:00 PM",
    type: "First Visit",
    status: "pending",
    notes: "Customer requested to see higher floor with garden view",
  },
  {
    id: "2",
    project: "Zara Palace",
    property: "2.5BHK, Wing B, Flat 502",
    date: "Tomorrow",
    time: "11:30 AM",
    type: "Revisit",
    status: "revisit",
    notes: "Family wants to compare with Maaz Palace before decision",
  },
  {
    id: "3",
    project: "Maaz Palace",
    property: "Sample Tower, 2BHK Demo Flat",
    date: "Yesterday",
    time: "5:00 PM",
    type: "First Visit",
    status: "completed",
    notes: "Customer liked location and connectivity. Parking appreciated.",
  },
];

// Sample visit remarks
const SAMPLE_REMARKS: Remark[] = [
  {
    id: "1",
    text: "Customer liked Maaz Palace location and connectivity. Parking and garden area appreciated.",
    createdAt: "Today, 5:30 PM",
  },
  {
    id: "2",
    text: "Family is more inclined towards Maaz Palace but also wants to compare with Zara Palace.",
    createdAt: "Yesterday, 6:15 PM",
  },
  {
    id: "3",
    text: "Requested one more revisit on weekend with parents.",
    createdAt: "2 days ago",
  },
];

// Remark suggestions for site visit
const VISIT_REMARK_SUGGESTIONS = [
  "Customer liked the sample flat and project amenities.",
  "Customer is price sensitive, asked for best offer after visit.",
  "Family wants one more revisit before final decision.",
  "Customer prefers higher floor with garden/amenities view.",
];

function SiteVisitOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "1"; // Get from URL, default to '1' for now
  const { getLeadById } = useLeadStore();

  // State management
  const [lead, setLead] = useState<LeadProfile | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [visitDetails, setVisitDetails] = useState<VisitDetail[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);

  // Visit scheduling form state
  const [visitForm, setVisitForm] = useState({
    date: "",
    time: "",
    project: "Maaz Palace",
    property: "",
    type: "First Visit" as "First Visit" | "Revisit",
    notes: "",
  });

  // Fetch lead data
  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setIsLoading(true);

        // Get lead from central store so Site Visit shows correct profile
        const storedLead = getLeadById(leadId);
        if (!storedLead) {
          setLead(null);
          setVisits([]);
          setVisitDetails([]);
          setRemarks([]);
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

        // For now, visits & remarks still use local sample data
        await new Promise((resolve) => setTimeout(resolve, 300));
        setVisits(SAMPLE_VISITS);
        setVisitDetails(SAMPLE_VISIT_DETAILS);
        setRemarks(SAMPLE_REMARKS);
      } catch (error) {
        console.error("Error fetching lead data:", error);
        toast.error("Failed to load lead data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadData();
  }, [leadId, getLeadById]);

  // Get upcoming visit (first pending or revisit)
  const upcomingVisit = useMemo(
    () => visitDetails.find((v) => v.status === "pending" || v.status === "revisit") ?? visitDetails[0],
    [visitDetails]
  );

  // Get visit history for ActivityFeed
  const visitHistory = useMemo(() => {
    return visitDetails
      .filter((v) => v.status === "completed")
      .map((v) => ({
        id: v.id,
        type: "visit" as const,
        title: `${v.type} - ${v.project}`,
        description: v.notes || `${v.property} visited on ${v.date} at ${v.time}`,
        time: new Date(Date.now() - (v.id === "3" ? 1000 * 60 * 60 * 24 : 0)),
        badge: v.type,
      }))
      .reverse();
  }, [visitDetails]);

  const handleOpenScheduleDrawer = () => {
    setIsScheduleDrawerOpen(true);
  };

  const handleCloseScheduleDrawer = () => {
    setIsScheduleDrawerOpen(false);
    // Reset form
    setVisitForm({
      date: "",
      time: "",
      project: "Maaz Palace",
      property: "",
      type: "First Visit",
      notes: "",
    });
  };

  const handleVisitFormChange = (
    field: keyof typeof visitForm,
    value: string
  ) => {
    setVisitForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!visitForm.date || !visitForm.time || !visitForm.project) {
      toast.error("Please fill date, time and project");
      return;
    }

    try {
      const visitDate = new Date(visitForm.date);
      const formattedDate = visitDate.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const formattedTime = `${formattedDate}, ${visitForm.time}`;

      // TODO: API call to save visit
      // const response = await fetch(`/api/leads/${leadId}/visits`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     date: visitForm.date,
      //     time: visitForm.time,
      //     project: visitForm.project,
      //     property: visitForm.property,
      //     type: visitForm.type,
      //     notes: visitForm.notes
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to schedule visit');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Add to ScheduledVisits list
      const newVisit: Visit = {
        name: `${visitForm.project} – ${visitForm.type}`,
        avatar: "/pexels-karola-g-6345317.jpg",
        time: formattedTime,
        status: visitForm.type === "Revisit" ? "revisit" : "pending",
      };

      // Add to visit details
      const newVisitDetail: VisitDetail = {
        id: String(visitDetails.length + 1),
        project: visitForm.project,
        property: visitForm.property || "To be decided",
        date: formattedDate,
        time: visitForm.time,
        type: visitForm.type,
        status: visitForm.type === "Revisit" ? "revisit" : "pending",
        notes: visitForm.notes,
      };

      setVisits((prev) => [newVisit, ...prev]);
      setVisitDetails((prev) => [newVisitDetail, ...prev]);
      setIsScheduleDrawerOpen(false);
      toast.success("Visit scheduled successfully");
      
      // Reset form
      handleCloseScheduleDrawer();
    } catch (error) {
      console.error('Error scheduling visit:', error);
      toast.error("Failed to schedule visit. Please try again.");
    }
  };

  const handleMarkNotInterested = () => {
    // Navigate to rejected form with lead ID
    router.push(`/caller/lead-list/rejected-form?leadId=${leadId}`);
  };

  const handleMoveToNegotiation = async () => {
    // Validation: Check if at least one completed visit exists
    const hasCompletedVisit = visitDetails.some((v) => v.status === "completed");
    if (!hasCompletedVisit) {
      toast.error("Please complete at least one visit before moving to negotiation");
      return;
    }

    // Validation: Check if at least one remark exists
    if (remarks.length === 0) {
      toast.error("Please add at least one visit remark before moving to negotiation");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // TODO: API call to update lead status
      // const response = await fetch(`/api/leads/${leadId}/move-to-negotiation`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     status: 'negotiation',
      //     remarks: remarks,
      //     stage: 'negotiation'
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to move to negotiation');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Moving to negotiation stage...");
      
      // Navigate to next stage with lead ID
      router.push(`/caller/lead-list/lead-detail/negotiation/overview?leadId=${leadId}`);
    } catch (error) {
      console.error('Error moving to negotiation:', error);
      toast.error("Failed to move to negotiation. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <SkeletonLoader type="card" height="8rem" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <SkeletonLoader type="card" height="20rem" />
          </div>
          <div className="space-y-4">
            <SkeletonLoader type="card" height="15rem" />
            <SkeletonLoader type="card" height="20rem" />
          </div>
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

      {/* Main layout: Visits + Details/Remarks */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Scheduled / Past Visits */}
        <div className="space-y-4 sm:space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              Site Visits
            </h2>
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenScheduleDrawer}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Schedule Visit
            </Button>
          </div>

          <ScheduledVisits title="Scheduled & Past Visits" visits={visits} />
        </div>

        {/* Right: Visit Details + Remarks */}
        <div className="space-y-4 sm:space-y-5 max-h-[600px] overflow-y-auto">
          {/* Visit Details Card */}
          {upcomingVisit ? (
            <PropertyVisitCard
              visit={upcomingVisit}
              title="Visit Details"
              showHelperText={true}
            />
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm">
              <div className="text-xs sm:text-sm text-slate-500 text-center py-4">
                No visits scheduled yet. Use{" "}
                <span className="font-semibold">Schedule Visit</span> to plan
                the first site visit.
              </div>
            </div>
          )}

          {/* Visit History */}
          {visitHistory.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
              <ActivityFeed
                title="Visit History"
                activities={visitHistory}
                maxItems={5}
                showViewMore={false}
                className="bg-transparent shadow-none p-0"
              />
            </div>
          )}

          {/* Visit Remarks */}
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
            <RemarksSection
              title="Visit Remarks"
              initialRemarks={remarks}
              suggestions={VISIT_REMARK_SUGGESTIONS}
              onChange={setRemarks}
              className="bg-transparent border-none p-0"
            />
          </div>
        </div>
      </section>

      {/* Bottom Actions */}
      <section className="mt-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="text-xs sm:text-sm text-slate-500">
            Step 3 of 5: Site Visit – schedule, track, and capture customer
            feedback before moving to negotiation.
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={handleMarkNotInterested}
              disabled={isSubmitting}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Mark as Not Interested
            </Button>
            <Button
              variant="primary"
              onClick={handleMoveToNegotiation}
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
                  Move to Negotiation
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Schedule Visit Drawer */}
      <Drawer
        title="Schedule Site Visit"
        open={isScheduleDrawerOpen}
        onClose={handleCloseScheduleDrawer}
      >
        <form onSubmit={handleScheduleVisit} className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <input
              type="date"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
              value={visitForm.date}
              onChange={(e) => handleVisitFormChange("date", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time
            </label>
            <input
              type="time"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
              value={visitForm.time}
              onChange={(e) => handleVisitFormChange("time", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Project
            </label>
            <select
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
              value={visitForm.project}
              onChange={(e) =>
                handleVisitFormChange("project", e.target.value)
              }
            >
              <option value="Maaz Palace">Maaz Palace</option>
              <option value="Zara Palace">Zara Palace</option>
              <option value="Crown Heights">Crown Heights</option>
              <option value="GreenVille Orchid">GreenVille Orchid</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Property / Unit Preference
            </label>
            <input
              type="text"
              placeholder="e.g. 2BHK, higher floor, garden view"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
              value={visitForm.property}
              onChange={(e) =>
                handleVisitFormChange("property", e.target.value)
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Visit Type
            </label>
            <div className="flex gap-2">
              {(["First Visit", "Revisit"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleVisitFormChange("type", type)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-colors ${
                    visitForm.type === type
                      ? "bg-[var(--primary-base)] text-white border-[var(--primary-base)]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Any special requirements or notes for this visit..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] resize-none"
              value={visitForm.notes}
              onChange={(e) =>
                handleVisitFormChange("notes", e.target.value)
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="text-slate-600"
              onClick={handleCloseScheduleDrawer}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Schedule Visit
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// Main component with Suspense for useSearchParams
export default function SiteVisitOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 sm:space-y-8">
          <SkeletonLoader type="card" height="8rem" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <SkeletonLoader type="card" height="20rem" />
            </div>
            <div className="space-y-4">
              <SkeletonLoader type="card" height="15rem" />
              <SkeletonLoader type="card" height="20rem" />
            </div>
          </div>
        </div>
      }
    >
      <SiteVisitOverviewContent />
    </Suspense>
  );
}
