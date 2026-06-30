package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"crownco/core-api/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// BookingService handles booking and document operations for the booking stage
type BookingService struct {
	DB      *pgxpool.Pool
	Lead    *LeadService
	Storage *StorageService
}

// NewBookingService creates a new BookingService
func NewBookingService(db *pgxpool.Pool, lead *LeadService, storage *StorageService) *BookingService {
	return &BookingService{DB: db, Lead: lead, Storage: storage}
}

// GetDocumentUploadURL generates a presigned PUT URL for uploading a booking document to B2.
func (s *BookingService) GetDocumentUploadURL(ctx context.Context, leadID, organizationID, userID, userRole, fileExtension string) (*models.UploadURLResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !bookingOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	if err := s.Lead.EnsureLeadBookingRowIfMissing(ctx, leadID, organizationID); err != nil {
		return nil, err
	}
	objectKey := fmt.Sprintf("booking-documents/%s/%s/%s.%s", organizationID, leadID, uuid.New().String(), fileExtension)
	uploadURL, err := s.Storage.GeneratePresignedUploadURL(ctx, objectKey, 1*time.Hour)
	if err != nil {
		return nil, err
	}
	return &models.UploadURLResponse{
		UploadURL: uploadURL,
		ObjectKey: objectKey,
	}, nil
}

func bookingOwnedBy(lead *models.LeadResponse, userID, userRole string) bool {
	if lead == nil || lead.AssignedToUserID == nil || lead.AssignedToUserType == nil {
		return false
	}
	return *lead.AssignedToUserID == userID && *lead.AssignedToUserType == userRole
}

func isBookingDocumentViewerRole(role string) bool {
	switch role {
	case "sales", "manager", "general-manager", "general_manager":
		return true
	default:
		return false
	}
}

func (s *BookingService) ensureLeadAccessForBookingDocuments(ctx context.Context, leadID, organizationID, userID, userRole string) error {
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return err
	}
	if userRole == "sales" && !bookingOwnedBy(lead, userID, userRole) {
		return ErrLeadForbidden
	}
	return nil
}

func (s *BookingService) applyBookingDocumentSignedURLs(ctx context.Context, doc *models.BookingDocumentResponse) {
	if doc == nil || s.Storage == nil {
		return
	}
	sign := func(p **string) {
		if p == nil || *p == nil {
			return
		}
		v := strings.TrimSpace(**p)
		if v == "" || strings.HasPrefix(v, "http://") || strings.HasPrefix(v, "https://") {
			return
		}
		u, err := s.Storage.GeneratePresignedDownloadURL(ctx, v, 1*time.Hour)
		if err != nil || u == "" {
			return
		}
		*p = &u
	}
	sign(&doc.DocumentFrontPhotoURL)
	sign(&doc.DocumentBackPhotoURL)
}

