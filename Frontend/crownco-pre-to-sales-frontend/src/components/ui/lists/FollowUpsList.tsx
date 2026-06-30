"use client";

import React from "react";
import { Phone, Mail, MessageCircle, Clock, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { GenericList } from "./GenericList";

export type FollowUpStatus = "pending" | "completed" | "missed";

export type FollowUpType = "Call" | "Email" | "Message" | "Visit";

export type FollowUpItem = {
  id: string;
  leadName: string;
  type: FollowUpType;
  scheduledTime: string;
  status: FollowUpStatus;
  priority?: "high" | "medium" | "low";
  notes?: string;
};

type FollowUpsListProps = {
  title?: string;
  followUps: FollowUpItem[];
  maxItems?: number;
  showViewMore?: boolean;
  className?: string;
};

const typeIcons = {
  Call: <Phone className="w-4 h-4" />,
  Email: <Mail className="w-4 h-4" />,
  Message: <MessageCircle className="w-4 h-4" />,
  Visit: <Clock className="w-4 h-4" />,
};

const statusConfig = {
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

const priorityColors = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-orange-600 bg-orange-50 border-orange-200",
  low: "text-blue-600 bg-blue-50 border-blue-200",
};

export function FollowUpsList({
  title = "Follow Ups",
  followUps,
  maxItems = 5,
  showViewMore = true,
  className = "",
}: FollowUpsListProps) {
  const renderItem = (followUp: FollowUpItem, index: number) => {
    const status = statusConfig[followUp.status];
    const typeIcon = typeIcons[followUp.type];

    return (
      <div
        className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white/70 backdrop-blur-sm hover:bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer gap-3 sm:gap-4 border border-slate-100/50 hover:border-slate-200/80"
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className={`p-2.5 sm:p-3 rounded-xl bg-slate-100/80 text-slate-600 flex-shrink-0 group-hover:bg-slate-200/90 group-hover:scale-110 transition-all duration-300 shadow-sm`}>
            {typeIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2 flex-wrap">
              <div className="font-bold text-sm sm:text-base lg:text-lg text-slate-900 truncate group-hover:text-[var(--primary-base)] transition-colors">
                {followUp.leadName}
              </div>
              {followUp.priority && (
                <span className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border shadow-sm ${priorityColors[followUp.priority]} flex-shrink-0`}>
                  {followUp.priority.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-slate-600 flex-wrap">
              <span className="text-slate-500 font-medium">{followUp.type}</span>
              <span className="text-slate-300">•</span>
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate font-medium">{followUp.scheduledTime}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shadow-sm ${status.bgColor} ${status.textColor}`}
          >
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 hidden sm:block">
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-[var(--primary-base)] transition-colors" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <GenericList
      title={title}
      items={followUps}
      renderItem={renderItem}
      maxItems={maxItems}
      showViewMore={showViewMore}
      emptyMessage="No follow-ups scheduled"
      className={className}
    />
  );
}

