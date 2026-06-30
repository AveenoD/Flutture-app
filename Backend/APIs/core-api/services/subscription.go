package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"crownco/core-api/database"
	"crownco/core-api/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SubscriptionService struct {
	db *pgxpool.Pool
}

func NewSubscriptionService(db *pgxpool.Pool) *SubscriptionService {
	return &SubscriptionService{db: db}
}

// GetOrganizationIDFromUserID gets organization_id from user_id (for GM)
func (s *SubscriptionService) GetOrganizationIDFromUserID(ctx context.Context, userID uuid.UUID) (uuid.UUID, error) {
	var orgID uuid.UUID
	query := `SELECT organization_id FROM users_general_managers WHERE id = $1 AND deleted_at IS NULL`
	err := s.db.QueryRow(ctx, query, userID).Scan(&orgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return uuid.Nil, errors.New("USER_NOT_FOUND")
		}
		return uuid.Nil, fmt.Errorf("failed to get organization ID: %w", err)
	}
	return orgID, nil
}

// GetPlans retrieves all active plans
func (s *SubscriptionService) GetPlans(ctx context.Context) ([]models.Plan, error) {
	// Try to get from Redis cache first
	cacheKey := "plans:active"
	cachedData, err := database.RedisClient.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		// Cache hit - unmarshal and return
		var plans []models.Plan
		if err := json.Unmarshal([]byte(cachedData), &plans); err == nil {
			return plans, nil
		}
		// If unmarshal fails, continue to DB fetch
	}

	// Cache miss - get from database
	query := `
		SELECT id, name, description, lead_limit, user_limit, features,
			monthly_price_per_user, quarterly_price_per_user, yearly_price_per_user,
			currency, is_active, trial_days, created_at, updated_at
		FROM plans
		WHERE is_active = true
		ORDER BY monthly_price_per_user ASC
	`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch plans: %w", err)
	}
	defer rows.Close()

	var plans []models.Plan
	for rows.Next() {
		var plan models.Plan
		var featuresJSON []byte
		var quarterlyPrice, yearlyPrice sql.NullFloat64

		err := rows.Scan(
			&plan.ID, &plan.Name, &plan.Description, &plan.LeadLimit, &plan.UserLimit,
			&featuresJSON, &plan.MonthlyPricePerUser, &quarterlyPrice, &yearlyPrice,
			&plan.Currency, &plan.IsActive, &plan.TrialDays, &plan.CreatedAt, &plan.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan plan: %w", err)
		}

		// Parse JSONB features
		if err := json.Unmarshal(featuresJSON, &plan.Features); err != nil {
			plan.Features = make(map[string]interface{})
		}

		// Handle nullable prices
		if quarterlyPrice.Valid {
			plan.QuarterlyPricePerUser = &quarterlyPrice.Float64
		}
		if yearlyPrice.Valid {
			plan.YearlyPricePerUser = &yearlyPrice.Float64
		}

		plans = append(plans, plan)
	}

	// Store in Redis cache with 36 hour expiry
	plansJSON, err := json.Marshal(plans)
	if err == nil {
		database.RedisClient.Set(ctx, cacheKey, plansJSON, 36*time.Hour)
	}

	return plans, nil
}

