package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// SetupLeadSourcingRoutes registers all lead-sourcing endpoints under /api/v1.
// All routes require a valid JWT (AuthMiddleware).
func SetupLeadSourcingRoutes(app *fiber.App, svc *services.LeadSourcingService) {
	h := handlers.NewLeadSourcingHandler(svc)

	api := app.Group("/api/v1", middleware.AuthMiddleware())

	// Organization API credentials
	orgAPIs := api.Group("/organization-apis")
	orgAPIs.Post("/", h.CreateOrgAPI)
	orgAPIs.Get("/", h.ListOrgAPIs)
	orgAPIs.Get("/:id", h.GetOrgAPI)
	orgAPIs.Put("/:id", h.UpdateOrgAPI)
	orgAPIs.Delete("/:id", h.DeleteOrgAPI)

	// Lead sourcing configs
	configs := api.Group("/lead-sourcing-configs")
	configs.Post("/", h.CreateSourcingConfig)
	configs.Get("/", h.ListSourcingConfigs)
	configs.Get("/:id", h.GetSourcingConfig)
	configs.Put("/:id", h.UpdateSourcingConfig)
	configs.Delete("/:id", h.DeleteSourcingConfig)
	configs.Post("/:id/sync-now", h.SyncNow)

	// External project ID → internal project UUID mappings
	mappings := api.Group("/external-project-mappings")
	mappings.Post("/", h.CreateProjectMapping)
	mappings.Get("/", h.ListProjectMappings)
	mappings.Put("/:id", h.UpdateProjectMapping)
	mappings.Delete("/:id", h.DeleteProjectMapping)

	// Sync logs (read-only)
	api.Get("/lead-sync-logs", h.ListSyncLogs)
}
