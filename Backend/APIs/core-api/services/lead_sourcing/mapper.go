package lead_sourcing

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Mapper converts raw provider leads into NormalizedLeads, resolving project mappings.
type Mapper struct {
	db *pgxpool.Pool
}

func NewMapper(db *pgxpool.Pool) *Mapper {
	return &Mapper{db: db}
}

// Map applies MappingConfig.FieldMap to each RawLead and resolves external project IDs.
// orgID and provider are needed to look up external_project_mappings.
func (m *Mapper) Map(ctx context.Context, raw []RawLead, cfg MappingConfig, orgID, provider string) ([]NormalizedLead, error) {
	// Pre-load all project mappings for this org+provider to avoid N+1 queries.
	projectMap, err := m.loadProjectMappings(ctx, orgID, provider)
	if err != nil {
		return nil, fmt.Errorf("mapper: load project mappings: %w", err)
	}

	leads := make([]NormalizedLead, 0, len(raw))
	for _, r := range raw {
		nl := m.mapOne(r, cfg.FieldMap, projectMap)
		if nl.Phone == "" {
			// Phone is required; skip leads without a phone number.
			continue
		}
		leads = append(leads, nl)
	}
	return leads, nil
}

// mapOne maps a single RawLead using the field map.
func (m *Mapper) mapOne(r RawLead, fieldMap map[string]string, projectMap map[string]*string) NormalizedLead {
	get := func(ourField string) string {
		providerField, ok := fieldMap[ourField]
		if !ok {
			return ""
		}
		return stringVal(r[providerField])
	}

	nl := NormalizedLead{
		Name:              get("name"),
		Phone:             normalizePhone(get("phone")),
		Email:             get("email"),
		City:              get("city"),
		State:             get("state"),
		SourceDetail:      get("source_detail"),
		ExternalLeadID:    get("external_lead_id"),
		ExternalProjectID: get("external_project_id"),
	}

	// Resolve budget fields if mapped.
	if budgetMinStr := get("budget_min"); budgetMinStr != "" {
		if v, err := strconv.ParseFloat(budgetMinStr, 64); err == nil {
			nl.BudgetMin = &v
		}
	}
	if budgetMaxStr := get("budget_max"); budgetMaxStr != "" {
		if v, err := strconv.ParseFloat(budgetMaxStr, 64); err == nil {
			nl.BudgetMax = &v
		}
	}

	// Resolve external project ID to internal project UUID.
	if nl.ExternalProjectID != "" {
		if internalID, ok := projectMap[nl.ExternalProjectID]; ok {
			nl.InternalProjectID = internalID
		}
	}

	// Optional: provider lead creation time (unix seconds) → list filters by created_at match API date ranges.
	if path, ok := fieldMap["external_created_at"]; ok && path != "" {
		s := stringVal(r[path])
		if s != "" {
			if ts, err := strconv.ParseInt(s, 10, 64); err == nil && ts > 0 {
				t := time.Unix(ts, 0).UTC()
				nl.CreatedAt = &t
			}
		}
	}

	return nl
}

// loadProjectMappings fetches all external->internal project mappings for org+provider.
// Returns a map of external_project_id -> *internal_project_id (nil when unmapped).
func (m *Mapper) loadProjectMappings(ctx context.Context, orgID, provider string) (map[string]*string, error) {
	rows, err := m.db.Query(ctx, `
		SELECT external_project_id, internal_project_id::text
		FROM external_project_mappings
		WHERE organization_id = $1 AND provider = $2
	`, orgID, provider)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]*string)
	for rows.Next() {
		var extID string
		var intID *string
		if err := rows.Scan(&extID, &intID); err != nil {
			return nil, err
		}
		result[extID] = intID
	}
	return result, rows.Err()
}

// ExtractLeadsArray navigates a nested JSON map using a dot-separated path to return
// the slice of raw leads from the provider response envelope.
// E.g. path "data" returns response["data"]; path "results.leads" returns response["results"]["leads"].
func ExtractLeadsArray(response map[string]any, path string) []RawLead {
	if path == "" {
		return toRawLeadSlice(response)
	}
	parts := strings.SplitN(path, ".", 2)
	val, ok := response[parts[0]]
	if !ok {
		return nil
	}
	if len(parts) == 1 {
		return toRawLeadSlice(val)
	}
	if nested, ok := val.(map[string]any); ok {
		return ExtractLeadsArray(nested, parts[1])
	}
	return nil
}

// stringVal converts any JSON value to a string representation.
func stringVal(v any) string {
	if v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	case float64:
		// JSON numbers decode to float64; format without trailing zeros for integer values.
		if t == float64(int64(t)) {
			return strconv.FormatInt(int64(t), 10)
		}
		return strconv.FormatFloat(t, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(t)
	default:
		return fmt.Sprintf("%v", v)
	}
}

// normalizePhone strips non-numeric characters and ensures a +91 prefix for 10-digit numbers.
func normalizePhone(raw string) string {
	if raw == "" {
		return ""
	}
	// Keep only digits.
	var digits strings.Builder
	for _, c := range raw {
		if c >= '0' && c <= '9' {
			digits.WriteRune(c)
		}
	}
	d := digits.String()
	switch len(d) {
	case 10:
		return "+91" + d
	case 12:
		// Likely 91XXXXXXXXXX
		if strings.HasPrefix(d, "91") {
			return "+" + d
		}
	case 13:
		if strings.HasPrefix(d, "091") {
			return "+" + d[1:]
		}
	}
	// Return as-is if we can't normalise (e.g. international numbers).
	if !strings.HasPrefix(raw, "+") {
		return raw
	}
	return raw
}