// GetCurrentSubscription retrieves the current subscription for an organization
// Note: Subscription and Plan are cached, but Limits are always fetched fresh from DB
func (s *SubscriptionService) GetCurrentSubscription(ctx context.Context, organizationID uuid.UUID) (*models.SubscriptionWithPlan, error) {
	var sub models.Subscription
	var plan models.Plan

	// Try to get subscription and plan from Redis cache first
	cacheKey := fmt.Sprintf("subscription:org:%s", organizationID.String())
	cachedData, err := database.RedisClient.Get(ctx, cacheKey).Result()
	
	if err == nil && cachedData != "" {
		// Cache hit - unmarshal subscription and plan (but NOT limits)
		type CachedSubPlan struct {
			Subscription models.Subscription
			Plan         models.Plan
		}
		var cached CachedSubPlan
		if err := json.Unmarshal([]byte(cachedData), &cached); err == nil {
			sub = cached.Subscription
			plan = cached.Plan
			// Successfully got from cache, now fetch fresh limits
			goto fetchLimits
		}
		// If unmarshal fails, continue to DB fetch
	}

	// Cache miss - get subscription and plan from database
	{
		query := `
			SELECT s.id, s.organization_id, s.plan_id, s.status, s.start_date, s.end_date,
				s.renewal_date, s.auto_renew, s.payment_method, s.billing_cycle,
				s.amount_paid, s.last_payment_at, s.next_billing_at, s.cancelled_at,
				s.cancellation_reason, s.created_at, s.updated_at,
				p.id, p.name, p.description, p.lead_limit, p.user_limit, p.features,
				p.monthly_price_per_user, p.quarterly_price_per_user, p.yearly_price_per_user,
				p.currency, p.is_active, p.trial_days, p.created_at, p.updated_at
			FROM subscriptions s
			INNER JOIN plans p ON s.plan_id = p.id
			WHERE s.organization_id = $1
			ORDER BY s.created_at DESC
			LIMIT 1
		`

		var featuresJSON []byte
		var quarterlyPrice, yearlyPrice sql.NullFloat64
		var endDate, renewalDate, lastPaymentAt, nextBillingAt, cancelledAt sql.NullTime
		var paymentMethod, cancellationReason sql.NullString
		var amountPaid sql.NullFloat64

		err = s.db.QueryRow(ctx, query, organizationID).Scan(
			&sub.ID, &sub.OrganizationID, &sub.PlanID, &sub.Status, &sub.StartDate,
			&endDate, &renewalDate, &sub.AutoRenew, &paymentMethod, &sub.BillingCycle,
			&amountPaid, &lastPaymentAt, &nextBillingAt, &cancelledAt,
			&cancellationReason, &sub.CreatedAt, &sub.UpdatedAt,
			&plan.ID, &plan.Name, &plan.Description, &plan.LeadLimit, &plan.UserLimit,
			&featuresJSON, &plan.MonthlyPricePerUser, &quarterlyPrice, &yearlyPrice,
			&plan.Currency, &plan.IsActive, &plan.TrialDays, &plan.CreatedAt, &plan.UpdatedAt,
		)
		if err != nil {
			if err == pgx.ErrNoRows {
				return nil, errors.New("SUBSCRIPTION_NOT_FOUND")
			}
			return nil, fmt.Errorf("failed to get subscription: %w", err)
		}

		// Handle nullable fields
		if endDate.Valid {
			sub.EndDate = &endDate.Time
		}
		if renewalDate.Valid {
			sub.RenewalDate = &renewalDate.Time
		}
		if paymentMethod.Valid {
			sub.PaymentMethod = &paymentMethod.String
		}
		if amountPaid.Valid {
			sub.AmountPaid = &amountPaid.Float64
		}
		if lastPaymentAt.Valid {
			sub.LastPaymentAt = &lastPaymentAt.Time
		}
		if nextBillingAt.Valid {
			sub.NextBillingAt = &nextBillingAt.Time
		}
		if cancelledAt.Valid {
			sub.CancelledAt = &cancelledAt.Time
		}
		if cancellationReason.Valid {
			sub.CancellationReason = &cancellationReason.String
		}

		// Parse JSONB features
		if err := json.Unmarshal(featuresJSON, &plan.Features); err != nil {
			plan.Features = make(map[string]interface{})
		}

		// Handle nullable prices
		if quarterlyPrice.Valid {
			plan.QuarterlyPricePerUser = &quarterlyPrice.Float64
		}
		if yearlyPrice.Valid {
			plan.YearlyPricePerUser = &yearlyPrice.Float64
		}

		// Cache only subscription and plan (NOT limits) with 36 hour expiry
		type CachedSubPlan struct {
			Subscription models.Subscription
			Plan         models.Plan
		}
		cached := CachedSubPlan{
			Subscription: sub,
			Plan:         plan,
		}
		if cachedJSON, err := json.Marshal(cached); err == nil {
			database.RedisClient.Set(ctx, cacheKey, cachedJSON, 36*time.Hour)
		}
	}

fetchLimits:
	// ALWAYS fetch fresh limits from database (never cached)
	limits, err := s.getOrganizationLimits(ctx, organizationID, plan.LeadLimit, plan.UserLimit)
	if err != nil {
		return nil, fmt.Errorf("failed to get limits: %w", err)
	}

	return &models.SubscriptionWithPlan{
		Subscription: sub,
		Plan:         plan,
		Limits:       *limits,
	}, nil
}

