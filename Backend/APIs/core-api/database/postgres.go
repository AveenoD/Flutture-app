package database

import (
	"context"
	"fmt"
	"log"
	"os"

	"crownco/core-api/config"
	"github.com/jackc/pgx/v5/pgxpool"
)

var PgPool *pgxpool.Pool

// InitPostgres initializes the PostgreSQL connection
func InitPostgres() {
	cfg := config.LoadConfig()

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			cfg.PostgresUser,
			cfg.PostgresPassword,
			cfg.PostgresHost,
			cfg.PostgresPort,
			cfg.PostgresDB,
		)
	}

	log.Printf("Connecting to PostgreSQL with connection string: %s", connStr)

	var err error
	PgPool, err = pgxpool.New(context.Background(), connStr)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v\n", err)
	}

	// Test the connection
	err = PgPool.Ping(context.Background())
	if err != nil {
		log.Fatalf("Unable to ping database: %v\n", err)
	}

	log.Println("Connected to PostgreSQL database")
}

// ClosePostgres closes the PostgreSQL connection
func ClosePostgres() {
	if PgPool != nil {
		PgPool.Close()
	}
}
