package lead_sourcing

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// Housing API rejects ranges where end_date - start_date spans more than 2 calendar days (error phl-5).
// We cover fetch_lookback_days by issuing multiple 2-day (max) requests.

// HousingProvider fetches leads from Housing.com's builder API.
// Authentication uses HMAC-SHA256 over the current unix timestamp with
// the organization's encryption key stored in api_key_encrypted.
type HousingProvider struct{}

func (h *HousingProvider) Name() string { return "housing" }

// FetchLeads retrieves leads across a lookback window by chunking into <=2-day ranges.
// Credentials:
//   - creds.APIKey         = the HMAC encryption key (api_key_encrypted)
//   - config.MappingConfig.ProviderConfig["profile_id"] = builder profile ID
//   - config.MappingConfig.ProviderConfig["fetch_lookback_days"] = optional; total days back from now to cover (default 14, max 365)
//   - creds.BaseEndpoint   = optional override; defaults to Housing production URL
func (h *HousingProvider) FetchLeads(ctx context.Context, creds OrgAPICredentials, config SourcingConfig) ([]RawLead, error) {
	profileID, ok := config.MappingConfig.ProviderConfig["profile_id"]
	if !ok || profileID == "" {
		return nil, fmt.Errorf("housing: missing profile_id in provider_config")
	}

	encKey := creds.APIKey
	if encKey == "" {
		return nil, fmt.Errorf("housing: missing api_key (encryption key)")
	}

	baseURL := creds.BaseEndpoint
	if baseURL == "" {
		baseURL = "https://pahal.housing.com/api/v0/get-builder-leads"
	}

	now := time.Now()
	lookbackDays := 14
	if s, ok := config.MappingConfig.ProviderConfig["fetch_lookback_days"]; ok && s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			lookbackDays = n
			if lookbackDays > 365 {
				lookbackDays = 365
			}
		}
	}

	// First midnight at or before the lookback start
	lookbackStart := now.AddDate(0, 0, -lookbackDays)
	chunkStart := time.Unix(startOfDayEpoch(lookbackStart), 0).In(now.Location())
	endBound := now
	currentTime := now.Unix()

	var merged []RawLead
	seen := make(map[string]struct{})

	for chunkStart.Before(endBound) {
		// Max window: 2 days from chunkStart midnight → end of second day, capped at `now`
		chunkEnd := chunkStart.Add(48*time.Hour - time.Second)
		if chunkEnd.After(endBound) {
			chunkEnd = endBound
		}
		if !chunkEnd.After(chunkStart) {
			break
		}

		startUnix := chunkStart.Unix()
		endUnix := chunkEnd.Unix()

		part, err := h.fetchOneWindow(ctx, baseURL, profileID, encKey, startUnix, endUnix, currentTime)
		if err != nil {
			return nil, err
		}
		for _, rl := range part {
			key := dedupKey(rl)
			if key != "" {
				if _, ok := seen[key]; ok {
					continue
				}
				seen[key] = struct{}{}
			}
			merged = append(merged, rl)
		}

		// Next non-overlapping 2-day block (midnight)
		chunkStart = chunkStart.AddDate(0, 0, 2)
	}

	return merged, nil
}

func dedupKey(r RawLead) string {
	// stringVal from mapper.go (same package)
	phone := stringVal(r["lead_phone"])
	lid := stringVal(r["lead_date"])
	pid := stringVal(r["project_id"])
	if phone != "" {
		return phone + "|" + lid + "|" + pid
	}
	if lid != "" || pid != "" {
		return lid + "|" + pid
	}
	return ""
}

// fetchOneWindow performs a single GET with start_date/end_date (must satisfy Housing <=2-day rule).
func (h *HousingProvider) fetchOneWindow(ctx context.Context, baseURL, profileID, encKey string, startUnix, endUnix, currentTime int64) ([]RawLead, error) {
	hashStr := housingHMAC(encKey, currentTime)
	params := url.Values{}
	params.Set("start_date", strconv.FormatInt(startUnix, 10))
	params.Set("end_date", strconv.FormatInt(endUnix, 10))
	params.Set("current_time", strconv.FormatInt(currentTime, 10))
	params.Set("hash", hashStr)
	params.Set("id", profileID)
	params.Set("per_page", "1000")

	fullURL := baseURL + "?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("housing: build request: %w", err)
	}

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("housing: http request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("housing: read body: %w", err)
	}

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("housing: unauthorized (401) — check profile_id and encryption key")
	}
	if resp.StatusCode == 422 {
		return nil, fmt.Errorf("housing: validation error (422): %s", string(body))
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("housing: unexpected status %d: %s", resp.StatusCode, string(body))
	}

	var envelope struct {
		Data any `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("housing: parse response: %w", err)
	}

	return toRawLeadSlice(envelope.Data), nil
}

// housingHMAC generates the HMAC-SHA256 of the unix timestamp string using the encryption key.
func housingHMAC(key string, ts int64) string {
	mac := hmac.New(sha256.New, []byte(key))
	mac.Write([]byte(strconv.FormatInt(ts, 10)))
	return hex.EncodeToString(mac.Sum(nil))
}

// startOfDayEpoch returns the unix timestamp for midnight (local time) of the given day.
func startOfDayEpoch(t time.Time) int64 {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location()).Unix()
}

// toRawLeadSlice normalises Housing's data field which can be a JSON array or a single object.
func toRawLeadSlice(data any) []RawLead {
	if data == nil {
		return nil
	}
	switch v := data.(type) {
	case []any:
		leads := make([]RawLead, 0, len(v))
		for _, item := range v {
			if m, ok := item.(map[string]any); ok {
				leads = append(leads, RawLead(m))
			}
		}
		return leads
	case map[string]any:
		return []RawLead{RawLead(v)}
	default:
		return nil
	}
}
