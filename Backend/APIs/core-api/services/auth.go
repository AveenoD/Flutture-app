package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"crownco/core-api/database"
	"crownco/core-api/models"
	"crownco/core-api/utils"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthService struct {
	db *pgxpool.Pool
}

func NewAuthService(db *pgxpool.Pool) *AuthService {
	return &AuthService{db: db}
}

// Login authenticates any user (GM, Manager, Presales, Sales) and returns JWT token
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.LoginResponse, error) {
	// Try to find user in all tables
	var userID, orgID, name, userEmail, phone, gender, passwordHash, status, userType string
	var dob, deletedAt *time.Time
	var employeeID, avatarURL *string
	var permissions []string
	var found bool

	// Check General Managers
	query := `
		SELECT id::text, organization_id::text, name, email, phone, gender, dob, employee_id, avatar_url, password_hash, status, deleted_at, permissions
		FROM users_general_managers
		WHERE email = $1 AND deleted_at IS NULL
	`
	err := s.db.QueryRow(ctx, query, email).Scan(
		&userID, &orgID, &name, &userEmail, &phone, &gender, &dob, &employeeID, &avatarURL, &passwordHash, &status, &deletedAt, &permissions,
	)
	if err == nil {
		userType = "general-manager"
		found = true
	} else {
		// Check Managers
		query = `
			SELECT id::text, organization_id::text, name, email, phone, gender, dob, employee_id, avatar_url, password_hash, status, deleted_at, permissions
			FROM users_managers
			WHERE email = $1 AND deleted_at IS NULL
		`
		err = s.db.QueryRow(ctx, query, email).Scan(
			&userID, &orgID, &name, &userEmail, &phone, &gender, &dob, &employeeID, &avatarURL, &passwordHash, &status, &deletedAt, &permissions,
		)
		if err == nil {
			userType = "manager"
			found = true
		} else {
			// Check Presales
			query = `
				SELECT id::text, organization_id::text, name, email, phone, gender, dob, employee_id, avatar_url, password_hash, status, deleted_at, permissions
				FROM users_presales
				WHERE email = $1 AND deleted_at IS NULL
			`
			err = s.db.QueryRow(ctx, query, email).Scan(
				&userID, &orgID, &name, &userEmail, &phone, &gender, &dob, &employeeID, &avatarURL, &passwordHash, &status, &deletedAt, &permissions,
			)
			if err == nil {
				userType = "presales"
				found = true
			} else {
				// Check Sales
				query = `
					SELECT id::text, organization_id::text, name, email, phone, gender, dob, employee_id, avatar_url, password_hash, status, deleted_at, permissions
					FROM users_sales
					WHERE email = $1 AND deleted_at IS NULL
				`
				err = s.db.QueryRow(ctx, query, email).Scan(
					&userID, &orgID, &name, &userEmail, &phone, &gender, &dob, &employeeID, &avatarURL, &passwordHash, &status, &deletedAt, &permissions,
				)
				if err == nil {
					userType = "sales"
					found = true
				}
			}
		}
	}

	if !found {
		return nil, errors.New("INVALID_CREDENTIALS")
	}

	// Check if user is active
	if status != "active" {
		return nil, errors.New("USER_INACTIVE")
	}

	// Verify password
	if !utils.ValidatePassword(password, passwordHash) {
		return nil, errors.New("INVALID_CREDENTIALS")
	}

	// Update last login time based on user type
	var updateQuery string
	switch userType {
	case "general-manager":
		updateQuery = `UPDATE users_general_managers SET last_login_at = $1 WHERE id = $2`
	case "manager":
		updateQuery = `UPDATE users_managers SET last_login_at = $1 WHERE id = $2`
	case "presales":
		updateQuery = `UPDATE users_presales SET last_login_at = $1 WHERE id = $2`
	case "sales":
		updateQuery = `UPDATE users_sales SET last_login_at = $1 WHERE id = $2`
	}

	_, err = s.db.Exec(ctx, updateQuery, time.Now(), userID)
	if err != nil {
		// Log error but don't fail login
		fmt.Printf("Failed to update last_login_at: %v\n", err)
	}

	// Generate JWT token with appropriate role
	token, expiresIn, err := utils.GenerateToken(userID, userType)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	dobStr := ""
	if dob != nil {
		dobStr = dob.Format("2006-01-02")
	}

	empID := ""
	if employeeID != nil {
		empID = *employeeID
	}

	avatarStr := ""
	if avatarURL != nil {
		avatarStr = *avatarURL
	}

	response := &models.LoginResponse{
		Token:     token,
		ExpiresIn: expiresIn,
		User: models.UserInfo{
			ID:             userID,
			OrganizationID: orgID,
			UserType:       userType,
			Name:           name,
			Email:          userEmail,
			Phone:          phone,
			Gender:         gender,
			DOB:            dobStr,
			EmployeeID:     empID,
			AvatarURL:      avatarStr,
			Status:         status,
			Permissions:    permissions,
		},
	}

	return response, nil
}

