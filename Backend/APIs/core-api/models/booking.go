package models

import (
	"time"
)

// ============================================
// BOOKING MODELS
// ============================================

// BookingResponse is the response for GET /leads/:id/booking
type BookingResponse struct {
	ID                      string                   `json:"id"`
	LeadID                  string                   `json:"lead_id"`
	StageID                 *string                  `json:"stage_id,omitempty"`
	ProjectID               *string                  `json:"project_id,omitempty"`
	UnitID                  *string                  `json:"unit_id,omitempty"`
	AddonIDs                []string                 `json:"addon_ids"`
	FinalTotalPrice         *float64                 `json:"final_total_price,omitempty"`
	TokenAmount             *float64                 `json:"token_amount,omitempty"`
	TokenDate               *string                  `json:"token_date,omitempty"` // YYYY-MM-DD
	PaymentMode             *string                  `json:"payment_mode,omitempty"`
	PaymentTransactionID    *string                  `json:"payment_transaction_id,omitempty"`
	PaymentProofImages      []string                 `json:"payment_proof_images,omitempty"`
	EMIApplicable           bool                     `json:"emi_applicable"`
	ExtraChargesApplicable  bool                     `json:"extra_charges_applicable"`
	LoanAmount              *float64                 `json:"loan_amount,omitempty"`
	InterestRate            *float64                 `json:"interest_rate,omitempty"`
	TenureMonths            *int                     `json:"tenure_months,omitempty"`
	DownPayment             *float64                 `json:"down_payment,omitempty"`
	MonthlyEMI              *float64                 `json:"monthly_emi,omitempty"`
	BankName                *string                  `json:"bank_name,omitempty"`
	MaintenanceCharges      *float64                 `json:"maintenance_charges,omitempty"`
	LegalCharges            *float64                 `json:"legal_charges,omitempty"`
	StampDuty               *float64                 `json:"stamp_duty,omitempty"`
	ParkingCharges          *float64                 `json:"parking_charges,omitempty"`
	BookingStatus           string                   `json:"booking_status"`
	PossessionDateExpected  *string                  `json:"possession_date_expected,omitempty"` // YYYY-MM-DD
	Remarks                 *string                  `json:"remarks,omitempty"`
	CreatedAt               time.Time                `json:"created_at"`
	UpdatedAt               time.Time                `json:"updated_at"`
	Project                 *NegotiationProjectInfo   `json:"project,omitempty"`
	Unit                    *NegotiationUnitInfo     `json:"unit,omitempty"`
	Addons                  []NegotiationAddonItem   `json:"addons,omitempty"`
}

// UpdateBookingRequest is the body for PATCH /leads/:id/booking
type UpdateBookingRequest struct {
	FinalTotalPrice         *float64  `json:"final_total_price,omitempty"`
	TokenAmount             *float64  `json:"token_amount,omitempty"`
	TokenDate               *string   `json:"token_date,omitempty"` // YYYY-MM-DD
	PaymentMode             *string   `json:"payment_mode,omitempty"`
	PaymentTransactionID    *string   `json:"payment_transaction_id,omitempty"`
	PaymentProofImages      []string  `json:"payment_proof_images,omitempty"`
	EMIApplicable          *bool     `json:"emi_applicable,omitempty"`
	ExtraChargesApplicable *bool     `json:"extra_charges_applicable,omitempty"`
	LoanAmount             *float64  `json:"loan_amount,omitempty"`
	InterestRate           *float64  `json:"interest_rate,omitempty"`
	TenureMonths           *int      `json:"tenure_months,omitempty"`
	DownPayment            *float64  `json:"down_payment,omitempty"`
	MonthlyEMI             *float64  `json:"monthly_emi,omitempty"`
	BankName               *string   `json:"bank_name,omitempty"`
	MaintenanceCharges     *float64  `json:"maintenance_charges,omitempty"`
	LegalCharges           *float64  `json:"legal_charges,omitempty"`
	StampDuty              *float64  `json:"stamp_duty,omitempty"`
	ParkingCharges         *float64  `json:"parking_charges,omitempty"`
	PossessionDateExpected *string   `json:"possession_date_expected,omitempty"`
	Remarks                *string   `json:"remarks,omitempty"`
}

// ============================================
// BOOKING DOCUMENT MODELS
// ============================================

// BookingDocumentResponse maps lead_booking_documents row
type BookingDocumentResponse struct {
	ID                    string    `json:"id"`
	LeadBookingID         string    `json:"lead_booking_id"`
	QuotationID           *string   `json:"quotation_id,omitempty"`
	DocumentName          string    `json:"document_name"`
	DocumentType          string    `json:"document_type"`
	DocumentNumber        *string   `json:"document_number,omitempty"`
	DocumentFrontPhotoURL *string   `json:"document_front_photo_url,omitempty"`
	DocumentBackPhotoURL  *string   `json:"document_back_photo_url,omitempty"`
	Remarks               *string   `json:"remarks,omitempty"`
	UploadedAt            time.Time `json:"uploaded_at"`
}

// AddBookingDocumentRequest is the body for POST /leads/:id/booking/documents
type AddBookingDocumentRequest struct {
	DocumentName          string  `json:"document_name" validate:"required,max=255"`
	DocumentType          string  `json:"document_type" validate:"required,oneof=pancard aadharcard booking_agreement passport_photo electricity_bill voter_id driving_license bank_passbook"`
	DocumentNumber        *string `json:"document_number,omitempty"`
	DocumentFrontPhotoURL *string `json:"document_front_photo_url,omitempty"`
	DocumentBackPhotoURL  *string `json:"document_back_photo_url,omitempty"`
	Remarks               *string `json:"remarks,omitempty"`
	// QuotationID optionally links the upload to a quotation version on the same lead.
	QuotationID *string `json:"quotation_id,omitempty"`
}

// UpdateBookingDocumentRequest is the body for PATCH /leads/:id/booking/documents/:did
type UpdateBookingDocumentRequest struct {
	DocumentName          *string `json:"document_name,omitempty"`
	DocumentType          *string `json:"document_type,omitempty"`
	DocumentNumber        *string `json:"document_number,omitempty"`
	DocumentFrontPhotoURL *string `json:"document_front_photo_url,omitempty"`
	DocumentBackPhotoURL  *string `json:"document_back_photo_url,omitempty"`
	Remarks               *string `json:"remarks,omitempty"`
}

// BookingDocumentListResponse is the response for GET /leads/:id/booking/documents
type BookingDocumentListResponse struct {
	Documents []BookingDocumentResponse `json:"documents"`
}
