package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// SetupNegotiationRoutes registers negotiation and quotation routes under /api/v1/leads
func SetupNegotiationRoutes(app *fiber.App, negotiationService *services.NegotiationService) {
	handler := handlers.NewNegotiationHandler(negotiationService)

	api := app.Group("/api/v1")
	leads := api.Group("/leads", middleware.AuthMiddleware())

	// Org-wide quotation list + KPIs (register /stats before / so "stats" is not captured as :id)
	quotations := api.Group("/quotations", middleware.AuthMiddleware())
	quotations.Get("/stats", handler.GetQuotationStats)
	quotations.Get("/", handler.ListQuotationsForOrg)

	// Negotiation (single per lead) - more specific paths first
	leads.Get("/:id/negotiation/price-breakdown", handler.GetPriceBreakdown)
	leads.Post("/:id/negotiation/submit", handler.SubmitNegotiation)
	leads.Post("/:id/negotiation/approve", handler.ApproveNegotiation)
	leads.Post("/:id/negotiation/reject", handler.RejectNegotiation)
	leads.Post("/:id/negotiation", handler.CreateNegotiation)
	leads.Get("/:id/negotiation", handler.GetNegotiation)
	leads.Patch("/:id/negotiation", handler.UpdateNegotiation)

	// Quotations — more specific sub-paths first
	leads.Post("/:id/quotations/:qid/approve", handler.ApproveQuotation)
	leads.Post("/:id/quotations/:qid/reject", handler.RejectQuotation)
	leads.Post("/:id/quotations/:qid/share", handler.ShareQuotation)
	leads.Post("/:id/quotations", handler.CreateQuotation)
	leads.Get("/:id/quotations", handler.ListQuotations)
	leads.Get("/:id/quotations/:qid", handler.GetQuotation)
	leads.Patch("/:id/quotations/:qid", handler.UpdateQuotation)
}
