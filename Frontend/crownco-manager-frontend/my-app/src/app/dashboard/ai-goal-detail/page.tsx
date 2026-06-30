"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Users,
  Home,
  Hand,
  CalendarCheck,
  MessageCircle,
  MapPin,
  Calendar,
  Check,
  FileText,
  RotateCw,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
} from "lucide-react";

interface MetricCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend: string;
  trendType: "up" | "down";
  iconColor?: string;
}

const MetricCard = ({
  icon,
  value,
  label,
  trend,
  trendType,
  iconColor = "var(--primary-base)",
}: MetricCardProps) => {
  return (
    <div className="bg-[var(--background)] p-4 rounded-xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-2">
        <div style={{ color: iconColor }} className="text-xl">
          {icon}
        </div>
        <span
          className={`text-sm font-semibold ${
            trendType === "up"
              ? "text-[var(--success)]"
              : "text-[var(--error)]"
          }`}
        >
          {trend}
        </span>
      </div>
      <div className="text-2xl font-bold mb-1 text-[var(--text-dark)]">
        {value}
      </div>
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
    </div>
  );
};

interface SuggestionItemProps {
  title: string;
  description: string;
  timestamp: string;
}

const SuggestionItem = ({ title, description, timestamp }: SuggestionItemProps) => {
  return (
    <div className="bg-[var(--surface-primary)] p-3 rounded-lg border-l-4 border-[var(--primary-base)] relative shadow-sm hover:shadow transition-shadow">
      <span className="absolute top-3 right-3 text-xs text-[var(--text-tertiary)]">
        {timestamp}
      </span>
      <h4 className="text-sm font-semibold text-[var(--primary-base)] mb-1 pr-16">
        {title}
      </h4>
      <p className="text-xs text-[var(--text-secondary)]">{description}</p>
    </div>
  );
};

interface BarGroupProps {
  actual: number;
  forecast: number;
  target: number;
  label: string;
}

const BarGroup = ({ actual, forecast, target, label }: BarGroupProps) => {
  // Chart container height: 120px on mobile, 140px on desktop
  // Calculate heights as percentage of max value (150)
  const maxValue = 150;
  const actualPercent = (actual / maxValue) * 100;
  const forecastPercent = (forecast / maxValue) * 100;
  const targetPercent = (target / maxValue) * 100;

  return (
    <div className="flex flex-col items-center flex-1 max-w-[120px] h-full justify-end">
      <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center h-full">
        <div
          className="w-4 sm:w-5 rounded-t bg-[#cbd5e1] min-h-[2px] flex-shrink-0"
          style={{ height: `${actualPercent}%` }}
        />
        <div
          className="w-4 sm:w-5 rounded-t bg-[var(--primary-base)] min-h-[2px] flex-shrink-0"
          style={{ height: `${forecastPercent}%` }}
        />
        <div
          className="w-4 sm:w-5 rounded-t bg-[var(--success)] min-h-[2px] flex-shrink-0"
          style={{ height: `${targetPercent}%` }}
        />
      </div>
      <div className="text-[9px] sm:text-[10px] text-[var(--text-secondary)] mt-1 text-center w-full">
        {label}
      </div>
    </div>
  );
};

