"use client";

import React, { useState, useMemo } from "react";
import { Tabs, TabItem } from "../navigation/Tabs";
import { DataTable } from "./DataTable";
import { AlertCircle, Clock, FileText, ArrowRight, AlertTriangle, Phone, Mail, MessageCircle, CheckCircle, XCircle, ChevronRight, TrendingUp, Trophy } from "lucide-react";
import Image from "next/image";
import { ProjectCard } from "../cards/projectCard";

// ============================================
// Generic Flexible TabbedTable Component
// ============================================

type TabConfig<T = any> = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  badge?: string | number;
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  headerContent?: React.ReactNode; // Optional header content for specific tabs
  viewMode?: "card" | "table";
  tableClassName?: string;
};

type FlexibleTabbedTableProps<T = any> = {
  title?: string;
  tabs: TabConfig<T>[];
  defaultTab?: string;
  onItemClick?: (item: T, tabId: string) => void;
  className?: string;
};

export function FlexibleTabbedTable<T = any>({
  title,
  tabs,
  defaultTab,
  onItemClick,
  className = "",
}: FlexibleTabbedTableProps<T>) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab || tabs[0]?.id || "");
  const [isLoading, setIsLoading] = useState(false);

  // Convert tabs to TabItem format
  const tabItems: TabItem[] = useMemo(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        count: tab.count ?? tab.data.length,
        badge: tab.badge,
      })),
    [tabs]
  );

  // Handle Tab Change with Optimistic UI
  const handleTabChange = async (tabId: string) => {
    setIsLoading(true);
    setActiveTab(tabId);
    setTimeout(() => {
      setIsLoading(false);
    }, 150);
  };

  // Get current tab config
  const currentTab = tabs.find((tab) => tab.id === activeTab);

  if (!currentTab) {
    return null;
  }

  return (
    <section
      className={`bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">
            {title}
          </h2>
        </div>
      )}

      {/* Header Content - Show if exists for current tab */}
      {currentTab.headerContent && (
        <div className="mb-4 sm:mb-5">
          {currentTab.headerContent}
        </div>
      )}

      <div className="mb-4 sm:mb-5">
        <Tabs
          tabs={tabItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      <DataTable
        data={currentTab.data}
        renderRow={currentTab.renderRow}
        emptyMessage={currentTab.emptyMessage || "No data available"}
        loading={isLoading}
        viewMode={currentTab.viewMode ?? "table"}
        className={
          currentTab.tableClassName ??
          (currentTab.viewMode === "card" ? "" : "divide-y divide-slate-100")
        }
      />
    </section>
  );
}

// ============================================
// Status Configurations
// ============================================

const priorityStatusConfig = {
  missed: {
    label: "Missed",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    dotColor: "bg-red-600",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  urgent: {
    label: "Urgent",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
    dotColor: "bg-purple-600",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  pending: {
    label: "Pending",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
    dotColor: "bg-orange-600",
    icon: <Clock className="w-4 h-4" />,
  },
  completed: {
    label: "Completed",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    dotColor: "bg-emerald-600",
    icon: <FileText className="w-4 h-4" />,
  },
};

const followUpStatusConfig = {
  pending: {
    label: "Pending",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
    dotColor: "bg-orange-600",
    icon: <Clock className="w-3 h-3" />,
  },
  completed: {
    label: "Completed",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    dotColor: "bg-emerald-600",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  missed: {
    label: "Missed",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    dotColor: "bg-red-600",
    icon: <XCircle className="w-3 h-3" />,
  },
};

const visitStatusConfig = {
  completed: {
    label: "Completed",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    dotColor: "bg-emerald-600",
  },
  revisit: {
    label: "Revisit",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    dotColor: "bg-blue-600",
  },
  pending: {
    label: "Pending",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
    dotColor: "bg-orange-600",
  },
};

const typeIcons = {
  Call: <Phone className="w-4 h-4" />,
  Email: <Mail className="w-4 h-4" />,
  Message: <MessageCircle className="w-4 h-4" />,
  Visit: <Clock className="w-4 h-4" />,
};

const priorityColors = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-orange-600 bg-orange-50 border-orange-200",
  low: "text-blue-600 bg-blue-50 border-blue-200",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop&q=80";

// ============================================
// Type Definitions
// ============================================

type PriorityStatus = "missed" | "urgent" | "pending" | "completed";
type FollowUpStatus = "pending" | "completed" | "missed";
type FollowUpType = "Call" | "Email" | "Message" | "Visit";
type VisitStatus = "completed" | "revisit" | "pending";

type PriorityItem = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  status: PriorityStatus;
  count?: number;
  icon?: React.ReactNode;
};

type FollowUpItem = {
  id: string;
  leadName: string;
  type: FollowUpType;
  scheduledTime: string;
  status: FollowUpStatus;
  priority?: "high" | "medium" | "low";
  notes?: string;
};

type ScheduledVisit = {
  name: string;
  avatar: string;
  time: string;
  status: VisitStatus;
};

type ProjectItem = {
  id: string;
  name: string;
  image: string;
  visits: number;
  revisits?: number;
  bookings: number;
  conversion: string;
  status?: string;
  location?: string;
};

type LeaderboardPerformer = {
  rank: string;
  name: string;
  points: string;
  avatar?: string;
};

type FeaturedPerformer = {
  rank: string;
  name: string;
  points: string;
  avatar?: string;
};

type LeaderboardStat = {
  icon: React.ReactNode;
  label: string;
};

// ============================================
// Pre-configured Components
// ============================================

// Activities TabbedTable
type ActivitiesTabbedTableData = {
  priorities: PriorityItem[];
  followUps: FollowUpItem[];
  scheduledVisits: ScheduledVisit[];
};

type ActivitiesTabbedTableProps = {
  title?: string;
  data: ActivitiesTabbedTableData;
  onItemClick?: (item: any, tabId: string) => void;
  className?: string;
};

export function ActivitiesTabbedTable({
  title = "Activities",
  data,
  onItemClick,
  className = "",
}: ActivitiesTabbedTableProps) {
  // Render Priority Row - Simple line-by-line format
  const renderPriorityRow = (priority: PriorityItem, index: number) => {
    const status = priorityStatusConfig[priority.status];
    const displayIcon = priority.icon || status.icon;

    return (
      <button
        type="button"
        onClick={() => onItemClick?.(priority, "priorities")}
        className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 sm:py-3.5 px-2 sm:px-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${status.bgColor} ${status.textColor} flex-shrink-0`}
          >
            {displayIcon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                {priority.title}
              </span>
              {priority.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status.bgColor} ${status.textColor}`}
                >
                  {priority.count}
                </span>
              )}
            </div>
            {priority.description && (
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600 truncate">
                {priority.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-xs sm:text-sm flex-shrink-0">
          {priority.time && (
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{priority.time}</span>
            </div>
          )}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 ${status.bgColor} ${status.textColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
        </div>
      </button>
    );
  };

  // Render FollowUp Row - Simple line-by-line format
  const renderFollowUpRow = (followUp: FollowUpItem, index: number) => {
    const status = followUpStatusConfig[followUp.status];
    const typeIcon = typeIcons[followUp.type];

    return (
      <button
        type="button"
        onClick={() => onItemClick?.(followUp, "followUps")}
        className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 sm:py-3.5 px-2 sm:px-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
            {typeIcon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                {followUp.leadName}
              </span>
              {followUp.priority && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityColors[followUp.priority]} flex-shrink-0`}
                >
                  {followUp.priority.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-slate-600">
              <span className="font-medium text-slate-500">{followUp.type}</span>
              <span className="text-slate-300">•</span>
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium truncate">{followUp.scheduledTime}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap ${status.bgColor} ${status.textColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
        </div>
      </button>
    );
  };

  // Render Scheduled Visit Row - Simple line-by-line format
  const renderScheduledVisitRow = (visit: ScheduledVisit, index: number) => {
    const status = visitStatusConfig[visit.status];

    return (
      <button
        type="button"
        onClick={() => onItemClick?.(visit, "scheduledVisits")}
        className="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-3 sm:py-3.5 px-2 sm:px-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={visit.avatar}
              alt={visit.name}
              fill
              className="object-cover"
              sizes="36px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-semibold text-slate-900 truncate">
              {visit.name}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600">
              <Clock className="w-3 h-3" />
              <span className="truncate">{visit.time}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap ${status.bgColor} ${status.textColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
        </div>
      </button>
    );
  };

  const tabs: TabConfig<any>[] = [
    {
      id: "priorities",
      label: "Priorities",
      icon: <AlertTriangle className="w-4 h-4" />,
      data: data.priorities,
      renderRow: renderPriorityRow,
      emptyMessage: "No priorities found",
      viewMode: "table",
      tableClassName: "divide-y divide-slate-100",
    },
    {
      id: "followUps",
      label: "Follow Ups",
      icon: <Phone className="w-4 h-4" />,
      data: data.followUps,
      renderRow: renderFollowUpRow,
      emptyMessage: "No follow-ups scheduled",
      viewMode: "table",
      tableClassName: "divide-y divide-slate-100",
    },
    {
      id: "scheduledVisits",
      label: "Scheduled Visits",
      icon: <Clock className="w-4 h-4" />,
      data: data.scheduledVisits,
      renderRow: renderScheduledVisitRow,
      emptyMessage: "No scheduled visits",
      viewMode: "table",
      tableClassName: "divide-y divide-slate-100",
    },
  ];

  return (
    <FlexibleTabbedTable
      title={title}
      tabs={tabs}
      defaultTab="priorities"
      onItemClick={onItemClick}
      className={className}
    />
  );
}

