"use client";

import React, { ReactNode } from "react";

/**
 * Lead status types
 */
export type StatusType = "veryhot" | "hot" | "warm" | "cold" | "rejected";

/**
 * Badge variant types
 */
export type BadgeVariant = "status" | "source";

/**
 * Badge Component Props
 */
export interface BadgeProps {
  /** Content to display in the badge */
  children: ReactNode;
  /** Badge variant - determines styling */
  variant?: BadgeVariant;
  /** Status type (for status variant) */
  status?: StatusType;
  /** Source name (for source variant) */
  source?: string;
  /** Additional CSS classes */
  className?: string;
  /** Tooltip text */
  title?: string;
  /** ARIA label for accessibility */
  "aria-label"?: string;
}

// Status badge colors - using global CSS variables
const getStatusColors = (status: StatusType) => {
  switch (status) {
    case "veryhot":
      return "bg-[var(--surface-error)] text-[var(--error)]";
    case "hot":
      return "bg-[var(--surface-warning)] text-[var(--warning)]";
    case "warm":
      return "bg-[var(--surface-warning)] text-[var(--warning)]";
    case "cold":
      return "bg-[var(--surface-primary)] text-[var(--primary-base)]";
    case "rejected":
      return "bg-[var(--surface-neutral)] text-[var(--disabled-text)]";
    default:
      return "bg-[var(--surface-neutral)] text-[var(--sidebar-text-main)]";
  }
};

// Source badge colors - using global CSS variables
const getSourceColors = (source: string): string => {
  // Website sources
  if (source.includes("Magicbricks.com") || source.toLowerCase().includes("magicbricks")) {
    return "bg-[#E6F4EA] text-[#10b981] border border-[#E6F4EA]"; // Green
  } else if (source.includes("Housing.com") || source.toLowerCase().includes("housing")) {
    return "bg-[#FDF1DD] text-[#f59e0b] border border-[#FDF1DD]"; // Orange
  } else if (source.includes("Booking.com") || source.toLowerCase().includes("booking")) {
    return "bg-[#E5F3FF] text-[#3b82f6] border border-[#E5F3FF]"; // Light Blue
  } else if (source.includes("Nobroker.com") || source.toLowerCase().includes("nobroker")) {
    return "bg-[#F4E7FB] text-[#8b5cf6] border border-[#F4E7FB]"; // Light Purple
  } else if (source.includes("99acres.com") || source.toLowerCase().includes("99acres")) {
    return "bg-[#FEE2E2] text-[#ef4444] border border-[#FEE2E2]"; // Red
  } else if (source.includes("Assigned By Anuj")) {
    return "bg-[var(--surface-primary)] text-[var(--primary-base)] border border-[var(--primary-selected)]";
  } else if (source.includes("Assigned By Mustakim")) {
    return "bg-[var(--surface-purple)] text-[var(--purple)] border border-[var(--surface-purple)]";
  } else if (source.includes("Assigned By Maaz")) {
    return "bg-[var(--surface-warning)] text-[var(--warning)] border border-[var(--surface-warning)]";
  } else if (source.includes("Assigned By Caller")) {
    return "bg-[var(--surface-warning)] text-[var(--warning)] border border-[var(--surface-warning)]";
  } else if (source === "Walking") {
    return "bg-[var(--surface-success)] text-[var(--success)] border border-[var(--surface-success)]";
  } else if (source === "Website" || source.includes("website")) {
    return "bg-[var(--surface-error)] text-[var(--error)] border border-[var(--surface-error)]";
  } else if (source === "Referral" || source.includes("referral")) {
    return "bg-[var(--surface-purple)] text-[var(--purple)] border border-[var(--surface-purple)]";
  } else {
    return "bg-[var(--surface-neutral)] text-[var(--sidebar-text-main)] border border-[var(--sidebar-border-color)]";
  }
};