// GetBooking returns the lead's booking with project, unit, addons. Sales only.
func (s *BookingService) GetBooking(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.BookingResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if err := s.Lead.EnsureLeadBookingRowIfMissing(ctx, leadID, organizationID); err != nil {
		return nil, err
	}
	var bookID string
	err = s.DB.QueryRow(ctx, `SELECT id::text FROM lead_bookings WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&bookID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	return s.getBookingByID(ctx, bookID, organizationID)
}

func (s *BookingService) getBookingByID(ctx context.Context, bookingID, organizationID string) (*models.BookingResponse, error) {
	var b models.BookingResponse
	var id, leadUUID uuid.UUID
	var stageID, projectID, unitID *uuid.UUID
	var addonIDs []uuid.UUID
	var paymentProofImages []string
	var tokenDate, possessionDate *time.Time
	var paymentMode *string
	var createdAt, updatedAt time.Time

	query := `SELECT id, lead_id, stage_id, project_id, unit_id, addon_ids, final_total_price, token_amount, token_date,
		payment_mode::text, payment_transaction_id, payment_proof_images, emi_applicable, extra_charges_applicable,
		loan_amount, interest_rate, tenure_months, down_payment, monthly_emi, bank_name,
		maintenance_charges, legal_charges, stamp_duty, parking_charges,
		booking_status::text, possession_date_expected, remarks, created_at, updated_at
		FROM lead_bookings WHERE id = $1 AND organization_id = $2`
	err := s.DB.QueryRow(ctx, query, bookingID, organizationID).Scan(
		&id, &leadUUID, &stageID, &projectID, &unitID, &addonIDs,
		&b.FinalTotalPrice, &b.TokenAmount, &tokenDate, &paymentMode, &b.PaymentTransactionID, &paymentProofImages,
		&b.EMIApplicable, &b.ExtraChargesApplicable,
		&b.LoanAmount, &b.InterestRate, &b.TenureMonths, &b.DownPayment, &b.MonthlyEMI, &b.BankName,
		&b.MaintenanceCharges, &b.LegalCharges, &b.StampDuty, &b.ParkingCharges,
		&b.BookingStatus, &possessionDate, &b.Remarks, &createdAt, &updatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	b.ID = id.String()
	b.LeadID = leadUUID.String()
	b.CreatedAt = createdAt
	b.UpdatedAt = updatedAt
	if stageID != nil {
		ss := stageID.String()
		b.StageID = &ss
	}
	if projectID != nil {
		ss := projectID.String()
		b.ProjectID = &ss
	}
	if unitID != nil {
		ss := unitID.String()
		b.UnitID = &ss
	}
	for _, u := range addonIDs {
		b.AddonIDs = append(b.AddonIDs, u.String())
	}
	if tokenDate != nil {
		t := tokenDate.Format("2006-01-02")
		b.TokenDate = &t
	}
	if possessionDate != nil {
		p := possessionDate.Format("2006-01-02")
		b.PossessionDateExpected = &p
	}
	b.PaymentMode = paymentMode
	b.PaymentProofImages = paymentProofImages

	if projectID != nil {
		var title, ptype string
		var cover *string
		var amenities []string
		if s.DB.QueryRow(ctx, `SELECT project_title, project_type::text, project_cover_photo_url, amenities FROM projects WHERE id = $1`, projectID).Scan(&title, &ptype, &cover, &amenities) == nil {
			b.Project = &models.NegotiationProjectInfo{ID: projectID.String(), ProjectTitle: title, ProjectType: ptype, ProjectCoverPhotoURL: cover, Amenities: amenities}
		}
	}
	if unitID != nil {
		b.Unit = s.bookingScanUnitInfo(ctx, unitID.String())
	}
	if len(addonIDs) > 0 {
		b.Addons = s.bookingFetchAddonsByIDs(ctx, addonIDs)
	}
	return &b, nil
}

func (s *BookingService) bookingScanUnitInfo(ctx context.Context, unitID string) *models.NegotiationUnitInfo {
	var u models.NegotiationUnitInfo
	var status string
	err := s.DB.QueryRow(ctx, `SELECT id, name, floor, wing, unit_type::text, carpet_area, builtup_area, status::text, base_price, parking_price, infrastructure_cost, development_charges, water_charges, mseb_charges, legal_charges, stamp_duty, registration_fee, gst, vat, one_time_maintenance
		FROM project_units WHERE id = $1`, unitID).Scan(&u.ID, &u.Name, &u.Floor, &u.Wing, &u.UnitType, &u.CarpetArea, &u.BuiltupArea, &status, &u.BasePrice, &u.ParkingPrice, &u.InfrastructureCost, &u.DevelopmentCharges, &u.WaterCharges, &u.MsebCharges, &u.LegalCharges, &u.StampDuty, &u.RegistrationFee, &u.GST, &u.VAT, &u.OneTimeMaintenance)
	if err != nil {
		return nil
	}
	u.Status = status
	return &u
}

func (s *BookingService) bookingFetchAddonsByIDs(ctx context.Context, ids []uuid.UUID) []models.NegotiationAddonItem {
	if len(ids) == 0 {
		return nil
	}
	placeholders := make([]string, len(ids))
	args := make([]interface{}, len(ids))
	for i := range ids {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = ids[i]
	}
	query := fmt.Sprintf(`SELECT id, title, category::text, price FROM project_addons WHERE id IN (%s)`, strings.Join(placeholders, ","))
	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var list []models.NegotiationAddonItem
	for rows.Next() {
		var a models.NegotiationAddonItem
		var id uuid.UUID
		if rows.Scan(&id, &a.Title, &a.Category, &a.Price) == nil {
			a.ID = id.String()
			list = append(list, a)
		}
	}
	return list
}

// UpdateBooking updates the booking. Sales only; only when initiated or token_received.
func (s *BookingService) UpdateBooking(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.UpdateBookingRequest) (*models.BookingResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !bookingOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	if err := s.Lead.EnsureLeadBookingRowIfMissing(ctx, leadID, organizationID); err != nil {
		return nil, err
	}
	var bookID string
	var status string
	err = s.DB.QueryRow(ctx, `SELECT id::text, booking_status::text FROM lead_bookings WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&bookID, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if status != "initiated" && status != "token_received" {
		return nil, errors.New("BOOKING_NOT_EDITABLE")
	}

	updates := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{}
	argIdx := 1
	if req.FinalTotalPrice != nil {
		updates = append(updates, fmt.Sprintf("final_total_price = $%d", argIdx))
		args = append(args, *req.FinalTotalPrice)
		argIdx++
	}
	if req.TokenAmount != nil {
		updates = append(updates, fmt.Sprintf("token_amount = $%d", argIdx))
		args = append(args, *req.TokenAmount)
		argIdx++
	}
	if req.TokenDate != nil {
		updates = append(updates, fmt.Sprintf("token_date = $%d::date", argIdx))
		args = append(args, *req.TokenDate)
		argIdx++
	}
	if req.PaymentMode != nil {
		updates = append(updates, fmt.Sprintf("payment_mode = $%d::payment_mode", argIdx))
		args = append(args, *req.PaymentMode)
		argIdx++
	}
	if req.PaymentTransactionID != nil {
		updates = append(updates, fmt.Sprintf("payment_transaction_id = $%d", argIdx))
		args = append(args, *req.PaymentTransactionID)
		argIdx++
	}
	if req.PaymentProofImages != nil {
		updates = append(updates, fmt.Sprintf("payment_proof_images = $%d", argIdx))
		args = append(args, req.PaymentProofImages)
		argIdx++
	}
	if req.EMIApplicable != nil {
		updates = append(updates, fmt.Sprintf("emi_applicable = $%d", argIdx))
		args = append(args, *req.EMIApplicable)
		argIdx++
	}
	if req.ExtraChargesApplicable != nil {
		updates = append(updates, fmt.Sprintf("extra_charges_applicable = $%d", argIdx))
		args = append(args, *req.ExtraChargesApplicable)
		argIdx++
	}
	if req.LoanAmount != nil {
		updates = append(updates, fmt.Sprintf("loan_amount = $%d", argIdx))
		args = append(args, *req.LoanAmount)
		argIdx++
	}
	if req.InterestRate != nil {
		updates = append(updates, fmt.Sprintf("interest_rate = $%d", argIdx))
		args = append(args, *req.InterestRate)
		argIdx++
	}
	if req.TenureMonths != nil {
		updates = append(updates, fmt.Sprintf("tenure_months = $%d", argIdx))
		args = append(args, *req.TenureMonths)
		argIdx++
	}
	if req.DownPayment != nil {
		updates = append(updates, fmt.Sprintf("down_payment = $%d", argIdx))
		args = append(args, *req.DownPayment)
		argIdx++
	}
	if req.MonthlyEMI != nil {
		updates = append(updates, fmt.Sprintf("monthly_emi = $%d", argIdx))
		args = append(args, *req.MonthlyEMI)
		argIdx++
	}
	if req.BankName != nil {
		updates = append(updates, fmt.Sprintf("bank_name = $%d", argIdx))
		args = append(args, *req.BankName)
		argIdx++
	}
	if req.MaintenanceCharges != nil {
		updates = append(updates, fmt.Sprintf("maintenance_charges = $%d", argIdx))
		args = append(args, *req.MaintenanceCharges)
		argIdx++
	}
	if req.LegalCharges != nil {
		updates = append(updates, fmt.Sprintf("legal_charges = $%d", argIdx))
		args = append(args, *req.LegalCharges)
		argIdx++
	}
	if req.StampDuty != nil {
		updates = append(updates, fmt.Sprintf("stamp_duty = $%d", argIdx))
		args = append(args, *req.StampDuty)
		argIdx++
	}
	if req.ParkingCharges != nil {
		updates = append(updates, fmt.Sprintf("parking_charges = $%d", argIdx))
		args = append(args, *req.ParkingCharges)
		argIdx++
	}
	if req.PossessionDateExpected != nil {
		updates = append(updates, fmt.Sprintf("possession_date_expected = $%d::date", argIdx))
		args = append(args, *req.PossessionDateExpected)
		argIdx++
	}
	if req.Remarks != nil {
		updates = append(updates, fmt.Sprintf("remarks = $%d", argIdx))
		args = append(args, *req.Remarks)
		argIdx++
	}
	if len(args) == 0 {
		return nil, errors.New("NO_UPDATES")
	}
	args = append(args, bookID, organizationID)
	query := fmt.Sprintf(`UPDATE lead_bookings SET %s WHERE id = $%d AND organization_id = $%d`, strings.Join(updates, ", "), argIdx, argIdx+1)
	_, err = s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return s.getBookingByID(ctx, bookID, organizationID)
}

// SubmitBooking sets booking_status to token_received and leads.status to deal. Sales only.
func (s *BookingService) SubmitBooking(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.BookingResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !bookingOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	if err := s.Lead.EnsureLeadBookingRowIfMissing(ctx, leadID, organizationID); err != nil {
		return nil, err
	}
	var bookID string
	var status string
	err = s.DB.QueryRow(ctx, `SELECT id::text, booking_status::text FROM lead_bookings WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&bookID, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if status != "initiated" && status != "token_received" {
		return nil, errors.New("BOOKING_NOT_EDITABLE")
	}
	_, err = s.DB.Exec(ctx, `UPDATE lead_bookings SET booking_status = 'token_received', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, bookID)
	if err != nil {
		return nil, err
	}
	_, err = s.DB.Exec(ctx, `UPDATE leads SET status = 'deal', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND organization_id = $2`, leadID, organizationID)
	if err != nil {
		return nil, err
	}
	return s.getBookingByID(ctx, bookID, organizationID)
}

// ConfirmBooking sets booking_status to confirmed. GM/Manager only.
func (s *BookingService) ConfirmBooking(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.BookingResponse, error) {
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var bookID string
	var status string
	err = s.DB.QueryRow(ctx, `SELECT id::text, booking_status::text FROM lead_bookings WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&bookID, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if status == "cancelled" {
		return nil, errors.New("BOOKING_ALREADY_CANCELLED")
	}
	_, err = s.DB.Exec(ctx, `UPDATE lead_bookings SET booking_status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, bookID)
	if err != nil {
		return nil, err
	}
	return s.getBookingByID(ctx, bookID, organizationID)
}

// CancelBooking sets booking_status to cancelled and releases unit. Sales or GM/Manager.
func (s *BookingService) CancelBooking(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.BookingResponse, error) {
	if userRole != "sales" && userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return nil, ErrInvalidUserType
	}
	if userRole == "sales" {
		lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
		if err != nil {
			return nil, ErrLeadNotFound
		}
		if !bookingOwnedBy(lead, userID, userRole) {
			return nil, ErrLeadForbidden
		}
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var bookID string
	var unitID *uuid.UUID
	var status string
	err = s.DB.QueryRow(ctx, `SELECT id::text, unit_id, booking_status::text FROM lead_bookings WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&bookID, &unitID, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if status == "cancelled" {
		return nil, errors.New("BOOKING_ALREADY_CANCELLED")
	}
	_, err = s.DB.Exec(ctx, `UPDATE lead_bookings SET booking_status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, bookID)
	if err != nil {
		return nil, err
	}
	if unitID != nil {
		_, _ = s.DB.Exec(ctx, `UPDATE project_units SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, unitID)
	}
	return s.getBookingByID(ctx, bookID, organizationID)
}

// getLeadBookingID returns the booking ID for the lead in this org
func (s *BookingService) getLeadBookingID(ctx context.Context, leadID, organizationID string) (string, error) {
	var bookID string
	err := s.DB.QueryRow(ctx, `SELECT id::text FROM lead_bookings WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&bookID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrLeadNotFound
		}
		return "", err
	}
	return bookID, nil
}

// AddBookingDocument adds a document to the lead's booking. Sales only.
func (s *BookingService) AddBookingDocument(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.AddBookingDocumentRequest) (*models.BookingDocumentResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !bookingOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	if err := s.Lead.EnsureLeadBookingRowIfMissing(ctx, leadID, organizationID); err != nil {
		return nil, err
	}
	bookID, err := s.getLeadBookingID(ctx, leadID, organizationID)
	if err != nil {
		return nil, err
	}
	bookUUID, _ := uuid.Parse(bookID)
	var qInsert interface{}
	if req.QuotationID != nil && strings.TrimSpace(*req.QuotationID) != "" {
		qStr := strings.TrimSpace(*req.QuotationID)
		if _, perr := uuid.Parse(qStr); perr != nil {
			return nil, fmt.Errorf("invalid quotation_id")
		}
		var one int
		err = s.DB.QueryRow(ctx, `SELECT 1 FROM lead_quotations WHERE id = $1::uuid AND lead_id = $2::uuid AND organization_id = $3::uuid`,
			qStr, leadID, organizationID).Scan(&one)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrLeadNotFound
			}
			return nil, err
		}
		qInsert = qStr
	}
	var docID uuid.UUID
	err = s.DB.QueryRow(ctx, `INSERT INTO lead_booking_documents (lead_booking_id, document_name, document_type, document_number, document_front_photo_url, document_back_photo_url, remarks, quotation_id)
		VALUES ($1, $2, $3::document_type, $4, $5, $6, $7, $8) RETURNING id`,
		bookUUID, req.DocumentName, req.DocumentType, req.DocumentNumber, req.DocumentFrontPhotoURL, req.DocumentBackPhotoURL, req.Remarks, qInsert).Scan(&docID)
	if err != nil {
		return nil, err
	}
	return s.getBookingDocumentByID(ctx, bookID, docID.String(), organizationID)
}

