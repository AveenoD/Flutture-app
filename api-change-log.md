# API change log

All backend/API changes are documented here with **where**, **why**, **when**, **how**, and **file paths**.

## 12. Call recording: presigned download URL signing on all GET responses

| Field    | Detail |
|----------|--------|
| **Where** | `GET /api/v1/leads/:id/calls/:call_id`, `GET /api/v1/leads/:id/calls`, and all stage/summary/follow-up responses that include `recording_url` (stage-by-type, lead summary, stage-by-id, follow-up detail). |
| **Why**   | Call recordings are stored in Backblaze B2 as raw object keys (e.g. `recordings/org-id/lead-id/call-id.m4a`). Returning raw keys to clients is useless because they are not directly accessible URLs. The Flutter `_RecordingPlayer` (`just_audio`) needs a real HTTPS URL to stream audio. Booking documents already use this pattern correctly; call recordings were missing it. |
| **When**  | After confirming that upload (presigned PUT) and metadata patch worked end-to-end, but `GET /calls/:call_id` still returned raw object key in `recording_url` instead of a playable URL. |
| **How**   | Added a `signRecordingURL(ctx, *string)` helper method to both `CallService` and `LeadService`. The helper converts a stored object key to a 1-hour presigned GET URL using `StorageService.GeneratePresignedDownloadURL` (same MinIO client already used for booking documents). If the value is already an `https://` URL or storage is not configured, it is left unchanged (safe no-op). Applied the helper at every point where `recording_url` is set on a response struct before returning. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/services/call.go` | Added `signRecordingURL` helper to `CallService`; called after building `CallDetailResponse` in `GetCall` and in the row loop of `ListCalls`. |
| `Backend/APIs/core-api/services/lead.go` | Added `signRecordingURL` helper to `LeadService`; called after `c.RecordingURL = recordingURL` in `GetLeadStageByType`, `GetLeadSummary`, `GetLeadStageByID`, and `GetFollowUpByID`. |

### No new endpoints

All existing call endpoints are unchanged. Only the `recording_url` field in responses changes from a raw object key to a signed HTTPS URL when a recording has been uploaded.

---

## 11. Lead sourcing integration: provider credentials, field mapping, project mapping, and scheduled sync

| Field    | Detail |
|----------|--------|
| **Where** | New protected routes under `/api/v1`: `organization-apis`, `lead-sourcing-configs`, `external-project-mappings`, and `lead-sync-logs`; background scheduler in core API startup; lead insert path now supports `external_lead_id` dedup. |
| **Why**   | Organizations need to connect multiple external lead providers (Housing, 99acres, etc.), store per-org API credentials, map provider-specific response fields to internal lead fields, and resolve external project IDs to internal projects before creating leads. Different providers return different payload shapes, so ingestion must be configurable instead of hardcoded. |
| **When**  | While replacing the one-off Housing fetcher flow with a reusable in-product lead ingestion architecture that works on fresh setup and can scale to new providers. |
| **How**   | Introduced a provider-adapter engine (`Provider` interface + registry) and a background sync scheduler that reads active configs from DB, fetches raw leads from provider APIs, transforms them via `mapping_config_json`, resolves `external_project_id` using `external_project_mappings`, inserts deduplicated leads using unique `(organization_id, source, external_lead_id)`, auto-routes newly created leads to presales, and writes observability records into `lead_sync_logs`. Added CRUD APIs for org credentials and mapping/config management, plus a manual `sync-now` trigger endpoint. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/Database/01-enums.sql` | Expanded `api_provider` with `housing`, `nobroker`, `magicbricks`; expanded `lead_source_tag` with `housing`, `nobroker`, `magicbricks`, `google_ads`. |
| `Backend/Database/05-leads.sql` | Added `external_lead_id` column on `leads` and unique partial index `idx_leads_external_dedup` on `(organization_id, source, external_lead_id)` for deduplication. |
| `Backend/Database/07-apis.sql` | Added `external_project_mappings` table (external provider project ID → internal `projects.id`) and `lead_sync_logs` table (sync observability), with indexes. |
| `Backend/APIs/core-api/services/lead_sourcing/models.go` | Added lead-sourcing internal DTOs (`OrgAPICredentials`, `SourcingConfig`, `MappingConfig`, `RawLead`, `NormalizedLead`, `SyncResult`). |
| `Backend/APIs/core-api/services/lead_sourcing/provider.go` | Added generic `Provider` interface and provider registry (`NewRegistry`, `Register`, `Get`). |
| `Backend/APIs/core-api/services/lead_sourcing/housing.go` | Added `HousingProvider` adapter (HMAC-SHA256 hash generation, today-range URL build, response parsing to `[]RawLead`). |
| `Backend/APIs/core-api/services/lead_sourcing/mapper.go` | Added mapper that transforms provider raw payloads using `mapping_config_json` and resolves external project IDs via DB mapping table. |
| `Backend/APIs/core-api/services/lead_sourcing/engine.go` | Added background sync engine (due config scan, provider fetch, map, insert, route, sync log lifecycle, `SyncNow`). |
| `Backend/APIs/core-api/models/lead_sourcing.go` | Added request/response models for org APIs, sourcing configs, external project mappings, sync logs, and sync-now result. |
| `Backend/APIs/core-api/services/lead_sourcing_service.go` | Added CRUD service methods for `organization_apis`, `lead_sourcing_api_configs`, `external_project_mappings`, `lead_sync_logs`, plus org scoping and `SyncNow` bridge to engine. |
| `Backend/APIs/core-api/handlers/lead_sourcing.go` | Added authenticated handlers for all lead-sourcing CRUD and sync routes. |
| `Backend/APIs/core-api/routes/lead_sourcing.go` | Added route registration for `/organization-apis`, `/lead-sourcing-configs`, `/external-project-mappings`, and `/lead-sync-logs`. |
| `Backend/APIs/core-api/main.go` | Wired lead sourcing engine startup/shutdown and registered lead-sourcing routes. |

