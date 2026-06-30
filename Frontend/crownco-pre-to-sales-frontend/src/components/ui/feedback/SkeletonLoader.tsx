"use client";

import React from "react";

type SkeletonType = "card" | "list" | "table" | "chart" | "kpi" | "text";

type SkeletonLoaderProps = {
  type?: SkeletonType;
  count?: number;
  className?: string;
  width?: string;
  height?: string;
};

export function SkeletonLoader({
  type = "card",
  count = 1,
  className = "",
  width,
  height,
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case "kpi":
        return (
          <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex justify-between items-center mb-3">
              <div className="w-12 h-12 rounded-xl bg-slate-200 animate-pulse" />
              <div className="w-16 h-6 rounded-lg bg-slate-200 animate-pulse" />
            </div>
            <div className="w-24 h-8 sm:h-10 bg-slate-200 rounded-lg animate-pulse mb-2" />
            <div className="w-32 h-4 bg-slate-200 rounded animate-pulse" />
          </div>
        );

      case "list":
        return (
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-slate-100">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-slate-200 rounded animate-pulse" />
              <div className="w-full h-3 bg-slate-200 rounded animate-pulse" />
              <div className="w-1/2 h-3 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
        );

      case "table":
        return (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-lg bg-slate-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="w-1/4 h-4 bg-slate-200 rounded animate-pulse" />
                  <div className="w-1/3 h-3 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="w-20 h-6 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        );

      case "chart":
        return (
          <div className="p-5 sm:p-6 lg:p-8 rounded-3xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="w-48 h-6 bg-slate-200 rounded-lg animate-pulse mb-6" />
            <div className="w-full h-64 sm:h-80 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        );

      case "text":
        return (
          <div className="space-y-2">
            <div className="w-full h-4 bg-slate-200 rounded animate-pulse" />
            <div className="w-5/6 h-4 bg-slate-200 rounded animate-pulse" />
            <div className="w-4/6 h-4 bg-slate-200 rounded animate-pulse" />
          </div>
        );

      default: // card
        return (
          <div className="p-4 sm:p-5 rounded-2xl bg-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="w-full h-32 sm:h-40 bg-slate-200 rounded-xl animate-pulse mb-4" />
            <div className="w-3/4 h-5 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="w-full h-4 bg-slate-200 rounded animate-pulse mb-1" />
            <div className="w-2/3 h-4 bg-slate-200 rounded animate-pulse" />
          </div>
        );
    }
  };

  if (count > 1) {
    return (
      <div className={className}>
        {[...Array(count)].map((_, index) => (
          <div key={index} style={{ animationDelay: `${index * 50}ms` }}>
            {renderSkeleton()}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className} style={{ width, height }}>
      {renderSkeleton()}
    </div>
  );
}

