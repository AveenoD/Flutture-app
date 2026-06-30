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
import { apiGet, apiPost, apiFetch } from "../../../../../../../lib/apiClient";

interface VisitDetailResponse {
  success: boolean;
  message: string;
  data: {
    visit: {
      id: string;
      lead_id: string;
      visit_type: string;
      visit_date?: string | null;
      visit_time?: string | null;
      status: string;
      remarks?: string | null;
      location_city?: string | null;
      location_area?: string | null;
      location_coordinates?: string | null;
      site_visit_images?: string[] | null;
    };
    project?: {
      id: string;
      project_title: string;
    } | null;
  };
}

interface FollowUpData {
  id: number;
  fullName: string;
  avatar: string;
  date: string;
  time: string;
  status: "pending" | "completed" | "missed";
  followUpId?: string; // backend follow_up id, used for detail view
}

export default function SiteVisitDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"overview" | "followups">("overview");
  const [newRemark, setNewRemark] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [remarks, setRemarks] = useState<string[]>([]);

  const [visitHeader, setVisitHeader] = useState<{
    title: string;
    date: string;
    time: string;
    statusText: string;
    projectTitle?: string | null;
    location?: string;
    mapUrl?: string | null;
  } | null>(null);

  const followUpText = "Send a follow-up reminder 1 day before the scheduled call on Thursday, 11 AM.";

  // Normalize map URL from DB (can be plain domain without protocol)
  const getMapSrc = (raw?: string | null) => {
    const fallback =
      "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800";
    if (!raw) return fallback;
    let url = raw.trim();
    if (!url) return fallback;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    return url;
  };

  const handleReject = () => {
    const id = searchParams.get("leadId");
    router.push(
      id
        ? `/caller/lead-list/rejected-form?leadId=${encodeURIComponent(id)}`
        : "/caller/lead-list/rejected-form"
    );
  };

  const handleRevisit = () => {
    const leadId = searchParams.get("leadId");
    if (!leadId) {
      // eslint-disable-next-line no-console
      console.error("[SiteVisitDetail] Missing leadId in URL for revisit");
      return;
    }
    router.push(
      `/caller/lead-list/lead-detail/site-visit/overview?leadId=${encodeURIComponent(
        leadId
      )}`
    );
  };

  // Follow-ups data for this visit detail (table)
  const [followUpsData, setFollowUpsData] = useState<FollowUpData[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFollowUps, setSelectedFollowUps] = useState<number[]>([]);
  const [followUpPage, setFollowUpPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [siteImages, setSiteImages] = useState<string[]>([]);

  const [summaryText, setSummaryText] = useState<string>("");

  // Create follow-up modal state
  const [isCreateFollowUpOpen, setIsCreateFollowUpOpen] = useState(false);
  const [newFollowType, setNewFollowType] = useState<
    "call" | "whatsapp" | "visit" | "meeting" | "document"
  >("call");
  const [newFollowDate, setNewFollowDate] = useState("");
  const [newFollowRemark, setNewFollowRemark] = useState("");
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);

  // Property visit stage id (used when creating follow-ups)
  const [propertyStageId, setPropertyStageId] = useState<string | null>(null);

  // Complete follow-up (outcome) modal state
  const [isCompleteFollowUpOpen, setIsCompleteFollowUpOpen] = useState(false);
  const [followUpBeingCompleted, setFollowUpBeingCompleted] =
    useState<FollowUpData | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState<
    "interested" | "not_interested" | "follow_up" | "no_response"
  >("interested");
  const [completeRemark, setCompleteRemark] = useState("");
  const [completingFollowUp, setCompletingFollowUp] = useState(false);

  const summaryLines = useMemo(
    () =>
      summaryText
        ? summaryText
            .split(/\r?\n+/)
            .map((r) => r.trim())
            .filter(Boolean)
        : [],
    [summaryText]
  );

  // Recent calls data
  const [recentCall, setRecentCall] = useState<{
    timestamp: string;
    summary: string;
    status: "answered" | "missed" | "pending";
    statusText: string;
    duration?: string;
  } | null>(null);

  // Recent chats data
  const [recentChat, setRecentChat] = useState<{
    timestamp: string;
    summary: string;
    status: "awaiting" | "pending";
    statusText: string;
    messageCount?: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leadId = searchParams.get("leadId");
  const visitId = searchParams.get("visitId");

  useEffect(() => {
    if (!leadId || !visitId) return;

    const fetchVisit = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await apiGet<VisitDetailResponse>(
          `/api/v1/leads/${leadId}/visits/${visitId}`
        );
        const visit = res.data.visit;
        const project = res.data.project;

        const locationParts = [
          visit.location_city,
          visit.location_area,
        ].filter(Boolean) as string[];

        setVisitHeader({
          title: visit.visit_type === "first_visit" ? "First Visit" : "Revisit",
          date: visit.visit_date || "",
          time: visit.visit_time || "",
          statusText: visit.status,
          projectTitle: project?.project_title ?? null,
          location: locationParts.join(", "),
          mapUrl: visit.location_coordinates ?? null,
        });

        // Visit-level remarks -> remarks list + summary
        const visitRemarks = visit.remarks || "";
        if (visitRemarks) {
          const list = visitRemarks
            .split(/\n+/)
            .map((r) => r.trim())
            .filter(Boolean);
          setRemarks(list);
          setSummaryText(visitRemarks);
        } else {
          setRemarks([]);
          setSummaryText("");
        }

        // Site images
        setSiteImages(visit.site_visit_images || []);
      } catch (err) {
        console.error("[SiteVisitDetail] Failed to load visit details", err);
        setError("Failed to load visit details.");
      } finally {
        setLoading(false);
      }
    };

    fetchVisit();
  }, [leadId, visitId]);

  // Load property_visit stage id (for creating follow-ups)
  useEffect(() => {
    if (!leadId) return;

    const fetchStage = async () => {
      try {
        const res = await apiGet<{
          data?: {
            stage?: { id?: string };
          };
        }>(`/api/v1/leads/${leadId}/stages/by-type/property_visit`);

        setPropertyStageId(res.data?.stage?.id ?? null);
      } catch (err) {
        console.error("[SiteVisitDetail] Failed to load property_visit stage", err);
        setPropertyStageId(null);
      }
    };

    fetchStage();
  }, [leadId]);

  // Load recent calls/chats for property_visit stage (same as overview page)
  useEffect(() => {
    if (!leadId) return;

    const fetchStageActivity = async () => {
      try {
        const res = await apiGet<{
          data?: {
            follow_ups?: {
              id: string;
              lead_stage_id: string;
              followup_type: string;
              followup_date: string;
              remark?: string | null;
              status: string;
              created_at: string;
            }[];
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
          };
        }>(`/api/v1/leads/${leadId}/stages/by-type/property_visit`);

        const payload = res.data || {};

        // Map backend follow_ups -> table rows
        const backendFollowUps = payload.follow_ups || [];
        if (Array.isArray(backendFollowUps)) {
          const mapped: FollowUpData[] = backendFollowUps.map((f, index) => {
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
              fullName: f.remark || "Follow-up",
              avatar: "/Avatar_images.png",
              date: dateStr,
              time: timeStr,
              status,
              followUpId: f.id,
            };
          });

          setFollowUpsData(mapped);
        } else {
          setFollowUpsData([]);
        }

        const calls = payload.recent_calls || [];
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

          const callStatus = (c.call_status || "answered").toLowerCase();
          let status: "answered" | "missed" | "pending" = "answered";
          let statusText = "Answered";
          if (callStatus === "missed") {
            status = "missed";
            statusText = "Missed";
          } else if (callStatus === "failed") {
            status = "pending";
            statusText = "Failed";
          }

          setRecentCall({
            timestamp,
            summary: c.call_outcome || "Recent call activity for this visit.",
            status,
            statusText,
            duration,
          });
        } else {
          setRecentCall(null);
        }

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
              "Recent WhatsApp conversation for this visit stage.",
            status: "pending",
            statusText: "Recent Chat",
            messageCount,
          });
        } else {
          setRecentChat(null);
        }
      } catch (err) {
        console.error("[SiteVisitDetail] Failed to load stage activity", err);
      }
    };

    fetchStageActivity();
  }, [leadId]);

  const handleAddRemark = async () => {
    const trimmed = newRemark.trim();
    if (!trimmed) return;
    if (!leadId || !visitId) {
      setRemarks((prev) => [...prev, trimmed]);
      setNewRemark("");
      return;
    }

    // Join existing remarks + new remark into single multi-line string
    const base = remarks.join("\n");
    const nextRemarksText = base ? `${base}\n${trimmed}` : trimmed;

    try {
      await apiFetch(`/api/v1/leads/${leadId}/visits/${visitId}`, {
        method: "PATCH",
        body: JSON.stringify({ remarks: nextRemarksText }),
      });
      setRemarks((prev) => [...prev, trimmed]);
      setSummaryText(nextRemarksText);
      setNewRemark("");
    } catch (err) {
      console.error("[SiteVisitDetail] Failed to append remark", err);
    }
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

  const handleAddSummary = async () => {
    const trimmed = newSummary.trim();
    if (!trimmed) return;
    if (!leadId || !visitId) {
      const base = summaryText || "";
      const nextText = base ? `${base}\n${trimmed}` : trimmed;
      setSummaryText(nextText);
      setNewSummary("");
      return;
    }

    try {
      const base = summaryText || "";
      const nextText = base ? `${base}\n${trimmed}` : trimmed;

      await apiFetch(`/api/v1/leads/${leadId}/visits/${visitId}`, {
        method: "PATCH",
        body: JSON.stringify({ remarks: nextText }),
      });
      setSummaryText(nextText);
      setNewSummary("");
    } catch (err) {
      console.error("[SiteVisitDetail] Failed to update summary/remarks", err);
    }
  };

  const handleOpenCreateFollowUp = () => {
    setNewFollowType("call");
    setNewFollowDate("");
    setNewFollowRemark("");
    setIsCreateFollowUpOpen(true);
  };

  const handleCreateFollowUp = async () => {
    if (!leadId || !propertyStageId || !newFollowDate || !newFollowRemark.trim()) {
      console.error("[SiteVisitDetail] Missing data for create follow-up", {
        leadId,
        propertyStageId,
        newFollowDate,
        newFollowRemark,
      });
      return;
    }

    try {
      setCreatingFollowUp(true);
      const followupDate = new Date(newFollowDate);
      const isoDate = followupDate.toISOString();

      const res = (await apiPost(
        `/api/v1/leads/${leadId}/follow-ups`,
        {
          lead_stage_id: propertyStageId,
          followup_type: newFollowType,
          followup_date: isoDate,
          remark: newFollowRemark.trim(),
        }
      )) as any;

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

      setFollowUpsData((prev) => [
        ...prev,
        {
          id: prev.length > 0 ? Math.max(...prev.map((x) => x.id)) + 1 : 1,
          fullName: f.remark || "Follow-up",
          avatar: "/Avatar_images.png",
          date: dateStr,
          time: timeStr,
          status,
          followUpId: f.id,
        },
      ]);

      setIsCreateFollowUpOpen(false);
      setNewFollowRemark("");
      setNewFollowDate("");
      setNewFollowType("call");
    } catch (err) {
      console.error("[SiteVisitDetail] Failed to create follow-up", err);
    } finally {
      setCreatingFollowUp(false);
    }
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

  const handleOpenCompleteFollowUp = (row: FollowUpData) => {
    setFollowUpBeingCompleted(row);
    setCompleteOutcome("interested");
    setCompleteRemark("");
    setIsCompleteFollowUpOpen(true);
  };

  const handleCompleteFollowUp = async () => {
    if (!leadId || !followUpBeingCompleted || !followUpBeingCompleted.followUpId) {
      console.error("[SiteVisitDetail] Missing data for complete follow-up", {
        leadId,
        followUpBeingCompleted,
      });
      return;
    }

    try {
      setCompletingFollowUp(true);
      await apiFetch(
        `/api/v1/leads/${leadId}/follow-ups/${followUpBeingCompleted.followUpId}/complete`,
        {
          method: "PATCH",
          body: JSON.stringify({
            outcome: completeOutcome,
            remark: completeRemark.trim() || undefined,
          }),
        }
      );

      setFollowUpsData((prev) =>
        prev.map((item) =>
          item.id === followUpBeingCompleted.id ? { ...item, status: "completed" } : item
        )
      );

      setIsCompleteFollowUpOpen(false);
      setFollowUpBeingCompleted(null);
      setCompleteRemark("");
    } catch (err) {
      console.error("[SiteVisitDetail] Failed to complete follow-up", err);
    } finally {
      setCompletingFollowUp(false);
    }
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
          pending: {
            dotColor: "bg-[#F97316]",
            bgColor: "bg-[#FFF4ED]",
            textColor: "text-[#F97316]",
            label: "Pending",
          },
          completed: {
            dotColor: "bg-[#10B981]",
            bgColor: "bg-[#ECFDF5]",
            textColor: "text-[#10B981]",
            label: "Completed",
          },
          missed: {
            dotColor: "bg-[#EF4444]",
            bgColor: "bg-[#FEF2F2]",
            textColor: "text-[#EF4444]",
            label: "Missed",
          },
        };
        const config = statusConfig[row.status];
        return (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
            >
              {config.label}
            </span>
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
          disabled={row.status !== "pending"}
          onClick={(e) => {
            e.stopPropagation();
            if (row.status === "pending") {
              handleOpenCompleteFollowUp(row);
            }
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            row.status === "pending"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 xl:gap-8">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-5 lg:space-y-6">
          {/* Visit Card Section - Enhanced mobile */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">visit card</h2>
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute top-0 right-0 bg-gradient-to-r from-[var(--surface-warning)] to-[#ffe8cc] text-[var(--warning)] px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold border border-[var(--warning)]/20 shadow-sm">
                  {visitHeader?.statusText
                    ? visitHeader.statusText.charAt(0).toUpperCase() +
                      visitHeader.statusText.slice(1).replace(/_/g, " ")
                    : "Schedule"}
                </span>
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 text-slate-900 pr-20 sm:pr-24">
                  {visitHeader?.projectTitle || "—"}
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-[#718096]">
                    <Calendar size={16} weight="regular" className="flex-shrink-0" />
                    <span>
                      {visitHeader?.date
                        ? new Date(visitHeader.date).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-[#718096]">
                    <Clock size={16} weight="regular" className="flex-shrink-0" />
                    <span>{visitHeader?.time || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base text-[#718096]">
                    <MapPin size={16} weight="regular" className="flex-shrink-0" />
                    <span className="truncate">
                      {visitHeader?.location || "—"}
                    </span>
                  </div>
                </div>

                {/* Map - render maps URL inside iframe so Google Maps page loads correctly */}
                <div className="mt-4 w-full h-40 sm:h-48 md:h-56 lg:h-64 rounded-xl overflow-hidden border border-[#E3E6F0] shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-[#eef2f5] to-[#e5e9ed]">
                  <iframe
                    src={getMapSrc(visitHeader?.mapUrl)}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
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
              {siteImages.map((img, index) => (
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
              ))}
            </div>
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
              <p className="text-sm text-slate-500">No recent calls found.</p>
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
                onClick={() => router.push("/sales/lead-list/chat-now")}
                onForward={() => {
                  console.log("Viewing chat details");
                }}
                showBorder={false}
              />
            ) : (
              <p className="text-sm text-slate-500">No recent chats found.</p>
            )}
          </section>

          {/* Summary Section */}
          <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 text-slate-900">Summary</h2>
            <RemarksSection
              remarks={summaryLines}
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
            <button
              onClick={handleRevisit}
              className="flex-1 bg-white border border-[#718096] text-[#718096] py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 hover:bg-[#F8F9FC] shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span>Revisit</span>
            </button>
            <button
              disabled={true}
              className="flex-1 bg-[var(--primary-base)]/60 text-white py-3 sm:py-3.5 md:py-4 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-all flex items-center justify-center gap-2 shadow-lg cursor-not-allowed"
            >
              <span>Approve</span>
            </button>
          </div>
        </div>
        </>
      ) : (
        <div className="mt-4">
          {/* Follow Ups header + Create button */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Follow Ups
            </h2>
            <button
              type="button"
              onClick={handleOpenCreateFollowUp}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-base)] px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
              <Plus size={14} weight="bold" />
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
              if (!leadId || !row.followUpId) return;
              router.push(
                `/caller/lead-list/lead-detail/site-visit/overview/site-visit-detail/follow-up-detail?leadId=${leadId}&followUpId=${row.followUpId}`
              );
            }}
            renderActions={(row) => (
              <button
                className="text-[var(--primary-base)] text-sm font-medium hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(
                    row.followUpId && leadId
                      ? `/caller/lead-list/lead-detail/site-visit/overview/site-visit-detail/follow-up-detail?leadId=${leadId}&followUpId=${row.followUpId}`
                      : "/caller/lead-list/lead-detail/site-visit/overview/site-visit-detail"
                  );
                }}
              >
                View Detail
              </button>
            )}
          />

          {/* Create Follow-up Modal */}
          {isCreateFollowUpOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 sm:px-4">
              <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">
                <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-slate-100">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                    Create Follow-up
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500">
                    Schedule a follow-up for this property visit stage.
                  </p>
                </div>

                <div className="px-5 sm:px-6 py-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Type
                    </label>
                    <select
                      value={newFollowType}
                      onChange={(e) =>
                        setNewFollowType(e.target.value as typeof newFollowType)
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    >
                      <option value="call">Call</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="visit">Visit</option>
                      <option value="meeting">Meeting</option>
                      <option value="document">Document</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newFollowDate}
                      onChange={(e) => setNewFollowDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-slate-700">
                      Remark
                    </label>
                    <textarea
                      rows={3}
                      value={newFollowRemark}
                      onChange={(e) => setNewFollowRemark(e.target.value)}
                      placeholder="Add follow-up details..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                    />
                  </div>
                </div>

                <div className="px-5 sm:px-6 py-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (creatingFollowUp) return;
                      setIsCreateFollowUpOpen(false);
                    }}
                    className="px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateFollowUp}
                    disabled={
                      creatingFollowUp ||
                      !leadId ||
                      !propertyStageId ||
                      !newFollowDate ||
                      !newFollowRemark.trim()
                    }
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold text-white transition-colors ${
                      creatingFollowUp ||
                      !leadId ||
                      !propertyStageId ||
                      !newFollowDate ||
                      !newFollowRemark.trim()
                        ? "bg-[var(--primary-base)]/60 cursor-not-allowed"
                        : "bg-[var(--primary-base)] hover:bg-[var(--primary-hover)]"
                    }`}
                  >
                    {creatingFollowUp ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Complete Follow-up Modal */}
      {isCompleteFollowUpOpen && followUpBeingCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 sm:px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 sm:px-6 pt-4 pb-3 border-b border-slate-100">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                Complete Follow-up
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCompleteFollowUpOpen(false);
                  setFollowUpBeingCompleted(null);
                }}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="px-5 sm:px-6 py-4 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600">
                Mark follow-up{" "}
                <span className="font-semibold">
                  {followUpBeingCompleted.fullName || "Follow-up"}
                </span>{" "}
                as completed and choose an outcome.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium text-slate-700">
                  Outcome
                </label>
                <select
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                >
                  <option value="interested">Interested</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="no_response">No Response</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium text-slate-700">
                  Remark (optional)
                </label>
                <textarea
                  rows={3}
                  value={completeRemark}
                  onChange={(e) => setCompleteRemark(e.target.value)}
                  placeholder="Add a remark for this follow-up outcome..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:border-[var(--primary-base)]"
                />
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsCompleteFollowUpOpen(false);
                  setFollowUpBeingCompleted(null);
                }}
                className="px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100"
                disabled={completingFollowUp}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteFollowUp}
                className="px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
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