"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "phosphor-react";
import { KPICard } from "../../../../components/ui/kpi";
import { ProjectCard } from "../../../../components/ui/card/projectCard";
import { AmenityCard } from "../../../../components/ui/card/aminityCard";
import { PieChart } from "../../../../components/ui/pieChart";
import { DownloadCard } from "../../../../components/ui/card/downloadCard";
import {
  fetchProjectStats,
  formatStatInt,
  type ProjectStatsApi,
} from "../../../../lib/projectDetailStats";
import {
  clientUnitFiltersToQuery,
  EMPTY_PROJECT_UNIT_FILTERS,
  fetchAllProjectUnits,
  fetchProjectById,
  formatAreaType,
  formatPossessionDate,
  galleryImagesFromProject,
  mapApiUnitStatus,
  pickHeroImage,
  projectToCardProps,
  videosFromProject,
  type ClientUnitFiltersForm,
  type ProjectDetailApi,
  type UiUnitKind,
} from "../../../../lib/projectDetailApi";
import { toast } from "sonner";

interface UnitRow {
  id: string;
  displayName: string;
  status: UiUnitKind;
}

function isRemoteUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

const UNIT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any" },
  { value: "flat", label: "Flat" },
  { value: "penthouse", label: "Penthouse" },
  { value: "plot", label: "Plot" },
  { value: "shop", label: "Shop" },
  { value: "row_house", label: "Row house" },
  { value: "bungalow", label: "Bungalow" },
  { value: "mansion", label: "Mansion" },
  { value: "haveli", label: "Haveli" },
];

const UNIT_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Any" },
  { value: "available", label: "Available" },
  { value: "under_negotiation", label: "Under negotiation" },
  { value: "booked", label: "Booked" },
  { value: "unavailable", label: "Unavailable" },
  { value: "not_for_sale", label: "Not for sale" },
];

const leadSourcesData = [
  { name: "Booking.com", value: 25, color: "var(--primary-base)" }, // Blue - Row 1, Left
  { name: "99acres.com", value: 20, color: "var(--secondary-base)" }, // Darker blue/reddish - Row 1, Right
  { name: "Magicbrick.com", value: 10, color: "var(--success)" }, // Green - Row 2, Left
  { name: "Nobroker.com", value: 20, color: "var(--purple)" }, // Purple - Row 2, Right
  { name: "Housing.com", value: 15, color: "var(--warning)" }, // Orange - Row 3, Left
  { name: "Manual", value: 10, color: "var(--disabled-text)" }, // Grey - Row 3, Right
];

