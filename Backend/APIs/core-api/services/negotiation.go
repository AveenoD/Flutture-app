package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"crownco/core-api/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrInvalidUserType is returned when the user role is not   permitted for the operation
var ErrInvalidUserType = errors.New("INVALID_USER_TYPE")

// NegotiationService handles negotiation and quotation operations
type NegotiationService struct {
	DB   *pgxpool.Pool
	Lead *LeadService
}

// NewNegotiationService creates a new NegotiationService
func NewNegotiationService(db *pgxpool.Pool, lead *LeadService) *NegotiationService {
	return &NegotiationService{DB: db, Lead: lead}
}

func negotiationOwnedBy(lead *models.LeadResponse, userID, userRole string) bool {
	if lead == nil || lead.AssignedToUserID == nil || lead.AssignedToUserType == nil {
		return false
	}
	return *lead.AssignedToUserID == userID && *lead.AssignedToUserType == userRole
}

// CreateNegotiation creates a new negotiation for the lead. Sales only; lead must be in negotiation stage and assigned to user.
// A lead can have multiple negotiations over time, but only one active draft at a time.
func (s *NegotiationService) CreateNegotiation(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.CreateNegotiationRequest) (*models.NegotiationResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !negotiationOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	stage := "negotiation"
	if lead.Stage != nil {
		stage = *lead.Stage
	}
	if stage != "negotiation" {
		return nil, errors.New("LEAD_NOT_IN_NEGOTIATION_STAGE")
	}

	// Allow multiple negotiations over time, but block when there's an active draft.
	var latestStatus string
	var latestUnitID *string
	err = s.DB.QueryRow(ctx, `SELECT status::text, unit_id::text FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&latestStatus, &latestUnitID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err == nil && latestStatus == "draft" {
		return nil, errors.New("NEGOTIATION_DRAFT_EXISTS")
	}

	// Validate project and unit belong to org
	var projectOK, unitOK bool
	err = s.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)`, req.ProjectID, organizationID).Scan(&projectOK)
	if err != nil || !projectOK {
		return nil, ErrLeadNotFound
	}
	err = s.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM project_units u JOIN projects p ON p.id = u.project_id WHERE u.id = $1 AND p.organization_id = $2)`, req.UnitID, organizationID).Scan(&unitOK)
	if err != nil || !unitOK {
		return nil, ErrLeadNotFound
	}

	// Unit must be available, except when reusing the same unit as the last
	// (non-draft) negotiation on this lead.
	var unitStatus string
	err = s.DB.QueryRow(ctx, `SELECT status::text FROM project_units WHERE id = $1`, req.UnitID).Scan(&unitStatus)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if unitStatus != "available" {
		// Allow reusing the same unit that was already negotiated for this lead
		// in a previous (non-draft) cycle.
		if latestUnitID == nil || *latestUnitID != req.UnitID {
			return nil, errors.New("UNIT_NOT_AVAILABLE")
		}
	}

	// Get current active negotiation stage
	var stageID *uuid.UUID
	err = s.DB.QueryRow(ctx, `SELECT id FROM lead_stages WHERE lead_id = $1 AND organization_id = $2 AND stage_type = 'negotiation' AND status = 'active' ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&stageID)
	if err != nil || stageID == nil {
		return nil, errors.New("NO_ACTIVE_NEGOTIATION_STAGE")
	}

	addonUUIDs := parseUUIDSlice(req.AddonIDs)
	projUUID, _ := uuid.Parse(req.ProjectID)
	unitUUID, _ := uuid.Parse(req.UnitID)

	var negID uuid.UUID
	err = s.DB.QueryRow(ctx, `INSERT INTO lead_negotiations (organization_id, lead_id, user_id, user_type, stage_id, project_id, unit_id, addon_ids, price_offered, discount_amount, discount_title, user_commission, status)
		VALUES ($1, $2, $3, $4::user_type, $5, $6, $7, $8, $9, $10, $11, $12, 'draft')
		RETURNING id`,
		organizationID, leadID, userID, userRole, stageID, projUUID, unitUUID, addonUUIDs, req.PriceOffered, req.DiscountAmount, req.DiscountTitle, req.UserCommission).Scan(&negID)
	if err != nil {
		return nil, err
	}

	_, err = s.DB.Exec(ctx, `UPDATE project_units SET status = 'under_negotiation', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, req.UnitID)
	if err != nil {
		return nil, err
	}

	return s.getNegotiationByID(ctx, negID.String(), organizationID)
}

func parseUUIDSlice(ids []string) []uuid.UUID {
	out := make([]uuid.UUID, 0, len(ids))
	for _, id := range ids {
		if u, err := uuid.Parse(id); err == nil {
			out = append(out, u)
		}
	}
	return out
}

// GetNegotiation returns the lead's negotiation with joined project, unit, addons. Sales only.
func (s *NegotiationService) GetNegotiation(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.NegotiationResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var negID string
	// Always treat the most recently created negotiation as the current one.
	err = s.DB.QueryRow(ctx, `SELECT id::text FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&negID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	return s.getNegotiationByID(ctx, negID, organizationID)
}

