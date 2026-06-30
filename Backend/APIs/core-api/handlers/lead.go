package handlers

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// LeadHandler handles lead HTTP requests
type LeadHandler struct {
	service *services.LeadService
	storage *services.StorageService
}

// NewLeadHandler creates a new LeadHandler
func NewLeadHandler(service *services.LeadService, storage *services.StorageService) *LeadHandler {
	return &LeadHandler{service: service, storage: storage}
}

// ListLeads returns leads with role-based visibility and filters
func (h *LeadHandler) ListLeads(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}

	if userRole == "manager" {
		has, err := h.service.ManagerHasViewLeads(c.Context(), userID)
		if err != nil || !has {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Permission denied: view_leads required", "PERMISSION_DENIED")
		}
	}

	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	filters := map[string]string{
		"page":               c.Query("page"),
		"limit":              c.Query("limit"),
		"status":             c.Query("status"),
		"stage":              c.Query("stage"),
		"lead_temperature":   c.Query("lead_temperature"),
		"source":             c.Query("source"),
		"exclude_source":     c.Query("exclude_source"),
		"priority":           c.Query("priority"),
		"city":               c.Query("city"),
		"state":              c.Query("state"),
		"search":             c.Query("search"),
		"created_after":      c.Query("created_after"),
		"created_before":     c.Query("created_before"),
		"assigned_to_user_id": c.Query("assigned_to_user_id"),
		"project_id":         c.Query("project_id"),
	}

	result, err := h.service.ListLeads(c.Context(), orgID, userID, userRole, filters)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list leads", map[string]string{"error": err.Error()})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Leads retrieved successfully", fiber.Map{
		"leads":       result.Leads,
		"pagination": result.Pagination,
	})
}

// ListAssignedLeads returns leads assigned to the current sales user (sales only). Supports filter=assigned|pending|all.
func (h *LeadHandler) ListAssignedLeads(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only sales can list assigned leads", "FORBIDDEN")
	}

	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	filters := map[string]string{
		"page":               c.Query("page"),
		"limit":              c.Query("limit"),
		"status":             c.Query("status"),
		"stage":              c.Query("stage"),
		"lead_temperature":   c.Query("lead_temperature"),
		"source":             c.Query("source"),
		"priority":           c.Query("priority"),
		"city":               c.Query("city"),
		"state":              c.Query("state"),
		"search":             c.Query("search"),
		"created_after":      c.Query("created_after"),
		"created_before":     c.Query("created_before"),
		"assigned_filter":    c.Query("filter"), // assigned|pending|all
	}

	result, err := h.service.ListLeads(c.Context(), orgID, userID, userRole, filters)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list assigned leads", map[string]string{"error": err.Error()})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Assigned leads retrieved successfully", fiber.Map{
		"leads":       result.Leads,
		"pagination": result.Pagination,
	})
}

// ListRejectedLeads returns rejected leads with rejection reasons. GM and Manager only.
func (h *LeadHandler) ListRejectedLeads(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can view rejected leads", "FORBIDDEN")
	}
	if userRole == "manager" {
		has, err := h.service.ManagerHasViewLeads(c.Context(), userID)
		if err != nil || !has {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Permission denied: view_leads required", "PERMISSION_DENIED")
		}
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	filters := map[string]string{
		"page":   c.Query("page"),
		"limit":  c.Query("limit"),
		"search": c.Query("search"),
		"city":   c.Query("city"),
	}
	result, err := h.service.ListRejectedLeads(c.Context(), orgID, userID, userRole, filters)
	if err != nil {
		if err.Error() == "FORBIDDEN" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can view rejected leads", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list rejected leads", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Rejected leads retrieved successfully", fiber.Map{
		"rejected_leads": result.RejectedLeads,
		"pagination":     result.Pagination,
	})
}

// GetLeadSummary returns lead summary for sales: profile, presales user, recent calls, messages, remarks, interested property. Sales only.
func (h *LeadHandler) GetLeadSummary(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest, "Lead ID required", "BAD_REQUEST")
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only sales can get lead summary", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	result, err := h.service.GetLeadSummary(c.Context(), leadID, orgID, userID)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found or not visible", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get lead summary", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Lead summary retrieved successfully", result)
}

