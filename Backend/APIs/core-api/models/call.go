package models

import "time"

type InitiateCallRequest struct {
	LeadStageID *string `json:"lead_stage_id,omitempty"`
}

type InitiateCallResponse struct {
	CallID    string `json:"call_id"`
	LeadPhone string `json:"lead_phone"`
	Status    string `json:"status"`
}

type UpdateCallRequest struct {
	CallStatus        *string `json:"call_status,omitempty"`
	CallStartedAt     *string `json:"call_started_at,omitempty"`
	CallAnsweredAt    *string `json:"call_answered_at,omitempty"`
	CallEndedAt       *string `json:"call_ended_at,omitempty"`
	RecordingURL      *string `json:"recording_url,omitempty"`
	RecordingDuration *int    `json:"recording_duration,omitempty"`
	CallOutcome       *string `json:"call_outcome,omitempty"`
}

type CallDetailResponse struct {
	ID                string     `json:"id"`
	LeadID            string     `json:"lead_id"`
	LeadStageID       *string    `json:"lead_stage_id,omitempty"`
	CallerUserID      *string    `json:"caller_user_id,omitempty"`
	CallerUserType    *string    `json:"caller_user_type,omitempty"`
	CallStatus        string     `json:"call_status"`
	CallOutcome       *string    `json:"call_outcome,omitempty"`
	CallStartedAt     *time.Time `json:"call_started_at,omitempty"`
	CallAnsweredAt    *time.Time `json:"call_answered_at,omitempty"`
	CallEndedAt       *time.Time `json:"call_ended_at,omitempty"`
	RecordingURL      *string    `json:"recording_url,omitempty"`
	RecordingDuration *int       `json:"recording_duration,omitempty"`
	TranscriptionText *string    `json:"transcription_text,omitempty"`
	AISummary         *string    `json:"ai_summary,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type CallListResponse struct {
	Calls      []CallDetailResponse `json:"calls"`
	Pagination PaginationInfo       `json:"pagination"`
}

type UploadURLRequest struct {
	FileExtension string `json:"file_extension" validate:"required"`
}

type UploadURLResponse struct {
	UploadURL string `json:"upload_url"`
	ObjectKey string `json:"object_key"`
}
