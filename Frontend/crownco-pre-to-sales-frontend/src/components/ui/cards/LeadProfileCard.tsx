"use client";

import React, { useId, useState } from "react";
import { ChevronDown, ChevronUp, Mail, MapPin, Phone } from "lucide-react";
import { StatusBadge, SourceBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/Button";

export type LeadPriority = "high" | "medium" | "low" | undefined;

export type LeadProfile = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
  source?: string;
  location?: string;
  /** e.g. "₹50L – ₹60L" */
  budgetLabel?: string;
  priority?: LeadPriority;
};

type LeadProfileCardProps = {
  lead: LeadProfile;
  /** Compact: for list views, Detailed: for lead detail pages */
  variant?: "compact" | "detailed";
  /** Optional CTA button for navigation */
  onViewDetail?: () => void;
  /** Optional slot to render CTAs (e.g. Call/Chat) inside the card */
  actions?: React.ReactNode;
  className?: string;
};

export function LeadProfileCard({
  lead,
  variant = "detailed",
  onViewDetail,
  actions,
  className = "",
}: LeadProfileCardProps) {
  const [showMore, setShowMore] = useState(false);
  const detailsId = useId();
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const priorityBg =
    lead.priority === "high"
      ? "bg-gradient-to-br from-red-500 to-red-600"
      : lead.priority === "medium"
      ? "bg-gradient-to-br from-orange-500 to-orange-600"
      : lead.priority === "low"
      ? "bg-gradient-to-br from-blue-500 to-blue-600"
      : "bg-gradient-to-br from-slate-500 to-slate-600";

  const isDetailed = variant === "detailed";

  // Container styles based on variant
  const containerClasses = isDetailed
    ? `
        w-full rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm
        px-4 sm:px-5 py-4 sm:py-5
        backdrop-blur
      `
    : `
        w-full rounded-2xl bg-white border border-slate-200 shadow-sm
        p-4 sm:p-5
      `;

  const hasExtraDetails = Boolean(lead.email || lead.location);

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-sm sm:text-base text-white shadow-md ring-2 ring-white ${priorityBg}`}
        >
          {getInitials(lead.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate leading-snug">
                  {lead.name}
                </h2>
                {lead.priority && (
                  <span
                    className={`
                      px-2 py-0.5 rounded-md text-xs font-bold tracking-wide flex-shrink-0
                      ${
                        lead.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : lead.priority === "medium"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }
                    `}
                  >
                    {lead.priority.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {lead.status && <StatusBadge status={lead.status as any} />}
                {lead.source && <SourceBadge source={lead.source} />}
              </div>
            </div>

            {isDetailed && (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {lead.budgetLabel && (
                  <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                    Budget: {lead.budgetLabel}
                  </div>
                )}
                {actions ? (
                  <div className="hidden lg:flex items-center gap-2">{actions}</div>
                ) : null}
              </div>
            )}
          </div>

          {isDetailed && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-600">
                <a
                  href={`tel:${lead.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-medium text-slate-700">{lead.phone}</span>
                </a>

                {showMore && lead.email && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-slate-50">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="text-slate-700">{lead.email}</span>
                  </span>
                )}

                {showMore && lead.location && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-slate-50">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-slate-700">{lead.location}</span>
                  </span>
                )}

                {hasExtraDetails && (
                  <button
                    type="button"
                    aria-expanded={showMore}
                    aria-controls={detailsId}
                    onClick={() => setShowMore((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800"
                  >
                    {showMore ? (
                      <>
                        View less <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        View more <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {actions ? (
                <div className="mt-3 flex flex-col sm:flex-row gap-2 lg:hidden">
                  {actions}
                </div>
              ) : null}

              {/* a11y hook; content is already conditionally rendered above */}
              <div id={detailsId} className="sr-only">
                Lead details
              </div>
            </>
          )}
        </div>

        {/* View button (optional) */}
        {onViewDetail && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={onViewDetail}
          >
            View
          </Button>
        )}
      </div>
    </div>
  );
}


