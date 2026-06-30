"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Phone,
  ChatCircle,
  Calendar,
  Clock,
  MapPin,
  Microphone,
  PaperPlaneTilt,
  Plus,
  LinkSimple,
  Camera,
  Download,
  Trash,
  ArrowClockwise,
} from "phosphor-react";
import { RemarksSection } from "../../../../../../../components/ui/remarksSection";
import { CallChatCard } from "../../../../../../../components/ui/card/callChatCard";
import { DataTable, Column } from "../../../../../../../components/ui/dataTabel";
import { apiFetch } from "../../../../../../../lib/apiClient";
import { getLeadSummary, type LeadSummary } from "../../../../../../../lib/leads";

type PropertyVisitDetailBackend = {
  success: boolean;
  message: string;
  data?: {
    visit?: {
      visit_type?: string;
      visit_date?: string | null;
      visit_time?: string | null;
      status?: string;
      location_city?: string | null;
      location_area?: string | null;
      location_coordinates?: string | null;
      site_visit_images?: string[];
      site_visit_image_urls?: string[];
    };
    project?: {
      id: string;
      project_title: string;
    };
  };
};

type StageByTypePropertyVisitBackend = {
  success: boolean;
  message: string;
  data?: {
    stage?: {
      id?: string;
      remarks?: string | null;
    };
    follow_ups?: Array<{
      id: string;
      followup_date?: string;
      remark?: string | null;
      status?: string | null;
    }>;
    recent_calls?: Array<{
      call_status?: string;
      call_outcome?: string | null;
      call_started_at?: string | null;
      call_ended_at?: string | null;
      recording_duration?: number | null;
    }>;
    whatsapp_conversations?: Array<{
      status?: string;
      conversation_started_at?: string | null;
      last_message_at?: string | null;
      messages?: Array<{
        direction?: string;
        message_text?: string | null;
        sent_at?: string;
      }>;
    }>;
  };
};

type RecentCallCardState = {
  timestamp: string;
  summary: string;
  status: "answered" | "awaiting" | "missed" | "pending";
  statusText: string;
  duration?: string;
} | null;

type RecentChatCardState = {
  timestamp: string;
  summary: string;
  status: "answered" | "awaiting" | "missed" | "pending";
  statusText: string;
  messageCount?: number;
} | null;

interface FollowUpData {
  id: number;
  backendId?: string;
  fullName: string;
  avatar: string;
  date: string;
  time: string;
  status: "pending" | "completed" | "missed";
}

