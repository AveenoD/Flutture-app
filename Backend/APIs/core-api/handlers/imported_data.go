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

type ImportedDataHandler struct {
	service *services.ImportedDataService
}

func NewImportedDataHandler(service *services.ImportedDataService) *ImportedDataHandler {
	return &ImportedDataHandler{service: service}
}

// ImportData handles CSV file upload and imports leads
func (h *ImportedDataHandler) ImportData(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get organization ID based on user role
	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", map[string]string{
			"error": err.Error(),
		})
	}

	// Check permissions for manager
	if userRole == "manager" {
		hasPermission, err := h.checkImportPermission(c, userID)
		if err != nil || !hasPermission {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "Permission denied", map[string]string{
				"error": "import_data permission required",
			})
		}
	}

	// Parse form data
	title := c.FormValue("title")
	description := c.FormValue("description")

	// Validate required fields
	if title == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", map[string]string{
			"title": "Title is required",
		})
	}

	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "File upload failed", map[string]string{
			"file": "CSV file is required",
		})
	}

	// Validate file type
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".csv") {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid file type", map[string]string{
			"file": "Only CSV files are allowed",
		})
	}

	// Validate file size (max 10MB)
	maxSize := int64(10 * 1024 * 1024)
	if file.Size > maxSize {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "File too large", map[string]string{
			"file": "File size must be less than 10MB",
		})
	}

	// Open file
	fileReader, err := file.Open()
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to read file", map[string]string{
			"error": err.Error(),
		})
	}
	defer fileReader.Close()

	// Call service to import data
	result, err := h.service.ImportData(c.Context(), userID, userRole, orgID, title, description, fileReader)
	if err != nil {
		if strings.Contains(err.Error(), "LEAD_LIMIT_EXCEEDED") {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		if err.Error() == "NO_VALID_ROWS" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No valid rows found in CSV", nil)
		}
		if err.Error() == "NO_ACTIVE_SUBSCRIPTION" {
			return responses.ErrorResponse(c, fiber.StatusForbidden, "No active subscription found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to import data", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusCreated, "Data imported successfully", result)
}

// AssignUsers handles assigning presales users to imported data leads
func (h *ImportedDataHandler) AssignUsers(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get organization ID
	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", map[string]string{
			"error": err.Error(),
		})
	}

	// Get imported_data_id from params
	importedDataID := c.Params("id")
	if importedDataID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid imported data ID", nil)
	}

	// Parse request body
	var req models.AssignUsersRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate request
	if errors := utils.ValidateStruct(req); len(errors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Call service to assign users
	result, err := h.service.AssignUsers(c.Context(), importedDataID, orgID, req.UserIDs)
	if err != nil {
		if err.Error() == "IMPORTED_DATA_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Imported data not found", nil)
		}
		if err.Error() == "NO_VALID_PRESALES_USERS" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No valid presales users found", nil)
		}
		if err.Error() == "NO_LEADS_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No leads found for this import", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to assign users", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Users assigned successfully", result)
}

// DeleteImportedData handles deleting imported data and unqualified leads
func (h *ImportedDataHandler) DeleteImportedData(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get organization ID
	orgID, err := h.getOrganizationID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusForbidden, "Failed to get organization", map[string]string{
			"error": err.Error(),
		})
	}

	// Get imported_data_id from params
	importedDataID := c.Params("id")
	if importedDataID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid imported data ID", nil)
	}

	// Call service to delete imported data
	result, err := h.service.DeleteImportedData(c.Context(), importedDataID, orgID)
	if err != nil {
		if err.Error() == "IMPORTED_DATA_NOT_FOUND" {
			return responses.ErrorResponse(c, fiber.StatusNotFound, "Imported data not found", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete imported data", map[string]string{
			"error": err.Error(),
		})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Imported data deleted successfully", result)
}

// Helper methods

func (h *ImportedDataHandler) getOrganizationID(c *fiber.Ctx, userID, userRole string) (string, error) {
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

func (h *ImportedDataHandler) checkImportPermission(c *fiber.Ctx, userID string) (bool, error) {
	var hasPermission bool
	query := `SELECT 'import_data' = ANY(permissions) FROM users_managers WHERE id = $1`
	err := h.service.DB.QueryRow(c.Context(), query, userID).Scan(&hasPermission)
	return hasPermission, err
}
