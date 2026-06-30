package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// SetupDashboardRoutes registers dashboard and analytics routes.
func SetupDashboardRoutes(app *fiber.App, dashboardService *services.DashboardService, leadService *services.LeadService) {
	handler := handlers.NewDashboardHandler(dashboardService, leadService)

	api := app.Group("/api/v1")
	dash := api.Group("/dashboard", middleware.AuthMiddleware())

	dash.Get("/", handler.GetDashboard)
	dash.Get("/leaderboard", handler.GetLeaderboard)
}
