package utils

import (
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 10

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// ValidatePassword validates a password against a hash
func ValidatePassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ValidatePasswordStrength validates password strength
func ValidatePasswordStrength(password string) map[string]string {
	errors := make(map[string]string)
	
	if len(password) < 8 {
		errors["password"] = "Password must be at least 8 characters"
		return errors
	}
	
	// Check for uppercase
	hasUpper := false
	for _, char := range password {
		if char >= 'A' && char <= 'Z' {
			hasUpper = true
			break
		}
	}
	if !hasUpper {
		errors["password"] = "Password must contain at least one uppercase letter"
		return errors
	}
	
	// Check for lowercase
	hasLower := false
	for _, char := range password {
		if char >= 'a' && char <= 'z' {
			hasLower = true
			break
		}
	}
	if !hasLower {
		errors["password"] = "Password must contain at least one lowercase letter"
		return errors
	}
	
	// Check for number
	hasNumber := false
	for _, char := range password {
		if char >= '0' && char <= '9' {
			hasNumber = true
			break
		}
	}
	if !hasNumber {
		errors["password"] = "Password must contain at least one number"
		return errors
	}
	
	return nil
}
