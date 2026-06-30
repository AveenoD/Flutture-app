import React from "react";

/**
 * KPI Card Component Props
 */
type KPIProps = {
  /** Icon or emoji to display */
  icon: React.ReactNode;
  /** The main value to display */
  value: string | number;
  /** Label describing the value */
  label: string;
  /** Optional trend indicator (e.g., "+3.2%") */
  trend?: string;
  /** Whether the trend is positive (up) or negative (down) */
  trendUp?: boolean;
  /** Color for the left border and icon */
  color?: string;
};

/**
 * KPI Card Component
 * Displays a key performance indicator with icon, value, label, and optional trend
 * 
 * @example
 * ```tsx
 * <KPICard
 *   icon="👤"
 *   value="128"
 *   label="Leads Assigned"
 *   trend="+3.2%"
 *   trendUp={true}
 *   color="var(--primary-base)"
 * />
 * ```
 */
export const KPICard = React.memo(function KPICard({
  icon,
  value,
  label,
  trend,
  trendUp = true,
  color = "#3b82f6",
}: KPIProps) {
  return (
    <div
      className="p-4 sm:p-5 lg:p-6 xl:p-5 2xl:p-6 rounded-xl bg-white border-[0.5px] border-[#d8d8d8] shadow-[0_4px_4px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 hover:border-[#c3d4ff] transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--primary-base)] focus-within:ring-offset-2"
      style={{ borderLeft: `4px solid ${color}` }}
      role="article"
      aria-label={`${label}: ${value}${trend ? `, ${trend}` : ""}`}
    >
      <div className="flex justify-between items-center mb-2 lg:mb-3">
        <span className="text-2xl sm:text-3xl lg:text-2xl xl:text-3xl 2xl:text-4xl" style={{ color }} aria-hidden="true">
          {icon}
        </span>
        {trend && (
          <span
            className={`text-xs sm:text-sm lg:text-xs xl:text-sm 2xl:text-base font-medium ${
              trendUp ? "text-[#00a63e]" : "text-[#e7000b]"
            }`}
            aria-label={trendUp ? `Trending up ${trend}` : `Trending down ${trend}`}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-semibold text-[#1a1a1a] mb-1 lg:mb-1.5 tracking-tight">
        {value}
      </div>
      <div className="text-xs sm:text-sm lg:text-xs xl:text-sm 2xl:text-base text-[#6b7280] font-medium">{label}</div>
    </div>
  );
});


