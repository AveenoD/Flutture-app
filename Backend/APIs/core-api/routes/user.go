package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupUserRoutes(app *fiber.App, userService *services.UserService) {
	userHandler := handlers.NewUserHandler(userService)

	api := app.Group("/api")
	v1 := api.Group("/v1")
	users := v1.Group("/users")

	// Protected user endpoints (require JWT authentication)
	protected := users.Group("", middleware.AuthMiddleware())
	protected.Get("", userHandler.ListUsers)
	protected.Get("/:id", userHandler.GetUserByID)
	protected.Post("", userHandler.CreateUser)
	protected.Put("/:id", userHandler.UpdateUser)
	protected.Delete("/:id", userHandler.DeleteUser)
	protected.Put("/:id/block", userHandler.BlockUser)
	protected.Post("/:id/permissions", userHandler.AddPermission)
	protected.Delete("/:id/permissions", userHandler.RemovePermission)
}
