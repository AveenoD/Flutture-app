package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// SetupLeadRoutes registers lead routes
func SetupLeadRoutes(app *fiber.App, leadService *services.LeadService, storageService *services.StorageService) {
	handler := handlers.NewLeadHandler(leadService, storageService)

	api := app.Group("/api/v1")
	leads := api.Group("/leads", middleware.AuthMiddleware())

	leads.Get("/rejected", handler.ListRejectedLeads)       // static path first so not matched as :id
	leads.Get("/by-stage/:stage", handler.GetLeadsByStage)   // before :id
	leads.Get("/stats", handler.GetLeadStats)                // before / so /stats is not matched as :id
	leads.Get("/assigned", handler.ListAssignedLeads)        // sales only; before /
	leads.Get("/", handler.ListLeads)
	// follow-ups CRUD (per lead)
	leads.Post("/:id/follow-ups", handler.CreateFollowUp)
	leads.Get("/:id/follow-ups/:followup_id", handler.GetFollowUp)
	leads.Patch("/:id/follow-ups/:followup_id/complete", handler.CompleteFollowUp)
	leads.Delete("/:id/follow-ups/:followup_id", handler.DeleteFollowUp)
	leads.Post("/:id/visits", handler.CreateVisit)
	leads.Post("/:id/visits/:visit_id/upload-url", handler.GetVisitImageUploadURL)
	leads.Get("/:id/visits/:visit_id", handler.GetVisit)
	leads.Patch("/:id/visits/:visit_id", handler.UpdateVisit)
	leads.Post("/:id/visits/:visit_id/reschedule", handler.RescheduleVisit)
	leads.Post("/:id/accept", handler.AcceptLead)
	leads.Get("/:id/stats", handler.GetLeadStatsForLead)    // before GET /:id
	leads.Get("/:id/summary", handler.GetLeadSummary)       // before GET /:id; sales only
	leads.Get("/:id", handler.GetLead)
	leads.Put("/:id", handler.UpdateLead)
	leads.Post("/:id/qualify", handler.QualifyLead)
	leads.Post("/:id/connected", handler.MarkLeadConnected)
	leads.Post("/:id/reject", handler.RejectLead)
	leads.Post("/:id/forward-stage", handler.ForwardLeadToStage)
	leads.Get("/:id/stages/by-type/:stage_type", handler.GetLeadStageByType) // before :stage_id so "by-type" matches
	leads.Get("/:id/stages/:stage_id", handler.GetLeadStage)
	leads.Patch("/:id/stages/:stage_id/remarks", handler.AddLeadStageRemark)

	api.Get("/rejection-questions", middleware.AuthMiddleware(), handler.ListRejectionQuestions)
}
