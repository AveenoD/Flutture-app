"use client";

import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Phone,
  ChatCircle,
  X,
  PaperPlaneTilt,
  Microphone,
  Download,
  Trash,
  ArrowClockwise,
  LinkSimple,
  Camera,
  Plus,
} from "phosphor-react";
import { DataCard } from "../../../../../../components/ui/card/dataCard";
import { CallChatCard } from "../../../../../../components/ui/card/callChatCard";
import { PropertyVisitCard } from "../../../../../../components/ui/card/propertyVisitCard";
import type { Visit as PropertyVisit } from "../../../../../../components/ui/card/propertyVisitCard";
import { StatusType } from "../../../../../../components/ui/badges";
import { DataTable, Column } from "../../../../../../components/ui/dataTabel";
import { CreateVisitDrawer } from "../../../../../../components/ui/createVisitDrawer";
import { apiGet, apiPost, apiFetch } from "../../../../../../lib/apiClient";
import { toast } from "sonner";

interface FollowUpData {
  /** Local table row id for React/DataTable */
  id: number;
  /** Backend follow-up id used for PATCH /complete */
  backendId: string;
  fullName: string;
  avatar?: string;
  date: string;
  time: string;
  status: "pending" | "completed" | "missed";
}

export default function SiteVisitOverviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"overview" | "followups">("overview");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newRemark, setNewRemark] = useState("");
  // Raw remarks string from backend (lead_stages.remarks) + split list for UI
  const [remarksRaw, setRemarksRaw] = useState<string>("");
  const [remarks, setRemarks] = useState<string[]>([]);

  // Follow-ups data for property_visit stage (loaded from API)
  const [followUps, setFollowUps] = useState<FollowUpData[]>([]);
  const [isCreateFollowUpOpen, setIsCreateFollowUpOpen] = useState(false);
  const [newFollowType, setNewFollowType] = useState<"call" | "whatsapp" | "visit" | "meeting" | "document">("call");
  const [newFollowDate, setNewFollowDate] = useState("");
  const [newFollowRemark, setNewFollowRemark] = useState("");
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFollowUps, setSelectedFollowUps] = useState<number[]>([]);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Complete follow-up (outcome) modal state
  const [isCompleteFollowUpOpen, setIsCompleteFollowUpOpen] = useState(false);
  const [followUpBeingCompleted, setFollowUpBeingCompleted] =
    useState<FollowUpData | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState<
    "interested" | "not_interested" | "follow_up" | "no_response"
  >("interested");
  const [completeRemark, setCompleteRemark] = useState("");
  const [completingFollowUp, setCompletingFollowUp] = useState(false);

  // Lead profile (from real API)
  const [leadProfile, setLeadProfile] = useState<{
    name: string;
    projectTitle?: string | null;
    phone: string;
    city?: string | null;
    avatar: string;
    budgetText: string;
    source?: string | null;
    timeAgo?: string;
    status: StatusType;
  } | null>(null);

  const [isReadOnly, setIsReadOnly] = useState(false);

  const readOnlyMessage =
    "This lead has been handed over to Sales. You can view it, but you can't edit it from Presales.";

  const assertWritable = () => {
    if (!isReadOnly) return true;
    toast.error(readOnlyMessage);
    return false;
  };

  // Helper: format budget range to "₹40L - ₹50L"
  const formatBudgetRange = (min?: number | null, max?: number | null): string => {
    if (min == null && max == null) return "—";
    const format = (value: number) => `₹${value}L`;
    if (min != null && max != null) return `${format(min)} - ${format(max)}`;
    if (min != null) return `From ${format(min)}`;
    return `Up to ${format(max as number)}`;
  };

  // Load lead details for this stage (same GET /api/v1/leads/{id})
  useEffect(() => {
    const id = searchParams.get("leadId");
    if (!id) return;

    const fetchLead = async () => {
      try {
        const res = await apiGet<{
          data: {
            lead: {
              id: string;
              name?: string;
              phone?: string;
              city?: string | null;
              source?: string | null;
              lead_temperature?: "veryhot" | "hot" | "warm" | "cold";
              assigned_to_user_type?: "sales" | string | null;
              budget_min?: number | null;
              budget_max?: number | null;
              project_title?: string | null;
            };
          };
        }>(`/api/v1/leads/${id}`);

        const lead = res.data.lead;
        setIsReadOnly(lead.assigned_to_user_type === "sales");
        const budgetText = formatBudgetRange(lead.budget_min, lead.budget_max);

        setLeadProfile({
          name: lead.name || "",
          projectTitle: lead.project_title,
          phone: lead.phone || "",
          city: lead.city,
          avatar:
            "https://i.pravatar.cc/150?u=" +
            encodeURIComponent(lead.id || lead.phone || lead.name || "lead"),
          budgetText,
          source: lead.source,
          timeAgo: "", // optional; not provided by API directly
          status: (lead.lead_temperature as StatusType) || "cold",
        });
      } catch (err) {
        console.error("[SiteVisitOverview] Failed to load lead profile", err);
      }
    };

    fetchLead();
  }, [searchParams]);

  // Follow-up data
  const followUpText =
    "Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.";

  // Property visit data (from real API)
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [stageId, setStageId] = useState<string | null>(null);

  // Recent calls/chats for property_visit stage (from real API)
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

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Load property visits + recent calls/chats for this lead (GET /leads/{id}/stages/by-type/property_visit)
  useEffect(() => {
    const id = searchParams.get("leadId");
    if (!id) return;

    const fetchVisits = async () => {
      try {
        const res = await apiGet<{
          data?: {
            stage?: { remarks?: string | null };
            recent_calls?: {
              call_status?: string;
              call_outcome?: string | null;
              call_started_at?: string | null;
              call_ended_at?: string | null;
              recording_duration?: number | null;
            }[];
            whatsapp_conversations?: {
              last_message_text?: string | null;
              last_message_at?: string | null;
              updated_at?: string | null;
              message_count?: number | null;
              messages?: unknown[];
            }[];
            visits?: {
              id: string;
              visit_type: string;
              visit_date?: string | null;
              status: string;
            }[];
          };
        }>(`/api/v1/leads/${id}/stages/by-type/property_visit`);

        const payload = res.data || {};

        // Map visits list
        const apiVisits = payload.visits || [];
        const mapped: PropertyVisit[] = apiVisits.map((v) => ({
          id: v.id,
          title: v.visit_type === "first_visit" ? "First Visit" : "Revisit",
          date: v.visit_date ? formatDate(v.visit_date) : undefined,
          status: v.status === "completed" ? "completed" : "pending",
        }));
        setVisits(mapped);

        // Stage-level remarks (single remarks string split into bullets)
        const stageRemarksText = payload.stage?.remarks || "";
        const stageRemarksList = stageRemarksText
          ? stageRemarksText
              .split(/\n+/)
              .map((r) => r.trim())
              .filter(Boolean)
          : [];
        setRemarksRaw(stageRemarksText);
        setRemarks(stageRemarksList);
        setStageId(payload.stage?.id ?? null);

        // Follow-ups for this stage
        const apiFollowUps =
          (payload as {
            follow_ups?: {
              id: string;
              followup_date: string;
              remark?: string | null;
              status: string;
            }[];
          }).follow_ups || [];
        const mappedFollowUps: FollowUpData[] = apiFollowUps.map((f, index) => {
          const d = new Date(f.followup_date);
          const dateStr = d.toLocaleDateString();
          const timeStr = d.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          });
          let status: FollowUpData["status"] = "pending";
          if (f.status === "completed") status = "completed";
          if (f.status === "missed") status = "missed";
          return {
            id: index + 1,
            backendId: f.id,
            fullName: f.remark || "Follow-up",
            date: dateStr,
            time: timeStr,
            status,
          };
        });
        setFollowUps(mappedFollowUps);

        // Recent call for this stage (first from recent_calls)
        const calls = payload.recent_calls || [];
        if (Array.isArray(calls) && calls.length > 0) {
          const c = calls[0];
          const startedAt = c.call_started_at ? new Date(c.call_started_at) : null;
          const timestamp = startedAt
            ? startedAt.toLocaleString()
            : "Recent call recording";

          const durationSeconds = c.recording_duration ?? null;
          const duration =
            durationSeconds != null
              ? `${Math.floor(durationSeconds / 60)}:${String(
                  durationSeconds % 60
                ).padStart(2, "0")}`
              : undefined;

          let status: StatusType = "success";
          let statusText = "Answered";
          const callStatus = (c.call_status || "").toLowerCase();
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
              c.call_outcome || "Recent call activity for this property's visit stage.",
            status,
            statusText,
            duration,
          });
        } else {
          setRecentCall(null);
        }

        // Recent chat (first whatsapp conversation)
        const convs = payload.whatsapp_conversations || [];
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
              "Recent WhatsApp conversation for this property's visit stage.",
            status: "warm",
            statusText: "Awaiting Response",
            messageCount,
          });
        } else {
          setRecentChat(null);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[SiteVisitOverview] Failed to load property visits / calls / chats",
          err
        );
        setVisits([]);
        setRecentCall(null);
        setRecentChat(null);
        setFollowUps([]);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchVisits();
  }, [searchParams]);

  // Handle create visit (POST /leads/{id}/visits)
  const handleCreateVisit = async (visitData: {
    projectId?: string;
    location: string;
    locationUrl: string;
    date: string;
    time: string;
  }) => {
    if (!assertWritable()) return;
    const leadId = searchParams.get("leadId");
    if (!leadId) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitOverview] Missing leadId for create visit");
      return;
    }

    try {
      const visitType = visits.length === 0 ? "first_visit" : "revisit";
      const res = await apiPost<
        {
          visit: {
            id: string;
            visit_type: string;
            visit_date?: string | null;
            status: string;
          };
        }
      >(`/api/v1/leads/${leadId}/visits`, {
        visit_date: visitData.date,
        visit_time: visitData.time,
        visit_type: visitType,
        project_id: visitData.projectId,
        location_city: visitData.location || undefined,
        location_area: visitData.location || undefined,
        location_coordinates: visitData.locationUrl || undefined,
      });

      const v = res.data.visit;
      const newVisit: PropertyVisit = {
        id: v.id,
        title: v.visit_type === "first_visit" ? "First Visit" : "Revisit",
        date: v.visit_date ? formatDate(v.visit_date) : undefined,
        status: v.status === "completed" ? "completed" : "pending",
      };
      setVisits((prev) => [...prev, newVisit]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitOverview] Failed to create visit", err);
    }
  };

  const handleApprove = async () => {
    // Approve action intentionally disabled for now.
    return;
  };

  const handleReject = () => {
    if (!assertWritable()) return;
    const id = searchParams.get("leadId");
    router.push(
      id
        ? `/caller/lead-list/rejected-form?leadId=${encodeURIComponent(id)}`
        : "/caller/lead-list/rejected-form"
    );
  };

  const handleAddRemark = async () => {
    if (!assertWritable()) return;
    const trimmed = newRemark.trim();
    const leadId = searchParams.get("leadId");

    if (!trimmed) return;
    if (!leadId || !stageId) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitOverview] Missing leadId or stageId for add remark", {
        leadId,
        stageId,
      });
      // Optimistic local update so user still sees remark
      setRemarks((prev) => [...prev, trimmed]);
      setRemarksRaw((prev) => (prev ? `${prev}\n${trimmed}` : trimmed));
      setNewRemark("");
      return;
    }

    const base = remarksRaw || "";
    const nextRemarksText = base ? `${base}\n${trimmed}` : trimmed;

    try {
      await apiFetch(`/api/v1/leads/${leadId}/stages/${stageId}/remarks`, {
        method: "PATCH",
        body: JSON.stringify({ remarks: nextRemarksText }),
      });
      setRemarks((prev) => [...prev, trimmed]);
      setRemarksRaw(nextRemarksText);
      setNewRemark("");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitOverview] Failed to save remark", err);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newRemark.trim()) {
      handleAddRemark();
    }
  };

  const handleAddFollowUp = () => {
    if (!assertWritable()) return;
    if (followUpText.trim()) {
      setRemarks([...remarks, followUpText.trim()]);
    }
  };

  // Follow-ups handlers
  const handleSelectFollowUp = (id: string | number) => {
    const numId = typeof id === "string" ? parseInt(id, 10) : id;
    setSelectedFollowUps((prev) =>
      prev.includes(numId) ? prev.filter((item) => item !== numId) : [...prev, numId]
    );
  };

  const handleSelectAllFollowUps = () => {
    if (selectedFollowUps.length === followUps.length) {
      setSelectedFollowUps([]);
    } else {
      setSelectedFollowUps(followUps.map((item) => item.id));
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
      // eslint-disable-next-line no-console
      console.error(
        "[SiteVisitOverview] Missing data for complete follow-up",
        { leadId, followUpBeingCompleted }
      );
      return;
    }

    if (!followUpBeingCompleted.backendId) {
      // eslint-disable-next-line no-console
      console.error(
        "[SiteVisitOverview] Missing backendId for follow-up; cannot complete",
        followUpBeingCompleted
      );
      return;
    }

    try {
      setCompletingFollowUp(true);
      await apiFetch(
        `/api/v1/leads/${leadId}/follow-ups/${followUpBeingCompleted.backendId}/complete`,
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
            ? { ...item, status: "completed" }
            : item
        )
      );

      setIsCompleteFollowUpOpen(false);
      setFollowUpBeingCompleted(null);
      setCompleteRemark("");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitOverview] Failed to complete follow-up", err);
    } finally {
      setCompletingFollowUp(false);
    }
  };

  // Filter follow-ups based on search
  const filteredFollowUps = followUps.filter((item) =>
    item.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers for Create Follow-up modal (visit stage)
  const handleOpenCreateFollowUp = () => {
    if (!assertWritable()) return;
    setIsCreateFollowUpOpen(true);
  };

  const handleCreateFollowUp = async () => {
    if (!assertWritable()) return;
    const leadId = searchParams.get("leadId");
    if (!leadId || !stageId || !newFollowDate || !newFollowRemark.trim()) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitOverview] Missing data for create follow-up", {
        leadId,
        stageId,
        newFollowDate,
        newFollowRemark,
      });
      return;
    }
    try {
      setCreatingFollowUp(true);
      const followupDate = new Date(newFollowDate);
      const isoDate = followupDate.toISOString();
      const res = await apiPost<
        {
          data: {
            follow_up: {
              id: string;
              followup_type: string;
              followup_date: string;
              remark?: string | null;
              status: string;
            };
          };
        }
      >(`/api/v1/leads/${leadId}/follow-ups`, {
        lead_stage_id: stageId,
        followup_type: newFollowType,
        followup_date: isoDate,
        remark: newFollowRemark.trim(),
      });
      const f = res.data.follow_up;
      const d = new Date(f.followup_date);
      const dateStr = d.toLocaleDateString();
      const timeStr = d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
      let status: FollowUpData["status"] = "pending";
      if (f.status === "completed") status = "completed";
      if (f.status === "missed") status = "missed";
      const newItem: FollowUpData = {
        id: followUps.length > 0 ? Math.max(...followUps.map((x) => x.id)) + 1 : 1,
        backendId: f.id,
        fullName: f.remark || "Follow-up",
        date: dateStr,
        time: timeStr,
        status,
      };
      setFollowUps((prev) => [...prev, newItem]);
      setIsCreateFollowUpOpen(false);
      setNewFollowRemark("");
      setNewFollowDate("");
      setNewFollowType("call");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitOverview] Failed to create follow-up", err);
    } finally {
      setCreatingFollowUp(false);
    }
  };

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
        } as const;
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
    {
      key: "actions",
      header: "ACTION",
      sortable: false,
      render: (row) => (
        <button
          type="button"
          disabled={isReadOnly || row.status !== "pending"}
          onClick={(e) => {
            e.stopPropagation();
            if (row.status === "pending") {
              handleOpenCompleteFollowUp(row);
            }
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            row.status === "pending" && !isReadOnly
              ? "border-[var(--primary-base)] text-[var(--primary-base)] hover:bg-[var(--primary-base)] hover:text-white"
              : "border-slate-200 text-slate-400 cursor-default bg-slate-50"
          }`}
        >
          Mark as Completed
        </button>
      ),
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
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">
                    Lead Profile
                  </h2>
                  <div className="space-y-4">
                    {leadProfile ? (
                      <DataCard
                        id={1}
                        name={leadProfile.name}
                        phone={leadProfile.phone}
                        avatar={leadProfile.avatar}
                        budget={leadProfile.budgetText}
                        propertyName={leadProfile.projectTitle || ""}
                        timeAgo={leadProfile.timeAgo || ""}
                        location={leadProfile.city || ""}
                        status={leadProfile.status}
                        source={leadProfile.source || undefined}
                      />
                    ) : (
                      <p className="text-sm text-slate-500">Loading lead profile...</p>
                    )}

                    {/* Call and Chat Buttons */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                      <button className="bg-[var(--primary-base)] text-white py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 hover:opacity-95 transition-opacity">
                        <Phone
                          size={16}
                          weight="regular"
                          className="flex-shrink-0"
                        />
                        <span className="hidden sm:inline">Call Now</span>
                        <span className="sm:hidden">Call</span>
                      </button>
                      <button
                        onClick={() => router.push("/caller/lead-list/chat-now")}
                        className="bg-[var(--primary-base)] text-white py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 hover:opacity-95 transition-opacity"
                      >
                        <ChatCircle
                          size={16}
                          weight="regular"
                          className="flex-shrink-0"
                        />
                        <span className="hidden sm:inline">Chat Now</span>
                        <span className="sm:hidden">Chat</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Remarks Section */}
                <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">
                    Remarks
                  </h2>

                  {/* Remarks List - Inner white card */}
                  <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E3E6F0] shadow-sm mb-4 sm:mb-5">
                    {remarks.length === 0 ? (
                      <p className="text-sm sm:text-base text-[#718096] text-center">
                        No remarks available
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {remarks.map((remark, index) => (
                          <li
                            key={index}
                            className="relative pl-5 text-sm sm:text-base text-[#2D3748]"
                          >
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
                        disabled={isReadOnly}
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
                        disabled={isReadOnly}
                        onKeyPress={handleKeyPress}
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
                          <LinkSimple
                            size={14}
                            weight="regular"
                            className="text-[#718096] sm:w-4 sm:h-4 md:w-[16px] md:h-[16px]"
                          />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                          title="Add image"
                        >
                          <Camera
                            size={14}
                            weight="regular"
                            className="text-[#718096] sm:w-4 sm:h-4 md:w-[16px] md:h-[16px]"
                          />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={newRemark.trim() ? handleAddRemark : undefined}
                      className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all flex-shrink-0 ${
                        isReadOnly
                          ? "cursor-not-allowed opacity-60"
                          : newRemark.trim()
                            ? "cursor-pointer hover:scale-105"
                            : "cursor-default opacity-50"
                      }`}
                      disabled={isReadOnly || !newRemark.trim()}
                      title={newRemark.trim() ? "Send remark" : "Voice input"}
                    >
                      {newRemark.trim() ? (
                        <PaperPlaneTilt
                          size={12}
                          weight="fill"
                          className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4"
                        />
                      ) : (
                        <Microphone
                          size={12}
                          weight="fill"
                          className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4"
                        />
                      )}
                    </button>
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                {/* Property Visit List */}
                <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">
                    Property Visit List
                  </h2>
                  <PropertyVisitCard
                    visits={visits}
                    onAddRevisit={() => {
                      if (!assertWritable()) return;
                      setIsDrawerOpen(true);
                    }}
                    onVisitClick={(visit) => {
                      const leadId = searchParams.get("leadId");
                      if (!leadId) return;
                      router.push(
                        `/caller/lead-list/lead-detail/site-visit/overview/site-visit-detail?leadId=${encodeURIComponent(
                          leadId
                        )}&visitId=${encodeURIComponent(String(visit.id))}`
                      );
                    }}
                  />
                </section>

                {/* Recent Calls */}
                <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">
                    Recent Calls
                  </h2>
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
                    <p className="text-sm text-slate-500">No recent calls for this visit stage.</p>
                  )}
                </section>

                {/* Recent Chats */}
                <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">
                    Recent Chats
                  </h2>
                  {recentChat ? (
                    <CallChatCard
                      type="chat"
                      timestamp={recentChat.timestamp}
                      summary={recentChat.summary}
                      status={recentChat.status}
                      statusText={recentChat.statusText}
                      messageCount={recentChat.messageCount}
                      onClick={() => router.push("/caller/lead-list/chat-now")}
                      onForward={() => {
                        console.log("Viewing chat details");
                      }}
                      showBorder={false}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">No recent chats for this visit stage.</p>
                  )}
                </section>
              </div>
            </div>

            {/* Action Footer - Outside grid, at bottom like caller-overview */}
            <div className="mt-4 sm:mt-5 lg:mt-6">
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={handleReject}
                  disabled={isReadOnly}
                  className="flex-1 bg-white border border-[#718096] text-[#718096] py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:bg-[#F8F9FC] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <X size={18} weight="regular" className="flex-shrink-0" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={true}
                  className="flex-1 bg-[var(--primary-base)]/60 text-white py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 shadow-lg cursor-not-allowed"
                >
                  <span>Approve</span>
                  <span className="text-lg sm:text-xl">≫</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#2D3748]">
                Follow Ups
              </h2>
              <button
                type="button"
                onClick={handleOpenCreateFollowUp}
                disabled={isReadOnly}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[var(--primary-base)] text-white text-sm sm:text-base font-semibold shadow-sm hover:bg-[var(--primary-hover)] transition-colors ${
                  isReadOnly ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <Plus size={16} weight="bold" />
                <span>Create Follow-up</span>
              </button>
            </div>
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
                const leadId = searchParams.get("leadId");
                if (!leadId) return;
                const backendId =
                  followUps.find((f) => f.id === row.id)?.backendId;
                if (!backendId) return;
                router.push(
                  `/caller/lead-list/lead-detail/site-visit/overview/follow-up-detail?leadId=${encodeURIComponent(
                    leadId
                  )}&followUpId=${encodeURIComponent(backendId)}`
                );
              }}
              renderActions={(row) => {
                const leadId = searchParams.get("leadId");
                const backendId =
                  followUps.find((f) => f.id === row.id)?.backendId;
                const disabled = !leadId || !backendId;
                return (
                  <button
                    className="text-[var(--primary-base)] text-sm font-medium hover:underline disabled:text-slate-300 disabled:no-underline"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (disabled) return;
                      router.push(
                        `/caller/lead-list/lead-detail/site-visit/overview/follow-up-detail?leadId=${encodeURIComponent(
                          leadId as string
                        )}&followUpId=${encodeURIComponent(backendId as string)}`
                      );
                    }}
                  >
                    View Detail
                  </button>
                );
              }}
            />
          </div>
        )}
      </div>

      {/* Create Visit Drawer */}
      <CreateVisitDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreateVisit={handleCreateVisit}
      />

      {/* Create Follow-up Modal (property_visit stage) */}
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

      {/* Complete Follow-up Modal (property_visit stage) */}
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
                    {followUpBeingCompleted.fullName}
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
