package handlers

import (
	"errors"
	"strconv"

	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// NegotiationHandler handles negotiation and quotation HTTP requests
type NegotiationHandler struct {
	service *services.NegotiationService
}

// NewNegotiationHandler creates a new NegotiationHandler
func NewNegotiationHandler(service *services.NegotiationService) *NegotiationHandler {
	return &NegotiationHandler{service: service}
}

func getAuth(c *fiber.Ctx) (userID, userRole string, err error) {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return "", "", errors.New("UNAUTHORIZED")
	}
	userRole, ok = c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return "", "", errors.New("INVALID_ROLE")
	}
	return userID, userRole, nil
}

func (h *NegotiationHandler) orgID(c *fiber.Ctx, userID, userRole string) (string, error) {
	return h.service.Lead.GetOrganizationID(c.Context(), userID, userRole)
}

// CreateNegotiation creates a new negotiation for the lead. Sales only.
func (h *NegotiationHandler) CreateNegotiation(c *fiber.Ctx) error {
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
	var req models.CreateNegotiationRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if req.ProjectID == "" || req.UnitID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "project_id and unit_id are required", nil)
	}
	neg, err := h.service.CreateNegotiation(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or negotiation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if err.Error() == "LEAD_NOT_IN_NEGOTIATION_STAGE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead is not in negotiation stage", nil)
		}
		if err.Error() == "NEGOTIATION_ALREADY_EXISTS" {
			// Kept for backward compatibility if service ever returns it again.
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Negotiation already exists for this lead", nil)
		}
		if err.Error() == "NEGOTIATION_DRAFT_EXISTS" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "An active draft negotiation already exists for this lead", nil)
		}
		if err.Error() == "UNIT_NOT_AVAILABLE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Unit is not available", nil)
		}
		if err.Error() == "NO_ACTIVE_NEGOTIATION_STAGE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No active negotiation stage for this lead", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create negotiation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Negotiation created successfully", fiber.Map{"negotiation": neg})
}

// GetNegotiation returns the lead's negotiation. Sales only.
func (h *NegotiationHandler) GetNegotiation(c *fiber.Ctx) error {
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
	neg, err := h.service.GetNegotiation(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or negotiation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get negotiation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Negotiation retrieved successfully", fiber.Map{"negotiation": neg})
}

// UpdateNegotiation updates the negotiation. Sales only; only when draft.
func (h *NegotiationHandler) UpdateNegotiation(c *fiber.Ctx) error {
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
	var req models.UpdateNegotiationRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	neg, err := h.service.UpdateNegotiation(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or negotiation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if err.Error() == "NEGOTIATION_NOT_EDITABLE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Negotiation can only be updated when status is draft", nil)
		}
		if err.Error() == "UNIT_NOT_AVAILABLE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Unit is not available", nil)
		}
		if err.Error() == "NO_UPDATES" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No fields to update", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update negotiation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Negotiation updated successfully", fiber.Map{"negotiation": neg})
}

// GetPriceBreakdown returns price breakdown for the lead's negotiation. Sales only.
func (h *NegotiationHandler) GetPriceBreakdown(c *fiber.Ctx) error {
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
	breakdown, err := h.service.GetPriceBreakdown(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or negotiation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get price breakdown", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Price breakdown retrieved successfully", fiber.Map{"price_breakdown": breakdown})
}

// SubmitNegotiation submits the negotiation for manager approval. Sales only.
func (h *NegotiationHandler) SubmitNegotiation(c *fiber.Ctx) error {
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
	neg, err := h.service.SubmitNegotiation(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or negotiation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if err.Error() == "NEGOTIATION_NOT_DRAFT" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Only draft negotiations can be submitted", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to submit negotiation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Negotiation submitted for approval", fiber.Map{"negotiation": neg})
}

// ApproveNegotiation approves the negotiation. GM/Manager only.
func (h *NegotiationHandler) ApproveNegotiation(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can approve negotiations", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	var req models.ApproveNegotiationRequest
	_ = c.BodyParser(&req)
	neg, err := h.service.ApproveNegotiation(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or negotiation not found", "NOT_FOUND")
		}
		if err.Error() == "NEGOTIATION_NOT_PENDING_APPROVAL" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Negotiation is not pending approval", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to approve negotiation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Negotiation approved", fiber.Map{"negotiation": neg})
}

// RejectNegotiation rejects the negotiation and releases unit. GM/Manager only.
func (h *NegotiationHandler) RejectNegotiation(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can reject negotiations", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	var req models.RejectNegotiationRequest
	_ = c.BodyParser(&req)
	neg, err := h.service.RejectNegotiation(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or negotiation not found", "NOT_FOUND")
		}
		if err.Error() == "NEGOTIATION_NOT_PENDING_APPROVAL" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Negotiation is not pending approval", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to reject negotiation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Negotiation rejected", fiber.Map{"negotiation": neg})
}

