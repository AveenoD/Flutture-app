package services

import (
	"context"
	"log"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LeadRoutingService handles automatic lead routing to callers (Presales)
type LeadRoutingService struct {
	db *pgxpool.Pool
}

// NewLeadRoutingService creates a new LeadRoutingService
func NewLeadRoutingService(db *pgxpool.Pool) *LeadRoutingService {
	return &LeadRoutingService{db: db}
}

// leadForRouting holds minimal lead fields needed for routing
type leadForRouting struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	AssignedToID   *uuid.UUID
	Source         string
	City           *string
	State          *string
	BudgetMin      *float64
	BudgetMax      *float64
	Status         string
}

// routingRuleRow holds a single rule from DB for matching
type routingRuleRow struct {
	ID                         uuid.UUID
	Priority                   int
	AffectedLeadSources        []string
	AffectedAreas              []string
	MinBudget                  *float64
	MaxBudget                  *float64
	AffectedLeadStatuses       []string
	AffectedUserIDs            []uuid.UUID
	AffectedTeamIDs            []uuid.UUID
	MaxPendingLeadsPerUser     *int
	FlowTypeOrder              string
}

// RouteLead assigns a lead to a caller (Presales) based on routing rules or equal distribution
func (s *LeadRoutingService) RouteLead(ctx context.Context, leadID string) error {
	leadUUID, err := uuid.Parse(leadID)
	if err != nil {
		return err
	}

	lead, err := s.getLeadForRouting(ctx, leadUUID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil
		}
		return err
	}

	if lead.AssignedToID != nil {
		return nil
	}

	rules, err := s.getActiveRules(ctx, lead.OrganizationID)
	if err != nil {
		return err
	}

	if len(rules) == 0 {
		return s.assignByEqualDistribution(ctx, lead.OrganizationID, leadUUID)
	}

	for _, rule := range rules {
		if !s.ruleMatchesLead(lead, &rule) {
			continue
		}
		candidates, err := s.getCandidateCallersForRule(ctx, lead.OrganizationID, &rule)
		if err != nil || len(candidates) == 0 {
			continue
		}
		selected, err := s.selectCallerByFlowType(ctx, lead.OrganizationID, candidates, rule.FlowTypeOrder)
		if err != nil || selected == "" {
			continue
		}
		return s.AssignLeadToUser(ctx, leadID, selected, "presales")
	}

	return nil
}

// AssignLeadToUser sets assigned_to_user_id and assigned_to_user_type on the lead
func (s *LeadRoutingService) AssignLeadToUser(ctx context.Context, leadID, userID, userType string) error {
	query := `
		UPDATE leads
		SET assigned_to_user_id = $1, assigned_to_user_type = $2, assigned_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND deleted_at IS NULL
	`
	_, err := s.db.Exec(ctx, query, userID, userType, leadID)
	return err
}

func (s *LeadRoutingService) getLeadForRouting(ctx context.Context, leadID uuid.UUID) (*leadForRouting, error) {
	var lead leadForRouting
	query := `
		SELECT id, organization_id, assigned_to_user_id, source::text, city, state,
		       budget_min, budget_max, status::text
		FROM leads
		WHERE id = $1 AND deleted_at IS NULL
	`
	err := s.db.QueryRow(ctx, query, leadID).Scan(
		&lead.ID, &lead.OrganizationID, &lead.AssignedToID, &lead.Source,
		&lead.City, &lead.State, &lead.BudgetMin, &lead.BudgetMax, &lead.Status,
	)
	if err != nil {
		return nil, err
	}
	return &lead, nil
}

