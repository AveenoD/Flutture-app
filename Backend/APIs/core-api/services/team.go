package services

import (
	"context"
	"crownco/core-api/models"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TeamService struct {
	db *pgxpool.Pool
}

func NewTeamService(db *pgxpool.Pool) *TeamService {
	return &TeamService{db: db}
}

// GetOrganizationIDFromUserID gets organization_id for a user (any type)
func (s *TeamService) GetOrganizationIDFromUserID(ctx context.Context, userID, userType string) (uuid.UUID, error) {
	var orgID uuid.UUID
	var query string

	switch userType {
	case "general-manager", "general_manager":
		query = `SELECT organization_id FROM users_general_managers WHERE id = $1 AND deleted_at IS NULL`
	case "manager":
		query = `SELECT organization_id FROM users_managers WHERE id = $1 AND deleted_at IS NULL`
	case "presales":
		query = `SELECT organization_id FROM users_presales WHERE id = $1 AND deleted_at IS NULL`
	case "sales":
		query = `SELECT organization_id FROM users_sales WHERE id = $1 AND deleted_at IS NULL`
	default:
		return uuid.Nil, errors.New("INVALID_USER_TYPE")
	}

	err := s.db.QueryRow(ctx, query, userID).Scan(&orgID)
	if err != nil {
		return uuid.Nil, errors.New("USER_NOT_FOUND")
	}

	return orgID, nil
}

// CheckPermission checks if user has permission (GM always has all permissions)
func (s *TeamService) CheckPermission(ctx context.Context, userID, userType, permission string) (bool, error) {
	// GM has all permissions
	if userType == "general-manager" || userType == "general_manager" {
		return true, nil
	}

	// For managers, check if they have the specific permission
	if userType == "manager" {
		var hasPermission bool
		query := `SELECT $2 = ANY(permissions) FROM users_managers WHERE id = $1 AND deleted_at IS NULL`
		err := s.db.QueryRow(ctx, query, userID, permission).Scan(&hasPermission)
		if err != nil {
			return false, errors.New("USER_NOT_FOUND")
		}
		return hasPermission, nil
	}

	return false, errors.New("FORBIDDEN")
}

// CreateTeam creates a new team
func (s *TeamService) CreateTeam(ctx context.Context, userID, userType string, req models.CreateTeamRequest) (*models.Team, error) {
	// Get organization ID
	orgID, err := s.GetOrganizationIDFromUserID(ctx, userID, userType)
	if err != nil {
		return nil, err
	}

	// Check permission (GM or manager with create_teams permission)
	hasPermission, err := s.CheckPermission(ctx, userID, userType, "create_teams")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, errors.New("FORBIDDEN")
	}

	// If manager_user_id is provided, validate it belongs to same organization
	if req.ManagerUserID != nil && *req.ManagerUserID != "" {
		managerOrgID, err := s.GetOrganizationIDFromUserID(ctx, *req.ManagerUserID, "manager")
		if err != nil {
			return nil, errors.New("MANAGER_NOT_FOUND")
		}
		if managerOrgID != orgID {
			return nil, errors.New("MANAGER_NOT_IN_ORGANIZATION")
		}
	}

	// Create team
	query := `
		INSERT INTO teams (
			organization_id, manager_user_id, team_title, team_description,
			team_type, labels, team_rating_score, team_logo_url,
			team_status, working_region, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		RETURNING id, organization_id, manager_user_id, team_title, team_description,
				  team_type, project_assigned_ids, labels, team_rating_score,
				  team_logo_url, team_status, working_region, created_at, updated_at
	`

	var team models.Team
	var managerID *uuid.UUID
	if req.ManagerUserID != nil && *req.ManagerUserID != "" {
		parsedID, parseErr := uuid.Parse(*req.ManagerUserID)
		if parseErr != nil {
			return nil, errors.New("INVALID_MANAGER_ID")
		}
		managerID = &parsedID
	}

	var projectIDs []uuid.UUID
	var labels, workingRegion []string
	
	err = s.db.QueryRow(
		ctx, query,
		orgID, managerID, req.TeamTitle, req.TeamDescription,
		req.TeamType, req.Labels, req.TeamRatingScore, req.TeamLogoURL,
		req.WorkingRegion,
	).Scan(
		&team.ID, &team.OrganizationID, &team.ManagerUserID, &team.TeamTitle,
		&team.TeamDescription, &team.TeamType, &projectIDs,
		&labels, &team.TeamRatingScore, &team.TeamLogoURL,
		&team.TeamStatus, &workingRegion, &team.CreatedAt, &team.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("TEAM_CREATION_FAILED: %v", err)
	}
	
	team.ProjectAssignedIDs = projectIDs
	team.Labels = labels
	team.WorkingRegion = workingRegion

	return &team, nil
}

