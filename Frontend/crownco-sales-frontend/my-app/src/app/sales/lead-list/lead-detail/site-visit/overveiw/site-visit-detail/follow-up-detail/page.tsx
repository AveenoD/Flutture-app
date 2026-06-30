"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "phosphor-react";
import type { CallRecording, LeadData } from "../../../../../../../../components/ui/followUpPage";
import { FollowUpPage } from "../../../../../../../../components/ui/followUpPage";
import type { StatusType } from "../../../../../../../../components/ui/badges";
import { apiFetch } from "../../../../../../../../lib/apiClient";
import { getLeadSummary, type LeadSummary } from "../../../../../../../../lib/leads";
import { toast } from "sonner";

export default function SiteVisitDetailFollowUpDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const leadId = searchParams.get("leadId");
  const followUpId = searchParams.get("followUpId");

  const [leadSummary, setLeadSummary] = useState<LeadSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [remarks, setRemarks] = useState<string[]>([]);
  const [callRecording, setCallRecording] = useState<CallRecording | null>(null);

  type FollowUpDetailBackend = {
    success: boolean;
    message: string;
    data?: {
      follow_up: {
        id: string;
        followup_date: string;
        followup_type?: string;
        remark?: string | null;
        status?: string | null;
        outcome?: string | null;
        created_at?: string;
        completed_at?: string | null;
      };
      stage?: {
        id?: string;
        stage_type?: string;
        remarks?: string | null;
        status?: string | null;
        created_at?: string;
        updated_at?: string;
      };
      linked_call?: {
        call_outcome?: string | null;
        call_started_at?: string | null;
        call_ended_at?: string | null;
        recording_url?: string | null;
        recording_duration?: number | null;
      };
    };
  };

  const formatDuration = (seconds?: number | null): string => {
    if (!seconds || seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const leadData: LeadData | null = useMemo(() => {
    if (!leadSummary?.lead) return null;
    const lead = leadSummary.lead;

    const status: StatusType = (lead.lead_temperature as StatusType | null) ?? "cold";

    const budget =
      lead.budget_min != null && lead.budget_max != null
        ? `₹${lead.budget_min}L - ₹${lead.budget_max}L`
        : "N/A";

    const propertyId =
      leadSummary.interested_property?.project_title ??
      lead.project_title ??
      "—";

    return {
      // UI-only; backend ids are UUIDs.
      id: 1,
      name: lead.name ?? "—",
      phone: lead.phone ?? "—",
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(lead.id)}`,
      budget,
      propertyId,
      location: lead.city ?? "—",
      status,
      source: lead.source ?? "—",
      timeFrame: "—",
    };
  }, [leadSummary]);

  useEffect(() => {
    const run = async () => {
      if (!leadId || !followUpId) {
        setError("Missing `leadId` or `followUpId` in URL.");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setRemarks([]);
        setCallRecording(null);

        const [summaryRes, followUpRes] = await Promise.all([
          getLeadSummary(leadId),
          apiFetch<FollowUpDetailBackend>(
            `/api/v1/leads/${encodeURIComponent(leadId)}/follow-ups/${encodeURIComponent(
              followUpId
            )}`
          ),
        ]);

        setLeadSummary(summaryRes);

        const data = followUpRes.data;
        const fu = data?.follow_up;
        const stage = data?.stage;
        const linkedCall = data?.linked_call;

        const nextRemarks: string[] = [];
        if (fu?.remark) nextRemarks.push(fu.remark);
        if (stage?.remarks) {
          const lines = stage.remarks
            .split(/\n+/)
            .map((r) => r.trim())
            .filter(Boolean);
          nextRemarks.push(...lines);
        }
        setRemarks(nextRemarks);

        const timestampRaw =
          linkedCall?.call_started_at ??
          linkedCall?.call_ended_at ??
          fu?.followup_date ??
          null;

        const timestamp = timestampRaw
          ? new Date(timestampRaw).toLocaleString()
          : "—";

        setCallRecording({
          timestamp,
          duration: formatDuration(linkedCall?.recording_duration ?? null),
          currentTime: "0:00",
          transcription:
            linkedCall?.call_outcome ??
            "Call recording transcription will appear here when available.",
        });
      } catch (err: any) {
        const msg = err?.message || "Failed to load follow-up detail.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [leadId, followUpId]);

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors shadow-sm"
          aria-label="Go back"
        >
          <ArrowLeft size={18} weight="regular" className="text-[#2D3748]" />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-[#2D3748]">Follow Ups Detail</h1>
      </div>

      {/* Main Content */}
      {loading && <p className="text-sm text-[#718096]">Loading follow-up...</p>}
      {!loading && error && (
        <div className="bg-white border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md text-center shadow-sm">
          {error}
        </div>
      )}
      {!loading && !error && leadData && callRecording && (
        <FollowUpPage
          leadData={leadData}
          remarks={remarks}
          callRecording={callRecording}
        />
      )}
    </div>
  );
}