func (s *LeadRoutingService) getActiveRules(ctx context.Context, orgID uuid.UUID) ([]routingRuleRow, error) {
	query := `
		SELECT id, priority,
		       COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_sources) AS s), ARRAY[]::text[]),
		       COALESCE(affected_areas, ARRAY[]::text[]),
		       minimum_budget_range, maximum_budget_range,
		       COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_statuses) AS s), ARRAY[]::text[]),
		       COALESCE(affected_user_ids, ARRAY[]::uuid[]), COALESCE(affected_team_ids, ARRAY[]::uuid[]),
		       max_pending_leads_per_user, flow_type_order::text
		FROM lead_routing_rules
		WHERE organization_id = $1 AND rule_status = 'active' AND COALESCE(target_role, 'presales') = 'presales'
		ORDER BY priority ASC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []routingRuleRow
	for rows.Next() {
		var r routingRuleRow
		err := rows.Scan(
			&r.ID, &r.Priority, &r.AffectedLeadSources, &r.AffectedAreas,
			&r.MinBudget, &r.MaxBudget, &r.AffectedLeadStatuses,
			&r.AffectedUserIDs, &r.AffectedTeamIDs,
			&r.MaxPendingLeadsPerUser, &r.FlowTypeOrder,
		)
		if err != nil {
			continue
		}
		rules = append(rules, r)
	}
	return rules, rows.Err()
}

// leadSourceToRoutingSource maps lead_source (leads table) to routing_lead_source (rules)
func leadSourceToRoutingSource(leadSource string) string {
	m := map[string]string{
		"99acres": "99acres", "housing": "housing", "website": "website", "referral": "referral",
		"meta": "meta_ads", "google": "google_ads",
	}
	if v, ok := m[leadSource]; ok {
		return v
	}
	return ""
}

// leadStatusToRoutingStatus maps lead_status to routing_lead_status
func leadStatusToRoutingStatus(leadStatus string) string {
	m := map[string]string{
		"unqualified": "landed", "called": "called", "qualified": "qualified",
	}
	if v, ok := m[leadStatus]; ok {
		return v
	}
	return ""
}

func (s *LeadRoutingService) ruleMatchesLead(lead *leadForRouting, rule *routingRuleRow) bool {
	if len(rule.AffectedLeadSources) > 0 {
		mapped := leadSourceToRoutingSource(lead.Source)
		if mapped == "" {
			return false
		}
		found := false
		for _, rs := range rule.AffectedLeadSources {
			if rs == mapped {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	if len(rule.AffectedAreas) > 0 {
		city := ""
		if lead.City != nil {
			city = strings.TrimSpace(strings.ToLower(*lead.City))
		}
		state := ""
		if lead.State != nil {
			state = strings.TrimSpace(strings.ToLower(*lead.State))
		}
		found := false
		for _, a := range rule.AffectedAreas {
			aa := strings.TrimSpace(strings.ToLower(a))
			if aa == city || aa == state {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	if rule.MinBudget != nil || rule.MaxBudget != nil {
		leadMin := 0.0
		if lead.BudgetMin != nil {
			leadMin = *lead.BudgetMin
		}
		leadMax := 0.0
		if lead.BudgetMax != nil {
			leadMax = *lead.BudgetMax
		}
		if rule.MinBudget != nil && leadMax > 0 && leadMax < *rule.MinBudget {
			return false
		}
		if rule.MaxBudget != nil && leadMin > *rule.MaxBudget {
			return false
		}
	}

	if len(rule.AffectedLeadStatuses) > 0 {
		mapped := leadStatusToRoutingStatus(lead.Status)
		if mapped == "" {
			return false
		}
		found := false
		for _, rs := range rule.AffectedLeadStatuses {
			if rs == mapped {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}

	return true
}

func (s *LeadRoutingService) getCandidateCallersForRule(ctx context.Context, orgID uuid.UUID, rule *routingRuleRow) ([]string, error) {
	var candidates []string
	if len(rule.AffectedUserIDs) > 0 {
		for _, uid := range rule.AffectedUserIDs {
			var exists bool
			err := s.db.QueryRow(ctx,
				`SELECT EXISTS(SELECT 1 FROM users_presales WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)`,
				uid, orgID,
			).Scan(&exists)
			if err == nil && exists {
				candidates = append(candidates, uid.String())
			}
		}
	} else if len(rule.AffectedTeamIDs) > 0 {
		for _, tid := range rule.AffectedTeamIDs {
			rows, err := s.db.Query(ctx,
				`SELECT id::text FROM users_presales WHERE team_id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
				tid, orgID,
			)
			if err != nil {
				continue
			}
			for rows.Next() {
				var id string
				if rows.Scan(&id) == nil {
					candidates = append(candidates, id)
				}
			}
			rows.Close()
		}
	} else {
		candidates, _ = s.getAllPresalesIDs(ctx, orgID)
	}
	if rule.MaxPendingLeadsPerUser != nil && *rule.MaxPendingLeadsPerUser >= 0 && len(candidates) > 0 {
		counts, err := s.getAssignedCounts(ctx, orgID)
		if err != nil {
			return candidates, nil
		}
		limit := *rule.MaxPendingLeadsPerUser
		var filtered []string
		for _, c := range candidates {
			if counts[c] < limit {
				filtered = append(filtered, c)
			}
		}
		if len(filtered) > 0 {
			candidates = filtered
		}
	}
	return candidates, nil
}

