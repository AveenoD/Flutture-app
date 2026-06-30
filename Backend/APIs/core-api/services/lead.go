package services

import (
	"context"
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

var ErrLeadNotFound = errors.New("LEAD_NOT_FOUND")
var ErrLeadForbidden = errors.New("FORBIDDEN")

// isLeadOwnedBy returns true only when the lead's current owner (assigned_to_user_id + assigned_to_user_type) matches the user/role. Used to enforce write actions only by current owner (handed-off leads are read-only for the other role).
func isLeadOwnedBy(lead *models.LeadResponse, userID, userRole string) bool {
	if lead == nil || lead.AssignedToUserID == nil || lead.AssignedToUserType == nil {
		return false
	}
	return *lead.AssignedToUserID == userID && *lead.AssignedToUserType == userRole
}

func (s *LeadService) resolveVisitImages(ctx context.Context, images []string) []string {
	if len(images) == 0 {
		return nil
	}

	resolved := make([]string, 0, len(images))
	for _, img := range images {
		img = strings.TrimSpace(img)
		if img == "" {
			continue
		}
		if strings.HasPrefix(img, "http://") || strings.HasPrefix(img, "https://") {
			resolved = append(resolved, img)
			continue
		}
		if s.Storage == nil {
			resolved = append(resolved, img)
			continue
		}
		signedURL, err := s.Storage.GeneratePresignedDownloadURL(ctx, img, 1*time.Hour)
		if err != nil || signedURL == "" {
			resolved = append(resolved, img)
			continue
		}
		resolved = append(resolved, signedURL)
	}
	return resolved
}

func (s *LeadService) resolveVisitImagesWithFallback(ctx context.Context, leadID, organizationID, visitID, visitType string, images []string) []string {
	if len(images) > 0 {
		return s.resolveVisitImages(ctx, images)
	}

	var fallback []string
	err := s.DB.QueryRow(ctx, `
		SELECT site_visit_images
		FROM lead_property_visits
		WHERE lead_id = $1
		  AND organization_id = $2
		  AND visit_type = $3
		  AND id <> $4
		  AND COALESCE(array_length(site_visit_images, 1), 0) > 0
		ORDER BY updated_at DESC
		LIMIT 1
	`, leadID, organizationID, visitType, visitID).Scan(&fallback)
	if err != nil || len(fallback) == 0 {
		return nil
	}
	return s.resolveVisitImages(ctx, fallback)
}

// LeadService handles lead listing and retrieval
type LeadService struct {
	DB      *pgxpool.Pool
	Routing *LeadRoutingService
	Storage *StorageService
}

// NewLeadService creates a new LeadService
func NewLeadService(pool *pgxpool.Pool, routing *LeadRoutingService, storage *StorageService) *LeadService {
	return &LeadService{DB: pool, Routing: routing, Storage: storage}
}

// signRecordingURL converts a raw B2 object key into a presigned download URL.
// If the value is already an HTTPS URL or storage is not configured, it is left unchanged.
func (s *LeadService) signRecordingURL(ctx context.Context, url *string) {
	if s.Storage == nil || url == nil || *url == "" {
		return
	}
	v := strings.TrimSpace(*url)
	if strings.HasPrefix(v, "http://") || strings.HasPrefix(v, "https://") {
		return
	}
	signed, err := s.Storage.GeneratePresignedDownloadURL(ctx, v, 1*time.Hour)
	if err != nil || signed == "" {
		return
	}
	*url = signed
}

// ManagerHasViewLeads returns true if the manager has view_leads permission
func (s *LeadService) ManagerHasViewLeads(ctx context.Context, managerID string) (bool, error) {
	var has bool
	err := s.DB.QueryRow(ctx, `SELECT 'view_leads' = ANY(permissions) FROM users_managers WHERE id = $1 AND deleted_at IS NULL`, managerID).Scan(&has)
	return has, err
}

// GetOrganizationID returns organization_id for the given user and role
func (s *LeadService) GetOrganizationID(ctx context.Context, userID, userRole string) (string, error) {
	var query string
	switch userRole {
	case "general-manager", "general_manager":
		query = "SELECT organization_id FROM users_general_managers WHERE id = $1 AND deleted_at IS NULL"
	case "manager":
		query = "SELECT organization_id FROM users_managers WHERE id = $1 AND deleted_at IS NULL"
	case "presales":
		query = "SELECT organization_id FROM users_presales WHERE id = $1 AND deleted_at IS NULL"
	case "sales":
		query = "SELECT organization_id FROM users_sales WHERE id = $1 AND deleted_at IS NULL"
	default:
		return "", fmt.Errorf("INVALID_USER_TYPE")
	}
	var orgID string
	err := s.DB.QueryRow(ctx, query, userID).Scan(&orgID)
	if err != nil {
		return "", err
	}
	return orgID, nil
}

// ListLeads returns leads for the organization with role-based visibility and filters
func (s *LeadService) ListLeads(ctx context.Context, organizationID, userID, userRole string, filters map[string]string) (*models.LeadsListResponse, error) {
	whereConditions := []string{"l.organization_id = $1", "l.deleted_at IS NULL"}
	args := []interface{}{organizationID}
	argCount := 2

	// Role-based visibility: presales/sales see assigned leads + handed-off (presales: up to stage 3; sales: pending accept)
	switch userRole {
	case "presales":
		// Also show unassigned portal/API leads (not CSV imported) so callers see the pool before routing claims them.
		whereConditions = append(whereConditions, fmt.Sprintf(
			"((l.assigned_to_user_id = $%d AND l.assigned_to_user_type = 'presales') OR (l.presales_user_id = $%d AND l.stage IN ('qualification','communication','site_visit')) OR (l.assigned_to_user_id IS NULL AND l.source <> 'imported'::lead_source))",
			argCount, argCount))
		args = append(args, userID)
		argCount++
	case "sales":
		// Optional filter: assigned (accepted), pending (not yet accepted), or all
		switch filters["assigned_filter"] {
		case "assigned":
			whereConditions = append(whereConditions, fmt.Sprintf("l.assigned_to_user_id = $%d AND l.assigned_to_user_type = 'sales'", argCount))
			args = append(args, userID)
			argCount++
		case "pending":
			whereConditions = append(whereConditions, fmt.Sprintf("l.sales_user_id = $%d AND l.sales_accepted_at IS NULL", argCount))
			args = append(args, userID)
			argCount++
		default:
			whereConditions = append(whereConditions, fmt.Sprintf("((l.assigned_to_user_id = $%d AND l.assigned_to_user_type = 'sales') OR (l.sales_user_id = $%d AND l.sales_accepted_at IS NULL))", argCount, argCount))
			args = append(args, userID)
			argCount++
		}
	}

	// GM/Manager optional filter by assignee
	if (userRole == "general-manager" || userRole == "general_manager" || userRole == "manager") {
		if assignedTo := filters["assigned_to_user_id"]; assignedTo != "" {
			if _, err := uuid.Parse(assignedTo); err == nil {
				whereConditions = append(whereConditions, fmt.Sprintf("l.assigned_to_user_id = $%d", argCount))
				args = append(args, assignedTo)
				argCount++
			}
		}
	}

	// Exact-match filters
	if v := filters["status"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.status = $%d", argCount))
		args = append(args, v)
		argCount++
	}
	if v := filters["stage"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.stage = $%d", argCount))
		args = append(args, v)
		argCount++
	}
	if v := filters["lead_temperature"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.lead_temperature = $%d", argCount))
		args = append(args, v)
		argCount++
	}
	if v := filters["source"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.source = $%d", argCount))
		args = append(args, v)
		argCount++
	}
	// Exclude one lead_source (whitelist) — e.g. portal/API list without showing CSV bulk (imported).
	if v := filters["exclude_source"]; v != "" {
		switch v {
		case "imported":
			whereConditions = append(whereConditions, "l.source <> 'imported'::lead_source")
		}
	}
	if v := filters["priority"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.priority = $%d", argCount))
		args = append(args, v)
		argCount++
	}

	// ILIKE filters
	if v := filters["city"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.city ILIKE $%d", argCount))
		args = append(args, "%"+v+"%")
		argCount++
	}
	if v := filters["state"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.state ILIKE $%d", argCount))
		args = append(args, "%"+v+"%")
		argCount++
	}

	// Search (name, phone, email)
	if v := filters["search"]; v != "" {
		searchArg := "%" + v + "%"
		whereConditions = append(whereConditions, fmt.Sprintf("(l.name ILIKE $%d OR l.phone ILIKE $%d OR l.email ILIKE $%d)", argCount, argCount, argCount))
		args = append(args, searchArg)
		argCount++
	}

	// Date range
	if v := filters["created_after"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.created_at >= $%d", argCount))
		args = append(args, v)
		argCount++
	}
	if v := filters["created_before"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.created_at <= $%d", argCount))
		args = append(args, v)
		argCount++
	}

	// Filter by project_id (GM/Manager)
	if v := filters["project_id"]; v != "" {
		if _, err := uuid.Parse(v); err == nil {
			whereConditions = append(whereConditions, fmt.Sprintf("l.project_id = $%d", argCount))
			args = append(args, v)
			argCount++
		}
	}

	page, limit := getLeadPagination(filters)
	offset := (page - 1) * limit

	whereSQL := strings.Join(whereConditions, " AND ")

	// Count (from leads only, no join needed)
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM leads l WHERE %s", whereSQL)
	var total int
	err := s.DB.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	// List with LEFT JOIN to get project_title
	selFields := `l.id, l.organization_id, l.name, l.phone, l.email, l.alternate_phone, l.address, l.city, l.state, l.pincode,
		l.source, l.source_detail, l.budget_min, l.budget_max, l.lead_temperature, l.status, l.stage,
		l.assigned_to_user_id, l.assigned_to_user_type, l.assigned_at, l.priority, l.tags, l.notes, l.imported_data_id,
		l.project_id, p.project_title,
		l.presales_user_id, l.sales_user_id, l.sales_accepted_at,
		l.created_at, l.updated_at`
	listQuery := fmt.Sprintf(`
		SELECT %s FROM leads l
		LEFT JOIN projects p ON l.project_id = p.id AND p.deleted_at IS NULL
		WHERE %s
		ORDER BY l.created_at DESC
		LIMIT $%d OFFSET $%d
	`, selFields, whereSQL, argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := s.DB.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	leads := make([]models.LeadResponse, 0)
	for rows.Next() {
		var row models.Lead
		var source, sourceDetail, stage, assignedType, priority, notes *string
		var importedID, projectID, presalesUserID, salesUserID *uuid.UUID
		var projectTitle *string
		var salesAcceptedAt *time.Time
		err := rows.Scan(
			&row.ID, &row.OrganizationID, &row.Name, &row.Phone, &row.Email, &row.AlternatePhone,
			&row.Address, &row.City, &row.State, &row.Pincode,
			&source, &sourceDetail, &row.BudgetMin, &row.BudgetMax, &row.LeadTemperature,
			&row.Status, &stage, &row.AssignedToUserID, &assignedType, &row.AssignedAt,
			&priority, &row.Tags, &notes, &importedID,
			&projectID, &projectTitle,
			&presalesUserID, &salesUserID, &salesAcceptedAt,
			&row.CreatedAt, &row.UpdatedAt,
		)
		if err != nil {
			continue
		}
		row.Source = source
		row.SourceDetail = sourceDetail
		row.Stage = stage
		row.AssignedToUserType = assignedType
		row.Priority = priority
		row.Notes = notes
		row.ImportedDataID = importedID
		row.ProjectID = projectID
		row.ProjectTitle = projectTitle
		row.PresalesUserID = presalesUserID
		row.SalesUserID = salesUserID
		row.SalesAcceptedAt = salesAcceptedAt
		leads = append(leads, row.ToLeadResponse())
	}

	return &models.LeadsListResponse{
		Leads: leads,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: (total + limit - 1) / limit,
		},
	}, nil
}

// GetLeadByID returns a single lead by ID if visible to the user
func (s *LeadService) GetLeadByID(ctx context.Context, leadID, organizationID, userID, userRole string) (*models.LeadResponse, error) {
	whereConditions := []string{"l.id = $1", "l.organization_id = $2", "l.deleted_at IS NULL"}
	args := []interface{}{leadID, organizationID}

	switch userRole {
	case "presales":
		whereConditions = append(whereConditions, "((l.assigned_to_user_id = $3 AND l.assigned_to_user_type = 'presales') OR (l.presales_user_id = $3 AND l.stage IN ('qualification','communication','site_visit')))")
		args = append(args, userID)
	case "sales":
		whereConditions = append(whereConditions, "((l.assigned_to_user_id = $3 AND l.assigned_to_user_type = 'sales') OR (l.sales_user_id = $3))")
		args = append(args, userID)
	}

	whereSQL := strings.Join(whereConditions, " AND ")
	selFields := `l.id, l.organization_id, l.name, l.phone, l.email, l.alternate_phone, l.address, l.city, l.state, l.pincode,
		l.source, l.source_detail, l.budget_min, l.budget_max, l.lead_temperature, l.status, l.stage,
		l.assigned_to_user_id, l.assigned_to_user_type, l.assigned_at, l.priority, l.tags, l.notes, l.imported_data_id,
		l.project_id, p.project_title,
		l.presales_user_id, l.sales_user_id, l.sales_accepted_at,
		l.created_at, l.updated_at`
	query := fmt.Sprintf("SELECT %s FROM leads l LEFT JOIN projects p ON l.project_id = p.id AND p.deleted_at IS NULL WHERE %s", selFields, whereSQL)

	var row models.Lead
	var source, sourceDetail, stage, assignedType, priority, notes *string
	var importedID, projectID, presalesUserID, salesUserID *uuid.UUID
	var projectTitle *string
	var salesAcceptedAt *time.Time
	err := s.DB.QueryRow(ctx, query, args...).Scan(
		&row.ID, &row.OrganizationID, &row.Name, &row.Phone, &row.Email, &row.AlternatePhone,
		&row.Address, &row.City, &row.State, &row.Pincode,
		&source, &sourceDetail, &row.BudgetMin, &row.BudgetMax, &row.LeadTemperature,
		&row.Status, &stage, &row.AssignedToUserID, &assignedType, &row.AssignedAt,
		&priority, &row.Tags, &notes, &importedID,
		&projectID, &projectTitle,
		&presalesUserID, &salesUserID, &salesAcceptedAt,
		&row.CreatedAt, &row.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	row.Source = source
	row.SourceDetail = sourceDetail
	row.Stage = stage
	row.AssignedToUserType = assignedType
	row.Priority = priority
	row.Notes = notes
	row.ImportedDataID = importedID
	row.ProjectID = projectID
	row.ProjectTitle = projectTitle
	row.PresalesUserID = presalesUserID
	row.SalesUserID = salesUserID
	row.SalesAcceptedAt = salesAcceptedAt
	resp := row.ToLeadResponse()
	return &resp, nil
}

// ListRejectedLeads returns rejected leads with rejection reasons. GM and Manager only.
func (s *LeadService) ListRejectedLeads(ctx context.Context, organizationID, userID, userRole string, filters map[string]string) (*models.RejectedLeadsListResponse, error) {
	role := userRole
	if role == "general_manager" {
		role = "general-manager"
	}
	if role != "general-manager" && role != "manager" {
		return nil, errors.New("FORBIDDEN")
	}

	whereConditions := []string{"l.organization_id = $1", "l.deleted_at IS NULL", "l.status = 'rejected'"}
	args := []interface{}{organizationID}
	argCount := 2

	if v := filters["search"]; v != "" {
		searchArg := "%" + v + "%"
		whereConditions = append(whereConditions, fmt.Sprintf("(l.name ILIKE $%d OR l.phone ILIKE $%d OR l.email ILIKE $%d)", argCount, argCount, argCount))
		args = append(args, searchArg)
		argCount++
	}
	if v := filters["city"]; v != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("l.city ILIKE $%d", argCount))
		args = append(args, "%"+v+"%")
		argCount++
	}

	whereSQL := strings.Join(whereConditions, " AND ")
	page, limit := getLeadPagination(filters)
	offset := (page - 1) * limit

	countQuery := fmt.Sprintf("SELECT COUNT(DISTINCT l.id) FROM leads l INNER JOIN lead_rejections r ON r.lead_id = l.id WHERE %s", whereSQL)
	var total int
	if err := s.DB.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	// One row per lead with latest rejection (DISTINCT ON l.id, order by r.rejected_at DESC)
	listQuery := fmt.Sprintf(`
		SELECT DISTINCT ON (l.id) l.id, l.organization_id, l.name, l.phone, l.email, l.alternate_phone, l.address, l.city, l.state, l.pincode,
			l.source, l.source_detail, l.budget_min, l.budget_max, l.lead_temperature, l.status, l.stage,
			l.assigned_to_user_id, l.assigned_to_user_type, l.assigned_at, l.priority, l.tags, l.notes, l.imported_data_id,
			l.project_id, p.project_title,
			l.presales_user_id, l.sales_user_id, l.sales_accepted_at,
			l.created_at, l.updated_at,
			r.id AS rejection_id, r.rejected_at, r.rejected_by_user_id, r.rejected_by_user_type,
			r.questions_response, r.ai_summary, r.ai_bullet_points
		FROM leads l
		LEFT JOIN projects p ON l.project_id = p.id AND p.deleted_at IS NULL
		INNER JOIN lead_rejections r ON r.lead_id = l.id
		WHERE %s
		ORDER BY l.id, r.rejected_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argCount, argCount+1)
	args = append(args, limit, offset)

	rows, err := s.DB.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.RejectedLeadItem
	for rows.Next() {
		var row models.Lead
		var source, sourceDetail, stage, assignedType, priority, notes *string
		var importedID, projectID, presalesUserID, salesUserID *uuid.UUID
		var projectTitle *string
		var salesAcceptedAt *time.Time
		var rejectionID uuid.UUID
		var rejectedAt time.Time
		var rejectedByUserID *uuid.UUID
		var rejectedByUserType *string
		var questionsResponseJSON, aiBulletPointsJSON []byte
		var aiSummary *string
		err := rows.Scan(
			&row.ID, &row.OrganizationID, &row.Name, &row.Phone, &row.Email, &row.AlternatePhone,
			&row.Address, &row.City, &row.State, &row.Pincode,
			&source, &sourceDetail, &row.BudgetMin, &row.BudgetMax, &row.LeadTemperature,
			&row.Status, &stage, &row.AssignedToUserID, &assignedType, &row.AssignedAt,
			&priority, &row.Tags, &notes, &importedID,
			&projectID, &projectTitle,
			&presalesUserID, &salesUserID, &salesAcceptedAt,
			&row.CreatedAt, &row.UpdatedAt,
			&rejectionID, &rejectedAt, &rejectedByUserID, &rejectedByUserType,
			&questionsResponseJSON, &aiSummary, &aiBulletPointsJSON,
		)
		if err != nil {
			return nil, err
		}
		row.Source = source
		row.SourceDetail = sourceDetail
		row.Stage = stage
		row.AssignedToUserType = assignedType
		row.Priority = priority
		row.Notes = notes
		row.ImportedDataID = importedID
		row.ProjectID = projectID
		row.ProjectTitle = projectTitle
		row.PresalesUserID = presalesUserID
		row.SalesUserID = salesUserID
		row.SalesAcceptedAt = salesAcceptedAt
		var rejUserIDStr *string
		if rejectedByUserID != nil {
			s := rejectedByUserID.String()
			rejUserIDStr = &s
		}
		rejType := ""
		if rejectedByUserType != nil {
			rejType = *rejectedByUserType
		}
		var questionsResp []models.RejectionReasonItem
		if len(questionsResponseJSON) > 0 {
			_ = json.Unmarshal(questionsResponseJSON, &questionsResp)
		}
		var aiBullets []string
		if len(aiBulletPointsJSON) > 0 {
			_ = json.Unmarshal(aiBulletPointsJSON, &aiBullets)
		}
		list = append(list, models.RejectedLeadItem{
			Lead: row.ToLeadResponse(),
			Rejection: models.RejectedLeadRejectionInfo{
				RejectionID:        rejectionID.String(),
				RejectedAt:         rejectedAt,
				RejectedByUserID:    rejUserIDStr,
				RejectedByUserType:  rejType,
				QuestionsResponse:  questionsResp,
				AISummary:          aiSummary,
				AIBulletPoints:     aiBullets,
			},
		})
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if list == nil {
		list = []models.RejectedLeadItem{}
	}

	// Enrich questions_response with question_text and category from rejection_questions
	questionIDSet := make(map[string]struct{})
	for i := range list {
		for j := range list[i].Rejection.QuestionsResponse {
			id := list[i].Rejection.QuestionsResponse[j].QuestionID
			if id != "" {
				questionIDSet[id] = struct{}{}
			}
		}
	}
	if len(questionIDSet) > 0 {
		ids := make([]uuid.UUID, 0, len(questionIDSet))
		for idStr := range questionIDSet {
			if id, err := uuid.Parse(idStr); err == nil {
				ids = append(ids, id)
			}
		}
		if len(ids) > 0 {
			placeholders := make([]string, len(ids))
			argsQ := make([]interface{}, len(ids))
			for i := range ids {
				placeholders[i] = fmt.Sprintf("$%d", i+1)
				argsQ[i] = ids[i]
			}
			query := fmt.Sprintf(`SELECT id, question_text, category::text FROM rejection_questions WHERE id IN (%s)`, strings.Join(placeholders, ","))
			qRows, qErr := s.DB.Query(ctx, query, argsQ...)
			if qErr == nil {
				qMap := make(map[string]struct{ Text, Category string })
				for qRows.Next() {
					var id uuid.UUID
					var text, cat string
					if qRows.Scan(&id, &text, &cat) == nil {
						qMap[id.String()] = struct{ Text, Category string }{Text: text, Category: cat}
					}
				}
				qRows.Close()
				for i := range list {
					for j := range list[i].Rejection.QuestionsResponse {
						qid := list[i].Rejection.QuestionsResponse[j].QuestionID
						if q, ok := qMap[qid]; ok {
							list[i].Rejection.QuestionsResponse[j].QuestionText = q.Text
							list[i].Rejection.QuestionsResponse[j].Category = q.Category
						}
					}
				}
			}
		}
	}

	return &models.RejectedLeadsListResponse{
		RejectedLeads: list,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: (total + limit - 1) / limit,
		},
	}, nil
}

// stageToLeadsStage maps API next_stage (lead_stage_type) to leads.stage (lead_stage enum). leads uses site_visit not property_visit.
func stageToLeadsStage(nextStage string) string {
	if nextStage == "property_visit" {
		return "site_visit"
	}
	return nextStage
}

// hasApprovedQuotation is true when this lead has at least one manager-approved quotation in the org.
func (s *LeadService) hasApprovedQuotation(ctx context.Context, leadID, organizationID string) (bool, error) {
	var n int
	err := s.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM lead_quotations WHERE lead_id = $1 AND organization_id = $2 AND quotation_status = 'approved'`,
		leadID, organizationID).Scan(&n)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

// ForwardLeadToStage moves lead to next stage. Presales or Sales; lead must be assigned to this user.
// Sales: site_visit/property_visit -> negotiation, or negotiation -> booking (requires an approved quotation).
func (s *LeadService) ForwardLeadToStage(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.ForwardStageRequest) (*models.LeadResponse, error) {
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil || lead == nil {
		return nil, ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	currentStage := "qualification"
	if lead.Stage != nil && *lead.Stage != "" {
		currentStage = *lead.Stage
	}
	if userRole == "sales" {
		if currentStage == "site_visit" || currentStage == "property_visit" {
			if req.NextStage != "negotiation" {
				return nil, errors.New("INVALID_NEXT_STAGE")
			}
		} else if currentStage == "negotiation" {
			if req.NextStage != "booking" {
				return nil, errors.New("INVALID_NEXT_STAGE")
			}
			ok, err := s.hasApprovedQuotation(ctx, leadID, organizationID)
			if err != nil {
				return nil, err
			}
			if !ok {
				return nil, errors.New("QUOTATION_APPROVAL_REQUIRED")
			}
		} else {
			return nil, errors.New("INVALID_CURRENT_STAGE")
		}
	} else {
		// Presales: full flow
		allowedNext := map[string][]string{
			"qualification":  {"communication"},
			"communication":  {"property_visit"},
			"site_visit":     {"negotiation"},
			"property_visit": {"negotiation"},
			"negotiation":    {"booking"},
			"booking":        {},
		}
		nextAllowed, ok := allowedNext[currentStage]
		if !ok {
			return nil, errors.New("INVALID_CURRENT_STAGE")
		}
		valid := false
		for _, n := range nextAllowed {
			if n == req.NextStage {
				valid = true
				break
			}
		}
		if !valid {
			return nil, errors.New("INVALID_NEXT_STAGE")
		}
	}

	// Mark current active stage as completed
	_, _ = s.DB.Exec(ctx, `UPDATE lead_stages SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE lead_id = $1 AND organization_id = $2 AND status = 'active'`, leadID, organizationID)

	// Insert new lead_stages row (stage_type uses property_visit in DB)
	stageType := req.NextStage
	var remarks *string
	if req.Remarks != nil {
		remarks = req.Remarks
	}
	_, err = s.DB.Exec(ctx, `INSERT INTO lead_stages (organization_id, lead_id, stage_type, user_id, user_type, remarks, status)
		VALUES ($1, $2, $3::lead_stage_type, $4, $5::user_type, $6, 'active')`,
		organizationID, leadID, stageType, userID, userRole, remarks)
	if err != nil {
		return nil, err
	}

	// Auto-close active WhatsApp conversations for this lead (stage isolation)
	_, _ = s.DB.Exec(ctx,
		`UPDATE whatsapp_conversations SET status = 'closed', conversation_closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		 WHERE lead_id = $1 AND organization_id = $2 AND status = 'active'`,
		leadID, organizationID)

	// Update leads.stage (use site_visit for property_visit)
	leadsStage := stageToLeadsStage(req.NextStage)
	_, err = s.DB.Exec(ctx, `UPDATE leads SET stage = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND organization_id = $3 AND assigned_to_user_id = $4 AND assigned_to_user_type = $5 AND deleted_at IS NULL`,
		leadsStage, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, err
	}
	if req.NextStage == "booking" {
		if err := s.ensureLeadBookingRow(ctx, leadID, organizationID, userID, userRole); err != nil {
			return nil, err
		}
	}
	return s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
}

// ensureLeadBookingRow inserts lead_bookings when missing (stage + lead_stages already moved to booking).
// Prefers approved quotation totals; else latest negotiation; else minimal initiated row.
func (s *LeadService) ensureLeadBookingRow(ctx context.Context, leadID, organizationID, assigneeUserID, assigneeUserType string) error {
	var exists string
	err := s.DB.QueryRow(ctx, `SELECT id::text FROM lead_bookings WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&exists)
	if err == nil {
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	var stageID string
	_ = s.DB.QueryRow(ctx, `SELECT id::text FROM lead_stages WHERE lead_id = $1 AND organization_id = $2 AND stage_type = 'booking'::lead_stage_type AND status = 'active' ORDER BY created_at DESC LIMIT 1`, leadID, organizationID).Scan(&stageID)

	// 1) From approved quotation (highest version)
	tag, err := s.DB.Exec(ctx, `
INSERT INTO lead_bookings (
  organization_id, lead_id, user_id, user_type, stage_id,
  project_id, unit_id, addon_ids, final_total_price,
  maintenance_charges, legal_charges, stamp_duty, parking_charges,
  booking_status
)
SELECT
  $1::uuid, $2::uuid, $3::uuid, $4::user_type,
  CASE WHEN NULLIF(trim($5::text), '') IS NULL THEN NULL ELSE $5::uuid END,
  q.project_id, q.unit_id, COALESCE(q.addon_ids, ARRAY[]::uuid[]),
  (
    COALESCE(q.base_price,0) + COALESCE(q.parking_price,0) + COALESCE(q.infrastructure_cost,0)
    + COALESCE(q.development_charges,0) + COALESCE(q.water_charges,0) + COALESCE(q.mseb_charges,0)
    + COALESCE(q.legal_charges,0) + COALESCE(q.stamp_duty,0) + COALESCE(q.registration_fee,0)
    + COALESCE(q.gst,0) + COALESCE(q.vat,0) + COALESCE(q.one_time_maintenance,0)
    - COALESCE(q.discount_price,0)
  ),
  q.one_time_maintenance, q.legal_charges, q.stamp_duty, q.parking_price,
  'initiated'::booking_status
FROM lead_quotations q
WHERE q.lead_id = $2::uuid AND q.organization_id = $1::uuid AND q.quotation_status = 'approved'
ORDER BY q.quotation_version DESC NULLS LAST
LIMIT 1`, organizationID, leadID, assigneeUserID, assigneeUserType, stageID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		return nil
	}

	// 2) Latest negotiation
	tag, err = s.DB.Exec(ctx, `
INSERT INTO lead_bookings (
  organization_id, lead_id, user_id, user_type, stage_id,
  project_id, unit_id, addon_ids, final_total_price,
  booking_status
)
SELECT
  $1::uuid, $2::uuid, $3::uuid, $4::user_type,
  CASE WHEN NULLIF(trim($5::text), '') IS NULL THEN NULL ELSE $5::uuid END,
  n.project_id, n.unit_id, COALESCE(n.addon_ids, ARRAY[]::uuid[]),
  COALESCE(n.final_price_agreed, n.price_offered, 0),
  'initiated'::booking_status
FROM lead_negotiations n
WHERE n.lead_id = $2::uuid AND n.organization_id = $1::uuid
ORDER BY n.created_at DESC
LIMIT 1`, organizationID, leadID, assigneeUserID, assigneeUserType, stageID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		return nil
	}

	// 3) Shell row so GET/PATCH/submit work
	_, err = s.DB.Exec(ctx, `
INSERT INTO lead_bookings (
  organization_id, lead_id, user_id, user_type, stage_id,
  booking_status
)
VALUES (
  $1::uuid, $2::uuid, $3::uuid, $4::user_type,
  CASE WHEN NULLIF(trim($5::text), '') IS NULL THEN NULL ELSE $5::uuid END,
  'initiated'::booking_status
)`, organizationID, leadID, assigneeUserID, assigneeUserType, stageID)
	return err
}

// EnsureLeadBookingRowIfMissing creates lead_bookings when leads.stage is booking but no row exists (repairs older forwards / inconsistent data).
func (s *LeadService) EnsureLeadBookingRowIfMissing(ctx context.Context, leadID, organizationID string) error {
	var exists string
	err := s.DB.QueryRow(ctx, `SELECT id::text FROM lead_bookings WHERE lead_id = $1 AND organization_id = $2`, leadID, organizationID).Scan(&exists)
	if err == nil {
		return nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	var stageVal *string
	err = s.DB.QueryRow(ctx, `SELECT stage::text FROM leads WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`, leadID, organizationID).Scan(&stageVal)
	if err != nil {
		return err
	}
	if stageVal == nil || *stageVal != "booking" {
		return nil
	}
	var uid, utype string
	err = s.DB.QueryRow(ctx, `SELECT assigned_to_user_id::text, assigned_to_user_type::text FROM leads WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`, leadID, organizationID).Scan(&uid, &utype)
	if err != nil {
		return err
	}
	return s.ensureLeadBookingRow(ctx, leadID, organizationID, uid, utype)
}

// GetLeadsByStageWithDetails returns leads in the given stage with follow-ups, stage remarks, recent calls, whatsapp. Presales only.
func (s *LeadService) GetLeadsByStageWithDetails(ctx context.Context, organizationID, userID, stage string, filters map[string]string) (*models.LeadDetailsByStageResponse, error) {
	// Map API stage to DB stage (property_visit -> site_visit for leads table)
	dbStage := stage
	if stage == "property_visit" {
		dbStage = "site_visit"
	}
	whereConditions := []string{"l.organization_id = $1", "l.deleted_at IS NULL", "l.assigned_to_user_id = $2", "l.assigned_to_user_type = 'presales'", "l.stage = $3"}
	args := []interface{}{organizationID, userID, dbStage}
	argCount := 4
	if v := filters["search"]; v != "" {
		searchArg := "%" + v + "%"
		whereConditions = append(whereConditions, fmt.Sprintf("(l.name ILIKE $%d OR l.phone ILIKE $%d OR l.email ILIKE $%d)", argCount, argCount, argCount))
		args = append(args, searchArg)
		argCount++
	}
	whereSQL := strings.Join(whereConditions, " AND ")
	page, limit := getLeadPagination(filters)
	offset := (page - 1) * limit

	var total int
	err := s.DB.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM leads l WHERE %s", whereSQL), args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	selFields := `l.id, l.organization_id, l.name, l.phone, l.email, l.alternate_phone, l.address, l.city, l.state, l.pincode,
		l.source, l.source_detail, l.budget_min, l.budget_max, l.lead_temperature, l.status, l.stage,
		l.assigned_to_user_id, l.assigned_to_user_type, l.assigned_at, l.priority, l.tags, l.notes, l.imported_data_id,
		l.project_id, p.project_title,
		l.presales_user_id, l.sales_user_id, l.sales_accepted_at,
		l.created_at, l.updated_at`
	listQuery := fmt.Sprintf("SELECT %s FROM leads l LEFT JOIN projects p ON l.project_id = p.id AND p.deleted_at IS NULL WHERE %s ORDER BY l.updated_at DESC LIMIT $%d OFFSET $%d",
		selFields, whereSQL, argCount, argCount+1)
	args = append(args, limit, offset)
	rows, err := s.DB.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leads []models.Lead
	for rows.Next() {
		var row models.Lead
		var source, sourceDetail, stageVal, assignedType, priority, notes *string
		var importedID, projectID, presalesUserID, salesUserID *uuid.UUID
		var projectTitle *string
		var salesAcceptedAt *time.Time
		err := rows.Scan(
			&row.ID, &row.OrganizationID, &row.Name, &row.Phone, &row.Email, &row.AlternatePhone,
			&row.Address, &row.City, &row.State, &row.Pincode,
			&source, &sourceDetail, &row.BudgetMin, &row.BudgetMax, &row.LeadTemperature,
			&row.Status, &stageVal, &row.AssignedToUserID, &assignedType, &row.AssignedAt,
			&priority, &row.Tags, &notes, &importedID,
			&projectID, &projectTitle,
			&presalesUserID, &salesUserID, &salesAcceptedAt,
			&row.CreatedAt, &row.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		row.Source = source
		row.SourceDetail = sourceDetail
		row.Stage = stageVal
		row.AssignedToUserType = assignedType
		row.Priority = priority
		row.Notes = notes
		row.ImportedDataID = importedID
		row.ProjectID = projectID
		row.ProjectTitle = projectTitle
		row.PresalesUserID = presalesUserID
		row.SalesUserID = salesUserID
		row.SalesAcceptedAt = salesAcceptedAt
		leads = append(leads, row)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	// Build detail for each lead
	result := make([]models.LeadDetailByStageItem, 0, len(leads))
	for i := range leads {
		item := models.LeadDetailByStageItem{Lead: leads[i].ToLeadResponse()}
		leadID := leads[i].ID.String()

		// Stage remarks (lead_stages for this lead)
		stageRows, _ := s.DB.Query(ctx, `SELECT id, stage_type, remarks, created_at FROM lead_stages WHERE lead_id = $1 AND organization_id = $2 AND remarks IS NOT NULL AND remarks != '' ORDER BY created_at DESC`, leadID, organizationID)
		for stageRows.Next() {
			var id uuid.UUID
			var stageType, remarks string
			var createdAt time.Time
			if stageRows.Scan(&id, &stageType, &remarks, &createdAt) == nil {
				item.StageRemarks = append(item.StageRemarks, models.StageRemarkItem{StageID: id.String(), StageType: stageType, Remarks: remarks, CreatedAt: createdAt})
			}
		}
		stageRows.Close()

		// Follow-ups for this lead (last 20)
		fupRows, _ := s.DB.Query(ctx, `SELECT id, lead_stage_id, followup_type, followup_date, remark, status, created_at, completed_at FROM lead_followups WHERE lead_id = $1 AND organization_id = $2 ORDER BY followup_date DESC LIMIT 20`, leadID, organizationID)
		for fupRows.Next() {
			var id uuid.UUID
			var followupDate, createdAt time.Time
			var leadStageID *uuid.UUID
			var followupType, status string
			var remark *string
			var completedAt *time.Time
			if fupRows.Scan(&id, &leadStageID, &followupType, &followupDate, &remark, &status, &createdAt, &completedAt) == nil {
				fu := models.FollowUpItem{ID: id.String(), FollowupType: followupType, FollowupDate: followupDate, Status: status, CreatedAt: createdAt}
				if leadStageID != nil {
					fu.LeadStageID = ptr(leadStageID.String())
				}
				fu.Remark = remark
				fu.CompletedAt = completedAt
				item.FollowUps = append(item.FollowUps, fu)
			}
		}
		fupRows.Close()

		// Recent calls (last 10)
		callRows, _ := s.DB.Query(ctx, `SELECT id, lead_stage_id, call_status, call_outcome, call_started_at, call_ended_at, created_at FROM lead_calls WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 10`, leadID, organizationID)
		for callRows.Next() {
			var id uuid.UUID
			var callStatus string
			var createdAt time.Time
			var leadStageID *uuid.UUID
			var callOutcome *string
			var startedAt, endedAt *time.Time
			if callRows.Scan(&id, &leadStageID, &callStatus, &callOutcome, &startedAt, &endedAt, &createdAt) == nil {
				c := models.LeadCallItem{ID: id.String(), CallStatus: callStatus, CreatedAt: createdAt}
				if leadStageID != nil {
					c.LeadStageID = ptr(leadStageID.String())
				}
				c.CallOutcome = callOutcome
				c.StartedAt = startedAt
				c.EndedAt = endedAt
				item.RecentCalls = append(item.RecentCalls, c)
			}
		}
		callRows.Close()

		// WhatsApp conversations (last 5 convos, each with last 5 messages)
		convRows, _ := s.DB.Query(ctx, `SELECT id, lead_stage_id, status, conversation_started_at, last_message_at FROM whatsapp_conversations WHERE lead_id = $1 AND organization_id = $2 ORDER BY last_message_at DESC NULLS LAST, conversation_started_at DESC LIMIT 5`, leadID, organizationID)
		for convRows.Next() {
			var id uuid.UUID
			var status string
			var startedAt time.Time
			var leadStageID *uuid.UUID
			var lastMsgAt *time.Time
			if convRows.Scan(&id, &leadStageID, &status, &startedAt, &lastMsgAt) == nil {
				wc := models.WhatsAppConversationItem{ID: id.String(), Status: status, StartedAt: startedAt}
				if leadStageID != nil {
					wc.LeadStageID = ptr(leadStageID.String())
				}
				wc.LastMessageAt = lastMsgAt
				msgRows, _ := s.DB.Query(ctx, `SELECT id, direction, message_text, sent_at FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY sent_at DESC LIMIT 5`, id.String())
				for msgRows.Next() {
					var mid uuid.UUID
					var direction string
					var sentAt time.Time
					var msgText *string
					if msgRows.Scan(&mid, &direction, &msgText, &sentAt) == nil {
						wc.Messages = append(wc.Messages, models.WhatsAppMessageItem{ID: mid.String(), Direction: direction, MessageText: msgText, SentAt: sentAt})
					}
				}
				msgRows.Close()
				item.WhatsAppConversations = append(item.WhatsAppConversations, wc)
			}
		}
		convRows.Close()

		result = append(result, item)
	}

	return &models.LeadDetailsByStageResponse{
		Leads: result,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: (total + limit - 1) / limit,
		},
	}, nil
}

func ptr(s string) *string { return &s }

// GetLeadStageByType returns the lead's stage of given type (e.g. communication) with recent calls (with recording), follow-ups, WhatsApp conversations and messages, and stage remarks. Presales (all types); Sales (property_visit, negotiation, booking). Lead must be assigned.
func (s *LeadService) GetLeadStageByType(ctx context.Context, leadID, stageType, organizationID, userID, userRole string) (*models.LeadStageByTypeResponse, error) {
	roleForAuth := "presales"
	if (stageType == "property_visit" || stageType == "booking" || stageType == "negotiation") && (userRole == "presales" || userRole == "sales") {
		roleForAuth = userRole
	}
	_, err := s.GetLeadByID(ctx, leadID, organizationID, userID, roleForAuth)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	allowed := map[string]bool{"qualification": true, "communication": true, "property_visit": true, "negotiation": true, "booking": true}
	if !allowed[stageType] {
		return nil, errors.New("INVALID_STAGE_TYPE")
	}

	var stage models.StageInfo
	var stageUUID, leadUUID uuid.UUID
	var remarks *string
	var status string
	var createdAt, updatedAt time.Time
	err = s.DB.QueryRow(ctx, `SELECT id, lead_id, stage_type::text, remarks, status::text, created_at, updated_at
		FROM lead_stages WHERE lead_id = $1 AND organization_id = $2 AND stage_type::text = $3 ORDER BY created_at DESC LIMIT 1`,
		leadID, organizationID, stageType).Scan(&stageUUID, &leadUUID, &stage.StageType, &remarks, &status, &createdAt, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Legacy/imported leads may have leads.stage set but no lead_stages rows yet.
			// Create a minimal stage row on-demand so UI actions (visit/calls/remarks) work.
			_, insErr := s.DB.Exec(ctx, `INSERT INTO lead_stages (organization_id, lead_id, stage_type, user_id, user_type, status)
				VALUES ($1, $2, $3::lead_stage_type, $4, $5::user_type, 'active')`,
				organizationID, leadID, stageType, userID, roleForAuth)
			if insErr != nil {
				return nil, insErr
			}
			// Re-query after insert
			err = s.DB.QueryRow(ctx, `SELECT id, lead_id, stage_type::text, remarks, status::text, created_at, updated_at
				FROM lead_stages WHERE lead_id = $1 AND organization_id = $2 AND stage_type::text = $3 ORDER BY created_at DESC LIMIT 1`,
				leadID, organizationID, stageType).Scan(&stageUUID, &leadUUID, &stage.StageType, &remarks, &status, &createdAt, &updatedAt)
			if err != nil {
				return nil, err
			}
		}
		if err != nil {
			return nil, err
		}
	}
	stage.ID = stageUUID.String()
	stage.LeadID = leadUUID.String()
	stage.Remarks = remarks
	stage.Status = status
	stage.CreatedAt = createdAt
	stage.UpdatedAt = updatedAt
	stageID := stageUUID.String()

	// Recent calls for this stage (with recording), last 20
	callRows, _ := s.DB.Query(ctx, `SELECT id, lead_stage_id, call_status, call_outcome, call_started_at, call_ended_at, recording_url, recording_duration, created_at
		FROM lead_calls WHERE lead_stage_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 20`, stageID, organizationID)
	var recentCalls []models.StageCallDetail
	for callRows.Next() {
		var id, lsID uuid.UUID
		var callStatus string
		var createdAt time.Time
		var callOutcome *string
		var startedAt, endedAt *time.Time
		var recordingURL *string
		var recordingDuration *int
		if callRows.Scan(&id, &lsID, &callStatus, &callOutcome, &startedAt, &endedAt, &recordingURL, &recordingDuration, &createdAt) == nil {
			c := models.StageCallDetail{ID: id.String(), LeadStageID: lsID.String(), CallStatus: callStatus, CreatedAt: createdAt}
			c.CallOutcome = callOutcome
			c.CallStartedAt = startedAt
			c.CallEndedAt = endedAt
			c.RecordingURL = recordingURL
			c.RecordingDuration = recordingDuration
			s.signRecordingURL(ctx, c.RecordingURL)
			recentCalls = append(recentCalls, c)
		}
	}
	callRows.Close()

	// Follow-ups for this stage, last 20
	fupRows, _ := s.DB.Query(ctx, `SELECT id, lead_stage_id, lead_call_id, followup_type, followup_date, remark, status, created_at, completed_at FROM lead_followups WHERE lead_stage_id = $1 AND organization_id = $2 ORDER BY followup_date DESC LIMIT 20`, stageID, organizationID)
	var followUps []models.FollowUpItem
	for fupRows.Next() {
		var id uuid.UUID
		var followupDate, createdAt time.Time
		var leadStageID, leadCallID *uuid.UUID
		var followupType, status string
		var remark *string
		var completedAt *time.Time
		if fupRows.Scan(&id, &leadStageID, &leadCallID, &followupType, &followupDate, &remark, &status, &createdAt, &completedAt) == nil {
			fu := models.FollowUpItem{ID: id.String(), FollowupType: followupType, FollowupDate: followupDate, Status: status, CreatedAt: createdAt}
			if leadStageID != nil {
				fu.LeadStageID = ptr(leadStageID.String())
			}
			if leadCallID != nil {
				fu.LeadCallID = ptr(leadCallID.String())
			}
			fu.Remark = remark
			fu.CompletedAt = completedAt
			followUps = append(followUps, fu)
		}
	}
	fupRows.Close()

	// WhatsApp conversations for this stage, last 5 convos, each with last 5 messages
	convRows, _ := s.DB.Query(ctx, `SELECT id, lead_stage_id, status, conversation_started_at, last_message_at FROM whatsapp_conversations WHERE lead_stage_id = $1 AND organization_id = $2 ORDER BY last_message_at DESC NULLS LAST, conversation_started_at DESC LIMIT 5`, stageID, organizationID)
	var whatsappConvos []models.WhatsAppConversationItem
	for convRows.Next() {
		var id uuid.UUID
		var status string
		var startedAt time.Time
		var leadStageID *uuid.UUID
		var lastMsgAt *time.Time
		if convRows.Scan(&id, &leadStageID, &status, &startedAt, &lastMsgAt) == nil {
			wc := models.WhatsAppConversationItem{ID: id.String(), Status: status, StartedAt: startedAt}
			if leadStageID != nil {
				wc.LeadStageID = ptr(leadStageID.String())
			}
			wc.LastMessageAt = lastMsgAt
			msgRows, _ := s.DB.Query(ctx, `SELECT id, direction, message_text, sent_at FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY sent_at DESC LIMIT 5`, id.String())
			for msgRows.Next() {
				var mid uuid.UUID
				var direction string
				var sentAt time.Time
				var msgText *string
				if msgRows.Scan(&mid, &direction, &msgText, &sentAt) == nil {
					wc.Messages = append(wc.Messages, models.WhatsAppMessageItem{ID: mid.String(), Direction: direction, MessageText: msgText, SentAt: sentAt})
				}
			}
			msgRows.Close()
			whatsappConvos = append(whatsappConvos, wc)
		}
	}
	convRows.Close()

	resp := &models.LeadStageByTypeResponse{
		Stage:                 stage,
		RecentCalls:           recentCalls,
		FollowUps:             followUps,
		WhatsAppConversations: whatsappConvos,
	}
	if stageType == "property_visit" {
		visits, _ := s.listVisitsForLead(ctx, leadID, organizationID)
		resp.Visits = visits
	}
	return resp, nil
}

// listVisitsForLead returns all property visits for a lead (for stage by-type property_visit).
func (s *LeadService) listVisitsForLead(ctx context.Context, leadID, organizationID string) ([]models.PropertyVisitItem, error) {
	rows, err := s.DB.Query(ctx, `SELECT id, lead_id, project_id, visit_type, visit_date, visit_time::text, scheduled_at, status, delay_reason, outcome, remarks, site_visit_images, location_city, location_area, location_coordinates, created_at, updated_at
		FROM lead_property_visits WHERE lead_id = $1 AND organization_id = $2 ORDER BY scheduled_at DESC NULLS LAST, visit_date DESC NULLS LAST, created_at DESC`, leadID, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.PropertyVisitItem
	for rows.Next() {
		var v models.PropertyVisitItem
		var id, leadUUID uuid.UUID
		var projectID *uuid.UUID
		var visitDate *time.Time
		var visitTime *string
		var scheduledAt *time.Time
		var delayReason, outcome, remarks, locCity, locArea, locCoord *string
		var siteImages []string
		var createdAt, updatedAt time.Time
		err := rows.Scan(&id, &leadUUID, &projectID, &v.VisitType, &visitDate, &visitTime, &scheduledAt, &v.Status, &delayReason, &outcome, &remarks, &siteImages, &locCity, &locArea, &locCoord, &createdAt, &updatedAt)
		if err != nil {
			return nil, err
		}
		v.ID = id.String()
		v.LeadID = leadUUID.String()
		if projectID != nil {
			s := projectID.String()
			v.ProjectID = &s
		}
		v.VisitDate = visitDate
		v.VisitTime = visitTime
		v.ScheduledAt = scheduledAt
		v.DelayReason = delayReason
		v.Outcome = outcome
		v.Remarks = remarks
		v.SiteVisitImages = siteImages
		v.SiteVisitImageURLs = s.resolveVisitImages(ctx, siteImages)
		v.LocationCity = locCity
		v.LocationArea = locArea
		v.LocationCoordinates = locCoord
		v.CreatedAt = createdAt
		v.UpdatedAt = updatedAt
		list = append(list, v)
	}
	return list, rows.Err()
}

// GetLeadSummary returns lead profile, presales user, recent calls, WhatsApp conversations, stage remarks, and interested property. Sales only.
func (s *LeadService) GetLeadSummary(ctx context.Context, leadID, organizationID, userID string) (*models.LeadSummaryResponse, error) {
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, "sales")
	if err != nil {
		return nil, err
	}

	out := &models.LeadSummaryResponse{
		Lead:                  *lead,
		RecentCalls:            nil,
		WhatsAppConversations: nil,
		StageRemarks:           nil,
	}

	// Presales user (managed by)
	if lead.PresalesUserID != nil && *lead.PresalesUserID != "" {
		var name, email, phone string
		if s.DB.QueryRow(ctx, `SELECT name, email, phone FROM users_presales WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`, *lead.PresalesUserID, organizationID).Scan(&name, &email, &phone) == nil {
			out.PresalesUser = &models.PresalesUserSummary{ID: *lead.PresalesUserID, Name: name, Email: email, Phone: phone}
		}
	}

	// Recent calls (all stages for this lead), last 20
	callRows, _ := s.DB.Query(ctx, `SELECT id, lead_stage_id, call_status, call_outcome, call_started_at, call_ended_at, recording_url, recording_duration, created_at
		FROM lead_calls WHERE lead_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 20`, leadID, organizationID)
	for callRows.Next() {
		var id uuid.UUID
		var lsID *uuid.UUID
		var callStatus string
		var createdAt time.Time
		var callOutcome *string
		var startedAt, endedAt *time.Time
		var recordingURL *string
		var recordingDuration *int
		if callRows.Scan(&id, &lsID, &callStatus, &callOutcome, &startedAt, &endedAt, &recordingURL, &recordingDuration, &createdAt) == nil {
			leadStageIDStr := ""
			if lsID != nil {
				leadStageIDStr = lsID.String()
			}
			c := models.StageCallDetail{ID: id.String(), LeadStageID: leadStageIDStr, CallStatus: callStatus, CreatedAt: createdAt}
			c.CallOutcome = callOutcome
			c.CallStartedAt = startedAt
			c.CallEndedAt = endedAt
			c.RecordingURL = recordingURL
			c.RecordingDuration = recordingDuration
			s.signRecordingURL(ctx, c.RecordingURL)
			out.RecentCalls = append(out.RecentCalls, c)
		}
	}
	callRows.Close()

	// WhatsApp conversations for this lead, last 5, each with last 5 messages
	convRows, _ := s.DB.Query(ctx, `SELECT id, lead_stage_id, status, conversation_started_at, last_message_at FROM whatsapp_conversations WHERE lead_id = $1 AND organization_id = $2 ORDER BY last_message_at DESC NULLS LAST, conversation_started_at DESC LIMIT 5`, leadID, organizationID)
	for convRows.Next() {
		var id uuid.UUID
		var status string
		var startedAt time.Time
		var leadStageID *uuid.UUID
		var lastMsgAt *time.Time
		if convRows.Scan(&id, &leadStageID, &status, &startedAt, &lastMsgAt) == nil {
			wc := models.WhatsAppConversationItem{ID: id.String(), Status: status, StartedAt: startedAt}
			if leadStageID != nil {
				wc.LeadStageID = ptr(leadStageID.String())
			}
			wc.LastMessageAt = lastMsgAt
			msgRows, _ := s.DB.Query(ctx, `SELECT id, direction, message_text, sent_at FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY sent_at DESC LIMIT 5`, id.String())
			for msgRows.Next() {
				var mid uuid.UUID
				var direction string
				var sentAt time.Time
				var msgText *string
				if msgRows.Scan(&mid, &direction, &msgText, &sentAt) == nil {
					wc.Messages = append(wc.Messages, models.WhatsAppMessageItem{ID: mid.String(), Direction: direction, MessageText: msgText, SentAt: sentAt})
				}
			}
			msgRows.Close()
			out.WhatsAppConversations = append(out.WhatsAppConversations, wc)
		}
	}
	convRows.Close()

	// Stage remarks (all stages with non-empty remarks)
	stageRows, _ := s.DB.Query(ctx, `SELECT id, stage_type, remarks, created_at FROM lead_stages WHERE lead_id = $1 AND organization_id = $2 AND remarks IS NOT NULL AND remarks != '' ORDER BY created_at DESC`, leadID, organizationID)
	for stageRows.Next() {
		var stageUUID uuid.UUID
		var stageType, remarks string
		var createdAt time.Time
		if stageRows.Scan(&stageUUID, &stageType, &remarks, &createdAt) == nil {
			out.StageRemarks = append(out.StageRemarks, models.StageRemarkItem{StageID: stageUUID.String(), StageType: stageType, Remarks: remarks, CreatedAt: createdAt})
		}
	}
	stageRows.Close()

	// Interested property (from lead's project_id / project_title)
	if lead.ProjectID != nil && *lead.ProjectID != "" {
		title := ""
		if lead.ProjectTitle != nil {
			title = *lead.ProjectTitle
		}
		out.InterestedProperty = &models.ProjectSummary{ProjectID: *lead.ProjectID, ProjectTitle: title}
	}

	return out, nil
}

// GetLeadStageByID returns stage details (remarks) and all calls for this stage with recording. Presales or Sales; lead must be assigned.
func (s *LeadService) GetLeadStageByID(ctx context.Context, leadID, stageID, organizationID, userID, userRole string) (*models.StageDetailResponse, error) {
	_, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var stage models.StageInfo
	var stageUUID, leadUUID uuid.UUID
	var remarks *string
	var status string
	var createdAt, updatedAt time.Time
	err = s.DB.QueryRow(ctx, `SELECT id, lead_id, stage_type::text, remarks, status::text, created_at, updated_at
		FROM lead_stages WHERE id = $1 AND lead_id = $2 AND organization_id = $3`,
		stageID, leadID, organizationID).Scan(&stageUUID, &leadUUID, &stage.StageType, &remarks, &status, &createdAt, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	stage.ID = stageUUID.String()
	stage.LeadID = leadUUID.String()
	stage.Remarks = remarks
	stage.Status = status
	stage.CreatedAt = createdAt
	stage.UpdatedAt = updatedAt

	callRows, err := s.DB.Query(ctx, `SELECT id, lead_stage_id, call_status, call_outcome, call_started_at, call_ended_at, recording_url, recording_duration, created_at
		FROM lead_calls WHERE lead_stage_id = $1 AND organization_id = $2 ORDER BY created_at DESC`, stageID, organizationID)
	if err != nil {
		return nil, err
	}
	defer callRows.Close()
	var calls []models.StageCallDetail
	for callRows.Next() {
		var id, lsID uuid.UUID
		var callStatus string
		var createdAt time.Time
		var callOutcome *string
		var startedAt, endedAt *time.Time
		var recordingURL *string
		var recordingDuration *int
		if callRows.Scan(&id, &lsID, &callStatus, &callOutcome, &startedAt, &endedAt, &recordingURL, &recordingDuration, &createdAt) == nil {
			c := models.StageCallDetail{ID: id.String(), LeadStageID: lsID.String(), CallStatus: callStatus, CreatedAt: createdAt}
			c.CallOutcome = callOutcome
			c.CallStartedAt = startedAt
			c.CallEndedAt = endedAt
			c.RecordingURL = recordingURL
			c.RecordingDuration = recordingDuration
			s.signRecordingURL(ctx, c.RecordingURL)
			calls = append(calls, c)
		}
	}
	return &models.StageDetailResponse{Stage: stage, Calls: calls}, nil
}

// AddLeadStageRemark sets remarks on a specific lead_stages row. Presales: any stage, lead assigned to them. Sales: only property_visit stage, lead assigned to them.
func (s *LeadService) AddLeadStageRemark(ctx context.Context, leadID, stageID, organizationID, userID, userRole, remarks string) (*models.LeadStageRemarkResponse, error) {
	roleForAuth := userRole
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, roleForAuth)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	// Sales can only add remarks to property_visit (PV) stage
	if userRole == "sales" {
		var stageType string
		err = s.DB.QueryRow(ctx, `SELECT stage_type::text FROM lead_stages WHERE id = $1 AND lead_id = $2 AND organization_id = $3`, stageID, leadID, organizationID).Scan(&stageType)
		if err != nil {
			if err == pgx.ErrNoRows {
				return nil, ErrLeadNotFound
			}
			return nil, err
		}
		if stageType != "property_visit" {
			return nil, ErrLeadForbidden // sales can only remark on property_visit stage
		}
	}
	// Verify stage belongs to this lead and org, then update remarks
	var stageType string
	var updatedAt time.Time
	err = s.DB.QueryRow(ctx, `UPDATE lead_stages SET remarks = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND lead_id = $3 AND organization_id = $4
		RETURNING stage_type::text, updated_at`,
		remarks, stageID, leadID, organizationID).Scan(&stageType, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound // stage not found or not for this lead
		}
		return nil, err
	}
	return &models.LeadStageRemarkResponse{
		StageID:   stageID,
		LeadID:    leadID,
		StageType: stageType,
		Remarks:   remarks,
		UpdatedAt: updatedAt,
	}, nil
}

// CreateFollowUp creates a follow-up for a lead stage. Sales or Presales; lead must be assigned.
func (s *LeadService) CreateFollowUp(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.CreateFollowUpRequest) (*models.FollowUpDetail, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	// Verify lead_stage_id belongs to this lead and org
	var stageLeadID string
	err = s.DB.QueryRow(ctx, `SELECT lead_id::text FROM lead_stages WHERE id = $1 AND organization_id = $2`, req.LeadStageID, organizationID).Scan(&stageLeadID)
	if err != nil || stageLeadID != leadID {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	var leadCallID interface{}
	if req.LeadCallID != nil && *req.LeadCallID != "" {
		leadCallID = *req.LeadCallID
	}
	var id uuid.UUID
	var createdAt time.Time
	err = s.DB.QueryRow(ctx, `INSERT INTO lead_followups (organization_id, lead_id, lead_stage_id, user_id, user_type, followup_type, followup_date, remark, lead_call_id, status)
		VALUES ($1, $2, $3, $4::uuid, $5::user_type, $6::followup_type, $7, $8, $9, 'pending')
		RETURNING id, created_at`,
		organizationID, leadID, req.LeadStageID, userID, userRole, req.FollowupType, req.FollowupDate, req.Remark, leadCallID).Scan(&id, &createdAt)
	if err != nil {
		return nil, err
	}
	return &models.FollowUpDetail{
		ID:           id.String(),
		LeadID:       leadID,
		LeadStageID:  &req.LeadStageID,
		LeadCallID:   req.LeadCallID,
		FollowupType: req.FollowupType,
		FollowupDate: req.FollowupDate,
		Remark:       &req.Remark,
		Status:       "pending",
		CreatedAt:    createdAt,
	}, nil
}

// GetFollowUpByID returns follow-up details with stage and linked call (with recording). Sales or Presales; lead must be assigned.
func (s *LeadService) GetFollowUpByID(ctx context.Context, leadID, followupID, organizationID, userID, userRole string) (*models.FollowUpDetailResponse, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	_, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var fu models.FollowUpDetail
	var idUUID, leadUUID uuid.UUID
	var leadStageID, leadCallID *uuid.UUID
	var remark *string
	var outcome *string
	var completedAt *time.Time
	err = s.DB.QueryRow(ctx, `SELECT id, lead_id, lead_stage_id, lead_call_id, followup_type, followup_date, remark, status, outcome, created_at, completed_at
		FROM lead_followups WHERE id = $1 AND lead_id = $2 AND organization_id = $3`,
		followupID, leadID, organizationID).Scan(&idUUID, &leadUUID, &leadStageID, &leadCallID, &fu.FollowupType, &fu.FollowupDate, &remark, &fu.Status, &outcome, &fu.CreatedAt, &completedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	fu.ID = idUUID.String()
	fu.LeadID = leadUUID.String()
	if leadStageID != nil {
		fu.LeadStageID = ptr(leadStageID.String())
	}
	if leadCallID != nil {
		s := leadCallID.String()
		fu.LeadCallID = &s
	}
	fu.Remark = remark
	fu.Outcome = outcome
	fu.CompletedAt = completedAt

	resp := &models.FollowUpDetailResponse{FollowUp: fu}

	if leadStageID != nil {
		var stage models.StageInfo
		var stageUUID, lsLeadUUID uuid.UUID
		var stageRemarks *string
		var status string
		var createdAt, updatedAt time.Time
		err = s.DB.QueryRow(ctx, `SELECT id, lead_id, stage_type::text, remarks, status::text, created_at, updated_at FROM lead_stages WHERE id = $1`, leadStageID.String()).Scan(&stageUUID, &lsLeadUUID, &stage.StageType, &stageRemarks, &status, &createdAt, &updatedAt)
		if err == nil {
			stage.ID = stageUUID.String()
			stage.LeadID = lsLeadUUID.String()
			stage.Remarks = stageRemarks
			stage.Status = status
			stage.CreatedAt = createdAt
			stage.UpdatedAt = updatedAt
			resp.Stage = &stage
		}
	}
	if leadCallID != nil {
		var c models.StageCallDetail
		var callID uuid.UUID
		var lsID uuid.UUID
		var callStatus string
		var createdAt time.Time
		var callOutcome *string
		var startedAt, endedAt *time.Time
		var recordingURL *string
		var recordingDuration *int
		err = s.DB.QueryRow(ctx, `SELECT id, lead_stage_id, call_status, call_outcome, call_started_at, call_ended_at, recording_url, recording_duration, created_at
			FROM lead_calls WHERE id = $1 AND organization_id = $2`, leadCallID.String(), organizationID).Scan(&callID, &lsID, &callStatus, &callOutcome, &startedAt, &endedAt, &recordingURL, &recordingDuration, &createdAt)
		if err == nil {
			c.ID = callID.String()
			c.LeadStageID = lsID.String()
			c.CallStatus = callStatus
			c.CallOutcome = callOutcome
			c.CallStartedAt = startedAt
			c.CallEndedAt = endedAt
			c.RecordingURL = recordingURL
			c.RecordingDuration = recordingDuration
			c.CreatedAt = createdAt
			s.signRecordingURL(ctx, c.RecordingURL)
			resp.LinkedCall = &c
		}
	}
	return resp, nil
}

// CompleteFollowUp sets follow-up status to completed with outcome. Sales or Presales; lead must be assigned.
func (s *LeadService) CompleteFollowUp(ctx context.Context, leadID, followupID, organizationID, userID, userRole string, req *models.CompleteFollowUpRequest) (*models.FollowUpDetail, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	var id uuid.UUID
	var leadStageID *uuid.UUID
	var leadCallID *uuid.UUID
	var followupType string
	var followupDate time.Time
	var remark *string
	var createdAt time.Time
	var completedAt time.Time
	updateQuery := `UPDATE lead_followups SET status = 'completed', completed_at = CURRENT_TIMESTAMP, outcome = $1::followup_outcome`
	args := []interface{}{req.Outcome}
	if req.Remark != nil {
		updateQuery += `, remark = $2`
		args = append(args, *req.Remark)
	}
	args = append(args, followupID, leadID, organizationID)
	argIdx := len(args)
	updateQuery += fmt.Sprintf(` WHERE id = $%d AND lead_id = $%d AND organization_id = $%d RETURNING id, lead_id, lead_stage_id, lead_call_id, followup_type, followup_date, remark, status, outcome, created_at, completed_at`, argIdx-2, argIdx-1, argIdx)
	var status string
	var outcome *string
	err = s.DB.QueryRow(ctx, updateQuery, args...).Scan(&id, &leadID, &leadStageID, &leadCallID, &followupType, &followupDate, &remark, &status, &outcome, &createdAt, &completedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	fu := &models.FollowUpDetail{
		ID: id.String(), LeadID: leadID, FollowupType: followupType, FollowupDate: followupDate, Remark: remark, Status: status, Outcome: outcome, CreatedAt: createdAt,
	}
	fu.CompletedAt = &completedAt
	if leadStageID != nil {
		s := leadStageID.String()
		fu.LeadStageID = &s
	}
	if leadCallID != nil {
		s := leadCallID.String()
		fu.LeadCallID = &s
	}
	return fu, nil
}

// DeleteFollowUp deletes a follow-up. Sales or Presales; lead must be assigned.
func (s *LeadService) DeleteFollowUp(ctx context.Context, leadID, followupID, organizationID, userID, userRole string) error {
	if userRole != "presales" && userRole != "sales" {
		return errors.New("INVALID_USER_TYPE")
	}
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return ErrLeadForbidden
	}
	result, err := s.DB.Exec(ctx, `DELETE FROM lead_followups WHERE id = $1 AND lead_id = $2 AND organization_id = $3`, followupID, leadID, organizationID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrLeadNotFound
	}
	return nil
}

// CreateVisit creates a new property visit. Presales or Sales; lead must be assigned.
func (s *LeadService) CreateVisit(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.CreateVisitRequest) (*models.PropertyVisitItem, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	if req.ProjectID != nil && *req.ProjectID != "" {
		var exists bool
		err = s.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)`, *req.ProjectID, organizationID).Scan(&exists)
		if err != nil || !exists {
			return nil, ErrLeadNotFound
		}
	}
	// Parse visit_date (YYYY-MM-DD) and visit_time (HH:MM or HH:MM:SS); build scheduled_at
	scheduledAt, err := combineDateAndTime(req.VisitDate, req.VisitTime)
	if err != nil {
		return nil, err
	}
	var projectID *uuid.UUID
	if req.ProjectID != nil && *req.ProjectID != "" {
		p, _ := uuid.Parse(*req.ProjectID)
		projectID = &p
	}
	var id uuid.UUID
	var leadUUID uuid.UUID
	var visitType string
	var status string
	var visitDate *time.Time
	var visitTime *string
	var createdAt, updatedAt time.Time
	err = s.DB.QueryRow(ctx, `INSERT INTO lead_property_visits (organization_id, lead_id, project_id, created_by_user_id, created_by_user_type, scheduled_at, visit_type, visit_date, visit_time, status, location_city, location_area, location_coordinates)
		VALUES ($1, $2, $3, $4, $5::user_type, $6, $7::visit_type, $8::date, $9::time, 'scheduled', $10, $11, $12)
		RETURNING id, lead_id, visit_type, status, visit_date, visit_time::text, created_at, updated_at`,
		organizationID, leadID, projectID, userID, userRole, scheduledAt, req.VisitType, req.VisitDate, normalizeVisitTime(req.VisitTime),
		req.LocationCity, req.LocationArea, req.LocationCoordinates).Scan(&id, &leadUUID, &visitType, &status, &visitDate, &visitTime, &createdAt, &updatedAt)
	if err != nil {
		return nil, err
	}
	if s.Routing != nil {
		_ = s.Routing.RouteLeadToSales(ctx, leadID, projectID)
	}
	return &models.PropertyVisitItem{
		ID: id.String(), LeadID: leadUUID.String(), ProjectID: req.ProjectID, VisitType: visitType, VisitDate: visitDate, VisitTime: visitTime,
		ScheduledAt: &scheduledAt, Status: status, LocationCity: req.LocationCity, LocationArea: req.LocationArea, LocationCoordinates: req.LocationCoordinates,
		CreatedAt: createdAt, UpdatedAt: updatedAt,
	}, nil
}

func combineDateAndTime(dateStr, timeStr string) (time.Time, error) {
	d, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid visit_date: %w", err)
	}
	t, err := time.Parse("15:04", timeStr)
	if err != nil {
		t, err = time.Parse("15:04:05", timeStr)
	}
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid visit_time: %w", err)
	}
	return time.Date(d.Year(), d.Month(), d.Day(), t.Hour(), t.Minute(), t.Second(), 0, time.UTC), nil
}

