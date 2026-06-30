package services

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"

	"crownco/core-api/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LeadRouter is used to auto-route a lead to a caller (e.g. LeadRoutingService)
type LeadRouter interface {
	RouteLead(ctx context.Context, leadID string) error
}

type ImportedDataService struct {
	DB     *pgxpool.Pool
	router LeadRouter
}

func NewImportedDataService(pool *pgxpool.Pool, router LeadRouter) *ImportedDataService {
	return &ImportedDataService{DB: pool, router: router}
}

// ImportData handles CSV file import and creates leads
func (s *ImportedDataService) ImportData(ctx context.Context, userID, userType, organizationID string, title, description string, fileReader io.Reader) (*models.ImportDataResponse, error) {
	// Parse CSV
	csvRows, totalRows, parseErrors := s.parseCSV(fileReader)
	if len(csvRows) == 0 {
		return nil, errors.New("NO_VALID_ROWS")
	}

	// Check lead limit before importing
	currentLeadsCount, err := s.getCurrentLeadsCount(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	leadLimit, err := s.getOrganizationLeadLimit(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	availableLimit := leadLimit - currentLeadsCount
	if len(csvRows) > availableLimit {
		return nil, fmt.Errorf("LEAD_LIMIT_EXCEEDED: %d leads available, %d leads in CSV", availableLimit, len(csvRows))
	}

	// Create imported_data record
	importedDataID, err := s.createImportedDataRecord(ctx, organizationID, userID, title, description)
	if err != nil {
		return nil, err
	}

	// Create leads from CSV rows
	leadsCreated, creationErrors := s.createLeadsFromCSV(ctx, organizationID, importedDataID, csvRows)

	allErrors := append(parseErrors, creationErrors...)

	response := &models.ImportDataResponse{
		ImportedDataID: importedDataID,
		Title:          title,
		TotalRows:      totalRows,
		Successful:     len(leadsCreated),
		Failed:         len(allErrors),
		Errors:         allErrors,
		LeadsCreated:   leadsCreated,
	}

	return response, nil
}

// AssignUsers assigns presales users to imported data leads using round-robin
func (s *ImportedDataService) AssignUsers(ctx context.Context, importedDataID, organizationID string, userIDs []string) (*models.AssignUsersResponse, error) {
	// Verify imported_data exists and belongs to organization
	exists, err := s.verifyImportedDataOwnership(ctx, importedDataID, organizationID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("IMPORTED_DATA_NOT_FOUND")
	}

	// Verify all users are presales and belong to organization
	validUsers, err := s.verifyPresalesUsers(ctx, userIDs, organizationID)
	if err != nil {
		return nil, err
	}
	if len(validUsers) == 0 {
		return nil, errors.New("NO_VALID_PRESALES_USERS")
	}

	// Get all leads for this imported_data
	leadIDs, err := s.getLeadIDsForImportedData(ctx, importedDataID)
	if err != nil {
		return nil, err
	}

	if len(leadIDs) == 0 {
		return nil, errors.New("NO_LEADS_FOUND")
	}

	// Round-robin assignment
	assignmentSummary := make(map[string]int)
	for i, leadID := range leadIDs {
		userIndex := i % len(validUsers)
		userID := validUsers[userIndex]

		err := s.assignLeadToUser(ctx, leadID, userID)
		if err != nil {
			continue
		}

		assignmentSummary[userID]++
	}

	response := &models.AssignUsersResponse{
		ImportedDataID:     importedDataID,
		AssignedUsersCount: len(validUsers),
		LeadsAssigned:      len(leadIDs),
		AssignmentSummary:  assignmentSummary,
	}

	return response, nil
}

// DeleteImportedData soft deletes imported_data and unqualified leads
func (s *ImportedDataService) DeleteImportedData(ctx context.Context, importedDataID, organizationID string) (*models.DeleteImportedDataResponse, error) {
	// Verify imported_data exists and belongs to organization
	exists, err := s.verifyImportedDataOwnership(ctx, importedDataID, organizationID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("IMPORTED_DATA_NOT_FOUND")
	}

	// Soft delete unqualified leads
	deletedCount, err := s.deleteUnqualifiedLeads(ctx, importedDataID)
	if err != nil {
		return nil, err
	}

	// Soft delete imported_data
	err = s.softDeleteImportedData(ctx, importedDataID)
	if err != nil {
		return nil, err
	}

	response := &models.DeleteImportedDataResponse{
		ImportedDataID:    importedDataID,
		DeletedLeadsCount: deletedCount,
		Message:           fmt.Sprintf("Imported data and %d unqualified leads deleted successfully", deletedCount),
	}

	return response, nil
}

// Helper methods

func (s *ImportedDataService) parseCSV(fileReader io.Reader) ([]models.CSVLeadRow, int, []string) {
	var validRows []models.CSVLeadRow
	var errors []string
	totalRows := 0

	reader := csv.NewReader(fileReader)
	reader.FieldsPerRecord = -1 // Allow variable number of fields

	// Read header
	headers, err := reader.Read()
	if err != nil {
		errors = append(errors, "Failed to read CSV headers")
		return validRows, 0, errors
	}

	// Normalize headers (case-insensitive)
	headerMap := make(map[string]int)
	for i, header := range headers {
		headerMap[strings.ToLower(strings.TrimSpace(header))] = i
	}

	rowNumber := 1
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Failed to parse row", rowNumber))
			rowNumber++
			continue
		}

		totalRows++
		rowNumber++

		// Extract fields
		name := getField(record, headerMap, "name")
		phone := getField(record, headerMap, "phone", "mobile", "number")
		email := getField(record, headerMap, "email")
		city := getField(record, headerMap, "city")
		budgetMin := getField(record, headerMap, "budget_min", "budgetmin", "min_budget")
		budgetMax := getField(record, headerMap, "budget_max", "budgetmax", "max_budget")
		leadTemp := getField(record, headerMap, "lead_temperature", "temperature")
		state := getField(record, headerMap, "state")

		// Validate required fields
		if strings.TrimSpace(name) == "" {
			errors = append(errors, fmt.Sprintf("Row %d: Missing name", rowNumber))
			continue
		}
		if strings.TrimSpace(phone) == "" {
			errors = append(errors, fmt.Sprintf("Row %d: Missing phone", rowNumber))
			continue
		}

		// Validate and normalize phone
		normalizedPhone, phoneErr := normalizePhone(phone)
		if phoneErr != nil {
			errors = append(errors, fmt.Sprintf("Row %d: %s", rowNumber, phoneErr.Error()))
			continue
		}

		validRows = append(validRows, models.CSVLeadRow{
			Name:            strings.TrimSpace(name),
			Phone:           normalizedPhone,
			Email:           strings.TrimSpace(email),
			City:            strings.TrimSpace(city),
			BudgetMin:       strings.TrimSpace(budgetMin),
			BudgetMax:       strings.TrimSpace(budgetMax),
			LeadTemperature: strings.TrimSpace(leadTemp),
			State:           strings.TrimSpace(state),
			RowNumber:       rowNumber,
		})
	}

	return validRows, totalRows, errors
}

