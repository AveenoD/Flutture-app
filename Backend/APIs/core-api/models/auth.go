package models

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token     string    `json:"token"`
	User      UserInfo  `json:"user"`
	ExpiresIn int64     `json:"expires_in"` // seconds
}

// UserInfo represents the user info in login response (works for all user types)
type UserInfo struct {
	ID             string   `json:"id"`
	OrganizationID string   `json:"organization_id"`
	UserType       string   `json:"user_type"` // general-manager, manager, presales, sales
	Name           string   `json:"name"`
	Email          string   `json:"email"`
	Phone          string   `json:"phone"`
	Gender         string   `json:"gender"`
	DOB            string   `json:"dob,omitempty"`
	EmployeeID     string   `json:"employee_id,omitempty"`
	AvatarURL      string   `json:"avatar_url,omitempty"`
	Status         string   `json:"status"`
	Permissions    []string `json:"permissions,omitempty"`
}

// GeneralManagerInfo represents the user info in login response (kept for backward compatibility)
type GeneralManagerInfo struct {
	ID             string `json:"id"`
	OrganizationID string `json:"organization_id"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	Gender         string `json:"gender"`
	DOB            string `json:"dob,omitempty"`
	EmployeeID     string `json:"employee_id,omitempty"`
	AvatarURL      string `json:"avatar_url,omitempty"`
	Status         string `json:"status"`
}

// ForgotPasswordRequest represents the forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ResetPasswordRequest represents the reset password request
type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// ChangePasswordRequest represents the change password request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

// UpdateProfileRequest represents the update profile request
type UpdateProfileRequest struct {
	Name      *string `json:"name" validate:"omitempty,min=3,max=255"`
	Email     *string `json:"email" validate:"omitempty,email"`
	Phone     *string `json:"phone" validate:"omitempty,min=10,max=20"`
	Gender    *string `json:"gender" validate:"omitempty,oneof=male female other"`
	DOB       *string `json:"dob" validate:"omitempty,datetime=2006-01-02"`
	AvatarURL *string `json:"avatar_url" validate:"omitempty,url"`
}
