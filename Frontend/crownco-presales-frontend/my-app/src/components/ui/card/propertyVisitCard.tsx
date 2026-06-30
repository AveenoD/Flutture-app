"use client";

import { CheckCircle, Plus, CalendarBlank } from "phosphor-react";

export type VisitStatus = "completed" | "pending";

export interface Visit {
  id: string | number;
  title: string;
  date?: string;
  status: VisitStatus;
  avatar?: string;
}

export interface PropertyVisitCardProps {
  visits: Visit[];
  onAddRevisit?: () => void;
  onVisitClick?: (visit: Visit) => void;
  className?: string;
}

export function PropertyVisitCard({
  visits,
  onAddRevisit,
  onVisitClick,
  className = "",
}: PropertyVisitCardProps) {
  const addVisitLabel = visits.length === 0 ? "Add Visit" : "Add Revisit";

  return (
    <div className={`relative pl-12 sm:pl-14 pt-2 ${className}`}>
      {/* Timeline line with gradient */}
      <div className="absolute left-5 sm:left-6 top-5 bottom-5 w-0.5 bg-gradient-to-b from-[var(--success)] via-[var(--primary-base)] to-[#E3E6F0] z-0"></div>

      <div className="space-y-4">
        {visits.map((visit, index) => (
          <div
            key={visit.id}
            className={`group relative bg-white rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md flex justify-between items-center min-h-[80px] cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 fade-in-up ${
              visit.status === "completed"
                ? "border-2 border-[var(--success)] hover:border-[var(--success)] hover:shadow-[0_4px_12px_rgba(88,158,103,0.15)]"
                : "border border-[#E3E6F0] hover:border-[var(--primary-base)] hover:shadow-[0_4px_12px_rgba(0,130,224,0.1)]"
            }`}
            onClick={() => onVisitClick?.(visit)}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {/* Timeline indicator with pulse for pending */}
            <div
              className={`absolute -left-10 sm:-left-12 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all duration-300 border-2 border-white ${
                visit.status === "completed"
                  ? "bg-[var(--success)] text-white shadow-[0_0_0_3px_rgba(88,158,103,0.2)]"
                  : "bg-[var(--primary-base)] shadow-[0_0_0_3px_rgba(0,130,224,0.2)] animate-pulse"
              }`}
            >
              {visit.status === "completed" ? (
                <CheckCircle size={16} weight="fill" className="text-white drop-shadow-sm" />
              ) : (
                <span className="w-2.5 h-2.5 bg-white rounded-full shadow-sm"></span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pr-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="text-sm sm:text-base font-bold text-[#2D3748] group-hover:text-[var(--primary-base)] transition-colors duration-200">
                  {visit.title}
                </div>
              </div>
              {visit.date && (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#718096]">
                  <CalendarBlank size={12} weight="regular" className="text-[#718096]" />
                  <span>{visit.date}</span>
                </div>
              )}
            </div>

            {/* Status and Avatar */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
                  visit.status === "completed"
                    ? "bg-[#E6FFFA] text-[#38B2AC] border border-[#B2E5D4]"
                    : "bg-[#FFF5E6] text-[#F6AD55] border border-[#FFE4B8]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    visit.status === "completed" ? "bg-[#38B2AC]" : "bg-[#F6AD55]"
                  }`}
                ></span>
                {visit.status === "completed" ? "Completed" : "Pending"}
              </span>
              {visit.avatar ? (
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm hover:ring-[var(--primary-base)] transition-all duration-200">
                  <img
                    src={visit.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] flex items-center justify-center text-base text-[#718096] shadow-sm hover:shadow-md transition-all duration-200 border border-[#E3E6F0]">
                  👤
                </div>
              )}
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-[var(--primary-base)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        ))}

        {/* Add Visit/Revisit button */}
        <div
          className="group relative bg-white rounded-xl p-4 sm:p-5 border-2 border-dashed border-[#E3E6F0] hover:border-[var(--primary-base)] shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 hover:bg-gradient-to-br hover:from-[#F8F9FC] hover:to-white fade-in-up"
          onClick={onAddRevisit}
          style={{
            animationDelay: `${visits.length * 0.1}s`,
          }}
        >
          <div className="absolute -left-10 sm:-left-12 w-7 h-7 rounded-full bg-gradient-to-br from-[#E3E6F0] to-[#D1D5DB] border-2 border-white shadow-[0_0_0_3px_rgba(227,230,240,0.3)] flex items-center justify-center text-base font-semibold text-[#2D3748] z-10 group-hover:from-[var(--primary-base)] group-hover:to-[var(--primary-hover)] group-hover:text-white transition-all duration-300">
            <Plus size={16} weight="bold" className="group-hover:rotate-90 transition-transform duration-300" />
          </div>
          <div className="text-sm sm:text-base font-semibold text-[#2D3748] group-hover:text-[var(--primary-base)] transition-colors duration-200 flex items-center gap-2">
            <span>{addVisitLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}



