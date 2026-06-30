package routes

import (
	"crownco/core-api/handlers"
	"crownco/core-api/middleware"
	"crownco/core-api/services"

	"github.com/gofiber/fiber/v2"
)

func SetupSubscriptionRoutes(app *fiber.App, subscriptionService *services.SubscriptionService) {
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionService)

	api := app.Group("/api")
	v1 := api.Group("/v1")

	// Plans endpoint (public or authenticated)
	plans := v1.Group("/plans")
	plans.Get("", subscriptionHandler.GetPlans)

	// Subscription endpoints (protected)
	subscription := v1.Group("/subscription", middleware.AuthMiddleware())
	subscription.Get("", subscriptionHandler.GetCurrentSubscription) // GET /api/v1/subscription

	subscriptions := v1.Group("/subscriptions", middleware.AuthMiddleware())
	subscriptions.Post("", subscriptionHandler.CreateSubscription)
	subscriptions.Put("/:id", subscriptionHandler.UpdateSubscription)
	subscriptions.Post("/:id/cancel", subscriptionHandler.CancelSubscription)
	subscriptions.Post("/:id/renew", subscriptionHandler.RenewSubscription)
}