### New endpoints

| Method | Route | Purpose |
|------|-------|---------|
| `POST` | `/api/v1/organization-apis` | Create per-organization provider credential config. |
| `GET` | `/api/v1/organization-apis` | List provider credential configs for current org. |
| `GET` | `/api/v1/organization-apis/:id` | Get one provider credential config. |
| `PUT` | `/api/v1/organization-apis/:id` | Update provider credential config/status. |
| `DELETE` | `/api/v1/organization-apis/:id` | Delete provider credential config. |
| `POST` | `/api/v1/lead-sourcing-configs` | Create sourcing config (`sync_mode`, interval, `mapping_config_json`). |
| `GET` | `/api/v1/lead-sourcing-configs` | List sourcing configs for current org. |
| `GET` | `/api/v1/lead-sourcing-configs/:id` | Get one sourcing config. |
| `PUT` | `/api/v1/lead-sourcing-configs/:id` | Update sourcing config. |
| `DELETE` | `/api/v1/lead-sourcing-configs/:id` | Delete sourcing config. |
| `POST` | `/api/v1/lead-sourcing-configs/:id/sync-now` | Trigger immediate sync for one config. |
| `POST` | `/api/v1/external-project-mappings` | Create provider external project to internal project mapping. |
| `GET` | `/api/v1/external-project-mappings` | List project mappings (`?provider=` optional). |
| `PUT` | `/api/v1/external-project-mappings/:id` | Update mapping. |
| `DELETE` | `/api/v1/external-project-mappings/:id` | Delete mapping. |
| `GET` | `/api/v1/lead-sync-logs` | List sync logs (`?config_id=` optional). |

---

## 10. Quotations: discount and customer info at creation (quotation-level, not stage-level)

