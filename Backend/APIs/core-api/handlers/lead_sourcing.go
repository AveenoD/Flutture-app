package handlers

import (
	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// LeadSourcingHandler handles all lead-sourcing CRUD and sync endpoints.
type LeadSourcingHandler struct {
	service *services.LeadSourcingService
}

func NewLeadSourcingHandler(svc *services.LeadSourcingService) *LeadSourcingHandler {
	return &LeadSourcingHandler{service: svc}
}

// helper to extract org ID from JWT context.
func (h *LeadSourcingHandler) orgID(c *fiber.Ctx) (string, error) {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)
	return h.service.GetOrgIDForUser(c.Context(), userID, userRole)
}

// ============================================================
// Organization APIs (credentials)
// ============================================================

// POST /api/v1/organization-apis
func (h *LeadSourcingHandler) CreateOrgAPI(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	var req models.CreateOrgAPIRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	result, err := h.service.CreateOrgAPI(c.Context(), orgID, req)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create API credential", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "API credential created", result)
}

// GET /api/v1/organization-apis
func (h *LeadSourcingHandler) ListOrgAPIs(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	result, err := h.service.ListOrgAPIs(c.Context(), orgID)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list API credentials", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "API credentials retrieved", result)
}

// GET /api/v1/organization-apis/:id
func (h *LeadSourcingHandler) GetOrgAPI(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	result, err := h.service.GetOrgAPI(c.Context(), c.Params("id"), orgID)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusNotFound, "API credential not found", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "API credential retrieved", result)
}

// PUT /api/v1/organization-apis/:id
func (h *LeadSourcingHandler) UpdateOrgAPI(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	var req models.UpdateOrgAPIRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	result, err := h.service.UpdateOrgAPI(c.Context(), c.Params("id"), orgID, req)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update API credential", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "API credential updated", result)
}

// DELETE /api/v1/organization-apis/:id
func (h *LeadSourcingHandler) DeleteOrgAPI(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	if err := h.service.DeleteOrgAPI(c.Context(), c.Params("id"), orgID); err != nil {
		if err.Error() == "NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "API credential not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete API credential", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "API credential deleted", nil)
}

// ============================================================
// Lead Sourcing Configs
// ============================================================

// POST /api/v1/lead-sourcing-configs
func (h *LeadSourcingHandler) CreateSourcingConfig(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	var req models.CreateLeadSourcingConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	result, err := h.service.CreateSourcingConfig(c.Context(), orgID, req)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create sourcing config", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Sourcing config created", result)
}

// GET /api/v1/lead-sourcing-configs
func (h *LeadSourcingHandler) ListSourcingConfigs(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	result, err := h.service.ListSourcingConfigs(c.Context(), orgID)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list sourcing configs", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Sourcing configs retrieved", result)
}

// GET /api/v1/lead-sourcing-configs/:id
func (h *LeadSourcingHandler) GetSourcingConfig(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	result, err := h.service.GetSourcingConfig(c.Context(), c.Params("id"), orgID)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusNotFound, "Sourcing config not found", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Sourcing config retrieved", result)
}

// PUT /api/v1/lead-sourcing-configs/:id
func (h *LeadSourcingHandler) UpdateSourcingConfig(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	var req models.UpdateLeadSourcingConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	result, err := h.service.UpdateSourcingConfig(c.Context(), c.Params("id"), orgID, req)
	if err != nil {
		if err.Error() == "NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Sourcing config not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update sourcing config", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Sourcing config updated", result)
}

// DELETE /api/v1/lead-sourcing-configs/:id
func (h *LeadSourcingHandler) DeleteSourcingConfig(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	if err := h.service.DeleteSourcingConfig(c.Context(), c.Params("id"), orgID); err != nil {
		if err.Error() == "NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Sourcing config not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete sourcing config", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Sourcing config deleted", nil)
}

// POST /api/v1/lead-sourcing-configs/:id/sync-now
func (h *LeadSourcingHandler) SyncNow(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	result, err := h.service.SyncNow(c.Context(), c.Params("id"), orgID)
	if err != nil {
		if err.Error() == "NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Sourcing config not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Sync failed", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Sync completed", result)
}

// ============================================================
// External Project Mappings
// ============================================================

// POST /api/v1/external-project-mappings
func (h *LeadSourcingHandler) CreateProjectMapping(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	var req models.CreateExternalProjectMappingRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	result, err := h.service.CreateProjectMapping(c.Context(), orgID, req)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create project mapping", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Project mapping created", result)
}

// GET /api/v1/external-project-mappings
func (h *LeadSourcingHandler) ListProjectMappings(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	var provider *string
	if p := c.Query("provider"); p != "" {
		provider = &p
	}

	result, err := h.service.ListProjectMappings(c.Context(), orgID, provider)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list project mappings", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Project mappings retrieved", result)
}

// PUT /api/v1/external-project-mappings/:id
func (h *LeadSourcingHandler) UpdateProjectMapping(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	var req models.UpdateExternalProjectMappingRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	result, err := h.service.UpdateProjectMapping(c.Context(), c.Params("id"), orgID, req)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update project mapping", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Project mapping updated", result)
}

// DELETE /api/v1/external-project-mappings/:id
func (h *LeadSourcingHandler) DeleteProjectMapping(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	if err := h.service.DeleteProjectMapping(c.Context(), c.Params("id"), orgID); err != nil {
		if err.Error() == "NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project mapping not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete project mapping", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Project mapping deleted", nil)
}

// ============================================================
// Sync Logs
// ============================================================

// GET /api/v1/lead-sync-logs
func (h *LeadSourcingHandler) ListSyncLogs(c *fiber.Ctx) error {
	orgID, err := h.orgID(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to resolve organization", nil)
	}

	var configID *string
	if cid := c.Query("config_id"); cid != "" {
		configID = &cid
	}

	result, err := h.service.ListSyncLogs(c.Context(), orgID, configID)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list sync logs", nil)
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Sync logs retrieved", result)
}
