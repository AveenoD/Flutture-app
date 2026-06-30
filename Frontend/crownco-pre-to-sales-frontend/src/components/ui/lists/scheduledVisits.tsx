"use client";

import React, { useState } from "react";
import { Clock, ChevronRight } from "lucide-react";
import Image from "next/image";
import { GenericList } from "./GenericList";

type VisitStatus = "completed" | "revisit" | "pending";

type ScheduledVisit = {
  name: string;
  avatar: string;
  time: string;
  status: VisitStatus;
};

type ScheduledVisitsProps = {
  title?: string;
  visits: ScheduledVisit[];
};

const statusConfig = {
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

export function ScheduledVisits({
  title = "Scheduled Visits",
  visits,
}: ScheduledVisitsProps) {
  const [selectedFilter, setSelectedFilter] = useState<"today" | "week" | "custom">("today");

  const renderItem = (visit: ScheduledVisit, index: number) => {
    const status = statusConfig[visit.status];

    return (
      <div className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/60 backdrop-blur-sm hover:bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer gap-2 sm:gap-3 group">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-slate-200/50 group-hover:ring-[var(--primary-base)] transition-all">
            <Image
              src={visit.avatar}
              alt={visit.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 36px, (max-width: 768px) 40px, 48px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs sm:text-sm md:text-base text-slate-900 mb-0.5 sm:mb-1 truncate group-hover:text-[var(--primary-base)] transition-colors">
              {visit.name}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-600">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="truncate">{visit.time}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 whitespace-nowrap ${status.bgColor} ${status.textColor}`}
          >
            <span className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full ${status.dotColor}`} />
            {status.label}
          </span>
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0 hidden sm:block group-hover:text-slate-600 transition-colors" />
        </div>
      </div>
    );
  };

  return (
    <section className="bg-gradient-to-br from-white via-white to-slate-50/30 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-5 gap-3">
        <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-slate-900">{title}</h2>
        <div className="flex gap-1.5 bg-slate-100/80 rounded-xl p-1 w-full sm:w-auto">
          {(["today", "week", "custom"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                selectedFilter === filter
                  ? "bg-[var(--primary-base)] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <GenericList
        items={visits}
        renderItem={renderItem}
        maxItems={3}
        showViewMore={true}
        emptyMessage="No scheduled visits"
      />
    </section>
  );
}

