package handlers

import (
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// DashboardHandler handles dashboard and analytics HTTP requests.
type DashboardHandler struct {
	dashboard *services.DashboardService
	lead      *services.LeadService
}

// NewDashboardHandler creates a new DashboardHandler.
func NewDashboardHandler(dashboard *services.DashboardService, lead *services.LeadService) *DashboardHandler {
	return &DashboardHandler{dashboard: dashboard, lead: lead}
}

// GetDashboard returns role-based dashboard: stats, pipeline, upcoming follow-ups/visits; GM/Manager get recent deals and leaderboard.
func (h *DashboardHandler) GetDashboard(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}

	orgID, err := h.lead.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	// Optional pagination for upcoming follow-ups
	fupPage := c.QueryInt("fup_page", 1)
	fupLimit := c.QueryInt("fup_limit", 20)

	data, err := h.dashboard.GetDashboard(c.Context(), orgID, userID, userRole, fupPage, fupLimit)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get dashboard", map[string]string{"error": err.Error()})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Dashboard retrieved successfully", data)
}

// GetLeaderboard returns top performers (GM/Manager only).
func (h *DashboardHandler) GetLeaderboard(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can view leaderboard", "FORBIDDEN")
	}

	orgID, err := h.lead.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	list, err := h.dashboard.GetLeaderboard(c.Context(), orgID)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get leaderboard", map[string]string{"error": err.Error()})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Leaderboard retrieved successfully", fiber.Map{"leaderboard": list})
}
