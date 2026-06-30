package models

import (
	"time"

	"github.com/google/uuid"
)

// ============================================
// PROJECT MODELS
// ============================================

// CreateProjectRequest represents the request payload for creating a project
type CreateProjectRequest struct {
	ProjectTitle            string   `json:"project_title" validate:"required,min=3,max=255"`
	ProjectType             string   `json:"project_type" validate:"required,oneof=commercial residential educational government mixed"`
	AreaType                string   `json:"area_type" validate:"omitempty,oneof=rural urban semi_urban"`
	ReraNumber              string   `json:"rera_number" validate:"omitempty,max=100"`
	ProjectStatus           string   `json:"project_status" validate:"omitempty,oneof=planning_stage under_construction ready_to_move"`
	ProjectState            string   `json:"project_state" validate:"omitempty,oneof=new old"`
	StartDate               string   `json:"start_date" validate:"omitempty,datetime=2006-01-02"`
	ExpectedPossessionDate  string   `json:"expected_possession_date" validate:"omitempty,datetime=2006-01-02"`
	ProjectFloorCount       *int     `json:"project_floor_count" validate:"omitempty,min=1"`
	FullAddress             string   `json:"full_address" validate:"omitempty"`
	City                    string   `json:"city" validate:"omitempty,max=100"`
	Pincode                 string   `json:"pincode" validate:"omitempty,max=10"`
	State                   string   `json:"state" validate:"omitempty,max=100"`
	Country                 string   `json:"country" validate:"omitempty,max=100"`
	Coordinates             string   `json:"coordinates" validate:"omitempty"`
	Amenities               []string `json:"amenities" validate:"omitempty"`
	MinimumUnitPrice        *float64 `json:"minimum_unit_price" validate:"omitempty,min=0"`
	MaximumUnitPrice        *float64 `json:"maximum_unit_price" validate:"omitempty,min=0"`
	ProjectAreaSize         *float64 `json:"project_area_size" validate:"omitempty,min=0"`
	SmallestUnitSize        *float64 `json:"smallest_unit_size" validate:"omitempty,min=0"`
	BiggestUnitSize         *float64 `json:"biggest_unit_size" validate:"omitempty,min=0"`
	ProjectCoverPhotoURL    string   `json:"project_cover_photo_url" validate:"omitempty,url"`
	ProjectExteriorImagesURLs []string `json:"project_exterior_images_urls" validate:"omitempty,dive,url"`
	ProjectInteriorImagesURLs []string `json:"project_interior_images_urls" validate:"omitempty,dive,url"`
	ProjectExteriorVideosURLs []string `json:"project_exterior_videos_urls" validate:"omitempty,dive,url"`
	ProjectDroneVideosURLs    []string `json:"project_drone_videos_urls" validate:"omitempty,dive,url"`
	ProjectInteriorVideosURLs []string `json:"project_interior_videos_urls" validate:"omitempty,dive,url"`
}

// UpdateProjectRequest represents the request payload for updating a project
type UpdateProjectRequest struct {
	ProjectTitle            *string   `json:"project_title" validate:"omitempty,min=3,max=255"`
	ProjectType             *string   `json:"project_type" validate:"omitempty,oneof=commercial residential educational government mixed"`
	AreaType                *string   `json:"area_type" validate:"omitempty,oneof=rural urban semi_urban"`
	ReraNumber              *string   `json:"rera_number" validate:"omitempty,max=100"`
	ProjectStatus           *string   `json:"project_status" validate:"omitempty,oneof=planning_stage under_construction ready_to_move"`
	ProjectState            *string   `json:"project_state" validate:"omitempty,oneof=new old"`
	StartDate               *string   `json:"start_date" validate:"omitempty,datetime=2006-01-02"`
	ExpectedPossessionDate  *string   `json:"expected_possession_date" validate:"omitempty,datetime=2006-01-02"`
	ProjectFloorCount       *int      `json:"project_floor_count" validate:"omitempty,min=1"`
	FullAddress             *string   `json:"full_address" validate:"omitempty"`
	City                    *string   `json:"city" validate:"omitempty,max=100"`
	Pincode                 *string   `json:"pincode" validate:"omitempty,max=10"`
	State                   *string   `json:"state" validate:"omitempty,max=100"`
	Country                 *string   `json:"country" validate:"omitempty,max=100"`
	Coordinates             *string   `json:"coordinates" validate:"omitempty"`
	Amenities               []string  `json:"amenities" validate:"omitempty"`
	MinimumUnitPrice        *float64  `json:"minimum_unit_price" validate:"omitempty,min=0"`
	MaximumUnitPrice        *float64  `json:"maximum_unit_price" validate:"omitempty,min=0"`
	ProjectAreaSize         *float64  `json:"project_area_size" validate:"omitempty,min=0"`
	SmallestUnitSize        *float64  `json:"smallest_unit_size" validate:"omitempty,min=0"`
	BiggestUnitSize         *float64  `json:"biggest_unit_size" validate:"omitempty,min=0"`
	ProjectCoverPhotoURL    *string   `json:"project_cover_photo_url" validate:"omitempty,url"`
	ProjectExteriorImagesURLs []string `json:"project_exterior_images_urls" validate:"omitempty,dive,url"`
	ProjectInteriorImagesURLs []string `json:"project_interior_images_urls" validate:"omitempty,dive,url"`
	ProjectExteriorVideosURLs []string `json:"project_exterior_videos_urls" validate:"omitempty,dive,url"`
	ProjectDroneVideosURLs    []string `json:"project_drone_videos_urls" validate:"omitempty,dive,url"`
	ProjectInteriorVideosURLs []string `json:"project_interior_videos_urls" validate:"omitempty,dive,url"`
}

