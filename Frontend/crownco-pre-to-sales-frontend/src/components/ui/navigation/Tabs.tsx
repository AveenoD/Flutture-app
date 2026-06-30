"use client";

import React from "react";

export type TabItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  badge?: string | number;
};

type TabsVariant = "default" | "chips" | "toggle";

type TabsProps = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: TabsVariant;
  className?: string;
};

export function Tabs({ tabs, activeTab, onTabChange, variant = "default", className = "" }: TabsProps) {
  // Chips variant - for filter chips
  if (variant === "chips") {
    return (
      <div className={`flex flex-wrap gap-2 sm:gap-3 ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full
                text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${
                  isActive
                    ? "bg-[var(--primary-base)] text-white shadow-md"
                    : "bg-white text-slate-700 border border-slate-300 hover:border-[var(--primary-base)] hover:text-[var(--primary-base)]"
                }
              `}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`
                    px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0
                    ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-700"
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Toggle variant - for view toggle (Card/Table)
  if (variant === "toggle") {
    return (
      <div className={`flex gap-2 bg-slate-100/80 rounded-xl p-1 ${className}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg
                text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap
                flex-1
                ${
                  isActive
                    ? "bg-white text-[var(--primary-base)] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }
              `}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default variant - original tabs
  return (
    <div className={`flex flex-wrap gap-2 sm:gap-3 bg-slate-100/80 rounded-xl p-1.5 sm:p-2 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center justify-center sm:justify-start gap-2 sm:gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg 
              text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap
              flex-1 sm:flex-none min-w-0
              ${
                isActive
                  ? "bg-[var(--primary-base)] text-white shadow-md scale-[1.02]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60 active:scale-[0.98]"
              }
            `}
            aria-selected={isActive}
            role="tab"
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span className="truncate hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`
                  hidden sm:flex px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0 items-center justify-center
                  ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }
                `}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span
                className={`
                  px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0
                  ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 text-slate-700"
                  }
                `}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