// UpdateTeam updates team information
func (s *TeamService) UpdateTeam(ctx context.Context, userID, userType, teamID string, req models.UpdateTeamRequest) (*models.Team, error) {
	// Get organization ID
	orgID, err := s.GetOrganizationIDFromUserID(ctx, userID, userType)
	if err != nil {
		return nil, err
	}

	// Check permission
	hasPermission, err := s.CheckPermission(ctx, userID, userType, "create_teams")
	if err != nil {
		return nil, err
	}
	if !hasPermission {
		return nil, errors.New("FORBIDDEN")
	}

	// Parse team ID
	teamUUID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, errors.New("INVALID_TEAM_ID")
	}

	// Check team belongs to organization
	var teamOrgID uuid.UUID
	err = s.db.QueryRow(ctx, `SELECT organization_id FROM teams WHERE id = $1`, teamUUID).Scan(&teamOrgID)
	if err != nil {
		return nil, errors.New("TEAM_NOT_FOUND")
	}
	if teamOrgID != orgID {
		return nil, errors.New("FORBIDDEN")
	}

	// Build update query dynamically
	updates := []string{}
	args := []interface{}{teamUUID}
	argCounter := 2

	if req.TeamTitle != nil {
		updates = append(updates, fmt.Sprintf("team_title = $%d", argCounter))
		args = append(args, *req.TeamTitle)
		argCounter++
	}
	if req.TeamDescription != nil {
		updates = append(updates, fmt.Sprintf("team_description = $%d", argCounter))
		args = append(args, *req.TeamDescription)
		argCounter++
	}
	if req.TeamType != nil {
		updates = append(updates, fmt.Sprintf("team_type = $%d", argCounter))
		args = append(args, *req.TeamType)
		argCounter++
	}
	if req.ManagerUserID != nil {
		if *req.ManagerUserID == "" {
			updates = append(updates, fmt.Sprintf("manager_user_id = NULL"))
		} else {
			managerUUID, parseErr := uuid.Parse(*req.ManagerUserID)
			if parseErr != nil {
				return nil, errors.New("INVALID_MANAGER_ID")
			}
			// Validate manager belongs to same organization
			managerOrgID, valErr := s.GetOrganizationIDFromUserID(ctx, *req.ManagerUserID, "manager")
			if valErr != nil {
				return nil, errors.New("MANAGER_NOT_FOUND")
			}
			if managerOrgID != orgID {
				return nil, errors.New("MANAGER_NOT_IN_ORGANIZATION")
			}
			updates = append(updates, fmt.Sprintf("manager_user_id = $%d", argCounter))
			args = append(args, managerUUID)
			argCounter++
		}
	}
	if req.Labels != nil {
		updates = append(updates, fmt.Sprintf("labels = $%d", argCounter))
		args = append(args, req.Labels)
		argCounter++
	}
	if req.TeamRatingScore != nil {
		updates = append(updates, fmt.Sprintf("team_rating_score = $%d", argCounter))
		args = append(args, *req.TeamRatingScore)
		argCounter++
	}
	if req.TeamLogoURL != nil {
		updates = append(updates, fmt.Sprintf("team_logo_url = $%d", argCounter))
		args = append(args, *req.TeamLogoURL)
		argCounter++
	}
	if req.TeamStatus != nil {
		updates = append(updates, fmt.Sprintf("team_status = $%d", argCounter))
		args = append(args, *req.TeamStatus)
		argCounter++
	}
	if req.WorkingRegion != nil {
		updates = append(updates, fmt.Sprintf("working_region = $%d", argCounter))
		args = append(args, req.WorkingRegion)
		argCounter++
	}

	if len(updates) == 0 {
		return nil, errors.New("NO_FIELDS_TO_UPDATE")
	}

	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")

	query := fmt.Sprintf(`
		UPDATE teams SET %s
		WHERE id = $1
		RETURNING id, organization_id, manager_user_id, team_title, team_description,
				  team_type, project_assigned_ids, labels, team_rating_score,
				  team_logo_url, team_status, working_region, created_at, updated_at
	`, fmt.Sprintf("%s", updates[0]))

	for i := 1; i < len(updates); i++ {
		query = fmt.Sprintf(`
			UPDATE teams SET %s
			WHERE id = $1
			RETURNING id, organization_id, manager_user_id, team_title, team_description,
					  team_type, project_assigned_ids, labels, team_rating_score,
					  team_logo_url, team_status, working_region, created_at, updated_at
		`, fmt.Sprintf("%s, %s", updates[0], updates[i]))
	}

	// Rebuild query properly
	var updateStr string
	for i, u := range updates {
		if i > 0 {
			updateStr += ", "
		}
		updateStr += u
	}
	query = fmt.Sprintf(`
		UPDATE teams SET %s
		WHERE id = $1
		RETURNING id, organization_id, manager_user_id, team_title, team_description,
				  team_type, project_assigned_ids, labels, team_rating_score,
				  team_logo_url, team_status, working_region, created_at, updated_at
	`, updateStr)

	var team models.Team
	var projectIDs []uuid.UUID
	var labels, workingRegion []string
	
	err = s.db.QueryRow(ctx, query, args...).Scan(
		&team.ID, &team.OrganizationID, &team.ManagerUserID, &team.TeamTitle,
		&team.TeamDescription, &team.TeamType, &projectIDs,
		&labels, &team.TeamRatingScore, &team.TeamLogoURL,
		&team.TeamStatus, &workingRegion, &team.CreatedAt, &team.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("TEAM_UPDATE_FAILED: %v", err)
	}
	
	team.ProjectAssignedIDs = projectIDs
	team.Labels = labels
	team.WorkingRegion = workingRegion

	return &team, nil
}

