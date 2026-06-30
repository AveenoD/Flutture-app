package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"crownco/core-api/config"
	"crownco/core-api/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrWAAccountNotFound    = errors.New("WA_ACCOUNT_NOT_FOUND")
	ErrWAConversationClosed = errors.New("CONVERSATION_CLOSED")
	ErrWAWindowExpired      = errors.New("24H_WINDOW_EXPIRED")
	ErrWAMessageNotFound    = errors.New("WA_MESSAGE_NOT_FOUND")
	ErrWAConvNotFound       = errors.New("WA_CONVERSATION_NOT_FOUND")
	ErrWAStageNotActive     = errors.New("STAGE_NOT_ACTIVE")
)

type WhatsAppService struct {
	DB           *pgxpool.Pool
	Lead         *LeadService
	MediaStorage *StorageService
	Hub          *ChatHub
	Cfg          *config.Config
	HTTPClient   *http.Client
}

func NewWhatsAppService(db *pgxpool.Pool, lead *LeadService, mediaStorage *StorageService, hub *ChatHub, cfg *config.Config) *WhatsAppService {
	return &WhatsAppService{
		DB:           db,
		Lead:         lead,
		MediaStorage: mediaStorage,
		Hub:          hub,
		Cfg:          cfg,
		HTTPClient:   &http.Client{Timeout: 30 * time.Second},
	}
}

// --- WhatsApp Account CRUD ---

func (s *WhatsAppService) CreateAccount(ctx context.Context, orgID string, req *models.CreateWhatsAppAccountRequest) (*models.WhatsAppAccountResponse, error) {
	var resp models.WhatsAppAccountResponse
	err := s.DB.QueryRow(ctx,
		`INSERT INTO whatsapp_accounts (organization_id, phone_number_id, display_phone_number, business_account_id, access_token, webhook_verify_token, app_secret)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, organization_id, phone_number_id, display_phone_number, business_account_id, status, created_at, updated_at`,
		orgID, req.PhoneNumberID, req.DisplayPhoneNumber, req.BusinessAccountID, req.AccessToken, req.WebhookVerifyToken, req.AppSecret,
	).Scan(&resp.ID, &resp.OrganizationID, &resp.PhoneNumberID, &resp.DisplayPhoneNumber, &resp.BusinessAccountID, &resp.Status, &resp.CreatedAt, &resp.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create WA account: %w", err)
	}
	return &resp, nil
}

