package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"crownco/core-api/database"
	"crownco/core-api/models"
	"crownco/core-api/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserService struct {
	db *pgxpool.Pool
}

func NewUserService(db *pgxpool.Pool) *UserService {
	return &UserService{db: db}
}

// CreateUser creates a new user (manager, presales, or sales) for the organization
// Only General Manager can create users
func (s *UserService) CreateUser(ctx context.Context, gmUserID string, req models.CreateUserRequest) (*models.UserResponse, error) {
	// Parse GM user UUID
	gmUUID, err := uuid.Parse(gmUserID)
	if err != nil {
		return nil, errors.New("INVALID_USER_ID")
	}

	// Get GM's organization_id to verify authorization
	var orgID uuid.UUID
	checkQuery := `
		SELECT organization_id 
		FROM users_general_managers 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = s.db.QueryRow(ctx, checkQuery, gmUUID).Scan(&orgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("USER_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify user: %w", err)
	}

	// Check subscription status and limits before creating user
	limitsQuery := `
		SELECT s.status, s.end_date, p.user_limit,
			(SELECT COUNT(*) FROM users_general_managers WHERE organization_id = $1 AND deleted_at IS NULL) +
			(SELECT COUNT(*) FROM users_managers WHERE organization_id = $1 AND deleted_at IS NULL) +
			(SELECT COUNT(*) FROM users_presales WHERE organization_id = $1 AND deleted_at IS NULL) +
			(SELECT COUNT(*) FROM users_sales WHERE organization_id = $1 AND deleted_at IS NULL) as current_user_count
		FROM subscriptions s
		INNER JOIN plans p ON s.plan_id = p.id
		WHERE s.organization_id = $1
		AND s.status IN ('active', 'trial')
		ORDER BY s.created_at DESC
		LIMIT 1
	`
	var subStatus string
	var endDate sql.NullTime
	var userLimit, currentUserCount int
	scanErr := s.db.QueryRow(ctx, limitsQuery, orgID).Scan(&subStatus, &endDate, &userLimit, &currentUserCount)
	if scanErr != nil {
		if scanErr == pgx.ErrNoRows {
			return nil, errors.New("NO_ACTIVE_SUBSCRIPTION")
		}
		return nil, fmt.Errorf("failed to check subscription limits: %w", scanErr)
	}

	// Check if subscription has expired
	if endDate.Valid && endDate.Time.Before(time.Now()) {
		return nil, errors.New("SUBSCRIPTION_EXPIRED")
	}

	// Validate user limit (0 means unlimited)
	if userLimit > 0 && currentUserCount >= userLimit {
		return nil, errors.New("USER_LIMIT_EXCEEDED")
	}

	// Validate user_type
	tableName := ""
	switch req.UserType {
	case "manager":
		tableName = "users_managers"
	case "presales":
		tableName = "users_presales"
	case "sales":
		tableName = "users_sales"
	default:
		return nil, errors.New("INVALID_USER_TYPE")
	}

	// Check if email already exists (across all user tables)
	emailExists, err := s.checkEmailExists(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email: %w", err)
	}
	if emailExists {
		return nil, errors.New("EMAIL_ALREADY_EXISTS")
	}

	// Check if employee_id already exists (if provided)
	if req.EmployeeID != "" {
		empIDExists, err := s.checkEmployeeIDExists(ctx, req.EmployeeID)
		if err != nil {
			return nil, fmt.Errorf("failed to check employee_id: %w", err)
		}
		if empIDExists {
			return nil, errors.New("EMPLOYEE_ID_ALREADY_EXISTS")
		}
	}

	// Validate team_id (required field, but empty string means NULL in DB)
	var teamUUID *uuid.UUID
	if req.TeamID != "" {
		parsedTeamID, parseErr := uuid.Parse(req.TeamID)
		if parseErr != nil {
			return nil, errors.New("INVALID_TEAM_ID")
		}
		// Verify team belongs to same organization
		var teamOrgID uuid.UUID
		teamCheckQuery := `SELECT organization_id FROM teams WHERE id = $1`
		err = s.db.QueryRow(ctx, teamCheckQuery, parsedTeamID).Scan(&teamOrgID)
		if err != nil {
			if err == pgx.ErrNoRows {
				return nil, errors.New("TEAM_NOT_FOUND")
			}
			return nil, fmt.Errorf("failed to verify team: %w", err)
		}
		if teamOrgID != orgID {
			return nil, errors.New("TEAM_NOT_IN_ORGANIZATION")
		}
		teamUUID = &parsedTeamID
	}

	// Validate project_assigned_ids (sales only)
	var projectUUIDs []uuid.UUID
	var projectIDsText []string
	if req.UserType == "sales" && len(req.ProjectAssignedIDs) > 0 {
		for _, id := range req.ProjectAssignedIDs {
			cleaned := strings.TrimSpace(id)
			parsed, parseErr := uuid.Parse(cleaned)
			if parseErr != nil {
				return nil, errors.New("INVALID_PROJECT_ID")
			}
			projectUUIDs = append(projectUUIDs, parsed)
			projectIDsText = append(projectIDsText, cleaned)
		}

		var count int
		err = s.db.QueryRow(
			ctx,
			`SELECT COUNT(*) FROM projects WHERE organization_id = $1 AND deleted_at IS NULL AND id = ANY($2::uuid[])`,
			orgID,
			projectUUIDs,
		).Scan(&count)
		if err != nil {
			return nil, fmt.Errorf("failed to verify projects: %w", err)
		}
		if count != len(projectUUIDs) {
			return nil, errors.New("PROJECT_NOT_FOUND")
		}
	}
	// If req.TeamID is empty string, teamUUID remains nil (NULL in DB)

	// Hash password
	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Parse DOB
	var dob *time.Time
	if req.DOB != "" {
		parsedDOB, err := time.Parse("2006-01-02", req.DOB)
		if err != nil {
			return nil, fmt.Errorf("invalid date format: %w", err)
		}
		// Validate that DOB is in the past
		if parsedDOB.After(time.Now()) {
			return nil, errors.New("date of birth must be in the past")
		}
		dob = &parsedDOB
	}

	// Set default status if not provided
	status := req.Status
	if status == "" {
		status = "active"
	}

	// Create user
	userID := uuid.New()
	now := time.Now()

	// Build permissions array for PostgreSQL
	permissionsArray := "ARRAY[]::user_permission[]"
	if len(req.Permissions) > 0 {
		perms := ""
		for i, perm := range req.Permissions {
			if i > 0 {
				perms += ", "
			}
			perms += fmt.Sprintf("'%s'::user_permission", perm)
		}
		permissionsArray = fmt.Sprintf("ARRAY[%s]::user_permission[]", perms)
	}

	// Build insert query based on user type
	insertQuery := ""
	if req.UserType == "sales" {
		insertQuery = fmt.Sprintf(`
			INSERT INTO %s (
				id, organization_id, name, phone, gender, dob, email, password_hash,
				avatar_url, employee_id, team_id, project_assigned_ids, permissions, status, created_at, updated_at
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8,
				$9, $10, $11,
				(SELECT COALESCE(array_agg(e::uuid), ARRAY[]::uuid[]) FROM unnest($12::text[]) AS e),
				%s, $13, $14, $15
			)
			RETURNING id::text, organization_id::text, name, email, phone, gender, dob, employee_id,
				team_id, avatar_url, permissions, status, created_at, updated_at
		`, tableName, permissionsArray)
	} else {
		insertQuery = fmt.Sprintf(`
			INSERT INTO %s (
				id, organization_id, name, phone, gender, dob, email, password_hash,
				avatar_url, employee_id, team_id, permissions, status, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, %s, $12, $13, $14)
			RETURNING id::text, organization_id::text, name, email, phone, gender, dob, employee_id,
				team_id, avatar_url, permissions, status, created_at, updated_at
		`, tableName, permissionsArray)
	}

	var userIDStr, orgIDStr, name, email, phone string
	var gender, employeeID, avatarURL *string
	var teamID *uuid.UUID
	var permissions []string
	var userStatus string
	var createdAt, updatedAt time.Time

	// Handle avatar_url (can be nil)
	avatarURLValue := req.AvatarURL
	if avatarURLValue != nil && *avatarURLValue == "" {
		avatarURLValue = nil
	}

	var execErr error
	var row pgx.Row
	if req.UserType == "sales" {
		row = s.db.QueryRow(ctx, insertQuery,
			userID, orgID, req.Name, req.Phone, req.Gender, dob, req.Email, passwordHash,
			avatarURLValue, req.EmployeeID, teamUUID, projectIDsText, status, now, now,
		)
	} else {
		row = s.db.QueryRow(ctx, insertQuery,
			userID, orgID, req.Name, req.Phone, req.Gender, dob, req.Email, passwordHash,
			avatarURLValue, req.EmployeeID, teamUUID, status, now, now,
		)
	}

	execErr = row.Scan(
		&userIDStr, &orgIDStr, &name, &email, &phone,
		&gender, &dob, &employeeID, &teamID, &avatarURL, &permissions,
		&userStatus, &createdAt, &updatedAt,
	)
	if execErr != nil {
		return nil, fmt.Errorf("failed to create user: %w", execErr)
	}

	// Build response
	dobStr := ""
	if dob != nil {
		dobStr = dob.Format("2006-01-02")
	}

	teamIDStr := ""
	if teamID != nil {
		teamIDStr = teamID.String()
	}

	userResponse := &models.UserResponse{
		ID:             userIDStr,
		OrganizationID: orgIDStr,
		UserType:       req.UserType,
		Name:           name,
		Email:          email,
		Phone:          phone,
		Gender:         gender,
		DOB:            &dobStr,
		EmployeeID:     employeeID,
		TeamID:         &teamIDStr,
		AvatarURL:      avatarURL,
		Permissions:    permissions,
		Status:         userStatus,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}

	// Cache user profile in Redis with 36 hour expiry
	empIDVal := ""
	if employeeID != nil {
		empIDVal = *employeeID
	}
	avatarVal := ""
	if avatarURL != nil {
		avatarVal = *avatarURL
	}
	genderVal := ""
	if gender != nil {
		genderVal = *gender
	}

	userProfile := &models.UserInfo{
		ID:             userIDStr,
		OrganizationID: orgIDStr,
		UserType:       req.UserType,
		Name:           name,
		Email:          email,
		Phone:          phone,
		Gender:         genderVal,
		DOB:            dobStr,
		EmployeeID:     empIDVal,
		AvatarURL:      avatarVal,
		Status:         userStatus,
		Permissions:    permissions,
	}
	
	cacheKey := fmt.Sprintf("user:profile:%s", userIDStr)
	if profileJSON, err := json.Marshal(userProfile); err == nil {
		database.RedisClient.Set(ctx, cacheKey, profileJSON, 36*time.Hour)
	}

	return userResponse, nil
}

// checkEmailExists checks if email exists in any user table
func (s *UserService) checkEmailExists(ctx context.Context, email string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM users_general_managers WHERE email = $1 AND deleted_at IS NULL
			UNION ALL
			SELECT 1 FROM users_managers WHERE email = $1 AND deleted_at IS NULL
			UNION ALL
			SELECT 1 FROM users_presales WHERE email = $1 AND deleted_at IS NULL
			UNION ALL
			SELECT 1 FROM users_sales WHERE email = $1 AND deleted_at IS NULL
		)
	`
	var exists bool
	err := s.db.QueryRow(ctx, query, email).Scan(&exists)
	return exists, err
}

