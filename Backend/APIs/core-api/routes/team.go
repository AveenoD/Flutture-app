package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupTeamRoutes(app *fiber.App, service *services.TeamService) {
	handler := handlers.NewTeamHandler(service)

	// API v1 group
	api := app.Group("/api/v1")

	// Protected routes - require authentication
	teams := api.Group("/teams", middleware.AuthMiddleware())

	// Team management routes
	teams.Get("/", handler.GetAllTeams)                         // List all teams
	teams.Post("/", handler.CreateTeam)                         // Create new team
	teams.Put("/:id", handler.UpdateTeam)                       // Update team info
	teams.Get("/:id/members", handler.GetTeamMembers)           // Get team members
	teams.Post("/:id/members", handler.AddTeamMember)           // Add member to team
	teams.Delete("/:id/members", handler.RemoveTeamMember)      // Remove member from team
}
