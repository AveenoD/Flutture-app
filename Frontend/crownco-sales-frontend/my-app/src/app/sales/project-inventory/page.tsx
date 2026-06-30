"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KPICard } from "../../../components/ui/kpi";
import { Filter, FilterValues } from "../../../components/ui/filter";
import { ProjectCard } from "../../../components/ui/card/projectCard";
import {
  fetchProjectInventoryKpis,
  formatKpiInt,
} from "../../../lib/projectInventoryKpi";
import {
  fetchProjectInventoryGridRows,
  type ProjectInventoryRow,
} from "../../../lib/projectInventoryProjects";
import { toast } from "sonner";

export default function ProjectInventoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my-projects" | "all-projects">("my-projects");
  const [filterValues, setFilterValues] = useState<FilterValues>({
    newLeads: true,
    dateRange: "",
    status: "",
    sources: "",
    budget: "",
    project: "",
  });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [kpiSnapshot, setKpiSnapshot] = useState<{
    activeProjects: number;
    totalUnitsAvailable: number;
    readyToMove: number;
    ongoing: number;
    upcoming: number;
  } | null>(null);

  const [myGrid, setMyGrid] = useState<ProjectInventoryRow[]>([]);
  const [myGridLoading, setMyGridLoading] = useState(true);
  const [myGridError, setMyGridError] = useState<string | null>(null);

  const [allGrid, setAllGrid] = useState<ProjectInventoryRow[]>([]);
  const [allGridLoading, setAllGridLoading] = useState(true);
  const [allGridError, setAllGridError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKpiLoading(true);
      setKpiError(null);
      try {
        const k = await fetchProjectInventoryKpis();
        if (!cancelled) setKpiSnapshot(k);
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: string }).message)
            : "Could not load project KPIs.";
        if (!cancelled) {
          setKpiError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setKpiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMyGridLoading(true);
      setMyGridError(null);
      setAllGridLoading(true);
      setAllGridError(null);
      const [mineRes, allRes] = await Promise.allSettled([
        fetchProjectInventoryGridRows({ mine: true }),
        fetchProjectInventoryGridRows({ mine: false }),
      ]);
      if (cancelled) return;

      if (mineRes.status === "fulfilled") {
        setMyGrid(mineRes.value);
      } else {
        const msg =
          mineRes.reason && typeof mineRes.reason === "object" && "message" in mineRes.reason
            ? String((mineRes.reason as { message: string }).message)
            : "Could not load your projects.";
        setMyGridError(msg);
        toast.error(msg);
      }
      setMyGridLoading(false);

      if (allRes.status === "fulfilled") {
        setAllGrid(allRes.value);
      } else {
        const msg =
          allRes.reason && typeof allRes.reason === "object" && "message" in allRes.reason
            ? String((allRes.reason as { message: string }).message)
            : "Could not load all projects.";
        setAllGridError(msg);
        toast.error(msg);
      }
      setAllGridLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset to page 1 when filters or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValues, activeTab, searchQuery]);

  const handleFilterChange = (values: FilterValues) => {
    setFilterValues(values);
  };

  // Filter projects based on filter values, active tab, and search query
  const getFilteredProjects = (): ProjectInventoryRow[] => {
    const baseProjects =
      activeTab === "my-projects" ? myGrid : allGrid;
    let filtered = [...baseProjects];

    // Search filter (by name or location)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.location?.toLowerCase().includes(query)
      );
    }

    // Filter by project name
    if (filterValues.project) {
      const projectNameMap: Record<string, string> = {
        "maaz-palace": "Maaz Palace",
        "crown-height": "Crown Height",
        "urban-nest": "Urban Nest",
        "greenville-orchid": "GreenVille Orchid",
      };
      const projectName = projectNameMap[filterValues.project] || filterValues.project;
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(projectName.toLowerCase())
      );
    }

    // Filter by status
    if (filterValues.status) {
      const statusMap: Record<string, string> = {
        veryhot: "Ongoing",
        hot: "Ongoing",
        warm: "Upcoming",
        cold: "Ready Move",
      };
      const statusValue = Array.isArray(filterValues.status)
        ? filterValues.status[0]
        : filterValues.status;
      const mappedStatus = statusMap[statusValue] || statusValue;
      filtered = filtered.filter((p) => {
        const statusMatch = (p.status ?? "")
          .toLowerCase()
          .includes(mappedStatus.toLowerCase());
        return statusMatch;
      });
    }

    // Filter by budget (matching price range)
    if (filterValues.budget) {
      filtered = filtered.filter((p) => {
        // Extract price from priceRange string
        const priceMatch = (p.priceRange ?? "").match(/₹(\d+\.?\d*)\s*Cr/);
        if (!priceMatch) return true;
        const price = parseFloat(priceMatch[1]);
        
        // Map budget ranges to price ranges (in Cr)
        const budgetRanges: Record<string, { min: number; max: number }> = {
          "20L-30L": { min: 0.2, max: 0.3 },
          "30L-40L": { min: 0.3, max: 0.4 },
          "40L-50L": { min: 0.4, max: 0.5 },
          "50L-60L": { min: 0.5, max: 0.6 },
          "60L+": { min: 0.6, max: Infinity },
        };
        
        const range = budgetRanges[filterValues.budget];
        if (!range) return true;
        
        return price >= range.min && price <= range.max;
      });
    }

    return filtered;
  };

  const getFilterDescription = () => {
    const parts: string[] = [];
    if (filterValues.sources) {
      const sourceLabel = filterValues.sources
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      parts.push(`Sources = ${sourceLabel}`);
    }
    if (filterValues.budget) {
      parts.push(`Budget : ${filterValues.budget}`);
    }
    if (filterValues.status) {
      const statusLabel = Array.isArray(filterValues.status)
        ? filterValues.status.join(", ")
        : filterValues.status
            .split("-")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
      parts.push(`Status : ${statusLabel}`);
    }
    if (filterValues.project) {
      const projectLabel = filterValues.project
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      parts.push(`Project : ${projectLabel}`);
    }
    return parts.length > 0 ? parts.join(", ") : "";
  };

  const filteredProjects = getFilteredProjects();
  const totalProjects = filteredProjects.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedProjects = filteredProjects.slice(startIndex, endIndex);

  // Performance Summary KPIs — from GET /projects (+ GET /projects/:id/stats for available units). No mock trends (API has no MoM comparison).
  const dash = "—";
  const allKpiStats = [
    {
      icon: "👤",
      value: kpiLoading ? dash : formatKpiInt(kpiSnapshot?.activeProjects ?? 0),
      label: "Active Projects",
      trendUp: true,
      color: "var(--primary-base)",
    },
    {
      icon: "📅",
      value: kpiLoading ? dash : formatKpiInt(kpiSnapshot?.totalUnitsAvailable ?? 0),
      label: "Total Units Available",
      trendUp: true,
      color: "var(--primary-base)",
    },
    {
      icon: "🏠",
      value: kpiLoading ? dash : formatKpiInt(kpiSnapshot?.readyToMove ?? 0),
      label: "Ready-To-Move",
      trendUp: true,
      color: "var(--primary-base)",
    },
    {
      icon: "💳",
      value: kpiLoading ? dash : formatKpiInt(kpiSnapshot?.ongoing ?? 0),
      label: "Ongoing",
      trendUp: true,
      color: "var(--primary-base)",
    },
    {
      icon: "📈",
      value: kpiLoading ? dash : formatKpiInt(kpiSnapshot?.upcoming ?? 0),
      label: "Upcoming",
      trendUp: true,
      color: "var(--primary-base)",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Performance Summary - KPI Cards - Match Dashboard Structure */}
        <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors mb-4 sm:mb-5 lg:mb-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Performance Summary</h2>
          {kpiError ? (
            <p className="text-xs text-red-600 mb-3" role="alert">
              {kpiError} KPIs may be incomplete.
            </p>
          ) : null}
          {/* First Row - Always show first 4 KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 xl:gap-6 mb-3 sm:mb-4 lg:mb-5">
            {allKpiStats.slice(0, 4).map((stat, index) => (
              <KPICard
                key={index}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
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

        {/* Filter Bar - Match Lead List Structure */}
        <Filter
          values={filterValues}
          onChange={handleFilterChange}
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
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by name or Location"
          itemCount={totalProjects}
          itemLabel="Project"
          filterSummary={getFilterDescription()}
          showSummary={true}
        />

        {/* Tabs - Improved Mobile Styling */}
        <div className="flex border-b border-[#E3E6F0] mb-4 sm:mb-5 lg:mb-6 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("my-projects")}
            className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === "my-projects"
                ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                : "text-[#718096] border-transparent hover:text-[#344054]"
            }`}
          >
            My Projects
          </button>
          <button
            onClick={() => setActiveTab("all-projects")}
            className={`px-4 sm:px-6 md:px-8 lg:px-10 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 ${
              activeTab === "all-projects"
                ? "text-[var(--primary-base)] border-[var(--primary-base)]"
                : "text-[#718096] border-transparent hover:text-[#344054]"
            }`}
          >
            All Projects
          </button>
        </div>

        {/* Projects Section - Wrapped in Proper Section */}
        <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
          {/* Project Grid - Enhanced Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
            {activeTab === "my-projects" && myGridLoading ? (
              <div className="bg-white rounded-lg border border-[#EAECF0] p-6 sm:p-8 text-center text-sm sm:text-base text-[#667085] col-span-full">
                Loading your projects…
              </div>
            ) : activeTab === "my-projects" && myGridError ? (
              <div className="bg-white rounded-lg border border-[#EAECF0] p-6 sm:p-8 text-center text-sm sm:text-base text-red-600 col-span-full" role="alert">
                {myGridError}
              </div>
            ) : activeTab === "all-projects" && allGridLoading ? (
              <div className="bg-white rounded-lg border border-[#EAECF0] p-6 sm:p-8 text-center text-sm sm:text-base text-[#667085] col-span-full">
                Loading all projects…
              </div>
            ) : activeTab === "all-projects" && allGridError ? (
              <div className="bg-white rounded-lg border border-[#EAECF0] p-6 sm:p-8 text-center text-sm sm:text-base text-red-600 col-span-full" role="alert">
                {allGridError}
              </div>
            ) : displayedProjects.length === 0 ? (
              <div className="bg-white rounded-lg border border-[#EAECF0] p-6 sm:p-8 text-center text-sm sm:text-base text-[#667085] col-span-full">
                No projects found
              </div>
            ) : (
              displayedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  {...project}
                  onClick={() =>
                    router.push(
                      `/sales/project-inventory/project-inventory-detail?projectId=${encodeURIComponent(project.id)}`
                    )
                  }
                  variant="detail"
                />
              ))
            )}
          </div>

          {/* Pagination Footer - Enhanced Mobile Layout */}
          {displayedProjects.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 pt-4 sm:pt-5 border-t border-[#E3E6F0] text-xs sm:text-sm text-[#718096]">
              <div className="flex items-center gap-2 order-2 sm:order-1">
                <span className="hidden sm:inline">Row Per Page:</span>
                <span className="sm:hidden">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 sm:py-1 border border-[#E3E6F0] rounded bg-white text-[#718096] cursor-pointer text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] transition-colors hover:border-[#D0D5DD]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-xs sm:text-sm text-[#667085]">
                  Showing {startIndex + 1} - {Math.min(endIndex, totalProjects)} of {totalProjects} Projects
                </span>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-1 border border-[#E3E6F0] rounded-md bg-white text-[#718096] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8F9FC] transition-colors text-sm sm:text-base"
                    aria-label="Previous page"
                  >
                    &lt;
                  </button>
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(Math.ceil(totalProjects / rowsPerPage), 10) }, (_, i) => i + 1)
                      .filter((page) => {
                        const totalPages = Math.ceil(totalProjects / rowsPerPage);
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                        return false;
                      })
                      .map((page, index, array) => {
                        const totalPages = Math.ceil(totalProjects / rowsPerPage);
                        const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                        const showEllipsisAfter = index === array.length - 1 && page < totalPages;
                        
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-1 text-[#718096]">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`min-w-[32px] h-8 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-md border transition-colors text-xs sm:text-sm font-medium ${
                                currentPage === page
                                  ? "bg-[var(--primary-base)] text-white border-[var(--primary-base)]"
                                  : "bg-white text-[#718096] border-[#E3E6F0] hover:bg-[#F8F9FC]"
                              }`}
                            >
                              {page}
                            </button>
                            {showEllipsisAfter && <span className="px-1 text-[#718096]">...</span>}
                          </div>
                        );
                      })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(totalProjects / rowsPerPage), prev + 1))}
                    disabled={currentPage >= Math.ceil(totalProjects / rowsPerPage)}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-1 border border-[#E3E6F0] rounded-md bg-white text-[#718096] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F8F9FC] transition-colors text-sm sm:text-base"
                    aria-label="Next page"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