// checkEmployeeIDExists checks if employee_id exists in any user table
func (s *UserService) checkEmployeeIDExists(ctx context.Context, employeeID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM users_general_managers WHERE employee_id = $1 AND deleted_at IS NULL
			UNION ALL
			SELECT 1 FROM users_managers WHERE employee_id = $1 AND deleted_at IS NULL
			UNION ALL
			SELECT 1 FROM users_presales WHERE employee_id = $1 AND deleted_at IS NULL
			UNION ALL
			SELECT 1 FROM users_sales WHERE employee_id = $1 AND deleted_at IS NULL
		)
	`
	var exists bool
	err := s.db.QueryRow(ctx, query, employeeID).Scan(&exists)
	return exists, err
}

// getUserTableName returns the table name based on user type
func (s *UserService) getUserTableName(userType string) (string, error) {
	switch userType {
	case "manager":
		return "users_managers", nil
	case "presales":
		return "users_presales", nil
	case "sales":
		return "users_sales", nil
	default:
		return "", errors.New("INVALID_USER_TYPE")
	}
}

// getUserTypeFromID determines user type by checking which table contains the ID
func (s *UserService) getUserTypeFromID(ctx context.Context, userID uuid.UUID) (string, uuid.UUID, error) {
	// Check in managers table
	var orgID uuid.UUID
	query := `SELECT organization_id FROM users_managers WHERE id = $1 AND deleted_at IS NULL`
	err := s.db.QueryRow(ctx, query, userID).Scan(&orgID)
	if err == nil {
		return "manager", orgID, nil
	}

	// Check in presales table
	query = `SELECT organization_id FROM users_presales WHERE id = $1 AND deleted_at IS NULL`
	err = s.db.QueryRow(ctx, query, userID).Scan(&orgID)
	if err == nil {
		return "presales", orgID, nil
	}

	// Check in sales table
	query = `SELECT organization_id FROM users_sales WHERE id = $1 AND deleted_at IS NULL`
	err = s.db.QueryRow(ctx, query, userID).Scan(&orgID)
	if err == nil {
		return "sales", orgID, nil
	}

	return "", uuid.Nil, errors.New("USER_NOT_FOUND")
}

// DeleteUser soft deletes a user (sets deleted_at)
func (s *UserService) DeleteUser(ctx context.Context, gmUserID, targetUserID string) error {
	// Parse UUIDs
	gmUUID, err := uuid.Parse(gmUserID)
	if err != nil {
		return errors.New("INVALID_USER_ID")
	}

	targetUUID, err := uuid.Parse(targetUserID)
	if err != nil {
		return errors.New("INVALID_TARGET_USER_ID")
	}

	// Get GM's organization_id
	var gmOrgID uuid.UUID
	checkQuery := `
		SELECT organization_id 
		FROM users_general_managers 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = s.db.QueryRow(ctx, checkQuery, gmUUID).Scan(&gmOrgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return errors.New("USER_NOT_FOUND")
		}
		return fmt.Errorf("failed to verify user: %w", err)
	}

	// Get target user type and organization
	userType, targetOrgID, err := s.getUserTypeFromID(ctx, targetUUID)
	if err != nil {
		return err
	}

	// Verify same organization
	if targetOrgID != gmOrgID {
		return errors.New("USER_NOT_IN_ORGANIZATION")
	}

	// Get table name
	tableName, err := s.getUserTableName(userType)
	if err != nil {
		return err
	}

	// Soft delete user
	deleteQuery := fmt.Sprintf(`
		UPDATE %s 
		SET deleted_at = $1, updated_at = $1 
		WHERE id = $2 AND deleted_at IS NULL
	`, tableName)

	_, execErr := s.db.Exec(ctx, deleteQuery, time.Now(), targetUUID)
	if execErr != nil {
		return fmt.Errorf("failed to delete user: %w", execErr)
	}

	return nil
}

