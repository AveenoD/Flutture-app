package handlers

import (
	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"
	"crownco/core-api/utils"

	"github.com/gofiber/fiber/v2"
)

type OrganizationHandler struct {
	service *services.OrganizationService
}

func NewOrganizationHandler(service *services.OrganizationService) *OrganizationHandler {
	return &OrganizationHandler{service: service}
}

// OnboardOrganization handles the organization onboarding request
func (h *OrganizationHandler) OnboardOrganization(c *fiber.Ctx) error {
	var req models.OnboardRequest

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate nested structs
	orgErrors := utils.ValidateStruct(req.Organization)
	gmErrors := utils.ValidateStruct(req.GeneralManager)
	
	// Combine errors with prefixes
	allErrors := make(map[string]string)
	if orgErrors != nil && len(orgErrors) > 0 {
		for key, value := range orgErrors {
			allErrors["organization."+key] = value
		}
	}
	if gmErrors != nil && len(gmErrors) > 0 {
		for key, value := range gmErrors {
			allErrors["general_manager."+key] = value
		}
	}
	
	if len(allErrors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", allErrors)
	}

	// Additional password validation
	if passwordErrors := utils.ValidatePasswordStrength(req.GeneralManager.Password); passwordErrors != nil && len(passwordErrors) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", passwordErrors)
	}

	// Validate DOB is in the past (will be checked in service, but validate format first)
	if req.GeneralManager.DOB != "" {
		if dobErrors := validateDOB(req.GeneralManager.DOB); dobErrors != nil && len(dobErrors) > 0 {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", dobErrors)
		}
	}

	// Call service
	org, gm, err := h.service.OnboardOrganization(c.Context(), req)
	if err != nil {
		if err.Error() == "ORGANIZATION_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict, 
				"Organization with this email already exists", "ORGANIZATION_EXISTS")
		}
		if err.Error() == "GM_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"General Manager with this email already exists", "GM_EXISTS")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to create organization", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusCreated,
		"Organization and General Manager created successfully",
		map[string]interface{}{
			"organization":    org,
			"general_manager": gm,
		})
}


// UpdateOrganization handles the organization update request
func (h *OrganizationHandler) UpdateOrganization(c *fiber.Ctx) error {
	var req models.UpdateOrganizationRequest
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Verify user is a general manager
	if userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can update organization details", "FORBIDDEN")
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
	org, err := h.service.UpdateOrganization(c.Context(), userID, req)
	if err != nil {
		if err.Error() == "INVALID_USER_ID" || err.Error() == "USER_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"User not found", "USER_NOT_FOUND")
		}
		if err.Error() == "EMAIL_ALREADY_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Email already exists", "EMAIL_ALREADY_EXISTS")
		}
		if err.Error() == "ORGANIZATION_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Organization not found", "ORGANIZATION_NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to update organization", map[string]string{
				"error": "Internal server error",
			})
	}

	// Return success response
	return responses.SuccessResponse(c, fiber.StatusOK,
		"Organization updated successfully",
		org)
}

// validateDOB validates date of birth format
func validateDOB(dob string) map[string]string {
	errors := make(map[string]string)
	
	// Format validation is done by validator, but we can add additional checks here if needed
	// The service will check if it's in the past
	return errors
}