// CreateQuotation creates a quotation from the lead's negotiation. Sales only.
func (h *NegotiationHandler) CreateQuotation(c *fiber.Ctx) error {
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
	var req models.CreateQuotationRequest
	_ = c.BodyParser(&req)
	q, err := h.service.CreateQuotation(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or negotiation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create quotation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Quotation created successfully", fiber.Map{"quotation": q})
}

// ListQuotations lists quotations for the lead. Sales only.
func (h *NegotiationHandler) ListQuotations(c *fiber.Ctx) error {
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
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	result, err := h.service.ListQuotations(c.Context(), leadID, orgID, userID, userRole, page, limit)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list quotations", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Quotations retrieved successfully", fiber.Map{
		"quotations": result.Quotations,
		"pagination": result.Pagination,
	})
}

// GetQuotation returns one quotation. Sales only.
func (h *NegotiationHandler) GetQuotation(c *fiber.Ctx) error {
	leadID := c.Params("id")
	qid := c.Params("qid")
	if leadID == "" || qid == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and quotation ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	q, err := h.service.GetQuotation(c.Context(), leadID, qid, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Quotation not found", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get quotation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Quotation retrieved successfully", fiber.Map{"quotation": q})
}

// UpdateQuotation revises the quotation. Sales only.
func (h *NegotiationHandler) UpdateQuotation(c *fiber.Ctx) error {
	leadID := c.Params("id")
	qid := c.Params("qid")
	if leadID == "" || qid == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and quotation ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	var req models.UpdateQuotationRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	q, err := h.service.UpdateQuotation(c.Context(), leadID, qid, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Quotation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if err.Error() == "NO_UPDATES" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No fields to update", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update quotation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Quotation updated successfully", fiber.Map{"quotation": q})
}

// ApproveQuotation approves a quotation. Manager/GM only.
func (h *NegotiationHandler) ApproveQuotation(c *fiber.Ctx) error {
	leadID := c.Params("id")
	qid := c.Params("qid")
	if leadID == "" || qid == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and quotation ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can approve quotations", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	var req models.ApproveQuotationRequest
	_ = c.BodyParser(&req)
	q, err := h.service.ApproveQuotation(c.Context(), leadID, qid, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Quotation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted", "FORBIDDEN")
		}
		if err.Error() == "QUOTATION_ALREADY_APPROVED_FOR_LEAD" {
			return responses.ErrorResponseWithCode(c, fiber.StatusConflict, "Another quotation is already approved for this lead", "QUOTATION_ALREADY_APPROVED_FOR_LEAD")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to approve quotation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Quotation approved", fiber.Map{"quotation": q})
}

// RejectQuotation rejects a quotation. Manager/GM only.
func (h *NegotiationHandler) RejectQuotation(c *fiber.Ctx) error {
	leadID := c.Params("id")
	qid := c.Params("qid")
	if leadID == "" || qid == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and quotation ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can reject quotations", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	var req models.RejectQuotationRequest
	_ = c.BodyParser(&req)
	q, err := h.service.RejectQuotation(c.Context(), leadID, qid, orgID, userID, userRole, &req)
	if err != nil {
		if err.Error() == "REJECTION_REASON_REQUIRED" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest, "Rejection reason is required", "REJECTION_REASON_REQUIRED")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Quotation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to reject quotation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Quotation rejected", fiber.Map{"quotation": q})
}

// ShareQuotation marks quotation as shared. Sales only.
func (h *NegotiationHandler) ShareQuotation(c *fiber.Ctx) error {
	leadID := c.Params("id")
	qid := c.Params("qid")
	if leadID == "" || qid == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and quotation ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	var req models.ShareQuotationRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if req.SharedVia == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "shared_via is required (whatsapp, email, or pdf_download)", nil)
	}
	valid := map[string]bool{"whatsapp": true, "email": true, "pdf_download": true}
	if !valid[req.SharedVia] {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "shared_via must be whatsapp, email, or pdf_download", nil)
	}
	q, err := h.service.ShareQuotation(c.Context(), leadID, qid, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Quotation not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to share quotation", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Quotation marked as shared", fiber.Map{"quotation": q})
}

// ListQuotationsForOrg returns paginated quotations for visible leads (GET /api/v1/quotations).
func (h *NegotiationHandler) ListQuotationsForOrg(c *fiber.Ctx) error {
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
	tab := c.Query("tab", "all")
	q := c.Query("q", "")
	project := c.Query("project", "")
	sort := c.Query("sort", "date")
	order := c.Query("order", "desc")
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	result, err := h.service.ListQuotationsForOrg(c.Context(), orgID, userID, userRole, page, limit, tab, q, project, sort, order)
	if err != nil {
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Forbidden", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list quotations", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Quotations retrieved successfully", fiber.Map{
		"quotations": result.Quotations,
		"pagination": result.Pagination,
		"tab_counts": result.TabCounts,
	})
}

// GetQuotationStats returns KPI aggregates for quotations visible to the user (sales / manager / GM).
func (h *NegotiationHandler) GetQuotationStats(c *fiber.Ctx) error {
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	stats, err := h.service.GetQuotationStats(c.Context(), orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Forbidden", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to load quotation stats", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Quotation stats retrieved successfully", fiber.Map{"stats": stats})
}
