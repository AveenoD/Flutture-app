"use client";

import { useState, useEffect } from "react";
import { Funnel } from "phosphor-react";
import { SalesTableFilterModal } from "./modal-pop-up/tableFillter";

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
  department?: FilterOption[];
  employee?: FilterOption[];
}

export interface FilterValues {
  newLeads: boolean;
  dateRange: string;
  status: string | string[]; // Support both single and multi-select
  sources: string;
  budget: string;
  project: string;
  stages?: string | string[]; // Add stages support
  department?: string;
  employee?: string;
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
    { value: "", label: "Lead Source" },
    { value: "assigned-by-caller", label: "Assigned By Caller" },
    { value: "assigned-by-anuj", label: "Assigned By Anuj" },
    { value: "assigned-by-mustakim", label: "Assigned By Mustakim" },
    { value: "walking", label: "Walking" },
    { value: "website", label: "Website" },
    { value: "referral", label: "Referral" },
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
    department: values?.department ?? "",
    employee: values?.employee ?? "",
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
      department: "",
      employee: "",
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
      department: "",
      employee: "",
    };
    setFilterValues(clearedValues);
    onChange?.(clearedValues);
    onClear?.();
  };

  // Generate filter summary text
  const generateFilterSummary = (): string => {
    const parts: string[] = [];
    
    if (filterValues.sources) {
      const sourceLabel = config.sources?.find(opt => opt.value === filterValues.sources)?.label || filterValues.sources;
      parts.push(`Sources = ${sourceLabel}`);
    }
    
    if (filterValues.employee) {
      const employeeLabel = config.employee?.find(opt => opt.value === filterValues.employee)?.label || filterValues.employee;
      parts.push(`By Employ : ${employeeLabel}`);
    }
    
    if (filterValues.dateRange) {
      const dateLabel = config.dateRange?.find(opt => opt.value === filterValues.dateRange)?.label || filterValues.dateRange;
      parts.push(`Date Range : ${dateLabel}`);
    }
    
    if (filterValues.project) {
      const projectLabel = config.project?.find(opt => opt.value === filterValues.project)?.label || filterValues.project;
      parts.push(`Project : ${projectLabel}`);
    }
    
    if (filterValues.department) {
      const deptLabel = config.department?.find(opt => opt.value === filterValues.department)?.label || filterValues.department;
      parts.push(`Department : ${deptLabel}`);
    }
    
    return parts.join(", ");
  };

  const hasActiveFilters = 
    filterValues.dateRange !== "" ||
    filterValues.status !== "" ||
    filterValues.sources !== "" ||
    filterValues.budget !== "" ||
    filterValues.project !== "" ||
    filterValues.department !== "" ||
    filterValues.employee !== "" ||
    filterValues.newLeads;

  const activeFilterCount = [
    filterValues.dateRange,
    filterValues.status,
    filterValues.sources,
    filterValues.budget,
    filterValues.project,
    filterValues.department,
    filterValues.employee,
  ].filter(Boolean).length + (filterValues.newLeads ? 1 : 0);

  return (
    <>
      {/* Mobile View - Add Filter Button */}
      <div className="md:hidden mb-5">
        <div className="flex items-center justify-between bg-white border border-[#EAECF0] rounded-md px-4 py-2.5">
          <span className="text-sm font-medium text-[#344054]">Add Fillter</span>
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center justify-center w-10 h-10 border border-[#EAECF0] rounded-md bg-[#F9FAFB] hover:bg-[#F2F4F7] transition-colors relative"
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

      {/* Department Select */}
      {config.department && (
        <select
          value={filterValues.department}
          onChange={(e) => handleChange("department", e.target.value)}
          className="px-3 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer transition-colors hover:border-[#D0D5DD]"
        >
          {config.department.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {/* Employee Select */}
      {config.employee && (
        <select
          value={filterValues.employee}
          onChange={(e) => handleChange("employee", e.target.value)}
          className="px-3 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer transition-colors hover:border-[#D0D5DD]"
        >
          {config.employee.map((option) => (
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
        {(() => {
          const summary = filterSummary || generateFilterSummary();
          return summary && summary !== "No filters applied" && `| Filter: ${summary}`;
        })()}
      </div>
    )}
    </>
  );
}