export default function ProjectInventoryDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId")?.trim() ?? "";

  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState<ProjectStatsApi | null>(null);

  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDetailApi | null>(null);

  const [unitRows, setUnitRows] = useState<UnitRow[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const [unitFiltersOpen, setUnitFiltersOpen] = useState(false);
  const [unitFilterDraft, setUnitFilterDraft] =
    useState<ClientUnitFiltersForm>(EMPTY_PROJECT_UNIT_FILTERS);
  const [unitFilterApplied, setUnitFilterApplied] =
    useState<ClientUnitFiltersForm>(EMPTY_PROJECT_UNIT_FILTERS);

  const unitFilterAppliedKey = useMemo(
    () => JSON.stringify(unitFilterApplied),
    [unitFilterApplied]
  );

  const hasActiveUnitFilters = useMemo(
    () => clientUnitFiltersToQuery(unitFilterApplied) != null,
    [unitFilterApplied]
  );

  useEffect(() => {
    setSelectedUnits(new Set());
    setUnitFilterDraft(EMPTY_PROJECT_UNIT_FILTERS);
    setUnitFilterApplied(EMPTY_PROJECT_UNIT_FILTERS);
    setUnitFiltersOpen(false);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setUnitRows([]);
      setUnitsLoading(false);
      setUnitsError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setUnitsLoading(true);
      setUnitsError(null);
      try {
        const query = clientUnitFiltersToQuery(unitFilterApplied);
        const rows = await fetchAllProjectUnits(projectId, query);
        if (cancelled) return;
        setUnitRows(
          rows.map((r) => ({
            id: r.id,
            displayName: (r.name ?? "").trim() || r.id.slice(0, 8),
            status: mapApiUnitStatus(r.status),
          }))
        );
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: string }).message)
            : "Could not load units.";
        if (!cancelled) {
          setUnitsError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setUnitsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, unitFilterAppliedKey]);

  useEffect(() => {
    if (!projectId) {
      setStatsLoading(false);
      setProjectLoading(false);
      setStatsError(null);
      setProjectError(null);
      setStats(null);
      setProject(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      setProjectLoading(true);
      setStatsError(null);
      setProjectError(null);
      const [statsRes, projectRes] = await Promise.allSettled([
        fetchProjectStats(projectId),
        fetchProjectById(projectId),
      ]);
      if (cancelled) return;

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      } else {
        const msg =
          statsRes.reason && typeof statsRes.reason === "object" && "message" in statsRes.reason
            ? String((statsRes.reason as { message: string }).message)
            : "Could not load project statistics.";
        setStatsError(msg);
        toast.error(msg);
      }

      if (projectRes.status === "fulfilled") {
        setProject(projectRes.value);
      } else {
        const msg =
          projectRes.reason && typeof projectRes.reason === "object" && "message" in projectRes.reason
            ? String((projectRes.reason as { message: string }).message)
            : "Could not load project details.";
        setProjectError(msg);
        toast.error(msg);
      }

      setStatsLoading(false);
      setProjectLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const dash = "—";
  const allKpiStats = [
    {
      icon: "👤",
      value: statsLoading ? dash : formatStatInt(stats?.total_leads),
      label: "Total Leads",
      color: "var(--primary-base)",
    },
    {
      icon: "🏠",
      value: statsLoading ? dash : formatStatInt(stats?.total_visits),
      label: "Total Visits",
      color: "var(--primary-base)",
    },
    {
      icon: "💬",
      value: statsLoading ? dash : formatStatInt(stats?.leads_in_negotiation),
      label: "In Negotiation",
      color: "var(--primary-base)",
    },
    {
      icon: "📅",
      value: statsLoading ? dash : formatStatInt(stats?.total_lead_bookings),
      label: "Total Bookings",
      color: "var(--primary-base)",
    },
    {
      icon: "🏢",
      value: statsLoading ? dash : formatStatInt(stats?.available_units),
      label: "Total Units Available",
      color: "var(--primary-base)",
    },
  ];

  // Show first 3 KPIs by default, all when expanded
  const kpiStats = showAllKPIs ? allKpiStats : allKpiStats.slice(0, 3);

  const handleUnitClick = (unitId: string, status: UiUnitKind) => {
    if (status === "booked" || status === "not-sale") return;

    setSelectedUnits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  const galleryUrls = project ? galleryImagesFromProject(project) : [];
  const mainGallerySrc =
    galleryUrls[0] ?? (project ? pickHeroImage(project) : "/property-1 1.png");
  const videoRows = videosFromProject(project);

  const getUnitClassName = (unit: UnitRow) => {
    const baseClasses =
      "px-3 sm:px-4 py-2.5 sm:py-3 text-center rounded-md font-semibold text-xs sm:text-sm cursor-pointer transition-colors";

    if (selectedUnits.has(unit.id)) {
      return `${baseClasses} bg-[#E1F5FE] text-[#0288D1] border border-[#0288D1]`;
    }

    switch (unit.status) {
      case "available":
        return `${baseClasses} bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9]`;
      case "booked":
        return `${baseClasses} bg-[#FFEBEE] text-[#C62828] cursor-not-allowed opacity-75`;
      case "not-sale":
        return `${baseClasses} bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed opacity-75`;
      case "negotiation":
        return `${baseClasses} bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100`;
      default:
        return baseClasses;
    }
  };

  const toggleUnitFilters = () => {
    if (!projectId) return;
    if (unitFiltersOpen) {
      setUnitFilterDraft({ ...unitFilterApplied });
      setUnitFiltersOpen(false);
    } else {
      setUnitFilterDraft({ ...unitFilterApplied });
      setUnitFiltersOpen(true);
    }
  };

  const applyUnitFilters = () => {
    setUnitFilterApplied({ ...unitFilterDraft });
    setUnitFiltersOpen(false);
  };

  const clearUnitFilters = () => {
    setUnitFilterDraft(EMPTY_PROJECT_UNIT_FILTERS);
    setUnitFilterApplied(EMPTY_PROJECT_UNIT_FILTERS);
  };

  const inputCls =
    "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]";

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Back Header - Enhanced Responsive */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5 lg:mb-6 xl:mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E3E6F0] bg-white flex items-center justify-center hover:bg-[#F8F9FC] transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} weight="regular" className="text-[#2D3748] sm:w-5 sm:h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2D3748]">Project Detail</h1>
        </div>

        {/* Performance Summary - Match Dashboard Structure */}
        <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors mb-4 sm:mb-5 lg:mb-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Performance Summary</h2>
          {!projectId ? (
            <p className="text-sm text-[#667085] mb-3">
              Open a project from <strong>Project Inventory</strong> to see KPIs (missing <code className="text-xs bg-slate-100 px-1 rounded">projectId</code> in the URL).
            </p>
          ) : null}
          {statsError && projectId ? (
            <p className="text-xs text-red-600 mb-3" role="alert">
              {statsError}
            </p>
          ) : null}
          <div className={`grid ${
            showAllKPIs 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3' 
              : 'grid-cols-1 sm:grid-cols-3'
          } gap-3 sm:gap-4 lg:gap-5 xl:gap-6 transition-all duration-300`}>
            {kpiStats.map((stat, index) => (
              <KPICard
                key={index}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
                color={stat.color}
              />
            ))}
          </div>
          {allKpiStats.length > 3 && (
            <button 
              onClick={() => setShowAllKPIs(!showAllKPIs)}
              className="w-full mt-4 sm:mt-5 text-center text-sm font-medium text-[var(--primary-base)] py-2 rounded-md border border-transparent hover:border-[var(--primary-base)] hover:bg-slate-50 transition-colors"
            >
              {showAllKPIs ? "View less" : "View more"}
            </button>
          )}
        </section>

        {/* Details Grid - Enhanced Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] xl:grid-cols-[2fr_1fr] gap-4 sm:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10 mb-4 sm:mb-5 lg:mb-6 xl:mb-9">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-9">
            {/* Project Detail */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Project Detail</h2>
              {!projectId ? (
                <p className="text-sm text-[#667085]">Select a project from Project Inventory to see details.</p>
              ) : projectLoading ? (
                <p className="text-sm text-[#667085] py-6">Loading project details…</p>
              ) : projectError ? (
                <p className="text-sm text-red-600" role="alert">
                  {projectError}
                </p>
              ) : project ? (
                <ProjectCard {...projectToCardProps(project)} variant="detail" />
              ) : null}
            </section>

            {/* Unit Selection - Enhanced Responsive Grid */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4 lg:mb-5">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900">
                  Unit Selection
                  {hasActiveUnitFilters ? (
                    <span className="ml-2 text-xs font-normal text-[var(--primary-base)]">(filtered)</span>
                  ) : null}
                </h2>
                <button
                  type="button"
                  onClick={toggleUnitFilters}
                  disabled={!projectId}
                  className="text-[var(--primary-base)] border-none bg-transparent font-semibold cursor-pointer hover:underline text-xs sm:text-sm self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unitFiltersOpen ? "Hide filters" : "+ Add Filter"}
                </button>
              </div>
              {unitFiltersOpen && projectId ? (
                <div className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50/90">
                  <p className="text-xs text-slate-500 mb-3">
                    Filters apply to the unit list API. Empty fields are ignored. Using both exact floor and
                    floor range may narrow results strongly.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      Floor (exact)
                      <input
                        type="number"
                        inputMode="numeric"
                        className={inputCls}
                        value={unitFilterDraft.floor}
                        onChange={(e) =>
                          setUnitFilterDraft((d) => ({ ...d, floor: e.target.value }))
                        }
                        placeholder="e.g. 5"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      Floor min
                      <input
                        type="number"
                        inputMode="numeric"
                        className={inputCls}
                        value={unitFilterDraft.floorMin}
                        onChange={(e) =>
                          setUnitFilterDraft((d) => ({ ...d, floorMin: e.target.value }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      Floor max
                      <input
                        type="number"
                        inputMode="numeric"
                        className={inputCls}
                        value={unitFilterDraft.floorMax}
                        onChange={(e) =>
                          setUnitFilterDraft((d) => ({ ...d, floorMax: e.target.value }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      Unit type
                      <select
                        className={inputCls}
                        value={unitFilterDraft.unitType}
                        onChange={(e) =>
                          setUnitFilterDraft((d) => ({ ...d, unitType: e.target.value }))
                        }
                      >
                        {UNIT_TYPE_OPTIONS.map((o) => (
                          <option key={o.value || "any"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      Status
                      <select
                        className={inputCls}
                        value={unitFilterDraft.status}
                        onChange={(e) =>
                          setUnitFilterDraft((d) => ({ ...d, status: e.target.value }))
                        }
                      >
                        {UNIT_STATUS_FILTER_OPTIONS.map((o) => (
                          <option key={o.value || "any"} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      Price min (₹)
                      <input
                        type="number"
                        inputMode="decimal"
                        className={inputCls}
                        value={unitFilterDraft.priceMin}
                        onChange={(e) =>
                          setUnitFilterDraft((d) => ({ ...d, priceMin: e.target.value }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-600">
                      Price max (₹)
                      <input
                        type="number"
                        inputMode="decimal"
                        className={inputCls}
                        value={unitFilterDraft.priceMax}
                        onChange={(e) =>
                          setUnitFilterDraft((d) => ({ ...d, priceMax: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      onClick={applyUnitFilters}
                      className="px-4 py-2 rounded-md text-sm font-medium text-white bg-[var(--primary-base)] hover:opacity-95"
                    >
                      Apply filters
                    </button>
                    <button
                      type="button"
                      onClick={clearUnitFilters}
                      className="px-4 py-2 rounded-md text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              ) : null}
              <div>
                {!projectId ? (
                  <p className="text-sm text-[#667085]">Select a project to load units.</p>
                ) : unitsLoading ? (
                  <p className="text-sm text-[#667085]">Loading units…</p>
                ) : unitsError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {unitsError}
                  </p>
                ) : unitRows.length === 0 ? (
                  <p className="text-sm text-[#667085]">
                    {hasActiveUnitFilters
                      ? "No units match these filters."
                      : "No units found for this project."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                    {unitRows.map((unit) => (
                      <div
                        key={unit.id}
                        onClick={() => handleUnitClick(unit.id, unit.status)}
                        className={getUnitClassName(unit)}
                      >
                        {unit.displayName}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-5 mt-4 sm:mt-5 text-xs sm:text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#E8F5E9] flex-shrink-0"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200 flex-shrink-0"></div>
                    <span>Under negotiation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#FFEBEE] flex-shrink-0"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#F1F5F9] flex-shrink-0"></div>
                    <span>Not for sale / Unavailable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#E1F5FE] border border-[#0288D1] flex-shrink-0"></div>
                    <span>Selected</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Amenities - Enhanced Responsive Grid */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Amenities</h2>
              {!projectId || projectLoading ? (
                <p className="text-sm text-[#667085]">Loading amenities…</p>
              ) : projectError ? (
                <p className="text-sm text-red-600" role="alert">
                  {projectError}
                </p>
              ) : (project?.amenities?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                  {project!.amenities!.map((name, index) => (
                    <AmenityCard key={`${name}-${index}`} icon="✓" name={name} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#667085]">No amenities listed for this project.</p>
              )}
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-9">
            {/* Project Overview */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Project Overview</h2>
              {!projectId ? (
                <p className="text-sm text-[#667085]">—</p>
              ) : projectLoading ? (
                <p className="text-sm text-[#667085]">Loading…</p>
              ) : projectError ? (
                <p className="text-sm text-red-600" role="alert">
                  {projectError}
                </p>
              ) : project ? (
                <div className="mb-6 sm:mb-8">
                  <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-5 pb-4 sm:pb-5 border-b border-slate-200">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#F8F9FC] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg sm:text-xl">🏙️</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 mb-1">Area Type</p>
                      <strong className="text-sm sm:text-base text-slate-900">
                        {formatAreaType(project.area_type)}
                      </strong>
                    </div>
                  </div>
                  <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-5 pb-4 sm:pb-5 border-b border-slate-200">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#F8F9FC] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg sm:text-xl">📜</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 mb-1">RERA Number</p>
                      <strong className="text-sm sm:text-base text-slate-900 break-all">
                        {(project.rera_number ?? "").trim() || "—"}
                      </strong>
                    </div>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#F8F9FC] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg sm:text-xl">📅</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500 mb-1">Possession Date</p>
                      <strong className="text-sm sm:text-base text-slate-900">
                        {formatPossessionDate(project.expected_possession_date)}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            {/* Media Gallery - Enhanced Responsive */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Media Gallery</h2>
              <div className="mb-6 sm:mb-8">
                {!projectId || projectLoading ? (
                  <p className="text-sm text-[#667085]">Loading gallery…</p>
                ) : projectError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {projectError}
                  </p>
                ) : (
                  <>
                    <div className="relative w-full h-40 sm:h-48 md:h-56 lg:h-48 rounded-lg overflow-hidden mb-3 sm:mb-4">
                      {isRemoteUrl(mainGallerySrc) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mainGallerySrc}
                          alt="Project"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <Image
                          src={mainGallerySrc}
                          alt="Project"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 40vw"
                        />
                      )}
                    </div>

                    {galleryUrls.length > 1 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5 mb-4 sm:mb-5">
                        {galleryUrls.slice(1).map((img, index) => (
                          <div
                            key={`${img}-${index}`}
                            className="relative w-full h-[50px] sm:h-[60px] md:h-[70px] rounded-md overflow-hidden"
                          >
                            {isRemoteUrl(img) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt={`Gallery ${index + 2}`}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <Image
                                src={img}
                                alt={`Gallery ${index + 2}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 10vw"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#667085] mb-4 sm:mb-5">No additional gallery images.</p>
                    )}

                    <p className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3 text-slate-900">Project Videos</p>
                    {videoRows.length > 0 ? (
                      <div className="space-y-2">
                        {videoRows.map((v) => (
                          <DownloadCard
                            key={v.url}
                            title={`▶️ ${v.title}`}
                            duration={v.durationLabel}
                            onClick={() => window.open(v.url, "_blank", "noopener,noreferrer")}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#667085]">No project videos uploaded.</p>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Lead Sources */}
            <PieChart data={leadSourcesData} />
          </div>
        </div>
      </div>
    </div>
  );
}
