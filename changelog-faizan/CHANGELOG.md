# Changelog (Faizan)

<!--
  After EVERY task, append below in the exact format.
  Heading line: ## [DD-MM-YYYY HH:MM] — short title (use today’s date and current local time, 24-hour clock).
  Then: **What changed:** → **Files touched:** → **API endpoints used:** → **Breaking change:** YES|NO → ---
  Older blocks may show date only in the heading; new entries must include time.
-->

## [24-03-2026 17:00] — Backend: call recording_url signed on all GET responses + Calls screen backend sync

**What changed:**
- **Backend (call.go):** Added `signRecordingURL` helper to `CallService`. Applied in `GetCall` and `ListCalls` so `recording_url` is returned as a presigned HTTPS download URL (1-hour expiry) instead of a raw B2 object key. Flutter `just_audio` can now stream recordings directly.
- **Backend (lead.go):** Added `signRecordingURL` helper to `LeadService`. Applied at all 4 locations that return `recording_url` in stage/summary/follow-up responses (`GetLeadStageByType`, `GetLeadSummary`, `GetLeadStageByID`, `GetFollowUpByID`).
- **Flutter (calls_screen.dart):** Replaced static `_launchCall` with instance `_initiateAndDial` in `_CallLogTileState`. Every call from the Calls tab now runs the full lifecycle: `POST /calls` (create backend record) → dial → query device call log → `PATCH /calls/:id` (sync timestamps + status) → refresh backend calls. This ensures new calls have a backend `CallDetail` record, enabling recording badge, upload, and playback to work correctly for Calls-tab calls (not just stage screen calls).
- **Docs:** `api-change-log.md` entry #12 added; `open-api.yml` descriptions updated for list/get calls; `Backend/readme.md` recording upload flow documented.

**Files touched:**
`Backend/APIs/core-api/services/call.go`, `Backend/APIs/core-api/services/lead.go`, `Example/presales_flutter_app/lib/features/calls/calls_screen.dart`, `api-change-log.md`, `Backend/APIs/core-api/docs/open-api.yml`, `Backend/readme.md`

**API endpoints used:** `POST /api/v1/leads/:id/calls`, `GET /api/v1/leads/:id/calls`, `GET /api/v1/leads/:id/calls/:call_id`, `PATCH /api/v1/leads/:id/calls/:call_id`, `POST /api/v1/leads/:id/calls/:call_id/upload-url`

**Breaking change:** NO (recording_url field changes from raw key to signed URL — strictly more useful for clients)

---

## [24-03-2026 13:20] — Manager Lead Sourcing Settings: full UI + API integration + DB migration hardening
**What changed:**
- **Manager Settings UI:** Implemented `Lead Sourcing Settings` module with 4 sections matching product flow: **Provider Integrations**, **Sourcing Configs**, **Project Mappings**, and **Sync History**.
- **Provider Integrations:** Added create, edit, status toggle (`active/disabled/error`), and delete (with cascade warning confirmation). Provider cards now show auth type, user, masked key state, created date, and endpoint when available.
- **Sourcing Configs:** Added create/edit/delete config flow with sync mode + interval support, full field mapping table, multi `provider_config` key/value pairs, `Sync Now`, and `View Logs` quick action.
- **Project Mappings:** Added create/update/delete mapping flow, internal project dropdown from projects API, inline mapping save per row, provider-wise filter, and unmapped indicator handling.
- **Sync History:** Wired real sync logs listing, config-based filtering, readable timestamps, status badges, and logs navigation from configs.
- **API integration:** Replaced mock/local state behavior with real backend integration through new service layer (`leadSourcingApi.ts`) and resilient loading strategy so one failed endpoint does not blank the whole settings screen.
- **Validation + UX hardening:** Added required-field and mode-specific validation (e.g., scheduled interval min 1, auth-type specific requirements), destructive action confirmations, auto-clearing feedback messages, loading disables, and better error handling.
- **DB readiness fixes:** Verified runtime DB state, identified missing lead-sourcing tables/enums, and applied required SQL updates (enums + `external_project_mappings` + `lead_sync_logs`) for local environment compatibility.
- **Migration documentation:** Added a dedicated idempotent migration script capturing all required lead-sourcing DB prerequisites and updated setup script to include it for other developers.

**Files touched:** `Frontend/crownco-manager-frontend/my-app/src/app/settings/page.tsx`, `Frontend/crownco-manager-frontend/my-app/src/lib/leadSourcingApi.ts`, `Backend/database/11-lead-sourcing-integration-required.sql`, `Backend/database/Scripts/setup-db.sh`

