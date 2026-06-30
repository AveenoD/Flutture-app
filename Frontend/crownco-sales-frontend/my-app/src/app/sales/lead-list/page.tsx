"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { KPICard } from "../../../components/ui/kpi";
import { Filter, FilterValues } from "../../../components/ui/filter";
import { DataTable } from "../../../components/ui/dataTabel";
import { DataCard } from "../../../components/ui/card/dataCard";
import { StatusBadge, SourceBadge } from "../../../components/ui/badges";
import { Download, Trash } from "phosphor-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { formatDistanceToNow } from "date-fns";
import { fetchDashboardStats } from "../../../lib/dashboard";
import {
  acceptLead,
  LeadResponse,
  listAssignedLeads,
  listLeads,
  listRejectedLeads,
  PaginationInfo,
} from "../../../lib/leads";
import { useAppSelector } from "../../../store/hooks";

type LeadTemperature = "veryhot" | "hot" | "warm" | "cold" | "rejected";

interface Lead {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  budget: string;
  propertyName: string;
  createdAt: string; // ISO string from backend
  location: string;
  status: LeadTemperature;
  source: string;
  isRejected?: boolean;
  /** Funnel stage from API (`leads.stage`). */
  funnelStage?: LeadResponse["stage"];
  /** Pipeline status from API (`leads.status`), e.g. deal, negotiation, visit. */
  pipelineStatus?: LeadResponse["status"];
}

function formatBudgetToShortL(amount?: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return "N/A";
  // Backend values are typically INR. Convert INR -> L (1L = 100,000).
  // Heuristic: if it's small, treat it as already-in-L.
  const asL = amount >= 100_000 ? amount / 100_000 : amount;
  const displayL = Math.round(asL);
  return `₹${displayL}L`;
}

function formatBudgetRangeToShortL(
  min?: number | null,
  max?: number | null
): string {
  if (min != null && max != null) {
    return `${formatBudgetToShortL(min)} - ${formatBudgetToShortL(max)}`;
  }
  if (min != null) return formatBudgetToShortL(min);
  if (max != null) return `Up to ${formatBudgetToShortL(max)}`;
  return "N/A";
}

function salesDetailUrlForLead(lead: Lead): string {
  const q = encodeURIComponent(lead.id);
  const stage = (lead.funnelStage ?? "").toLowerCase();
  const pipe = lead.pipelineStatus ?? "";

  if (pipe === "deal") {
    return `/sales/lead-list/lead-detail/booking/overveiw?leadId=${q}`;
  }
  if (stage === "booking") {
    return `/sales/lead-list/lead-detail/booking/overveiw?leadId=${q}`;
  }
  if (stage === "negotiation" || pipe === "negotiation") {
    return `/sales/lead-list/lead-detail/negotiation/overveiw?leadId=${q}`;
  }
  if (stage === "site_visit" || stage === "property_visit" || pipe === "visit") {
    return `/sales/lead-list/lead-detail/site-visit/overveiw?leadId=${q}`;
  }
  return `/sales/lead-list/lead-detail/caller-preview/overview?leadId=${q}`;
}

