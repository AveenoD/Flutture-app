"use client";

import React from "react";
import { 
  Clock, 
  ArrowRight, 
  UserPlus, 
  Phone, 
  FileText, 
  Home, 
  CheckCircle, 
  Pin 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ActivityType = "lead" | "call" | "quotation" | "visit" | "booking" | "general";

type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  time: Date | string;
  icon?: React.ReactNode;
  onClick?: () => void;
  badge?: string | number;
};

type ActivityFeedProps = {
  activities: Activity[];
  maxItems?: number;
  showViewMore?: boolean;
  onViewMore?: () => void;
  title?: string;
  className?: string;
};

const defaultIcons: Record<ActivityType, React.ReactNode> = {
  lead: <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary-base)]" />,
  call: <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary-base)]" />,
  quotation: <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary-base)]" />,
  visit: <Home className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary-base)]" />,
  booking: <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary-base)]" />,
  general: <Pin className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary-base)]" />,
};

export function ActivityFeed({
  activities,
  maxItems = 5,
  showViewMore = true,
  onViewMore,
  title,
  className = "",
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  const formatTime = (time: Date | string) => {
    const date = typeof time === "string" ? new Date(time) : time;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <section className={`bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${className}`}>
      {title && (
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-4 sm:mb-5">
          {title}
        </h2>
      )}
      
      <div className="space-y-3 sm:space-y-4">
        {displayedActivities.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No recent activity
          </div>
        ) : (
          displayedActivities.map((activity, index) => (
            <div
              key={activity.id}
              onClick={activity.onClick}
              className={`
                flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl
                ${activity.onClick ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}
                border border-slate-100
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--primary-base)]/10 flex items-center justify-center">
                {activity.icon || defaultIcons[activity.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                    {activity.title}
                  </h3>
                  {activity.badge && (
                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-white bg-[var(--primary-base)] rounded-full">
                      {activity.badge}
                    </span>
                  )}
                </div>
                {activity.description && (
                  <p className="text-xs sm:text-sm text-slate-600 mb-2 line-clamp-2">
                    {activity.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(activity.time)}</span>
                </div>
              </div>

              {activity.onClick && (
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0 mt-1" />
              )}
            </div>
          ))
        )}
      </div>

      {showViewMore && activities.length > maxItems && (
        <button
          onClick={onViewMore}
          className="mt-4 sm:mt-5 w-full py-2 sm:py-2.5 text-sm font-semibold text-[var(--primary-base)] bg-[var(--primary-base)]/10 rounded-xl hover:bg-[var(--primary-base)]/20 transition-colors flex items-center justify-center gap-2"
        >
          View All Activities
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </section>
  );
}

