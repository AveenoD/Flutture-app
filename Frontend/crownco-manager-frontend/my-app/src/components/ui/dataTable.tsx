 "use client";

 import React, { useMemo, useState } from "react";
 import { TableSkeleton } from "@/components/ui/loadingSkeleton";
 import { EmptyState } from "@/components/ui/emptyState";
 import {
   FileText,
   Columns,
   Search,
   Download,
   RefreshCw,
   Trash2,
   ChevronLeft,
   ChevronRight,
 } from "lucide-react";

 export interface Column<T> {
   id: string;
   /** Header label for table column */
   header: React.ReactNode;
   /** Optional custom renderer for this cell */
   render?: (row: T, index: number) => React.ReactNode;
   /** Optional class name for this column */
   className?: string;
 }

export interface DataTableProps<T> {
  title?: string;
  /** Optional action button/content to display on the right side of the title */
  titleAction?: React.ReactNode;
  /** Array of row objects */
  data: T[];
  /** Column configuration */
  columns: Column<T>[];
  /** Loading state – shows skeleton */
  isLoading?: boolean;
  /** Optional text for search placeholder */
  searchPlaceholder?: string;
  /** Optional label for empty state */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Get a unique id for each row – by default uses index */
  getRowId?: (row: T, index: number) => string | number;
  /** Custom filter function for search; default: JSON string match */
  filterFn?: (row: T, query: string) => boolean;
  /** Optional custom header content (replaces default title + toolbar) */
  header?: React.ReactNode;
  /** Extra classes for outer container */
  containerClassName?: string;
}

function defaultFilterFn<T>(row: T, query: string) {
  return JSON.stringify(row).toLowerCase().includes(query.toLowerCase());
}

