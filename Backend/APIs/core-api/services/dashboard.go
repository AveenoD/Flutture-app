package services

import (
	"context"
	"fmt"
	"time"

	"crownco/core-api/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DashboardService provides role-based dashboard and leaderboard data.
type DashboardService struct {
	DB *pgxpool.Pool
}

// NewDashboardService creates a new DashboardService.
func NewDashboardService(db *pgxpool.Pool) *DashboardService {
	return &DashboardService{DB: db}
}

// leadFilterSQL returns WHERE fragment and args for role-based lead visibility (for use in JOINs l.id = ... AND l.organization_id = $orgID AND <returned clause>).
func leadFilterSQL(orgID, userID, userRole string, argStart int) (clause string, args []interface{}) {
	args = []interface{}{orgID}
	idx := argStart
	switch userRole {
	case "general-manager", "general_manager", "manager":
		return "l.organization_id = $1 AND l.deleted_at IS NULL", args
	case "presales":
		args = append(args, userID)
		return fmt.Sprintf("l.organization_id = $1 AND l.deleted_at IS NULL AND ((l.assigned_to_user_id = $%d AND l.assigned_to_user_type = 'presales') OR (l.presales_user_id = $%d AND l.stage IN ('qualification','communication','site_visit')))", idx, idx), args
	case "sales":
		args = append(args, userID)
		return fmt.Sprintf("l.organization_id = $1 AND l.deleted_at IS NULL AND ((l.assigned_to_user_id = $%d AND l.assigned_to_user_type = 'sales') OR (l.sales_user_id = $%d AND l.sales_accepted_at IS NULL))", idx, idx), args
	default:
		return "l.organization_id = $1 AND l.deleted_at IS NULL", args
	}
}

// GetDashboard returns role-based dashboard: stats, pipeline, upcoming follow-ups/visits, optional recent deals and leaderboard for GM/Manager.
// fupPage/fupLimit control pagination for UpcomingFollowUps (default: page=1, limit=10).
func (s *DashboardService) GetDashboard(ctx context.Context, orgID, userID, userRole string, fupPage, fupLimit int) (*models.DashboardResponse, error) {
	leadWhere, leadArgs := leadFilterSQL(orgID, userID, userRole, 2)
	argIdx := len(leadArgs) + 1

	// ---- Stats ----
	stats := models.DashboardStats{}

	// Total leads
	countLeadsQuery := fmt.Sprintf("SELECT COUNT(*) FROM leads l WHERE %s", leadWhere)
	if err := s.DB.QueryRow(ctx, countLeadsQuery, leadArgs...).Scan(&stats.TotalLeads); err != nil {
		return nil, err
	}

	// Active leads (not deal, dropped, rejected)
	activeWhere := leadWhere + " AND l.status NOT IN ('deal','dropped','rejected')"
	if err := s.DB.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM leads l WHERE %s", activeWhere), leadArgs...).Scan(&stats.ActiveLeads); err != nil {
		return nil, err
	}

	// Deals closed
	if err := s.DB.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM leads l WHERE %s AND l.status = 'deal'", leadWhere), leadArgs...).Scan(&stats.DealsClosed); err != nil {
		return nil, err
	}

	if stats.TotalLeads > 0 {
		stats.ConversionRate = float64(stats.DealsClosed) / float64(stats.TotalLeads) * 100
	}

	// Total calls (join lead_calls with visible leads)
	callsQuery := fmt.Sprintf("SELECT COUNT(*) FROM lead_calls c INNER JOIN leads l ON l.id = c.lead_id AND l.organization_id = c.organization_id AND %s", leadWhere)
	if err := s.DB.QueryRow(ctx, callsQuery, leadArgs...).Scan(&stats.TotalCalls); err != nil {
		return nil, err
	}

	// Total visits (completed)
	visitsQuery := fmt.Sprintf("SELECT COUNT(*) FROM lead_property_visits v INNER JOIN leads l ON l.id = v.lead_id AND l.organization_id = v.organization_id AND %s AND v.status = 'completed'", leadWhere)
	if err := s.DB.QueryRow(ctx, visitsQuery, leadArgs...).Scan(&stats.TotalVisits); err != nil {
		return nil, err
	}

	// Pending follow-ups
	fupQuery := fmt.Sprintf("SELECT COUNT(*) FROM lead_followups f INNER JOIN leads l ON l.id = f.lead_id AND f.organization_id = l.organization_id AND %s AND f.status = 'pending'", leadWhere)
	if err := s.DB.QueryRow(ctx, fupQuery, leadArgs...).Scan(&stats.PendingFollowUps); err != nil {
		return nil, err
	}

	// Upcoming visits (scheduled, visit_date + visit_time >= now)
	upcomingVisitsQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM lead_property_visits v INNER JOIN leads l ON l.id = v.lead_id AND l.organization_id = v.organization_id AND %s
		AND v.status = 'scheduled' AND (v.visit_date + COALESCE(v.visit_time::interval, '0')) >= NOW()`, leadWhere)
	if err := s.DB.QueryRow(ctx, upcomingVisitsQuery, leadArgs...).Scan(&stats.UpcomingVisits); err != nil {
		return nil, err
	}

	// ---- Pipeline (by stage) ----
	pipelineQuery := fmt.Sprintf("SELECT COALESCE(l.stage::text, 'qualification') AS stage, COUNT(*) FROM leads l WHERE %s GROUP BY l.stage", leadWhere)
	pipeRows, err := s.DB.Query(ctx, pipelineQuery, leadArgs...)
	if err != nil {
		return nil, err
	}
	defer pipeRows.Close()
	var pipeline []models.PipelineStage
	for pipeRows.Next() {
		var st models.PipelineStage
		if err := pipeRows.Scan(&st.Stage, &st.Count); err != nil {
			continue
		}
		pipeline = append(pipeline, st)
	}

	// ---- Pending follow-ups (recent + upcoming, paginated by date) ----
	if fupPage < 1 {
		fupPage = 1
	}
	if fupLimit <= 0 || fupLimit > 100 {
		fupLimit = 20
	}
	offset := (fupPage - 1) * fupLimit

	fupListQuery := fmt.Sprintf(`
		SELECT f.id::text, f.lead_id::text, l.name, f.followup_type, f.followup_date, f.remark, f.user_id::text, f.user_type::text,
		       p.project_title, l.stage::text, l.lead_temperature::text, l.budget_min, l.budget_max
		FROM lead_followups f
		INNER JOIN leads l ON l.id = f.lead_id AND f.organization_id = l.organization_id AND %s AND f.status = 'pending'
		    AND f.followup_date >= (CURRENT_DATE - INTERVAL '1 day')
		LEFT JOIN projects p ON l.project_id = p.id AND p.deleted_at IS NULL
		ORDER BY f.followup_date ASC LIMIT %d OFFSET %d`, leadWhere, fupLimit, offset)
	fupListArgs := append([]interface{}{}, leadArgs...)
	fupRows, err := s.DB.Query(ctx, fupListQuery, fupListArgs...)
	if err != nil {
		return nil, err
	}
	defer fupRows.Close()
	var upcomingFollowUps []models.FollowUpSummary
	for fupRows.Next() {
		var fu models.FollowUpSummary
		var remark *string
		var assignedID, assignedRole *string
		var projectTitle *string
		var stage *string
		var leadTemp *string
		if err := fupRows.Scan(&fu.ID, &fu.LeadID, &fu.LeadName, &fu.FollowupType, &fu.FollowupDate, &remark, &assignedID, &assignedRole, &projectTitle, &stage, &leadTemp, &fu.BudgetMin, &fu.BudgetMax); err != nil {
			continue
		}
		fu.Remark = remark
		fu.AssignedToID = assignedID
		fu.AssignedRole = assignedRole
		fu.ProjectTitle = projectTitle
		fu.Stage = stage
		if leadTemp != nil && *leadTemp != "" {
			fu.LeadTemperature = *leadTemp
		}
		upcomingFollowUps = append(upcomingFollowUps, fu)
	}

	// ---- Upcoming visits (next 10) ----
	visitListQuery := fmt.Sprintf(`
		SELECT v.id::text, v.lead_id::text, l.name, v.visit_date, v.visit_time::text, v.status
		FROM lead_property_visits v INNER JOIN leads l ON l.id = v.lead_id AND l.organization_id = v.organization_id AND %s
		AND v.status = 'scheduled' AND (v.visit_date + COALESCE(v.visit_time::interval, '0')) >= $%d
		ORDER BY v.scheduled_at ASC NULLS LAST, v.visit_date ASC, v.visit_time ASC NULLS LAST LIMIT 10`, leadWhere, argIdx)
	visitListArgs := append(append([]interface{}{}, leadArgs...), time.Now())
	visitRows, err := s.DB.Query(ctx, visitListQuery, visitListArgs...)
	if err != nil {
		return nil, err
	}
	defer visitRows.Close()
	var upcomingVisits []models.VisitSummary
	for visitRows.Next() {
		var v models.VisitSummary
		var visitTime *string
		if err := visitRows.Scan(&v.ID, &v.LeadID, &v.LeadName, &v.VisitDate, &visitTime, &v.Status); err != nil {
			continue
		}
		v.VisitTime = visitTime
		upcomingVisits = append(upcomingVisits, v)
	}

	resp := &models.DashboardResponse{
		Stats:             stats,
		Pipeline:          pipeline,
		UpcomingFollowUps:  upcomingFollowUps,
		UpcomingVisits:    upcomingVisits,
	}

	// GM/Manager: recent deals + leaderboard
	if userRole == "general-manager" || userRole == "general_manager" || userRole == "manager" {
		// Recent deals (org-wide)
		dealsQuery := fmt.Sprintf(`
			SELECT l.id::text, l.name, l.phone, l.status, l.stage::text, l.project_id::text, l.updated_at
			FROM leads l WHERE %s AND l.status = 'deal' ORDER BY l.updated_at DESC LIMIT 10`, leadWhere)
		dealRows, err := s.DB.Query(ctx, dealsQuery, leadArgs...)
		if err != nil {
			return nil, err
		}
		var recentDeals []models.LeadSummaryShort
		for dealRows.Next() {
			var d models.LeadSummaryShort
			var stage, projectID *string
			if err := dealRows.Scan(&d.ID, &d.Name, &d.Phone, &d.Status, &stage, &projectID, &d.ClosedAt); err != nil {
				continue
			}
			d.Stage = stage
			d.ProjectID = projectID
			recentDeals = append(recentDeals, d)
		}
		dealRows.Close()
		resp.RecentDeals = recentDeals

		// Leaderboard (top presales by deals, then calls)
		leaderboard, err := s.getLeaderboard(ctx, orgID)
		if err != nil {
			return nil, err
		}
		resp.Leaderboard = leaderboard
	}

	return resp, nil
}

// getLeaderboard returns top presales/sales by deals and calls for the organization.
func (s *DashboardService) getLeaderboard(ctx context.Context, orgID string) ([]models.LeaderboardItem, error) {
	query := `
		SELECT u.id::text, u.name, 'presales' AS role,
			COUNT(DISTINCT l.id) AS total_leads,
			COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'deal') AS deals,
			COUNT(c.id) AS total_calls
		FROM users_presales u
		LEFT JOIN leads l ON (l.presales_user_id = u.id OR (l.assigned_to_user_id = u.id AND l.assigned_to_user_type = 'presales')) AND l.organization_id = u.organization_id AND l.deleted_at IS NULL
		LEFT JOIN lead_calls c ON c.lead_id = l.id AND c.organization_id = l.organization_id
		WHERE u.organization_id = $1 AND u.deleted_at IS NULL
		GROUP BY u.id, u.name
		ORDER BY COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'deal') DESC, COUNT(c.id) DESC
		LIMIT 10`
	rows, err := s.DB.Query(ctx, query, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.LeaderboardItem
	for rows.Next() {
		var item models.LeaderboardItem
		if err := rows.Scan(&item.UserID, &item.Name, &item.Role, &item.TotalLeads, &item.Deals, &item.TotalCalls); err != nil {
			continue
		}
		list = append(list, item)
	}
	return list, nil
}

// GetLeaderboard returns leaderboard for GM/Manager only. Exposed as separate endpoint.
func (s *DashboardService) GetLeaderboard(ctx context.Context, orgID string) ([]models.LeaderboardItem, error) {
	return s.getLeaderboard(ctx, orgID)
}