**API endpoints used:** `POST /api/v1/organization-apis`, `GET /api/v1/organization-apis`, `PUT /api/v1/organization-apis/:id`, `DELETE /api/v1/organization-apis/:id`, `POST /api/v1/lead-sourcing-configs`, `GET /api/v1/lead-sourcing-configs`, `PUT /api/v1/lead-sourcing-configs/:id`, `DELETE /api/v1/lead-sourcing-configs/:id`, `POST /api/v1/lead-sourcing-configs/:id/sync-now`, `POST /api/v1/external-project-mappings`, `GET /api/v1/external-project-mappings`, `PUT /api/v1/external-project-mappings/:id`, `DELETE /api/v1/external-project-mappings/:id`, `GET /api/v1/lead-sync-logs`, `GET /api/v1/projects`

**Breaking change:** NO

---

## [24-03-2026 12:05] — Sales Dashboard: Top Performing Projects live integration
**What changed:**
- Sales dashboard `Top Performing Projects` section is now backed by real APIs instead of hardcoded mock cards.
- Added live fetch flow:
  - `GET /api/v1/projects?mine=1` (via `fetchProjectInventoryGridRows`) to load sales-assigned projects.
  - `GET /api/v1/projects/:id/stats` per project (via `fetchProjectStats`) to build card stats (`Site Visits`, `Revisits`, `Bookings`) and conversion%.
- Ranking logic added: sort by conversion% desc, then bookings desc, then site visits desc; top 3 rendered.
- Card click now routes with actual project id query param:
  - `/sales/project-inventory/project-inventory-detail?projectId=<id>`
- Added loading/error/empty states for this section.

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/dashboard/page.tsx`

**API endpoints used:** `GET /api/v1/projects?mine=1`, `GET /api/v1/projects/:id/stats`

**Breaking change:** NO

---

## [24-03-2026 11:46] — Presales Lead List: avatars replaced with alphabet initials
**What changed:**
- **Lead List (caller/presales):** Name column profile photos replaced with circular alphabet initials (derived from lead name) in both desktop table variants (`API leads` and other tabs), so rows no longer depend on static image avatars.
- **Mobile/DataCard:** `DataCard` header avatar also switched to initials badge in both compact and detailed card modes; keeps same action behavior while improving consistency with table rows.
- `next/image` usage removed from these views where avatar image is no longer required.

**Files touched:** `Frontend/crownco-presales-frontend/my-app/src/app/caller/lead-list/page.tsx`, `Frontend/crownco-presales-frontend/my-app/src/components/ui/card/dataCard.tsx`

**API endpoints used:** None (UI-only change)

**Breaking change:** NO

---



## [23-03-2026 04:42] — Sales Quotation: All Quotations list from GET /api/v1/quotations
**What changed:**
- **Quotation** grid/list loads **`GET /api/v1/quotations`** (paginated, role-scoped lead visibility). Query params: **`tab`** (`all` | `approved` | `pending` = shared+revised | `draft`), **`q`**, **`project`**, **`sort`** (`date` | `price` | `customer`), **`order`**, **`page`**, **`limit`**. Response includes **`tab_counts`** for tab badges. Rows map to **`QuotationData`** with **`lead_id`** for detail links (`/quotation/quotation-detail?id=&leadId=`). Removed mock **`dummyQuotations`** and **`localStorage`** list; create/edit/delete quick actions replaced with **toasts** pointing to **Lead → Negotiation**. **Date range** remains a client filter on the current page only.

**Files touched:** `Backend/APIs/core-api/models/quotation_list.go`, `Backend/APIs/core-api/services/negotiation.go`, `Backend/APIs/core-api/handlers/negotiation.go`, `Backend/APIs/core-api/routes/negotiation.go`, `Backend/APIs/core-api/docs/open-api.yml`, `Frontend/crownco-sales-frontend/my-app/src/lib/quotationListApi.ts`, `Frontend/crownco-sales-frontend/my-app/src/components/ui/card/quotationCard.tsx`, `Frontend/crownco-sales-frontend/my-app/src/app/quotation/page.tsx`

**API endpoints used:** `GET /api/v1/quotations`

**Breaking change:** NO

---

## [23-03-2026 20:31] — Sales Site Visit: Approve button works again
**What changed:**
- `site-visit/overveiw` page me `Approve` button pe click pe handler stage-gating (`canForwardToNegotiation`) ke baje band ho raha tha.
- Button ab sirf `summaryLoading` / `isForwardingStage` me disabled hai, aur `handleApprove` ka `!canForwardToNegotiation` early-return remove karke backend validation pe call forward kar diya.

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/site-visit/overveiw/page.tsx`

**API endpoints used:** `POST /api/v1/leads/:id/forward-stage`

**Breaking change:** NO

---

## [23-03-2026 04:22] — Sales Quotation: Performance Summary KPIs from GET /quotations/stats
**What changed:**
- **Quotation** page **Performance Summary** loads **`GET /api/v1/quotations/stats`** (totals, total value INR, this-month counts, approved/pending snapshots, MoM growth vs same elapsed window last month). **Pending** = **`shared`** + **`revised`**. On fetch failure, KPIs fall back to **local** mock/`localStorage` quotations.