// BlockUser updates user status (block/unblock)
func (s *UserService) BlockUser(ctx context.Context, gmUserID, targetUserID string, status string) error {
	// Parse UUIDs
	gmUUID, err := uuid.Parse(gmUserID)
	if err != nil {
		return errors.New("INVALID_USER_ID")
	}

	targetUUID, err := uuid.Parse(targetUserID)
	if err != nil {
		return errors.New("INVALID_TARGET_USER_ID")
	}

	// Get GM's organization_id
	var gmOrgID uuid.UUID
	checkQuery := `
		SELECT organization_id 
		FROM users_general_managers 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = s.db.QueryRow(ctx, checkQuery, gmUUID).Scan(&gmOrgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return errors.New("USER_NOT_FOUND")
		}
		return fmt.Errorf("failed to verify user: %w", err)
	}

	// Get target user type and organization
	userType, targetOrgID, err := s.getUserTypeFromID(ctx, targetUUID)
	if err != nil {
		return err
	}

	// Verify same organization
	if targetOrgID != gmOrgID {
		return errors.New("USER_NOT_IN_ORGANIZATION")
	}

	// Get table name
	tableName, err := s.getUserTableName(userType)
	if err != nil {
		return err
	}

	// Update status
	updateQuery := fmt.Sprintf(`
		UPDATE %s 
		SET status = $1, updated_at = $2 
		WHERE id = $3 AND deleted_at IS NULL
	`, tableName)

	_, execErr := s.db.Exec(ctx, updateQuery, status, time.Now(), targetUUID)
	if execErr != nil {
		return fmt.Errorf("failed to update user status: %w", execErr)
	}

	return nil
}

// UpdateUser updates user details
func (s *UserService) UpdateUser(ctx context.Context, gmUserID, targetUserID string, req models.UpdateUserRequest) (*models.UserResponse, error) {
	// Parse UUIDs
	gmUUID, err := uuid.Parse(gmUserID)
	if err != nil {
		return nil, errors.New("INVALID_USER_ID")
	}

	targetUUID, err := uuid.Parse(targetUserID)
	if err != nil {
		return nil, errors.New("INVALID_TARGET_USER_ID")
	}

	// Get GM's organization_id
	var gmOrgID uuid.UUID
	checkQuery := `
		SELECT organization_id 
		FROM users_general_managers 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = s.db.QueryRow(ctx, checkQuery, gmUUID).Scan(&gmOrgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("USER_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify user: %w", err)
	}

	// Get target user type and organization
	userType, targetOrgID, err := s.getUserTypeFromID(ctx, targetUUID)
	if err != nil {
		return nil, err
	}

	// Verify same organization
	if targetOrgID != gmOrgID {
		return nil, errors.New("USER_NOT_IN_ORGANIZATION")
	}

	// Get table name
	tableName, err := s.getUserTableName(userType)
	if err != nil {
		return nil, err
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
		checkEmailQuery := `
			SELECT id FROM users_general_managers WHERE email = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id FROM users_managers WHERE email = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id FROM users_presales WHERE email = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id FROM users_sales WHERE email = $1 AND deleted_at IS NULL AND id != $2
		`
		err := s.db.QueryRow(ctx, checkEmailQuery, *req.Email, targetUUID).Scan(&existingID)
		if err == nil {
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

	if req.Gender != nil {
		updates = append(updates, fmt.Sprintf("gender = $%d", argIndex))
		args = append(args, *req.Gender)
		argIndex++
	}

	if req.DOB != nil {
		dob, parseErr := time.Parse("2006-01-02", *req.DOB)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid date format: %w", parseErr)
		}
		updates = append(updates, fmt.Sprintf("dob = $%d", argIndex))
		args = append(args, dob)
		argIndex++
	}

	if req.EmployeeID != nil {
		// Check if employee_id already exists
		var existingID uuid.UUID
		checkEmpIDQuery := `
			SELECT id FROM users_general_managers WHERE employee_id = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id FROM users_managers WHERE employee_id = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id FROM users_presales WHERE employee_id = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id FROM users_sales WHERE employee_id = $1 AND deleted_at IS NULL AND id != $2
		`
		err := s.db.QueryRow(ctx, checkEmpIDQuery, *req.EmployeeID, targetUUID).Scan(&existingID)
		if err == nil {
			return nil, errors.New("EMPLOYEE_ID_ALREADY_EXISTS")
		}
		updates = append(updates, fmt.Sprintf("employee_id = $%d", argIndex))
		args = append(args, *req.EmployeeID)
		argIndex++
	}

	if req.TeamID != nil {
		if *req.TeamID != "" {
			parsedTeamID, err := uuid.Parse(*req.TeamID)
			if err != nil {
				return nil, errors.New("INVALID_TEAM_ID")
			}
			// Verify team belongs to same organization
			var teamOrgID uuid.UUID
			teamCheckQuery := `SELECT organization_id FROM teams WHERE id = $1`
			err = s.db.QueryRow(ctx, teamCheckQuery, parsedTeamID).Scan(&teamOrgID)
			if err != nil {
				if err == pgx.ErrNoRows {
					return nil, errors.New("TEAM_NOT_FOUND")
				}
				return nil, fmt.Errorf("failed to verify team: %w", err)
			}
			if teamOrgID != gmOrgID {
				return nil, errors.New("TEAM_NOT_IN_ORGANIZATION")
			}
			updates = append(updates, fmt.Sprintf("team_id = $%d", argIndex))
			args = append(args, parsedTeamID)
		} else {
			// Empty string means NULL
			updates = append(updates, fmt.Sprintf("team_id = $%d", argIndex))
			args = append(args, nil)
		}
		argIndex++
	}

	if req.AvatarURL != nil {
		updates = append(updates, fmt.Sprintf("avatar_url = $%d", argIndex))
		args = append(args, *req.AvatarURL)
		argIndex++
	}

	if req.Permissions != nil && len(req.Permissions) > 0 {
		perms := ""
		for i, perm := range req.Permissions {
			if i > 0 {
				perms += ", "
			}
			perms += fmt.Sprintf("'%s'::user_permission", perm)
		}
		updates = append(updates, fmt.Sprintf("permissions = ARRAY[%s]::user_permission[]", perms))
	}

	if req.Status != nil {
		updates = append(updates, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		argIndex++
	}

	if len(updates) == 0 {
		// No updates, just return current user
		return s.GetUserByID(ctx, targetUserID)
	}

	// Add updated_at
	updates = append(updates, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add WHERE clause
	args = append(args, targetUUID)

	// Build SET clause
	setClause := ""
	for i, update := range updates {
		if i > 0 {
			setClause += ", "
		}
		setClause += update
	}

	// Execute update
	updateQuery := fmt.Sprintf(`
		UPDATE %s 
		SET %s 
		WHERE id = $%d AND deleted_at IS NULL
	`, tableName, setClause, argIndex)

	_, execErr := s.db.Exec(ctx, updateQuery, args...)
	if execErr != nil {
		return nil, fmt.Errorf("failed to update user: %w", execErr)
	}

	// Return updated user
	return s.GetUserByID(ctx, targetUserID)
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(ctx context.Context, userID string) (*models.UserResponse, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("INVALID_USER_ID")
	}

	// Get user type and organization
	userType, _, err := s.getUserTypeFromID(ctx, userUUID)
	if err != nil {
		return nil, err
	}

	// Get table name
	tableName, err := s.getUserTableName(userType)
	if err != nil {
		return nil, err
	}

	query := fmt.Sprintf(`
		SELECT id::text, organization_id::text, name, email, phone, gender, dob, employee_id,
			team_id, avatar_url, permissions, status, created_at, updated_at
		FROM %s
		WHERE id = $1 AND deleted_at IS NULL
	`, tableName)

	var userIDStr, orgIDStr, name, email, phone string
	var gender, employeeID, avatarURL *string
	var teamID *uuid.UUID
	var permissions []string
	var userStatus string
	var dob *time.Time
	var createdAt, updatedAt time.Time

	err = s.db.QueryRow(ctx, query, userUUID).Scan(
		&userIDStr, &orgIDStr, &name, &email, &phone,
		&gender, &dob, &employeeID, &teamID, &avatarURL, &permissions,
		&userStatus, &createdAt, &updatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("USER_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Build response
	dobStr := ""
	if dob != nil {
		dobStr = dob.Format("2006-01-02")
	}

	teamIDStr := ""
	if teamID != nil {
		teamIDStr = teamID.String()
	}

	return &models.UserResponse{
		ID:             userIDStr,
		OrganizationID: orgIDStr,
		UserType:       userType,
		Name:           name,
		Email:          email,
		Phone:          phone,
		Gender:         gender,
		DOB:            &dobStr,
		EmployeeID:     employeeID,
		TeamID:         &teamIDStr,
		AvatarURL:      avatarURL,
		Permissions:    permissions,
		Status:         userStatus,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}, nil
}

// AddPermission adds a permission to a user
func (s *UserService) AddPermission(ctx context.Context, gmUserID, targetUserID, permission string) (*models.UserResponse, error) {
	// Parse UUIDs
	gmUUID, err := uuid.Parse(gmUserID)
	if err != nil {
		return nil, errors.New("INVALID_USER_ID")
	}

	targetUUID, err := uuid.Parse(targetUserID)
	if err != nil {
		return nil, errors.New("INVALID_TARGET_USER_ID")
	}

	// Get GM's organization_id
	var gmOrgID uuid.UUID
	checkQuery := `
		SELECT organization_id 
		FROM users_general_managers 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = s.db.QueryRow(ctx, checkQuery, gmUUID).Scan(&gmOrgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("USER_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify user: %w", err)
	}

	// Get target user type and organization
	userType, targetOrgID, err := s.getUserTypeFromID(ctx, targetUUID)
	if err != nil {
		return nil, err
	}

	// Verify same organization
	if targetOrgID != gmOrgID {
		return nil, errors.New("USER_NOT_IN_ORGANIZATION")
	}

	// Get table name
	tableName, err := s.getUserTableName(userType)
	if err != nil {
		return nil, err
	}

	// Get current permissions
	var currentPermissions []string
	getPermsQuery := fmt.Sprintf(`
		SELECT permissions 
		FROM %s 
		WHERE id = $1 AND deleted_at IS NULL
	`, tableName)
	err = s.db.QueryRow(ctx, getPermsQuery, targetUUID).Scan(&currentPermissions)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("USER_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to get user permissions: %w", err)
	}

	// Check if permission already exists
	for _, perm := range currentPermissions {
		if perm == permission {
			return nil, errors.New("PERMISSION_ALREADY_EXISTS")
		}
	}

	// Add permission to array
	newPermissions := append(currentPermissions, permission)

	// Build permissions array for PostgreSQL
	perms := ""
	for i, perm := range newPermissions {
		if i > 0 {
			perms += ", "
		}
		perms += fmt.Sprintf("'%s'::user_permission", perm)
	}
	permissionsArray := fmt.Sprintf("ARRAY[%s]::user_permission[]", perms)

	// Update permissions
	updateQuery := fmt.Sprintf(`
		UPDATE %s 
		SET permissions = %s, updated_at = $1 
		WHERE id = $2 AND deleted_at IS NULL
	`, tableName, permissionsArray)

	_, execErr := s.db.Exec(ctx, updateQuery, time.Now(), targetUUID)
	if execErr != nil {
		return nil, fmt.Errorf("failed to add permission: %w", execErr)
	}

	// Invalidate Redis cache for user profile
	cacheKey := fmt.Sprintf("user:profile:%s", targetUserID)
	database.RedisClient.Del(ctx, cacheKey)

	// Return updated user
	return s.GetUserByID(ctx, targetUserID)
}

// RemovePermission removes a permission from a user
func (s *UserService) RemovePermission(ctx context.Context, gmUserID, targetUserID, permission string) (*models.UserResponse, error) {
	// Parse UUIDs
	gmUUID, err := uuid.Parse(gmUserID)
	if err != nil {
		return nil, errors.New("INVALID_USER_ID")
	}

	targetUUID, err := uuid.Parse(targetUserID)
	if err != nil {
		return nil, errors.New("INVALID_TARGET_USER_ID")
	}

	// Get GM's organization_id
	var gmOrgID uuid.UUID
	checkQuery := `
		SELECT organization_id 
		FROM users_general_managers 
		WHERE id = $1 AND deleted_at IS NULL
	`
	err = s.db.QueryRow(ctx, checkQuery, gmUUID).Scan(&gmOrgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("USER_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify user: %w", err)
	}

	// Get target user type and organization
	userType, targetOrgID, err := s.getUserTypeFromID(ctx, targetUUID)
	if err != nil {
		return nil, err
	}

	// Verify same organization
	if targetOrgID != gmOrgID {
		return nil, errors.New("USER_NOT_IN_ORGANIZATION")
	}

	// Get table name
	tableName, err := s.getUserTableName(userType)
	if err != nil {
		return nil, err
	}

	// Get current permissions
	var currentPermissions []string
	getPermsQuery := fmt.Sprintf(`
		SELECT permissions 
		FROM %s 
		WHERE id = $1 AND deleted_at IS NULL
	`, tableName)
	err = s.db.QueryRow(ctx, getPermsQuery, targetUUID).Scan(&currentPermissions)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("USER_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to get user permissions: %w", err)
	}

	// Check if permission exists and remove it
	permissionExists := false
	newPermissions := []string{}
	for _, perm := range currentPermissions {
		if perm == permission {
			permissionExists = true
			// Skip this permission (remove it)
			continue
		}
		newPermissions = append(newPermissions, perm)
	}

	if !permissionExists {
		return nil, errors.New("PERMISSION_NOT_FOUND")
	}

	// Build permissions array for PostgreSQL
	perms := ""
	if len(newPermissions) > 0 {
		for i, perm := range newPermissions {
			if i > 0 {
				perms += ", "
			}
			perms += fmt.Sprintf("'%s'::user_permission", perm)
		}
		permissionsArray := fmt.Sprintf("ARRAY[%s]::user_permission[]", perms)

		// Update permissions
		updateQuery := fmt.Sprintf(`
			UPDATE %s 
			SET permissions = %s, updated_at = $1 
			WHERE id = $2 AND deleted_at IS NULL
		`, tableName, permissionsArray)

		_, execErr := s.db.Exec(ctx, updateQuery, time.Now(), targetUUID)
		if execErr != nil {
			return nil, fmt.Errorf("failed to remove permission: %w", execErr)
		}
	} else {
		// Empty permissions array
		updateQuery := fmt.Sprintf(`
			UPDATE %s 
			SET permissions = ARRAY[]::user_permission[], updated_at = $1 
			WHERE id = $2 AND deleted_at IS NULL
		`, tableName)

		_, execErr := s.db.Exec(ctx, updateQuery, time.Now(), targetUUID)
		if execErr != nil {
			return nil, fmt.Errorf("failed to remove permission: %w", execErr)
		}
	}

	// Invalidate Redis cache for user profile
	cacheKey := fmt.Sprintf("user:profile:%s", targetUserID)
	database.RedisClient.Del(ctx, cacheKey)

	// Return updated user
	return s.GetUserByID(ctx, targetUserID)
}

// GetOrganizationID returns organization_id for the given user and role (for use in handlers that need org context).
func (s *UserService) GetOrganizationID(ctx context.Context, userID, userRole string) (string, error) {
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
		return "", errors.New("INVALID_USER_TYPE")
	}
	var orgID string
	err := s.db.QueryRow(ctx, query, userID).Scan(&orgID)
	if err != nil {
		return "", err
	}
	return orgID, nil
}

// ListUsers returns users across all roles for the organization with filters. GM or Manager with manage_employees permission.
func (s *UserService) ListUsers(ctx context.Context, organizationID string, filters map[string]string) (*models.UserListResponse, error) {
	whereParts := []string{"organization_id = $1", "deleted_at IS NULL"}
	args := []interface{}{organizationID}
	argIdx := 2

	roleFilter := filters["role"]
	if statusFilter := filters["status"]; statusFilter != "" {
		whereParts = append(whereParts, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, statusFilter)
		argIdx++
	}
	if teamIDFilter := filters["team_id"]; teamIDFilter != "" {
		whereParts = append(whereParts, fmt.Sprintf("team_id = $%d", argIdx))
		args = append(args, teamIDFilter)
		argIdx++
	}
	if search := filters["search"]; search != "" {
		whereParts = append(whereParts, fmt.Sprintf("(name ILIKE $%d OR email ILIKE $%d OR phone ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+search+"%")
		argIdx++
	}
	whereSQL := strings.Join(whereParts, " AND ")

	subqueries := []string{}
	sel := "SELECT id::text, name, email, phone, '%s' AS role, employee_id::text, team_id::text, status, permissions, created_at, last_login_at FROM %s WHERE %s"
	if roleFilter == "" || roleFilter == "presales" {
		subqueries = append(subqueries, fmt.Sprintf(sel, "presales", "users_presales", whereSQL))
	}
	if roleFilter == "" || roleFilter == "sales" {
		subqueries = append(subqueries, fmt.Sprintf(sel, "sales", "users_sales", whereSQL))
	}
	if roleFilter == "" || roleFilter == "manager" {
		subqueries = append(subqueries, fmt.Sprintf(sel, "manager", "users_managers", whereSQL))
	}
	if roleFilter == "" || roleFilter == "gm" {
		subqueries = append(subqueries, fmt.Sprintf(sel, "gm", "users_general_managers", whereSQL))
	}

	if len(subqueries) == 0 {
		return &models.UserListResponse{
			Users:      []models.UserListItem{},
			Pagination: models.PaginationInfo{Page: 1, Limit: 0, Total: 0, TotalPages: 0},
		}, nil
	}

	page := 1
	limit := 20
	if v := filters["page"]; v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			page = p
		}
	}
	if v := filters["limit"]; v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}
	offset := (page - 1) * limit

	unionSQL := strings.Join(subqueries, " UNION ALL ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM (%s) AS all_users", unionSQL)
	var total int
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	listQuery := fmt.Sprintf(`
		SELECT id, name, email, phone, role, employee_id, team_id, status, permissions, created_at, last_login_at
		FROM (%s) AS all_users
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, unionSQL, argIdx, argIdx+1)

	args = append(args, limit, offset)
	rows, err := s.db.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.UserListItem, 0)
	for rows.Next() {
		var u models.UserListItem
		var empID, teamID *string
		if err := rows.Scan(
			&u.ID,
			&u.Name,
			&u.Email,
			&u.Phone,
			&u.Role,
			&empID,
			&teamID,
			&u.Status,
			&u.Permissions,
			&u.CreatedAt,
			&u.LastLoginAt,
		); err != nil {
			continue
		}
		u.EmployeeID = empID
		u.TeamID = teamID
		users = append(users, u)
	}

	return &models.UserListResponse{
		Users: users,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: (total + limit - 1) / limit,
		},
	}, nil
}