export default function AiGoalDetail() {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => {
      setRegenerating(false);
      alert("Regenerating AI Plan... This would normally trigger a data refresh.");
    }, 500);
  };

  const metrics = [
    {
      icon: <Users size={18} className="text-[var(--primary-base)]" />,
      value: 128,
      label: "Estimated Leads Required",
      trend: "+3.2%",
      trendType: "up" as const,
    },
    {
      icon: <Home size={18} className="text-[var(--purple)]" />,
      value: 64,
      label: "Site Visits Needed",
      trend: "+1.8%",
      trendType: "up" as const,
      iconColor: "var(--purple)",
    },
    {
      icon: <Hand size={18} className="text-[var(--error)]" />,
      value: 116,
      label: "Revisits Required",
      trend: "-0.8%",
      trendType: "down" as const,
      iconColor: "var(--error)",
    },
    {
      icon: <CalendarCheck size={18} className="text-[var(--warning)]" />,
      value: 12,
      label: "Daily Booking Required",
      trend: "+2.0%",
      trendType: "up" as const,
      iconColor: "var(--warning)",
    },
    {
      icon: <MessageCircle size={18} className="text-[var(--lime)]" />,
      value: 27,
      label: "Suggested Agents",
      trend: "-0.5%",
      trendType: "down" as const,
      iconColor: "var(--lime)",
    },
    {
      icon: <MessageCircle size={18} className="text-[var(--lime)]" />,
      value: 27,
      label: "Avg followups cycles",
      trend: "-0.5%",
      trendType: "down" as const,
      iconColor: "var(--lime)",
    },
    {
      icon: <MessageCircle size={18} className="text-[var(--lime)]" />,
      value: 27,
      label: "Expected conversion rate",
      trend: "-0.5%",
      trendType: "down" as const,
      iconColor: "var(--lime)",
    },
  ];

  const suggestions = [
    {
      title: "Low Activity",
      description: "Only 2 visits logged this week — 8 short of our target (10)",
      timestamp: "2 hour ago",
    },
    {
      title: "Regional Strength",
      description: "Team A performs 23% better in Mumbai leads",
      timestamp: "2 hour ago",
    },
    {
      title: "Lead Channel Efficiency",
      description: "Facebook and 99acres leads convert 20% faster",
      timestamp: "2 hour ago",
    },
    {
      title: "Time-Based Conversion",
      description: "Weekend site visits show 16% higher conversion",
      timestamp: "2 hour ago",
    },
    {
      title: "Inventory Insight",
      description: "Luxury units perform better with 2+ revisits",
      timestamp: "2 hour ago",
    },
  ];

  const chartData = [
    { actual: 30, forecast: 40, target: 80, label: "Week 1" },
    { actual: 45, forecast: 55, target: 100, label: "Week 2" },
    { actual: 65, forecast: 75, target: 120, label: "Week 3" },
    { actual: 110, forecast: 120, target: 150, label: "Week 4" },
  ];

  const yAxisLabels = [150, 100, 50, 0];

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--background)] min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <div className="flex items-center px-4 sm:px-5 md:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
              aria-label="Go back"
            >
              <ArrowLeft size={20} className="text-[var(--text-dark)]" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-dark)]">
              AI Goal Detail
            </h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:p-5 md:p-6 lg:p-8">
        {/* Metrics Breakdown Section */}
        <section aria-labelledby="metrics-breakdown-heading">
          <h2
            id="metrics-breakdown-heading"
            className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-[var(--text-dark)] text-left"
          >
            Metrics Breakdown
          </h2>

          {/* Mobile: Horizontal scrollable cards */}
          <div className="block sm:hidden mb-6">
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {metrics.map((metric, idx) => (
                <div key={idx} className="flex-shrink-0 w-[calc(100vw-2rem)] max-w-[280px]">
                  <MetricCard {...metric} />
                </div>
              ))}
            </div>
          </div>
          {/* Desktop: Grid layout */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {metrics.map((metric, index) => (
              <MetricCard key={index} {...metric} />
            ))}
          </div>
        </section>

        {/* Property & Chart Section */}
        <section aria-labelledby="property-chart-heading" className="mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-4 sm:gap-5">
            {/* Property Card */}
            <div className="bg-[var(--background)] rounded-xl overflow-hidden border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
              <div className="relative w-full h-28 sm:h-32 bg-gray-200">
                <Image
                  src="https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400"
                  alt="Maaz Palace"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="text-[var(--primary-base)] text-sm sm:text-base font-semibold flex-1">
                    Maaz Palace
                  </h3>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-primary)] text-[var(--primary-base)] text-[10px] sm:text-xs font-medium border border-[var(--primary-base)]/20">
                      Target: 80
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-warning)] text-[var(--warning)] text-[10px] sm:text-xs font-medium border border-[var(--warning)]/20">
                      Ongoing
                    </span>
                  </div>
                </div>
                <div className="space-y-1 mb-2">
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                    <MapPin size={12} className="flex-shrink-0" aria-hidden="true" />
                    Karla - City Center
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Users size={12} className="flex-shrink-0" aria-hidden="true" />
                    Team - West Zone
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Calendar size={12} className="flex-shrink-0" aria-hidden="true" />
                    Period - 1 Jul - 31 Jul 2024
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="px-1.5 py-0.5 rounded-md bg-[#fee4e2] text-[#d92d20] text-[10px] sm:text-xs font-medium">
                    Slow Progress
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-primary)] text-[var(--primary-base)] text-[10px] sm:text-xs font-medium">
                    Reassign Team
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-neutral)] text-[var(--text-secondary)] text-[10px] sm:text-xs font-medium">
                    Less Calls
                  </span>
                </div>
                <button className="w-full mt-2 px-3 py-2 rounded-md bg-[var(--primary-base)] text-white font-medium text-xs sm:text-sm hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2">
                  View Details
                </button>
              </div>
            </div>

            {/* Chart Container */}
            <div className="bg-[var(--background)] rounded-xl p-2.5 sm:p-3 border border-[var(--border-color)] shadow-sm">
              <h3
                id="property-chart-heading"
                className="text-sm sm:text-base font-semibold mb-2 text-[var(--text-dark)]"
              >
                AI Forecast & Performance
              </h3>
              <div className="relative w-full overflow-x-auto">
              {/* Y-Axis */}
              <div className="absolute left-0 top-0 bottom-5 w-4 sm:w-5 flex flex-col justify-between text-[9px] sm:text-[10px] text-[var(--text-secondary)] h-[120px] sm:h-[140px]">
                {yAxisLabels.map((label) => (
                  <div key={label} className="text-right pr-0.5">
                    {label}
                  </div>
                ))}
              </div>

              {/* Chart Visual */}
              <div className="pl-5 sm:pl-7 pb-3 sm:pb-4">
                <div className="relative h-[120px] sm:h-[140px] flex items-end justify-evenly gap-1 sm:gap-1.5 px-1 sm:px-2 border-t border-b border-[var(--border-color)]"
                  style={{
                    backgroundImage: `repeating-linear-gradient(to bottom, var(--border-color) 0px, var(--border-color) 1px, transparent 1px, transparent 30px)`,
                  }}
                >
                  {chartData.map((data, index) => (
                    <BarGroup key={index} {...data} />
                  ))}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-evenly px-1 sm:px-2 pt-1 sm:pt-1.5 text-[9px] sm:text-[10px] text-[var(--text-secondary)]">
                  {chartData.map((data, index) => (
                    <div key={index} className="flex-1 text-center max-w-[120px]">
                      {data.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 mb-1.5 sm:mb-2 text-[9px] sm:text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-[#cbd5e1]"></div>
                  <span className="text-[var(--text-secondary)]">Actual</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-[var(--primary-base)]"></div>
                  <span className="text-[var(--text-secondary)]">Forecast (AI)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-[var(--success)]"></div>
                  <span className="text-[var(--text-secondary)]">Target</span>
                </div>
              </div>

              {/* Insight Banner */}
              <div className="mt-1.5 sm:mt-2 bg-[var(--surface-primary)] text-[var(--primary-base)] p-1.5 sm:p-2 rounded-md text-[9px] sm:text-[10px] relative border-l-4 border-[var(--primary-base)]">
                <span className="absolute top-1 right-1 text-[8px] sm:text-[9px] text-[var(--text-tertiary)]">
                  2 hour ago
                </span>
                <strong className="block mb-0.5 text-[10px] sm:text-xs">Weekly Momentum Insight</strong>
                <span className="text-[9px] sm:text-[10px]">
                  Week-over-week performance has improved by 32% — momentum strong. Maintain lead quality to sustain.
                </span>
              </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Suggestions Section */}
        <section aria-labelledby="ai-suggestions-heading" className="mb-20 sm:mb-24">
          <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border-color)] shadow-sm">
            <h2
              id="ai-suggestions-heading"
              className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-[var(--text-dark)]"
            >
              AI Suggestions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {suggestions.map((suggestion, index) => (
                <SuggestionItem key={index} {...suggestion} />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 bg-[var(--background)] px-4 sm:px-5 md:px-6 lg:px-8 py-4 border-t border-[var(--border-color)] flex flex-wrap gap-3 shadow-lg z-10">
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[var(--success)] text-white font-medium text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--success)] focus:ring-offset-2 flex-1 sm:flex-initial min-h-[44px] sm:min-h-auto"
          aria-label="Save plan"
        >
          <Check size={16} aria-hidden="true" />
          Save Plan
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-[var(--secondary-base)] text-white font-medium text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--secondary-base)] focus:ring-offset-2 flex-1 sm:flex-initial min-h-[44px] sm:min-h-auto"
          aria-label="Export plan as PDF"
        >
          <FileText size={16} aria-hidden="true" />
          Export (PDF)
        </button>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[var(--warning)] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--warning)] focus:ring-offset-2 flex-1 sm:flex-initial min-h-[44px] sm:min-h-auto"
          aria-label="Regenerate AI plan"
        >
          <RotateCw size={16} className={regenerating ? "animate-spin" : ""} aria-hidden="true" />
          Re-Generate Plan
        </button>
      </div>
    </div>
  );
}
