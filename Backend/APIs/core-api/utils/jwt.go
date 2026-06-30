package utils

import (
	"time"

	"crownco/core-api/config"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	UserID   string `json:"user_id"`
	UserRole string `json:"user_role"`
	jwt.RegisteredClaims
}

// GenerateToken generates a JWT token for the user
func GenerateToken(userID, userRole string) (string, int64, error) {
	cfg := config.LoadConfig()
	
	// Token expires in 24 hours
	expirationTime := time.Now().Add(24 * time.Hour)
	expiresIn := expirationTime.Unix() - time.Now().Unix()

	claims := &JWTClaims{
		UserID:   userID,
		UserRole: userRole,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return "", 0, err
	}

	return tokenString, expiresIn, nil
}

// ValidateToken validates a JWT token and returns the claims
func ValidateToken(tokenString string) (*JWTClaims, error) {
	cfg := config.LoadConfig()
	
	claims := &JWTClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}

	return claims, nil
}
