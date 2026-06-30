package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"crownco/core-api/database"
	"crownco/core-api/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProjectService struct {
	DB *pgxpool.Pool
}

func NewProjectService(pool *pgxpool.Pool) *ProjectService {
	return &ProjectService{DB: pool}
}

// Redis cache keys
const (
	projectCacheKey       = "project:%s"                    // project:{id}
	projectUnitsCacheKey  = "project:%s:units"              // project:{id}:units
	projectAddonsCacheKey = "project:%s:addons"             // project:{id}:addons
	projectStatsCacheKey  = "project:%s:stats"              // project:{id}:stats
	cacheExpiry           = 36 * time.Hour                  // 36 hours
)

// ============================================
// PROJECT CRUD OPERATIONS
// ============================================

// CreateProject creates a new project with subscription limit check
func (s *ProjectService) CreateProject(ctx context.Context, organizationID string, req models.CreateProjectRequest) (*models.ProjectResponse, error) {
	// Check subscription limits
	maxProjects, err := s.getMaxProjectsLimit(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	currentCount, err := s.getCurrentProjectsCount(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	if currentCount >= maxProjects {
		return nil, fmt.Errorf("SUBSCRIPTION_LIMIT_EXCEEDED: %d/%d projects used", currentCount, maxProjects)
	}

	// Create project
	var projectID uuid.UUID
	query := `
		INSERT INTO projects (
			organization_id, project_title, project_type, area_type, rera_number,
			project_status, project_state, start_date, expected_possession_date,
			project_floor_count, full_address, city, pincode, state, country,
			coordinates, amenities, minimum_unit_price, maximum_unit_price,
			project_area_size, smallest_unit_size, biggest_unit_size,
			project_cover_photo_url, project_exterior_images_urls, project_interior_images_urls,
			project_exterior_videos_urls, project_drone_videos_urls, project_interior_videos_urls
		) VALUES (
			$1, $2, $3::project_type, NULLIF($4, '')::area_type, NULLIF($5, ''),
			NULLIF($6, '')::project_status, NULLIF($7, '')::project_state, NULLIF($8, '')::date, NULLIF($9, '')::date,
			$10, NULLIF($11, ''), NULLIF($12, ''), NULLIF($13, ''), NULLIF($14, ''), $15,
			NULLIF($16, ''), $17, $18, $19,
			$20, $21, $22,
			NULLIF($23, ''), $24, $25,
			$26, $27, $28
		)
		RETURNING id
	`

	err = s.DB.QueryRow(ctx, query,
		organizationID, req.ProjectTitle, req.ProjectType, req.AreaType, req.ReraNumber,
		req.ProjectStatus, req.ProjectState, req.StartDate, req.ExpectedPossessionDate,
		req.ProjectFloorCount, req.FullAddress, req.City, req.Pincode, req.State, req.Country,
		req.Coordinates, req.Amenities, req.MinimumUnitPrice, req.MaximumUnitPrice,
		req.ProjectAreaSize, req.SmallestUnitSize, req.BiggestUnitSize,
		req.ProjectCoverPhotoURL, req.ProjectExteriorImagesURLs, req.ProjectInteriorImagesURLs,
		req.ProjectExteriorVideosURLs, req.ProjectDroneVideosURLs, req.ProjectInteriorVideosURLs,
	).Scan(&projectID)

	if err != nil {
		return nil, err
	}

	// Get and return created project
	project, err := s.GetProjectByID(ctx, projectID.String(), organizationID)
	if err != nil {
		return nil, err
	}

	// Cache the project
	s.cacheProject(projectID.String(), project)

	return project, nil
}

// UpdateProject updates an existing project
func (s *ProjectService) UpdateProject(ctx context.Context, projectID, organizationID string, req models.UpdateProjectRequest) (*models.ProjectResponse, error) {
	// Verify project exists and belongs to organization
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	// Build dynamic update query
	updateFields := []string{}
	args := []interface{}{}
	argCount := 1

	if req.ProjectTitle != nil {
		updateFields = append(updateFields, fmt.Sprintf("project_title = $%d", argCount))
		args = append(args, *req.ProjectTitle)
		argCount++
	}
	if req.ProjectType != nil {
		updateFields = append(updateFields, fmt.Sprintf("project_type = $%d", argCount))
		args = append(args, *req.ProjectType)
		argCount++
	}
	if req.AreaType != nil {
		updateFields = append(updateFields, fmt.Sprintf("area_type = $%d", argCount))
		args = append(args, *req.AreaType)
		argCount++
	}
	if req.ReraNumber != nil {
		updateFields = append(updateFields, fmt.Sprintf("rera_number = $%d", argCount))
		args = append(args, *req.ReraNumber)
		argCount++
	}
	if req.ProjectStatus != nil {
		updateFields = append(updateFields, fmt.Sprintf("project_status = $%d", argCount))
		args = append(args, *req.ProjectStatus)
		argCount++
	}
	if req.ProjectState != nil {
		updateFields = append(updateFields, fmt.Sprintf("project_state = $%d", argCount))
		args = append(args, *req.ProjectState)
		argCount++
	}
	if req.City != nil {
		updateFields = append(updateFields, fmt.Sprintf("city = $%d", argCount))
		args = append(args, *req.City)
		argCount++
	}
	if req.State != nil {
		updateFields = append(updateFields, fmt.Sprintf("state = $%d", argCount))
		args = append(args, *req.State)
		argCount++
	}
	if req.Country != nil {
		updateFields = append(updateFields, fmt.Sprintf("country = $%d", argCount))
		args = append(args, *req.Country)
		argCount++
	}
	if req.MinimumUnitPrice != nil {
		updateFields = append(updateFields, fmt.Sprintf("minimum_unit_price = $%d", argCount))
		args = append(args, *req.MinimumUnitPrice)
		argCount++
	}
	if req.MaximumUnitPrice != nil {
		updateFields = append(updateFields, fmt.Sprintf("maximum_unit_price = $%d", argCount))
		args = append(args, *req.MaximumUnitPrice)
		argCount++
	}

	if len(updateFields) == 0 {
		return s.GetProjectByID(ctx, projectID, organizationID)
	}

	updateFields = append(updateFields, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, projectID)

	query := fmt.Sprintf(
		"UPDATE projects SET %s WHERE id = $%d AND organization_id = '%s' AND deleted_at IS NULL",
		strings.Join(updateFields, ", "),
		argCount,
		organizationID,
	)

	_, err = s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	// Invalidate project cache
	s.invalidateProjectCache(projectID)

	return s.GetProjectByID(ctx, projectID, organizationID)
}

// DeleteProject soft deletes a project
func (s *ProjectService) DeleteProject(ctx context.Context, projectID, organizationID string) error {
	query := `
		UPDATE projects
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`
	result, err := s.DB.Exec(ctx, query, projectID, organizationID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("PROJECT_NOT_FOUND")
	}

	// Invalidate all project-related caches
	s.invalidateProjectCache(projectID)

	return nil
}

// GetProjectByID retrieves a single project by ID
func (s *ProjectService) GetProjectByID(ctx context.Context, projectID, organizationID string) (*models.ProjectResponse, error) {
	// Check cache first
	cacheKey := fmt.Sprintf(projectCacheKey, projectID)
	if cached, err := database.RedisClient.Get(ctx, cacheKey).Result(); err == nil {
		var project models.ProjectResponse
		if json.Unmarshal([]byte(cached), &project) == nil {
			return &project, nil
		}
	}

	// Cache miss - fetch from DB
	query := `
		SELECT 
			id, organization_id, project_title, project_type, area_type, rera_number,
			project_status, project_state, start_date, expected_possession_date,
			project_floor_count, full_address, city, pincode, state, country,
			coordinates, amenities, minimum_unit_price, maximum_unit_price,
			project_area_size, smallest_unit_size, biggest_unit_size,
			project_cover_photo_url, project_exterior_images_urls, project_interior_images_urls,
			project_exterior_videos_urls, project_drone_videos_urls, project_interior_videos_urls,
			created_at, updated_at
		FROM projects
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`

	var project models.Project
	var amenities, exteriorImages, interiorImages, exteriorVideos, droneVideos, interiorVideos []string

	err := s.DB.QueryRow(ctx, query, projectID, organizationID).Scan(
		&project.ID, &project.OrganizationID, &project.ProjectTitle, &project.ProjectType,
		&project.AreaType, &project.ReraNumber, &project.ProjectStatus, &project.ProjectState,
		&project.StartDate, &project.ExpectedPossessionDate, &project.ProjectFloorCount,
		&project.FullAddress, &project.City, &project.Pincode, &project.State, &project.Country,
		&project.Coordinates, &amenities, &project.MinimumUnitPrice, &project.MaximumUnitPrice,
		&project.ProjectAreaSize, &project.SmallestUnitSize, &project.BiggestUnitSize,
		&project.ProjectCoverPhotoURL, &exteriorImages, &interiorImages,
		&exteriorVideos, &droneVideos, &interiorVideos,
		&project.CreatedAt, &project.UpdatedAt,
	)

	if err != nil {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	// Get counts
	unitsCount, _ := s.getUnitsCount(ctx, projectID)
	addonsCount, _ := s.getAddonsCount(ctx, projectID)

	projectResponse := &models.ProjectResponse{
		ID:                       project.ID.String(),
		OrganizationID:           project.OrganizationID.String(),
		ProjectTitle:             project.ProjectTitle,
		ProjectType:              project.ProjectType,
		AreaType:                 project.AreaType,
		ReraNumber:               project.ReraNumber,
		ProjectStatus:            project.ProjectStatus,
		ProjectState:             project.ProjectState,
		StartDate:                formatDate(project.StartDate),
		ExpectedPossessionDate:   formatDate(project.ExpectedPossessionDate),
		ProjectFloorCount:        project.ProjectFloorCount,
		FullAddress:              project.FullAddress,
		City:                     project.City,
		Pincode:                  project.Pincode,
		State:                    project.State,
		Country:                  project.Country,
		Coordinates:              project.Coordinates,
		Amenities:                amenities,
		MinimumUnitPrice:         project.MinimumUnitPrice,
		MaximumUnitPrice:         project.MaximumUnitPrice,
		ProjectAreaSize:          project.ProjectAreaSize,
		SmallestUnitSize:         project.SmallestUnitSize,
		BiggestUnitSize:          project.BiggestUnitSize,
		ProjectCoverPhotoURL:     project.ProjectCoverPhotoURL,
		ProjectExteriorImagesURLs: exteriorImages,
		ProjectInteriorImagesURLs: interiorImages,
		ProjectExteriorVideosURLs: exteriorVideos,
		ProjectDroneVideosURLs:    droneVideos,
		ProjectInteriorVideosURLs: interiorVideos,
		UnitsCount:               unitsCount,
		AddonsCount:              addonsCount,
		CreatedAt:                project.CreatedAt,
		UpdatedAt:                project.UpdatedAt,
	}

	// Cache the project
	s.cacheProject(projectID, projectResponse)

	return projectResponse, nil
}

// ListProjects retrieves projects with filters and pagination
func (s *ProjectService) ListProjects(ctx context.Context, organizationID string, filters map[string]string) (*models.ProjectListResponse, error) {
	whereConditions := []string{"organization_id = $1", "deleted_at IS NULL"}
	args := []interface{}{organizationID}
	argCount := 2

	// Sales "My projects": only rows in users_sales.project_assigned_ids
	if sid := filters["mine_sales_user_id"]; sid != "" {
		whereConditions = append(whereConditions, fmt.Sprintf(
			"id = ANY(COALESCE((SELECT project_assigned_ids FROM users_sales WHERE id = $%d::uuid AND organization_id = $1 AND deleted_at IS NULL), ARRAY[]::uuid[]))",
			argCount))
		args = append(args, sid)
		argCount++
	}

	// Build filter conditions
	if status := filters["status"]; status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("project_status = $%d", argCount))
		args = append(args, status)
		argCount++
	}
	if projectType := filters["type"]; projectType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("project_type = $%d", argCount))
		args = append(args, projectType)
		argCount++
	}
	if areaType := filters["area_type"]; areaType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("area_type = $%d", argCount))
		args = append(args, areaType)
		argCount++
	}
	if city := filters["city"]; city != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("city ILIKE $%d", argCount))
		args = append(args, "%"+city+"%")
		argCount++
	}
	if state := filters["state"]; state != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("state ILIKE $%d", argCount))
		args = append(args, "%"+state+"%")
		argCount++
	}
	if country := filters["country"]; country != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("country ILIKE $%d", argCount))
		args = append(args, "%"+country+"%")
		argCount++
	}
	if minFloor := filters["floor_count_min"]; minFloor != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("project_floor_count >= $%d", argCount))
		args = append(args, minFloor)
		argCount++
	}
	if maxFloor := filters["floor_count_max"]; maxFloor != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("project_floor_count <= $%d", argCount))
		args = append(args, maxFloor)
		argCount++
	}

	// Pagination
	page, limit := getPagination(filters)
	offset := (page - 1) * limit

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM projects WHERE %s", strings.Join(whereConditions, " AND "))
	var total int
	s.DB.QueryRow(ctx, countQuery, args...).Scan(&total)

	// Get projects
	query := fmt.Sprintf(`
		SELECT 
			id, organization_id, project_title, project_type, area_type,
			project_status, city, state, country,
			minimum_unit_price, maximum_unit_price,
			project_floor_count, created_at, updated_at
		FROM projects
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(whereConditions, " AND "), argCount, argCount+1)

	args = append(args, limit, offset)

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	projects := []models.ProjectResponse{}
	for rows.Next() {
		var p models.Project
		err := rows.Scan(
			&p.ID, &p.OrganizationID, &p.ProjectTitle, &p.ProjectType, &p.AreaType,
			&p.ProjectStatus, &p.City, &p.State, &p.Country,
			&p.MinimumUnitPrice, &p.MaximumUnitPrice,
			&p.ProjectFloorCount, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			continue
		}

		projects = append(projects, models.ProjectResponse{
			ID:                p.ID.String(),
			OrganizationID:    p.OrganizationID.String(),
			ProjectTitle:      p.ProjectTitle,
			ProjectType:       p.ProjectType,
			AreaType:          p.AreaType,
			ProjectStatus:     p.ProjectStatus,
			City:              p.City,
			State:             p.State,
			Country:           p.Country,
			MinimumUnitPrice:  p.MinimumUnitPrice,
			MaximumUnitPrice:  p.MaximumUnitPrice,
			ProjectFloorCount: p.ProjectFloorCount,
			CreatedAt:         p.CreatedAt,
			UpdatedAt:         p.UpdatedAt,
		})
	}

	return &models.ProjectListResponse{
		Projects: projects,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: (total + limit - 1) / limit,
		},
	}, nil
}

// SearchProjects performs full-text search on projects
func (s *ProjectService) SearchProjects(ctx context.Context, organizationID, query string, limit int) (*models.SearchProjectsResponse, error) {
	searchQuery := `
		SELECT 
			id, organization_id, project_title, project_type, city, state,
			minimum_unit_price, maximum_unit_price, created_at, updated_at
		FROM projects
		WHERE organization_id = $1 
		  AND deleted_at IS NULL
		  AND (
		    project_title ILIKE $2 
		    OR city ILIKE $2 
		    OR state ILIKE $2 
		    OR full_address ILIKE $2
		  )
		ORDER BY 
		  CASE 
		    WHEN project_title ILIKE $2 THEN 1
		    WHEN city ILIKE $2 THEN 2
		    WHEN state ILIKE $2 THEN 3
		    ELSE 4
		  END,
		  created_at DESC
		LIMIT $3
	`

	searchTerm := "%" + query + "%"
	rows, err := s.DB.Query(ctx, searchQuery, organizationID, searchTerm, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := []models.ProjectResponse{}
	for rows.Next() {
		var p models.Project
		err := rows.Scan(
			&p.ID, &p.OrganizationID, &p.ProjectTitle, &p.ProjectType,
			&p.City, &p.State, &p.MinimumUnitPrice, &p.MaximumUnitPrice,
			&p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			continue
		}

		results = append(results, models.ProjectResponse{
			ID:               p.ID.String(),
			OrganizationID:   p.OrganizationID.String(),
			ProjectTitle:     p.ProjectTitle,
			ProjectType:      p.ProjectType,
			City:             p.City,
			State:            p.State,
			MinimumUnitPrice: p.MinimumUnitPrice,
			MaximumUnitPrice: p.MaximumUnitPrice,
			CreatedAt:        p.CreatedAt,
			UpdatedAt:        p.UpdatedAt,
		})
	}

	return &models.SearchProjectsResponse{
		Results: results,
		Count:   len(results),
	}, nil
}

// leadVisibilityWhere returns SQL for leads alias l (same rules as dashboard leadFilterSQL).
func leadVisibilityWhere(orgID, userID, userRole string) (clause string, args []interface{}) {
	args = []interface{}{orgID}
	idx := 2
	switch userRole {
	case "general-manager", "general_manager", "manager":
		return "l.organization_id = $1 AND l.deleted_at IS NULL", args
	case "presales":
		args = append(args, userID)
		return fmt.Sprintf("l.organization_id = $1 AND l.deleted_at IS NULL AND ((l.assigned_to_user_id = $%d AND l.assigned_to_user_type = 'presales') OR (l.presales_user_id = $%d AND l.stage IN ('qualification','communication','site_visit')))", idx, idx), args
	case "sales":
		args = append(args, userID)
		return fmt.Sprintf("l.organization_id = $1 AND l.deleted_at IS NULL AND ((l.assigned_to_user_id = $%d AND l.assigned_to_user_type = 'sales') OR (l.sales_user_id = $%d AND l.sales_accepted_at IS NULL))", idx, idx), args
	default:
		return "l.organization_id = $1 AND l.deleted_at IS NULL", args
	}
}

func (s *ProjectService) enrichProjectLeadStats(ctx context.Context, stats *models.ProjectStatsResponse, projectID, orgID, userID, userRole string) {
	lw, largs := leadVisibilityWhere(orgID, userID, userRole)
	pi := len(largs) + 1
	args := append(append([]interface{}{}, largs...), projectID)

	qLeads := fmt.Sprintf(`SELECT COUNT(*)::int FROM leads l WHERE %s AND l.project_id = $%d::uuid`, lw, pi)
	_ = s.DB.QueryRow(ctx, qLeads, args...).Scan(&stats.TotalLeads)

	qVisits := fmt.Sprintf(`
		SELECT COUNT(*)::int FROM lead_property_visits v
		INNER JOIN leads l ON l.id = v.lead_id AND l.organization_id = v.organization_id
		WHERE %s AND v.project_id = $%d::uuid AND v.status = 'completed'`, lw, pi)
	_ = s.DB.QueryRow(ctx, qVisits, args...).Scan(&stats.TotalVisits)

	qNeg := fmt.Sprintf(`SELECT COUNT(*)::int FROM leads l WHERE %s AND l.project_id = $%d::uuid AND l.stage = 'negotiation'`, lw, pi)
	_ = s.DB.QueryRow(ctx, qNeg, args...).Scan(&stats.LeadsInNegotiation)

	qBook := fmt.Sprintf(`
		SELECT COUNT(*)::int FROM lead_bookings b
		INNER JOIN leads l ON l.id = b.lead_id AND l.organization_id = b.organization_id
		WHERE %s AND b.project_id = $%d::uuid`, lw, pi)
	_ = s.DB.QueryRow(ctx, qBook, args...).Scan(&stats.TotalLeadBookings)
}

func statsPayloadForRedis(stats *models.ProjectStatsResponse) models.ProjectStatsResponse {
	c := *stats
	c.TotalLeads = 0
	c.TotalVisits = 0
	c.LeadsInNegotiation = 0
	c.TotalLeadBookings = 0
	return c
}

// GetProjectStats retrieves statistics for a project (unit aggregates cached in Redis; lead funnel counts are computed per request).
func (s *ProjectService) GetProjectStats(ctx context.Context, projectID, organizationID, userID, userRole string) (*models.ProjectStatsResponse, error) {
	// Check cache first
	cacheKey := fmt.Sprintf(projectStatsCacheKey, projectID)
	if cached, err := database.RedisClient.Get(ctx, cacheKey).Result(); err == nil {
		var stats models.ProjectStatsResponse
		if json.Unmarshal([]byte(cached), &stats) == nil {
			s.enrichProjectLeadStats(ctx, &stats, projectID, organizationID, userID, userRole)
			return &stats, nil
		}
	}

	// Cache miss - verify project exists
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	stats := &models.ProjectStatsResponse{
		ProjectID:    projectID,
		UnitsByFloor: make(map[string]int),
		UnitsByType:  make(map[string]int),
		UnitsByStatus: make(map[string]int),
	}

	// Get unit counts by status
	statusQuery := `
		SELECT status, COUNT(*) 
		FROM project_units 
		WHERE project_id = $1 
		GROUP BY status
	`
	rows, _ := s.DB.Query(ctx, statusQuery, projectID)
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err == nil {
			stats.UnitsByStatus[status] = count
			stats.TotalUnits += count
			if status == "available" {
				stats.AvailableUnits = count
			} else if status == "booked" {
				stats.BookedUnits = count
			} else if status == "unavailable" {
				stats.UnavailableUnits = count
			}
		}
	}
	rows.Close()

	// Get units by floor
	floorQuery := `
		SELECT COALESCE(floor, 0) as floor, COUNT(*) 
		FROM project_units 
		WHERE project_id = $1 
		GROUP BY floor
		ORDER BY floor
	`
	rows, _ = s.DB.Query(ctx, floorQuery, projectID)
	for rows.Next() {
		var floor int
		var count int
		if err := rows.Scan(&floor, &count); err == nil {
			stats.UnitsByFloor[fmt.Sprintf("%d", floor)] = count
		}
	}
	rows.Close()

	// Get units by type
	typeQuery := `
		SELECT unit_type, COUNT(*) 
		FROM project_units 
		WHERE project_id = $1 
		GROUP BY unit_type
	`
	rows, _ = s.DB.Query(ctx, typeQuery, projectID)
	for rows.Next() {
		var unitType string
		var count int
		if err := rows.Scan(&unitType, &count); err == nil {
			stats.UnitsByType[unitType] = count
		}
	}
	rows.Close()

	// Get price statistics
	priceQuery := `
		SELECT 
			AVG(base_price) as avg_price,
			MIN(base_price) as min_price,
			MAX(base_price) as max_price
		FROM project_units
		WHERE project_id = $1 AND base_price IS NOT NULL
	`
	s.DB.QueryRow(ctx, priceQuery, projectID).Scan(&stats.AveragePrice, &stats.MinPrice, &stats.MaxPrice)

	// Get addons count
	addonCountQuery := `SELECT COUNT(*) FROM project_addons WHERE project_id = $1`
	s.DB.QueryRow(ctx, addonCountQuery, projectID).Scan(&stats.TotalAddons)

	s.enrichProjectLeadStats(ctx, stats, projectID, organizationID, userID, userRole)

	// Cache unit/addon aggregates only (lead funnel is user-scoped and fresh each request).
	if statsJSON, err := json.Marshal(statsPayloadForRedis(stats)); err == nil {
		database.RedisClient.Set(ctx, cacheKey, statsJSON, cacheExpiry)
	}

	return stats, nil
}

// ============================================
// UNIT CRUD OPERATIONS
// ============================================

// CreateUnit creates a new unit with limit check
func (s *ProjectService) CreateUnit(ctx context.Context, projectID, organizationID string, req models.CreateUnitRequest) (*models.UnitResponse, error) {
	// Verify project exists
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	// Check unit limit
	maxUnits, err := s.getMaxUnitsPerProject(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	currentCount, _ := s.getUnitsCount(ctx, projectID)
	if currentCount >= maxUnits {
		return nil, fmt.Errorf("UNIT_LIMIT_EXCEEDED: %d/%d units used for this project", currentCount, maxUnits)
	}

	// Create unit
	var unitID uuid.UUID
	query := `
		INSERT INTO project_units (
			project_id, name, floor, wing, unit_type, carpet_area, builtup_area,
			facing_direction, status, unit_code, base_price, parking_price,
			infrastructure_cost, development_charges, water_charges, mseb_charges,
			legal_charges, stamp_duty, registration_fee, gst, vat,
			one_time_maintenance, demand_score
		) VALUES (
			$1, $2, $3, NULLIF($4, ''), $5::unit_type, $6, $7,
			NULLIF($8, '')::facing_direction, COALESCE(NULLIF($9, ''), 'available')::unit_status, NULLIF($10, ''), $11, $12,
			$13, $14, $15, $16,
			$17, $18, $19, $20, $21,
			$22, $23
		)
		RETURNING id
	`

	err = s.DB.QueryRow(ctx, query,
		projectID, req.Name, req.Floor, req.Wing, req.UnitType, req.CarpetArea, req.BuiltupArea,
		req.FacingDirection, req.Status, req.UnitCode, req.BasePrice, req.ParkingPrice,
		req.InfrastructureCost, req.DevelopmentCharges, req.WaterCharges, req.MsebCharges,
		req.LegalCharges, req.StampDuty, req.RegistrationFee, req.GST, req.VAT,
		req.OneTimeMaintenance, req.DemandScore,
	).Scan(&unitID)

	if err != nil {
		return nil, err
	}

	// Invalidate project stats cache (unit count changed)
	s.invalidateProjectStatsCache(projectID)

	unit, err := s.GetUnitByID(ctx, projectID, unitID.String(), organizationID)
	if err != nil {
		return nil, err
	}

	// Cache the unit
	s.cacheUnit(projectID, unitID.String(), unit)

	return unit, nil
}

// BulkCreateUnits creates multiple units at once
func (s *ProjectService) BulkCreateUnits(ctx context.Context, projectID, organizationID string, req models.BulkCreateUnitsRequest) (*models.BulkCreateUnitsResponse, error) {
	// Verify project exists
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	// Check unit limit
	maxUnits, err := s.getMaxUnitsPerProject(ctx, organizationID)
	if err != nil {
		return nil, err
	}

	currentCount, _ := s.getUnitsCount(ctx, projectID)
	availableSlots := maxUnits - currentCount

	if len(req.Units) > availableSlots {
		return nil, fmt.Errorf("UNIT_LIMIT_EXCEEDED: %d slots available, %d units requested", availableSlots, len(req.Units))
	}

	response := &models.BulkCreateUnitsResponse{
		TotalRequested: len(req.Units),
		UnitsCreated:   []models.UnitResponse{},
		Errors:         []string{},
	}

	for i, unitReq := range req.Units {
		unit, err := s.CreateUnit(ctx, projectID, organizationID, unitReq)
		if err != nil {
			response.Failed++
			response.Errors = append(response.Errors, fmt.Sprintf("Unit %d (%s): %s", i+1, unitReq.Name, err.Error()))
			continue
		}
		response.Successful++
		response.UnitsCreated = append(response.UnitsCreated, *unit)
	}

	// Invalidate project stats cache
	s.invalidateProjectStatsCache(projectID)

	return response, nil
}

// UpdateUnit updates an existing unit
func (s *ProjectService) UpdateUnit(ctx context.Context, projectID, unitID, organizationID string, req models.UpdateUnitRequest) (*models.UnitResponse, error) {
	// Verify project ownership
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	// Build dynamic update query
	updateFields := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Name != nil {
		updateFields = append(updateFields, fmt.Sprintf("name = $%d", argCount))
		args = append(args, *req.Name)
		argCount++
	}
	if req.Floor != nil {
		updateFields = append(updateFields, fmt.Sprintf("floor = $%d", argCount))
		args = append(args, *req.Floor)
		argCount++
	}
	if req.Status != nil {
		updateFields = append(updateFields, fmt.Sprintf("status = $%d", argCount))
		args = append(args, *req.Status)
		argCount++
	}
	if req.BasePrice != nil {
		updateFields = append(updateFields, fmt.Sprintf("base_price = $%d", argCount))
		args = append(args, *req.BasePrice)
		argCount++
	}

	if len(updateFields) == 0 {
		return s.GetUnitByID(ctx, projectID, unitID, organizationID)
	}

	updateFields = append(updateFields, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, unitID, projectID)

	query := fmt.Sprintf(
		"UPDATE project_units SET %s WHERE id = $%d AND project_id = $%d",
		strings.Join(updateFields, ", "),
		argCount, argCount+1,
	)

	result, err := s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	if result.RowsAffected() == 0 {
		return nil, errors.New("UNIT_NOT_FOUND")
	}

	// Invalidate unit and project stats cache
	s.invalidateUnitCache(projectID, unitID)
	s.invalidateProjectStatsCache(projectID)

	return s.GetUnitByID(ctx, projectID, unitID, organizationID)
}

// DeleteUnit deletes a unit
func (s *ProjectService) DeleteUnit(ctx context.Context, projectID, unitID, organizationID string) error {
	// Verify project ownership
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return errors.New("PROJECT_NOT_FOUND")
	}

	query := `DELETE FROM project_units WHERE id = $1 AND project_id = $2`
	result, err := s.DB.Exec(ctx, query, unitID, projectID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("UNIT_NOT_FOUND")
	}

	// Invalidate unit cache and project stats
	s.invalidateUnitCache(projectID, unitID)
	s.invalidateProjectStatsCache(projectID)

	return nil
}

// GetUnitByID retrieves a single unit
func (s *ProjectService) GetUnitByID(ctx context.Context, projectID, unitID, organizationID string) (*models.UnitResponse, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("unit:%s", unitID)
	if cached, err := database.RedisClient.Get(ctx, cacheKey).Result(); err == nil {
		var unit models.UnitResponse
		if json.Unmarshal([]byte(cached), &unit) == nil {
			return &unit, nil
		}
	}

	// Cache miss - fetch from DB
	query := `
		SELECT 
			id, project_id, name, floor, wing, unit_type, carpet_area, builtup_area,
			facing_direction, status, unit_code, base_price, parking_price,
			infrastructure_cost, development_charges, water_charges, mseb_charges,
			legal_charges, stamp_duty, registration_fee, gst, vat,
			one_time_maintenance, demand_score, created_at, updated_at
		FROM project_units
		WHERE id = $1 AND project_id = $2
	`

	var unit models.Unit
	err := s.DB.QueryRow(ctx, query, unitID, projectID).Scan(
		&unit.ID, &unit.ProjectID, &unit.Name, &unit.Floor, &unit.Wing,
		&unit.UnitType, &unit.CarpetArea, &unit.BuiltupArea, &unit.FacingDirection,
		&unit.Status, &unit.UnitCode, &unit.BasePrice, &unit.ParkingPrice,
		&unit.InfrastructureCost, &unit.DevelopmentCharges, &unit.WaterCharges,
		&unit.MsebCharges, &unit.LegalCharges, &unit.StampDuty, &unit.RegistrationFee,
		&unit.GST, &unit.VAT, &unit.OneTimeMaintenance, &unit.DemandScore,
		&unit.CreatedAt, &unit.UpdatedAt,
	)

	if err != nil {
		return nil, errors.New("UNIT_NOT_FOUND")
	}

	unitResponse := &models.UnitResponse{
		ID:                  unit.ID.String(),
		ProjectID:           unit.ProjectID.String(),
		Name:                unit.Name,
		Floor:               unit.Floor,
		Wing:                unit.Wing,
		UnitType:            unit.UnitType,
		CarpetArea:          unit.CarpetArea,
		BuiltupArea:         unit.BuiltupArea,
		FacingDirection:     unit.FacingDirection,
		Status:              unit.Status,
		UnitCode:            unit.UnitCode,
		BasePrice:           unit.BasePrice,
		ParkingPrice:        unit.ParkingPrice,
		InfrastructureCost:  unit.InfrastructureCost,
		DevelopmentCharges:  unit.DevelopmentCharges,
		WaterCharges:        unit.WaterCharges,
		MsebCharges:         unit.MsebCharges,
		LegalCharges:        unit.LegalCharges,
		StampDuty:           unit.StampDuty,
		RegistrationFee:     unit.RegistrationFee,
		GST:                 unit.GST,
		VAT:                 unit.VAT,
		OneTimeMaintenance:  unit.OneTimeMaintenance,
		DemandScore:         unit.DemandScore,
		CreatedAt:           unit.CreatedAt,
		UpdatedAt:           unit.UpdatedAt,
	}

	// Cache the unit
	s.cacheUnit(projectID, unitID, unitResponse)

	return unitResponse, nil
}

// ListUnits retrieves units with filters and pagination
func (s *ProjectService) ListUnits(ctx context.Context, projectID, organizationID string, filters map[string]string) (*models.UnitListResponse, error) {
	// Verify project exists
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	whereConditions := []string{"project_id = $1"}
	args := []interface{}{projectID}
	argCount := 2

	// Build filter conditions
	if floor := filters["floor"]; floor != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("floor = $%d", argCount))
		args = append(args, floor)
		argCount++
	}
	if floorMin := filters["floor_min"]; floorMin != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("floor >= $%d", argCount))
		args = append(args, floorMin)
		argCount++
	}
	if floorMax := filters["floor_max"]; floorMax != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("floor <= $%d", argCount))
		args = append(args, floorMax)
		argCount++
	}
	if unitType := filters["unit_type"]; unitType != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("unit_type = $%d", argCount))
		args = append(args, unitType)
		argCount++
	}
	if status := filters["status"]; status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argCount))
		args = append(args, status)
		argCount++
	}
	if priceMin := filters["price_min"]; priceMin != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("base_price >= $%d", argCount))
		args = append(args, priceMin)
		argCount++
	}
	if priceMax := filters["price_max"]; priceMax != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("base_price <= $%d", argCount))
		args = append(args, priceMax)
		argCount++
	}

	// Pagination
	page, limit := getPagination(filters)
	offset := (page - 1) * limit

	// Get total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM project_units WHERE %s", strings.Join(whereConditions, " AND "))
	var total int
	s.DB.QueryRow(ctx, countQuery, args...).Scan(&total)

	// Get units
	query := fmt.Sprintf(`
		SELECT 
			id, project_id, name, floor, unit_type, carpet_area, builtup_area,
			status, base_price, created_at, updated_at
		FROM project_units
		WHERE %s
		ORDER BY floor ASC, name ASC
		LIMIT $%d OFFSET $%d
	`, strings.Join(whereConditions, " AND "), argCount, argCount+1)

	args = append(args, limit, offset)

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	units := []models.UnitResponse{}
	for rows.Next() {
		var u models.Unit
		err := rows.Scan(
			&u.ID, &u.ProjectID, &u.Name, &u.Floor, &u.UnitType,
			&u.CarpetArea, &u.BuiltupArea, &u.Status, &u.BasePrice,
			&u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			continue
		}

		units = append(units, models.UnitResponse{
			ID:          u.ID.String(),
			ProjectID:   u.ProjectID.String(),
			Name:        u.Name,
			Floor:       u.Floor,
			UnitType:    u.UnitType,
			CarpetArea:  u.CarpetArea,
			BuiltupArea: u.BuiltupArea,
			Status:      u.Status,
			BasePrice:   u.BasePrice,
			CreatedAt:   u.CreatedAt,
			UpdatedAt:   u.UpdatedAt,
		})
	}

	return &models.UnitListResponse{
		Units: units,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: (total + limit - 1) / limit,
		},
	}, nil
}

// ============================================
// ADDON CRUD OPERATIONS
// ============================================

// CreateAddon creates a new addon
func (s *ProjectService) CreateAddon(ctx context.Context, projectID, organizationID string, req models.CreateAddonRequest) (*models.AddonResponse, error) {
	// Verify project exists
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	var addonID uuid.UUID
	query := `
		INSERT INTO project_addons (project_id, title, description, category, price, image_url, status)
		VALUES ($1, $2, NULLIF($3, ''), $4::addon_category, $5, NULLIF($6, ''), COALESCE(NULLIF($7, ''), 'active')::addon_status)
		RETURNING id
	`

	err = s.DB.QueryRow(ctx, query,
		projectID, req.Title, req.Description, req.Category, req.Price, req.ImageURL, req.Status,
	).Scan(&addonID)

	if err != nil {
		return nil, err
	}

	// Invalidate project stats cache
	s.invalidateProjectStatsCache(projectID)

	addon, err := s.GetAddonByID(ctx, projectID, addonID.String(), organizationID)
	if err != nil {
		return nil, err
	}

	// Cache the addon
	s.cacheAddon(projectID, addonID.String(), addon)

	return addon, nil
}

// UpdateAddon updates an existing addon
func (s *ProjectService) UpdateAddon(ctx context.Context, projectID, addonID, organizationID string, req models.UpdateAddonRequest) (*models.AddonResponse, error) {
	// Verify project ownership
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	// Build update query
	updateFields := []string{}
	args := []interface{}{}
	argCount := 1

	if req.Title != nil {
		updateFields = append(updateFields, fmt.Sprintf("title = $%d", argCount))
		args = append(args, *req.Title)
		argCount++
	}
	if req.Price != nil {
		updateFields = append(updateFields, fmt.Sprintf("price = $%d", argCount))
		args = append(args, *req.Price)
		argCount++
	}
	if req.Status != nil {
		updateFields = append(updateFields, fmt.Sprintf("status = $%d", argCount))
		args = append(args, *req.Status)
		argCount++
	}

	if len(updateFields) == 0 {
		return s.GetAddonByID(ctx, projectID, addonID, organizationID)
	}

	updateFields = append(updateFields, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, addonID, projectID)

	query := fmt.Sprintf(
		"UPDATE project_addons SET %s WHERE id = $%d AND project_id = $%d",
		strings.Join(updateFields, ", "),
		argCount, argCount+1,
	)

	result, err := s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	if result.RowsAffected() == 0 {
		return nil, errors.New("ADDON_NOT_FOUND")
	}

	// Invalidate addon cache
	s.invalidateAddonCache(projectID, addonID)

	return s.GetAddonByID(ctx, projectID, addonID, organizationID)
}

// DeleteAddon deletes an addon
func (s *ProjectService) DeleteAddon(ctx context.Context, projectID, addonID, organizationID string) error {
	// Verify project ownership
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return errors.New("PROJECT_NOT_FOUND")
	}

	query := `DELETE FROM project_addons WHERE id = $1 AND project_id = $2`
	result, err := s.DB.Exec(ctx, query, addonID, projectID)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return errors.New("ADDON_NOT_FOUND")
	}

	// Invalidate addon cache and project stats
	s.invalidateAddonCache(projectID, addonID)
	s.invalidateProjectStatsCache(projectID)

	return nil
}

// GetAddonByID retrieves a single addon
func (s *ProjectService) GetAddonByID(ctx context.Context, projectID, addonID, organizationID string) (*models.AddonResponse, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("addon:%s", addonID)
	if cached, err := database.RedisClient.Get(ctx, cacheKey).Result(); err == nil {
		var addon models.AddonResponse
		if json.Unmarshal([]byte(cached), &addon) == nil {
			return &addon, nil
		}
	}

	// Cache miss - fetch from DB
	query := `
		SELECT id, project_id, title, description, category, price, image_url, status, created_at, updated_at
		FROM project_addons
		WHERE id = $1 AND project_id = $2
	`

	var addon models.Addon
	err := s.DB.QueryRow(ctx, query, addonID, projectID).Scan(
		&addon.ID, &addon.ProjectID, &addon.Title, &addon.Description,
		&addon.Category, &addon.Price, &addon.ImageURL, &addon.Status,
		&addon.CreatedAt, &addon.UpdatedAt,
	)

	if err != nil {
		return nil, errors.New("ADDON_NOT_FOUND")
	}

	addonResponse := &models.AddonResponse{
		ID:          addon.ID.String(),
		ProjectID:   addon.ProjectID.String(),
		Title:       addon.Title,
		Description: addon.Description,
		Category:    addon.Category,
		Price:       addon.Price,
		ImageURL:    addon.ImageURL,
		Status:      addon.Status,
		CreatedAt:   addon.CreatedAt,
		UpdatedAt:   addon.UpdatedAt,
	}

	// Cache the addon
	s.cacheAddon(projectID, addonID, addonResponse)

	return addonResponse, nil
}

// ListAddons retrieves addons with filters and pagination
func (s *ProjectService) ListAddons(ctx context.Context, projectID, organizationID string, filters map[string]string) (*models.AddonListResponse, error) {
	// Verify project exists
	exists, err := s.verifyProjectOwnership(ctx, projectID, organizationID)
	if err != nil || !exists {
		return nil, errors.New("PROJECT_NOT_FOUND")
	}

	whereConditions := []string{"project_id = $1"}
	args := []interface{}{projectID}
	argCount := 2

	if category := filters["category"]; category != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("category = $%d", argCount))
		args = append(args, category)
		argCount++
	}
	if status := filters["status"]; status != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("status = $%d", argCount))
		args = append(args, status)
		argCount++
	}
	if priceMin := filters["price_min"]; priceMin != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("price >= $%d", argCount))
		args = append(args, priceMin)
		argCount++
	}
	if priceMax := filters["price_max"]; priceMax != "" {
		whereConditions = append(whereConditions, fmt.Sprintf("price <= $%d", argCount))
		args = append(args, priceMax)
		argCount++
	}

	page, limit := getPagination(filters)
	offset := (page - 1) * limit

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM project_addons WHERE %s", strings.Join(whereConditions, " AND "))
	var total int
	s.DB.QueryRow(ctx, countQuery, args...).Scan(&total)

	query := fmt.Sprintf(`
		SELECT id, project_id, title, description, category, price, image_url, status, created_at, updated_at
		FROM project_addons
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, strings.Join(whereConditions, " AND "), argCount, argCount+1)

	args = append(args, limit, offset)

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	addons := []models.AddonResponse{}
	for rows.Next() {
		var a models.Addon
		err := rows.Scan(
			&a.ID, &a.ProjectID, &a.Title, &a.Description,
			&a.Category, &a.Price, &a.ImageURL, &a.Status,
			&a.CreatedAt, &a.UpdatedAt,
		)
		if err != nil {
			continue
		}

		addons = append(addons, models.AddonResponse{
			ID:          a.ID.String(),
			ProjectID:   a.ProjectID.String(),
			Title:       a.Title,
			Description: a.Description,
			Category:    a.Category,
			Price:       a.Price,
			ImageURL:    a.ImageURL,
			Status:      a.Status,
			CreatedAt:   a.CreatedAt,
			UpdatedAt:   a.UpdatedAt,
		})
	}

	return &models.AddonListResponse{
		Addons: addons,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: (total + limit - 1) / limit,
		},
	}, nil
}

