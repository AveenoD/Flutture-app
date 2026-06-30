package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"

	"crownco/core-api/config"
	"crownco/core-api/models"
	"crownco/core-api/responses"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

type WebhookHandler struct {
	service *services.WhatsAppService
	cfg     *config.Config
}

func NewWebhookHandler(service *services.WhatsAppService, cfg *config.Config) *WebhookHandler {
	return &WebhookHandler{service: service, cfg: cfg}
}

func (h *WebhookHandler) VerifyWebhook(c *fiber.Ctx) error {
	mode := c.Query("hub.mode")
	token := c.Query("hub.verify_token")
	challenge := c.Query("hub.challenge")

	if mode == "subscribe" && token == h.cfg.WAVerifyToken {
		return c.Status(fiber.StatusOK).SendString(challenge)
	}
	return c.Status(fiber.StatusForbidden).SendString("Verification failed")
}

func (h *WebhookHandler) HandleWebhook(c *fiber.Ctx) error {
	// Verify signature if app secret is configured
	if h.cfg.WAAppSecret != "" {
		signature := c.Get("X-Hub-Signature-256")
		if signature == "" {
			return c.Status(fiber.StatusUnauthorized).SendString("Missing signature")
		}

		body := c.Body()
		if !verifySignature(body, signature, h.cfg.WAAppSecret) {
			return c.Status(fiber.StatusUnauthorized).SendString("Invalid signature")
		}
	}

	var payload models.WAWebhookPayload
	if err := c.BodyParser(&payload); err != nil {
		return responses.ErrorResponse(c, fiber.StatusBadRequest, "Invalid webhook payload", nil)
	}

	// Process async to respond quickly to Meta
	go func() {
		_ = h.service.HandleWebhook(c.Context(), &payload)
	}()

	return c.Status(fiber.StatusOK).SendString("OK")
}

func verifySignature(body []byte, signature, secret string) bool {
	// signature format: "sha256=<hex>"
	if len(signature) < 8 || signature[:7] != "sha256=" {
		return false
	}
	expectedSig := signature[7:]

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	computedSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(computedSig), []byte(expectedSig))
}