func normalizeVisitTime(t string) string {
	if len(t) == 5 && t[2] == ':' {
		return t + ":00"
	}
	return t
}

// GetVisit returns a single property visit. Presales or Sales; lead must be assigned.
func (s *LeadService) GetVisit(ctx context.Context, leadID, visitID, organizationID, userID, userRole string) (*models.PropertyVisitDetailResponse, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	_, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	var v models.PropertyVisitDetail
	var id, leadUUID uuid.UUID
	var projectID *uuid.UUID
	var visitDate *time.Time
	var visitTime *string
	var scheduledAt *time.Time
	var delayReason, outcome, remarks, locCity, locArea, locCoord *string
	var createdByUserID *uuid.UUID
	var createdByUserType *string
	var siteImages []string
	err = s.DB.QueryRow(ctx, `SELECT id, lead_id, project_id, created_by_user_id, created_by_user_type, visit_type, visit_date, visit_time::text, scheduled_at, status, delay_reason, outcome, remarks, site_visit_images, location_city, location_area, location_coordinates, created_at, updated_at
		FROM lead_property_visits WHERE id = $1 AND lead_id = $2 AND organization_id = $3`, visitID, leadID, organizationID).Scan(
		&id, &leadUUID, &projectID, &createdByUserID, &createdByUserType, &v.VisitType, &visitDate, &visitTime, &scheduledAt, &v.Status, &delayReason, &outcome, &remarks, &siteImages, &locCity, &locArea, &locCoord, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	v.ID = id.String()
	v.LeadID = leadUUID.String()
	v.ProjectID = nil
	if projectID != nil {
		s := projectID.String()
		v.ProjectID = &s
	}
	v.VisitDate = visitDate
	v.VisitTime = visitTime
	v.ScheduledAt = scheduledAt
	v.DelayReason = delayReason
	v.Outcome = outcome
	v.Remarks = remarks
	v.SiteVisitImages = siteImages
	v.SiteVisitImageURLs = s.resolveVisitImagesWithFallback(ctx, leadID, organizationID, visitID, v.VisitType, siteImages)
	v.LocationCity = locCity
	v.LocationArea = locArea
	v.LocationCoordinates = locCoord
	if createdByUserID != nil {
		s := createdByUserID.String()
		v.CreatedByUserID = &s
	}
	v.CreatedByUserType = createdByUserType
	resp := &models.PropertyVisitDetailResponse{Visit: v}
	if projectID != nil {
		var title string
		if s.DB.QueryRow(ctx, `SELECT project_title FROM projects WHERE id = $1`, projectID).Scan(&title) == nil {
			resp.Project = &models.ProjectInfo{ID: projectID.String(), Title: title}
		}
	}
	return resp, nil
}

// UpdateVisit updates a visit (images, remarks, outcome, status). Presales or Sales; lead must be assigned.
func (s *LeadService) UpdateVisit(ctx context.Context, leadID, visitID, organizationID, userID, userRole string, req *models.UpdateVisitRequest) (*models.PropertyVisitItem, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	updates := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{}
	argIdx := 1
	if req.SiteVisitImages != nil {
		updates = append(updates, fmt.Sprintf("site_visit_images = $%d", argIdx))
		args = append(args, req.SiteVisitImages)
		argIdx++
	}
	if req.Remarks != nil {
		updates = append(updates, fmt.Sprintf("remarks = $%d", argIdx))
		args = append(args, *req.Remarks)
		argIdx++
	}
	if req.Outcome != nil {
		updates = append(updates, fmt.Sprintf("outcome = $%d::visit_outcome", argIdx))
		args = append(args, *req.Outcome)
		argIdx++
	}
	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d::visit_status", argIdx))
		args = append(args, *req.Status)
		argIdx++
	}
	if len(args) == 0 {
		return nil, errors.New("NO_UPDATES")
	}
	args = append(args, visitID, leadID, organizationID)
	query := fmt.Sprintf(`UPDATE lead_property_visits SET %s WHERE id = $%d AND lead_id = $%d AND organization_id = $%d RETURNING id, lead_id, project_id, visit_type, visit_date, visit_time::text, scheduled_at, status, delay_reason, outcome, remarks, site_visit_images, location_city, location_area, location_coordinates, created_at, updated_at`, strings.Join(updates, ", "), argIdx, argIdx+1, argIdx+2)
	var id, leadUUID uuid.UUID
	var projectID *uuid.UUID
	var visitType, statusStr string
	var visitDate *time.Time
	var visitTime *string
	var scheduledAt *time.Time
	var delayReason, outcomeVal, remarksVal, locCity, locArea, locCoord *string
	var siteImages []string
	var createdAt, updatedAt time.Time
	err = s.DB.QueryRow(ctx, query, args...).Scan(&id, &leadUUID, &projectID, &visitType, &visitDate, &visitTime, &scheduledAt, &statusStr, &delayReason, &outcomeVal, &remarksVal, &siteImages, &locCity, &locArea, &locCoord, &createdAt, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	item := &models.PropertyVisitItem{ID: id.String(), LeadID: leadUUID.String(), VisitType: visitType, Status: statusStr, VisitDate: visitDate, VisitTime: visitTime, ScheduledAt: scheduledAt, DelayReason: delayReason, Outcome: outcomeVal, Remarks: remarksVal, SiteVisitImages: siteImages, SiteVisitImageURLs: s.resolveVisitImages(ctx, siteImages), LocationCity: locCity, LocationArea: locArea, LocationCoordinates: locCoord, CreatedAt: createdAt, UpdatedAt: updatedAt}
	if projectID != nil {
		s := projectID.String()
		item.ProjectID = &s
	}
	return item, nil
}

// RescheduleVisit updates visit date/time and sets delay_reason. Presales or Sales; lead must be assigned.
func (s *LeadService) RescheduleVisit(ctx context.Context, leadID, visitID, organizationID, userID, userRole string, req *models.RescheduleVisitRequest) (*models.PropertyVisitItem, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}
	scheduledAt, err := combineDateAndTime(req.VisitDate, req.VisitTime)
	if err != nil {
		return nil, err
	}
	var id, leadUUID uuid.UUID
	var projectID *uuid.UUID
	var visitType, statusStr string
	var visitDate *time.Time
	var visitTime *string
	var delayReason, outcome, remarks, locCity, locArea, locCoord *string
	var siteImages []string
	var createdAt, updatedAt time.Time
	err = s.DB.QueryRow(ctx, `UPDATE lead_property_visits SET visit_date = $1::date, visit_time = $2::time, scheduled_at = $3, delay_reason = $4::delay_reason, status = 'scheduled', updated_at = CURRENT_TIMESTAMP
		WHERE id = $5 AND lead_id = $6 AND organization_id = $7
		RETURNING id, lead_id, project_id, visit_type, visit_date, visit_time::text, scheduled_at, status, delay_reason, outcome, remarks, site_visit_images, location_city, location_area, location_coordinates, created_at, updated_at`,
		req.VisitDate, normalizeVisitTime(req.VisitTime), scheduledAt, req.DelayReason, visitID, leadID, organizationID).Scan(
		&id, &leadUUID, &projectID, &visitType, &visitDate, &visitTime, &scheduledAt, &statusStr, &delayReason, &outcome, &remarks, &siteImages, &locCity, &locArea, &locCoord, &createdAt, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrLeadNotFound
		}
		return nil, err
	}
	item := &models.PropertyVisitItem{ID: id.String(), LeadID: leadUUID.String(), VisitType: visitType, Status: statusStr, VisitDate: visitDate, VisitTime: visitTime, ScheduledAt: &scheduledAt, DelayReason: delayReason, Outcome: outcome, Remarks: remarks, SiteVisitImages: siteImages, LocationCity: locCity, LocationArea: locArea, LocationCoordinates: locCoord, CreatedAt: createdAt, UpdatedAt: updatedAt}
	if projectID != nil {
		s := projectID.String()
		item.ProjectID = &s
	}
	return item, nil
}

