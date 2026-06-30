package models

import (
	"time"

	"github.com/google/uuid"
)

// Plan represents the plans table
type Plan struct {
	ID                      uuid.UUID              `json:"id" db:"id"`
	Name                    string                 `json:"name" db:"name"`
	Description             string                 `json:"description" db:"description"`
	LeadLimit               int                    `json:"lead_limit" db:"lead_limit"` // 0 = unlimited
	UserLimit               int                    `json:"user_limit" db:"user_limit"` // 0 = unlimited
	Features                map[string]interface{} `json:"features" db:"features"`
	MonthlyPricePerUser     float64                `json:"monthly_price_per_user" db:"monthly_price_per_user"`
	QuarterlyPricePerUser   *float64               `json:"quarterly_price_per_user,omitempty" db:"quarterly_price_per_user"`
	YearlyPricePerUser      *float64               `json:"yearly_price_per_user,omitempty" db:"yearly_price_per_user"`
	Currency                string                 `json:"currency" db:"currency"`
	IsActive                bool                   `json:"is_active" db:"is_active"`
	TrialDays               int                    `json:"trial_days" db:"trial_days"`
	CreatedAt               time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time              `json:"updated_at" db:"updated_at"`
}

// Subscription represents the subscriptions table
type Subscription struct {
	ID                 uuid.UUID  `json:"id" db:"id"`
	OrganizationID     uuid.UUID  `json:"organization_id" db:"organization_id"`
	PlanID             uuid.UUID  `json:"plan_id" db:"plan_id"`
	Status             string     `json:"status" db:"status"` // active, expired, cancelled, trial, pending
	StartDate          time.Time  `json:"start_date" db:"start_date"`
	EndDate            *time.Time `json:"end_date,omitempty" db:"end_date"`
	RenewalDate        *time.Time `json:"renewal_date,omitempty" db:"renewal_date"`
	AutoRenew          bool       `json:"auto_renew" db:"auto_renew"`
	PaymentMethod      *string    `json:"payment_method,omitempty" db:"payment_method"`
	BillingCycle       string     `json:"billing_cycle" db:"billing_cycle"` // monthly, quarterly, yearly
	AmountPaid         *float64   `json:"amount_paid,omitempty" db:"amount_paid"`
	LastPaymentAt      *time.Time `json:"last_payment_at,omitempty" db:"last_payment_at"`
	NextBillingAt      *time.Time `json:"next_billing_at,omitempty" db:"next_billing_at"`
	CancelledAt        *time.Time `json:"cancelled_at,omitempty" db:"cancelled_at"`
	CancellationReason *string    `json:"cancellation_reason,omitempty" db:"cancellation_reason"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`
}

// SubscriptionWithPlan includes subscription with plan details
type SubscriptionWithPlan struct {
	Subscription Subscription `json:"subscription"`
	Plan         Plan         `json:"plan"`
	Limits       LimitsInfo   `json:"limits"`
}

// LimitsInfo contains current subscription limits and usage
type LimitsInfo struct {
	LeadLimit int `json:"lead_limit"`
	LeadCount int `json:"lead_count"`
	UserLimit int `json:"user_limit"`
	UserCount int `json:"user_count"`
}

// CreateSubscriptionRequest represents the request payload for subscription creation
type CreateSubscriptionRequest struct {
	PlanID       string  `json:"plan_id" validate:"required,uuid"`
	BillingCycle string  `json:"billing_cycle" validate:"required,oneof=monthly quarterly yearly"`
	PaymentMethod *string `json:"payment_method,omitempty"`
	AutoRenew    *bool   `json:"auto_renew,omitempty"`
}

// UpdateSubscriptionRequest represents the request payload for subscription update
type UpdateSubscriptionRequest struct {
	PlanID       *string `json:"plan_id,omitempty" validate:"omitempty,uuid"`
	BillingCycle *string `json:"billing_cycle,omitempty" validate:"omitempty,oneof=monthly quarterly yearly"`
	AutoRenew    *bool   `json:"auto_renew,omitempty"`
}

// CancelSubscriptionRequest represents the request payload for subscription cancellation
type CancelSubscriptionRequest struct {
	Reason *string `json:"reason,omitempty"`
}
