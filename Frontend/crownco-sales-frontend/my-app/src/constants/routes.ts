/**
 * Application route constants
 * Centralized route definitions to prevent typos and ensure consistency
 */
export const ROUTES = {
  DASHBOARD: "/sales/dashboard",
  LEAD_LIST: "/sales/lead-list",
  PROJECT_INVENTORY: "/sales/project-inventory",
  PROJECT_INVENTORY_DETAIL: "/sales/project-inventory/project-inventory-detail",
  
  // Lead Detail Routes
  LEAD_DETAIL: {
    BASE: "/sales/lead-list/lead-detail",
    CALLER_PREVIEW: {
      OVERVIEW: "/sales/lead-list/lead-detail/caller-preview/overview",
      FOLLOW_UP_DETAIL: "/sales/lead-list/lead-detail/caller-preview/overview/follow-up-detail",
    },
    SITE_VISIT: {
      OVERVIEW: "/sales/lead-list/lead-detail/site-visit/overview",
      FOLLOW_UP_DETAIL: "/sales/lead-list/lead-detail/site-visit/overview/follow-up-detail",
      SITE_VISIT_DETAIL: {
        BASE: "/sales/lead-list/lead-detail/site-visit/overview/site-visit-detail",
        FOLLOW_UP_DETAIL: "/sales/lead-list/lead-detail/site-visit/overview/site-visit-detail/follow-up-detail",
      },
    },
    NEGOTIATION: {
      OVERVIEW: "/sales/lead-list/lead-detail/negotiation/overview",
      FOLLOW_UP_DETAIL: "/sales/lead-list/lead-detail/negotiation/overview/follow-up-detail",
    },
    BOOKING: {
      OVERVIEW: "/sales/lead-list/lead-detail/booking/overview",
      FOLLOW_UP_DETAIL: "/sales/lead-list/lead-detail/booking/overview/follow-up-detail",
    },
  },
  
  CHAT_NOW: "/sales/lead-list/chat-now",
  REJECTED_FORM: "/sales/lead-list/rejected-form",
} as const;

/**
 * Helper function to get base path for lead detail routes
 */
export const getLeadDetailBasePath = (pathname: string | null): string => {
  if (!pathname) return ROUTES.LEAD_DETAIL.BASE;
  const match = pathname.match(/(\/sales\/lead-list\/lead-detail)/);
  return match ? match[1] : ROUTES.LEAD_DETAIL.BASE;
};