func (s *LeadRoutingService) getAllPresalesIDs(ctx context.Context, orgID uuid.UUID) ([]string, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id FROM users_presales WHERE organization_id = $1 AND deleted_at IS NULL`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids, rows.Err()
}

func (s *LeadRoutingService) getAssignedCounts(ctx context.Context, orgID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT assigned_to_user_id::text, COUNT(*)
		FROM leads
		WHERE organization_id = $1 AND deleted_at IS NULL AND assigned_to_user_id IS NOT NULL
		GROUP BY assigned_to_user_id
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := make(map[string]int)
	for rows.Next() {
		var id string
		var c int
		if rows.Scan(&id, &c) == nil {
			m[id] = c
		}
	}
	return m, rows.Err()
}

func (s *LeadRoutingService) selectCallerByFlowType(ctx context.Context, orgID uuid.UUID, candidates []string, flowType string) (string, error) {
	counts, err := s.getAssignedCounts(ctx, orgID)
	if err != nil {
		return "", err
	}
	minCount := -1
	var selected string
	for _, c := range candidates {
		n := counts[c]
		if minCount < 0 || n < minCount {
			minCount = n
			selected = c
		} else if n == minCount && selected != "" && c < selected {
			selected = c
		} else if minCount < 0 {
			selected = c
		}
	}
	return selected, nil
}

func (s *LeadRoutingService) assignByEqualDistribution(ctx context.Context, orgID uuid.UUID, leadID uuid.UUID) error {
	candidates, err := s.getAllPresalesIDs(ctx, orgID)
	if err != nil || len(candidates) == 0 {
		return nil
	}
	selected, err := s.selectCallerByFlowType(ctx, orgID, candidates, "round-robin")
	if err != nil || selected == "" {
		return nil
	}
	err = s.AssignLeadToUser(ctx, leadID.String(), selected, "presales")
	if err != nil {
		log.Printf("lead_routing: assignByEqualDistribution failed for lead %s: %v", leadID, err)
	}
	return err
}

// leadForSalesRouting holds lead fields needed for sales routing
type leadForSalesRouting struct {
	ID             uuid.UUID
	OrganizationID uuid.UUID
	AssignedToID   *uuid.UUID
	AssignedToType *string
	SalesUserID    *uuid.UUID
	ProjectID      *uuid.UUID
	Source         string
	City           *string
	State          *string
	BudgetMin      *float64
	BudgetMax      *float64
	Status         string
}

// getLeadForSalesRouting loads lead for sales routing (sales_user_id, assigned_to, project_id, etc.)
func (s *LeadRoutingService) getLeadForSalesRouting(ctx context.Context, leadID uuid.UUID) (*leadForSalesRouting, error) {
	var lead leadForSalesRouting
	query := `
		SELECT id, organization_id, assigned_to_user_id, assigned_to_user_type, sales_user_id, project_id,
		       source::text, city, state, budget_min, budget_max, status::text
		FROM leads
		WHERE id = $1 AND deleted_at IS NULL
	`
	err := s.db.QueryRow(ctx, query, leadID).Scan(
		&lead.ID, &lead.OrganizationID, &lead.AssignedToID, &lead.AssignedToType, &lead.SalesUserID, &lead.ProjectID,
		&lead.Source, &lead.City, &lead.State, &lead.BudgetMin, &lead.BudgetMax, &lead.Status,
	)
	if err != nil {
		return nil, err
	}
	return &lead, nil
}

// getActiveSalesRules returns active rules with target_role = 'sales'
func (s *LeadRoutingService) getActiveSalesRules(ctx context.Context, orgID uuid.UUID) ([]routingRuleRow, error) {
	query := `
		SELECT id, priority,
		       COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_sources) AS s), ARRAY[]::text[]),
		       COALESCE(affected_areas, ARRAY[]::text[]),
		       minimum_budget_range, maximum_budget_range,
		       COALESCE((SELECT array_agg(s::text) FROM unnest(affected_lead_statuses) AS s), ARRAY[]::text[]),
		       COALESCE(affected_user_ids, ARRAY[]::uuid[]), COALESCE(affected_team_ids, ARRAY[]::uuid[]),
		       max_pending_leads_per_user, flow_type_order::text
		FROM lead_routing_rules
		WHERE organization_id = $1 AND rule_status = 'active' AND target_role = 'sales'
		ORDER BY priority ASC
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var rules []routingRuleRow
	for rows.Next() {
		var r routingRuleRow
		err := rows.Scan(
			&r.ID, &r.Priority, &r.AffectedLeadSources, &r.AffectedAreas,
			&r.MinBudget, &r.MaxBudget, &r.AffectedLeadStatuses,
			&r.AffectedUserIDs, &r.AffectedTeamIDs,
			&r.MaxPendingLeadsPerUser, &r.FlowTypeOrder,
		)
		if err != nil {
			continue
		}
		rules = append(rules, r)
	}
	return rules, rows.Err()
}

