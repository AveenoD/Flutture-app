package handlers

import (
	"fmt"
	"strings"

	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"
	"crownco/core-api/utils"

	"github.com/gofiber/fiber/v2"
)

type ProjectHandler struct {
	service *services.ProjectService
}

func NewProjectHandler(service *services.ProjectService) *ProjectHandler {
	return &ProjectHandler{service: service}
}

// ============================================
// PROJECT HANDLERS
// ============================================

// CreateProject handles creating a new project
func (h *ProjectHandler) CreateProject(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get organization ID
	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", map[string]string{
			"error": err.Error(),
		})
	}

	// Check permissions for manager
	if userRole == "manager" {
		hasPermission, err := h.checkManageProjectsPermission(c, userID)
		if err != nil || !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", map[string]string{
				"error": "manage_projects permission required",
			})
		}
	}

	// Parse request
	var req models.CreateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	// Validate request
	if errors := utils.ValidateStruct(req); len(errors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Create project
	project, err := h.service.CreateProject(c.Context(), orgID, req)
	if err != nil {
		if strings.Contains(err.Error(), "SUBSCRIPTION_LIMIT_EXCEEDED") {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		if err.Error() == "NO_ACTIVE_SUBSCRIPTION" {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "No active subscription found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create project", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusCreated, "Project created successfully", project)
}

// UpdateProject handles updating a project
func (h *ProjectHandler) UpdateProject(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	// Check permissions
	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("id")
	var req models.UpdateProjectRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	project, err := h.service.UpdateProject(c.Context(), projectID, orgID, req)
	if err != nil {
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update project", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Project updated successfully", project)
}

// DeleteProject handles deleting a project
func (h *ProjectHandler) DeleteProject(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	// Check permissions
	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("id")
	err = h.service.DeleteProject(c.Context(), projectID, orgID)
	if err != nil {
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete project", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Project deleted successfully", nil)
}

// GetProject handles retrieving a single project
func (h *ProjectHandler) GetProject(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	projectID := c.Params("id")
	project, err := h.service.GetProjectByID(c.Context(), projectID, orgID)
	if err != nil {
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get project", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Project retrieved successfully", project)
}

// ListProjects handles listing projects with filters
func (h *ProjectHandler) ListProjects(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	// Extract filters from query params
	filters := make(map[string]string)
	filters["status"] = c.Query("status")
	filters["type"] = c.Query("type")
	filters["area_type"] = c.Query("area_type")
	filters["city"] = c.Query("city")
	filters["state"] = c.Query("state")
	filters["country"] = c.Query("country")
	filters["floor_count_min"] = c.Query("floor_count_min")
	filters["floor_count_max"] = c.Query("floor_count_max")
	filters["page"] = c.Query("page", "1")
	filters["limit"] = c.Query("limit", "20")

	mine := c.Query("mine")
	if mine == "1" || strings.EqualFold(mine, "true") {
		if userRole != "sales" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"Query mine=1 is only supported for sales users", "FORBIDDEN")
		}
		filters["mine_sales_user_id"] = userID
	}

	projects, err := h.service.ListProjects(c.Context(), orgID, filters)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list projects", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Projects retrieved successfully", projects)
}

// SearchProjects handles full-text search
func (h *ProjectHandler) SearchProjects(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	query := c.Query("q")
	if query == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Search query is required", nil)
	}

	limit := 20
	if l := c.Query("limit"); l != "" {
		fmt.Sscanf(l, "%d", &limit)
		if limit > 100 {
			limit = 100
		}
	}

	results, err := h.service.SearchProjects(c.Context(), orgID, query, limit)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Search failed", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Search completed successfully", results)
}

// GetProjectStats handles retrieving project statistics
func (h *ProjectHandler) GetProjectStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	projectID := c.Params("id")
	stats, err := h.service.GetProjectStats(c.Context(), projectID, orgID, userID, userRole)
	if err != nil {
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get statistics", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Statistics retrieved successfully", stats)
}

// ============================================
// UNIT HANDLERS
// ============================================