// ListBookingDocuments returns all documents for the lead's booking. Sales (assigned) or Manager/GM.
func (s *BookingService) ListBookingDocuments(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.BookingDocumentListResponse, error) {
	if !isBookingDocumentViewerRole(userRole) {
		return nil, ErrInvalidUserType
	}
	if err := s.ensureLeadAccessForBookingDocuments(ctx, leadID, organizationID, userID, userRole); err != nil {
		return nil, err
	}
	bookID, err := s.getLeadBookingID(ctx, leadID, organizationID)
	if err != nil {
		return nil, err
	}
	bookUUID, _ := uuid.Parse(bookID)
	rows, err := s.DB.Query(ctx, `SELECT id::text FROM lead_booking_documents WHERE lead_booking_id = $1 ORDER BY uploaded_at DESC`, bookUUID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.BookingDocumentResponse
	for rows.Next() {
		var docID string
		if rows.Scan(&docID) == nil {
			doc, _ := s.getBookingDocumentByID(ctx, bookID, docID, organizationID)
			if doc != nil {
				list = append(list, *doc)
			}
		}
	}
	return &models.BookingDocumentListResponse{Documents: list}, nil
}

// GetBookingDocument returns one document. Sales (assigned) or Manager/GM.
func (s *BookingService) GetBookingDocument(ctx context.Context, leadID, docID, organizationID, userID, userRole string) (*models.BookingDocumentResponse, error) {
	if !isBookingDocumentViewerRole(userRole) {
		return nil, ErrInvalidUserType
	}
	if err := s.ensureLeadAccessForBookingDocuments(ctx, leadID, organizationID, userID, userRole); err != nil {
		return nil, err
	}
	bookID, err := s.getLeadBookingID(ctx, leadID, organizationID)
	if err != nil {
		return nil, err
	}
	return s.getBookingDocumentByID(ctx, bookID, docID, organizationID)
}

func (s *BookingService) getBookingDocumentByID(ctx context.Context, bookingID, docID, organizationID string) (*models.BookingDocumentResponse, error) {
	bookingUUID, err := uuid.Parse(bookingID)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	docUUID, err := uuid.Parse(docID)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var doc models.BookingDocumentResponse
	var id, leadBookingUUID uuid.UUID
	var docType string
	var uploadedAt time.Time
	var qID sql.NullString
	err = s.DB.QueryRow(ctx, `SELECT d.id, d.lead_booking_id, d.quotation_id::text, d.document_name, d.document_type::text, d.document_number, d.document_front_photo_url, d.document_back_photo_url, d.remarks, d.uploaded_at
		FROM lead_booking_documents d
		JOIN lead_bookings b ON b.id = d.lead_booking_id AND b.organization_id = $1
		WHERE d.id = $2 AND d.lead_booking_id = $3`,
		organizationID, docUUID, bookingUUID).Scan(&id, &leadBookingUUID, &qID, &doc.DocumentName, &docType, &doc.DocumentNumber, &doc.DocumentFrontPhotoURL, &doc.DocumentBackPhotoURL, &doc.Remarks, &uploadedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	doc.ID = id.String()
	doc.LeadBookingID = leadBookingUUID.String()
	if qID.Valid && strings.TrimSpace(qID.String) != "" {
		s := strings.TrimSpace(qID.String)
		doc.QuotationID = &s
	}
	doc.DocumentType = docType
	doc.UploadedAt = uploadedAt
	s.applyBookingDocumentSignedURLs(ctx, &doc)
	return &doc, nil
}

// UpdateBookingDocument updates a document. Sales only.
func (s *BookingService) UpdateBookingDocument(ctx context.Context, leadID, docID, organizationID, userID, userRole string, req *models.UpdateBookingDocumentRequest) (*models.BookingDocumentResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !bookingOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	bookID, err := s.getLeadBookingID(ctx, leadID, organizationID)
	if err != nil {
		return nil, err
	}
	// Verify document exists and belongs to this booking
	_, err = s.getBookingDocumentByID(ctx, bookID, docID, organizationID)
	if err != nil {
		return nil, err
	}
	updates := []string{}
	args := []interface{}{}
	argIdx := 1
	if req.DocumentName != nil {
		updates = append(updates, fmt.Sprintf("document_name = $%d", argIdx))
		args = append(args, *req.DocumentName)
		argIdx++
	}
	if req.DocumentType != nil {
		updates = append(updates, fmt.Sprintf("document_type = $%d::document_type", argIdx))
		args = append(args, *req.DocumentType)
		argIdx++
	}
	if req.DocumentNumber != nil {
		updates = append(updates, fmt.Sprintf("document_number = $%d", argIdx))
		args = append(args, *req.DocumentNumber)
		argIdx++
	}
	if req.DocumentFrontPhotoURL != nil {
		updates = append(updates, fmt.Sprintf("document_front_photo_url = $%d", argIdx))
		args = append(args, *req.DocumentFrontPhotoURL)
		argIdx++
	}
	if req.DocumentBackPhotoURL != nil {
		updates = append(updates, fmt.Sprintf("document_back_photo_url = $%d", argIdx))
		args = append(args, *req.DocumentBackPhotoURL)
		argIdx++
	}
	if req.Remarks != nil {
		updates = append(updates, fmt.Sprintf("remarks = $%d", argIdx))
		args = append(args, *req.Remarks)
		argIdx++
	}
	if len(args) == 0 {
		return nil, errors.New("NO_UPDATES")
	}
	docUUID, _ := uuid.Parse(docID)
	bookUUID, _ := uuid.Parse(bookID)
	args = append(args, docUUID, bookUUID)
	query := fmt.Sprintf(`UPDATE lead_booking_documents SET %s WHERE id = $%d AND lead_booking_id = $%d`, strings.Join(updates, ", "), argIdx, argIdx+1)
	_, err = s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return s.getBookingDocumentByID(ctx, bookID, docID, organizationID)
}

// DeleteBookingDocument deletes a document. Sales only.
func (s *BookingService) DeleteBookingDocument(ctx context.Context, leadID, docID, organizationID, userID, userRole string) error {
	if userRole != "sales" {
		return ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return ErrLeadNotFound
	}
	if !bookingOwnedBy(lead, userID, userRole) {
		return ErrLeadForbidden
	}
	bookID, err := s.getLeadBookingID(ctx, leadID, organizationID)
	if err != nil {
		return err
	}
	docUUID, err := uuid.Parse(docID)
	if err != nil {
		return ErrLeadNotFound
	}
	bookUUID, _ := uuid.Parse(bookID)
	result, err := s.DB.Exec(ctx, `DELETE FROM lead_booking_documents WHERE id = $1 AND lead_booking_id = $2`, docUUID, bookUUID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrLeadNotFound
	}
	return nil
}
