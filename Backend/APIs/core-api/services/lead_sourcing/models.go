package lead_sourcing

import (
	"time"
)

// OrgAPICredentials holds decrypted credentials fetched from organization_apis.
type OrgAPICredentials struct {
	ID           string
	Provider     string
	AuthType     string
	APIKey       string // decrypted api_key_encrypted
	Username     string
	Password     string // decrypted password_encrypted
	BaseEndpoint string
}

// SourcingConfig holds configuration from lead_sourcing_api_configs joined with
// the mapping_config_json JSONB.
type SourcingConfig struct {
	ID              string
	OrgAPIID        string
	OrganizationID  string
	Provider        string
	SyncMode        string
	SyncIntervalMin int
	LastSyncedAt    *time.Time
	LeadSourceTag   string
	MappingConfig   MappingConfig
}

// MappingConfig is the parsed content of mapping_config_json.
// It describes how to extract and map fields from a provider's raw response.
type MappingConfig struct {
	// ResponseLeadsPath is a dot-separated path into the response JSON to reach the leads array.
	// E.g. "data" means response["data"] is the array.
	ResponseLeadsPath string `json:"response_leads_path"`

	// FieldMap maps our internal field names to the provider's field names in each raw lead.
	// Key = our field, Value = provider's field.
	// Supported internal keys: name, phone, email, city, state,
	// budget_min, budget_max, source_detail, external_project_id, external_lead_id,
	// external_created_at (provider unix seconds → leads.created_at).
	FieldMap map[string]string `json:"field_map"`

	// ProviderConfig holds provider-specific options (e.g. profile_id for Housing.com).
	ProviderConfig map[string]string `json:"provider_config"`
}

// RawLead is an untyped map representing a single lead as returned by the provider API.
type RawLead map[string]any

// NormalizedLead is a provider-agnostic lead ready to be inserted into the leads table.
type NormalizedLead struct {
	Name              string
	Phone             string
	Email             string
	City              string
	State             string
	BudgetMin         *float64
	BudgetMax         *float64
	SourceDetail      string
	ExternalLeadID    string
	ExternalProjectID string
	InternalProjectID *string // resolved from external_project_mappings
	// CreatedAt from provider (e.g. Housing lead_date unix); used for leads.created_at when set.
	CreatedAt *time.Time
}

// SyncResult summarizes the outcome of a single sync run.
type SyncResult struct {
	LeadsFetched int
	LeadsCreated int
	LeadsSkipped int
	ErrorMessage string
}
