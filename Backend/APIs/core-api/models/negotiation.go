package models

import (
	"time"
)

// ============================================
// NEGOTIATION MODELS
// ============================================

// CreateNegotiationRequest is the body for POST /leads/:id/negotiation
type CreateNegotiationRequest struct {
	ProjectID      string    `json:"project_id" validate:"required,uuid"`
	UnitID         string    `json:"unit_id" validate:"required,uuid"`
	AddonIDs       []string  `json:"addon_ids,omitempty"`
	PriceOffered   *float64  `json:"price_offered,omitempty"`
	DiscountAmount *float64  `json:"discount_amount,omitempty"`
	DiscountTitle  *string   `json:"discount_title,omitempty"`
	UserCommission *float64 `json:"user_commission,omitempty"`
}

// UpdateNegotiationRequest is the body for PATCH /leads/:id/negotiation
type UpdateNegotiationRequest struct {
	ProjectID      *string   `json:"project_id,omitempty"`
	UnitID         *string   `json:"unit_id,omitempty"`
	AddonIDs       []string  `json:"addon_ids,omitempty"`
	PriceOffered   *float64  `json:"price_offered,omitempty"`
	DiscountAmount *float64  `json:"discount_amount,omitempty"`
	DiscountTitle  *string   `json:"discount_title,omitempty"`
	UserCommission *float64  `json:"user_commission,omitempty"`
}

// NegotiationProjectInfo is project summary in negotiation response
type NegotiationProjectInfo struct {
	ID               string   `json:"id"`
	ProjectTitle     string   `json:"project_title"`
	ProjectType      string   `json:"project_type"`
	ProjectCoverPhotoURL *string `json:"project_cover_photo_url,omitempty"`
	Amenities        []string `json:"amenities,omitempty"`
}

// NegotiationUnitInfo is unit details in negotiation response
type NegotiationUnitInfo struct {
	ID                  string   `json:"id"`
	Name                string   `json:"name"`
	Floor               *int     `json:"floor,omitempty"`
	Wing                *string  `json:"wing,omitempty"`
	UnitType            string   `json:"unit_type"`
	CarpetArea          *float64 `json:"carpet_area,omitempty"`
	BuiltupArea         *float64 `json:"builtup_area,omitempty"`
	Status              string   `json:"status"`
	BasePrice           *float64 `json:"base_price,omitempty"`
	ParkingPrice        *float64 `json:"parking_price,omitempty"`
	InfrastructureCost  *float64 `json:"infrastructure_cost,omitempty"`
	DevelopmentCharges  *float64 `json:"development_charges,omitempty"`
	WaterCharges        *float64 `json:"water_charges,omitempty"`
	MsebCharges         *float64 `json:"mseb_charges,omitempty"`
	LegalCharges        *float64 `json:"legal_charges,omitempty"`
	StampDuty           *float64 `json:"stamp_duty,omitempty"`
	RegistrationFee     *float64 `json:"registration_fee,omitempty"`
	GST                 *float64 `json:"gst,omitempty"`
	VAT                 *float64 `json:"vat,omitempty"`
	OneTimeMaintenance  *float64 `json:"one_time_maintenance,omitempty"`
}

// NegotiationAddonItem is one addon in negotiation response
type NegotiationAddonItem struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Category string  `json:"category"`
	Price    float64 `json:"price"`
}

// NegotiationResponse is the response for GET /leads/:id/negotiation
type NegotiationResponse struct {
	ID                string                   `json:"id"`
	LeadID            string                   `json:"lead_id"`
	StageID           *string                  `json:"stage_id,omitempty"`
	ProjectID         *string                  `json:"project_id,omitempty"`
	UnitID            *string                  `json:"unit_id,omitempty"`
	AddonIDs          []string                 `json:"addon_ids"`
	PriceOffered      *float64                 `json:"price_offered,omitempty"`
	FinalPriceAgreed  *float64                 `json:"final_price_agreed,omitempty"`
	DiscountAmount    *float64                 `json:"discount_amount,omitempty"`
	DiscountTitle     *string                  `json:"discount_title,omitempty"`
	UserCommission    *float64                 `json:"user_commission,omitempty"`
	ApprovalRequired  bool                     `json:"approval_required"`
	Status            string                   `json:"status"`
	CreatedAt         time.Time                `json:"created_at"`
	UpdatedAt         time.Time                `json:"updated_at"`
	Project           *NegotiationProjectInfo  `json:"project,omitempty"`
	Unit              *NegotiationUnitInfo     `json:"unit,omitempty"`
	Addons            []NegotiationAddonItem   `json:"addons,omitempty"`
}

// PriceBreakdownLineItem is one line in the price breakdown
type PriceBreakdownLineItem struct {
	Label  string   `json:"label"`
	Amount *float64 `json:"amount,omitempty"`
}

// PriceBreakdownResponse is the response for GET /leads/:id/negotiation/price-breakdown
type PriceBreakdownResponse struct {
	UnitCharges    []PriceBreakdownLineItem `json:"unit_charges"`
	Addons         []PriceBreakdownLineItem `json:"addons"`
	Subtotal       float64                 `json:"subtotal"`
	DiscountAmount *float64                `json:"discount_amount,omitempty"`
	FinalPrice     float64                 `json:"final_price"`
}

// ApproveNegotiationRequest is the body for POST /leads/:id/negotiation/approve
type ApproveNegotiationRequest struct {
	FinalPriceAgreed *float64 `json:"final_price_agreed,omitempty"`
}

// RejectNegotiationRequest is the body for POST /leads/:id/negotiation/reject
type RejectNegotiationRequest struct {
	Remarks *string `json:"remarks,omitempty"`
}

