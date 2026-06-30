package models

import (
	"time"

	"github.com/google/uuid"
)

// RoutingRule represents a lead routing rule in the database
type RoutingRule struct {
	ID                          uuid.UUID   `json:"id"`
	OrganizationID              uuid.UUID   `json:"organization_id"`
	ManagerUserID               *uuid.UUID  `json:"manager_user_id,omitempty"`
	RuleName                    string      `json:"rule_name"`
	Priority                    int         `json:"priority"`
	AffectedLeadSources         []string    `json:"affected_lead_sources,omitempty"`
	AffectedAreas               []string    `json:"affected_areas,omitempty"`
	Languages                   []string    `json:"languages,omitempty"`
	MinimumBudgetRange          *float64    `json:"minimum_budget_range,omitempty"`
	MaximumBudgetRange          *float64    `json:"maximum_budget_range,omitempty"`
	AffectedLeadStatuses        []string    `json:"affected_lead_statuses,omitempty"`
	AffectedUserIDs             []uuid.UUID `json:"affected_user_ids,omitempty"`
	AffectedTeamIDs             []uuid.UUID `json:"affected_team_ids,omitempty"`
	MaxPendingLeadsPerUser      *int        `json:"max_pending_leads_per_user,omitempty"`
	MaxPendingFollowupsPerUser  *int        `json:"max_pending_followups_per_user,omitempty"`
	RuleStatus                  string      `json:"rule_status"`
	FlowTypeOrder               string      `json:"flow_type_order"`
	TargetRole                  string      `json:"target_role"` // presales | sales
	CreatedAt                   time.Time   `json:"created_at"`
	UpdatedAt                   time.Time   `json:"updated_at"`
}

// CreateRoutingRuleRequest represents the request payload for creating a routing rule
type CreateRoutingRuleRequest struct {
	RuleName                   string    `json:"rule_name" validate:"required,min=1,max=255"`
	Priority                   int       `json:"priority" validate:"required,min=1,max=5"`
	ManagerUserID              *string   `json:"manager_user_id" validate:"omitempty,uuid4"`
	AffectedLeadSources        []string  `json:"affected_lead_sources" validate:"omitempty,dive,oneof=99acres housing meta_ads google_ads referral website imported"`
	AffectedAreas              []string  `json:"affected_areas" validate:"omitempty"`
	Languages                  []string  `json:"languages" validate:"omitempty,dive,oneof=en hi mr ta te mixed"`
	MinimumBudgetRange         *float64  `json:"minimum_budget_range" validate:"omitempty,gte=0"`
	MaximumBudgetRange         *float64  `json:"maximum_budget_range" validate:"omitempty,gte=0"`
	AffectedLeadStatuses       []string  `json:"affected_lead_statuses" validate:"omitempty,dive,oneof=landed called hot warm cold qualified"`
	AffectedUserIDs            []string  `json:"affected_user_ids" validate:"omitempty,dive,uuid4"`
	AffectedTeamIDs            []string  `json:"affected_team_ids" validate:"omitempty,dive,uuid4"`
	MaxPendingLeadsPerUser     *int      `json:"max_pending_leads_per_user" validate:"omitempty,min=0"`
	MaxPendingFollowupsPerUser *int      `json:"max_pending_followups_per_user" validate:"omitempty,min=0"`
	FlowTypeOrder              string    `json:"flow_type_order" validate:"required,oneof=round-robin least-busy-first order-by-call-time order-by-call-connect-rate order-by-conversion-rate"`
	TargetRole                 string    `json:"target_role" validate:"omitempty,oneof=presales sales"`
}

// UpdateRoutingRuleRequest represents the request payload for updating a routing rule
type UpdateRoutingRuleRequest struct {
	RuleName                   *string   `json:"rule_name" validate:"omitempty,min=1,max=255"`
	Priority                   *int      `json:"priority" validate:"omitempty,min=1,max=5"`
	ManagerUserID              *string   `json:"manager_user_id" validate:"omitempty,uuid4"`
	AffectedLeadSources        []string  `json:"affected_lead_sources" validate:"omitempty,dive,oneof=99acres housing meta_ads google_ads referral website imported"`
	AffectedAreas              []string  `json:"affected_areas" validate:"omitempty"`
	Languages                  []string  `json:"languages" validate:"omitempty,dive,oneof=en hi mr ta te mixed"`
	MinimumBudgetRange         *float64  `json:"minimum_budget_range" validate:"omitempty,gte=0"`
	MaximumBudgetRange         *float64  `json:"maximum_budget_range" validate:"omitempty,gte=0"`
	AffectedLeadStatuses       []string  `json:"affected_lead_statuses" validate:"omitempty,dive,oneof=landed called hot warm cold qualified"`
	AffectedUserIDs            []string  `json:"affected_user_ids" validate:"omitempty,dive,uuid4"`
	AffectedTeamIDs            []string  `json:"affected_team_ids" validate:"omitempty,dive,uuid4"`
	MaxPendingLeadsPerUser     *int      `json:"max_pending_leads_per_user" validate:"omitempty,min=0"`
	MaxPendingFollowupsPerUser *int      `json:"max_pending_followups_per_user" validate:"omitempty,min=0"`
	FlowTypeOrder              *string   `json:"flow_type_order" validate:"omitempty,oneof=round-robin least-busy-first order-by-call-time order-by-call-connect-rate order-by-conversion-rate"`
	TargetRole                 *string   `json:"target_role" validate:"omitempty,oneof=presales sales"`
}

// UpdateRoutingRuleStatusRequest for PATCH status
type UpdateRoutingRuleStatusRequest struct {
	RuleStatus string `json:"rule_status" validate:"required,oneof=active inactive"`
}
