"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";

type DatePreset = "today" | "thisWeek" | "thisMonth" | "lastWeek" | "lastMonth" | "custom";

type DateRange = {
  start: Date | null;
  end: Date | null;
};

type DateRangePickerProps = {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  presets?: DatePreset[];
  variant?: "dropdown" | "inline";
  className?: string;
};

const PRESETS: Record<DatePreset, { label: string; getRange: () => DateRange }> = {
  today: {
    label: "Today",
    getRange: () => {
      const today = new Date();
      return { start: today, end: today };
    },
  },
  thisWeek: {
    label: "This Week",
    getRange: () => ({
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    }),
  },
  thisMonth: {
    label: "This Month",
    getRange: () => ({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    }),
  },
  lastWeek: {
    label: "Last Week",
    getRange: () => {
      const lastWeek = subWeeks(new Date(), 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    },
  },
  lastMonth: {
    label: "Last Month",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      };
    },
  },
  custom: {
    label: "Custom Range",
    getRange: () => ({ start: null, end: null }),
  },
};

export function DateRangePicker({
  value,
  onChange,
  presets = ["today", "thisWeek", "thisMonth", "custom"],
  variant = "dropdown",
  className = "",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(() => presets[0] ?? "today");
  const [dropdownPosition, setDropdownPosition] = useState<{ right?: string; left?: string; bottom?: string; top?: string; transform?: string }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position to stay within viewport
  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current) {
      const updatePosition = () => {
        if (!buttonRef.current || !dropdownRef.current) return;
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth < 640; // sm breakpoint
        const padding = 16; // Safe padding from viewport edges
        
        const position: { right?: string; left?: string; bottom?: string; top?: string; transform?: string } = {};

        if (isMobile) {
          // On mobile: center the popup in the middle of the screen
          position.left = "50%";
          position.top = "50%";
          position.transform = "translate(-50%, -50%)";
          position.right = "auto";
        } else {
          // On desktop: position relative to button
          const buttonRect = buttonRef.current.getBoundingClientRect();
          const dropdownRect = dropdownRef.current.getBoundingClientRect();
          
          // Check horizontal position
          const spaceOnRight = viewportWidth - buttonRect.right;
          const spaceOnLeft = buttonRect.left;
          
          if (spaceOnRight < dropdownRect.width && spaceOnLeft > spaceOnRight) {
            // Not enough space on right, align to right edge of button
            position.right = "0";
          } else {
            // Default: align to left edge of button
            position.left = "0";
          }

          // Check vertical position - if not enough space below, show above
          const spaceBelow = viewportHeight - buttonRect.bottom;
          const spaceAbove = buttonRect.top;
          
          if (spaceBelow < dropdownRect.height + padding && spaceAbove > spaceBelow) {
            position.bottom = "calc(100% + 8px)";
          }
        }

        setDropdownPosition(position);
      };

      // Initial position calculation
      updatePosition();

      // Update on window resize
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }
  }, [isOpen]);

  const handlePresetClick = (preset: DatePreset) => {
    if (preset === "custom") {
      setSelectedPreset("custom");
      setIsOpen(true);
      return;
    }
    const range = PRESETS[preset].getRange();
    setSelectedPreset(preset);
    onChange(range);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!value?.start || !value?.end) return "Select Date Range";
    if (value.start.getTime() === value.end.getTime()) {
      return format(value.start, "MMM d, yyyy");
    }
    return `${format(value.start, "MMM d")} - ${format(value.end, "MMM d, yyyy")}`;
  };

  if (variant === "inline") {
    if (presets.length === 0) return null;
    return (
      <div className={`flex flex-col sm:flex-row gap-3 sm:gap-2 ${className}`}>
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={`
              px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl
              transition-all duration-200
              ${
                selectedPreset === preset
                  ? "bg-[var(--primary-base)] text-white shadow-md"
                  : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
              }
            `}
          >
            {PRESETS[preset].label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white/80 backdrop-blur-sm border-0 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300"
      >
        <Calendar className="w-4 h-4" />
        <span className="hidden sm:inline">{formatDateRange()}</span>
        <span className="sm:hidden">Date</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          {/* Mobile overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div 
            ref={dropdownRef}
            className="fixed sm:absolute w-[calc(100vw-2rem)] sm:w-64 md:w-72 max-w-sm bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden"
            style={{
              ...dropdownPosition,
              ...(dropdownPosition.bottom && !dropdownPosition.transform
                ? { top: "auto", marginTop: 0, marginBottom: "8px" } 
                : !dropdownPosition.transform
                ? { top: "100%", marginTop: "8px" }
                : {}
              ),
            }}
          >
            <div className="p-3 sm:p-4">
              {presets.filter((p) => p !== "custom").length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 sm:mb-4">
                  {presets.filter((p) => p !== "custom").map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetClick(preset)}
                      className={`
                        px-3 py-2 text-xs sm:text-sm font-medium rounded-lg
                        transition-all duration-200 text-left
                        ${
                          selectedPreset === preset
                            ? "bg-[var(--primary-base)] text-white"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }
                      `}
                    >
                      {PRESETS[preset].label}
                    </button>
                  ))}
                </div>
              )}
              {presets.includes("custom") && (
                <div className="pt-3 border-t border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Custom Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      value={value?.start ? format(value.start, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const start = e.target.value ? new Date(e.target.value) : null;
                        onChange({ start, end: value?.end || null });
                      }}
                    />
                    <input
                      type="date"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
                      value={value?.end ? format(value.end, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const end = e.target.value ? new Date(e.target.value) : null;
                        onChange({ start: value?.start || null, end });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