| Field    | Detail |
|----------|--------|
| **Where** | `POST /api/v1/leads/:id/quotations` (request body extended). |
| **Why**   | Discount and customer details are part of the quotation, not the negotiation stage. The UI flow: create quotation with unit + optional add-ons, discount, customer info (pre-filled from lead), and valid-till. |
| **When**  | Aligning API with the Flutter flow where the negotiation stage no longer shows discount/commission; these are captured in the quotation creation sheet. |
| **How**   | `CreateQuotationRequest` gains `discount_name` and `discount_price`. The service persists them on insert. Customer fields (`customer_name`, `customer_contact`, `customer_email`, `valid_till`) were already supported; no change. OpenAPI and readme updated to document the flow. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/models/negotiation.go` | `CreateQuotationRequest` gains `DiscountName *string`, `DiscountPrice *float64`. |
| `Backend/APIs/core-api/services/negotiation.go` | `CreateQuotation` INSERT includes `discount_name`, `discount_price`. |
| `Backend/APIs/core-api/docs/open-api.yml` | POST quotations schema adds `discount_name`, `discount_price`; description updated for flow. |
| `Backend/APIs/core-api/readme.md` | 8.9 create quotation body extended with `discount_name`, `discount_price`. |

---

## 9. Quotations: per-quotation project/unit selection, approve/reject by manager, 'rejected' status, one-approved-per-lead enforcement

| Field    | Detail |
|----------|--------|
| **Where** | `POST /api/v1/leads/:id/quotations` (body extended), `POST /api/v1/leads/:id/quotations/:qid/approve` (new), `POST /api/v1/leads/:id/quotations/:qid/reject` (new), `GET /api/v1/leads/:id/quotations` and `GET /api/v1/leads/:id/quotations/:qid` (roles expanded). |
| **Why**   | The previous quotation flow had no way to create a quotation for a different project/unit than the current negotiation, no approve/reject endpoints for managers, no `rejected` status on quotations, and no DB-level guarantee that at most one quotation per lead is approved. |
| **When**  | Rebuilding the Negotiation stage to support a full quotation cycle: create quotation (any project/unit), manager approves/rejects, UI shows itemised price breakdown per quotation. |
| **How**   | `CreateQuotationRequest` now accepts optional `project_id`, `unit_id`, and `addon_ids` — when provided they override the latest negotiation's values, so each quotation can target a different unit. Two new endpoints `POST .../approve` and `.../reject` let managers change a quotation's status to `approved` or `rejected`. The `quotation_status` PostgreSQL enum gained a `rejected` value. A unique partial index `idx_lead_quotations_one_approved ON lead_quotations(lead_id) WHERE quotation_status = 'approved'` enforces that at most one quotation per lead can be approved at a time — the service surfaces this as `QUOTATION_ALREADY_APPROVED_FOR_LEAD` (HTTP 409). `ListQuotations` and `GetQuotation` now allow `manager` and `general_manager` roles in addition to `sales`. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/Database/01-enums.sql` | Added `'rejected'` to `quotation_status` enum. |
| `Backend/Database/09-lead-management.sql` | Added `CREATE UNIQUE INDEX idx_lead_quotations_one_approved ON lead_quotations(lead_id) WHERE quotation_status = 'approved'`. |
| `Backend/APIs/core-api/models/negotiation.go` | `CreateQuotationRequest` gains `ProjectID *string`, `UnitID *string`, `AddonIDs []string`. Added `ApproveQuotationRequest` and `RejectQuotationRequest` models. |
| `Backend/APIs/core-api/services/negotiation.go` | `CreateQuotation` uses optional project/unit/addon overrides from request. New `ApproveQuotation` and `RejectQuotation` service methods. `ListQuotations` and `GetQuotation` allow manager/gm roles. |
| `Backend/APIs/core-api/handlers/negotiation.go` | New `ApproveQuotation` and `RejectQuotation` handlers; maps `QUOTATION_ALREADY_APPROVED_FOR_LEAD` → HTTP 409. |
| `Backend/APIs/core-api/routes/negotiation.go` | Added `POST /:id/quotations/:qid/approve` and `POST /:id/quotations/:qid/reject` routes. |

---

## 8. Negotiation: allow multiple cycles per lead (latest negotiation treated as current)