// ============================================
// QUOTATION MODELS
// ============================================

// CreateQuotationRequest is the body for POST /leads/:id/quotations
type CreateQuotationRequest struct {
	// Optional overrides: when provided, the quotation uses these instead of the
	// latest negotiation's project/unit/addons.
	ProjectID       *string  `json:"project_id,omitempty"`
	UnitID          *string  `json:"unit_id,omitempty"`
	AddonIDs        []string `json:"addon_ids,omitempty"`
	BasePrice       *float64 `json:"base_price,omitempty"`
	AdditionalCharges []PriceBreakdownLineItem `json:"additional_charges,omitempty"`
	// Discount
	DiscountName    *string  `json:"discount_name,omitempty"`
	DiscountPrice   *float64 `json:"discount_price,omitempty"`
	// Customer info
	CustomerName    *string  `json:"customer_name,omitempty"`
	CustomerContact *string  `json:"customer_contact,omitempty"`
	CustomerEmail   *string  `json:"customer_email,omitempty"`
	ValidTill       *string  `json:"valid_till,omitempty"` // YYYY-MM-DD
}

// UpdateQuotationRequest is the body for PATCH /leads/:id/quotations/:qid
type UpdateQuotationRequest struct {
	BasePrice            *float64           `json:"base_price,omitempty"`
	ParkingPrice         *float64           `json:"parking_price,omitempty"`
	InfrastructureCost   *float64           `json:"infrastructure_cost,omitempty"`
	DevelopmentCharges   *float64            `json:"development_charges,omitempty"`
	WaterCharges         *float64           `json:"water_charges,omitempty"`
	MsebCharges          *float64           `json:"mseb_charges,omitempty"`
	LegalCharges         *float64           `json:"legal_charges,omitempty"`
	StampDuty            *float64          `json:"stamp_duty,omitempty"`
	RegistrationFee      *float64          `json:"registration_fee,omitempty"`
	GST                  *float64          `json:"gst,omitempty"`
	VAT                  *float64          `json:"vat,omitempty"`
	OneTimeMaintenance   *float64          `json:"one_time_maintenance,omitempty"`
	AdditionalCharges    map[string]float64 `json:"additional_charges,omitempty"`
	DiscountName         *string           `json:"discount_name,omitempty"`
	DiscountPrice        *float64          `json:"discount_price,omitempty"`
	CustomerName         *string           `json:"customer_name,omitempty"`
	CustomerContact      *string           `json:"customer_contact,omitempty"`
	CustomerEmail        *string           `json:"customer_email,omitempty"`
	ValidTill            *string           `json:"valid_till,omitempty"`
}

// ApproveQuotationRequest is the body for POST /leads/:id/quotations/:qid/approve
type ApproveQuotationRequest struct {
	Remarks *string `json:"remarks,omitempty"`
}

// RejectQuotationRequest is the body for POST /leads/:id/quotations/:qid/reject
type RejectQuotationRequest struct {
	RejectionReason *string `json:"rejection_reason,omitempty"`
	Remarks         *string `json:"remarks,omitempty"` // alias for rejection_reason (older clients)
}

// ShareQuotationRequest is the body for POST /leads/:id/quotations/:qid/share
type ShareQuotationRequest struct {
	SharedVia string `json:"shared_via" validate:"required,oneof=whatsapp email pdf_download"`
}

// QuotationResponse is the response for GET quotation
type QuotationResponse struct {
	ID                    string     `json:"id"`
	LeadID                string     `json:"lead_id"`
	NegotiationID         *string    `json:"negotiation_id,omitempty"`
	ProjectID             *string    `json:"project_id,omitempty"`
	UnitID                *string    `json:"unit_id,omitempty"`
	AddonIDs              []string   `json:"addon_ids"`
	BasePrice             *float64   `json:"base_price,omitempty"`
	ParkingPrice          *float64   `json:"parking_price,omitempty"`
	InfrastructureCost    *float64   `json:"infrastructure_cost,omitempty"`
	DevelopmentCharges    *float64   `json:"development_charges,omitempty"`
	WaterCharges          *float64   `json:"water_charges,omitempty"`
	MsebCharges           *float64   `json:"mseb_charges,omitempty"`
	LegalCharges          *float64   `json:"legal_charges,omitempty"`
	StampDuty             *float64   `json:"stamp_duty,omitempty"`
	RegistrationFee       *float64   `json:"registration_fee,omitempty"`
	GST                   *float64   `json:"gst,omitempty"`
	VAT                   *float64   `json:"vat,omitempty"`
	OneTimeMaintenance    *float64   `json:"one_time_maintenance,omitempty"`
	AdditionalCharges     []PriceBreakdownLineItem `json:"additional_charges,omitempty"`
	DiscountName          *string    `json:"discount_name,omitempty"`
	DiscountPrice         *float64   `json:"discount_price,omitempty"`
	CustomerName          *string    `json:"customer_name,omitempty"`
	CustomerContact       *string    `json:"customer_contact,omitempty"`
	CustomerEmail         *string    `json:"customer_email,omitempty"`
	QuotationStatus       string     `json:"quotation_status"`
	QuotationVersion      int        `json:"quotation_version"`
	RejectionReason       *string    `json:"rejection_reason,omitempty"`
	ValidTill             *string    `json:"valid_till,omitempty"`
	SharedVia             *string    `json:"shared_via,omitempty"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

// QuotationListResponse is the response for GET /leads/:id/quotations
type QuotationListResponse struct {
	Quotations []QuotationResponse `json:"quotations"`
	Pagination PaginationInfo      `json:"pagination"`
}
