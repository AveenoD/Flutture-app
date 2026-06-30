package middleware

import (
	"crownco/core-api/responses"
	"crownco/core-api/utils"

	"github.com/gofiber/fiber/v2"
)

// AuthMiddleware validates JWT token and sets user context
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
				"Authorization header is required", "MISSING_TOKEN")
		}

		// Extract token from "Bearer <token>"
		tokenString := ""
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		} else {
			return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
				"Invalid authorization header format", "INVALID_TOKEN_FORMAT")
		}

		// Validate token
		claims, err := utils.ValidateToken(tokenString)
		if err != nil {
			return responses.ErrorResponseWithCode(c, fiber.StatusUnauthorized,
				"Invalid or expired token", "INVALID_TOKEN")
		}

		// Set user info in context
		c.Locals("user_id", claims.UserID)
		c.Locals("user_role", claims.UserRole)

		return c.Next()
	}
}
