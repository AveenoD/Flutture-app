/* eslint-disable jsx-a11y/alt-text */
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "phosphor-react";
import { StatusType } from "../../../../../../../components/ui/badges";
import {
  CallRecording,
  FollowUpPage,
  LeadData,
} from "../../../../../../../components/ui/followUpPage";
import { apiGet } from "../../../../../../../lib/apiClient";

interface GetLeadResponse {
  success: boolean;
  message: string;
  data: {
    lead: {
      id: string;
      name: string;
      phone: string;
      city?: string | null;
      project_title?: string | null;
      lead_temperature: StatusType;
      budget_min?: number | null;
      budget_max?: number | null;
      source?: string | null;
      expected_closure?: string | null;
    };
  };
}

interface GetFollowUpDetailResponse {
  success: boolean;
  message: string;
  data: {
    follow_up: {
      id: string;
      lead_id: string;
      lead_stage_id: string | null;
      followup_type: string;
      followup_date: string;
      remark?: string | null;
      status: string;
      outcome?: string | null;
      created_at: string;
      completed_at?: string | null;
    };
    stage: {
      id: string;
      lead_id: string;
      stage_type: string;
      remarks?: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    } | null;
    linked_call: {
      id: string;
      lead_stage_id: string;
      call_status: string;
      call_outcome?: string | null;
      call_started_at?: string | null;
      call_ended_at?: string | null;
      recording_url?: string | null;
      recording_duration?: number | null;
      created_at: string;
    } | null;
  };
}

const formatBudgetRange = (min?: number | null, max?: number | null): string => {
  if (min == null && max == null) return "N/A";
  const format = (value: number) => `₹${value}L`;
  if (min != null && max != null) {
    return `${format(min)} - ${format(max)}`;
  }
  if (min != null) return `From ${format(min)}`;
  return `Up to ${format(max as number)}`;
};

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function FollowUpDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [remarks, setRemarks] = useState<string[]>([]);
  const [callRecording, setCallRecording] = useState<CallRecording | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpStatus, setFollowUpStatus] = useState<string | null>(null);

  const leadId = searchParams.get("leadId");
  const followUpId = searchParams.get("followUpId");

  useEffect(() => {
    if (!leadId || !followUpId) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [leadRes, followUpRes] = await Promise.all([
          apiGet<GetLeadResponse>(`/api/v1/leads/${leadId}`),
          apiGet<GetFollowUpDetailResponse>(
            `/api/v1/leads/${leadId}/follow-ups/${followUpId}`
          ),
        ]);

        if (leadRes?.data?.lead) {
          const lead = leadRes.data.lead;
          const budgetText = formatBudgetRange(lead.budget_min, lead.budget_max);

          const mappedLead: LeadData = {
            id: 1,
            name: lead.name,
            phone: lead.phone,
            avatar:
              "https://i.pravatar.cc/150?u=" +
              encodeURIComponent(lead.id || lead.phone || lead.name),
            budget: budgetText,
            propertyId: lead.project_title || "# Prop",
            location: lead.city || "N/A",
            status: lead.lead_temperature,
            source: lead.source || "Assigned",
            timeFrame: lead.expected_closure || "",
          };

          setLeadData(mappedLead);
        }

        if (followUpRes?.data) {
          const stageRemarks = followUpRes.data.stage?.remarks || "";
          const followUp = followUpRes.data.follow_up;
          const followUpRemark = followUp?.remark || "";

          if (followUp?.status) {
            const raw = followUp.status.replace(/_/g, " ");
            const formatted =
              raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
            setFollowUpStatus(formatted);
          } else {
            setFollowUpStatus(null);
          }

          const parts: string[] = [];
          const pushLines = (value: string) => {
            value
              .split(/\r?\n+/)
              .map((r) => r.trim())
              .filter(Boolean)
              .forEach((r) => parts.push(r));
          };

          if (stageRemarks) {
            pushLines(stageRemarks);
          }
          if (followUpRemark) {
            pushLines(followUpRemark);
          }

          setRemarks(parts);

          const call = followUpRes.data.linked_call;
          if (call) {
            const recording: CallRecording = {
              timestamp: formatDateTime(call.call_started_at || call.created_at),
              duration: formatDuration(call.recording_duration),
              currentTime: "0:00",
              transcription:
                call.call_outcome ||
                "Call recording is linked to this follow-up.",
            };
            setCallRecording(recording);
          } else {
            setCallRecording({
              timestamp: "",
              duration: "0:00",
              currentTime: "0:00",
              transcription: "No call recording linked to this follow-up.",
            });
          }
        }
      } catch (err) {
        console.error("[FollowUpDetailPage] Failed to fetch data", err);
        setError("Failed to load follow-up details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [leadId, followUpId]);

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6 md:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft size={18} weight="regular" className="text-[#2D3748]" />
            </button>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[#2D3748]">
              Follow Ups Detail
            </h1>
          </div>

          {followUpStatus && (
            <span className="inline-flex items-center rounded-full border border-[#E3E6F0] bg-white px-3 py-1 text-xs sm:text-sm font-medium text-[#4A5568] shadow-sm">
              Status:&nbsp;
              <span className="text-[#2D3748]">{followUpStatus}</span>
            </span>
          )}
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-[#E3E6F0] p-6 text-center text-sm text-[#4A5568]">
            Loading follow-up details...
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-xl border border-red-200 p-6 text-center text-sm text-red-600">
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
    </div>
  );
}
