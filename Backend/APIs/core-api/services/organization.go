package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"crownco/core-api/models"
	"crownco/core-api/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrganizationService struct {
	db *pgxpool.Pool
}

func NewOrganizationService(db *pgxpool.Pool) *OrganizationService {
	return &OrganizationService{db: db}
}

// OnboardOrganization creates a new organization with a general manager
func (s *OrganizationService) OnboardOrganization(ctx context.Context, req models.OnboardRequest) (*models.Organization, *models.GeneralManager, error) {
	// Start transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Check if organization already exists
	orgExists, err := s.organizationExists(ctx, tx, req.Organization.Email)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to check organization existence: %w", err)
	}
	if orgExists {
		return nil, nil, errors.New("ORGANIZATION_EXISTS")
	}

	// Check if GM already exists
	gmExists, err := s.generalManagerExists(ctx, tx, req.GeneralManager.Email)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to check general manager existence: %w", err)
	}
	if gmExists {
		return nil, nil, errors.New("GM_EXISTS")
	}

	// Hash password
	passwordHash, err := utils.HashPassword(req.GeneralManager.Password)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Parse DOB
	var dob *time.Time
	if req.GeneralManager.DOB != "" {
		parsedDOB, err := time.Parse("2006-01-02", req.GeneralManager.DOB)
		if err != nil {
			return nil, nil, fmt.Errorf("invalid date format: %w", err)
		}
		// Validate that DOB is in the past
		if parsedDOB.After(time.Now()) {
			return nil, nil, errors.New("date of birth must be in the past")
		}
		dob = &parsedDOB
	}

	// Set default country if not provided
	country := req.Organization.Country
	if country == "" {
		country = "India"
	}

	// Create organization
	orgID := uuid.New()
	now := time.Now()
	
	orgQuery := `
		INSERT INTO organizations (
			id, name, email, phone, address, city, state, country, pincode,
			type, company_size, status, website, tax_id, gstin, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		RETURNING id, name, email, phone, address, city, state, country, pincode,
			type, company_size, status, logo_url, website, tax_id, gstin, created_at, updated_at, deleted_at
	`
	
	var org models.Organization
	err = tx.QueryRow(ctx, orgQuery,
		orgID, req.Organization.Name, req.Organization.Email, req.Organization.Phone,
		req.Organization.Address, req.Organization.City, req.Organization.State,
		country, req.Organization.Pincode, req.Organization.Type,
		req.Organization.CompanySize, "active", req.Organization.Website,
		req.Organization.TaxID, req.Organization.GSTIN, now, now,
	).Scan(
		&org.ID, &org.Name, &org.Email, &org.Phone, &org.Address, &org.City,
		&org.State, &org.Country, &org.Pincode, &org.Type, &org.CompanySize,
		&org.Status, &org.LogoURL, &org.Website, &org.TaxID, &org.GSTIN,
		&org.CreatedAt, &org.UpdatedAt, &org.DeletedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create organization: %w", err)
	}

	// Create general manager
	gmID := uuid.New()
	
	gmQuery := `
		INSERT INTO users_general_managers (
			id, organization_id, name, phone, gender, dob, email, password_hash,
			avatar_url, employee_id, permissions, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ARRAY[]::user_permission[], $11, $12, $13)
		RETURNING id, organization_id, name, phone, gender, dob, email, avatar_url,
			employee_id, team_id, permissions, status, last_login_at, created_at, updated_at, deleted_at
	`
	
	var gm models.GeneralManager
	err = tx.QueryRow(ctx, gmQuery,
		gmID, orgID, req.GeneralManager.Name, req.GeneralManager.Phone,
		req.GeneralManager.Gender, dob, req.GeneralManager.Email, passwordHash,
		req.GeneralManager.AvatarURL, req.GeneralManager.EmployeeID,
		"active", now, now,
	).Scan(
		&gm.ID, &gm.OrganizationID, &gm.Name, &gm.Phone, &gm.Gender, &gm.DOB,
		&gm.Email, &gm.AvatarURL, &gm.EmployeeID, &gm.TeamID, &gm.Permissions,
		&gm.Status, &gm.LastLoginAt, &gm.CreatedAt, &gm.UpdatedAt, &gm.DeletedAt,
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create general manager: %w", err)
	}

	// Create trial subscription automatically
	// Find Trial plan
	var trialPlanID uuid.UUID
	var trialDays int
	trialPlanQuery := `SELECT id, trial_days FROM plans WHERE name = 'Trial' AND is_active = true LIMIT 1`
	err = tx.QueryRow(ctx, trialPlanQuery).Scan(&trialPlanID, &trialDays)
	if err == nil {
		// Trial plan found, create subscription
		subID := uuid.New()
		startDate := now
		endDate := startDate.AddDate(0, 0, trialDays)
		
		subQuery := `
			INSERT INTO subscriptions (
				id, organization_id, plan_id, status, start_date, end_date,
				renewal_date, auto_renew, billing_cycle, next_billing_at,
				created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`
		_, err = tx.Exec(ctx, subQuery,
			subID, orgID, trialPlanID, "trial", startDate, endDate,
			endDate, false, "monthly", endDate, now, now,
		)
		if err != nil {
			// Log error but don't fail onboarding if subscription creation fails
			// This allows organization to be created even if subscription setup has issues
			fmt.Printf("Warning: Failed to create trial subscription: %v\n", err)
		}
	}

	// Commit transaction
	if err = tx.Commit(ctx); err != nil {
		return nil, nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &org, &gm, nil
}

