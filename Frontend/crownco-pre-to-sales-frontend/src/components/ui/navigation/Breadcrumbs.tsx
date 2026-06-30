"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, House } from "lucide-react";

type Crumb = {
  label: string;
  href?: string;
  isCurrent?: boolean;
};

type BreadcrumbsProps = {
  items: Crumb[];
  className?: string;
};

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const router = useRouter();

  const handleClick = (item: Crumb) => {
    if (!item.href || item.isCurrent) return;
    router.push(item.href);
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-xs sm:text-sm text-slate-500 ${className}`}
    >
      {/* Home / Dashboard */}
      <button
        type="button"
        onClick={() => router.push("/caller/dashboard")}
        className="inline-flex items-center gap-1 text-[var(--primary-base)] hover:text-[var(--primary-hover)]"
      >
        <House className="w-4 h-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <button
            type="button"
            disabled={item.isCurrent || !item.href}
            onClick={() => handleClick(item)}
            className={`inline-flex items-center gap-1 ${
              item.isCurrent
                ? "font-semibold text-slate-900 cursor-default"
                : "text-slate-500 hover:text-[var(--primary-base)]"
            }`}
          >
            <span className="truncate">{item.label}</span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