// AcceptLeadBySales sets sales_accepted_at and assigns the lead to the sales user. Sales only; caller must be sales_user_id and sales_accepted_at must be NULL.
func (s *LeadService) AcceptLeadBySales(ctx context.Context, leadID, organizationID, userID string) (*models.LeadResponse, error) {
	result, err := s.DB.Exec(ctx, `UPDATE leads SET sales_accepted_at = CURRENT_TIMESTAMP, assigned_to_user_id = sales_user_id, assigned_to_user_type = 'sales', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND organization_id = $2 AND sales_user_id = $3 AND sales_accepted_at IS NULL AND deleted_at IS NULL`,
		leadID, organizationID, userID)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, ErrLeadNotFound
	}
	return s.GetLeadByID(ctx, leadID, organizationID, userID, "sales")
}

func (s *LeadService) QualifyLead(ctx context.Context, leadID, organizationID, userID string, req *models.QualifyLeadRequest) (*models.LeadResponse, error) {
	// Build dynamic SET clause from non-nil fields + always set status='qualified'
	setParts := []string{"status = 'qualified'", "updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{}
	argIdx := 1

	if req != nil {
		if req.Name != nil {
			setParts = append(setParts, fmt.Sprintf("name = $%d", argIdx))
			args = append(args, *req.Name)
			argIdx++
		}
		if req.Email != nil {
			setParts = append(setParts, fmt.Sprintf("email = $%d", argIdx))
			args = append(args, *req.Email)
			argIdx++
		}
		if req.AlternatePhone != nil {
			setParts = append(setParts, fmt.Sprintf("alternate_phone = $%d", argIdx))
			args = append(args, *req.AlternatePhone)
			argIdx++
		}
		if req.Address != nil {
			setParts = append(setParts, fmt.Sprintf("address = $%d", argIdx))
			args = append(args, *req.Address)
			argIdx++
		}
		if req.City != nil {
			setParts = append(setParts, fmt.Sprintf("city = $%d", argIdx))
			args = append(args, *req.City)
			argIdx++
		}
		if req.State != nil {
			setParts = append(setParts, fmt.Sprintf("state = $%d", argIdx))
			args = append(args, *req.State)
			argIdx++
		}
		if req.Pincode != nil {
			setParts = append(setParts, fmt.Sprintf("pincode = $%d", argIdx))
			args = append(args, *req.Pincode)
			argIdx++
		}
		if req.BudgetMin != nil {
			setParts = append(setParts, fmt.Sprintf("budget_min = $%d", argIdx))
			args = append(args, *req.BudgetMin)
			argIdx++
		}
		if req.BudgetMax != nil {
			setParts = append(setParts, fmt.Sprintf("budget_max = $%d", argIdx))
			args = append(args, *req.BudgetMax)
			argIdx++
		}
		if req.LeadTemperature != nil {
			setParts = append(setParts, fmt.Sprintf("lead_temperature = $%d", argIdx))
			args = append(args, *req.LeadTemperature)
			argIdx++
		}
		if req.Priority != nil {
			setParts = append(setParts, fmt.Sprintf("priority = $%d", argIdx))
			args = append(args, *req.Priority)
			argIdx++
		}
		if req.Notes != nil {
			setParts = append(setParts, fmt.Sprintf("notes = $%d", argIdx))
			args = append(args, *req.Notes)
			argIdx++
		}
		if len(req.Tags) > 0 {
			setParts = append(setParts, fmt.Sprintf("tags = $%d", argIdx))
			args = append(args, req.Tags)
			argIdx++
		}
		if req.ProjectID != nil {
			setParts = append(setParts, fmt.Sprintf("project_id = $%d", argIdx))
			args = append(args, *req.ProjectID)
			argIdx++
		}
	}

	// WHERE params
	args = append(args, leadID, organizationID, userID)
	whereLeadIDIdx := argIdx
	whereOrgIdx := argIdx + 1
	whereUserIdx := argIdx + 2

	query := fmt.Sprintf(`
		UPDATE leads
		SET %s
		WHERE id = $%d AND organization_id = $%d AND assigned_to_user_id = $%d AND assigned_to_user_type = 'presales' AND deleted_at IS NULL`,
		strings.Join(setParts, ", "),
		whereLeadIDIdx, whereOrgIdx, whereUserIdx,
	)

	result, err := s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, ErrLeadNotFound
	}
	return s.GetLeadByID(ctx, leadID, organizationID, userID, "presales")
}

