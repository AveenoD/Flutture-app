package models

import (
	"time"

	"github.com/google/uuid"
)

// LeadResponse represents a lead in API responses (list and get one)
type LeadResponse struct {
	ID                   string     `json:"id"`
	OrganizationID       string     `json:"organization_id"`
	Name                 string     `json:"name"`
	Phone                string     `json:"phone"`
	Email                *string    `json:"email,omitempty"`
	AlternatePhone       *string    `json:"alternate_phone,omitempty"`
	Address              *string    `json:"address,omitempty"`
	City                 *string    `json:"city,omitempty"`
	State                *string    `json:"state,omitempty"`
	Pincode              *string    `json:"pincode,omitempty"`
	Source               *string    `json:"source,omitempty"`
	SourceDetail         *string    `json:"source_detail,omitempty"`
	BudgetMin            *float64   `json:"budget_min,omitempty"`
	BudgetMax            *float64   `json:"budget_max,omitempty"`
	LeadTemperature      string     `json:"lead_temperature"`
	Status               string     `json:"status"`
	Stage                *string    `json:"stage,omitempty"`
	AssignedToUserID     *string    `json:"assigned_to_user_id,omitempty"`
	AssignedToUserType   *string    `json:"assigned_to_user_type,omitempty"`
	AssignedAt           *time.Time `json:"assigned_at,omitempty"`
	Priority             *string    `json:"priority,omitempty"`
	Tags                 []string   `json:"tags,omitempty"`
	Notes                *string    `json:"notes,omitempty"`
	ImportedDataID       *string    `json:"imported_data_id,omitempty"`
	ProjectID            *string    `json:"project_id,omitempty"`
	ProjectTitle         *string    `json:"project_title,omitempty"`
	PresalesUserID       *string    `json:"presales_user_id"` // present even when null for handoff semantics
	SalesUserID          *string    `json:"sales_user_id"`
	SalesAcceptedAt      *time.Time `json:"sales_accepted_at"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

// LeadsListResponse represents the response for listing leads
type LeadsListResponse struct {
	Leads       []LeadResponse  `json:"leads"`
	Pagination  PaginationInfo   `json:"pagination"`
}

// Lead is used for scanning from DB
type Lead struct {
	ID                 uuid.UUID
	OrganizationID     uuid.UUID
	Name               string
	Phone              string
	Email              *string
	AlternatePhone     *string
	Address            *string
	City               *string
	State              *string
	Pincode            *string
	Source             *string
	SourceDetail       *string
	BudgetMin          *float64
	BudgetMax          *float64
	LeadTemperature    string
	Status             string
	Stage              *string
	AssignedToUserID   *uuid.UUID
	AssignedToUserType *string
	AssignedAt         *time.Time
	Priority           *string
	Tags               []string
	Notes              *string
	ImportedDataID     *uuid.UUID
	ProjectID          *uuid.UUID
	ProjectTitle       *string
	PresalesUserID     *uuid.UUID
	SalesUserID        *uuid.UUID
	SalesAcceptedAt    *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

// ToLeadResponse converts a Lead to LeadResponse
func (r Lead) ToLeadResponse() LeadResponse {
	resp := LeadResponse{
		ID:              r.ID.String(),
		OrganizationID:   r.OrganizationID.String(),
		Name:             r.Name,
		Phone:            r.Phone,
		LeadTemperature:  r.LeadTemperature,
		Status:           r.Status,
		CreatedAt:        r.CreatedAt,
		UpdatedAt:        r.UpdatedAt,
	}
	if r.Email != nil {
		resp.Email = r.Email
	}
	if r.AlternatePhone != nil {
		resp.AlternatePhone = r.AlternatePhone
	}
	if r.Address != nil {
		resp.Address = r.Address
	}
	if r.City != nil {
		resp.City = r.City
	}
	if r.State != nil {
		resp.State = r.State
	}
	if r.Pincode != nil {
		resp.Pincode = r.Pincode
	}
	if r.Source != nil {
		resp.Source = r.Source
	}
	if r.SourceDetail != nil {
		resp.SourceDetail = r.SourceDetail
	}
	if r.BudgetMin != nil {
		resp.BudgetMin = r.BudgetMin
	}
	if r.BudgetMax != nil {
		resp.BudgetMax = r.BudgetMax
	}
	if r.Stage != nil {
		resp.Stage = r.Stage
	}
	if r.AssignedToUserID != nil {
		s := r.AssignedToUserID.String()
		resp.AssignedToUserID = &s
	}
	if r.AssignedToUserType != nil {
		resp.AssignedToUserType = r.AssignedToUserType
	}
	if r.AssignedAt != nil {
		resp.AssignedAt = r.AssignedAt
	}
	if r.Priority != nil {
		resp.Priority = r.Priority
	}
	if len(r.Tags) > 0 {
		resp.Tags = r.Tags
	}
	if r.Notes != nil {
		resp.Notes = r.Notes
	}
	if r.ImportedDataID != nil {
		s := r.ImportedDataID.String()
		resp.ImportedDataID = &s
	}
	if r.ProjectID != nil {
		s := r.ProjectID.String()
		resp.ProjectID = &s
	}
	if r.ProjectTitle != nil {
		resp.ProjectTitle = r.ProjectTitle
	}
	if r.PresalesUserID != nil {
		s := r.PresalesUserID.String()
		resp.PresalesUserID = &s
	}
	if r.SalesUserID != nil {
		s := r.SalesUserID.String()
		resp.SalesUserID = &s
	}
	if r.SalesAcceptedAt != nil {
		resp.SalesAcceptedAt = r.SalesAcceptedAt
	}
	return resp
}

// ForwardStageRequest is the body for POST /leads/:id/forward-stage
type ForwardStageRequest struct {
	NextStage string  `json:"next_stage" validate:"required,oneof=communication property_visit negotiation booking"`
	Remarks   *string `json:"remarks,omitempty"`
}

// StageRemarkItem is a remark from lead_stages (stage-level note)
type StageRemarkItem struct {
	StageID   string    `json:"stage_id"`
	StageType string    `json:"stage_type"`
	Remarks   string    `json:"remarks"`
	CreatedAt time.Time `json:"created_at"`
}

// FollowUpItem for lead-by-stage response
type FollowUpItem struct {
	ID           string     `json:"id"`
	LeadStageID  *string    `json:"lead_stage_id,omitempty"`
	LeadCallID   *string    `json:"lead_call_id,omitempty"`
	FollowupType string     `json:"followup_type"`
	FollowupDate time.Time  `json:"followup_date"`
	Remark       *string    `json:"remark,omitempty"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"created_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
}