// CreateUnit handles creating a new unit
func (h *ProjectHandler) CreateUnit(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("project_id")
	var req models.CreateUnitRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	if errors := utils.ValidateStruct(req); len(errors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	unit, err := h.service.CreateUnit(c.Context(), projectID, orgID, req)
	if err != nil {
		if strings.Contains(err.Error(), "UNIT_LIMIT_EXCEEDED") {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create unit", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusCreated, "Unit created successfully", unit)
}

// BulkCreateUnits handles bulk creating units
func (h *ProjectHandler) BulkCreateUnits(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("project_id")
	var req models.BulkCreateUnitsRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	result, err := h.service.BulkCreateUnits(c.Context(), projectID, orgID, req)
	if err != nil {
		if strings.Contains(err.Error(), "UNIT_LIMIT_EXCEEDED") {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create units", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusCreated, "Units created successfully", result)
}

// UpdateUnit handles updating a unit
func (h *ProjectHandler) UpdateUnit(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("project_id")
	unitID := c.Params("unit_id")

	var req models.UpdateUnitRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	unit, err := h.service.UpdateUnit(c.Context(), projectID, unitID, orgID, req)
	if err != nil {
		if err.Error() == "UNIT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Unit not found", nil)
		}
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update unit", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Unit updated successfully", unit)
}

// DeleteUnit handles deleting a unit
func (h *ProjectHandler) DeleteUnit(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("project_id")
	unitID := c.Params("unit_id")

	err = h.service.DeleteUnit(c.Context(), projectID, unitID, orgID)
	if err != nil {
		if err.Error() == "UNIT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Unit not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete unit", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Unit deleted successfully", nil)
}

// GetUnit handles retrieving a single unit
func (h *ProjectHandler) GetUnit(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	projectID := c.Params("project_id")
	unitID := c.Params("unit_id")

	unit, err := h.service.GetUnitByID(c.Context(), projectID, unitID, orgID)
	if err != nil {
		if err.Error() == "UNIT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Unit not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get unit", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Unit retrieved successfully", unit)
}

// ListUnits handles listing units with filters
func (h *ProjectHandler) ListUnits(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	projectID := c.Params("project_id")

	filters := make(map[string]string)
	filters["floor"] = c.Query("floor")
	filters["floor_min"] = c.Query("floor_min")
	filters["floor_max"] = c.Query("floor_max")
	filters["unit_type"] = c.Query("unit_type")
	filters["status"] = c.Query("status")
	filters["price_min"] = c.Query("price_min")
	filters["price_max"] = c.Query("price_max")
	filters["page"] = c.Query("page", "1")
	filters["limit"] = c.Query("limit", "20")

	units, err := h.service.ListUnits(c.Context(), projectID, orgID, filters)
	if err != nil {
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list units", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Units retrieved successfully", units)
}

// ============================================
// ADDON HANDLERS
// ============================================

// CreateAddon handles creating a new addon
func (h *ProjectHandler) CreateAddon(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("project_id")
	var req models.CreateAddonRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	if errors := utils.ValidateStruct(req); len(errors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	addon, err := h.service.CreateAddon(c.Context(), projectID, orgID, req)
	if err != nil {
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create addon", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusCreated, "Addon created successfully", addon)
}

// UpdateAddon handles updating an addon
func (h *ProjectHandler) UpdateAddon(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("project_id")
	addonID := c.Params("addon_id")

	var req models.UpdateAddonRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", nil)
	}

	addon, err := h.service.UpdateAddon(c.Context(), projectID, addonID, orgID, req)
	if err != nil {
		if err.Error() == "ADDON_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Addon not found", nil)
		}
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update addon", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Addon updated successfully", addon)
}

// DeleteAddon handles deleting an addon
func (h *ProjectHandler) DeleteAddon(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	if userRole == "manager" {
		hasPermission, _ := h.checkManageProjectsPermission(c, userID)
		if !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", nil)
		}
	}

	projectID := c.Params("project_id")
	addonID := c.Params("addon_id")

	err = h.service.DeleteAddon(c.Context(), projectID, addonID, orgID)
	if err != nil {
		if err.Error() == "ADDON_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Addon not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete addon", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Addon deleted successfully", nil)
}

// GetAddon handles retrieving a single addon
func (h *ProjectHandler) GetAddon(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	projectID := c.Params("project_id")
	addonID := c.Params("addon_id")

	addon, err := h.service.GetAddonByID(c.Context(), projectID, addonID, orgID)
	if err != nil {
		if err.Error() == "ADDON_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Addon not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get addon", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Addon retrieved successfully", addon)
}

// ListAddons handles listing addons with filters
func (h *ProjectHandler) ListAddons(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", nil)
	}

	projectID := c.Params("project_id")

	filters := make(map[string]string)
	filters["category"] = c.Query("category")
	filters["status"] = c.Query("status")
	filters["price_min"] = c.Query("price_min")
	filters["price_max"] = c.Query("price_max")
	filters["page"] = c.Query("page", "1")
	filters["limit"] = c.Query("limit", "20")

	addons, err := h.service.ListAddons(c.Context(), projectID, orgID, filters)
	if err != nil {
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Project not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list addons", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Addons retrieved successfully", addons)
}

// ============================================
// HELPER METHODS
// ============================================

func (h *ProjectHandler) getOrganizationID(c *fiber.Ctx, userID, userRole string) (string, error) {
	var orgID string
	var query string

	switch userRole {
	case "general-manager":
		query = "SELECT organization_id FROM users_general_managers WHERE id = $1"
	case "manager":
		query = "SELECT organization_id FROM users_managers WHERE id = $1"
	case "presales":
		query = "SELECT organization_id FROM users_presales WHERE id = $1"
	case "sales":
		query = "SELECT organization_id FROM users_sales WHERE id = $1"
	default:
		return "", fmt.Errorf("INVALID_USER_TYPE")
	}

	err := h.service.DB.QueryRow(c.Context(), query, userID).Scan(&orgID)
	if err != nil {
		return "", err
	}

	return orgID, nil
}

func (h *ProjectHandler) checkManageProjectsPermission(c *fiber.Ctx, userID string) (bool, error) {
	var hasPermission bool
	query := `SELECT 'manage_projects' = ANY(permissions) FROM users_managers WHERE id = $1`
	err := h.service.DB.QueryRow(c.Context(), query, userID).Scan(&hasPermission)
	return hasPermission, err
}
