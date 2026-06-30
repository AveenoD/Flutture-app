"use client";

import React from "react";
import { AlertCircle, Clock, FileText, ArrowRight, AlertTriangle } from "lucide-react";
import { GenericList } from "./GenericList";

type PriorityStatus = "missed" | "urgent" | "pending" | "completed";

type PriorityItem = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  status: PriorityStatus;
  count?: number;
  icon?: React.ReactNode;
};

type PriorityListProps = {
  title?: string;
  priorities: PriorityItem[];
  maxItems?: number;
  showViewMore?: boolean;
  className?: string;
  onViewAll?: () => void;
};

const statusConfig = {
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

export function PriorityList({
  title = "Today's Priorities",
  priorities,
  maxItems = 4,
  showViewMore = false,
  className = "",
  onViewAll,
}: PriorityListProps) {
  const renderItem = (priority: PriorityItem, index: number) => {
    const status = statusConfig[priority.status];
    const displayIcon = priority.icon || status.icon;

    return (
      <div
        className="group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white/70 backdrop-blur-sm hover:bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-slate-100/50 hover:border-slate-200/80"
      >
        <div className={`flex-shrink-0 p-3 sm:p-3.5 rounded-xl ${status.bgColor} shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300`}>
          <div className={status.textColor}>{displayIcon}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 flex-wrap">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 group-hover:text-[var(--primary-base)] transition-colors">
              {priority.title}
            </h3>
            {priority.count !== undefined && (
              <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold ${status.bgColor} ${status.textColor} flex-shrink-0 shadow-sm`}>
                {priority.count}
              </span>
            )}
          </div>
          {priority.description && (
            <p className="text-xs sm:text-sm text-slate-600 line-clamp-1 leading-relaxed">
              {priority.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 sm:gap-2.5 flex-shrink-0">
          {priority.time && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{priority.time}</span>
            </div>
          )}
          <span
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-sm ${status.bgColor} ${status.textColor}`}
          >
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
        </div>

        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-[var(--primary-base)] transition-colors" />
        </div>
      </div>
    );
  };

  return (
    <GenericList
      title={title}
      items={priorities}
      renderItem={renderItem}
      maxItems={maxItems}
      showViewMore={showViewMore}
      emptyMessage="No priorities found"
      className={className}
      onViewAll={onViewAll}
      viewAllLabel="View All"
    />
  );
}

