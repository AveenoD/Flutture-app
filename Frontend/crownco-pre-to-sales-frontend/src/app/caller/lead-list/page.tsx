"use client";

import React, { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
  Grid3x3,
  Table as TableIcon,
  Eye,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  MoreVertical,
  X,
  CheckCircle2,
  ArrowUpDown,
  ChevronDown,
} from "lucide-react";
import { KPICard } from "@/components/ui/cards/kpi";
import { DataTable } from "@/components/ui/tabel/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Badge, StatusBadge, SourceBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/Button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useLeadStore, Lead, LeadStage } from "@/contexts/LeadContext";

function LeadListPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { leads: allLeads } = useLeadStore();
  // Tabs (keep existing All/Rejected, add doc tabs Qualified/Sources/Bulk)
  const [activeTab, setActiveTab] = useState<"all" | "rejected" | "qualified" | "sources" | "bulk">("all");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Lead; direction: "asc" | "desc" } | null>(null);
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPositions, setMenuPositions] = useState<Record<string, { top: number; right: number }>>({});

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [newLeadsOnly, setNewLeadsOnly] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<"" | "today" | "week" | "month">("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [budgetFilter, setBudgetFilter] = useState<string>("");

  // allLeads now comes from LeadContext (central mock + localStorage)

  // Filter Options
  const statusOptions = useMemo(
    () => [
      { value: "veryhot", label: "Very Hot", count: allLeads.filter((l) => l.status === "veryhot").length },
      { value: "hot", label: "Hot", count: allLeads.filter((l) => l.status === "hot").length },
      { value: "warm", label: "Warm", count: allLeads.filter((l) => l.status === "warm").length },
      { value: "cold", label: "Cold", count: allLeads.filter((l) => l.status === "cold").length },
      { value: "rejected", label: "Rejected", count: allLeads.filter((l) => l.status === "rejected").length },
    ],
    [allLeads]
  );

  const sourceOptions = useMemo(
    () => [
      { value: "Website", label: "Website", count: allLeads.filter((l) => l.source === "Website").length },
      { value: "Walking", label: "Walking", count: allLeads.filter((l) => l.source === "Walking").length },
      {
        value: "Assigned By Maaz",
        label: "Assigned By Maaz",
        count: allLeads.filter((l) => l.source === "Assigned By Maaz").length,
      },
      {
        value: "Referral",
        label: "Referral",
        count: allLeads.filter((l) => l.source === "Referral").length,
      },
    ],
    [allLeads]
  );

  const stageOptions = useMemo(
    () => [
      {
        value: "qualification",
        label: "Qualification",
        count: allLeads.filter((l) => l.stage === "qualification").length,
      },
      { value: "communication", label: "Communication", count: allLeads.filter((l) => l.stage === "communication").length },
      {
        value: "site-visit",
        label: "Site Visit",
        count: allLeads.filter((l) => l.stage === "site-visit").length,
      },
      {
        value: "negotiation",
        label: "Negotiation",
        count: allLeads.filter((l) => l.stage === "negotiation").length,
      },
      { value: "booking", label: "Booking", count: allLeads.filter((l) => l.stage === "booking").length },
    ],
    [allLeads]
  );

  const projectOptions = useMemo(
    () => [
      {
        value: "Maaz Palace",
        label: "Maaz Palace",
        count: allLeads.filter((l) => l.projectInterest?.includes("Maaz Palace")).length,
      },
      {
        value: "GreenVille Orchid",
        label: "GreenVille Orchid",
        count: allLeads.filter((l) => l.projectInterest?.includes("GreenVille Orchid")).length,
      },
      {
        value: "Zara Palace",
        label: "Zara Palace",
        count: allLeads.filter((l) => l.projectInterest?.includes("Zara Palace")).length,
      },
    ],
    [allLeads]
  );

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    let leads = [...allLeads];

    // Tabs (Doc + Existing)
    // - all: non-rejected (default working list)
    // - rejected: only rejected
    // - qualified: non-rejected + moved beyond qualification stage
    // - sources: non-rejected (source exploration happens in UI)
    // - bulk: non-rejected (bulk ops view)
    if (activeTab === "rejected") {
      leads = leads.filter((l) => l.status === "rejected");
    } else {
      leads = leads.filter((l) => l.status !== "rejected");
    }

    if (activeTab === "qualified") {
      leads = leads.filter((l) => l.stage !== "qualification");
    }

    // New Leads only (last 7 days)
    if (newLeadsOnly) {
      const now = Date.now();
      leads = leads.filter((l) => {
        const created = l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt);
        return now - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
      });
    }

    // Date Range filter
    if (dateRangeFilter) {
      const now = new Date();
      const start =
        dateRangeFilter === "today"
          ? new Date(new Date().setHours(0, 0, 0, 0))
          : dateRangeFilter === "week"
            ? new Date(new Date().setDate(now.getDate() - 7))
            : new Date(new Date().setMonth(now.getMonth() - 1));

      leads = leads.filter((l) => {
        const created = l.createdAt instanceof Date ? l.createdAt : new Date(l.createdAt);
        return created >= start && created <= new Date();
      });
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.phone.includes(query) ||
          l.email?.toLowerCase().includes(query)
      );
    }

    // Status Filter
    if (statusFilter) {
      leads = leads.filter((l) => l.status === statusFilter);
    }

    // Source Filter
    if (sourceFilter) {
      leads = leads.filter((l) => l.source === sourceFilter);
    }

    // Project Filter
    if (projectFilter) {
      leads = leads.filter((l) => l.projectInterest?.some((p) => p === projectFilter));
    }

    // Budget filter (simple buckets)
    if (budgetFilter) {
      const [minL, maxL] = budgetFilter.split("-").map((x) => Number(x));
      leads = leads.filter((l) => {
        const min = l.budgetMin ? l.budgetMin / 100000 : 0; // to Lakh
        if (!Number.isFinite(min)) return false;
        if (Number.isFinite(minL) && min < minL) return false;
        if (Number.isFinite(maxL) && min > maxL) return false;
        return true;
      });
    }

    // Sorting
    if (sortConfig) {
      leads = [...leads].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Handle undefined/null values
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        if (aValue === bValue) return 0;

        const comparison = aValue > bValue ? 1 : -1;
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return leads;
  }, [
    allLeads,
    activeTab,
    searchQuery,
    statusFilter,
    sourceFilter,
    projectFilter,
    budgetFilter,
    newLeadsOnly,
    dateRangeFilter,
    sortConfig,
  ]);

  // KPIs aligned with Sales/Pre-Sales emoji-based icons
  const kpiData = useMemo(
    () => [
      {
        icon: "👤",
        value: filteredLeads.length.toString(),
        label: "Total Leads",
        trend: "+12.5%",
        trendUp: true,
        color: "var(--primary-base)",
        onClick: () => {
          setSearchQuery("");
          setNewLeadsOnly(false);
          setDateRangeFilter("");
          setStatusFilter("");
          setSourceFilter("");
          setProjectFilter("");
          setBudgetFilter("");
          toast.info("Showing all leads");
        },
        isClickable: true,
      },
      {
        icon: "🔥",
        value: filteredLeads.filter((l) => l.status === "veryhot" || l.status === "hot").length.toString(),
        label: "Hot Leads",
        trend: "+8.2%",
        trendUp: true,
        color: "var(--error)",
        onClick: () => {
          setStatusFilter("veryhot");
          toast.success("Filtered by Hot Leads");
        },
        isClickable: true,
      },
      {
        icon: "📞",
        value: filteredLeads.filter(
          (l) => l.nextFollowUp && l.nextFollowUp < new Date()
        ).length.toString(),
        label: "Missed Follow-ups",
        trend: "-5.1%",
        trendUp: false,
        color: "var(--warning)",
        onClick: () => {
          toast.warning("Missed follow-ups filter is not configured in this view yet");
          toast.warning("Showing missed follow-ups");
        },
        isClickable: true,
      },
      {
        icon: "📅",
        value: filteredLeads.filter(
          (l) => l.nextFollowUp && l.nextFollowUp > new Date() && l.nextFollowUp <= new Date(Date.now() + 1000 * 60 * 60 * 24)
        ).length.toString(),
        label: "Today's Follow-ups",
        trend: "+15.3%",
        trendUp: true,
        color: "var(--success)",
        onClick: () => {
          toast.info("Today's follow-ups filter is not configured in this view yet");
          toast.info("Showing today's follow-ups");
        },
        isClickable: true,
      },
    ],
    [filteredLeads]
  );

  // Get Follow-up Urgency
  const getFollowUpUrgency = (nextFollowUp?: Date) => {
    if (!nextFollowUp) return null;
    const now = new Date();
    const diff = nextFollowUp.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 0) return { label: "Overdue", color: "text-red-600 bg-red-50 border-red-200" };
    if (hours < 24) return { label: "Today", color: "text-orange-600 bg-orange-50 border-orange-200" };
    if (hours < 48) return { label: "Tomorrow", color: "text-yellow-600 bg-yellow-50 border-yellow-200" };
    return { label: "Upcoming", color: "text-green-600 bg-green-50 border-green-200" };
  };

  // Highlight search query in text
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Render Lead Card (Mobile) - Improved UI/UX
  const renderLeadCard = (lead: Lead, index: number, isSelected?: boolean, onSelectChange?: (checked: boolean) => void) => {
    const stageLabels: Record<LeadStage, string> = {
      qualification: "Qualification",
      communication: "Communication",
      "site-visit": "Site Visit",
      negotiation: "Negotiation",
      booking: "Booking",
    };

    const getLeadDetailPath = (stage: LeadStage, id: string) => {
      let base = "/caller/lead-list/lead-detail/qualification/overview";
      if (stage === "communication")
        base = "/caller/lead-list/lead-detail/communication/overview";
      else if (stage === "site-visit")
        base = "/caller/lead-list/lead-detail/site-visit/overview";
      else if (stage === "negotiation")
        base = "/caller/lead-list/lead-detail/negotiation/overview";
      else if (stage === "booking")
        base = "/caller/lead-list/lead-detail/booking/overview";
      return `${base}?leadId=${id}`;
    };

    const followUpUrgency = getFollowUpUrgency(lead.nextFollowUp);
    const maxProjects = 2;
    const isMenuOpen = openMenuId === lead.id;

    // Get initials for avatar
    const getInitials = (name: string) => {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    };

    // Priority border color with gradient
    const priorityBorderColor = 
      lead.priority === "high" ? "border-l-4 border-l-red-500" :
      lead.priority === "medium" ? "border-l-4 border-l-orange-500" :
      lead.priority === "low" ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-slate-300";

    // Status-based card background tint
    const statusBgTint = 
      lead.status === "veryhot" ? "bg-gradient-to-r from-red-50/30 to-transparent" :
      lead.status === "hot" ? "bg-gradient-to-r from-orange-50/30 to-transparent" :
      lead.status === "warm" ? "bg-gradient-to-r from-yellow-50/30 to-transparent" :
      "bg-white";

    return (
      <div
        key={lead.id}
        className={`
          group relative w-full h-full flex flex-col rounded-2xl bg-white border-l-4 ${priorityBorderColor}
          shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer
          border-r border-t border-b border-slate-200/60 hover:border-slate-300
          ${isSelected ? "ring-2 ring-[var(--primary-base)] ring-offset-2 bg-[var(--primary-selected)]" : ""}
          transform hover:-translate-y-1 hover:scale-[1.01]
          ${statusBgTint}
          card-enter
        `}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => {
          // Card click should only select/deselect, not navigate
          if (onSelectChange) {
            onSelectChange(!isSelected);
          }
        }}
      >
        {/* Header Section - Improved */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            {/* Left: Avatar + Name + Badges */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Avatar Circle */}
              <div className={`
                flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                font-bold text-sm text-white shadow-md transition-transform duration-200 group-hover:scale-110
                ${lead.priority === "high" ? "bg-gradient-to-br from-red-500 to-red-600" :
                  lead.priority === "medium" ? "bg-gradient-to-br from-orange-500 to-orange-600" :
                  lead.priority === "low" ? "bg-gradient-to-br from-blue-500 to-blue-600" :
                  "bg-gradient-to-br from-slate-500 to-slate-600"}
              `}>
                {getInitials(lead.name)}
              </div>
              
              {/* Name and Badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[var(--primary-base)] transition-colors truncate">
                    {searchQuery ? highlightText(lead.name, searchQuery) : lead.name}
                  </h3>
                  {lead.priority && (
                    <span className={`
                      px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0
                      ${lead.priority === "high" ? "bg-red-100 text-red-700" :
                        lead.priority === "medium" ? "bg-orange-100 text-orange-700" :
                        "bg-blue-100 text-blue-700"}
                    `}>
                      {lead.priority.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <StatusBadge status={lead.status} />
                  <SourceBadge source={lead.source} />
                </div>
              </div>
            </div>
            
            {/* Right: Quick Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Quick Call Button - Always Visible */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${lead.phone.replace(/\s/g, "")}`;
                  toast.success(`Calling ${lead.name}`);
                }}
                className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all duration-200 hover:scale-110 shadow-sm active:scale-95"
                title="Call"
                aria-label={`Call ${lead.name}`}
              >
                <Phone className="w-4 h-4" />
              </button>

              {/* Quick Email Button */}
              {lead.email && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `mailto:${lead.email}`;
                    toast.success(`Opening email to ${lead.name}`);
                  }}
                  className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-200 hover:scale-110 shadow-sm active:scale-95"
                  title="Email"
                  aria-label={`Email ${lead.name}`}
                >
                  <Mail className="w-4 h-4" />
                </button>
              )}

              {/* Select Button */}
              {onSelectChange && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectChange(!isSelected);
                  }}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium
                    ${isSelected 
                      ? "bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] shadow-md" 
                      : "hover:bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300"}
                    active:scale-95
                  `}
                  title={isSelected ? "Deselect" : "Select"}
                >
                  <CheckCircle2 className={`w-4 h-4 ${isSelected ? "" : "opacity-50"}`} />
                  <span className="hidden sm:inline">Select</span>
                </button>
              )}
              
              {/* More Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(isMenuOpen ? null : lead.id);
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-all duration-200 text-slate-600 hover:text-slate-900 active:scale-95"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {isMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(null);
                      }}
                    />
                    <div className="absolute right-0 top-10 z-20 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 scale-in">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(getLeadDetailPath(lead.stage, lead.id));
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.info("Edit functionality coming soon");
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.error("Delete functionality coming soon");
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information - Improved Layout */}
          <div className="flex items-center gap-4 mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-sm text-slate-600 group/phone hover:text-[var(--primary-base)] transition-colors">
              <Phone className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover/phone:text-[var(--primary-base)]" />
              <a 
                href={`tel:${lead.phone.replace(/\s/g, "")}`}
                onClick={(e) => e.stopPropagation()}
                className="truncate font-medium hover:underline"
              >
                {searchQuery ? highlightText(lead.phone, searchQuery) : lead.phone}
              </a>
            </div>
            {lead.email && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600 group/email hover:text-[var(--primary-base)] transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover/email:text-[var(--primary-base)]" />
                <a 
                  href={`mailto:${lead.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate font-medium hover:underline"
                >
                  {searchQuery ? highlightText(lead.email, searchQuery) : lead.email}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Better Grid Layout with Consistent Spacing */}
        <div className="px-4 pb-3 flex-1 flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            {/* Left Column */}
            <div className="space-y-3">
              {/* Stage with Icon */}
              <div className="flex items-center gap-2 min-h-[3rem]">
                <div className="p-1.5 rounded-lg bg-slate-100 flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 font-medium">Stage</div>
                  <div className="text-sm font-semibold text-slate-900 truncate">{stageLabels[lead.stage]}</div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {/* Budget with Icon - Always show with placeholder if missing */}
              <div className="flex items-center gap-2 min-h-[3rem]">
                <div className="p-1.5 rounded-lg bg-green-100 flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500 font-medium">Budget</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {lead.budgetMin && lead.budgetMax ? (
                      `₹${(lead.budgetMin / 100000).toFixed(1)}L - ₹${(lead.budgetMax / 100000).toFixed(1)}L`
                    ) : (
                      <span className="text-slate-400">Not specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Interest - Always show section */}
          <div className="mt-auto pt-3 border-t border-slate-100 min-h-[3.5rem]">
            <div className="text-xs font-medium text-slate-500 mb-2">Interested Projects</div>
            <div className="flex items-center gap-2 flex-wrap min-h-[1.75rem]">
              {lead.projectInterest && lead.projectInterest.length > 0 ? (
                <>
                  {lead.projectInterest.slice(0, maxProjects).map((project, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors"
                    >
                      {project}
                    </span>
                  ))}
                  {lead.projectInterest.length > maxProjects && (
                    <span className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">
                      +{lead.projectInterest.length - maxProjects} more
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-slate-400 italic">No projects selected</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Improved with Better Visual Hierarchy - Always show */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-transparent rounded-b-2xl border-t border-slate-100 mt-auto">
          <div className="flex items-center justify-between gap-3 min-h-[2.5rem]">
            <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0 flex-1">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {lead.lastContact ? (
                  <>Last contact: {formatDistanceToNow(lead.lastContact, { addSuffix: true })}</>
                ) : (
                  <span className="text-slate-400 italic">No contact yet</span>
                )}
              </span>
            </div>
            {followUpUrgency ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.info("Schedule follow-up");
                }}
                className={`
                  flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium
                  transition-all duration-200 hover:scale-105 shadow-sm active:scale-95 flex-shrink-0
                  ${followUpUrgency.color}
                `}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{followUpUrgency.label}</span>
              </button>
            ) : (
              <div className="w-0 flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Lead Table Row (Desktop)
  const renderLeadRow = (lead: Lead, index: number, isSelected?: boolean, onSelectChange?: (checked: boolean) => void) => {
    const stageLabels: Record<LeadStage, string> = {
      qualification: "Qualification",
      communication: "Communication",
      "site-visit": "Site Visit",
      negotiation: "Negotiation",
      booking: "Booking",
    };

    const getLeadDetailPath = (stage: LeadStage, id: string) => {
      let base = "/caller/lead-list/lead-detail/qualification/overview";
      if (stage === "communication")
        base = "/caller/lead-list/lead-detail/communication/overview";
      else if (stage === "site-visit")
        base = "/caller/lead-list/lead-detail/site-visit/overview";
      else if (stage === "negotiation")
        base = "/caller/lead-list/lead-detail/negotiation/overview";
      else if (stage === "booking")
        base = "/caller/lead-list/lead-detail/booking/overview";
      return `${base}?leadId=${id}`;
    };

    const followUpUrgency = getFollowUpUrgency(lead.nextFollowUp);
    const isTableMenuOpen = openMenuId === `table-${lead.id}`;
    const menuPosition = menuPositions[lead.id];

    return (
      <tr
        key={lead.id}
        onClick={() => {
          // Table row click should only select/deselect, not navigate
          if (onSelectChange) {
            onSelectChange(!isSelected);
          }
        }}
        className={`
          border-b border-slate-100 hover:bg-slate-50/80 transition-colors cursor-pointer
          ${isSelected ? "bg-[var(--primary-selected)]" : ""}
        `}
      >
        <td className="px-3 sm:px-4 py-2 sm:py-2.5">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.checked) {
                setSelectedLeads([...selectedLeads, lead]);
              } else {
                setSelectedLeads(selectedLeads.filter((l) => l.id !== lead.id));
              }
            }}
            className="w-4 h-4 rounded border-slate-300 text-[var(--primary-base)] focus:ring-[var(--primary-base)]"
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td className="px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex items-center gap-1.5">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {searchQuery ? highlightText(lead.name, searchQuery) : lead.name}
              </div>
              <div className="text-xs text-slate-500">
                {searchQuery ? highlightText(lead.phone, searchQuery) : lead.phone}
              </div>
            </div>
            {lead.priority && (
              <span
                className={`
                  px-1.5 py-0.5 rounded text-xs font-bold
                  ${
                    lead.priority === "high"
                      ? "bg-red-100 text-red-700"
                      : lead.priority === "medium"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-blue-100 text-blue-700"
                  }
                `}
              >
                {lead.priority.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </td>
        <td className="px-3 sm:px-4 py-2 sm:py-2.5">
          <StatusBadge status={lead.status} />
        </td>
        <td className="px-3 sm:px-4 py-2 sm:py-2.5">
          <SourceBadge source={lead.source} />
        </td>
        <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-700">{stageLabels[lead.stage]}</td>
        <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-700">
          {lead.budgetMin && lead.budgetMax
            ? `₹${(lead.budgetMin / 100000).toFixed(1)}L - ₹${(lead.budgetMax / 100000).toFixed(1)}L`
            : "-"}
        </td>
        <td className="px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="space-y-0.5">
            {lead.lastContact && (
              <div className="text-xs text-slate-500">
                {formatDistanceToNow(lead.lastContact, { addSuffix: true })}
              </div>
            )}
            {followUpUrgency && (
              <div className={`text-xs px-1.5 py-0.5 rounded border ${followUpUrgency.color}`}>
                {followUpUrgency.label}
              </div>
            )}
          </div>
        </td>
        <td className="px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex items-center gap-1 relative">
            {/* More Actions Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!isTableMenuOpen) {
                  const button = e.currentTarget;
                  const rect = button.getBoundingClientRect();
                  const menuHeight = 250; // Approximate menu height
                  const menuWidth = 192; // w-48 = 12rem = 192px
                  const padding = 8; // Space from button
                  
                  // Calculate available space
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  const spaceRight = window.innerWidth - rect.right;
                  const spaceLeft = rect.left;
                  
                  // Determine vertical position (prefer below, but use above if not enough space)
                  let top: number;
                  if (spaceBelow >= menuHeight + padding) {
                    // Enough space below - show below button
                    top = rect.bottom + padding;
                  } else if (spaceAbove >= menuHeight + padding) {
                    // Not enough space below, but enough above - show above button
                    top = rect.top - menuHeight - padding;
                  } else {
                    // Not enough space either way - use available space
                    top = spaceBelow >= spaceAbove 
                      ? rect.bottom + padding 
                      : Math.max(8, rect.top - menuHeight - padding);
                  }
                  
                  // Determine horizontal position (prefer right, but adjust if needed)
                  let right: number;
                  if (spaceRight >= menuWidth) {
                    // Enough space on right - align to right
                    right = window.innerWidth - rect.right;
                  } else if (spaceLeft >= menuWidth) {
                    // Not enough space on right, but enough on left - align to left
                    right = window.innerWidth - rect.left - menuWidth;
                  } else {
                    // Not enough space on either side - use available space
                    right = Math.max(8, window.innerWidth - rect.right);
                  }
                  
                  setMenuPositions({
                    ...menuPositions,
                    [lead.id]: {
                      top,
                      right,
                    },
                  });
                }
                setOpenMenuId(isTableMenuOpen ? null : `table-${lead.id}`);
              }}
              className="hover:bg-slate-100"
              title="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            
            {/* More Actions Dropdown Menu */}
            {isTableMenuOpen && menuPosition && (
              <>
                <div 
                  className="fixed inset-0 z-[100]" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(null);
                    setMenuPositions({ ...menuPositions, [lead.id]: undefined as any });
                  }}
                />
                <div 
                  className="fixed z-[101] w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 scale-in min-w-[12rem] max-h-[calc(100vh-16px)] overflow-y-auto"
                  style={{
                    top: `${Math.max(8, Math.min(menuPosition.top, window.innerHeight - 200))}px`,
                    right: `${Math.max(8, menuPosition.right)}px`,
                  }}
                >
                  {/* Call Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `tel:${lead.phone.replace(/\s/g, "")}`;
                      toast.success(`Calling ${lead.name}`);
                      setOpenMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-600 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </button>
                  
                  {/* Email Button - if email exists */}
                  {lead.email && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `mailto:${lead.email}`;
                        toast.success(`Opening email to ${lead.name}`);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </button>
                  )}
                  
                  {/* View Details Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(getLeadDetailPath(lead.stage, lead.id));
                      setOpenMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                  
                  {/* Edit Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info("Edit functionality coming soon");
                      setOpenMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  
                  {/* Divider */}
                  <div className="border-t border-slate-100 my-1" />
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.error("Delete functionality coming soon");
                      setOpenMenuId(null);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const handleExportAll = () => toast.success(`Exporting ${filteredLeads.length} leads...`);
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Data refreshed");
    }, 800);
  };
  const handleDeleteSelected = () => {
    if (selectedLeads.length === 0) return;
    if (confirm(`Delete ${selectedLeads.length} leads?`)) {
      toast.success(`Deleted ${selectedLeads.length} leads`);
      setSelectedLeads([]);
    }
  };

  // Handle Sort
  const handleSort = (key: keyof Lead) => {
    const newDirection =
      sortConfig?.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction: newDirection });
    toast.info(`Sorted by ${key} (${newDirection})`);
  };

  // Sort Icon
  const SortIcon = ({ columnKey }: { columnKey: keyof Lead }) => {
    if (sortConfig?.key !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronDown className="w-3 h-3 text-[var(--primary-base)]" />
    ) : (
      <ChevronDown className="w-3 h-3 text-[var(--primary-base)] rotate-180" />
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10 space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Page Header */}
        <div className="mb-4 sm:mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight mb-1">
                Lead List
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Manage and track all your leads
              </p>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 mb-4 sm:mb-5">
              {(showAllKPIs ? kpiData : kpiData.slice(0, 4)).map((kpi, index) => (
                <div
                  key={index}
                  className="fade-in-up"
                  style={{ animationDelay: `${50 + index * 50}ms` }}
                >
                  <KPICard {...kpi} />
                </div>
              ))}
            </div>
            {kpiData.length > 4 && (
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowAllKPIs(!showAllKPIs)}
                  variant="outline"
                  className="bg-white shadow-sm hover:shadow-md"
                >
                  <span>{showAllKPIs ? "Show Less" : `Show ${kpiData.length - 3} More`}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAllKPIs ? "rotate-180" : ""}`} />
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Filters row (match presales UI) */}
        <section className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newLeadsOnly}
                onChange={(e) => setNewLeadsOnly(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[var(--primary-base)] focus:ring-[var(--primary-base)]"
              />
              New Leads
            </label>

            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
            >
              <option value="">Date Range</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
            >
              <option value="">Status</option>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
            >
              <option value="">Sources</option>
              {sourceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={budgetFilter}
              onChange={(e) => setBudgetFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
            >
              <option value="">By Budget</option>
              <option value="20-30">₹20L - ₹30L</option>
              <option value="30-40">₹30L - ₹40L</option>
              <option value="40-50">₹40L - ₹50L</option>
              <option value="50-60">₹50L - ₹60L</option>
              <option value="60-999">₹60L+</option>
            </select>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700"
            >
              <option value="">By Project</option>
              {projectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setNewLeadsOnly(false);
                setDateRangeFilter("");
                setStatusFilter("");
                setSourceFilter("");
                setBudgetFilter("");
                setProjectFilter("");
                setSearchQuery("");
                setSelectedLeads([]);
              }}
              className="ml-auto text-sm font-medium text-[var(--primary-base)] hover:underline"
            >
              Clear All
            </button>
          </div>
        </section>

        {/* Showing count bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 text-sm text-slate-700">
          Showing {filteredLeads.length} Leads
        </div>

        {/* Tabs (Existing + Doc Tabs) */}
        <div className="flex flex-wrap items-center gap-6 border-b border-slate-200 px-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`py-3 text-sm font-medium ${
              activeTab === "all" ? "text-[var(--primary-base)] border-b-2 border-[var(--primary-base)]" : "text-slate-600"
            }`}
          >
            All Leads
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("qualified")}
            className={`py-3 text-sm font-medium ${
              activeTab === "qualified"
                ? "text-[var(--primary-base)] border-b-2 border-[var(--primary-base)]"
                : "text-slate-600"
            }`}
            title="Leads that have moved beyond Qualification stage"
          >
            Qualified
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            className={`py-3 text-sm font-medium ${
              activeTab === "bulk"
                ? "text-[var(--primary-base)] border-b-2 border-[var(--primary-base)]"
                : "text-slate-600"
            }`}
            title="Bulk operations"
          >
            Bulk Data
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sources")}
            className={`py-3 text-sm font-medium ${
              activeTab === "sources"
                ? "text-[var(--primary-base)] border-b-2 border-[var(--primary-base)]"
                : "text-slate-600"
            }`}
            title="Explore leads by source"
          >
            Sources
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rejected")}
            className={`py-3 text-sm font-medium ${
              activeTab === "rejected"
                ? "text-[var(--primary-base)] border-b-2 border-[var(--primary-base)]"
                : "text-slate-600"
            }`}
          >
            Rejected Leads
          </button>
        </div>

        {/* Sources Tab: quick source chips */}
        {activeTab === "sources" && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSourceFilter("")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  sourceFilter === "" ? "bg-[var(--primary-selected)] border-[var(--primary-base)] text-[var(--primary-base)]" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Sources
              </button>
              {sourceOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setSourceFilter(o.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    sourceFilter === o.value
                      ? "bg-[var(--primary-selected)] border-[var(--primary-base)] text-[var(--primary-base)]"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                  title={`${o.label}: ${o.count}`}
                >
                  {o.label} <span className="text-slate-400">({o.count})</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Bulk Tab: helper bar */}
        {activeTab === "bulk" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 text-sm text-slate-700 flex flex-wrap items-center gap-3">
            <span className="font-medium">Bulk Mode:</span>
            <span className="text-slate-600">Select leads from table/cards and use Export/Delete.</span>
          </div>
        )}

        {/* Table */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header controls */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === "table" ? "card" : "table"))}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <span className="inline-flex items-center gap-2">
                  {viewMode === "table" ? (
                    <>
                      <Grid3x3 className="w-4 h-4" />
                      Card
                    </>
                  ) : (
                    <>
                      <TableIcon className="w-4 h-4" />
                      Table
                    </>
                  )}
                </span>
              </button>

              <div className="relative w-full sm:w-[360px]">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leads..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]/30"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Users className="w-4 h-4" />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={handleExportAll}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedLeads.length === 0}
                className="h-10 px-4 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-slate-100/60 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-6">
              <EmptyState
                variant="search"
                title="No leads found"
                description="Try adjusting your filters to see more results."
              />
            </div>
          ) : viewMode === "card" ? (
            <div className="p-4">
              <DataTable
                data={filteredLeads}
                renderRow={renderLeadCard}
                viewMode="card"
                cardGridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4"
                selectable={true}
                selectedItems={selectedLeads}
                onSelectionChange={setSelectedLeads}
                pagination={true}
                itemsPerPage={12}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedLeads([...filteredLeads]);
                          else setSelectedLeads([]);
                        }}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-2">
                        Name & Phone <SortIcon columnKey="name" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-2">
                        Status <SortIcon columnKey="status" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Sources</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("stage")}
                    >
                      <div className="flex items-center gap-2">
                        Stage <SortIcon columnKey="stage" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Budget</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase cursor-pointer hover:bg-slate-100"
                      onClick={() => handleSort("lastContact")}
                    >
                      <div className="flex items-center gap-2">
                        Last Contact <SortIcon columnKey="lastContact" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, index) =>
                    renderLeadRow(lead, index, selectedLeads.some((l) => l.id === lead.id))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function LeadListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-base)] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <LeadListPageContent />
    </Suspense>
  );
}


