package services

import (
	"context"
	"errors"

	"crownco/core-api/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RoutingRulesService handles CRUD for lead routing rules
type RoutingRulesService struct {
	db *pgxpool.Pool
}

// NewRoutingRulesService creates a new RoutingRulesService
func NewRoutingRulesService(db *pgxpool.Pool) *RoutingRulesService {
	return &RoutingRulesService{db: db}
}

// ListRules returns all routing rules for an organization (optional status filter)
func (s *RoutingRulesService) ListRules(ctx context.Context, orgID uuid.UUID, status *string) ([]models.RoutingRule, error) {
	query := `
		SELECT id, organization_id, manager_user_id, rule_name, priority,
		       COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_sources) AS s), ARRAY[]::text[]),
		       COALESCE(affected_areas, ARRAY[]::text[]),
		       COALESCE((SELECT array_agg(s::text) FROM unnest(languages) AS s), ARRAY[]::text[]),
		       minimum_budget_range, maximum_budget_range,
		       COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_statuses) AS s), ARRAY[]::text[]),
		       COALESCE(affected_user_ids, ARRAY[]::uuid[]), COALESCE(affected_team_ids, ARRAY[]::uuid[]),
		       max_pending_leads_per_user, max_pending_followups_per_user,
		       rule_status::text, flow_type_order::text, COALESCE(target_role, 'presales'), created_at, updated_at
		FROM lead_routing_rules
		WHERE organization_id = $1
	`
	args := []interface{}{orgID}
	if status != nil && *status != "" {
		query += ` AND rule_status = $2`
		args = append(args, *status)
	}
	query += ` ORDER BY priority ASC, created_at DESC`

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []models.RoutingRule
	for rows.Next() {
		var r models.RoutingRule
		err := rows.Scan(
			&r.ID, &r.OrganizationID, &r.ManagerUserID, &r.RuleName, &r.Priority,
			&r.AffectedLeadSources, &r.AffectedAreas, &r.Languages,
			&r.MinimumBudgetRange, &r.MaximumBudgetRange, &r.AffectedLeadStatuses,
			&r.AffectedUserIDs, &r.AffectedTeamIDs,
			&r.MaxPendingLeadsPerUser, &r.MaxPendingFollowupsPerUser,
			&r.RuleStatus, &r.FlowTypeOrder, &r.TargetRole, &r.CreatedAt, &r.UpdatedAt,
		)
		if err != nil {
			continue
		}
		rules = append(rules, r)
	}
	return rules, rows.Err()
}

// GetRule returns one routing rule by ID if it belongs to the organization
func (s *RoutingRulesService) GetRule(ctx context.Context, ruleID, orgID uuid.UUID) (*models.RoutingRule, error) {
	query := `
		SELECT id, organization_id, manager_user_id, rule_name, priority,
		       COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_sources) AS s), ARRAY[]::text[]),
		       COALESCE(affected_areas, ARRAY[]::text[]),
		       COALESCE((SELECT array_agg(s::text) FROM unnest(languages) AS s), ARRAY[]::text[]),
		       minimum_budget_range, maximum_budget_range,
		       COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_statuses) AS s), ARRAY[]::text[]),
		       COALESCE(affected_user_ids, ARRAY[]::uuid[]), COALESCE(affected_team_ids, ARRAY[]::uuid[]),
		       max_pending_leads_per_user, max_pending_followups_per_user,
		       rule_status::text, flow_type_order::text, COALESCE(target_role, 'presales'), created_at, updated_at
		FROM lead_routing_rules
		WHERE id = $1 AND organization_id = $2
	`
	var r models.RoutingRule
	err := s.db.QueryRow(ctx, query, ruleID, orgID).Scan(
		&r.ID, &r.OrganizationID, &r.ManagerUserID, &r.RuleName, &r.Priority,
		&r.AffectedLeadSources, &r.AffectedAreas, &r.Languages,
		&r.MinimumBudgetRange, &r.MaximumBudgetRange, &r.AffectedLeadStatuses,
		&r.AffectedUserIDs, &r.AffectedTeamIDs,
		&r.MaxPendingLeadsPerUser, &r.MaxPendingFollowupsPerUser,
		&r.RuleStatus, &r.FlowTypeOrder, &r.TargetRole, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("ROUTING_RULE_NOT_FOUND")
		}
		return nil, err
	}
	return &r, nil
}

