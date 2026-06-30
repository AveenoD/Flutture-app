"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

/**
 * Loading Spinner Component
 * Displays a loading indicator with optional text
 */
export function LoadingSpinner({
  size = "md",
  className = "",
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-[var(--primary-base)]`}
        aria-hidden="true"
      />
      {text && (
        <p className="text-sm text-slate-600 font-medium" aria-live="polite">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Loading Skeleton Component
 * Displays placeholder content while loading
 */
export function LoadingSkeleton({
  className = "",
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 rounded"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