// MarkLeadConnected sets lead status to 'called'. Presales only; lead must be assigned to this user.
func (s *LeadService) MarkLeadConnected(ctx context.Context, leadID, organizationID, userID string) (*models.LeadResponse, error) {
	// When presales confirms the call was actually connected (picked),
	// we treat the lead as "qualified/connected" for the API/Bulk lead flow.
	result, err := s.DB.Exec(ctx, `UPDATE leads SET status = 'qualified', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND organization_id = $2 AND assigned_to_user_id = $3 AND assigned_to_user_type = 'presales' AND deleted_at IS NULL`,
		leadID, organizationID, userID)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, ErrLeadNotFound
	}
	return s.GetLeadByID(ctx, leadID, organizationID, userID, "presales")
}

// UpdateLead updates general lead fields. All roles can update their visible leads; GM/Manager can update any org lead.
func (s *LeadService) UpdateLead(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.UpdateLeadRequest) (*models.LeadResponse, error) {
	if req == nil {
		return nil, errors.New("NO_UPDATES")
	}

	// Ensure lead is visible to this user (and get current lead)
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil || lead == nil {
		return nil, ErrLeadNotFound
	}

	// For presales/sales, enforce ownership for write actions
	if userRole == "presales" || userRole == "sales" {
		if !isLeadOwnedBy(lead, userID, userRole) {
			return nil, ErrLeadForbidden
		}
	}

	setParts := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []interface{}{}
	argIdx := 1

	if req.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, *req.Name)
		argIdx++
	}
	if req.Phone != nil {
		setParts = append(setParts, fmt.Sprintf("phone = $%d", argIdx))
		args = append(args, *req.Phone)
		argIdx++
	}
	if req.Email != nil {
		setParts = append(setParts, fmt.Sprintf("email = $%d", argIdx))
		args = append(args, *req.Email)
		argIdx++
	}
	if req.AlternatePhone != nil {
		setParts = append(setParts, fmt.Sprintf("alternate_phone = $%d", argIdx))
		args = append(args, *req.AlternatePhone)
		argIdx++
	}
	if req.Address != nil {
		setParts = append(setParts, fmt.Sprintf("address = $%d", argIdx))
		args = append(args, *req.Address)
		argIdx++
	}
	if req.City != nil {
		setParts = append(setParts, fmt.Sprintf("city = $%d", argIdx))
		args = append(args, *req.City)
		argIdx++
	}
	if req.State != nil {
		setParts = append(setParts, fmt.Sprintf("state = $%d", argIdx))
		args = append(args, *req.State)
		argIdx++
	}
	if req.Pincode != nil {
		setParts = append(setParts, fmt.Sprintf("pincode = $%d", argIdx))
		args = append(args, *req.Pincode)
		argIdx++
	}
	if req.Source != nil {
		setParts = append(setParts, fmt.Sprintf("source = $%d", argIdx))
		args = append(args, *req.Source)
		argIdx++
	}
	if req.SourceDetail != nil {
		setParts = append(setParts, fmt.Sprintf("source_detail = $%d", argIdx))
		args = append(args, *req.SourceDetail)
		argIdx++
	}
	if req.BudgetMin != nil {
		setParts = append(setParts, fmt.Sprintf("budget_min = $%d", argIdx))
		args = append(args, *req.BudgetMin)
		argIdx++
	}
	if req.BudgetMax != nil {
		setParts = append(setParts, fmt.Sprintf("budget_max = $%d", argIdx))
		args = append(args, *req.BudgetMax)
		argIdx++
	}
	if req.LeadTemperature != nil {
		setParts = append(setParts, fmt.Sprintf("lead_temperature = $%d", argIdx))
		args = append(args, *req.LeadTemperature)
		argIdx++
	}
	if req.Status != nil {
		setParts = append(setParts, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, *req.Status)
		argIdx++
	}
	if req.Stage != nil {
		setParts = append(setParts, fmt.Sprintf("stage = $%d", argIdx))
		args = append(args, *req.Stage)
		argIdx++
	}
	if req.Priority != nil {
		setParts = append(setParts, fmt.Sprintf("priority = $%d", argIdx))
		args = append(args, *req.Priority)
		argIdx++
	}
	if len(req.Tags) > 0 {
		setParts = append(setParts, fmt.Sprintf("tags = $%d", argIdx))
		args = append(args, req.Tags)
		argIdx++
	}
	if req.Notes != nil {
		setParts = append(setParts, fmt.Sprintf("notes = $%d", argIdx))
		args = append(args, *req.Notes)
		argIdx++
	}
	if req.ProjectID != nil {
		setParts = append(setParts, fmt.Sprintf("project_id = $%d", argIdx))
		args = append(args, *req.ProjectID)
		argIdx++
	}

	if len(setParts) == 1 {
		return nil, errors.New("NO_UPDATES")
	}

	args = append(args, leadID, organizationID)
	whereLeadIdx := argIdx
	whereOrgIdx := argIdx + 1

	query := fmt.Sprintf(`
		UPDATE leads
		SET %s
		WHERE id = $%d AND organization_id = $%d AND deleted_at IS NULL`,
		strings.Join(setParts, ", "),
		whereLeadIdx, whereOrgIdx,
	)

	result, err := s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, ErrLeadNotFound
	}

	return s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
}

