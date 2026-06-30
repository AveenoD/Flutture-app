"use client";

import React, { useState, useMemo } from "react";
import { FileText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

type SortConfig<T> = {
  key: keyof T;
  direction: "asc" | "desc";
} | null;

type DataTableProps<T> = {
  data: T[];
  renderRow: (item: T, index: number, isSelected?: boolean, onSelectChange?: (checked: boolean) => void) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  cardGridClassName?: string;
  // Selection
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (selected: T[]) => void;
  getItemId?: (item: T) => string | number;
  // Sorting
  sortable?: boolean;
  sortConfig?: SortConfig<T>;
  onSort?: (config: SortConfig<T>) => void;
  // Pagination
  pagination?: boolean;
  itemsPerPage?: number;
  // View mode
  viewMode?: "card" | "table";
};

export function DataTable<T>({
  data,
  renderRow,
  emptyMessage = "No data available",
  loading = false,
  className = "",
  cardGridClassName,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  getItemId = (item: T) => (item as any).id || JSON.stringify(item),
  sortable = false,
  sortConfig: controlledSortConfig,
  onSort,
  pagination = false,
  itemsPerPage = 10,
  viewMode = "card",
}: DataTableProps<T>) {
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig<T>>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [internalSelectedItems, setInternalSelectedItems] = useState<T[]>([]);

  // Use controlled or internal state for sorting
  const sortConfig = controlledSortConfig !== undefined ? controlledSortConfig : internalSortConfig;
  const setSortConfig = onSort || setInternalSortConfig;

  // Use controlled or internal state for selection
  const selected = onSelectionChange ? selectedItems : internalSelectedItems;
  const setSelected = onSelectionChange || setInternalSelectedItems;

  // Handle sorting
  const handleSort = (key: keyof T) => {
    if (!sortable) return;

    const newDirection =
      sortConfig?.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction: newDirection });
  };

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig || !sortable) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const comparison = aValue > bValue ? 1 : -1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig, sortable]);

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected([...sortedData]);
    } else {
      setSelected([]);
    }
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    const itemId = getItemId(item);
    if (checked) {
      setSelected([...selected, item]);
    } else {
      setSelected(selected.filter((i) => getItemId(i) !== itemId));
    }
  };

  const isItemSelected = (item: T) => {
    const itemId = getItemId(item);
    return selected.some((i) => getItemId(i) === itemId);
  };

  const isAllSelected = sortedData.length > 0 && selected.length === sortedData.length;
  const isIndeterminate = selected.length > 0 && selected.length < sortedData.length;

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage, pagination]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  // Display data (paginated or not)
  const displayData = pagination ? paginatedData : sortedData;

  if (loading) {
    return (
      <div className={`space-y-3 sm:space-y-3.5 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 sm:h-24 bg-slate-100/50 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={`
          flex flex-col items-center justify-center py-12 sm:py-16 
          text-center ${className}
        `}
      >
        <div className="text-slate-400 mb-2">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" />
        </div>
        <p className="text-sm sm:text-base text-slate-600 font-medium">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Selection checkbox for table view */}
      {selectable && viewMode === "table" && (
        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) input.indeterminate = isIndeterminate;
            }}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[var(--primary-base)] focus:ring-[var(--primary-base)]"
          />
          <span className="text-sm text-slate-600">
            {selected.length > 0 ? `${selected.length} selected` : "Select all"}
          </span>
        </div>
      )}

      {/* Data rows */}
      <div
        className={`${
          viewMode === "table"
            ? "space-y-0"
            : cardGridClassName ?? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        }`}
      >
        {displayData.map((item, index) => {
          const isSelected = selectable ? isItemSelected(item) : false;
          return (
            <div key={getItemId(item)} style={{ animationDelay: `${index * 50}ms` }} className={viewMode === "card" ? "h-full" : ""}>
              {renderRow(item, index, isSelected, selectable ? (checked: boolean) => handleSelectItem(item, checked) : undefined)}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <div className="text-sm text-slate-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-[var(--primary-base)] text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

