 "use client";

 import React, { useState } from "react";
 import { TableSkeleton } from "@/components/ui/loadingSkeleton";
 import { EmptyState } from "@/components/ui/emptyState";
 import {
   FileText,
   Columns,
   Search,
   Download,
   RefreshCw,
   Trash2,
   ChevronsUpDown,
   ChevronLeft,
   ChevronRight,
   ChevronUp,
   ChevronDown,
 } from "lucide-react";

 interface BookingRow {
   fullName: string;
   phone: string;
   avatar?: string;
   bookingId: string;
   project: string;
   unit: string;
   amount: string;
   agent: string;
   status:
     | "confirmed"
     | "processing"
     | "on hold"
     | "cancelled"
     | "Inactive"
     | "Break"
     | "Meeting";
   // For card view
   projectName?: string;
   projectNameDetail?: string;
 }

 interface DashboardBookingsProps {
   isLoading?: boolean;
   bookings?: BookingRow[];
 }

 const defaultBookings: BookingRow[] = [
   {
     fullName: "Zishan Shaikh",
     phone: "(808) 555-0111",
     bookingId: "BK001",
     project: "Ocean View Residences",
     unit: "3BHK - Tower A, Floor 12",
     amount: "₹24,50,000",
     agent: "Mustakim Sayyed",
     status: "confirmed",
     projectName: "Ocean Veiw",
     projectNameDetail: "Ocean View Residences",
   },
   {
     fullName: "Maaz Khan",
     phone: "(808) 555-0111",
     bookingId: "BK002",
     project: "Downtown Plaza",
     unit: "2BHK - Tower B, Floor 8",
     amount: "₹18,50,000",
     agent: "Moin Shaikh",
     status: "processing",
     projectName: "Downtown Plaza",
     projectNameDetail: "Downtown Plaza Complex",
   },
   {
     fullName: "Mustakim Sayyed",
     phone: "(808) 555-0111",
     bookingId: "BK003",
     project: "Green City Homes",
     unit: "4BHK - Villa 15",
     amount: "₹32,00,000",
     agent: "Zishan Shaik",
     status: "on hold",
     projectName: "Green Villa",
     projectNameDetail: "Maria Heights",
   },
   {
     fullName: "Siddant Sir",
     phone: "(808) 555-0111",
     bookingId: "BK004",
     project: "Skyline Tower",
     unit: "3BHK - Tower C, Floor 18",
     amount: "₹21,00,000",
     agent: "Maaz Khan",
     status: "cancelled",
     projectName: "Skyline Tower",
     projectNameDetail: "Skyline Tower Complex",
   },
 ];

 const getStatusColor = (status: BookingRow["status"]) => {
   switch (status) {
     case "confirmed":
       return "bg-green-100 text-green-700";
     case "processing":
       return "bg-blue-100 text-blue-700";
     case "on hold":
       return "bg-orange-100 text-orange-700";
     case "cancelled":
       return "bg-red-100 text-red-700";
     case "Inactive":
       return "bg-yellow-100 text-yellow-700";
     case "Break":
       return "bg-blue-100 text-blue-700";
     case "Meeting":
       return "bg-yellow-100 text-yellow-700";
     default:
       return "bg-gray-100 text-gray-700";
   }
 };

 const getInitials = (name: string) => {
   return name
     .split(" ")
     .map((n) => n[0])
     .join("")
     .toUpperCase()
     .slice(0, 2);
 };

 export default function DashboardBookings({
   isLoading = false,
   bookings = defaultBookings,
 }: DashboardBookingsProps) {
   const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([0])); // First card expanded by default
   const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
   const [searchQuery, setSearchQuery] = useState("");
   const [currentPage, setCurrentPage] = useState(1);
   const [rowsPerPage, setRowsPerPage] = useState(10);

   const filteredBookings = bookings.filter(
     (booking) =>
       booking.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
       booking.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
       booking.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (booking.projectName &&
         booking.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
   );

   const toggleCard = (index: number) => {
     const newExpanded = new Set(expandedCards);
     if (newExpanded.has(index)) {
       newExpanded.delete(index);
     } else {
       newExpanded.add(index);
     }
     setExpandedCards(newExpanded);
   };

   const handleSelectAll = (checked: boolean) => {
     if (checked) {
       setSelectedRows(new Set(paginatedBookings.map((_, idx) => idx)));
     } else {
       setSelectedRows(new Set());
     }
   };

   const handleSelectRow = (index: number) => {
     const newSelected = new Set(selectedRows);
     if (newSelected.has(index)) {
       newSelected.delete(index);
     } else {
       newSelected.add(index);
     }
     setSelectedRows(newSelected);
   };

   const totalPages = Math.ceil(filteredBookings.length / rowsPerPage);
   const startIndex = (currentPage - 1) * rowsPerPage;
   const endIndex = startIndex + rowsPerPage;
   const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

   return (
     <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-3 sm:p-5 shadow-sm mb-6">
       <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[var(--text-dark)]">
         Current Bookings
       </h2>

       {/* Control Bar */}
       <div className="flex flex-col gap-3 mb-4">
         {/* Search Bar - Full width on mobile */}
         <div className="relative w-full">
           <Search
             className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)]"
             size={18}
           />
           <input
             type="text"
             placeholder="Search"
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

       {isLoading ? (
         <TableSkeleton rows={4} cols={7} />
       ) : filteredBookings.length === 0 ? (
         <EmptyState
           icon={FileText}
           title="No bookings"
           description="You don't have any current bookings at the moment."
         />
       ) : (
         <>
           {/* Card View - Shows where table would scroll */}
           <div className="block lg:hidden space-y-3">
             {paginatedBookings.map((row, idx) => {
               const isExpanded = expandedCards.has(idx);
               return (
                 <div
                   key={idx}
                   className="bg-white border border-[var(--border-color)] rounded-lg shadow-sm overflow-hidden transition-all"
                 >
                   {/* Header - Always Visible */}
                   <div
                     className="p-4 cursor-pointer hover:bg-[var(--hover-bg)] transition-colors"
                     onClick={() => toggleCard(idx)}
                   >
                     <div className="flex items-center justify-between">
                       <div className="flex-1 min-w-0">
                         <div className="text-base font-bold text-[var(--text-dark)] mb-1">
                           {row.fullName}
                         </div>
                         <div className="text-sm text-[var(--text-secondary)]">
                           {row.projectName || row.project}
                         </div>
                       </div>
                       <div className="flex items-center gap-2 ml-4">
                         <span
                           className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                             row.status
                           )} whitespace-nowrap`}
                         >
                           {row.status}
                         </span>
                         {isExpanded ? (
                           <ChevronUp
                             size={20}
                             className="text-[var(--text-secondary)] flex-shrink-0"
                           />
                         ) : (
                           <ChevronDown
                             size={20}
                             className="text-[var(--text-secondary)] flex-shrink-0"
                           />
                         )}
                       </div>
                     </div>
                   </div>

                   {/* Expandable Content */}
                   {isExpanded && (
                     <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-4 animate-fadeIn">
                       <div className="space-y-2.5 mb-4">
                         <div>
                           <span className="text-sm text-[var(--text-secondary)]">
                             Project Name :
                           </span>
                           <span className="text-sm font-medium text-[var(--text-dark)] ml-2">
                             {row.projectNameDetail || row.project}
                           </span>
                         </div>
                         <div>
                           <span className="text-sm text-[var(--text-secondary)]">
                             Amount :
                           </span>
                           <span className="text-sm font-medium text-[var(--text-dark)] ml-2">
                             {row.amount}
                           </span>
                         </div>
                         <div>
                           <span className="text-sm text-[var(--text-secondary)]">
                             Agent :
                           </span>
                           <span className="text-sm font-medium text-[var(--text-dark)] ml-2">
                             {row.agent}
                           </span>
                         </div>
                       </div>
                       <button
                         className="w-full px-4 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2 touch-manipulation"
                         aria-label={`View details for ${row.fullName}`}
                         onClick={(e) => e.stopPropagation()}
                       >
                         View Detail
                       </button>
                     </div>
                   )}
                 </div>
               );
             })}
           </div>

           {/* Desktop Table View - Only on large screens where table won't scroll */}
           <div className="hidden lg:block overflow-x-auto -mx-4 sm:mx-0">
             <div className="inline-block min-w-full align-middle">
               <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                 <table
                   className="w-full border-collapse"
                   role="table"
                   aria-label="Current bookings"
                 >
                   <thead>
                     <tr>
                       <th className="text-left p-3 border-b border-[var(--border-color)] bg-[var(--surface-neutral)]">
                         <input
                           type="checkbox"
                           checked={
                             paginatedBookings.length > 0 &&
                             paginatedBookings.every((_, idx) =>
                               selectedRows.has(idx)
                             )
                           }
                           onChange={(e) => handleSelectAll(e.target.checked)}
                           className="w-4 h-4 text-[var(--primary-base)] border-[var(--border-color)] rounded focus:ring-[var(--primary-base)]"
                           aria-label="Select all rows"
                         />
                       </th>
                       {[
                         "Full Name",
                         "Booking ID",
                         "Project & Unit",
                         "Amount",
                         "Agent",
                         "Status",
                         "Action",
                       ].map((header) => (
                         <th
                           key={header}
                           className="text-left p-3 border-b border-[var(--border-color)] text-xs uppercase text-[var(--text-secondary)] font-semibold bg-[var(--surface-neutral)] cursor-pointer hover:bg-[var(--hover-bg)] transition-colors"
                           scope="col"
                         >
                           <div className="flex items-center gap-1">
                             {header}
                             <ChevronsUpDown
                               size={14}
                               className="text-[var(--text-tertiary)]"
                             />
                           </div>
                         </th>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {paginatedBookings.map((row, idx) => (
                       <tr
                         key={idx}
                         className="hover:bg-[var(--hover-bg)] transition-colors"
                         role="row"
                       >
                         <td className="p-3 border-b border-[var(--border-color)]">
                           <input
                             type="checkbox"
                             checked={selectedRows.has(idx)}
                             onChange={() => handleSelectRow(idx)}
                             className="w-4 h-4 text-[var(--primary-base)] border-[var(--border-color)] rounded focus:ring-[var(--primary-base)]"
                             aria-label={`Select ${row.fullName}`}
                           />
                         </td>
                         <td className="p-3 border-b border-[var(--border-color)]">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center text-sm font-semibold">
                               {row.avatar ? (
                                 <img
                                   src={row.avatar}
                                   alt={row.fullName}
                                   className="w-full h-full rounded-full object-cover"
                                 />
                               ) : (
                                 getInitials(row.fullName)
                               )}
                             </div>
                             <div>
                               <div className="text-sm font-medium text-[var(--text-dark)]">
                                 {row.fullName}
                               </div>
                               <div className="text-xs text-[var(--text-secondary)]">
                                 {row.phone}
                               </div>
                             </div>
                           </div>
                         </td>
                         <td className="p-3 border-b border-[var(--border-color)] text-sm text-[var(--text-dark)] font-medium">
                           {row.bookingId}
                         </td>
                         <td className="p-3 border-b border-[var(--border-color)]">
                           <div className="text-sm text-[var(--text-dark)] font-medium">
                             {row.project}
                           </div>
                           <div className="text-xs text-[var(--text-secondary)]">
                             {row.unit}
                           </div>
                         </td>
                         <td className="p-3 border-b border-[var(--border-color)] text-sm text-[var(--text-dark)] font-medium">
                           {row.amount}
                         </td>
                         <td className="p-3 border-b border-[var(--border-color)] text-sm text-[var(--text-dark)]">
                           {row.agent}
                         </td>
                         <td className="p-3 border-b border-[var(--border-color)]">
                           <span
                             className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                               row.status
                             )}`}
                           >
                             {row.status}
                           </span>
                         </td>
                         <td className="p-3 border-b border-[var(--border-color)]">
                           <button
                             className="px-4 py-1.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
                             aria-label={`View details for ${row.fullName}`}
                           >
                             View Detail
                           </button>
                         </td>
                       </tr>
                     ))}
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
                 {startIndex + 1} -{" "}
                 {Math.min(endIndex, filteredBookings.length)} of{" "}
                 {filteredBookings.length}
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

