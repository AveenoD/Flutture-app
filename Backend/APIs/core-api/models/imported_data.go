package models

import (
	"time"

	"github.com/google/uuid"
)

// ImportDataRequest represents the request payload for importing CSV data
type ImportDataRequest struct {
	Title       string `json:"title" validate:"required,min=3,max=255"`
	Description string `json:"description" validate:"omitempty,max=1000"`
}

// ImportDataResponse represents the response after importing data
type ImportDataResponse struct {
	ImportedDataID string              `json:"imported_data_id"`
	Title          string              `json:"title"`
	TotalRows      int                 `json:"total_rows"`
	Successful     int                 `json:"successful"`
	Failed         int                 `json:"failed"`
	Errors         []string            `json:"errors,omitempty"`
	LeadsCreated   []ImportedLeadInfo  `json:"leads_created,omitempty"`
}

// ImportedLeadInfo represents basic info about an imported lead
type ImportedLeadInfo struct {
	LeadID string `json:"lead_id"`
	Name   string `json:"name"`
	Phone  string `json:"phone"`
}

// AssignUsersRequest represents the request payload for assigning users to imported data
type AssignUsersRequest struct {
	UserIDs []string `json:"user_ids" validate:"required,min=1,dive,uuid"`
}

// AssignUsersResponse represents the response after assigning users
type AssignUsersResponse struct {
	ImportedDataID      string           `json:"imported_data_id"`
	AssignedUsersCount  int              `json:"assigned_users_count"`
	LeadsAssigned       int              `json:"leads_assigned"`
	AssignmentSummary   map[string]int   `json:"assignment_summary"`
}

// DeleteImportedDataResponse represents the response after deleting imported data
type DeleteImportedDataResponse struct {
	ImportedDataID     string `json:"imported_data_id"`
	DeletedLeadsCount  int    `json:"deleted_leads_count"`
	Message            string `json:"message"`
}

// ImportedData represents the imported_data table record
type ImportedData struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	OrganizationID uuid.UUID  `json:"organization_id" db:"organization_id"`
	ImportedBy     uuid.UUID  `json:"imported_by" db:"imported_by"`
	Title          string     `json:"title" db:"title"`
	Description    *string    `json:"description,omitempty" db:"description"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// CSVLeadRow represents a single row from the CSV file
type CSVLeadRow struct {
	Name            string
	Phone           string
	Email           string
	City            string
	BudgetMin       string
	BudgetMax       string
	LeadTemperature string
	State           string
	RowNumber       int
}

// ListImportedDataResponse represents the response for listing imported data
type ListImportedDataResponse struct {
	ImportedDataID string    `json:"imported_data_id"`
	Title          string    `json:"title"`
	Description    *string   `json:"description,omitempty"`
	ImportedBy     string    `json:"imported_by"`
	LeadsCount     int       `json:"leads_count"`
	CreatedAt      time.Time `json:"created_at"`
}

// GetImportedDataDetailsResponse represents detailed info about imported data
type GetImportedDataDetailsResponse struct {
	ImportedDataID    string    `json:"imported_data_id"`
	Title             string    `json:"title"`
	Description       *string   `json:"description,omitempty"`
	ImportedBy        string    `json:"imported_by"`
	TotalLeads        int       `json:"total_leads"`
	AssignedLeads     int       `json:"assigned_leads"`
	UnassignedLeads   int       `json:"unassigned_leads"`
	QualifiedLeads    int       `json:"qualified_leads"`
	UnqualifiedLeads  int       `json:"unqualified_leads"`
	CreatedAt         time.Time `json:"created_at"`
}