// ListRejectionQuestions returns active rejection questions, optionally filtered by category.
func (s *LeadService) ListRejectionQuestions(ctx context.Context, category string) (*models.RejectionQuestionsListResponse, error) {
	query := `SELECT id, question_text, options, category FROM rejection_questions WHERE status = 'active'`
	args := []interface{}{}
	if category != "" {
		query += ` AND category = $1`
		args = append(args, category)
	}
	query += ` ORDER BY category, created_at`

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list models.RejectionQuestionsListResponse
	for rows.Next() {
		var q models.RejectionQuestion
		var id uuid.UUID
		var options []string
		err := rows.Scan(&id, &q.QuestionText, &options, &q.Category)
		if err != nil {
			return nil, err
		}
		q.ID = id.String()
		q.Options = options
		list.Questions = append(list.Questions, q)
	}
	return &list, rows.Err()
}

// RejectLead inserts a lead_rejection and sets lead status to 'rejected'. Presales or Sales; lead must be assigned to this user.
func (s *LeadService) RejectLead(ctx context.Context, leadID, organizationID, userID, userRole string, req *models.RejectLeadRequest) (*models.RejectLeadResponse, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	lead, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil || lead == nil {
		return nil, ErrLeadNotFound
	}
	if !isLeadOwnedBy(lead, userID, userRole) {
		return nil, ErrLeadForbidden
	}

	questionsJSON, err := json.Marshal(req.QuestionsResponse)
	if err != nil {
		return nil, err
	}
	var aiSummary *string
	if req.AISummary != nil {
		aiSummary = req.AISummary
	}
	aiBulletJSON, err := json.Marshal(req.AIBulletPoints)
	if err != nil {
		return nil, err
	}

	var rejectionID uuid.UUID
	err = s.DB.QueryRow(ctx, `INSERT INTO lead_rejections (organization_id, lead_id, rejected_by_user_id, rejected_by_user_type, questions_response, ai_summary, ai_bullet_points)
		VALUES ($1, $2, $3, $4::user_type, $5::jsonb, $6, $7::jsonb)
		RETURNING id`,
		organizationID, leadID, userID, userRole, questionsJSON, aiSummary, aiBulletJSON).Scan(&rejectionID)
	if err != nil {
		return nil, err
	}

	_, err = s.DB.Exec(ctx, `UPDATE leads SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND organization_id = $2 AND assigned_to_user_id = $3 AND assigned_to_user_type = $4 AND deleted_at IS NULL`,
		leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, err
	}

	// Return updated lead
	updated, _ := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if updated != nil {
		lead = updated
	}
	return &models.RejectLeadResponse{
		LeadID:      leadID,
		RejectionID: rejectionID.String(),
		Lead:        *lead,
	}, nil
}

