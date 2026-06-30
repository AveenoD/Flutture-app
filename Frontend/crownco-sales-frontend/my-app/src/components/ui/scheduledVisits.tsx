import React, { useState } from "react";
import { Clock, ChevronRight } from "lucide-react";
import Image from "next/image";

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
    borderColor: "border-emerald-100",
  },
  revisit: {
    label: "Revisit",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    dotColor: "bg-blue-600",
    borderColor: "border-blue-100",
  },
  pending: {
    label: "Pending",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
    dotColor: "bg-orange-600",
    borderColor: "border-orange-100",
  },
};

export function ScheduledVisits({
  title = "Scheduled Visits",
  visits,
}: ScheduledVisitsProps) {
  const [selectedFilter, setSelectedFilter] = useState<"today" | "week" | "custom">("today");
  const [showAllVisits, setShowAllVisits] = useState(false);

  return (
    <section className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 lg:mb-5 gap-3 sm:gap-2">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900">{title}</h2>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 sm:p-1 w-full sm:w-auto">
          <button
            onClick={() => setSelectedFilter("today")}
            className={`flex-1 sm:flex-none px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-1.5 md:py-2 rounded-md text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              selectedFilter === "today"
                ? "bg-[var(--primary-base)] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedFilter("week")}
            className={`flex-1 sm:flex-none px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-1.5 md:py-2 rounded-md text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              selectedFilter === "week"
                ? "bg-[var(--primary-base)] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setSelectedFilter("custom")}
            className={`flex-1 sm:flex-none px-2 sm:px-2.5 md:px-3 lg:px-4 py-1.5 sm:py-1.5 md:py-2 rounded-md text-[10px] sm:text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
              selectedFilter === "custom"
                ? "bg-[var(--primary-base)] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      <div className="space-y-0">
        {(showAllVisits ? visits : visits.slice(0, 3)).map((visit, index) => {
          const status = statusConfig[visit.status];
          return (
            <div
              key={index}
              className="flex items-center justify-between py-2.5 sm:py-3 lg:py-3.5 border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer gap-2 sm:gap-3"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 flex-1 min-w-0">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={visit.avatar}
                    alt={visit.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 32px, (max-width: 768px) 36px, (max-width: 1024px) 40px, 48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs sm:text-sm md:text-base text-slate-900 mb-0.5 sm:mb-1 truncate">
                    {visit.name}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 text-[10px] sm:text-xs md:text-sm text-slate-600">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="truncate">{visit.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 flex-shrink-0">
                <span
                  className={`px-2 sm:px-2.5 md:px-3 lg:px-4 py-1 sm:py-1.5 md:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold border flex items-center gap-1 sm:gap-1.5 md:gap-2 whitespace-nowrap ${status.bgColor} ${status.textColor} ${status.borderColor}`}
                >
                  <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${status.dotColor}`} />
                  {status.label}
                </span>
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-slate-400 flex-shrink-0 hidden sm:block" />
              </div>
            </div>
          );
        })}
      </div>
      {visits.length > 3 && (
        <button
          onClick={() => setShowAllVisits(!showAllVisits)}
          className="w-full mt-3 sm:mt-4 text-center text-xs sm:text-sm font-medium text-[var(--primary-base)] py-2 sm:py-2.5 rounded-md border border-transparent hover:border-[var(--primary-base)] hover:bg-slate-50 transition-colors"
        >
          {showAllVisits ? "View Less" : "View More"}
        </button>
      )}
    </section>
  );
}

