"use client";

import React from "react";
import { TrendingUp, TrendingDown, AlertCircle, ArrowRight } from "lucide-react";

type StageStatus = "normal" | "warning" | "critical";

type StageStatsCardProps = {
  stage: string;
  count: number;
  percentage: number;
  onClick?: () => void;
  status?: StageStatus;
  trend?: {
    value: number;
    isUp: boolean;
  };
  className?: string;
};

export function StageStatsCard({
  stage,
  count,
  percentage,
  onClick,
  status = "normal",
  trend,
  className = "",
}: StageStatsCardProps) {
  const statusColors = {
    normal: {
      border: "border-slate-200/80",
      bg: "bg-gradient-to-br from-white to-slate-50/50",
      bgHover: "hover:from-white hover:to-slate-50",
      text: "text-slate-700",
      indicator: "bg-gradient-to-r from-emerald-500 to-emerald-600",
      indicatorShadow: "shadow-[0_2px_8px_rgba(16,185,129,0.2)]",
      title: "text-slate-700",
      count: "text-slate-900",
    },
    warning: {
      border: "border-amber-300/60",
      bg: "bg-gradient-to-br from-amber-50/80 to-amber-100/40",
      bgHover: "hover:from-amber-50 hover:to-amber-100/60",
      text: "text-amber-700",
      indicator: "bg-gradient-to-r from-amber-500 to-orange-500",
      indicatorShadow: "shadow-[0_2px_8px_rgba(245,158,11,0.25)]",
      title: "text-amber-800",
      count: "text-amber-900",
    },
    critical: {
      border: "border-red-300/60",
      bg: "bg-gradient-to-br from-red-50/80 to-red-100/40",
      bgHover: "hover:from-red-50 hover:to-red-100/60",
      text: "text-red-700",
      indicator: "bg-gradient-to-r from-red-500 to-red-600",
      indicatorShadow: "shadow-[0_2px_8px_rgba(239,68,68,0.25)]",
      title: "text-red-800",
      count: "text-red-900",
    },
  };

  const colors = statusColors[status];
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`
        group relative p-5 sm:p-6 lg:p-7 rounded-2xl border ${colors.border} ${colors.bg}
        shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.03)]
        backdrop-blur-sm
        ${isClickable 
          ? `cursor-pointer ${colors.bgHover} hover:shadow-[0_4px_16px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] 
             transition-all duration-300 hover:-translate-y-1 hover:border-opacity-100
             active:scale-[0.98]` 
          : ""}
        ${className}
      `}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`text-sm sm:text-base font-semibold ${colors.title} leading-tight`}>
              {stage}
            </h3>
            {status !== "normal" && (
              <div className="relative flex-shrink-0">
                <div className={`absolute inset-0 ${status === 'warning' ? 'bg-amber-200' : 'bg-red-200'} rounded-full blur-sm opacity-50`}></div>
                <AlertCircle className={`relative w-4 h-4 sm:w-5 sm:h-5 ${colors.text}`} />
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className={`text-3xl sm:text-4xl lg:text-[2.5rem] font-bold ${colors.count} leading-none tracking-tight`}>
              {count.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-500 pt-1">
              ({percentage.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="mb-3">
        <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full ${colors.indicator} ${colors.indicatorShadow} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Trend Section */}
      {trend && (
        <div className="flex items-center gap-1.5 mb-3">
          <div className={`flex items-center justify-center w-5 h-5 rounded-full ${
            trend.isUp ? "bg-emerald-100" : "bg-red-100"
          }`}>
            {trend.isUp ? (
              <TrendingUp className="w-3 h-3 text-emerald-700" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-700" />
            )}
          </div>
          <span className={`text-xs sm:text-sm font-semibold ${
            trend.isUp ? "text-emerald-700" : "text-red-700"
          }`}>
            {trend.isUp ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-slate-500">vs last period</span>
        </div>
      )}

      {/* Action Link */}
      {isClickable && (
        <div className="mt-4 pt-4 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5 group-hover:gap-2 transition-all duration-200">
            <span className="text-xs sm:text-sm font-semibold text-[var(--primary-base)] group-hover:text-[var(--primary-hover)] transition-colors">
              View Details
            </span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--primary-base)] group-hover:text-[var(--primary-hover)] group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </div>
      )}

      {/* Decorative gradient overlay on hover */}
      {isClickable && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent via-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      )}
    </div>
  );
}