// GetLead returns a single lead by ID if visible to the user
func (h *LeadHandler) GetLead(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}

	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}

	if userRole == "manager" {
		has, err := h.service.ManagerHasViewLeads(c.Context(), userID)
		if err != nil || !has {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Permission denied: view_leads required", "PERMISSION_DENIED")
		}
	}

	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	lead, err := h.service.GetLeadByID(c.Context(), leadID, orgID, userID, userRole)
	if err != nil || lead == nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found", "NOT_FOUND")
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Lead retrieved successfully", fiber.Map{"lead": lead})
}

// UpdateLead updates general lead fields. All roles can update their visible leads; GM/Manager can update any org lead.
func (h *LeadHandler) UpdateLead(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}

	var req models.UpdateLeadRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}

	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}

	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}

	lead, err := h.service.UpdateLead(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found or not visible", "NOT_FOUND")
		}
		if err.Error() == "NO_UPDATES" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No fields to update", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update lead", map[string]string{"error": err.Error()})
	}

	return responses.SuccessResponse(c, fiber.StatusOK, "Lead updated successfully", fiber.Map{"lead": lead})
}

// AcceptLead accepts a lead by the assigned sales user (sets sales_accepted_at and assigns lead to sales). Sales only.
func (h *LeadHandler) AcceptLead(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only sales can accept a lead", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	lead, err := h.service.AcceptLeadBySales(c.Context(), leadID, orgID, userID)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found or not pending your acceptance", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to accept lead", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Lead accepted successfully", fiber.Map{"lead": lead})
}

// parseLeadStatsDateRange parses from_date, to_date and optional period (e.g. 30d) from query params. Returns nil,nil for all-time.
func parseLeadStatsDateRange(c *fiber.Ctx) (fromDate, toDate *time.Time, err error) {
	fromStr := c.Query("from_date")
	toStr := c.Query("to_date")
	if fromStr != "" || toStr != "" {
		if fromStr == "" || toStr == "" {
			return nil, nil, errors.New("both from_date and to_date are required when using date range")
		}
		tFrom, e := time.Parse("2006-01-02", fromStr)
		if e != nil {
			return nil, nil, e
		}
		tTo, e := time.Parse("2006-01-02", toStr)
		if e != nil {
			return nil, nil, e
		}
		fromDate = &tFrom
		toDate = &tTo
	} else if period := c.Query("period"); period == "30d" {
		now := time.Now()
		end := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
		start := end.AddDate(0, 0, -30)
		fromDate = &start
		toDate = &end
	}
	return fromDate, toDate, nil
}

// GetLeadStats returns aggregate stats for all leads assigned to the current user. Presales/Sales only.
func (h *LeadHandler) GetLeadStats(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	fromDate, toDate, err := parseLeadStatsDateRange(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid date range (use from_date, to_date as YYYY-MM-DD or period=30d)", map[string]string{"error": err.Error()})
	}
	stats, err := h.service.GetLeadStats(c.Context(), orgID, userID, userRole, fromDate, toDate)
	if err != nil {
		if err.Error() == "INVALID_USER_TYPE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can view lead stats", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get lead stats", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Lead stats retrieved successfully", stats)
}

// GetLeadStatsForLead returns stats for a single lead. Presales/Sales; lead must be assigned.
func (h *LeadHandler) GetLeadStatsForLead(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	fromDate, toDate, err := parseLeadStatsDateRange(c)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid date range (use from_date, to_date as YYYY-MM-DD or period=30d)", map[string]string{"error": err.Error()})
	}
	stats, err := h.service.GetLeadStatsForLead(c.Context(), leadID, orgID, userID, userRole, fromDate, toDate)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found", "NOT_FOUND")
		}
		if err.Error() == "INVALID_USER_TYPE" {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can view lead stats", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get lead stats", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Lead stats retrieved successfully", stats)
}

// QualifyLead sets lead status to qualified and optionally enriches profile. Presales only.
func (h *LeadHandler) QualifyLead(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	var req models.QualifyLeadRequest
	if err := c.BodyParser(&req); err != nil && len(c.Body()) > 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales can qualify a lead", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	lead, err := h.service.QualifyLead(c.Context(), leadID, orgID, userID, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) || strings.Contains(err.Error(), "LEAD_NOT_FOUND") {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to qualify lead", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Lead qualified successfully", fiber.Map{"lead": lead})
}