/**
 * Badge Component
 * Displays a colored badge for status or source information
 * 
 * @example
 * ```tsx
 * <Badge variant="status" status="veryhot">Very Hot</Badge>
 * <Badge variant="source" source="Assigned By Maaz">Assigned By Maaz</Badge>
 * ```
 */
export const Badge = React.memo(function Badge({
  children,
  variant = "status",
  status,
  source,
  className = "",
  title,
  "aria-label": ariaLabel,
}: BadgeProps) {
  // Determine colors based on variant
  let colorClasses = "";
  if (variant === "status" && status) {
    colorClasses = getStatusColors(status);
  } else if (variant === "source" && source) {
    colorClasses = getSourceColors(source);
  } else {
    colorClasses = "bg-[var(--surface-neutral)] text-[var(--sidebar-text-main)] border border-[var(--sidebar-border-color)]";
  }

  // Base classes for status (rounded-full) vs source (rounded)
  const baseClasses =
    variant === "status"
      ? "px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      : "px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-xs font-medium whitespace-nowrap";

  return (
    <span
      className={`${baseClasses} ${colorClasses} ${className}`}
      title={title}
      aria-label={ariaLabel || title || (typeof children === "string" ? children : undefined)}
      role="status"
    >
      {children}
    </span>
  );
});

/**
 * Status Badge Component Props
 */
interface StatusBadgeProps {
  /** Status type to display */
  status: StatusType;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status Badge Component
 * Convenience wrapper for displaying lead status badges
 * 
 * @example
 * ```tsx
 * <StatusBadge status="veryhot" />
 * ```
 */
export const StatusBadge = React.memo(function StatusBadge({
  status,
  className,
}: StatusBadgeProps) {
  const getStatusLabel = (status: StatusType) => {
    switch (status) {
      case "veryhot":
        return "Very Hot";
      case "hot":
        return "Hot";
      case "warm":
        return "Warm";
      case "cold":
        return "Cold";
      case "rejected":
        return "Rejected";
      default:
        return status;
    }
  };

  const label = getStatusLabel(status);

  return (
    <Badge
      variant="status"
      status={status}
      className={className}
      title={label}
      aria-label={`Status: ${label}`}
    >
      {label}
    </Badge>
  );
});

/**
 * Source Badge Component Props
 */
interface SourceBadgeProps {
  /** Source name to display */
  source: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Source Badge Component
 * Convenience wrapper for displaying lead source badges
 * Automatically normalizes source names
 * 
 * @example
 * ```tsx
 * <SourceBadge source="Assigned By Maaz" />
 * ```
 */
export const SourceBadge = React.memo(function SourceBadge({
  source,
  className,
}: SourceBadgeProps) {
  // Normalize source name
  const normalizeSource = (source: string): string => {
    const sourceMap: Record<string, string> = {
      "magicbricks.com": "Magicbricks.com",
      "magicbricks": "Magicbricks.com",
      "housing.com": "Housing.com",
      "housing": "Housing.com",
      "booking.com": "Booking.com",
      "booking": "Booking.com",
      "nobroker.com": "Nobroker.com",
      "nobroker": "Nobroker.com",
      "99acres.com": "99acres.com",
      "99acres": "99acres.com",
      "assign by maaz": "Assigned By Maaz",
      "assigned by maaz": "Assigned By Maaz",
      "walking": "Walking",
      "website": "Website",
      "referral": "Referral",
    };
    const normalized = sourceMap[source.toLowerCase()] || source;
    if (!normalized.includes("By") && !normalized.includes("Walking") && !normalized.includes(".com")) {
      return normalized
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }
    return normalized;
  };

  const normalizedSource = normalizeSource(source);

  return (
    <Badge
      variant="source"
      source={normalizedSource}
      className={className}
      title={normalizedSource}
      aria-label={`Source: ${normalizedSource}`}
    >
      {normalizedSource}
    </Badge>
  );
});

