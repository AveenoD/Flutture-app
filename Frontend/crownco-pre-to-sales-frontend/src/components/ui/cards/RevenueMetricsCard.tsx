"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DollarSign, TrendingUp, ArrowDown, ChevronRight } from "lucide-react";

/**
 * Revenue Metric Item Type
 */
type RevenueMetric = {
  icon: React.ReactNode;
  value: string;
  label: string;
  trend: string;
  trendUp: boolean;
  color: string;
  href?: string;
};

/**
 * Revenue Metrics Card Props
 */
type RevenueMetricsCardProps = {
  /** Array of revenue metrics to display */
  metrics: RevenueMetric[];
  /** Optional title for the card */
  title?: string;
  /** Layout variant: 'grid' for card grid, 'funnel' for funnel flow, 'minimal' for single-line summary */
  variant?: 'grid' | 'funnel' | 'minimal';
};

/**
 * Revenue Metrics Card Component
 * Displays revenue and value metrics in a single consolidated card
 * with a gradient background and organized layout
 * 
 * @example
 * ```tsx
 * <RevenueMetricsCard
 *   metrics={revenueKPIs}
 *   title="Revenue & Value Metrics"
 *   variant="funnel"
 * />
 * ```
 */
export const RevenueMetricsCard = React.memo(function RevenueMetricsCard({
  metrics,
  title = "Revenue & Value Metrics",
  variant = 'grid',
}: RevenueMetricsCardProps) {
  const router = useRouter();

  const handleMetricClick = (href?: string) => {
    if (href) {
      router.push(href);
    }
  };

  // Extract numeric values for visualization
  const getNumericValue = (value: string): number => {
    const numStr = value.replace(/[₹,CrL]/g, '');
    const num = parseFloat(numStr);
    if (value.includes('Cr')) return num * 100; // Convert Cr to Lakhs for comparison
    if (value.includes('L')) return num;
    return num;
  };

  // Calculate conversion rate
  const getConversionRate = (): string => {
    if (metrics.length >= 2) {
      const quotation = getNumericValue(metrics[0]?.value || '0');
      const booking = getNumericValue(metrics[1]?.value || '0');
      if (quotation > 0) {
        return ((booking / quotation) * 100).toFixed(1);
      }
    }
    return '0.0';
  };

  // Minimal Single-Line Variant
  if (variant === 'minimal') {
    const conversionRate = getConversionRate();
    
    return (
      <div className="bg-gradient-to-r from-emerald-50/100 via-blue-100/80 to-purple-100/80 rounded-2xl p-4 sm:p-5 lg:p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6 lg:gap-8 min-h-[60px] ">
          {/* Quotation */}
          {metrics[0] && (
            <div 
              onClick={() => handleMetricClick(metrics[0].href)}
              className={`flex items-center gap-2 sm:gap-3 ${metrics[0].href ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            >
              <div 
                className="p-1.5 sm:p-2 rounded-lg"
                style={{ 
                  color: metrics[0].color,
                  background: `${metrics[0].color}15`,
                }}
              >
                {metrics[0].icon}
              </div>
              <div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">
                  {metrics[0].label.replace('Total ', '')}
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                  {metrics[0].value}
                </div>
                {metrics[0].trend && metrics[0].trendUp && (
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                    {metrics[0].trend}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="hidden sm:block w-[2px] h-14 bg-green-400/40 self-stretch"></div>

          {/* Booking */}
          {metrics[1] && (
            <div 
              onClick={() => handleMetricClick(metrics[1].href)}
              className={`flex items-center gap-2 sm:gap-3 ${metrics[1].href ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            >
              <div 
                className="p-1.5 sm:p-2 rounded-lg"
                style={{ 
                  color: metrics[1].color,
                  background: `${metrics[1].color}15`,
                }}
              >
                {metrics[1].icon}
              </div>
              <div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">
                  {metrics[1].label}
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                  {metrics[1].value}
                </div>
                {metrics[1].trend && metrics[1].trendUp && (
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                    {metrics[1].trend}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="hidden sm:block w-[2px] h-14 bg-blue-400/90 self-stretch"></div>

          {/* Avg Deal */}
          {metrics[2] && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div 
                className="p-1.5 sm:p-2 rounded-lg"
                style={{ 
                  color: metrics[2].color,
                  background: `${metrics[2].color}15`,
                }}
              >
                {metrics[2].icon}
              </div>
              <div>
                <div className="text-xs sm:text-sm text-slate-600 font-medium">
                  {metrics[2].label}
                </div>
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                  {metrics[2].value}
                </div>
                {metrics[2].trend && metrics[2].trendUp && (
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                    {metrics[2].trend}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="hidden sm:block w-[2px] h-14 bg-purple-400/90 self-stretch"></div>

          {/* Conversion Rate */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="p-1.5 sm:p-2 rounded-lg"
              style={{ 
                color: "var(--success)",
                background: "var(--success)15",
              }}
            >
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium">
                Conversion
              </div>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
                {conversionRate}%
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-0.5">
                Optimized
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Funnel Variant
  if (variant === 'funnel') {
    const values = metrics.map(m => getNumericValue(m.value));
    const maxValue = Math.max(...values);
    const percentages = values.map(v => (v / maxValue) * 100);

    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6 sm:mb-8">
          <div className="p-2 rounded-xl bg-[var(--primary-base)]/10">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary-base)]" />
          </div>
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">
            {title}
          </h3>
        </div>

        {/* Funnel Flow Visualization */}
        <div className="space-y-4 sm:space-y-6">
          {metrics.map((metric, index) => {
            const isClickable = !!metric.href;
            const percentage = percentages[index];
            const isLast = index === metrics.length - 1;
            
            return (
              <div key={index} className="relative">
                {/* Metric Card */}
                <div
                  onClick={() => handleMetricClick(metric.href)}
                  onKeyDown={(e) => {
                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleMetricClick(metric.href);
                    }
                  }}
                  className={`
                    relative bg-gradient-to-r from-white to-slate-50/50 
                    rounded-xl p-4 sm:p-5 border-2 transition-all duration-300
                    ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : ''}
                  `}
                  style={{
                    borderColor: `${metric.color}40`,
                  }}
                  role={isClickable ? "button" : "article"}
                  tabIndex={isClickable ? 0 : undefined}
                  aria-label={`${metric.label}: ${metric.value}, ${metric.trend}${
                    isClickable ? ". Click to view details" : ""
                  }`}
                >
                  {/* Funnel Bar Background */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 rounded-l-xl opacity-10 transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: metric.color,
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      {/* Left Side: Icon and Info */}
                      <div className="flex items-start gap-3 sm:gap-4 flex-1">
                        <div
                          className="flex items-center justify-center p-3 sm:p-3.5 rounded-xl transition-transform duration-300 hover:scale-110 flex-shrink-0"
                          style={{
                            color: metric.color,
                            background: `${metric.color}15`,
                          }}
                          aria-hidden="true"
                        >
                          {metric.icon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
                            {metric.label}
                          </div>
                          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                            {metric.value}
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full h-2 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                              style={{ 
                                width: `${percentage}%`,
                                backgroundColor: metric.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Trend Badge */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {metric.trend && (
                          <div
                            className={`
                              flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 
                              rounded-lg font-semibold text-xs sm:text-sm
                              ${metric.trendUp
                                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                                : "text-red-700 bg-red-50 border border-red-200"
                              }
                            `}
                          >
                            <TrendingUp 
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${metric.trendUp ? '' : 'rotate-180'}`} 
                            />
                            <span>{metric.trend}</span>
                          </div>
                        )}
                        
                        {isClickable && (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow Connector (except for last item) */}
                {!isLast && (
                  <div className="flex justify-center my-2 sm:my-3">
                    <div 
                      className="p-2 rounded-full"
                      style={{ backgroundColor: `${metric.color}15` }}
                    >
                      <ArrowDown 
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        style={{ color: metric.color }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Footer */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-5 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="text-slate-600">
              <span className="font-semibold text-slate-900">Conversion Rate: </span>
              {((getNumericValue(metrics[1]?.value || '0') / getNumericValue(metrics[0]?.value || '1')) * 100).toFixed(1)}%
            </div>
            <div className="text-slate-600">
              <span className="font-semibold text-slate-900">Avg Deal Size: </span>
              {metrics[2]?.value || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid Variant (Original)
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 lg:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 sm:mb-5">
        <div className="p-2 rounded-xl bg-[var(--primary-base)]/10">
          <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary-base)]" />
        </div>
        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">
          {title}
        </h3>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {metrics.map((metric, index) => {
          const isClickable = !!metric.href;
          
          return (
            <div
              key={index}
              onClick={() => handleMetricClick(metric.href)}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleMetricClick(metric.href);
                }
              }}
              className={`bg-white/60 backdrop-blur-sm rounded-xl p-4 sm:p-5 border-l-4 transition-all duration-300 ${
                isClickable
                  ? "cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
                  : ""
              }`}
              style={{
                borderLeftColor: metric.color,
              }}
              role={isClickable ? "button" : "article"}
              tabIndex={isClickable ? 0 : undefined}
              aria-label={`${metric.label}: ${metric.value}, ${metric.trend}${
                isClickable ? ". Click to view details" : ""
              }`}
            >
              {/* Icon and Trend */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div
                  className="flex items-center justify-center p-2 sm:p-2.5 rounded-lg transition-transform duration-300 hover:scale-110"
                  style={{
                    color: metric.color,
                    background: `${metric.color}15`,
                  }}
                  aria-hidden="true"
                >
                  {metric.icon}
                </div>
                {metric.trend && (
                  <span
                    className={`text-xs sm:text-sm font-semibold px-2 sm:px-2.5 py-1 rounded-lg ${
                      metric.trendUp
                        ? "text-emerald-600 bg-emerald-50"
                        : "text-red-600 bg-red-50"
                    }`}
                    aria-label={
                      metric.trendUp
                        ? `Trending up ${metric.trend}`
                        : `Trending down ${metric.trend}`
                    }
                  >
                    {metric.trend}
                  </span>
                )}
              </div>

              {/* Value */}
              <div className="text-xl sm:text-2xl lg:text-2xl xl:text-3xl font-bold text-slate-900 mb-1 sm:mb-2 tracking-tight">
                {metric.value}
              </div>

              {/* Label */}
              <div className="text-xs sm:text-sm text-slate-600 font-medium">
                {metric.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

