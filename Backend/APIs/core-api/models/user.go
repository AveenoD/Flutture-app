package models

import (
	"time"

	"github.com/google/uuid"
)

// CreateUserRequest represents the request payload for creating a user (manager, presales, sales)
type CreateUserRequest struct {
	UserType    string   `json:"user_type" validate:"required,oneof=manager presales sales"`
	Name        string   `json:"name" validate:"required,min=3,max=255"`
	Email       string   `json:"email" validate:"required,email"`
	Phone       string   `json:"phone" validate:"required,min=10,max=20"`
	Password    string   `json:"password" validate:"required,min=8"`
	Gender      string   `json:"gender" validate:"required,oneof=male female other"`
	DOB         string   `json:"dob" validate:"required,datetime=2006-01-02"`
	EmployeeID  string   `json:"employee_id" validate:"required,min=3,max=50"`
	TeamID      string   `json:"team_id"` // Required field, can be empty string (will be NULL in DB) or valid UUID
	// project_assigned_ids is only applicable for sales users. It is ignored for other user types.
	ProjectAssignedIDs []string `json:"project_assigned_ids,omitempty" validate:"omitempty,dive,uuid"`
	AvatarURL   *string  `json:"avatar_url" validate:"omitempty,url"`
	Permissions []string `json:"permissions" validate:"required,dive,oneof=view_leads create_leads edit_leads delete_leads view_deals create_deals edit_deals view_reports view_analytics manage_quotations manage_visits manage_negotiations close_deals manage_employees manage_routing manage_organizations view_all_data create_teams import_data manage_projects"`
	Status      string   `json:"status" validate:"required,oneof=active inactive suspended on_leave"`
}

// UserResponse represents the response after creating a user
type UserResponse struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	UserType       string    `json:"user_type"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	Phone          string    `json:"phone"`
	Gender         *string   `json:"gender,omitempty"`
	DOB            *string   `json:"dob,omitempty"`
	EmployeeID    *string   `json:"employee_id,omitempty"`
	TeamID         *string   `json:"team_id,omitempty"`
	AvatarURL     *string   `json:"avatar_url,omitempty"`
	Permissions    []string  `json:"permissions,omitempty"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// UpdateUserRequest represents the request payload for updating a user
type UpdateUserRequest struct {
	Name        *string  `json:"name" validate:"omitempty,min=3,max=255"`
	Email       *string  `json:"email" validate:"omitempty,email"`
	Phone       *string  `json:"phone" validate:"omitempty,min=10,max=20"`
	Gender      *string  `json:"gender" validate:"omitempty,oneof=male female other"`
	DOB         *string  `json:"dob" validate:"omitempty,datetime=2006-01-02"`
	EmployeeID  *string  `json:"employee_id" validate:"omitempty,min=3,max=50"`
	TeamID      *string  `json:"team_id" validate:"omitempty"`
	AvatarURL   *string  `json:"avatar_url" validate:"omitempty,url"`
	Permissions []string `json:"permissions" validate:"omitempty,dive,oneof=view_leads create_leads edit_leads delete_leads view_deals create_deals edit_deals view_reports view_analytics manage_quotations manage_visits manage_negotiations close_deals manage_employees manage_routing manage_organizations view_all_data create_teams import_data manage_projects"`
	Status      *string  `json:"status" validate:"omitempty,oneof=active inactive suspended on_leave"`
}

// BlockUserRequest represents the request payload for blocking/unblocking a user
type BlockUserRequest struct {
	Status string `json:"status" validate:"required,oneof=inactive suspended on_leave"`
}

// AddPermissionRequest represents the request payload for adding a permission
type AddPermissionRequest struct {
	Permission string `json:"permission" validate:"required,oneof=view_leads create_leads edit_leads delete_leads view_deals create_deals edit_deals view_reports view_analytics manage_quotations manage_visits manage_negotiations close_deals manage_employees manage_routing manage_organizations view_all_data create_teams import_data manage_projects"`
}

// RemovePermissionRequest represents the request payload for removing a permission
type RemovePermissionRequest struct {
	Permission string `json:"permission" validate:"required,oneof=view_leads create_leads edit_leads delete_leads view_deals create_deals edit_deals view_reports view_analytics manage_quotations manage_visits manage_negotiations close_deals manage_employees manage_routing manage_organizations view_all_data create_teams import_data manage_projects"`
}

// User represents a user from database (common structure)
type User struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	OrganizationID uuid.UUID  `json:"organization_id" db:"organization_id"`
	Name           string     `json:"name" db:"name"`
	Email          string     `json:"email" db:"email"`
	Phone          string     `json:"phone" db:"phone"`
	Gender         *string    `json:"gender,omitempty" db:"gender"`
	DOB            *time.Time `json:"dob,omitempty" db:"dob"`
	EmployeeID    *string    `json:"employee_id,omitempty" db:"employee_id"`
	TeamID         *uuid.UUID `json:"team_id,omitempty" db:"team_id"`
	AvatarURL      *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	Permissions    []string   `json:"permissions,omitempty" db:"permissions"`
	Status         string     `json:"status" db:"status"`
	LastLoginAt    *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// UserListItem represents a single user row in list APIs (across all roles)
type UserListItem struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Email       string     `json:"email"`
	Phone       string     `json:"phone"`
	Role        string     `json:"role"` // presales|sales|manager|gm
	EmployeeID  *string    `json:"employee_id,omitempty"`
	TeamID      *string    `json:"team_id,omitempty"`
	Status      string     `json:"status"`
	Permissions []string   `json:"permissions"`
	CreatedAt   time.Time  `json:"created_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
}

// UserListResponse is the response for GET /users
type UserListResponse struct {
	Users      []UserListItem `json:"users"`
	Pagination PaginationInfo `json:"pagination"`
}