// GetLeadStats returns aggregate stats (calls, messages, site visits, calling hours) for all leads assigned to the user. Presales/Sales only.
func (s *LeadService) GetLeadStats(ctx context.Context, organizationID, userID, userRole string, fromDate, toDate *time.Time) (*models.LeadStatsResponse, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	return s.getLeadStatsInternal(ctx, organizationID, userID, userRole, nil, fromDate, toDate)
}

// GetLeadStatsForLead returns the same four stats for a single lead. Presales/Sales; lead must be assigned.
func (s *LeadService) GetLeadStatsForLead(ctx context.Context, leadID, organizationID, userID, userRole string, fromDate, toDate *time.Time) (*models.LeadStatsResponse, error) {
	if userRole != "presales" && userRole != "sales" {
		return nil, errors.New("INVALID_USER_TYPE")
	}
	_, err := s.GetLeadByID(ctx, leadID, organizationID, userID, userRole)
	if err != nil {
		return nil, ErrLeadNotFound
	}
	return s.getLeadStatsInternal(ctx, organizationID, userID, userRole, &leadID, fromDate, toDate)
}

// getLeadStatsInternal runs the four aggregate queries. If leadID is non-nil, scope to that lead only; else all assigned leads.
func (s *LeadService) getLeadStatsInternal(ctx context.Context, organizationID, userID, userRole string, leadID *string, fromDate, toDate *time.Time) (*models.LeadStatsResponse, error) {
	leadFilter := "l.assigned_to_user_id = $1 AND l.assigned_to_user_type = $2 AND l.organization_id = $3 AND l.deleted_at IS NULL"
	argsBase := []interface{}{userID, userRole, organizationID}
	argIdx := 4
	if leadID != nil {
		leadFilter += fmt.Sprintf(" AND l.id = $%d", argIdx)
		argsBase = append(argsBase, *leadID)
		argIdx++
	}
	dateFilterCalls := ""
	dateFilterMessages := ""
	dateFilterVisits := ""
	if fromDate != nil && toDate != nil {
		dateFilterCalls = fmt.Sprintf(" AND c.created_at >= $%d AND c.created_at <= $%d", argIdx, argIdx+1)
		dateFilterMessages = fmt.Sprintf(" AND m.sent_at >= $%d AND m.sent_at <= $%d", argIdx, argIdx+1)
		dateFilterVisits = fmt.Sprintf(" AND v.updated_at >= $%d AND v.updated_at <= $%d", argIdx, argIdx+1)
		argsBase = append(argsBase, *fromDate, *toDate)
		argIdx += 2
	}

	// Total calls
	var totalCalls int
	queryCalls := fmt.Sprintf(`SELECT COUNT(*) FROM lead_calls c INNER JOIN leads l ON l.id = c.lead_id AND l.organization_id = c.organization_id AND %s %s`, leadFilter, dateFilterCalls)
	if err := s.DB.QueryRow(ctx, queryCalls, argsBase...).Scan(&totalCalls); err != nil {
		return nil, err
	}

	// Messages sent (outbound)
	var messageSent int
	queryMessages := fmt.Sprintf(`SELECT COUNT(*) FROM whatsapp_messages m INNER JOIN whatsapp_conversations w ON w.id = m.conversation_id INNER JOIN leads l ON l.id = w.lead_id AND l.organization_id = w.organization_id AND %s AND m.direction = 'outbound' %s`, leadFilter, dateFilterMessages)
	if err := s.DB.QueryRow(ctx, queryMessages, argsBase...).Scan(&messageSent); err != nil {
		return nil, err
	}

	// Site visit done (completed)
	var siteVisitDone int
	queryVisits := fmt.Sprintf(`SELECT COUNT(*) FROM lead_property_visits v INNER JOIN leads l ON l.id = v.lead_id AND l.organization_id = v.organization_id AND %s AND v.status = 'completed' %s`, leadFilter, dateFilterVisits)
	if err := s.DB.QueryRow(ctx, queryVisits, argsBase...).Scan(&siteVisitDone); err != nil {
		return nil, err
	}

	// Calling hour: sum of recording_duration or (call_ended_at - call_started_at)
	dateFilterCallDuration := ""
	if fromDate != nil && toDate != nil {
		dateFilterCallDuration = fmt.Sprintf(" AND c.call_ended_at >= $%d AND c.call_ended_at <= $%d", argIdx-2, argIdx-1)
	}
	queryDuration := fmt.Sprintf(`SELECT COALESCE(SUM(COALESCE(c.recording_duration, EXTRACT(EPOCH FROM (c.call_ended_at - c.call_started_at))::INT)), 0) FROM lead_calls c INNER JOIN leads l ON l.id = c.lead_id AND l.organization_id = c.organization_id AND %s %s`, leadFilter, dateFilterCallDuration)
	var totalSeconds int
	if err := s.DB.QueryRow(ctx, queryDuration, argsBase...).Scan(&totalSeconds); err != nil {
		return nil, err
	}

	callHourStr := formatCallingHour(totalSeconds)
	return &models.LeadStatsResponse{
		TotalCallsMade:     totalCalls,
		MessageSent:        messageSent,
		SiteVisitDone:      siteVisitDone,
		CallingHour:        callHourStr,
		CallingHourSeconds: totalSeconds,
	}, nil
}

func formatCallingHour(seconds int) string {
	if seconds <= 0 {
		return "0:00 hrs"
	}
	h := seconds / 3600
	m := (seconds % 3600) / 60
	return fmt.Sprintf("%d:%02d hrs", h, m)
}

func getLeadPagination(filters map[string]string) (page, limit int) {
	page = 1
	limit = 20
	if p := filters["page"]; p != "" {
		if val, err := fmt.Sscanf(p, "%d", &page); err == nil && val == 1 && page > 0 {
		} else {
			page = 1
		}
	}
	if l := filters["limit"]; l != "" {
		if val, err := fmt.Sscanf(l, "%d", &limit); err == nil && val == 1 && limit > 0 && limit <= 100 {
		} else {
			limit = 20
		}
	}
	return page, limit
}
