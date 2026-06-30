package handlers

import (
	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"
	"crownco/core-api/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type SubscriptionHandler struct {
	service *services.SubscriptionService
}

func NewSubscriptionHandler(service *services.SubscriptionService) *SubscriptionHandler {
	return &SubscriptionHandler{service: service}
}

// GetPlans handles the request to get all active plans
func (h *SubscriptionHandler) GetPlans(c *fiber.Ctx) error {
	plans, err := h.service.GetPlans(c.Context())
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to fetch plans", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Plans retrieved successfully",
		plans)
}

// GetCurrentSubscription handles the request to get current organization's subscription
func (h *SubscriptionHandler) GetCurrentSubscription(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
			"Invalid user context", "INVALID_USER_CONTEXT")
	}

	// Get organization_id from user_id
	orgID, err := h.getOrganizationIDFromUserID(c, userID)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Failed to get organization", "FORBIDDEN")
	}

	subscription, err := h.service.GetCurrentSubscription(c.Context(), orgID)
	if err != nil {
		if err.Error() == "SUBSCRIPTION_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Subscription not found", "SUBSCRIPTION_NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to get subscription", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Subscription retrieved successfully",
		subscription)
}

// CreateSubscription handles the request to create a new subscription
func (h *SubscriptionHandler) CreateSubscription(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
			"Invalid user context", "INVALID_USER_CONTEXT")
	}

	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can create subscriptions", "FORBIDDEN")
	}

	// Get organization_id from user_id
	orgID, err := h.getOrganizationIDFromUserID(c, userID)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Failed to get organization", "FORBIDDEN")
	}

	var req models.CreateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate request
	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	subscription, err := h.service.CreateSubscription(c.Context(), orgID, req)
	if err != nil {
		if err.Error() == "ACTIVE_SUBSCRIPTION_EXISTS" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict,
				"Organization already has an active subscription", "ACTIVE_SUBSCRIPTION_EXISTS")
		}
		if err.Error() == "PLAN_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Plan not found", "PLAN_NOT_FOUND")
		}
		if err.Error() == "INVALID_PLAN_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid plan ID", "INVALID_PLAN_ID")
		}
		if err.Error() == "INVALID_BILLING_CYCLE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid billing cycle", "INVALID_BILLING_CYCLE")
		}
		if err.Error() == "QUARTERLY_PRICING_NOT_AVAILABLE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Quarterly pricing not available for this plan", "QUARTERLY_PRICING_NOT_AVAILABLE")
		}
		if err.Error() == "YEARLY_PRICING_NOT_AVAILABLE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Yearly pricing not available for this plan", "YEARLY_PRICING_NOT_AVAILABLE")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to create subscription", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusCreated,
		"Subscription created successfully",
		subscription)
}

// UpdateSubscription handles the request to update a subscription
func (h *SubscriptionHandler) UpdateSubscription(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
			"Invalid user context", "INVALID_USER_CONTEXT")
	}

	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can update subscriptions", "FORBIDDEN")
	}

	// Get subscription ID from URL
	subscriptionIDStr := c.Params("id")
	subscriptionID, err := uuid.Parse(subscriptionIDStr)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
			"Invalid subscription ID", "INVALID_SUBSCRIPTION_ID")
	}

	// Get organization_id from user_id
	orgID, err := h.getOrganizationIDFromUserID(c, userID)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Failed to get organization", "FORBIDDEN")
	}

	var req models.UpdateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	// Validate request
	if errors := utils.ValidateStruct(req); errors != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Validation failed", errors)
	}

	subscription, err := h.service.UpdateSubscription(c.Context(), subscriptionID, orgID, req)
	if err != nil {
		if err.Error() == "SUBSCRIPTION_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Subscription not found", "SUBSCRIPTION_NOT_FOUND")
		}
		if err.Error() == "FORBIDDEN" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"Subscription does not belong to your organization", "FORBIDDEN")
		}
		if err.Error() == "PLAN_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Plan not found", "PLAN_NOT_FOUND")
		}
		if err.Error() == "INVALID_PLAN_ID" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid plan ID", "INVALID_PLAN_ID")
		}
		if err.Error() == "INVALID_BILLING_CYCLE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid billing cycle", "INVALID_BILLING_CYCLE")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to update subscription", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Subscription updated successfully",
		subscription)
}

// CancelSubscription handles the request to cancel a subscription
func (h *SubscriptionHandler) CancelSubscription(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
			"Invalid user context", "INVALID_USER_CONTEXT")
	}

	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can cancel subscriptions", "FORBIDDEN")
	}

	// Get subscription ID from URL
	subscriptionIDStr := c.Params("id")
	subscriptionID, err := uuid.Parse(subscriptionIDStr)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
			"Invalid subscription ID", "INVALID_SUBSCRIPTION_ID")
	}

	// Get organization_id from user_id
	orgID, err := h.getOrganizationIDFromUserID(c, userID)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Failed to get organization", "FORBIDDEN")
	}

	var req models.CancelSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{
			"body": "Failed to parse request body",
		})
	}

	subscription, err := h.service.CancelSubscription(c.Context(), subscriptionID, orgID, req.Reason)
	if err != nil {
		if err.Error() == "SUBSCRIPTION_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Subscription not found", "SUBSCRIPTION_NOT_FOUND")
		}
		if err.Error() == "FORBIDDEN" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"Subscription does not belong to your organization", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to cancel subscription", map[string]string{
				"error": "Internal server error",
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Subscription cancelled successfully",
		subscription)
}

// RenewSubscription handles the request to renew a subscription
func (h *SubscriptionHandler) RenewSubscription(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
			"Invalid user context", "INVALID_USER_CONTEXT")
	}

	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole != "general-manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Only General Managers can renew subscriptions", "FORBIDDEN")
	}

	// Get subscription ID from URL
	subscriptionIDStr := c.Params("id")
	subscriptionID, err := uuid.Parse(subscriptionIDStr)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
			"Invalid subscription ID", "INVALID_SUBSCRIPTION_ID")
	}

	// Get organization_id from user_id
	orgID, err := h.getOrganizationIDFromUserID(c, userID)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
			"Failed to get organization", "FORBIDDEN")
	}

	subscription, err := h.service.RenewSubscription(c.Context(), subscriptionID, orgID)
	if err != nil {
		if err.Error() == "SUBSCRIPTION_NOT_FOUND" {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound,
				"Subscription not found", "SUBSCRIPTION_NOT_FOUND")
		}
		if err.Error() == "FORBIDDEN" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden,
				"Subscription does not belong to your organization", "FORBIDDEN")
		}
		if err.Error() == "INVALID_BILLING_CYCLE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest,
				"Invalid billing cycle", "INVALID_BILLING_CYCLE")
		}
		// Log the actual error for debugging
		return responses.ErrorResponse(c, fiber.StatusInternalServerError,
			"Failed to renew subscription: "+err.Error(), map[string]string{
				"error": err.Error(),
			})
	}

	return responses.SuccessResponse(c, fiber.StatusOK,
		"Subscription renewed successfully",
		subscription)
}

// getOrganizationIDFromUserID gets organization_id from user_id
func (h *SubscriptionHandler) getOrganizationIDFromUserID(c *fiber.Ctx, userID string) (uuid.UUID, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return uuid.Nil, err
	}
	return h.service.GetOrganizationIDFromUserID(c.Context(), userUUID)
}