**Files touched:** `Backend/APIs/core-api/models/quotation_stats.go`, `Backend/APIs/core-api/services/negotiation.go`, `Backend/APIs/core-api/handlers/negotiation.go`, `Backend/APIs/core-api/routes/negotiation.go`, `Backend/APIs/core-api/docs/open-api.yml`, `Frontend/crownco-sales-frontend/my-app/src/lib/quotationStatsApi.ts`, `Frontend/crownco-sales-frontend/my-app/src/app/quotation/page.tsx`

**API endpoints used:** `GET /api/v1/quotations/stats`

**Breaking change:** NO

---

## [23-03-2026 04:08] — Project Detail: Unit Selection filters (+ Add Filter) → GET …/units query params
**What changed:**
- **+ Add Filter** on **Unit Selection** opens a panel (floor exact / min–max, unit type, status, price min–max). **Apply filters** sends **`clientUnitFiltersToQuery`** as query params on **`fetchAllProjectUnits`**; **Clear all** resets. List refetches when **`projectId`** or applied filters change; empty copy distinguishes **no match** vs **no units**. **Hide filters** restores draft from applied (discard unapplied edits).

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/lib/projectDetailApi.ts`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/project-inventory/project-inventory-detail/page.tsx`

**API endpoints used:** `GET /api/v1/projects/:project_id/units` (`floor`, `floor_min`, `floor_max`, `unit_type`, `status`, `price_min`, `price_max`, `page`, `limit`)

**Breaking change:** NO

---

## [23-03-2026 04:03] — Project Detail: Unit Selection from GET /projects/:id/units
**What changed:**
- **Unit Selection** loads **`GET /api/v1/projects/:project_id/units`** (paginated, all pages merged via `fetchAllProjectUnits`). Grid shows **`name`**; colours map API **`unit_status`**: available (green), **under_negotiation** (amber), booked (red), **not_for_sale** + **unavailable** (grey). **Selection** (blue) only toggles on **available** and **under_negotiation**; booked / not-sale rows stay non-clickable. **`projectId`** change clears selection.

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/lib/projectDetailApi.ts`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/project-inventory/project-inventory-detail/page.tsx`

**API endpoints used:** `GET /api/v1/projects/:project_id/units?page=&limit=`

**Breaking change:** NO

---

## [23-03-2026 03:58] — Project Detail page: card, overview, gallery, amenities from GET /projects/:id
**What changed:**
- **Sales project inventory detail** loads **`GET /api/v1/projects/:id`** in parallel with stats (`Promise.allSettled`). **Project Detail** card uses **`projectToCardProps`** (title, type/status, city/state, floors + unit size band, price band, amenity tags); **remote cover/images** use `<img>` / card path to avoid Next image domain issues.
- **Project Overview:** `area_type`, `rera_number`, `expected_possession_date` (formatted month + year).
- **Media Gallery:** deduped cover + exterior + interior URLs; thumbnails; **videos** from exterior/drone/interior URL arrays open in a new tab via **DownloadCard**.
- **Amenities:** API `amenities[]` list (empty copy when none).
- **Shared:** exported **`mapProjectType`**, **`mapProjectStatus`**, **`formatLocation`**, **`formatPriceBand`** from `projectInventoryProjects.ts`; **`ProjectCard`** renders **http(s)** hero images with `<img>`.

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/lib/projectDetailApi.ts`, `Frontend/crownco-sales-frontend/my-app/src/lib/projectInventoryProjects.ts`, `Frontend/crownco-sales-frontend/my-app/src/components/ui/card/projectCard.tsx`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/project-inventory/project-inventory-detail/page.tsx`

**API endpoints used:** `GET /api/v1/projects/:id` (with existing `GET /api/v1/projects/:id/stats` for KPIs)

**Breaking change:** NO

---

## [23-03-2026 03:53] — Project Detail (sales): Performance Summary KPIs from GET …/projects/:id/stats
**What changed:**
- **Status:** Project inventory detail (`/sales/project-inventory/project-inventory-detail`) previously used **mock KPIs**; now integrated.
- **Frontend:** Reads `projectId` from the query string, calls **`GET /api/v1/projects/:id/stats`**, maps **Total Leads**, **Total Visits**, **In Negotiation**, **Total Bookings**, **Total Units Available**; loading shows **—**; mock **% trends** removed. Message if `projectId` is missing.
- **Backend:** `ProjectStatsResponse` adds **`total_leads`**, **`total_visits`**, **`leads_in_negotiation`**, **`total_lead_bookings`** (role-scoped lead visibility, same rules as dashboard). **`GetProjectStats`** takes **`userID`**, **`userRole`**; Redis cache stores only unit/addon aggregates (lead funnel recomputed each request).

