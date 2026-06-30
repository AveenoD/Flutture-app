package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupOrganizationRoutes(app *fiber.App, orgService *services.OrganizationService) {
	orgHandler := handlers.NewOrganizationHandler(orgService)

	api := app.Group("/api")
	v1 := api.Group("/v1")
	org := v1.Group("/organizations")

	// Organization onboarding endpoint (public)
	org.Post("/onboard", orgHandler.OnboardOrganization)

	// Protected organization endpoints (require JWT authentication)
	protected := org.Group("", middleware.AuthMiddleware())
	protected.Put("/update", orgHandler.UpdateOrganization)
}
