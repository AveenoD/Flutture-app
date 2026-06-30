package handlers

import (
	"fmt"

	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"
	"crownco/core-api/utils"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	service *services.UserService
}

func NewUserHandler(service *services.UserService) *UserHandler {
	return &UserHandler{service: service}
}

// CreateUser handles the user creation request
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req models.CreateUserRequest
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Verify user is a general manager
	if userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can create users", "FORBIDDEN")
	}

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate request
	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Additional password validation
	if passwordErrors := utils.ValidatePasswordStrength(req.Password); passwordErrors != nil && len(passwordErrors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", passwordErrors)
	}

	// DOB format validation is handled by validator
	// Service will check if DOB is in the past

	// Call service
	user, err := h.service.CreateUser(c.Context(), userID, req)
	if err != nil {
		if err.Error() == "INVALID_USER_ID" || err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		if err.Error() == "INVALID_USER_TYPE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid user type. Must be one of: manager, presales, sales", "INVALID_USER_TYPE")
		}
		if err.Error() == "EMAIL_ALREADY_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Email already exists", "EMAIL_ALREADY_EXISTS")
		}
		if err.Error() == "EMPLOYEE_ID_ALREADY_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Employee ID already exists", "EMPLOYEE_ID_ALREADY_EXISTS")
		}
		if err.Error() == "INVALID_TEAM_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid team ID format", "INVALID_TEAM_ID")
		}
		if err.Error() == "TEAM_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Team not found", "TEAM_NOT_FOUND")
		}
		if err.Error() == "TEAM_NOT_IN_ORGANIZATION" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"Team does not belong to your organization", "TEAM_NOT_IN_ORGANIZATION")
		}
		if err.Error() == "INVALID_PROJECT_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid project ID format", "INVALID_PROJECT_ID")
		}
		if err.Error() == "PROJECT_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Project not found", "PROJECT_NOT_FOUND")
		}
		if err.Error() == "USER_LIMIT_EXCEEDED" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"User limit exceeded. Please upgrade your subscription plan", "USER_LIMIT_EXCEEDED")
		}
		if err.Error() == "NO_ACTIVE_SUBSCRIPTION" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"No active subscription found", "NO_ACTIVE_SUBSCRIPTION")
		}
		if err.Error() == "SUBSCRIPTION_EXPIRED" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"Subscription has expired. Please renew your subscription", "SUBSCRIPTION_EXPIRED")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to create user", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusCreated,
		"User created successfully",
		user)
}

// UpdateUser handles the user update request
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	var req models.UpdateUserRequest
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)
	targetUserID := c.Params("id")

	// Verify user is a general manager
	if userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can update users", "FORBIDDEN")
	}

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate request
	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Call service
	user, err := h.service.UpdateUser(c.Context(), userID, targetUserID, req)
	if err != nil {
		if err.Error() == "INVALID_USER_ID" || err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		if err.Error() == "INVALID_TARGET_USER_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid target user ID", "INVALID_TARGET_USER_ID")
		}
		if err.Error() == "USER_NOT_IN_ORGANIZATION" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"User does not belong to your organization", "USER_NOT_IN_ORGANIZATION")
		}
		if err.Error() == "EMAIL_ALREADY_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Email already exists", "EMAIL_ALREADY_EXISTS")
		}
		if err.Error() == "EMPLOYEE_ID_ALREADY_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Employee ID already exists", "EMPLOYEE_ID_ALREADY_EXISTS")
		}
		if err.Error() == "INVALID_TEAM_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid team ID format", "INVALID_TEAM_ID")
		}
		if err.Error() == "TEAM_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Team not found", "TEAM_NOT_FOUND")
		}
		if err.Error() == "TEAM_NOT_IN_ORGANIZATION" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"Team does not belong to your organization", "TEAM_NOT_IN_ORGANIZATION")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to update user", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusOK,
		"User updated successfully",
		user)
}

// DeleteUser handles the user deletion request
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)
	targetUserID := c.Params("id")

	// Verify user is a general manager
	if userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can delete users", "FORBIDDEN")
	}

	// Call service
	err := h.service.DeleteUser(c.Context(), userID, targetUserID)
	if err != nil {
		if err.Error() == "INVALID_USER_ID" || err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		if err.Error() == "INVALID_TARGET_USER_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid target user ID", "INVALID_TARGET_USER_ID")
		}
		if err.Error() == "USER_NOT_IN_ORGANIZATION" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"User does not belong to your organization", "USER_NOT_IN_ORGANIZATION")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to delete user", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusOK,
		"User deleted successfully",
		map[string]string{
			"message": "User has been deleted successfully",
		})
}