**Files touched:** `Backend/APIs/core-api/models/project.go`, `Backend/APIs/core-api/services/project.go`, `Backend/APIs/core-api/handlers/project.go`, `Frontend/crownco-sales-frontend/my-app/src/lib/projectDetailStats.ts`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/project-inventory/project-inventory-detail/page.tsx`

**API endpoints used:** `GET /api/v1/projects/:id/stats`

**Breaking change:** NO (response adds fields; callers unchanged except internal `GetProjectStats` signature)

---

## [23-03-2026 03:48] — Sales Project Inventory: All Projects tab from API (no mock)
**What changed:**
- **All Projects** tab uses **`GET /api/v1/projects`** (paginated, no `mine`) via `fetchProjectInventoryGridRows({ mine: false })`; mock nine cards removed. **My Projects** + **All Projects** load in parallel with **`Promise.allSettled`** so one failing request does not block the other grid.
- State: `allGrid`, `allGridLoading`, `allGridError`; loading/error copy for the All tab.

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/project-inventory/page.tsx`, `Frontend/crownco-sales-frontend/my-app/src/lib/projectInventoryProjects.ts` (comment only)

**API endpoints used:** `GET /api/v1/projects?page=&limit=` (org-wide)

**Breaking change:** NO

---

## [23-03-2026 03:46] — Sales Project Inventory: My Projects tab from API (mine=1) + backend filter
**What changed:**
- **My Projects** tab: `GET /api/v1/projects?mine=1` (paginated) replaces mock cards. Rows map list fields to **ProjectCard** (title, type/status badges, city–state, floors, min–max price band; placeholder images; amenities not in list).
- **Backend:** `mine=1` or `mine=true` restricts the project list to IDs in **`users_sales.project_assigned_ids`** for the JWT user; **sales only** (403 otherwise). `ListProjects` SQL subquery; OpenAPI doc updated.

**Files touched:** `Backend/APIs/core-api/handlers/project.go`, `Backend/APIs/core-api/services/project.go`, `Backend/APIs/core-api/docs/open-api.yml`, `Frontend/crownco-sales-frontend/my-app/src/lib/projectInventoryProjects.ts`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/project-inventory/page.tsx`

**API endpoints used:** `GET /api/v1/projects?page=&limit=&mine=1` (sales: assigned projects only)

**Breaking change:** NO

---

## [23-03-2026 03:40] — Sales Project Inventory: Performance Summary KPIs from APIs (mock removed)
**What changed:**
- **Project Inventory** (`/sales/project-inventory`): **Performance Summary** cards load real counts: **Active Projects** (total listed projects), **Ready-To-Move** / **Ongoing** / **Upcoming** from `project_status` on `GET /api/v1/projects`, **Total Units Available** as the sum of `available_units` from `GET /api/v1/projects/:id/stats` (batched). Loading shows **—**; errors use toast + short inline message under the section. Mock KPI values and **fake % trends** removed (no MoM API yet).

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/lib/projectInventoryKpi.ts`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/project-inventory/page.tsx`

**API endpoints used:** `GET /api/v1/projects` (paginated, merged pages); `GET /api/v1/projects/:id/stats` (per project)

**Breaking change:** NO

---

## [23-03-2026 14:00] — Sales lead list: View Detail by stage; site-visit Approve after booking
**What changed:**
- **Lead list:** `View Detail` navigates by API `stage` / `status` (`deal` → booking overview, `booking` → booking, `negotiation` → negotiation, `site_visit` / `property_visit` / `visit` → site-visit, else caller-preview). `Lead` rows carry `funnelStage` + `pipelineStatus` from `LeadResponse`.
- **Site visit overview:** Bottom **Approve** stays enabled when the lead is already in **booking** or **deal** (pipeline); tap routes to booking or shows negotiation path as before. Loads `summaryPipelineStatus` from lead summary.

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/page.tsx`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/site-visit/overveiw/page.tsx`

**API endpoints used:** Existing list/assigned leads (stage/status on lead); `GET .../leads/:id/summary` (site-visit)

**Breaking change:** NO

---

## [23-03-2026 14:05] — Sales booking documents: uploaded UI, optimistic merge, CORS error copy
**What changed:**
- After **POST** metadata succeeds, merge returned document into state immediately, then refresh `GET .../booking/documents` (avoids empty UI if list lags). **Manager / GM** also load the documents list (`canViewBookingDocuments`). Normalized `document_type` comparisons; card footer **X/5 Uploaded** (was “Verified”).
- **`bookingDocuments.ts`:** Clearer error when browser **PUT** to B2 fails with **Failed to fetch** (CORS to bucket); HTTP non-OK from storage reported separately.

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/lib/bookingDocuments.ts`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/booking/overveiw/page.tsx`

**API endpoints used:** `POST .../booking/documents/upload-url`, `PUT` (browser → B2 presigned URL), `POST .../booking/documents`, `GET .../booking/documents`

**Breaking change:** NO

**Ops:** B2 bucket CORS must allow the sales web origin for direct browser PUT; otherwise configure a server-side upload path.

---

## [22-03-2026 22:46] — Booking documents: B2 upload (sales) + manager list with signed URLs
**What changed:**
- **Backend:** `lead_booking_documents` optional `quotation_id` (FK to `lead_quotations`); migration script `scripts/migrate_lead_booking_documents_quotation_id.sql`. `POST /booking/documents` accepts optional `quotation_id` (validated for same lead). List/Get document responses replace B2 object keys with **presigned download URLs** (1h) when storage is configured. **Manager / GM** may `GET` booking documents for a lead (same org). `GET` upload-url and `POST` documents ensure a `lead_bookings` row exists. `09-lead-management.sql` updated for new installs.
- **Sales booking UI:** Required Documents / drawer uploads via presigned PUT to B2 then `POST` metadata; optional `quotation_id` from current approved quotation; list refresh; remove calls `DELETE`; `lib/bookingDocuments.ts`.
- **Manager lead UI:** Booking card shows uploaded documents with **View file** links (signed URLs).

**Files touched:** `Backend/APIs/core-api/services/booking.go`, `Backend/APIs/core-api/handlers/booking.go`, `Backend/APIs/core-api/models/booking.go`, `Backend/database/09-lead-management.sql`, `Backend/APIs/core-api/scripts/migrate_lead_booking_documents_quotation_id.sql`, `Frontend/crownco-sales-frontend/my-app/src/lib/bookingDocuments.ts`, `Frontend/crownco-sales-frontend/.../booking/overveiw/page.tsx`, `Frontend/crownco-manager-frontend/my-app/src/lib/bookingDocuments.ts`, `Frontend/crownco-manager-frontend/.../all-leads/[id]/page.tsx`

**API endpoints used:** `POST .../booking/documents/upload-url`, `POST .../booking/documents`, `GET .../booking/documents`, `DELETE .../booking/documents/:did`

**Breaking change:** NO (existing DBs must run the migration for `quotation_id` + new INSERT/SELECT)

**Ops:** Configure **CORS** on the Backblaze B2 bucket for the sales web origin so browser `PUT` to presigned URLs succeeds.

---

## [22-03-2026 22:35] — Sales booking: re-enable Forward to Manager after new approved quotation
**What changed:** The booking page no longer treats every `token_received` booking as permanently “submitted” for sales. After a **new** manager-approved quotation (different quotation id than the last forward, or booking `final_total_price` more than ₹1 off the current approved-quote total), **Forward to Manager** is enabled again so sales can complete a second forward. Last forward is tracked per lead in `localStorage` (`crownco_sales_booking_forward_qid:*`); it is cleared when booking becomes `confirmed`. Button copy: first forward **Approve & Forward to Manager**, revision **Forward to Manager** while `token_received`.
**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/booking/overveiw/page.tsx`
**API endpoints used:** same as before (`PATCH /booking`, `POST /booking/submit`)
**Breaking change:** NO
---

