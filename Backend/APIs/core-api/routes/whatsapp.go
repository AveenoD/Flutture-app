package routes

import (
	"crownco/core-api/config"
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupWhatsAppRoutes(app *fiber.App, waService *services.WhatsAppService, cfg *config.Config) {
	accountHandler := handlers.NewWhatsAppAccountHandler(waService)
	waHandler := handlers.NewWhatsAppHandler(waService)
	webhookHandler := handlers.NewWebhookHandler(waService, cfg)

	api := app.Group("/api/v1")

	// Webhook (no auth - verified by Meta signature)
	api.Get("/webhook/whatsapp", webhookHandler.VerifyWebhook)
	api.Post("/webhook/whatsapp", webhookHandler.HandleWebhook)

	// WhatsApp Account CRUD (auth required)
	wa := api.Group("/whatsapp", middleware.AuthMiddleware())
	wa.Post("/accounts", accountHandler.CreateAccount)
	wa.Get("/accounts", accountHandler.GetAccounts)
	wa.Put("/accounts/:id", accountHandler.UpdateAccount)
	wa.Delete("/accounts/:id", accountHandler.DeleteAccount)
	wa.Get("/templates", waHandler.ListTemplates)

	// Lead-scoped WhatsApp messaging (auth required)
	leads := api.Group("/leads", middleware.AuthMiddleware())
	leads.Post("/:id/whatsapp/send", waHandler.SendMessage)
	leads.Get("/:id/whatsapp/conversations", waHandler.GetConversations)
	leads.Get("/:id/whatsapp/conversations/:conv_id/messages", waHandler.GetMessages)
	leads.Post("/:id/whatsapp/media/upload-url", waHandler.GetMediaUploadURL)
	leads.Get("/:id/whatsapp/live", waHandler.SSELive)
}
