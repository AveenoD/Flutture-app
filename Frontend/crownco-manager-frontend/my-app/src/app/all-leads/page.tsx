"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Bell,
  Heart,
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  UserPlus,
} from "lucide-react";
import KPICard from "@/components/ui/kpiCard";
import { Filter, type FilterConfig, type FilterValues } from "@/components/ui/fillter";
import {
  listLeads,
  type LeadResponse,
} from "@/lib/leadsApi";
import {
  importLeadsFromCsv,
  type ImportDataResponse,
  type ImportedLeadInfo,
  assignUsersToImportedData,
} from "@/lib/importedDataApi";
import { listUsers, type UserListItem } from "@/lib/usersApi";

type MainTab = "caller" | "sales";
type SubTab = "qualified" | "sources" | "bulk-data";
type LeadStatus = "very-hot" | "hot" | "warm" | "cold";
type SourceType = "assigned" | "magicbricks" | "housing" | "booking" | "nobroker" | "walking" | "imported";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  budget: string;
  propertyName: string;
  timeAgo: string;
  location: string;
  status: LeadStatus;
  source: string;
  sourceType: SourceType;
  stage?: string;
  assignedToUserType?: string | null;
  salesUserId?: string | null;
  createdAt: string;
  projectSlug: string;
}

const defaultFilterValues: FilterValues = {
  newLeads: false,
  dateRange: "",
  status: "",
  sources: "",
  budget: "",
  project: "",
  stages: "",
  department: "",
  employee: "",
};

const SOURCE_LABELS: Record<SourceType, string> = {
  assigned: "Assigned",
  magicbricks: "Magicbricks.com",
  housing: "Housing.com",
  booking: "Booking.com",
  nobroker: "Nobroker.com",
  walking: "Walking",
  imported: "Imported",
};

const STAGE_LABELS: Record<string, string> = {
  qualification: "Qualification",
  communication: "Communication",
  site_visit: "Site Visit",
  negotiation: "Negotiation",
  booking: "Booking",
};

function normalizeStatus(value?: string | null): LeadStatus {
  const v = (value || "").toLowerCase().replace(/-/g, "");
  if (v === "veryhot") return "very-hot";
  if (v === "hot") return "hot";
  if (v === "warm") return "warm";
  return "cold";
}