// AddTeamMember adds a user to a team
func (s *TeamService) AddTeamMember(ctx context.Context, userID, userType, teamID string, req models.AddTeamMemberRequest) error {
	// Get organization ID
	orgID, err := s.GetOrganizationIDFromUserID(ctx, userID, userType)
	if err != nil {
		return err
	}

	// Check permission
	hasPermission, err := s.CheckPermission(ctx, userID, userType, "create_teams")
	if err != nil {
		return err
	}
	if !hasPermission {
		return errors.New("FORBIDDEN")
	}

	// Parse team ID
	teamUUID, err := uuid.Parse(teamID)
	if err != nil {
		return errors.New("INVALID_TEAM_ID")
	}

	// Check team belongs to organization
	var teamOrgID uuid.UUID
	err = s.db.QueryRow(ctx, `SELECT organization_id FROM teams WHERE id = $1`, teamUUID).Scan(&teamOrgID)
	if err != nil {
		return errors.New("TEAM_NOT_FOUND")
	}
	if teamOrgID != orgID {
		return errors.New("FORBIDDEN")
	}

	// Verify user to be added belongs to same organization
	memberOrgID, err := s.GetOrganizationIDFromUserID(ctx, req.UserID, req.UserType)
	if err != nil {
		return errors.New("USER_NOT_FOUND")
	}
	if memberOrgID != orgID {
		return errors.New("USER_NOT_IN_ORGANIZATION")
	}

	// Update user's team_id
	var updateQuery string
	switch req.UserType {
	case "manager":
		updateQuery = `UPDATE users_managers SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`
	case "presales":
		updateQuery = `UPDATE users_presales SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`
	case "sales":
		updateQuery = `UPDATE users_sales SET team_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL`
	default:
		return errors.New("INVALID_USER_TYPE")
	}

	memberUUID, err := uuid.Parse(req.UserID)
	if err != nil {
		return errors.New("INVALID_USER_ID")
	}

	_, err = s.db.Exec(ctx, updateQuery, teamUUID, memberUUID)
	if err != nil {
		return fmt.Errorf("FAILED_TO_ADD_MEMBER: %v", err)
	}

	return nil
}

