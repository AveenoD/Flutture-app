"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  CaretRight,
  Download,
  Trash,
  ArrowClockwise,
  X,
  ChatCircle,
  Plus,
  Paperclip,
  Camera,
  Microphone,
  Phone,
} from "phosphor-react";
import { KPICard } from "../../../../../../components/ui/kpi";
import { CallChatCard } from "../../../../../../components/ui/card/callChatCard";
import { DataCard } from "../../../../../../components/ui/card/dataCard";
import { DataTable, Column } from "../../../../../../components/ui/dataTabel";
import { RemarksSection } from "../../../../../../components/ui/remarksSection";
import { StatusType } from "../../../../../../components/ui/badges";
import { apiGet, apiPost, apiFetch } from "../../../../../../lib/apiClient";
import { toast } from "sonner";

// Follow-up data type
interface FollowUpData {
  id: string;
  followupDate: string;
  remark?: string | null;
  status: "Pending" | "Completed" | "Missed";
}

// Helper function to format date as "24/Aug/2025"
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function CallerOverview() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"overview" | "followups">("overview");
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [selectedFollowUps, setSelectedFollowUps] = useState<string[]>([]);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [remarkInput, setRemarkInput] = useState("");

  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [leadStats, setLeadStats] = useState<{
    totalCalls: number;
    messageSent: number;
    siteVisitDone: number;
    callingHour: string;
  } | null>(null);

  const [leadProfile, setLeadProfile] = useState<{
    name: string;
    phone: string;
    city: string;
    source?: string;
    leadTemperature?: StatusType;
    budgetMin?: number | null;
    budgetMax?: number | null;
    createdAt?: string;
  } | null>(null);

  /** Lead's current stage from API (e.g. qualification, communication, site_visit). Used to avoid 400 when forwarding to property visit if already there. */
  const [leadStage, setLeadStage] = useState<string | null>(null);

  const [stageRemarksRaw, setStageRemarksRaw] = useState<string>("");
  const [stageRemarks, setStageRemarks] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpData[]>([]);

  const [recentCall, setRecentCall] = useState<{
    timestamp: string;
    summary: string;
    status: StatusType;
    statusText: string;
    duration?: string;
  } | null>(null);

  const [recentChat, setRecentChat] = useState<{
    timestamp: string;
    summary: string;
    status: StatusType;
    statusText: string;
    messageCount?: number;
  } | null>(null);

  // Communication stage + create-follow-up UI state
  const [communicationStageId, setCommunicationStageId] = useState<string | null>(null);
  const [isCreateFollowUpOpen, setIsCreateFollowUpOpen] = useState(false);
  const [newFollowType, setNewFollowType] = useState<"call" | "whatsapp" | "visit" | "meeting" | "document">("call");
  const [newFollowDate, setNewFollowDate] = useState("");
  const [newFollowRemark, setNewFollowRemark] = useState("");
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);

  // Complete follow-up (outcome) modal state
  const [isCompleteFollowUpOpen, setIsCompleteFollowUpOpen] = useState(false);
  const [followUpBeingCompleted, setFollowUpBeingCompleted] =
    useState<FollowUpData | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState<
    "interested" | "not_interested" | "follow_up" | "no_response"
  >("interested");
  const [completeRemark, setCompleteRemark] = useState("");
  const [completingFollowUp, setCompletingFollowUp] = useState(false);

  // Lead avatar helper (simple deterministic avatar based on name)
  const getAvatarForName = (name: string) => {
    const avatars = [
      "/Avatar_images.png",
      "/Avatar_images (1).png",
      "/Avatar_images (2).png",
      "/Avatar_images (3).png",
      "/Avatar_images (4).png",
    ];
    if (!name) return avatars[0];
    const hash = name
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return avatars[hash % avatars.length];
  };

  // Follow-up reminders (static helper copy text; follow-ups themselves come from API)
  const followUpReminders = [
    {
      message:
        "Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.",
      onAdd: () => console.log("Add reminder 1"),
    },
  ];

  const readOnlyMessage =
    "This lead has been handed over to Sales. You can view it, but you can't edit it from Presales.";

  const assertWritable = () => {
    if (!isReadOnly) return true;
    toast.error(readOnlyMessage);
    return false;
  };

  // Load lead profile + KPI stats + communication stage details from backend for this lead
  useEffect(() => {
    const id = searchParams.get("leadId");
    if (!id) return;

    const fetchData = async () => {
      try {
        setKpiLoading(true);
        setKpiError(null);

        // Fetch lead profile
        const leadRes = await apiGet<{
          data: {
            lead: {
              name?: string;
              phone?: string;
              city?: string;
              source?: string;
              lead_temperature?: "veryhot" | "hot" | "warm" | "cold";
              budget_min?: number | null;
              budget_max?: number | null;
              created_at?: string;
              stage?: string | null;
              assigned_to_user_type?: string | null;
            };
          };
        }>(`/api/v1/leads/${id}`);

        const lead = leadRes.data.lead || {};
        setIsReadOnly(lead.assigned_to_user_type === "sales");
        setLeadProfile({
          name: lead.name || "",
          phone: lead.phone || "",
          city: lead.city || "",
          source: lead.source,
          leadTemperature: (lead.lead_temperature as StatusType) || "cold",
          budgetMin: lead.budget_min,
          budgetMax: lead.budget_max,
          createdAt: lead.created_at,
        });
        setLeadStage(lead.stage ?? null);

        // Fetch stats for this lead
        const statsRes = await apiGet<{
          data: {
            total_calls_made?: number;
            message_sent?: number;
            site_visit_done?: number;
            calling_hour?: string;
          };
        }>(`/api/v1/leads/${id}/stats`);

        const s = statsRes.data || {};

        setLeadStats({
          totalCalls: s.total_calls_made ?? 0,
          messageSent: s.message_sent ?? 0,
          siteVisitDone: s.site_visit_done ?? 0,
          callingHour: s.calling_hour ?? "0:00 hrs",
        });

        // Fetch communication stage details: recent calls, follow-ups, WhatsApp conversations
        try {
          const stageRes = await apiGet<{
            data?: {
              stage?: { id?: string; remarks?: string | null };
              recent_calls?: {
                call_status?: string;
                call_outcome?: string | null;
                call_started_at?: string | null;
                call_ended_at?: string | null;
                recording_duration?: number | null;
              }[];
              follow_ups?: {
                id: string;
                followup_date: string;
                remark?: string | null;
                status: string;
              }[];
              whatsapp_conversations?: {
                last_message_text?: string | null;
                last_message_at?: string | null;
                updated_at?: string | null;
                message_count?: number | null;
                messages?: unknown[];
              }[];
            };
          }>(`/api/v1/leads/${id}/stages/by-type/communication`);

          const stageData = stageRes.data || {};

          const remarksText = stageData.stage?.remarks || "";
          if (stageData.stage?.id) {
            setCommunicationStageId(stageData.stage.id);
          } else {
            setCommunicationStageId(null);
          }
          const remarksList = remarksText
            ? remarksText
                .split(/\n+/)
                .map((r) => r.trim())
                .filter(Boolean)
            : [];
          setStageRemarksRaw(remarksText);
          setStageRemarks(remarksList);

          const calls = stageData.recent_calls || [];
          if (Array.isArray(calls) && calls.length > 0) {
            const c = calls[0];
            const startedAt = c.call_started_at
              ? new Date(c.call_started_at)
              : null;
            const timestamp = startedAt
              ? startedAt.toLocaleString()
              : "Recent call";

            const durationSeconds = c.recording_duration ?? null;
            const duration =
              durationSeconds != null
                ? `${Math.floor(durationSeconds / 60)}:${String(
                    durationSeconds % 60
                  ).padStart(2, "0")}`
                : undefined;

            const callStatus = (c.call_status || "answered").toLowerCase();
            let status: StatusType = "hot";
            let statusText = "Answered";
            if (callStatus === "missed") {
              status = "cold";
              statusText = "Missed";
            } else if (callStatus === "failed") {
              status = "warm";
              statusText = "Failed";
            }

            setRecentCall({
              timestamp,
              summary:
                c.call_outcome || "Recent call activity for this lead.",
              status,
              statusText,
              duration,
            });
          } else {
            setRecentCall(null);
          }

          const convs = stageData.whatsapp_conversations || [];
          if (Array.isArray(convs) && convs.length > 0) {
            const conv = convs[0];
            const tsRaw = conv.last_message_at || conv.updated_at || null;
            const ts = tsRaw ? new Date(tsRaw).toLocaleString() : "Recent chat";
            const messageCount =
              conv.message_count ??
              (Array.isArray(conv.messages) ? conv.messages.length : undefined);

            setRecentChat({
              timestamp: ts,
              summary:
                conv.last_message_text ||
                "Recent WhatsApp conversation with this lead.",
              status: "warm",
              statusText: "Awaiting Response",
              messageCount,
            });
          } else {
            setRecentChat(null);
          }

          // Follow-ups list for Follow Ups tab
          const apiFollowUps = stageData.follow_ups || [];
          const now = Date.now();
          const mappedFollowUps: FollowUpData[] = apiFollowUps.map((f) => {
            const statusRaw = (f.status || "").toLowerCase();
            let status: FollowUpData["status"] = "Pending";
            if (statusRaw === "completed" || statusRaw === "done") {
              status = "Completed";
            } else if (statusRaw === "missed") {
              status = "Missed";
            }

            const createdTime = new Date(f.followup_date).getTime();
            const diffMs = now - createdTime;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const timeAgo =
              diffDays <= 0 ? "Today" : diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;

            return {
              id: f.id,
              followupDate: f.followup_date,
              remark: f.remark,
              status,
            };
          });
          setFollowUps(mappedFollowUps);
        } catch (stageErr) {
          // 404 or "Lead or stage not found" => no communication data yet; don't block page
          // eslint-disable-next-line no-console
          console.warn(
            "[CallerOverview] No communication stage data for lead",
            stageErr
          );
          setStageRemarks([]);
          setRecentCall(null);
          setRecentChat(null);
          setFollowUps([]);
          setCommunicationStageId(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load lead stats";
        setKpiError(message);
        // eslint-disable-next-line no-console
        console.error("[CallerOverview] Error fetching lead info/stats/stage", err);
      } finally {
        setKpiLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchData();
  }, [searchParams]);

  // KPI Stats Data - derived from API (fallback to previous mock values)
  const kpiStats = useMemo(
    () => [
      {
        icon: "📞",
        value: leadStats ? String(leadStats.totalCalls) : "178",
        label: "Total Calls Made",
        trend: "+0.8%",
        trendUp: true,
        color: "var(--primary-base)",
      },
      {
        icon: "💬",
        value: leadStats ? String(leadStats.messageSent) : "445",
        label: "Message Sent",
        trend: "+0.8%",
        trendUp: true,
        color: "var(--purple)",
      },
      {
        icon: "🏠",
        value: leadStats ? String(leadStats.siteVisitDone) : "65",
        label: "Site Visit Done",
        trend: "+0.8%",
        trendUp: true,
        color: "var(--warning)",
      },
      {
        icon: "🕒",
        value: leadStats ? leadStats.callingHour : "3:45 hrs",
        label: "Calling hour",
        trend: "+0.8%",
        trendUp: true,
        color: "var(--success)",
      },
    ],
    [leadStats]
  );

  const formattedBudget = useMemo(() => {
    if (!leadProfile) return "₹40L - ₹50L";
    const { budgetMin, budgetMax } = leadProfile;
    if (budgetMin != null && budgetMax != null) {
      return `₹${budgetMin}L - ₹${budgetMax}L`;
    }
    if (budgetMin != null) {
      return `₹${budgetMin}L`;
    }
    return "—";
  }, [leadProfile]);

  const handleApprove = async () => {
    if (!assertWritable()) return;
    const leadId = searchParams.get("leadId");
    if (!leadId) {
      console.error("[CallerOverview] Missing leadId in URL for approve");
      return;
    }

    // Forward to property_visit only when allowed. Backend: qualification→communication, communication→property_visit.
    // If already site_visit/property_visit, skip to avoid 400. If qualification, first forward to communication then to property_visit.
    const currentStage = (leadStage ?? "").toLowerCase();
    const alreadyInVisitStage = currentStage === "site_visit" || currentStage === "property_visit";
    if (!alreadyInVisitStage) {
      try {
        if (currentStage === "qualification" || !currentStage) {
          await apiPost(`/api/v1/leads/${leadId}/forward-stage`, { next_stage: "communication" });
        }
        await apiPost(`/api/v1/leads/${leadId}/forward-stage`, { next_stage: "property_visit" });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          "[CallerOverview] forward-stage to property_visit failed (may already be in property_visit/next stage)",
          err
        );
      }
    }

    // Get base path (everything up to /lead-detail) so this works even if there are dynamic segments
    const getBasePath = () => {
      if (!pathname) return "/caller/lead-list/lead-detail";
      const match = pathname.match(/(\/caller\/lead-list\/lead-detail)/);
      return match ? match[1] : "/caller/lead-list/lead-detail";
    };

    const basePath = getBasePath();
    router.push(`${basePath}/site-visit/overview?leadId=${encodeURIComponent(leadId)}`);
  };

  const handleReject = () => {
    if (!assertWritable()) return;
    const leadId = searchParams.get("leadId");
    router.push(
      leadId
        ? `/caller/lead-list/rejected-form?leadId=${encodeURIComponent(leadId)}`
        : "/caller/lead-list/rejected-form"
    );
  };

  const handleCallNow = () => {
    console.log("Call now");
  };

  const handleChatNow = () => {
    router.push("/caller/lead-list/chat-now");
  };

  const handleRemarkSubmit = async () => {
    if (!assertWritable()) return;
    const trimmed = remarkInput.trim();
    const leadId = searchParams.get("leadId");
    if (!trimmed) return;

    if (!leadId || !communicationStageId) {
      console.error(
        "[CallerOverview] Missing leadId or communicationStageId for stage remark",
        { leadId, communicationStageId }
      );
      // Optimistic UI update
      setStageRemarks((prev) => [...prev, trimmed]);
      setStageRemarksRaw((prev) => (prev ? `${prev}\n${trimmed}` : trimmed));
      setRemarkInput("");
      return;
    }

    const base = stageRemarksRaw || "";
    const nextRemarksText = base ? `${base}\n${trimmed}` : trimmed;

    try {
      await apiFetch(`/api/v1/leads/${leadId}/stages/${communicationStageId}/remarks`, {
        method: "PATCH",
        body: JSON.stringify({ remarks: nextRemarksText }),
      });
      setStageRemarks((prev) => [...prev, trimmed]);
      setStageRemarksRaw(nextRemarksText);
      setRemarkInput("");
    } catch (err) {
      console.error("[CallerOverview] Failed to save stage remark", err);
      console.log("Add remark:", remarkInput);
      setRemarkInput("");
    }
  };

  const handleOpenCompleteFollowUp = (row: FollowUpData) => {
    if (!assertWritable()) return;
    setFollowUpBeingCompleted(row);
    setCompleteOutcome("interested");
    setCompleteRemark("");
    setIsCompleteFollowUpOpen(true);
  };

  const handleCompleteFollowUp = async () => {
    if (!assertWritable()) return;
    const leadId = searchParams.get("leadId");
    if (!leadId || !followUpBeingCompleted) {
      console.error("[CallerOverview] Missing data for complete follow-up", {
        leadId,
        followUpBeingCompleted,
      });
      return;
    }

    try {
      setCompletingFollowUp(true);
      await apiFetch(
        `/api/v1/leads/${leadId}/follow-ups/${followUpBeingCompleted.id}/complete`,
        {
          method: "PATCH",
          body: JSON.stringify({
            outcome: completeOutcome,
            remark: completeRemark.trim() || undefined,
          }),
        }
      );

      setFollowUps((prev) =>
        prev.map((item) =>
          item.id === followUpBeingCompleted.id
            ? { ...item, status: "Completed" }
            : item
        )
      );

      setIsCompleteFollowUpOpen(false);
      setFollowUpBeingCompleted(null);
      setCompleteRemark("");
    } catch (err) {
      console.error("[CallerOverview] Failed to complete follow-up", err);
    } finally {
      setCompletingFollowUp(false);
    }
  };

  // Follow-ups table columns
  const followUpColumns: Column<FollowUpData>[] = [
    {
      key: "remark",
      header: "Remark",
      render: (row) => (
        <span className="text-sm text-[#2D3748]">
          {row.remark || "Follow-up"}
        </span>
      ),
    },
    {
      key: "followupDate",
      header: "Date",
      render: (row) => (
        <span className="text-sm text-[#2D3748]">
          {formatDate(row.followupDate)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const statusConfig: Record<
          FollowUpData["status"],
          { dotColor: string; bgColor: string; textColor: string }
        > = {
          Pending: {
            dotColor: "bg-[#F97316]",
            bgColor: "bg-[#FFF4ED]",
            textColor: "text-[#F97316]",
          },
          Completed: {
            dotColor: "bg-[#10B981]",
            bgColor: "bg-[#ECFDF5]",
            textColor: "text-[#10B981]",
          },
          Missed: {
            dotColor: "bg-[#EF4444]",
            bgColor: "bg-[#FEF2F2]",
            textColor: "text-[#EF4444]",
          },
        };
        const config = statusConfig[row.status];
        return (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
            >
              {row.status}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <button
          type="button"
          disabled={isReadOnly || row.status !== "Pending"}
          onClick={(e) => {
            e.stopPropagation();
            if (row.status === "Pending") {
              handleOpenCompleteFollowUp(row);
            }
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            row.status === "Pending" && !isReadOnly
              ? "border-[var(--primary-base)] text-[var(--primary-base)] hover:bg-[var(--primary-base)] hover:text-white"
              : "border-slate-200 text-slate-400 cursor-default bg-slate-50"
          }`}
        >
          Mark as Completed
        </button>
      ),
    },
  ];

  const handleFollowUpRowClick = (followUpId: string) => {
    const leadId = searchParams.get("leadId");
    if (!leadId) {
      console.error("[CallerOverview] Missing leadId in URL for follow-up detail navigation");
      return;
    }

    router.push(
      `/caller/lead-list/lead-detail/caller/overview/follow-up-detail?leadId=${encodeURIComponent(
        leadId
      )}&followUpId=${encodeURIComponent(followUpId)}`
    );
  };

  const handleSelectFollowUp = (rowId: string | number) => {
    const id = String(rowId);
    setSelectedFollowUps((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFollowUps = () => {
    if (selectedFollowUps.length === followUps.length) {
      setSelectedFollowUps([]);
    } else {
      setSelectedFollowUps(followUps.map((f) => f.id));
    }
  };

  const handleOpenCreateFollowUp = () => {
    if (!assertWritable()) return;
    setNewFollowType("call");
    setNewFollowRemark("");
    setNewFollowDate("");
    setIsCreateFollowUpOpen(true);
  };

  const handleCreateFollowUp = async () => {
    if (!assertWritable()) return;
    const leadId = searchParams.get("leadId");
    if (!leadId || !communicationStageId) {
      console.error(
        "[CallerOverview] Missing leadId or communicationStageId for follow-up"
      );
      return;
    }

    const trimmedRemark = newFollowRemark.trim();
    if (!trimmedRemark) {
      console.error("[CallerOverview] Remark is required to create follow-up");
      return;
    }

    const isoDate =
      newFollowDate && !Number.isNaN(Date.parse(newFollowDate))
        ? new Date(newFollowDate).toISOString()
        : new Date().toISOString();

    try {
      setCreatingFollowUp(true);

      const res = await apiPost<any>(
        `/api/v1/leads/${leadId}/follow-ups`,
        {
          // Backend contract from CreateFollowUpRequest
          lead_stage_id: communicationStageId,
          followup_type: newFollowType,
          followup_date: isoDate,
          remark: trimmedRemark,
        }
      );

      const created = res.data?.follow_up;
      if (created) {
        const statusRaw = (created.status || "").toLowerCase();
        let status: FollowUpData["status"] = "Pending";
        if (statusRaw === "completed" || statusRaw === "done") status = "Completed";
        else if (statusRaw === "missed") status = "Missed";

        setFollowUps((prev) => [
          {
            id: created.id,
            followupDate: created.followup_date,
            remark: created.remark,
            status,
          },
          ...prev,
        ]);
      }

      setIsCreateFollowUpOpen(false);
    } catch (err) {
      console.error("[CallerOverview] Failed to create follow-up", err);
    } finally {
      setCreatingFollowUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 mb-4 sm:mb-5 lg:mb-6">
          {kpiStats.map((stat, index) => (
            <KPICard
              key={index}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              trend={stat.trend}
              trendUp={stat.trendUp}
              color={stat.color}
            />
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-[#E3E6F0] mb-4 sm:mb-5 lg:mb-6 overflow-x-auto scrollbar-hide -mx-3 sm:-mx-4 md:-mx-6 lg:mx-0 px-3 sm:px-4 md:px-6 lg:px-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 sm:px-4 md:px-6 lg:px-10 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-medium transition-colors border-b-[3px] whitespace-nowrap mb-[-2px] ${
              activeTab === "overview"
                ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                : "text-[#718096] border-transparent hover:text-[var(--primary-base)]"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`px-3 sm:px-4 md:px-6 lg:px-10 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-medium transition-colors border-b-[3px] whitespace-nowrap mb-[-2px] ${
              activeTab === "followups"
                ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                : "text-[#718096] border-transparent hover:text-[var(--primary-base)]"
            }`}
          >
            Follow Ups
          </button>
        </div>

        {/* Main Content Grid */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 xl:gap-7">
            {/* Left Section */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7">
              {/* Lead Profile */}
              <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Lead Profile</h2>
                <DataCard
                  id={1}
                  name={leadProfile?.name || "—"}
                  phone={leadProfile?.phone || "—"}
                  avatar={getAvatarForName(leadProfile?.name || "Lead")}
                  budget={formattedBudget}
                  propertyName={"Crown Height"}
                  timeAgo={"2 Hour ago"}
                  location={leadProfile?.city || "—"}
                  status={(leadProfile?.leadTemperature as StatusType) || ("cold" as StatusType)}
                  source={leadProfile?.source || "Manual"}
                  onClick={() => {
                    console.log("Lead profile clicked");
                  }}
                />
                {/* Call Now and Chat Now Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleCallNow}
                    className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-2 bg-[var(--primary-base)] text-white hover:opacity-95 shadow-md hover:shadow-lg"
                  >
                    <Phone size={20} weight="fill" />
                    Call Now
                  </button>
                  <button
                    onClick={handleChatNow}
                    className="flex-1 py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-2 bg-[var(--primary-base)] text-white hover:opacity-95 shadow-md hover:shadow-lg"
                  >
                    <ChatCircle size={20} weight="fill" />
                    Chat Now
                  </button>
                </div>
              </section>

              {/* Remarks */}
              <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Remarks</h2>
                <div className="space-y-4">
                  {/* Remarks List */}
                  {stageRemarks.length === 0 ? (
                    <p className="text-xs sm:text-sm md:text-base text-[#718096] text-center py-2 sm:py-3">No remarks available</p>
                  ) : (
                    <ul className="space-y-2 sm:space-y-3">
                      {stageRemarks.map((remark, index) => (
                        <li key={index} className="relative pl-4 sm:pl-5 text-xs sm:text-sm md:text-base text-[#2D3748] leading-relaxed">
                          <span className="absolute left-0 top-1.5 sm:top-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--primary-base)] rounded-full"></span>
                          {remark}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Follow-up Reminders */}
                  {followUpReminders.map((reminder, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-3 sm:p-4 md:p-5 border border-[#E3E6F0] shadow-sm flex items-center justify-between gap-2 sm:gap-3"
                    >
                      <p className="text-xs sm:text-sm md:text-base text-[#718096] flex-1 leading-relaxed pr-2">
                        {reminder.message}
                      </p>
                      <button
                        onClick={reminder.onAdd}
                        disabled={isReadOnly}
                        className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full border border-[#E3E6F0] bg-[#F8FAFC] flex items-center justify-center text-base sm:text-lg md:text-xl font-semibold text-[#2D3748] hover:bg-[#E3E6F0] transition-colors cursor-pointer flex-shrink-0"
                        aria-label="Add follow-up reminder"
                      >
                        <Plus size={14} weight="bold" className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                      </button>
                    </div>
                  ))}
                  {/* Input Field */}
                  <div className="flex items-center gap-2 sm:gap-3 w-full">
                    <div className="flex-1 flex items-center gap-2 sm:gap-3 bg-[#F8F9FC] border border-[#E3E6F0] rounded-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 focus-within:border-[var(--primary-base)] focus-within:ring-2 focus-within:ring-[var(--primary-selected)] transition-all min-w-0">
                      <span className="text-base sm:text-lg md:text-xl flex-shrink-0">😊</span>
                      <input
                        type="text"
                        value={remarkInput}
                        onChange={(e) => setRemarkInput(e.target.value)}
                        disabled={isReadOnly}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleRemarkSubmit();
                          }
                        }}
                        placeholder="Add a new remark..."
                        className={`flex-1 border-none bg-transparent outline-none text-xs sm:text-sm md:text-base text-[#2D3748] placeholder:text-[#718096] min-w-0 w-0 ${
                          isReadOnly ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      />
                      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
                        <button 
                          type="button"
                          className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                          title="Add link"
                        >
                          <Paperclip size={14} weight="regular" className="text-[#718096] sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
                        </button>
                        <button 
                          type="button"
                          className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                          title="Add image"
                        >
                          <Camera size={14} weight="regular" className="text-[#718096] sm:w-4 sm:h-4 md:w-[18px] md:h-[18px]" />
                        </button>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={handleRemarkSubmit}
                      disabled={isReadOnly}
                      className={`w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] hover:scale-105 transition-all flex-shrink-0 shadow-sm ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
                      title={remarkInput.trim() ? "Send remark" : "Voice input"}
                    >
                      {remarkInput.trim() ? (
                        // Text present -> show send icon
                        <span className="text-xs sm:text-sm font-semibold">
                          Send
                        </span>
                      ) : (
                        // Empty -> show microphone icon
                        <Microphone
                          size={16}
                          weight="fill"
                          className="sm:w-4 sm:h-4 md:w-5 md:h-5"
                        />
                      )}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Section */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7">
              {/* Recent Calls */}
              <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">
                  Recent Calls
                </h2>
                {recentCall ? (
                  <CallChatCard
                    type="call"
                    timestamp={recentCall.timestamp}
                    summary={recentCall.summary}
                    status={recentCall.status as any}
                    statusText={recentCall.statusText}
                    duration={recentCall.duration}
                    onPlay={() => {
                      console.log("Playing call recording");
                    }}
                    onForward={() => {
                      console.log("Viewing call details");
                    }}
                  />
                ) : (
                  <p className="text-sm text-[#718096]">
                    No recent calls found.
                  </p>
                )}
              </section>

              {/* Recent Chats */}
              <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">
                  Recent Chats
                </h2>
                {recentChat ? (
                  <CallChatCard
                    type="chat"
                    timestamp={recentChat.timestamp}
                    summary={recentChat.summary}
                    status={recentChat.status as any}
                    statusText={recentChat.statusText}
                    messageCount={recentChat.messageCount}
                    onClick={() => router.push("/caller/lead-list/chat-now")}
                    onForward={() => {
                      console.log("Viewing chat details");
                    }}
                    showBorder={false}
                  />
                ) : (
                  <p className="text-sm text-[#718096]">
                    No recent chats found.
                  </p>
                )}
              </section>
            </div>
          </div>
        )}

        {/* Follow Ups Tab Content */}
        {activeTab === "followups" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#2D3748]">
                Follow Ups
              </h2>
              <button
                type="button"
                onClick={handleOpenCreateFollowUp}
                disabled={isReadOnly}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm sm:text-base font-semibold shadow-sm hover:bg-[var(--primary-hover)] transition-colors ${isReadOnly ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Plus size={16} weight="bold" />
                <span>Create Follow-up</span>
              </button>
            </div>
            <DataTable
            data={followUps}
            columns={followUpColumns}
            getRowId={(row) => row.id}
            searchPlaceholder="Search..."
            onSearchChange={(value) => {
              console.log("Search:", value);
            }}
            onColumnClick={() => {
              console.log("Column visibility");
            }}
            actions={[
              {
                label: "Export",
                icon: <Download size={16} weight="regular" />,
                onClick: () => console.log("Export"),
                variant: "default",
              },
              {
                label: "Refresh",
                icon: <ArrowClockwise size={16} weight="regular" />,
                onClick: () => console.log("Refresh"),
                variant: "default",
              },
              {
                label: "Delete",
                icon: <Trash size={16} weight="regular" />,
                onClick: () => console.log("Delete"),
                variant: "danger",
              },
            ]}
            selectable={true}
            selectedRows={selectedFollowUps}
            onSelectRow={handleSelectFollowUp}
            onSelectAll={handleSelectAllFollowUps}
            pagination={true}
            currentPage={followUpPage}
            totalPages={Math.ceil(followUps.length / 10) || 1}
            totalItems={followUps.length}
            itemsPerPage={10}
            onPageChange={setFollowUpPage}
            emptyMessage="No follow-ups found"
            renderActions={(row) => (
              <button
                onClick={() => handleFollowUpRowClick(row.id)}
                className="text-[var(--primary-base)] hover:text-[var(--primary-dark)] text-sm font-medium transition-colors"
              >
                View Detail
              </button>
            )}
            />
          </div>
        )}

        {/* Action Footer */}
        {activeTab === "overview" && (
          <div className="mt-4 sm:mt-5 lg:mt-6 flex gap-3 sm:gap-4">
            <button
              onClick={handleReject}
              disabled={isReadOnly}
              className="flex-1 py-3 sm:py-3.5 md:py-4 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 bg-[#EF4444] text-white hover:opacity-95 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <X size={20} weight="bold" />
              Rejected
            </button>
            <button
              onClick={handleApprove}
              disabled={isReadOnly}
              className="flex-1 py-3 sm:py-3.5 md:py-4 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 bg-[var(--primary-base)] text-white hover:opacity-95 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Approved
              <CaretRight size={20} weight="bold" />
            </button>
          </div>
        )}
      </div>

      {/* Create Follow-up Modal */}
      {isCreateFollowUpOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2D3748]">
                Create Follow-up
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateFollowUpOpen(false)}
                className="text-[#718096] hover:text-[#2D3748]"
                aria-label="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-[#4A5568] mb-1">
                  Follow-up Type
                </label>
                <select
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-selected)] focus:border-[var(--primary-base)]"
                  value={newFollowType}
                  onChange={(e) =>
                    setNewFollowType(e.target.value as typeof newFollowType)
                  }
                >
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="visit">Visit</option>
                  <option value="meeting">Meeting</option>
                  <option value="document">Document</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A5568] mb-1">
                  Follow-up Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-selected)] focus:border-[var(--primary-base)]"
                  value={newFollowDate}
                  onChange={(e) => setNewFollowDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A5568] mb-1">
                  Remark
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-selected)] focus:border-[var(--primary-base)] resize-none"
                  value={newFollowRemark}
                  onChange={(e) => setNewFollowRemark(e.target.value)}
                  placeholder="Add a remark for this follow-up..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateFollowUpOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#4A5568] border border-[#E2E8F0] hover:bg-[#F7FAFC]"
                disabled={creatingFollowUp}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFollowUp}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                disabled={creatingFollowUp || isReadOnly}
              >
                {creatingFollowUp ? "Saving..." : "Save Follow-up"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Follow-up Modal */}
      {isCompleteFollowUpOpen && followUpBeingCompleted && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2D3748]">
                Complete Follow-up
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCompleteFollowUpOpen(false);
                  setFollowUpBeingCompleted(null);
                }}
                className="text-[#718096] hover:text-[#2D3748]"
                aria-label="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <p className="text-sm text-[#4A5568]">
                  Mark follow-up{" "}
                  <span className="font-semibold">
                    {followUpBeingCompleted.remark || "Follow-up"}
                  </span>{" "}
                  as completed and choose an outcome.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A5568] mb-1">
                  Outcome
                </label>
                <select
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-selected)] focus:border-[var(--primary-base)]"
                  value={completeOutcome}
                  onChange={(e) =>
                    setCompleteOutcome(
                      e.target.value as
                        | "interested"
                        | "not_interested"
                        | "follow_up"
                        | "no_response"
                    )
                  }
                >
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="no_response">No Response</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A5568] mb-1">
                  Remark (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-selected)] focus:border-[var(--primary-base)] resize-none"
                  value={completeRemark}
                  onChange={(e) => setCompleteRemark(e.target.value)}
                  placeholder="Add a remark for this follow-up outcome..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCompleteFollowUpOpen(false);
                  setFollowUpBeingCompleted(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#4A5568] border border-[#E2E8F0] hover:bg-[#F7FAFC]"
                disabled={completingFollowUp}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteFollowUp}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
                disabled={completingFollowUp}
              >
                {completingFollowUp ? "Saving..." : "Mark Completed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
