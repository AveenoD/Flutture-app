package handlers

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

type WhatsAppHandler struct {
	service *services.WhatsAppService
}

func NewWhatsAppHandler(service *services.WhatsAppService) *WhatsAppHandler {
	return &WhatsAppHandler{service: service}
}

func (h *WhatsAppHandler) orgID(c *fiber.Ctx, userID, userRole string) (string, error) {
	return h.service.Lead.GetOrganizationID(c.Context(), userID, userRole)
}

func (h *WhatsAppHandler) SendMessage(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales users can send messages", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	var req models.SendWhatsAppMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if req.LeadStageID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "lead_stage_id is required", nil)
	}
	if req.MessageType == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "message_type is required", nil)
	}
	if req.MessageType == "text" && (req.MessageText == nil || *req.MessageText == "") {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "message_text is required for text messages", nil)
	}
	if req.MessageType == "template" && (req.TemplateName == nil || *req.TemplateName == "") {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "template_name is required for template messages", nil)
	}

	msg, err := h.service.SendMessage(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrWAAccountNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "No active WhatsApp account for this organization", "WA_ACCOUNT_NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrWAStageNotActive) {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest, "Stage is not active, cannot send messages", "STAGE_NOT_ACTIVE")
		}
		if errors.Is(err, services.ErrWAWindowExpired) {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest, "24-hour window expired. Use template messages.", "24H_WINDOW_EXPIRED")
		}
		if err.Error() == "INVALID_STAGE_ID" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid lead_stage_id", nil)
		}
		errStr := err.Error()
		if strings.Contains(errStr, "message stored but Meta API send failed") {
			return responses.SuccessResponse(c, fiber.StatusCreated, "Message stored but WhatsApp delivery failed", fiber.Map{"message": msg, "warning": errStr})
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to send message", map[string]string{"error": errStr})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Message sent", fiber.Map{"message": msg})
}

func (h *WhatsAppHandler) GetConversations(c *fiber.Ctx) error {
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

	result, err := h.service.GetConversations(c.Context(), leadID, orgID, page, limit)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get conversations", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Conversations retrieved", result)
}

func (h *WhatsAppHandler) GetMessages(c *fiber.Ctx) error {
	leadID := c.Params("id")
	convID := c.Params("conv_id")
	if leadID == "" || convID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and conversation ID are required", nil)
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
	limit, _ := strconv.Atoi(c.Query("limit", "50"))

	result, err := h.service.GetMessages(c.Context(), leadID, convID, orgID, page, limit)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get messages", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Messages retrieved", result)
}

func (h *WhatsAppHandler) GetMediaUploadURL(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales users can upload media", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	var req models.WAMediaUploadURLRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if strings.TrimSpace(req.FileExtension) == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "file_extension is required", nil)
	}

	result, err := h.service.GetMediaUploadURL(c.Context(), leadID, orgID, req.FileExtension)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate upload URL", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Upload URL generated", result)
}

func (h *WhatsAppHandler) ListTemplates(c *fiber.Ctx) error {
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	templates, err := h.service.ListTemplates(c.Context(), orgID)
	if err != nil {
		if errors.Is(err, services.ErrWAAccountNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "No active WhatsApp account", "WA_ACCOUNT_NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list templates", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Templates retrieved", fiber.Map{"templates": templates})
}

func (h *WhatsAppHandler) SSELive(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	_, _, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	ch := h.service.Hub.Subscribe(leadID)

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer h.service.Hub.Unsubscribe(leadID, ch)

		// Send initial keepalive
		fmt.Fprintf(w, ": connected\n\n")
		w.Flush()

		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case event, ok := <-ch:
				if !ok {
					return
				}
				data, _ := json.Marshal(event)
				fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Type, string(data))
				if err := w.Flush(); err != nil {
					return
				}
			case <-ticker.C:
				fmt.Fprintf(w, ": keepalive\n\n")
				if err := w.Flush(); err != nil {
					return
				}
			}
		}
	})

	return nil
}