// RemoveTeamMember removes a user from a team
func (s *TeamService) RemoveTeamMember(ctx context.Context, userID, userType, teamID string, req models.RemoveTeamMemberRequest) error {
	// Get organization ID
	orgID, err := s.GetOrganizationIDFromUserID(ctx, userID, userType)
	if err != nil {
		return err
	}

	// Check permission
	hasPermission, err := s.CheckPermission(ctx, userID, userType, "create_teams")
	if err != nil {
		return err
	}
	if !hasPermission {
		return errors.New("FORBIDDEN")
	}

	// Parse team ID
	teamUUID, err := uuid.Parse(teamID)
	if err != nil {
		return errors.New("INVALID_TEAM_ID")
	}

	// Check team belongs to organization
	var teamOrgID uuid.UUID
	err = s.db.QueryRow(ctx, `SELECT organization_id FROM teams WHERE id = $1`, teamUUID).Scan(&teamOrgID)
	if err != nil {
		return errors.New("TEAM_NOT_FOUND")
	}
	if teamOrgID != orgID {
		return errors.New("FORBIDDEN")
	}

	// Verify user to be removed belongs to same organization
	memberOrgID, err := s.GetOrganizationIDFromUserID(ctx, req.UserID, req.UserType)
	if err != nil {
		return errors.New("USER_NOT_FOUND")
	}
	if memberOrgID != orgID {
		return errors.New("USER_NOT_IN_ORGANIZATION")
	}

	// Update user's team_id to NULL
	var updateQuery string
	switch req.UserType {
	case "manager":
		updateQuery = `UPDATE users_managers SET team_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND team_id = $2 AND deleted_at IS NULL`
	case "presales":
		updateQuery = `UPDATE users_presales SET team_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND team_id = $2 AND deleted_at IS NULL`
	case "sales":
		updateQuery = `UPDATE users_sales SET team_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND team_id = $2 AND deleted_at IS NULL`
	default:
		return errors.New("INVALID_USER_TYPE")
	}

	memberUUID, err := uuid.Parse(req.UserID)
	if err != nil {
		return errors.New("INVALID_USER_ID")
	}

	result, err := s.db.Exec(ctx, updateQuery, memberUUID, teamUUID)
	if err != nil {
		return fmt.Errorf("FAILED_TO_REMOVE_MEMBER: %v", err)
	}

	if result.RowsAffected() == 0 {
		return errors.New("USER_NOT_IN_TEAM")
	}

	return nil
}

