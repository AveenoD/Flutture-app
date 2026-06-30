package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"crownco/core-api/config"
	"crownco/core-api/database"
	"crownco/core-api/routes"
	"crownco/core-api/services"
	ls "crownco/core-api/services/lead_sourcing"
	"crownco/core-api/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Initialize database
	database.InitPostgres()
	defer database.ClosePostgres()

	// Initialize Redis
	database.InitRedis()
	defer database.CloseRedis()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Crownco Core API",
		ErrorHandler: customErrorHandler,
	})

	// Middleware
	app.Use(recover.New())
	// Colored request/response logs to console for all APIs
	app.Use(utils.RequestResponseLogger())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))

	// Initialize services
	orgService := services.NewOrganizationService(database.PgPool)
	authService := services.NewAuthService(database.PgPool)
	userService := services.NewUserService(database.PgPool)
	subscriptionService := services.NewSubscriptionService(database.PgPool)
	teamService := services.NewTeamService(database.PgPool)
	leadRoutingService := services.NewLeadRoutingService(database.PgPool)
	importedDataService := services.NewImportedDataService(database.PgPool, leadRoutingService)
	projectService := services.NewProjectService(database.PgPool)
	routingRulesService := services.NewRoutingRulesService(database.PgPool)
	dashboardService := services.NewDashboardService(database.PgPool)

	cfg := config.LoadConfig()
	storageService, err := services.NewStorageService(cfg)
	if err != nil {
		log.Printf("WARNING: Storage service init failed (B2 uploads disabled): %v", err)
		storageService = &services.StorageService{}
	}
	leadService := services.NewLeadService(database.PgPool, leadRoutingService, storageService)
	negotiationService := services.NewNegotiationService(database.PgPool, leadService)
	bookingService := services.NewBookingService(database.PgPool, leadService, storageService)
	callService := services.NewCallService(database.PgPool, leadService, storageService)

	mediaStorageService, err := services.NewStorageService(cfg, cfg.WAMediaBucketName)
	if err != nil {
		log.Printf("WARNING: Media storage service init failed (WA media uploads disabled): %v", err)
		mediaStorageService = &services.StorageService{}
	}
	chatHub := services.NewChatHub()
	waService := services.NewWhatsAppService(database.PgPool, leadService, mediaStorageService, chatHub, cfg)

	// Lead sourcing engine (background scheduler)
	lsEngine := ls.NewEngine(database.PgPool, leadRoutingService, 60*time.Second)
	leadSourcingService := services.NewLeadSourcingService(database.PgPool, lsEngine)

	// Start lead sourcing engine with a cancellable context for graceful shutdown.
	lsCtx, lsCancel := context.WithCancel(context.Background())
	go lsEngine.Start(lsCtx)

	// Setup routes
	routes.SetupOrganizationRoutes(app, orgService)
	routes.SetupAuthRoutes(app, authService)
	routes.SetupUserRoutes(app, userService)
	routes.SetupSubscriptionRoutes(app, subscriptionService)
	routes.SetupTeamRoutes(app, teamService)
	routes.SetupImportedDataRoutes(app, importedDataService)
	routes.SetupProjectRoutes(app, projectService)
	routes.SetupRoutingRoutes(app, routingRulesService, teamService)
	routes.SetupLeadRoutes(app, leadService, storageService)
	routes.SetupDashboardRoutes(app, dashboardService, leadService)
	routes.SetupNegotiationRoutes(app, negotiationService)
	routes.SetupBookingRoutes(app, bookingService)
	routes.SetupCallRoutes(app, callService)
	routes.SetupWhatsAppRoutes(app, waService, cfg)
	routes.SetupLeadSourcingRoutes(app, leadSourcingService)

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "core-api",
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Graceful shutdown
	go func() {
		if err := app.Listen(":" + port); err != nil {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	log.Printf("Server starting on port %s", port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	lsCancel() // stop the lead sourcing scheduler
	if err := app.Shutdown(); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exited")
}

// customErrorHandler handles errors
func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"message": err.Error(),
	})
}
