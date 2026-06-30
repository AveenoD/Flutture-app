package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// SetupRoutingRoutes registers routing rules and lead routing routes
func SetupRoutingRoutes(app *fiber.App, routingRulesService *services.RoutingRulesService, teamService *services.TeamService) {
	handler := handlers.NewRoutingHandler(routingRulesService, teamService)

	api := app.Group("/api/v1")
	routing := api.Group("/routing-rules", middleware.AuthMiddleware())

	routing.Get("/", handler.ListRules)
	routing.Get("/:id", handler.GetRule)
	routing.Post("/", handler.CreateRule)
	routing.Put("/:id", handler.UpdateRule)
	routing.Delete("/:id", handler.DeleteRule)
	routing.Patch("/:id/status", handler.UpdateRuleStatus)
}