// AssignLeadToSalesUser sets presales_user_id, sales_user_id, sales_accepted_at = NULL; does not change assigned_to (stays presales until accept)
func (s *LeadRoutingService) AssignLeadToSalesUser(ctx context.Context, leadID, salesUserID, presalesUserID string) error {
	query := `
		UPDATE leads
		SET presales_user_id = COALESCE(presales_user_id, $1), sales_user_id = $2, sales_accepted_at = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND deleted_at IS NULL
	`
	_, err := s.db.Exec(ctx, query, presalesUserID, salesUserID, leadID)
	return err
}

func (s *LeadRoutingService) getAllSalesIDs(ctx context.Context, orgID uuid.UUID) ([]string, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id::text FROM users_sales WHERE organization_id = $1 AND deleted_at IS NULL`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids, rows.Err()
}

func (s *LeadRoutingService) getSalesIDsForProject(ctx context.Context, orgID, projectID uuid.UUID) ([]string, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id::text FROM users_sales WHERE organization_id = $1 AND deleted_at IS NULL AND $2 = ANY(project_assigned_ids)`,
		orgID, projectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids, rows.Err()
}

// getSalesAssignedCounts returns count of leads per sales_user_id (for round-robin)
func (s *LeadRoutingService) getSalesAssignedCounts(ctx context.Context, orgID uuid.UUID) (map[string]int, error) {
	query := `
		SELECT sales_user_id::text, COUNT(*)
		FROM leads
		WHERE organization_id = $1 AND deleted_at IS NULL AND sales_user_id IS NOT NULL
		GROUP BY sales_user_id
	`
	rows, err := s.db.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := make(map[string]int)
	for rows.Next() {
		var id string
		var c int
		if rows.Scan(&id, &c) == nil {
			m[id] = c
		}
	}
	return m, rows.Err()
}

func (s *LeadRoutingService) selectSalesByFlowType(ctx context.Context, orgID uuid.UUID, candidates []string, flowType string) (string, error) {
	counts, err := s.getSalesAssignedCounts(ctx, orgID)
	if err != nil {
		return "", err
	}
	minCount := -1
	var selected string
	for _, c := range candidates {
		n := counts[c]
		if minCount < 0 || n < minCount {
			minCount = n
			selected = c
		} else if n == minCount && selected != "" && c < selected {
			selected = c
		} else if minCount < 0 {
			selected = c
		}
	}
	return selected, nil
}