// organizationExists checks if an organization with the given email exists
func (s *OrganizationService) organizationExists(ctx context.Context, tx pgx.Tx, email string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM organizations WHERE email = $1 AND deleted_at IS NULL)`
	err := tx.QueryRow(ctx, query, email).Scan(&exists)
	return exists, err
}

// generalManagerExists checks if a general manager with the given email exists
func (s *OrganizationService) generalManagerExists(ctx context.Context, tx pgx.Tx, email string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users_general_managers WHERE email = $1 AND deleted_at IS NULL)`
	err := tx.QueryRow(ctx, query, email).Scan(&exists)
	return exists, err
}

// UpdateOrganization updates organization details
// Only the General Manager associated with the organization can update it
func (s *OrganizationService) UpdateOrganization(ctx context.Context, userID string, req models.UpdateOrganizationRequest) (*models.Organization, error) {
	// Parse user UUID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("INVALID_USER_ID")
	}

	// Get the GM's organization_id to verify authorization
	var gmOrgID uuid.UUID
	checkQuery := `
		SELECT organization_id 
		FROM users_general_managers 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = s.db.QueryRow(ctx, checkQuery, userUUID).Scan(&gmOrgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("USER_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify user: %w", err)
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}

	// Check if email needs to be updated and if it's already taken
	if req.Email != nil {
		var existingID uuid.UUID
		checkEmailQuery := `SELECT id FROM organizations WHERE email = $1 AND deleted_at IS NULL AND id != $2`
		err := s.db.QueryRow(ctx, checkEmailQuery, *req.Email, gmOrgID).Scan(&existingID)
		if err == nil {
			// Email already exists for another organization
			return nil, errors.New("EMAIL_ALREADY_EXISTS")
		}
		updates = append(updates, fmt.Sprintf("email = $%d", argIndex))
		args = append(args, *req.Email)
		argIndex++
	}

	if req.Phone != nil {
		updates = append(updates, fmt.Sprintf("phone = $%d", argIndex))
		args = append(args, *req.Phone)
		argIndex++
	}

	if req.Address != nil {
		updates = append(updates, fmt.Sprintf("address = $%d", argIndex))
		args = append(args, *req.Address)
		argIndex++
	}

	if req.City != nil {
		updates = append(updates, fmt.Sprintf("city = $%d", argIndex))
		args = append(args, *req.City)
		argIndex++
	}

	if req.State != nil {
		updates = append(updates, fmt.Sprintf("state = $%d", argIndex))
		args = append(args, *req.State)
		argIndex++
	}

	if req.Country != nil {
		updates = append(updates, fmt.Sprintf("country = $%d", argIndex))
		args = append(args, *req.Country)
		argIndex++
	}

	if req.Pincode != nil {
		updates = append(updates, fmt.Sprintf("pincode = $%d", argIndex))
		args = append(args, *req.Pincode)
		argIndex++
	}

	if req.Type != nil {
		updates = append(updates, fmt.Sprintf("type = $%d", argIndex))
		args = append(args, *req.Type)
		argIndex++
	}

	if req.CompanySize != nil {
		updates = append(updates, fmt.Sprintf("company_size = $%d", argIndex))
		args = append(args, *req.CompanySize)
		argIndex++
	}

	if req.Website != nil {
		updates = append(updates, fmt.Sprintf("website = $%d", argIndex))
		args = append(args, *req.Website)
		argIndex++
	}

	if req.TaxID != nil {
		updates = append(updates, fmt.Sprintf("tax_id = $%d", argIndex))
		args = append(args, *req.TaxID)
		argIndex++
	}

	if req.GSTIN != nil {
		updates = append(updates, fmt.Sprintf("gstin = $%d", argIndex))
		args = append(args, *req.GSTIN)
		argIndex++
	}

	if req.LogoURL != nil {
		updates = append(updates, fmt.Sprintf("logo_url = $%d", argIndex))
		args = append(args, *req.LogoURL)
		argIndex++
	}

	if len(updates) == 0 {
		// No updates, just return current organization
		return s.GetOrganizationByID(ctx, gmOrgID.String())
	}

	// Add updated_at
	updates = append(updates, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Build the SET clause properly
	setClause := ""
	for i, update := range updates {
		if i > 0 {
			setClause += ", "
		}
		setClause += update
	}

	// Add WHERE clause with organization_id
	args = append(args, gmOrgID)

	// Execute update
	updateQuery := fmt.Sprintf(`
		UPDATE organizations 
		SET %s 
		WHERE id = $%d AND deleted_at IS NULL
	`, setClause, argIndex)

	_, execErr := s.db.Exec(ctx, updateQuery, args...)
	if execErr != nil {
		return nil, fmt.Errorf("failed to update organization: %w", execErr)
	}

	// Return updated organization
	return s.GetOrganizationByID(ctx, gmOrgID.String())
}

// GetOrganizationByID retrieves an organization by ID
func (s *OrganizationService) GetOrganizationByID(ctx context.Context, orgID string) (*models.Organization, error) {
	orgUUID, err := uuid.Parse(orgID)
	if err != nil {
		return nil, errors.New("INVALID_ORGANIZATION_ID")
	}

	query := `
		SELECT id, name, email, phone, address, city, state, country, pincode,
			type, company_size, status, logo_url, website, tax_id, gstin,
			created_at, updated_at, deleted_at
		FROM organizations
		WHERE id = $1 AND deleted_at IS NULL
	`

	var org models.Organization
	err = s.db.QueryRow(ctx, query, orgUUID).Scan(
		&org.ID, &org.Name, &org.Email, &org.Phone, &org.Address, &org.City,
		&org.State, &org.Country, &org.Pincode, &org.Type, &org.CompanySize,
		&org.Status, &org.LogoURL, &org.Website, &org.TaxID, &org.GSTIN,
		&org.CreatedAt, &org.UpdatedAt, &org.DeletedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("ORGANIZATION_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to get organization: %w", err)
	}

	return &org, nil
}
