"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  CaretRight,
  Download,
  Trash,
  ArrowClockwise,
} from "phosphor-react";
import { KPICard } from "../../../../../../components/ui/kpi";
import { CallChatCard } from "../../../../../../components/ui/card/callChatCard";
import { DataCard } from "../../../../../../components/ui/card/dataCard";
import { DataTable, Column } from "../../../../../../components/ui/dataTabel";
import { RemarksSection } from "../../../../../../components/ui/remarksSection";
import { StatusType } from "../../../../../../components/ui/badges";
import {
  getLeadStatsForLead,
  getLeadSummary,
  LeadStats,
  LeadSummary,
} from "../../../../../../lib/leads";
import { apiFetch } from "../../../../../../lib/apiClient";
import { toast } from "sonner";

// Follow-up data type
interface FollowUpData {
  id: number;
  backendId: string;
  fullName: string;
  avatar: string;
  date: string;
  timeAgo: string;
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

// Helper to format a date-time for call/chat timestamps
const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper to format duration from seconds to mm:ss
const formatDuration = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function LeadDetailOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");

  const [activeTab, setActiveTab] = useState<"overview" | "followups">("overview");
  const [selectedFollowUps, setSelectedFollowUps] = useState<number[]>([]);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [isForwardingStage, setIsForwardingStage] = useState(false);

  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [stats, setStats] = useState<LeadStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Load lead summary
  useEffect(() => {
    if (!leadId) return;

    const load = async () => {
      try {
        setSummaryLoading(true);
        setSummaryError(null);
        const data = await getLeadSummary(leadId);
        setSummary(data);
      } catch (err: any) {
        const message =
          err?.message || "Failed to load lead details. Please try again.";
        setSummaryError(message);
      } finally {
        setSummaryLoading(false);
      }
    };

    load();
  }, [leadId]);

  // Load per-lead stats for KPI cards
  useEffect(() => {
    if (!leadId) return;

    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const data = await getLeadStatsForLead(leadId);
        setStats(data);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Failed to load lead stats", err);
        }
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [leadId]);

