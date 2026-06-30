"use client";

import React from "react";
import { Inbox, Search, FileX, AlertCircle } from "lucide-react";

export type EmptyStateVariant = "default" | "search" | "error" | "no-data";

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState = React.memo(function EmptyState({
  variant = "default",
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  const variantConfig = {
    default: {
      icon: <Inbox className="w-12 h-12 text-slate-400" />,
      defaultTitle: "No items found",
      defaultDescription: "There are no items to display at this time.",
    },
    search: {
      icon: <Search className="w-12 h-12 text-slate-400" />,
      defaultTitle: "No results found",
      defaultDescription: "Try adjusting your search terms or filters.",
    },
    error: {
      icon: <AlertCircle className="w-12 h-12 text-red-400" />,
      defaultTitle: "Something went wrong",
      defaultDescription: "We couldn't load the data. Please try again.",
    },
    "no-data": {
      icon: <FileX className="w-12 h-12 text-slate-400" />,
      defaultTitle: "No data available",
      defaultDescription: "There is no data to display.",
    },
  } as const;

  const config = variantConfig[variant];
  const displayIcon = icon || config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayDescription = description || config.defaultDescription;

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4" aria-hidden="true">
        {displayIcon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{displayTitle}</h3>
      {displayDescription && (
        <p className="text-sm text-slate-600 max-w-md mb-6">{displayDescription}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[var(--primary-base)] text-white rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  );
});


