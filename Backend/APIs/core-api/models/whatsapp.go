package models

import "time"

// --- WhatsApp Account ---

type CreateWhatsAppAccountRequest struct {
	PhoneNumberID      string `json:"phone_number_id" validate:"required"`
	DisplayPhoneNumber string `json:"display_phone_number" validate:"required"`
	BusinessAccountID  string `json:"business_account_id" validate:"required"`
	AccessToken        string `json:"access_token" validate:"required"`
	WebhookVerifyToken string `json:"webhook_verify_token,omitempty"`
	AppSecret          string `json:"app_secret,omitempty"`
}

type UpdateWhatsAppAccountRequest struct {
	AccessToken        *string `json:"access_token,omitempty"`
	WebhookVerifyToken *string `json:"webhook_verify_token,omitempty"`
	AppSecret          *string `json:"app_secret,omitempty"`
	Status             *string `json:"status,omitempty"`
}

type WhatsAppAccountResponse struct {
	ID                 string    `json:"id"`
	OrganizationID     string    `json:"organization_id"`
	PhoneNumberID      string    `json:"phone_number_id"`
	DisplayPhoneNumber string    `json:"display_phone_number"`
	BusinessAccountID  string    `json:"business_account_id"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// --- Send Message ---

type SendWhatsAppMessageRequest struct {
	LeadStageID        string                 `json:"lead_stage_id" validate:"required"`
	MessageType        string                 `json:"message_type" validate:"required,oneof=text template image document audio video"`
	MessageText        *string                `json:"message_text,omitempty"`
	TemplateName       *string                `json:"template_name,omitempty"`
	TemplateLanguage   *string                `json:"template_language,omitempty"`
	TemplateComponents interface{}            `json:"template_components,omitempty"`
	AttachmentURL      *string                `json:"attachment_url,omitempty"`
	AttachmentFilename *string                `json:"attachment_filename,omitempty"`
}

type WhatsAppMessageResponse struct {
	ID              string    `json:"id"`
	ConversationID  string    `json:"conversation_id"`
	WAMessageID     *string   `json:"whatsapp_message_id,omitempty"`
	Direction       string    `json:"direction"`
	MessageType     string    `json:"message_type"`
	MessageText     *string   `json:"message_text,omitempty"`
	AttachmentURL   *string   `json:"attachment_url,omitempty"`
	AttachmentType  *string   `json:"attachment_type,omitempty"`
	AttachmentFilename *string `json:"attachment_filename,omitempty"`
	AttachmentSize  *int64    `json:"attachment_size,omitempty"`
	TemplateName    *string   `json:"template_name,omitempty"`
	TemplateLanguage *string  `json:"template_language,omitempty"`
	DeliveryStatus  string    `json:"delivery_status"`
	SenderUserID    *string   `json:"sender_user_id,omitempty"`
	SenderUserType  *string   `json:"sender_user_type,omitempty"`
	SentAt          time.Time `json:"sent_at"`
	CreatedAt       time.Time `json:"created_at"`
}

// --- Conversations ---

type WhatsAppConversationResponse struct {
	ID                  string     `json:"id"`
	OrganizationID      string     `json:"organization_id"`
	LeadID              string     `json:"lead_id"`
	LeadStageID         *string    `json:"lead_stage_id,omitempty"`
	UserID              *string    `json:"user_id,omitempty"`
	UserType            *string    `json:"user_type,omitempty"`
	Status              string     `json:"status"`
	ConversationStartedAt time.Time `json:"conversation_started_at"`
	ConversationClosedAt *time.Time `json:"conversation_closed_at,omitempty"`
	LastMessageAt       *time.Time `json:"last_message_at,omitempty"`
	LastInboundAt       *time.Time `json:"last_inbound_at,omitempty"`
	MessageCount        int        `json:"message_count"`
	CreatedAt           time.Time  `json:"created_at"`
}

type ConversationListResponse struct {
	Conversations []WhatsAppConversationResponse `json:"conversations"`
	Pagination    PaginationInfo                 `json:"pagination"`
}

type MessageListResponse struct {
	Messages   []WhatsAppMessageResponse `json:"messages"`
	Pagination PaginationInfo            `json:"pagination"`
}

// --- Media ---

type WAMediaUploadURLRequest struct {
	FileExtension string `json:"file_extension" validate:"required"`
	ContentType   string `json:"content_type,omitempty"`
}

type WAMediaUploadURLResponse struct {
	UploadURL string `json:"upload_url"`
	ObjectKey string `json:"object_key"`
}

// --- Templates ---

type WATemplateResponse struct {
	Name       string `json:"name"`
	Language   string `json:"language"`
	Status     string `json:"status"`
	Category   string `json:"category"`
	Components interface{} `json:"components,omitempty"`
}

type WATemplateListResponse struct {
	Templates []WATemplateResponse `json:"templates"`
}

// --- Webhook Payloads (Meta Cloud API) ---

type WAWebhookPayload struct {
	Object string            `json:"object"`
	Entry  []WAWebhookEntry  `json:"entry"`
}

type WAWebhookEntry struct {
	ID      string             `json:"id"`
	Changes []WAWebhookChange  `json:"changes"`
}

type WAWebhookChange struct {
	Value WAWebhookValue `json:"value"`
	Field string         `json:"field"`
}

type WAWebhookValue struct {
	MessagingProduct string              `json:"messaging_product"`
	Metadata         WAWebhookMetadata   `json:"metadata"`
	Contacts         []WAWebhookContact  `json:"contacts,omitempty"`
	Messages         []WAWebhookMessage  `json:"messages,omitempty"`
	Statuses         []WAWebhookStatus   `json:"statuses,omitempty"`
}

type WAWebhookMetadata struct {
	DisplayPhoneNumber string `json:"display_phone_number"`
	PhoneNumberID      string `json:"phone_number_id"`
}

type WAWebhookContact struct {
	Profile WAWebhookProfile `json:"profile"`
	WaID    string           `json:"wa_id"`
}

type WAWebhookProfile struct {
	Name string `json:"name"`
}

type WAWebhookMessage struct {
	From      string              `json:"from"`
	ID        string              `json:"id"`
	Timestamp string              `json:"timestamp"`
	Type      string              `json:"type"`
	Text      *WAWebhookText      `json:"text,omitempty"`
	Image     *WAWebhookMedia     `json:"image,omitempty"`
	Document  *WAWebhookMedia     `json:"document,omitempty"`
	Audio     *WAWebhookMedia     `json:"audio,omitempty"`
	Video     *WAWebhookMedia     `json:"video,omitempty"`
}

type WAWebhookText struct {
	Body string `json:"body"`
}

type WAWebhookMedia struct {
	ID       string  `json:"id"`
	MimeType string  `json:"mime_type"`
	SHA256   string  `json:"sha256"`
	Caption  *string `json:"caption,omitempty"`
	Filename *string `json:"filename,omitempty"`
}

type WAWebhookStatus struct {
	ID          string `json:"id"`
	Status      string `json:"status"`
	Timestamp   string `json:"timestamp"`
	RecipientID string `json:"recipient_id"`
}

// --- SSE Events ---

type ChatEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}
