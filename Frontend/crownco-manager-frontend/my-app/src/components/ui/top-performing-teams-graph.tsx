"use client";

import React, { useState, useMemo } from "react";
import { CardSkeleton } from "@/components/ui/loadingSkeleton";

type TimeRange = "week" | "month" | "custom";

export interface TeamPerformance {
  name: string;
  /** Relative performance value, 0–100. Used only for visual emphasis. */
  score: number;
}

export interface TopPerformingTeamsProps {
  /** Loading state – renders a skeleton placeholder when true */
  isLoading?: boolean;
  /** Teams to display in the chart. Defaults to 5 demo teams. */
  teams?: TeamPerformance[];
  /** Initial selected time range. Defaults to "week". */
  defaultRange?: TimeRange;
  /** Optional callback when the time range changes. */
  onRangeChange?: (range: TimeRange) => void;
}

const defaultTeams: TeamPerformance[] = [
  { name: "Team A", score: 82 },
  { name: "Team B", score: 76 },
  { name: "Team C", score: 68 },
  { name: "Team D", score: 61 },
  { name: "Team E", score: 54 },
];

const ranges: { id: TimeRange; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "custom", label: "Custom" },
];

export default function TopPerformingTeams({
  isLoading = false,
  teams = defaultTeams,
  defaultRange = "week",
  onRangeChange,
}: TopPerformingTeamsProps) {
  const [range, setRange] = useState<TimeRange>(defaultRange);

  const maxScore = useMemo(
    () => (teams.length ? Math.max(...teams.map((t) => t.score || 0)) || 1 : 1),
    [teams]
  );

  const handleRangeClick = (value: TimeRange) => {
    setRange(value);
    onRangeChange?.(value);
  };

  return (
    <section
      aria-labelledby="top-performing-teams-heading"
      className="bg-[var(--background)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-sm"
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h2
            id="top-performing-teams-heading"
            className="text-lg sm:text-xl font-semibold text-[var(--text-dark)]"
          >
            Top Performing Teams
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Teams by leads routed volume
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

      {/* Content */}
      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="flex flex-col justify-between h-[240px]">
          {/* Spacer to mimic empty chart area in the design */}
          <div className="flex-1" />

          {/* Teams axis */}
          <div className="space-y-4">
            <div className="flex justify-between gap-4">
              {teams.map((team) => {
                const widthPercent = Math.max(
                  24,
                  Math.min(100, (team.score / maxScore) * 100)
                );

                return (
                  <div
                    key={team.name}
                    className="flex flex-col items-center flex-1 min-w-0"
                  >
                    {/* Horizontal bar */}
                    <div className="w-full max-w-[72px] h-1.5 rounded-full bg-[#E0ECFF] overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full bg-[#4C9BFF]"
                        style={{ width: `${widthPercent}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    {/* Label */}
                    <span className="text-xs text-[var(--text-secondary)] truncate max-w-[72px]">
                      {team.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex h-3 w-3 rounded bg-[#4C9BFF]" aria-hidden="true" />
              <span>Leads Routed</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

