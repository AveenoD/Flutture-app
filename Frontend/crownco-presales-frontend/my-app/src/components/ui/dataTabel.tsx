"use client";

import { useState, ReactNode, useRef, useEffect, useMemo } from "react";
import { MagnifyingGlass, Columns, Download, Trash, ArrowsDownUp, Clock, Phone } from "phosphor-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

// Helper component for indeterminate checkbox
function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={checkboxRef}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-[#EAECF0] text-[var(--primary-base)] focus:ring-[var(--primary-base)] cursor-pointer"
    />
  );
}

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface TableAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
  showLabel?: boolean; // Show label on mobile or always
  disabled?: boolean; // Disable the action button
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onColumnClick?: () => void;
  actions?: TableAction[];
  selectable?: boolean;
  selectedRows?: string[] | number[];
  onSelectRow?: (rowId: string | number) => void;
  onSelectAll?: () => void;
  getRowId: (row: T) => string | number;
  emptyMessage?: string;
  emptyState?: ReactNode;
  // Pagination
  pagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  // Custom render for actions column
  renderActions?: (row: T, index: number) => ReactNode;
  // Row click handler
  onRowClick?: (row: T, index: number) => void;
  // Mobile view customization
  mobileViewTitle?: string;
  showMobileView?: boolean;
  // Custom mobile card renderer
  renderMobileCard?: (row: T, index: number) => ReactNode;
  // Data accessors for mobile view (optional, for backward compatibility)
  getMobileAvatar?: (row: T) => string;
  getMobileName?: (row: T) => string;
  getMobileTime?: (row: T) => string;
  getMobileStatus?: (row: T) => { color: string; bgColor: string; text: string } | null;
  onMobileCall?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  onColumnClick,
  actions = [],
  selectable = true,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  getRowId,
  emptyMessage = "No data found",
  emptyState,
  pagination = true,
  currentPage = 1,
  totalPages = 1,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50],
  renderActions,
  onRowClick,
  mobileViewTitle,
  showMobileView = true,
  renderMobileCard,
  getMobileAvatar,
  getMobileName,
  getMobileTime,
  getMobileStatus,
  onMobileCall,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [localItemsPerPage, setLocalItemsPerPage] = useState(itemsPerPage);

  useEffect(() => {
    setLocalItemsPerPage(itemsPerPage);
  }, [itemsPerPage]);

  const allSelected = data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  const handleItemsPerPageChange = (value: number) => {
    setLocalItemsPerPage(value);
    onItemsPerPageChange?.(value);
  };

  const handleSelectAll = () => {
    onSelectAll?.();
  };

  const handleSelectRow = (row: T) => {
    onSelectRow?.(getRowId(row));
  };

  const isRowSelected = (row: T) => {
    const rowId = getRowId(row);
    return (selectedRows as (string | number)[]).includes(rowId);
  };

  const startIndex = totalItems ? (currentPage - 1) * localItemsPerPage + 1 : 1;
  const endIndex = totalItems
    ? Math.min(currentPage * localItemsPerPage, totalItems)
    : data.length;
  const displayTotal = totalItems ?? data.length;

  // Helper function to format date label
  const formatDateLabel = (dateStr: string): string => {
    if (!dateStr) return "";
    
    // Handle format like "24/Aug/2025"
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parts[0];
      const monthStr = parts[1];
      const year = parts[2];
      
      // Check if it's today
      const today = new Date();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = monthNames.indexOf(monthStr);
      
      if (
        monthIndex !== -1 &&
        parseInt(day) === today.getDate() &&
        monthIndex === today.getMonth() &&
        parseInt(year) === today.getFullYear()
      ) {
        return "Today";
      }
      
      // Return formatted date (DD/MM/YYYY)
      const month = (monthIndex + 1).toString().padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
    
    // Fallback: try parsing as standard date
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const today = new Date();
        if (
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
        ) {
          return "Today";
        }
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      // If parsing fails, return the original string
      return dateStr;
    }
    
    return dateStr;
  };

  // Group data by date for mobile view (only if date field exists)
  const groupedData = useMemo(() => {
    // Check if any row has a date field
    const hasDateField = data.length > 0 && (data[0] as any).date !== undefined;
    
    if (!hasDateField) {
      // Return a single group with all data if no date field
      return { "": data };
    }
    
    const groups: Record<string, T[]> = {};
    data.forEach((row) => {
      const dateKey = (row as any).date || "";
      const label = formatDateLabel(dateKey);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(row);
    });
    
    // Sort groups: "Today" first, then by date (newest first)
    const sortedGroups: Record<string, T[]> = {};
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Today") return -1;
      if (b === "Today") return 1;
      if (a === "" || b === "") return 0;
      // Parse dates for comparison (DD/MM/YYYY format)
      const parseDate = (dateStr: string) => {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(0);
      };
      return parseDate(b).getTime() - parseDate(a).getTime();
    });
    
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  }, [data]);

  // Get status config for a row
  const getStatusConfig = (row: T) => {
    if (getMobileStatus) {
      return getMobileStatus(row);
    }
    const status = (row as any).status;
    const statusConfig: Record<string, { color: string; bgColor: string; text: string }> = {
      pending: { color: "#F6AD55", bgColor: "#FEF3E2", text: "Pending" },
      completed: { color: "#38B2AC", bgColor: "#E6FFFA", text: "Completed" },
      missed: { color: "#DC2626", bgColor: "#FEE2E2", text: "Missed" },
    };
    return statusConfig[status as string] || statusConfig.pending;
  };

  // Get avatar from row
  const getAvatar = (row: T): string => {
    if (getMobileAvatar) {
      return getMobileAvatar(row);
    }
    return (row as any).avatar || "";
  };

  // Get full name from row
  const getFullName = (row: T): string => {
    if (getMobileName) {
      return getMobileName(row);
    }
    // Try to get name from columns
    const nameColumn = columns.find(col => col.key === "name" || col.key === "fullName");
    if (nameColumn && nameColumn.render) {
      // If it's a render function, try to extract from row data
      return (row as any).name || (row as any).fullName || "";
    }
    return (row as any).fullName || (row as any).name || (row[columns[0]?.key] as string) || "N/A";
  };

  // Get time from row
  const getTime = (row: T): string => {
    if (getMobileTime) {
      return getMobileTime(row);
    }
    return (row as any).time || "";
  };

  return (
    <>
      {/* Mobile & Tablet View - Card List (when table would scroll) */}
      {showMobileView && (
        <div className="xl:hidden bg-white">
          {/* Mobile Header with Title */}
          {mobileViewTitle && (
            <div className="px-4 pt-4 pb-3">
              <h2 className="text-xl font-bold text-[#2D3748] mb-2">{mobileViewTitle}</h2>
              <div className="h-px border-t border-dashed border-[var(--primary-base)] opacity-40"></div>
            </div>
          )}

          {/* Mobile Content */}
          {data.length === 0 ? (
            <div className="px-4 py-8" role="status" aria-live="polite">
              {emptyState || (
                <div className="text-center text-sm text-[#667085]">
                  {emptyMessage}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 pb-4">
              {renderMobileCard ? (
                // Custom mobile card renderer
                data.map((row, index) => (
                  <div key={getRowId(row)}>
                    {renderMobileCard(row, index)}
                  </div>
                ))
              ) : (
                // Default mobile view with grouping
                Object.entries(groupedData).map(([dateLabel, rows]) => (
                  <div key={dateLabel} className="mb-6">
                    {dateLabel && dateLabel !== "" && (
                      <h3 className="text-sm font-semibold text-[#2D3748] mb-3">{dateLabel}</h3>
                    )}
                    <div className="space-y-3">
                      {rows.map((row, index) => {
                        const statusConfig = getStatusConfig(row);
                        const avatar = getAvatar(row);
                        const fullName = getFullName(row);
                        const time = getTime(row);
                        const rowId = getRowId(row);
                        const displayName = fullName || "N/A";

                        return (
                          <div
                            key={rowId}
                            className={`flex items-center gap-3 ${onRowClick ? 'cursor-pointer hover:bg-slate-50 transition-colors rounded-lg p-2 focus-within:ring-2 focus-within:ring-[var(--primary-base)] focus-within:ring-offset-2' : ''}`}
                            onClick={() => onRowClick?.(row, index)}
                            onKeyDown={(e) => {
                              if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                onRowClick(row, index);
                              }
                            }}
                            tabIndex={onRowClick ? 0 : undefined}
                            role={onRowClick ? "button" : undefined}
                            aria-label={onRowClick ? `View details for ${displayName}` : undefined}
                          >
                            {/* Avatar */}
                            {avatar ? (
                              <div className="relative w-12 h-12 flex-shrink-0">
                                <Image
                                  src={avatar}
                                  alt={displayName}
                                  fill
                                  className="rounded-full object-cover"
                                  sizes="48px"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 flex-shrink-0 rounded-full bg-[#E2E8F0] flex items-center justify-center">
                                <span className="text-sm font-medium text-[#64748B]">
                                  {displayName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="mb-1">
                                <span className="text-sm font-semibold text-[#2D3748]">
                                  {displayName}
                                </span>
                              </div>
                              {time && (
                                <div className="flex items-center gap-1.5">
                                  <Clock size={12} weight="regular" className="text-[#667085] flex-shrink-0" />
                                  <span className="text-xs text-[#667085]">{time}</span>
                                </div>
                              )}
                            </div>

                            {/* Status Badge and Phone Icon */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {statusConfig && (
                                <div
                                  className="px-2.5 py-1 rounded-full flex items-center gap-1.5"
                                  style={{ backgroundColor: statusConfig.bgColor }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: statusConfig.color }}
                                  ></span>
                                  <span
                                    className="text-xs font-medium"
                                    style={{ color: statusConfig.color }}
                                  >
                                    {statusConfig.text}
                                  </span>
                                </div>
                              )}
                              
                              {/* Phone Icon */}
                              {(onMobileCall || (row as any).phone) && (
                                <button
                                  className="p-1.5 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
                                  aria-label={`Call ${displayName}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onMobileCall?.(row);
                                  }}
                                >
                                  <Phone
                                    size={20}
                                    weight="regular"
                                    className={statusConfig && statusConfig.color === "#DC2626" ? "text-[#DC2626]" : "text-[var(--primary-base)]"}
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Large Desktop Table View (only when enough space, no scroll needed) */}
      <div className="hidden xl:block bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
        {/* Table Actions */}
        <div className="p-4 border-b border-[#EAECF0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {onColumnClick && (
              <button
                onClick={onColumnClick}
                className="flex items-center gap-2 px-4 py-2 border border-[#EAECF0] rounded-md bg-white text-sm text-[#344054] hover:bg-[#F9FAFB] transition-colors"
              >
                <Columns size={16} weight="regular" />
                <span className="hidden sm:inline">Column</span>
              </button>
            )}
            {onSearchChange && (
              <div className="relative hidden md:block flex-1 sm:flex-initial sm:w-[300px]">
                <MagnifyingGlass
                  size={18}
                  weight="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-[#EAECF0] rounded-md bg-[#F8F9FC] text-sm text-[#344054] focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:bg-white transition-colors"
                />
              </div>
            )}
          </div>
          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  aria-label={action.label}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    action.disabled
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  } ${
                    action.variant === "danger"
                      ? "bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA]"
                      : action.variant === "primary"
                      ? "border border-[#EAECF0] bg-white text-[var(--primary-base)] hover:bg-[#F9FAFB]"
                      : "border border-[#EAECF0] bg-white text-[#344054] hover:bg-[#F9FAFB]"
                  }`}
                >
                  {action.icon}
                  <span className={action.showLabel === false ? "hidden sm:inline" : ""}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Desktop Table — horizontal scroll so wide API-leads tables still show Action column */}
        <div className="w-full overflow-x-auto">
        <table className="w-full table-auto min-w-[720px]">
          <thead>
            <tr className="bg-[#FBFBFE]">
              {selectable && (
                <th className="px-4 md:px-5 py-3.5 text-left w-12">
                  <SelectAllCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#667085] ${column.className || ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    {typeof column.header === "string" ? column.header : column.header}
                    {column.sortable !== false && (
                      <ArrowsDownUp size={14} weight="regular" className="text-[#667085] opacity-60" />
                    )}
                  </div>
                </th>
              ))}
              {renderActions && (
                <th className="px-4 md:px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-[#667085] min-w-[160px] max-w-[220px] sticky right-0 z-20 bg-[#FBFBFE] shadow-[-10px_0_14px_-8px_rgba(15,23,42,0.12)]">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (renderActions ? 1 : 0)}
                  className="px-5 py-8"
                  role="status"
                  aria-live="polite"
                >
                  {emptyState || (
                    <div className="text-center text-sm text-[#667085]">
                      {emptyMessage}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={getRowId(row)}
                  className={`group border-b border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors ${onRowClick ? 'cursor-pointer focus-within:bg-[#F9FAFB]' : ''}`}
                  onClick={() => onRowClick?.(row, index)}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onRowClick(row, index);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : "row"}
                  aria-label={onRowClick ? `View row ${index + 1}` : undefined}
                >
                  {selectable && (
                    <td className="px-4 md:px-5 py-4 w-12">
                      <input
                        type="checkbox"
                        checked={isRowSelected(row)}
                        onChange={() => handleSelectRow(row)}
                        className="w-4 h-4 rounded border-[#EAECF0] text-[var(--primary-base)] focus:ring-[var(--primary-base)] cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 md:px-5 py-4 ${column.className || ""}`}
                    >
                      {column.render ? column.render(row, index) : row[column.key]}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-4 md:px-5 py-4 min-w-[160px] max-w-[220px] sticky right-0 z-10 bg-white group-hover:bg-[#F9FAFB] shadow-[-10px_0_14px_-8px_rgba(15,23,42,0.08)]">
                      {renderActions(row, index)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="p-4 border-t border-[#EAECF0] flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-[#667085]">
            <div className="flex items-center gap-2">
              <span>Row Per Page:</span>
              <select
                value={localItemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="px-2 py-1 border border-[#EAECF0] rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] cursor-pointer"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {startIndex} - {endIndex} of {displayTotal}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1.5 border border-[#EAECF0] rounded bg-white hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 border border-[#EAECF0] rounded bg-white hover:bg-[#F9FAFB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

