package models

import (
	"time"

	"github.com/google/uuid"
)

// Organization represents the organizations table
type Organization struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name" validate:"required,min=3,max=255"`
	Email       string    `json:"email" db:"email" validate:"required,email"`
	Phone       *string   `json:"phone" db:"phone" validate:"required"`
	Address     string    `json:"address" db:"address" validate:"required,min=3"`
	City        string    `json:"city" db:"city" validate:"required,min=3,max=100"`
	State       string    `json:"state" db:"state" validate:"required,min=3,max=100"`
	Country     string    `json:"country" db:"country" validate:"required"`
	Pincode     string    `json:"pincode" db:"pincode" validate:"required,len=6"`
	Type        string    `json:"type" db:"type" validate:"required,oneof=builder broker agency"`
	CompanySize *string   `json:"company_size" db:"company_size" validate:"required,oneof=small medium large enterprise"`
	Status      string    `json:"status" db:"status"`
	LogoURL     *string   `json:"logo_url" db:"logo_url"`
	Website     string    `json:"website" db:"website" validate:"required,url"`
	TaxID       string    `json:"tax_id" db:"tax_id" validate:"required,min=3,max=100"`
	GSTIN       string    `json:"gstin" db:"gstin" validate:"required,len=15,alphanum"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// OrganizationRequest represents the request payload for organization creation
type OrganizationRequest struct {
	Name        string  `json:"name" validate:"required,min=3,max=255"`
	Email       string  `json:"email" validate:"required,email"`
	Phone       string  `json:"phone" validate:"required"`
	Address     string  `json:"address" validate:"required,min=3"`
	City        string  `json:"city" validate:"required,min=3,max=100"`
	State       string  `json:"state" validate:"required,min=3,max=100"`
	Country     string  `json:"country" validate:"required"`
	Pincode     string  `json:"pincode" validate:"required,len=6"`
	Type        string  `json:"type" validate:"required,oneof=builder broker agency"`
	CompanySize string  `json:"company_size" validate:"required,oneof=small medium large enterprise"`
	Website     string  `json:"website" validate:"required,url"`
	TaxID       string  `json:"tax_id" validate:"required,min=3,max=100"`
	GSTIN       string  `json:"gstin" validate:"required,len=15"`
}

// UpdateOrganizationRequest represents the request payload for organization update
type UpdateOrganizationRequest struct {
	Name        *string `json:"name" validate:"omitempty,min=3,max=255"`
	Email       *string `json:"email" validate:"omitempty,email"`
	Phone       *string `json:"phone" validate:"omitempty"`
	Address     *string `json:"address" validate:"omitempty,min=3"`
	City        *string `json:"city" validate:"omitempty,min=3,max=100"`
	State       *string `json:"state" validate:"omitempty,min=3,max=100"`
	Country     *string `json:"country" validate:"omitempty"`
	Pincode     *string `json:"pincode" validate:"omitempty,len=6"`
	Type        *string `json:"type" validate:"omitempty,oneof=builder broker agency"`
	CompanySize *string `json:"company_size" validate:"omitempty,oneof=small medium large enterprise"`
	Website     *string `json:"website" validate:"omitempty,url"`
	TaxID       *string `json:"tax_id" validate:"omitempty,min=3,max=100"`
	GSTIN       *string `json:"gstin" validate:"omitempty,len=15"`
	LogoURL     *string `json:"logo_url" validate:"omitempty,url"`
}