// ProjectResponse represents the response for a project
type ProjectResponse struct {
	ID                       string    `json:"id"`
	OrganizationID           string    `json:"organization_id"`
	ProjectTitle             string    `json:"project_title"`
	ProjectType              string    `json:"project_type"`
	AreaType                 *string   `json:"area_type,omitempty"`
	ReraNumber               *string   `json:"rera_number,omitempty"`
	ProjectStatus            *string   `json:"project_status,omitempty"`
	ProjectState             *string   `json:"project_state,omitempty"`
	StartDate                *string   `json:"start_date,omitempty"`
	ExpectedPossessionDate   *string   `json:"expected_possession_date,omitempty"`
	ProjectFloorCount        *int      `json:"project_floor_count,omitempty"`
	FullAddress              *string   `json:"full_address,omitempty"`
	City                     *string   `json:"city,omitempty"`
	Pincode                  *string   `json:"pincode,omitempty"`
	State                    *string   `json:"state,omitempty"`
	Country                  *string   `json:"country,omitempty"`
	Coordinates              *string   `json:"coordinates,omitempty"`
	Amenities                []string  `json:"amenities"`
	MinimumUnitPrice         *float64  `json:"minimum_unit_price,omitempty"`
	MaximumUnitPrice         *float64  `json:"maximum_unit_price,omitempty"`
	ProjectAreaSize          *float64  `json:"project_area_size,omitempty"`
	SmallestUnitSize         *float64  `json:"smallest_unit_size,omitempty"`
	BiggestUnitSize          *float64  `json:"biggest_unit_size,omitempty"`
	ProjectCoverPhotoURL     *string   `json:"project_cover_photo_url,omitempty"`
	ProjectExteriorImagesURLs []string `json:"project_exterior_images_urls"`
	ProjectInteriorImagesURLs []string `json:"project_interior_images_urls"`
	ProjectExteriorVideosURLs []string `json:"project_exterior_videos_urls"`
	ProjectDroneVideosURLs    []string `json:"project_drone_videos_urls"`
	ProjectInteriorVideosURLs []string `json:"project_interior_videos_urls"`
	UnitsCount               int       `json:"units_count,omitempty"`
	AddonsCount              int       `json:"addons_count,omitempty"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}

// ProjectListResponse represents paginated list of projects
type ProjectListResponse struct {
	Projects   []ProjectResponse `json:"projects"`
	Pagination PaginationInfo    `json:"pagination"`
}

// ============================================
// UNIT MODELS
// ============================================

// CreateUnitRequest represents the request payload for creating a unit
type CreateUnitRequest struct {
	Name                string   `json:"name" validate:"required,max=100"`
	Floor               *int     `json:"floor" validate:"omitempty"`
	Wing                string   `json:"wing" validate:"omitempty,max=50"`
	UnitType            string   `json:"unit_type" validate:"required,oneof=flat penthouse plot shop row_house bungalow mansion haveli"`
	CarpetArea          *float64 `json:"carpet_area" validate:"omitempty,min=0"`
	BuiltupArea         *float64 `json:"builtup_area" validate:"omitempty,min=0"`
	FacingDirection     string   `json:"facing_direction" validate:"omitempty,oneof=north south east west north_east north_west south_east south_west"`
	Status              string   `json:"status" validate:"omitempty,oneof=available under_negotiation booked unavailable not_for_sale"`
	UnitCode            string   `json:"unit_code" validate:"omitempty,max=100"`
	BasePrice           *float64 `json:"base_price" validate:"omitempty,min=0"`
	ParkingPrice        *float64 `json:"parking_price" validate:"omitempty,min=0"`
	InfrastructureCost  *float64 `json:"infrastructure_cost" validate:"omitempty,min=0"`
	DevelopmentCharges  *float64 `json:"development_charges" validate:"omitempty,min=0"`
	WaterCharges        *float64 `json:"water_charges" validate:"omitempty,min=0"`
	MsebCharges         *float64 `json:"mseb_charges" validate:"omitempty,min=0"`
	LegalCharges        *float64 `json:"legal_charges" validate:"omitempty,min=0"`
	StampDuty           *float64 `json:"stamp_duty" validate:"omitempty,min=0"`
	RegistrationFee     *float64 `json:"registration_fee" validate:"omitempty,min=0"`
	GST                 *float64 `json:"gst" validate:"omitempty,min=0"`
	VAT                 *float64 `json:"vat" validate:"omitempty,min=0"`
	OneTimeMaintenance  *float64 `json:"one_time_maintenance" validate:"omitempty,min=0"`
	DemandScore         *int     `json:"demand_score" validate:"omitempty,min=1,max=10"`
}

// UpdateUnitRequest represents the request payload for updating a unit
type UpdateUnitRequest struct {
	Name                *string  `json:"name" validate:"omitempty,max=100"`
	Floor               *int     `json:"floor" validate:"omitempty"`
	Wing                *string  `json:"wing" validate:"omitempty,max=50"`
	UnitType            *string  `json:"unit_type" validate:"omitempty,oneof=flat penthouse plot shop row_house bungalow mansion haveli"`
	CarpetArea          *float64 `json:"carpet_area" validate:"omitempty,min=0"`
	BuiltupArea         *float64 `json:"builtup_area" validate:"omitempty,min=0"`
	FacingDirection     *string  `json:"facing_direction" validate:"omitempty,oneof=north south east west north_east north_west south_east south_west"`
	Status              *string  `json:"status" validate:"omitempty,oneof=available under_negotiation booked unavailable not_for_sale"`
	UnitCode            *string  `json:"unit_code" validate:"omitempty,max=100"`
	BasePrice           *float64 `json:"base_price" validate:"omitempty,min=0"`
	ParkingPrice        *float64 `json:"parking_price" validate:"omitempty,min=0"`
	InfrastructureCost  *float64 `json:"infrastructure_cost" validate:"omitempty,min=0"`
	DevelopmentCharges  *float64 `json:"development_charges" validate:"omitempty,min=0"`
	WaterCharges        *float64 `json:"water_charges" validate:"omitempty,min=0"`
	MsebCharges         *float64 `json:"mseb_charges" validate:"omitempty,min=0"`
	LegalCharges        *float64 `json:"legal_charges" validate:"omitempty,min=0"`
	StampDuty           *float64 `json:"stamp_duty" validate:"omitempty,min=0"`
	RegistrationFee     *float64 `json:"registration_fee" validate:"omitempty,min=0"`
	GST                 *float64 `json:"gst" validate:"omitempty,min=0"`
	VAT                 *float64 `json:"vat" validate:"omitempty,min=0"`
	OneTimeMaintenance  *float64 `json:"one_time_maintenance" validate:"omitempty,min=0"`
	DemandScore         *int     `json:"demand_score" validate:"omitempty,min=1,max=10"`
}

// BulkCreateUnitsRequest represents the request payload for bulk creating units
type BulkCreateUnitsRequest struct {
	Units []CreateUnitRequest `json:"units" validate:"required,min=1,dive"`
}

// BulkUpdateUnitsRequest represents the request payload for bulk updating units
type BulkUpdateUnitsRequest struct {
	Updates []struct {
		UnitID string            `json:"unit_id" validate:"required,uuid"`
		Data   UpdateUnitRequest `json:"data" validate:"required"`
	} `json:"updates" validate:"required,min=1,dive"`
}

// UnitResponse represents the response for a unit
type UnitResponse struct {
	ID                  string    `json:"id"`
	ProjectID           string    `json:"project_id"`
	Name                string    `json:"name"`
	Floor               *int      `json:"floor,omitempty"`
	Wing                *string   `json:"wing,omitempty"`
	UnitType            string    `json:"unit_type"`
	CarpetArea          *float64  `json:"carpet_area,omitempty"`
	BuiltupArea         *float64  `json:"builtup_area,omitempty"`
	FacingDirection     *string   `json:"facing_direction,omitempty"`
	Status              string    `json:"status"`
	UnitCode            *string   `json:"unit_code,omitempty"`
	BasePrice           *float64  `json:"base_price,omitempty"`
	ParkingPrice        *float64  `json:"parking_price,omitempty"`
	InfrastructureCost  *float64  `json:"infrastructure_cost,omitempty"`
	DevelopmentCharges  *float64  `json:"development_charges,omitempty"`
	WaterCharges        *float64  `json:"water_charges,omitempty"`
	MsebCharges         *float64  `json:"mseb_charges,omitempty"`
	LegalCharges        *float64  `json:"legal_charges,omitempty"`
	StampDuty           *float64  `json:"stamp_duty,omitempty"`
	RegistrationFee     *float64  `json:"registration_fee,omitempty"`
	GST                 *float64  `json:"gst,omitempty"`
	VAT                 *float64  `json:"vat,omitempty"`
	OneTimeMaintenance  *float64  `json:"one_time_maintenance,omitempty"`
	DemandScore         *int      `json:"demand_score,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// UnitListResponse represents paginated list of units
type UnitListResponse struct {
	Units      []UnitResponse `json:"units"`
	Pagination PaginationInfo `json:"pagination"`
}

// BulkCreateUnitsResponse represents response for bulk create
type BulkCreateUnitsResponse struct {
	TotalRequested int          `json:"total_requested"`
	Successful     int          `json:"successful"`
	Failed         int          `json:"failed"`
	UnitsCreated   []UnitResponse `json:"units_created"`
	Errors         []string     `json:"errors,omitempty"`
}

// BulkUpdateUnitsResponse represents response for bulk update
type BulkUpdateUnitsResponse struct {
	TotalRequested int      `json:"total_requested"`
	Successful     int      `json:"successful"`
	Failed         int      `json:"failed"`
	Errors         []string `json:"errors,omitempty"`
}

// ============================================
// ADDON MODELS
// ============================================

// CreateAddonRequest represents the request payload for creating an addon
type CreateAddonRequest struct {
	Title       string   `json:"title" validate:"required,min=3,max=255"`
	Description string   `json:"description" validate:"omitempty,max=1000"`
	Category    string   `json:"category" validate:"required,oneof=kitchen flooring window door ceiling sanitary furniture electrical parking stairs other"`
	Price       float64  `json:"price" validate:"required,min=0"`
	ImageURL    string   `json:"image_url" validate:"omitempty,url"`
	Status      string   `json:"status" validate:"omitempty,oneof=active discontinued"`
}

// UpdateAddonRequest represents the request payload for updating an addon
type UpdateAddonRequest struct {
	Title       *string  `json:"title" validate:"omitempty,min=3,max=255"`
	Description *string  `json:"description" validate:"omitempty,max=1000"`
	Category    *string  `json:"category" validate:"omitempty,oneof=kitchen flooring window door ceiling sanitary furniture electrical parking stairs other"`
	Price       *float64 `json:"price" validate:"omitempty,min=0"`
	ImageURL    *string  `json:"image_url" validate:"omitempty,url"`
	Status      *string  `json:"status" validate:"omitempty,oneof=active discontinued"`
}

// AddonResponse represents the response for an addon
type AddonResponse struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	Title       string    `json:"title"`
	Description *string   `json:"description,omitempty"`
	Category    string    `json:"category"`
	Price       float64   `json:"price"`
	ImageURL    *string   `json:"image_url,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// AddonListResponse represents paginated list of addons
type AddonListResponse struct {
	Addons     []AddonResponse `json:"addons"`
	Pagination PaginationInfo  `json:"pagination"`
}

// ============================================
// STATISTICS MODELS
// ============================================

// ProjectStatsResponse represents statistics for a project
type ProjectStatsResponse struct {
	ProjectID         string              `json:"project_id"`
	TotalUnits        int                 `json:"total_units"`
	AvailableUnits    int                 `json:"available_units"`
	BookedUnits       int                 `json:"booked_units"`
	UnavailableUnits  int                 `json:"unavailable_units"`
	AveragePrice      *float64            `json:"average_price,omitempty"`
	MinPrice          *float64            `json:"min_price,omitempty"`
	MaxPrice          *float64            `json:"max_price,omitempty"`
	UnitsByFloor      map[string]int      `json:"units_by_floor"`
	UnitsByType       map[string]int      `json:"units_by_type"`
	UnitsByStatus     map[string]int      `json:"units_by_status"`
	TotalAddons       int                 `json:"total_addons"`
	// Role-scoped lead funnel for this project (computed per request; not stored in Redis cache blob)
	TotalLeads          int `json:"total_leads"`
	TotalVisits         int `json:"total_visits"`
	LeadsInNegotiation  int `json:"leads_in_negotiation"`
	TotalLeadBookings   int `json:"total_lead_bookings"`
}

// ============================================
// SEARCH MODELS
// ============================================

// SearchProjectsRequest represents search query
type SearchProjectsRequest struct {
	Query string `json:"query" validate:"required,min=2"`
	Limit int    `json:"limit" validate:"omitempty,min=1,max=100"`
}

// SearchProjectsResponse represents search results
type SearchProjectsResponse struct {
	Results []ProjectResponse `json:"results"`
	Count   int               `json:"count"`
}

// ============================================
// COMMON MODELS
// ============================================

// PaginationInfo represents pagination metadata
type PaginationInfo struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// Project represents a project from database
type Project struct {
	ID                       uuid.UUID  `db:"id"`
	OrganizationID           uuid.UUID  `db:"organization_id"`
	ProjectTitle             string     `db:"project_title"`
	ProjectType              string     `db:"project_type"`
	AreaType                 *string    `db:"area_type"`
	ReraNumber               *string    `db:"rera_number"`
	ProjectStatus            *string    `db:"project_status"`
	ProjectState             *string    `db:"project_state"`
	StartDate                *time.Time `db:"start_date"`
	ExpectedPossessionDate   *time.Time `db:"expected_possession_date"`
	ProjectFloorCount        *int       `db:"project_floor_count"`
	FullAddress              *string    `db:"full_address"`
	City                     *string    `db:"city"`
	Pincode                  *string    `db:"pincode"`
	State                    *string    `db:"state"`
	Country                  *string    `db:"country"`
	Coordinates              *string    `db:"coordinates"`
	Amenities                []string   `db:"amenities"`
	MinimumUnitPrice         *float64   `db:"minimum_unit_price"`
	MaximumUnitPrice         *float64   `db:"maximum_unit_price"`
	ProjectAreaSize          *float64   `db:"project_area_size"`
	SmallestUnitSize         *float64   `db:"smallest_unit_size"`
	BiggestUnitSize          *float64   `db:"biggest_unit_size"`
	ProjectCoverPhotoURL     *string    `db:"project_cover_photo_url"`
	ProjectExteriorImagesURLs []string  `db:"project_exterior_images_urls"`
	ProjectInteriorImagesURLs []string  `db:"project_interior_images_urls"`
	ProjectExteriorVideosURLs []string  `db:"project_exterior_videos_urls"`
	ProjectDroneVideosURLs    []string  `db:"project_drone_videos_urls"`
	ProjectInteriorVideosURLs []string  `db:"project_interior_videos_urls"`
	CreatedAt                time.Time  `db:"created_at"`
	UpdatedAt                time.Time  `db:"updated_at"`
	DeletedAt                *time.Time `db:"deleted_at"`
}

// Unit represents a unit from database
type Unit struct {
	ID                  uuid.UUID  `db:"id"`
	ProjectID           uuid.UUID  `db:"project_id"`
	Name                string     `db:"name"`
	Floor               *int       `db:"floor"`
	Wing                *string    `db:"wing"`
	UnitType            string     `db:"unit_type"`
	CarpetArea          *float64   `db:"carpet_area"`
	BuiltupArea         *float64   `db:"builtup_area"`
	FacingDirection     *string    `db:"facing_direction"`
	Status              string     `db:"status"`
	UnitCode            *string    `db:"unit_code"`
	BasePrice           *float64   `db:"base_price"`
	ParkingPrice        *float64   `db:"parking_price"`
	InfrastructureCost  *float64   `db:"infrastructure_cost"`
	DevelopmentCharges  *float64   `db:"development_charges"`
	WaterCharges        *float64   `db:"water_charges"`
	MsebCharges         *float64   `db:"mseb_charges"`
	LegalCharges        *float64   `db:"legal_charges"`
	StampDuty           *float64   `db:"stamp_duty"`
	RegistrationFee     *float64   `db:"registration_fee"`
	GST                 *float64   `db:"gst"`
	VAT                 *float64   `db:"vat"`
	OneTimeMaintenance  *float64   `db:"one_time_maintenance"`
	DemandScore         *int       `db:"demand_score"`
	CreatedAt           time.Time  `db:"created_at"`
	UpdatedAt           time.Time  `db:"updated_at"`
}

// Addon represents an addon from database
type Addon struct {
	ID          uuid.UUID  `db:"id"`
	ProjectID   uuid.UUID  `db:"project_id"`
	Title       string     `db:"title"`
	Description *string    `db:"description"`
	Category    string     `db:"category"`
	Price       float64    `db:"price"`
	ImageURL    *string    `db:"image_url"`
	Status      string     `db:"status"`
	CreatedAt   time.Time  `db:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at"`
}
