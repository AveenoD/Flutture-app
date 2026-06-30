import React from "react";

type AdditionalKPIProps = {
  icon: React.ReactNode;
  trend: string;
  trendUp?: boolean;
  value: string;
  label: string;
  points: string;
  color?: string;
};

export function AdditionalKPICard({
  icon,
  trend,
  trendUp = true,
  value,
  label,
  points,
  color = "#3b82f6",
}: AdditionalKPIProps) {
  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <span className="text-2xl sm:text-3xl lg:text-4xl" style={{ color }} aria-hidden="true">
          {icon}
        </span>
        <span
          className={`text-xs sm:text-sm font-medium ${
            trendUp ? "text-[#00a63e]" : "text-[#e7000b]"
          }`}
        >
          {trend}
        </span>
      </div>
      <div className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-900 mb-1.5 sm:mb-2">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1.5 sm:mb-2">
        {label}
      </div>
      <div className="text-[10px] sm:text-xs text-slate-500 font-medium">
        {points}
      </div>
    </div>
  );
}

