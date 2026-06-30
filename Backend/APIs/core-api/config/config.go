package config

import (
	"os"
	"strconv"
)

// Config stores all configuration of the application
type Config struct {
	PostgresUser        string
	PostgresPassword    string
	PostgresHost        string
	PostgresPort        string
	PostgresDB          string
	RedisHost           string
	RedisPort           string
	RedisPassword       string
	RedisDB             int
	JWTSecret           string
	B2KeyID             string
	B2AppKey            string
	B2BucketName        string
	B2Region            string
	B2Endpoint          string
	WAAppSecret         string
	WAVerifyToken       string
	WAMediaBucketName   string
	WAGraphAPIVersion   string
}

// LoadConfig loads config from environment variables
func LoadConfig() *Config {
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	return &Config{
		PostgresUser:        getEnv("POSTGRES_USER", "crownco-db-user"),
		PostgresPassword:    getEnv("POSTGRES_PASSWORD", "crownco-db-password"),
		PostgresHost:        getEnv("POSTGRES_HOST", "localhost"),
		PostgresPort:        getEnv("POSTGRES_PORT", "5433"),
		PostgresDB:          getEnv("POSTGRES_DB", "crownco-db"),
		RedisHost:           getEnv("REDIS_HOST", "localhost"),
		RedisPort:           getEnv("REDIS_PORT", "6379"),
		RedisPassword:       getEnv("REDIS_PASSWORD", "crownco-redis-password"),
		RedisDB:             redisDB,
		JWTSecret:           getEnv("JWT_SECRET", "crownco-jwt-secret"),
		B2KeyID:             getEnv("B2_KEY_ID", "005d0076f46caac0000000003"),
		B2AppKey:            getEnv("B2_APP_KEY", "K005/z1oz01jAOsS3v/PuLgoNBPrfPU"),
		B2BucketName:        getEnv("B2_BUCKET_NAME", "crownco-ai"),
		B2Region:            getEnv("B2_REGION", "s-east-005"),
		B2Endpoint:          getEnv("B2_ENDPOINT", "s3.us-east-005.backblazeb2.com"),
		WAAppSecret:         getEnv("WA_APP_SECRET", ""),
		WAVerifyToken:       getEnv("WA_VERIFY_TOKEN", "crownco_wa_verify"),
		WAMediaBucketName:   getEnv("WA_MEDIA_BUCKET_NAME", "crownco-wa-media"),
		WAGraphAPIVersion:   getEnv("WA_GRAPH_API_VERSION", "v21.0"),
	}
}

// Helper function to get an environment variable or a default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