## [22-03-2026 22:30] — Sales negotiation: Preview on each quotation row
**What changed:** In **Quotations (sent by sales)** on the negotiation overview, each row shows a visible **Preview** link (primary colour) next to the status chip; it opens the same `quotation-preview` route as row click. `stopPropagation` avoids double navigation when tapping Preview.
**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/negotiation/overveiw/page.tsx`
**API endpoints used:** none (navigation only)
**Breaking change:** NO
---

## [22-03-2026 22:27] — Manager quotations: approve/reject mutually exclusive by status
**What changed:** On the lead quotations table and the quotation preview page, **Approve** is disabled when status is `rejected`, and **Reject** is disabled when status is `approved`. Status comparisons use lowercase so API casing does not matter. Draft (and other non-terminal) rows still show both actions enabled.
**Files touched:** `Frontend/crownco-manager-frontend/my-app/src/app/all-leads/[id]/page.tsx`, `Frontend/crownco-manager-frontend/my-app/src/app/all-leads/[id]/quotation/[qid]/page.tsx`
**API endpoints used:** none (UI only)
**Breaking change:** NO
---

## [22-03-2026 22:21] — Manager: full quotation preview (sales-style breakdown)
**What changed:** Added `/all-leads/[id]/quotation/[qid]` with the same price breakdown, add-ons, discount, total, customer block, and status badge as the sales quotation preview; table rows include a **Preview** link. Managers can Approve or Reject from the preview footer when the quotation is actionable; back returns to the lead with `scrollTo=quotations`.
**Files touched:** `Frontend/crownco-manager-frontend/my-app/src/app/all-leads/[id]/quotation/[qid]/page.tsx`, `Frontend/crownco-manager-frontend/my-app/src/app/all-leads/[id]/page.tsx`
**API endpoints used:** `GET /api/v1/leads/:leadId/quotations/:qid`, `POST .../approve`, `POST .../reject`
**Breaking change:** NO
---

## [22-03-2026] — Hide Quotation from presales UI
**What changed:** Removed "Quotation" from presales sidebar and added Next.js redirects so `/quotation` and subpaths send users to `/caller/dashboard`.
**Files touched:** `Frontend/crownco-presales-frontend/my-app/src/components/sidebar.tsx`, `Frontend/crownco-presales-frontend/my-app/next.config.ts`
**API endpoints used:** none
**Breaking change:** NO
---

## [22-03-2026] — Sales: negotiation → booking (forward-stage) + quotation prefill on booking page
**What changed:**
- **Backend:** Sales users can `POST /api/v1/leads/:id/forward-stage` with `next_stage: booking` only when the lead is in `negotiation` and at least one `lead_quotations` row is `quotation_status = approved` (otherwise `QUOTATION_APPROVAL_REQUIRED`). Sales can still forward `site_visit`/`property_visit` → `negotiation` as before. Added `hasApprovedQuotation` helper in `LeadService`.
- **Backend:** Handler returns 400 with code `QUOTATION_APPROVAL_REQUIRED` when sales tries booking forward without an approved quotation.
- **Docs:** `docs/open-api.yml` — forward-stage description updated for sales negotiation → booking rule.
- **Sales web (negotiation):** When moving to booking, after checking approved quotations the app calls `forward-stage` with `next_stage: booking` before navigating to the booking overview (so `leads.stage` updates to booking in sync with navigation).
- **Sales web (booking):** After `GET /booking` settles, empty price fields are pre-filled from the manager-approved quotation (totals, maintenance from `one_time_maintenance`, legal/stamp/parking); lead profile name/phone prefer quotation customer when present; extra-charges section expands when quote has those amounts.
- **Example (Flutter):** Sales negotiation “Booking” button calls `forwardStage(nextStage: booking)` after approved-quotation check, then invalidates `leadByIdProvider` and moves to booking tab.

**Files touched:**
- `Backend/APIs/core-api/services/lead.go`
- `Backend/APIs/core-api/handlers/lead.go`
- `Backend/APIs/core-api/docs/open-api.yml`
- `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/negotiation/overveiw/page.tsx`
- `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/booking/overveiw/page.tsx`
- `Example/presales_flutter_app/lib/features/leads/sales_lead_stages_screen.dart`

**API endpoints used:** `POST /api/v1/leads/:id/forward-stage` (sales: negotiation → booking with approved quotation); existing `GET /leads/:id/quotations`, `GET /leads/:id/booking`

**Breaking change:** NO (additive behaviour; clients that only navigated to booking without forward-stage should call forward-stage for consistent `leads.stage`)

---

## [22-03-2026] — Sales web booking: PATCH `/booking` before submit (parity with Flutter)
**What changed:** On “Submit Booking Details” / primary approve, when `GET /booking` succeeded (`bookingFetchState === ready`), the page now calls `PATCH /api/v1/leads/:id/booking` with token amount, `payment_mode` (UI labels mapped to `upi` / `cheque` / `net_banking` / `dd`), `final_total_price`, optional token date, EMI and extra-charge fields, then `POST .../booking/submit` — same order as Example `updateBooking` + `submitBooking`.
**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/booking/overveiw/page.tsx`
**API endpoints used:** `PATCH /api/v1/leads/:id/booking`, `POST /api/v1/leads/:id/booking/submit`
**Breaking change:** NO