func getField(record []string, headerMap map[string]int, aliases ...string) string {
	for _, alias := range aliases {
		if idx, exists := headerMap[strings.ToLower(alias)]; exists && idx < len(record) {
			return record[idx]
		}
	}
	return ""
}

func normalizePhone(phone string) (string, error) {
	phone = strings.TrimSpace(phone)
	phoneLength := len(phone)

	// Save number as is if:
	// - Length is >= 10 (more than 9)
	// - Length is <= 13 (less than 14, including +)
	if phoneLength >= 10 && phoneLength <= 13 {
		return phone, nil
	}

	// Invalid: less than 10 or more than 13
	if phoneLength < 10 {
		return "", fmt.Errorf("Invalid phone: less than 10 digits")
	}

	return "", fmt.Errorf("Invalid phone: more than 13 characters")
}

func (s *ImportedDataService) getCurrentLeadsCount(ctx context.Context, organizationID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM leads WHERE organization_id = $1 AND deleted_at IS NULL`
	err := s.DB.QueryRow(ctx, query, organizationID).Scan(&count)
	return count, err
}

func (s *ImportedDataService) getOrganizationLeadLimit(ctx context.Context, organizationID string) (int, error) {
	var leadLimit int
	query := `
		SELECT p.lead_limit
		FROM subscriptions s
		JOIN plans p ON s.plan_id = p.id
		WHERE s.organization_id = $1
		  AND s.status IN ('trial', 'active')
		  AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
		ORDER BY s.created_at DESC
		LIMIT 1
	`
	err := s.DB.QueryRow(ctx, query, organizationID).Scan(&leadLimit)
	if err != nil {
		return 0, errors.New("NO_ACTIVE_SUBSCRIPTION")
	}
	return leadLimit, nil
}

func (s *ImportedDataService) createImportedDataRecord(ctx context.Context, organizationID, userID, title, description string) (string, error) {
	var id uuid.UUID
	query := `
		INSERT INTO imported_data (organization_id, imported_by, title, description)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	err := s.DB.QueryRow(ctx, query, organizationID, userID, title, description).Scan(&id)
	return id.String(), err
}

