"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { KPICard } from "../../../components/ui/kpi";
import { Leaderboard } from "../../../components/ui/leaderboard";
import { PieChart } from "../../../components/ui/pieChart";
import { BarChart } from "../../../components/ui/barChart";
import { FollowUps } from "../../../components/ui/followUps";
import { apiGet } from "../../../lib/apiClient";

type DashboardStats = {
  total_leads: number;
  active_leads: number;
  deals_closed: number;
  conversion_rate: number;
  total_calls: number;
  total_visits: number;
  pending_followups: number;
  upcoming_visits: number;
};

type DashboardResponse = {
  stats: DashboardStats;
  leaderboard?: {
    user_id: string;
    name: string;
    role: string;
    total_leads: number;
    deals: number;
    total_calls: number;
  }[];
  upcoming_followups?: {
    id: string;
    lead_id: string;
    lead_name: string;
    followup_type: string;
    followup_date: string;
  }[];
};

export default function Dashboard() {
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [timeframe, setTimeframe] = useState<"Today" | "Week" | "Month">("Today");
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<
    { name: string; time: string; status: "Scheduled" | "Pending" | "Completed" }[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<
    { rank: string; name: string; points: string; avatar?: string }[]
  >([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setKpiLoading(true);
        setKpiError(null);
        const res = await apiGet<{ data?: DashboardResponse }>("/api/v1/dashboard");
        const stats = res?.data?.stats;
        if (stats) {
          setDashboardStats(stats);
        } else {
          setDashboardStats(null);
        }

        const upcoming = res?.data?.upcoming_followups ?? [];
        const mappedFollowUps =
          upcoming.map((f) => {
            const date = new Date(f.followup_date);
            const timeString = date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return {
              name: f.lead_name,
              time: timeString,
              status: "Scheduled" as const,
            };
          }) ?? [];
        setFollowUps(mappedFollowUps);

        const lb = res?.data?.leaderboard ?? [];
        const mappedLeaderboard =
          lb.map((item, index) => ({
            rank: `#${index + 1}`,
            name: item.name,
            points: `${item.deals} deals • ${item.total_calls} calls`,
          })) ?? [];
        setLeaderboard(mappedLeaderboard);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard stats";
        setKpiError(message);
        // eslint-disable-next-line no-console
        console.error("[Dashboard] Error fetching stats", err);
      } finally {
        setKpiLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchDashboard();
  }, []);

  // All KPI Stats Data - mapped from backend stats (fallback to zeros)
  const allKpiStats = useMemo(
    () => [
      {
        icon: "👤",
        value: String(dashboardStats?.total_leads ?? 0),
        label: "My Leads",
        color: "#3b82f6",
      },
      {
        icon: "🏠",
        value: String(dashboardStats?.total_visits ?? 0),
        label: "Property Visited",
        color: "#8b5cf6",
      },
      {
        icon: "📅",
        value: String(dashboardStats?.deals_closed ?? 0),
        label: "Booking",
        color: "#f59e0b",
      },
      {
        icon: "✋",
        value: String(dashboardStats?.pending_followups ?? 0),
        label: "Rejected",
        color: "#ef4444",
      },
      {
        icon: "📈",
        value: `${dashboardStats?.conversion_rate?.toFixed(1) ?? "0.0"}%`,
        label: "Conversion",
        color: "#10b981",
      },
      {
        icon: "📞",
        value: String(dashboardStats?.total_calls ?? 0),
        label: "Total Calls",
        color: "#3b82f6",
      },
    ],
    [dashboardStats]
  );

  // Show first 3 KPIs by default, all when expanded
  const kpiStats = showAllKPIs ? allKpiStats : allKpiStats.slice(0, 3);

  // Leads & Calls Overview Data (still mock for now)
  const leadsCallsData = [
    { name: "Mon", Lead: 65, Call: 25 },
    { name: "Tue", Lead: 85, Call: 40 },
    { name: "Wed", Lead: 20, Call: 55 },
    { name: "Thu", Lead: 88, Call: 40 },
    { name: "Fri", Lead: 12, Call: 30 },
    { name: "Sat", Lead: 60, Call: 80 },
    { name: "Sun", Lead: 40, Call: 75 },
  ];

  // Lead Sources Donut Chart Data - Matching image
  const leadSourcesData = [
    { name: "Booking.com", value: 25, color: "#3b82f6" },
    { name: "99acres.com", value: 20, color: "#ef4444" },
    { name: "Magicbrick.com", value: 10, color: "#10b981" },
    { name: "Nobroker.com", value: 20, color: "#8b5cf6" },
    { name: "Housing.com", value: 15, color: "#f59e0b" },
    { name: "Manual", value: 10, color: "#9ca3af" },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <div className="max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 lg:py-8 xl:py-10">
        {/* Mobile: Single Column, Desktop: Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] xl:grid-cols-[2fr_1fr] gap-4 sm:gap-5 lg:gap-6 xl:gap-8 2xl:gap-10">
          {/* Left Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-8">
            {/* Performance Summary - 3 KPIs */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 lg:mb-5 text-slate-900">Performance Summary</h2>
              <div
                className={`grid ${
                  showAllKPIs
                    ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-3"
                } gap-3 sm:gap-4 lg:gap-5 xl:gap-6 transition-all duration-300`}
              >
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
                  className="w-full mt-4 text-center text-sm font-medium text-[var(--primary-base)] py-2 rounded-md border border-transparent hover:border-[var(--primary-base)] hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                >
                  {showAllKPIs ? "View less" : "View more"}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAllKPIs ? 'rotate-180' : ''}`} />
                </button>
              )}
            </section>

            {/* Leads & Calls Overview */}
            <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
              <div className="flex justify-between items-center mb-3 sm:mb-4 lg:mb-5">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900">Leads & Calls Overview</h2>
                <div className="flex gap-2">
                  {(["Today", "Week", "Month"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTimeframe(period)}
                      className={`px-3 py-1.5 text-xs sm:text-sm rounded-md font-medium transition-colors ${
                        timeframe === period
                          ? "bg-[var(--primary-base)] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <BarChart data={leadsCallsData} height={300} />
            </section>

            {/* Follow Ups */}
            <FollowUps followUps={followUps} />
          </div>

          {/* Right Column */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-8">
            {/* Leaderboard */}
            <Leaderboard
              featured={
                leaderboard[0]
                  ? leaderboard[0]
                  : { rank: "#-", name: "No data", points: "-", avatar: undefined }
              }
              stats={[
                { icon: "🕐", label: "Top by deals" },
                { icon: "📞", label: "Top by calls" },
                { icon: "📊", label: "Org-wide ranking" },
              ]}
              performers={leaderboard}
            />

            {/* Lead Sources */}
            <PieChart title="Lead Sources" data={leadSourcesData} />
          </div>
        </div>
      </div>
    </div>
  );
}