func (s *LeadRoutingService) getCandidateSalesForRule(ctx context.Context, orgID uuid.UUID, rule *routingRuleRow) ([]string, error) {
	var candidates []string
	if len(rule.AffectedUserIDs) > 0 {
		for _, uid := range rule.AffectedUserIDs {
			var exists bool
			err := s.db.QueryRow(ctx,
				`SELECT EXISTS(SELECT 1 FROM users_sales WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL)`,
				uid, orgID,
			).Scan(&exists)
			if err == nil && exists {
				candidates = append(candidates, uid.String())
			}
		}
	} else if len(rule.AffectedTeamIDs) > 0 {
		for _, tid := range rule.AffectedTeamIDs {
			rows, err := s.db.Query(ctx,
				`SELECT id::text FROM users_sales WHERE team_id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
				tid, orgID,
			)
			if err != nil {
				continue
			}
			for rows.Next() {
				var id string
				if rows.Scan(&id) == nil {
					candidates = append(candidates, id)
				}
			}
			rows.Close()
		}
	} else {
		candidates, _ = s.getAllSalesIDs(ctx, orgID)
	}
	if rule.MaxPendingLeadsPerUser != nil && *rule.MaxPendingLeadsPerUser >= 0 && len(candidates) > 0 {
		counts, err := s.getSalesAssignedCounts(ctx, orgID)
		if err != nil {
			return candidates, nil
		}
		limit := *rule.MaxPendingLeadsPerUser
		var filtered []string
		for _, c := range candidates {
			if counts[c] < limit {
				filtered = append(filtered, c)
			}
		}
		if len(filtered) > 0 {
			candidates = filtered
		}
	}
	return candidates, nil
}

// ruleMatchesLeadForSales reuses same matching logic (lead has Source, City, State, BudgetMin, BudgetMax, Status)
func (s *LeadRoutingService) ruleMatchesLeadForSales(lead *leadForSalesRouting, rule *routingRuleRow) bool {
	// Adapt leadForSalesRouting to leadForRouting for rule matching
	adapted := &leadForRouting{
		ID: lead.ID, OrganizationID: lead.OrganizationID, AssignedToID: lead.SalesUserID,
		Source: lead.Source, City: lead.City, State: lead.State,
		BudgetMin: lead.BudgetMin, BudgetMax: lead.BudgetMax, Status: lead.Status,
	}
	return s.ruleMatchesLead(adapted, rule)
}

// RouteLeadToSales assigns the lead to a sales user when property visit is created. Sets presales_user_id, sales_user_id; leaves assigned_to as presales until accept.
func (s *LeadRoutingService) RouteLeadToSales(ctx context.Context, leadID string, projectID *uuid.UUID) error {
	leadUUID, err := uuid.Parse(leadID)
	if err != nil {
		return err
	}

	lead, err := s.getLeadForSalesRouting(ctx, leadUUID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil
		}
		return err
	}

	if lead.SalesUserID != nil {
		return nil // already assigned to sales
	}

	presalesID := ""
	if lead.AssignedToID != nil && lead.AssignedToType != nil && *lead.AssignedToType == "presales" {
		presalesID = lead.AssignedToID.String()
	}
	if presalesID == "" {
		return nil // lead must be assigned to presales to run sales routing
	}

	// Resolve project for "no rules" case: prefer provided projectID, else lead's project
	projID := projectID
	if projID == nil {
		projID = lead.ProjectID
	}

	rules, err := s.getActiveSalesRules(ctx, lead.OrganizationID)
	if err != nil {
		return err
	}

	if len(rules) > 0 {
		for _, rule := range rules {
			if !s.ruleMatchesLeadForSales(lead, &rule) {
				continue
			}
			candidates, err := s.getCandidateSalesForRule(ctx, lead.OrganizationID, &rule)
			if err != nil || len(candidates) == 0 {
				continue
			}
			selected, err := s.selectSalesByFlowType(ctx, lead.OrganizationID, candidates, rule.FlowTypeOrder)
			if err != nil || selected == "" {
				continue
			}
			return s.AssignLeadToSalesUser(ctx, leadID, selected, presalesID)
		}
	}

	// No rules: assign to sales who have this lead's project in project_assigned_ids
	if projID == nil {
		return nil
	}
	candidates, err := s.getSalesIDsForProject(ctx, lead.OrganizationID, *projID)
	if err != nil || len(candidates) == 0 {
		return nil
	}
	selected, err := s.selectSalesByFlowType(ctx, lead.OrganizationID, candidates, "round-robin")
	if err != nil || selected == "" {
		return nil
	}
	return s.AssignLeadToSalesUser(ctx, leadID, selected, presalesID)
}