func (s *ImportedDataService) createLeadsFromCSV(ctx context.Context, organizationID, importedDataID string, rows []models.CSVLeadRow) ([]models.ImportedLeadInfo, []string) {
	var leadsCreated []models.ImportedLeadInfo
	var errors []string

	for _, row := range rows {
		leadID, err := s.createLead(ctx, organizationID, importedDataID, row)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Row %d: Failed to create lead - %s", row.RowNumber, err.Error()))
			continue
		}
		if s.router != nil {
			_ = s.router.RouteLead(ctx, leadID)
		}
		leadsCreated = append(leadsCreated, models.ImportedLeadInfo{
			LeadID: leadID,
			Name:   row.Name,
			Phone:  row.Phone,
		})
	}

	return leadsCreated, errors
}

func (s *ImportedDataService) createLead(ctx context.Context, organizationID, importedDataID string, row models.CSVLeadRow) (string, error) {
	var leadID uuid.UUID

	// Parse budget values
	var budgetMin, budgetMax *float64
	if row.BudgetMin != "" {
		if val, err := strconv.ParseFloat(row.BudgetMin, 64); err == nil {
			budgetMin = &val
		}
	}
	if row.BudgetMax != "" {
		if val, err := strconv.ParseFloat(row.BudgetMax, 64); err == nil {
			budgetMax = &val
		}
	}

	// Use 'warm' as default if not provided or invalid
	leadTemp := row.LeadTemperature
	if leadTemp == "" {
		leadTemp = "warm"
	}

	query := `
		INSERT INTO leads (
			organization_id, name, phone, email, city, state,
			budget_min, budget_max, lead_temperature, source, imported_data_id
		) VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), $7, $8, $9, 'imported', $10)
		RETURNING id
	`

	err := s.DB.QueryRow(ctx, query,
		organizationID, row.Name, row.Phone, row.Email, row.City, row.State,
		budgetMin, budgetMax, leadTemp, importedDataID,
	).Scan(&leadID)

	return leadID.String(), err
}

func (s *ImportedDataService) verifyImportedDataOwnership(ctx context.Context, importedDataID, organizationID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM imported_data WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)`
	err := s.DB.QueryRow(ctx, query, importedDataID, organizationID).Scan(&exists)
	return exists, err
}

func (s *ImportedDataService) verifyPresalesUsers(ctx context.Context, userIDs []string, organizationID string) ([]string, error) {
	var validUsers []string

	query := `
		SELECT id FROM users_presales
		WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL
	`

	rows, err := s.DB.Query(ctx, query, userIDs, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		validUsers = append(validUsers, userID)
	}

	return validUsers, nil
}

func (s *ImportedDataService) getLeadIDsForImportedData(ctx context.Context, importedDataID string) ([]string, error) {
	var leadIDs []string

	query := `SELECT id FROM leads WHERE imported_data_id = $1 AND deleted_at IS NULL`

	rows, err := s.DB.Query(ctx, query, importedDataID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var leadID string
		if err := rows.Scan(&leadID); err != nil {
			continue
		}
		leadIDs = append(leadIDs, leadID)
	}

	return leadIDs, nil
}

func (s *ImportedDataService) assignLeadToUser(ctx context.Context, leadID, userID string) error {
	query := `
		UPDATE leads
		SET assigned_to_user_id = $1, assigned_to_user_type = 'presales', assigned_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND deleted_at IS NULL
	`
	_, err := s.DB.Exec(ctx, query, userID, leadID)
	return err
}

func (s *ImportedDataService) deleteUnqualifiedLeads(ctx context.Context, importedDataID string) (int, error) {
	query := `
		UPDATE leads
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE imported_data_id = $1
		  AND status = 'unqualified'
		  AND deleted_at IS NULL
	`
	result, err := s.DB.Exec(ctx, query, importedDataID)
	if err != nil {
		return 0, err
	}
	return int(result.RowsAffected()), nil
}

func (s *ImportedDataService) softDeleteImportedData(ctx context.Context, importedDataID string) error {
	query := `UPDATE imported_data SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := s.DB.Exec(ctx, query, importedDataID)
	return err
}
