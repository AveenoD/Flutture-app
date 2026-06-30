"use client";

import React from "react";
import { PhoneCall, CalendarDays } from "lucide-react";
import { ListItemSkeleton } from "@/components/ui/loadingSkeleton";
import { EmptyState } from "@/components/ui/emptyState";

interface FollowupItem {
  name: string;
  project: string;
  status: string;
  time: string;
  statusColor: string;
}

interface VisitItem {
  name: string;
  project: string;
  time: string;
}

interface DashboardFollowupsProps {
  isLoading?: boolean;
  followups?: FollowupItem[];
  visits?: VisitItem[];
  onViewFollowups?: () => void;
  onViewVisits?: () => void;
}

const defaultFollowups: FollowupItem[] = [
  {
    name: "Sarah Johnson",
    project: "Ocean Park Residences",
    status: "Interested",
    time: "2 hours ago",
    statusColor: "bg-[var(--surface-success)] text-[var(--success-text)]",
  },
  {
    name: "Mike Chen",
    project: "Greenville District",
    status: "Rescheduled",
    time: "4 hours ago",
    statusColor: "bg-[var(--surface-warning)] text-[#92400e]",
  },
];

const defaultVisits: VisitItem[] = [
  { name: "David Wilson", project: "Miana Avenue", time: "Today 2:00 PM" },
  { name: "Sarah Johnson", project: "Ocean Park Residences", time: "Tomorrow 11:00 AM" },
];

export default function DashboardFollowups({
  isLoading = false,
  followups = defaultFollowups,
  visits = defaultVisits,
  onViewFollowups,
  onViewVisits,
}: DashboardFollowupsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Recent Follow-ups */}
      <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-dark)] flex items-center gap-2">
          <PhoneCall size={18} aria-hidden="true" />
          Recent Follow-ups
        </h2>
        {isLoading ? (
          <div className="space-y-3 mb-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : followups.length === 0 ? (
          <EmptyState
            title="No follow-ups"
            description="You don't have any recent follow-ups at the moment."
            className="py-8"
          />
        ) : (
          <div className="space-y-3 mb-4">
            {followups.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-end pb-3 border-b border-[var(--surface-neutral)] last:border-b-0"
              >
                <div>
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)]">{item.project}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-semibold ${item.statusColor}`}
                  >
                    {item.status}
                  </span>
                  <p className="text-xs text-[var(--text-secondary)] m-0 whitespace-nowrap">
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {onViewFollowups && (
          <button
            onClick={onViewFollowups}
            className="w-full px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
            aria-label="View all follow-ups"
          >
            View All Follow-ups
          </button>
        )}
      </div>

      {/* Scheduled Visits */}
      <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-[var(--text-dark)] flex items-center gap-2">
          <CalendarDays size={18} aria-hidden="true" />
          Scheduled Visits
        </h2>
        {isLoading ? (
          <div className="space-y-3 mb-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <EmptyState
            title="No scheduled visits"
            description="You don't have any scheduled visits at the moment."
            className="py-8"
          />
        ) : (
          <div className="space-y-3 mb-4">
            {visits.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-end pb-3 border-b border-[var(--surface-neutral)] last:border-b-0"
              >
                <div>
                  <h5 className="text-sm font-semibold text-[var(--text-dark)] mb-1">
                    {item.name}
                  </h5>
                  <p className="text-xs text-[var(--text-secondary)]">{item.project}</p>
                </div>
                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-[#e0f2fe] text-[#0369a1]">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        )}
        {onViewVisits && (
          <button
            onClick={onViewVisits}
            className="w-full px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
            aria-label="View all visits"
          >
            View All Visits
          </button>
        )}
      </div>
    </div>
  );
}