// MarkLeadConnected sets lead status to called. Presales only.
func (h *LeadHandler) MarkLeadConnected(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales can mark lead connected", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	lead, err := h.service.MarkLeadConnected(c.Context(), leadID, orgID, userID)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) || strings.Contains(err.Error(), "LEAD_NOT_FOUND") {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to mark lead connected", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Lead marked connected successfully", fiber.Map{"lead": lead})
}

// ListRejectionQuestions returns active rejection questions. Presales or Sales.
func (h *LeadHandler) ListRejectionQuestions(c *fiber.Ctx) error {
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can view rejection questions", "FORBIDDEN")
	}
	category := c.Query("category")
	result, err := h.service.ListRejectionQuestions(c.Context(), category)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list rejection questions", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Rejection questions retrieved", fiber.Map{"questions": result.Questions})
}

// RejectLead rejects the lead with reasons. Presales or Sales; lead must be assigned to current user.
func (h *LeadHandler) RejectLead(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	var req models.RejectLeadRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if len(req.QuestionsResponse) == 0 {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "questions_response is required and must not be empty", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can reject a lead", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	data, err := h.service.RejectLead(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) || strings.Contains(err.Error(), "LEAD_NOT_FOUND") {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to reject lead", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Lead rejected successfully", fiber.Map{
		"lead_id":      data.LeadID,
		"rejection_id": data.RejectionID,
		"lead":         data.Lead,
	})
}

// CreateFollowUp creates a follow-up for a lead stage. Presales or Sales; lead must be assigned. Remark is required.
func (h *LeadHandler) CreateFollowUp(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	var req models.CreateFollowUpRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if strings.TrimSpace(req.Remark) == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "remark is required and must be non-empty", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can create follow-ups", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	fu, err := h.service.CreateFollowUp(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or stage not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create follow-up", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Follow-up created successfully", fiber.Map{"follow_up": fu})
}

// GetFollowUp returns follow-up details with stage and linked call (recording). Presales or Sales; lead must be assigned.
func (h *LeadHandler) GetFollowUp(c *fiber.Ctx) error {
	leadID := c.Params("id")
	followupID := c.Params("followup_id")
	if leadID == "" || followupID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and follow-up ID are required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can get follow-up details", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	result, err := h.service.GetFollowUpByID(c.Context(), leadID, followupID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or follow-up not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get follow-up details", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Follow-up details retrieved successfully", fiber.Map{
		"follow_up":    result.FollowUp,
		"stage":        result.Stage,
		"linked_call": result.LinkedCall,
	})
}

// CompleteFollowUp marks follow-up as completed with outcome. Presales or Sales; lead must be assigned. Outcome is required.
func (h *LeadHandler) CompleteFollowUp(c *fiber.Ctx) error {
	leadID := c.Params("id")
	followupID := c.Params("followup_id")
	if leadID == "" || followupID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and follow-up ID are required", nil)
	}
	var req models.CompleteFollowUpRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	validOutcomes := map[string]bool{"interested": true, "not_interested": true, "follow_up": true, "no_response": true}
	if !validOutcomes[req.Outcome] {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "invalid outcome; use interested, not_interested, follow_up, or no_response", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can complete follow-ups", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	fu, err := h.service.CompleteFollowUp(c.Context(), leadID, followupID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or follow-up not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to complete follow-up", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Follow-up completed successfully", fiber.Map{"follow_up": fu})
}

// DeleteFollowUp deletes a follow-up. Presales or Sales; lead must be assigned.
func (h *LeadHandler) DeleteFollowUp(c *fiber.Ctx) error {
	leadID := c.Params("id")
	followupID := c.Params("followup_id")
	if leadID == "" || followupID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and follow-up ID are required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can delete follow-ups", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	err = h.service.DeleteFollowUp(c.Context(), leadID, followupID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or follow-up not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete follow-up", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Follow-up deleted successfully", fiber.Map{"followup_id": followupID})
}

// CreateVisit creates a new property visit. Presales or Sales; lead must be assigned.
func (h *LeadHandler) CreateVisit(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	var req models.CreateVisitRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if req.VisitDate == "" || req.VisitTime == "" || req.VisitType == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "visit_date, visit_time, and visit_type are required", nil)
	}
	validTypes := map[string]bool{"first_visit": true, "revisit": true}
	if !validTypes[req.VisitType] {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "invalid visit_type; use first_visit or revisit", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can create visits", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	visit, err := h.service.CreateVisit(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found, not assigned, or project not found", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to create visit", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Visit created successfully", fiber.Map{"visit": visit})
}

