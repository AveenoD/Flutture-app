"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Download, GridFour, List, ArrowsDownUp, Copy, Envelope } from "phosphor-react";
import { CreateQuotationDrawer } from "../../components/ui/createQuotationDrawer";
import { QuotationCard, QuotationData } from "../../components/ui/card/quotationCard";
import { KPICard } from "../../components/ui/kpi";
import { Filter, FilterValues } from "../../components/ui/filter";
import { EmptyState } from "../../components/ui/EmptyState";
import { useDebouncedCallback } from "use-debounce";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  fetchQuotationStats,
  formatGrowthPercent,
  formatINRValueCrores,
  type QuotationStatsApi,
} from "../../lib/quotationStatsApi";
import {
  fetchQuotationsList,
  mapListItemToQuotationData,
  type QuotationTabCountsApi,
} from "../../lib/quotationListApi";
import { toast } from "sonner";

// Sample projects data (same as project inventory)
const availableProjects = [
  {
    name: "Maaz Palace",
    image: "/Property-3 1.png",
    location: "Kurla - City Center",
    configuration: "2BHK - 1200 Sq meter",
    priceRange: "Base Price Range - ₹3Cr - ₹3.5Cr",
    category: "Residential",
    status: "Ongoing",
    features: ["Sea Facing", "Smart Homes", "Play Ground"],
  },
  {
    name: "Crown Height",
    image: "/property-1 1.png",
    location: "Andheri - West",
    configuration: "3BHK - 1500 Sq meter",
    priceRange: "Base Price Range - ₹4Cr - ₹4.5Cr",
    category: "Residential",
    status: "Ongoing",
    features: ["Sea Facing", "Smart Homes", "Gym"],
  },
  {
    name: "GreenVille Orchid",
    image: "/property-2 1.png",
    location: "Powai - Central",
    configuration: "4BHK - 2000 Sq meter",
    priceRange: "Base Price Range - ₹5Cr - ₹6Cr",
    category: "Commercial",
    status: "Ready Move",
    features: ["Garden View", "Smart Homes", "Club House"],
  },
  {
    name: "Urban Nest",
    image: "/property-2 1.png",
    location: "Bandra - East",
    configuration: "2BHK - 1100 Sq meter",
    priceRange: "Base Price Range - ₹2.5Cr - ₹3Cr",
    category: "Mixed",
    status: "Upcoming",
    features: ["Park View", "Smart Homes", "Swimming Pool"],
  },
];


type TabType = "all" | "approved" | "pending" | "draft";
type SortBy = "date" | "price" | "customer";
type ViewMode = "grid" | "list";

type KpiStatRow = {
  icon: string;
  value: string;
  label: string;
  trend: string;
  trendUp: boolean;
  color: string;
};

function kpiStatsFromApi(s: QuotationStatsApi): KpiStatRow[] {
  const up = (t: number) => t >= 0;
  return [
    {
      icon: "📄",
      value: String(s.total_quotations),
      label: "Total Quotations",
      trend: formatGrowthPercent(s.total_quotations_growth_pct),
      trendUp: up(s.total_quotations_growth_pct),
      color: "var(--primary-base)",
    },
    {
      icon: "💰",
      value: formatINRValueCrores(s.total_value_inr),
      label: "Total Value",
      trend: formatGrowthPercent(s.total_value_growth_pct),
      trendUp: up(s.total_value_growth_pct),
      color: "var(--success)",
    },
    {
      icon: "📅",
      value: String(s.this_month_count),
      label: "This Month",
      trend: formatGrowthPercent(s.this_month_growth_pct),
      trendUp: up(s.this_month_growth_pct),
      color: "var(--warning)",
    },
    {
      icon: "✅",
      value: String(s.approved_count),
      label: "Approved",
      trend: formatGrowthPercent(s.approved_growth_pct),
      trendUp: up(s.approved_growth_pct),
      color: "var(--success)",
    },
    {
      icon: "⏳",
      value: String(s.pending_count),
      label: "Pending",
      trend: formatGrowthPercent(s.pending_growth_pct),
      trendUp: up(s.pending_growth_pct),
      color: "var(--warning)",
    },
  ];
}

