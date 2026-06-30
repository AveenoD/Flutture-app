"use client";

import React, { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import { ChartSkeleton } from "@/components/ui/loadingSkeleton";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Helper function to get CSS variable value
const getCSSVariable = (varName: string): string => {
  if (typeof window !== "undefined") {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }
  return "";
};

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface DashboardChartsProps {
  isLoading?: boolean;
  journeyChartData?: any;
  sourceChartData?: any;
  onViewAlerts?: () => void;
}

// Default colors (fallback if CSS variables not available)
const getChartColors = () => {
  if (typeof window === "undefined") {
    // Server-side fallback
    return {
      visit: {
        base: "#8979FF",
        bg30: "rgba(137, 121, 255, 0.3)",
        bg5: "rgba(137, 121, 255, 0.05)",
      },
      booking: {
        base: "#FF928A",
        bg30: "rgba(255, 146, 138, 0.3)",
        bg5: "rgba(255, 146, 138, 0.05)",
      },
      lead: {
        base: "#3CC3DF",
        bg30: "rgba(60, 195, 223, 0.3)",
        bg5: "rgba(60, 195, 223, 0.05)",
      },
    };
  }

  // Client-side: get from CSS variables
  const visitBase = getCSSVariable("--chart-visit-base") || "#8979FF";
  const bookingBase = getCSSVariable("--chart-booking-base") || "#FF928A";
  const leadBase = getCSSVariable("--chart-lead-base") || "#3CC3DF";

  return {
    visit: {
      base: visitBase,
      bg30: hexToRgba(visitBase, 0.3),
      bg5: hexToRgba(visitBase, 0.05),
    },
    booking: {
      base: bookingBase,
      bg30: hexToRgba(bookingBase, 0.3),
      bg5: hexToRgba(bookingBase, 0.05),
    },
    lead: {
      base: leadBase,
      bg30: hexToRgba(leadBase, 0.3),
      bg5: hexToRgba(leadBase, 0.05),
    },
  };
};

const defaultSourceChartData = {
  labels: ["Facebook", "Direct", "Referral"],
  datasets: [
    {
      data: [40, 35, 25],
      backgroundColor: [
        "var(--primary-base)",
        "var(--success)",
        "var(--warning)",
      ],
      borderWidth: 0,
    },
  ],
};

const getChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index" as const,
    intersect: false,
  },
  layout: {
    padding: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
  },
  plugins: {
    legend: {
      display: true,
      position: "bottom" as const,
      align: "center" as const,
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        padding: 15,
        font: {
          size: 12,
          weight: 500,
        },
        boxWidth: 10,
        boxHeight: 10,
        color: "var(--text-dark)",
      },
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      padding: 10,
      cornerRadius: 6,
      displayColors: true,
      titleFont: {
        size: 12,
        weight: 600,
      },
      bodyFont: {
        size: 11,
      },
      callbacks: {
        label: function (context: any) {
          return `${context.dataset.label}: ${context.parsed.y}`;
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: {
        padding: 12,
        maxRotation: 0,
        autoSkip: false,
        font: {
          size: 12,
        },
        color: "var(--text-secondary)",
      },
      grid: {
        display: false,
        drawBorder: false,
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      max: 100,
      ticks: {
        padding: 12,
        stepSize: 20,
        font: {
          size: 12,
        },
        color: "var(--text-secondary)",
        callback: function (value: any) {
          return value;
        },
      },
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
        drawBorder: false,
        lineWidth: 1,
      },
    },
  },
});

export default function DashboardCharts({
  isLoading = false,
  journeyChartData,
  sourceChartData = defaultSourceChartData,
  onViewAlerts,
}: DashboardChartsProps) {
  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "custom">("week");
  
  // Get colors from CSS variables
  const colors = useMemo(() => getChartColors(), []);

  // Create chart data with colors from CSS variables
  const chartData = useMemo(() => {
    if (journeyChartData) return journeyChartData;
    
    return {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "Visit",
          data: [32, 24, 20, 18, 8, 28, 24],
          borderColor: colors.visit.base,
          backgroundColor: colors.visit.bg30,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: colors.visit.base,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          borderWidth: 2,
        },
        {
          label: "Booking",
          data: [18, 8, 30, 42, 40, 42, 48],
          borderColor: colors.booking.base,
          backgroundColor: colors.booking.bg30,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: colors.booking.base,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          borderWidth: 2,
        },
        {
          label: "Lead",
          data: [10, 43, 18, 26, 36, 22, 8],
          borderColor: colors.lead.base,
          backgroundColor: colors.lead.bg30,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: colors.lead.base,
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          borderWidth: 2,
        },
      ],
    };
  }, [journeyChartData, colors]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 mb-6">
      {/* User Journey Metrics */}
      <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-4 sm:p-5 lg:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-[var(--text-dark)]">
            User Journey Metrics
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            {(["week", "month", "custom"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 ${
                  timePeriod === period
                    ? "bg-[var(--primary-base)] text-white shadow-sm"
                    : "bg-[var(--surface-neutral)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                }`}
                aria-label={`Select ${period} period`}
                aria-pressed={timePeriod === period}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <ChartSkeleton height={280} />
        ) : (
          <div className="w-full -mx-2 sm:mx-0">
            <div className="w-full h-[250px] sm:h-[280px] md:h-[300px] lg:h-[320px] xl:h-[340px] px-2 sm:px-0">
              <Line data={chartData} options={getChartOptions()} />
            </div>
          </div>
        )}
      </div>

      {/* Manager Alerts */}
      <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-dark)]">
          Manager Alerts
        </h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-2.5 rounded-lg border-l-4 bg-[var(--surface-neutral)] animate-pulse">
                <div className="h-4 bg-[var(--surface-neutral)] rounded mb-2 w-3/4" />
                <div className="h-3 bg-[var(--surface-neutral)] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
            {[
              {
                type: "danger",
                title: "Low Performance",
                time: "1m ago",
                message: "Sarah completed 2/10 visits today.",
              },
              {
                type: "warning",
                title: "Hot Lead Pending",
                time: "5m ago",
                message: "Facebook lead unassigned for 4h.",
              },
              {
                type: "warning",
                title: "Missed Follow-up",
                time: "15m ago",
                message: "John Doe's follow-up is overdue by 2 days.",
              },
              {
                type: "danger",
                title: "Low Activity",
                time: "30m ago",
                message: "Team West Zone has low activity in the last 3 days.",
              },
            ].map((alert, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border-l-4 ${
                  alert.type === "danger"
                    ? "bg-[var(--surface-error)] border-[var(--error)]"
                    : alert.type === "warning"
                    ? "bg-[var(--surface-warning)] border-[var(--warning)]"
                    : "bg-[#f0f9ff] border-[#0ea5e9]"
                }`}
                role="alert"
              >
                <div className="flex justify-between items-start mb-1">
                  <strong className="text-sm font-semibold text-[var(--text-dark)]">
                    {alert.title}
                  </strong>
                  <small className="text-xs text-[var(--text-secondary)]">{alert.time}</small>
                </div>
                <p className="text-xs text-[var(--text-secondary)] m-0">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
        {onViewAlerts && (
          <button
            onClick={onViewAlerts}
            className="w-full px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
            aria-label="View all alerts"
          >
            View All Alerts
          </button>
        )}
      </div>
    </div>
  );
}

