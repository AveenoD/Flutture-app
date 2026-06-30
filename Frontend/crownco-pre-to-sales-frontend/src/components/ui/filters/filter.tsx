"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlass, Funnel } from "phosphor-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  dateRange?: FilterOption[];
  status?: FilterOption[];
  sources?: FilterOption[];
  budget?: FilterOption[];
  project?: FilterOption[];
  stages?: FilterOption[];
}

export interface FilterValues {
  newLeads: boolean;
  dateRange: string;
  status: string | string[];
  sources: string;
  budget: string;
  project: string;
  stages?: string | string[];
}

interface FilterProps {
  config?: FilterConfig;
  values?: Partial<FilterValues>;
  onChange?: (values: FilterValues) => void;
  onClear?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  itemCount?: number;
  itemLabel?: string;
  filterSummary?: string;
  showSummary?: boolean;
}

const defaultConfig: FilterConfig = {
  dateRange: [
    { value: "", label: "Date Range" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
    { value: "year", label: "This Year" },
  ],
  project: [
    { value: "", label: "By Project" },
    { value: "maaz palace", label: "Maaz Palace" },
    { value: "crown height", label: "Crown Height" },
    { value: "greenville orchid", label: "GreenVille Orchid" },
    { value: "urban nest", label: "Urban Nest" },
  ],
};

export function Filter({
  config = defaultConfig,
  values,
  onChange,
  onClear,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  itemCount,
  itemLabel = "Item",
  filterSummary,
  showSummary = true,
}: FilterProps) {
  const [filterValues, setFilterValues] = useState<FilterValues>({
    newLeads: values?.newLeads ?? false,
    dateRange: values?.dateRange ?? "",
    status: values?.status ?? "",
    sources: values?.sources ?? "",
    budget: values?.budget ?? "",
    project: values?.project ?? "",
    stages: values?.stages ?? "",
  });

  useEffect(() => {
    if (values) {
      setFilterValues((prev) => ({
        ...prev,
        ...values,
      }));
    }
  }, [values]);

  const handleChange = (
    key: keyof FilterValues,
    value: string | boolean | string[]
  ) => {
    const newValues = {
      ...filterValues,
      [key]: value,
    };
    setFilterValues(newValues);
    onChange?.(newValues);
  };

  const handleClear = () => {
    const cleared: FilterValues = {
      newLeads: false,
      dateRange: "",
      status: "",
      sources: "",
      budget: "",
      project: "",
      stages: "",
    };
    setFilterValues(cleared);
    onChange?.(cleared);
    onClear?.();
  };

  const hasActiveFilters =
    filterValues.dateRange !== "" ||
    filterValues.status !== "" ||
    filterValues.sources !== "" ||
    filterValues.budget !== "" ||
    filterValues.project !== "" ||
    filterValues.newLeads;

  return (
    <>
      {/* Search + mobile filter button */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            weight="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)]"
          />
        </div>
        <button
          type="button"
          className="flex items-center justify-center w-10 h-10 border border-[#EAECF0] rounded-md bg-white hover:bg-[#F9FAFB] transition-colors md:hidden"
          aria-label="Filters"
        >
          <Funnel size={18} weight="regular" className="text-[#344054]" />
        </button>
      </div>

      {/* Desktop filters */}
      <div className="hidden md:flex flex-wrap items-center gap-3 md:gap-4 mb-4">
        {/* New Leads */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="newLeads"
            checked={filterValues.newLeads}
            onChange={(e) => handleChange("newLeads", e.target.checked)}
            className="w-4 h-4 rounded border-[#EAECF0] text-[var(--primary-base)] focus:ring-[var(--primary-base)] cursor-pointer"
          />
          <label
            htmlFor="newLeads"
            className="text-sm font-semibold text-[#344054] cursor-pointer select-none"
          >
            New Leads
          </label>
        </div>

        {/* Date Range */}
        {config.dateRange && (
          <select
            value={filterValues.dateRange}
            onChange={(e) => handleChange("dateRange", e.target.value)}
            className="px-3 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer transition-colors hover:border-[#D0D5DD]"
          >
            {config.dateRange.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Project */}
        {config.project && (
          <select
            value={filterValues.project}
            onChange={(e) => handleChange("project", e.target.value)}
            className="px-3 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer transition-colors hover:border-[#D0D5DD]"
          >
            {config.project.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Clear all */}
        <button
          type="button"
          onClick={handleClear}
          className={`text-sm font-medium transition-colors ${
            hasActiveFilters
              ? "text-[var(--primary-base)] hover:underline cursor-pointer"
              : "text-[#98A2B3] cursor-not-allowed"
          }`}
          disabled={!hasActiveFilters}
        >
          Clear All
        </button>
      </div>

      {/* Summary */}
      {showSummary && itemCount !== undefined && (
        <div className="bg-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg border border-[#EAECF0] mb-4 sm:mb-5 lg:mb-6 text-xs sm:text-sm text-[#667085]">
          Showing {itemCount} {itemLabel}
          {itemCount !== 1 ? "s" : ""}{" "}
          {filterSummary && filterSummary !== "No filters applied"
            ? `| Filter: ${filterSummary}`
            : ""}
        </div>
      )}
    </>
  );
}