  const leadData = useMemo(() => {
    if (!summary) return null;

    const lead = summary.lead;

    const budget =
      lead.budget_min != null && lead.budget_max != null
        ? `₹${lead.budget_min}L - ₹${lead.budget_max}L`
        : "N/A";

    const propertyName =
      summary.interested_property?.project_title ?? lead.project_title ?? "N/A";

    const location = lead.city ?? "N/A";

    const status: StatusType =
      (lead.lead_temperature as StatusType | null) ?? "cold";

    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      avatar: "https://i.pravatar.cc/150?u=" + encodeURIComponent(lead.id),
      budget,
      propertyName,
      timeAgo: lead.created_at || "",
      location,
      status,
      source: lead.source ?? "N/A",
    };
  }, [summary]);

  const remarks = useMemo(() => {
    if (!summary || !summary.stage_remarks?.length) return [];
    return summary.stage_remarks
      .slice()
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .map((item) => item.remarks);
  }, [summary]);

  // Most recent call from summary.recent_calls
  const recentCall = useMemo(() => {
    if (!summary || !Array.isArray(summary.recent_calls) || !summary.recent_calls.length) {
      return null;
    }
    const calls = [...(summary.recent_calls as any[])];
    calls.sort((a, b) => {
      const da = new Date(a.call_started_at ?? a.created_at ?? 0).getTime();
      const db = new Date(b.call_started_at ?? b.created_at ?? 0).getTime();
      return db - da;
    });
    return calls[0];
  }, [summary]);

  // Most recent WhatsApp conversation from summary.whatsapp_conversations
  const recentConversation = useMemo(() => {
    if (
      !summary ||
      !Array.isArray(summary.whatsapp_conversations) ||
      !summary.whatsapp_conversations.length
    ) {
      return null;
    }
    const conversations = [...(summary.whatsapp_conversations as any[])];
    conversations.sort((a, b) => {
      const da = new Date(a.last_message_at ?? a.created_at ?? 0).getTime();
      const db = new Date(b.last_message_at ?? b.created_at ?? 0).getTime();
      return db - da;
    });
    return conversations[0];
  }, [summary]);

  type LeadStageByTypeBackend = {
    success: boolean;
    message: string;
    data?: {
      follow_ups?: Array<{
        id: string;
        followup_date: string;
        remark?: string | null;
        status?: string | null;
      }>;
    };
  };

  const [followUpsData, setFollowUpsData] = useState<FollowUpData[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [followUpsError, setFollowUpsError] = useState<string | null>(null);

  // Follow-ups data (read-only list) from backend
  useEffect(() => {
    const loadFollowUps = async () => {
      try {
        setFollowUpsLoading(true);
        setFollowUpsError(null);

        if (!leadId || !summary?.lead.stage) {
          setFollowUpsData([]);
          return;
        }

        // lead.stage uses site_visit while backend uses property_visit stage_type
        let stageType: "property_visit" | "negotiation" | "booking" | null = null;
        if (summary.lead.stage === "site_visit") stageType = "property_visit";
        else if (summary.lead.stage === "negotiation") stageType = "negotiation";
        else if (summary.lead.stage === "booking") stageType = "booking";

        if (!stageType) {
          setFollowUpsData([]);
          return;
        }

        const res = await apiFetch<LeadStageByTypeBackend>(
          `/api/v1/leads/${encodeURIComponent(leadId)}/stages/by-type/${stageType}`
        );

        const apiFollowUps = res.data?.follow_ups ?? [];
        const now = Date.now();

        const mapped: FollowUpData[] = apiFollowUps.map((f, idx) => {
          const followupMs = new Date(f.followup_date).getTime();
          const diffDays = Math.floor(
            (now - followupMs) / (1000 * 60 * 60 * 24)
          );

          let timeAgo = "—";
          if (!Number.isFinite(diffDays) || diffDays <= 0) timeAgo = "Today";
          else if (diffDays < 30)
            timeAgo = diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
          else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            timeAgo = months === 1 ? "1 month ago" : `${months} months ago`;
          } else {
            const years = Math.floor(diffDays / 365);
            timeAgo = years === 1 ? "1 year ago" : `${years} years ago`;
          }

          const statusRaw = (f.status ?? "").toLowerCase();
          const status: FollowUpData["status"] =
            statusRaw === "completed"
              ? "Completed"
              : statusRaw === "missed"
                ? "Missed"
                : "Pending";

          return {
            id: idx + 1,
            backendId: f.id,
            fullName: (f.remark ?? "").trim() || "Follow-up",
            avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(f.id)}`,
            date: new Date(f.followup_date).toLocaleDateString(),
            timeAgo,
            status,
          };
        });

        setFollowUpsData(mapped);
        setSelectedFollowUps([]); // keep selection consistent
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load follow-ups.";
        setFollowUpsError(message);
        setFollowUpsData([]);
      } finally {
        setFollowUpsLoading(false);
      }
    };

    void loadFollowUps();
  }, [leadId, summary?.lead.stage]);

  // KPI Stats Data (per-lead stats)
  const kpiStats = useMemo(
    () => [
      {
        icon: "📞",
        value: stats?.total_calls_made ?? (statsLoading ? "…" : 0),
        label: "Total Calls Made",
        trend: "",
        trendUp: true,
        color: "var(--primary-base)",
      },
      {
        icon: "💬",
        value: stats?.message_sent ?? (statsLoading ? "…" : 0),
        label: "Message Sent",
        trend: "",
        trendUp: true,
        color: "var(--purple)",
      },
      {
        icon: "🏠",
        value: stats?.site_visit_done ?? (statsLoading ? "…" : 0),
        label: "Site Visit Done",
        trend: "",
        trendUp: true,
        color: "var(--warning)",
      },
      {
        icon: "🕒",
        value: stats?.calling_hour ?? (statsLoading ? "…" : "0h"),
        label: "Calling hour",
        trend: "",
        trendUp: true,
        color: "var(--success)",
      },
    ],
    [stats, statsLoading]
  );

  const handleApprove = () => {
    if (!leadId) {
      toast.error("Lead ID missing; please open lead from the list again.");
      return;
    }
    // Summary se sirf Property Visit page par le jao.
    // Actual stage forward Site Visit page ke Approve button se hoga.
    router.push(
      `/sales/lead-list/lead-detail/site-visit/overveiw?leadId=${encodeURIComponent(
        leadId
      )}`
    );
  };

  if (!leadId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
        <div className="bg-white border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md text-center shadow-sm">
          Lead ID is missing in the URL. Please navigate from the All Leads list and try
          again.
        </div>
      </div>
    );
  }

  if (summaryError && !summaryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6]">
        <div className="bg-white border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md text-center shadow-sm">
          Error loading lead details: {summaryError}
        </div>
      </div>
    );
  }

  // Follow-ups table columns
  const followUpColumns: Column<FollowUpData>[] = [
    {
      key: "fullName",
      header: "Full Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image
              src={row.avatar}
              alt={row.fullName}
              fill
              className="rounded-full object-cover"
              sizes="40px"
            />
          </div>
          <span className="text-sm font-medium text-[#2D3748]">{row.fullName}</span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="text-sm text-[#2D3748]">{formatDate(row.date)}</span>
      ),
    },
    {
      key: "timeAgo",
      header: "Time",
      render: (row) => (
        <span className="text-sm text-[#718096]">{row.timeAgo}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const statusConfig: Record<FollowUpData["status"], { dotColor: string; bgColor: string; textColor: string }> = {
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
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
              {row.status}
            </span>
          </div>
        );
      },
    },
  ];

  const handleFollowUpRowClick = (followUpBackendId: string) => {
    // Navigate to follow-up detail page
    if (!leadId) return;
    router.push(
      `/sales/lead-list/lead-detail/caller-preview/overview/follow-up-detail?leadId=${encodeURIComponent(
        leadId
      )}&followUpId=${encodeURIComponent(followUpBackendId)}`
    );
  };

  const handleSelectFollowUp = (rowId: string | number) => {
    const id = typeof rowId === "number" ? rowId : Number(rowId);
    setSelectedFollowUps((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFollowUps = () => {
    if (selectedFollowUps.length === followUpsData.length) {
      setSelectedFollowUps([]);
    } else {
      setSelectedFollowUps(followUpsData.map((f) => f.id));
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
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">
                  Lead Profile
                </h2>
                {summaryLoading && !leadData ? (
                  <div className="h-32 rounded-lg bg-slate-100 animate-pulse" />
                ) : leadData ? (
                  <DataCard
                    id={1}
                    name={leadData.name}
                    phone={leadData.phone}
                    avatar={leadData.avatar}
                    budget={leadData.budget}
                    propertyName={leadData.propertyName}
                    timeAgo={leadData.timeAgo}
                    location={leadData.location}
                    status={leadData.status}
                    source={leadData.source}
                    onClick={() => {
                      console.log("Lead profile clicked");
                    }}
                  />
                ) : (
                  <p className="text-sm text-[#667085]">
                    Lead details are not available for this lead.
                  </p>
                )}
              </section>

              {/* Remarks */}
              <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">
                  Remarks
                </h2>
                {remarks.length > 0 ? (
                  <RemarksSection remarks={remarks} />
                ) : (
                  <p className="text-sm text-[#667085]">
                    No remarks available for this lead yet.
                  </p>
                )}
              </section>
            </div>

            {/* Right Section */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7">
              {/* Recent Calls */}
              <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">
                  Recent Calls
                </h2>
                {summaryLoading && !recentCall && (
                  <div className="h-20 rounded-lg bg-slate-100 animate-pulse" />
                )}
                {!summaryLoading && !recentCall && (
                  <p className="text-sm text-[#667085]">
                    No recent calls found for this lead.
                  </p>
                )}
                {!summaryLoading && recentCall && (
                  <CallChatCard
                    type="call"
                    timestamp={formatDateTime(
                      recentCall.call_started_at ?? recentCall.created_at
                    )}
                    summary={
                      recentCall.outcome ||
                      recentCall.notes ||
                      "Call details not available."
                    }
                    status={
                      recentCall.call_status === "answered"
                        ? "answered"
                        : recentCall.call_status === "missed"
                        ? "missed"
                        : "answered"
                    }
                    statusText={
                      recentCall.call_status === "answered"
                        ? "Answered"
                        : recentCall.call_status === "missed"
                        ? "Missed"
                        : "Completed"
                    }
                    duration={formatDuration(recentCall.duration_seconds)}
                    onPlay={() => {
                      if (recentCall.recording_url) {
                        window.open(recentCall.recording_url, "_blank");
                      }
                    }}
                    onForward={() => {
                      router.push(
                        `/sales/lead-list/lead-detail/caller-preview/overview?leadId=${leadId}`
                      );
                    }}
                  />
                )}
              </section>

              {/* Recent Chats */}
              <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">
                  Recent Chats
                </h2>
                {summaryLoading && !recentConversation && (
                  <div className="h-20 rounded-lg bg-slate-100 animate-pulse" />
                )}
                {!summaryLoading && !recentConversation && (
                  <p className="text-sm text-[#667085]">
                    No recent chats found for this lead.
                  </p>
                )}
                {!summaryLoading && recentConversation && (
                  <CallChatCard
                    type="chat"
                    timestamp={formatDateTime(
                      recentConversation.last_message_at ??
                        recentConversation.created_at
                    )}
                    summary={
                      recentConversation.last_message?.message ||
                      recentConversation.preview_text ||
                      "No message content available."
                    }
                    status={
                      recentConversation.status === "awaiting"
                        ? "awaiting"
                        : "answered"
                    }
                    statusText={
                      recentConversation.status === "awaiting"
                        ? "Awaiting Response"
                        : "Replied"
                    }
                    messageCount={
                      recentConversation.messages_count ??
                      recentConversation.total_messages ??
                      0
                    }
                    onClick={() =>
                      router.push(
                        `/sales/lead-list/chat-now?leadId=${leadId}`
                      )
                    }
                    onForward={() => {
                      router.push(
                        `/sales/lead-list/chat-now?leadId=${leadId}`
                      );
                    }}
                    showBorder={false}
                  />
                )}
              </section>
            </div>
          </div>
        )}

        {/* Follow Ups Tab Content */}
        {activeTab === "followups" && (
          <div>
            <DataTable
            data={followUpsData}
            columns={followUpColumns}
            getRowId={(row) => row.id}
            searchPlaceholder="Search..."
            onSearchChange={(value) => {
              // Handle search
              console.log("Search:", value);
            }}
            onColumnClick={() => {
              // Handle column visibility
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
            totalPages={Math.ceil(followUpsData.length / 10)}
            totalItems={followUpsData.length}
            itemsPerPage={10}
            onPageChange={setFollowUpPage}
            emptyMessage={
              followUpsLoading
                ? "Loading follow-ups..."
                : followUpsError
                  ? followUpsError
                  : "No follow-ups found"
            }
            renderActions={(row) => (
              <button
                onClick={() => handleFollowUpRowClick(row.backendId)}
                className="text-[var(--primary-base)] hover:text-[var(--primary-dark)] text-sm font-medium transition-colors"
              >
                View Detail
              </button>
            )}
            />
          </div>
        )}

        {/* Action Footer */}
        <div className="mt-4 sm:mt-5 lg:mt-6">
          <button
            onClick={handleApprove}
            disabled={isForwardingStage}
            className={`w-full py-3 sm:py-3.5 md:py-4 px-4 sm:px-6 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 bg-[var(--primary-base)] text-white hover:opacity-95 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] ${
              isForwardingStage ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isForwardingStage ? "Forwarding..." : "Next Stage"}
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