// GetVisit returns a single property visit. Presales or Sales; lead must be assigned.
func (h *LeadHandler) GetVisit(c *fiber.Ctx) error {
	leadID := c.Params("id")
	visitID := c.Params("visit_id")
	if leadID == "" || visitID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and visit ID are required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can view visits", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	result, err := h.service.GetVisit(c.Context(), leadID, visitID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or visit not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get visit", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Visit retrieved successfully", result)
}

// UpdateVisit updates a visit (images, remarks, outcome, status/complete). Presales or Sales; lead must be assigned.
func (h *LeadHandler) UpdateVisit(c *fiber.Ctx) error {
	leadID := c.Params("id")
	visitID := c.Params("visit_id")
	if leadID == "" || visitID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and visit ID are required", nil)
	}
	var req models.UpdateVisitRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if req.Outcome != nil {
		validOutcomes := map[string]bool{"interested": true, "not_interested": true, "follow_up": true, "negotiation_started": true}
		if !validOutcomes[*req.Outcome] {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "invalid outcome; use interested, not_interested, follow_up, or negotiation_started", nil)
		}
	}
	if req.Status != nil {
		validStatuses := map[string]bool{"scheduled": true, "completed": true, "delayed_by_client": true, "missed_by_sales_person": true}
		if !validStatuses[*req.Status] {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "invalid status", nil)
		}
	}
	fmt.Printf("UpdateVisit payload lead=%s visit=%s status=%v outcome=%v images=%v remarks=%v\n", leadID, visitID, req.Status, req.Outcome, req.SiteVisitImages, req.Remarks)
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can update visits", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	visit, err := h.service.UpdateVisit(c.Context(), leadID, visitID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or visit not found or not assigned", "NOT_FOUND")
		}
		if err.Error() == "NO_UPDATES" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No fields to update", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update visit", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Visit updated successfully", fiber.Map{"visit": visit})
}

// RescheduleVisit reschedules a visit with delay reason. Presales or Sales; lead must be assigned.
func (h *LeadHandler) RescheduleVisit(c *fiber.Ctx) error {
	leadID := c.Params("id")
	visitID := c.Params("visit_id")
	if leadID == "" || visitID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and visit ID are required", nil)
	}
	var req models.RescheduleVisitRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if req.VisitDate == "" || req.VisitTime == "" || req.DelayReason == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "visit_date, visit_time, and delay_reason are required", nil)
	}
	validReasons := map[string]bool{"client_unavailable": true, "traffic": true, "weather": true, "sales_unavailable": true, "other": true}
	if !validReasons[req.DelayReason] {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "invalid delay_reason; use client_unavailable, traffic, weather, sales_unavailable, or other", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can reschedule visits", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	visit, err := h.service.RescheduleVisit(c.Context(), leadID, visitID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or visit not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to reschedule visit", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Visit rescheduled successfully", fiber.Map{"visit": visit})
}

// ForwardLeadToStage moves lead to next stage. Presales or Sales (see service rules).
func (h *LeadHandler) ForwardLeadToStage(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	var req models.ForwardStageRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if req.NextStage == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "next_stage is required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can forward lead stage", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	lead, err := h.service.ForwardLeadToStage(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) || strings.Contains(err.Error(), "LEAD_NOT_FOUND") {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found or not assigned", "NOT_FOUND")
		}
		if err.Error() == "INVALID_NEXT_STAGE" || err.Error() == "INVALID_CURRENT_STAGE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, err.Error(), nil)
		}
		if err.Error() == "QUOTATION_APPROVAL_REQUIRED" {
			return responses.ErrorResponseWithCode(c, fiber.StatusBadRequest, "At least one quotation must be approved by manager before moving to booking", "QUOTATION_APPROVAL_REQUIRED")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to forward stage", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Lead stage updated successfully", fiber.Map{"lead": lead})
}

