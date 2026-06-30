package responses

import (
	"github.com/gofiber/fiber/v2"
)

// Response represents a standard API response
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Errors  interface{} `json:"errors,omitempty"`
	ErrorCode string    `json:"error_code,omitempty"`
}

// SuccessResponse sends a success response
func SuccessResponse(c *fiber.Ctx, statusCode int, message string, data interface{}) error {
	return c.Status(statusCode).JSON(Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// ErrorResponse sends an error response
func ErrorResponse(c *fiber.Ctx, statusCode int, message string, errors interface{}) error {
	return c.Status(statusCode).JSON(Response{
		Success: false,
		Message: message,
		Errors:  errors,
	})
}

// ErrorResponseWithCode sends an error response with error code
func ErrorResponseWithCode(c *fiber.Ctx, statusCode int, message string, errorCode string) error {
	return c.Status(statusCode).JSON(Response{
		Success:   false,
		Message:   message,
		ErrorCode: errorCode,
	})
}
