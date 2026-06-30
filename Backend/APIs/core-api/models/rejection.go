package models

import "time"

// RejectionReasonItem is one Q&A in the rejection (for API response)
type RejectionReasonItem struct {
	QuestionID   string `json:"question_id"`
	QuestionText string `json:"question_text,omitempty"`
	Answer       string `json:"answer"`
	Category     string `json:"category,omitempty"`
}

// RejectedLeadRejectionInfo holds rejection metadata and reasons for a rejected lead
type RejectedLeadRejectionInfo struct {
	RejectionID       string                 `json:"rejection_id"`
	RejectedAt       time.Time              `json:"rejected_at"`
	RejectedByUserID *string                `json:"rejected_by_user_id,omitempty"`
	RejectedByUserType string               `json:"rejected_by_user_type,omitempty"`
	QuestionsResponse []RejectionReasonItem  `json:"questions_response"`
	AISummary        *string                `json:"ai_summary,omitempty"`
	AIBulletPoints   []string               `json:"ai_bullet_points,omitempty"`
}

// RejectedLeadItem is a rejected lead with its rejection reasons (GM/Manager only)
type RejectedLeadItem struct {
	Lead     LeadResponse               `json:"lead"`
	Rejection RejectedLeadRejectionInfo `json:"rejection"`
}

// RejectedLeadsListResponse is the response for GET /leads/rejected
type RejectedLeadsListResponse struct {
	RejectedLeads []RejectedLeadItem `json:"rejected_leads"`
	Pagination    PaginationInfo     `json:"pagination"`
}

// QuestionResponse is one answer in the reject request
type QuestionResponse struct {
	QuestionID string `json:"question_id" validate:"required,uuid"`
	Answer     string `json:"answer" validate:"required"`
}

// RejectLeadRequest is the request body for POST /leads/:id/reject
type RejectLeadRequest struct {
	QuestionsResponse []QuestionResponse `json:"questions_response" validate:"required,min=1,dive"`
	AISummary         *string            `json:"ai_summary,omitempty"`
	AIBulletPoints    []string           `json:"ai_bullet_points,omitempty"`
}

// RejectionQuestion is returned by GET rejection-questions
type RejectionQuestion struct {
	ID           string   `json:"id"`
	QuestionText string   `json:"question_text"`
	Options      []string `json:"options"`
	Category     string   `json:"category"`
}

// RejectLeadResponse is returned after successful reject
type RejectLeadResponse struct {
	LeadID       string        `json:"lead_id"`
	RejectionID  string        `json:"rejection_id"`
	Lead         LeadResponse  `json:"lead"`
}

// RejectionQuestionsListResponse for GET rejection-questions
type RejectionQuestionsListResponse struct {
	Questions []RejectionQuestion `json:"questions"`
}
