package models

import (
	"time"

	"github.com/google/uuid"
)

// Team represents a team in the database
type Team struct {
	ID                   uuid.UUID  `json:"id"`
	OrganizationID       uuid.UUID  `json:"organization_id"`
	ManagerUserID        *uuid.UUID `json:"manager_user_id,omitempty"`
	TeamTitle            string     `json:"team_title"`
	TeamDescription      *string    `json:"team_description,omitempty"`
	TeamType             string     `json:"team_type"`
	ProjectAssignedIDs   []uuid.UUID `json:"project_assigned_ids,omitempty"`
	Labels               []string   `json:"labels,omitempty"`
	TeamRatingScore      *int       `json:"team_rating_score,omitempty"`
	TeamLogoURL          *string    `json:"team_logo_url,omitempty"`
	TeamStatus           string     `json:"team_status"`
	WorkingRegion        []string   `json:"working_region,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

// TeamWithMembers represents a team with its members count
type TeamWithMembers struct {
	Team
	MemberCount int      `json:"member_count"`
	ManagerName *string  `json:"manager_name,omitempty"`
}

// TeamMember represents a team member with basic info
type TeamMember struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Email      string  `json:"email"`
	Phone      string  `json:"phone"`
	UserType   string  `json:"user_type"`
	EmployeeID *string `json:"employee_id,omitempty"`
	AvatarURL  *string `json:"avatar_url,omitempty"`
	Status     string  `json:"status"`
	JoinedAt   time.Time `json:"joined_at"` // updated_at when team_id was set
}

// CreateTeamRequest represents the request payload for creating a team
type CreateTeamRequest struct {
	TeamTitle       string   `json:"team_title" validate:"required,min=3,max=255"`
	TeamDescription *string  `json:"team_description" validate:"omitempty,max=1000"`
	TeamType        string   `json:"team_type" validate:"required,oneof=presales sales postsales mixed"`
	ManagerUserID   *string  `json:"manager_user_id" validate:"omitempty,uuid4"`
	Labels          []string `json:"labels" validate:"omitempty,dive,oneof=inbound outbound luxury budget commercial residential"`
	TeamRatingScore *int     `json:"team_rating_score" validate:"omitempty,min=1,max=10"`
	TeamLogoURL     *string  `json:"team_logo_url" validate:"omitempty,url"`
	WorkingRegion   []string `json:"working_region" validate:"omitempty"`
}

// UpdateTeamRequest represents the request payload for updating a team
type UpdateTeamRequest struct {
	TeamTitle       *string  `json:"team_title" validate:"omitempty,min=3,max=255"`
	TeamDescription *string  `json:"team_description" validate:"omitempty,max=1000"`
	TeamType        *string  `json:"team_type" validate:"omitempty,oneof=presales sales postsales mixed"`
	ManagerUserID   *string  `json:"manager_user_id" validate:"omitempty,uuid4"`
	Labels          []string `json:"labels" validate:"omitempty,dive,oneof=inbound outbound luxury budget commercial residential"`
	TeamRatingScore *int     `json:"team_rating_score" validate:"omitempty,min=1,max=10"`
	TeamLogoURL     *string  `json:"team_logo_url" validate:"omitempty,url"`
	TeamStatus      *string  `json:"team_status" validate:"omitempty,oneof=active inactive blocked"`
	WorkingRegion   []string `json:"working_region" validate:"omitempty"`
}

// AddTeamMemberRequest represents the request payload for adding a member to team
type AddTeamMemberRequest struct {
	UserID   string `json:"user_id" validate:"required,uuid4"`
	UserType string `json:"user_type" validate:"required,oneof=manager presales sales"`
}

// RemoveTeamMemberRequest represents the request payload for removing a member from team
type RemoveTeamMemberRequest struct {
	UserID   string `json:"user_id" validate:"required,uuid4"`
	UserType string `json:"user_type" validate:"required,oneof=manager presales sales"`
}
