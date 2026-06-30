"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  AlertCircle,
  PhoneCall,
  CalendarDays,
  Phone,
  Home,
  Calendar,
  CheckCircle,
  UserPlus,
  CalendarCheck,
  Bell,
  Heart,
} from "lucide-react";
import { Drawer, SearchBar } from "@/components/ui/sideDrawer";
import { Filter, FilterConfig, FilterValues } from "@/components/ui/fillter";
import { PieChart } from "@/components/ui/pieChart";
import KPICard from "@/components/ui/kpiCard";
import { KPICardSkeleton } from "@/components/ui/loadingSkeleton";
import DashboardCharts from "@/components/ui/dashboard/DashboardCharts";
import DashboardFollowups from "@/components/ui/dashboard/DashboardFollowups";
import DashboardBookings from "@/components/ui/dashboard/BookingsTable";
import DashboardProjects from "@/components/ui/cards/ProjectsCard";
import SmartActivityHub from "@/components/ui/dashboard/SmartActivityHub";
import BookingGoalsView from "@/components/ui/dashboard/BookingGoalsView";
import { listLeads } from "@/lib/leadsApi";

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [bookingRows, setBookingRows] = useState<any[]>([]);
  
  // Drawer states
  const [alertsDrawerOpen, setAlertsDrawerOpen] = useState(false);
  const [followupsDrawerOpen, setFollowupsDrawerOpen] = useState(false);
  const [visitsDrawerOpen, setVisitsDrawerOpen] = useState(false);
  const [missedFollowupsDrawerOpen, setMissedFollowupsDrawerOpen] = useState(false);
  const [inactiveEmployeesDrawerOpen, setInactiveEmployeesDrawerOpen] = useState(false);
  const [staleLeadsDrawerOpen, setStaleLeadsDrawerOpen] = useState(false);
  const [highIntentLeadsDrawerOpen, setHighIntentLeadsDrawerOpen] = useState(false);
  
  // Search states
  const [alertsSearch, setAlertsSearch] = useState("");
  const [followupsSearch, setFollowupsSearch] = useState("");
  const [visitsSearch, setVisitsSearch] = useState("");
  const [missedFollowupsSearch, setMissedFollowupsSearch] = useState("");
  const [inactiveEmployeesSearch, setInactiveEmployeesSearch] = useState("");
  const [staleLeadsSearch, setStaleLeadsSearch] = useState("");
  const [highIntentLeadsSearch, setHighIntentLeadsSearch] = useState("");
  
  // Filter states
  const [alertsFiltersOpen, setAlertsFiltersOpen] = useState(false);
  const [followupsFiltersOpen, setFollowupsFiltersOpen] = useState(false);
  const [visitsFiltersOpen, setVisitsFiltersOpen] = useState(false);
  const [missedFollowupsFiltersOpen, setMissedFollowupsFiltersOpen] = useState(false);
  const [inactiveEmployeesFiltersOpen, setInactiveEmployeesFiltersOpen] = useState(false);
  const [staleLeadsFiltersOpen, setStaleLeadsFiltersOpen] = useState(false);
  const [highIntentLeadsFiltersOpen, setHighIntentLeadsFiltersOpen] = useState(false);
  
  const [filterValues, setFilterValues] = useState<FilterValues>({
    newLeads: true,
    dateRange: "",
    status: "",
    sources: "",
    budget: "",
    project: "",
    stages: "",
    department: "",
    employee: "",
  });

  // Filter configuration for dashboard
  const dashboardFilterConfig: FilterConfig = {
    dateRange: [
      { value: "", label: "Date Range" },
      { value: "today", label: "Today" },
      { value: "week", label: "This Week" },
      { value: "month", label: "This Month" },
      { value: "quarter", label: "This Quarter" },
      { value: "year", label: "This Year" },
      { value: "custom", label: "10/Aug/2025 to 18/Aug/2025" },
    ],
    project: [
      { value: "", label: "By Project" },
      { value: "all", label: "All Projects" },
      { value: "ocean-park", label: "Ocean Park Residences" },
      { value: "greenville", label: "Greenville District" },
      { value: "miana", label: "Miana Avenue" },
      { value: "skyline", label: "Skyline Heights" },
      { value: "emerald", label: "Emerald Bay" },
      { value: "maaz-palace", label: "Maaz Palace" },
    ],
    department: [
      { value: "", label: "By Department" },
      { value: "all", label: "All Departments" },
      { value: "sales", label: "Sales" },
      { value: "marketing", label: "Marketing" },
      { value: "support", label: "Support" },
    ],
    employee: [
      { value: "", label: "By Employee" },
      { value: "all", label: "All Employees" },
      { value: "all-team", label: "All Team" },
      { value: "sarah", label: "Sarah Johnson" },
      { value: "david", label: "David Wilson" },
      { value: "mike", label: "Mike Chen" },
      { value: "emily", label: "Emily Rodriguez" },
    ],
    sources: [
      { value: "", label: "Lead Source" },
      { value: "qualified-by-caller", label: "Qualified by Caller" },
      { value: "assigned-by-caller", label: "Assigned By Caller" },
      { value: "assigned-by-anuj", label: "Assigned By Anuj" },
      { value: "assigned-by-mustakim", label: "Assigned By Mustakim" },
      { value: "walking", label: "Walking" },
      { value: "website", label: "Website" },
      { value: "referral", label: "Referral" },
    ],
  };

  // Close drawers on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAlertsDrawerOpen(false);
        setAlertsFiltersOpen(false);
        setFollowupsDrawerOpen(false);
        setFollowupsFiltersOpen(false);
        setVisitsDrawerOpen(false);
        setVisitsFiltersOpen(false);
        setMissedFollowupsDrawerOpen(false);
        setMissedFollowupsFiltersOpen(false);
        setInactiveEmployeesDrawerOpen(false);
        setInactiveEmployeesFiltersOpen(false);
        setStaleLeadsDrawerOpen(false);
        setStaleLeadsFiltersOpen(false);
        setHighIntentLeadsDrawerOpen(false);
        setHighIntentLeadsFiltersOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Activity hub handlers
  const handleInactiveEmployeesClick = () => setInactiveEmployeesDrawerOpen(true);
  const handleStaleLeadsClick = () => setStaleLeadsDrawerOpen(true);
  const handleHighIntentLeadsClick = () => setHighIntentLeadsDrawerOpen(true);

  const activityHubs = [
    {
      title: "Inactive Employees (4)",
      color: "text-[var(--primary-base)]",
      icon: <Users size={18} />,
      items: [
        { name: "Abigail Martin", detail: "Idle for 2h" },
        { name: "Shawn Baker", detail: "Idle for 3h" },
      ],
      onClick: handleInactiveEmployeesClick,
    },
    {
      title: "Stale Leads (76)",
      color: "text-[var(--warning)]",
      icon: <AlertCircle size={18} />,
      items: [
        { name: "Imran Khan", detail: "No activity - 5 days" },
        { name: "Khan Niazi", detail: "No activity - 7 days" },
      ],
      onClick: handleStaleLeadsClick,
    },
    {
      title: "High Intent Leads (5)",
      color: "text-[var(--success)]",
      icon: <AlertCircle size={18} />,
      items: [
        { name: "Mark Shard", detail: "Visited twice this week" },
        { name: "Sayed Walid", detail: "Ready to book" },
      ],
      onClick: handleHighIntentLeadsClick,
    },
  ];

  // Load current bookings (leads in deal/booking stage) for Manager/GM dashboard.
  useEffect(() => {
    const run = async () => {
      try {
        setIsBookingsLoading(true);
        const data = await listLeads({ status: "deal", limit: 50 });
        const rows =
          data.leads?.map((lead) => ({
            fullName: lead.name || "—",
            phone: lead.phone || "—",
            avatar: undefined,
            bookingId: lead.id,
            project: lead.project_title || "—",
            unit: "",
            amount: "—",
            agent: lead.assigned_to_user_id ? "Assigned Sales" : "Unassigned",
            status: "confirmed" as const,
            projectName: lead.project_title || undefined,
            projectNameDetail: lead.project_title || undefined,
          })) ?? [];
        setBookingRows(rows);
      } catch {
        setBookingRows([]);
      } finally {
        setIsBookingsLoading(false);
      }
    };

    void run();
  }, []);

  // KPI Data
  const kpiData = [
    {
      icon: <Users size={18} className="text-[var(--primary-base)]" />,
      trend: "+3.2%",
      trendUp: true,
      value: "128",
      label: "Total Leads Assigned",
    },
    {
      icon: <Home size={18} className="text-[var(--success)]" />,
      trend: "+1.8%",
      trendUp: true,
      value: "64",
      label: "Visits Completed",
    },
    {
      icon: <AlertCircle size={18} className="text-[var(--error)]" />,
      trend: "+0.8%",
      trendUp: false,
      value: "116",
      label: "Missed",
    },
    {
      icon: <Calendar size={18} className="text-[var(--warning)]" />,
      trend: "+2.0%",
      trendUp: true,
      value: "12",
      label: "Visits Scheduled",
    },
    {
      icon: <CheckCircle size={18} className="text-[#6366f1]" />,
      trend: "-2.8%",
      trendUp: false,
      value: "27",
      label: "Follow-Ups Done",
    },
  ];

  return (
    <div className="px-4 py-4 sm:p-5 md:p-6 lg:p-8 bg-[var(--background)] min-h-screen" suppressHydrationWarning>
      {/* Performance Summary - KPIs */}
      <section aria-labelledby="performance-summary-heading">
        <h2
          id="performance-summary-heading"
          className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-[var(--text-dark)] text-left"
        >
          Performance Summary
        </h2>
        {/* Mobile: Horizontal scrollable cards */}
        <div className="block sm:hidden mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {isLoading
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-[280px]">
                    <KPICardSkeleton />
                  </div>
                ))
              : kpiData.map((kpi, idx) => (
                  <div key={idx} className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-[280px]">
                    <KPICard
                      icon={kpi.icon}
                      trend={kpi.trend}
                      trendUp={kpi.trendUp}
                      value={kpi.value}
                      label={kpi.label}
                    />
                  </div>
                ))}
          </div>
        </div>
        {/* Desktop: Grid layout */}
        <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {isLoading
            ? Array.from({ length: 5 }).map((_, idx) => <KPICardSkeleton key={idx} />)
            : kpiData.map((kpi, idx) => (
                <KPICard
                  key={idx}
                  icon={kpi.icon}
                  trend={kpi.trend}
                  trendUp={kpi.trendUp}
                  value={kpi.value}
                  label={kpi.label}
                />
              ))}
        </div>
      </section>

      {/* Filter Bar */}
      <Filter
        config={dashboardFilterConfig}
        values={filterValues}
        onChange={(values) => setFilterValues(values)}
        onClear={() => {
          setFilterValues({
            newLeads: false,
            dateRange: "",
            status: "",
            sources: "",
            budget: "",
            project: "",
            stages: "",
            department: "",
            employee: "",
          });
        }}
        itemCount={18}
        itemLabel="Lead"
        showSummary={true}
      />

      {/* Booking Goals Section */}
      <BookingGoalsView
        isLoading={isLoading}
        onSubmit={(data) => {
          console.log("Goal created:", data);
        }}
      />

      {/* Charts and Alerts */}
      <DashboardCharts
        isLoading={isLoading}
        onViewAlerts={() => setAlertsDrawerOpen(true)}
      />

      {/* Recent Follow-ups and Scheduled Visits */}
      <DashboardFollowups
        isLoading={isLoading}
        onViewFollowups={() => setFollowupsDrawerOpen(true)}
        onViewVisits={() => setVisitsDrawerOpen(true)}
      />

      {/* Missed Follow-ups and Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Missed Follow-ups */}
        <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-dark)] flex items-center gap-2">
            <AlertCircle size={18} className="text-[var(--error)]" aria-hidden="true" />
            Missed Follow-ups
          </h2>
          <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
            {[
              { name: "John Doe", days: "Pending since 2 days" },
              { name: "Jane Smith", days: "Pending since 4 days" },
              { name: "Robert Martinez", days: "Pending since 6 days" },
              { name: "Michael Brown", days: "Pending since 3 days" },
              { name: "Amanda Taylor", days: "Pending since 8 days" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-end pb-3 border-b border-[var(--surface-neutral)] last:border-b-0"
              >
                <div>
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)]">{item.days}</p>
                </div>
                <button
                  className="px-2 py-1 border border-[var(--border-color)] rounded-md text-xs hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
                  aria-label={`Reschedule follow-up for ${item.name}`}
                >
                  Reschedule
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setMissedFollowupsDrawerOpen(true)}
            className="w-full px-4 py-2.5 bg-[var(--error)] text-white rounded-md text-sm font-medium hover:opacity-90 transition-colors mt-4 focus:outline-none focus:ring-2 focus:ring-[var(--error)] focus:ring-offset-2"
            aria-label="View all missed follow-ups"
          >
            Urgent Action Needed
          </button>
        </div>

        {/* Lead Sources */}
        <PieChart
          title="Lead Sources"
          data={[
            { name: "Booking.com", value: 75, color: "#0082E0" },
            { name: "Walking", value: 25, color: "#98A2B3" },
          ]}
          height={250}
          innerRadius={60}
          outerRadius={80}
          showLegend={true}
          legendColumns={2}
        />
      </div>

      {/* Smart Activity Hub */}
      <SmartActivityHub isLoading={isLoading} hubs={activityHubs} />

      {/* Current Bookings Table */}
      <DashboardBookings isLoading={isBookingsLoading} bookings={bookingRows} />

      {/* Top Performing Projects */}
      <DashboardProjects isLoading={isLoading} />

      {/* Drawers */}
      <Drawer
        isOpen={alertsDrawerOpen}
        onClose={() => {
          setAlertsDrawerOpen(false);
          setAlertsFiltersOpen(false);
        }}
        title="Manager Alerts"
        subtitle="View and manage all alerts"
      >
        <SearchBar
          placeholder="Search alerts..."
          value={alertsSearch}
          onChange={setAlertsSearch}
          onClear={() => setAlertsSearch("")}
          showClear={alertsSearch.length > 0}
          onFilterToggle={() => setAlertsFiltersOpen(!alertsFiltersOpen)}
        />
        {alertsFiltersOpen && (
          <div className="px-4 sm:px-6 py-5 border-b border-[var(--border-color)] bg-[var(--surface-neutral)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Status
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>All Status</option>
                <option>Active</option>
                <option>Resolved</option>
                <option>Pending</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Priority
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>All Priorities</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Type
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>All Types</option>
                <option>Performance</option>
                <option>Lead Management</option>
                <option>Follow-up</option>
                <option>Visit</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Date Range
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>Last 24 Hours</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Custom</option>
              </select>
            </div>
            <button
              className="px-4 py-2 border border-[var(--border-color)] rounded-md text-sm hover:bg-[var(--hover-bg)] transition-colors self-end focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
              onClick={() => setAlertsFiltersOpen(false)}
              aria-label="Clear filters"
            >
              Clear Filters
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {[
            {
              type: "danger",
              title: "Low Performance",
              time: "1m ago",
              message: "Sarah completed 2/10 visits today.",
              priority: "Critical",
              actions: ["View Details", "Resolve"],
            },
            {
              type: "warning",
              title: "Hot Lead Pending",
              time: "5m ago",
              message: "Facebook lead unassigned for 4h.",
              priority: "High",
              actions: ["View Details", "Assign"],
            },
          ].map((alert, idx) => (
            <div
              key={idx}
              className={`mb-3 p-3 rounded-lg border-l-4 ${
                alert.type === "danger"
                  ? "bg-[var(--surface-error)] border-[var(--error)]"
                  : "bg-[var(--surface-warning)] border-[var(--warning)]"
              }`}
              role="alert"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <strong className="block mb-1 text-sm font-semibold text-[var(--text-dark)]">
                    {alert.title}
                  </strong>
                  <p className="text-xs text-[var(--text-secondary)] m-0">{alert.message}</p>
                </div>
                <div className="text-right">
                  <small className="block text-xs text-[var(--text-secondary)] mb-1">
                    {alert.time}
                  </small>
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      alert.priority === "Critical"
                        ? "bg-[var(--error)] text-white"
                        : "bg-[var(--warning)] text-white"
                    }`}
                  >
                    {alert.priority}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {alert.actions.map((action, i) => (
                  <button
                    key={i}
                    className="px-3 py-1 border border-[var(--border-color)] rounded-md text-xs hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                    aria-label={action}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Follow-ups Drawer */}
      <Drawer
        isOpen={followupsDrawerOpen}
        onClose={() => {
          setFollowupsDrawerOpen(false);
          setFollowupsFiltersOpen(false);
        }}
        title="Recent Follow-ups"
        subtitle="View and manage all follow-ups"
        icon={<PhoneCall size={20} />}
      >
        <SearchBar
          placeholder="Search follow-ups..."
          value={followupsSearch}
          onChange={setFollowupsSearch}
          onClear={() => setFollowupsSearch("")}
          showClear={followupsSearch.length > 0}
          onFilterToggle={() => setFollowupsFiltersOpen(!followupsFiltersOpen)}
        />
        {followupsFiltersOpen && (
          <div className="px-4 sm:px-6 py-5 border-b border-[var(--border-color)] bg-[var(--surface-neutral)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Status
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>All Status</option>
                <option>Interested</option>
                <option>Rescheduled</option>
                <option>Not Interested</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Project
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>All Projects</option>
                <option>Ocean Park Residences</option>
                <option>Greenville District</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Time Range
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>Last 24 Hours</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <button
              className="px-4 py-2 border border-[var(--border-color)] rounded-md text-sm hover:bg-[var(--hover-bg)] transition-colors self-end sm:col-span-2 lg:col-span-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
              onClick={() => setFollowupsFiltersOpen(false)}
              aria-label="Clear filters"
            >
              Clear Filters
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {[
            {
              name: "Sarah Johnson",
              project: "Ocean Park Residences",
              phone: "+1 234 567 8900",
              status: "Interested",
              statusColor: "bg-[var(--surface-success)] text-[var(--success-text)]",
              time: "2 hours ago",
            },
            {
              name: "Mike Chen",
              project: "Greenville District",
              phone: "+1 234 567 8901",
              status: "Rescheduled",
              statusColor: "bg-[var(--surface-warning)] text-[#92400e]",
              time: "4 hours ago",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 border border-[var(--border-color)] rounded-lg mb-3 bg-[var(--background)]"
            >
              <div className="flex flex-col gap-3 w-full">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">{item.project}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Phone size={14} aria-hidden="true" />
                      <span>{item.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.statusColor}`}>
                        {item.status}
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] m-0 whitespace-nowrap">
                        {item.time}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-md text-xs hover:bg-[var(--hover-bg)] transition-colors min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  aria-label={`View details for ${item.name}`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Visits Drawer */}
      <Drawer
        isOpen={visitsDrawerOpen}
        onClose={() => {
          setVisitsDrawerOpen(false);
          setVisitsFiltersOpen(false);
        }}
        title="Scheduled Visits"
        subtitle="View and manage all scheduled visits"
        icon={<CalendarDays size={20} />}
      >
        <SearchBar
          placeholder="Search visits..."
          value={visitsSearch}
          onChange={setVisitsSearch}
          onClear={() => setVisitsSearch("")}
          showClear={visitsSearch.length > 0}
          onFilterToggle={() => setVisitsFiltersOpen(!visitsFiltersOpen)}
        />
        {visitsFiltersOpen && (
          <div className="px-4 sm:px-6 py-5 border-b border-[var(--border-color)] bg-[var(--surface-neutral)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Date Range
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>Today</option>
                <option>Tomorrow</option>
                <option>This Week</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                Project
              </label>
              <select className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md text-sm min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]">
                <option>All Projects</option>
                <option>Ocean Park Residences</option>
                <option>Greenville District</option>
              </select>
            </div>
            <button
              className="px-4 py-2 border border-[var(--border-color)] rounded-md text-sm hover:bg-[var(--hover-bg)] transition-colors self-end sm:col-span-2 lg:col-span-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
              onClick={() => setVisitsFiltersOpen(false)}
              aria-label="Clear filters"
            >
              Clear Filters
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {[
            {
              name: "David Wilson",
              project: "Miana Avenue",
              phone: "+1 234 567 8902",
              time: "Today 2:00 PM",
              status: "Confirmed",
              statusColor: "bg-[var(--surface-success)] text-[var(--success-text)]",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 border border-[var(--border-color)] rounded-lg mb-3 bg-[var(--background)]"
            >
              <div className="flex flex-col gap-3 w-full">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">{item.project}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Phone size={14} aria-hidden="true" />
                      <span>{item.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-md text-xs font-semibold bg-[#e0f2fe] text-[#0369a1]">
                        {item.time}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.statusColor}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-md text-xs hover:bg-[var(--hover-bg)] transition-colors min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  aria-label={`View details for ${item.name}`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Missed Follow-ups Drawer */}
      <Drawer
        isOpen={missedFollowupsDrawerOpen}
        onClose={() => {
          setMissedFollowupsDrawerOpen(false);
          setMissedFollowupsFiltersOpen(false);
        }}
        title="Missed Follow-ups"
        subtitle="View and manage all missed follow-ups"
        icon={<AlertCircle size={20} className="text-[var(--error)]" />}
      >
        <SearchBar
          placeholder="Search missed follow-ups..."
          value={missedFollowupsSearch}
          onChange={setMissedFollowupsSearch}
          onClear={() => setMissedFollowupsSearch("")}
          showClear={missedFollowupsSearch.length > 0}
          onFilterToggle={() => setMissedFollowupsFiltersOpen(!missedFollowupsFiltersOpen)}
        />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {[
            {
              name: "John Doe",
              project: "Ocean Park Residences",
              phone: "+1 234 567 8907",
              days: "Pending since 2 days",
              priority: "Critical",
              priorityColor: "bg-[var(--error)] text-white",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 border border-[var(--border-color)] rounded-lg mb-3 bg-[var(--background)]"
            >
              <div className="flex flex-col gap-3 w-full">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">{item.project}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <Phone size={14} aria-hidden="true" />
                      <span>{item.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-md text-xs font-semibold bg-[var(--surface-error)] text-[#991b1b]">
                        {item.days}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.priorityColor}`}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="w-full px-4 py-2 border border-[var(--border-color)] rounded-md text-xs hover:bg-[var(--hover-bg)] transition-colors min-h-[44px] sm:min-h-auto focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  aria-label={`Reschedule follow-up for ${item.name}`}
                >
                  Reschedule
                </button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Inactive Employees Drawer */}
      <Drawer
        isOpen={inactiveEmployeesDrawerOpen}
        onClose={() => {
          setInactiveEmployeesDrawerOpen(false);
          setInactiveEmployeesFiltersOpen(false);
        }}
        title="Inactive Employees"
        subtitle="View and manage all inactive employees"
        icon={<Users size={20} />}
      >
        <SearchBar
          placeholder="Search employees..."
          value={inactiveEmployeesSearch}
          onChange={setInactiveEmployeesSearch}
          onClear={() => setInactiveEmployeesSearch("")}
          showClear={inactiveEmployeesSearch.length > 0}
          onFilterToggle={() => setInactiveEmployeesFiltersOpen(!inactiveEmployeesFiltersOpen)}
        />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {[
            { name: "Abigail Martin", detail: "Idle for 2h", team: "Team A" },
            { name: "Shawn Baker", detail: "Idle for 3h", team: "Team B" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 border border-[var(--border-color)] rounded-lg mb-3 bg-[var(--background)]"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{item.team}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
                </div>
                <button
                  className="px-3 py-1 border border-[var(--border-color)] rounded-md text-xs hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  aria-label={`View details for ${item.name}`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Stale Leads Drawer */}
      <Drawer
        isOpen={staleLeadsDrawerOpen}
        onClose={() => {
          setStaleLeadsDrawerOpen(false);
          setStaleLeadsFiltersOpen(false);
        }}
        title="Stale Leads"
        subtitle="View and manage all stale leads"
        icon={<AlertCircle size={20} className="text-[var(--warning)]" />}
      >
        <SearchBar
          placeholder="Search leads..."
          value={staleLeadsSearch}
          onChange={setStaleLeadsSearch}
          onClear={() => setStaleLeadsSearch("")}
          showClear={staleLeadsSearch.length > 0}
          onFilterToggle={() => setStaleLeadsFiltersOpen(!staleLeadsFiltersOpen)}
        />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {[
            { name: "Imran Khan", detail: "No activity - 5 days", project: "Ocean Park" },
            { name: "Khan Niazi", detail: "No activity - 7 days", project: "Greenville" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 border border-[var(--border-color)] rounded-lg mb-3 bg-[var(--background)]"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{item.project}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
                </div>
                <button
                  className="px-3 py-1 border border-[var(--border-color)] rounded-md text-xs hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  aria-label={`View details for ${item.name}`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* High Intent Leads Drawer */}
      <Drawer
        isOpen={highIntentLeadsDrawerOpen}
        onClose={() => {
          setHighIntentLeadsDrawerOpen(false);
          setHighIntentLeadsFiltersOpen(false);
        }}
        title="High Intent Leads"
        subtitle="View and manage all high intent leads"
        icon={<AlertCircle size={20} />}
      >
        <SearchBar
          placeholder="Search leads..."
          value={highIntentLeadsSearch}
          onChange={setHighIntentLeadsSearch}
          onClear={() => setHighIntentLeadsSearch("")}
          showClear={highIntentLeadsSearch.length > 0}
          onFilterToggle={() => setHighIntentLeadsFiltersOpen(!highIntentLeadsFiltersOpen)}
        />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {[
            { name: "Mark Shard", detail: "Visited twice this week", project: "Ocean Park" },
            { name: "Sayed Walid", detail: "Ready to book", project: "Greenville" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 border border-[var(--border-color)] rounded-lg mb-3 bg-[var(--background)]"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">{item.project}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
                </div>
                <button
                  className="px-3 py-1 border border-[var(--border-color)] rounded-md text-xs hover:bg-[var(--hover-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                  aria-label={`View details for ${item.name}`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
