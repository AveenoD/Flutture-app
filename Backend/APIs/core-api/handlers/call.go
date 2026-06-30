package handlers

import (
	"errors"
	"strconv"
	"strings"

	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

type CallHandler struct {
	service *services.CallService
}

func NewCallHandler(service *services.CallService) *CallHandler {
	return &CallHandler{service: service}
}

func (h *CallHandler) orgID(c *fiber.Ctx, userID, userRole string) (string, error) {
	return h.service.Lead.GetOrganizationID(c.Context(), userID, userRole)
}

func (h *CallHandler) InitiateCall(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales users can initiate calls", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	var req models.InitiateCallRequest
	_ = c.BodyParser(&req)

	result, err := h.service.InitiateCall(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found", "NOT_FOUND")
		}
		if err.Error() == "INVALID_STAGE_ID" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid lead_stage_id format", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to initiate call", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Call initiated", fiber.Map{"call": result})
}

func (h *CallHandler) GetCall(c *fiber.Ctx) error {
	leadID := c.Params("id")
	callID := c.Params("call_id")
	if leadID == "" || callID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and call ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	call, err := h.service.GetCall(c.Context(), leadID, callID, orgID)
	if err != nil {
		if errors.Is(err, services.ErrCallNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Call not found", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get call", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Call retrieved", fiber.Map{"call": call})
}

func (h *CallHandler) ListCalls(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	result, err := h.service.ListCalls(c.Context(), leadID, orgID, page, limit)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list calls", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Calls retrieved", result)
}

func (h *CallHandler) UpdateCall(c *fiber.Ctx) error {
	leadID := c.Params("id")
	callID := c.Params("call_id")
	if leadID == "" || callID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and call ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales users can update calls", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	var req models.UpdateCallRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}

	call, err := h.service.UpdateCall(c.Context(), leadID, callID, orgID, userID, &req)
	if err != nil {
		if errors.Is(err, services.ErrCallNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Call not found", "NOT_FOUND")
		}
		if err.Error() == "NO_UPDATES" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No fields to update", nil)
		}
		if strings.HasPrefix(err.Error(), "INVALID_TIMESTAMP") {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update call", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Call updated", fiber.Map{"call": call})
}

func (h *CallHandler) GetUploadURL(c *fiber.Ctx) error {
	leadID := c.Params("id")
	callID := c.Params("call_id")
	if leadID == "" || callID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and call ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales users can upload recordings", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	var req models.UploadURLRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if strings.TrimSpace(req.FileExtension) == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "file_extension is required", nil)
	}

	result, err := h.service.GetUploadURL(c.Context(), callID, orgID, leadID, req.FileExtension)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate upload URL", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Upload URL generated", result)
}
