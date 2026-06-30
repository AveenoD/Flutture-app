# CrownCo Backend

This directory contains all backend services, APIs, and database schemas for the CrownCo CRM system.

## 📁 Directory Structure

```
Backend/
├── Database/              # PostgreSQL database schema and migrations
├── API_SERVICES_SUMMARY.md  # Comprehensive API services documentation
└── readme.md             # This file
```

## 📚 Documentation

- **[API Services Summary](./API_SERVICES_SUMMARY.md)** - Complete documentation of all 19 backend services, their endpoints, and implementation details
- **[Database Schema](./Database/README.md)** - Database structure, relationships, and migration instructions

## 🏗️ Architecture Overview

The backend is organized into **19 microservices** covering:

### Core Services (Critical)
- Authentication & Authorization
- Organization Management
- User Management (Presales, Sales, Managers)
- Lead Management
- Lead Communication (Calls, WhatsApp — Meta Cloud API with webhook, per-stage conversations, E2E and webhook flow tests in core-api)
- Lead Stages
- Dashboard & Analytics

### Business Services (High Priority)
- Team Management
- Follow-up Management
- Property Visit Tracking
- Negotiation Management
- Booking Management
- Quotation Management
- Project Management
- File Upload Service
- Subscription & Plans

### Integration Services (Medium Priority)
- API Integration (99acres, Meta, WhatsApp)
- Lead Routing
- Rejection Management

## 🗄️ Database

The PostgreSQL database schema is organized into 10 SQL files that must be executed in order. See [Database/README.md](./Database/README.md) for details.

## 🚀 Getting Started

1. Review the [API Services Summary](./API_SERVICES_SUMMARY.md) to understand the service architecture
2. Set up the database using the scripts in the [Database](./Database/) directory
3. Implement services following the priority order outlined in the API documentation

## 📝 Notes

- All services follow RESTful conventions
- Implement pagination, filtering, and search for list endpoints
- Use soft deletes for organizations and users
- Preserve history for lead updates
- Support polymorphic relationships for user references

### Sales handoff and lead routing

**Data model (same table, clear semantics)**  
- **Leads:** `presales_user_id` (presales who owned at handoff), `sales_user_id` (sales assigned, pending or accepted), `sales_accepted_at` (NULL until sales accepts). Current owner = `assigned_to_user_id` / `assigned_to_user_type` (presales until sales accepts; then switched to sales).
- **users_sales:** `project_assigned_ids` (UUID[]) – projects allotted to this sales; used for “no rules” sales routing.
- **lead_routing_rules:** `target_role` (`presales` | `sales`) – same rules table; when `target_role = 'sales'`, rule applies to sales routing and `affected_user_ids` / `affected_team_ids` refer to sales users.

**Flow**  
1. Lead assigned to Presales → Presales creates property visit.  
2. On first visit create, **RouteLeadToSales** runs: if active **sales** rules exist, first matching rule picks sales (from affected users/teams); if no rules, picks sales where lead’s project is in `users_sales.project_assigned_ids`. Sets `presales_user_id`, `sales_user_id`; `assigned_to` stays presales.  
3. Sales sees lead as **pending** (list/get). Sales calls **POST /api/v1/leads/:id/accept** (sales only).  
4. Accept sets `sales_accepted_at` = NOW() and `assigned_to_user_id` = `sales_user_id`, `assigned_to_user_type` = 'sales'. Sales now owns the lead.  
5. Presales still sees the lead **read-only** up to stage 3 (qualification, communication, site_visit) when `presales_user_id = me`.

**New / updated APIs**  
- **POST /api/v1/leads/:id/accept** – Sales only. Caller must be `sales_user_id` for the lead and `sales_accepted_at` must be NULL. Returns updated lead (200) or 404.  
- **Lead response** – All lead list/get responses include `presales_user_id`, `sales_user_id`, `sales_accepted_at` (for handoff semantics).  
- **Routing rules** – Create/update/list/get support `target_role` (`presales` | `sales`). Use `target_role: "sales"` and `affected_user_ids` = sales user UUIDs to create **sales** lead routing rules.

**Visibility**  
- **Presales:** Leads where `assigned_to_user_id = me` AND `assigned_to_user_type = 'presales'` **or** `presales_user_id = me` AND stage IN (qualification, communication, site_visit). Handed-off leads (after accept) are read-only for presales.  
- **Sales:** Leads where `assigned_to_user_id = me` AND `assigned_to_user_type = 'sales'` **or** `sales_user_id = me` AND `sales_accepted_at` IS NULL (pending).  
- **Writes** (forward stage, create visit, reject, follow-ups, etc.) only by **current owner** (`assigned_to_user_id` + `assigned_to_user_type`). **Stage remarks:** Presales can add/update remarks on any stage (own leads); Sales only on **property_visit** stage (own leads).

### Negotiation stage (Stage 4, sales only)

After the visit is finished, **sales** can forward the lead to **negotiation** via **POST /api/v1/leads/:id/forward-stage** with `next_stage: "negotiation"`. Then:

- **POST /api/v1/leads/:id/negotiation** – Create a single negotiation (project, unit, addons). Unit is auto-locked to `under_negotiation`.
- **GET /api/v1/leads/:id/negotiation** – Get negotiation with joined project, unit, addons.
- **PATCH /api/v1/leads/:id/negotiation** – Update negotiation (only when status is draft); changing unit releases the old and locks the new.
- **GET /api/v1/leads/:id/negotiation/price-breakdown** – Computed price breakdown (unit charges + addons - discount).
- **POST /api/v1/leads/:id/negotiation/submit** – Submit for manager approval.
- **POST /api/v1/leads/:id/negotiation/approve** – GM/Manager approves (optional `final_price_agreed`).
- **POST /api/v1/leads/:id/negotiation/reject** – GM/Manager rejects; unit is released back to `available`.

