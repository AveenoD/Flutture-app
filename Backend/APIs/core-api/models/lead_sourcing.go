package models

import "time"

// ============================================
// Organization APIs (credentials store)
// ============================================

// CreateOrgAPIRequest is the payload for adding a new external API credential set.
type CreateOrgAPIRequest struct {
	Provider     string `json:"provider" validate:"required,oneof=meta google 99acres housing nobroker magicbricks whatsapp ivr"`
	APICategory  string `json:"api_category" validate:"required,oneof=lead_sourcing communication"`
	AuthType     string `json:"auth_type" validate:"required,oneof=api_key oauth basic_auth"`
	APIKey       string `json:"api_key" validate:"omitempty"`
	Username     string `json:"username" validate:"omitempty"`
	Password     string `json:"password" validate:"omitempty"`
	BaseEndpoint string `json:"base_endpoint" validate:"omitempty,url"`
}

// UpdateOrgAPIRequest allows partial updates to an API credential.
type UpdateOrgAPIRequest struct {
	APIKey       *string `json:"api_key" validate:"omitempty"`
	Username     *string `json:"username" validate:"omitempty"`
	Password     *string `json:"password" validate:"omitempty"`
	BaseEndpoint *string `json:"base_endpoint" validate:"omitempty,url"`
	Status       *string `json:"status" validate:"omitempty,oneof=active disabled error"`
}

// OrgAPIResponse is the public representation of an organization_apis row.
// The api_key_encrypted and password_encrypted are never returned; only masked indicators.
type OrgAPIResponse struct {
	ID              string     `json:"id"`
	OrganizationID  string     `json:"organization_id"`
	Provider        string     `json:"provider"`
	APICategory     string     `json:"api_category"`
	AuthType        string     `json:"auth_type"`
	HasAPIKey       bool       `json:"has_api_key"`
	HasPassword     bool       `json:"has_password"`
	Username        *string    `json:"username,omitempty"`
	BaseEndpoint    *string    `json:"base_endpoint,omitempty"`
	Status          string     `json:"status"`
	LastHealthCheck *time.Time `json:"last_health_check_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// ============================================
// Lead Sourcing Configs
// ============================================

// CreateLeadSourcingConfigRequest creates a new polling config for an organization API.
type CreateLeadSourcingConfigRequest struct {
	OrgAPIID        string         `json:"org_api_id" validate:"required,uuid"`
	SyncMode        string         `json:"sync_mode" validate:"required,oneof=realtime scheduled"`
	SyncIntervalMin int            `json:"sync_interval_min" validate:"omitempty,min=1"`
	LeadSourceTag   string         `json:"lead_source_tag" validate:"required,oneof=99acres meta_ads housing nobroker magicbricks google_ads"`
	MappingConfig   map[string]any `json:"mapping_config" validate:"required"`
}

// UpdateLeadSourcingConfigRequest allows updating the mapping or interval.
type UpdateLeadSourcingConfigRequest struct {
	SyncMode        *string        `json:"sync_mode" validate:"omitempty,oneof=realtime scheduled"`
	SyncIntervalMin *int           `json:"sync_interval_min" validate:"omitempty,min=1"`
	MappingConfig   map[string]any `json:"mapping_config" validate:"omitempty"`
}

// LeadSourcingConfigResponse is the public representation of lead_sourcing_api_configs.
type LeadSourcingConfigResponse struct {
	ID              string         `json:"id"`
	OrgAPIID        string         `json:"org_api_id"`
	Provider        string         `json:"provider"`
	SyncMode        string         `json:"sync_mode"`
	SyncIntervalMin int            `json:"sync_interval_min"`
	LastSyncedAt    *time.Time     `json:"last_synced_at,omitempty"`
	LeadSourceTag   string         `json:"lead_source_tag"`
	MappingConfig   map[string]any `json:"mapping_config"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

// ============================================
// External Project Mappings
// ============================================

// CreateExternalProjectMappingRequest maps a provider's project ID to an internal project.
type CreateExternalProjectMappingRequest struct {
	Provider            string  `json:"provider" validate:"required,oneof=meta google 99acres housing nobroker magicbricks whatsapp ivr"`
	ExternalProjectID   string  `json:"external_project_id" validate:"required"`
	ExternalProjectName string  `json:"external_project_name" validate:"omitempty"`
	InternalProjectID   *string `json:"internal_project_id" validate:"omitempty,uuid"`
}

// UpdateExternalProjectMappingRequest updates an existing project mapping.
type UpdateExternalProjectMappingRequest struct {
	ExternalProjectName *string `json:"external_project_name" validate:"omitempty"`
	InternalProjectID   *string `json:"internal_project_id" validate:"omitempty,uuid"`
}

// ExternalProjectMappingResponse is the public representation of external_project_mappings.
type ExternalProjectMappingResponse struct {
	ID                  string     `json:"id"`
	OrganizationID      string     `json:"organization_id"`
	Provider            string     `json:"provider"`
	ExternalProjectID   string     `json:"external_project_id"`
	ExternalProjectName *string    `json:"external_project_name,omitempty"`
	InternalProjectID   *string    `json:"internal_project_id,omitempty"`
	InternalProjectName *string    `json:"internal_project_name,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

// ============================================
// Sync Logs
// ============================================

// SyncLogResponse is the public representation of a lead_sync_logs row.
type SyncLogResponse struct {
	ID                   string     `json:"id"`
	LeadSourcingConfigID string     `json:"lead_sourcing_config_id"`
	Provider             string     `json:"provider"`
	StartedAt            time.Time  `json:"started_at"`
	CompletedAt          *time.Time `json:"completed_at,omitempty"`
	Status               string     `json:"status"`
	LeadsFetched         int        `json:"leads_fetched"`
	LeadsCreated         int        `json:"leads_created"`
	LeadsSkipped         int        `json:"leads_skipped"`
	ErrorMessage         *string    `json:"error_message,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
}

// SyncNowResponse is returned from the POST /sync-now endpoint.
type SyncNowResponse struct {
	LeadsFetched int    `json:"leads_fetched"`
	LeadsCreated int    `json:"leads_created"`
	LeadsSkipped int    `json:"leads_skipped"`
	ErrorMessage string `json:"error_message,omitempty"`
}