// Performance TabbedTable
type PerformanceTabbedTableData = {
  projects: ProjectItem[];
  leaderboard: {
    featured: FeaturedPerformer;
    stats: LeaderboardStat[];
    performers: LeaderboardPerformer[];
  };
};

type PerformanceTabbedTableProps = {
  title?: string;
  data: PerformanceTabbedTableData;
  onItemClick?: (item: any, tabId: string) => void;
  className?: string;
};

export function PerformanceTabbedTable({
  title = "Performance",
  data,
  onItemClick,
  className = "",
}: PerformanceTabbedTableProps) {
  // Render Project Row - use shared ProjectCard (same UI as sales-frontend)
  const renderProjectRow = (project: ProjectItem, index: number) => {
    const conversionValue = Number.parseFloat(project.conversion.replace("%", ""));
    const conversionUp = Number.isFinite(conversionValue) ? conversionValue >= 5 : true;

    return (
      <ProjectCard
        image={project.image || FALLBACK_IMAGE}
        name={project.name}
        stats={`${project.visits} Site Visits${project.revisits !== undefined ? ` | ${project.revisits} Revisits` : ""} | ${project.bookings} Bookings`}
        conversion={project.conversion}
        conversionUp={conversionUp}
        onClick={() => onItemClick?.(project, "projects")}
        imageHeight="h-32 sm:h-36 md:h-40"
      />
    );
  };

  // Render Performer Row
  const renderPerformerRow = (performer: LeaderboardPerformer, index: number) => {
    return (
      <div
        onClick={() => onItemClick?.(performer, "performers")}
        className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/60 backdrop-blur-sm hover:bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer"
      >
        {performer.avatar ? (
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-slate-200/50 group-hover:ring-[var(--primary-base)] transition-all">
            <Image
              src={performer.avatar}
              alt={performer.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 40px, (max-width: 768px) 48px, 56px"
            />
          </div>
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-slate-200 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs sm:text-sm lg:text-base text-slate-900 truncate group-hover:text-[var(--primary-base)] transition-colors">
            {performer.rank} {performer.name}
          </div>
        </div>
        <div className="text-xs sm:text-sm text-slate-600 font-semibold flex-shrink-0">
          {performer.points}
        </div>
      </div>
    );
  };

  // Header Content for Performers Tab
  const performersHeaderContent = (
    <>
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/60 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {data.leaderboard.featured.avatar ? (
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-yellow-400/50">
            <Image
              src={data.leaderboard.featured.avatar}
              alt={data.leaderboard.featured.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 48px, (max-width: 768px) 56px, 64px"
            />
          </div>
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-slate-200 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm sm:text-base lg:text-lg text-slate-900 truncate">
            {data.leaderboard.featured.rank} {data.leaderboard.featured.name}
          </div>
          <div className="text-xs sm:text-sm text-slate-600 font-semibold">
            {data.leaderboard.featured.points}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
        {data.leaderboard.stats.map((stat, index) => (
          <div
            key={index}
            className="p-3 sm:p-3.5 bg-white/60 backdrop-blur-sm rounded-lg text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center justify-center text-xl sm:text-2xl lg:text-3xl mb-1.5 sm:mb-2 text-slate-600">
              {stat.icon}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-600 font-semibold leading-tight">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <hr className="my-4 sm:my-5 border-0 border-t border-slate-200/50" />

      <div className="text-xs sm:text-sm lg:text-base font-bold mb-3 sm:mb-4 text-slate-900">
        Top Performers This Month
      </div>
    </>
  );

  const tabs: TabConfig<any>[] = [
    {
      id: "projects",
      label: "Top Projects",
      icon: <TrendingUp className="w-4 h-4" />,
      data: data.projects,
      renderRow: renderProjectRow,
      emptyMessage: "No projects found",
       viewMode: "card",
    },
    {
      id: "performers",
      label: "Top Performers",
      icon: <Trophy className="w-4 h-4" />,
      data: data.leaderboard.performers,
      renderRow: renderPerformerRow,
      emptyMessage: "No performers found",
      headerContent: performersHeaderContent,
    },
  ];

  return (
    <FlexibleTabbedTable
      title={title}
      tabs={tabs}
      defaultTab="projects"
      onItemClick={onItemClick}
      className={className}
    />
  );
}