// getOrganizationLimits calculates current usage for an organization
func (s *SubscriptionService) getOrganizationLimits(ctx context.Context, orgID uuid.UUID, leadLimit, userLimit int) (*models.LimitsInfo, error) {
	// Count active leads (not soft deleted)
	var leadCount int
	leadQuery := `SELECT COUNT(*) FROM leads WHERE organization_id = $1 AND deleted_at IS NULL`
	err := s.db.QueryRow(ctx, leadQuery, orgID).Scan(&leadCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count leads: %w", err)
	}

	// Count active users (all user types, not soft deleted)
	userQuery := `
		SELECT 
			(SELECT COUNT(*) FROM users_general_managers WHERE organization_id = $1 AND deleted_at IS NULL) +
			(SELECT COUNT(*) FROM users_managers WHERE organization_id = $1 AND deleted_at IS NULL) +
			(SELECT COUNT(*) FROM users_presales WHERE organization_id = $1 AND deleted_at IS NULL) +
			(SELECT COUNT(*) FROM users_sales WHERE organization_id = $1 AND deleted_at IS NULL)
	`
	var userCount int
	err = s.db.QueryRow(ctx, userQuery, orgID).Scan(&userCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	return &models.LimitsInfo{
		LeadLimit: leadLimit,
		LeadCount: leadCount,
		UserLimit: userLimit,
		UserCount: userCount,
	}, nil
}

// CreateSubscription creates a new subscription for an organization
func (s *SubscriptionService) CreateSubscription(ctx context.Context, organizationID uuid.UUID, req models.CreateSubscriptionRequest) (*models.Subscription, error) {
	// Check if organization already has an active subscription
	existingSub, err := s.getActiveSubscription(ctx, organizationID)
	if err == nil && existingSub != nil {
		if existingSub.Status == "active" || existingSub.Status == "trial" {
			return nil, errors.New("ACTIVE_SUBSCRIPTION_EXISTS")
		}
	}

	// Parse plan ID
	planID, err := uuid.Parse(req.PlanID)
	if err != nil {
		return nil, errors.New("INVALID_PLAN_ID")
	}

	// Verify plan exists and is active
	var plan models.Plan
	planQuery := `
		SELECT id, name, lead_limit, user_limit, monthly_price_per_user,
			quarterly_price_per_user, yearly_price_per_user, trial_days
		FROM plans
		WHERE id = $1 AND is_active = true
	`
	var quarterlyPrice, yearlyPrice sql.NullFloat64
	err = s.db.QueryRow(ctx, planQuery, planID).Scan(
		&plan.ID, &plan.Name, &plan.LeadLimit, &plan.UserLimit,
		&plan.MonthlyPricePerUser, &quarterlyPrice, &yearlyPrice, &plan.TrialDays,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("PLAN_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify plan: %w", err)
	}

	// Validate billing cycle and get price
	switch req.BillingCycle {
	case "monthly":
		// Price validation - monthly is always available
	case "quarterly":
		if !quarterlyPrice.Valid {
			return nil, errors.New("QUARTERLY_PRICING_NOT_AVAILABLE")
		}
	case "yearly":
		if !yearlyPrice.Valid {
			return nil, errors.New("YEARLY_PRICING_NOT_AVAILABLE")
		}
	default:
		return nil, errors.New("INVALID_BILLING_CYCLE")
	}

	// Calculate dates
	now := time.Now()
	startDate := now
	var endDate *time.Time
	var status string

	// Determine status and end date
	if plan.TrialDays > 0 && existingSub == nil {
		// New subscription with trial
		status = "trial"
		trialEnd := startDate.AddDate(0, 0, plan.TrialDays)
		endDate = &trialEnd
	} else {
		// Regular subscription
		status = "pending" // Will be active after payment
		switch req.BillingCycle {
		case "monthly":
			nextMonth := startDate.AddDate(0, 1, 0)
			endDate = &nextMonth
		case "quarterly":
			nextQuarter := startDate.AddDate(0, 3, 0)
			endDate = &nextQuarter
		case "yearly":
			nextYear := startDate.AddDate(1, 0, 0)
			endDate = &nextYear
		}
	}

	// Calculate next billing date
	nextBillingAt := endDate

	// Set auto_renew default
	autoRenew := true
	if req.AutoRenew != nil {
		autoRenew = *req.AutoRenew
	}

	// Create subscription
	subID := uuid.New()
	insertQuery := `
		INSERT INTO subscriptions (
			id, organization_id, plan_id, status, start_date, end_date,
			renewal_date, auto_renew, payment_method, billing_cycle,
			next_billing_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, organization_id, plan_id, status, start_date, end_date,
			renewal_date, auto_renew, payment_method, billing_cycle,
			amount_paid, last_payment_at, next_billing_at, cancelled_at,
			cancellation_reason, created_at, updated_at
	`

	var sub models.Subscription
	var endDateOut, renewalDateOut, lastPaymentAtOut, nextBillingAtOut, cancelledAtOut sql.NullTime
	var paymentMethodOut, cancellationReasonOut sql.NullString
	var amountPaidOut sql.NullFloat64

	err = s.db.QueryRow(ctx, insertQuery,
		subID, organizationID, planID, status, startDate, endDate,
		endDate, autoRenew, req.PaymentMethod, req.BillingCycle,
		nextBillingAt, now, now,
	).Scan(
		&sub.ID, &sub.OrganizationID, &sub.PlanID, &sub.Status, &sub.StartDate,
		&endDateOut, &renewalDateOut, &sub.AutoRenew, &paymentMethodOut, &sub.BillingCycle,
		&amountPaidOut, &lastPaymentAtOut, &nextBillingAtOut, &cancelledAtOut,
		&cancellationReasonOut, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	// Handle nullable fields
	if endDateOut.Valid {
		sub.EndDate = &endDateOut.Time
	}
	if renewalDateOut.Valid {
		sub.RenewalDate = &renewalDateOut.Time
	}
	if paymentMethodOut.Valid {
		sub.PaymentMethod = &paymentMethodOut.String
	}
	if amountPaidOut.Valid {
		sub.AmountPaid = &amountPaidOut.Float64
	}
	if lastPaymentAtOut.Valid {
		sub.LastPaymentAt = &lastPaymentAtOut.Time
	}
	if nextBillingAtOut.Valid {
		sub.NextBillingAt = &nextBillingAtOut.Time
	}
	if cancelledAtOut.Valid {
		sub.CancelledAt = &cancelledAtOut.Time
	}
	if cancellationReasonOut.Valid {
		sub.CancellationReason = &cancellationReasonOut.String
	}

	// Invalidate subscription cache for this organization
	// The next GET will fetch fresh data including this new subscription
	cacheKey := fmt.Sprintf("subscription:org:%s", organizationID.String())
	database.RedisClient.Del(ctx, cacheKey)

	return &sub, nil
}

// getActiveSubscription gets the current active/trial subscription for an organization
func (s *SubscriptionService) getActiveSubscription(ctx context.Context, orgID uuid.UUID) (*models.Subscription, error) {
	query := `
		SELECT id, organization_id, plan_id, status, start_date, end_date,
			renewal_date, auto_renew, payment_method, billing_cycle,
			amount_paid, last_payment_at, next_billing_at, cancelled_at,
			cancellation_reason, created_at, updated_at
		FROM subscriptions
		WHERE organization_id = $1 AND status IN ('active', 'trial')
		ORDER BY created_at DESC
		LIMIT 1
	`

	var sub models.Subscription
	var endDate, renewalDate, lastPaymentAt, nextBillingAt, cancelledAt sql.NullTime
	var paymentMethod, cancellationReason sql.NullString
	var amountPaid sql.NullFloat64

	err := s.db.QueryRow(ctx, query, orgID).Scan(
		&sub.ID, &sub.OrganizationID, &sub.PlanID, &sub.Status, &sub.StartDate,
		&endDate, &renewalDate, &sub.AutoRenew, &paymentMethod, &sub.BillingCycle,
		&amountPaid, &lastPaymentAt, &nextBillingAt, &cancelledAt,
		&cancellationReason, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("SUBSCRIPTION_NOT_FOUND")
		}
		return nil, err
	}

	// Handle nullable fields
	if endDate.Valid {
		sub.EndDate = &endDate.Time
	}
	if renewalDate.Valid {
		sub.RenewalDate = &renewalDate.Time
	}
	if paymentMethod.Valid {
		sub.PaymentMethod = &paymentMethod.String
	}
	if amountPaid.Valid {
		sub.AmountPaid = &amountPaid.Float64
	}
	if lastPaymentAt.Valid {
		sub.LastPaymentAt = &lastPaymentAt.Time
	}
	if nextBillingAt.Valid {
		sub.NextBillingAt = &nextBillingAt.Time
	}
	if cancelledAt.Valid {
		sub.CancelledAt = &cancelledAt.Time
	}
	if cancellationReason.Valid {
		sub.CancellationReason = &cancellationReason.String
	}

	return &sub, nil
}

// UpdateSubscription updates a subscription (plan change, billing cycle change)
func (s *SubscriptionService) UpdateSubscription(ctx context.Context, subscriptionID uuid.UUID, organizationID uuid.UUID, req models.UpdateSubscriptionRequest) (*models.Subscription, error) {
	// Verify subscription belongs to organization
	var currentOrgID uuid.UUID
	verifyQuery := `SELECT organization_id FROM subscriptions WHERE id = $1`
	err := s.db.QueryRow(ctx, verifyQuery, subscriptionID).Scan(&currentOrgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("SUBSCRIPTION_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify subscription: %w", err)
	}

	if currentOrgID != organizationID {
		return nil, errors.New("FORBIDDEN")
	}

	// Get current subscription
	currentSub, err := s.getSubscriptionByID(ctx, subscriptionID)
	if err != nil {
		return nil, err
	}

	// Build update query
	updates := []string{}
	args := []interface{}{}
	argIndex := 1

	// Handle plan change
	if req.PlanID != nil {
		planID, err := uuid.Parse(*req.PlanID)
		if err != nil {
			return nil, errors.New("INVALID_PLAN_ID")
		}

		// Verify plan exists
		var planExists bool
		planCheckQuery := `SELECT EXISTS(SELECT 1 FROM plans WHERE id = $1 AND is_active = true)`
		err = s.db.QueryRow(ctx, planCheckQuery, planID).Scan(&planExists)
		if err != nil || !planExists {
			return nil, errors.New("PLAN_NOT_FOUND")
		}

		updates = append(updates, fmt.Sprintf("plan_id = $%d", argIndex))
		args = append(args, planID)
		argIndex++
	}

	// Handle billing cycle change
	if req.BillingCycle != nil {
		updates = append(updates, fmt.Sprintf("billing_cycle = $%d", argIndex))
		args = append(args, *req.BillingCycle)
		argIndex++

		// Recalculate end_date and next_billing_at based on new billing cycle
		billingCycle := *req.BillingCycle
		var newEndDate time.Time
		if currentSub.EndDate != nil {
			switch billingCycle {
			case "monthly":
				newEndDate = time.Now().AddDate(0, 1, 0)
			case "quarterly":
				newEndDate = time.Now().AddDate(0, 3, 0)
			case "yearly":
				newEndDate = time.Now().AddDate(1, 0, 0)
			}
		} else {
			startDate := currentSub.StartDate
			switch billingCycle {
			case "monthly":
				newEndDate = startDate.AddDate(0, 1, 0)
			case "quarterly":
				newEndDate = startDate.AddDate(0, 3, 0)
			case "yearly":
				newEndDate = startDate.AddDate(1, 0, 0)
			}
		}

		updates = append(updates, fmt.Sprintf("end_date = $%d", argIndex))
		args = append(args, newEndDate)
		argIndex++

		updates = append(updates, fmt.Sprintf("next_billing_at = $%d", argIndex))
		args = append(args, newEndDate)
		argIndex++
	}

	// Handle auto_renew change
	if req.AutoRenew != nil {
		updates = append(updates, fmt.Sprintf("auto_renew = $%d", argIndex))
		args = append(args, *req.AutoRenew)
		argIndex++
	}

	if len(updates) == 0 {
		// No updates, return current subscription
		return currentSub, nil
	}

	// Add updated_at
	updates = append(updates, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add WHERE clause
	args = append(args, subscriptionID)

	// Build and execute update query
	setClause := ""
	for i, update := range updates {
		if i > 0 {
			setClause += ", "
		}
		setClause += update
	}

	updateQuery := fmt.Sprintf(`
		UPDATE subscriptions 
		SET %s 
		WHERE id = $%d
	`, setClause, argIndex)

	_, execErr := s.db.Exec(ctx, updateQuery, args...)
	if execErr != nil {
		return nil, fmt.Errorf("failed to update subscription: %w", execErr)
	}

	// Invalidate subscription cache for this organization
	cacheKey := fmt.Sprintf("subscription:org:%s", organizationID.String())
	database.RedisClient.Del(ctx, cacheKey)

	// Return updated subscription
	return s.getSubscriptionByID(ctx, subscriptionID)
}

// getSubscriptionByID retrieves a subscription by ID
func (s *SubscriptionService) getSubscriptionByID(ctx context.Context, subscriptionID uuid.UUID) (*models.Subscription, error) {
	query := `
		SELECT id, organization_id, plan_id, status, start_date, end_date,
			renewal_date, auto_renew, payment_method, billing_cycle,
			amount_paid, last_payment_at, next_billing_at, cancelled_at,
			cancellation_reason, created_at, updated_at
		FROM subscriptions
		WHERE id = $1
	`

	var sub models.Subscription
	var endDate, renewalDate, lastPaymentAt, nextBillingAt, cancelledAt sql.NullTime
	var paymentMethod, cancellationReason sql.NullString
	var amountPaid sql.NullFloat64

	err := s.db.QueryRow(ctx, query, subscriptionID).Scan(
		&sub.ID, &sub.OrganizationID, &sub.PlanID, &sub.Status, &sub.StartDate,
		&endDate, &renewalDate, &sub.AutoRenew, &paymentMethod, &sub.BillingCycle,
		&amountPaid, &lastPaymentAt, &nextBillingAt, &cancelledAt,
		&cancellationReason, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("SUBSCRIPTION_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to get subscription: %w", err)
	}

	// Handle nullable fields
	if endDate.Valid {
		sub.EndDate = &endDate.Time
	}
	if renewalDate.Valid {
		sub.RenewalDate = &renewalDate.Time
	}
	if paymentMethod.Valid {
		sub.PaymentMethod = &paymentMethod.String
	}
	if amountPaid.Valid {
		sub.AmountPaid = &amountPaid.Float64
	}
	if lastPaymentAt.Valid {
		sub.LastPaymentAt = &lastPaymentAt.Time
	}
	if nextBillingAt.Valid {
		sub.NextBillingAt = &nextBillingAt.Time
	}
	if cancelledAt.Valid {
		sub.CancelledAt = &cancelledAt.Time
	}
	if cancellationReason.Valid {
		sub.CancellationReason = &cancellationReason.String
	}

	return &sub, nil
}

// CancelSubscription cancels a subscription
func (s *SubscriptionService) CancelSubscription(ctx context.Context, subscriptionID uuid.UUID, organizationID uuid.UUID, reason *string) (*models.Subscription, error) {
	// Verify subscription belongs to organization
	var currentOrgID uuid.UUID
	verifyQuery := `SELECT organization_id FROM subscriptions WHERE id = $1`
	err := s.db.QueryRow(ctx, verifyQuery, subscriptionID).Scan(&currentOrgID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("SUBSCRIPTION_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify subscription: %w", err)
	}

	if currentOrgID != organizationID {
		return nil, errors.New("FORBIDDEN")
	}

	// Cancel subscription
	now := time.Now()
	updateQuery := `
		UPDATE subscriptions 
		SET status = 'cancelled', 
			cancelled_at = $1,
			cancellation_reason = $2,
			auto_renew = false,
			updated_at = $1
		WHERE id = $3
	`

	_, execErr := s.db.Exec(ctx, updateQuery, now, reason, subscriptionID)
	if execErr != nil {
		return nil, fmt.Errorf("failed to cancel subscription: %w", execErr)
	}

	// Invalidate subscription cache for this organization
	cacheKey := fmt.Sprintf("subscription:org:%s", organizationID.String())
	database.RedisClient.Del(ctx, cacheKey)

	// Return updated subscription
	return s.getSubscriptionByID(ctx, subscriptionID)
}

// RenewSubscription manually renews a subscription
func (s *SubscriptionService) RenewSubscription(ctx context.Context, subscriptionID uuid.UUID, organizationID uuid.UUID) (*models.Subscription, error) {
	// Verify subscription belongs to organization
	var currentOrgID uuid.UUID
	var billingCycle string
	var endDate sql.NullTime
	verifyQuery := `SELECT organization_id, billing_cycle, end_date FROM subscriptions WHERE id = $1`
	err := s.db.QueryRow(ctx, verifyQuery, subscriptionID).Scan(&currentOrgID, &billingCycle, &endDate)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("SUBSCRIPTION_NOT_FOUND")
		}
		return nil, fmt.Errorf("failed to verify subscription: %w", err)
	}

	if currentOrgID != organizationID {
		return nil, errors.New("FORBIDDEN")
	}

	// Calculate new end date based on billing cycle
	now := time.Now()
	var newEndDate time.Time
	startDate := now

	switch billingCycle {
	case "monthly":
		if endDate.Valid {
			// Extend from current end date
			newEndDate = endDate.Time.AddDate(0, 1, 0)
		} else {
			newEndDate = startDate.AddDate(0, 1, 0)
		}
	case "quarterly":
		if endDate.Valid {
			newEndDate = endDate.Time.AddDate(0, 3, 0)
		} else {
			newEndDate = startDate.AddDate(0, 3, 0)
		}
	case "yearly":
		if endDate.Valid {
			newEndDate = endDate.Time.AddDate(1, 0, 0)
		} else {
			newEndDate = startDate.AddDate(1, 0, 0)
		}
	default:
		return nil, errors.New("INVALID_BILLING_CYCLE")
	}

	// Update subscription
	// Note: end_date and renewal_date are DATE type, next_billing_at is TIMESTAMP
	updateQuery := `
		UPDATE subscriptions 
		SET status = 'active',
			end_date = $1::date,
			renewal_date = $2::date,
			next_billing_at = $3::timestamp,
			last_payment_at = $4,
			updated_at = $4
		WHERE id = $5
	`

	result, execErr := s.db.Exec(ctx, updateQuery, newEndDate, newEndDate, newEndDate, now, subscriptionID)
	if execErr != nil {
		return nil, fmt.Errorf("failed to renew subscription update: %w", execErr)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return nil, fmt.Errorf("no subscription was updated - subscription may not exist")
	}

	// Invalidate subscription cache for this organization
	cacheKey := fmt.Sprintf("subscription:org:%s", organizationID.String())
	database.RedisClient.Del(ctx, cacheKey)

	// Return updated subscription
	updatedSub, err := s.getSubscriptionByID(ctx, subscriptionID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve renewed subscription: %w", err)
	}
	return updatedSub, nil
}
