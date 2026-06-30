package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupAuthRoutes(app *fiber.App, authService *services.AuthService) {
	authHandler := handlers.NewAuthHandler(authService)
	
	api := app.Group("/api")
	v1 := api.Group("/v1")
	auth := v1.Group("/auth")
	
	// Public authentication endpoints
	auth.Post("/login", authHandler.Login)
	auth.Post("/forgot-password", authHandler.ForgotPassword)
	auth.Post("/reset-password", authHandler.ResetPassword)
	
	// Protected endpoints (require authentication)
	protected := auth.Group("", middleware.AuthMiddleware())
	protected.Get("/me", authHandler.GetMe)
	protected.Put("/change-password", authHandler.ChangePassword)
	protected.Put("/profile", authHandler.UpdateProfile)
}