// CreateRule inserts a new routing rule
func (s *RoutingRulesService) CreateRule(ctx context.Context, orgID uuid.UUID, req models.CreateRoutingRuleRequest) (*models.RoutingRule, error) {
	targetRole := req.TargetRole
	if targetRole == "" {
		targetRole = "presales"
	}
	query := `
		INSERT INTO lead_routing_rules (
			organization_id, manager_user_id, rule_name, priority,
			affected_lead_sources, affected_areas, languages,
			minimum_budget_range, maximum_budget_range, affected_lead_statuses,
			affected_user_ids, affected_team_ids,
			max_pending_leads_per_user, max_pending_followups_per_user,
			rule_status, flow_type_order, target_role
		) VALUES (
			$1, $2, $3, $4,
			(SELECT COALESCE(array_agg(e::routing_lead_source), ARRAY[]::routing_lead_source[]) FROM unnest($5::text[]) AS e),
			$6,
			(SELECT COALESCE(array_agg(e::language), ARRAY[]::language[]) FROM unnest($7::text[]) AS e),
			$8, $9,
			(SELECT COALESCE(array_agg(e::routing_lead_status), ARRAY[]::routing_lead_status[]) FROM unnest($10::text[]) AS e),
			$11, $12, $13, $14, 'active', $15, $16
		)
		RETURNING id, organization_id, manager_user_id, rule_name, priority,
			COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_sources) AS s), ARRAY[]::text[]),
			COALESCE(affected_areas, ARRAY[]::text[]),
			COALESCE((SELECT array_agg(s::text) FROM unnest(languages) AS s), ARRAY[]::text[]),
			minimum_budget_range, maximum_budget_range,
			COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_statuses) AS s), ARRAY[]::text[]),
			COALESCE(affected_user_ids, ARRAY[]::uuid[]), COALESCE(affected_team_ids, ARRAY[]::uuid[]),
			max_pending_leads_per_user, max_pending_followups_per_user,
			rule_status::text, flow_type_order::text, COALESCE(target_role, 'presales'), created_at, updated_at
	`
	sources := req.AffectedLeadSources
	if sources == nil {
		sources = []string{}
	}
	areas := req.AffectedAreas
	if areas == nil {
		areas = []string{}
	}
	langs := req.Languages
	if langs == nil {
		langs = []string{}
	}
	statuses := req.AffectedLeadStatuses
	if statuses == nil {
		statuses = []string{}
	}
	var userIDs []uuid.UUID
	for _, id := range req.AffectedUserIDs {
		if u, err := uuid.Parse(id); err == nil {
			userIDs = append(userIDs, u)
		}
	}
	var teamIDs []uuid.UUID
	for _, id := range req.AffectedTeamIDs {
		if u, err := uuid.Parse(id); err == nil {
			teamIDs = append(teamIDs, u)
		}
	}
	var managerID interface{}
	if req.ManagerUserID != nil && *req.ManagerUserID != "" {
		managerID = *req.ManagerUserID
	} else {
		managerID = nil
	}

	var r models.RoutingRule
	err := s.db.QueryRow(ctx, query,
		orgID, managerID, req.RuleName, req.Priority,
		sources, areas, langs,
		req.MinimumBudgetRange, req.MaximumBudgetRange, statuses,
		userIDs, teamIDs,
		req.MaxPendingLeadsPerUser, req.MaxPendingFollowupsPerUser,
		req.FlowTypeOrder, targetRole,
	).Scan(
		&r.ID, &r.OrganizationID, &r.ManagerUserID, &r.RuleName, &r.Priority,
		&r.AffectedLeadSources, &r.AffectedAreas, &r.Languages,
		&r.MinimumBudgetRange, &r.MaximumBudgetRange, &r.AffectedLeadStatuses,
		&r.AffectedUserIDs, &r.AffectedTeamIDs,
		&r.MaxPendingLeadsPerUser, &r.MaxPendingFollowupsPerUser,
		&r.RuleStatus, &r.FlowTypeOrder, &r.TargetRole, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// UpdateRule updates an existing routing rule
func (s *RoutingRulesService) UpdateRule(ctx context.Context, ruleID, orgID uuid.UUID, req models.UpdateRoutingRuleRequest) (*models.RoutingRule, error) {
	existing, err := s.GetRule(ctx, ruleID, orgID)
	if err != nil {
		return nil, err
	}

	ruleName := existing.RuleName
	if req.RuleName != nil {
		ruleName = *req.RuleName
	}
	priority := existing.Priority
	if req.Priority != nil {
		priority = *req.Priority
	}
	flowTypeOrder := existing.FlowTypeOrder
	if req.FlowTypeOrder != nil {
		flowTypeOrder = *req.FlowTypeOrder
	}
	sources := existing.AffectedLeadSources
	if req.AffectedLeadSources != nil {
		sources = req.AffectedLeadSources
	}
	areas := existing.AffectedAreas
	if req.AffectedAreas != nil {
		areas = req.AffectedAreas
	}
	langs := existing.Languages
	if req.Languages != nil {
		langs = req.Languages
	}
	statuses := existing.AffectedLeadStatuses
	if req.AffectedLeadStatuses != nil {
		statuses = req.AffectedLeadStatuses
	}
	userIDs := existing.AffectedUserIDs
	if req.AffectedUserIDs != nil {
		userIDs = nil
		for _, id := range req.AffectedUserIDs {
			if u, err := uuid.Parse(id); err == nil {
				userIDs = append(userIDs, u)
			}
		}
	}
	teamIDs := existing.AffectedTeamIDs
	if req.AffectedTeamIDs != nil {
		teamIDs = nil
		for _, id := range req.AffectedTeamIDs {
			if u, err := uuid.Parse(id); err == nil {
				teamIDs = append(teamIDs, u)
			}
		}
	}
	minBudget := existing.MinimumBudgetRange
	if req.MinimumBudgetRange != nil {
		minBudget = req.MinimumBudgetRange
	}
	maxBudget := existing.MaximumBudgetRange
	if req.MaximumBudgetRange != nil {
		maxBudget = req.MaximumBudgetRange
	}
	maxPending := existing.MaxPendingLeadsPerUser
	if req.MaxPendingLeadsPerUser != nil {
		maxPending = req.MaxPendingLeadsPerUser
	}
	maxFollowups := existing.MaxPendingFollowupsPerUser
	if req.MaxPendingFollowupsPerUser != nil {
		maxFollowups = req.MaxPendingFollowupsPerUser
	}
	targetRole := existing.TargetRole
	if targetRole == "" {
		targetRole = "presales"
	}
	if req.TargetRole != nil && *req.TargetRole != "" {
		targetRole = *req.TargetRole
	}
	var managerID interface{}
	if req.ManagerUserID != nil {
		if *req.ManagerUserID == "" {
			managerID = nil
		} else {
			managerID = *req.ManagerUserID
		}
	} else {
		managerID = existing.ManagerUserID
	}

	if sources == nil {
		sources = []string{}
	}
	if areas == nil {
		areas = []string{}
	}
	if langs == nil {
		langs = []string{}
	}
	if statuses == nil {
		statuses = []string{}
	}
	if userIDs == nil {
		userIDs = []uuid.UUID{}
	}
	if teamIDs == nil {
		teamIDs = []uuid.UUID{}
	}

	query := `
		UPDATE lead_routing_rules SET
			manager_user_id = $2, rule_name = $3, priority = $4,
			affected_lead_sources = (SELECT COALESCE(array_agg(e::routing_lead_source), ARRAY[]::routing_lead_source[]) FROM unnest($5::text[]) AS e),
			affected_areas = $6,
			languages = (SELECT COALESCE(array_agg(e::language), ARRAY[]::language[]) FROM unnest($7::text[]) AS e),
			minimum_budget_range = $8, maximum_budget_range = $9,
			affected_lead_statuses = (SELECT COALESCE(array_agg(e::routing_lead_status), ARRAY[]::routing_lead_status[]) FROM unnest($10::text[]) AS e),
			affected_user_ids = $11, affected_team_ids = $12,
			max_pending_leads_per_user = $13, max_pending_followups_per_user = $14,
			flow_type_order = $15::flow_type_order, target_role = $16, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND organization_id = $17
		RETURNING id, organization_id, manager_user_id, rule_name, priority,
			COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_sources) AS s), ARRAY[]::text[]),
			COALESCE(affected_areas, ARRAY[]::text[]),
			COALESCE((SELECT array_agg(s::text) FROM unnest(languages) AS s), ARRAY[]::text[]),
			minimum_budget_range, maximum_budget_range,
			COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_statuses) AS s), ARRAY[]::text[]),
			COALESCE(affected_user_ids, ARRAY[]::uuid[]), COALESCE(affected_team_ids, ARRAY[]::uuid[]),
			max_pending_leads_per_user, max_pending_followups_per_user,
			rule_status::text, flow_type_order::text, COALESCE(target_role, 'presales'), created_at, updated_at
	`
	var r models.RoutingRule
	err = s.db.QueryRow(ctx, query,
		ruleID, managerID, ruleName, priority,
		sources, areas, langs,
		minBudget, maxBudget, statuses,
		userIDs, teamIDs,
		maxPending, maxFollowups,
		flowTypeOrder, targetRole, orgID,
	).Scan(
		&r.ID, &r.OrganizationID, &r.ManagerUserID, &r.RuleName, &r.Priority,
		&r.AffectedLeadSources, &r.AffectedAreas, &r.Languages,
		&r.MinimumBudgetRange, &r.MaximumBudgetRange, &r.AffectedLeadStatuses,
		&r.AffectedUserIDs, &r.AffectedTeamIDs,
		&r.MaxPendingLeadsPerUser, &r.MaxPendingFollowupsPerUser,
		&r.RuleStatus, &r.FlowTypeOrder, &r.TargetRole, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// DeleteRule deletes a routing rule
func (s *RoutingRulesService) DeleteRule(ctx context.Context, ruleID, orgID uuid.UUID) error {
	cmd, err := s.db.Exec(ctx, `DELETE FROM lead_routing_rules WHERE id = $1 AND organization_id = $2`, ruleID, orgID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return errors.New("ROUTING_RULE_NOT_FOUND")
	}
	return nil
}

// UpdateRuleStatus sets rule_status to active or inactive
func (s *RoutingRulesService) UpdateRuleStatus(ctx context.Context, ruleID, orgID uuid.UUID, status string) (*models.RoutingRule, error) {
	query := `
		UPDATE lead_routing_rules SET rule_status = $3::rule_status, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND organization_id = $2
		RETURNING id, organization_id, manager_user_id, rule_name, priority,
			COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_sources) AS s), ARRAY[]::text[]),
			COALESCE(affected_areas, ARRAY[]::text[]),
			COALESCE((SELECT array_agg(s::text) FROM unnest(languages) AS s), ARRAY[]::text[]),
			minimum_budget_range, maximum_budget_range,
			COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_statuses) AS s), ARRAY[]::text[]),
			COALESCE(affected_user_ids, ARRAY[]::uuid[]), COALESCE(affected_team_ids, ARRAY[]::uuid[]),
			max_pending_leads_per_user, max_pending_followups_per_user,
			rule_status::text, flow_type_order::text, COALESCE(target_role, 'presales'), created_at, updated_at
	`
	var r models.RoutingRule
	err := s.db.QueryRow(ctx, query, ruleID, orgID, status).Scan(
		&r.ID, &r.OrganizationID, &r.ManagerUserID, &r.RuleName, &r.Priority,
		&r.AffectedLeadSources, &r.AffectedAreas, &r.Languages,
		&r.MinimumBudgetRange, &r.MaximumBudgetRange, &r.AffectedLeadStatuses,
		&r.AffectedUserIDs, &r.AffectedTeamIDs,
		&r.MaxPendingLeadsPerUser, &r.MaxPendingFollowupsPerUser,
		&r.RuleStatus, &r.FlowTypeOrder, &r.TargetRole, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("ROUTING_RULE_NOT_FOUND")
		}
		return nil, err
	}
	return &r, nil
}