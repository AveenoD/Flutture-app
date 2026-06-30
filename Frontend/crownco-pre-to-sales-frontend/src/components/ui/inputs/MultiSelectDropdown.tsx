"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";

type MultiSelectOption = {
  value: string;
  label: string;
  count?: number;
};

type MultiSelectDropdownProps = {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  maxDisplay?: number;
};

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  label,
  className = "",
  maxDisplay = 2,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length <= maxDisplay
      ? selected
          .map((v) => options.find((o) => o.value === v)?.label || v)
          .join(", ")
      : `${selected.length} selected`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="
            w-full flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3
            text-sm sm:text-base text-left
            border border-slate-300 rounded-xl bg-white
            hover:border-[var(--primary-base)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]
            transition-all duration-200
          "
        >
          <span className={`truncate ${selected.length === 0 ? "text-slate-400" : "text-slate-900"}`}>
            {displayText}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>
        {selected.length > 0 && (
          <button
            onClick={handleClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors z-10"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="
              absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200
              max-h-60 overflow-y-auto
            "
          >
            {options.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">No options available</div>
            ) : (
              <div className="p-2">
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleToggle(option.value)}
                      className={`
                        w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg
                        text-sm text-left transition-colors
                        ${isSelected ? "bg-[var(--primary-selected)]" : "hover:bg-slate-50"}
                      `}
                    >
                      <span className="flex-1">{option.label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {option.count !== undefined && (
                          <span className="text-xs text-slate-500">({option.count})</span>
                        )}
                        {isSelected && (
                          <Check className="w-4 h-4 text-[var(--primary-base)]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

