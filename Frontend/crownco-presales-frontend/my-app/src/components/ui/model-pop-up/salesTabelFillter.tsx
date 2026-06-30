"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Globe, Buildings, List } from "phosphor-react";
import { FilterConfig, FilterValues } from "../filter";

interface SalesTableFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FilterConfig;
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  onClear: () => void;
}

export function SalesTableFilterModal({
  isOpen,
  onClose,
  config,
  values,
  onApply,
  onClear,
}: SalesTableFilterModalProps) {
  const [localValues, setLocalValues] = useState<FilterValues>(values);

  // Update local values when prop values change
  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(localValues);
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
    };
    setLocalValues(clearedValues);
    onClear();
  };

  const updateLocalValue = (key: keyof FilterValues, value: string | boolean | string[]) => {
    setLocalValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const statusOptions = config.status?.filter((opt) => opt.value !== "") || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal - Slides up from bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#EAECF0] px-4 sm:px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-lg font-semibold text-[#344054]">Filter</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F9FAFB] rounded-md transition-colors"
            aria-label="Close filters"
          >
            <X size={20} weight="regular" className="text-[#667085]" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 py-4 space-y-5">
          {/* New Leads Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[#344054]">New Leads</label>
            <button
              type="button"
              role="switch"
              aria-checked={localValues.newLeads}
              onClick={() => updateLocalValue("newLeads", !localValues.newLeads)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localValues.newLeads
                  ? "bg-[var(--primary-base)]"
                  : "bg-[#D0D5DD]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localValues.newLeads ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Date Range */}
          {config.dateRange && (
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-2">
                Date Range
              </label>
              <div className="relative">
                <Calendar
                  size={18}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                />
                <select
                  value={localValues.dateRange}
                  onChange={(e) => updateLocalValue("dateRange", e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] appearance-none"
                >
                  {config.dateRange.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === "" ? "Select Date Range" : option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Status - Pill Buttons */}
          {config.status && statusOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => {
                  const isSelected = localValues.status === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateLocalValue("status", isSelected ? "" : option.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-[var(--primary-base)] text-white"
                          : "bg-white text-[#344054] border border-[#EAECF0] hover:border-[var(--primary-base)]"
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
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-2">
                Sources
              </label>
              <div className="relative">
                <Globe
                  size={18}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                />
                <select
                  value={localValues.sources}
                  onChange={(e) => updateLocalValue("sources", e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] appearance-none"
                >
                  {config.sources.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === "" ? "Sources" : option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* By Project */}
          {config.project && (
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-2">
                By Project
              </label>
              <div className="relative">
                <Buildings
                  size={18}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                />
                <select
                  value={localValues.project}
                  onChange={(e) => updateLocalValue("project", e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] appearance-none"
                >
                  {config.project.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === "" ? "By Project" : option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* By Budget */}
          {config.budget && (
            <div>
              <label className="block text-sm font-medium text-[#344054] mb-2">
                By Budget
              </label>
              <div className="relative">
                <List
                  size={18}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                />
                <select
                  value={localValues.budget}
                  onChange={(e) => updateLocalValue("budget", e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] appearance-none"
                >
                  {config.budget.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === "" ? "By Budget" : option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-[#EAECF0] px-4 sm:px-6 py-4 flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 px-4 py-2.5 border border-[var(--primary-base)] rounded-md bg-white text-sm font-medium text-[var(--primary-base)] hover:bg-[#F9FAFB] transition-colors"
          >
            Clear Filter
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </div>

    </>
  );
}

