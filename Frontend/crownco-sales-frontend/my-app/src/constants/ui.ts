/**
 * UI Constants
 * Centralized UI configuration values
 */

export const UI_CONSTANTS = {
  // Spacing
  SPACING: {
    XS: "0.5rem",
    SM: "0.75rem",
    MD: "1rem",
    LG: "1.5rem",
    XL: "2rem",
    XXL: "3rem",
  },
  
  // Breakpoints (matching Tailwind)
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    "2XL": 1536,
  },
  
  // Animation durations
  ANIMATION: {
    FAST: 150,
    NORMAL: 200,
    SLOW: 300,
    VERY_SLOW: 500,
  },
  
  // Z-index layers
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_ITEMS_PER_PAGE: 10,
    ITEMS_PER_PAGE_OPTIONS: [10, 20, 50, 100],
  },
  
  // Debounce delays
  DEBOUNCE: {
    SEARCH: 300,
    INPUT: 500,
    RESIZE: 250,
  },
} as const;

