package models

import "time"

// DashboardStats aggregates high-level KPIs for dashboard views
type DashboardStats struct {
	TotalLeads       int     `json:"total_leads"`
	ActiveLeads      int     `json:"active_leads"`
	DealsClosed      int     `json:"deals_closed"`
	ConversionRate   float64 `json:"conversion_rate"` // deals/total*100
	TotalCalls       int     `json:"total_calls"`
	TotalVisits      int     `json:"total_visits"`
	PendingFollowUps int     `json:"pending_followups"`
	UpcomingVisits   int     `json:"upcoming_visits"`
}

// PipelineStage is count of leads in a stage
type PipelineStage struct {
	Stage string `json:"stage"`
	Count int    `json:"count"`
}

// LeaderboardItem is one row in leaderboard response
type LeaderboardItem struct {
	UserID     string `json:"user_id"`
	Name       string `json:"name"`
	Role       string `json:"role"`
	TotalLeads int    `json:"total_leads"`
	Deals      int    `json:"deals"`
	TotalCalls int    `json:"total_calls"`
}

// FollowUpSummary is a lightweight follow-up item for dashboard
type FollowUpSummary struct {
	ID              string     `json:"id"`
	LeadID          string     `json:"lead_id"`
	LeadName        string     `json:"lead_name"`
	FollowupType    string     `json:"followup_type"`
	FollowupDate    time.Time  `json:"followup_date"`
	Remark          *string    `json:"remark,omitempty"`
	AssignedToID    *string    `json:"assigned_to_id,omitempty"`
	AssignedRole    *string    `json:"assigned_role,omitempty"`
	ProjectTitle    *string    `json:"project_title,omitempty"`
	Stage           *string    `json:"stage,omitempty"`
	LeadTemperature string     `json:"lead_temperature,omitempty"`
	BudgetMin       *float64   `json:"budget_min,omitempty"`
	BudgetMax       *float64   `json:"budget_max,omitempty"`
}

// VisitSummary is a lightweight visit item for dashboard
type VisitSummary struct {
	ID        string     `json:"id"`
	LeadID    string     `json:"lead_id"`
	LeadName  string     `json:"lead_name"`
	VisitDate *time.Time `json:"visit_date,omitempty"`
	VisitTime *string    `json:"visit_time,omitempty"`
	Status    string     `json:"status"`
}

// LeadSummaryShort is a minimal lead row for recent deals widgets
type LeadSummaryShort struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Status    string    `json:"status"`
	Stage     *string   `json:"stage,omitempty"`
	ProjectID *string   `json:"project_id,omitempty"`
	ClosedAt  time.Time `json:"closed_at"`
}

// DashboardResponse is the unified response for GET /dashboard
type DashboardResponse struct {
	Stats             DashboardStats     `json:"stats"`
	Pipeline          []PipelineStage    `json:"pipeline"`
	UpcomingFollowUps []FollowUpSummary  `json:"upcoming_followups"`
	UpcomingVisits    []VisitSummary     `json:"upcoming_visits"`
	RecentDeals       []LeadSummaryShort `json:"recent_deals,omitempty"`  // GM/Manager
	Leaderboard       []LeaderboardItem  `json:"leaderboard,omitempty"`   // GM/Manager
}

