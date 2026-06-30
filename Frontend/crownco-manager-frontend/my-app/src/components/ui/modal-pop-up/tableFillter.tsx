"use client";

import { useState, useEffect, ReactNode } from "react";
import { X, Calendar, Globe, Buildings, ListBullets } from "phosphor-react";
import { FilterConfig, FilterValues, FilterOption } from "../fillter";

interface SalesTableFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FilterConfig;
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  onClear: () => void;
  title?: string;
  clearButtonText?: string;
  applyButtonText?: string;
}

export function SalesTableFilterModal({
  isOpen,
  onClose,
  config,
  values,
  onApply,
  onClear,
  title = "Filter",
  clearButtonText = "Clear Filter",
  applyButtonText = "Apply Filter",
}: SalesTableFilterModalProps) {
  const [tempFilterValues, setTempFilterValues] = useState<FilterValues>(values);

  // Update temp values when modal opens or values prop changes
  useEffect(() => {
    if (isOpen) {
      setTempFilterValues(values);
    }
  }, [isOpen, values]);

  const handleTempChange = (key: keyof FilterValues, value: string | boolean | string[]) => {
    setTempFilterValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggleMultiSelect = (
    key: "status" | "stages",
    optionValue: string
  ) => {
    const currentValue = tempFilterValues[key];
    const currentArray = Array.isArray(currentValue)
      ? currentValue
      : currentValue
      ? [currentValue]
      : [];

    const newArray = currentArray.includes(optionValue)
      ? currentArray.filter((s) => s !== optionValue)
      : [...currentArray, optionValue];

    handleTempChange(key, newArray.length === 1 ? newArray[0] : newArray);
  };

  const handleApply = () => {
    onApply(tempFilterValues);
    onClose();
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
    setTempFilterValues(clearedValues);
    onClear();
    onClose();
  };

  if (!isOpen) return null;

  const statusArray = Array.isArray(tempFilterValues.status)
    ? tempFilterValues.status
    : tempFilterValues.status
    ? [tempFilterValues.status]
    : [];

  const stagesArray = Array.isArray(tempFilterValues.stages)
    ? tempFilterValues.stages
    : tempFilterValues.stages
    ? [tempFilterValues.stages]
    : [];

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg max-h-[85vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#EAECF0] px-5 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-semibold text-[#344054]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F9FAFB] rounded-md transition-colors"
            aria-label="Close filters"
          >
            <X size={20} weight="regular" className="text-[#344054]" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 p-5">
            {/* New Leads Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#344054] cursor-pointer select-none">
                New Leads
              </label>
              <button
                type="button"
                onClick={() => handleTempChange("newLeads", !tempFilterValues.newLeads)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  tempFilterValues.newLeads ? "bg-[var(--primary-base)]" : "bg-[#D1D5DB]"
                }`}
                role="switch"
                aria-checked={tempFilterValues.newLeads}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    tempFilterValues.newLeads ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Date Range */}
            {config.dateRange && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#344054]">Date Range</label>
                <div className="relative">
                  <Calendar
                    size={18}
                    weight="regular"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                  />
                  <select
                    value={tempFilterValues.dateRange}
                    onChange={(e) => handleTempChange("dateRange", e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer appearance-none"
                  >
                    {config.dateRange.map((option: FilterOption) => (
                      <option key={option.value} value={option.value}>
                        {option.value ? option.label : "Select Date Range"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Status - Pill Buttons */}
            {config.status && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#344054]">Status</label>
                <div className="flex flex-wrap gap-2">
                  {config.status
                    .filter((opt: FilterOption) => opt.value !== "")
                    .map((option: FilterOption) => {
                      const isSelected = statusArray.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleToggleMultiSelect("status", option.value)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-[var(--primary-base)] text-white"
                              : "bg-[#F1F5F9] text-[#344054] hover:bg-[#E2E8F0]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Sources */}
            {config.sources && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#344054]">Sources</label>
                <div className="relative">
                  <Globe
                    size={18}
                    weight="regular"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                  />
                  <select
                    value={tempFilterValues.sources}
                    onChange={(e) => handleTempChange("sources", e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer appearance-none"
                  >
                    {config.sources.map((option: FilterOption) => (
                      <option key={option.value} value={option.value}>
                        {option.value ? option.label : "Sources"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* By Project */}
            {config.project && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#344054]">By Project</label>
                <div className="relative">
                  <Buildings
                    size={18}
                    weight="regular"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                  />
                  <select
                    value={tempFilterValues.project}
                    onChange={(e) => handleTempChange("project", e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer appearance-none"
                  >
                    {config.project.map((option: FilterOption) => (
                      <option key={option.value} value={option.value}>
                        {option.value ? option.label : "By Project"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Stages - Pill Buttons */}
            {config.stages && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#344054]">Stages</label>
                <div className="flex flex-wrap gap-2">
                  {config.stages.map((option: FilterOption) => {
                    const isSelected = stagesArray.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleToggleMultiSelect("stages", option.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-[var(--primary-base)] text-white"
                            : "bg-[#F1F5F9] text-[#344054] hover:bg-[#E2E8F0]"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Department */}
            {config.department && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#344054]">By Department</label>
                <div className="relative">
                  <Buildings
                    size={18}
                    weight="regular"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                  />
                  <select
                    value={tempFilterValues.department}
                    onChange={(e) => handleTempChange("department", e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer appearance-none"
                  >
                    {config.department.map((option: FilterOption) => (
                      <option key={option.value} value={option.value}>
                        {option.value ? option.label : "By Department"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* By Employee */}
            {config.employee && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#344054]">By Employee</label>
                <div className="relative">
                  <ListBullets
                    size={18}
                    weight="regular"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                  />
                  <select
                    value={tempFilterValues.employee}
                    onChange={(e) => handleTempChange("employee", e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer appearance-none"
                  >
                    {config.employee.map((option: FilterOption) => (
                      <option key={option.value} value={option.value}>
                        {option.value ? option.label : "By Employee"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* By Budget */}
            {config.budget && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#344054]">By Budget</label>
                <div className="relative">
                  <ListBullets
                    size={18}
                    weight="regular"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                  />
                  <select
                    value={tempFilterValues.budget}
                    onChange={(e) => handleTempChange("budget", e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer appearance-none"
                  >
                    {config.budget.map((option: FilterOption) => (
                      <option key={option.value} value={option.value}>
                        {option.value ? option.label : "By Budget"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-[#EAECF0] px-5 py-4 flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2.5 border border-[var(--primary-base)] rounded-md bg-white text-[var(--primary-base)] text-sm font-medium hover:bg-[#F9FAFB] transition-colors"
          >
            {clearButtonText}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            {applyButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