export default function SiteVisitDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const visitId = searchParams.get("visitId");

  const [visitDetail, setVisitDetail] = useState<
    PropertyVisitDetailBackend["data"] | null
  >(null);
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);
  const [visitSiteImages, setVisitSiteImages] = useState<string[]>([]);
  const [stageId, setStageId] = useState<string | null>(null);

  const formatVisitDate = (dateString?: string | null) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatVisitTime = (timeString?: string | null) => {
    if (!timeString) return "";
    const parts = timeString.split(":");
    if (parts.length < 2) return timeString;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (Number.isNaN(h) || Number.isNaN(m)) return timeString;
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = (h % 12) || 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  useEffect(() => {
    const run = async () => {
      if (!leadId || !visitId) {
        setVisitError("Missing leadId or visitId in URL.");
        return;
      }

      try {
        setVisitLoading(true);
        setVisitError(null);
        setVisitDetail(null);
        setVisitSiteImages([]);

        const res = await apiFetch<PropertyVisitDetailBackend>(
          `/api/v1/leads/${encodeURIComponent(leadId)}/visits/${encodeURIComponent(visitId)}`
        );

        const payload = res.data ?? null;
        setVisitDetail(payload);

        const urls =
          payload?.visit?.site_visit_image_urls ??
          payload?.visit?.site_visit_images ??
          [];
        setVisitSiteImages(urls);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load visit detail.";
        setVisitError(msg);
      } finally {
        setVisitLoading(false);
      }
    };

    void run();
  }, [leadId, visitId]);

  const [recentCall, setRecentCall] = useState<RecentCallCardState>(null);
  const [recentChat, setRecentChat] = useState<RecentChatCardState>(null);

  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      try {
        const res = await apiFetch<StageByTypePropertyVisitBackend>(
          `/api/v1/leads/${encodeURIComponent(leadId)}/stages/by-type/property_visit`
        );

        setStageId(res.data?.stage?.id ?? null);

        // Stage remarks -> remarks bullets
        const stageRemarks = res.data?.stage?.remarks ?? "";
        setStageRemarksRaw(stageRemarks);
        if (stageRemarks && typeof stageRemarks === "string") {
          const list = stageRemarks
            .split(/\n+/)
            .map((r) => r.trim())
            .filter(Boolean)
            .map((r) => r.replace(/^[-•\u2022]\s*/, "").trim());
          setRemarks(list);
        } else {
          setRemarks([]);
        }

        // Follow-ups -> DataTable rows
        const apiFollowUps = res.data?.follow_ups ?? [];
        if (Array.isArray(apiFollowUps) && apiFollowUps.length > 0) {
          const mapped: FollowUpData[] = apiFollowUps.map((f, index) => {
            const d = f.followup_date ? new Date(f.followup_date) : null;
            const dateStr = d ? d.toLocaleDateString() : "";
            const timeStr = d
              ? d.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            const statusRaw = (f.status || "").toLowerCase();
            const status: FollowUpData["status"] =
              statusRaw === "completed"
                ? "completed"
                : statusRaw === "missed"
                  ? "missed"
                  : "pending";

            const remarkText = (f.remark ?? "").trim();

            return {
              id: index + 1,
              backendId: f.id,
              fullName: remarkText || "Follow-up",
              avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(f.id)}`,
              date: dateStr,
              time: timeStr,
              status,
            };
          });

          setFollowUpsData(mapped);
        } else {
          setFollowUpsData([]);
        }

        const calls = res.data?.recent_calls ?? [];
        if (Array.isArray(calls) && calls.length > 0) {
          const c = calls[0];
          const startedAt = c.call_started_at ? new Date(c.call_started_at) : null;
          const timestamp = startedAt ? startedAt.toLocaleString() : "Recent call";

          const durationSeconds = c.recording_duration ?? null;
          const duration =
            durationSeconds != null
              ? `${Math.floor(durationSeconds / 60)}:${String(
                  durationSeconds % 60
                ).padStart(2, "0")}`
              : undefined;

          const callStatus = (c.call_status || "").toLowerCase();
          let status: "answered" | "awaiting" | "missed" | "pending";
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
          } else {
            // failed / rejected / others
            status = "pending";
            statusText = "Pending";
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
                    : "Recent call activity for this property's visit stage.";

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
          const ts = tsRaw ? new Date(tsRaw).toLocaleString() : "Recent chat";

          const latestMsg = conv.messages?.[0];
          const messageText = latestMsg?.message_text ?? null;
          const messageCount = Array.isArray(conv.messages) ? conv.messages.length : undefined;

          const statusRaw = (conv.status || "").toLowerCase();
          const statusText =
            statusRaw === "active" ? "Awaiting Response" : statusRaw === "closed" ? "Closed" : "Pending";
          const status: "answered" | "awaiting" | "missed" | "pending" =
            statusRaw === "active" ? "awaiting" : statusRaw === "closed" ? "answered" : "pending";

          setRecentChat({
            timestamp: ts,
            summary: messageText ?? "Recent WhatsApp conversation for this property's visit stage.",
            status,
            statusText,
            messageCount,
          });
        } else {
          setRecentChat(null);
        }
      } catch {
        setRecentCall(null);
        setRecentChat(null);
      }
    };

    void run();
  }, [leadId]);

  // Sales summary -> Summary paragraph
  useEffect(() => {
    const run = async () => {
      if (!leadId) return;
      try {
        const summaryRes: LeadSummary = await getLeadSummary(leadId);
        const stageRemarks = summaryRes.stage_remarks ?? [];

        const propertyVisit =
          stageRemarks.find((r) => r.stage_type === "property_visit") ??
          stageRemarks.find((r) => r.stage_type === "site_visit");

        // Backend sends stage_remarks in descending created_at order,
        // but we still fall back safely if none match.
        setSummaryText(propertyVisit?.remarks ?? stageRemarksRaw ?? "");
      } catch {
        setSummaryText("");
      }
    };

    void run();
  }, [leadId]);

  const visitProjectTitle = useMemo(() => {
    return visitDetail?.project?.project_title ?? "";
  }, [visitDetail]);

  const visitTitle = useMemo(() => {
    const type = visitDetail?.visit?.visit_type;
    if (visitProjectTitle) return visitProjectTitle;
    if (type === "first_visit") return "First Visit";
    if (type === "revisit") return "Revisit";
    return "Visit";
  }, [visitDetail, visitProjectTitle]);

  const visitDateText = useMemo(() => {
    return formatVisitDate(visitDetail?.visit?.visit_date ?? null);
  }, [visitDetail]);

  const visitTimeText = useMemo(() => {
    return formatVisitTime(visitDetail?.visit?.visit_time ?? null);
  }, [visitDetail]);

  const visitLocationText = useMemo(() => {
    const city = visitDetail?.visit?.location_city ?? "";
    const area = visitDetail?.visit?.location_area ?? "";
    const parts = [city, area].filter(
      (x) => x && x.trim().length > 0
    );
    return parts.join(", ");
  }, [visitDetail]);

  const visitStatusLabel = useMemo(() => {
    const raw = (visitDetail?.visit?.status || "").toLowerCase();
    if (raw === "completed") return "Completed";
    // Align with Property Visit list: anything else is treated as pending.
    return "Pending";
  }, [visitDetail]);
  const [activeTab, setActiveTab] = useState<"overview" | "followups">("overview");
  const [newRemark, setNewRemark] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [remarks, setRemarks] = useState<string[]>([]);
  const [stageRemarksRaw, setStageRemarksRaw] = useState<string>("");

  const followUpText = "Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.";

  const handleReject = () => {
    router.push("/sales/lead-list/rejected-form");
  };

  // Follow-ups data
  const [followUpsData, setFollowUpsData] = useState<FollowUpData[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFollowUps, setSelectedFollowUps] = useState<number[]>([]);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const siteImages = [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800",
  ];

  const [summaryText, setSummaryText] = useState<string>("");

  // Recent calls/chats data fetched from backend

  const splitStageRemarksToBullets = (raw: string): string[] => {
    const normalized = raw ?? "";
    if (!normalized.trim()) return [];
    return normalized
      .split(/\n+/)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.replace(/^[-•\u2022]\s*/, "").trim());
  };

  const handleAddRemark = () => {
    if (!leadId || !stageId) return;
    const trimmed = newRemark.trim();
    if (!trimmed) return;

    void (async () => {
      try {
        const prevRaw = stageRemarksRaw ?? "";
        const nextRaw = prevRaw.trimEnd()
          ? `${prevRaw.trimEnd()}\n${trimmed}`
          : trimmed;

        await apiFetch(`/api/v1/leads/${encodeURIComponent(
          leadId
        )}/stages/${encodeURIComponent(stageId)}/remarks`, {
          method: "PATCH",
          body: { remarks: nextRaw },
        });

        setStageRemarksRaw(nextRaw);
        setRemarks(splitStageRemarksToBullets(nextRaw));
        setNewRemark("");
      } catch {
        // Keep local state unchanged on failure.
      }
    })();
  };

  const handleAddFollowUp = () => {
    if (followUpText.trim()) {
      setRemarks([...remarks, followUpText.trim()]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newRemark.trim()) {
      handleAddRemark();
    }
  };

  const handleAddSummary = () => {
    if (!leadId || !stageId) return;
    const trimmed = newSummary.trim();
    if (!trimmed) return;

    void (async () => {
      try {
        const prevRaw = stageRemarksRaw ?? "";
        const nextRaw = prevRaw.trimEnd()
          ? `${prevRaw.trimEnd()}\n${trimmed}`
          : trimmed;

        await apiFetch(`/api/v1/leads/${encodeURIComponent(
          leadId
        )}/stages/${encodeURIComponent(stageId)}/remarks`, {
          method: "PATCH",
          body: { remarks: nextRaw },
        });

        setStageRemarksRaw(nextRaw);
        setRemarks(splitStageRemarksToBullets(nextRaw));
        setSummaryText(nextRaw);
        setNewSummary("");
      } catch {
        // Keep local state unchanged on failure.
      }
    })();
  };

  // Follow-ups handlers
  const handleSelectFollowUp = (id: string | number) => {
    const numId = typeof id === "string" ? parseInt(id) : id;
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Visit Card Section - Enhanced mobile */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">visit card</h2>
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute top-0 right-0 bg-gradient-to-r from-[var(--surface-warning)] to-[#ffe8cc] text-[var(--warning)] px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold border border-[var(--warning)]/20 shadow-sm">
                  {visitLoading ? "—" : visitStatusLabel}
                </span>
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-slate-900 pr-20 sm:pr-24">
                  {visitLoading ? "Loading..." : visitTitle}
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-[#718096]">
                    <Calendar size={16} weight="regular" className="flex-shrink-0" />
                    <span>{visitLoading ? "—" : visitDateText || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-[#718096]">
                    <Clock size={16} weight="regular" className="flex-shrink-0" />
                    <span>{visitLoading ? "—" : visitTimeText || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-[#718096]">
                    <MapPin size={16} weight="regular" className="flex-shrink-0" />
                    <span className="truncate">
                      {visitLoading ? "—" : visitLocationText || "—"}
                    </span>
                  </div>
                </div>

                {/* Map - Enhanced mobile height */}
                <div className="mt-4 w-full h-40 sm:h-48 md:h-56 lg:h-64 bg-gradient-to-br from-[#eef2f5] to-[#e5e9ed] rounded-xl overflow-hidden border border-[#E3E6F0] shadow-sm hover:shadow-md transition-shadow">
                  <img
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800"
                    alt="Map"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
              
              {/* Call and Chat Buttons */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <button className="bg-[var(--primary-base)] text-white py-2.5 sm:py-3 rounded-lg font-semibold text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2 hover:opacity-95 transition-opacity">
                  <Phone size={16} weight="regular" className="flex-shrink-0" />
                  <span className="hidden sm:inline">Call Now</span>
                  <span className="sm:hidden">Call</span>
                </button>
                <button 
                  onClick={() => router.push("/sales/lead-list/chat-now")}
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
                    onClick={() => {
                      console.log("Link clicked");
                    }}
                    className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                    title="Add link"
                  >
                    <LinkSimple size={14} weight="regular" className="text-[#718096] sm:w-4 sm:h-4 md:w-[16px] md:h-[16px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log("Camera clicked");
                    }}
                    className="p-1 rounded hover:bg-[#E3E6F0] hover:text-[var(--primary-base)] transition-colors cursor-pointer flex-shrink-0"
                    title="Add image"
                  >
                    <Camera size={14} weight="regular" className="text-[#718096] sm:w-4 sm:h-4 md:w-[16px] md:h-[16px]" />
                  </button>
                </div>
              </div>
              <button
                onClick={newRemark.trim() ? handleAddRemark : undefined}
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
          {/* Site Images - Enhanced mobile grid */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900">Site Images</h2>
              <button className="flex items-center gap-1.5 text-[var(--primary-base)] text-xs sm:text-sm md:text-base font-semibold hover:bg-[var(--surface-primary)] px-2 sm:px-3 py-1 rounded-lg transition-colors">
                <Plus size={14} weight="bold" className="flex-shrink-0" />
                <span>Add More</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {(visitSiteImages.length ? visitSiteImages : siteImages).map(
                (img, index) => (
                <div
                  key={index}
                  className="w-full h-28 sm:h-36 md:h-40 lg:h-44 bg-gray-200 rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-[var(--primary-base)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
                >
                  <img
                    src={img}
                    alt={`Site ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                )
              )}
            </div>
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

          {/* Summary Section */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">Summary</h2>
            <RemarksSection
              summary={summaryText}
              showInput={true}
              inputValue={newSummary}
              onInputChange={setNewSummary}
              onInputSubmit={handleAddSummary}
              inputPlaceholder="Add a new remark..."
            />
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
              <span>Reject</span>
            </button>
            <button className="flex-1 bg-white border border-[#718096] text-[#718096] py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:bg-[#F8F9FC] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]">
              <span>Revisit</span>
            </button>
            <button className="flex-1 bg-[var(--primary-base)] text-white py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:opacity-95 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]">
              <span>Approve</span>
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
              const query = leadId && row.backendId
                ? `?leadId=${encodeURIComponent(leadId)}&followUpId=${encodeURIComponent(row.backendId)}`
                : leadId
                  ? `?leadId=${encodeURIComponent(leadId)}`
                  : "";
              router.push(
                `/sales/lead-list/lead-detail/site-visit/overveiw/site-visit-detail/follow-up-detail${query}`
              );
            }}
            renderActions={(row) => (
              <button
                className="text-[var(--primary-base)] text-sm font-medium hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  const query = leadId && row.backendId
                    ? `?leadId=${encodeURIComponent(leadId)}&followUpId=${encodeURIComponent(row.backendId)}`
                    : leadId
                      ? `?leadId=${encodeURIComponent(leadId)}`
                      : "";
                  router.push(
                    `/sales/lead-list/lead-detail/site-visit/overveiw/site-visit-detail/follow-up-detail${query}`
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
    </div>
  );
}


