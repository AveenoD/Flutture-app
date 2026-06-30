"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";

type GenericListProps<T> = {
  title?: string;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  maxItems?: number;
  showViewMore?: boolean;
  emptyMessage?: string;
  className?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
};

export function GenericList<T>({
  title,
  items,
  renderItem,
  maxItems = 5,
  showViewMore = true,
  emptyMessage = "No items found",
  className = "",
  onViewAll,
  viewAllLabel,
}: GenericListProps<T>) {
  const [showAll, setShowAll] = useState(false);

  const displayItems = showAll || !showViewMore ? items : items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  if (items.length === 0) {
    return (
      <section className={`bg-gradient-to-br from-white via-white to-slate-50/30 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] ${className}`}>
        {title && (
          <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold mb-5 sm:mb-6 text-slate-900">{title}</h2>
        )}
        <div className="text-center py-8 text-slate-500 text-sm">{emptyMessage}</div>
      </section>
    );
  }

  return (
    <section className={`bg-gradient-to-br from-white via-white to-slate-50/30 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-slate-900">{title}</h2>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs sm:text-sm text-[var(--primary-base)] font-semibold hover:underline flex items-center gap-1.5 sm:gap-2 transition-colors group"
            >
              {viewAllLabel || "View All"}
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      )}
      
      <div className="space-y-3 sm:space-y-3.5">
        {displayItems.map((item, index) => (
          <div key={index} style={{ animationDelay: `${index * 50}ms` }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {hasMore && showViewMore && !onViewAll && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-4 sm:mt-5 text-center text-xs sm:text-sm font-semibold text-[var(--primary-base)] py-2.5 sm:py-3 rounded-xl bg-white/60 hover:bg-white/90 transition-colors shadow-sm hover:shadow-md"
        >
          {showAll ? "View Less" : `View More (${items.length - maxItems} more)`}
        </button>
      )}
    </section>
  );
}