// GetTeamMembers gets all members of a team
func (s *TeamService) GetTeamMembers(ctx context.Context, userID, userType, teamID string) ([]models.TeamMember, error) {
	// Get organization ID
	orgID, err := s.GetOrganizationIDFromUserID(ctx, userID, userType)
	if err != nil {
		return nil, err
	}

	// Parse team ID
	teamUUID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, errors.New("INVALID_TEAM_ID")
	}

	// Check team belongs to organization
	var teamOrgID uuid.UUID
	err = s.db.QueryRow(ctx, `SELECT organization_id FROM teams WHERE id = $1`, teamUUID).Scan(&teamOrgID)
	if err != nil {
		return nil, errors.New("TEAM_NOT_FOUND")
	}
	if teamOrgID != orgID {
		return nil, errors.New("FORBIDDEN")
	}

	// Get members from all user types
	members := []models.TeamMember{}

	// Get managers
	managerQuery := `
		SELECT id, name, email, phone, employee_id, avatar_url, status, updated_at
		FROM users_managers
		WHERE team_id = $1 AND deleted_at IS NULL
	`
	managerRows, err := s.db.Query(ctx, managerQuery, teamUUID)
	if err == nil {
		defer managerRows.Close()
		for managerRows.Next() {
			var m models.TeamMember
			err := managerRows.Scan(&m.ID, &m.Name, &m.Email, &m.Phone, &m.EmployeeID, &m.AvatarURL, &m.Status, &m.JoinedAt)
			if err == nil {
				m.UserType = "manager"
				members = append(members, m)
			}
		}
	}

	// Get presales
	presalesQuery := `
		SELECT id, name, email, phone, employee_id, avatar_url, status, updated_at
		FROM users_presales
		WHERE team_id = $1 AND deleted_at IS NULL
	`
	presalesRows, err := s.db.Query(ctx, presalesQuery, teamUUID)
	if err == nil {
		defer presalesRows.Close()
		for presalesRows.Next() {
			var m models.TeamMember
			err := presalesRows.Scan(&m.ID, &m.Name, &m.Email, &m.Phone, &m.EmployeeID, &m.AvatarURL, &m.Status, &m.JoinedAt)
			if err == nil {
				m.UserType = "presales"
				members = append(members, m)
			}
		}
	}

	// Get sales
	salesQuery := `
		SELECT id, name, email, phone, employee_id, avatar_url, status, updated_at
		FROM users_sales
		WHERE team_id = $1 AND deleted_at IS NULL
	`
	salesRows, err := s.db.Query(ctx, salesQuery, teamUUID)
	if err == nil {
		defer salesRows.Close()
		for salesRows.Next() {
			var m models.TeamMember
			err := salesRows.Scan(&m.ID, &m.Name, &m.Email, &m.Phone, &m.EmployeeID, &m.AvatarURL, &m.Status, &m.JoinedAt)
			if err == nil {
				m.UserType = "sales"
				members = append(members, m)
			}
		}
	}

	return members, nil
}

// GetAllTeams gets all teams for the organization
func (s *TeamService) GetAllTeams(ctx context.Context, userID, userType string) ([]models.TeamWithMembers, error) {
	// Get organization ID
	orgID, err := s.GetOrganizationIDFromUserID(ctx, userID, userType)
	if err != nil {
		return nil, err
	}

	query := `
		SELECT 
			t.id, t.organization_id, t.manager_user_id, t.team_title, t.team_description,
			t.team_type, t.project_assigned_ids, t.labels, t.team_rating_score,
			t.team_logo_url, t.team_status, t.working_region, t.created_at, t.updated_at,
			m.name as manager_name,
			(
				SELECT COUNT(*) FROM (
					SELECT id FROM users_managers WHERE team_id = t.id AND deleted_at IS NULL
					UNION ALL
					SELECT id FROM users_presales WHERE team_id = t.id AND deleted_at IS NULL
					UNION ALL
					SELECT id FROM users_sales WHERE team_id = t.id AND deleted_at IS NULL
				) AS members
			) as member_count
		FROM teams t
		LEFT JOIN users_managers m ON t.manager_user_id = m.id AND m.deleted_at IS NULL
		WHERE t.organization_id = $1
		ORDER BY t.created_at DESC
	`

	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("FAILED_TO_FETCH_TEAMS: %v", err)
	}
	defer rows.Close()

	teams := []models.TeamWithMembers{}
	for rows.Next() {
		var t models.TeamWithMembers
		var projectIDs []uuid.UUID
		var labels, workingRegion []string
		
		err := rows.Scan(
			&t.ID, &t.OrganizationID, &t.ManagerUserID, &t.TeamTitle, &t.TeamDescription,
			&t.TeamType, &projectIDs, &labels, &t.TeamRatingScore,
			&t.TeamLogoURL, &t.TeamStatus, &workingRegion, &t.CreatedAt, &t.UpdatedAt,
			&t.ManagerName, &t.MemberCount,
		)
		if err != nil {
			continue
		}
		t.ProjectAssignedIDs = projectIDs
		t.Labels = labels
		t.WorkingRegion = workingRegion
		teams = append(teams, t)
	}

	return teams, nil
}
