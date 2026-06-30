package utils

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()

	// Register custom validators
	validate.RegisterValidation("password", validatePassword)
	validate.RegisterValidation("datetime", validateDate)
}

// ValidateStruct validates a struct using the validator
func ValidateStruct(s interface{}) map[string]string {
	err := validate.Struct(s)
	if err != nil {
		errors := make(map[string]string)
		for _, err := range err.(validator.ValidationErrors) {
			// Handle nested struct fields (e.g., organization.name)
			field := strings.ToLower(err.Field())
			namespace := strings.ToLower(err.Namespace())

			// Extract field path from namespace (e.g., "OnboardRequest.Organization.Name" -> "organization.name")
			if strings.Contains(namespace, ".") {
				parts := strings.Split(namespace, ".")
				if len(parts) >= 2 {
					// Skip the struct name (first part) and join the rest
					field = strings.Join(parts[1:], ".")
				}
			}

			errors[field] = getErrorMessage(err)
		}
		return errors
	}
	return nil
}

// validatePassword validates password strength
func validatePassword(fl validator.FieldLevel) bool {
	password := fl.Field().String()

	// Minimum 8 characters
	if len(password) < 8 {
		return false
	}

	// Must contain uppercase
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	// Must contain lowercase
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	// Must contain number
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)

	return hasUpper && hasLower && hasNumber
}

// validateDate validates date format (YYYY-MM-DD)
func validateDate(fl validator.FieldLevel) bool {
	dateStr := fl.Field().String()
	_, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return false
	}
	return true
}

// getErrorMessage returns a user-friendly error message
func getErrorMessage(err validator.FieldError) string {
	field := strings.ToLower(err.Field())
	tag := err.Tag()

	switch tag {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, err.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", field, err.Param())
	case "len":
		return fmt.Sprintf("%s must be exactly %s characters", field, err.Param())
	case "url":
		return fmt.Sprintf("%s must be a valid URL", field)
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, err.Param())
	case "alphanum":
		return fmt.Sprintf("%s must contain only alphanumeric characters", field)
	case "password":
		return fmt.Sprintf("%s must be at least 8 characters and contain uppercase, lowercase, and number", field)
	case "datetime":
		return fmt.Sprintf("%s must be a valid date in YYYY-MM-DD format", field)
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}
