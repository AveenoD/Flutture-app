package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupImportedDataRoutes(app *fiber.App, service *services.ImportedDataService) {
	handler := handlers.NewImportedDataHandler(service)

	// API v1 routes
	api := app.Group("/api/v1")

	// Protected routes (require authentication)
	importedData := api.Group("/imported-data", middleware.AuthMiddleware())

	// Import CSV data
	importedData.Post("/import", handler.ImportData)

	// Assign users to imported data
	importedData.Post("/:id/assign-users", handler.AssignUsers)

	// Delete imported data
	importedData.Delete("/:id", handler.DeleteImportedData)
}
