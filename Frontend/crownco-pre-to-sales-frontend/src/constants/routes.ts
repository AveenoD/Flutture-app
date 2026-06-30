/**
 * Centralized Route Definitions
 * All application routes are defined here for consistency and easy maintenance
 */

export const ROUTES = {
  // Root
  ROOT: "/",
  
  // Dashboard
  DASHBOARD: "/caller/dashboard",
  
  // Lead List
  LEAD_LIST: "/caller/lead-list",
  
  // Lead Detail Stages
  LEAD_DETAIL: {
    BASE: "/caller/lead-list/lead-detail",
    QUALIFICATION: "/caller/lead-list/lead-detail/qualification/overview",
    COMMUNICATION: "/caller/lead-list/lead-detail/communication/overview",
    SITE_VISIT: "/caller/lead-list/lead-detail/site-visit/overview",
    NEGOTIATION: "/caller/lead-list/lead-detail/negotiation/overview",
    BOOKING: "/caller/lead-list/lead-detail/booking/overview",
  },
  
  // Lead List Sub-routes (Future)
  LEAD_LIST_CHAT: "/caller/lead-list/chat-now",
  LEAD_LIST_REJECTED_FORM: "/caller/lead-list/rejected-form",
  
  // Project Inventory
  PROJECT_INVENTORY: "/caller/project-inventory",
  PROJECT_INVENTORY_DETAIL: "/caller/project-inventory/project-inventory-detail",
  
  // Quotation
  QUOTATION: "/quotation",
  QUOTATION_DETAIL: "/quotation/quotation-detail",
  
  // Settings & Profile (Future)
  SETTINGS: "/settings",
  PROFILE: "/profile",
  HR_MODULE: "/hr-module",
  PROJECT_DETAIL: "/project-detail",
} as const;

/**
 * Helper function to get lead detail route by stage
 */
export function getLeadDetailRoute(stage: string): string {
  const stageMap: Record<string, string> = {
    qualification: ROUTES.LEAD_DETAIL.QUALIFICATION,
    communication: ROUTES.LEAD_DETAIL.COMMUNICATION,
    "site-visit": ROUTES.LEAD_DETAIL.SITE_VISIT,
    negotiation: ROUTES.LEAD_DETAIL.NEGOTIATION,
    booking: ROUTES.LEAD_DETAIL.BOOKING,
  };
  
  return stageMap[stage] || ROUTES.LEAD_DETAIL.QUALIFICATION;
}

/**
 * Check if a route is a lead detail route
 */
export function isLeadDetailRoute(pathname: string): boolean {
  return pathname?.startsWith(ROUTES.LEAD_DETAIL.BASE) || false;
}

/**
 * Get current stage from pathname
 */
export function getCurrentStageFromPath(pathname: string): string | null {
  if (pathname?.includes("/qualification/overview")) return "qualification";
  if (pathname?.includes("/communication/overview")) return "communication";
  if (pathname?.includes("/site-visit/overview")) return "site-visit";
  if (pathname?.includes("/negotiation/overview")) return "negotiation";
  if (pathname?.includes("/booking/overview")) return "booking";
  return null;
}