---

## [22-03-2026] — Backend: create `lead_bookings` when entering booking stage (fix GET/PATCH/submit 404)
**What changed:** Forwarding a lead to `booking` only updated `leads.stage` and `lead_stages`, but **never inserted `lead_bookings`**, so `GET /booking`, `PATCH /booking`, and `POST /booking/submit` returned 404 even when the UI showed a booking stage. **Fix:** `LeadService.ensureLeadBookingRow` runs after forward to `booking` (from approved quotation, else latest negotiation, else a minimal `initiated` row). `EnsureLeadBookingRowIfMissing` repairs existing leads where `leads.stage = booking` but no booking row, and is called from `GetBooking`, `UpdateBooking`, and `SubmitBooking` before loading the row.
**Files touched:** `Backend/APIs/core-api/services/lead.go`, `Backend/APIs/core-api/services/booking.go`
**API endpoints used:** same booking APIs; behaviour now returns data when stage is booking.
**Breaking change:** NO

---

## [22-03-2026] — Sales booking: lock UI after successful submit
**What changed:** After `GET /booking` returns `booking_status` of `token_received` or `confirmed`, sales users can no longer resubmit: “Submit Booking Details” and footer “Approve & Forward to Manager” stay disabled, button labels show “Booking submitted”, token/payment/EMI/proof fields are read-only/disabled, and a short “Submitted — pending manager confirmation” note is shown. `handleApprove` returns early if already submitted. Uses same status from API on page reload.
**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/booking/overveiw/page.tsx`
**API endpoints used:** `GET /api/v1/leads/:id/booking` (reads `booking_status`)
**Breaking change:** NO

---

## [22-03-2026 21:19] — Sales: “Booking” from negotiation after already forwarded (no INVALID_CURRENT_STAGE)
**What changed:** Sales `POST /forward-stage` with `next_stage: booking` is only valid while `leads.stage` is `negotiation` (or visit → negotiation). If the user already moved to booking and navigates back to the negotiation screen, clicking **Booking** again called forward again and the API returned `INVALID_CURRENT_STAGE`. **Fix:** Before forwarding, `GET /leads/:id` — if `stage` is already `booking`, navigate to booking only (no forward). On forward error `INVALID_CURRENT_STAGE`, re-fetch lead and if stage is `booking`, navigate the same way. Example Flutter sales flow updated the same way.
**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/negotiation/overveiw/page.tsx`, `Example/presales_flutter_app/lib/features/leads/sales_lead_stages_screen.dart`
**API endpoints used:** `GET /api/v1/leads/:id` (read `stage`); existing `POST /api/v1/leads/:id/forward-stage`
**Breaking change:** NO

