package lead_sourcing

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Router is the subset of LeadRoutingService used by the engine.
type Router interface {
	RouteLead(ctx context.Context, leadID string) error
}

// Engine is the background scheduler that periodically syncs leads from all
// active lead-sourcing API configs.
type Engine struct {
	db       *pgxpool.Pool
	registry *Registry
	mapper   *Mapper
	router   Router
	tickRate time.Duration
}

// NewEngine creates a new Engine.
// tickRate controls how often the engine checks for due syncs (default: 60s).
func NewEngine(db *pgxpool.Pool, router Router, tickRate time.Duration) *Engine {
	if tickRate <= 0 {
		tickRate = 60 * time.Second
	}
	registry := NewRegistry()
	return &Engine{
		db:       db,
		registry: registry,
		mapper:   NewMapper(db),
		router:   router,
		tickRate: tickRate,
	}
}

// Start runs the scheduler. It blocks until ctx is cancelled.
// Intended to be called as: go engine.Start(ctx)
func (e *Engine) Start(ctx context.Context) {
	log.Println("[lead_sourcing] engine started")
	ticker := time.NewTicker(e.tickRate)
	defer ticker.Stop()

	// Run immediately on startup, then on every tick.
	e.runDueSyncs(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("[lead_sourcing] engine stopped")
			return
		case <-ticker.C:
			e.runDueSyncs(ctx)
		}
	}
}

