package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupProjectRoutes(app *fiber.App, service *services.ProjectService) {
	handler := handlers.NewProjectHandler(service)

	// API v1 routes
	api := app.Group("/api/v1")

	// Protected routes (require authentication)
	projects := api.Group("/projects", middleware.AuthMiddleware())

	// Project endpoints
	projects.Post("/", handler.CreateProject)                    // Create project
	projects.Get("/", handler.ListProjects)                      // List projects with filters
	projects.Get("/search", handler.SearchProjects)              // Search projects
	projects.Get("/:id", handler.GetProject)                     // Get project by ID
	projects.Put("/:id", handler.UpdateProject)                  // Update project
	projects.Delete("/:id", handler.DeleteProject)               // Delete project
	projects.Get("/:id/stats", handler.GetProjectStats)          // Get project statistics

	// Unit endpoints
	projects.Post("/:project_id/units", handler.CreateUnit)                    // Create single unit
	projects.Post("/:project_id/units/bulk", handler.BulkCreateUnits)          // Bulk create units
	projects.Get("/:project_id/units", handler.ListUnits)                      // List units with filters
	projects.Get("/:project_id/units/:unit_id", handler.GetUnit)               // Get unit by ID
	projects.Put("/:project_id/units/:unit_id", handler.UpdateUnit)            // Update unit
	projects.Delete("/:project_id/units/:unit_id", handler.DeleteUnit)         // Delete unit

	// Addon endpoints
	projects.Post("/:project_id/addons", handler.CreateAddon)                  // Create addon
	projects.Get("/:project_id/addons", handler.ListAddons)                    // List addons with filters
	projects.Get("/:project_id/addons/:addon_id", handler.GetAddon)            // Get addon by ID
	projects.Put("/:project_id/addons/:addon_id", handler.UpdateAddon)         // Update addon
	projects.Delete("/:project_id/addons/:addon_id", handler.DeleteAddon)      // Delete addon
}