// BlockUser handles the user block/unblock request
func (h *UserHandler) BlockUser(c *fiber.Ctx) error {
	var req models.BlockUserRequest
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)
	targetUserID := c.Params("id")

	// Verify user is a general manager
	if userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can block/unblock users", "FORBIDDEN")
	}

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate request
	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Call service
	err := h.service.BlockUser(c.Context(), userID, targetUserID, req.Status)
	if err != nil {
		if err.Error() == "INVALID_USER_ID" || err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		if err.Error() == "INVALID_TARGET_USER_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid target user ID", "INVALID_TARGET_USER_ID")
		}
		if err.Error() == "USER_NOT_IN_ORGANIZATION" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"User does not belong to your organization", "USER_NOT_IN_ORGANIZATION")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to update user status", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusOK,
		"User status updated successfully",
		map[string]string{
			"message": fmt.Sprintf("User status has been updated to %s", req.Status),
		})
}

// AddPermission handles the add permission request
func (h *UserHandler) AddPermission(c *fiber.Ctx) error {
	var req models.AddPermissionRequest
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)
	targetUserID := c.Params("id")

	// Verify user is a general manager
	if userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can manage user permissions", "FORBIDDEN")
	}

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate request
	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Call service
	user, err := h.service.AddPermission(c.Context(), userID, targetUserID, req.Permission)
	if err != nil {
		if err.Error() == "INVALID_USER_ID" || err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		if err.Error() == "INVALID_TARGET_USER_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid target user ID", "INVALID_TARGET_USER_ID")
		}
		if err.Error() == "USER_NOT_IN_ORGANIZATION" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"User does not belong to your organization", "USER_NOT_IN_ORGANIZATION")
		}
		if err.Error() == "PERMISSION_ALREADY_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Permission already exists for this user", "PERMISSION_ALREADY_EXISTS")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to add permission", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusOK,
		"Permission added successfully",
		user)
}

// RemovePermission handles the remove permission request
func (h *UserHandler) RemovePermission(c *fiber.Ctx) error {
	var req models.RemovePermissionRequest
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)
	targetUserID := c.Params("id")

	// Verify user is a general manager
	if userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can manage user permissions", "FORBIDDEN")
	}

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate request
	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Call service
	user, err := h.service.RemovePermission(c.Context(), userID, targetUserID, req.Permission)
	if err != nil {
		if err.Error() == "INVALID_USER_ID" || err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		if err.Error() == "INVALID_TARGET_USER_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid target user ID", "INVALID_TARGET_USER_ID")
		}
		if err.Error() == "USER_NOT_IN_ORGANIZATION" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"User does not belong to your organization", "USER_NOT_IN_ORGANIZATION")
		}
		if err.Error() == "PERMISSION_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Permission not found for this user", "PERMISSION_NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to remove permission", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusOK,
		"Permission removed successfully",
		user)
}

// ListUsers returns users for GM or Manager with manage_employees permission
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}

	// Only GM or Manager can list users
	if userRole != "general-manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can list users", "FORBIDDEN")
	}

	orgIDStr, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	filters := map[string]string{
		"page":   c.Query("page"),
		"limit":  c.Query("limit"),
		"role":   c.Query("role"),
		"status": c.Query("status"),
		"team_id": c.Query("team_id"),
		"search": c.Query("search"),
	}

	result, err := h.service.ListUsers(c.Context(), orgIDStr, filters)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list users", map[string]string{"error": err.Error()})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Users retrieved successfully", fiber.Map{
		"users":      result.Users,
		"pagination": result.Pagination,
	})
}

// GetUserByID returns user detail for GM or Manager
func (h *UserHandler) GetUserByID(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "general-manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can view user details", "FORBIDDEN")
	}

	targetUserID := c.Params("id")
	if targetUserID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "User ID is required", nil)
	}

	user, err := h.service.GetUserByID(c.Context(), targetUserID)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "User not found", "USER_NOT_FOUND")
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "User retrieved successfully", user)
}