// SyncNow triggers an immediate sync for a single config ID.
func (e *Engine) SyncNow(ctx context.Context, configID string) (*SyncResult, error) {
	cfg, err := e.loadSourcingConfig(ctx, configID)
	if err != nil {
		return nil, fmt.Errorf("lead_sourcing: load config %s: %w", configID, err)
	}
	result, err := e.syncOne(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// runDueSyncs checks all active configs and syncs those whose interval has elapsed.
func (e *Engine) runDueSyncs(ctx context.Context) {
	configs, err := e.loadDueConfigs(ctx)
	if err != nil {
		log.Printf("[lead_sourcing] error loading configs: %v", err)
		return
	}
	for _, cfg := range configs {
		if ctx.Err() != nil {
			return
		}
		if _, err := e.syncOne(ctx, cfg); err != nil {
			log.Printf("[lead_sourcing] sync error for config %s (%s): %v", cfg.ID, cfg.Provider, err)
		}
	}
}

// syncOne runs one full fetch-map-insert cycle for a single SourcingConfig.
func (e *Engine) syncOne(ctx context.Context, cfg SourcingConfig) (*SyncResult, error) {
	logID, err := e.createSyncLog(ctx, cfg.ID)
	if err != nil {
		return nil, fmt.Errorf("lead_sourcing: create sync log: %w", err)
	}

	result := &SyncResult{}
	var syncErr error

	defer func() {
		errMsg := ""
		if syncErr != nil {
			errMsg = syncErr.Error()
		}
		result.ErrorMessage = errMsg
		status := "completed"
		if syncErr != nil {
			status = "error"
		}
		if err := e.finalizeSyncLog(context.Background(), logID, status, result); err != nil {
			log.Printf("[lead_sourcing] finalize sync log %s: %v", logID, err)
		}
		if err := e.updateLastSyncedAt(context.Background(), cfg.ID); err != nil {
			log.Printf("[lead_sourcing] update last_synced_at for %s: %v", cfg.ID, err)
		}
	}()

	// Load credentials.
	creds, err := e.loadCredentials(ctx, cfg.OrgAPIID)
	if err != nil {
		syncErr = fmt.Errorf("load creds: %w", err)
		return result, syncErr
	}

	// Get the provider.
	provider, err := e.registry.Get(cfg.Provider)
	if err != nil {
		syncErr = err
		return result, syncErr
	}

	// Fetch raw leads from the provider.
	rawLeads, err := provider.FetchLeads(ctx, creds, cfg)
	if err != nil {
		syncErr = fmt.Errorf("fetch leads: %w", err)
		return result, syncErr
	}
	result.LeadsFetched = len(rawLeads)

	// Apply field mapping.
	normalized, err := e.mapper.Map(ctx, rawLeads, cfg.MappingConfig, cfg.OrganizationID, cfg.Provider)
	if err != nil {
		syncErr = fmt.Errorf("map leads: %w", err)
		return result, syncErr
	}

	// Insert deduplicated leads.
	for _, nl := range normalized {
		created, err := e.insertLead(ctx, cfg.OrganizationID, cfg.LeadSourceTag, nl)
		if err != nil {
			log.Printf("[lead_sourcing] insert lead (phone=%s): %v", nl.Phone, err)
			result.LeadsSkipped++
			continue
		}
		if !created {
			result.LeadsSkipped++
			continue
		}
		result.LeadsCreated++
	}

	log.Printf("[lead_sourcing] sync done for %s (%s): fetched=%d created=%d skipped=%d",
		cfg.ID, cfg.Provider, result.LeadsFetched, result.LeadsCreated, result.LeadsSkipped)

	return result, nil
}

// insertLead inserts a normalized lead and triggers presales routing.
// Returns (true, nil) if a new lead was created, (false, nil) if it was a duplicate.
func (e *Engine) insertLead(ctx context.Context, orgID, sourceTag string, nl NormalizedLead) (bool, error) {
	var leadID uuid.UUID

	query := `
		INSERT INTO leads (
			organization_id, name, phone, email, city, state,
			budget_min, budget_max, lead_temperature, source,
			external_lead_id, project_id,
			created_at, updated_at
		) VALUES (
			$1, $2, $3,
			NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''),
			$7, $8, 'warm', $9::lead_source,
			NULLIF($10, ''), $11,
			COALESCE($12::timestamptz, CURRENT_TIMESTAMP),
			COALESCE($12::timestamptz, CURRENT_TIMESTAMP)
		)
		ON CONFLICT (organization_id, source, external_lead_id)
		WHERE external_lead_id IS NOT NULL AND deleted_at IS NULL
		DO NOTHING
		RETURNING id
	`

	var createdAt any
	if nl.CreatedAt != nil {
		createdAt = *nl.CreatedAt
	}

	err := e.db.QueryRow(ctx, query,
		orgID,
		nl.Name,
		nl.Phone,
		nl.Email,
		nl.City,
		nl.State,
		nl.BudgetMin,
		nl.BudgetMax,
		sourceTag,
		nl.ExternalLeadID,
		nl.InternalProjectID,
		createdAt,
	).Scan(&leadID)

	if err != nil {
		// pgx returns pgx.ErrNoRows when ON CONFLICT DO NOTHING fires (no row returned).
		if err.Error() == "no rows in result set" {
			return false, nil
		}
		return false, err
	}

	// Trigger presales routing.
	if e.router != nil {
		if err := e.router.RouteLead(ctx, leadID.String()); err != nil {
			log.Printf("[lead_sourcing] route lead %s: %v", leadID, err)
		}
	}

	return true, nil
}

// ---- DB helpers ----

// loadDueConfigs loads all active configs whose next sync time has elapsed.
func (e *Engine) loadDueConfigs(ctx context.Context) ([]SourcingConfig, error) {
	rows, err := e.db.Query(ctx, `
		SELECT
			lsc.id,
			lsc.organization_api_id,
			oa.organization_id,
			oa.provider::text,
			lsc.sync_mode::text,
			COALESCE(lsc.sync_interval_min, 60),
			lsc.last_synced_at,
			lsc.lead_source_tag::text,
			lsc.mapping_config_json
		FROM lead_sourcing_api_configs lsc
		JOIN organization_apis oa ON oa.id = lsc.organization_api_id
		WHERE oa.status = 'active'
		  AND (
			lsc.last_synced_at IS NULL
			OR lsc.last_synced_at + (lsc.sync_interval_min * INTERVAL '1 minute') <= NOW()
		  )
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []SourcingConfig
	for rows.Next() {
		var cfg SourcingConfig
		var mappingJSON []byte
		if err := rows.Scan(
			&cfg.ID,
			&cfg.OrgAPIID,
			&cfg.OrganizationID,
			&cfg.Provider,
			&cfg.SyncMode,
			&cfg.SyncIntervalMin,
			&cfg.LastSyncedAt,
			&cfg.LeadSourceTag,
			&mappingJSON,
		); err != nil {
			return nil, err
		}
		if len(mappingJSON) > 0 {
			_ = json.Unmarshal(mappingJSON, &cfg.MappingConfig)
		}
		configs = append(configs, cfg)
	}
	return configs, rows.Err()
}

// loadSourcingConfig loads a single config by ID.
func (e *Engine) loadSourcingConfig(ctx context.Context, configID string) (SourcingConfig, error) {
	var cfg SourcingConfig
	var mappingJSON []byte
	err := e.db.QueryRow(ctx, `
		SELECT
			lsc.id,
			lsc.organization_api_id,
			oa.organization_id,
			oa.provider::text,
			lsc.sync_mode::text,
			COALESCE(lsc.sync_interval_min, 60),
			lsc.last_synced_at,
			lsc.lead_source_tag::text,
			lsc.mapping_config_json
		FROM lead_sourcing_api_configs lsc
		JOIN organization_apis oa ON oa.id = lsc.organization_api_id
		WHERE lsc.id = $1
	`, configID).Scan(
		&cfg.ID,
		&cfg.OrgAPIID,
		&cfg.OrganizationID,
		&cfg.Provider,
		&cfg.SyncMode,
		&cfg.SyncIntervalMin,
		&cfg.LastSyncedAt,
		&cfg.LeadSourceTag,
		&mappingJSON,
	)
	if err != nil {
		return cfg, err
	}
	if len(mappingJSON) > 0 {
		_ = json.Unmarshal(mappingJSON, &cfg.MappingConfig)
	}
	return cfg, nil
}

// loadCredentials loads and returns OrgAPICredentials for an organization_api row.
// Note: in production consider encrypting the stored keys; here we store them plaintext
// in api_key_encrypted / password_encrypted and read them back directly.
func (e *Engine) loadCredentials(ctx context.Context, orgAPIID string) (OrgAPICredentials, error) {
	var creds OrgAPICredentials
	err := e.db.QueryRow(ctx, `
		SELECT
			id::text,
			provider::text,
			auth_type::text,
			COALESCE(api_key_encrypted, ''),
			COALESCE(username, ''),
			COALESCE(password_encrypted, ''),
			COALESCE(base_endpoint, '')
		FROM organization_apis
		WHERE id = $1
	`, orgAPIID).Scan(
		&creds.ID,
		&creds.Provider,
		&creds.AuthType,
		&creds.APIKey,
		&creds.Username,
		&creds.Password,
		&creds.BaseEndpoint,
	)
	return creds, err
}

func (e *Engine) createSyncLog(ctx context.Context, configID string) (string, error) {
	var id string
	err := e.db.QueryRow(ctx, `
		INSERT INTO lead_sync_logs (lead_sourcing_config_id, status)
		VALUES ($1, 'running')
		RETURNING id::text
	`, configID).Scan(&id)
	return id, err
}

func (e *Engine) finalizeSyncLog(ctx context.Context, logID, status string, result *SyncResult) error {
	_, err := e.db.Exec(ctx, `
		UPDATE lead_sync_logs
		SET status = $1, completed_at = NOW(),
		    leads_fetched = $2, leads_created = $3, leads_skipped = $4,
		    error_message = NULLIF($5, '')
		WHERE id = $6
	`, status, result.LeadsFetched, result.LeadsCreated, result.LeadsSkipped, result.ErrorMessage, logID)
	return err
}

func (e *Engine) updateLastSyncedAt(ctx context.Context, configID string) error {
	_, err := e.db.Exec(ctx, `
		UPDATE lead_sourcing_api_configs SET last_synced_at = NOW(), updated_at = NOW()
		WHERE id = $1
	`, configID)
	return err
}
