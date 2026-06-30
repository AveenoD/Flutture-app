package models

// QuotationStatsResponse is returned by GET /api/v1/quotations/stats (sales / manager / GM).
// Growth percentages compare month-to-date vs the same elapsed window in the previous calendar month.
type QuotationStatsResponse struct {
	TotalQuotations       int     `json:"total_quotations"`
	TotalQuotationsGrowth float64 `json:"total_quotations_growth_pct"`

	TotalValueINR       float64 `json:"total_value_inr"`
	TotalValueGrowthPct float64 `json:"total_value_growth_pct"`

	ThisMonthCount  int     `json:"this_month_count"`
	ThisMonthGrowth float64 `json:"this_month_growth_pct"`

	ApprovedCount  int     `json:"approved_count"`
	ApprovedGrowth float64 `json:"approved_growth_pct"`

	PendingCount  int     `json:"pending_count"`
	PendingGrowth float64 `json:"pending_growth_pct"`
}
