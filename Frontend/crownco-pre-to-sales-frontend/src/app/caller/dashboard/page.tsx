"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Home, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Phone,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  MessageSquare,
  Building2,
  ShoppingCart,
  RefreshCw
} from "lucide-react";
import { KPICard } from "@/components/ui/cards/kpi";
import { RevenueMetricsCard } from "@/components/ui/cards/RevenueMetricsCard";
import { BarChart } from "@/components/ui/charts/barChart";
import { LineChart } from "@/components/ui/charts/lineChart";
import { ActivitiesTabbedTable, PerformanceTabbedTable } from "@/components/ui/tabel/TabbedTable";
import { DateRangePicker } from "@/components/ui/inputs/DateRangePicker";
import { ActivityFeed } from "@/components/ui/lists/ActivityFeed";
import { AlertWidget } from "@/components/ui/feedback/AlertWidget";
import { QuickLinks } from "@/components/ui/navigation/QuickLinks";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const router = useRouter();
  const [showAllKPIs, setShowAllKPIs] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: new Date(),
    end: new Date(),
  });

  // KPI Data aligned with Sales/Pre-Sales emoji-based icons (with navigation)
  const kpiData = useMemo(() => [
    {
      icon: "👤",
      value: "128",
      label: "My Leads",
      trend: "+12.5%",
      trendUp: true,
      color: "var(--primary-base)",
      href: "/caller/lead-list",
    },
    {
      icon: "🏠",
      value: "45",
      label: "Property Visited",
      trend: "+8.2%",
      trendUp: true,
      color: "var(--success)",
      href: "/caller/lead-list?filter=site-visit",
    },
    {
      icon: "📅",
      value: "23",
      label: "Booking",
      trend: "+15.3%",
      trendUp: true,
      color: "var(--success)",
      href: "/caller/lead-list?filter=booking",
    },
    {
      icon: "✋",
      value: "12",
      label: "Rejected",
      trend: "-5.1%",
      trendUp: false,
      color: "var(--error)",
      href: "/caller/lead-list?filter=rejected",
    },
    {
      icon: "📈",
      value: "18.2%",
      label: "Conversion",
      trend: "+2.4%",
      trendUp: true,
      color: "var(--primary-base)",
    },
    {
      icon: "📞",
      value: "342",
      label: "Total Calls",
      trend: "+22.1%",
      trendUp: true,
      color: "var(--secondary-base)",
    },
  ], []);

  // Revenue/Value Metrics KPIs
  const revenueKPIs = useMemo(() => [
    {
      icon: <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />,
      value: "₹2.4Cr",
      label: "Total Quotation Value",
      trend: "+18.5%",
      trendUp: true,
      color: "var(--primary-base)",
      href: "/quotation",
    },
    {
      icon: <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />,
      value: "₹1.8Cr",
      label: "Booking Value",
      trend: "+22.3%",
      trendUp: true,
      color: "var(--success)",
      href: "/caller/lead-list?filter=booking",
    },
    {
      icon: <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />,
      value: "₹45L",
      label: "Avg Deal Size",
      trend: "+5.2%",
      trendUp: true,
      color: "var(--secondary-base)",
    },
  ], []);

  // Pipeline Data
  const revenueTrendData = useMemo(() => [
    // Values are in Lakhs (₹L) for easy chart readability
    { name: "Aug", Quotation: 160, Booking: 110 },
    { name: "Sep", Quotation: 175, Booking: 120 },
    { name: "Oct", Quotation: 190, Booking: 135 },
    { name: "Nov", Quotation: 205, Booking: 150 },
    { name: "Dec", Quotation: 220, Booking: 165 },
    { name: "Jan", Quotation: 240, Booking: 180 },
  ], []);

  // Leads & Calls Overview Data
  const leadsCallsData = useMemo(() => [
    { name: "Mon", Leads: 45, Calls: 62 },
    { name: "Tue", Leads: 52, Calls: 58 },
    { name: "Wed", Leads: 48, Calls: 71 },
    { name: "Thu", Leads: 61, Calls: 65 },
    { name: "Fri", Leads: 55, Calls: 68 },
    { name: "Sat", Leads: 38, Calls: 42 },
    { name: "Sun", Leads: 28, Calls: 36 },
  ], []);

  // Scheduled Visits Data
  const scheduledVisits = useMemo(() => [
    {
      name: "Rajesh Kumar",
      avatar: "/Avatar_images (1).png",
      time: "10:00 AM",
      status: "pending" as const,
    },
    {
      name: "Priya Sharma",
      avatar: "/Avatar_images (2).png",
      time: "2:30 PM",
      status: "pending" as const,
    },
    {
      name: "Amit Patel",
      avatar: "/Avatar_images (3).png",
      time: "4:00 PM",
      status: "completed" as const,
    },
    {
      name: "Sneha Reddy",
      avatar: "/Avatar_images (4).png",
      time: "11:00 AM",
      status: "revisit" as const,
    },
  ], []);

  // Today's Priorities Data
  const todayPriorities = useMemo(() => [
    {
      id: "1",
      title: "Missed Follow-ups",
      description: "5 leads need immediate attention",
      time: "Overdue",
      status: "missed" as const,
      count: 5,
    },
    {
      id: "2",
      title: "Very Hot Leads",
      description: "3 leads require urgent follow-up",
      time: "Today",
      status: "urgent" as const,
      count: 3,
    },
    {
      id: "3",
      title: "Pending Quotations",
      description: "2 quotations awaiting approval",
      time: "Pending",
      status: "pending" as const,
      count: 2,
    },
    {
      id: "4",
      title: "Today's Follow-ups",
      description: "8 scheduled follow-ups today",
      time: "Today",
      status: "pending" as const,
      count: 8,
    },
  ], []);

  // Follow Ups Data
  const followUps = useMemo(() => [
    {
      id: "1",
      leadName: "Rajesh Kumar",
      type: "Call" as const,
      scheduledTime: "10:00 AM",
      status: "pending" as const,
      priority: "high" as const,
    },
    {
      id: "2",
      leadName: "Priya Sharma",
      type: "Email" as const,
      scheduledTime: "2:30 PM",
      status: "pending" as const,
      priority: "medium" as const,
    },
    {
      id: "3",
      leadName: "Amit Patel",
      type: "Call" as const,
      scheduledTime: "Yesterday 4:00 PM",
      status: "missed" as const,
      priority: "high" as const,
    },
    {
      id: "4",
      leadName: "Sneha Reddy",
      type: "Message" as const,
      scheduledTime: "11:00 AM",
      status: "completed" as const,
      priority: "low" as const,
    },
    {
      id: "5",
      leadName: "Vikram Singh",
      type: "Call" as const,
      scheduledTime: "3:00 PM",
      status: "pending" as const,
      priority: "medium" as const,
    },
  ], []);

  // Top Projects Data with Unsplash Images
  const topProjects = useMemo(() => [
    {
      id: "1",
      name: "Maaz Palace",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop&q=80",
      visits: 45,
      revisits: 25,
      bookings: 12,
      conversion: "5.60%",
    },
    {
      id: "2",
      name: "GreenVille Orchid",
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop&q=80",
      visits: 22,
      revisits: 10,
      bookings: 2,
      conversion: "0.80%",
    },
    {
      id: "3",
      name: "Zara Palace",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop&q=80",
      visits: 45,
      revisits: 25,
      bookings: 12,
      conversion: "8.60%",
    },
    {
      id: "4",
      name: "Crown Heights",
      image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop&q=80",
      visits: 38,
      revisits: 18,
      bookings: 15,
      conversion: "6.20%",
    },
    {
      id: "5",
      name: "Urban Nest",
      image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop&q=80",
      visits: 52,
      revisits: 30,
      bookings: 18,
      conversion: "7.50%",
    },
    {
      id: "6",
      name: "Royal Gardens",
      image: "https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=800&h=600&fit=crop&q=80",
      visits: 35,
      revisits: 20,
      bookings: 10,
      conversion: "4.20%",
    },
    {
      id: "7",
      name: "Elite Residency",
      image: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop&q=80",
      visits: 48,
      revisits: 28,
      bookings: 16,
      conversion: "9.10%",
    },
    {
      id: "8",
      name: "Prestige Towers",
      image: "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800&h=600&fit=crop&q=80",
      visits: 40,
      revisits: 22,
      bookings: 14,
      conversion: "6.80%",
    },
  ], []);

  // Leaderboard Data
  const leaderboardData = useMemo(() => ({
    featured: {
      rank: "#1",
      name: "Sarah Johnson",
      points: "1,245 Points",
      avatar: "/pexels-karola-g-6345317.jpg",
    },
    stats: [
      { icon: <Phone className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />, label: "Calls" },
      { icon: <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />, label: "Leads" },
      { icon: <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />, label: "Bookings" },
    ],
    performers: [
      {
        rank: "#2",
        name: "Michael Chen",
        points: "1,180 Points",
        avatar: "/Avatar_images (1).png",
      },
      {
        rank: "#3",
        name: "Emily Davis",
        points: "1,095 Points",
        avatar: "/Avatar_images (2).png",
      },
      {
        rank: "#4",
        name: "David Wilson",
        points: "1,020 Points",
        avatar: "/Avatar_images (3).png",
      },
      {
        rank: "#5",
        name: "Lisa Anderson",
        points: "980 Points",
        avatar: "/Avatar_images (4).png",
      },
    ],
  }), []);

  // Activities TabbedTable ke liye data prepare karein
  const activitiesTabbedTableData = useMemo(() => ({
    priorities: todayPriorities,
    followUps: followUps,
    scheduledVisits: scheduledVisits,
  }), [todayPriorities, followUps, scheduledVisits]);

  // Performance TabbedTable ke liye data prepare karein
  const performanceTabbedTableData = useMemo(() => ({
    projects: topProjects,
    leaderboard: leaderboardData,
  }), [topProjects, leaderboardData]);

  // Stage-wise Stats Data
  const stageStats = useMemo(() => [
    {
      stage: "New Leads",
      count: 128,
      percentage: 100,
      status: "normal" as const,
      onClick: () => router.push("/caller/lead-list?filter=new"),
    },
    {
      stage: "Qualified",
      count: 75,
      percentage: 58.6,
      status: "normal" as const,
      onClick: () => router.push("/caller/lead-list?filter=qualified"),
    },
    {
      stage: "Site Visit",
      count: 45,
      percentage: 35.2,
      status: "normal" as const,
      onClick: () => router.push("/caller/lead-list?filter=site-visit"),
    },
    {
      stage: "Negotiation",
      count: 32,
      percentage: 25.0,
      status: "warning" as const,
      trend: { value: 12, isUp: false },
      onClick: () => router.push("/caller/lead-list?filter=negotiation"),
    },
    {
      stage: "Booking",
      count: 23,
      percentage: 18.0,
      status: "normal" as const,
      onClick: () => router.push("/caller/lead-list?filter=booking"),
    },
  ], [router]);

  // Recent Activities Data
  const recentActivities = useMemo(() => [
    {
      id: "1",
      type: "lead" as const,
      title: "New lead: Rajesh Kumar",
      description: "Interested in 2BHK, budget 50L-60L",
      time: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      onClick: () => router.push("/caller/lead-list/lead-detail/qualification/overview"),
      badge: "New",
    },
    {
      id: "2",
      type: "call" as const,
      title: "Call completed: Priya Sharma",
      description: "Discussed Maaz Palace project details",
      time: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
      onClick: () => router.push("/caller/lead-list/lead-detail/communication/overview"),
    },
    {
      id: "3",
      type: "quotation" as const,
      title: "Quotation created: Amit Patel",
      description: "Maaz Palace - Wing A, Flat 301 - ₹67L",
      time: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      onClick: () => router.push("/quotation/quotation-detail"),
      badge: "Pending",
    },
    {
      id: "4",
      type: "visit" as const,
      title: "Site visit scheduled: Sneha Reddy",
      description: "Maaz Palace - Tomorrow 10:00 AM",
      time: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      onClick: () => router.push("/caller/lead-list/lead-detail/site-visit/overview"),
    },
    {
      id: "5",
      type: "booking" as const,
      title: "Booking confirmed: Vikram Singh",
      description: "GreenVille Orchid - Wing B, Flat 205",
      time: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      onClick: () => router.push("/caller/lead-list/lead-detail/booking/overview"),
      badge: "Confirmed",
    },
  ], [router]);

  // Alerts Data
  const alerts = useMemo(() => [
    {
      id: "1",
      type: "warning" as const,
      title: "5 Missed Follow-ups",
      message: "These leads need immediate attention",
      action: {
        label: "View Leads",
        onClick: () => router.push("/caller/lead-list?filter=missed-followups"),
      },
      onDismiss: () => setDismissedAlerts(prev => [...prev, "1"]),
    },
    {
      id: "2",
      type: "info" as const,
      title: "2 Pending Quotations",
      message: "Awaiting customer approval",
      action: {
        label: "View Quotations",
        onClick: () => router.push("/quotation?filter=pending"),
      },
      onDismiss: () => setDismissedAlerts(prev => [...prev, "2"]),
    },
  ], [router]);

  // Filter visible alerts
  const visibleAlerts = useMemo(() => 
    alerts.filter(alert => !dismissedAlerts.includes(alert.id)),
    [alerts, dismissedAlerts]
  );

  // Quick Links Data
  const quickLinks = useMemo(() => [
    {
      id: "1",
      icon: <Users className="w-5 h-5 sm:w-6 sm:h-6" />,
      label: "All Leads",
      href: "/caller/lead-list",
      description: "View and manage all leads",
      badge: 128,
      color: "var(--primary-base)",
    },
    {
      id: "2",
      icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />,
      label: "Quotations",
      href: "/quotation",
      description: "Manage quotations",
      badge: 12,
      color: "var(--secondary-base)",
    },
    {
      id: "3",
      icon: <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />,
      label: "Projects",
      href: "/caller/project-inventory",
      description: "Browse project inventory",
      color: "var(--success)",
    },
    {
      id: "4",
      icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />,
      label: "Today's Visits",
      href: "/caller/lead-list?filter=today-visits",
      description: "View scheduled visits",
      badge: 4,
      color: "var(--warning)",
    },
  ], []);

  const handleItemClick = (item: any, tabId: string) => {
    console.log("Item clicked:", item, "Tab:", tabId);
    // Yahan aap navigation ya modal open kar sakte hain
  };

  // Refresh handler
  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call - in real app, this would fetch fresh data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  // Quick filter handler
  const handleQuickFilter = (filter: 'today' | 'week' | 'month') => {
    setQuickFilter(filter);
    const today = new Date();
    let start: Date = new Date(today);
    
    switch(filter) {
      case 'today':
        start = new Date(today.setHours(0, 0, 0, 0));
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start = new Date(today);
        start.setMonth(today.getMonth() - 1);
        break;
    }
    
    setDateRange({ start, end: new Date() });
  };

  // Date range change handler - triggers data filtering
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      // In real implementation, this would filter data from API
      // For now, we'll just mark that filtering should happen
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [dateRange]);

  // Skeleton Loader Component
  const SkeletonCard = () => (
    <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-pulse">
      <div className="flex justify-between items-start mb-2">
        <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
        <div className="w-16 h-6 bg-slate-200 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="w-24 h-8 bg-slate-200 rounded"></div>
        <div className="w-32 h-4 bg-slate-200 rounded"></div>
      </div>
    </div>
  );
