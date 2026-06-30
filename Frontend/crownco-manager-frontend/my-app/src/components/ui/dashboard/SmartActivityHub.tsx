"use client";

import React from "react";
import { Users, AlertCircle, CheckCircle } from "lucide-react";
import { CardSkeleton } from "@/components/ui/loadingSkeleton";
import { EmptyState } from "@/components/ui/emptyState";

interface ActivityHub {
  title: string;
  color: string;
  icon: React.ReactNode;
  items: Array<{ name: string; detail: string }>;
  onClick: () => void;
}

interface SmartActivityHubProps {
  isLoading?: boolean;
  hubs?: ActivityHub[];
}

const defaultHubs: ActivityHub[] = [
  {
    title: "Inactive Employees (4)",
    color: "text-[var(--primary-base)]",
    icon: <Users size={18} />,
    items: [
      { name: "Abigail Martin", detail: "Idle for 2h" },
      { name: "Shawn Baker", detail: "Idle for 3h" },
    ],
    onClick: () => {},
  },
  {
    title: "Stale Leads (76)",
    color: "text-[var(--warning)]",
    icon: <AlertCircle size={18} />,
    items: [
      { name: "Imran Khan", detail: "No activity - 5 days" },
      { name: "Khan Niazi", detail: "No activity - 7 days" },
    ],
    onClick: () => {},
  },
  {
    title: "High Intent Leads (5)",
    color: "text-[var(--success)]",
    icon: <CheckCircle size={18} />,
    items: [
      { name: "Mark Shard", detail: "Visited twice this week" },
      { name: "Sayed Walid", detail: "Ready to book" },
    ],
    onClick: () => {},
  },
];

export default function SmartActivityHub({
  isLoading = false,
  hubs = defaultHubs,
}: SmartActivityHubProps) {
  return (
    <section aria-labelledby="activity-hub-heading">
      <h2
        id="activity-hub-heading"
        className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-[var(--text-dark)]"
      >
        Smart Activity Hub
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : hubs.length === 0 ? (
        <EmptyState
          title="No activity data"
          description="Activity hub data will appear here when available."
          className="mb-6"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {hubs.map((hub, idx) => (
            <div
              key={idx}
              className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
              role="article"
            >
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${hub.color}`}>
                {hub.icon}
                {hub.title}
              </h3>
              <div className="space-y-3 mb-4">
                {hub.items.map((item, i) => (
                  <div
                    key={i}
                    className="pb-3 border-b border-[var(--surface-neutral)] last:border-b-0"
                  >
                    <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                      {item.name}
                    </h5>
                    <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={hub.onClick}
                className="w-full px-4 py-2 border border-[var(--border-color)] rounded-md text-sm hover:bg-[var(--hover-bg)] transition-colors mt-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
                aria-label={`View all ${hub.title}`}
              >
                View All
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

