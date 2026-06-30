"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChevronRight } from "lucide-react";
import { KPICard } from "../../../components/ui/kpi";
import { Leaderboard } from "../../../components/ui/leaderboard";
import { PipelineGraph } from "../../../components/ui/pipelineGraph";
import { PieChart } from "../../../components/ui/pieChart";
import { ProjectCard } from "../../../components/ui/card/projectCard";
import { ScheduledVisits } from "../../../components/ui/scheduledVisits";
import { fetchDashboardStats } from "../../../lib/dashboard";
import { fetchProjectInventoryGridRows } from "../../../lib/projectInventoryProjects";
import { fetchProjectStats } from "../../../lib/projectDetailStats";
import { LeadResponse, listLeads, listRejectedLeads, PaginationInfo } from "../../../lib/leads";

export default function Dashboard() {
  const router = useRouter();
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [isKpiLoading, setIsKpiLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  type DashboardKpi = {
    icon: string;
    value: number | string;
    label: string;
    color: string;
    trend?: string;
    trendUp?: boolean;
  };

  const [allKpiStats, setAllKpiStats] = useState<DashboardKpi[]>([]);
  type TopProjectCard = {
    id: string;
    image: string;
    name: string;
    stats: string;
    conversion: string;
    conversionUp: boolean;
    conversionValue: number;
  };
  const [projects, setProjects] = useState<TopProjectCard[]>([]);
  const [topProjectsLoading, setTopProjectsLoading] = useState(false);
  const [topProjectsError, setTopProjectsError] = useState<string | null>(null);

  useEffect(() => {
    const loadKpis = async () => {
      try {
        setIsKpiLoading(true);
        const stats = await fetchDashboardStats();

        const mapped: DashboardKpi[] = [
          {
            icon: "👤",
            value: stats.total_leads ?? 0,
            label: "Leads Assigned",
            color: "#3b82f6",
          },
          {
            icon: "🏠",
            value: stats.total_visits ?? 0,
            label: "Visits Completed",
            color: "#8b5cf6",
          },
          {
            icon: "💬",
            value: stats.active_leads ?? 0,
            label: "In Negotiation",
            color: "#f59e0b",
          },
          {
            icon: "✋",
            value: (stats.total_leads ?? 0) - (stats.active_leads ?? 0),
            label: "Rejected / Dropped",
            color: "#ef4444",
          },
          {
            icon: "📅",
            value: stats.upcoming_visits ?? 0,
            label: "Upcoming Visits",
            color: "#f59e0b",
          },
          {
            icon: "📈",
            value: `${(stats.conversion_rate ?? 0).toFixed(1)}%`,
            label: "Conversion Rate",
            color: "#10b981",
          },
        ];

        setAllKpiStats(mapped);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          // eslint-disable-next-line no-console
          console.error("Failed to load dashboard stats", err);
        }
        setDashboardError("Unable to load dashboard stats.");
      } finally {
        setIsKpiLoading(false);
      }
    };

    loadKpis();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTopProjects = async () => {
      try {
        setTopProjectsLoading(true);
        setTopProjectsError(null);

        // Sales scope: use "My Projects" and rank by live project funnel stats.
        const myProjects = await fetchProjectInventoryGridRows({ mine: true });
        const candidates = myProjects.slice(0, 10);

        const enriched = await Promise.all(
          candidates.map(async (project) => {
            try {
              const stats = await fetchProjectStats(project.id);
              const siteVisits = stats.total_visits ?? 0;
              const revisits = stats.leads_in_negotiation ?? 0;
              const bookings = stats.total_lead_bookings ?? 0;
              const conversionValue =
                siteVisits > 0 ? (bookings / siteVisits) * 100 : 0;

              return {
                id: project.id,
                image: project.image,
                name: project.name,
                stats: `${siteVisits} Site Visits | ${revisits} Revisits | ${bookings} Bookings`,
                conversion: `${conversionValue.toFixed(2)}%`,
                conversionUp: conversionValue >= 2,
                conversionValue,
                siteVisits,
                bookings,
              };
            } catch {
              return {
                id: project.id,
                image: project.image,
                name: project.name,
                stats: "0 Site Visits | 0 Revisits | 0 Bookings",
                conversion: "0.00%",
                conversionUp: false,
                conversionValue: 0,
                siteVisits: 0,
                bookings: 0,
              };
            }
          })
        );

        const ranked = enriched
          .sort((a, b) => {
            if (b.conversionValue !== a.conversionValue) {
              return b.conversionValue - a.conversionValue;
            }
            if (b.bookings !== a.bookings) return b.bookings - a.bookings;
            return b.siteVisits - a.siteVisits;
          })
          .slice(0, 3)
          .map(({ siteVisits: _siteVisits, bookings: _bookings, ...item }) => item);

        if (!cancelled) {
          setProjects(ranked);
        }
      } catch (err) {
        if (!cancelled) {
          setTopProjectsError(
            err instanceof Error ? err.message : "Unable to load top projects."
          );
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setTopProjectsLoading(false);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loadTopProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const kpiStats = showAllKPIs ? allKpiStats : allKpiStats.slice(0, 3);

  // Priorities section will later be wired to API when endpoints are available.
  const priorities = [
    { title: "Missed Follow-Ups", badge: "Needs Action", badgeType: "red" },
    { title: "Follow Ups", badge: "In Progress", badgeType: "green" },
    { title: "Site Visits", badge: "Scheduled", badgeType: "green" },
    { title: "Revisits", badge: "Scheduled", badgeType: "green" },
  ];

  // Pipeline Data
  const pipelineData = [
    { name: "Contacted", value: 286, percentage: 90 },
    { name: "Site Visits", value: 200, percentage: 70 },
    { name: "Negotiation", value: 100, percentage: 45 },
    { name: "Booked", value: 40, percentage: 20 },
    { name: "Lost", value: 246, percentage: 75 },
  ];

  // Lead Sources Donut Chart Data (placeholder until backend aggregation endpoint is available)
  const leadSourcesData = [
    { name: "Assign By Caller", value: 0, color: "var(--primary-base)" },
    { name: "Manual", value: 0, color: "#cbd5e1" },
  ];

  // Leaderboard and scheduled visits will be integrated with backend when endpoints are available.
  const topPerformers: { rank: string; name: string; points: string; avatar: string }[] = [];

  const scheduledVisits: { name: string; avatar: string; time: string; status: "completed" | "revisit" | "pending" }[] = [];

  const COLORS = {
    primary: "var(--primary-base)",
    success: "var(--success)",
    error: "var(--error)",
    warning: "var(--warning)",
    purple: "var(--purple)",
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Mobile: Single Column, Desktop: Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] xl:grid-cols-[2fr_1fr] gap-4 sm:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-8">
            {/* Performance Summary - 3 KPIs matching image */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Performance Summary</h2>
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
                    trend={stat.trend}
                    trendUp={stat.trendUp}
                    color={stat.color}
                  />
                ))}
              </div>
              {allKpiStats.length > 3 && (
                <button 
                  onClick={() => setShowAllKPIs(!showAllKPIs)}
                  className="w-full mt-4 text-center text-sm font-medium text-[var(--primary-base)] py-2 rounded-md border border-transparent hover:border-[var(--primary-base)] hover:bg-slate-50 transition-colors"
                >
                  {showAllKPIs ? "View less" : "View more"}
                </button>
              )}
            </section>

            {/* Today&apos;s Priorities */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Today&apos;s Priorities</h2>
              <div className="space-y-0">
                {priorities.map((priority, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2.5 sm:py-3 border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex items-center text-xs sm:text-sm text-slate-700 pr-2">
                      {priority.title}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                          priority.badgeType === "red"
                            ? "bg-rose-50 text-[var(--error)] border border-rose-100"
                            : "bg-emerald-50 text-[var(--success)] border border-emerald-100"
                        }`}
                      >
                        {priority.badge}
                      </span>
                      <button className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Lead Pipeline */}
            <PipelineGraph data={pipelineData} />

            {/* Top Performing Project - Horizontal Scroll on Mobile/Tablet */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Top Performing Projects</h2>
              {topProjectsLoading && (
                <p className="text-xs sm:text-sm text-slate-500 mb-3">Loading top projects...</p>
              )}
              {topProjectsError && (
                <p className="text-xs sm:text-sm text-rose-600 mb-3">Top projects not loaded: {topProjectsError}</p>
              )}
              {!topProjectsLoading && projects.length === 0 && !topProjectsError && (
                <p className="text-xs sm:text-sm text-slate-500 mb-3">No project performance data found.</p>
              )}
              {/* Mobile/Tablet: Horizontal Scroll */}
              <div className="lg:hidden overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5 pb-2">
                <div className="flex gap-3 sm:gap-4 min-w-max">
                  {projects.map((project, index) => (
                    <div key={index} className="w-[280px] sm:w-[320px] flex-shrink-0">
                      <ProjectCard
                        image={project.image}
                        name={project.name}
                        stats={project.stats}
                        conversion={project.conversion}
                        conversionUp={project.conversionUp}
                        onClick={() =>
                          router.push(
                            `/sales/project-inventory/project-inventory-detail?projectId=${encodeURIComponent(
                              project.id
                            )}`
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              {/* Desktop: Grid Layout */}
              <div className="hidden lg:grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-5 xl:gap-6">
                {projects.map((project, index) => (
                  <ProjectCard
                    key={index}
                    image={project.image}
                    name={project.name}
                    stats={project.stats}
                    conversion={project.conversion}
                    conversionUp={project.conversionUp}
                    onClick={() =>
                      router.push(
                        `/sales/project-inventory/project-inventory-detail?projectId=${encodeURIComponent(
                          project.id
                        )}`
                      )
                    }
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-8">
            {/* Leaderboard - currently hidden until backend integration */}
            {topPerformers.length > 0 && (
              <Leaderboard
                featured={topPerformers[0]}
                stats={[
                  { icon: "🕐", label: "Avg. Call Time" },
                  { icon: "📞", label: "Response Time" },
                  { icon: "📊", label: "Connect Ratio" },
                ]}
                performers={topPerformers}
              />
            )}

            {/* Lead Sources */}
            <PieChart data={leadSourcesData} />

            {/* Scheduled Visits - currently hidden until backend integration */}
            {scheduledVisits.length > 0 && <ScheduledVisits visits={scheduledVisits} />}
          </div>
        </div>
      </div>
    </div>
  );
}
