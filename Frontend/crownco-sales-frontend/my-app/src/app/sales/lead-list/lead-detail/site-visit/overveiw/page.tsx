"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Phone, ChatCircle, X, PaperPlaneTilt, Microphone, Download, Trash, ArrowClockwise, LinkSimple, Camera } from "phosphor-react";
import { DataCard } from "../../../../../../components/ui/card/dataCard";
import { CallChatCard } from "../../../../../../components/ui/card/callChatCard";
import { PropertyVisitCard, type Visit } from "../../../../../../components/ui/card/propertyVisitCard";
import { StatusType } from "../../../../../../components/ui/badges";
import { RemarksSection } from "../../../../../../components/ui/remarksSection";
import { DataTable, Column } from "../../../../../../components/ui/dataTabel";
import { CreateVisitDrawer } from "../../../../../../components/ui/createVisitDrawer";
import { apiFetch } from "../../../../../../lib/apiClient";
import { getLeadSummary } from "../../../../../../lib/leads";
import type { LeadResponse, LeadSummary } from "../../../../../../lib/leads";
import { toast } from "sonner";

interface FollowUpData {
  id: number;
  fullName: string;
  avatar: string;
  date: string;
  time: string;
  status: "pending" | "completed" | "missed";
}

export default function SiteVisitOverviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const [activeTab, setActiveTab] = useState<"overview" | "followups">("overview");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newRemark, setNewRemark] = useState("");
  const [isForwardingStage, setIsForwardingStage] = useState(false);
  const [stageId, setStageId] = useState<string | null>(null);
  const [stageRemarksRaw, setStageRemarksRaw] = useState<string>("");
  const [remarks, setRemarks] = useState<string[]>([]);
  const [summaryStage, setSummaryStage] = useState<string | null>(null);
  const [summaryPipelineStatus, setSummaryPipelineStatus] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const parseStageRemarksToList = (raw: string): string[] => {
    if (!raw) return [];
    return raw
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/^\s*[-*•]\s*/g, "")
          .replace(/^\s*\d+\.\s*/g, "")
          .trim()
      )
      .filter(Boolean);
  };

  // Follow-ups data
  const [followUpsData] = useState<FollowUpData[]>([
    {
      id: 1,
      fullName: "Maaz Khan",
      avatar: "https://i.pravatar.cc/150?u=maaz1",
      date: "24/Aug/2025",
      time: "2 months ago",
      status: "pending",
    },
    {
      id: 2,
      fullName: "Maaz Khan",
      avatar: "https://i.pravatar.cc/150?u=maaz2",
      date: "24/Aug/2025",
      time: "2 months ago",
      status: "completed",
    },
    {
      id: 3,
      fullName: "Maaz Khan",
      avatar: "https://i.pravatar.cc/150?u=maaz3",
      date: "24/Aug/2025",
      time: "2 months ago",
      status: "completed",
    },
    {
      id: 4,
      fullName: "Maaz Khan",
      avatar: "https://i.pravatar.cc/150?u=maaz4",
      date: "24/Aug/2025",
      time: "2 months ago",
      status: "missed",
    },
    {
      id: 5,
      fullName: "Maaz Khan",
      avatar: "https://i.pravatar.cc/150?u=maaz5",
      date: "24/Aug/2025",
      time: "2 months ago",
      status: "completed",
    },
    {
      id: 6,
      fullName: "Maaz Khan",
      avatar: "https://i.pravatar.cc/150?u=maaz6",
      date: "24/Aug/2025",
      time: "2 months ago",
      status: "completed",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFollowUps, setSelectedFollowUps] = useState<number[]>([]);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  type LeadByIdBackend = {
    success: boolean;
    message: string;
    data: {
      lead: LeadResponse;
    };
  };

  // Lead data (Lead Profile card)
  const [leadData, setLeadData] = useState(() => ({
    id: 1,
    name: "—",
    propertyName: "—",
    projectId: null as string | null,
    phone: "—",
    location: "—",
    avatar: "https://i.pravatar.cc/150?u=lead",
    budget: "—",
    source: "—",
    timeAgo: "—",
    status: "cold" as StatusType,
  }));

  const computedAvatar = useMemo(() => {
    // Deterministic avatar if API doesn't return one
    if (!leadId) return "https://i.pravatar.cc/150?u=lead";
    return `https://i.pravatar.cc/150?u=${encodeURIComponent(leadId)}`;
  }, [leadId]);

  const drawerInitialValues = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");

    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`; // HH:MM

    const initialLocation = leadData.location && leadData.location !== "—"
      ? leadData.location
      : undefined;

    return {
      initialProjectId: leadData.projectId ?? undefined,
      initialLocation,
      initialLocationUrl: initialLocation,
      initialDate: date,
      initialTime: time,
    };
  }, [leadData.projectId, leadData.location]);

  useEffect(() => {
    const loadLead = async () => {
      if (!leadId) return;
      try {
        const res = await apiFetch<LeadByIdBackend>(
          `/api/v1/leads/${encodeURIComponent(leadId)}`
        );
        const lead = res.data.lead;

        const status =
          (lead.lead_temperature as StatusType | null) ?? "cold";

        const budget =
          lead.budget_min != null && lead.budget_max != null
            ? `₹${lead.budget_min}L - ₹${lead.budget_max}L`
            : lead.budget_min != null
              ? `₹${lead.budget_min}L`
              : lead.budget_max != null
                ? `Up to ₹${lead.budget_max}L`
                : "N/A";

        setLeadData({
          id: 1,
          name: lead.name ?? "—",
          propertyName: lead.project_title ?? "—",
          projectId: lead.project_id ?? null,
          phone: lead.phone ?? "—",
          location: lead.city ?? "—",
          avatar: computedAvatar,
          budget,
          source: lead.source ?? "—",
          timeAgo: lead.created_at
            ? new Date(lead.created_at).toLocaleString()
            : "—",
          status: status as StatusType,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[SiteVisitOverview] Failed to load lead profile", err);
      }
    };

    void loadLead();
  }, [leadId, computedAvatar]);

  // Use same source as @Example (caller-preview overview) to guard stage transitions.
  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      try {
        setSummaryLoading(true);
        const summary: LeadSummary = await getLeadSummary(leadId);
        setSummaryStage(summary.lead.stage ?? null);
        setSummaryPipelineStatus(summary.lead.status ?? null);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[SiteVisitOverview] Failed to load lead summary", err);
        setSummaryStage(null);
        setSummaryPipelineStatus(null);
      } finally {
        setSummaryLoading(false);
      }
    };
    void run();
  }, [leadId]);

  // Follow-up data
  const followUpText = "Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.";

  // Property visit data
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Load property visits for this lead (GET /leads/:id/stages/by-type/property_visit)
  const loadVisits = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await apiFetch<{
        data?: {
          visits?: Array<{
            id: string;
            visit_type: string;
            visit_date?: string | null;
            status: string;
          }>;
        };
      }>(`/api/v1/leads/${encodeURIComponent(leadId)}/stages/by-type/property_visit`);

      const apiVisits = res.data?.visits ?? [];
        const mapped: Visit[] = apiVisits.map((v, idx) => ({
          id: idx + 1,
          backendId: v.id,
          title: v.visit_type === "first_visit" ? "First Visit" : "Revisit",
          date: v.visit_date ? formatDate(v.visit_date) : undefined,
          status: v.status === "completed" ? "completed" : "pending",
          avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(v.id)}`,
        }));
      setVisits(mapped);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitOverview] Failed to load property visits", err);
      setVisits([]);
    }
  }, [leadId, formatDate]);

  useEffect(() => {
    void loadVisits();
  }, [leadId, loadVisits]);

  // Handle create visit
  const handleCreateVisit = useCallback(async (visitData: {
    projectId?: string;
    location: string;
    locationUrl: string;
    date: string;
    time: string;
  }) => {
    if (!leadId) return;
    if (isCreatingVisit) return;

    try {
      setIsCreatingVisit(true);

      // Backend expects first_visit or revisit.
      const visitType = visits.length === 0 ? "first_visit" : "revisit";

      await apiFetch(`/api/v1/leads/${encodeURIComponent(leadId)}/visits`, {
        method: "POST",
        body: {
          visit_date: visitData.date,
          visit_time: visitData.time,
          visit_type: visitType,
          project_id: visitData.projectId,
          location_city: visitData.location,
          location_coordinates: visitData.locationUrl || undefined,
        },
      });

      toast.success("Visit created");
      await loadVisits(); // Refresh the list from backend
    } catch (err: any) {
      const msg =
        err?.message || "Failed to create visit. Please try again.";
      toast.error(msg);
    } finally {
      setIsCreatingVisit(false);
    }
  }, [leadId, isCreatingVisit, visits.length, loadVisits]);

  type RecentCallState = {
    timestamp: string;
    summary: string;
    status: "answered" | "awaiting" | "missed" | "pending";
    statusText: string;
    duration?: string;
  } | null;

  type RecentChatState = {
    timestamp: string;
    summary: string;
    status: "answered" | "awaiting" | "missed" | "pending";
    statusText: string;
    messageCount?: number;
  } | null;

  const [recentCall, setRecentCall] = useState<RecentCallState>(null);
  const [recentChat, setRecentChat] = useState<RecentChatState>(null);

  // Load recent calls & chats for property_visit stage
  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      try {
        const res = await apiFetch<{
          data?: {
            stage?: {
              id?: string | null;
              remarks?: string | null;
            };
            recent_calls?: Array<{
              call_status?: string;
              call_outcome?: string | null;
              call_started_at?: string | null;
              recording_duration?: number | null;
            }>;
            whatsapp_conversations?: Array<{
              status?: string;
              conversation_started_at?: string | null;
              last_message_at?: string | null;
              messages?: Array<{
                message_text?: string | null;
              }>;
            }>;
          };
        }>(`/api/v1/leads/${encodeURIComponent(leadId)}/stages/by-type/property_visit`);

        const apiStageRemarksRaw = res.data?.stage?.remarks ?? "";
        const safeStageRemarksRaw =
          typeof apiStageRemarksRaw === "string" ? apiStageRemarksRaw : "";
        setStageId(res.data?.stage?.id ?? null);
        setStageRemarksRaw(safeStageRemarksRaw);
        setRemarks(parseStageRemarksToList(safeStageRemarksRaw));

        const calls = res.data?.recent_calls ?? [];
        if (Array.isArray(calls) && calls.length > 0) {
          const c = calls[0];
          const startedAt = c.call_started_at
            ? new Date(c.call_started_at)
            : null;
          const timestamp = startedAt ? startedAt.toLocaleString() : "Recent call";

          const durationSeconds = c.recording_duration ?? null;
          const duration =
            durationSeconds != null
              ? `${Math.floor(durationSeconds / 60)}:${String(
                  durationSeconds % 60
                ).padStart(2, "0")}`
              : undefined;

          const callStatus = (c.call_status || "").toLowerCase();
          let status: "answered" | "awaiting" | "missed" | "pending" =
            "pending";
          let statusText = "Pending";

          if (callStatus === "answered") {
            status = "answered";
            statusText = "Answered";
          } else if (callStatus === "missed") {
            status = "missed";
            statusText = "Missed";
          } else if (callStatus === "initiated" || callStatus === "ringing") {
            status = "awaiting";
            statusText = "Awaiting Response";
          }

          const callOutcome = c.call_outcome || null;
          const summary =
            callOutcome === "interested"
              ? "Interested"
              : callOutcome === "not_interested"
                ? "Not Interested"
                : callOutcome === "follow_up"
                  ? "Follow-up"
                  : callOutcome === "wrong_number"
                    ? "Wrong number"
                    : c.call_outcome || "Recent call activity for this property's visit stage.";

          setRecentCall({
            timestamp,
            summary,
            status,
            statusText,
            duration,
          });
        } else {
          setRecentCall(null);
        }

        const convs = res.data?.whatsapp_conversations ?? [];
        if (Array.isArray(convs) && convs.length > 0) {
          const conv = convs[0];
          const tsRaw = conv.last_message_at || conv.conversation_started_at || null;
          const timestamp = tsRaw ? new Date(tsRaw).toLocaleString() : "Recent chat";

          const latestMsg = conv.messages?.[0];
          const messageText = latestMsg?.message_text ?? null;
          const messageCount =
            Array.isArray(conv.messages) ? conv.messages.length : undefined;

          const statusRaw = (conv.status || "").toLowerCase();
          const statusText =
            statusRaw === "active"
              ? "Awaiting Response"
              : statusRaw === "closed"
                ? "Closed"
                : "Pending";
          const status: "answered" | "awaiting" | "missed" | "pending" =
            statusRaw === "active" ? "awaiting" : statusRaw === "closed" ? "answered" : "pending";

          setRecentChat({
            timestamp,
            summary: messageText ?? "Recent WhatsApp conversation for this property's visit stage.",
            status,
            statusText,
            messageCount,
          });
        } else {
          setRecentChat(null);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[SiteVisitOverview] Failed to load recent calls/chats", err);
        setRecentCall(null);
        setRecentChat(null);
        setStageId(null);
        setStageRemarksRaw("");
        setRemarks([]);
      }
    };

    void run();
  }, [leadId]);

  const canForwardToNegotiation =
    summaryStage === "site_visit" || summaryStage === "property_visit";
  const canApprove =
    summaryStage === "negotiation" ||
    canForwardToNegotiation ||
    summaryStage === "booking" ||
    summaryPipelineStatus === "deal";

  const handleApprove = async () => {
    if (!leadId) {
      toast.error("Missing leadId in URL");
      return;
    }
    if (isForwardingStage) return;
    toast.message("Forwarding to Negotiation...");
    if (summaryStage === "negotiation") {
      toast.message("Lead already moved to Negotiation.");
      router.push(
        `/sales/lead-list/lead-detail/negotiation/overveiw?leadId=${encodeURIComponent(
          leadId
        )}`
      );
      return;
    }
    if (summaryStage === "booking" || summaryPipelineStatus === "deal") {
      toast.message("Lead is in Booking.");
      router.push(
        `/sales/lead-list/lead-detail/booking/overveiw?leadId=${encodeURIComponent(
          leadId
        )}`
      );
      return;
    }

    try {
      setIsForwardingStage(true);

      await apiFetch(
        `/api/v1/leads/${encodeURIComponent(leadId)}/forward-stage`,
        {
          method: "POST",
          body: {
            next_stage: "negotiation",
          },
        }
      );

      toast.success("Lead forwarded to Negotiation");
      router.push(
        `/sales/lead-list/lead-detail/negotiation/overveiw?leadId=${encodeURIComponent(
          leadId
        )}`
      );
    } catch (err: any) {
      const msg = err?.message || "Failed to forward lead to negotiation.";
      toast.error(msg, {
        description:
          err?.data?.error ||
          err?.data?.message ||
          (typeof err === "string" ? err : ""),
      });
    } finally {
      setIsForwardingStage(false);
    }
  };

  const handleReject = () => {
    if (leadId) {
      router.push(
        `/sales/lead-list/rejected-form?leadId=${encodeURIComponent(leadId)}`
      );
      return;
    }
    router.push("/sales/lead-list/rejected-form");
  };

  const handleAddRemark = async () => {
    if (!leadId || !stageId) return;
    const trimmed = newRemark.trim();
    if (!trimmed) return;

    const prevRaw = stageRemarksRaw ?? "";
    const nextRaw = prevRaw.trimEnd()
      ? `${prevRaw.trimEnd()}\n${trimmed}`
      : trimmed;

    try {
      await apiFetch(
        `/api/v1/leads/${encodeURIComponent(leadId)}/stages/${encodeURIComponent(
          stageId
        )}/remarks`,
        {
          method: "PATCH",
          body: { remarks: nextRaw },
        }
      );

      setStageRemarksRaw(nextRaw);
      setRemarks(parseStageRemarksToList(nextRaw));
      setNewRemark("");
      toast.success("Remark added");
    } catch (err: any) {
      const msg =
        err?.message || "Failed to add remark. Please try again.";
      toast.error(msg);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newRemark.trim()) {
      void handleAddRemark();
    }
  };

  const handleAddFollowUp = async () => {
    if (!leadId || !stageId) return;
    const trimmed = followUpText.trim();
    if (!trimmed) return;

    const prevRaw = stageRemarksRaw ?? "";
    const nextRaw = prevRaw.trimEnd()
      ? `${prevRaw.trimEnd()}\n${trimmed}`
      : trimmed;

    try {
      await apiFetch(
        `/api/v1/leads/${encodeURIComponent(leadId)}/stages/${encodeURIComponent(
          stageId
        )}/remarks`,
        {
          method: "PATCH",
          body: { remarks: nextRaw },
        }
      );

      setStageRemarksRaw(nextRaw);
      setRemarks(parseStageRemarksToList(nextRaw));
      toast.success("Follow-up added");
    } catch (err: any) {
      const msg =
        err?.message || "Failed to add follow-up. Please try again.";
      toast.error(msg);
    }
  };

  // Follow-ups handlers
  const handleSelectFollowUp = (id: string | number) => {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    setSelectedFollowUps((prev) =>
      prev.includes(numId) ? prev.filter((item) => item !== numId) : [...prev, numId]
    );
  };

  const handleSelectAllFollowUps = () => {
    if (selectedFollowUps.length === followUpsData.length) {
      setSelectedFollowUps([]);
    } else {
      setSelectedFollowUps(followUpsData.map((item) => item.id));
    }
  };

  const handleExport = () => {
    console.log("Exporting follow-ups");
  };

  const handleRefresh = () => {
    console.log("Refreshing follow-ups");
  };

  const handleDelete = () => {
    console.log("Deleting selected follow-ups:", selectedFollowUps);
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
          <img
            src={row.avatar}
            alt={row.fullName}
            className="w-8 h-8 rounded-full object-cover"
          />
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

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Tab Switcher - Enhanced mobile support */}
        <div className="flex gap-4 sm:gap-6 md:gap-10 border-b border-[#E3E6F0] mb-4 sm:mb-6 lg:mb-8 overflow-x-auto scrollbar-hide -mx-3 sm:-mx-4 md:-mx-6 lg:mx-0 px-3 sm:px-4 md:px-6 lg:px-0">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "overview"
              ? "text-[var(--primary-base)]"
              : "text-[#718096]"
          }`}
        >
          Overview
          {activeTab === "overview" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("followups")}
          className={`px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-medium transition-colors relative whitespace-nowrap ${
            activeTab === "followups"
              ? "text-[var(--primary-base)]"
              : "text-[#718096]"
          }`}
        >
          Follow Ups
          {activeTab === "followups" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--primary-base)]"></span>
          )}
        </button>
      </div>

      {/* Main Content */}
      {activeTab === "overview" ? (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 xl:gap-7">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Lead Profile */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">Lead Profile</h2>
            <div className="space-y-4">
              <DataCard
                id={leadData.id}
                name={leadData.name}
                phone={leadData.phone}
                avatar={leadData.avatar}
                budget={leadData.budget}
                propertyName={leadData.propertyName}
                timeAgo={leadData.timeAgo}
                location={leadData.location}
                status={leadData.status}
                source={leadData.source}
              />
              
              {/* Call and Chat Buttons */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <button className="bg-[var(--primary-base)] text-white py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 hover:opacity-95 transition-opacity">
                  <Phone size={16} weight="regular" className="flex-shrink-0" />
                  <span className="hidden sm:inline">Call Now</span>
                  <span className="sm:hidden">Call</span>
                </button>
                <button
                  onClick={() =>
                    router.push(
                      leadId
                        ? `/sales/lead-list/chat-now?leadId=${leadId}`
                        : "/sales/lead-list/chat-now"
                    )
                  }
                  className="bg-[var(--primary-base)] text-white py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 hover:opacity-95 transition-opacity"
                >
                  <ChatCircle size={16} weight="regular" className="flex-shrink-0" />
                  <span className="hidden sm:inline">Chat Now</span>
                  <span className="sm:hidden">Chat</span>
                </button>
              </div>
            </div>
          </section>

          {/* Remarks Section */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">Remarks</h2>
            
            {/* Remarks List - Inner white card */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E3E6F0] shadow-sm mb-4 sm:mb-5">
              {remarks.length === 0 ? (
                <p className="text-sm sm:text-base text-[#718096] text-center">No remarks available</p>
              ) : (
                <ul className="space-y-3">
                  {remarks.map((remark, index) => (
                    <li key={index} className="relative pl-5 text-sm sm:text-base text-[#2D3748]">
                      <span className="absolute left-0 top-2 w-2 h-2 bg-[var(--primary-base)] rounded-full"></span>
                      {remark}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Follow-up Card */}
            <div className="bg-white border border-[#E3E6F0] rounded-xl p-4 sm:p-5 shadow-sm mb-4 sm:mb-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm text-[#718096] flex-1">
                  {followUpText}
                </span>
                <button
                  onClick={handleAddFollowUp}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#E3E6F0] bg-[#F8FAFC] flex items-center justify-center text-lg sm:text-xl font-semibold hover:bg-[#E3E6F0] transition-colors cursor-pointer flex-shrink-0"
                  aria-label="Add follow-up reminder"
                >
                  +
                </button>
              </div>
            </div>

            {/* Remark Input */}
            <div className="flex items-center gap-2 sm:gap-3 w-full">
              <div className="flex-1 flex items-center gap-2 sm:gap-3 bg-[#F8F9FC] border border-[#E3E6F0] rounded-full px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 min-w-0">
                <span className="text-base sm:text-lg flex-shrink-0">😊</span>
                <input
                  type="text"
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a new remark..."
                  className="flex-1 border-none bg-transparent outline-none text-xs sm:text-sm md:text-base text-[#2D3748] placeholder:text-[#718096] min-w-0 w-0"
                />
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                    title="Add link"
                  >
                    <LinkSimple size={14} weight="regular" className="text-[#718096] sm:w-4 sm:h-4 md:w-[16px] md:h-[16px]" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                    title="Add image"
                  >
                    <Camera size={14} weight="regular" className="text-[#718096] sm:w-4 sm:h-4 md:w-[16px] md:h-[16px]" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!newRemark.trim()) return;
                  void handleAddRemark();
                }}
                className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all flex-shrink-0 ${
                  newRemark.trim() ? "cursor-pointer hover:scale-105" : "cursor-default opacity-50"
                }`}
                disabled={!newRemark.trim()}
                title={newRemark.trim() ? "Send remark" : "Voice input"}
              >
                {newRemark.trim() ? (
                  <PaperPlaneTilt size={12} weight="fill" className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                ) : (
                  <Microphone size={12} weight="fill" className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                )}
              </button>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Property Visit List */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">Property Visit List</h2>
            <PropertyVisitCard
              visits={visits}
              onAddRevisit={() => {
                setIsDrawerOpen(true);
              }}
              onVisitClick={(visit) => {
                const query = leadId && visit.backendId
                  ? `?leadId=${encodeURIComponent(leadId)}&visitId=${encodeURIComponent(
                      visit.backendId
                    )}`
                  : leadId
                    ? `?leadId=${encodeURIComponent(leadId)}`
                    : "";
                router.push(
                  `/sales/lead-list/lead-detail/site-visit/overveiw/site-visit-detail${query}`
                );
              }}
            />
          </section>

          {/* Recent Calls */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">Recent Calls</h2>
            {recentCall ? (
            <CallChatCard
              type="call"
              timestamp={recentCall.timestamp}
              summary={recentCall.summary}
                status={recentCall.status}
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
              <p className="text-sm sm:text-base text-[#718096] text-center py-6">
                No recent calls found
              </p>
            )}
          </section>

          {/* Recent Chats */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">Recent Chats</h2>
            {recentChat ? (
            <CallChatCard
              type="chat"
              timestamp={recentChat.timestamp}
              summary={recentChat.summary}
                status={recentChat.status}
                statusText={recentChat.statusText}
              messageCount={recentChat.messageCount}
              onClick={() => router.push("/sales/lead-list/chat-now")}
              onForward={() => {
                console.log("Viewing chat details");
              }}
              showBorder={false}
            />
            ) : (
              <p className="text-sm sm:text-base text-[#718096] text-center py-6">
                No recent chats found
              </p>
            )}
          </section>
        </div>
        </div>

        {/* Action Footer - Outside grid, at bottom like caller-overview */}
        <div className="mt-4 sm:mt-5 lg:mt-6">
          <div className="flex gap-3 sm:gap-4">
            <button
              onClick={handleReject}
              className="flex-1 bg-white border border-[#718096] text-[#718096] py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:bg-[#F8F9FC] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <X size={18} weight="regular" className="flex-shrink-0" />
              <span>Reject</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={isForwardingStage}
              className={`flex-1 bg-[var(--primary-base)] text-white py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:opacity-95 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] ${
                isForwardingStage
                  ? "opacity-60 cursor-not-allowed hover:opacity-95 hover:shadow-lg hover:-translate-y-0 active:scale-100"
                  : ""
              }`}
            >
              <span>{isForwardingStage ? "Forwarding..." : "Approve"}</span>
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
            onRowClick={(row) => {
              const query = leadId ? `?leadId=${leadId}` : "";
              router.push(
                `/sales/lead-list/lead-detail/site-visit/overveiw/follow-up-detail${query}`
              );
            }}
            renderActions={(row) => (
              <button
                className="text-[var(--primary-base)] text-sm font-medium hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  const query = leadId ? `?leadId=${leadId}` : "";
                  router.push(
                    `/sales/lead-list/lead-detail/site-visit/overveiw/follow-up-detail${query}`
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

      {/* Create Visit Drawer */}
      <CreateVisitDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreateVisit={handleCreateVisit}
        initialProjectId={drawerInitialValues.initialProjectId}
        initialLocation={drawerInitialValues.initialLocation}
        initialLocationUrl={drawerInitialValues.initialLocationUrl}
        initialDate={drawerInitialValues.initialDate}
        initialTime={drawerInitialValues.initialTime}
      />
    </div>
  );
}

