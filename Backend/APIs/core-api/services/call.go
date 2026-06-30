package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"crownco/core-api/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrCallNotFound = errors.New("CALL_NOT_FOUND")

// signRecordingURL converts a raw B2 object key into a presigned download URL.
// If the value is already an HTTPS URL or storage is not configured, it is left unchanged.
func (s *CallService) signRecordingURL(ctx context.Context, url *string) {
	if s.Storage == nil || url == nil || *url == "" {
		return
	}
	v := strings.TrimSpace(*url)
	if strings.HasPrefix(v, "http://") || strings.HasPrefix(v, "https://") {
		return
	}
	signed, err := s.Storage.GeneratePresignedDownloadURL(ctx, v, 1*time.Hour)
	if err != nil || signed == "" {
		return
	}
	*url = signed
}

type CallService struct {
	DB      *pgxpool.Pool
	Lead    *LeadService
	Storage *StorageService
}

func NewCallService(db *pgxpool.Pool, lead *LeadService, storage *StorageService) *CallService {
	return &CallService{DB: db, Lead: lead, Storage: storage}
}

func (s *CallService) InitiateCall(ctx context.Context, leadID, orgID, userID, userType string, req *models.InitiateCallRequest) (*models.InitiateCallResponse, error) {
	lead, err := s.Lead.GetLeadByID(ctx, leadID, orgID, userID, userType)
	if err != nil {
		return nil, ErrLeadNotFound
	}

	var leadStageID *uuid.UUID
	if req != nil && req.LeadStageID != nil && *req.LeadStageID != "" {
		parsed, err := uuid.Parse(*req.LeadStageID)
		if err != nil {
			return nil, fmt.Errorf("INVALID_STAGE_ID")
		}
		leadStageID = &parsed
	}

	var callID uuid.UUID
	err = s.DB.QueryRow(ctx,
		`INSERT INTO lead_calls (organization_id, lead_id, lead_stage_id, caller_user_id, caller_user_type, call_status)
		 VALUES ($1, $2, $3, $4, $5::user_type, 'initiated')
		 RETURNING id`,
		orgID, leadID, leadStageID, userID, userType,
	).Scan(&callID)
	if err != nil {
		return nil, fmt.Errorf("failed to create call record: %w", err)
	}

	return &models.InitiateCallResponse{
		CallID:    callID.String(),
		LeadPhone: lead.Phone,
		Status:    "initiated",
	}, nil
}

func (s *CallService) GetCall(ctx context.Context, leadID, callID, orgID string) (*models.CallDetailResponse, error) {
	callUUID, err := uuid.Parse(callID)
	if err != nil {
		return nil, ErrCallNotFound
	}

	var resp models.CallDetailResponse
	var id uuid.UUID
	var leadIDOut uuid.UUID
	var leadStageID *uuid.UUID
	var callerUserID *uuid.UUID
	var callerUserType *string

	err = s.DB.QueryRow(ctx,
		`SELECT id, lead_id, lead_stage_id, caller_user_id, caller_user_type,
		        call_status, call_outcome, call_started_at, call_answered_at, call_ended_at,
		        recording_url, recording_duration, transcription_text, ai_summary,
		        created_at, updated_at
		 FROM lead_calls
		 WHERE id = $1 AND lead_id = $2 AND organization_id = $3`,
		callUUID, leadID, orgID,
	).Scan(
		&id, &leadIDOut, &leadStageID, &callerUserID, &callerUserType,
		&resp.CallStatus, &resp.CallOutcome, &resp.CallStartedAt, &resp.CallAnsweredAt, &resp.CallEndedAt,
		&resp.RecordingURL, &resp.RecordingDuration, &resp.TranscriptionText, &resp.AISummary,
		&resp.CreatedAt, &resp.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCallNotFound
		}
		return nil, err
	}

	resp.ID = id.String()
	resp.LeadID = leadIDOut.String()
	if leadStageID != nil {
		s := leadStageID.String()
		resp.LeadStageID = &s
	}
	if callerUserID != nil {
		s := callerUserID.String()
		resp.CallerUserID = &s
	}
	resp.CallerUserType = callerUserType
	s.signRecordingURL(ctx, resp.RecordingURL)

	return &resp, nil
}

