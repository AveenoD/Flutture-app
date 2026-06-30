package handlers

import (
	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"
	"crownco/core-api/utils"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	service *services.AuthService
}

func NewAuthHandler(service *services.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

// Login handles the login request for General Manager
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest

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

	// Call service (unified login for all user types)
	loginResponse, err := h.service.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		if err.Error() == "INVALID_CREDENTIALS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
				"Invalid email or password", "INVALID_CREDENTIALS")
		}
		if err.Error() == "USER_INACTIVE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"User account is inactive", "USER_INACTIVE")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Login failed", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusOK,
		"Login successful",
		loginResponse)
}

// ForgotPassword handles the forgot password request
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req models.ForgotPasswordRequest

	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	err := h.service.ForgotPassword(c.Context(), req.Email)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to process forgot password request", map[string]string{
				"error": "Internal server error",
			})
	}

	// Always return success for security (don't reveal if email exists)
	return responses.SuccessResponse(c, fiber.StatusOK,
		"If the email exists, a password reset link has been sent",
		map[string]string{
			"message": "Check your email for password reset instructions",
		})
}

// ResetPassword handles the reset password request
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req models.ResetPasswordRequest

	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Additional password validation
	if passwordErrors := utils.ValidatePasswordStrength(req.NewPassword); passwordErrors != nil && len(passwordErrors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", passwordErrors)
	}

	err := h.service.ResetPassword(c.Context(), req.Token, req.NewPassword)
	if err != nil {
		if err.Error() == "INVALID_TOKEN" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid or expired reset token", "INVALID_TOKEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to reset password", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Password reset successfully",
		map[string]string{
			"message": "Your password has been reset successfully",
		})
}

// GetMe handles the get current user profile request
func (h *AuthHandler) GetMe(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
			"Invalid user context", "INVALID_USER_CONTEXT")
	}

	profile, err := h.service.GetCurrentUserProfile(c.Context(), userID)
	if err != nil {
		if err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to get user profile", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Profile retrieved successfully",
		profile)
}

// ChangePassword handles the change password request
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	var req models.ChangePasswordRequest
	userID := c.Locals("user_id").(string)

	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	// Additional password validation
	if passwordErrors := utils.ValidatePasswordStrength(req.NewPassword); passwordErrors != nil && len(passwordErrors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", passwordErrors)
	}

	err := h.service.ChangePassword(c.Context(), userID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		if err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		if err.Error() == "INVALID_CURRENT_PASSWORD" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Current password is incorrect", "INVALID_CURRENT_PASSWORD")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to change password", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Password changed successfully",
		map[string]string{
			"message": "Your password has been changed successfully",
		})
}

// UpdateProfile handles the update profile request
func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	var req models.UpdateProfileRequest
	userID := c.Locals("user_id").(string)

	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	profile, err := h.service.UpdateProfile(c.Context(), userID, req)
	if err != nil {
		if err.Error() == "EMAIL_ALREADY_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Email already exists", "EMAIL_ALREADY_EXISTS")
		}
		if err.Error() == "PHONE_ALREADY_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Phone number already exists", "PHONE_ALREADY_EXISTS")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to update profile", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Profile updated successfully",
		profile)
}