func (s *WhatsAppService) GetAccounts(ctx context.Context, orgID string) ([]models.WhatsAppAccountResponse, error) {
	rows, err := s.DB.Query(ctx,
		`SELECT id, organization_id, phone_number_id, display_phone_number, business_account_id, status, created_at, updated_at
		 FROM whatsapp_accounts WHERE organization_id = $1 ORDER BY created_at DESC`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []models.WhatsAppAccountResponse
	for rows.Next() {
		var a models.WhatsAppAccountResponse
		if err := rows.Scan(&a.ID, &a.OrganizationID, &a.PhoneNumberID, &a.DisplayPhoneNumber, &a.BusinessAccountID, &a.Status, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		accounts = append(accounts, a)
	}
	if accounts == nil {
		accounts = []models.WhatsAppAccountResponse{}
	}
	return accounts, nil
}

func (s *WhatsAppService) UpdateAccount(ctx context.Context, accountID, orgID string, req *models.UpdateWhatsAppAccountRequest) (*models.WhatsAppAccountResponse, error) {
	sets := []string{}
	args := []interface{}{}
	idx := 1

	if req.AccessToken != nil {
		sets = append(sets, fmt.Sprintf("access_token = $%d", idx))
		args = append(args, *req.AccessToken)
		idx++
	}
	if req.WebhookVerifyToken != nil {
		sets = append(sets, fmt.Sprintf("webhook_verify_token = $%d", idx))
		args = append(args, *req.WebhookVerifyToken)
		idx++
	}
	if req.AppSecret != nil {
		sets = append(sets, fmt.Sprintf("app_secret = $%d", idx))
		args = append(args, *req.AppSecret)
		idx++
	}
	if req.Status != nil {
		sets = append(sets, fmt.Sprintf("status = $%d", idx))
		args = append(args, *req.Status)
		idx++
	}
	if len(sets) == 0 {
		return nil, errors.New("NO_UPDATES")
	}
	sets = append(sets, "updated_at = CURRENT_TIMESTAMP")

	args = append(args, accountID, orgID)
	query := fmt.Sprintf(`UPDATE whatsapp_accounts SET %s WHERE id = $%d AND organization_id = $%d
		RETURNING id, organization_id, phone_number_id, display_phone_number, business_account_id, status, created_at, updated_at`,
		strings.Join(sets, ", "), idx, idx+1)

	var resp models.WhatsAppAccountResponse
	err := s.DB.QueryRow(ctx, query, args...).Scan(&resp.ID, &resp.OrganizationID, &resp.PhoneNumberID, &resp.DisplayPhoneNumber, &resp.BusinessAccountID, &resp.Status, &resp.CreatedAt, &resp.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWAAccountNotFound
		}
		return nil, err
	}
	return &resp, nil
}

func (s *WhatsAppService) DeleteAccount(ctx context.Context, accountID, orgID string) error {
	tag, err := s.DB.Exec(ctx, `DELETE FROM whatsapp_accounts WHERE id = $1 AND organization_id = $2`, accountID, orgID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrWAAccountNotFound
	}
	return nil
}

// --- Conversations ---

func (s *WhatsAppService) getOrCreateConversation(ctx context.Context, leadID, orgID, leadStageID, userID, userType string) (string, error) {
	var convID string
	err := s.DB.QueryRow(ctx,
		`SELECT id FROM whatsapp_conversations WHERE lead_id = $1 AND organization_id = $2 AND lead_stage_id = $3 AND status = 'active'`,
		leadID, orgID, leadStageID,
	).Scan(&convID)
	if err == nil {
		return convID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	err = s.DB.QueryRow(ctx,
		`INSERT INTO whatsapp_conversations (organization_id, lead_id, lead_stage_id, user_id, user_type, status)
		 VALUES ($1, $2, $3, $4, $5::user_type, 'active')
		 RETURNING id`,
		orgID, leadID, leadStageID, userID, userType,
	).Scan(&convID)
	return convID, err
}

func (s *WhatsAppService) GetConversations(ctx context.Context, leadID, orgID string, page, limit int) (*models.ConversationListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int
	if err := s.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM whatsapp_conversations WHERE lead_id = $1 AND organization_id = $2`,
		leadID, orgID).Scan(&total); err != nil {
		return nil, err
	}

	rows, err := s.DB.Query(ctx,
		`SELECT c.id, c.organization_id, c.lead_id, c.lead_stage_id, c.user_id, c.user_type, c.status,
		        c.conversation_started_at, c.conversation_closed_at, c.last_message_at, c.last_inbound_at, c.created_at,
		        (SELECT COUNT(*) FROM whatsapp_messages WHERE conversation_id = c.id)
		 FROM whatsapp_conversations c
		 WHERE c.lead_id = $1 AND c.organization_id = $2
		 ORDER BY c.created_at DESC LIMIT $3 OFFSET $4`,
		leadID, orgID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	convos := []models.WhatsAppConversationResponse{}
	for rows.Next() {
		var c models.WhatsAppConversationResponse
		if err := rows.Scan(&c.ID, &c.OrganizationID, &c.LeadID, &c.LeadStageID, &c.UserID, &c.UserType, &c.Status,
			&c.ConversationStartedAt, &c.ConversationClosedAt, &c.LastMessageAt, &c.LastInboundAt, &c.CreatedAt, &c.MessageCount); err != nil {
			return nil, err
		}
		convos = append(convos, c)
	}

	totalPages := (total + limit - 1) / limit
	return &models.ConversationListResponse{
		Conversations: convos,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *WhatsAppService) GetMessages(ctx context.Context, leadID, convID, orgID string, page, limit int) (*models.MessageListResponse, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	var total int
	if err := s.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM whatsapp_messages m
		 JOIN whatsapp_conversations c ON c.id = m.conversation_id
		 WHERE m.conversation_id = $1 AND c.lead_id = $2 AND c.organization_id = $3`,
		convID, leadID, orgID).Scan(&total); err != nil {
		return nil, err
	}

	rows, err := s.DB.Query(ctx,
		`SELECT m.id, m.conversation_id, m.whatsapp_message_id, m.direction, m.message_type, m.message_text,
		        m.attachment_url, m.attachment_type, m.attachment_filename, m.attachment_size,
		        m.template_name, m.template_language, m.delivery_status,
		        m.sender_user_id, m.sender_user_type, m.sent_at, m.created_at
		 FROM whatsapp_messages m
		 JOIN whatsapp_conversations c ON c.id = m.conversation_id
		 WHERE m.conversation_id = $1 AND c.lead_id = $2 AND c.organization_id = $3
		 ORDER BY m.sent_at DESC LIMIT $4 OFFSET $5`,
		convID, leadID, orgID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	msgs := []models.WhatsAppMessageResponse{}
	for rows.Next() {
		var m models.WhatsAppMessageResponse
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.WAMessageID, &m.Direction, &m.MessageType, &m.MessageText,
			&m.AttachmentURL, &m.AttachmentType, &m.AttachmentFilename, &m.AttachmentSize,
			&m.TemplateName, &m.TemplateLanguage, &m.DeliveryStatus,
			&m.SenderUserID, &m.SenderUserType, &m.SentAt, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}

	totalPages := (total + limit - 1) / limit
	return &models.MessageListResponse{
		Messages: msgs,
		Pagination: models.PaginationInfo{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

// --- Send Message ---

func (s *WhatsAppService) SendMessage(ctx context.Context, leadID, orgID, userID, userType string, req *models.SendWhatsAppMessageRequest) (*models.WhatsAppMessageResponse, error) {
	// Validate stage is active
	var stageStatus string
	err := s.DB.QueryRow(ctx,
		`SELECT status FROM lead_stages WHERE id = $1 AND lead_id = $2 AND organization_id = $3`,
		req.LeadStageID, leadID, orgID,
	).Scan(&stageStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("INVALID_STAGE_ID")
		}
		return nil, err
	}
	if stageStatus != "active" {
		return nil, ErrWAStageNotActive
	}

	convID, err := s.getOrCreateConversation(ctx, leadID, orgID, req.LeadStageID, userID, userType)
	if err != nil {
		return nil, fmt.Errorf("failed to get/create conversation: %w", err)
	}

	// Check 24h window for non-template messages
	if req.MessageType != "template" {
		var lastInbound *time.Time
		_ = s.DB.QueryRow(ctx, `SELECT last_inbound_at FROM whatsapp_conversations WHERE id = $1`, convID).Scan(&lastInbound)
		if lastInbound != nil && time.Since(*lastInbound) > 24*time.Hour {
			return nil, ErrWAWindowExpired
		}
	}

	// Get org's WhatsApp account
	var phoneNumberID, accessToken string
	err = s.DB.QueryRow(ctx,
		`SELECT phone_number_id, access_token FROM whatsapp_accounts WHERE organization_id = $1 AND status = 'active' LIMIT 1`,
		orgID,
	).Scan(&phoneNumberID, &accessToken)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWAAccountNotFound
		}
		return nil, err
	}

	// Get lead phone
	var leadPhone string
	err = s.DB.QueryRow(ctx, `SELECT phone FROM leads WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`, leadID, orgID).Scan(&leadPhone)
	if err != nil {
		return nil, ErrLeadNotFound
	}

	// Build Meta API payload
	waPayload := s.buildMetaPayload(leadPhone, req)

	// Send to Meta API
	waMessageID, sendErr := s.sendToMeta(ctx, phoneNumberID, accessToken, waPayload)

	deliveryStatus := "sent"
	if sendErr != nil {
		deliveryStatus = "failed"
	}

	// For media messages, if attachment is a B2 object key, generate download URL
	attachmentURL := req.AttachmentURL
	attachmentType := ""
	if req.MessageType == "image" || req.MessageType == "document" || req.MessageType == "audio" || req.MessageType == "video" {
		attachmentType = req.MessageType
	}

	// Store message in DB regardless of send success
	var msg models.WhatsAppMessageResponse
	err = s.DB.QueryRow(ctx,
		`INSERT INTO whatsapp_messages (conversation_id, whatsapp_message_id, direction, message_type, message_text,
		 attachment_url, attachment_type, attachment_filename, delivery_status, sender_user_id, sender_user_type,
		 template_name, template_language)
		 VALUES ($1, $2, 'outbound', $3::message_type, $4, $5, $6, $7, $8::delivery_status, $9, $10::user_type, $11, $12)
		 RETURNING id, conversation_id, whatsapp_message_id, direction, message_type, message_text,
		 attachment_url, attachment_type, attachment_filename, attachment_size,
		 template_name, template_language, delivery_status, sender_user_id, sender_user_type, sent_at, created_at`,
		convID, waMessageID, req.MessageType, req.MessageText,
		attachmentURL, nilIfEmpty(attachmentType), req.AttachmentFilename,
		deliveryStatus, userID, userType, req.TemplateName, req.TemplateLanguage,
	).Scan(&msg.ID, &msg.ConversationID, &msg.WAMessageID, &msg.Direction, &msg.MessageType, &msg.MessageText,
		&msg.AttachmentURL, &msg.AttachmentType, &msg.AttachmentFilename, &msg.AttachmentSize,
		&msg.TemplateName, &msg.TemplateLanguage, &msg.DeliveryStatus,
		&msg.SenderUserID, &msg.SenderUserType, &msg.SentAt, &msg.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to store message: %w", err)
	}

	// Update conversation timestamps
	_, _ = s.DB.Exec(ctx,
		`UPDATE whatsapp_conversations SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, convID)

	// Publish to SSE
	s.Hub.Publish(leadID, models.ChatEvent{Type: "new_message", Payload: msg})

	if sendErr != nil {
		return &msg, fmt.Errorf("message stored but Meta API send failed: %w", sendErr)
	}

	return &msg, nil
}

func (s *WhatsAppService) buildMetaPayload(phone string, req *models.SendWhatsAppMessageRequest) map[string]interface{} {
	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                phone,
		"type":              req.MessageType,
	}

	switch req.MessageType {
	case "text":
		payload["text"] = map[string]interface{}{"body": *req.MessageText}
	case "template":
		tmpl := map[string]interface{}{
			"name": *req.TemplateName,
			"language": map[string]interface{}{
				"code": *req.TemplateLanguage,
			},
		}
		if req.TemplateComponents != nil {
			tmpl["components"] = req.TemplateComponents
		}
		payload["template"] = tmpl
	case "image", "document", "audio", "video":
		media := map[string]interface{}{}
		if req.AttachmentURL != nil {
			downloadURL := *req.AttachmentURL
			if !strings.HasPrefix(downloadURL, "http") {
				url, err := s.MediaStorage.GeneratePresignedDownloadURL(context.Background(), downloadURL, 1*time.Hour)
				if err == nil {
					downloadURL = url
				}
			}
			media["link"] = downloadURL
		}
		if req.MessageType == "image" || req.MessageType == "video" {
			if req.MessageText != nil {
				media["caption"] = *req.MessageText
			}
		}
		if req.MessageType == "document" && req.AttachmentFilename != nil {
			media["filename"] = *req.AttachmentFilename
		}
		payload[req.MessageType] = media
	}

	return payload
}

func (s *WhatsAppService) sendToMeta(ctx context.Context, phoneNumberID, accessToken string, payload map[string]interface{}) (*string, error) {
	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", s.Cfg.WAGraphAPIVersion, phoneNumberID)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("Meta API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Meta API returned %d: %s", resp.StatusCode, string(respBody))
	}

	var metaResp struct {
		Messages []struct {
			ID string `json:"id"`
		} `json:"messages"`
	}
	if err := json.Unmarshal(respBody, &metaResp); err != nil {
		return nil, err
	}
	if len(metaResp.Messages) > 0 {
		return &metaResp.Messages[0].ID, nil
	}
	return nil, nil
}

// --- Webhook Handling ---

func (s *WhatsAppService) HandleWebhook(ctx context.Context, payload *models.WAWebhookPayload) error {
	for _, entry := range payload.Entry {
		for _, change := range entry.Changes {
			if change.Field != "messages" {
				continue
			}
			val := change.Value
			phoneNumberID := val.Metadata.PhoneNumberID

			// Find org by phone_number_id
			var orgID, accessToken string
			err := s.DB.QueryRow(ctx,
				`SELECT organization_id, access_token FROM whatsapp_accounts WHERE phone_number_id = $1 AND status = 'active' LIMIT 1`,
				phoneNumberID,
			).Scan(&orgID, &accessToken)
			if err != nil {
				continue
			}

			// Handle status updates
			for _, status := range val.Statuses {
				s.handleStatusUpdate(ctx, status)
			}

			// Handle incoming messages
			for _, msg := range val.Messages {
				go s.handleIncomingMessage(ctx, orgID, accessToken, msg)
			}
		}
	}
	return nil
}

func (s *WhatsAppService) handleStatusUpdate(ctx context.Context, status models.WAWebhookStatus) {
	deliveryStatus := status.Status
	switch deliveryStatus {
	case "sent", "delivered", "read", "failed":
	default:
		return
	}

	_, _ = s.DB.Exec(ctx,
		`UPDATE whatsapp_messages SET delivery_status = $1::delivery_status WHERE whatsapp_message_id = $2`,
		deliveryStatus, status.ID)

	// Find lead_id for SSE
	var leadID string
	err := s.DB.QueryRow(ctx,
		`SELECT c.lead_id FROM whatsapp_conversations c
		 JOIN whatsapp_messages m ON m.conversation_id = c.id
		 WHERE m.whatsapp_message_id = $1 LIMIT 1`, status.ID).Scan(&leadID)
	if err == nil {
		s.Hub.Publish(leadID, models.ChatEvent{
			Type:    "status_update",
			Payload: map[string]string{"whatsapp_message_id": status.ID, "status": deliveryStatus},
		})
	}
}

func (s *WhatsAppService) handleIncomingMessage(ctx context.Context, orgID, accessToken string, msg models.WAWebhookMessage) {
	senderPhone := msg.From

	// Find lead by phone
	var leadID string
	err := s.DB.QueryRow(ctx,
		`SELECT id FROM leads WHERE organization_id = $1 AND (phone = $2 OR phone = $3) AND deleted_at IS NULL LIMIT 1`,
		orgID, senderPhone, "+"+senderPhone,
	).Scan(&leadID)
	if err != nil {
		return
	}

	// Find active stage
	var stageID string
	err = s.DB.QueryRow(ctx,
		`SELECT id FROM lead_stages WHERE lead_id = $1 AND organization_id = $2 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
		leadID, orgID,
	).Scan(&stageID)
	if err != nil {
		return
	}

	// Get or create conversation
	convID, err := s.getOrCreateConversation(ctx, leadID, orgID, stageID, "", "")
	if err != nil {
		return
	}

	// Check idempotency
	var existing int
	_ = s.DB.QueryRow(ctx, `SELECT 1 FROM whatsapp_messages WHERE whatsapp_message_id = $1`, msg.ID).Scan(&existing)
	if existing == 1 {
		return
	}

	msgType := msg.Type
	var messageText *string
	var attachmentURL, attachmentType, attachmentFilename *string

	switch msgType {
	case "text":
		if msg.Text != nil {
			messageText = &msg.Text.Body
		}
	case "image", "document", "audio", "video":
		var media *models.WAWebhookMedia
		switch msgType {
		case "image":
			media = msg.Image
		case "document":
			media = msg.Document
		case "audio":
			media = msg.Audio
		case "video":
			media = msg.Video
		}
		if media != nil {
			if media.Caption != nil {
				messageText = media.Caption
			}
			attachmentType = &media.MimeType
			attachmentFilename = media.Filename

			objectKey, dlErr := s.downloadAndStoreMedia(ctx, media.ID, accessToken, orgID, leadID, msgType)
			if dlErr == nil && objectKey != "" {
				attachmentURL = &objectKey
			}
		}
	default:
		t := "text"
		msgType = t
		unsupported := "[Unsupported message type: " + msg.Type + "]"
		messageText = &unsupported
	}

	// Parse timestamp
	ts, _ := strconv.ParseInt(msg.Timestamp, 10, 64)
	sentAt := time.Unix(ts, 0)

	var storedMsg models.WhatsAppMessageResponse
	err = s.DB.QueryRow(ctx,
		`INSERT INTO whatsapp_messages (conversation_id, whatsapp_message_id, direction, message_type, message_text,
		 attachment_url, attachment_type, attachment_filename, delivery_status, sent_at)
		 VALUES ($1, $2, 'inbound', $3::message_type, $4, $5, $6, $7, 'delivered'::delivery_status, $8)
		 RETURNING id, conversation_id, whatsapp_message_id, direction, message_type, message_text,
		 attachment_url, attachment_type, attachment_filename, attachment_size,
		 template_name, template_language, delivery_status, sender_user_id, sender_user_type, sent_at, created_at`,
		convID, msg.ID, msgType, messageText, attachmentURL, attachmentType, attachmentFilename, sentAt,
	).Scan(&storedMsg.ID, &storedMsg.ConversationID, &storedMsg.WAMessageID, &storedMsg.Direction, &storedMsg.MessageType,
		&storedMsg.MessageText, &storedMsg.AttachmentURL, &storedMsg.AttachmentType, &storedMsg.AttachmentFilename,
		&storedMsg.AttachmentSize, &storedMsg.TemplateName, &storedMsg.TemplateLanguage, &storedMsg.DeliveryStatus,
		&storedMsg.SenderUserID, &storedMsg.SenderUserType, &storedMsg.SentAt, &storedMsg.CreatedAt)
	if err != nil {
		return
	}

	_, _ = s.DB.Exec(ctx,
		`UPDATE whatsapp_conversations SET last_message_at = CURRENT_TIMESTAMP, last_inbound_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, convID)

	s.Hub.Publish(leadID, models.ChatEvent{Type: "new_message", Payload: storedMsg})
}

func (s *WhatsAppService) downloadAndStoreMedia(ctx context.Context, mediaID, accessToken, orgID, leadID, mediaType string) (string, error) {
	// Step 1: Get media URL from Meta
	url := fmt.Sprintf("https://graph.facebook.com/%s/%s", s.Cfg.WAGraphAPIVersion, mediaID)
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var mediaInfo struct {
		URL      string `json:"url"`
		MimeType string `json:"mime_type"`
		FileSize int    `json:"file_size"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&mediaInfo); err != nil {
		return "", err
	}

	// Step 2: Download the media
	dlReq, _ := http.NewRequestWithContext(ctx, "GET", mediaInfo.URL, nil)
	dlReq.Header.Set("Authorization", "Bearer "+accessToken)
	dlResp, err := s.HTTPClient.Do(dlReq)
	if err != nil {
		return "", err
	}
	defer dlResp.Body.Close()

	mediaBytes, err := io.ReadAll(dlResp.Body)
	if err != nil {
		return "", err
	}

	// Step 3: Upload to B2
	ext := guessExtension(mediaInfo.MimeType)
	objectKey := fmt.Sprintf("wa-media/%s/%s/%s/%s%s", orgID, leadID, mediaType, uuid.New().String(), ext)

	uploadURL, err := s.MediaStorage.GeneratePresignedUploadURL(ctx, objectKey, 15*time.Minute)
	if err != nil {
		return "", err
	}

	putReq, _ := http.NewRequestWithContext(ctx, "PUT", uploadURL, bytes.NewReader(mediaBytes))
	putReq.ContentLength = int64(len(mediaBytes))
	putReq.Header.Set("Content-Type", mediaInfo.MimeType)
	putResp, err := s.HTTPClient.Do(putReq)
	if err != nil {
		return "", err
	}
	defer putResp.Body.Close()

	if putResp.StatusCode >= 300 {
		return "", fmt.Errorf("B2 upload failed with status %d", putResp.StatusCode)
	}

	return objectKey, nil
}

// --- Templates ---

func (s *WhatsAppService) ListTemplates(ctx context.Context, orgID string) ([]models.WATemplateResponse, error) {
	var wabaID, accessToken string
	err := s.DB.QueryRow(ctx,
		`SELECT business_account_id, access_token FROM whatsapp_accounts WHERE organization_id = $1 AND status = 'active' LIMIT 1`,
		orgID,
	).Scan(&wabaID, &accessToken)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrWAAccountNotFound
		}
		return nil, err
	}

	url := fmt.Sprintf("https://graph.facebook.com/%s/%s/message_templates?fields=name,language,status,category,components&limit=100",
		s.Cfg.WAGraphAPIVersion, wabaID)

	httpReq, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var metaResp struct {
		Data []models.WATemplateResponse `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&metaResp); err != nil {
		return nil, err
	}

	if metaResp.Data == nil {
		metaResp.Data = []models.WATemplateResponse{}
	}
	return metaResp.Data, nil
}

// --- Media Upload URL ---

func (s *WhatsAppService) GetMediaUploadURL(ctx context.Context, leadID, orgID, fileExt string) (*models.WAMediaUploadURLResponse, error) {
	objectKey := fmt.Sprintf("wa-media/%s/%s/outbound/%s%s", orgID, leadID, uuid.New().String(), normalizeExt(fileExt))
	uploadURL, err := s.MediaStorage.GeneratePresignedUploadURL(ctx, objectKey, 15*time.Minute)
	if err != nil {
		return nil, err
	}
	return &models.WAMediaUploadURLResponse{
		UploadURL: uploadURL,
		ObjectKey: objectKey,
	}, nil
}

// --- Mark as Read ---

func (s *WhatsAppService) MarkAsRead(ctx context.Context, orgID, waMessageID string) error {
	var phoneNumberID, accessToken string
	err := s.DB.QueryRow(ctx,
		`SELECT phone_number_id, access_token FROM whatsapp_accounts WHERE organization_id = $1 AND status = 'active' LIMIT 1`,
		orgID,
	).Scan(&phoneNumberID, &accessToken)
	if err != nil {
		return ErrWAAccountNotFound
	}

	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"status":            "read",
		"message_id":        waMessageID,
	}
	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://graph.facebook.com/%s/%s/messages", s.Cfg.WAGraphAPIVersion, phoneNumberID)

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := s.HTTPClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

// --- Helpers ---

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func normalizeExt(ext string) string {
	if !strings.HasPrefix(ext, ".") {
		return "." + ext
	}
	return ext
}

func guessExtension(mimeType string) string {
	switch {
	case strings.Contains(mimeType, "jpeg"), strings.Contains(mimeType, "jpg"):
		return ".jpg"
	case strings.Contains(mimeType, "png"):
		return ".png"
	case strings.Contains(mimeType, "webp"):
		return ".webp"
	case strings.Contains(mimeType, "pdf"):
		return ".pdf"
	case strings.Contains(mimeType, "mp4"):
		return ".mp4"
	case strings.Contains(mimeType, "ogg"):
		return ".ogg"
	case strings.Contains(mimeType, "opus"):
		return ".opus"
	case strings.Contains(mimeType, "mp3"), strings.Contains(mimeType, "mpeg"):
		return ".mp3"
	default:
		return ".bin"
	}
}
