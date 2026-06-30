# UI Screens Needed — Lead Sourcing Integration

All screens are **GM / Manager only** (Settings area).

---

## Screen 1: Provider Integrations (Settings > Integrations)

**API:** `organization-apis` CRUD

**What it shows:**
- List of connected providers as cards/tiles (Housing.com, 99acres, NoBroker, MagicBricks, etc.)
- Each card: provider name/logo, status badge (active / disabled / error), auth_type, created date
- "Connect New Provider" button

**Actions:**
- **Add:** Bottom sheet / dialog — provider (dropdown), auth_type (dropdown), api_key, username, password, base_endpoint (optional)
- **Edit:** Tap card → edit credentials, toggle status
- **Delete:** Swipe or long-press → confirm delete (warns: cascades to configs + sync history)

---

## Screen 2: Sourcing Configs (per provider)

**API:** `lead-sourcing-configs` CRUD + `sync-now`

**Entry:** Tap a provider card from Screen 1 → opens its configs

**What it shows:**
- List of sourcing configs for that provider
- Each item: lead_source_tag, sync_mode (scheduled / realtime), interval (e.g. "Every 60 min"), last_synced_at
- "Add Config" button

**Actions:**
- **Add / Edit:** Form with:
  - Sync mode toggle (scheduled / realtime)
  - Sync interval (minutes input, only if scheduled)
  - Lead source tag (dropdown: housing, 99acres, etc.)
  - **Field Mapping Builder** (see below)
- **Sync Now** button per config → calls `sync-now` → toast: "8 fetched, 5 created, 3 skipped"
- **Delete** config

### Field Mapping Builder (inside config form)

Two-column layout:

| Internal Field (fixed) | Provider Field (user types) |
|------------------------|-----------------------------|
| name                   | `lead_name`                 |
| phone                  | `lead_phone`                |
| email                  | `lead_email`                |
| city                   | `lead_city`                 |
| state                  |                             |
| budget_min             | `budget`                    |
| budget_max             |                             |
| source_detail          | `project_name`              |
| external_project_id    | `project_id`                |
| external_lead_id       | `lead_date`                 |

Plus:
- `response_leads_path` input (e.g. "data")
- `provider_config` key-value pairs (e.g. profile_id = 24039743)

---

## Screen 3: External Project Mappings (Settings > Project Mappings)

**API:** `external-project-mappings` CRUD

**What it shows:**
- List grouped/filtered by provider (tabs or dropdown)
- Each row: external_project_id, external_project_name → internal project name (or "Unmapped")
- "Add Mapping" button

**Actions:**
- **Add:** Form — provider (dropdown), external project ID (text), external project name (text, optional), internal project (searchable dropdown from `GET /projects`)
- **Edit:** Change internal project mapping
- **Delete:** Remove mapping

**UX note:** After a sync, if new external project IDs appear with no mapping → show "Unmapped Projects" alert/badge linking here.

---

## Screen 4: Sync History / Logs

**API:** `lead-sync-logs`

**Entry:**
- Inside a sourcing config detail (filtered by `config_id`)
- Standalone: Settings > Sync History (all logs)

**What it shows:**
- Table/list: started_at, completed_at, status (running / success / error with color), leads_fetched, leads_created, leads_skipped, error_message
- Most recent first
- Filter by config (dropdown)

---

## Screen Flow

```
Settings
  └── Integrations (Screen 1)
  │     ├── [+ Connect Provider]  →  Add credentials form
  │     └── [Provider Card]       →  Sourcing Configs (Screen 2)
  │           ├── [+ Add Config]  →  Config form + Field Mapping Builder
  │           ├── [Sync Now]      →  Toast with result
  │           └── [View Logs]     →  Sync History (Screen 4, filtered)
  │
  └── Project Mappings (Screen 3)
  │     ├── [+ Add Mapping]       →  Map external → internal project
  │     └── [Unmapped Alert]      →  Shows unresolved external IDs
  │
  └── Sync History (Screen 4, all)
```

---

## Optional / Nice-to-have

| Screen | Description |
|--------|-------------|
| Provider Marketplace | Pre-built cards for supported providers with setup wizard — select provider → enter creds → auto-fill default field mapping |
| Mapping Preview | Before saving a config, dry-run preview: "Here's how the first 3 leads would map" |
| Dashboard Widget | "External Leads" card on GM dashboard — total synced today, errors, quick link to sync history |
| Unmapped Projects Alert | Banner/notification when synced leads have external_project_id with no internal mapping |

---

**Total: 4 core screens + optional dashboard widget.**
Most complex piece: **Field Mapping Builder** in Screen 2. Rest is straightforward CRUD.