// ============================================
// HELPER METHODS
// ============================================

func (s *ProjectService) getMaxProjectsLimit(ctx context.Context, organizationID string) (int, error) {
	query := `
		SELECT COALESCE((p.features->>'max_projects')::integer, 0)
		FROM subscriptions s
		JOIN plans p ON s.plan_id = p.id
		WHERE s.organization_id = $1
		  AND s.status IN ('trial', 'active')
		  AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
		ORDER BY s.created_at DESC
		LIMIT 1
	`
	var maxProjects int
	err := s.DB.QueryRow(ctx, query, organizationID).Scan(&maxProjects)
	if err != nil {
		return 0, errors.New("NO_ACTIVE_SUBSCRIPTION")
	}
	return maxProjects, nil
}

func (s *ProjectService) getCurrentProjectsCount(ctx context.Context, organizationID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM projects WHERE organization_id = $1 AND deleted_at IS NULL`
	err := s.DB.QueryRow(ctx, query, organizationID).Scan(&count)
	return count, err
}

func (s *ProjectService) getMaxUnitsPerProject(ctx context.Context, organizationID string) (int, error) {
	query := `
		SELECT COALESCE((p.features->>'max_units_per_project')::integer, 0)
		FROM subscriptions s
		JOIN plans p ON s.plan_id = p.id
		WHERE s.organization_id = $1
		  AND s.status IN ('trial', 'active')
		  AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
		ORDER BY s.created_at DESC
		LIMIT 1
	`
	var maxUnits int
	err := s.DB.QueryRow(ctx, query, organizationID).Scan(&maxUnits)
	if err != nil {
		return 0, errors.New("NO_ACTIVE_SUBSCRIPTION")
	}
	return maxUnits, nil
}

func (s *ProjectService) getUnitsCount(ctx context.Context, projectID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM project_units WHERE project_id = $1`
	err := s.DB.QueryRow(ctx, query, projectID).Scan(&count)
	return count, err
}

func (s *ProjectService) getAddonsCount(ctx context.Context, projectID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM project_addons WHERE project_id = $1`
	err := s.DB.QueryRow(ctx, query, projectID).Scan(&count)
	return count, err
}

func (s *ProjectService) verifyProjectOwnership(ctx context.Context, projectID, organizationID string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)`
	err := s.DB.QueryRow(ctx, query, projectID, organizationID).Scan(&exists)
	return exists, err
}

func formatDate(t *time.Time) *string {
	if t == nil {
		return nil
	}
	formatted := t.Format("2006-01-02")
	return &formatted
}

func getPagination(filters map[string]string) (page, limit int) {
	page = 1
	limit = 20

	if p := filters["page"]; p != "" {
		if val, err := fmt.Sscanf(p, "%d", &page); err == nil && val == 1 && page > 0 {
			// page is valid
		} else {
			page = 1
		}
	}

	if l := filters["limit"]; l != "" {
		if val, err := fmt.Sscanf(l, "%d", &limit); err == nil && val == 1 && limit > 0 && limit <= 100 {
			// limit is valid
		} else {
			limit = 20
		}
	}

	return page, limit
}
