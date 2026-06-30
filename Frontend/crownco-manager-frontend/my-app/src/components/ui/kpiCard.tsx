import { ReactNode } from "react";

interface KPICardProps {
  icon: ReactNode;
  trend: string;
  trendUp: boolean;
  value: string;
  label: string;
}

export default function KPICard({
  icon,
  trend,
  trendUp,
  value,
  label,
}: KPICardProps) {
  const normalizedTrend = trend.trim();
  const hasDirection = normalizedTrend.startsWith("+") || normalizedTrend.startsWith("-");
  const trendClass = hasDirection
    ? normalizedTrend.startsWith("+")
      ? "text-[var(--success)]"
      : "text-[var(--error)]"
    : "text-[var(--text-secondary)]";

  return (
    <div
      className="bg-[var(--background)] p-4 rounded-[10px] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus-within:ring-2 focus-within:ring-[var(--primary-base)] focus-within:ring-offset-2"
      role="article"
      tabIndex={0}
      aria-label={`${label}: ${value}, ${trend}`}
      data-trend-up={trendUp}
    >
      <div className="flex justify-between items-center mb-2">
        {icon}
        <span
          className={`text-xs font-bold ${trendClass}`}
          aria-label={
            hasDirection
              ? normalizedTrend.startsWith("+")
                ? `Increase of ${trend}`
                : `Decrease of ${trend}`
              : `Live data ${trend}`
          }
        >
          {trend}
        </span>
      </div>
      <h3 className="text-xl font-semibold my-1 text-[var(--text-dark)]">{value}</h3>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