| Field    | Detail |
|----------|--------|
| **Where** | `POST /api/v1/leads/:id/negotiation`, `GET /api/v1/leads/:id/negotiation`, `PATCH /api/v1/leads/:id/negotiation`, `GET /api/v1/leads/:id/negotiation/price-breakdown`, `POST /api/v1/leads/:id/negotiation/submit`, `POST /api/v1/leads/:id/negotiation/approve`, `POST /api/v1/leads/:id/negotiation/reject`, quotation helpers that derive from negotiation |
| **Why**   | Sales may negotiate on the same lead multiple times over its lifetime (e.g. one negotiation approved, then months later a new negotiation with different unit/price). The previous API enforced at most one negotiation per lead and blocked creating a new one once any negotiation existed, which prevented starting a fresh negotiation after an earlier one was approved or rejected. |
| **When**  | While wiring the Flutter Negotiation stage so that unit selection, add-ons, and price breakdown work even when a previous negotiation on the lead is already approved. The app needs to start a new negotiation cycle instead of reusing the historical one. |
| **How**   | Relaxed the "single negotiation" restriction and updated all negotiation-related services to consistently treat the **most recently created negotiation** for a lead as the "current" one, while still preventing multiple simultaneous drafts. `CreateNegotiation` now checks the latest negotiation's status: if it is `draft`, it fails with `NEGOTIATION_DRAFT_EXISTS`; otherwise it allows inserting a new draft negotiation row (earlier approved/rejected negotiations remain as history). `GetNegotiation`, `UpdateNegotiation`, `GetPriceBreakdown`, `SubmitNegotiation`, `ApproveNegotiation`, `RejectNegotiation`, and quotation helpers now all select from `lead_negotiations` using `ORDER BY created_at DESC LIMIT 1` so they always operate on the latest negotiation for that lead. The handler maps the new `NEGOTIATION_DRAFT_EXISTS` error to a 400 with message “An active draft negotiation already exists for this lead”, while keeping the old `NEGOTIATION_ALREADY_EXISTS` mapping for backward compatibility (though the service no longer emits it). No request/response JSON shapes changed. Existing clients that assume a single negotiation per lead continue to see only the latest one. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/services/negotiation.go` | `CreateNegotiation` now allows multiple negotiations per lead over time by removing the hard "no existing negotiation" check and instead querying the latest negotiation’s status; if it is `draft`, it returns `NEGOTIATION_DRAFT_EXISTS`, otherwise it inserts a new draft negotiation. `GetNegotiation`, `UpdateNegotiation`, `GetPriceBreakdown`, `SubmitNegotiation`, `ApproveNegotiation`, `RejectNegotiation`, and quotation helpers have been updated so that all `SELECT ... FROM lead_negotiations WHERE lead_id = $1 AND organization_id = $2` queries now append `ORDER BY created_at DESC LIMIT 1`, ensuring they always operate on the most recent negotiation for that lead. |
| `Backend/APIs/core-api/handlers/negotiation.go` | `CreateNegotiation` handler now understands the new `NEGOTIATION_DRAFT_EXISTS` service error and returns HTTP 400 with a user-friendly message “An active draft negotiation already exists for this lead”, while still mapping `NEGOTIATION_ALREADY_EXISTS` for safety. |


## 7. Follow-ups dashboard: pagination for `upcoming_followups`

