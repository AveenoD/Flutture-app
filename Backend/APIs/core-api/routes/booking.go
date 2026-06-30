package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

// SetupBookingRoutes registers booking and document routes under /api/v1/leads
func SetupBookingRoutes(app *fiber.App, bookingService *services.BookingService) {
	handler := handlers.NewBookingHandler(bookingService)

	api := app.Group("/api/v1")
	leads := api.Group("/leads", middleware.AuthMiddleware())

	// More specific paths first
	leads.Post("/:id/booking/submit", handler.SubmitBooking)
	leads.Post("/:id/booking/confirm", handler.ConfirmBooking)
	leads.Post("/:id/booking/cancel", handler.CancelBooking)
	leads.Post("/:id/booking/documents/upload-url", handler.GetDocumentUploadURL)
	leads.Post("/:id/booking/documents", handler.AddBookingDocument)
	leads.Get("/:id/booking/documents", handler.ListBookingDocuments)
	leads.Get("/:id/booking/documents/:did", handler.GetBookingDocument)
	leads.Patch("/:id/booking/documents/:did", handler.UpdateBookingDocument)
	leads.Delete("/:id/booking/documents/:did", handler.DeleteBookingDocument)
	leads.Get("/:id/booking", handler.GetBooking)
	leads.Patch("/:id/booking", handler.UpdateBooking)
}
