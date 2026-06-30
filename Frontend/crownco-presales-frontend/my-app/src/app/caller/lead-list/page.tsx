"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

/** Maps Date Range UI → GET /api/v1/leads?created_after=&created_before= (core-api lead.go). */
function appendLeadDateRangeParams(
  params: URLSearchParams,
  dateRange: string
): void {
  if (!dateRange) return;
  const today = new Date();
  let start: Date;
  let end: Date;

  switch (dateRange) {
    case "today":
      start = new Date(today);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      start = new Date(y);
      start.setHours(0, 0, 0, 0);
      end = new Date(y);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "week": {
      start = new Date(today);
      const dow = start.getDay();
      const toMonday = dow === 0 ? -6 : 1 - dow;
      start.setDate(start.getDate() + toMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case "month":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      break;
    case "quarter": {
      const m = today.getMonth();
      const q0 = Math.floor(m / 3) * 3;
      start = new Date(today.getFullYear(), q0, 1);
      end = new Date(today.getFullYear(), q0 + 3, 0, 23, 59, 59, 999);
      break;
    }
    case "year":
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      return;
  }
  params.set("created_after", start.toISOString());
  params.set("created_before", end.toISOString());
}
import { useRouter } from "next/navigation";
import { KPICard } from "../../../components/ui/kpi";
import { Filter, FilterValues } from "../../../components/ui/filter";
import { DataTable } from "../../../components/ui/dataTabel";
import { DataCard } from "../../../components/ui/card/dataCard";
import { StatusBadge, SourceBadge } from "../../../components/ui/badges";
import { Download, Trash, Phone } from "phosphor-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { formatDistanceToNow } from "date-fns";
import { apiGet, apiPut } from "../../../lib/apiClient";

interface Lead {
  id: number;
  uuid?: string;
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  budget: string;
  propertyName: string;
  /** Portal listing / extra line (maps to backend source_detail, e.g. Housing project line). */
  sourceDetail?: string;
  projectId?: string | null;
  createdAt: Date | string;
  location: string;
  status: "veryhot" | "hot" | "warm" | "cold" | "rejected";
  // Lead status from backend (qualified | called | unqualified | ...)
  leadStatus?: string;
  source: string;
  isRejected?: boolean;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export default function LeadList() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"qualified" | "connected" | "sources" | "bulk">("qualified");
  // Mobile integration: API leads/Bulk data ke andar sub-tabs ("Connected" / "Called")
  // Connected -> backend lead.status === "qualified"
  // Called -> backend lead.status === "called"
  const [apiStatusFilter, setApiStatusFilter] = useState<"connected" | "called" | null>(null);
  const [showQualifyRejectPopup, setShowQualifyRejectPopup] = useState(false);
  const [qualifyRejectLeadId, setQualifyRejectLeadId] = useState<number | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  /** Server-side pagination from GET /api/v1/leads (do not re-slice client-side). */
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    total_pages: 1,
    page: 1,
    limit: 10,
  });
  const [showAllKPIs, setShowAllKPIs] = useState(false);

  // Projects for "By Project" filter (loaded from backend)
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);

  // Aggregate lead stats for KPI cards (GET /api/v1/leads/stats)
  const [leadStats, setLeadStats] = useState<{
    total_calls_made?: number;
    message_sent?: number;
    site_visit_done?: number;
    calling_hour?: string;
  } | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);

  // Navigate to lead detail page (Communication) with leadId so backend GET by id works
  const handleViewDetail = useCallback(
    (lead: Lead) => {
      const leadIdentifier = lead.uuid || String(lead.id);
      router.push(
        `/caller/lead-list/lead-detail/caller/overview?leadId=${leadIdentifier}`
      );
    },
    [router]
  );

  // Navigate to Qualification tab for a specific lead
  const handleOpenQualification = useCallback(
    (lead: Lead) => {
      const leadIdentifier = lead.uuid || String(lead.id);
      router.push(
        `/caller/lead-list/lead-detail/qualification?leadId=${leadIdentifier}`
      );
    },
    [router]
  );
  
  const [filterValues, setFilterValues] = useState<FilterValues>({
    newLeads: true,
    dateRange: "",
    status: "",
    sources: "",
    budget: "",
    project: "",
    stages: "",
  });

  // Debounce search input
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setDebouncedSearchQuery(value);
    },
    300
  );

  // Load projects for project filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await apiGet<{
          data?: {
            projects?: { id: string; project_title: string }[];
          };
        }>("/api/v1/projects");
        const list = res.data?.projects || [];
        setProjects(
          list.map((p) => ({
            id: p.id,
            title: p.project_title,
          }))
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[LeadList] Failed to load projects for filter", err);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchProjects();
  }, []);

  const fetchLeadStats = useCallback(async () => {
    try {
      setKpiLoading(true);
      setKpiError(null);
      const res = await apiGet<{
        data?: {
          total_calls_made?: number;
          message_sent?: number;
          site_visit_done?: number;
          calling_hour?: string;
        };
      }>("/api/v1/leads/stats");
      setLeadStats(res.data || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load KPI stats";
      setKpiError(message);
      // eslint-disable-next-line no-console
      console.error("[LeadList] Error fetching lead stats", err);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  // Load KPI stats from backend (aggregate stats for current user)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchLeadStats();
  }, [fetchLeadStats]);

  // KPI cards derived from leadStats (fallback to zeros when not loaded)
  const allKpiStats = useMemo(
    () => [
      {
        icon: "📞",
        value: String(leadStats?.total_calls_made ?? 0),
        label: "Total Calls Made",
        trend: "",
        trendUp: true,
        color: "var(--primary-base)",
      },
      {
        icon: "💬",
        value: String(leadStats?.message_sent ?? 0),
        label: "Messages Sent",
        trend: "",
        trendUp: true,
        color: "var(--purple)",
      },
      {
        icon: "🏠",
        value: String(leadStats?.site_visit_done ?? 0),
        label: "Site Visit Done",
        trend: "",
        trendUp: true,
        color: "var(--warning)",
      },
      {
        icon: "🕒",
        value: leadStats?.calling_hour ?? "0:00 hrs",
        label: "Calling Hour",
        trend: "",
        trendUp: true,
        color: "var(--success)",
      },
    ],
    [leadStats]
  );

  // Normalize source names to ensure consistency
  const normalizeSource = useCallback((source: string): string => {
    const sourceMap: Record<string, string> = {
      "magicbricks.com": "Magicbricks.com",
      "housing.com": "Housing.com",
      "booking.com": "Booking.com",
      "nobroker.com": "Nobroker.com",
      "99acres.com": "99acres.com",
      "assign by maaz": "Assigned By Maaz",
      "assigned by maaz": "Assigned By Maaz",
      "walking": "Walking",
      "website": "Website",
      "referral": "Referral",
    };
    const normalized = sourceMap[source.toLowerCase()] || source;
    // Capitalize first letter of each word if not already formatted
    if (!normalized.includes("By") && !normalized.includes("Walking") && !normalized.includes(".com")) {
      return normalized
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }
    return normalized;
  }, []);

  // Leads list (loaded from backend)
  const [leads, setLeads] = useState<Lead[]>([]);

  // Handle call action
  const handleCall = useCallback(async (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      const leadIdentifier = lead.uuid || String(lead.id);

      // Create a call record (optional backend integration). This helps Called tab populate.
      try {
        await apiPost(`/api/v1/leads/${leadIdentifier}/calls`, {});
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[LeadList] Failed to initiate call record", err);
      }

      // Mark as "called" unless it is already "qualified" (Connected).
      try {
        if (lead.leadStatus !== "qualified") {
          await apiPut(`/api/v1/leads/${leadIdentifier}`, { status: "called" });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[LeadList] Failed to mark lead as called", err);
      }

      // Remove non-digit characters from phone number
      const phoneNumber = lead.phone.replace(/\D/g, '');
      window.location.href = `tel:${phoneNumber}`;
      toast.success(`Calling ${lead.name}...`);
    }
  }, [leads]);

  // Handle qualify action - navigate to qualification page
  const handleQualify = useCallback((leadId: number) => {
    setQualifyRejectLeadId(leadId);
    setShowQualifyRejectPopup(true);
  }, []);

  const handleQualifyRejectPopupClose = () => {
    setShowQualifyRejectPopup(false);
    setQualifyRejectLeadId(null);
  };

  const handleQualifyRejectPopupQualify = useCallback(() => {
    if (qualifyRejectLeadId == null) return;

    const lead = leads.find((l) => l.id === qualifyRejectLeadId);
    const leadIdentifier = lead?.uuid || String(qualifyRejectLeadId);

    handleQualifyRejectPopupClose();
    router.push(
      `/caller/lead-list/lead-detail/qualification?leadId=${encodeURIComponent(
        leadIdentifier
      )}&autoOpen=1`
    );
  }, [qualifyRejectLeadId, leads, router]);

  const handleQualifyRejectPopupReject = useCallback(() => {
    if (qualifyRejectLeadId == null) return;

    const lead = leads.find((l) => l.id === qualifyRejectLeadId);
    const leadIdentifier = lead?.uuid || String(qualifyRejectLeadId);

    handleQualifyRejectPopupClose();
    router.push(
      `/caller/lead-list/rejected-form?leadId=${encodeURIComponent(
        leadIdentifier
      )}`
    );
  }, [qualifyRejectLeadId, leads, router]);

  // Fetch leads from backend for current tab (Qualified, API leads, Bulk data)
  const fetchLeadsForActiveTab = useCallback(async () => {
    if (
      activeTab !== "qualified" &&
      activeTab !== "bulk" &&
      activeTab !== "sources" &&
      activeTab !== "connected"
    )
      return;

    setIsLoading(true);
    setError(null);

    try {
      type BackendLead = {
        id: string;
        name?: string;
        phone?: string;
        email?: string | null;
        city?: string;
        lead_temperature?: "veryhot" | "hot" | "warm" | "cold";
        status?: string; // backend lead_status
        source?: string;
        source_detail?: string | null;
        project_id?: string | null;
        project_title?: string;
        created_at?: string;
        budget_min?: number | null;
        budget_max?: number | null;
      };

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(itemsPerPage));

      // Tab-based status filter
      if (activeTab === "qualified") {
        params.set("status", "qualified");
      } else if (activeTab === "connected") {
        params.set("status", "called");
      } else if (activeTab === "bulk") {
        // Bulk tab is meant for CSV-imported leads only.
        params.set("source", "imported");
      }

      // Search filter → backend "search" (matches name/phone/email)
      if (debouncedSearchQuery.trim()) {
        params.set("search", debouncedSearchQuery.trim());
      }

      // Status filter → backend lead_temperature
      if (filterValues.status && typeof filterValues.status === "string") {
        params.set("lead_temperature", filterValues.status);
      }

      // Sources filter → backend source (when a portal maps to an enum)
      let sourceParamSet = false;
      if (filterValues.sources) {
        const sourceEnumMap: Record<string, string> = {
          "magicbricks-com": "magicbricks",
          "housing-com": "housing",
          "booking-com": "website",
          "nobroker-com": "nobroker",
          "99acres-com": "99acres",
          walking: "walking",
          website: "website",
          referral: "referral",
        };
        const backendSource = sourceEnumMap[filterValues.sources];
        if (backendSource) {
          params.set("source", backendSource);
          sourceParamSet = true;
        }
      }
      // API leads tab: without a specific source, the first page from the API was often all "imported"
      // (bulk CSV); client then stripped them → empty table. Exclude at the server.
      if (activeTab === "sources" && !sourceParamSet) {
        params.set("exclude_source", "imported");
      }

      // Stages filter → backend stage
      if (filterValues.stages) {
        const stageValue = Array.isArray(filterValues.stages)
          ? filterValues.stages[0]
          : filterValues.stages;
        if (stageValue === "property-visit" || stageValue === "site-visit") {
          params.set("stage", "site_visit");
        } else if (stageValue === "follow-up") {
          params.set("stage", "communication");
        }
      }

      // Date range → GET .../leads?created_after=&created_before= (see appendLeadDateRangeParams)
      appendLeadDateRangeParams(params, filterValues.dateRange);

      // Project filter → backend project_id
      if (filterValues.project) {
        params.set("project_id", String(filterValues.project));
      }

      const basePath = `/api/v1/leads?${params.toString()}`;

      const response = await apiGet<{
        data: {
          leads: BackendLead[];
          pagination: {
            total: number;
            total_pages: number;
            page?: number;
            limit?: number;
          };
        };
      }>(basePath);

      let backendLeads = response?.data?.leads || [];

      const p = response?.data?.pagination;
      if (p) {
        const total = p.total ?? 0;
        const limit = p.limit ?? itemsPerPage;
        const tp =
          p.total_pages ??
          (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
        setPaginationMeta({
          total,
          total_pages: Math.max(1, tp),
          page: p.page ?? currentPage,
          limit,
        });
      } else {
        setPaginationMeta({
          total: backendLeads.length,
          total_pages: 1,
          page: currentPage,
          limit: itemsPerPage,
        });
      }

      // API leads tab: imported leads exclude.
      if (activeTab === "sources") {
        backendLeads = backendLeads.filter(
          (lead) => (lead.source || "").toLowerCase() !== "imported"
        );
      }
      if (activeTab === "bulk") {
        backendLeads = backendLeads.filter(
          (lead) => (lead.source || "").toLowerCase() === "imported"
        );
      }

      // Sub-tabs integration (mobile parity)
      if ((activeTab === "sources" || activeTab === "bulk") && apiStatusFilter) {
        if (apiStatusFilter === "connected") {
          backendLeads = backendLeads.filter((lead) => lead.status === "qualified");
        } else if (apiStatusFilter === "called") {
          backendLeads = backendLeads.filter((lead) => lead.status === "called");
        }
      }

      const mapped: Lead[] = backendLeads.map((lead, index) => {
        const budgetMin = lead.budget_min ?? undefined;
        const budgetMax = lead.budget_max ?? undefined;
        // Backend may return either:
        // 1) already-in-L values (e.g. 20..60), or
        // 2) raw rupee amounts (e.g. 2000000..6000000).
        // This formatter makes the UI consistently compact like "₹20L" / "₹2.8Cr".
        const formatCompactBudgetValue = (value: number): string => {
          const abs = Math.abs(value);

          const trimTrailingZeros = (n: number, decimals: number) => {
            const fixed = n.toFixed(decimals);
            return fixed.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
          };

          // If it's in crore/rupees range, show Cr.
          if (abs >= 10_000_000) {
            const cr = value / 10_000_000;
            return `₹${trimTrailingZeros(cr, 1)}Cr`;
          }

          // If it's in rupees, show L (1L = 1e5).
          if (abs >= 1_000_000) {
            const l = value / 100_000;
            // Keep integer "20L" style so existing budget filters still match.
            return `₹${Math.round(l)}L`;
          }

          // Otherwise treat it as already-in-L (e.g. 20..60).
          return `₹${Math.round(value)}L`;
        };

        const formatCompactBudgetRange = (
          min?: number | null,
          max?: number | null
        ): string => {
          if (min == null && max == null) return "";
          if (min != null && max != null) {
            return `${formatCompactBudgetValue(min)} - ${formatCompactBudgetValue(
              max
            )}`;
          }
          if (min != null) return `From ${formatCompactBudgetValue(min)}`;
          return `Up to ${formatCompactBudgetValue(max as number)}`;
        };

        const budgetLabel = formatCompactBudgetRange(budgetMin, budgetMax);

        return {
          id: (currentPage - 1) * itemsPerPage + index + 1,
          uuid: lead.id,
          name: lead.name || "Unknown",
          phone: lead.phone || "",
          email: lead.email || undefined,
          avatar: "/Avatar_images.png",
          budget: budgetLabel,
          propertyName: lead.project_title || "—",
          sourceDetail: lead.source_detail || undefined,
          projectId: lead.project_id || null,
          createdAt: lead.created_at || new Date().toISOString(),
          location: lead.city || "",
          status: (lead.lead_temperature as Lead["status"]) || "cold",
          leadStatus: lead.status || "",
          source: lead.source || "Manual",
        };
      });

      setLeads(mapped);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load leads";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, itemsPerPage, debouncedSearchQuery, filterValues, apiStatusFilter]);

  // Load leads on first render and when page/limit or tab changes
  useEffect(() => {
    if (
      activeTab === "qualified" ||
      activeTab === "bulk" ||
      activeTab === "sources" ||
      activeTab === "connected"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchLeadsForActiveTab();
    }
  }, [activeTab, currentPage, itemsPerPage, fetchLeadsForActiveTab]);

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

  /** Backend lead.status (pipeline): qualified, called, unqualified, … */
  const formatPipelineLeadStatus = (s?: string) => {
    if (!s) return "—";
    const t = s.replace(/_/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const getLeadInitials = (name?: string) => {
    const safe = (name || "").trim();
    if (!safe) return "NA";
    const parts = safe.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

  // Helper function to map project id for filter comparison
  const getProjectFilterValue = (projectId?: string | null): string => {
    return projectId || "";
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
      "Magicbricks.com": "magicbricks-com",
      "Housing.com": "housing-com",
      "Booking.com": "booking-com",
      "Nobroker.com": "nobroker-com",
      "99acres.com": "99acres-com",
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

  // Filter leads based on all criteria - memoized for performance
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Tab filter - qualified shows non-rejected leads
      const matchesTab =
        activeTab === "qualified"
          ? lead.isRejected !== true
          : activeTab === "sources" || activeTab === "bulk"
          ? true
          : true;

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
        filterValues.project === "" ||
        getProjectFilterValue(lead.projectId) === filterValues.project;

      // Stages filter (if implemented)
      const matchesStages = !filterValues.stages || filterValues.stages === "" || 
        (Array.isArray(filterValues.stages) ? filterValues.stages.length === 0 : true);

      return (
        matchesTab &&
        matchesSearch &&
        matchesNewLeads &&
        matchesStatus &&
        matchesSources &&
        matchesBudget &&
        matchesProject &&
        matchesStages
      );
    });
  }, [leads, debouncedSearchQuery, filterValues, normalizeSource, getSourceFilterValue, activeTab]);

  // Pagination: list API already returns one page — use server total_pages; do not slice again.
  const totalPages = Math.max(1, paginationMeta.total_pages || 1);
  const paginatedLeads = filteredLeads;
  const rangeStart =
    paginationMeta.total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const rangeEnd =
    paginationMeta.total > 0
      ? Math.min(currentPage * itemsPerPage, paginationMeta.total)
      : 0;

  // If server has fewer pages than current (e.g. total dropped), go back to last valid page
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

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
      if (
        activeTab === "qualified" ||
        activeTab === "bulk" ||
        activeTab === "sources" ||
        activeTab === "connected"
      ) {
        await fetchLeadsForActiveTab();
      }

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
        stages: "",
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
    const id = typeof leadId === "string" ? parseInt(leadId, 10) : leadId;
    setSelectedLeads((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };

  // Filter config for summary labels
  const projectFilterOptions =
    projects.length > 0
      ? projects.map((p) => ({ value: p.id, label: p.title }))
      : [
          { value: "crown-height", label: "Crown Height" },
          { value: "urban-nest", label: "Urban Nest" },
          { value: "greenville-orchid", label: "GreenVille Orchid" },
          { value: "maaz-palace", label: "Maaz Palace" },
        ];

  const filterConfig = {
    dateRange: [
      { value: "today", label: "Today" },
      { value: "yesterday", label: "Yesterday" },
      { value: "week", label: "This Week" },
      { value: "month", label: "This Month" },
      { value: "quarter", label: "This Quarter" },
      { value: "year", label: "This Year" },
    ],
    status: [
      { value: "veryhot", label: "Very Hot" },
      { value: "hot", label: "Hot" },
      { value: "warm", label: "Warm" },
      { value: "cold", label: "Cold" },
    ],
    sources: [
      { value: "magicbricks-com", label: "Magicbricks.com" },
      { value: "housing-com", label: "Housing.com" },
      { value: "booking-com", label: "Booking.com" },
      { value: "nobroker-com", label: "Nobroker.com" },
      { value: "99acres-com", label: "99acres.com" },
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
    stages: [
      { value: "property-visit", label: "Property Visit" },
      { value: "site-visit", label: "Site Visit" },
      { value: "follow-up", label: "Follow Up" },
    ],
  };

  // Generate filter summary text
  const getFilterSummary = (): string => {
    const activeFilters: string[] = [];

    if (filterValues.dateRange) {
      const drLabel =
        filterConfig.dateRange.find((d) => d.value === filterValues.dateRange)
          ?.label || filterValues.dateRange;
      activeFilters.push(`Date: ${drLabel}`);
    }

    if (filterValues.project) {
      const pLabel =
        projectFilterOptions.find((p) => p.value === filterValues.project)
          ?.label || filterValues.project;
      activeFilters.push(`Project: ${pLabel}`);
    }
    
    if (filterValues.sources) {
      const sourceLabel = filterConfig.sources.find(s => s.value === filterValues.sources)?.label || filterValues.sources;
      activeFilters.push(`Sources = ${sourceLabel}`);
    }
    
    if (filterValues.stages) {
      const stageValue = Array.isArray(filterValues.stages) ? filterValues.stages[0] : filterValues.stages;
      const stageLabel = filterConfig.stages.find(s => s.value === stageValue)?.label || stageValue;
      activeFilters.push(`Stages: ${stageLabel}`);
    }
    
    if (filterValues.status) {
      const statusLabel = filterConfig.status.find(s => s.value === filterValues.status)?.label || filterValues.status;
      activeFilters.push(`Status: ${statusLabel}`);
    }
    
    if (filterValues.budget) {
      const budgetLabel = filterConfig.budget.find(b => b.value === filterValues.budget)?.label || filterValues.budget;
      activeFilters.push(`Budget: ${budgetLabel}`);
    }

    if ((activeTab === "sources" || activeTab === "bulk") && apiStatusFilter) {
      activeFilters.push(
        `Lead Flow: ${
          apiStatusFilter === "connected" ? "Connected" : "Not connected"
        }`
      );
    }

    return activeFilters.length > 0 ? activeFilters.join(", ") : "No filters applied";
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
          {kpiError && (
            <div className="mb-3 sm:mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs sm:text-sm text-amber-800 flex items-center justify-between gap-3">
              <span>
                KPI stats not loaded: <span className="font-semibold">{kpiError}</span>
              </span>
              <button
                onClick={() => {
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  fetchLeadStats();
                }}
                className="shrink-0 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                aria-label="Retry KPI stats"
              >
                Retry
              </button>
            </div>
          )}
          {/* First Row - Always show first 4 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 mb-3 sm:mb-4 lg:mb-5">
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
          {kpiLoading && (
            <div className="text-xs sm:text-sm text-slate-500">Updating KPI stats…</div>
          )}
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
        values={filterValues}
        onChange={setFilterValues}
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          debouncedSearch(value);
        }}
        searchPlaceholder="Search by name or property id"
        itemCount={paginationMeta.total > 0 ? paginationMeta.total : filteredLeads.length}
        itemLabel="Lead"
        filterSummary={getFilterSummary()}
        showSummary={true}
        config={{
          dateRange: [
            { value: "", label: "Date Range" },
            { value: "today", label: "Today" },
            { value: "yesterday", label: "Yesterday" },
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
            { value: "quarter", label: "This Quarter" },
            { value: "year", label: "This Year" },
          ],
          status: [
            { value: "", label: "Status" },
            { value: "veryhot", label: "Very Hot" },
            { value: "hot", label: "Hot" },
            { value: "warm", label: "Warm" },
            { value: "cold", label: "Cold" },
          ],
          sources: [
            { value: "", label: "Sources" },
            { value: "magicbricks-com", label: "Magicbricks.com" },
            { value: "housing-com", label: "Housing.com" },
            { value: "booking-com", label: "Booking.com" },
            { value: "nobroker-com", label: "Nobroker.com" },
            { value: "99acres-com", label: "99acres.com" },
          ],
          budget: [
            { value: "", label: "By Budget" },
            { value: "20L-30L", label: "₹20L - ₹30L" },
            { value: "30L-40L", label: "₹30L - ₹40L" },
            { value: "40L-50L", label: "₹40L - ₹50L" },
            { value: "50L-60L", label: "₹50L - ₹60L" },
            { value: "60L+", label: "₹60L+" },
          ],
    project: [{ value: "", label: "By Project" }, ...projectFilterOptions],
          stages: [
            { value: "", label: "Stages" },
            { value: "property-visit", label: "Property Visit" },
            { value: "site-visit", label: "Site Visit" },
            { value: "follow-up", label: "Follow Up" },
          ],
        }}
      />

      {/* Tabs */}
      <div className="flex border-b border-[#E3E6F0] mb-4 sm:mb-5 lg:mb-6 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => {
            setActiveTab("qualified");
            setApiStatusFilter(null);
            setCurrentPage(1);
          }}
          className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === "qualified"
              ? "text-[var(--primary-base)] border-[var(--primary-base)]"
              : "text-[#718096] border-transparent"
          }`}
        >
          Qualified
        </button>
        <button
          onClick={() => {
            setActiveTab("sources");
            setApiStatusFilter(null);
            setCurrentPage(1);
          }}
          className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === "sources"
              ? "text-[var(--primary-base)] border-[var(--primary-base)]"
              : "text-[#718096] border-transparent"
          }`}
        >
          API leads
        </button>
        <button
          onClick={() => {
            setActiveTab("bulk");
            setApiStatusFilter(null);
            setCurrentPage(1);
          }}
          className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === "bulk"
              ? "text-[var(--primary-base)] border-[var(--primary-base)]"
              : "text-[#718096] border-transparent"
          }`}
        >
          Bulk data
        </button>
      </div>

      {/* Sub Tabs (mobile parity): Connected / Not connected */}
      {(activeTab === "sources" || activeTab === "bulk") && (
        <div className="mb-4 sm:mb-5 lg:mb-6 space-y-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => {
                setApiStatusFilter((prev) => (prev === "connected" ? null : "connected"));
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${
                apiStatusFilter === "connected"
                  ? "bg-[var(--primary-base)] border-[var(--primary-base)] text-white"
                  : "bg-white border-[#E3E6F0] text-[#718096] hover:bg-[#F9FAFB]"
              }`}
            >
              Connected
            </button>
            <button
              type="button"
              onClick={() => {
                setApiStatusFilter((prev) => (prev === "called" ? null : "called"));
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors border ${
                apiStatusFilter === "called"
                  ? "bg-[var(--primary-base)] border-[var(--primary-base)] text-white"
                  : "bg-white border-[#E3E6F0] text-[#718096] hover:bg-[#F9FAFB]"
              }`}
            >
              Not connected
            </button>
          </div>
          <p className="text-[11px] sm:text-xs text-[#667085]">
            Connected = backend status <span className="font-medium">qualified</span> only; use Not connected to view other pipeline states.
          </p>
        </div>
      )}

      {/* Mobile, Tablet & Small Desktop View - Cards (when table would scroll) */}
      <div className="xl:hidden space-y-3 sm:space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#EAECF0] p-6 sm:p-8 text-center text-sm text-[#667085]">
            No leads found
          </div>
        ) : (
          // Other tabs - Use DataCard component
          paginatedLeads.map((lead) => {
            const createdAt = typeof lead.createdAt === "string" 
              ? new Date(lead.createdAt) 
              : new Date(lead.createdAt);
            const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
            
            return (
              <DataCard
                key={lead.id}
                id={lead.id}
                name={lead.name}
                phone={lead.phone}
                email={lead.email}
                avatar={lead.avatar}
                budget={lead.budget}
                propertyName={lead.propertyName}
                sourceDetail={lead.sourceDetail}
                leadStatusLabel={
                  activeTab === "sources" || activeTab === "bulk"
                    ? formatPipelineLeadStatus(lead.leadStatus)
                    : undefined
                }
                timeAgo={timeAgo}
                location={lead.location}
                status={lead.status}
                source={lead.source}
                onClick={() => handleViewDetail(lead)}
                onCall={activeTab === "sources" || activeTab === "bulk" ? handleCall : undefined}
                onQualify={activeTab === "sources" || activeTab === "bulk" ? handleQualify : undefined}
                showActions={activeTab === "sources" || activeTab === "bulk"}
              />
            );
          })
        )}

        {/* Mobile Pagination */}
        {filteredLeads.length > 0 && totalPages > 1 && (
          <div className="bg-white rounded-lg border border-[#EAECF0] p-4 mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#667085]">
              <div className="text-xs sm:text-sm">
                Showing {rangeStart} - {rangeEnd} of {paginationMeta.total} leads
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
        <DataTable
        data={paginatedLeads}
        showMobileView={false}
        columns={
          activeTab === "sources" 
            ? [
                {
                  key: "name",
                  header: "Name & Phone",
                  className: "min-w-[160px] max-w-[200px]",
                  render: (lead) => (
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[var(--primary-base)]/15 text-[var(--primary-base)] font-semibold text-[11px] flex items-center justify-center">
                        {getLeadInitials(lead.name)}
                      </div>
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
                  key: "email",
                  header: "Email",
                  className: "min-w-[140px] max-w-[180px]",
                  render: (lead) => (
                    <span className="text-xs lg:text-sm text-[#344054] truncate block" title={lead.email}>
                      {lead.email || "—"}
                    </span>
                  ),
                },
                {
                  key: "propertyName",
                  header: "Property",
                  className: "min-w-[120px] max-w-[160px]",
                  render: (lead) => (
                    <span className="text-xs lg:text-sm font-semibold text-[#344054] truncate block">
                      {lead.propertyName}
                    </span>
                  ),
                },
                {
                  key: "sourceDetail",
                  header: "Listing / detail",
                  className: "min-w-[140px] max-w-[200px]",
                  render: (lead) => (
                    <span
                      className="text-xs lg:text-sm text-[#475467] truncate block"
                      title={lead.sourceDetail}
                    >
                      {lead.sourceDetail || "—"}
                    </span>
                  ),
                },
                {
                  key: "budget",
                  header: "Budget",
                  className: "min-w-[100px] max-w-[140px]",
                  render: (lead) => (
                    <span className="text-xs lg:text-sm font-semibold text-[var(--primary-base)] whitespace-nowrap truncate block">
                      {lead.budget || "—"}
                    </span>
                  ),
                },
                {
                  key: "time",
                  header: "Lead time",
                  className: "min-w-[100px] max-w-[130px]",
                  render: (lead) => {
                    const createdAt = typeof lead.createdAt === "string" 
                      ? new Date(lead.createdAt) 
                      : new Date(lead.createdAt);
                    const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
                    return (
                      <span className="text-xs lg:text-sm text-[#667085] truncate block">{timeAgo}</span>
                    );
                  },
                },
                {
                  key: "location",
                  header: "Location",
                  className: "min-w-[90px] max-w-[120px]",
                  render: (lead) => (
                    <span className="text-xs lg:text-sm text-[#344054] truncate block">{lead.location || "—"}</span>
                  ),
                },
                {
                  key: "leadStatus",
                  header: "Pipeline",
                  className: "min-w-[90px] max-w-[120px]",
                  render: (lead) => (
                    <span className="text-xs lg:text-sm text-[#344054] truncate block">
                      {formatPipelineLeadStatus(lead.leadStatus)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Temp",
                  className: "min-w-[80px] max-w-[100px]",
                  render: (lead) => <StatusBadge status={lead.status} />,
                },
                {
                  key: "source",
                  header: "Source",
                  className: "min-w-[100px] max-w-[140px]",
                  render: (lead) => <SourceBadge source={lead.source} />,
                },
              ]
            : [
                {
                  key: "name",
                  header: "Name & Phone",
                  className: "min-w-[180px] max-w-[220px]",
                  render: (lead) => (
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[var(--primary-base)]/15 text-[var(--primary-base)] font-semibold text-[11px] flex items-center justify-center">
                        {getLeadInitials(lead.name)}
                      </div>
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
                  className: "min-w-[110px] max-w-[140px]",
                  render: (lead) => (
                    <span className="text-xs lg:text-sm font-semibold text-[var(--primary-base)] whitespace-nowrap">
                      {lead.budget}
                    </span>
                  ),
                },
                {
                  key: "propertyName",
                  header: "Prop Name & Time",
                  className: "min-w-[150px] max-w-[200px]",
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
                  className: "min-w-[100px] max-w-[140px]",
                  render: (lead) => (
                    <span className="text-xs lg:text-sm text-[#344054] truncate block">{lead.location}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  className: "min-w-[90px] max-w-[120px]",
                  render: (lead) => <StatusBadge status={lead.status} />,
                },
                {
                  key: "source",
                  header: "Sources",
                  className: "min-w-[120px] max-w-[160px]",
                  render: (lead) => <SourceBadge source={lead.source} />,
                },
              ]
        }
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
        totalItems={paginationMeta.total > 0 ? paginationMeta.total : filteredLeads.length}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 20, 50]}
        onPageChange={(page) => setCurrentPage(page)}
        onItemsPerPageChange={(value) => {
          setItemsPerPage(value);
          setCurrentPage(1);
        }}
        renderActions={(lead) => {
          if (activeTab === "bulk") {
            return (
              <div className="flex items-center gap-2">
                <button
                  className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
                  aria-label={`Connect ${lead.name}`}
                  onClick={() =>
                    lead.leadStatus === "qualified"
                      ? handleViewDetail(lead)
                      : handleQualify(lead.id)
                  }
                >
                  Connect
                </button>
                <button
                  className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
                  aria-label={`Call ${lead.name}`}
                  onClick={() => handleCall(lead.id)}
                >
                  Call Now
                </button>
              </div>
            );
          }

          if (activeTab === "connected") {
            return (
              <div className="flex items-center gap-2">
                <button
                  className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
                  aria-label={`Open communication for ${lead.name}`}
                  onClick={() => handleViewDetail(lead)}
                >
                  Connected
                </button>
                <button
                  className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
                  aria-label={`Call ${lead.name}`}
                  onClick={() => handleCall(lead.id)}
                >
                  Call Now
                </button>
              </div>
            );
          }

          if (activeTab === "sources") {
            return (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
                  aria-label={
                    lead.leadStatus === "qualified"
                      ? `Open connected for ${lead.name}`
                      : `Connect ${lead.name}`
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    lead.leadStatus === "qualified"
                      ? handleViewDetail(lead)
                      : handleQualify(lead.id);
                  }}
                >
                  {lead.leadStatus === "qualified" ? "Connected" : "Connect"}
                </button>
                <button
                  type="button"
                  className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
                  aria-label={`Call ${lead.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCall(lead.id);
                  }}
                >
                  Call
                </button>
              </div>
            );
          }
          
          return (
            <button
              className="px-2.5 md:px-3 lg:px-3.5 py-1.5 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors whitespace-nowrap"
              aria-label={`View details for ${lead.name}`}
              onClick={() => handleViewDetail(lead)}
            >
              <span className="hidden lg:inline">View Detail</span>
              <span className="lg:hidden">View</span>
            </button>
          );
        }}
      />
      {showQualifyRejectPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold text-[#111827] mb-2">
              What do you want to do?
            </h3>
            <p className="text-xs text-[#6B7280] mb-4">
              {leads.find((l) => l.id === qualifyRejectLeadId)?.name ||
                leads.find((l) => l.id === qualifyRejectLeadId)?.phone ||
                "Lead"}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                className="flex-1 px-3 py-2 bg-[var(--primary-base)] text-white text-xs font-medium rounded-md hover:bg-[var(--primary-hover)] transition-colors"
                onClick={handleQualifyRejectPopupQualify}
              >
                Qualify lead
              </button>
              <button
                className="flex-1 px-3 py-2 bg-slate-100 text-[#111827] text-xs font-medium rounded-md hover:bg-slate-200 transition-colors border border-red-200"
                onClick={handleQualifyRejectPopupReject}
              >
                Reject lead
              </button>
            </div>
            <button
              className="mt-3 w-full text-[11px] text-[#6B7280] hover:text-[#111827] text-center"
              onClick={handleQualifyRejectPopupClose}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