func (s *NegotiationService) getNegotiationByID(ctx context.Context, negotiationID, organizationID string) (*models.NegotiationResponse, error) {
	var n models.NegotiationResponse
	var id, leadUUID uuid.UUID
	var status string
	var stageID, projectID, unitID *uuid.UUID
	var addonIDs []uuid.UUID
	var createdAt, updatedAt time.Time
	err := s.DB.QueryRow(ctx, `SELECT id, lead_id, stage_id, project_id, unit_id, addon_ids, price_offered, final_price_agreed, discount_amount, discount_title, user_commission, approval_required, status::text, created_at, updated_at
		FROM lead_negotiations WHERE id = $1 AND organization_id = $2`,
		negotiationID, organizationID).Scan(&id, &leadUUID, &stageID, &projectID, &unitID, &addonIDs, &n.PriceOffered, &n.FinalPriceAgreed, &n.DiscountAmount, &n.DiscountTitle, &n.UserCommission, &n.ApprovalRequired, &status, &createdAt, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	n.ID = id.String()
	n.LeadID = leadUUID.String()
	n.Status = status
	n.CreatedAt = createdAt
	n.UpdatedAt = updatedAt
	if stageID != nil {
		s := stageID.String()
		n.StageID = &s
	}
	if projectID != nil {
		s := projectID.String()
		n.ProjectID = &s
	}
	if unitID != nil {
		s := unitID.String()
		n.UnitID = &s
	}
	for _, u := range addonIDs {
		n.AddonIDs = append(n.AddonIDs, u.String())
	}

	if projectID != nil {
		var title, ptype string
		var cover *string
		var amenities []string
		if s.DB.QueryRow(ctx, `SELECT project_title, project_type::text, project_cover_photo_url, amenities FROM projects WHERE id = $1`, projectID).Scan(&title, &ptype, &cover, &amenities) == nil {
			n.Project = &models.NegotiationProjectInfo{ID: projectID.String(), ProjectTitle: title, ProjectType: ptype, ProjectCoverPhotoURL: cover, Amenities: amenities}
		}
	}
	if unitID != nil {
		n.Unit = s.scanUnitInfo(ctx, unitID.String())
	}
	if len(addonIDs) > 0 {
		n.Addons = s.fetchAddonsByIDs(ctx, addonIDs)
	}
	return &n, nil
}

func (s *NegotiationService) scanUnitInfo(ctx context.Context, unitID string) *models.NegotiationUnitInfo {
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

func (s *NegotiationService) fetchAddonsByIDs(ctx context.Context, ids []uuid.UUID) []models.NegotiationAddonItem {
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

// UpdateNegotiation updates the negotiation. Only when status=draft; if unit changes, release old and lock new.
func (s *NegotiationService) UpdateNegotiation(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.UpdateNegotiationRequest) (*models.NegotiationResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !negotiationOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	var negID string
	var currentStatus string
	var oldUnitID *string
	// Update only the latest negotiation for this lead.
	err = s.DB.QueryRow(ctx, `SELECT id::text, status::text, unit_id::text FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&negID, &currentStatus, &oldUnitID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if currentStatus != "draft" {
		return nil, errors.New("NEGOTIATION_NOT_EDITABLE")
	}

	updates := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{}
	argIdx := 1
	if req.ProjectID != nil {
		updates = append(updates, fmt.Sprintf("project_id = $%d", argIdx))
		args = append(args, *req.ProjectID)
		argIdx++
	}
	if req.UnitID != nil {
		newUnitID := *req.UnitID
		// Validate new unit: same org, available (or current)
		var unitStatus string
		err = s.DB.QueryRow(ctx, `SELECT u.status::text FROM project_units u JOIN projects p ON p.id = u.project_id WHERE u.id = $1 AND p.organization_id = $2`, newUnitID, organizationID).Scan(&unitStatus)
		if err != nil {
			return nil, ErrLeadNotFound
		}
		if unitStatus != "available" && (oldUnitID == nil || *oldUnitID != newUnitID) {
			return nil, errors.New("UNIT_NOT_AVAILABLE")
		}
		updates = append(updates, fmt.Sprintf("unit_id = $%d", argIdx))
		args = append(args, newUnitID)
		argIdx++
	}
	if req.AddonIDs != nil {
		updates = append(updates, fmt.Sprintf("addon_ids = $%d", argIdx))
		args = append(args, parseUUIDSlice(req.AddonIDs))
		argIdx++
	}
	if req.PriceOffered != nil {
		updates = append(updates, fmt.Sprintf("price_offered = $%d", argIdx))
		args = append(args, *req.PriceOffered)
		argIdx++
	}
	if req.DiscountAmount != nil {
		updates = append(updates, fmt.Sprintf("discount_amount = $%d", argIdx))
		args = append(args, *req.DiscountAmount)
		argIdx++
	}
	if req.DiscountTitle != nil {
		updates = append(updates, fmt.Sprintf("discount_title = $%d", argIdx))
		args = append(args, *req.DiscountTitle)
		argIdx++
	}
	if req.UserCommission != nil {
		updates = append(updates, fmt.Sprintf("user_commission = $%d", argIdx))
		args = append(args, *req.UserCommission)
		argIdx++
	}
	if len(args) == 0 {
		return nil, errors.New("NO_UPDATES")
	}

	// If unit_id changed: release old, lock new
	if req.UnitID != nil && (oldUnitID == nil || *oldUnitID != *req.UnitID) {
		if oldUnitID != nil && *oldUnitID != "" {
			_, _ = s.DB.Exec(ctx, `UPDATE project_units SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, *oldUnitID)
		}
		_, _ = s.DB.Exec(ctx, `UPDATE project_units SET status = 'under_negotiation', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, *req.UnitID)
	}

	args = append(args, negID, organizationID)
	query := fmt.Sprintf(`UPDATE lead_negotiations SET %s WHERE id = $%d AND organization_id = $%d`, strings.Join(updates, ", "), argIdx, argIdx+1)
	_, err = s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return s.getNegotiationByID(ctx, negID, organizationID)
}

// GetPriceBreakdown returns computed price breakdown for the lead's negotiation.
func (s *NegotiationService) GetPriceBreakdown(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.PriceBreakdownResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var unitID *uuid.UUID
	var addonIDs []uuid.UUID
	var discountAmount *float64
	// Price breakdown is always computed for the latest negotiation on the lead.
	err = s.DB.QueryRow(ctx, `SELECT unit_id, addon_ids, discount_amount FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&unitID, &addonIDs, &discountAmount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}

	resp := &models.PriceBreakdownResponse{UnitCharges: []models.PriceBreakdownLineItem{}, Addons: []models.PriceBreakdownLineItem{}}
	var subtotal float64

	if unitID != nil {
		row := s.DB.QueryRow(ctx, `SELECT base_price, parking_price, infrastructure_cost, development_charges, water_charges, mseb_charges, legal_charges, stamp_duty, registration_fee, gst, vat, one_time_maintenance FROM project_units WHERE id = $1`, unitID)
		var base, parking, infra, dev, water, mseb, legal, stamp, reg, gst, vat, maint *float64
		if row.Scan(&base, &parking, &infra, &dev, &water, &mseb, &legal, &stamp, &reg, &gst, &vat, &maint) == nil {
			for _, pair := range []struct{ label string; val *float64 }{
				{"Base Price", base}, {"Parking", parking}, {"Infrastructure", infra}, {"Development Charges", dev},
				{"Water Charges", water}, {"MSEB Charges", mseb}, {"Legal Charges", legal}, {"Stamp Duty", stamp},
				{"Registration Fee", reg}, {"GST", gst}, {"VAT", vat}, {"One Time Maintenance", maint},
			} {
				if pair.val != nil && *pair.val != 0 {
					resp.UnitCharges = append(resp.UnitCharges, models.PriceBreakdownLineItem{Label: pair.label, Amount: pair.val})
					subtotal += *pair.val
				}
			}
		}
	}
	for _, id := range addonIDs {
		var price float64
		var title string
		if s.DB.QueryRow(ctx, `SELECT title, price FROM project_addons WHERE id = $1`, id).Scan(&title, &price) == nil {
			resp.Addons = append(resp.Addons, models.PriceBreakdownLineItem{Label: title, Amount: &price})
			subtotal += price
		}
	}
	resp.Subtotal = subtotal
	resp.DiscountAmount = discountAmount
	resp.FinalPrice = subtotal
	if discountAmount != nil {
		resp.FinalPrice -= *discountAmount
	}
	return resp, nil
}

// SubmitNegotiation sets status to submitted_for_approval. Sales only; only when draft.
func (s *NegotiationService) SubmitNegotiation(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.NegotiationResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !negotiationOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	var negID string
	var status string
	// Submit only the most recent negotiation.
	err = s.DB.QueryRow(ctx, `SELECT id::text, status::text FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&negID, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if status != "draft" {
		return nil, errors.New("NEGOTIATION_NOT_DRAFT")
	}
	_, err = s.DB.Exec(ctx, `UPDATE lead_negotiations SET status = 'submitted_for_approval', approval_required = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, negID)
	if err != nil {
		return nil, err
	}
	return s.getNegotiationByID(ctx, negID, organizationID)
}

// ApproveNegotiation sets status to approved. GM/Manager only.
func (s *NegotiationService) ApproveNegotiation(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.ApproveNegotiationRequest) (*models.NegotiationResponse, error) {
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var negID string
	var status string
	// Approve only the most recent negotiation.
	err = s.DB.QueryRow(ctx, `SELECT id::text, status::text FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&negID, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if status != "submitted_for_approval" {
		return nil, errors.New("NEGOTIATION_NOT_PENDING_APPROVAL")
	}
	if req.FinalPriceAgreed != nil {
		_, err = s.DB.Exec(ctx, `UPDATE lead_negotiations SET status = 'approved', final_price_agreed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, *req.FinalPriceAgreed, negID)
	} else {
		_, err = s.DB.Exec(ctx, `UPDATE lead_negotiations SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, negID)
	}
	if err != nil {
		return nil, err
	}
	return s.getNegotiationByID(ctx, negID, organizationID)
}

// RejectNegotiation sets status to rejected and releases unit. GM/Manager only.
func (s *NegotiationService) RejectNegotiation(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.RejectNegotiationRequest) (*models.NegotiationResponse, error) {
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var negID string
	var unitID *uuid.UUID
	var status string
	// Booking info is always derived from the latest negotiation.
	err = s.DB.QueryRow(ctx, `SELECT id::text, unit_id, status::text FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&negID, &unitID, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if status != "submitted_for_approval" {
		return nil, errors.New("NEGOTIATION_NOT_PENDING_APPROVAL")
	}
	_, err = s.DB.Exec(ctx, `UPDATE lead_negotiations SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, negID)
	if err != nil {
		return nil, err
	}
	if unitID != nil {
		_, _ = s.DB.Exec(ctx, `UPDATE project_units SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, unitID)
	}
	return s.getNegotiationByID(ctx, negID, organizationID)
}

// CreateQuotation creates a quotation from the lead's negotiation. Sales only.
// If req.ProjectID / req.UnitID are provided they override the negotiation values,
// allowing a quotation for a different project/unit than the current negotiation.
// Any existing quotations for this lead in draft/shared/revised/approved are marked rejected
// before inserting the new row as draft (manager reviews the latest version only).
func (s *NegotiationService) CreateQuotation(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.CreateQuotationRequest) (*models.QuotationResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !negotiationOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	fmt.Printf("CreateQuotation lead=%s unit=%v project=%v base=%v discount=%v addonIDs=%v additionalCharges=%d\n",
		leadID, req.UnitID, req.ProjectID, req.BasePrice, req.DiscountPrice, req.AddonIDs, len(req.AdditionalCharges))

	// Fetch latest negotiation (for linking and fallback project/unit).
	var negID, negProjID, negUnitID *uuid.UUID
	var negAddonIDs []uuid.UUID
	err = s.DB.QueryRow(ctx, `SELECT id, project_id, unit_id, addon_ids FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&negID, &negProjID, &negUnitID, &negAddonIDs)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}

	// Resolve effective project/unit/addons (request overrides > negotiation fallback).
	var projID, unitID *uuid.UUID
	var addonIDs []uuid.UUID

	if req.ProjectID != nil && *req.ProjectID != "" {
		if u, e := uuid.Parse(*req.ProjectID); e == nil {
			projID = &u
		}
	} else {
		projID = negProjID
	}

	if req.UnitID != nil && *req.UnitID != "" {
		if u, e := uuid.Parse(*req.UnitID); e == nil {
			unitID = &u
		}
	} else {
		unitID = negUnitID
	}

	if len(req.AddonIDs) > 0 {
		addonIDs = parseUUIDSlice(req.AddonIDs)
	} else {
		addonIDs = negAddonIDs
	}

	if unitID == nil {
		return nil, errors.New("UNIT_REQUIRED")
	}

	// Copy unit price fields (base price can be overridden from request to keep
	// the quotation aligned with what the client previewed).
	var base, parking, infra, dev, water, mseb, legal, stamp, reg, gst, vat, maint *float64
	_ = s.DB.QueryRow(ctx, `SELECT base_price, parking_price, infrastructure_cost, development_charges, water_charges, mseb_charges, legal_charges, stamp_duty, registration_fee, gst, vat, one_time_maintenance FROM project_units WHERE id = $1`,
		unitID).Scan(&base, &parking, &infra, &dev, &water, &mseb, &legal, &stamp, &reg, &gst, &vat, &maint)
	if req.BasePrice != nil && *req.BasePrice > 0 {
		base = req.BasePrice
	}

	additionalCharges := req.AdditionalCharges
	if len(additionalCharges) == 0 {
		additionalCharges = []models.PriceBreakdownLineItem{}
		for _, addonID := range addonIDs {
			var title string
			var price float64
			if err := s.DB.QueryRow(ctx, `SELECT title, price FROM project_addons WHERE id = $1`, addonID).Scan(&title, &price); err == nil {
				p := price
				additionalCharges = append(additionalCharges, models.PriceBreakdownLineItem{Label: title, Amount: &p})
			}
		}
	}
	additionalChargesJSON, err := json.Marshal(additionalCharges)
	if err != nil {
		return nil, err
	}

	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var version int
	err = tx.QueryRow(ctx, `SELECT COALESCE(MAX(quotation_version), 0) + 1 FROM lead_quotations WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&version)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		UPDATE lead_quotations SET quotation_status = 'rejected', rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE lead_id = $1 AND organization_id = $2
		  AND quotation_status IN ('draft', 'shared', 'revised', 'approved')`,
		leadID, organizationID)
	if err != nil {
		return nil, err
	}

	var validTill interface{}
	if req.ValidTill != nil && *req.ValidTill != "" {
		validTill = *req.ValidTill
	}
	var qID uuid.UUID
	err = tx.QueryRow(ctx, `INSERT INTO lead_quotations (organization_id, lead_id, negotiation_id, user_id, user_type, project_id, unit_id, addon_ids,
		base_price, parking_price, infrastructure_cost, development_charges, water_charges, mseb_charges, legal_charges, stamp_duty, registration_fee, gst, vat, one_time_maintenance,
		additional_charges, discount_name, discount_price,
		customer_name, customer_contact, customer_email, quotation_status, quotation_version, valid_till)
		VALUES ($1, $2, $3, $4, $5::user_type, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22, $23, $24, $25, $26, 'draft', $27, $28::date)
		RETURNING id`,
		organizationID, leadID, negID, userID, userRole, projID, unitID, addonIDs,
		base, parking, infra, dev, water, mseb, legal, stamp, reg, gst, vat, maint,
		additionalChargesJSON, req.DiscountName, req.DiscountPrice,
		req.CustomerName, req.CustomerContact, req.CustomerEmail, version, validTill).Scan(&qID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.getQuotationByID(ctx, leadID, qID.String(), organizationID)
}

// ApproveQuotation sets the quotation status to approved. Manager/GM only.
// All other quotations for the same lead (draft/shared/revised/approved) are marked rejected first
// so only the approved row remains active (older versions like v1 become rejected when v2 is approved).
func (s *NegotiationService) ApproveQuotation(ctx context.Context, leadID, quotationID, organizationID, userID, userRole string, req *models.ApproveQuotationRequest) (*models.QuotationResponse, error) {
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var exists string
	err = s.DB.QueryRow(ctx, `SELECT id::text FROM lead_quotations WHERE id = $1 AND lead_id = $2 AND organization_id = $3`, quotationID, leadID, organizationID).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}

	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		UPDATE lead_quotations SET quotation_status = 'rejected', rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE lead_id = $1 AND organization_id = $2 AND id <> $3::uuid
		  AND quotation_status IN ('draft', 'shared', 'revised', 'approved')`,
		leadID, organizationID, quotationID)
	if err != nil {
		return nil, err
	}
	tag, err := tx.Exec(ctx, `UPDATE lead_quotations SET quotation_status = 'approved', rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid AND lead_id = $2::uuid AND organization_id = $3::uuid`, quotationID, leadID, organizationID)
	if err != nil {
		if strings.Contains(err.Error(), "idx_lead_quotations_one_approved") || strings.Contains(err.Error(), "unique") {
			return nil, errors.New("QUOTATION_ALREADY_APPROVED_FOR_LEAD")
		}
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrLeadNotFound
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.getQuotationByID(ctx, leadID, quotationID, organizationID)
}

// RejectQuotation sets the quotation status to rejected. Manager/GM only.
// rejection_reason (or remarks alias) is required — shown to sales on the quotation.
func (s *NegotiationService) RejectQuotation(ctx context.Context, leadID, quotationID, organizationID, userID, userRole string, req *models.RejectQuotationRequest) (*models.QuotationResponse, error) {
	if userRole != "general-manager" && userRole != "general_manager" && userRole != "manager" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var exists string
	err = s.DB.QueryRow(ctx, `SELECT id::text FROM lead_quotations WHERE id = $1 AND lead_id = $2 AND organization_id = $3`, quotationID, leadID, organizationID).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	reason := ""
	if req != nil {
		if req.RejectionReason != nil {
			reason = strings.TrimSpace(*req.RejectionReason)
		}
		if reason == "" && req.Remarks != nil {
			reason = strings.TrimSpace(*req.Remarks)
		}
	}
	if reason == "" {
		return nil, errors.New("REJECTION_REASON_REQUIRED")
	}
	result, err := s.DB.Exec(ctx, `UPDATE lead_quotations SET quotation_status = 'rejected', rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1::uuid`, quotationID, reason)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, ErrLeadNotFound
	}
	return s.getQuotationByID(ctx, leadID, quotationID, organizationID)
}

// ListQuotations returns quotations for the lead. Sales, manager and GM.
func (s *NegotiationService) ListQuotations(ctx context.Context, leadID, organizationID, userID, userRole string, page, limit int) (*models.QuotationListResponse, error) {
	if userRole != "sales" && userRole != "manager" && userRole != "general_manager" && userRole != "general-manager" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var total int
	err = s.DB.QueryRow(ctx, `SELECT COUNT(*) FROM lead_quotations WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&total)
	if err != nil {
		return nil, err
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	rows, err := s.DB.Query(ctx, `SELECT id::text FROM lead_quotations WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`, leadID, organizationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.QuotationResponse
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			q, _ := s.getQuotationByID(ctx, leadID, id, organizationID)
			if q != nil {
				list = append(list, *q)
			}
		}
	}
	totalPages := (total + limit - 1) / limit
	return &models.QuotationListResponse{
		Quotations: list,
		Pagination: models.PaginationInfo{Page: page, Limit: limit, Total: total, TotalPages: totalPages},
	}, nil
}

// GetQuotation returns one quotation. Sales, manager and GM.
func (s *NegotiationService) GetQuotation(ctx context.Context, leadID, quotationID, organizationID, userID, userRole string) (*models.QuotationResponse, error) {
	if userRole != "sales" && userRole != "manager" && userRole != "general_manager" && userRole != "general-manager" {
		return nil, ErrInvalidUserType
	}
	_, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	return s.getQuotationByID(ctx, leadID, quotationID, organizationID)
}

func (s *NegotiationService) getQuotationByID(ctx context.Context, leadID, quotationID, organizationID string) (*models.QuotationResponse, error) {
	var q models.QuotationResponse
	var negID *uuid.UUID
	var addonIDs []uuid.UUID
	var additionalCharges []byte
	var validTill *time.Time
	var sharedVia *string
	var rejectionReason *string
	err := s.DB.QueryRow(ctx, `SELECT id, lead_id, negotiation_id, project_id, unit_id, addon_ids, base_price, parking_price, infrastructure_cost, development_charges, water_charges, mseb_charges, legal_charges, stamp_duty, registration_fee, gst, vat, one_time_maintenance, additional_charges, discount_name, discount_price, customer_name, customer_contact, customer_email, quotation_status::text, quotation_version, valid_till, shared_via::text, rejection_reason, created_at, updated_at
		FROM lead_quotations WHERE id = $1 AND lead_id = $2 AND organization_id = $3`,
		quotationID, leadID, organizationID).Scan(&q.ID, &q.LeadID, &negID, &q.ProjectID, &q.UnitID, &addonIDs, &q.BasePrice, &q.ParkingPrice, &q.InfrastructureCost, &q.DevelopmentCharges, &q.WaterCharges, &q.MsebCharges, &q.LegalCharges, &q.StampDuty, &q.RegistrationFee, &q.GST, &q.VAT, &q.OneTimeMaintenance, &additionalCharges, &q.DiscountName, &q.DiscountPrice, &q.CustomerName, &q.CustomerContact, &q.CustomerEmail, &q.QuotationStatus, &q.QuotationVersion, &validTill, &sharedVia, &rejectionReason, &q.CreatedAt, &q.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	if negID != nil {
		s := negID.String()
		q.NegotiationID = &s
	}
	for _, u := range addonIDs {
		q.AddonIDs = append(q.AddonIDs, u.String())
	}
	if len(additionalCharges) > 0 {
		var parsed []models.PriceBreakdownLineItem
		if err := json.Unmarshal(additionalCharges, &parsed); err == nil {
			q.AdditionalCharges = parsed
		}
	}
	if validTill != nil {
		t := validTill.Format("2006-01-02")
		q.ValidTill = &t
	}
	q.SharedVia = sharedVia
	q.RejectionReason = rejectionReason
	return &q, nil
}

// UpdateQuotation revises the quotation. Sales only.
func (s *NegotiationService) UpdateQuotation(ctx context.Context, leadID, quotationID, organizationID, userID, userRole string, req *models.UpdateQuotationRequest) (*models.QuotationResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !negotiationOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	var exists string
	err = s.DB.QueryRow(ctx, `SELECT id::text FROM lead_quotations WHERE id = $1 AND lead_id = $2 AND organization_id = $3`, quotationID, leadID, organizationID).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}

	updates := []string{"quotation_status = 'revised'", "quotation_version = quotation_version + 1", "updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{}
	argIdx := 1
	if req.BasePrice != nil {
		updates = append(updates, fmt.Sprintf("base_price = $%d", argIdx))
		args = append(args, *req.BasePrice)
		argIdx++
	}
	if req.ParkingPrice != nil {
		updates = append(updates, fmt.Sprintf("parking_price = $%d", argIdx))
		args = append(args, *req.ParkingPrice)
		argIdx++
	}
	if req.InfrastructureCost != nil {
		updates = append(updates, fmt.Sprintf("infrastructure_cost = $%d", argIdx))
		args = append(args, *req.InfrastructureCost)
		argIdx++
	}
	if req.DevelopmentCharges != nil {
		updates = append(updates, fmt.Sprintf("development_charges = $%d", argIdx))
		args = append(args, *req.DevelopmentCharges)
		argIdx++
	}
	if req.WaterCharges != nil {
		updates = append(updates, fmt.Sprintf("water_charges = $%d", argIdx))
		args = append(args, *req.WaterCharges)
		argIdx++
	}
	if req.MsebCharges != nil {
		updates = append(updates, fmt.Sprintf("mseb_charges = $%d", argIdx))
		args = append(args, *req.MsebCharges)
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
	if req.RegistrationFee != nil {
		updates = append(updates, fmt.Sprintf("registration_fee = $%d", argIdx))
		args = append(args, *req.RegistrationFee)
		argIdx++
	}
	if req.GST != nil {
		updates = append(updates, fmt.Sprintf("gst = $%d", argIdx))
		args = append(args, *req.GST)
		argIdx++
	}
	if req.VAT != nil {
		updates = append(updates, fmt.Sprintf("vat = $%d", argIdx))
		args = append(args, *req.VAT)
		argIdx++
	}
	if req.OneTimeMaintenance != nil {
		updates = append(updates, fmt.Sprintf("one_time_maintenance = $%d", argIdx))
		args = append(args, *req.OneTimeMaintenance)
		argIdx++
	}
	if req.DiscountName != nil {
		updates = append(updates, fmt.Sprintf("discount_name = $%d", argIdx))
		args = append(args, *req.DiscountName)
		argIdx++
	}
	if req.DiscountPrice != nil {
		updates = append(updates, fmt.Sprintf("discount_price = $%d", argIdx))
		args = append(args, *req.DiscountPrice)
		argIdx++
	}
	if req.CustomerName != nil {
		updates = append(updates, fmt.Sprintf("customer_name = $%d", argIdx))
		args = append(args, *req.CustomerName)
		argIdx++
	}
	if req.CustomerContact != nil {
		updates = append(updates, fmt.Sprintf("customer_contact = $%d", argIdx))
		args = append(args, *req.CustomerContact)
		argIdx++
	}
	if req.CustomerEmail != nil {
		updates = append(updates, fmt.Sprintf("customer_email = $%d", argIdx))
		args = append(args, *req.CustomerEmail)
		argIdx++
	}
	if req.ValidTill != nil {
		updates = append(updates, fmt.Sprintf("valid_till = $%d::date", argIdx))
		args = append(args, *req.ValidTill)
		argIdx++
	}
	if len(args) == 0 {
		return nil, errors.New("NO_UPDATES")
	}
	args = append(args, quotationID, leadID, organizationID)
	query := fmt.Sprintf(`UPDATE lead_quotations SET %s WHERE id = $%d AND lead_id = $%d AND organization_id = $%d`, strings.Join(updates, ", "), argIdx, argIdx+1, argIdx+2)
	_, err = s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return s.getQuotationByID(ctx, leadID, quotationID, organizationID)
}

// ShareQuotation marks quotation as shared. Sales only.
func (s *NegotiationService) ShareQuotation(ctx context.Context, leadID, quotationID, organizationID, userID, userRole string, req *models.ShareQuotationRequest) (*models.QuotationResponse, error) {
	if userRole != "sales" {
		return nil, ErrInvalidUserType
	}
	lead, err := s.Lead.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !negotiationOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	result, err := s.DB.Exec(ctx, `UPDATE lead_quotations SET quotation_status = 'shared', shared_via = $1::shared_via, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND lead_id = $3 AND organization_id = $4`,
		req.SharedVia, quotationID, leadID, organizationID)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, ErrLeadNotFound
	}
	return s.getQuotationByID(ctx, leadID, quotationID, organizationID)
}

// quotationLineTotalExpr returns SQL for one quotation row total (INR), matching booking final_total logic plus JSON additional_charges.
func quotationLineTotalExpr() string {
	return `(
  COALESCE(q.base_price,0) + COALESCE(q.parking_price,0) + COALESCE(q.infrastructure_cost,0)
  + COALESCE(q.development_charges,0) + COALESCE(q.water_charges,0) + COALESCE(q.mseb_charges,0)
  + COALESCE(q.legal_charges,0) + COALESCE(q.stamp_duty,0) + COALESCE(q.registration_fee,0)
  + COALESCE(q.gst,0) + COALESCE(q.vat,0) + COALESCE(q.one_time_maintenance,0)
  - COALESCE(q.discount_price,0)
  + COALESCE((
    SELECT SUM(COALESCE((elem->>'amount')::double precision, 0))
    FROM jsonb_array_elements(COALESCE(q.additional_charges, '[]'::jsonb)) AS elem
  ), 0)
)`
}

func growthPercentInt(current, previous int) float64 {
	if previous <= 0 {
		if current <= 0 {
			return 0
		}
		return 100
	}
	return float64(current-previous) / float64(previous) * 100
}

func growthPercentFloat(current, previous float64) float64 {
	if previous <= 0 {
		if current <= 0 {
			return 0
		}
		return 100
	}
	return (current - previous) / previous * 100
}

// GetQuotationStats aggregates quotation KPIs for visible leads (same visibility as dashboard lead filter).
func (s *NegotiationService) GetQuotationStats(ctx context.Context, organizationID, userID, userRole string) (*models.QuotationStatsResponse, error) {
	if userRole != "sales" && userRole != "manager" && userRole != "general_manager" && userRole != "general-manager" {
		return nil, ErrInvalidUserType
	}

	leadWhere, leadArgs := leadFilterSQL(organizationID, userID, userRole, 2)
	baseFrom := fmt.Sprintf(`
FROM lead_quotations q
INNER JOIN leads l ON l.id = q.lead_id AND q.organization_id = l.organization_id
WHERE %s`, leadWhere)

	line := quotationLineTotalExpr()
	now := time.Now().UTC()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	prevMonthStart := monthStart.AddDate(0, -1, 0)
	elapsed := now.Sub(monthStart)
	prevWindowEnd := prevMonthStart.Add(elapsed)

	n := len(leadArgs)
	p1, p2 := n+1, n+2

	// --- Snapshot totals (all time) ---
	var totalCount int
	qAll := fmt.Sprintf(`SELECT COUNT(*) %s`, baseFrom)
	if err := s.DB.QueryRow(ctx, qAll, leadArgs...).Scan(&totalCount); err != nil {
		return nil, err
	}

	var totalValue float64
	qSum := fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) %s`, line, baseFrom)
	if err := s.DB.QueryRow(ctx, qSum, leadArgs...).Scan(&totalValue); err != nil {
		return nil, err
	}

	var approvedSnap, pendingSnap int
	qAp := fmt.Sprintf(`SELECT COUNT(*) %s AND q.quotation_status = 'approved'`, baseFrom)
	if err := s.DB.QueryRow(ctx, qAp, leadArgs...).Scan(&approvedSnap); err != nil {
		return nil, err
	}
	qPe := fmt.Sprintf(`SELECT COUNT(*) %s AND q.quotation_status IN ('shared','revised')`, baseFrom)
	if err := s.DB.QueryRow(ctx, qPe, leadArgs...).Scan(&pendingSnap); err != nil {
		return nil, err
	}

	// --- Month-to-date vs same window last month (for growth) ---
	argsMTD := append(append([]interface{}{}, leadArgs...), monthStart, now)
	argsPrev := append(append([]interface{}{}, leadArgs...), prevMonthStart, prevWindowEnd)

	var mtdCount, prevCount int
	qMtd := fmt.Sprintf(`SELECT COUNT(*) %s AND q.created_at >= $%d AND q.created_at <= $%d`, baseFrom, p1, p2)
	if err := s.DB.QueryRow(ctx, qMtd, argsMTD...).Scan(&mtdCount); err != nil {
		return nil, err
	}
	qPrev := fmt.Sprintf(`SELECT COUNT(*) %s AND q.created_at >= $%d AND q.created_at < $%d`, baseFrom, p1, p2)
	if err := s.DB.QueryRow(ctx, qPrev, argsPrev...).Scan(&prevCount); err != nil {
		return nil, err
	}

	var mtdValue, prevValue float64
	qMtdVal := fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) %s AND q.created_at >= $%d AND q.created_at <= $%d`, line, baseFrom, p1, p2)
	if err := s.DB.QueryRow(ctx, qMtdVal, argsMTD...).Scan(&mtdValue); err != nil {
		return nil, err
	}
	qPrevVal := fmt.Sprintf(`SELECT COALESCE(SUM(%s), 0) %s AND q.created_at >= $%d AND q.created_at < $%d`, line, baseFrom, p1, p2)
	if err := s.DB.QueryRow(ctx, qPrevVal, argsPrev...).Scan(&prevValue); err != nil {
		return nil, err
	}

	var mtdApproved, prevApproved int
	qMA := fmt.Sprintf(`SELECT COUNT(*) %s AND q.quotation_status = 'approved' AND q.created_at >= $%d AND q.created_at <= $%d`, baseFrom, p1, p2)
	if err := s.DB.QueryRow(ctx, qMA, argsMTD...).Scan(&mtdApproved); err != nil {
		return nil, err
	}
	qPA := fmt.Sprintf(`SELECT COUNT(*) %s AND q.quotation_status = 'approved' AND q.created_at >= $%d AND q.created_at < $%d`, baseFrom, p1, p2)
	if err := s.DB.QueryRow(ctx, qPA, argsPrev...).Scan(&prevApproved); err != nil {
		return nil, err
	}

	var mtdPending, prevPending int
	qMP := fmt.Sprintf(`SELECT COUNT(*) %s AND q.quotation_status IN ('shared','revised') AND q.created_at >= $%d AND q.created_at <= $%d`, baseFrom, p1, p2)
	if err := s.DB.QueryRow(ctx, qMP, argsMTD...).Scan(&mtdPending); err != nil {
		return nil, err
	}
	qPP := fmt.Sprintf(`SELECT COUNT(*) %s AND q.quotation_status IN ('shared','revised') AND q.created_at >= $%d AND q.created_at < $%d`, baseFrom, p1, p2)
	if err := s.DB.QueryRow(ctx, qPP, argsPrev...).Scan(&prevPending); err != nil {
		return nil, err
	}

	return &models.QuotationStatsResponse{
		TotalQuotations:       totalCount,
		TotalQuotationsGrowth: growthPercentInt(mtdCount, prevCount),
		TotalValueINR:         totalValue,
		TotalValueGrowthPct:   growthPercentFloat(mtdValue, prevValue),
		ThisMonthCount:        mtdCount,
		ThisMonthGrowth:       growthPercentInt(mtdCount, prevCount),
		ApprovedCount:         approvedSnap,
		ApprovedGrowth:        growthPercentInt(mtdApproved, prevApproved),
		PendingCount:        pendingSnap,
		PendingGrowth:         growthPercentInt(mtdPending, prevPending),
	}, nil
}

func quotationTabFilterSQL(tab string) string {
	switch strings.ToLower(strings.TrimSpace(tab)) {
	case "approved":
		return " AND q.quotation_status = 'approved'"
	case "pending":
		return " AND q.quotation_status IN ('shared','revised')"
	case "draft":
		return " AND q.quotation_status = 'draft'"
	default:
		return ""
	}
}

// quotationSearchProjectClause adds ILIKE filters; argStart is next $ index after leadArgs.
func quotationSearchProjectClause(q, project string, argStart int) (clause string, extraArgs []interface{}) {
	trimQ := strings.TrimSpace(q)
	trimP := strings.TrimSpace(project)
	idx := argStart
	var parts []string
	if trimQ != "" {
		pat := "%" + trimQ + "%"
		parts = append(parts, fmt.Sprintf(`(q.customer_name ILIKE $%d OR p.project_title ILIKE $%d OR COALESCE(u.name,'') ILIKE $%d OR q.id::text ILIKE $%d)`, idx, idx, idx, idx))
		extraArgs = append(extraArgs, pat)
		idx++
	}
	if trimP != "" {
		pat := "%" + trimP + "%"
		parts = append(parts, fmt.Sprintf(`(p.project_title ILIKE $%d)`, idx))
		extraArgs = append(extraArgs, pat)
		idx++
	}
	if len(parts) == 0 {
		return "", nil
	}
	return " AND " + strings.Join(parts, " AND "), extraArgs
}

func quotationSortClause(sortField, order string) string {
	dir := "DESC"
	if strings.EqualFold(order, "asc") {
		dir = "ASC"
	}
	switch strings.ToLower(strings.TrimSpace(sortField)) {
	case "price":
		return fmt.Sprintf(" ORDER BY (%s) %s NULLS LAST", quotationLineTotalExpr(), dir)
	case "customer":
		return fmt.Sprintf(" ORDER BY q.customer_name %s NULLS LAST", dir)
	default:
		return fmt.Sprintf(" ORDER BY q.created_at %s", dir)
	}
}

// ListQuotationsForOrg returns paginated quotations for visible leads (sales / manager / GM).
func (s *NegotiationService) ListQuotationsForOrg(ctx context.Context, organizationID, userID, userRole string, page, limit int, tab, searchQ, projectQ, sortField, order string) (*models.QuotationListForOrgResponse, error) {
	if userRole != "sales" && userRole != "manager" && userRole != "general_manager" && userRole != "general-manager" {
		return nil, ErrInvalidUserType
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	leadWhere, leadArgs := leadFilterSQL(organizationID, userID, userRole, 2)
	tabSQL := quotationTabFilterSQL(tab)
	searchClause, extraArgs := quotationSearchProjectClause(searchQ, projectQ, len(leadArgs)+1)
	args := append(append([]interface{}{}, leadArgs...), extraArgs...)

	baseJoin := fmt.Sprintf(`
FROM lead_quotations q
INNER JOIN leads l ON l.id = q.lead_id AND q.organization_id = l.organization_id
LEFT JOIN projects p ON p.id = q.project_id AND p.deleted_at IS NULL
LEFT JOIN project_units u ON u.id = q.unit_id
WHERE %s%s%s`, leadWhere, tabSQL, searchClause)

	var total int
	countQ := fmt.Sprintf(`SELECT COUNT(*) %s`, baseJoin)
	if err := s.DB.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, err
	}

	tabJoin := fmt.Sprintf(`
FROM lead_quotations q
INNER JOIN leads l ON l.id = q.lead_id AND q.organization_id = l.organization_id
LEFT JOIN projects p ON p.id = q.project_id AND p.deleted_at IS NULL
LEFT JOIN project_units u ON u.id = q.unit_id
WHERE %s%s`, leadWhere, searchClause)
	var tc models.QuotationTabCounts
	tabQ := fmt.Sprintf(`SELECT
		COUNT(*)::int,
		COUNT(*) FILTER (WHERE q.quotation_status = 'approved')::int,
		COUNT(*) FILTER (WHERE q.quotation_status IN ('shared','revised'))::int,
		COUNT(*) FILTER (WHERE q.quotation_status = 'draft')::int
	%s`, tabJoin)
	if err := s.DB.QueryRow(ctx, tabQ, args...).Scan(&tc.All, &tc.Approved, &tc.Pending, &tc.Draft); err != nil {
		return nil, err
	}

	line := quotationLineTotalExpr()
	n := len(args)
	limP := n + 1
	offP := n + 2
	listArgs := append(append([]interface{}{}, args...), limit, offset)

	listQ := fmt.Sprintf(`SELECT
		q.id::text,
		q.lead_id::text,
		q.quotation_status::text,
		q.created_at,
		COALESCE(p.project_title, ''),
		p.project_cover_photo_url,
		COALESCE(NULLIF(trim(p.project_type::text), ''), ''),
		COALESCE(NULLIF(trim(p.project_status::text), ''), ''),
		p.city,
		p.state,
		COALESCE(p.amenities, ARRAY[]::TEXT[]),
		p.minimum_unit_price,
		p.maximum_unit_price,
		COALESCE(u.name, ''),
		u.wing,
		u.floor,
		u.carpet_area,
		COALESCE(NULLIF(trim(u.unit_type::text), ''), ''),
		q.customer_name,
		q.customer_contact,
		q.customer_email,
		%s
	%s
	%s
	LIMIT $%d OFFSET $%d`, line, baseJoin, quotationSortClause(sortField, order), limP, offP)

	rows, err := s.DB.Query(ctx, listQ, listArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.QuotationListItemResponse
	for rows.Next() {
		var it models.QuotationListItemResponse
		var cover *string
		var city, state *string
		var amenities []string
		var minP, maxP sql.NullFloat64
		var wing *string
		var floor *int
		var carpet *float64
		var custName, custContact, custEmail *string
		if err := rows.Scan(
			&it.QuotationID,
			&it.LeadID,
			&it.QuotationStatus,
			&it.CreatedAt,
			&it.ProjectTitle,
			&cover,
			&it.ProjectType,
			&it.ProjectStatus,
			&city,
			&state,
			&amenities,
			&minP,
			&maxP,
			&it.UnitName,
			&wing,
			&floor,
			&carpet,
			&it.UnitType,
			&custName,
			&custContact,
			&custEmail,
			&it.FinalPrice,
		); err != nil {
			return nil, err
		}
		it.ProjectCoverPhotoURL = cover
		it.City = city
		it.State = state
		if len(amenities) > 0 {
			it.Amenities = amenities
		}
		if minP.Valid {
			v := minP.Float64
			it.MinimumUnitPrice = &v
		}
		if maxP.Valid {
			v := maxP.Float64
			it.MaximumUnitPrice = &v
		}
		it.Wing = wing
		it.Floor = floor
		it.CarpetArea = carpet
		it.CustomerName = custName
		it.CustomerContact = custContact
		it.CustomerEmail = custEmail
		list = append(list, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	totalPages := (total + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}
	return &models.QuotationListForOrgResponse{
		Quotations: list,
		Pagination: models.PaginationInfo{Page: page, Limit: limit, Total: total, TotalPages: totalPages},
		TabCounts:  tc,
	}, nil
}
