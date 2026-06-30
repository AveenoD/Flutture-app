"use client";

import React from "react";
import { Bell } from "lucide-react";

type NotificationBadgeProps = {
  count: number;
  onClick?: () => void;
  maxCount?: number;
  className?: string;
  variant?: "default" | "dot" | "number";
};

export function NotificationBadge({
  count,
  onClick,
  maxCount = 99,
  className = "",
  variant = "default",
}: NotificationBadgeProps) {
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  if (variant === "dot") {
    return (
      <button
        onClick={onClick}
        className={`relative ${className}`}
        aria-label={`${count} notifications`}
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    );
  }

  if (variant === "number") {
    return (
      <button
        onClick={onClick}
        className={`
          relative px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold
          bg-[var(--primary-base)] text-white rounded-full
          hover:bg-[var(--primary-hover)] transition-colors
          ${className}
        `}
        aria-label={`${count} notifications`}
      >
        {displayCount}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`relative ${className}`}
      aria-label={`${count} notifications`}
    >
      <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
          {displayCount}
        </span>
      )}
    </button>
  );
}

