"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

type ActionLinkItem = {
  id: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  description?: string;
  badge?: string | number;
  color?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
};

type ActionLinksProps = {
  items: ActionLinkItem[];
  layout?: "grid" | "horizontal" | "vertical" | "list";
  variant?: "default" | "bar" | "compact" | "minimal";
  title?: string;
  showSelectedCount?: number;
  className?: string;
};

export function ActionLinks({
  items,
  layout = "grid",
  variant = "default",
  title,
  showSelectedCount,
  className = "",
}: ActionLinksProps) {
  const router = useRouter();

  const handleClick = (item: ActionLinkItem) => {
    if (item.disabled) return;
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  const layoutClasses = {
    grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4",
    horizontal: "flex flex-wrap gap-3 sm:gap-4",
    vertical: "flex flex-col gap-3 sm:gap-4",
    list: "space-y-2 sm:space-y-3",
  };

  // Bar variant - for bulk actions bar
  if (variant === "bar") {
    return (
      <section
        className={`sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {showSelectedCount !== undefined && showSelectedCount > 0 && (
              <div className="text-sm sm:text-base font-semibold text-slate-900">
                {showSelectedCount} selected
              </div>
            )}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleClick(item)}
                  disabled={item.disabled}
                  className={`
                    flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg
                    text-xs sm:text-sm font-medium transition-all duration-200
                    ${
                      item.variant === "danger"
                        ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        : item.variant === "outline"
                        ? "bg-white text-slate-700 hover:bg-slate-50 border border-slate-300"
                        : "bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)]"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // List variant
  if (layout === "list") {
    return (
      <section className={className}>
        {title && (
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-4 sm:mb-5">
            {title}
          </h2>
        )}
        <div className="space-y-2 sm:space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              disabled={item.disabled}
              className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/80 hover:bg-white border border-slate-200 hover:border-[var(--primary-base)] hover:shadow-md transition-all duration-200 group text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div
                className="flex-shrink-0 p-2 sm:p-2.5 rounded-lg"
                style={{
                  backgroundColor: item.color ? `${item.color}15` : "var(--primary-base)15",
                  color: item.color || "var(--primary-base)",
                }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                    {item.label}
                  </h3>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold text-white bg-[var(--primary-base)] rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-[var(--primary-base)] group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </section>
    );
  }

  // Compact/Minimal variant - smaller, cleaner design
  if (variant === "compact" || variant === "minimal") {
    const compactLayoutClasses = {
      grid: "grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3",
      horizontal: "flex flex-wrap gap-2.5 sm:gap-3",
      vertical: "flex flex-col gap-2.5 sm:gap-3",
      list: "space-y-2",
    };

    return (
      <section className={className}>
        {title && (
          <h2 className="text-sm sm:text-base font-semibold text-slate-700 mb-3 sm:mb-4">
            {title}
          </h2>
        )}
        <div className={compactLayoutClasses[layout]}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              disabled={item.disabled}
              className={`
                group relative p-3 sm:p-3.5 rounded-xl bg-white
                shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]
                hover:-translate-y-0.5 transition-all duration-200
                text-left w-full border border-slate-100 hover:border-slate-200
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]
              `}
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div
                  className="flex-shrink-0 p-1.5 sm:p-2 rounded-lg group-hover:scale-105 transition-transform duration-200"
                  style={{
                    backgroundColor: item.color ? `${item.color}10` : "var(--primary-base)10",
                    color: item.color || "var(--primary-base)",
                  }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {item.label}
                    </h3>
                    {item.badge && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium text-white bg-[var(--primary-base)] rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && variant === "compact" && (
                    <p className="text-[10px] sm:text-xs text-slate-500 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // Default variant (grid/horizontal/vertical)
  return (
    <section className={className}>
      {title && (
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 mb-4 sm:mb-5">
          {title}
        </h2>
      )}
      <div className={layoutClasses[layout]}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            disabled={item.disabled}
            className={`
              group relative p-4 sm:p-5 lg:p-6 rounded-2xl bg-white/80 backdrop-blur-sm
              shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]
              hover:-translate-y-0.5 transition-all duration-300
              text-left w-full border border-slate-100
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              <div
                className="flex-shrink-0 p-2 sm:p-2.5 rounded-xl group-hover:scale-110 transition-transform"
                style={{
                  backgroundColor: item.color ? `${item.color}15` : "var(--primary-base)15",
                  color: item.color || "var(--primary-base)",
                }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                    {item.label}
                  </h3>
                  {item.badge && (
                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold text-white bg-[var(--primary-base)] rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

