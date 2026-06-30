package models

import (
	"time"

	"github.com/google/uuid"
)

// GeneralManager represents the users_general_managers table
type GeneralManager struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	OrganizationID uuid.UUID  `json:"organization_id" db:"organization_id"`
	Name           string     `json:"name" db:"name" validate:"required,min=3,max=255"`
	Phone          string     `json:"phone" db:"phone" validate:"required"`
	Gender         string     `json:"gender" db:"gender" validate:"required,oneof=male female other"`
	DOB            *time.Time `json:"dob" db:"dob"`
	Email          string     `json:"email" db:"email" validate:"required,email"`
	PasswordHash   string     `json:"-" db:"password_hash"`
	AvatarURL      *string    `json:"avatar_url" db:"avatar_url"`
	EmployeeID     *string    `json:"employee_id" db:"employee_id"`
	TeamID         *uuid.UUID `json:"team_id" db:"team_id"`
	Permissions    []string   `json:"permissions" db:"permissions"`
	Status         string     `json:"status" db:"status"`
	LastLoginAt    *time.Time `json:"last_login_at" db:"last_login_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// GeneralManagerRequest represents the request payload for general manager creation
type GeneralManagerRequest struct {
	Name       string  `json:"name" validate:"required,min=3,max=255"`
	Email      string  `json:"email" validate:"required,email"`
	Phone      string  `json:"phone" validate:"required"`
	Password   string  `json:"password" validate:"required,min=8"`
	Gender     string  `json:"gender" validate:"required,oneof=male female other"`
	DOB        string  `json:"dob" validate:"required,datetime=2006-01-02"`
	EmployeeID *string `json:"employee_id" validate:"omitempty,min=3,max=50"`
	AvatarURL  *string `json:"avatar_url" validate:"omitempty,url"`
}

// OnboardRequest represents the complete request for organization onboarding
type OnboardRequest struct {
	Organization   OrganizationRequest   `json:"organization" validate:"required"`
	GeneralManager GeneralManagerRequest `json:"general_manager" validate:"required"`
}