| Field    | Detail |
|----------|--------|
| **Where** | `GET /api/v1/dashboard` — response `data.upcoming_followups[]` |
| **Why**   | The mobile Follow-ups screen should be able to scroll through **all** pending follow-ups, not just the first 10. Previously the dashboard endpoint always returned at most 10 upcoming items, so newer follow-ups created from stage screens could be hidden once there were more than 10 older pending follow-ups. |
| **When**  | After wiring stage 2/3 Follow-up creation to the global Follow-ups tab and noticing that some newly created follow-ups were visible in stage views but never appeared in the overall Follow-ups list. |
| **How**   | Added pagination parameters for the upcoming-followups slice on the dashboard service and exposed them as query parameters. The endpoint now accepts `fup_page` (1-based, default 1) and `fup_limit` (default 20, max 100). The SQL for `upcoming_followups` still returns pending follow-ups from `followup_date >= CURRENT_DATE - INTERVAL '1 day'`, ordered by `followup_date ASC`, but now applies `LIMIT fup_limit OFFSET (fup_page - 1) * fup_limit`. The response shape is unchanged; clients can page by adjusting `fup_page`. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/services/dashboard.go` | `GetDashboard` now takes `fupPage, fupLimit` arguments, clamps them (page ≥ 1, 1 ≤ limit ≤ 100), computes an `offset`, and updates the `upcoming_followups` query from `LIMIT 10` to `LIMIT fupLimit OFFSET offset`. Comment updated to reflect pagination. |
| `Backend/APIs/core-api/handlers/dashboard.go` | `GetDashboard` handler now reads optional `fup_page` and `fup_limit` query params (with defaults 1 and 20) and passes them into the dashboard service. |

### Client (Flutter) updates

| Path | Change |
|------|--------|
| `Example/presales_flutter_app/lib/features/followups/followups_repository.dart` | `getUpcomingFollowups` now accepts `{page = 1, limit = 20}` and calls `/api/v1/dashboard?fup_page=page&fup_limit=limit`, parsing `data.upcoming_followups` as before. |
| `Example/presales_flutter_app/lib/features/followups/followups_provider.dart` | `FollowupsListNotifier` now keeps pagination state (`_page`, `_hasMore`, `_pageSize = 20`) and exposes a `loadMore()` method. `build()` loads page 1; `loadMore()` fetches the next page, merges results (deduping by id), and sorts by `followupDate`, stopping when fewer than `_pageSize` items are returned. |
| `Example/presales_flutter_app/lib/features/followups/followups_screen.dart` | Wraps the `ListView` in a `NotificationListener<ScrollNotification>`; when the user scrolls near the bottom (`pixels >= maxScrollExtent - 200`), it calls `followupsListProvider.notifier.loadMore()`. Pull-to-refresh still invalidates the provider and reloads from page 1, so the Follow-ups tab now supports infinite scroll in batches of 20. |


## 6. Communication stage: link follow-ups to calls via `lead_call_id`

| Field    | Detail |
|----------|--------|
| **Where** | `GET /api/v1/leads/:id/stages/by-type/:stage_type` — response `data.follow_ups[]` for `stage_type = communication` |
| **Why**   | In the Communication tab’s call-detail bottom sheet we needed to show the remark for the follow-up that is specifically linked to a given call, and, when missing, allow adding a remark that is stored on a new follow-up connected to that call. The existing stage-by-type API returned follow-ups without exposing which call (if any) they were linked to, making it impossible to reliably match “this call → this follow-up” from the frontend. |
| **When**  | While adding “If call is linked to a follow-up, show that follow-up’s remark; else show Add remark and save it to a connected follow-up” to the Communication stage UI. |
| **How**   | Extended the backend `FollowUpItem` used by stage-by-type responses to include an optional `lead_call_id`, and updated the stage-by-type service query to select and populate this field from `lead_followups.lead_call_id`. On the Flutter side, the `StageFollowUpItem` model now parses `lead_call_id` and the Communication stage screens use it to (a) find the follow-up whose `leadCallId == call.id` and show its remark, and (b) create a new follow-up with `lead_call_id` set when the user adds a remark for a call. The HTTP endpoints and request bodies remain backward compatible; only the response for `follow_ups[]` gained an extra optional field. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/models/lead.go` | Added `LeadCallID *string \`json:"lead_call_id,omitempty"\`` to `FollowUpItem` so stage-by-type responses can expose which call (if any) a follow-up is linked to. |
| `Backend/APIs/core-api/services/lead.go` | In `GetLeadStageByType`, updated the follow-ups query to select `lead_call_id` from `lead_followups` and scan it into `FollowUpItem.LeadCallID`. |

### Client (Flutter) updates

| Path | Change |
|------|--------|
| `Example/presales_flutter_app/lib/features/leads/leads_repository.dart` | Extended `StageFollowUpItem` with `leadCallId` (parses `lead_call_id` from JSON) and added `createFollowUp()` which calls `POST /api/v1/leads/:id/follow-ups` with `lead_stage_id`, `followup_type`, `followup_date`, `remark`, and optional `lead_call_id`. |
| `Example/presales_flutter_app/lib/features/leads/lead_stages_screen.dart` | Communication stage call-detail bottom sheet now: (1) looks up the follow-up whose `leadCallId == call.id` and shows its remark in a “FOLLOW-UP REMARK” card; (2) if no linked follow-up exists, shows an “Add remark for this call” UI that creates a new follow-up linked to that call via `lead_call_id`, then refreshes the stage data. |