export default function LeadList() {
  const router = useRouter();
  const userType = useAppSelector((state) => state.auth.user?.user_type);
  const [hasMounted, setHasMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Avoid hydration mismatch: auth userType usually hydrates client-side.
  // Render a stable (non-sales) shell until mounted.
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const effectiveUserType = hasMounted ? userType : undefined;
  const isSalesUser = effectiveUserType === "sales";
  const [activeTab, setActiveTab] = useState<
    "all" | "rejected" | "pending" | "assigned"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [isKpiLoading, setIsKpiLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleViewDetail = useCallback(
    (lead: Lead) => {
      router.push(salesDetailUrlForLead(lead));
    },
    [router]
  );

  const handleAcceptLead = useCallback(
    async (leadId: string) => {
      try {
        await acceptLead(leadId);
        toast.success("Lead accepted");
        // Stay on pending tab; the accepted lead should disappear from pending on reload
        setSelectedLeads([]);
        setCurrentPage(1);
        setReloadToken((prev) => prev + 1);
      } catch (err: any) {
        const msg =
          err?.message ||
          "Failed to accept lead. Please try again.";
        toast.error(msg);
      }
    },
    []
  );
  const [filterValues, setFilterValues] = useState<FilterValues>({
    newLeads: true,
    dateRange: "",
    status: "",
    sources: "",
    budget: "",
    project: "",
  });

  // Debounce search input
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setDebouncedSearchQuery(value);
    },
    300
  );

  type LeadListKpi = {
    icon: string;
    value: number | string;
    label: string;
    color: string;
  };

  const [allKpiStats, setAllKpiStats] = useState<LeadListKpi[]>([]);

  useEffect(() => {
    const loadKpis = async () => {
      try {
        setIsKpiLoading(true);
        const stats = await fetchDashboardStats();

        const mapped: LeadListKpi[] = [
          {
            icon: "👤",
            value: stats.total_leads ?? 0,
            label: "New Leads Today",
            color: "var(--primary-base)",
          },
          {
            icon: "📅",
            value: stats.active_leads ?? 0,
            label: "Lead This Month",
            color: "var(--primary-base)",
          },
          {
            icon: "🔔",
            value: stats.pending_followups ?? 0,
            label: "Missed Follow ups",
            color: "var(--warning)",
          },
          {
            icon: "🔥",
            value: stats.deals_closed ?? 0,
            label: "Very Hot Leads",
            color: "var(--error)",
          },
        ];

        setAllKpiStats(mapped);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Failed to load KPI stats", err);
        }
      } finally {
        setIsKpiLoading(false);
      }
    };

    loadKpis();
  }, []);

  // Normalize source names to ensure consistency
  const normalizeSource = useCallback((source: string): string => {
    const sourceMap: Record<string, string> = {
      "assign by maaz": "Assigned By Maaz",
      "assigned by maaz": "Assigned By Maaz",
      "walking": "Walking",
      "website": "Website",
      "referral": "Referral",
    };
    const normalized = sourceMap[source.toLowerCase()] || source;
    // Capitalize first letter of each word if not already formatted
    if (!normalized.includes("By") && !normalized.includes("Walking")) {
      return normalized
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }
    return normalized;
  }, []);

  const [leads, setLeads] = useState<Lead[]>([]);

  // When we learn the user is sales, default them to Pending tab (Example parity).
  useEffect(() => {
    if (!hasMounted) return;
    if (isSalesUser && (activeTab === "all" || activeTab === "rejected")) {
      setActiveTab("pending");
      setCurrentPage(1);
    }
  }, [hasMounted, isSalesUser, activeTab]);

  // Helper function for status label (used in CSV export)
  const getStatusLabel = (status: Lead["status"]) => {
    switch (status) {
      case "veryhot":
        return "Very Hot";
      case "hot":
        return "Hot";
      case "warm":
        return "Warm";
      case "cold":
        return "Cold";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  // Helper function to map property name to filter value
  const getProjectFilterValue = (propertyName: string): string => {
    const projectMap: Record<string, string> = {
      "Crown Height": "crown-height",
      "Urban Nest": "urban-nest",
      "GreenVille Orchid": "greenville-orchid",
      "Maaz Palace": "maaz-palace",
    };
    return projectMap[propertyName] || "";
  };

  // Helper function to extract budget range from budget string
  const getBudgetFilterValue = (budget: string): string => {
    // Extract range like "40L-50L" from "₹40L - ₹50L"
    const match = budget.match(/(\d+L)\s*-\s*(\d+L)/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    return "";
  };

  // Helper function to map source name to filter value
  const getSourceFilterValue = useCallback((source: string): string => {
    const normalized = normalizeSource(source);
    const sourceMap: Record<string, string> = {
      "Assigned By Anuj": "assigned-by-anuj",
      "Assigned By Mustakim": "assigned-by-mustakim",
      "Assigned By Maaz": "assigned-by-maaz",
      "Assigned By Caller": "assigned-by-caller",
      "Walking": "walking",
      "Website": "website",
      "Referral": "referral",
    };
    return sourceMap[normalized] || "";
  }, [normalizeSource]);

  // Load leads from backend when tab / filters / pagination change
  useEffect(() => {
    const loadLeads = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (activeTab === "rejected") {
          if (effectiveUserType !== "general-manager" && effectiveUserType !== "manager") {
            setLeads([]);
            setPagination(null);
            setIsLoading(false);
            setError(null);
            return;
          }

          const { rejected_leads, pagination } = await listRejectedLeads({
            page: currentPage,
            limit: itemsPerPage,
            search: debouncedSearchQuery || undefined,
          });

          const mapped: Lead[] = rejected_leads.map((lead: LeadResponse) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(lead.id)}`,
            budget: formatBudgetRangeToShortL(lead.budget_min, lead.budget_max),
            propertyName: lead.project_title ?? "N/A",
            createdAt: lead.created_at ?? new Date().toISOString(),
            location: lead.city ?? "N/A",
            status: "rejected",
            source: lead.source ?? "N/A",
            isRejected: true,
            funnelStage: lead.stage ?? null,
            pipelineStatus: lead.status,
          }));

          setLeads(mapped);
          setPagination(pagination);
        } else if (isSalesUser) {
          const filter =
            activeTab === "pending"
              ? "pending"
              : activeTab === "assigned"
              ? "assigned"
              : "all";
          const { leads, pagination } = await listAssignedLeads({
            filter,
            page: currentPage,
            limit: itemsPerPage,
            search: debouncedSearchQuery || undefined,
          });

          const mapped: Lead[] = leads.map((lead: LeadResponse) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(lead.id)}`,
            budget: formatBudgetRangeToShortL(lead.budget_min, lead.budget_max),
            propertyName: lead.project_title ?? "N/A",
            createdAt: lead.created_at ?? new Date().toISOString(),
            location: lead.city ?? "N/A",
            status:
              (lead.lead_temperature as LeadTemperature | null) ??
              (lead.status === "rejected" ? "rejected" : "cold"),
            source: lead.source ?? "N/A",
            isRejected: lead.status === "rejected",
            funnelStage: lead.stage ?? null,
            pipelineStatus: lead.status,
          }));

          setLeads(mapped);
          setPagination(pagination);
        } else {
          const { leads, pagination } = await listLeads({
            page: currentPage,
            limit: itemsPerPage,
            search: debouncedSearchQuery || undefined,
          });

          const mapped: Lead[] = leads.map((lead: LeadResponse) => ({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(lead.id)}`,
            budget: formatBudgetRangeToShortL(lead.budget_min, lead.budget_max),
            propertyName: lead.project_title ?? "N/A",
            createdAt: lead.created_at ?? new Date().toISOString(),
            location: lead.city ?? "N/A",
            status:
              (lead.lead_temperature as LeadTemperature | null) ??
              (lead.status === "rejected" ? "rejected" : "cold"),
            source: lead.source ?? "N/A",
            isRejected: lead.status === "rejected",
            funnelStage: lead.stage ?? null,
            pipelineStatus: lead.status,
          }));

          setLeads(mapped);
          setPagination(pagination);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load leads.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeads();
  }, [
    activeTab,
    currentPage,
    itemsPerPage,
    debouncedSearchQuery,
    isSalesUser,
    effectiveUserType,
    hasMounted,
    reloadToken,
  ]);

  // Filter leads based on all criteria - memoized for performance
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Tab filter - show rejected or all leads
      const matchesTab =
        activeTab === "rejected"
          ? lead.isRejected === true
          : lead.isRejected !== true;

      // Search filter (using debounced query)
      const searchTerm = debouncedSearchQuery.toLowerCase();
      const matchesSearch =
        debouncedSearchQuery === "" ||
        lead.name.toLowerCase().includes(searchTerm) ||
        lead.phone.includes(debouncedSearchQuery) ||
        lead.propertyName.toLowerCase().includes(searchTerm);

      // New Leads filter - check if created within last 7 days
      const createdAt = typeof lead.createdAt === "string" 
        ? new Date(lead.createdAt) 
        : new Date(lead.createdAt);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const matchesNewLeads = !filterValues.newLeads || daysSinceCreation <= 7;

      // Status filter
      const matchesStatus = filterValues.status === "" || lead.status === filterValues.status;

      // Sources filter
      const normalizedSource = normalizeSource(lead.source);
      const matchesSources =
        filterValues.sources === "" || getSourceFilterValue(normalizedSource) === filterValues.sources;

      // Budget filter
      const matchesBudget =
        filterValues.budget === "" || getBudgetFilterValue(lead.budget) === filterValues.budget;

      // Project filter
      const matchesProject =
        filterValues.project === "" || getProjectFilterValue(lead.propertyName) === filterValues.project;

      return (
        matchesTab &&
        matchesSearch &&
        matchesNewLeads &&
        matchesStatus &&
        matchesSources &&
        matchesBudget &&
        matchesProject
      );
    });
  }, [leads, debouncedSearchQuery, filterValues, normalizeSource, getSourceFilterValue, activeTab]);

  // Pagination calculations
  const totalPages = pagination?.total_pages ?? 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  // Reset to page 1 when filters change or total pages decrease
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredLeads.length, totalPages, currentPage]);

  // Escape CSV values properly
  const escapeCSV = useCallback((value: string | number): string => {
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }, []);

  // Export to CSV functionality
  const handleExport = useCallback(() => {
    try {
      const dataToExport = filteredLeads.length > 0 ? filteredLeads : leads;
      
      if (dataToExport.length === 0) {
        toast.error("No leads to export");
        return;
      }
      
      // Prepare CSV headers
      const headers = [
        "Name",
        "Phone",
        "Budget",
        "Property Name",
        "Created At",
        "Location",
        "Status",
        "Source",
      ];

      // Prepare CSV rows with proper escaping
      const rows = dataToExport.map((lead) => [
        escapeCSV(lead.name),
        escapeCSV(lead.phone),
        escapeCSV(lead.budget),
        escapeCSV(lead.propertyName),
        escapeCSV(
          typeof lead.createdAt === "string"
            ? lead.createdAt
            : formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })
        ),
        escapeCSV(lead.location),
        escapeCSV(getStatusLabel(lead.status)),
        escapeCSV(lead.source),
      ]);

      // Combine headers and rows
      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `leads_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${dataToExport.length} lead(s) successfully`);
    } catch (error) {
      toast.error("Failed to export leads. Please try again.");
      if (process.env.NODE_ENV === "development") {
        console.error("Export error:", error);
      }
    }
  }, [filteredLeads, leads, escapeCSV]);

  // Refresh functionality
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Reset filters and search
      setSearchQuery("");
      setDebouncedSearchQuery("");
      setSelectedLeads([]);
      setCurrentPage(1);
      setFilterValues({
        newLeads: true,
        dateRange: "",
        status: "",
        sources: "",
        budget: "",
        project: "",
      });
      
      toast.success("Data refreshed successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh data";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Delete functionality with optimistic updates
  const handleDelete = useCallback(async () => {
    if (selectedLeads.length === 0) {
      toast.error("Please select at least one lead to delete.");
      return;
    }

    const confirmMessage =
      selectedLeads.length === 1
        ? `Are you sure you want to delete this lead? This action cannot be undone.`
        : `Are you sure you want to delete ${selectedLeads.length} leads? This action cannot be undone.`;

    // Use toast.promise for better UX, but we'll use a simple confirm for now
    // In production, use a proper modal component
    const confirmed = window.confirm(confirmMessage);
    
    if (!confirmed) return;

    const previousLeads = leads;
    const deletedCount = selectedLeads.length;

    // Optimistic update
    setLeads((prevLeads) =>
      prevLeads.filter((lead) => !selectedLeads.includes(lead.id))
    );
    
    // Clear selection
    setSelectedLeads([]);

    try {
      // In production, call API here
      // await deleteLeadsAPI(selectedLeads);
      
      toast.success(
        deletedCount === 1
          ? "Lead deleted successfully"
          : `${deletedCount} leads deleted successfully`
      );
    } catch (err) {
      // Rollback on error
      setLeads(previousLeads);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete leads";
      toast.error(errorMessage);
    }
  }, [selectedLeads, leads]);

  const handleSelectLead = (leadId: string | number) => {
    const id =
      typeof leadId === "string" ? leadId : String(leadId);
    setSelectedLeads((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };



  // Filter config for summary labels
  const filterConfig = {
    status: [
      { value: "veryhot", label: "Very Hot" },
      { value: "hot", label: "Hot" },
      { value: "warm", label: "Warm" },
      { value: "cold", label: "Cold" },
    ],
    sources: [
      { value: "assigned-by-caller", label: "Assigned By Caller" },
      { value: "assigned-by-anuj", label: "Assigned By Anuj" },
      { value: "assigned-by-mustakim", label: "Assigned By Mustakim" },
      { value: "walking", label: "Walking" },
    ],
    budget: [
      { value: "40L-50L", label: "₹40L - ₹50L" },
      { value: "30L-40L", label: "₹30L - ₹40L" },
      { value: "50L-60L", label: "₹50L - ₹60L" },
    ],
  };

  // Generate filter summary text
  const getFilterSummary = (): string => {
    const activeFilters: string[] = [];
    
    if (filterValues.sources) {
      const sourceLabel = filterConfig.sources.find(s => s.value === filterValues.sources)?.label || filterValues.sources;
      activeFilters.push(`Sources = ${sourceLabel}`);
    }
    
    if (filterValues.budget) {
      const budgetLabel = filterConfig.budget.find(b => b.value === filterValues.budget)?.label || filterValues.budget;
      activeFilters.push(`Budget: ${budgetLabel}`);
    }
    
    if (filterValues.status) {
      const statusLabel = filterConfig.status.find(s => s.value === filterValues.status)?.label || filterValues.status;
      activeFilters.push(`Status: ${statusLabel}`);
    }

    return activeFilters.length > 0 ? activeFilters.join(" , ") : "No filters applied";
  };

  // Handle select all - must be defined after filteredLeads
  const handleSelectAll = () => {
    // Get filtered leads for selection
    const leadsToSelect = filteredLeads.length > 0 ? filteredLeads : leads;
    const filteredLeadIds = leadsToSelect.map((lead) => lead.id);
    
    // Check if all filtered leads are already selected
    const allFilteredSelected = filteredLeadIds.every((id) =>
      selectedLeads.includes(id)
    );
    
    if (allFilteredSelected) {
      // Deselect all filtered leads
      setSelectedLeads((prev) =>
        prev.filter((id) => !filteredLeadIds.includes(id))
      );
    } else {
      // Select all filtered leads (merge with existing selections)
      setSelectedLeads((prev) => {
        const newSelections = [...prev];
        filteredLeadIds.forEach((id) => {
          if (!newSelections.includes(id)) {
            newSelections.push(id);
          }
        });
        return newSelections;
      });
    }
  };

  // Show error state if needed
  if (error && !isLoading) {
    return (
      <div className="w-full">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">
            Error: {error}. Please try refreshing the page.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
            aria-label="Retry loading leads"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Performance Summary - KPI Cards */}
        <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors mb-4 sm:mb-5 lg:mb-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Performance Summary</h2>
          {/* First Row - Always show first 4 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 mb-3 sm:mb-4 lg:mb-5">
            {isKpiLoading && allKpiStats.length === 0 ? (
              <>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="p-4 sm:p-5 lg:p-6 rounded-xl bg-slate-100 animate-pulse"
                  />
                ))}
              </>
            ) : (
              allKpiStats.slice(0, 4).map((stat, index) => (
                <KPICard
                  key={index}
                  icon={stat.icon}
                  value={stat.value}
                  label={stat.label}
                  color={stat.color}
                />
              ))
            )}
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
        values={filterValues}
        onChange={setFilterValues}
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          debouncedSearch(value);
        }}
        searchPlaceholder="Search by name or property id"
        itemCount={filteredLeads.length}
        itemLabel="Lead"
        filterSummary={getFilterSummary()}
        showSummary={true}
      />

      {/* Tabs */}
      <div className="flex border-b border-[#E3E6F0] mb-4 sm:mb-5 lg:mb-6 overflow-x-auto scrollbar-hide">
        {hasMounted && isSalesUser ? (
          <>
            <button
              onClick={() => {
                setActiveTab("pending");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "pending"
                  ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                  : "text-[#718096] border-transparent"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => {
                setActiveTab("assigned");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "assigned"
                  ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                  : "text-[#718096] border-transparent"
              }`}
            >
              Assigned
            </button>
            <button
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "all"
                  ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                  : "text-[#718096] border-transparent"
              }`}
            >
              All
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setActiveTab("all");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "all"
                  ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                  : "text-[#718096] border-transparent"
              }`}
            >
              All Leads
            </button>
            <button
              onClick={() => {
                setActiveTab("rejected");
                setCurrentPage(1);
              }}
              className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "rejected"
                  ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                  : "text-[#718096] border-transparent"
              }`}
            >
              Rejected Leads
            </button>
          </>
        )}
      </div>

      {/* Mobile, Tablet & Small Desktop View - Cards (when table would scroll) */}
      <div className="xl:hidden space-y-3 sm:space-y-4">
        {activeTab === "rejected" &&
        effectiveUserType !== "general-manager" &&
        effectiveUserType !== "manager" ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 sm:p-8 text-center text-sm text-red-700">
            You don&apos;t have permission to view rejected leads. Only GM/Manager can access this list.
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#EAECF0] p-6 sm:p-8 text-center text-sm text-[#667085]">
            No leads found
          </div>
        ) : (
          paginatedLeads.map((lead) => {
            const createdAt = typeof lead.createdAt === "string" 
              ? new Date(lead.createdAt) 
              : new Date(lead.createdAt);
            const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
            
            return (
              <DataCard
                key={lead.id}
                id={Number.isNaN(Number(lead.id)) ? 0 : Number(lead.id)}
                name={lead.name}
                phone={lead.phone}
                avatar={lead.avatar}
                budget={lead.budget}
                propertyName={lead.propertyName}
                timeAgo={timeAgo}
                location={lead.location}
                status={lead.status}
                source={lead.source}
                onClick={() => handleViewDetail(lead)}
              />
            );
          })
        )}

        {/* Mobile Pagination */}
        {filteredLeads.length > 0 && totalPages > 1 && (
          <div className="bg-white rounded-lg border border-[#EAECF0] p-4 mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#667085]">
              <div className="text-xs sm:text-sm">
                Showing {startIndex + 1} - {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} leads
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="p-2 border border-[#EAECF0] rounded-md bg-white hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 10) {
                      pageNum = i + 1;
                    } else if (currentPage <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 4) {
                      pageNum = totalPages - 9 + i;
                    } else {
                      pageNum = currentPage - 5 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[32px] h-8 px-2 text-sm font-medium rounded-md transition-colors ${
                          currentPage === pageNum
                            ? "bg-[var(--primary-base)] text-white"
                            : "bg-white text-[#667085] border border-[#EAECF0] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 10 && currentPage < totalPages - 4 && (
                    <>
                      <span className="px-2 text-[#667085]">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="min-w-[32px] h-8 px-2 text-sm font-medium rounded-md bg-white text-[#667085] border border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-2 border border-[#EAECF0] rounded-md bg-white hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Large Desktop View - Table (only when enough space, no scroll needed) */}
      <div className="hidden xl:block">
        {activeTab === "rejected" &&
        effectiveUserType !== "general-manager" &&
        effectiveUserType !== "manager" ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4 text-sm text-red-700">
            You don&apos;t have permission to view rejected leads. Only GM/Manager can access this list.
          </div>
        ) : null}

        <DataTable
        data={paginatedLeads}
        columns={[
          {
            key: "name",
            header: "Name & Phone",
            className: "min-w-[180px] lg:min-w-[200px]",
            render: (lead) => (
              <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                <Image
                  src={lead.avatar}
                  alt={lead.name}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs lg:text-sm text-[#344054] truncate">
                    {lead.name}
                  </div>
                  <div className="text-xs text-[#667085] truncate">{lead.phone}</div>
                </div>
              </div>
            ),
          },
          {
            key: "budget",
            header: "Budget",
            className: "min-w-[120px] lg:min-w-[140px]",
            render: (lead) => (
              <span className="text-xs lg:text-sm font-semibold text-[var(--primary-base)] whitespace-nowrap">
                {lead.budget}
              </span>
            ),
          },
          {
            key: "propertyName",
            header: "Prop Name & Time",
            className: "min-w-[150px] lg:min-w-[180px]",
            render: (lead) => {
              const createdAt = typeof lead.createdAt === "string" 
                ? new Date(lead.createdAt) 
                : new Date(lead.createdAt);
              const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
              
              return (
                <div className="min-w-0">
                  <div className="font-semibold text-xs lg:text-sm text-[#344054] truncate">
                    {lead.propertyName}
                  </div>
                  <div className="text-xs text-[#667085] truncate">{timeAgo}</div>
                </div>
              );
            },
          },
          {
            key: "location",
            header: "Location",
            className: "min-w-[100px] lg:min-w-[120px]",
            render: (lead) => (
              <span className="text-xs lg:text-sm text-[#344054] truncate block">{lead.location}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            className: "min-w-[90px] lg:min-w-[100px]",
            render: (lead) => <StatusBadge status={lead.status} />,
          },
          {
            key: "source",
            header: "Sources",
            className: "min-w-[120px] lg:min-w-[140px]",
            render: (lead) => <SourceBadge source={lead.source} />,
          },
        ]}
        searchPlaceholder="Search leads..."
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          debouncedSearch(value);
        }}
        onColumnClick={() => console.log("Column clicked")}
        actions={[
          {
            label: "Export",
            icon: <Download size={16} weight="regular" />,
            onClick: handleExport,
            showLabel: false,
          },
          {
            label: isRefreshing ? "Refreshing..." : "Refresh",
            onClick: handleRefresh,
            variant: "primary",
            icon: isRefreshing ? (
              <div className="w-4 h-4 border-2 border-[var(--primary-base)] border-t-transparent rounded-full animate-spin" />
            ) : undefined,
          },
          {
            label: "Delete",
            icon: <Trash size={16} weight="regular" />,
            onClick: handleDelete,
            variant: "danger",
            showLabel: false,
            disabled: selectedLeads.length === 0,
          },
        ]}
        selectable={true}
        selectedRows={selectedLeads}
        onSelectRow={handleSelectLead}
        onSelectAll={handleSelectAll}
        getRowId={(lead) => lead.id}
        emptyMessage="No leads found"
        pagination={true}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredLeads.length}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 20, 50]}
        onPageChange={(page) => setCurrentPage(page)}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
        renderActions={(lead) => (
          <div className="flex items-center gap-2">
            {hasMounted && isSalesUser && activeTab === "pending" && (
              <button
                className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap"
                aria-label={`Accept lead ${lead.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptLead(lead.id);
                }}
              >
                Accept
              </button>
            )}
            <button
              className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
              aria-label={`View details for ${lead.name}`}
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetail(lead);
              }}
            >
              <span className="hidden lg:inline">View Detail</span>
              <span className="lg:hidden">View</span>
            </button>
          </div>
        )}
      />
      </div>
      </div>
    </div>
  );
}