func (s *CallService) ListCalls(ctx context.Context, leadID, orgID string, page, limit int) (*models.CallListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int
	err := s.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM lead_calls WHERE lead_id = $1 AND organization_id = $2`,
		leadID, orgID,
	).Scan(&total)
	if err != nil {
		return nil, err
	}

	rows, err := s.DB.Query(ctx,
		`SELECT id, lead_id, lead_stage_id, caller_user_id, caller_user_type,
		        call_status, call_outcome, call_started_at, call_answered_at, call_ended_at,
		        recording_url, recording_duration, transcription_text, ai_summary,
		        created_at, updated_at
		 FROM lead_calls
		 WHERE lead_id = $1 AND organization_id = $2
		 ORDER BY created_at DESC
		 LIMIT $3 OFFSET $4`,
		leadID, orgID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var calls []models.CallDetailResponse
	for rows.Next() {
		var c models.CallDetailResponse
		var id, leadIDOut uuid.UUID
		var leadStageID, callerUserID *uuid.UUID
		var callerUserType *string

		if err := rows.Scan(
			&id, &leadIDOut, &leadStageID, &callerUserID, &callerUserType,
			&c.CallStatus, &c.CallOutcome, &c.CallStartedAt, &c.CallAnsweredAt, &c.CallEndedAt,
			&c.RecordingURL, &c.RecordingDuration, &c.TranscriptionText, &c.AISummary,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}

		c.ID = id.String()
		c.LeadID = leadIDOut.String()
		if leadStageID != nil {
			s := leadStageID.String()
			c.LeadStageID = &s
		}
		if callerUserID != nil {
			s := callerUserID.String()
			c.CallerUserID = &s
		}
		c.CallerUserType = callerUserType
		s.signRecordingURL(ctx, c.RecordingURL)
		calls = append(calls, c)
	}

	if calls == nil {
		calls = []models.CallDetailResponse{}
	}

	totalPages := (total + limit - 1) / limit
	return &models.CallListResponse{
		Calls: calls,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *CallService) UpdateCall(ctx context.Context, leadID, callID, orgID, userID string, req *models.UpdateCallRequest) (*models.CallDetailResponse, error) {
	callUUID, err := uuid.Parse(callID)
	if err != nil {
		return nil, ErrCallNotFound
	}

	setClauses := []string{}
	args := []interface{}{}
	argIdx := 1

	if req.CallStatus != nil {
		setClauses = append(setClauses, fmt.Sprintf("call_status = $%d::call_status", argIdx))
		args = append(args, *req.CallStatus)
		argIdx++
	}
	if req.CallStartedAt != nil {
		t, err := time.Parse(time.RFC3339, *req.CallStartedAt)
		if err != nil {
			return nil, fmt.Errorf("INVALID_TIMESTAMP: call_started_at")
		}
		setClauses = append(setClauses, fmt.Sprintf("call_started_at = $%d", argIdx))
		args = append(args, t)
		argIdx++
	}
	if req.CallAnsweredAt != nil {
		t, err := time.Parse(time.RFC3339, *req.CallAnsweredAt)
		if err != nil {
			return nil, fmt.Errorf("INVALID_TIMESTAMP: call_answered_at")
		}
		setClauses = append(setClauses, fmt.Sprintf("call_answered_at = $%d", argIdx))
		args = append(args, t)
		argIdx++
	}
	if req.CallEndedAt != nil {
		t, err := time.Parse(time.RFC3339, *req.CallEndedAt)
		if err != nil {
			return nil, fmt.Errorf("INVALID_TIMESTAMP: call_ended_at")
		}
		setClauses = append(setClauses, fmt.Sprintf("call_ended_at = $%d", argIdx))
		args = append(args, t)
		argIdx++
	}
	if req.RecordingURL != nil {
		setClauses = append(setClauses, fmt.Sprintf("recording_url = $%d", argIdx))
		args = append(args, *req.RecordingURL)
		argIdx++
	}
	if req.RecordingDuration != nil {
		setClauses = append(setClauses, fmt.Sprintf("recording_duration = $%d", argIdx))
		args = append(args, *req.RecordingDuration)
		argIdx++
	}
	if req.CallOutcome != nil {
		setClauses = append(setClauses, fmt.Sprintf("call_outcome = $%d::call_outcome", argIdx))
		args = append(args, *req.CallOutcome)
		argIdx++
	}

	if len(setClauses) == 0 {
		return nil, fmt.Errorf("NO_UPDATES")
	}

	setClauses = append(setClauses, fmt.Sprintf("updated_at = $%d", argIdx))
	args = append(args, time.Now())
	argIdx++

	args = append(args, callUUID, leadID, orgID)
	query := fmt.Sprintf(
		`UPDATE lead_calls SET %s WHERE id = $%d AND lead_id = $%d AND organization_id = $%d`,
		strings.Join(setClauses, ", "), argIdx, argIdx+1, argIdx+2,
	)

	result, err := s.DB.Exec(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update call: %w", err)
	}
	if result.RowsAffected() == 0 {
		return nil, ErrCallNotFound
	}

	return s.GetCall(ctx, leadID, callID, orgID)
}

func (s *CallService) GetUploadURL(ctx context.Context, callID, orgID, leadID, fileExt string) (*models.UploadURLResponse, error) {
	fileExt = strings.TrimPrefix(fileExt, ".")
	if fileExt == "" {
		fileExt = "m4a"
	}

	objectKey := fmt.Sprintf("recordings/%s/%s/%s.%s", orgID, leadID, callID, fileExt)
	uploadURL, err := s.Storage.GeneratePresignedUploadURL(ctx, objectKey, 1*time.Hour)
	if err != nil {
		return nil, err
	}

	return &models.UploadURLResponse{
		UploadURL: uploadURL,
		ObjectKey: objectKey,
	}, nil
}