/** Shown while GET /quotations/stats is in flight (avoids flashing mock KPIs). */
function kpiStatsPlaceholder(): KpiStatRow[] {
  const row = (icon: string, label: string, color: string): KpiStatRow => ({
    icon,
    value: "—",
    label,
    trend: "",
    trendUp: true,
    color,
  });
  return [
    row("📄", "Total Quotations", "var(--primary-base)"),
    row("💰", "Total Value", "var(--success)"),
    row("📅", "This Month", "var(--warning)"),
    row("✅", "Approved", "var(--success)"),
    row("⏳", "Pending", "var(--warning)"),
  ];
}

function kpiStatsFromLocalQuotations(quotations: QuotationData[]): KpiStatRow[] {
  const totalValue = quotations.reduce((sum, q) => sum + q.finalPrice, 0);
  const approvedCount = quotations.filter((q) => q.status === "approved").length;
  const pendingCount = quotations.filter((q) => q.status === "pending").length;
  const thisMonthCount = quotations.filter((q) => {
    const created = q.createdAt ? new Date(q.createdAt) : new Date();
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  return [
    {
      icon: "📄",
      value: quotations.length.toString(),
      label: "Total Quotations",
      trend: "+12%",
      trendUp: true,
      color: "var(--primary-base)",
    },
    {
      icon: "💰",
      value: `₹${(totalValue / 10000000).toFixed(1)}Cr`,
      label: "Total Value",
      trend: "+8.5%",
      trendUp: true,
      color: "var(--success)",
    },
    {
      icon: "📅",
      value: thisMonthCount.toString(),
      label: "This Month",
      trend: "+5.2%",
      trendUp: true,
      color: "var(--warning)",
    },
    {
      icon: "✅",
      value: approvedCount.toString(),
      label: "Approved",
      trend: "+2.1%",
      trendUp: true,
      color: "var(--success)",
    },
    {
      icon: "⏳",
      value: pendingCount.toString(),
      label: "Pending",
      trend: "+1.5%",
      trendUp: true,
      color: "var(--warning)",
    },
  ];
}

export default function QuotationPage() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<QuotationData | null>(null);
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [tabCounts, setTabCounts] = useState<QuotationTabCountsApi>({
    all: 0,
    approved: 0,
    pending: 0,
    draft: 0,
  });
  const [listPagination, setListPagination] = useState({
    page: 1,
    limit: 6,
    total: 0,
    total_pages: 1,
  });
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({
    newLeads: false,
    dateRange: "",
    status: "",
    sources: "",
    budget: "",
    project: "",
  });
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const [apiKpiStats, setApiKpiStats] = useState<QuotationStatsApi | null>(null);
  const [kpiStatsLoading, setKpiStatsLoading] = useState(true);

  // Performance Summary KPIs from GET /api/v1/quotations/stats (sales / manager / GM).
  useEffect(() => {
    let cancelled = false;
    setKpiStatsLoading(true);
    fetchQuotationStats()
      .then((s) => {
        if (!cancelled) setApiKpiStats(s);
      })
      .catch(() => {
        if (!cancelled) setApiKpiStats(null);
      })
      .finally(() => {
        if (!cancelled) setKpiStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset to page 1 when tab or project filter changes (search resets page in debounced callback)
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterValues.project]);

  // GET /api/v1/quotations — tab, pagination, search, project, sort (server-side)
  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setListError(false);
    fetchQuotationsList({
      page: currentPage,
      limit: itemsPerPage,
      tab: activeTab,
      q: debouncedSearchQuery.trim() || undefined,
      project: filterValues.project.trim() || undefined,
      sort: sortBy,
      order: sortOrder,
    })
      .then((res) => {
        if (cancelled) return;
        setQuotations(res.quotations.map(mapListItemToQuotationData));
        setTabCounts(res.tab_counts);
        setListPagination(res.pagination);
      })
      .catch(() => {
        if (!cancelled) {
          setListError(true);
          setQuotations([]);
        }
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    currentPage,
    itemsPerPage,
    debouncedSearchQuery,
    filterValues.project,
    sortBy,
    sortOrder,
  ]);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearchQuery(value);
    setCurrentPage(1);
  }, 300);

  const allKpiStats = useMemo(() => {
    if (apiKpiStats) {
      return kpiStatsFromApi(apiKpiStats);
    }
    if (kpiStatsLoading) {
      return kpiStatsPlaceholder();
    }
    return kpiStatsFromLocalQuotations(quotations);
  }, [apiKpiStats, quotations, kpiStatsLoading]);

  // Tab / search / project / sort are applied server-side. Date range is client-only on the current page.
  const filteredQuotations = useMemo(() => {
    let filtered = [...quotations];
    if (filterValues.dateRange) {
      const now = new Date();
      filtered = filtered.filter((q) => {
        if (!q.createdAt) return false;
        const created = new Date(q.createdAt);
        switch (filterValues.dateRange) {
          case "today":
            return created.toDateString() === now.toDateString();
          case "week": {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return created >= weekAgo;
          }
          case "month":
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          case "quarter": {
            const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            return created >= quarterStart;
          }
          case "year":
            return created.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }
    return filtered;
  }, [quotations, filterValues.dateRange]);

  const totalPages = Math.max(1, listPagination.total_pages);
  const paginatedQuotations = filteredQuotations;

  // Get filter summary
  const getFilterSummary = useCallback(() => {
    const parts: string[] = [];
    if (filterValues.project) parts.push(`Project: ${filterValues.project}`);
    if (filterValues.dateRange) parts.push(`Date: ${filterValues.dateRange}`);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }, [filterValues]);

  const handleCreateQuotation = (_formData: unknown) => {
    toast.info("Create quotations from Sales → Lead list → Negotiation flow.");
    setIsDrawerOpen(false);
  };

  const handleUpdateQuotation = (_formData: unknown) => {
    toast.info("Update quotations from the lead’s Negotiation screen.");
    setEditingQuotation(null);
    setIsDrawerOpen(false);
  };

  const handleShare = (quotationId: string, method: "copy" | "email") => {
    const quotation = quotations.find((q) => q.id === quotationId);
    if (!quotation) return;

    const leadQ = quotation.leadId
      ? `&leadId=${encodeURIComponent(quotation.leadId)}`
      : "";
    const url = `${window.location.origin}/quotation/quotation-detail?id=${encodeURIComponent(quotationId)}${leadQ}`;

    if (method === "copy") {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Link copied to clipboard.");
        setShowShareMenu(null);
      });
    } else if (method === "email") {
      const subject = encodeURIComponent(`Quotation ${quotation.id} - ${quotation.project.name}`);
      const body = encodeURIComponent(
        `Please find the quotation details at: ${url}\n\nCustomer: ${quotation.clientInfo.customerName}\nProject: ${quotation.project.name}\nFinal Price: ₹${(quotation.finalPrice / 10000000).toFixed(2)} Cr`
      );
      window.location.href = `mailto:${quotation.clientInfo.email}?subject=${subject}&body=${body}`;
      setShowShareMenu(null);
    }
  };

  const handleEdit = (_quotationId: string) => {
    toast.info("Edit quotations from the lead’s Negotiation screen.");
  };

  const handleView = (quotationId: string) => {
    const q = quotations.find((x) => x.id === quotationId);
    const leadQ = q?.leadId ? `&leadId=${encodeURIComponent(q.leadId)}` : "";
    router.push(`/quotation/quotation-detail?id=${encodeURIComponent(quotationId)}${leadQ}`);
  };

  const handleExport = () => {
    if (filteredQuotations.length === 0) {
      alert("No quotations to export");
      return;
    }

    // Create CSV content
    const headers = [
      "ID",
      "Status",
      "Customer Name",
      "Customer Contact",
      "Customer Email",
      "Project",
      "Flat No",
      "Wing",
      "Floor",
      "RERA Area",
      "Final Price (₹)",
      "Sales Person",
      "Channel Partner",
      "Created Date",
    ];

    const rows = filteredQuotations.map((q) => [
      q.id,
      q.status || "draft",
      q.clientInfo.customerName,
      q.clientInfo.contactNo,
      q.clientInfo.email || "",
      q.project.name,
      q.allocatedFlat.flatNo,
      q.allocatedFlat.wing,
      q.allocatedFlat.floor,
      q.allocatedFlat.reraCarpetArea,
      q.finalPrice.toString(),
      q.assignedRepresentative.salesPerson,
      q.assignedRepresentative.channelPartner,
      q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `quotations_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSortChange = () => {
    if (sortBy === "date") {
      setSortBy("price");
    } else if (sortBy === "price") {
      setSortBy("customer");
    } else {
      setSortBy("date");
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Update filter config for quotations
  const filterConfig = {
    dateRange: [
      { value: "", label: "Date Range" },
      { value: "today", label: "Today" },
      { value: "week", label: "This Week" },
      { value: "month", label: "This Month" },
      { value: "quarter", label: "This Quarter" },
      { value: "year", label: "This Year" },
    ],
    project: [
      { value: "", label: "By Project" },
      { value: "maaz palace", label: "Maaz Palace" },
      { value: "crown height", label: "Crown Height" },
      { value: "greenville orchid", label: "GreenVille Orchid" },
      { value: "urban nest", label: "Urban Nest" },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={18} weight="regular" className="text-[#2D3748] sm:w-5 sm:h-5" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">Quotation</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors text-sm"
              aria-label="Export quotations"
            >
              <Download size={18} weight="regular" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[var(--primary-base)] text-white rounded-lg font-semibold hover:bg-[var(--primary-hover)] transition-colors shadow-sm text-sm sm:text-base"
            >
              <Plus size={20} weight="regular" />
              <span>Create Quotation</span>
            </button>
          </div>
        </div>

        {/* KPI Section — GET /api/v1/quotations/stats when logged in; fallback to local mock list after load error */}
        <section
          className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors mb-4 sm:mb-5 lg:mb-6"
          aria-busy={kpiStatsLoading}
        >
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">
            Performance Summary
          </h2>
          {/* First Row - Always show first 4 KPIs */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 mb-3 sm:mb-4 lg:mb-5 ${
              kpiStatsLoading && !apiKpiStats ? "animate-pulse" : ""
            }`}
          >
            {allKpiStats.slice(0, 4).map((stat, index) => (
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
          {/* Second Row - Show extra KPIs when expanded */}
          {showAllKPIs && allKpiStats.length > 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 transition-all duration-300">
              {allKpiStats.slice(4).map((stat, index) => (
                <KPICard
                  key={index + 4}
                  icon={stat.icon}
                  value={stat.value}
                  label={stat.label}
                  trend={stat.trend}
                  trendUp={stat.trendUp}
                  color={stat.color}
                />
              ))}
            </div>
          )}
          {allKpiStats.length > 4 && (
            <button
              onClick={() => setShowAllKPIs(!showAllKPIs)}
              className="w-full mt-4 text-center text-sm font-medium text-[var(--primary-base)] py-2 rounded-md border border-transparent hover:border-[var(--primary-base)] hover:bg-slate-50 transition-colors"
            >
              {showAllKPIs ? "View less" : "View more"}
            </button>
          )}
        </section>

        {/* Filter Bar */}
        <Filter
          config={filterConfig}
          values={filterValues}
          onChange={setFilterValues}
          onClear={() => {
            setFilterValues({
              newLeads: false,
              dateRange: "",
              status: "",
              sources: "",
              budget: "",
              project: "",
            });
            setSearchQuery("");
          }}
          searchValue={searchQuery}
          onSearchChange={(value) => {
            setSearchQuery(value);
            debouncedSearch(value);
          }}
          searchPlaceholder="Search by customer name, project, or quotation ID"
          itemCount={
            filterValues.dateRange ? filteredQuotations.length : listPagination.total
          }
          itemLabel="Quotation"
          filterSummary={getFilterSummary()}
          showSummary={true}
        />

        {/* Tabs and View Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6">
          {/* Tabs */}
          <div className="flex border-b border-[#E3E6F0] overflow-x-auto scrollbar-hide">
            <button
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "all"
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              All Quotations ({tabCounts.all})
            </button>
            <button
              onClick={() => {
                setActiveTab("approved");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "approved"
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Approved ({tabCounts.approved})
            </button>
            <button
              onClick={() => {
                setActiveTab("pending");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "pending"
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Pending ({tabCounts.pending})
            </button>
            <button
              onClick={() => {
                setActiveTab("draft");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 py-2 sm:py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "draft"
                  ? "border-[var(--primary-base)] text-[var(--primary-base)]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Draft ({tabCounts.draft})
            </button>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sort Controls */}
            <div className="flex items-center gap-1 sm:gap-2 border border-slate-300 rounded-lg p-1">
              <button
                onClick={handleSortChange}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
                title={`Sort by ${sortBy}`}
              >
                <ArrowsDownUp size={14} weight="regular" />
                <span className="hidden sm:inline">
                  {sortBy === "date" ? "Date" : sortBy === "price" ? "Price" : "Customer"}
                </span>
              </button>
              <button
                onClick={toggleSortOrder}
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-slate-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 sm:p-2 rounded transition-colors ${
                  viewMode === "grid"
                    ? "bg-[var(--primary-base)] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="Grid view"
              >
                <GridFour size={16} weight="regular" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 sm:p-2 rounded transition-colors ${
                  viewMode === "list"
                    ? "bg-[var(--primary-base)] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                aria-label="List view"
              >
                <List size={16} weight="regular" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section — list from GET /api/v1/quotations */}
        {listLoading && quotations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-600">
            Loading quotations…
          </div>
        ) : listError ? (
          <EmptyState
            variant="no-data"
            title="Could not load quotations"
            description="Check your connection and sign in again. If the problem continues, try later."
          />
        ) : filteredQuotations.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="No quotations found"
            description="Try adjusting filters or create a quotation from a lead’s Negotiation screen."
            action={{
              label: "Open lead list",
              onClick: () => router.push("/sales/lead-list"),
            }}
          />
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {paginatedQuotations.map((quotation) => (
                  <div key={quotation.id} className="relative">
                    <QuotationCard
                      quotation={quotation}
                      onEdit={() => handleEdit(quotation.id)}
                      onShare={() => setShowShareMenu(showShareMenu === quotation.id ? null : quotation.id)}
                      onView={() => handleView(quotation.id)}
                    />
                    {/* Share Menu */}
                    {showShareMenu === quotation.id && (
                      <div className="absolute top-12 right-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                        <button
                          onClick={() => handleShare(quotation.id, "copy")}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                        >
                          <Copy size={16} />
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleShare(quotation.id, "email")}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-t border-slate-200"
                        >
                          <Envelope size={16} />
                          Email
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {paginatedQuotations.map((quotation) => (
                  <div
                    key={quotation.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base sm:text-lg font-bold text-[var(--primary-base)]">
                            {quotation.id}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              quotation.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : quotation.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {quotation.status?.toUpperCase() || "DRAFT"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Customer</p>
                            <p className="font-semibold text-slate-900">{quotation.clientInfo.customerName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Project</p>
                            <p className="font-semibold text-slate-900">{quotation.project.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Flat No</p>
                            <p className="font-semibold text-slate-900">{quotation.allocatedFlat.flatNo}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Final Price</p>
                            <p className="font-semibold text-green-600">
                              ₹{(quotation.finalPrice / 10000000).toFixed(2)} Cr
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleView(quotation.id)}
                          className="px-3 sm:px-4 py-2 bg-[var(--primary-base)] text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-[var(--primary-hover)] transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEdit(quotation.id)}
                          className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setShowShareMenu(showShareMenu === quotation.id ? null : quotation.id)}
                            className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
                            aria-label="Share"
                          >
                            Share
                          </button>
                          {showShareMenu === quotation.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                              <button
                                onClick={() => handleShare(quotation.id, "copy")}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Copy size={16} />
                                Copy Link
                              </button>
                              <button
                                onClick={() => handleShare(quotation.id, "email")}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-t border-slate-200"
                              >
                                <Envelope size={16} />
                                Email
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {listPagination.total > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-6 sm:mt-8">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>
                    {filteredQuotations.length === 0
                      ? "Showing 0 quotations"
                      : `Showing ${(currentPage - 1) * itemsPerPage + 1}–${
                          (currentPage - 1) * itemsPerPage + filteredQuotations.length
                        } of ${
                          filterValues.dateRange ? filteredQuotations.length : listPagination.total
                        } quotations`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-[var(--primary-base)] text-white"
                              : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Quotation Drawer */}
      <CreateQuotationDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingQuotation(null);
        }}
        onCreateQuotation={handleCreateQuotation}
        onUpdateQuotation={editingQuotation ? handleUpdateQuotation : undefined}
        editingQuotation={editingQuotation}
        projects={availableProjects}
      />
      
      {/* Close share menu when clicking outside */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => setShowShareMenu(null)}
        />
      )}
    </div>
  );
}
