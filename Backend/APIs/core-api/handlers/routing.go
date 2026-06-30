package handlers

import (
	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"
	"crownco/core-api/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RoutingHandler handles routing rules CRUD
type RoutingHandler struct {
	routingService *services.RoutingRulesService
	teamService    *services.TeamService
}

// NewRoutingHandler creates a new RoutingHandler
func NewRoutingHandler(routingService *services.RoutingRulesService, teamService *services.TeamService) *RoutingHandler {
	return &RoutingHandler{
		routingService: routingService,
		teamService:    teamService,
	}
}

// getOrgID returns organization UUID for the current user
func (h *RoutingHandler) getOrgID(c *fiber.Ctx) (uuid.UUID, error) {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)
	return h.teamService.GetOrganizationIDFromUserID(c.Context(), userID, userRole)
}

// requireManageRouting returns error if user is manager without manage_routing permission
func (h *RoutingHandler) requireManageRouting(c *fiber.Ctx) error {
	userRole := c.Locals("user_role").(string)
	if userRole == "general-manager" || userRole == "general_manager" {
		return nil
	}
	if userRole == "manager" {
		userID := c.Locals("user_id").(string)
		ok, _ := h.teamService.CheckPermission(c.Context(), userID, userRole, "manage_routing")
		if !ok {
			return fiber.NewError(fiber.StatusForbidden, "manage_routing permission required")
		}
		return nil
	}
	return fiber.NewError(fiber.StatusForbidden, "Only GM or Manager with manage_routing can manage routing rules")
}

// ListRules returns routing rules for the organization
func (h *RoutingHandler) ListRules(c *fiber.Ctx) error {
	orgID, err := h.getOrgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}
	if err := h.requireManageRouting(c); err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, err.Error(), nil)
	}

	var status *string
	if s := c.Query("status"); s != "" {
		status = &s
	}
	rules, err := h.routingService.ListRules(c.Context(), orgID, status)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list rules", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Routing rules", rules)
}

// GetRule returns one routing rule by ID
func (h *RoutingHandler) GetRule(c *fiber.Ctx) error {
	orgID, err := h.getOrgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}
	if err := h.requireManageRouting(c); err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, err.Error(), nil)
	}

	ruleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid rule ID", nil)
	}
	rule, err := h.routingService.GetRule(c.Context(), ruleID, orgID)
	if err != nil {
		if err.Error() == "ROUTING_RULE_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Routing rule not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get rule", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Routing rule", rule)
}

// CreateRule creates a new routing rule
func (h *RoutingHandler) CreateRule(c *fiber.Ctx) error {
	orgID, err := h.getOrgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}
	if err := h.requireManageRouting(c); err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, err.Error(), nil)
	}

	var req models.CreateRoutingRuleRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}
	if errors := utils.ValidateStruct(req); len(errors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	rule, err := h.routingService.CreateRule(c.Context(), orgID, req)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create rule", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Routing rule created", rule)
}

// UpdateRule updates an existing routing rule
func (h *RoutingHandler) UpdateRule(c *fiber.Ctx) error {
	orgID, err := h.getOrgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}
	if err := h.requireManageRouting(c); err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, err.Error(), nil)
	}

	ruleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid rule ID", nil)
	}
	var req models.UpdateRoutingRuleRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}
	if errors := utils.ValidateStruct(req); len(errors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	rule, err := h.routingService.UpdateRule(c.Context(), ruleID, orgID, req)
	if err != nil {
		if err.Error() == "ROUTING_RULE_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Routing rule not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update rule", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Routing rule updated", rule)
}

// DeleteRule deletes a routing rule
func (h *RoutingHandler) DeleteRule(c *fiber.Ctx) error {
	orgID, err := h.getOrgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}
	if err := h.requireManageRouting(c); err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, err.Error(), nil)
	}

	ruleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid rule ID", nil)
	}
	err = h.routingService.DeleteRule(c.Context(), ruleID, orgID)
	if err != nil {
		if err.Error() == "ROUTING_RULE_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Routing rule not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete rule", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Routing rule deleted", nil)
}

// UpdateRuleStatus sets rule status to active or inactive
func (h *RoutingHandler) UpdateRuleStatus(c *fiber.Ctx) error {
	orgID, err := h.getOrgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}
	if err := h.requireManageRouting(c); err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, err.Error(), nil)
	}

	ruleID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid rule ID", nil)
	}
	var req models.UpdateRoutingRuleStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}
	if errors := utils.ValidateStruct(req); len(errors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	rule, err := h.routingService.UpdateRuleStatus(c.Context(), ruleID, orgID, req.RuleStatus)
	if err != nil {
		if err.Error() == "ROUTING_RULE_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Routing rule not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update status", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Rule status updated", rule)
}