## 5. Dashboard: upcoming_followups — limit to recent + future pending only

| Field    | Detail |
|----------|--------|
| **Where** | `GET /api/v1/dashboard` — response `data.upcoming_followups[]` |
| **Why**   | After including all pending follow-ups (past + future), very old overdue follow-ups were pushing recent/today items out of the top-10 window. The app’s Upcoming/Missed tabs only need “recent missed + upcoming” items, not months-old pending follow-ups. |
| **When**  | While testing the Upcoming/Missed filters; backend was returning only old 2025 dates so Upcoming appeared empty even after adding new 2026 follow-ups. |
| **How**   | Added a lower bound on `f.followup_date` in the dashboard query: now only follow-ups with `followup_date >= CURRENT_DATE - INTERVAL '1 day'` and `status = 'pending'` are returned (up to 10, sorted by date). This keeps the window to “yesterday + today + near future”, and the client still splits them into Upcoming vs Missed using `FollowUpSummary.isOverdue`. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/services/dashboard.go` | Updated `lead_followups` SELECT for `upcoming_followups` to include `AND f.followup_date >= (CURRENT_DATE - INTERVAL '1 day')` in the JOIN predicate, keeping only recent + future pending follow-ups. |

### Client (Flutter) notes

| Path | Change |
|------|--------|
| `Example/presales_flutter_app/lib/features/followups/models/followup_model.dart` | `isOverdue` now compares only the **date** (ignores time): overdue = followup date \< today; any follow-up scheduled “today” still counts as Upcoming. |


## 4. Dashboard: upcoming_followups — include missed (past) pending follow-ups

| Field    | Detail |
|----------|--------|
| **Where** | `GET /api/v1/dashboard` — response `data.upcoming_followups[]` |
| **Why**   | Follow-ups tab got a “Show: Upcoming / Missed / All” filter, but the API was only returning **future** follow-ups (`followup_date >= now`). Missed (overdue) pending follow-ups created in the DB never appeared in the app, so Missed view was always empty. |
| **When**  | After adding the Missed filter and seeding 3 missed follow-ups for `madhu@bhoomiplots.com`; the app still showed “No follow-ups match filters”. |
| **How**   | Dashboard query for upcoming follow-ups now returns the 10 oldest **pending** follow-ups (past + future) sorted by `f.followup_date ASC`, without filtering on `followup_date >= now`. The client splits them into Upcoming vs Missed using `FollowUpSummary.isOverdue`. Response shape is unchanged. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/services/dashboard.go` | Removed `f.followup_date >= $...` predicate and extra time argument from the `lead_followups` SELECT; comment updated to “Pending follow-ups (next 10 by date)”. |

### Client (Flutter) updates

| Path | Change |
|------|--------|
| `Example/presales_flutter_app/lib/features/followups/followups_screen.dart` | Added top “Show: Upcoming / Missed / All” chip row. `Missed` uses `isOverdue` (past `followup_date` and still pending), `Upcoming` is non-overdue, `All` shows both. Other filters (Project/Stage/Hotness/Budget) now operate on this combined list. |


## 3. Dashboard: upcoming_followups — tolerate NULL lead_temperature

