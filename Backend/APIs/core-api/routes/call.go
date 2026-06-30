package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupCallRoutes(app *fiber.App, callService *services.CallService) {
	handler := handlers.NewCallHandler(callService)

	api := app.Group("/api/v1")
	leads := api.Group("/leads", middleware.AuthMiddleware())

	leads.Post("/:id/calls/:call_id/upload-url", handler.GetUploadURL)
	leads.Get("/:id/calls/:call_id", handler.GetCall)
	leads.Patch("/:id/calls/:call_id", handler.UpdateCall)
	leads.Get("/:id/calls", handler.ListCalls)
	leads.Post("/:id/calls", handler.InitiateCall)
}