// LeadCallItem for lead-by-stage response
type LeadCallItem struct {
	ID          string     `json:"id"`
	LeadStageID *string    `json:"lead_stage_id,omitempty"`
	CallStatus  string     `json:"call_status"`
	CallOutcome *string    `json:"call_outcome,omitempty"`
	StartedAt   *time.Time `json:"call_started_at,omitempty"`
	EndedAt     *time.Time `json:"call_ended_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// WhatsAppMessageItem for conversation messages
type WhatsAppMessageItem struct {
	ID         string    `json:"id"`
	Direction  string    `json:"direction"`
	MessageText *string  `json:"message_text,omitempty"`
	SentAt     time.Time `json:"sent_at"`
}

// WhatsAppConversationItem for lead-by-stage response
type WhatsAppConversationItem struct {
	ID           string                 `json:"id"`
	LeadStageID  *string                `json:"lead_stage_id,omitempty"`
	Status       string                 `json:"status"`
	StartedAt    time.Time              `json:"conversation_started_at"`
	LastMessageAt *time.Time            `json:"last_message_at,omitempty"`
	Messages     []WhatsAppMessageItem  `json:"messages,omitempty"`
}

// LeadDetailByStageItem is one lead with follow-ups, remarks, calls, whatsapp
type LeadDetailByStageItem struct {
	Lead                  LeadResponse               `json:"lead"`
	StageRemarks          []StageRemarkItem          `json:"stage_remarks"`
	FollowUps             []FollowUpItem             `json:"follow_ups"`
	RecentCalls           []LeadCallItem              `json:"recent_calls"`
	WhatsAppConversations []WhatsAppConversationItem `json:"whatsapp_conversations"`
}

// LeadDetailsByStageResponse for GET /leads/by-stage/:stage
type LeadDetailsByStageResponse struct {
	Leads      []LeadDetailByStageItem `json:"leads"`
	Pagination PaginationInfo          `json:"pagination"`
}

// AddStageRemarkRequest is the body for PATCH /leads/:id/stages/:stage_id/remarks
type AddStageRemarkRequest struct {
	Remarks string `json:"remarks"`
}

// LeadStageRemarkResponse is the response after adding/updating stage remarks
type LeadStageRemarkResponse struct {
	StageID   string    `json:"stage_id"`
	LeadID    string    `json:"lead_id"`
	StageType string    `json:"stage_type"`
	Remarks   string    `json:"remarks"`
	UpdatedAt time.Time `json:"updated_at"`
}

// StageCallDetail is a call for a stage, including recording (GET /leads/:id/stages/:stage_id)
type StageCallDetail struct {
	ID                string     `json:"id"`
	LeadStageID       string     `json:"lead_stage_id"`
	CallStatus        string     `json:"call_status"`
	CallOutcome       *string    `json:"call_outcome,omitempty"`
	CallStartedAt     *time.Time `json:"call_started_at,omitempty"`
	CallEndedAt       *time.Time `json:"call_ended_at,omitempty"`
	RecordingURL      *string    `json:"recording_url,omitempty"`
	RecordingDuration *int      `json:"recording_duration,omitempty"` // seconds
	CreatedAt         time.Time  `json:"created_at"`
}

// StageDetailResponse is the response for GET /leads/:id/stages/:stage_id (stage + remarks + calls with recording)
type StageDetailResponse struct {
	Stage   StageInfo     `json:"stage"`
	Calls   []StageCallDetail `json:"calls"`
}

// LeadStageByTypeResponse is the response for GET /leads/:id/stages/by-type/:stage_type (e.g. communication)
type LeadStageByTypeResponse struct {
	Stage                 StageInfo                    `json:"stage"`
	RecentCalls            []StageCallDetail            `json:"recent_calls"`
	FollowUps              []FollowUpItem               `json:"follow_ups"`
	WhatsAppConversations  []WhatsAppConversationItem   `json:"whatsapp_conversations"`
	Visits                 []PropertyVisitItem          `json:"visits,omitempty"` // populated only for stage_type=property_visit
}

// QualifyLeadRequest is the body for POST /leads/:id/qualify
// Used when a fresh lead arrives with only phone number and the user fills in more details at qualification time.
type QualifyLeadRequest struct {
	Name            *string  `json:"name,omitempty"`
	Email           *string  `json:"email,omitempty"`
	AlternatePhone  *string  `json:"alternate_phone,omitempty"`
	Address         *string  `json:"address,omitempty"`
	City            *string  `json:"city,omitempty"`
	State           *string  `json:"state,omitempty"`
	Pincode         *string  `json:"pincode,omitempty"`
	BudgetMin       *float64 `json:"budget_min,omitempty"`
	BudgetMax       *float64 `json:"budget_max,omitempty"`
	LeadTemperature *string  `json:"lead_temperature,omitempty"`
	Priority        *string  `json:"priority,omitempty"`
	Notes           *string  `json:"notes,omitempty"`
	Tags            []string `json:"tags,omitempty"`
	ProjectID       *string  `json:"project_id,omitempty"`
}

// UpdateLeadRequest is the body for PUT /leads/:id (general lead update)
type UpdateLeadRequest struct {
	Name            *string  `json:"name,omitempty"`
	Phone           *string  `json:"phone,omitempty"`
	Email           *string  `json:"email,omitempty"`
	AlternatePhone  *string  `json:"alternate_phone,omitempty"`
	Address         *string  `json:"address,omitempty"`
	City            *string  `json:"city,omitempty"`
	State           *string  `json:"state,omitempty"`
	Pincode         *string  `json:"pincode,omitempty"`
	Source          *string  `json:"source,omitempty"`
	SourceDetail    *string  `json:"source_detail,omitempty"`
	BudgetMin       *float64 `json:"budget_min,omitempty"`
	BudgetMax       *float64 `json:"budget_max,omitempty"`
	LeadTemperature *string  `json:"lead_temperature,omitempty"`
	Status          *string  `json:"status,omitempty"`
	Stage           *string  `json:"stage,omitempty"`
	Priority        *string  `json:"priority,omitempty"`
	Tags            []string `json:"tags,omitempty"`
	Notes           *string  `json:"notes,omitempty"`
	ProjectID       *string  `json:"project_id,omitempty"`
}

// StageInfo is the lead_stages row for get-stage endpoint
type StageInfo struct {
	ID         string     `json:"id"`
	LeadID     string     `json:"lead_id"`
	StageType  string     `json:"stage_type"`
	Remarks    *string    `json:"remarks,omitempty"`
	Status     string     `json:"status"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// CreateFollowUpRequest is the body for POST /leads/:id/follow-ups
type CreateFollowUpRequest struct {
	LeadStageID  string     `json:"lead_stage_id" validate:"required,uuid"`
	FollowupType string     `json:"followup_type" validate:"required,oneof=call whatsapp visit meeting document"`
	FollowupDate time.Time  `json:"followup_date" validate:"required"`
	Remark       string     `json:"remark" validate:"required,min=1"`
	LeadCallID   *string    `json:"lead_call_id,omitempty"`
}

// CompleteFollowUpRequest is the body for PATCH /leads/:id/follow-ups/:followup_id/complete
type CompleteFollowUpRequest struct {
	Outcome string  `json:"outcome" validate:"required,oneof=interested not_interested follow_up no_response"`
	Remark  *string `json:"remark,omitempty"`
}

// FollowUpDetail is the full follow-up row for get-details response
type FollowUpDetail struct {
	ID           string     `json:"id"`
	LeadID       string     `json:"lead_id"`
	LeadStageID  *string    `json:"lead_stage_id,omitempty"`
	LeadCallID   *string    `json:"lead_call_id,omitempty"`
	FollowupType string     `json:"followup_type"`
	FollowupDate time.Time  `json:"followup_date"`
	Remark       *string    `json:"remark,omitempty"`
	Status       string     `json:"status"`
	Outcome      *string    `json:"outcome,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
}

// FollowUpDetailResponse is the response for GET /leads/:id/follow-ups/:followup_id
type FollowUpDetailResponse struct {
	FollowUp   FollowUpDetail   `json:"follow_up"`
	Stage      *StageInfo      `json:"stage,omitempty"`
	LinkedCall *StageCallDetail `json:"linked_call,omitempty"`
}

// CreateVisitRequest is the body for POST /leads/:id/visits
type CreateVisitRequest struct {
	ProjectID           *string `json:"project_id,omitempty"`
	LocationCity        *string `json:"location_city,omitempty"`
	LocationArea        *string `json:"location_area,omitempty"`
	LocationCoordinates *string `json:"location_coordinates,omitempty"` // map/URL or lat,long
	VisitDate           string  `json:"visit_date" validate:"required"`   // YYYY-MM-DD
	VisitTime           string  `json:"visit_time" validate:"required"`  // HH:MM or HH:MM:SS
	VisitType           string  `json:"visit_type" validate:"required,oneof=first_visit revisit"`
}

// UpdateVisitRequest is the body for PATCH /leads/:id/visits/:visit_id
type UpdateVisitRequest struct {
	SiteVisitImages []string `json:"site_visit_images,omitempty"`
	Remarks         *string  `json:"remarks,omitempty"`
	Outcome         *string  `json:"outcome,omitempty"` // interested | not_interested | follow_up | negotiation_started
	Status          *string  `json:"status,omitempty"`  // e.g. completed
}

// RescheduleVisitRequest is the body for POST /leads/:id/visits/:visit_id/reschedule
type RescheduleVisitRequest struct {
	VisitDate   string `json:"visit_date" validate:"required"`   // YYYY-MM-DD
	VisitTime   string `json:"visit_time" validate:"required"`   // HH:MM or HH:MM:SS
	DelayReason string `json:"delay_reason" validate:"required,oneof=client_unavailable traffic weather sales_unavailable other"`
}

// PropertyVisitItem is a visit row for list responses (e.g. in stage by-type property_visit)
type PropertyVisitItem struct {
	ID                 string     `json:"id"`
	LeadID             string     `json:"lead_id"`
	ProjectID          *string    `json:"project_id,omitempty"`
	VisitType          string     `json:"visit_type"`
	VisitDate          *time.Time `json:"visit_date,omitempty"`
	VisitTime          *string   `json:"visit_time,omitempty"` // "14:30:00" from DB TIME
	ScheduledAt        *time.Time `json:"scheduled_at,omitempty"`
	Status             string     `json:"status"`
	DelayReason        *string    `json:"delay_reason,omitempty"`
	Outcome            *string    `json:"outcome,omitempty"`
	Remarks            *string    `json:"remarks,omitempty"`
	SiteVisitImages    []string   `json:"site_visit_images,omitempty"`
	SiteVisitImageURLs []string   `json:"site_visit_image_urls,omitempty"`
	LocationCity       *string    `json:"location_city,omitempty"`
	LocationArea       *string    `json:"location_area,omitempty"`
	LocationCoordinates *string   `json:"location_coordinates,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

// PropertyVisitDetail is the full visit for GET /leads/:id/visits/:visit_id (with optional project)
type PropertyVisitDetail struct {
	PropertyVisitItem
	CreatedByUserID   *string `json:"created_by_user_id,omitempty"`
	CreatedByUserType *string `json:"created_by_user_type,omitempty"`
}

// PropertyVisitDetailResponse is the response for GET /leads/:id/visits/:visit_id
type PropertyVisitDetailResponse struct {
	Visit   PropertyVisitDetail `json:"visit"`
	Project *ProjectInfo        `json:"project,omitempty"`
}

// ProjectInfo is minimal project info for visit response
type ProjectInfo struct {
	ID    string `json:"id"`
	Title string `json:"project_title"`
}

// LeadStatsResponse is the response for GET /leads/stats and GET /leads/:id/stats
type LeadStatsResponse struct {
	TotalCallsMade  int     `json:"total_calls_made"`
	MessageSent     int     `json:"message_sent"`
	SiteVisitDone   int     `json:"site_visit_done"`
	CallingHour     string  `json:"calling_hour"`      // e.g. "3:45 hrs"
	CallingHourSeconds int  `json:"calling_hour_seconds"`
}

// PresalesUserSummary is the presales user who managed the lead (for lead summary)
type PresalesUserSummary struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Phone string `json:"phone"`
}

// ProjectSummary is minimal project info for interested property in lead summary
type ProjectSummary struct {
	ProjectID    string `json:"project_id"`
	ProjectTitle string `json:"project_title"`
}

// LeadSummaryResponse is the response for GET /leads/:id/summary (sales only)
type LeadSummaryResponse struct {
	Lead                  LeadResponse               `json:"lead"`
	PresalesUser          *PresalesUserSummary       `json:"presales_user,omitempty"`
	RecentCalls           []StageCallDetail          `json:"recent_calls"`
	WhatsAppConversations []WhatsAppConversationItem `json:"whatsapp_conversations"`
	StageRemarks          []StageRemarkItem         `json:"stage_remarks"`
	InterestedProperty    *ProjectSummary            `json:"interested_property,omitempty"`
}