---

## [22-03-2026 21:29] — New quotation supersedes old: previous rows marked rejected, new draft for manager
**What changed:** When sales creates another quotation for the same lead (`POST /leads/:id/quotations`), existing quotations in `draft`, `shared`, `revised`, or `approved` are updated to `rejected` in the same DB transaction, then the new row is inserted as `draft` with the next `quotation_version`. Manager/GM still approve or reject via existing endpoints; only the latest draft is pending review. `rejected` and `expired` rows are left unchanged.
**Files touched:** `Backend/APIs/core-api/services/negotiation.go`, `Backend/APIs/core-api/docs/open-api.yml`
**API endpoints used:** `POST /api/v1/leads/:id/quotations` (behaviour change: supersede)
**Breaking change:** NO (API contract unchanged; data rule stricter)

---

## [22-03-2026 21:34] — Approve quotation: reject all other versions on same lead (v2 approve → v1 rejected)
**What changed:** `POST /leads/:id/quotations/:qid/approve` now runs in a transaction: first sets every other quotation for that lead+org with status in `draft`/`shared`/`revised`/`approved` to `rejected`, then sets the chosen quotation to `approved`. So when the manager approves v2, v1 (and any other pending) becomes rejected instead of staying approved alongside v2.
**Files touched:** `Backend/APIs/core-api/services/negotiation.go`, `Backend/APIs/core-api/docs/open-api.yml`
**API endpoints used:** `POST /api/v1/leads/:id/quotations/{qid}/approve`
**Breaking change:** NO

---

## [22-03-2026 21:40] — DB migration: add `rejected` to `quotation_status` enum (fix 500 on create/approve)
**What changed:** Some databases were created without the `rejected` label on `quotation_status` (enum had `draft`/`shared`/`revised`/`approved`/`expired` only). API updates that set `quotation_status = 'rejected'` then failed with `invalid input value for enum quotation_status: "rejected"`. Added idempotent script `Backend/APIs/core-api/scripts/migrate_quotation_status_rejected.sql` (`ALTER TYPE ... ADD VALUE 'rejected' BEFORE 'expired'` when needed). Local dev DB updated.
**Files touched:** `Backend/APIs/core-api/scripts/migrate_quotation_status_rejected.sql`
**API endpoints used:** none (schema)
**Breaking change:** NO

---

## [22-03-2026 21:42] — Manager UI: hide quotation UUIDs (show version only)
**What changed:** On the lead detail **Quotations** section, removed the **Quotation ID** label and raw UUID from each card; cards now show **Quotation v{n}** and **Status** only. Removed **ID:** from the approved quotation preview header (IDs remain used only in API calls). `q.id` still used as React `key` and for approve/reject requests.
**Files touched:** `Frontend/crownco-manager-frontend/my-app/src/app/all-leads/[id]/page.tsx`
**API endpoints used:** none (display only)
**Breaking change:** NO

---

## [22-03-2026 21:50] — Quotations: manager table + required reject reason; sales sees note
**What changed:**
- **DB:** `lead_quotations.rejection_reason` (TEXT, nullable); migration `Backend/APIs/core-api/scripts/migrate_lead_quotations_rejection_reason.sql`; `database/09-lead-management.sql` updated for fresh installs.
- **API:** `POST .../quotations/:qid/reject` requires non-empty `rejection_reason` (or `remarks` alias); stores on row; `GET`/`list` quotations return `rejection_reason`. Bulk auto-rejects (new quotation / approve other versions) clear `rejection_reason` on those rows.
- **Manager UI:** Quotations list is a **table** (version, status, customer, total, valid till, rejection note, actions). **Reject** opens a modal for the reason; **Approve** unchanged.
- **Sales UI:** Negotiation quotation list shows manager note for rejected items; quotation preview page shows a **Manager rejection note** banner when rejected.

