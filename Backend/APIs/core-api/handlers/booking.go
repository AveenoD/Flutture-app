package handlers

import (
	"errors"
	"strings"

	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// BookingHandler handles booking and document HTTP requests
type BookingHandler struct {
	service *services.BookingService
}

// NewBookingHandler creates a new BookingHandler
func NewBookingHandler(service *services.BookingService) *BookingHandler {
	return &BookingHandler{service: service}
}

func (h *BookingHandler) orgID(c *fiber.Ctx, userID, userRole string) (string, error) {
	return h.service.Lead.GetOrganizationID(c.Context(), userID, userRole)
}

// GetBooking returns the lead's booking. Sales only.
func (h *BookingHandler) GetBooking(c *fiber.Ctx) error {
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
	booking, err := h.service.GetBooking(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or booking not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get booking", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Booking retrieved successfully", fiber.Map{"booking": booking})
}

// UpdateBooking updates the booking. Sales only.
func (h *BookingHandler) UpdateBooking(c *fiber.Ctx) error {
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
	var req models.UpdateBookingRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	booking, err := h.service.UpdateBooking(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or booking not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		if err.Error() == "BOOKING_NOT_EDITABLE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Booking can only be updated when status is initiated or token_received", nil)
		}
		if err.Error() == "NO_UPDATES" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No fields to update", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update booking", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Booking updated successfully", fiber.Map{"booking": booking})
}

// SubmitBooking submits the booking (token received) and sets lead status to deal. Sales only.
func (h *BookingHandler) SubmitBooking(c *fiber.Ctx) error {
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
	booking, err := h.service.SubmitBooking(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or booking not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		if err.Error() == "BOOKING_NOT_EDITABLE" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Booking cannot be submitted in current status", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to submit booking", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Booking submitted; lead marked as deal", fiber.Map{"booking": booking})
}

// ConfirmBooking confirms the booking. GM/Manager only.
func (h *BookingHandler) ConfirmBooking(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can confirm bookings", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	booking, err := h.service.ConfirmBooking(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or booking not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only GM or Manager can confirm bookings", "FORBIDDEN")
		}
		if err.Error() == "BOOKING_ALREADY_CANCELLED" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Booking is already cancelled", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to confirm booking", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Booking confirmed", fiber.Map{"booking": booking})
}

// CancelBooking cancels the booking and releases the unit. Sales or GM/Manager.
func (h *BookingHandler) CancelBooking(c *fiber.Ctx) error {
	leadID := c.Params("id")
	if leadID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID is required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	if userRole != "sales" && userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Only sales, GM or Manager can cancel bookings", "FORBIDDEN")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	booking, err := h.service.CancelBooking(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or booking not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted", "FORBIDDEN")
		}
		if err.Error() == "BOOKING_ALREADY_CANCELLED" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "Booking is already cancelled", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to cancel booking", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Booking cancelled", fiber.Map{"booking": booking})
}

// GetDocumentUploadURL returns a presigned PUT URL for uploading a document file to B2.
func (h *BookingHandler) GetDocumentUploadURL(c *fiber.Ctx) error {
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
	var req models.UploadURLRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if strings.TrimSpace(req.FileExtension) == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "file_extension is required", nil)
	}
	result, err := h.service.GetDocumentUploadURL(c.Context(), leadID, orgID, userID, userRole, req.FileExtension)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or booking not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to generate upload URL", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Upload URL generated", result)
}

// AddBookingDocument adds a document to the booking. Sales only.
func (h *BookingHandler) AddBookingDocument(c *fiber.Ctx) error {
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
	var req models.AddBookingDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	if strings.TrimSpace(req.DocumentName) == "" || strings.TrimSpace(req.DocumentType) == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "document_name and document_type are required", nil)
	}
	doc, err := h.service.AddBookingDocument(c.Context(), leadID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or booking not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to add document", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusCreated, "Document added successfully", fiber.Map{"document": doc})
}

// ListBookingDocuments lists documents for the booking. Sales only.
func (h *BookingHandler) ListBookingDocuments(c *fiber.Ctx) error {
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
	result, err := h.service.ListBookingDocuments(c.Context(), leadID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Lead or booking not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales or manager role", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to list documents", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Documents retrieved successfully", fiber.Map{"documents": result.Documents})
}

// GetBookingDocument returns one document. Sales only.
func (h *BookingHandler) GetBookingDocument(c *fiber.Ctx) error {
	leadID := c.Params("id")
	docID := c.Params("did")
	if leadID == "" || docID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and document ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	doc, err := h.service.GetBookingDocument(c.Context(), leadID, docID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Document not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales or manager role", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to get document", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Document retrieved successfully", fiber.Map{"document": doc})
}

// UpdateBookingDocument updates a document. Sales only.
func (h *BookingHandler) UpdateBookingDocument(c *fiber.Ctx) error {
	leadID := c.Params("id")
	docID := c.Params("did")
	if leadID == "" || docID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and document ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	var req models.UpdateBookingDocumentRequest
	if err := c.BodyParser(&req); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body", map[string]string{"error": err.Error()})
	}
	doc, err := h.service.UpdateBookingDocument(c.Context(), leadID, docID, orgID, userID, userRole, &req)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Document not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		if err.Error() == "NO_UPDATES" {
			return responses.ErrorResponse(c, fiber.StatusBadRequest, "No fields to update", nil)
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to update document", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Document updated successfully", fiber.Map{"document": doc})
}

// DeleteBookingDocument deletes a document. Sales only.
func (h *BookingHandler) DeleteBookingDocument(c *fiber.Ctx) error {
	leadID := c.Params("id")
	docID := c.Params("did")
	if leadID == "" || docID == "" {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Lead ID and document ID are required", nil)
	}
	userID, userRole, err := getAuth(c)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized, "User context required", "UNAUTHORIZED")
	}
	orgID, err := h.orgID(c, userID, userRole)
	if err != nil {
		return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Failed to get organization", "FORBIDDEN")
	}
	err = h.service.DeleteBookingDocument(c.Context(), leadID, docID, orgID, userID, userRole)
	if err != nil {
		if errors.Is(err, services.ErrLeadNotFound) {
			return responses.ErrorResponseWithCode(c, fiber.StatusNotFound, "Document not found", "NOT_FOUND")
		}
		if errors.Is(err, services.ErrLeadForbidden) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Lead is not assigned to you", "FORBIDDEN")
		}
		if errors.Is(err, services.ErrInvalidUserType) {
			return responses.ErrorResponseWithCode(c, fiber.StatusForbidden, "Access restricted to sales role", "FORBIDDEN")
		}
		return responses.ErrorResponse(c, fiber.StatusInternalServerError, "Failed to delete document", map[string]string{"error": err.Error()})
	}
	return responses.SuccessResponse(c, fiber.StatusOK, "Document deleted successfully", nil)
}