function slugify(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCurrency(min?: number | null, max?: number | null) {
  if (min == null && max == null) return "N/A";
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`;
  if (min != null) return `${fmt(min)}+`;
  return `Up to ${fmt(max as number)}`;
}

function formatRelativeTime(iso?: string | null) {
  if (!iso) return "N/A";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "N/A";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

function getSourceType(source?: string | null, sourceDetail?: string | null): SourceType {
  const raw = `${source || ""} ${sourceDetail || ""}`.toLowerCase();
  if (raw.includes("magic") || raw.includes("99acres")) return "magicbricks";
  if (raw.includes("housing")) return "housing";
  if (raw.includes("booking")) return "booking";
  if (raw.includes("nobroker")) return "nobroker";
  if (raw.includes("walk")) return "walking";
  if (raw.includes("import")) return "imported";
  return "assigned";
}

function toLeadRow(lead: LeadResponse): LeadRow {
  const projectSlug = slugify(lead.project_title);
  const sourceType = getSourceType(lead.source, lead.source_detail);
  const sourceLabel = lead.source?.trim() || SOURCE_LABELS[sourceType];
  const location = [lead.city, lead.state].filter(Boolean).join(", ") || "N/A";

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    budgetMin: lead.budget_min,
    budgetMax: lead.budget_max,
    budget: formatCurrency(lead.budget_min, lead.budget_max),
    propertyName: lead.project_title || "No project",
    timeAgo: formatRelativeTime(lead.created_at),
    location,
    status: normalizeStatus(lead.lead_temperature),
    source: sourceLabel,
    sourceType,
    stage: lead.stage || undefined,
    assignedToUserType: lead.assigned_to_user_type || null,
    salesUserId: lead.sales_user_id || null,
    createdAt: lead.created_at,
    projectSlug,
  };
}

function getStatusClass(status: LeadStatus) {
  switch (status) {
    case "very-hot":
      return "bg-red-100 text-red-800";
    case "hot":
      return "bg-yellow-100 text-yellow-800";
    case "warm":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

function getSourceClass(sourceType: SourceType) {
  switch (sourceType) {
    case "magicbricks":
      return "bg-green-100 text-green-800";
    case "housing":
      return "bg-orange-100 text-orange-800";
    case "booking":
      return "bg-blue-100 text-blue-800";
    case "nobroker":
      return "bg-purple-100 text-purple-800";
    case "walking":
      return "bg-gray-100 text-gray-700";
    case "imported":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function asArray(value: string | string[] | undefined) {
  if (!value) return [] as string[];
  return Array.isArray(value) ? value : [value];
}

function matchesDateRange(createdAt: string, range: string) {
  if (!range) return true;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return true;

  const now = new Date();
  const start = new Date(now);

  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0);
      return date >= start;
    case "week":
      start.setDate(now.getDate() - 7);
      return date >= start;
    case "month":
      start.setMonth(now.getMonth() - 1);
      return date >= start;
    case "quarter":
      start.setMonth(now.getMonth() - 3);
      return date >= start;
    case "year":
      start.setFullYear(now.getFullYear() - 1);
      return date >= start;
    default:
      return true;
  }
}

function matchesBudget(budget: string, min?: number | null, max?: number | null) {
  if (!budget) return true;
  const lower = min ?? 0;
  const upper = max ?? lower;

  switch (budget) {
    case "20L-30L":
      return lower <= 3000000 && upper >= 2000000;
    case "30L-40L":
      return lower <= 4000000 && upper >= 3000000;
    case "40L-50L":
      return lower <= 5000000 && upper >= 4000000;
    case "50L-60L":
      return lower <= 6000000 && upper >= 5000000;
    case "60L+":
      return upper >= 6000000 || lower >= 6000000;
    default:
      return true;
  }
}

function formatProjectOptionLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AllLeadsPage() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("caller");
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("qualified");
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValues, setFilterValues] = useState<FilterValues>(defaultFilterValues);
  const [callerLeads, setCallerLeads] = useState<LeadRow[]>([]);
  const [salesLeads, setSalesLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [bulkImportTitle, setBulkImportTitle] = useState("");
  const [bulkImportDescription, setBulkImportDescription] = useState("");
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportError, setBulkImportError] = useState("");
  const [bulkImportResult, setBulkImportResult] = useState<ImportDataResponse | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignSuccessMessage, setAssignSuccessMessage] = useState("");

  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const callerResult = await Promise.allSettled([listLeads({ page: 1, limit: 200 })]);

    if (callerResult[0].status === "fulfilled") {
      const rows = (callerResult[0].value.leads || []).map(toLeadRow);
      setCallerLeads(rows);
      setSalesLeads(
        rows.filter(
          (lead) => lead.assignedToUserType === "sales" || Boolean(lead.salesUserId)
        )
      );
    } else {
      setCallerLeads([]);
      setSalesLeads([]);
      setError(
        callerResult[0].reason instanceof Error
          ? callerResult[0].reason.message
          : "Failed to load leads"
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const baseLeads = activeMainTab === "sales" ? salesLeads : callerLeads;

  const handleBulkImportSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setBulkImportError("");
      setBulkImportResult(null);

      if (!bulkImportTitle.trim()) {
        setBulkImportError("Import title is required.");
        return;
      }

      if (!bulkImportFile) {
        setBulkImportError("Please select a CSV file.");
        return;
      }

      setBulkImportLoading(true);
      try {
        const result = await importLeadsFromCsv({
          title: bulkImportTitle.trim(),
          description: bulkImportDescription.trim() || undefined,
          file: bulkImportFile,
        });
        setBulkImportResult(result);
        setBulkImportTitle("");
        setBulkImportDescription("");
        setBulkImportFile(null);
        await loadLeads();
      } catch (err) {
        setBulkImportError(
          err instanceof Error ? err.message : "Failed to import leads"
        );
      } finally {
        setBulkImportLoading(false);
      }
    },
    [bulkImportDescription, bulkImportFile, bulkImportTitle, loadLeads]
  );

  const handleAssignImportedLeads = useCallback(
    async () => {
      if (!bulkImportResult?.imported_data_id) {
        setAssignError("No recent import found. Please import a CSV first.");
        return;
      }

      setAssignError("");
      setAssignSuccessMessage("");
      setAssignLoading(true);

      try {
        const usersResponse = await listUsers({ page: 1, limit: 200, role: "presales" });
        const presalesUsers: UserListItem[] = (usersResponse.users || []).filter(
          (user) => user.role === "presales"
        );

        if (presalesUsers.length === 0) {
          setAssignError("No presales users found to assign leads.");
          return;
        }

        const userIds = presalesUsers.map((user) => user.id);
        const result = await assignUsersToImportedData(bulkImportResult.imported_data_id, userIds);

        setAssignSuccessMessage(
          `Assigned ${result.leads_assigned} leads across ${result.assigned_users_count} presales users.`
        );

        await loadLeads();
      } catch (err) {
        setAssignError(
          err instanceof Error ? err.message : "Failed to assign imported leads to users"
        );
      } finally {
        setAssignLoading(false);
      }
    },
    [bulkImportResult, loadLeads]
  );

  const filterConfig: FilterConfig = useMemo(() => {
    const projectMap = new Map<string, string>();
    const stageMap = new Map<string, string>();

    baseLeads.forEach((lead) => {
      if (lead.projectSlug && lead.propertyName !== "No project") {
        projectMap.set(lead.projectSlug, lead.propertyName);
      }
      if (lead.stage) {
        stageMap.set(slugify(lead.stage), lead.stage);
      }
    });

    const uniqueSourceTypes = Array.from(new Set(baseLeads.map((lead) => lead.sourceType)));

    return {
      dateRange: [
        { value: "", label: "Date Range" },
        { value: "today", label: "Today" },
        { value: "week", label: "This Week" },
        { value: "month", label: "This Month" },
        { value: "quarter", label: "This Quarter" },
        { value: "year", label: "This Year" },
      ],
      status: [
        { value: "", label: "Status" },
        { value: "very-hot", label: "Very Hot" },
        { value: "hot", label: "Hot" },
        { value: "warm", label: "Warm" },
        { value: "cold", label: "Cold" },
      ],
      sources: [
        { value: "", label: "Sources" },
        ...uniqueSourceTypes.map((type) => ({
          value: type,
          label: SOURCE_LABELS[type],
        })),
      ],
      budget: [
        { value: "", label: "By Budget" },
        { value: "20L-30L", label: "₹20L - ₹30L" },
        { value: "30L-40L", label: "₹30L - ₹40L" },
        { value: "40L-50L", label: "₹40L - ₹50L" },
        { value: "50L-60L", label: "₹50L - ₹60L" },
        { value: "60L+", label: "₹60L+" },
      ],
      project: [
        { value: "", label: "By Project" },
        ...Array.from(projectMap.entries()).map(([value, label]) => ({ value, label })),
      ],
      stages: [
        { value: "", label: "Stages" },
        ...Array.from(stageMap.entries()).map(([value, label]) => ({
          value,
          label: STAGE_LABELS[label] || formatProjectOptionLabel(label),
        })),
      ],
    };
  }, [baseLeads]);

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const statusFilter = asArray(filterValues.status).map((value) => value.toLowerCase());
    const stageFilter = asArray(filterValues.stages).map((value) => value.toLowerCase());

    return baseLeads.filter((lead) => {
      const matchesSearch =
        !query ||
        [lead.name, lead.phone, lead.propertyName, lead.location, lead.source, lead.stage || ""]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter.length === 0 || statusFilter.includes(lead.status.toLowerCase());

      const matchesSource = !filterValues.sources || lead.sourceType === filterValues.sources;
      const matchesProject = !filterValues.project || lead.projectSlug === filterValues.project;
      const matchesStage =
        stageFilter.length === 0 || stageFilter.includes(slugify(lead.stage).toLowerCase());
      const matchesDate = matchesDateRange(lead.createdAt, filterValues.dateRange);
      const matchesBudgetBand = matchesBudget(
        filterValues.budget,
        lead.budgetMin,
        lead.budgetMax
      );
      const matchesNewLeads =
        !filterValues.newLeads || matchesDateRange(lead.createdAt, "today");

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSource &&
        matchesProject &&
        matchesStage &&
        matchesDate &&
        matchesBudgetBand &&
        matchesNewLeads
      );
    });
  }, [baseLeads, searchQuery, filterValues]);

  const displayLeads = useMemo(() => {
    if (activeSubTab === "bulk-data") {
      return filteredLeads.filter((lead) => lead.sourceType === "imported");
    }
    return filteredLeads;
  }, [activeSubTab, filteredLeads]);

  const totalPages = Math.max(1, Math.ceil(displayLeads.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedLeads = displayLeads.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const stats = useMemo(() => {
    const todayCount = baseLeads.filter((lead) => matchesDateRange(lead.createdAt, "today")).length;
    const monthCount = baseLeads.filter((lead) => matchesDateRange(lead.createdAt, "month")).length;
    const veryHotCount = baseLeads.filter((lead) => lead.status === "very-hot").length;
    const assignedCount = baseLeads.filter((lead) => lead.sourceType === "assigned").length;
    const withProjectsCount = baseLeads.filter((lead) => Boolean(lead.propertyName) && lead.propertyName !== "No project").length;

    return {
      todayCount,
      monthCount,
      veryHotCount,
      assignedCount,
      withProjectsCount,
    };
  }, [baseLeads]);

  const handleMainTabChange = (tab: MainTab) => {
    setActiveMainTab(tab);
      setActiveSubTab(tab === "sales" ? "qualified" : activeSubTab);
    setCurrentPage(1);
    setSearchQuery("");
      setFilterValues(defaultFilterValues);
  };

  const handleSubTabChange = (tab: SubTab) => {
    setActiveSubTab(tab);
    setCurrentPage(1);
    setSearchQuery("");
  };

  const handleFilterChange = (values: FilterValues) => {
    setFilterValues(values);
    setCurrentPage(1);
  };

  const handleFilterClear = () => {
    setFilterValues(defaultFilterValues);
    setCurrentPage(1);
  };

  const formatActiveSubTabLabel = () => {
    switch (activeSubTab) {
      case "sources":
        return "Sources";
      case "bulk-data":
        return "Bulk Data";
      default:
        return "Qualified";
    }
  };

  const renderLeadCard = (lead: LeadRow) => (
    <div
      key={lead.id}
      className="bg-white border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-4 gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-full bg-[var(--surface-neutral)] flex items-center justify-center text-sm font-semibold text-[var(--text-primary)] flex-shrink-0">
            {getInitials(lead.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-[var(--text-primary)] mb-0.5 truncate">
              {lead.name}
            </div>
            <div className="text-sm text-[var(--text-secondary)] truncate">
              {lead.propertyName}
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${getStatusClass(lead.status)}`}>
          {lead.status === "very-hot"
            ? "• Very Hot"
            : lead.status === "hot"
              ? "• Hot"
              : lead.status === "warm"
                ? "• Warm"
                : "• Cold"}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <Phone size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
          <span className="truncate">{lead.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <MapPin size={16} className="text-[var(--text-secondary)] flex-shrink-0" />
          <span className="truncate">{lead.location}</span>
        </div>
      </div>

      {activeMainTab !== "sales" && activeSubTab !== "sources" && (
        <div className="mb-4">
          <div className="text-xs text-[var(--text-secondary)] mb-1">Budget</div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{lead.budget}</div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {activeSubTab !== "bulk-data" && (
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getSourceClass(lead.sourceType)}`}>
              {lead.source}
            </span>
          )}
          {activeSubTab === "bulk-data" && (
            <span className="px-3 py-1.5 bg-[var(--surface-neutral)] rounded-full text-xs font-semibold text-[var(--text-primary)]">
              Imported
            </span>
          )}
          {activeSubTab !== "sources" && (
            <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">{lead.timeAgo}</span>
          )}
        </div>
        <Link
          href={
            activeMainTab === "sales"
              ? `/all-leads/${lead.id}?scrollTo=quotations`
              : `/all-leads/${lead.id}`
          }
          className="w-8 h-8 rounded-full bg-[var(--surface-neutral)] flex items-center justify-center hover:bg-[var(--hover-bg)] transition-colors flex-shrink-0"
        >
          <ArrowRight size={16} className="text-[var(--text-primary)]" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[var(--surface-neutral)] min-h-full">
      <div className="block sm:hidden mb-6">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-[280px]">
            <KPICard icon={<UserPlus size={20} className="text-[var(--success)]" />} trend="real data" trendUp value={String(stats.todayCount)} label="New Leads Today" />
          </div>
          <div className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-[280px]">
            <KPICard icon={<CalendarCheck size={20} className="text-[var(--primary-base)]" />} trend="real data" trendUp value={String(stats.monthCount)} label="Lead This Month" />
          </div>
          <div className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-[280px]">
            <KPICard icon={<Bell size={20} className="text-[var(--warning)]" />} trend="real data" trendUp value={String(stats.veryHotCount)} label="Very Hot Leads" />
          </div>
          <div className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-[280px]">
            <KPICard icon={<Heart size={20} className="text-[var(--error)]" />} trend="real data" trendUp value={String(stats.withProjectsCount)} label="Leads With Projects" />
          </div>
          <div className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-[280px]">
            <KPICard icon={<Users size={20} className="text-[var(--primary-base)]" />} trend="real data" trendUp value={String(stats.assignedCount)} label="Assigned Leads" />
          </div>
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <KPICard icon={<UserPlus size={20} className="text-[var(--success)]" />} trend="real data" trendUp value={String(stats.todayCount)} label="New Leads Today" />
        <KPICard icon={<CalendarCheck size={20} className="text-[var(--primary-base)]" />} trend="real data" trendUp value={String(stats.monthCount)} label="Lead This Month" />
        <KPICard icon={<Bell size={20} className="text-[var(--warning)]" />} trend="real data" trendUp value={String(stats.veryHotCount)} label="Very Hot Leads" />
        <KPICard icon={<Heart size={20} className="text-[var(--error)]" />} trend="real data" trendUp value={String(stats.withProjectsCount)} label="Leads With Projects" />
        <KPICard icon={<Users size={20} className="text-[var(--primary-base)]" />} trend="real data" trendUp value={String(stats.assignedCount)} label="Assigned Leads" />
      </div>

      <div className="bg-[var(--background)] p-4 sm:p-5 rounded-xl border border-[var(--border-color)] mb-4">
        <Filter
          config={filterConfig}
          values={filterValues}
          onChange={handleFilterChange}
          onClear={handleFilterClear}
          itemCount={displayLeads.length}
          itemLabel="Lead"
        />
      </div>

      <div className="mb-4">
        <div className="flex gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 md:mb-7 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => handleMainTabChange("caller")}
            className={`relative pb-2 px-2 sm:px-0 text-xs sm:text-sm md:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeMainTab === "caller" ? "text-[var(--primary-base)]" : "text-[var(--text-secondary)]"}`}
          >
            Caller
            {activeMainTab === "caller" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-base)]" />}
          </button>
          <button
            onClick={() => handleMainTabChange("sales")}
            className={`relative pb-2 px-2 sm:px-0 text-xs sm:text-sm md:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeMainTab === "sales" ? "text-[var(--primary-base)]" : "text-[var(--text-secondary)]"}`}
          >
            Sales
            {activeMainTab === "sales" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-base)]" />}
          </button>
        </div>

        {activeMainTab === "caller" && (
          <div className="flex flex-wrap gap-2 sm:gap-3 md:gap-5 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => handleSubTabChange("qualified")}
              className={`relative pb-2 px-2 sm:px-0 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeSubTab === "qualified" ? "text-[var(--primary-base)]" : "text-[var(--text-secondary)]"}`}
            >
              Qualified
              {activeSubTab === "qualified" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-base)]" />}
            </button>
            <button
              onClick={() => handleSubTabChange("sources")}
              className={`relative pb-2 px-2 sm:px-0 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeSubTab === "sources" ? "text-[var(--primary-base)]" : "text-[var(--text-secondary)]"}`}
            >
              Sources
              {activeSubTab === "sources" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-base)]" />}
            </button>
            <button
              onClick={() => handleSubTabChange("bulk-data")}
              className={`relative pb-2 px-2 sm:px-0 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${activeSubTab === "bulk-data" ? "text-[var(--primary-base)]" : "text-[var(--text-secondary)]"}`}
            >
              Bulk Data
              {activeSubTab === "bulk-data" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary-base)]" />}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search leads"
            className="w-full rounded-lg border border-[var(--border-color)] bg-white py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span>{formatActiveSubTabLabel()}</span>
          <button
            type="button"
            onClick={loadLeads}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-dark)] hover:bg-[var(--hover-bg)]"
          >
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-base)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            <Plus size={14} />
            Add Lead
          </button>
        </div>
      </div>

      {activeSubTab === "bulk-data" && (
        <div className="mb-6 rounded-2xl border border-[var(--border-color)] bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-dark)]">Import Leads</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Upload a CSV to create a bulk lead batch. Imported leads will appear below with the
                source marked as imported.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-[var(--surface-neutral)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              CSV upload
            </span>
          </div>

          <form onSubmit={handleBulkImportSubmit} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-[var(--text-primary)]">Batch Title</span>
              <input
                type="text"
                value={bulkImportTitle}
                onChange={(e) => setBulkImportTitle(e.target.value)}
                placeholder="e.g. July city walk-ins"
                className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-[var(--text-primary)]">Description</span>
              <input
                type="text"
                value={bulkImportDescription}
                onChange={(e) => setBulkImportDescription(e.target.value)}
                placeholder="Optional notes about this import"
                className="w-full rounded-lg border border-[var(--border-color)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary-base)] focus:ring-2 focus:ring-[var(--primary-base)]/20"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-sm font-medium text-[var(--text-primary)]">CSV File</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setBulkImportFile(e.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--primary-selected)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--primary-base)]"
              />
            </label>
            <div className="lg:col-span-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[var(--text-secondary)]">
                Expected columns: `name`, `phone`, `email`, `city`, `budget_min`, `budget_max`,
                `lead_temperature`, `state`
              </div>
              <button
                type="submit"
                disabled={bulkImportLoading}
                className="inline-flex items-center justify-center rounded-lg bg-[var(--primary-base)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkImportLoading ? "Importing..." : "Import CSV"}
              </button>
            </div>
          </form>

          {bulkImportError && (
            <div className="mt-4 rounded-lg bg-[var(--surface-error)] px-4 py-3 text-sm text-[var(--error)]">
              {bulkImportError}
            </div>
          )}

          {assignError && (
            <div className="mt-3 rounded-lg bg-[var(--surface-error)] px-4 py-3 text-sm text-[var(--error)]">
              {assignError}
            </div>
          )}

          {assignSuccessMessage && (
            <div className="mt-3 rounded-lg bg-[var(--surface-success)] px-4 py-3 text-sm text-[var(--success)]">
              {assignSuccessMessage}
            </div>
          )}

          {bulkImportResult && (
            <div className="mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-neutral)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-semibold text-[var(--text-dark)]">{bulkImportResult.title}</h4>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Imported Data ID: {bulkImportResult.imported_data_id}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs items-center">
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-[var(--text-primary)]">
                    Total Rows: {bulkImportResult.total_rows}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-[var(--success)]">
                    Successful: {bulkImportResult.successful}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 font-medium text-[var(--error)]">
                    Failed: {bulkImportResult.failed}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleAssignImportedLeads()}
                    disabled={assignLoading}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--primary-base)] px-3 py-1 font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {assignLoading ? "Assigning..." : "Assign to Presales"}
                  </button>
                </div>
              </div>

              {bulkImportResult.errors && bulkImportResult.errors.length > 0 && (
                <div className="mt-4 rounded-lg bg-white p-3 text-sm text-[var(--text-primary)]">
                  <div className="mb-2 font-medium text-[var(--text-dark)]">Import errors</div>
                  <ul className="list-disc space-y-1 pl-5">
                    {bulkImportResult.errors.map((message, index) => (
                      <li key={`${message}-${index}`}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {bulkImportResult.leads_created && bulkImportResult.leads_created.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 font-medium text-[var(--text-dark)]">Created Leads</div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {bulkImportResult.leads_created.map((lead: ImportedLeadInfo) => (
                      <div key={lead.lead_id} className="rounded-lg bg-white px-3 py-2 text-sm">
                        <div className="font-medium text-[var(--text-dark)]">{lead.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{lead.phone}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
        {isLoading ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 text-sm text-[var(--text-secondary)]">
            Loading leads...
          </div>
        ) : paginatedLeads.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 text-sm text-[var(--text-secondary)]">
            {activeSubTab === "bulk-data"
              ? "No imported leads yet. Upload a CSV above to begin."
              : "No leads found."}
          </div>
        ) : (
          paginatedLeads.map((lead) => renderLeadCard(lead))
        )}
      </div>

      <div className="hidden md:block mb-6 overflow-hidden rounded-xl border border-[var(--border-color)] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-[var(--surface-neutral)] text-left text-xs uppercase tracking-wide text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-3">Name & Phone</th>
                {activeMainTab !== "sales" && activeSubTab !== "sources" && <th className="px-4 py-3">Budget</th>}
                {activeMainTab !== "sales" && activeSubTab === "sources" ? <th className="px-4 py-3">Property Name</th> : <th className="px-4 py-3">Property</th>}
                {activeMainTab !== "sales" && activeSubTab === "sources" ? <th className="px-4 py-3">Time</th> : <th className="px-4 py-3">Time</th>}
                <th className="px-4 py-3">Location</th>
                {activeMainTab !== "sales" && <th className="px-4 py-3">Status</th>}
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeMainTab !== "sales" ? (activeSubTab !== "sources" ? 8 : 7) : 6}
                    className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]"
                  >
                    {activeSubTab === "bulk-data"
                      ? "No imported leads yet. Upload a CSV above to begin."
                      : "No leads found."}
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-[var(--border-color)] align-top hover:bg-[var(--hover-bg)]/30">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--surface-neutral)] flex items-center justify-center text-sm font-semibold text-[var(--text-primary)] flex-shrink-0">
                          {getInitials(lead.name)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[var(--text-primary)]">{lead.name}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{lead.phone}</div>
                        </div>
                      </div>
                    </td>
                    {activeMainTab !== "sales" && activeSubTab !== "sources" && (
                      <td className="px-4 py-4 text-sm font-medium text-[var(--text-primary)]">{lead.budget}</td>
                    )}
                    <td className="px-4 py-4 text-sm text-[var(--text-primary)]">{lead.propertyName}</td>
                    <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">{lead.timeAgo}</td>
                    <td className="px-4 py-4 text-sm text-[var(--text-primary)]">{lead.location}</td>
                    {activeMainTab !== "sales" && (
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusClass(lead.status)}`}>
                          {lead.status === "very-hot" ? "Very Hot" : lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${getSourceClass(lead.sourceType)}`}>
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {activeSubTab === "sources" ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--primary-base)] bg-[var(--primary-selected)] px-3 py-1.5 text-xs font-medium text-[var(--primary-base)] hover:bg-[var(--primary-base)] hover:text-white transition-colors"
                        >
                          <Phone size={14} /> Call Now
                        </button>
                      ) : (
                        <Link
                          href={
                            activeMainTab === "sales"
                              ? `/all-leads/${lead.id}?scrollTo=quotations`
                              : `/all-leads/${lead.id}`
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--primary-base)] bg-[var(--primary-selected)] px-3 py-1.5 text-xs font-medium text-[var(--primary-base)] hover:bg-[var(--primary-base)] hover:text-white transition-colors"
                        >
                          <ChevronsUpDown size={14} /> View Detail
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-col sm:flex-row mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-[var(--text-secondary)]">Rows Per Page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 border border-[var(--border-color)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
          {displayLeads.length === 0 ? 0 : startIndex + 1} - {Math.min(endIndex, displayLeads.length)} of {displayLeads.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-[var(--border-color)] rounded-md hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} className="text-[var(--text-primary)]" />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-[var(--border-color)] rounded-md hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} className="text-[var(--text-primary)]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