// LoginGeneralManager authenticates a general manager and returns JWT token (kept for backward compatibility)
func (s *AuthService) LoginGeneralManager(ctx context.Context, email, password string) (*models.LoginResponse, error) {
	return s.Login(ctx, email, password)
}

// getUserTypeFromID determines user type by checking which table contains the ID
func (s *AuthService) getUserTypeFromID(ctx context.Context, userID uuid.UUID) (string, error) {
	// Check in general managers table
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM users_general_managers WHERE id = $1 AND deleted_at IS NULL)`
	err := s.db.QueryRow(ctx, query, userID).Scan(&exists)
	if err == nil && exists {
		return "general-manager", nil
	}

	// Check in managers table
	query = `SELECT EXISTS(SELECT 1 FROM users_managers WHERE id = $1 AND deleted_at IS NULL)`
	err = s.db.QueryRow(ctx, query, userID).Scan(&exists)
	if err == nil && exists {
		return "manager", nil
	}

	// Check in presales table
	query = `SELECT EXISTS(SELECT 1 FROM users_presales WHERE id = $1 AND deleted_at IS NULL)`
	err = s.db.QueryRow(ctx, query, userID).Scan(&exists)
	if err == nil && exists {
		return "presales", nil
	}

	// Check in sales table
	query = `SELECT EXISTS(SELECT 1 FROM users_sales WHERE id = $1 AND deleted_at IS NULL)`
	err = s.db.QueryRow(ctx, query, userID).Scan(&exists)
	if err == nil && exists {
		return "sales", nil
	}

	return "", errors.New("USER_NOT_FOUND")
}

// getTableName returns the table name based on user type
func (s *AuthService) getTableName(userType string) string {
	switch userType {
	case "general-manager":
		return "users_general_managers"
	case "manager":
		return "users_managers"
	case "presales":
		return "users_presales"
	case "sales":
		return "users_sales"
	default:
		return ""
	}
}

// ValidateUserID validates if the user ID exists and is active
func (s *AuthService) ValidateUserID(ctx context.Context, userID string) (bool, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return false, err
	}

	userType, err := s.getUserTypeFromID(ctx, userUUID)
	if err != nil {
		return false, err
	}

	tableName := s.getTableName(userType)
	query := fmt.Sprintf(`SELECT EXISTS(SELECT 1 FROM %s WHERE id = $1 AND deleted_at IS NULL AND status = 'active')`, tableName)
	var exists bool
	err = s.db.QueryRow(ctx, query, userUUID).Scan(&exists)
	return exists, err
}

// ForgotPassword generates a reset token and stores it in Redis (works for all user types)
func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	// Check if user exists in any table
	var userID string
	var userType string

	// Check General Managers
	query := `SELECT id::text FROM users_general_managers WHERE email = $1 AND deleted_at IS NULL AND status = 'active'`
	err := s.db.QueryRow(ctx, query, email).Scan(&userID)
	if err == nil {
		userType = "general-manager"
	} else {
		// Check Managers
		query = `SELECT id::text FROM users_managers WHERE email = $1 AND deleted_at IS NULL AND status = 'active'`
		err = s.db.QueryRow(ctx, query, email).Scan(&userID)
		if err == nil {
			userType = "manager"
		} else {
			// Check Presales
			query = `SELECT id::text FROM users_presales WHERE email = $1 AND deleted_at IS NULL AND status = 'active'`
			err = s.db.QueryRow(ctx, query, email).Scan(&userID)
			if err == nil {
				userType = "presales"
			} else {
				// Check Sales
				query = `SELECT id::text FROM users_sales WHERE email = $1 AND deleted_at IS NULL AND status = 'active'`
				err = s.db.QueryRow(ctx, query, email).Scan(&userID)
				if err == nil {
					userType = "sales"
				} else {
					// Don't reveal if user exists or not for security
					return nil
				}
			}
		}
	}

	// Generate reset token
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}
	resetToken := hex.EncodeToString(tokenBytes)

	// Store token in Redis with userID and userType (format: "userID|userType")
	// Store token in Redis with 1 hour expiration
	key := fmt.Sprintf("reset_token:%s", resetToken)
	value := fmt.Sprintf("%s|%s", userID, userType)
	err = database.RedisClient.Set(ctx, key, value, time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to store reset token: %w", err)
	}

	// TODO: Send email with reset token
	// For now, we'll just log it (in production, send email)
	fmt.Printf("Reset token for %s (%s): %s\n", email, userType, resetToken)

	return nil
}

// ResetPassword resets password using reset token (works for all user types)
func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	// Get user ID and type from Redis (format: "userID|userType")
	key := fmt.Sprintf("reset_token:%s", token)
	value, err := database.RedisClient.Get(ctx, key).Result()
	if err != nil {
		return errors.New("INVALID_TOKEN")
	}

	// Parse userID and userType
	parts := strings.Split(value, "|")
	if len(parts) != 2 {
		return errors.New("INVALID_TOKEN")
	}
	userID := parts[0]
	userType := parts[1]

	// Hash new password
	passwordHash, err := utils.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Get table name
	tableName := s.getTableName(userType)
	if tableName == "" {
		return errors.New("INVALID_USER_TYPE")
	}

	// Update password
	updateQuery := fmt.Sprintf(`UPDATE %s SET password_hash = $1, updated_at = $2 WHERE id = $3`, tableName)
	_, err = s.db.Exec(ctx, updateQuery, passwordHash, time.Now(), userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Delete reset token from Redis
	database.RedisClient.Del(ctx, key)

	return nil
}

// GetCurrentUserProfile gets the current user's profile (works for all user types)
func (s *AuthService) GetCurrentUserProfile(ctx context.Context, userID string) (*models.UserInfo, error) {
	// Parse UUID from string
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("INVALID_USER_ID")
	}

	// Try to get from Redis cache first
	cacheKey := fmt.Sprintf("user:profile:%s", userID)
	cachedData, err := database.RedisClient.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		// Cache hit - unmarshal and return
		var profile models.UserInfo
		if err := json.Unmarshal([]byte(cachedData), &profile); err == nil {
			return &profile, nil
		}
		// If unmarshal fails, continue to DB fetch
	}

	// Cache miss - get from database
	// Get user type
	userType, err := s.getUserTypeFromID(ctx, userUUID)
	if err != nil {
		return nil, errors.New("USER_NOT_FOUND")
	}

	tableName := s.getTableName(userType)

	// Build query - all user types have permissions column
	query := fmt.Sprintf(`
		SELECT id::text, organization_id::text, name, email, phone, gender, dob, employee_id, avatar_url, status, permissions
		FROM %s
		WHERE id = $1 AND deleted_at IS NULL
	`, tableName)

	var id, orgID, name, email, phone, gender, status string
	var dob *time.Time
	var employeeID, avatarURL *string
	var permissions []string

	err = s.db.QueryRow(ctx, query, userUUID).Scan(
		&id, &orgID, &name, &email, &phone, &gender, &dob, &employeeID, &avatarURL, &status, &permissions,
	)

	if err != nil {
		return nil, errors.New("USER_NOT_FOUND")
	}

	dobStr := ""
	if dob != nil {
		dobStr = dob.Format("2006-01-02")
	}

	empID := ""
	if employeeID != nil {
		empID = *employeeID
	}

	avatarStr := ""
	if avatarURL != nil {
		avatarStr = *avatarURL
	}

	profile := &models.UserInfo{
		ID:             id,
		OrganizationID: orgID,
		UserType:       userType,
		Name:           name,
		Email:          email,
		Phone:          phone,
		Gender:         gender,
		DOB:            dobStr,
		EmployeeID:     empID,
		AvatarURL:      avatarStr,
		Status:         status,
		Permissions:    permissions,
	}

	// Store in Redis cache with 36 hour expiry
	profileJSON, err := json.Marshal(profile)
	if err == nil {
		database.RedisClient.Set(ctx, cacheKey, profileJSON, 36*time.Hour)
	}

	return profile, nil
}

// ChangePassword changes the user's password (works for all user types)
func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	// Parse UUID from string
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return errors.New("INVALID_USER_ID")
	}

	// Get user type
	userType, err := s.getUserTypeFromID(ctx, userUUID)
	if err != nil {
		return errors.New("USER_NOT_FOUND")
	}

	tableName := s.getTableName(userType)

	// Get current password hash
	query := fmt.Sprintf(`SELECT password_hash FROM %s WHERE id = $1 AND deleted_at IS NULL`, tableName)
	var passwordHash string
	err = s.db.QueryRow(ctx, query, userUUID).Scan(&passwordHash)
	if err != nil {
		return errors.New("USER_NOT_FOUND")
	}

	// Verify current password
	if !utils.ValidatePassword(currentPassword, passwordHash) {
		return errors.New("INVALID_CURRENT_PASSWORD")
	}

	// Hash new password
	newPasswordHash, err := utils.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	updateQuery := fmt.Sprintf(`UPDATE %s SET password_hash = $1, updated_at = $2 WHERE id = $3`, tableName)
	_, err = s.db.Exec(ctx, updateQuery, newPasswordHash, time.Now(), userUUID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// UpdateProfile updates the user's profile (works for all user types)
func (s *AuthService) UpdateProfile(ctx context.Context, userID string, req models.UpdateProfileRequest) (*models.UserInfo, error) {
	// Parse UUID from string
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("INVALID_USER_ID")
	}

	// Get user type
	userType, err := s.getUserTypeFromID(ctx, userUUID)
	if err != nil {
		return nil, errors.New("USER_NOT_FOUND")
	}

	tableName := s.getTableName(userType)

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		updates = append(updates, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	
	// Check if email needs to be updated and if it's already taken (check all user tables)
	if req.Email != nil {
		var existingID string
		checkQuery := `
			SELECT id::text FROM users_general_managers WHERE email = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id::text FROM users_managers WHERE email = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id::text FROM users_presales WHERE email = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id::text FROM users_sales WHERE email = $1 AND deleted_at IS NULL AND id != $2
		`
		err := s.db.QueryRow(ctx, checkQuery, *req.Email, userUUID).Scan(&existingID)
		if err == nil {
			// Email already exists for another user
			return nil, errors.New("EMAIL_ALREADY_EXISTS")
		}
		updates = append(updates, fmt.Sprintf("email = $%d", argIndex))
		args = append(args, *req.Email)
		argIndex++
	}
	
	// Check if phone needs to be updated and if it's already taken (check all user tables)
	if req.Phone != nil {
		var existingID string
		checkQuery := `
			SELECT id::text FROM users_general_managers WHERE phone = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id::text FROM users_managers WHERE phone = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id::text FROM users_presales WHERE phone = $1 AND deleted_at IS NULL AND id != $2
			UNION ALL
			SELECT id::text FROM users_sales WHERE phone = $1 AND deleted_at IS NULL AND id != $2
		`
		err := s.db.QueryRow(ctx, checkQuery, *req.Phone, userUUID).Scan(&existingID)
		if err == nil {
			// Phone already exists for another user
			return nil, errors.New("PHONE_ALREADY_EXISTS")
		}
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
	if req.AvatarURL != nil {
		updates = append(updates, fmt.Sprintf("avatar_url = $%d", argIndex))
		args = append(args, *req.AvatarURL)
		argIndex++
	}

	if len(updates) == 0 {
		// No updates, just return current profile
		return s.GetCurrentUserProfile(ctx, userID)
	}

	// Add updated_at
	updates = append(updates, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add user_id for WHERE clause
	args = append(args, userUUID)

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
		return nil, fmt.Errorf("failed to update profile: %w", execErr)
	}

	// Return updated profile
	return s.GetCurrentUserProfile(ctx, userID)
}
