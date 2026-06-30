package database

import (
	"context"
	"fmt"
	"log"

	"crownco/core-api/config"
	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

// InitRedis initializes the Redis connection
func InitRedis() {
	cfg := config.LoadConfig()

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	// Test the connection
	pong, err := RedisClient.Ping(context.Background()).Result()
	if err != nil {
		log.Fatalf("Unable to connect to Redis: %v\n", err)
	}

	log.Printf("Connected to Redis: %s", pong)
}

// CloseRedis closes the Redis connection
func CloseRedis() {
	if RedisClient != nil {
		_ = RedisClient.Close()
	}
}
