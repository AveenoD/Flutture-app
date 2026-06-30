package services

import (
	"context"
	"encoding/json"
	"fmt"

	"crownco/core-api/models"
	ls "crownco/core-api/services/lead_sourcing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// LeadSourcingService handles CRUD for organization_apis, lead_sourcing_api_configs,
// external_project_mappings, and lead_sync_logs.
type LeadSourcingService struct {
	DB     *pgxpool.Pool
	Engine *ls.Engine
}

func NewLeadSourcingService(db *pgxpool.Pool, engine *ls.Engine) *LeadSourcingService {
	return &LeadSourcingService{DB: db, Engine: engine}
}

// GetOrgIDForUser returns the organization_id for the given user based on their role.
func (s *LeadSourcingService) GetOrgIDForUser(ctx context.Context, userID, userRole string) (string, error) {
	var table string
	switch userRole {
	case "general-manager":
		table = "users_general_managers"
	case "manager":
		table = "users_managers"
	case "presales":
		table = "users_presales"
	case "sales":
		table = "users_sales"
	default:
		return "", fmt.Errorf("INVALID_USER_TYPE")
	}
	var orgID string
	err := s.DB.QueryRow(ctx, fmt.Sprintf("SELECT organization_id FROM %s WHERE id = $1", table), userID).Scan(&orgID)
	return orgID, err
}

// ============================================================
// Organization APIs
// ============================================================

func (s *LeadSourcingService) CreateOrgAPI(ctx context.Context, orgID string, req models.CreateOrgAPIRequest) (*models.OrgAPIResponse, error) {
	var id string
	err := s.DB.QueryRow(ctx, `
		INSERT INTO organization_apis
			(organization_id, provider, api_category, auth_type,
			 api_key_encrypted, username, password_encrypted, base_endpoint)
		VALUES ($1, $2::api_provider, $3::api_category, $4::auth_type,
		        NULLIF($5,''), NULLIF($6,''), NULLIF($7,''), NULLIF($8,''))
		RETURNING id::text
	`,
		orgID, req.Provider, req.APICategory, req.AuthType,
		req.APIKey, req.Username, req.Password, req.BaseEndpoint,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetOrgAPI(ctx, id, orgID)
}

func (s *LeadSourcingService) ListOrgAPIs(ctx context.Context, orgID string) ([]models.OrgAPIResponse, error) {
	rows, err := s.DB.Query(ctx, `
		SELECT id::text, organization_id::text, provider::text, api_category::text, auth_type::text,
		       api_key_encrypted IS NOT NULL AND api_key_encrypted != '' AS has_api_key,
		       password_encrypted IS NOT NULL AND password_encrypted != '' AS has_password,
		       username, base_endpoint, status::text, last_health_check_at, created_at, updated_at
		FROM organization_apis
		WHERE organization_id = $1
		ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.OrgAPIResponse
	for rows.Next() {
		r, err := scanOrgAPIResponse(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

func (s *LeadSourcingService) GetOrgAPI(ctx context.Context, id, orgID string) (*models.OrgAPIResponse, error) {
	row := s.DB.QueryRow(ctx, `
		SELECT id::text, organization_id::text, provider::text, api_category::text, auth_type::text,
		       api_key_encrypted IS NOT NULL AND api_key_encrypted != '' AS has_api_key,
		       password_encrypted IS NOT NULL AND password_encrypted != '' AS has_password,
		       username, base_endpoint, status::text, last_health_check_at, created_at, updated_at
		FROM organization_apis
		WHERE id = $1 AND organization_id = $2
	`, id, orgID)
	r, err := scanOrgAPIResponse(row)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *LeadSourcingService) UpdateOrgAPI(ctx context.Context, id, orgID string, req models.UpdateOrgAPIRequest) (*models.OrgAPIResponse, error) {
	if req.Status != nil {
		_, err := s.DB.Exec(ctx, `
			UPDATE organization_apis SET status = $1::api_status, updated_at = NOW()
			WHERE id = $2 AND organization_id = $3
		`, *req.Status, id, orgID)
		if err != nil {
			return nil, err
		}
	}
	if req.APIKey != nil {
		_, err := s.DB.Exec(ctx, `UPDATE organization_apis SET api_key_encrypted = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`, *req.APIKey, id, orgID)
		if err != nil {
			return nil, err
		}
	}
	if req.Username != nil {
		_, err := s.DB.Exec(ctx, `UPDATE organization_apis SET username = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`, *req.Username, id, orgID)
		if err != nil {
			return nil, err
		}
	}
	if req.Password != nil {
		_, err := s.DB.Exec(ctx, `UPDATE organization_apis SET password_encrypted = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`, *req.Password, id, orgID)
		if err != nil {
			return nil, err
		}
	}
	if req.BaseEndpoint != nil {
		_, err := s.DB.Exec(ctx, `UPDATE organization_apis SET base_endpoint = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3`, *req.BaseEndpoint, id, orgID)
		if err != nil {
			return nil, err
		}
	}
	return s.GetOrgAPI(ctx, id, orgID)
}

func (s *LeadSourcingService) DeleteOrgAPI(ctx context.Context, id, orgID string) error {
	tag, err := s.DB.Exec(ctx, `DELETE FROM organization_apis WHERE id = $1 AND organization_id = $2`, id, orgID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("NOT_FOUND")
	}
	return nil
}

// ============================================================
// Lead Sourcing Configs
// ============================================================

func (s *LeadSourcingService) CreateSourcingConfig(ctx context.Context, orgID string, req models.CreateLeadSourcingConfigRequest) (*models.LeadSourcingConfigResponse, error) {
	// Ensure the org_api_id belongs to this org.
	var exists bool
	if err := s.DB.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM organization_apis WHERE id=$1 AND organization_id=$2)`, req.OrgAPIID, orgID).Scan(&exists); err != nil || !exists {
		return nil, fmt.Errorf("org_api_id not found for this organization")
	}

	mappingJSON, err := json.Marshal(req.MappingConfig)
	if err != nil {
		return nil, fmt.Errorf("invalid mapping_config: %w", err)
	}

	var id string
	err = s.DB.QueryRow(ctx, `
		INSERT INTO lead_sourcing_api_configs
			(organization_api_id, sync_mode, sync_interval_min, lead_source_tag, mapping_config_json)
		VALUES ($1, $2::sync_mode, $3, $4::lead_source_tag, $5)
		RETURNING id::text
	`,
		req.OrgAPIID, req.SyncMode, req.SyncIntervalMin, req.LeadSourceTag, mappingJSON,
	).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetSourcingConfig(ctx, id, orgID)
}

func (s *LeadSourcingService) ListSourcingConfigs(ctx context.Context, orgID string) ([]models.LeadSourcingConfigResponse, error) {
	rows, err := s.DB.Query(ctx, `
		SELECT lsc.id::text, lsc.organization_api_id::text, oa.provider::text,
		       lsc.sync_mode::text, COALESCE(lsc.sync_interval_min,60),
		       lsc.last_synced_at, lsc.lead_source_tag::text,
		       lsc.mapping_config_json, lsc.created_at, lsc.updated_at
		FROM lead_sourcing_api_configs lsc
		JOIN organization_apis oa ON oa.id = lsc.organization_api_id
		WHERE oa.organization_id = $1
		ORDER BY lsc.created_at DESC
	`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Non-nil slice so JSON encodes as [] not null
	result := make([]models.LeadSourcingConfigResponse, 0)
	for rows.Next() {
		r, err := scanSourcingConfig(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

func (s *LeadSourcingService) GetSourcingConfig(ctx context.Context, id, orgID string) (*models.LeadSourcingConfigResponse, error) {
	row := s.DB.QueryRow(ctx, `
		SELECT lsc.id::text, lsc.organization_api_id::text, oa.provider::text,
		       lsc.sync_mode::text, COALESCE(lsc.sync_interval_min,60),
		       lsc.last_synced_at, lsc.lead_source_tag::text,
		       lsc.mapping_config_json, lsc.created_at, lsc.updated_at
		FROM lead_sourcing_api_configs lsc
		JOIN organization_apis oa ON oa.id = lsc.organization_api_id
		WHERE lsc.id = $1 AND oa.organization_id = $2
	`, id, orgID)
	r, err := scanSourcingConfig(row)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *LeadSourcingService) UpdateSourcingConfig(ctx context.Context, id, orgID string, req models.UpdateLeadSourcingConfigRequest) (*models.LeadSourcingConfigResponse, error) {
	// Verify ownership.
	if _, err := s.GetSourcingConfig(ctx, id, orgID); err != nil {
		return nil, fmt.Errorf("NOT_FOUND")
	}

	if req.SyncMode != nil {
		if _, err := s.DB.Exec(ctx, `UPDATE lead_sourcing_api_configs SET sync_mode=$1::sync_mode, updated_at=NOW() WHERE id=$2`, *req.SyncMode, id); err != nil {
			return nil, err
		}
	}
	if req.SyncIntervalMin != nil {
		if _, err := s.DB.Exec(ctx, `UPDATE lead_sourcing_api_configs SET sync_interval_min=$1, updated_at=NOW() WHERE id=$2`, *req.SyncIntervalMin, id); err != nil {
			return nil, err
		}
	}
	if req.MappingConfig != nil {
		j, _ := json.Marshal(req.MappingConfig)
		if _, err := s.DB.Exec(ctx, `UPDATE lead_sourcing_api_configs SET mapping_config_json=$1, updated_at=NOW() WHERE id=$2`, j, id); err != nil {
			return nil, err
		}
	}
	return s.GetSourcingConfig(ctx, id, orgID)
}

func (s *LeadSourcingService) DeleteSourcingConfig(ctx context.Context, id, orgID string) error {
	tag, err := s.DB.Exec(ctx, `
		DELETE FROM lead_sourcing_api_configs
		WHERE id = $1
		AND organization_api_id IN (SELECT id FROM organization_apis WHERE organization_id = $2)
	`, id, orgID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("NOT_FOUND")
	}
	return nil
}

func (s *LeadSourcingService) SyncNow(ctx context.Context, configID, orgID string) (*models.SyncNowResponse, error) {
	// Verify ownership.
	if _, err := s.GetSourcingConfig(ctx, configID, orgID); err != nil {
		return nil, fmt.Errorf("NOT_FOUND")
	}
	result, err := s.Engine.SyncNow(ctx, configID)
	if err != nil {
		return nil, err
	}
	return &models.SyncNowResponse{
		LeadsFetched: result.LeadsFetched,
		LeadsCreated: result.LeadsCreated,
		LeadsSkipped: result.LeadsSkipped,
		ErrorMessage: result.ErrorMessage,
	}, nil
}

// ============================================================
// External Project Mappings
// ============================================================

func (s *LeadSourcingService) CreateProjectMapping(ctx context.Context, orgID string, req models.CreateExternalProjectMappingRequest) (*models.ExternalProjectMappingResponse, error) {
	var id string
	err := s.DB.QueryRow(ctx, `
		INSERT INTO external_project_mappings
			(organization_id, provider, external_project_id, external_project_name, internal_project_id)
		VALUES ($1, $2::api_provider, $3, NULLIF($4,''), $5)
		RETURNING id::text
	`, orgID, req.Provider, req.ExternalProjectID, req.ExternalProjectName, req.InternalProjectID).Scan(&id)
	if err != nil {
		return nil, err
	}
	return s.GetProjectMapping(ctx, id, orgID)
}

func (s *LeadSourcingService) ListProjectMappings(ctx context.Context, orgID string, provider *string) ([]models.ExternalProjectMappingResponse, error) {
	query := `
		SELECT epm.id::text, epm.organization_id::text, epm.provider::text,
		       epm.external_project_id, epm.external_project_name,
		       epm.internal_project_id::text, p.project_title,
		       epm.created_at, epm.updated_at
		FROM external_project_mappings epm
		LEFT JOIN projects p ON p.id = epm.internal_project_id
		WHERE epm.organization_id = $1
	`
	args := []any{orgID}
	if provider != nil {
		query += " AND epm.provider = $2::api_provider"
		args = append(args, *provider)
	}
	query += " ORDER BY epm.created_at DESC"

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.ExternalProjectMappingResponse
	for rows.Next() {
		r, err := scanProjectMapping(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

func (s *LeadSourcingService) GetProjectMapping(ctx context.Context, id, orgID string) (*models.ExternalProjectMappingResponse, error) {
	row := s.DB.QueryRow(ctx, `
		SELECT epm.id::text, epm.organization_id::text, epm.provider::text,
		       epm.external_project_id, epm.external_project_name,
		       epm.internal_project_id::text, p.project_title,
		       epm.created_at, epm.updated_at
		FROM external_project_mappings epm
		LEFT JOIN projects p ON p.id = epm.internal_project_id
		WHERE epm.id = $1 AND epm.organization_id = $2
	`, id, orgID)
	r, err := scanProjectMapping(row)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

func (s *LeadSourcingService) UpdateProjectMapping(ctx context.Context, id, orgID string, req models.UpdateExternalProjectMappingRequest) (*models.ExternalProjectMappingResponse, error) {
	if req.ExternalProjectName != nil {
		if _, err := s.DB.Exec(ctx, `UPDATE external_project_mappings SET external_project_name=$1, updated_at=NOW() WHERE id=$2 AND organization_id=$3`, *req.ExternalProjectName, id, orgID); err != nil {
			return nil, err
		}
	}
	if req.InternalProjectID != nil {
		if _, err := s.DB.Exec(ctx, `UPDATE external_project_mappings SET internal_project_id=$1, updated_at=NOW() WHERE id=$2 AND organization_id=$3`, *req.InternalProjectID, id, orgID); err != nil {
			return nil, err
		}
	}
	return s.GetProjectMapping(ctx, id, orgID)
}

func (s *LeadSourcingService) DeleteProjectMapping(ctx context.Context, id, orgID string) error {
	tag, err := s.DB.Exec(ctx, `DELETE FROM external_project_mappings WHERE id=$1 AND organization_id=$2`, id, orgID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("NOT_FOUND")
	}
	return nil
}

// ============================================================
// Sync Logs
// ============================================================

func (s *LeadSourcingService) ListSyncLogs(ctx context.Context, orgID string, configID *string) ([]models.SyncLogResponse, error) {
	query := `
		SELECT l.id::text, l.lead_sourcing_config_id::text, oa.provider::text,
		       l.started_at, l.completed_at, l.status,
		       l.leads_fetched, l.leads_created, l.leads_skipped,
		       l.error_message, l.created_at
		FROM lead_sync_logs l
		JOIN lead_sourcing_api_configs lsc ON lsc.id = l.lead_sourcing_config_id
		JOIN organization_apis oa ON oa.id = lsc.organization_api_id
		WHERE oa.organization_id = $1
	`
	args := []any{orgID}
	if configID != nil {
		query += " AND l.lead_sourcing_config_id = $2"
		args = append(args, *configID)
	}
	query += " ORDER BY l.started_at DESC LIMIT 200"

	rows, err := s.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []models.SyncLogResponse
	for rows.Next() {
		var r models.SyncLogResponse
		if err := rows.Scan(
			&r.ID, &r.LeadSourcingConfigID, &r.Provider,
			&r.StartedAt, &r.CompletedAt, &r.Status,
			&r.LeadsFetched, &r.LeadsCreated, &r.LeadsSkipped,
			&r.ErrorMessage, &r.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, r)
	}
	return result, rows.Err()
}

// ============================================================
// Row scanners
// ============================================================

type scanner interface {
	Scan(dest ...any) error
}

func scanOrgAPIResponse(row scanner) (models.OrgAPIResponse, error) {
	var r models.OrgAPIResponse
	err := row.Scan(
		&r.ID, &r.OrganizationID, &r.Provider, &r.APICategory, &r.AuthType,
		&r.HasAPIKey, &r.HasPassword, &r.Username, &r.BaseEndpoint,
		&r.Status, &r.LastHealthCheck, &r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}

func scanSourcingConfig(row scanner) (models.LeadSourcingConfigResponse, error) {
	var r models.LeadSourcingConfigResponse
	var mappingJSON []byte
	err := row.Scan(
		&r.ID, &r.OrgAPIID, &r.Provider, &r.SyncMode, &r.SyncIntervalMin,
		&r.LastSyncedAt, &r.LeadSourceTag, &mappingJSON, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return r, err
	}
	if len(mappingJSON) > 0 {
		_ = json.Unmarshal(mappingJSON, &r.MappingConfig)
	}
	return r, nil
}

func scanProjectMapping(row scanner) (models.ExternalProjectMappingResponse, error) {
	var r models.ExternalProjectMappingResponse
	err := row.Scan(
		&r.ID, &r.OrganizationID, &r.Provider,
		&r.ExternalProjectID, &r.ExternalProjectName,
		&r.InternalProjectID, &r.InternalProjectName,
		&r.CreatedAt, &r.UpdatedAt,
	)
	return r, err
}