**Quotations** (separate entity, linked to negotiation):

- **POST /api/v1/leads/:id/quotations** – Create from current negotiation (customer name/contact/email, valid_till).
- **GET /api/v1/leads/:id/quotations** – List quotations (paginated).
- **GET /api/v1/leads/:id/quotations/:qid** – Get one quotation.
- **PATCH /api/v1/leads/:id/quotations/:qid** – Revise (version bump, status revised).
- **POST /api/v1/leads/:id/quotations/:qid/share** – Mark as shared (`shared_via`: whatsapp, email, pdf_download).

### Booking stage (Stage 5, sales only)

After the negotiation is **approved**, **sales** can forward the lead to **booking** via **POST /api/v1/leads/:id/forward-stage** with `next_stage: "booking"`. An initial `lead_bookings` row is created from the negotiation. Then:

- **GET /api/v1/leads/:id/booking** – Get booking (project, unit, addons, token/payment, EMI, extra charges).
- **PATCH /api/v1/leads/:id/booking** – Update booking (token amount, payment mode, proof, EMI details, extra charges). Only when status is initiated or token_received.
- **POST /api/v1/leads/:id/booking/submit** – Mark token received; sets `booking_status = token_received` and **leads.status = deal** (appears on Manager/GM dashboard).
- **POST /api/v1/leads/:id/booking/confirm** – GM/Manager only; sets booking_status = confirmed.
- **POST /api/v1/leads/:id/booking/cancel** – Sales or GM/Manager; cancel and release unit.
- **POST /api/v1/leads/:id/booking/documents/upload-url** – Presigned PUT URL for B2 (`file_extension`); then browser PUTs file (bucket **CORS** must allow app origin for web). Returns `object_key`.
- **POST /api/v1/leads/:id/booking/documents** – Save metadata after upload: `document_type`, `document_front_photo_url` (object key), optional `quotation_id` (same lead).
- **GET /api/v1/leads/:id/booking/documents** – List documents (Sales assigned; **Manager/GM** org access). Responses use **presigned download URLs** when B2 is configured.
- **GET /api/v1/leads/:id/booking/documents/:did** – Get one document (same signed-URL behaviour).
- **PATCH /api/v1/leads/:id/booking/documents/:did** – Update document.
- **DELETE /api/v1/leads/:id/booking/documents/:did** – Delete document.

Details: `APIs/core-api/readme.md` §6 Booking stage and §9 table.

PDF generation for quotation is done on the frontend; these APIs expose the data and share tracking.

### Call APIs (Communication - Phase 1, Mobile)

**Auth:** Presales or Sales can initiate and update calls. Managers/GM have read-only access. Uses Backblaze B2 (via MinIO Go client) for recording storage with presigned upload URLs.

- **POST /api/v1/leads/:id/calls** – Initiate call record. Returns call_id + lead phone.
- **GET /api/v1/leads/:id/calls** – List calls (paginated). `recording_url` returned as presigned HTTPS download URL (1h expiry).
- **GET /api/v1/leads/:id/calls/:call_id** – Get call detail. `recording_url` returned as presigned HTTPS download URL (1h expiry).
- **PATCH /api/v1/leads/:id/calls/:call_id** – Update call metadata (timestamps, recording_url, recording_duration) or outcome. Send the raw `object_key` from the upload-url response as `recording_url`; the API stores the key and signs it on reads.
- **POST /api/v1/leads/:id/calls/:call_id/upload-url** – Get presigned PUT URL for B2 recording upload. Body: `{ file_extension: "m4a" }`. Returns `upload_url` (PUT directly to B2) and `object_key` (store this as `recording_url` via PATCH).

**Recording upload flow:**
1. `POST .../calls` → get `call_id`
2. `POST .../calls/:call_id/upload-url` with `{ file_extension: "m4a" }` → get `upload_url` + `object_key`
3. `PUT upload_url` with audio bytes (direct to B2, no auth header)
4. `PATCH .../calls/:call_id` with `{ recording_url: object_key, recording_duration: N, call_status: "answered" }`
5. `GET .../calls/:call_id` returns `recording_url` as signed HTTPS URL ready for `just_audio` playback

**B2 env vars:** `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET_NAME`, `B2_REGION`, `B2_ENDPOINT`.

**Running migration and E2E (core-api)**  
- Apply negotiation DB changes (idempotent):  
  `docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < APIs/core-api/scripts/migrate_negotiation.sql`  
- Seed sample data for E2E:  
  `docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < APIs/core-api/scripts/seed_negotiation_e2e.sql`  
- Run E2E (API must be running, e.g. on port 3001):  
  `cd APIs/core-api && ./scripts/test_negotiation_e2e.sh`  
  Optional: `BASE_URL=http://host:port TEST_PASSWORD=YourPassword ./scripts/test_negotiation_e2e.sh`  
  Other E2E scripts: lead stage (by-stage, forward, stage remarks), follow-up, visit, assigned/summary, sales handoff, qualify/connected/reject, lead stats, **booking** — see `APIs/core-api/readme.md` for the full list.
- Booking migration (EMI + extra charges columns):  
  `docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < APIs/core-api/scripts/migrate_booking.sql`  
- Booking E2E seed and test:  
  `docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < APIs/core-api/scripts/seed_booking_e2e.sql`  
  `cd APIs/core-api && ./scripts/test_booking_e2e.sh`
- Call APIs E2E (no migration needed, lead_calls table already exists):
  `cd APIs/core-api && ./scripts/test_call_e2e.sh`