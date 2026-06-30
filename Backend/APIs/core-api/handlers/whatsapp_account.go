package handlers

import (
	"errors"

	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

type WhatsAppAccountHandler struct {
	service *services.WhatsAppService
}

func NewWhatsAppAccountHandler(service *services.WhatsAppService) *WhatsAppAccountHandler {
	return &WhatsAppAccountHandler{service: service}
}

func (h *WhatsAppAccountHandler) orgID(c *fiber.Ctx, userID, userRole string) (string, error) {
	return h.service.Lead.GetOrganizationID(c.Context(), userID, userRole)
}

func (h *WhatsAppAccountHandler) CreateAccount(c *fiber.Ctx) error {
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "manager" && userRole != "gm" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only manager or gm can manage WhatsApp accounts", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	var req models.CreateWhatsAppAccountRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if req.PhoneNumberID == "" || req.DisplayPhoneNumber == "" || req.BusinessAccountID == "" || req.AccessToken == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "phone_number_id, display_phone_number, business_account_id, access_token are required", nil)
	}

	account, err := h.service.CreateAccount(c.Context(), orgID, &req)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create WhatsApp account", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "WhatsApp account created", fiber.Map{"account": account})
}

func (h *WhatsAppAccountHandler) GetAccounts(c *fiber.Ctx) error {
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	accounts, err := h.service.GetAccounts(c.Context(), orgID)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get WhatsApp accounts", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "WhatsApp accounts retrieved", fiber.Map{"accounts": accounts})
}

func (h *WhatsAppAccountHandler) UpdateAccount(c *fiber.Ctx) error {
	accountID := c.Params("id")
	if accountID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Account ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "manager" && userRole != "gm" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only manager or gm can manage WhatsApp accounts", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	var req models.UpdateWhatsAppAccountRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}

	account, err := h.service.UpdateAccount(c.Context(), accountID, orgID, &req)
	if err != nil {
		if errors.Is(err, services.ErrWAAccountNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "WhatsApp account not found", "NOT_FOUND")
		}
		if err.Error() == "NO_UPDATES" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No fields to update", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update WhatsApp account", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "WhatsApp account updated", fiber.Map{"account": account})
}

func (h *WhatsAppAccountHandler) DeleteAccount(c *fiber.Ctx) error {
	accountID := c.Params("id")
	if accountID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Account ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "manager" && userRole != "gm" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only manager or gm can manage WhatsApp accounts", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	err = h.service.DeleteAccount(c.Context(), accountID, orgID)
	if err != nil {
		if errors.Is(err, services.ErrWAAccountNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "WhatsApp account not found", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete WhatsApp account", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "WhatsApp account deleted", nil)
}