| Field    | Detail |
|----------|--------|
| **Where** | `GET /api/v1/dashboard` — response `data.upcoming_followups[]` |
| **Why**   | In some databases `lead_temperature` on `leads` could be NULL, which made the dashboard query Scan fail and silently skip those follow-up rows. This caused missing follow-ups and inconsistent UI even when data existed. |
| **When**  | After adding budget, while debugging “project/budget still not showing even though DB has data”. |
| **How**   | Dashboard service now scans `l.lead_temperature` into a nullable pointer and only sets it on the struct when non-empty, so NULL values no longer drop rows. API contract is unchanged (same fields), but the endpoint is more reliable. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/services/dashboard.go` | Updated `upcoming_followups` Scan to use `*string` for `lead_temperature` and assign it only when non-nil. |

### Client (Flutter) notes

| Path | Change |
|------|--------|
| `Example/presales_flutter_app/lib/features/followups/models/followup_model.dart` | Safer parsing helpers for `project_title`, `stage`, `lead_temperature`, `budget_min`, `budget_max` (handle null/empty/string/number). |
| `Example/presales_flutter_app/lib/features/followups/followups_screen.dart` | Follow-up tile layout simplified; project and budget now rendered in a single compact text row, still preferring dashboard fields and falling back to lead list. |

---

## 2. Dashboard: upcoming_followups — add budget_min, budget_max

| Field    | Detail |
|----------|--------|
| **Where** | `GET /api/v1/dashboard` — response `data.upcoming_followups[]` |
| **Why**   | Follow-ups list was not showing budget per item. Adding budget on the dashboard response allows the app to show a budget chip on each follow-up tile without relying only on lead map. |
| **When**  | After adding project/stage/hotness; user reported "project and budget ni show ho raha". |
| **How**   | Dashboard service now selects `l.budget_min`, `l.budget_max` for upcoming follow-ups. Model and Scan updated. Flutter `FollowUpSummary` has `budgetMin`, `budgetMax` and `budgetLabel` (same format as Lead). Tile shows budget chip (API value or lead fallback). |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/models/dashboard.go` | Extended `FollowUpSummary` with `BudgetMin *float64`, `BudgetMax *float64` (JSON: `budget_min`, `budget_max`). |
| `Backend/APIs/core-api/services/dashboard.go` | Upcoming follow-ups query: added `l.budget_min`, `l.budget_max` to SELECT and Scan. |

### Client (Flutter) updates

| Path | Change |
|------|--------|
| `Example/presales_flutter_app/lib/features/followups/models/followup_model.dart` | `FollowUpSummary` now has `budgetMin`, `budgetMax` and `budgetLabel` getter (₹X - ₹Y, same as Lead). |
| `Example/presales_flutter_app/lib/features/followups/followups_screen.dart` | Tile shows budget chip using `followUp.budgetLabel` when present, else `lead?.budgetLabel ?? '—'`. |

---

## 1. Dashboard: upcoming_followups — add project_title, stage, lead_temperature

| Field    | Detail |
|----------|--------|
| **Where** | `GET /api/v1/dashboard` — response `data.upcoming_followups[]` |
| **Why**   | Follow-ups list in the app (presales Flutter) was not showing project, stage, or hotness per item. The app was relying on a separate leads list and matching by `lead_id`, which could miss leads (e.g. not in first 500) or miss fields. Returning these on each follow-up item avoids that and shows project/stage/hotness directly. |
| **When**  | Introduced when adding “list pe bhi hotness, stage, project show karo” and fixing “project kyu ni dikh rha” on Follow-ups screen. |
| **How**   | Dashboard service now selects `p.project_title`, `l.stage`, `l.lead_temperature` for upcoming follow-ups, with a `LEFT JOIN projects p` on `l.project_id = p.id`. Model and Scan updated to fill the new fields. Response remains backward compatible: new fields are optional and omitted when null/empty. |

### Files changed

| Path | Change |
|------|--------|
| `Backend/APIs/core-api/models/dashboard.go` | Extended `FollowUpSummary` with `ProjectTitle *string`, `Stage *string`, `LeadTemperature string` (JSON: `project_title`, `stage`, `lead_temperature`). |
| `Backend/APIs/core-api/services/dashboard.go` | Upcoming follow-ups query: added `LEFT JOIN projects p ON l.project_id = p.id AND p.deleted_at IS NULL` and selected `p.project_title`, `l.stage::text`, `l.lead_temperature::text`. Scan and struct assignment updated for the new fields. |

### Client (Flutter) updates

| Path | Change |
|------|--------|
| `Example/presales_flutter_app/lib/features/followups/models/followup_model.dart` | `FollowUpSummary` now has `projectTitle`, `stage`, `leadTemperature` and parses them from JSON. |
| `Example/presales_flutter_app/lib/features/followups/followups_screen.dart` | Tile uses `followUp.projectTitle`, `followUp.stage`, `followUp.leadTemperature` when present, and falls back to lead from `leadMap` when not. |

---

*Add new entries above this line when you make further API changes.*
