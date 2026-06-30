"use client";

import React from "react";
import { Home, MapPin, Clock, Building2 } from "lucide-react";

export type VisitStatus = "completed" | "revisit" | "pending";

export type VisitDetail = {
  id: string;
  project: string;
  property: string;
  date: string;
  time: string;
  type: "First Visit" | "Revisit";
  status: VisitStatus;
  notes?: string;
};

type PropertyVisitCardProps = {
  visit: VisitDetail;
  title?: string;
  showHelperText?: boolean;
  className?: string;
};

export function PropertyVisitCard({
  visit,
  title = "Visit Details",
  showHelperText = true,
  className = "",
}: PropertyVisitCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white/80 p-4 sm:p-5 shadow-sm ${className}`}>
      <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
        <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
        {title}
      </h3>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 rounded-xl bg-[var(--primary-soft)] text-[var(--primary-base)] flex-shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="text-sm sm:text-base font-semibold text-slate-900 truncate">
              {visit.project}
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{visit.property}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {visit.date}, {visit.time}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-slate-100 text-slate-700">
                {visit.type}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                  visit.status === "completed"
                    ? "bg-emerald-50 text-emerald-600"
                    : visit.status === "revisit"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-orange-50 text-orange-600"
                }`}
              >
                {visit.status === "completed"
                  ? "Completed"
                  : visit.status === "revisit"
                  ? "Revisit"
                  : "Pending"}
              </span>
            </div>
            {visit.notes && (
              <div className="mt-2 text-xs sm:text-sm text-slate-600 bg-slate-50 rounded-lg p-2">
                {visit.notes}
              </div>
            )}
          </div>
        </div>

        {showHelperText && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-600">
            <p>
              Make sure property keys, brochure, and project price sheet are
              ready before the visit. Capture customer&apos;s feedback in visit
              remarks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

