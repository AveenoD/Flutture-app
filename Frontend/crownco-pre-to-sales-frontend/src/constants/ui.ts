/**
 * UI Constants
 * Centralized UI-related constants for consistency across the application
 */

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Date Format Constants
 */
export const DATE_FORMATS = {
  DISPLAY: "dd MMM yyyy",
  DISPLAY_WITH_TIME: "dd MMM yyyy, hh:mm a",
  API: "yyyy-MM-dd",
  API_WITH_TIME: "yyyy-MM-dd HH:mm:ss",
  SHORT: "dd/MM/yyyy",
} as const;

/**
 * Debounce Delays (in milliseconds)
 */
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  INPUT: 500,
  RESIZE: 150,
} as const;

/**
 * Breakpoints (matching Tailwind)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
} as const;

/**
 * Animation Durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Toast Notification Durations (in milliseconds)
 */
export const TOAST_DURATIONS = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 4000,
  WARNING: 4000,
} as const;

/**
 * Lead Status Options
 */
export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  SITE_VISIT: "site-visit",
  NEGOTIATION: "negotiation",
  BOOKING: "booking",
  REJECTED: "rejected",
} as const;

/**
 * Lead Source Options
 */
export const LEAD_SOURCES = {
  WEBSITE: "Website",
  WALKING: "Walking",
  ASSIGNED: "Assigned by Manager",
  PORTALS: "Portals",
  REFERRAL: "Referral",
  OTHER: "Other",
} as const;

/**
 * Quotation Status Options
 */
export const QUOTATION_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

/**
 * Follow-up Status Options
 */
export const FOLLOW_UP_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  MISSED: "missed",
} as const;

/**
 * Priority Levels
 */
export const PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const;

/**
 * Table Configuration
 */
export const TABLE_CONFIG = {
  DEFAULT_ROWS_PER_PAGE: 10,
  MAX_ROWS_PER_PAGE: 100,
  MIN_ROWS_PER_PAGE: 5,
} as const;

/**
 * Export Configuration
 */
export const EXPORT_CONFIG = {
  CSV_DELIMITER: ",",
  CSV_ENCODING: "utf-8",
  MAX_EXPORT_ROWS: 10000,
} as const;