// GetLeadsByStage returns leads in the given stage with follow-ups, remarks, recent calls, whatsapp. Presales only.
func (h *LeadHandler) GetLeadsByStage(c *fiber.Ctx) error {
	stage := c.Params("stage")
	if stage == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Stage is required", nil)
	}
	allowedStages := map[string]bool{"qualification": true, "communication": true, "property_visit": true}
	if !allowedStages[stage] {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid stage; use qualification, communication, or property_visit", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales can get leads by stage", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	filters := map[string]string{
		"page":   c.Query("page"),
		"limit":  c.Query("limit"),
		"search": c.Query("search"),
	}
	result, err := h.service.GetLeadsByStageWithDetails(c.Context(), orgID, userID, stage, filters)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list leads by stage", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Leads by stage retrieved successfully", fiber.Map{
		"leads":      result.Leads,
		"pagination": result.Pagination,
	})
}

// GetLeadStageByType returns a lead's stage by type (e.g. communication) with recent calls (with recording), WhatsApp conversations/messages, remarks, and follow-ups. Presales (all types); Sales (property_visit, booking). Lead must be assigned.
func (h *LeadHandler) GetLeadStageByType(c *fiber.Ctx) error {
	leadID := c.Params("id")
	stageType := c.Params("stage_type")
	if leadID == "" || stageType == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and stage type are required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && !(userRole == "sales" && (stageType == "property_visit" || stageType == "booking" || stageType == "negotiation")) {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales can get stage by type (sales: property_visit, negotiation, booking)", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	result, err := h.service.GetLeadStageByType(c.Context(), leadID, stageType, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or stage not found or not assigned", "NOT_FOUND")
		}
		if err.Error() == "INVALID_STAGE_TYPE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid stage type; use qualification, communication, property_visit, negotiation, or booking", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get stage details", map[string]string{"error": err.Error()})
	}
	data := fiber.Map{
		"stage":                  result.Stage,
		"recent_calls":           result.RecentCalls,
		"follow_ups":             result.FollowUps,
		"whatsapp_conversations": result.WhatsAppConversations,
	}
	if len(result.Visits) > 0 {
		data["visits"] = result.Visits
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Stage details retrieved successfully", data)
}

// GetLeadStage returns stage details (remarks + calls with recording) for a lead stage. Presales or Sales; lead must be assigned.
func (h *LeadHandler) GetLeadStage(c *fiber.Ctx) error {
	leadID := c.Params("id")
	stageID := c.Params("stage_id")
	if leadID == "" || stageID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and stage ID are required", nil)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can get stage details", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	result, err := h.service.GetLeadStageByID(c.Context(), leadID, stageID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or stage not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get stage details", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Stage details retrieved successfully", fiber.Map{
		"stage": result.Stage,
		"calls": result.Calls,
	})
}

// AddLeadStageRemark adds or updates remarks on a specific stage of a lead. Presales can add to any stage; Sales only for property_visit stage (lead must be assigned).
func (h *LeadHandler) AddLeadStageRemark(c *fiber.Ctx) error {
	leadID := c.Params("id")
	stageID := c.Params("stage_id")
	if leadID == "" || stageID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and stage ID are required", nil)
	}
	var req models.AddStageRemarkRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	userRole, ok := c.Locals("user_role").(string)
	if !ok || userRole == "" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Invalid user role", "INVALID_ROLE")
	}
	if userRole != "presales" && userRole != "sales" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only presales or sales can add stage remarks", "FORBIDDEN")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	result, err := h.service.AddLeadStageRemark(c.Context(), leadID, stageID, orgID, userID, userRole, req.Remarks)
	if err != nil {
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you for this action", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or stage not found or not assigned", "NOT_FOUND")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to add stage remarks", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Stage remarks updated successfully", fiber.Map{"stage": result})
}

// GetVisitImageUploadURL returns a presigned PUT URL for uploading a site visit image to B2.
func (h *LeadHandler) GetVisitImageUploadURL(c *fiber.Ctx) error {
	leadID := c.Params("id")
	visitID := c.Params("visit_id")
	if leadID == "" || visitID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and Visit ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.service.GetOrganizationID(c.Context(), userID, userRole)
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
	// Verify lead exists and is accessible
	_, err = h.service.GetLeadByID(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead not found", "NOT_FOUND")
	}
	objectKey := fmt.Sprintf("visit-images/%s/%s/%s/%s.%s", orgID, leadID, visitID, uuid.New().String(), req.FileExtension)
	uploadURL, err := h.storage.GeneratePresignedUploadURL(c.Context(), objectKey, 1*time.Hour)
	if err != nil {
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate upload URL", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Upload URL generated", &models.UploadURLResponse{
		UploadURL: uploadURL,
		ObjectKey: objectKey,
	})
}
