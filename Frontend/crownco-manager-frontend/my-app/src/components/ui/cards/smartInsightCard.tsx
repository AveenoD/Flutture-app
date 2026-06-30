"use client";

import React from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import { CardSkeleton } from "@/components/ui/loadingSkeleton";
import { EmptyState } from "@/components/ui/emptyState";

type InsightSeverity = "critical" | "warning" | "opportunity" | "info";

export interface SmartInsight {
  id: string | number;
  title: string;
  description: string;
  severity: InsightSeverity;
  timeAgo: string;
}

export interface SmartInsightCardProps {
  isLoading?: boolean;
  insights?: SmartInsight[];
  onDismissInsight?: (insight: SmartInsight) => void;
  onViewAll?: () => void;
}

const defaultInsights: SmartInsight[] = [
  {
    id: 1,
    title: "Rule Not Routing Leads",
    description: 'Rule "Weekend Leads" has only routed 8 leads this month with 6% conversion.',
    severity: "critical",
    timeAgo: "2 hour ago",
  },
  {
    id: 2,
    title: "Team B Overloaded",
    description: "Team B is handling 35% above capacity. Response time increased to 42 minutes.",
    severity: "warning",
    timeAgo: "4 hour ago",
  },
  {
    id: 3,
    title: "High Conversion Opportunity",
    description:
      "Premium Leads - Thane rule shows 34% conversion rate. Consider expanding criteria.",
    severity: "opportunity",
    timeAgo: "6 hour ago",
  },
  {
    id: 4,
    title: "Unmatched Corporate Leads",
    description:
      "23 corporate inquiries unassigned this week. Missing dedicated routing rule.",
    severity: "info",
    timeAgo: "2 hour ago",
  },
];

function severityStyles(severity: InsightSeverity) {
  switch (severity) {
    case "critical":
      return {
        container: "bg-[#FFECEC]",
        iconBg: "bg-[#FFD3D3]",
        iconColor: "text-[#E32222]",
        title: "text-[#C51313]",
      };
    case "warning":
      return {
        container: "bg-[#FFF4E0]",
        iconBg: "bg-[#FFE0B2]",
        iconColor: "text-[#E47B18]",
        title: "text-[#D16108]",
      };
    case "opportunity":
      return {
        container: "bg-[#E9F9ED]",
        iconBg: "bg-[#C4F0D0]",
        iconColor: "text-[#16A34A]",
        title: "text-[#15803D]",
      };
    case "info":
    default:
      return {
        container: "bg-[#E6F0FF]",
        iconBg: "bg-[#CCDEFF]",
        iconColor: "text-[#2563EB]",
        title: "text-[#1D4ED8]",
      };
  }
}

function severityLabel(severity: InsightSeverity) {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "opportunity":
      return "Opportunity";
    case "info":
    default:
      return "Info";
  }
}

export default function SmartInsightCard({
  isLoading = false,
  insights = defaultInsights,
  onDismissInsight,
  onViewAll,
}: SmartInsightCardProps) {
  const criticalCount = insights.filter((i) => i.severity === "critical").length;

  return (
    <section
      aria-labelledby="smart-insight-heading"
      className="bg-[var(--background)] border border-[var(--border-color)] rounded-2xl p-5 sm:p-6 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <h2
            id="smart-insight-heading"
            className="text-lg sm:text-xl font-semibold text-[var(--text-dark)]"
          >
            Smart Insight
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Emphasizes decision support
          </p>
        </div>
        {insights.length > 0 && (
          <div className="inline-flex items-center gap-1 rounded-full bg-[#FFECEC] px-2.5 py-1 text-[10px] sm:text-xs font-medium text-[#C51313]">
            <span>{criticalCount}</span>
            <span>{criticalCount === 1 ? "Critical" : "Criticals"}</span>
          </div>
        )}
      </header>

      {isLoading ? (
        <CardSkeleton />
      ) : insights.length === 0 ? (
        <EmptyState
          title="No insights yet"
          description="AI-generated insights will appear here when available."
        />
      ) : (
        <>
          <div className="space-y-3 mb-5 h-[240px] overflow-y-auto pr-2">
            {insights.map((insight) => {
              const styles = severityStyles(insight.severity);
              return (
                <article
                  key={insight.id}
                  className={`flex items-start gap-3 sm:gap-4 rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 ${styles.container}`}
                  role="alert"
                  aria-label={`${severityLabel(insight.severity)} insight: ${insight.title}`}
                >
                  <div
                    className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full ${styles.iconBg}`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.iconColor}`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3
                          className={`text-xs sm:text-sm font-semibold leading-snug ${styles.title}`}
                        >
                          {insight.title}
                        </h3>
                        <p className="mt-1 text-[11px] sm:text-xs text-[var(--text-secondary)]">
                          {insight.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] sm:text-xs text-[var(--text-secondary)]">
                        {insight.timeAgo}
                      </span>
                    </div>
                  </div>
                  {onDismissInsight && (
                    <button
                      type="button"
                      onClick={() => onDismissInsight(insight)}
                      className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-dark)] p-0.5 rounded-full hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
                      aria-label={`Dismiss insight: ${insight.title}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onViewAll}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--primary-base)] px-4 py-2.5 text-xs sm:text-sm font-medium text-white hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
          >
            View All Insights
          </button>
        </>
      )}
    </section>
  );
}