// Stage-wise Stats Data ke baad
const [selectedStageIndex, setSelectedStageIndex] = useState(0);
const selectedStage = stageStats[selectedStageIndex];
  // Empty State Component
  const EmptyState = ({ 
    icon, 
    title, 
    description 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    description: string;
  }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 max-w-md">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen ">
      <div className="max-w-[1920px] mx-auto space-y-6 sm:space-y-8 lg:space-y-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header with Quick Actions */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:gap-5">
            {/* Top Row: Title, Create Quotation Button, and Date Range */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 tracking-tight mb-2">
                  Dashboard
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-slate-600">
                  Welcome back! Here's your performance overview.
                </p>
              </div>
              {/* Quick Filters, Refresh, and Date Range Filter */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                {/* Quick Filters */}
                <div className="flex items-center gap-1 border-r border-slate-200 pr-2 sm:pr-3 flex-shrink-0">
                  <button
                    onClick={() => handleQuickFilter('today')}
                    className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      quickFilter === 'today' 
                        ? 'bg-[var(--primary-base)] text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleQuickFilter('week')}
                    className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      quickFilter === 'week' 
                        ? 'bg-[var(--primary-base)] text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => handleQuickFilter('month')}
                    className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      quickFilter === 'month' 
                        ? 'bg-[var(--primary-base)] text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Month
                  </button>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="
                    p-2 sm:p-2.5 rounded-lg bg-white border border-slate-200 
                    shadow-[0_1px_2px_rgba(0,0,0,0.05)] 
                    hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]
                    hover:border-slate-300 hover:-translate-y-0.5
                    transition-all duration-200 active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex-shrink-0
                  "
                  aria-label="Refresh dashboard"
                >
                  <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>

                {/* Date Range Filter */}
                <div className="flex-shrink-0">
                  <DateRangePicker
                    value={dateRange}
                    onChange={(range) => {
                      setDateRange(range);
                      setQuickFilter('custom');
                    }}
                    presets={["custom"]}
                    variant="dropdown"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid - 2 Rows with Show More/Less (4 KPIs in first row) */}

        <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 xl:p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">

          {/* First Row - Always Visible (First 4 KPIs) */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-4 sm:mb-5">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-4 sm:mb-5">
              {kpiData.slice(0, 4).map((kpi, index) => (
                <div
                  key={index}
                  className="fade-in-up"
                  style={{ animationDelay: `${50 + index * 50}ms` }}
                >
                  <KPICard
                    icon={kpi.icon}
                    value={kpi.value}
                    label={kpi.label}
                    trend={kpi.trend}
                    trendUp={kpi.trendUp}
                    color={kpi.color}
                    href={kpi.href}
                    isClickable={!!kpi.href}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Second Row - Conditionally Visible (Remaining KPIs) */}
          {showAllKPIs && kpiData.length > 4 && (
            <>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 fade-in-up">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 fade-in-up">
                  {kpiData.slice(4, 8).map((kpi, index) => (
                    <div
                      key={index + 4}
                      className="fade-in-up"
                      style={{ animationDelay: `${200 + index * 50}ms` }}
                    >
                      <KPICard
                        icon={kpi.icon}
                        value={kpi.value}
                        label={kpi.label}
                        trend={kpi.trend}
                        trendUp={kpi.trendUp}
                        color={kpi.color}
                        href={kpi.href}
                        isClickable={!!kpi.href}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Toggle Button */}
          {kpiData.length > 4 && (
            <div className="flex justify-center">
              <Button
                onClick={() => setShowAllKPIs(!showAllKPIs)}
                variant="outline"
                className="bg-white shadow-sm hover:shadow-md"
              >
                <span>{showAllKPIs ? "Show Less" : `Show ${kpiData.length - 4} More`}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAllKPIs ? "rotate-180" : ""}`} />
              </Button>
            </div>
          )}
        </section>

        {/* Revenue Metrics Section */}
        <section className="mb-6 sm:mb-8">
          <div className="fade-in-up" style={{ animationDelay: "300ms" }}>
            {isLoading ? (
              <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] animate-pulse">
                <div className="h-8 w-48 bg-slate-200 rounded mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            ) : (
              <RevenueMetricsCard
                metrics={revenueKPIs}
                title="Revenue & Value Metrics"
                variant="minimal"
              />
            )}
          </div>
        </section>

        {/* Alerts Section */}
        {visibleAlerts.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <div className="fade-in-up" style={{ animationDelay: "100ms" }}>
              <AlertWidget alerts={visibleAlerts} maxItems={3} />
            </div>
          </section>
        )}

        {/* Pipeline Stages - Focused Detail View */}
<section className="mb-6 sm:mb-8">
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
    {/* Header */}
    <div className="flex items-center justify-between mb-4 sm:mb-5">
      <div>
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">
          Pipeline Stages
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Click a stage to see detailed insights
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
      {/* Left: Stage List / Tabs */}
      <div className="md:col-span-1">
        <div className="space-y-1.5">
          {stageStats.map((stage, index) => {
            const isActive = index === selectedStageIndex;
            const isWarning = stage.status === "warning";

            return (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedStageIndex(index)}
                className={`
                  w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl
                  border text-left transition-all duration-200
                  ${isActive
                    ? "border-[var(--primary-base)] bg-[var(--primary-soft)]"
                    : "border-slate-200/70 bg-white/40 hover:bg-slate-50"
                  }
                `}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`
                    inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold
                    ${isActive
                      ? "bg-[var(--primary-base)] text-white"
                      : "bg-slate-100 text-slate-700"
                    }
                  `}>
                    {index + 1}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                    {stage.stage}
                  </span>
                  {isWarning && (
                    <span className="hidden sm:inline text-[10px] px-1.5 py-[1px] rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Attention
                    </span>
                  )}
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  {stage.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Selected Stage Detail */}
      <div className="md:col-span-2">
        <div className="h-full rounded-2xl border border-slate-200/80 bg-white/80 p-4 sm:p-5 flex flex-col">
          {/* Title & primary info */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                {selectedStage.stage}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                {selectedStage.count.toLocaleString()} leads •{" "}
                {selectedStage.percentage.toFixed(1)}% of pipeline
              </p>
            </div>
            <button
              type="button"
              onClick={selectedStage.onClick}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-[var(--primary-base)] hover:text-[var(--primary-base)] transition-colors"
            >
              View leads
              <span className="text-[10px]">→</span>
            </button>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span>Stage fill</span>
              <span>{selectedStage.percentage.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className={`
                  h-full rounded-full transition-all duration-700
                  ${selectedStage.status === "warning"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                  }
                `}
                style={{ width: `${Math.min(selectedStage.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm mb-4">
            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-[11px] text-slate-500 mb-1">
                Leads in this stage
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {selectedStage.count}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50">
              <div className="text-[11px] text-slate-500 mb-1">
                Share of pipeline
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {selectedStage.percentage.toFixed(1)}%
              </div>
            </div>

            {selectedStage.trend && (
              <div className={`
                p-3 rounded-xl
                ${selectedStage.trend.isUp ? "bg-emerald-50" : "bg-red-50"}
              `}>
                <div className="text-[11px] text-slate-500 mb-1">
                  Trend vs last period
                </div>
                <div className={`text-lg sm:text-xl font-bold ${
                  selectedStage.trend.isUp ? "text-emerald-700" : "text-red-700"
                }`}>
                  {selectedStage.trend.isUp ? "↑" : "↓"}{" "}
                  {Math.abs(selectedStage.trend.value)}%
                </div>
              </div>
            )}
          </div>

          {/* Helper text */}
          <p className="mt-auto text-[11px] sm:text-xs text-slate-500">
            Tip: Use this view to quickly spot which stage is overloaded or dropping,
            then click “View leads” to drill down.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

        {/* Recent Activity Feed & Activities TabbedTable */}
        <section className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {/* Recent Activity Feed */}
            <div className="lg:col-span-1 fade-in-up" style={{ animationDelay: "600ms" }}>
              {recentActivities.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-4 sm:mb-5">
                    Recent Activity
                  </h2>
                  <EmptyState
                    icon={<Clock className="w-8 h-8 text-slate-400" />}
                    title="No Recent Activity"
                    description="Your recent activities will appear here once you start working with leads."
                  />
                </div>
              ) : (
                <ActivityFeed
                  activities={recentActivities}
                  maxItems={5}
                  title="Recent Activity"
                  showViewMore={true}
                  onViewMore={() => router.push("/caller/lead-list")}
                />
              )}
            </div>
            
            {/* Activities TabbedTable */}
            <div className="lg:col-span-2 fade-in-up" style={{ animationDelay: "650ms" }}>
              <ActivitiesTabbedTable
                title="Activities"
                data={activitiesTabbedTableData}
                onItemClick={handleItemClick}
              />
            </div>
          </div>
        </section>

        {/* MEDIUM-HIGH PRIORITY: Analytics Section - Pipeline & Charts */}
        <section className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
            <div className="fade-in-up" style={{ animationDelay: "600ms" }}>
              <LineChart
                title="Revenue Overview (₹L)"
                data={revenueTrendData}
                lines={[
                  { dataKey: "Quotation", name: "Quotation (₹L)", color: "var(--primary-base)" },
                  { dataKey: "Booking", name: "Booking (₹L)", color: "var(--success)" },
                ]}
                height={300}
              />
            </div>
            <div className="fade-in-up" style={{ animationDelay: "650ms" }}>
              <BarChart
                title="Leads & Calls Overview"
                data={leadsCallsData}
                bars={[
                  { dataKey: "Leads", name: "Leads", color: "var(--primary-base)" },
                  { dataKey: "Calls", name: "Calls", color: "var(--secondary-base)" },
                ]}
                height={300}
              />
            </div>
          </div>
        </section>

        {/* Quick Links Widget */}
        <section className="mb-6 sm:mb-8">
          <div className="fade-in-up" style={{ animationDelay: "700ms" }}>
            <QuickLinks
              links={quickLinks}
              layout="grid"
              title="Quick Links"
            />
          </div>
        </section>

        {/* MEDIUM PRIORITY: Performance TabbedTable - Top Projects and Top Performers */}
        <section className="mb-6 sm:mb-8">
          <div className="fade-in-up" style={{ animationDelay: "800ms" }}>
            <PerformanceTabbedTable
              title="Performance"
              data={performanceTabbedTableData}
              onItemClick={handleItemClick}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