**Files touched:** `Backend/APIs/core-api/services/negotiation.go`, `Backend/APIs/core-api/models/negotiation.go`, `Backend/APIs/core-api/handlers/negotiation.go`, `Backend/APIs/core-api/docs/open-api.yml`, `Backend/database/09-lead-management.sql`, `Backend/APIs/core-api/scripts/migrate_lead_quotations_rejection_reason.sql`, `Frontend/crownco-manager-frontend/my-app/src/app/all-leads/[id]/page.tsx`, `Frontend/crownco-sales-frontend/.../negotiation/overveiw/page.tsx`, `Frontend/crownco-sales-frontend/.../quotation-preview/page.tsx`

**API endpoints used:** `POST /api/v1/leads/:id/quotations/:qid/reject` (body `{ "rejection_reason": "..." }`); `GET` list/single quotation (response includes `rejection_reason`)

**Breaking change:** YES for reject endpoint — clients must send `rejection_reason` (or `remarks`); empty body returns 400.

---

## [22-03-2026 21:57] — Manager lead detail: separate cards (form/notes/negotiation vs quotations table vs booking)
**What changed:** Left column is no longer one tall white panel. **Stacked `space-y-5` cards:** (1) Update Lead + Notes + Negotiation, (2) **Quotations** (preview + table) in its own `rounded-2xl` card, (3) **Booking** in its own card. Section titles use `h3` for Quotations/Booking.
**Files touched:** `Frontend/crownco-manager-frontend/my-app/src/app/all-leads/[id]/page.tsx`
**API endpoints used:** none
**Breaking change:** NO

---

## [22-03-2026 22:07] — Sales booking CTA: require approved quotation before navigating (fix stage-only shortcut)
**What changed:** Negotiation **Booking** button previously called `GET /lead` first; if `stage === booking` it jumped to the booking page **without** checking quotations, so a lead could stay at `booking` while all quotations were later rejected — user reached booking with no approved quote. **Fix:** Load `GET /quotations` first, require **≥1 `approved`** row, then check `stage` / `forward-stage`. Booking overview: sales users with `bookingHasApprovedQuotation === false` after load are **redirected** to negotiation with a toast. Example Flutter `_checkApprovedAndMoveToBooking` reordered the same way.
**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/negotiation/overveiw/page.tsx`, `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/booking/overveiw/page.tsx`, `Example/presales_flutter_app/lib/features/leads/sales_lead_stages_screen.dart`
**API endpoints used:** `GET /api/v1/leads/:id/quotations` (gate)
**Breaking change:** NO

---

## [22-03-2026 22:12] — Sales negotiation: no-approved-quotation gate uses Sonner toast (not `window.alert`)
**What changed:** When booking is blocked because no quotation is manager-approved, the app now shows **`toast.error("No approved quotation", { description: … })`** (8s) instead of the browser **`window.alert`** (“localhost says”).
**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/app/sales/lead-list/lead-detail/negotiation/overveiw/page.tsx`
**API endpoints used:** none
**Breaking change:** NO

---

## [23-03-2026 19:35] — Sales UI: Fix missing logo image
**What changed:**
- Sidebar and login logo used `next/image` with `src="/Crown co Logo.svg"` (spaces in path).
- Updated both to use encoded path `"/Crown%20co%20Logo.svg"` so the asset loads correctly.

**Files touched:** `Frontend/crownco-sales-frontend/my-app/src/components/sidebar.tsx`, `Frontend/crownco-sales-frontend/my-app/src/app/login/page.tsx`

**API endpoints used:** none
**Breaking change:** NO

---
## [24-03-2026] — Presales API leads tab integration verification
**What changed:** Verified API leads tab is integrated end-to-end: frontend sends `source` / `exclude_source` and status filters, backend handler/service consume these filters for role-scoped lead listing.
**Files touched:** none (verification only)
**API endpoints used:** `GET /api/v1/leads` with `source`, `exclude_source`, `status`, `page`, `limit`
**Breaking change:** NO
---
## [24-03-2026] — API leads data check from live logs
**What changed:** Verified live requests from presales lead list and confirmed API leads/bulk filters are applied correctly; empty API leads is due to current dataset (non-imported leads count = 0), not missing integration.
**Files touched:** `changelog-faizan/CHANGELOG.md`
**API endpoints used:** `GET /api/v1/leads?page=1&limit=10&exclude_source=imported`, `GET /api/v1/leads?page=1&limit=10&source=imported`
**Breaking change:** NO
---
## [24-03-2026] — Property visit CTA label fix (Add Visit/Revisit)
**What changed:** Fixed Property Visit List CTA label to show `Add Visit` when no visits exist and `Add Revisit` after first visit; integration already posts `visit_type` as `first_visit`/`revisit` correctly.
**Files touched:** `Frontend/crownco-presales-frontend/my-app/src/components/ui/card/propertyVisitCard.tsx`
**API endpoints used:** none
**Breaking change:** NO
---
