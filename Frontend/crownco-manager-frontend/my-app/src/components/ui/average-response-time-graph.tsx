"use client";

import React, { useState } from "react";
import { CardSkeleton } from "@/components/ui/loadingSkeleton";

type TimeRange = "week" | "month" | "custom";

type ResponseStatus = "excellent" | "good" | "average" | "needs_work";

export interface TeamResponseTime {
  team: string;
  /** Optional numeric value (e.g. minutes) – used only for tooltips or future logic */
  value?: number;
  /** Qualitative status which drives the color mapping */
  status: ResponseStatus;
}

export interface AverageResponseTimeProps {
  /** Loading state – renders a skeleton placeholder when true */
  isLoading?: boolean;
  /** Team rows shown on the x‑axis */
  teams?: TeamResponseTime[];
  /** Initial selected time range */
  defaultRange?: TimeRange;
  /** Callback whenever range changes */
  onRangeChange?: (range: TimeRange) => void;
  /** Override main title */
  title?: string;
  /** Override subtitle/description */
  subtitle?: string;
}

const ranges: { id: TimeRange; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "custom", label: "Custom" },
];

const defaultTeams: TeamResponseTime[] = [
  { team: "Team A", status: "excellent", value: 4.2 },
  { team: "Team B", status: "good", value: 5.3 },
  { team: "Team C", status: "average", value: 7.1 },
  { team: "Team D", status: "average", value: 8.4 },
  { team: "Team E", status: "needs_work", value: 10.2 },
];

const statusConfig: Record<
  ResponseStatus,
  { label: string; color: string; legendColor: string }
> = {
  excellent: {
    label: "Excellent",
    color: "bg-[#16A34A]",
    legendColor: "bg-[#16A34A]",
  },
  good: {
    label: "Good",
    color: "bg-[#4ADE80]",
    legendColor: "bg-[#4ADE80]",
  },
  average: {
    label: "Average",
    color: "bg-[#F59E0B]",
    legendColor: "bg-[#F59E0B]",
  },
  needs_work: {
    label: "Needs Work",
    color: "bg-[#DC2626]",
    legendColor: "bg-[#DC2626]",
  },
};

export default function AverageResponseTime({
  isLoading = false,
  teams = defaultTeams,
  defaultRange = "week",
  onRangeChange,
  title = "Average Response Time",
  subtitle = "Team response speed comparison",
}: AverageResponseTimeProps) {
  const [range, setRange] = useState<TimeRange>(defaultRange);

  const handleRangeClick = (value: TimeRange) => {
    setRange(value);
    onRangeChange?.(value);
  };

  return (
    <section
      aria-labelledby="average-response-time-heading"
      className="bg-[var(--background)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-sm"
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2
            id="average-response-time-heading"
            className="text-lg sm:text-xl font-semibold text-[var(--text-dark)]"
          >
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Segmented time range control */}
        <div className="inline-flex items-center rounded-full bg-[var(--surface-neutral)] p-1">
          {ranges.map((r) => {
            const isActive = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRangeClick(r.id)}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-base)] focus-visible:ring-offset-1 ${
                  isActive
                    ? "bg-white text-[var(--text-dark)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-dark)]"
                }`}
                aria-pressed={isActive}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </header>

      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Chart area */}
          <div className="relative h-48 sm:h-56 rounded-2xl bg-white/70 border border-[var(--border-color)] overflow-hidden px-6 pt-4 pb-10">
            {/* Y‑axis grid lines */}
            <div className="absolute inset-x-6 top-4 bottom-10 flex flex-col justify-between pointer-events-none">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-t border-dashed border-[var(--border-color)]/60"
                />
              ))}
            </div>

            {/* X‑axis labels and response status bars */}
            <div className="absolute inset-x-6 bottom-6 flex justify-between gap-4">
              {teams.map((team) => {
                const cfg = statusConfig[team.status];

                return (
                  <div
                    key={team.team}
                    className="flex flex-col items-center flex-1 min-w-0"
                  >
                    {/* Small colored bar to match the design's baseline segments */}
                    <div className="w-full max-w-[72px] h-1.5 rounded-full bg-[var(--surface-neutral)] overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${cfg.color}`}
                        aria-hidden="true"
                      />
                    </div>
                    {/* Team label */}
                    <span className="text-xs text-[var(--text-secondary)] truncate max-w-[72px]">
                      {team.team}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-[var(--text-secondary)]">
            {(
              Object.entries(statusConfig) as [ResponseStatus, (typeof statusConfig)[ResponseStatus]][]
            ).map(([key, cfg]) => (
              <div key={key} className="inline-flex items-center gap-2">
                <span
                  className={`inline-flex h-3 w-3 rounded-full ${cfg.legendColor}`}
                  aria-hidden="true"
                />
                <span>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

