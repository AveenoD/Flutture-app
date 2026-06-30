package models

import "time"

// QuotationTabCounts is per-status counts for visible leads (same filters as list, excluding tab filter).
type QuotationTabCounts struct {
	All       int `json:"all"`
	Approved  int `json:"approved"`
	Pending   int `json:"pending"`
	Draft     int `json:"draft"`
}

// QuotationListItemResponse is one row for GET /api/v1/quotations (list/grid).
type QuotationListItemResponse struct {
	QuotationID          string    `json:"quotation_id"`
	LeadID               string    `json:"lead_id"`
	QuotationStatus      string    `json:"quotation_status"`
	CreatedAt            time.Time `json:"created_at"`
	FinalPrice           float64   `json:"final_price"`
	ProjectTitle         string    `json:"project_title"`
	ProjectCoverPhotoURL *string   `json:"project_cover_photo_url,omitempty"`
	ProjectType          string    `json:"project_type"`
	ProjectStatus        string    `json:"project_status"`
	City                 *string   `json:"city,omitempty"`
	State                *string   `json:"state,omitempty"`
	Amenities            []string  `json:"amenities,omitempty"`
	MinimumUnitPrice     *float64  `json:"minimum_unit_price,omitempty"`
	MaximumUnitPrice     *float64  `json:"maximum_unit_price,omitempty"`
	UnitName             string    `json:"unit_name"`
	Wing                 *string   `json:"wing,omitempty"`
	Floor                *int      `json:"floor,omitempty"`
	CarpetArea           *float64  `json:"carpet_area,omitempty"`
	UnitType             string    `json:"unit_type"`
	CustomerName         *string   `json:"customer_name,omitempty"`
	CustomerContact      *string   `json:"customer_contact,omitempty"`
	CustomerEmail        *string   `json:"customer_email,omitempty"`
}

// QuotationListForOrgResponse is GET /api/v1/quotations.
type QuotationListForOrgResponse struct {
	Quotations []QuotationListItemResponse `json:"quotations"`
	Pagination PaginationInfo              `json:"pagination"`
	TabCounts  QuotationTabCounts          `json:"tab_counts"`
}
