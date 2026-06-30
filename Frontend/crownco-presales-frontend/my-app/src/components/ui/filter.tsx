"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlass, Funnel } from "phosphor-react";
import { SalesTableFilterModal } from "./model-pop-up/salesTabelFillter";

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
  status: string | string[]; // Support both single and multi-select
  sources: string;
  budget: string;
  project: string;
  stages?: string | string[]; // Add stages support
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
  itemLabel?: string; // e.g., "Lead", "Project"
  filterSummary?: string; // Optional filter summary text
  showSummary?: boolean; // Whether to show the summary section
}

const defaultConfig: FilterConfig = {
  dateRange: [
    { value: "", label: "Date Range" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
    { value: "year", label: "This Year" },
  ],
  status: [
    { value: "", label: "Status" },
    { value: "veryhot", label: "Very Hot" },
    { value: "hot", label: "Hot" },
    { value: "warm", label: "Warm" },
    { value: "cold", label: "Cold" },
  ],
  sources: [
    { value: "", label: "Sources" },
    { value: "magicbricks-com", label: "Magicbricks.com" },
    { value: "housing-com", label: "Housing.com" },
    { value: "booking-com", label: "Booking.com" },
    { value: "nobroker-com", label: "Nobroker.com" },
    { value: "99acres-com", label: "99acres.com" },
    { value: "assigned-by-caller", label: "Assigned By Caller" },
    { value: "assigned-by-anuj", label: "Assigned By Anuj" },
    { value: "assigned-by-mustakim", label: "Assigned By Mustakim" },
    { value: "walking", label: "Walking" },
    { value: "website", label: "Website" },
    { value: "referral", label: "Referral" },
  ],
  stages: [
    { value: "", label: "Stages" },
    { value: "property-visit", label: "Property Visit" },
    { value: "site-visit", label: "Site Visit" },
    { value: "follow-up", label: "Follow Up" },
  ],
  budget: [
    { value: "", label: "By Budget" },
    { value: "20L-30L", label: "₹20L - ₹30L" },
    { value: "30L-40L", label: "₹30L - ₹40L" },
    { value: "40L-50L", label: "₹40L - ₹50L" },
    { value: "50L-60L", label: "₹50L - ₹60L" },
    { value: "60L+", label: "₹60L+" },
  ],
  project: [
    { value: "", label: "By Project" },
    { value: "crown-height", label: "Crown Height" },
    { value: "urban-nest", label: "Urban Nest" },
    { value: "greenville-orchid", label: "GreenVille Orchid" },
    { value: "maaz-palace", label: "Maaz Palace" },
  ],
};

export function Filter({ 
  config = defaultConfig, 
  values, 
  onChange, 
  onClear,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search by name or property id",
  itemCount,
  itemLabel = "Project",
  filterSummary,
  showSummary = true
}: FilterProps) {
  const [filterValues, setFilterValues] = useState<FilterValues>({
    newLeads: values?.newLeads ?? true,
    dateRange: values?.dateRange ?? "",
    status: values?.status ?? "",
    sources: values?.sources ?? "",
    budget: values?.budget ?? "",
    project: values?.project ?? "",
    stages: values?.stages ?? "",
  });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Update local state when prop values change
  useEffect(() => {
    if (values) {
      setFilterValues((prev) => ({
        ...prev,
        ...values,
      }));
    }
  }, [values]);

  const handleChange = (key: keyof FilterValues, value: string | boolean | string[]) => {
    const newValues = {
      ...filterValues,
      [key]: value,
    };
    setFilterValues(newValues);
    onChange?.(newValues);
  };

  const handleApplyFilters = (newValues: FilterValues) => {
    setFilterValues(newValues);
    onChange?.(newValues);
  };

  const handleClearFilters = () => {
    const clearedValues: FilterValues = {
      newLeads: false,
      dateRange: "",
      status: "",
      sources: "",
      budget: "",
      project: "",
      stages: "",
    };
    setFilterValues(clearedValues);
    onChange?.(clearedValues);
    onClear?.();
  };

  const handleClear = () => {
    const clearedValues: FilterValues = {
      newLeads: false,
      dateRange: "",
      status: "",
      sources: "",
      budget: "",
      project: "",
      stages: "",
    };
    setFilterValues(clearedValues);
    onChange?.(clearedValues);
    onClear?.();
  };

  const hasActiveFilters = 
    filterValues.dateRange !== "" ||
    filterValues.status !== "" ||
    filterValues.sources !== "" ||
    filterValues.budget !== "" ||
    filterValues.project !== "" ||
    filterValues.newLeads;

  const activeFilterCount = [
    filterValues.dateRange,
    filterValues.status,
    filterValues.sources,
    filterValues.budget,
    filterValues.project,
  ].filter(Boolean).length + (filterValues.newLeads ? 1 : 0);

  return (
    <>
      {/* Mobile View - Search Bar with Filter Button */}
      <div className="md:hidden mb-5">
        <div className="flex items-center gap-2">
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
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center justify-center w-10 h-10 border border-[#EAECF0] rounded-md bg-white hover:bg-[#F9FAFB] transition-colors relative"
            aria-label="Open filters"
          >
            <Funnel size={18} weight="regular" className="text-[#344054]" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-[var(--primary-base)] text-white text-xs font-semibold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      <SalesTableFilterModal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        config={config}
        values={filterValues}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {/* Desktop View - Original Layout */}
      <div className="hidden md:flex flex-wrap items-center gap-3 md:gap-4 mb-5">
      {/* New Leads Checkbox */}
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

      {/* Date Range Select */}
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

      {/* Status Select */}
      {config.status && (
        <select
          value={filterValues.status}
          onChange={(e) => handleChange("status", e.target.value)}
          className="px-3 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer transition-colors hover:border-[#D0D5DD]"
        >
          {config.status.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Sources Select */}
      {config.sources && (
        <select
          value={filterValues.sources}
          onChange={(e) => handleChange("sources", e.target.value)}
          className="px-3 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer transition-colors hover:border-[#D0D5DD]"
        >
          {config.sources.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Budget Select */}
      {config.budget && (
        <select
          value={filterValues.budget}
          onChange={(e) => handleChange("budget", e.target.value)}
          className="px-3 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer transition-colors hover:border-[#D0D5DD]"
        >
          {config.budget.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Project Select */}
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

      {/* Stages Select */}
      {config.stages && (
        <select
          value={Array.isArray(filterValues.stages) ? filterValues.stages[0] || "" : filterValues.stages || ""}
          onChange={(e) => handleChange("stages", e.target.value)}
          className="px-3 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer transition-colors hover:border-[#D0D5DD]"
        >
          {config.stages.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Clear All Button */}
      <button
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

    {/* Filter Summary Section */}
    {showSummary && itemCount !== undefined && (
      <div className="bg-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg border border-[#EAECF0] mb-4 sm:mb-5 lg:mb-6 text-xs sm:text-sm text-[#667085]">
        Showing {itemCount} {itemLabel}{itemCount !== 1 ? "s" : ""}{" "}
        {filterSummary && filterSummary !== "No filters applied" && `| Filter: ${filterSummary}`}
      </div>
    )}
    </>
  );
}