function ensureReactNode(value: unknown): React.ReactNode {
  if (value == null) return null;
  if (typeof value === 'object' && !('$$typeof' in value) && Object.keys(value).length === 0) {
    return null;
  }
  return value as React.ReactNode;
}

 export default function DataTable<T>({
   title = "Table",
   titleAction,
   data,
   columns,
   isLoading = false,
   searchPlaceholder = "Search",
   emptyTitle = "No data",
   emptyDescription = "There is no data to display yet.",
   getRowId,
   filterFn = defaultFilterFn,
   header,
   containerClassName = "",
 }: DataTableProps<T>) {
   const [selectedRows, setSelectedRows] = useState<Set<string | number>>(
     new Set()
   );
   const [searchQuery, setSearchQuery] = useState("");
   const [currentPage, setCurrentPage] = useState(1);
   const [rowsPerPage, setRowsPerPage] = useState(10);

   const filteredData = useMemo(() => {
     if (!searchQuery.trim()) return data;
     return data.filter((row) => filterFn(row, searchQuery));
   }, [data, filterFn, searchQuery]);

   const totalPages = Math.max(
     1,
     Math.ceil(filteredData.length / rowsPerPage) || 1
   );
   const startIndex = (currentPage - 1) * rowsPerPage;
   const endIndex = startIndex + rowsPerPage;
   const paginatedRows = filteredData.slice(startIndex, endIndex);

   const resolveRowId = (row: T, index: number) =>
     getRowId ? getRowId(row, index) : index;

   const handleSelectAll = (checked: boolean) => {
     if (checked) {
       const allIds = paginatedRows.map((row, idx) =>
         resolveRowId(row, startIndex + idx)
       );
       setSelectedRows(new Set(allIds));
     } else {
       setSelectedRows(new Set());
     }
   };

   const handleSelectRow = (row: T, index: number) => {
     const id = resolveRowId(row, index);
     const next = new Set(selectedRows);
     if (next.has(id)) {
       next.delete(id);
     } else {
       next.add(id);
     }
     setSelectedRows(next);
   };

   const allVisibleSelected =
     paginatedRows.length > 0 &&
     paginatedRows.every((row, idx) =>
       selectedRows.has(resolveRowId(row, startIndex + idx))
     );

   return (
     <div
       className={`bg-white border border-[var(--border-color)] rounded-xl p-3 sm:p-5 shadow-sm mb-6 ${containerClassName}`}
     >
       {header !== undefined && header !== null ? (
         header as React.ReactElement
       ) : (
         <>
           <div className="flex items-center justify-between mb-3 sm:mb-4">
             <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-dark)]">
               {title}
             </h2>
             {titleAction && (
               <div className="flex-shrink-0">
                 {titleAction}
               </div>
             )}
           </div>

           {/* Control Bar */}
           <div className="flex flex-col gap-3 mb-4">
             {/* Search Bar */}
             <div className="relative w-full">
               <Search
                 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)]"
                 size={18}
               />
               <input
                 type="text"
                 placeholder={searchPlaceholder}
                 value={searchQuery}
                 onChange={(e) => {
                   setSearchQuery(e.target.value);
                   setCurrentPage(1);
                 }}
                 className="w-full pl-10 pr-12 py-2.5 sm:py-2 border border-[var(--border-color)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-1"
               />
               <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-[var(--text-tertiary)] bg-[var(--surface-neutral)] px-1.5 py-0.5 rounded hidden sm:block">
                 % F
               </span>
             </div>

             {/* Action Buttons */}
             <div className="flex flex-wrap gap-2 items-center justify-between">
               <div className="flex flex-wrap gap-2">
                 <button
                   className="px-3 sm:px-4 py-2 border border-[var(--border-color)] rounded-md text-sm font-medium text-[var(--text-dark)] bg-white hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                   aria-label="Column visibility"
                 >
                   <Columns size={18} className="sm:w-4 sm:h-4" />
                   <span className="hidden sm:inline">Column</span>
                 </button>
                 <button
                   className="px-3 sm:px-4 py-2 border border-[var(--border-color)] rounded-md text-sm font-medium text-[var(--text-dark)] bg-white hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                   aria-label="Export"
                 >
                   <Download size={18} className="sm:w-4 sm:h-4" />
                   <span className="hidden sm:inline">Export</span>
                 </button>
               </div>
               <div className="flex gap-2">
                 <button
                   className="px-3 sm:px-4 py-2 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                   aria-label="Refresh"
                 >
                   <RefreshCw size={18} className="sm:w-4 sm:h-4" />
                   <span className="hidden sm:inline">Refresh</span>
                 </button>
                 <button
                   className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                   aria-label="Delete"
                   disabled={selectedRows.size === 0}
                 >
                   <Trash2 size={18} className="sm:w-4 sm:h-4" />
                   <span className="hidden sm:inline">Delete</span>
                 </button>
               </div>
             </div>
           </div>
         </>
       )}

       {isLoading ? (
         <TableSkeleton rows={4} cols={columns.length + 1} />
       ) : filteredData.length === 0 ? (
         <EmptyState
           icon={FileText}
           title={emptyTitle}
           description={emptyDescription}
         />
       ) : (
         <>
           {/* Table View */}
           <div className="overflow-x-auto -mx-4 sm:mx-0">
             <div className="inline-block min-w-full align-middle">
               <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                 <table
                   className="w-full border-collapse"
                   role="table"
                   aria-label={title}
                 >
                   <thead>
                     <tr>
                       <th className="text-left p-3 border-b border-[var(--border-color)] bg-[var(--surface-neutral)] w-10">
                         <input
                           type="checkbox"
                           checked={allVisibleSelected}
                           onChange={(e) => handleSelectAll(e.target.checked)}
                           className="w-4 h-4 text-[var(--primary-base)] border-[var(--border-color)] rounded focus:ring-[var(--primary-base)]"
                           aria-label="Select all rows"
                         />
                       </th>
                       {columns.map((col) => (
                         <th
                           key={col.id}
                           className={`text-left p-3 border-b border-[var(--border-color)] text-xs uppercase text-[var(--text-secondary)] font-semibold bg-[var(--surface-neutral)] cursor-pointer hover:bg-[var(--hover-bg)] transition-colors ${
                             col.className ?? ""
                           }`}
                           scope="col"
                         >
                           <div className="flex items-center gap-1">
                             {col.header}
                           </div>
                         </th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {paginatedRows.map((row, idx) => {
                       const globalIndex = startIndex + idx;
                       const id = resolveRowId(row, globalIndex);
                       const isSelected = selectedRows.has(id);

                       return (
                         <tr
                           key={id}
                           className="hover:bg-[var(--hover-bg)] transition-colors"
                           role="row"
                         >
                           <td className="p-3 border-b border-[var(--border-color)]">
                             <input
                               type="checkbox"
                               checked={isSelected}
                               onChange={() => handleSelectRow(row, globalIndex)}
                               className="w-4 h-4 text-[var(--primary-base)] border-[var(--border-color)] rounded focus:ring-[var(--primary-base)]"
                               aria-label="Select row"
                             />
                           </td>
                          {columns.map((col) => {
                            const cellContent: React.ReactNode = col.render
                              ? ensureReactNode(col.render(row, globalIndex) as unknown)
                              : ((row as Record<string, unknown>)[col.id] ?? "") as React.ReactNode;
                            return (
                              <td
                                key={col.id}
                                className={`p-3 border-b border-[var(--border-color)] text-sm text-[var(--text-dark)] ${
                                  col.className ?? ""
                                }`}
                              >
                                {cellContent}
                              </td>
                            );
                          })}
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>

           {/* Pagination */}
           <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 pt-4 border-t border-[var(--border-color)]">
             <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
               <span className="text-xs sm:text-sm text-[var(--text-secondary)] whitespace-nowrap">
                 Row Per Page
               </span>
               <select
                 value={rowsPerPage}
                 onChange={(e) => {
                   setRowsPerPage(Number(e.target.value));
                   setCurrentPage(1);
                 }}
                 className="px-2.5 sm:px-3 py-2 border border-[var(--border-color)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-1 touch-manipulation"
               >
                 <option value={10}>10</option>
                 <option value={25}>25</option>
                 <option value={50}>50</option>
                 <option value={100}>100</option>
               </select>
             </div>
             <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
               <span className="text-xs sm:text-sm text-[var(--text-secondary)] whitespace-nowrap">
                 {startIndex + 1} - {Math.min(endIndex, filteredData.length)} of{" "}
                 {filteredData.length}
               </span>
               <div className="flex gap-1">
                 <button
                   onClick={() =>
                     setCurrentPage((prev) => Math.max(1, prev - 1))
                   }
                   disabled={currentPage === 1}
                   className="p-2 sm:p-1.5 border border-[var(--border-color)] rounded-md hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                   aria-label="Previous page"
                 >
                   <ChevronLeft size={18} className="sm:w-4 sm:h-4" />
                 </button>
                 <button
                   onClick={() =>
                     setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                   }
                   disabled={currentPage === totalPages}
                   className="p-2 sm:p-1.5 border border-[var(--border-color)] rounded-md hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                   aria-label="Next page"
                 >
                   <ChevronRight size={18} className="sm:w-4 sm:h-4" />
                 </button>
               </div>
             </div>
           </div>
         </>
       )}
     </div>
   );
 }


