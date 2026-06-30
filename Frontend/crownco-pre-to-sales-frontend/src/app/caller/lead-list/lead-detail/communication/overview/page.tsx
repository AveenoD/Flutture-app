"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LeadProfileCard,
  RemarksSection,
  FollowUpsList,
  ActivityFeed,
  Tabs,
  Button,
  Drawer,
  SkeletonLoader,
  EmptyState,
} from "@/components/ui";
import type { LeadProfile } from "@/components/ui/cards/LeadProfileCard";
import type { Remark } from "@/components/ui/sections/RemarksSection";
import type { FollowUpItem } from "@/components/ui/lists/FollowUpsList";
import { Phone, MessageSquare, XCircle, CheckCircle2, Plus, Calendar, Clock, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLeadStore } from "@/contexts/LeadContext";

// Sample calls & chats history
const SAMPLE_CALLS_CHATS = [
  {
    id: "1",
    type: "call" as const,
    title: "Outgoing Call",
    description: "Discussed budget and property preferences. Very interested in 2BHK.",
    time: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    badge: "02:15",
  },
  {
    id: "2",
    type: "general" as const,
    title: "WhatsApp Chat",
    description: "Shared floor plan and price sheet. Customer asked about home loan options.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    icon: <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />,
  },
  {
    id: "3",
    type: "call" as const,
    title: "Incoming Call",
    description: "Customer called to confirm site visit timing for weekend.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    badge: "01:45",
  },
  {
    id: "4",
    type: "general" as const,
    title: "Email Sent",
    description: "Sent project brochure and location map via email.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  },
];

// Sample remarks
const SAMPLE_REMARKS: Remark[] = [
  {
    id: "1",
    text: "Very hot lead, wants to close in this month. Budget confirmed: 50L–60L.",
    createdAt: "Today, 10:20 AM",
  },
  {
    id: "2",
    text: "Interested in Maaz Palace 2BHK. Asked for site visit on weekend.",
    createdAt: "Yesterday, 5:45 PM",
  },
  {
    id: "3",
    text: "Home loan eligibility check needed. Prefers SBI or HDFC.",
    createdAt: "2 days ago",
  },
];

// Sample follow-ups
const SAMPLE_FOLLOW_UPS: FollowUpItem[] = [
  {
    id: "1",
    leadName: "Rajesh Kumar",
    type: "Call",
    scheduledTime: "Today, 4:00 PM",
    status: "pending",
    priority: "high",
    notes: "Follow up on home loan eligibility",
  },
  {
    id: "2",
    leadName: "Rajesh Kumar",
    type: "Message",
    scheduledTime: "Tomorrow, 10:00 AM",
    status: "pending",
    priority: "medium",
    notes: "Share updated price sheet",
  },
  {
    id: "3",
    leadName: "Rajesh Kumar",
    type: "Call",
    scheduledTime: "Yesterday, 3:00 PM",
    status: "completed",
    priority: "high",
    notes: "Discussed property details",
  },
];

// Remark suggestions
const REMARK_SUGGESTIONS = [
  "Customer very responsive, replies within minutes.",
  "Interested in quick possession, ready to pay advance.",
  "Family decision pending, will confirm after site visit.",
  "Asking for best price and additional amenities.",
];

function CommunicationOverviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "1"; // Get from URL, default to '1' for now
  const { getLeadById } = useLeadStore();

  // State management
  const [lead, setLead] = useState<LeadProfile | null>(null);
  const [callsChats, setCallsChats] = useState<any[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
  
  // Follow-up scheduling form state
  const [followUpForm, setFollowUpForm] = useState({
    type: "Call" as "Call" | "Message" | "Email",
    date: "",
    time: "",
    priority: "medium" as "high" | "medium" | "low",
    notes: "",
  });

  // Fetch lead data
  useEffect(() => {
    const fetchLeadData = async () => {
      try {
        setIsLoading(true);

        // Get lead from central mock store
        const storedLead = getLeadById(leadId);
        if (!storedLead) {
          setLead(null);
          setCallsChats([]);
          setRemarks([]);
          setFollowUps([]);
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
        setCallsChats(SAMPLE_CALLS_CHATS);
        setRemarks(SAMPLE_REMARKS);
        setFollowUps(SAMPLE_FOLLOW_UPS);
      } catch (error) {
        console.error("Error fetching lead data:", error);
        toast.error("Failed to load lead data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadData();
  }, [leadId, getLeadById]);

  const handleCallNow = () => {
    if (!lead) return;
    window.location.href = `tel:${lead.phone.replace(/\s/g, "")}`;
    toast.success(`Calling ${lead.name}...`);
  };

  const handleChatNow = () => {
    if (!lead) return;
    const whatsappUrl = `https://wa.me/${lead.phone.replace(/\D/g, "")}`;
    window.open(whatsappUrl, "_blank");
    toast.success(`Opening chat with ${lead.name}...`);
  };

  const handleRejected = () => {
    // Navigate to rejected form with lead ID
    router.push(`/caller/lead-list/rejected-form?leadId=${leadId}`);
  };

  const handleApproved = async () => {
    // Validation: Check if at least one remark exists
    if (remarks.length === 0) {
      toast.error("Please add at least one remark before approving");
      return;
    }

    // Validation: Check if at least one communication happened
    if (callsChats.length === 0) {
      toast.error("Please have at least one communication before approving");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // TODO: API call to update lead status
      // const response = await fetch(`/api/leads/${leadId}/approve`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     status: 'approved',
      //     remarks: remarks,
      //     stage: 'site-visit'
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to approve lead');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success("Lead approved successfully! Moving to site visit stage...");
      
      // Navigate to next stage with lead ID
      router.push(`/caller/lead-list/lead-detail/site-visit/overview?leadId=${leadId}`);
    } catch (error) {
      console.error('Error approving lead:', error);
      toast.error("Failed to approve lead. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleScheduleFollowUp = () => {
    setIsScheduleDrawerOpen(true);
  };

  const handleCloseScheduleDrawer = () => {
    setIsScheduleDrawerOpen(false);
    setFollowUpForm({
      type: "Call",
      date: "",
      time: "",
      priority: "medium",
      notes: "",
    });
  };

  const handleFollowUpFormChange = (
    field: keyof typeof followUpForm,
    value: string
  ) => {
    setFollowUpForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!followUpForm.date || !followUpForm.time) {
      toast.error("Please fill date and time");
      return;
    }

    try {
      const followUpDate = new Date(followUpForm.date);
      const formattedDate = followUpDate.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const formattedTime = `${formattedDate}, ${followUpForm.time}`;

      // TODO: API call to save follow-up
      // const response = await fetch(`/api/leads/${leadId}/follow-ups`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     type: followUpForm.type,
      //     scheduledDate: followUpForm.date,
      //     scheduledTime: followUpForm.time,
      //     priority: followUpForm.priority,
      //     notes: followUpForm.notes
      //   })
      // });
      // if (!response.ok) throw new Error('Failed to schedule follow-up');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const newFollowUp: FollowUpItem = {
        id: String(followUps.length + 1),
        leadName: lead?.name || "Lead",
        type: followUpForm.type,
        scheduledTime: formattedTime,
        status: "pending",
        priority: followUpForm.priority,
        notes: followUpForm.notes || "No notes",
      };

      setFollowUps((prev) => [newFollowUp, ...prev]);
      setIsScheduleDrawerOpen(false);
      toast.success("Follow-up scheduled successfully");
      handleCloseScheduleDrawer();
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      toast.error("Failed to schedule follow-up. Please try again.");
    }
  };

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      count: callsChats.length,
    },
    {
      id: "follow-ups",
      label: "Follow Ups",
      count: followUps.filter((f) => f.status === "pending").length,
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <SkeletonLoader type="card" height="8rem" />
        <div className="space-y-4">
          <SkeletonLoader type="card" height="4rem" />
          <SkeletonLoader type="card" height="20rem" />
          <SkeletonLoader type="card" height="20rem" />
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

      {/* Call Now / Chat Now Actions - Below Lead Card */}
      <section>
        <div className="flex justify-end items-center sm:flex-row gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={handleCallNow}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all bg-[var(--primary-base)] hover:bg-[var(--primary-hover)] text-white font-semibold"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <span className="text-base">Call Now</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleChatNow}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-600 transition-all bg-white font-semibold shadow-sm hover:shadow-md"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-base">Chat Now</span>
          </Button>
        </div>
      </section>

      {/* Tabs: Overview / Follow Ups */}
      <section>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="default"
          className="mb-4"
        />

        {/* Overview Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Recent Calls & Chats Timeline */}
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
              <ActivityFeed
                title="Recent Calls & Chats"
                activities={callsChats}
                maxItems={10}
                showViewMore={false}
                className="bg-transparent shadow-none p-0"
              />
            </div>

            {/* Remarks Section */}
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
              <RemarksSection
                title="Communication Remarks"
                initialRemarks={remarks}
                suggestions={REMARK_SUGGESTIONS}
                onChange={setRemarks}
                className="bg-transparent border-none p-0"
              />
            </div>
          </div>
        )}

        {/* Follow Ups Tab Content */}
        {activeTab === "follow-ups" && (
          <div className="space-y-4">
            {/* Schedule Follow-up Button */}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleScheduleFollowUp}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Schedule Follow-up
              </Button>
            </div>

            {/* Follow Ups List */}
            <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5">
              <FollowUpsList
                title="Scheduled Follow-ups"
                followUps={followUps}
                maxItems={10}
                showViewMore={true}
                className="bg-transparent border-none shadow-none p-0"
              />
            </div>
          </div>
        )}
      </section>

      {/* Bottom Actions */}
      <section className="mt-4">
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="text-xs sm:text-sm text-slate-500">
            Step 2 of 5: Communication – nurture the lead through calls, chats, and
            follow-ups.
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
              onClick={handleApproved}
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
                  Mark as Approved & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Schedule Follow-up Drawer */}
      <Drawer
        title="Schedule Follow-up"
        open={isScheduleDrawerOpen}
        onClose={handleCloseScheduleDrawer}
      >
        <form onSubmit={handleSubmitFollowUp} className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Follow-up Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Call", "Message", "Email"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFollowUpFormChange("type", type)}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-colors ${
                    followUpForm.type === type
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
            <label className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <input
              type="date"
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
              value={followUpForm.date}
              onChange={(e) => handleFollowUpFormChange("date", e.target.value)}
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
              value={followUpForm.time}
              onChange={(e) => handleFollowUpFormChange("time", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-medium text-slate-700">
              Priority
            </label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as const).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => handleFollowUpFormChange("priority", priority)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-colors ${
                    followUpForm.priority === priority
                      ? "bg-[var(--primary-base)] text-white border-[var(--primary-base)]"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
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
              placeholder="Add any notes or reminders for this follow-up..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)] resize-none"
              value={followUpForm.notes}
              onChange={(e) =>
                handleFollowUpFormChange("notes", e.target.value)
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
              Schedule Follow-up
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

// Main component with Suspense for useSearchParams
export default function CommunicationOverviewPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 sm:space-y-8">
          <SkeletonLoader type="card" height="8rem" />
          <div className="space-y-4">
            <SkeletonLoader type="card" height="4rem" />
            <SkeletonLoader type="card" height="20rem" />
            <SkeletonLoader type="card" height="20rem" />
          </div>
        </div>
      }
    >
      <CommunicationOverviewContent />
    </Suspense>
  );
}
