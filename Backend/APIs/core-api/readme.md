# Crownco Core API

A comprehensive CRM API built with Go (Fiber framework) for managing real estate leads, teams, subscriptions, and data imports.

## 🚀 Features

- **Organization Management**: Onboarding and profile management
- **User Management**: Support for GMs, Managers, Presales, and Sales roles
- **Team Management**: Create and manage teams with role-based permissions
- **Subscription Management**: Plan-based subscription with usage limits
- **Lead Import**: CSV-based bulk lead import with validation
- **Lead Routing**: Auto-assign leads on import using rules or least-busy distribution
- **Get Leads**: List and get leads with role-based visibility (GM/Manager see all; Presales/Sales see only assigned) and filters
- **Lead by stage**: Get leads with details by stage (Presales; assigned only)—stage remarks, follow-ups, recent calls, WhatsApp conversations
- **Forward lead stage**: Move lead to next stage—qualification → communication → property_visit → negotiation → booking (Presales; assigned only)
- **End-to-end flows**: [Import → stage forward → call → message (WhatsApp) → handoff → negotiation → booking](#-end-to-end-flows-import--stage--call--message--handoff)—see full flow and API sequence for UI integration
- **Lead actions**: Qualify and mark connected (Presales); reject with reasons (Presales/Sales); list rejection questions; list rejected leads with reasons (GM/Manager)
- **Lead Sourcing Integration**: Automated fetching of leads from external providers (Housing.com, 99acres, NoBroker, etc.) with configurable field mapping, project ID resolution, and deduplication
- **Authentication**: JWT-based auth with role and permission management
- **Redis Caching**: Performance optimization for frequently accessed data

---

## 📊 Import Data Feature

The Import Data feature allows organizations to bulk import leads from CSV files with intelligent validation, error reporting, and assignment capabilities.

### Overview

Import CSV files containing lead data, automatically validate phone numbers, check subscription limits, and assign leads to presales users using round-robin distribution.

### Key Features

✅ **CSV Upload**: Supports files up to 10MB  
✅ **Phone Validation**: Intelligent normalization of Indian phone numbers  
✅ **Lead Limit Check**: Prevents imports exceeding subscription limits  
✅ **Detailed Reporting**: Row-by-row error tracking  
✅ **Round-Robin Assignment**: Automatic distribution to multiple users  
✅ **Soft Deletion**: Unqualified leads cleanup while preserving processed leads  
✅ **Permission-Based Access**: GM and Manager (with permission) can import

---

## 🔄 Import Data Workflow

```
┌─────────────────┐
│  Upload CSV     │
│  + Title        │
│  + Description  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  1. Parse CSV           │
│  2. Validate Phones     │
│  3. Check Lead Limit    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Create Leads           │
│  source='imported'      │
│  status='unqualified'   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Return Report          │
│  • Total rows           │
│  • Successful imports   │
│  • Failed rows          │
│  • Error details        │
└─────────────────────────┘
```

---

## 🧭 Lead Routing

Lead routing assigns leads to **Presales** (on import) or **Sales** (on first property visit). The same **routing rules** API is used for both via **target_role**.

### How it works

- **On import**: After each lead is created from CSV, the system runs **RouteLead** (presales). If the lead is already assigned, nothing changes. If there are **no active presales rules**, the lead is assigned using **least-busy** among all Presales. If there are **active rules** with **target_role = presales**, the first matching rule (by priority) is used; **affected_user_ids** / **affected_team_ids** define candidate presales; **flow_type_order** (round-robin, least-busy-first) picks the assignee.
- **On first property visit**: When Presales (or Sales) creates the **first** property visit for a lead, **RouteLeadToSales** runs. If there are **active rules** with **target_role = sales**, the first matching rule picks a sales user (from **affected_user_ids** / **affected_team_ids**). If **no sales rules** exist, a sales user whose **users_sales.project_assigned_ids** contains the lead's project is chosen. The lead gets **presales_user_id**, **sales_user_id** set; **assigned_to** stays presales until sales calls **POST /api/v1/leads/:id/accept**.
- **Routing rules**: GM or Manager with `manage_routing` can create/update/delete rules. Each rule has **target_role**: `presales` (default for import) or `sales` (for handoff). Rules filter by lead source, areas, budget, status; **affected_user_ids** / **affected_team_ids** are presales user IDs for presales rules and sales user IDs for sales rules. Priority 1 (highest) to 5 (lowest); first match wins.

### Routing Rules API (CRUD)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/routing-rules` | List rules for the organization |
| GET | `/api/v1/routing-rules/:id` | Get one rule by ID |
| POST | `/api/v1/routing-rules` | Create a rule |
| PUT | `/api/v1/routing-rules/:id` | Update a rule |
| PATCH | `/api/v1/routing-rules/:id/status` | Set rule_status to `active` or `inactive` |
| DELETE | `/api/v1/routing-rules/:id` | Delete a rule |

**Authorization:** GM or Manager with `manage_routing` permission. See [Testing Lead Routing APIs with cURL](#-testing-lead-routing-apis-with-curl) for examples.

---

## 📌 End-to-end flows (Import → Stage → Call → Message → Handoff)

This section describes **all possible flows** in order, from importing leads to stage progression, calls, messaging, visits, handoff, negotiation, and booking. Use it for UI integration and to see which APIs to call in sequence.

### Flow overview

```
[Import CSV | External Provider Sync] → (optional: assign-users) → Presales: list/qualify/forward stage
    → Calls (initiate, update, recording) + WhatsApp (send/receive)
    → Follow-ups + Property visits
    → First visit triggers Sales routing → Sales: accept handoff
    → Negotiation (quotation, submit, approve) → Booking (documents, submit, confirm)
```

**Stage progression (Presales only):**  
`qualification` → `communication` → `property_visit` (site_visit) → `negotiation` → `booking`

---

### 1. Import lead

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 1.1 | POST | `/api/v1/imported-data/import` | GM or Manager (`import_data`) | Upload CSV (file, title, description). Creates leads with `status=unqualified`, `source=imported`. **RouteLead** runs per lead → presales assignment (routing rules or least-busy). |
| 1.2 | POST | `/api/v1/imported-data/:id/assign-users` | GM or Manager | Optional. Round-robin assign presales user IDs to all leads of this import. Overrides or sets assignment when you want specific users. |

**Response (201):** `imported_data_id`, `leads_created[]` (lead_id, name, phone). Use `lead_id` for all subsequent steps.

---

### 2. Presales: list leads, qualify, mark connected, forward stage

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 2.1 | GET | `/api/v1/leads` | Presales | List **my** leads (assigned to me). Use filters: `stage=qualification`, `status=unqualified`, etc. |
| 2.2 | GET | `/api/v1/leads/by-stage/:stage` | Presales | Get leads **by stage** with stage remarks, follow-ups, recent calls, WhatsApp conversations. `stage` = qualification \| communication \| property_visit. |
| 2.3 | POST | `/api/v1/leads/:id/qualify` | Presales | Set lead `status=qualified`. Optional body: name, email, budget_min/max, notes, project_id, etc. (enrich profile). |
| 2.4 | POST | `/api/v1/leads/:id/connected` | Presales | Set lead `status=called` (connected). No body. |
| 2.5 | POST | `/api/v1/leads/:id/forward-stage` | Presales | Move lead to **next stage**. Body: `next_stage` = communication \| property_visit \| negotiation \| booking, optional `remarks`. Current stage row is completed; new stage row created. **WhatsApp:** all active conversations for this lead are auto-closed. |

**Forward order:** qualification → communication → property_visit → negotiation → booking.

---

### 3. Call (Presales or Sales)

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 3.1 | GET | `/api/v1/leads/:id/stages/by-type/:stage_type` | Presales/Sales | Get **stage by type** to obtain `lead_stage_id` for the current stage (needed for creating call / follow-up). |
| 3.2 | POST | `/api/v1/leads/:id/calls` | Presales/Sales | Initiate call. Body: optional `lead_stage_id`. Returns `call_id`, `lead_phone`, `status: initiated`. App opens dialer with `lead_phone`. |
| 3.3 | PATCH | `/api/v1/leads/:id/calls/:call_id` | Presales/Sales | Update call: timestamps, `call_status`, `call_outcome`, `recording_url`, `recording_duration` (after uploading recording to B2). |
| 3.4 | POST | `/api/v1/leads/:id/calls/:call_id/upload-url` | Presales/Sales | Get presigned PUT URL for recording upload (Body: `file_extension`, e.g. `m4a`). Upload file to B2, then set `recording_url` in PATCH above. |

Calls are tied to a **lead_stage_id**. List calls: `GET /api/v1/leads/:id/calls`; get one: `GET /api/v1/leads/:id/calls/:call_id`.

---

### 4. Message (WhatsApp) – Presales or Sales

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 4.1 | GET | `/api/v1/leads/:id/stages/by-type/:stage_type` | Presales/Sales | Get current **active** stage for the lead → `stage.id` = `lead_stage_id`. Required for send (only active stages accept messages). |
| 4.2 | POST | `/api/v1/leads/:id/whatsapp/send` | Presales/Sales | Send message. Body: `lead_stage_id` (required), `message_type` (text \| template \| image \| document \| …), `message_text` (for text), or template fields. Creates/reuses conversation for that stage. |
| 4.3 | GET | `/api/v1/leads/:id/whatsapp/conversations` | Presales/Sales | List conversations (per lead); each has `lead_stage_id`, `status` (active/closed). |
| 4.4 | GET | `/api/v1/leads/:id/whatsapp/conversations/:conv_id/messages` | Presales/Sales | Get messages for a conversation. |

**Inbound:** Meta sends messages to `POST /api/v1/webhook/whatsapp`. API matches sender phone to lead, attaches to **current active stage** conversation (or creates one). No UI call needed for receive; use 4.3/4.4 to show chat.

**Note:** After **forward-stage**, previous stage’s conversations are **closed**. New messages must use the **new** stage’s `lead_stage_id`; sending to a closed stage returns 400 (stage not active).

---

### 5. Follow-ups and property visits (Presales or Sales)

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 5.1 | POST | `/api/v1/leads/:id/follow-ups` | Presales/Sales | Create follow-up. Body: `lead_stage_id`, `followup_type` (call \| whatsapp \| visit \| meeting \| document), `followup_date`, `remark`, optional `lead_call_id`. |
| 5.2 | GET | `/api/v1/leads/:id/follow-ups/:followup_id` | Presales/Sales | Get follow-up (with stage, linked call if any). |
| 5.3 | PATCH | `/api/v1/leads/:id/follow-ups/:followup_id/complete` | Presales/Sales | Mark complete. Body: `outcome` (interested \| not_interested \| follow_up \| no_response), optional `remark`. |
| 5.4 | POST | `/api/v1/leads/:id/visits` | Presales/Sales | Create **property visit**. Body: `visit_date`, `visit_time`, `visit_type` (first_visit \| revisit), optional `project_id`, location fields. **First** visit triggers **RouteLeadToSales** → sets `sales_user_id`; lead stays assigned to Presales until Sales accepts. |
| 5.5 | PATCH | `/api/v1/leads/:id/visits/:visit_id` | Presales/Sales | Update visit: `remarks`, `outcome`, `status` (e.g. completed), `site_visit_images`. |
| 5.6 | POST | `/api/v1/leads/:id/visits/:visit_id/reschedule` | Presales/Sales | Reschedule. Body: `visit_date`, `visit_time`, `delay_reason`. |

---

### 6. Sales handoff (Sales only)

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 6.1 | GET | `/api/v1/leads/assigned` | Sales | List my leads. Query `filter=pending` → leads where I am `sales_user_id` and `sales_accepted_at` IS NULL (pending handoff). `filter=assigned` → leads I have accepted. |
| 6.2 | GET | `/api/v1/leads/:id/summary` | Sales | Full summary: lead, presales_user, recent_calls, whatsapp_conversations, stage_remarks, interested_property. Use before accept. |
| 6.3 | POST | `/api/v1/leads/:id/accept` | Sales | **Accept handoff.** Caller must be `sales_user_id`; lead must be in pending handoff. Sets `sales_accepted_at` and assigns lead to Sales (`assigned_to_user_id` = sales). After this, Sales owns the lead (follow-ups, visits, reject, negotiation, booking). |

**Trigger:** Handoff is created when Presales (or Sales) creates the **first** property visit; routing assigns `sales_user_id`. Presales continues to see the lead (read-only for handed-off stages) until Sales accepts.

---

### 7. Reject lead (Presales or Sales)

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 7.1 | GET | `/api/v1/rejection-questions` | Presales/Sales | Get questions (optional `category`). |
| 7.2 | POST | `/api/v1/leads/:id/reject` | Presales/Sales | Reject with reasons. Body: `questions_response[]` (question_id, answer). Sets lead `status=rejected`. |

Can be used at any point when the lead is assigned to the caller (e.g. after calls, before or after visit).

---

### 8. Negotiation (Presales or Sales, after lead in negotiation stage)

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 8.1 | POST | `/api/v1/leads/:id/forward-stage` | Presales | Move lead to `negotiation` (if coming from property_visit). |
| 8.2 | POST | `/api/v1/leads/:id/negotiation` | Sales | Create negotiation (draft). Body: `project_id`, `unit_id`, `addon_ids[]`, `price_offered`, `discount_amount`, `discount_title`, `user_commission`. Multiple cycles allowed; only one draft at a time. |
| 8.3 | GET | `/api/v1/leads/:id/negotiation` | Sales | Get latest negotiation for the lead. |
| 8.4 | PATCH | `/api/v1/leads/:id/negotiation` | Sales | Update negotiation (draft only). |
| 8.5 | GET | `/api/v1/leads/:id/negotiation/price-breakdown` | Sales | Computed price breakdown for latest negotiation. |
| 8.6 | POST | `/api/v1/leads/:id/negotiation/submit` | Sales | Submit draft negotiation for manager approval. |
| 8.7 | POST | `/api/v1/leads/:id/negotiation/approve` | Manager/GM | Approve negotiation. |
| 8.8 | POST | `/api/v1/leads/:id/negotiation/reject` | Manager/GM | Reject negotiation (releases unit). |
| 8.9 | POST | `/api/v1/leads/:id/quotations` | Sales | Create quotation. Body: `unit_id` (required), `project_id` (optional override), `addon_ids[]` (optional), `discount_name`, `discount_price`, `customer_name`, `customer_contact`, `customer_email`, `valid_till`. Discount and customer info are quotation-level; client typically pre-fills customer from lead. |
| 8.10 | GET | `/api/v1/leads/:id/quotations` | Sales/Manager/GM | List all quotations for the lead. |
| 8.11 | GET | `/api/v1/leads/:id/quotations/:qid` | Sales/Manager/GM | Get one quotation. |
| 8.12 | PATCH | `/api/v1/leads/:id/quotations/:qid` | Sales | Revise quotation (increments version). |
| 8.13 | POST | `/api/v1/leads/:id/quotations/:qid/approve` | Manager/GM | Approve quotation. Only one quotation per lead can be approved at a time (DB-enforced). Returns 409 if another is already approved. |
| 8.14 | POST | `/api/v1/leads/:id/quotations/:qid/reject` | Manager/GM | Reject quotation. |
| 8.15 | POST | `/api/v1/leads/:id/quotations/:qid/share` | Sales | Mark quotation as shared (whatsapp/email/pdf_download). |

---

### 9. Booking (Sales, after negotiation approved)

| Step | Method | Path | Auth | Description |
|------|--------|------|------|-------------|
| 9.1 | POST | `/api/v1/leads/:id/forward-stage` | Presales | Forward lead to `booking` (after negotiation approval). Creates initial `lead_bookings` row from negotiation. |
| 9.2 | GET | `/api/v1/leads/:id/booking` | Sales | Get booking (project, unit, token, EMI, documents). |
| 9.3 | PATCH | `/api/v1/leads/:id/booking` | Sales | Update booking (token amount, payment mode, proof, EMI, extra charges). |
| 9.4 | POST | `/api/v1/leads/:id/booking/documents/upload-url` | Sales | Presigned **PUT** URL for Backblaze B2. Body: `file_extension` (e.g. `jpg`, `pdf`). Returns `upload_url`, `object_key`. Ensures a `lead_bookings` row exists for the lead. |
| 9.5 | POST | `/api/v1/leads/:id/booking/documents` | Sales | After uploading bytes to B2 via presigned PUT, save metadata: `document_name`, `document_type` (enum), `document_front_photo_url` (**object key**, not the presigned URL), optional `remarks`, optional **`quotation_id`** (must be a quotation for the same lead). |
| 9.6 | GET | `/api/v1/leads/:id/booking/documents` | Sales / Manager / GM | List documents. Stored keys are returned as **presigned download URLs** (~1h) when B2 is configured. |
| 9.7 | POST | `/api/v1/leads/:id/booking/submit` | Sales | Mark token received. Sets `booking_status=token_received`, **leads.status=deal**. |
| 9.8 | POST | `/api/v1/leads/:id/booking/confirm` | GM/Manager | Confirm booking. |
| 9.9 | POST | `/api/v1/leads/:id/booking/cancel` | Sales/Manager | Cancel booking. |

---

### 10. Stage remarks and stage details (Presales / Sales)

Used at any time for the current or past stages:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/leads/:id/stages/by-type/:stage_type` | Stage by type: remarks, recent_calls, follow_ups, whatsapp_conversations (and visits for property_visit). |
| GET | `/api/v1/leads/:id/stages/:stage_id` | Stage by UUID: remarks + calls with recording. |
| PATCH | `/api/v1/leads/:id/stages/:stage_id/remarks` | Add/update remarks. Presales: any stage; Sales: **property_visit** only. |

---

### Quick reference: flow → APIs

| Flow | Key APIs |
|------|----------|
| **Import** | `POST /imported-data/import` → optional `POST /imported-data/:id/assign-users` |
| **External Sync** | `POST /organization-apis` → `POST /external-project-mappings` → `POST /lead-sourcing-configs` → `POST /lead-sourcing-configs/:id/sync-now` or background scheduler |
| **Presales pipeline** | `GET /leads`, `GET /leads/by-stage/:stage` → `POST /leads/:id/qualify`, `POST /leads/:id/connected` → `POST /leads/:id/forward-stage` |
| **Call** | `GET /leads/:id/stages/by-type/:stage` (get lead_stage_id) → `POST /leads/:id/calls` → `PATCH /leads/:id/calls/:call_id` (+ optional upload-url) |
| **Message** | `GET /leads/:id/stages/by-type/:stage` (active stage) → `POST /leads/:id/whatsapp/send` → `GET /leads/:id/whatsapp/conversations`, `GET .../messages` |
| **Follow-up / Visit** | `POST /leads/:id/follow-ups`; `POST /leads/:id/visits` (first visit → sales routing) |
| **Handoff** | Sales: `GET /leads/assigned?filter=pending` → `GET /leads/:id/summary` → `POST /leads/:id/accept` |
| **Reject** | `GET /rejection-questions` → `POST /leads/:id/reject` |
| **Negotiation** | `POST /leads/:id/forward-stage` (next_stage=negotiation) → `POST /leads/:id/negotiation` → quotations → submit → approve (Manager/GM) |
| **Booking** | `POST /leads/:id/forward-stage` (next_stage=booking) → `GET/PATCH /leads/:id/booking` → `POST .../booking/documents/upload-url` → PUT file to B2 → `POST .../booking/documents` (metadata + object key) → `POST .../booking/submit` → `POST .../confirm` (GM/Manager) |

---

## 📋 Get Leads APIs

Leads can be listed and fetched by ID with **role-based visibility** and **filters**.

### Visibility

| Role | What they see |
|------|----------------|
| **GM** | All leads in the organization |
| **Manager** | All leads in the organization (requires `view_leads` permission) |
| **Presales** | Leads where `assigned_to_user_id` = me and `assigned_to_user_type` = `presales` **or** `presales_user_id` = me and stage ∈ qualification / communication / site_visit (handed-off leads, read-only) |
| **Sales** | Leads where `assigned_to_user_id` = me and `assigned_to_user_type` = `sales` **or** `sales_user_id` = me and `sales_accepted_at` IS NULL (pending handoff) |

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/leads` | List leads (with filters and pagination) |
| GET | `/api/v1/leads/assigned` | List assigned leads for sales user (Sales only; optional `filter`: assigned, pending, or all) |
| GET | `/api/v1/leads/by-stage/:stage` | Get leads with details by stage (Presales only; assigned leads only) |
| GET | `/api/v1/leads/rejected` | List rejected leads with rejection reasons (GM/Manager only) |
| GET | `/api/v1/leads/stats` | Get aggregate lead stats for current user (Presales/Sales; total calls, messages sent, site visits done, calling hours) |
| GET | `/api/v1/leads/:id` | Get one lead by ID (same visibility rules; 404 if not found or not allowed) |
| GET | `/api/v1/leads/:id/summary` | Get lead summary – profile, presales user, recent calls, messages, remarks, interested property (Sales only) |
| GET | `/api/v1/leads/:id/stats` | Get lead stats for a single lead (Presales/Sales; lead must be assigned) |
| POST | `/api/v1/leads/:id/qualify` | Set lead status to qualified (Presales only; lead must be assigned) |
| POST | `/api/v1/leads/:id/connected` | Set lead status to called/connected (Presales only; lead must be assigned) |
| POST | `/api/v1/leads/:id/forward-stage` | Forward lead to next stage (Presales only; lead must be assigned) |
| GET | `/api/v1/leads/:id/stages/by-type/:stage_type` | Get a lead's stage by type (e.g. communication): remarks, recent calls (with recording), follow-ups, WhatsApp conversations/messages (Presales; Sales for property_visit/booking) |
| GET | `/api/v1/leads/:id/stages/:stage_id` | Get stage details by stage UUID: remarks + calls with recording (Presales or Sales; lead must be assigned) |
| PATCH | `/api/v1/leads/:id/stages/:stage_id/remarks` | Add or update remarks on a stage: Presales any stage; Sales only **property_visit** stage (lead must be assigned) |
| POST | `/api/v1/leads/:id/follow-ups` | Create follow-up for a stage (Presales or Sales; lead must be assigned; remark required) |
| GET | `/api/v1/leads/:id/follow-ups/:followup_id` | Get follow-up details: stage, linked call with recording, remarks (Presales or Sales) |
| PATCH | `/api/v1/leads/:id/follow-ups/:followup_id/complete` | Mark follow-up completed with outcome (Presales or Sales; outcome required) |
| DELETE | `/api/v1/leads/:id/follow-ups/:followup_id` | Delete a follow-up (Presales or Sales; lead must be assigned) |
| POST | `/api/v1/leads/:id/visits` | Create property visit (Presales or Sales; lead must be assigned) |
| GET | `/api/v1/leads/:id/visits/:visit_id` | Get visit details with project info (Presales or Sales) |
| PATCH | `/api/v1/leads/:id/visits/:visit_id` | Update visit: images, remarks, outcome, mark complete (Presales or Sales) |
| POST | `/api/v1/leads/:id/visits/:visit_id/reschedule` | Reschedule visit with delay reason (Presales or Sales) |
| POST | `/api/v1/leads/:id/reject` | Reject lead with reasons (Presales or Sales; lead must be assigned) |
| POST | `/api/v1/leads/:id/accept` | Accept handoff (Sales only; caller must be `sales_user_id`, `sales_accepted_at` NULL) |
| GET | `/api/v1/rejection-questions` | List active rejection questions (Presales or Sales) |

### List leads – query parameters (all optional)

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Exact: e.g. `unqualified`, `qualified` |
| `stage` | string | Exact: e.g. `qualification`, `communication` |
| `lead_temperature` | string | Exact: `veryhot`, `hot`, `warm`, `cold` |
| `source` | string | Exact: e.g. `imported`, `website` |
| `priority` | string | Exact: `low`, `medium`, `high`, `urgent` |
| `city` | string | ILIKE (partial match) |
| `state` | string | ILIKE (partial match) |
| `search` | string | Matches name OR phone OR email (ILIKE) |
| `created_after` | string | ISO date/datetime: `created_at >= value` |
| `created_before` | string | ISO date/datetime: `created_at <= value` |
| `assigned_to_user_id` | UUID | GM/Manager only: filter by assignee |
| `page` | int | Default 1 |
| `limit` | int | Default 20, max 100 |

### Example: List leads

```bash
curl -s "http://localhost:3000/api/v1/leads?status=unqualified&limit=10&page=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Leads retrieved successfully",
  "data": {
    "leads": [
      {
        "id": "uuid",
        "organization_id": "uuid",
        "name": "Lead One",
        "phone": "9876543210",
        "email": "lead1@example.com",
        "city": "Bangalore",
        "state": "Karnataka",
        "lead_temperature": "warm",
        "status": "unqualified",
        "stage": "qualification",
        "assigned_to_user_id": "uuid",
        "assigned_to_user_type": "presales",
        "presales_user_id": null,
        "sales_user_id": null,
        "sales_accepted_at": null,
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 48,
      "total_pages": 5
    }
  }
}
```

### Example: Get lead by ID

```bash
curl -s "http://localhost:3000/api/v1/leads/LEAD_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Presales/Sales get **404** if the lead is not assigned to them.

### Lead stats (aggregate and per lead)

**Aggregate – all leads assigned to current user**  
**Endpoint:** `GET /api/v1/leads/stats`  
**Auth:** Presales or Sales only.  
**Query (optional):** `from_date`, `to_date` (YYYY-MM-DD; both required if either is set), or `period=30d` for last 30 days. If omitted, stats are all-time.  
**Response (200):** `total_calls_made`, `message_sent`, `site_visit_done`, `calling_hour` (e.g. `"3:45 hrs"`), `calling_hour_seconds`.

**Per lead**  
**Endpoint:** `GET /api/v1/leads/:id/stats`  
**Auth:** Presales or Sales; lead must be assigned to the current user. Same query params and response shape.

```bash
curl -s "http://localhost:3000/api/v1/leads/stats" -H "Authorization: Bearer TOKEN"
curl -s "http://localhost:3000/api/v1/leads/stats?period=30d" -H "Authorization: Bearer TOKEN"
curl -s "http://localhost:3000/api/v1/leads/LEAD_UUID/stats" -H "Authorization: Bearer TOKEN"
```

---

## 📌 Get leads by stage & Forward lead stage (Presales only)

### 1. Get leads by stage (with details)

**Endpoint:** `GET /api/v1/leads/by-stage/:stage`  
**Auth:** Presales only. Returns only leads assigned to the current user.  
**Path:** `stage` = `qualification` \| `communication` \| `property_visit`.  
**Query:** `page` (default 1), `limit` (default 20).

**Response (200):** For each lead: `lead`, `stage_remarks` (from `lead_stages.remarks`), `follow_ups` (last 20), `recent_calls` (last 10), `whatsapp_conversations` (last 5 convos, each with last 5 messages), plus `pagination`.  
**Errors:** 400 invalid stage; 403 not Presales.

```bash
curl -s "http://localhost:3000/api/v1/leads/by-stage/communication?page=1&limit=20" \
  -H "Authorization: Bearer PRESALES_TOKEN"
```

### 2. Forward lead to next stage

**Endpoint:** `POST /api/v1/leads/:id/forward-stage`  
**Auth:** Presales only. Lead must be assigned to the current user.  
**Body:**

```json
{
  "next_stage": "communication | property_visit | negotiation | booking",
  "remarks": "optional note"
}
```

**Allowed flow:** qualification → communication → property_visit → negotiation → booking. Current `lead_stages` row is completed and a new row is created; `leads.stage` is updated (API accepts `property_visit`, DB stores as `site_visit`).  
**Response:** 200 with updated lead; 400 invalid `next_stage` or invalid transition; 403 not Presales; 404 lead not found or not assigned.

```bash
curl -X POST "http://localhost:3000/api/v1/leads/LEAD_UUID/forward-stage" \
  -H "Authorization: Bearer PRESALES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"next_stage":"communication","remarks":"Initial call done"}'
```

### 3. Get stage by type (e.g. communication) – remarks, calls, follow-ups, WhatsApp

**Endpoint:** `GET /api/v1/leads/:id/stages/by-type/:stage_type`  
**Auth:** Presales only. Lead must be assigned to the current user.  
**Path:** `id` = lead UUID, `stage_type` = `qualification` \| `communication` \| `property_visit` \| `negotiation` \| `booking`.

Returns the **latest** stage row of that type for the lead, with:
- **stage** – id, lead_id, stage_type, remarks, status, created_at, updated_at  
- **recent_calls** – up to 20 calls for this stage (with recording_url, recording_duration)  
- **follow_ups** – up to 20 follow-ups for this stage  
- **whatsapp_conversations** – up to 5 conversations for this stage, each with last 5 messages  

**Errors:** 400 invalid stage_type; 403 not Presales; 404 lead or stage not found / not assigned.

```bash
curl -s "http://localhost:3000/api/v1/leads/LEAD_UUID/stages/by-type/communication" \
  -H "Authorization: Bearer PRESALES_TOKEN"
```

### 4. Get stage details by stage UUID (remarks + calls with recording)

**Endpoint:** `GET /api/v1/leads/:id/stages/:stage_id`  
**Auth:** Presales or Sales. Lead must be assigned to the current user.  
**Path:** `id` = lead UUID, `stage_id` = `lead_stages.id` (UUID of the stage row).

**Response (200):** `stage` (id, lead_id, stage_type, remarks, status, created_at, updated_at) and `calls` array. Each call includes `id`, `lead_stage_id`, `call_status`, `call_outcome`, `call_started_at`, `call_ended_at`, `recording_url`, `recording_duration` (seconds), `created_at`.  
**Errors:** 403 if not Presales or Sales; 404 if lead or stage not found or lead not assigned.

```bash
curl -s "http://localhost:3000/api/v1/leads/LEAD_UUID/stages/STAGE_UUID" \
  -H "Authorization: Bearer TOKEN"
```

### 5. Add remarks on a specific stage

**Endpoint:** `PATCH /api/v1/leads/:id/stages/:stage_id/remarks`  
**Auth:** Presales: any stage (lead must be assigned). Sales: only **property_visit** stage (lead must be assigned).  
**Path:** `id` = lead UUID, `stage_id` = `lead_stages.id` (UUID of the stage row).  
**Body:** `{ "remarks": "Your note for this stage" }`

**Action:** Updates `lead_stages.remarks` for the given stage row. The stage must belong to the lead and organization. Sales gets 403 if the stage is not property_visit.  
**Response:** 200 with `stage` (stage_id, lead_id, stage_type, remarks, updated_at); 403 if not allowed (e.g. Sales on non–PV stage); 404 if lead or stage not found or lead not assigned.

```bash
# Presales – any stage
curl -X PATCH "http://localhost:3000/api/v1/leads/LEAD_UUID/stages/STAGE_UUID/remarks" \
  -H "Authorization: Bearer PRESALES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks":"Called twice, next follow-up Friday"}'

# Sales – only property_visit stage
curl -X PATCH "http://localhost:3000/api/v1/leads/LEAD_UUID/stages/STAGE_UUID/remarks" \
  -H "Authorization: Bearer SALES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks":"PV stage remark"}'
```

### 6. Booking stage (Stage 5, sales only)

**Auth:** Core booking **GET/PATCH/submit** and document **POST/DELETE** are **Sales** (lead must be assigned to the sales user). **Confirm** is GM/Manager; **cancel** is Sales or GM/Manager. **List/Get booking documents** (`GET .../booking/documents`, `GET .../booking/documents/:did`) are also allowed for **Manager / GM** (same org lead access), so manager UIs can show files. **PATCH document** is Sales only.

When a lead is forwarded from **negotiation** (approved) to **booking**, an initial `lead_bookings` row is created with project/unit/price from the negotiation. Sales can then:

- **GET /api/v1/leads/:id/booking** – Get booking with project, unit, addons, token/payment, EMI and extra charges.
- **PATCH /api/v1/leads/:id/booking** – Update booking (token amount, payment mode, payment proof, EMI details, extra charges). Only when status is `initiated` or `token_received`.
- **POST /api/v1/leads/:id/booking/submit** – Mark token received; sets `booking_status = token_received` and **leads.status = deal** (so the lead appears on Manager/GM dashboard).
- **POST /api/v1/leads/:id/booking/confirm** – GM/Manager only; sets `booking_status = confirmed`.
- **POST /api/v1/leads/:id/booking/cancel** – Cancel booking and release unit to available.
- **POST /api/v1/leads/:id/booking/documents/upload-url** – Get a presigned **PUT** URL for uploading a file to B2 (body: `file_extension`). Returns `upload_url`, `object_key`. Ensures `lead_bookings` exists. **Web clients:** the browser then **PUT**s the file directly to B2; the B2 bucket must have **CORS** rules allowing your app origin (e.g. `localhost:3005`) for `PUT`, or the browser will fail with “Failed to fetch”.
- **POST /api/v1/leads/:id/booking/documents** – Save document metadata **after** B2 upload: `document_name`, `document_type` (pancard, aadharcard, booking_agreement, passport_photo, electricity_bill, voter_id, driving_license, bank_passbook), `document_front_photo_url` (**storage object key** returned from upload-url), optional `remarks`, optional **`quotation_id`** (FK to `lead_quotations`, same lead). DB column `quotation_id` requires migration `scripts/migrate_lead_booking_documents_quotation_id.sql` on existing databases.
- **GET /api/v1/leads/:id/booking/documents** – List documents. Response replaces stored object keys with **presigned download URLs** when B2 is configured.
- **GET /api/v1/leads/:id/booking/documents/:did** – Get one document (same signed-URL behaviour).
- **PATCH /api/v1/leads/:id/booking/documents/:did** – Update document.
- **DELETE /api/v1/leads/:id/booking/documents/:did** – Delete document.

See **OpenAPI** (`docs/open-api.yml`) for request/response schemas. E2E: `scripts/test_booking_e2e.sh` (after `migrate_booking.sql` and `seed_booking_e2e.sql`).

---

### 7. Call APIs (Communication - Phase 1, Mobile)

**Auth:** Presales or Sales can initiate and update calls. Managers/GM have read-only access (list/get). Lead must belong to the caller's organization.

When a user clicks "Call Now" on the mobile app (Flutter), the app creates a call record via the API, opens the native dialer, and after the call ends, uploads the recording to Backblaze B2 via a presigned URL, then updates the call metadata.

**Endpoints:**

- **POST /api/v1/leads/:id/calls** – Initiate a call record. Body: `{ lead_stage_id? }`. Returns `call_id`, `lead_phone`, `status: initiated`.
- **GET /api/v1/leads/:id/calls** – List all calls for a lead. Pagination via `?page=1&limit=20`.
- **GET /api/v1/leads/:id/calls/:call_id** – Get single call detail (status, outcome, recording, timestamps, AI fields).
- **PATCH /api/v1/leads/:id/calls/:call_id** – Update call metadata/outcome: `call_status`, `call_started_at`, `call_answered_at`, `call_ended_at`, `recording_url`, `recording_duration`, `call_outcome`.
- **POST /api/v1/leads/:id/calls/:call_id/upload-url** – Get a presigned PUT URL for uploading recording to Backblaze B2. Body: `{ file_extension: "m4a" }`. Returns `{ upload_url, object_key }`.

**Call Flow:**
1. Flutter -> `POST /leads/:id/calls` -> get `call_id` + `lead_phone`
2. Flutter opens native dialer
3. After call ends, Flutter -> `POST /leads/:id/calls/:call_id/upload-url` -> get presigned URL
4. Flutter uploads recording directly to B2 via presigned PUT URL
5. Flutter -> `PATCH /leads/:id/calls/:call_id` with `recording_url`, `recording_duration`, timestamps, `call_status`
6. Later, user opens lead -> sees recent calls -> fills `call_outcome` via PATCH

**B2 Storage Config (env vars):** `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET_NAME`, `B2_REGION`, `B2_ENDPOINT`. Uses MinIO Go client (`minio-go/v7`) for S3-compatible presigned URLs.

E2E: `scripts/test_call_e2e.sh`

---

## 📌 Follow-up APIs (Presales or Sales; lead must be assigned)

### Create follow-up

**Endpoint:** `POST /api/v1/leads/:id/follow-ups`  
**Auth:** Presales or Sales. Lead must be assigned to the current user.  
**Body:** `lead_stage_id` (UUID, required), `followup_type` (required: call \| whatsapp \| visit \| meeting \| document), `followup_date` (required, ISO datetime), `remark` (required, non-empty), `lead_call_id` (optional UUID).  
**Response:** 201 with created `follow_up`. 400 if remark missing/empty or invalid body; 403 if not Presales/Sales; 404 if lead or stage not found or not assigned.

```bash
curl -X POST "http://localhost:3000/api/v1/leads/LEAD_UUID/follow-ups" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"lead_stage_id":"STAGE_UUID","followup_type":"call","followup_date":"2025-03-20T10:00:00Z","remark":"Schedule site visit"}'
```

### Get follow-up details

**Endpoint:** `GET /api/v1/leads/:id/follow-ups/:followup_id`  
**Auth:** Presales or Sales. Lead must be assigned.  
**Response:** 200 with `follow_up` (full row), `stage` (stage info and remarks when lead_stage_id set), `linked_call` (call with recording_url/recording_duration when lead_call_id set). 403 if not Presales/Sales; 404 if lead or follow-up not found or not assigned.

```bash
curl -s "http://localhost:3000/api/v1/leads/LEAD_UUID/follow-ups/FOLLOWUP_UUID" -H "Authorization: Bearer TOKEN"
```

### Mark follow-up as completed

**Endpoint:** `PATCH /api/v1/leads/:id/follow-ups/:followup_id/complete`  
**Auth:** Presales or Sales. Lead must be assigned.  
**Body:** `outcome` (required: interested \| not_interested \| follow_up \| no_response), `remark` (optional, update remark when completing).  
**Response:** 200 with updated `follow_up`. 400 if outcome missing/invalid; 403 if not Presales/Sales; 404 if lead or follow-up not found or not assigned.

```bash
curl -X PATCH "http://localhost:3000/api/v1/leads/LEAD_UUID/follow-ups/FOLLOWUP_UUID/complete" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"outcome":"follow_up"}'
```

### Delete follow-up

**Endpoint:** `DELETE /api/v1/leads/:id/follow-ups/:followup_id`  
**Auth:** Presales or Sales. Lead must be assigned.  
**Response:** 200 with success message and `followup_id`. 403 if not Presales/Sales; 404 if lead or follow-up not found or not assigned.

```bash
curl -X DELETE "http://localhost:3000/api/v1/leads/LEAD_UUID/follow-ups/FOLLOWUP_UUID" -H "Authorization: Bearer TOKEN"
```

---

## 📌 Property Visit APIs (Presales or Sales; lead must be assigned)

### Create visit

**Endpoint:** `POST /api/v1/leads/:id/visits`  
**Auth:** Presales or Sales. Lead must be assigned.  
**Body:** `visit_date` (required, YYYY-MM-DD), `visit_time` (required, HH:MM), `visit_type` (required: `first_visit` | `revisit`), `project_id` (optional UUID), `location_city` (optional), `location_area` (optional), `location_coordinates` (optional, map URL or lat,long).  
**Response:** 201 with `visit`. 400 invalid body; 403 not Presales/Sales; 404 lead not found/not assigned or project not found.

```bash
curl -X POST "http://localhost:3000/api/v1/leads/LEAD_UUID/visits" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-24","visit_time":"14:30","visit_type":"first_visit","location_city":"Pembroke Pines"}'
```

### Get visit details

**Endpoint:** `GET /api/v1/leads/:id/visits/:visit_id`  
**Auth:** Presales or Sales. Lead must be assigned.  
**Response:** 200 with `visit` (full row + created_by info) and `project` (id, project_title) when project_id is set. 403/404 as above.

```bash
curl -s "http://localhost:3000/api/v1/leads/LEAD_UUID/visits/VISIT_UUID" -H "Authorization: Bearer TOKEN"
```

### Update visit (images, remarks, outcome, mark complete)

**Endpoint:** `PATCH /api/v1/leads/:id/visits/:visit_id`  
**Auth:** Presales or Sales. Lead must be assigned.  
**Body:** Optional: `site_visit_images` (array of object keys), `remarks`, `outcome` (interested | not_interested | follow_up | negotiation_started), `status` (scheduled | completed | delayed_by_client | missed_by_sales_person).  
**Response:** 200 with updated `visit`. The API also returns `site_visit_image_urls` as presigned download URLs for display. 400 if invalid enum; 403/404 as above.

```bash
curl -X PATCH "http://localhost:3000/api/v1/leads/LEAD_UUID/visits/VISIT_UUID" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"completed","outcome":"interested","remarks":"Client loved the property"}'
```

### Reschedule visit

**Endpoint:** `POST /api/v1/leads/:id/visits/:visit_id/reschedule`  
**Auth:** Presales or Sales. Lead must be assigned.  
**Body:** `visit_date` (required), `visit_time` (required), `delay_reason` (required: client_unavailable | traffic | weather | sales_unavailable | other).  
**Response:** 200 with updated `visit` (status reset to scheduled). 400 invalid/missing fields; 403/404 as above.

```bash
curl -X POST "http://localhost:3000/api/v1/leads/LEAD_UUID/visits/VISIT_UUID/reschedule" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"visit_date":"2025-08-28","visit_time":"11:00","delay_reason":"client_unavailable"}'
```

### Get property visit stage (visits + calls + follow-ups + messages)

Use `GET /api/v1/leads/:id/stages/by-type/property_visit` — both Presales and Sales allowed. Response includes `stage`, `recent_calls`, `follow_ups`, `whatsapp_conversations`, and `visits` array.

---

## 📌 Lead Qualify, Connected, Reject & Rejected Leads (5 APIs)

### 1. Qualify lead

**Endpoint:** `POST /api/v1/leads/:id/qualify`  
**Auth:** Presales only. Lead must be assigned to the current user.  
**Body:** Optional. When a fresh lead has only a phone number, you can enrich profile at qualification time:

```json
{
  "name": "string",
  "email": "string",
  "alternate_phone": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "pincode": "string",
  "budget_min": 0,
  "budget_max": 0,
  "lead_temperature": "warm",
  "priority": "medium",
  "notes": "string",
  "tags": ["tag1"],
  "project_id": "uuid"
}
```

**Action:** Sets lead `status` to `qualified` and updates any provided fields.  
**Response:** 200 with updated lead; 403 if not Presales; 404 if lead not found or not assigned.

```bash
curl -X POST "http://localhost:3000/api/v1/leads/LEAD_UUID/qualify" \
  -H "Authorization: Bearer PRESALES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","budget_min":50,"notes":"Interested in 3BHK"}'
```

### 2. Update lead (general)

**Endpoint:** `PUT /api/v1/leads/:id`  
**Auth:** All roles. GM/Manager can update any org lead; Presales/Sales can update only leads they own (assigned to them).  
**Body:** Optional fields (all nullable). Only sent fields are updated.

```json
{
  "name": "string",
  "phone": "string",
  "email": "string",
  "alternate_phone": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "pincode": "string",
  "source": "string",
  "source_detail": "string",
  "budget_min": 0,
  "budget_max": 0,
  "lead_temperature": "string",
  "status": "string",
  "stage": "string",
  "priority": "string",
  "tags": ["string"],
  "notes": "string",
  "project_id": "uuid"
}
```

**Response:** 200 with updated lead; 403 if not allowed; 404 if lead not found or not visible.

```bash
curl -X PUT "http://localhost:3000/api/v1/leads/LEAD_UUID" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"notes":"Updated notes"}'
```

### 3. Mark lead connected

**Endpoint:** `POST /api/v1/leads/:id/connected`  
**Auth:** Presales only. Lead must be assigned to the current user.  
**Body:** None.  
**Action:** Sets lead `status` to `called` (connected).  
**Response:** 200 with updated lead; 403 if not Presales; 404 if lead not found or not assigned.

```bash
curl -X POST "http://localhost:3000/api/v1/leads/LEAD_UUID/connected" \
  -H "Authorization: Bearer PRESALES_TOKEN"
```

### 4. Get rejection questions

**Endpoint:** `GET /api/v1/rejection-questions`  
**Auth:** Presales or Sales.  
**Query:** Optional `category` (e.g. `budget`, `area`, `timeline`).  
**Response:** 200 with `data.questions` array: `id`, `question_text`, `options`, `category`. Used to show the form before calling reject.

```bash
curl "http://localhost:3000/api/v1/rejection-questions" \
  -H "Authorization: Bearer PRESALES_OR_SALES_TOKEN"
```

### 5. Reject lead with reasons

**Endpoint:** `POST /api/v1/leads/:id/reject`  
**Auth:** Presales or Sales. Lead must be assigned to the current user.  
**Body:**

```json
{
  "questions_response": [
    { "question_id": "uuid-from-rejection-questions", "answer": "Yes, significantly over budget" }
  ],
  "ai_summary": "optional",
  "ai_bullet_points": ["optional", "array"]
}
```

**Action:** Inserts into `lead_rejections`, sets lead `status` to `rejected`.  
**Response:** 200 with `lead_id`, `rejection_id`, `lead`; 400 if `questions_response` empty; 403 if not Presales/Sales; 404 if lead not found or not assigned.

```bash
curl -X POST "http://localhost:3000/api/v1/leads/LEAD_UUID/reject" \
  -H "Authorization: Bearer PRESALES_OR_SALES_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questions_response":[{"question_id":"QUESTION_UUID","answer":"Yes, significantly over budget"}]}'
```

### 6. Accept lead – sales handoff (Sales only)

**Endpoint:** `POST /api/v1/leads/:id/accept`  
**Auth:** Sales only. Caller must be the **sales_user_id** for this lead, and **sales_accepted_at** must be NULL (lead in pending handoff).  
**Body:** None.  
**Action:** Sets `sales_accepted_at` = now and assigns the lead to the sales user (`assigned_to_user_id` = `sales_user_id`, `assigned_to_user_type` = `sales`). Sales becomes the current owner and can perform follow-ups, visits, reject, etc.  
**Response:** 200 with updated `lead` (includes `presales_user_id`, `sales_user_id`, `sales_accepted_at`). 403 if not Sales or caller is not the assigned sales; 404 if lead not found or not in pending handoff.

**Flow:** Presales creates first property visit → **RouteLeadToSales** sets `presales_user_id` and `sales_user_id`; lead stays assigned to presales. Sales sees the lead in list (pending). Sales calls **accept** → lead is assigned to sales.

```bash
curl -X POST "http://localhost:3000/api/v1/leads/LEAD_UUID/accept" \
  -H "Authorization: Bearer SALES_TOKEN"
```

### 5a. List assigned leads (Sales only)

**Endpoint:** `GET /api/v1/leads/assigned`  
**Auth:** Sales only.  
**Query:** Same as list leads (page, limit, status, stage, search, etc.). Optional **`filter`**: `assigned` (only leads I accepted), `pending` (only pending handoff), or `all` (default).  
**Response:** 200 with `leads` and `pagination` (same shape as GET /leads). 403 if not Sales.

```bash
curl -s "http://localhost:3000/api/v1/leads/assigned?filter=all&page=1&limit=20" -H "Authorization: Bearer SALES_TOKEN"
```

### 5b. Get lead summary (Sales only)

**Endpoint:** `GET /api/v1/leads/:id/summary`  
**Auth:** Sales only. Lead must be visible to the sales user (assigned or pending handoff).  
**Response (200):** Single payload with `lead` (LeadResponse), `presales_user` (id, name, email, phone or null), `recent_calls` (last 20 across all stages, with recording), `whatsapp_conversations` (last 5 convos, each with last 5 messages), `stage_remarks` (all stages with remarks), `interested_property` (project_id, project_title from lead, or null). 403 if not Sales; 404 if lead not found or not visible.

```bash
curl -s "http://localhost:3000/api/v1/leads/LEAD_UUID/summary" -H "Authorization: Bearer SALES_TOKEN"
```

### 6. List rejected leads (GM/Manager only)

**Endpoint:** `GET /api/v1/leads/rejected` (GM/Manager only)  
**Auth:** GM or Manager only. Manager requires `view_leads` permission.  
**Query:** `page`, `limit` (default 20), `search` (name/phone/email), `city`.  
**Response:** 200 with `rejected_leads` (each item has `lead` + `rejection` with `questions_response` including `question_text` and `category`) and `pagination`.

```bash
curl "http://localhost:3000/api/v1/leads/rejected?page=1&limit=20" \
  -H "Authorization: Bearer GM_OR_MANAGER_TOKEN"
```

---

## 📊 Dashboard & Analytics

**Endpoint:** `GET /api/v1/dashboard`  
**Auth:** All roles. Response is role-based:
- **GM / Manager:** Org-wide stats, pipeline by stage, upcoming 10 follow-ups, upcoming 10 visits, recent deals (status=deal), leaderboard (top presales by deals/calls).
- **Presales / Sales:** My leads only: stats, pipeline, my upcoming follow-ups, my upcoming visits.

**Response (200):** `stats` (total_leads, active_leads, deals_closed, conversion_rate, total_calls, total_visits, pending_followups, upcoming_visits), `pipeline` (stage, count), `upcoming_followups`, `upcoming_visits`, and for GM/Manager only: `recent_deals`, `leaderboard`.

```bash
curl -s "http://localhost:3000/api/v1/dashboard" -H "Authorization: Bearer TOKEN"
```

**Endpoint:** `GET /api/v1/dashboard/leaderboard`  
**Auth:** GM or Manager only.  
**Response (200):** `leaderboard` array: user_id, name, role (presales), total_leads, deals, total_calls (top 10 by deals).

```bash
curl -s "http://localhost:3000/api/v1/dashboard/leaderboard" -H "Authorization: Bearer GM_OR_MANAGER_TOKEN"
```

---

## 👥 Users list & detail

**Endpoint:** `GET /api/v1/users`  
**Auth:** GM or Manager only.  
**Query:** `page`, `limit` (default 20, max 100), `role` (presales|sales|manager|gm), `status`, `team_id`, `search` (name/email/phone).  
**Response (200):** `users` array (id, name, email, phone, role, employee_id, team_id, status, permissions, created_at, last_login_at), `pagination`.

```bash
curl -s "http://localhost:3000/api/v1/users?page=1&limit=20" -H "Authorization: Bearer GM_OR_MANAGER_TOKEN"
```

**Endpoint:** `GET /api/v1/users/:id`  
**Auth:** GM or Manager only.  
**Response (200):** Full user object (same shape as create/update response). 404 if user not found.

```bash
curl -s "http://localhost:3000/api/v1/users/USER_UUID" -H "Authorization: Bearer GM_OR_MANAGER_TOKEN"
```

---

## 📝 API Endpoints

### 1. Import CSV Data

**Endpoint:** `POST /api/v1/imported-data/import`

**Description:** Upload a CSV file to import leads with automatic validation and error reporting.

**Authorization:**
- **GM**: Always allowed
- **Manager**: Requires `import_data` permission

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/imported-data/import \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@leads.csv" \
  -F "title=Q1 2024 Import" \
  -F "description=Real estate expo leads"
```

**CSV Format:**

```csv
name,phone,email,city,budget_min,budget_max,lead_temperature,state
Rajesh Kumar,9876543210,rajesh@example.com,Mumbai,5000000,8000000,hot,Maharashtra
Priya Sharma,+919988776655,priya@example.com,Delhi,3000000,5000000,warm,Delhi
Amit Patel,919123456789,amit@example.com,Ahmedabad,2000000,4000000,warm,Gujarat
```

**Required Columns:**
- `name` - Lead's full name
- `phone` - Phone number (see validation rules below)

**Optional Columns:**
- `email` - Email address (validated if provided)
- `city` - City name
- `state` - State name
- `budget_min` - Minimum budget (numeric)
- `budget_max` - Maximum budget (numeric)
- `lead_temperature` - One of: `veryhot`, `hot`, `warm`, `cold`

**Phone Number Validation:**

| Input Format | Input Example | Output | Action |
|--------------|---------------|--------|--------|
| +XX (10-13 chars) | `+919876543210` | `+919876543210` | Save as is |
| 10-13 digits | `919876543210` | `919876543210` | Save as is |
| 10 digits | `9876543210` | `9876543210` | Save as is |
| < 10 digits | `12345` | SKIP | Error: less than 10 |
| > 13 chars | `+91987654321012` | SKIP | Error: more than 13 |

**Response (201 Created):**

```json
{
  "success": true,
  "message": "Data imported successfully",
  "data": {
    "imported_data_id": "8484ad75-f80a-4c7f-ab06-8c0418fbe3f6",
    "title": "Q1 2024 Import",
    "total_rows": 7,
    "successful": 6,
    "failed": 1,
    "errors": [
      "Row 5: Invalid phone: less than 10 digits"
    ],
    "leads_created": [
      {
        "lead_id": "ad95afcc-8896-4d1d-bde0-78d1ce649158",
        "name": "Rajesh Kumar",
        "phone": "9876543210"
      }
    ]
  }
}
```

**Error Responses:**

```json
// Lead limit exceeded
{
  "success": false,
  "message": "LEAD_LIMIT_EXCEEDED: 188 leads available, 195 leads in CSV"
}

// Permission denied (Manager without import_data permission)
{
  "success": false,
  "message": "Permission denied",
  "data": {
    "error": "import_data permission required"
  }
}

// Invalid file type
{
  "success": false,
  "message": "Invalid file type",
  "data": {
    "file": "Only CSV files are allowed"
  }
}
```

---

### 2. Assign Users to Imported Leads

**Endpoint:** `POST /api/v1/imported-data/{id}/assign-users`

**Description:** Assign multiple presales users to all leads from a specific import using round-robin distribution.

**Authorization:**
- **GM**: Always allowed
- **Manager**: Always allowed

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/imported-data/8484ad75-f80a-4c7f-ab06-8c0418fbe3f6/assign-users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": [
      "5566716a-ec77-4805-a4d6-ddcacefd4d00",
      "7788aabb-1234-5678-abcd-1234567890ab"
    ]
  }'
```

**Round-Robin Logic:**

- 7 leads + 2 users → User1: 4 leads, User2: 3 leads
- 7 leads + 1 user → User1: 7 leads
- 10 leads + 3 users → User1: 4, User2: 3, User3: 3

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Users assigned successfully",
  "data": {
    "imported_data_id": "8484ad75-f80a-4c7f-ab06-8c0418fbe3f6",
    "assigned_users_count": 2,
    "leads_assigned": 7,
    "assignment_summary": {
      "5566716a-ec77-4805-a4d6-ddcacefd4d00": 4,
      "7788aabb-1234-5678-abcd-1234567890ab": 3
    }
  }
}
```

**Error Responses:**

```json
// No valid presales users
{
  "success": false,
  "message": "No valid presales users found"
}

// Imported data not found
{
  "success": false,
  "message": "Imported data not found"
}

// No leads found
{
  "success": false,
  "message": "No leads found for this import"
}
```

---

### 3. Delete Imported Data

**Endpoint:** `DELETE /api/v1/imported-data/{id}`

**Description:** Soft delete the imported data record and all associated **unqualified** leads.

**Authorization:**
- **GM**: Always allowed
- **Manager**: Always allowed

**Delete Behavior:**
- ✅ Deletes leads with `status = 'unqualified'`
- ❌ Preserves leads with other statuses (`called`, `qualified`, `visit`, `deal`, etc.)
- Both `imported_data` and leads are **soft-deleted** (sets `deleted_at` timestamp)

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/imported-data/8484ad75-f80a-4c7f-ab06-8c0418fbe3f6 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Imported data deleted successfully",
  "data": {
    "imported_data_id": "8484ad75-f80a-4c7f-ab06-8c0418fbe3f6",
    "deleted_leads_count": 7,
    "message": "Imported data and 7 unqualified leads deleted successfully"
  }
}
```

---

## 🔐 Authorization & Permissions

### User Roles

| Role | Import Data | Assign Users | Delete | List/Get Leads | Qualify / Connected | By stage / Forward | Follow-ups | Reject / Rejection Qs | Accept lead | Rejected Leads List | Routing Rules |
|------|-------------|--------------|--------|----------------|--------------------|---------------------|------------|------------------------|-------------|---------------------|---------------|
| **GM** | ✅ Always | ✅ Always | ✅ Always | ✅ All org leads | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ Full CRUD |
| **Manager** | ✅ With `import_data` permission | ✅ Always | ✅ Always | ✅ All org leads (requires `view_leads`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (requires `view_leads`) | ✅ With `manage_routing` |
| **Presales** | ❌ | ❌ | ❌ | ✅ Assigned + handed-off (read-only up to stage 3) | ✅ Own leads | ✅ Get by stage, Forward stage, Get stage details, Add stage remarks (own leads) | ✅ Create, get, complete (own leads) | ✅ Own leads + GET questions | ❌ | ❌ | ❌ |
| **Sales** | ❌ | ❌ | ❌ | ✅ Assigned + pending handoff | ❌ | ✅ Get stage details (own leads), Add stage remarks on **property_visit/booking** only | ✅ Create, get, complete (own leads) | ✅ Own leads + GET questions | ✅ Pending handoff only | ❌ | ❌ |

### Adding `import_data` Permission to Manager

```bash
# Get Manager user ID
MANAGER_ID="user-uuid-here"

# Login as GM
GM_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "gm@example.com", "password": "password"}' \
  | jq -r '.data.token')

# Add permission
curl -X POST http://localhost:3000/api/v1/users/$MANAGER_ID/permissions \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission": "import_data"}'
```

---

## 📊 Database Schema

### `imported_data` Table

```sql
CREATE TABLE imported_data (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    imported_by         UUID NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP WITH TIME ZONE
);
```

### `leads` Table (Updated)

```sql
ALTER TABLE leads ADD COLUMN imported_data_id UUID REFERENCES imported_data(id);
```

### Enums Updated

```sql
-- Lead status enum (default changed)
CREATE TYPE lead_status AS ENUM (
    'unqualified',  -- NEW: Default status for imported leads
    'called',
    'qualified',
    'visit',
    'negotiation',
    'deal',
    'dropped',
    'rejected'
);

-- User permission enum
CREATE TYPE user_permission AS ENUM (
    'view_leads',
    'create_leads',
    'edit_leads',
    'delete_leads',
    'view_deals',
    'create_deals',
    'edit_deals',
    'view_reports',
    'view_analytics',
    'manage_quotations',
    'manage_visits',
    'manage_negotiations',
    'close_deals',
    'manage_employees',
    'manage_routing',
    'manage_organizations',
    'view_all_data',
    'create_teams',
    'import_data'  -- NEW
);
```

---

## 🧪 Testing

### Complete Test Script

```bash
#!/bin/bash

# 1. Login as GM
GM_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "gm@example.com", "password": "password"}' \
  | jq -r '.data.token')

# 2. Create test CSV
cat > test_leads.csv << 'EOF'
name,phone,email,city,budget_min,budget_max,lead_temperature,state
Rohan Mehta,9876543210,rohan@example.com,Mumbai,5000000,8000000,hot,Maharashtra
Kavita Singh,+919988776655,kavita@example.com,Delhi,3000000,5000000,warm,Delhi
Arjun Verma,919123456789,arjun@example.com,Ahmedabad,2000000,4000000,warm,Gujarat
EOF

# 3. Import CSV
IMPORT_RESULT=$(curl -s -X POST http://localhost:3000/api/v1/imported-data/import \
  -H "Authorization: Bearer $GM_TOKEN" \
  -F "file=@test_leads.csv" \
  -F "title=Test Import" \
  -F "description=Test description")

IMPORTED_DATA_ID=$(echo $IMPORT_RESULT | jq -r '.data.imported_data_id')
echo "Import Result:"
echo $IMPORT_RESULT | jq '.'

# 4. Get presales user ID
PRESALES_USER_ID="presales-user-uuid"

# 5. Assign users
curl -s -X POST "http://localhost:3000/api/v1/imported-data/$IMPORTED_DATA_ID/assign-users" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_ids\": [\"$PRESALES_USER_ID\"]}" | jq '.'

# 6. Delete imported data
curl -s -X DELETE "http://localhost:3000/api/v1/imported-data/$IMPORTED_DATA_ID" \
  -H "Authorization: Bearer $GM_TOKEN" | jq '.'
```

---

## ⚠️ Important Notes

### Lead Limit Check

Before importing, the system checks:

```
current_active_leads + csv_rows <= subscription.lead_limit
```

- Only active (non-deleted) leads are counted
- If limit exceeded, import is rejected with detailed error
- Example: Trial plan has 200 lead limit

### Phone Number Processing

- Normalizes to 10-digit Indian format
- Removes country codes (+91, 91)
- Skips invalid numbers (< 10 digits)
- Reports errors with row numbers

### Error Reporting

All import errors include:
- Row number
- Specific error message
- Continues processing other rows

### Soft Deletion

- `deleted_at` timestamp used instead of hard delete
- Allows data recovery if needed
- Maintains referential integrity

---

## 🛠️ Architecture

### Project Structure

```
core-api/
├── models/
│   ├── imported_data.go    # Request/Response structs
│   ├── lead.go             # LeadResponse, LeadsListResponse
│   ├── lead_sourcing.go    # DTOs for org APIs, sourcing configs, project mappings, sync logs
│   ├── routing.go          # Routing rule request/response
│   └── user.go             # User and import_data permission
├── services/
│   ├── imported_data.go    # Import, assign users; calls lead routing on create
│   ├── lead.go             # ListLeads, GetLeadByID (role-based visibility, filters)
│   ├── lead_routing.go     # RouteLead, AssignLeadToUser (auto-assign on import)
│   ├── lead_sourcing_service.go  # CRUD for org APIs, configs, mappings, sync logs
│   ├── lead_sourcing/
│   │   ├── models.go       # Internal DTOs (OrgAPICredentials, SourcingConfig, RawLead, NormalizedLead)
│   │   ├── provider.go     # Provider interface + registry
│   │   ├── housing.go      # Housing.com adapter (HMAC-SHA256, fetch, parse)
│   │   ├── mapper.go       # Field mapper using mapping_config_json + project resolution
│   │   └── engine.go       # Background sync scheduler (fetch → map → dedup → insert → route)
│   └── routing_rules.go    # CRUD for lead routing rules
├── handlers/
│   ├── imported_data.go    # HTTP handlers for import/assign/delete
│   ├── lead.go             # ListLeads, GetLead
│   ├── lead_sourcing.go    # Handlers for org APIs, sourcing configs, project mappings, sync logs
│   └── routing.go          # Routing rules CRUD
├── routes/
│   ├── imported_data.go    # Import and imported-data routes
│   ├── lead.go             # GET /leads, GET /leads/by-stage/:stage, etc.
│   ├── lead_sourcing.go    # /organization-apis, /lead-sourcing-configs, /external-project-mappings, /lead-sync-logs
│   └── routing.go          # /routing-rules CRUD
└── main.go                 # Service initialization, route setup, lead sourcing engine start/shutdown
```

### Dependencies

- **Go Fiber**: Web framework
- **pgx/v5**: PostgreSQL driver
- **encoding/csv**: CSV parsing
- **JWT**: Authentication
- **Redis**: Caching
- **crypto/hmac, crypto/sha256**: Provider API authentication (e.g. Housing.com)
- **minio-go/v7**: Backblaze B2 presigned URLs (S3-compatible)

---

## 🧪 Testing Lead Routing APIs with cURL

Use a variable for the base URL and get a token (GM or Manager with `manage_routing`):

```bash
BASE="http://localhost:3000"   # or 3001 if 3000 is in use
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jadish@bhoomiplots.com","password":"Test@123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
```

**List routing rules**
```bash
curl -s -X GET "$BASE/api/v1/routing-rules" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
```

**Create routing rule** (presales – default for import)
```bash
curl -s -X POST "$BASE/api/v1/routing-rules" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "rule_name": "Website leads",
    "priority": 1,
    "target_role": "presales",
    "affected_lead_sources": ["website"],
    "affected_areas": [],
    "affected_lead_statuses": [],
    "affected_user_ids": [],
    "affected_team_ids": [],
    "flow_type_order": "round-robin"
  }'
```

**Create sales routing rule** (for handoff on first property visit; use sales user UUIDs in affected_user_ids)
```bash
curl -s -X POST "$BASE/api/v1/routing-rules" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "rule_name": "Sales by project area",
    "priority": 1,
    "target_role": "sales",
    "affected_lead_sources": [],
    "affected_areas": ["Mumbai"],
    "affected_lead_statuses": [],
    "affected_user_ids": ["SALES_USER_UUID_1", "SALES_USER_UUID_2"],
    "affected_team_ids": [],
    "flow_type_order": "least-busy-first"
  }'
```

**Get one rule** (replace `:id` with rule UUID)
```bash
curl -s -X GET "$BASE/api/v1/routing-rules/:id" -H "Authorization: Bearer $TOKEN"
```

**Update rule**
```bash
curl -s -X PUT "$BASE/api/v1/routing-rules/:id" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"rule_name": "Updated name", "flow_type_order": "least-busy-first"}'
```

**Update rule status**
```bash
curl -s -X PATCH "$BASE/api/v1/routing-rules/:id/status" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"rule_status":"inactive"}'
```

**Delete rule**
```bash
curl -s -X DELETE "$BASE/api/v1/routing-rules/:id" -H "Authorization: Bearer $TOKEN"
```

**Test auto-routing via import** (leads are auto-assigned when created; ensure org has active subscription)
```bash
printf "name,phone,city\nLead A,9876543210,Mumbai\nLead B,9876543211,Nashik\n" > /tmp/leads.csv
curl -s -X POST "$BASE/api/v1/imported-data/import" \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Test import" -F "file=@/tmp/leads.csv"
```

### E2E: Ensure org has active subscription (DB)

If import returns "No active subscription found", set the org's subscription to active and a future end date:

```bash
docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db -c "
UPDATE subscriptions
SET status = 'active',
    end_date = CURRENT_DATE + INTERVAL '30 days',
    start_date = CURRENT_DATE - INTERVAL '1 day'
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Bhoomi Plots & Lands' LIMIT 1);
"
```

### E2E: Full flow (import + auto-routing)

1. **Login** as GM (e.g. jadish@bhoomiplots.com / Test@123456).
2. **Import CSV** (see "Test auto-routing via import" above). Response should show `successful: N` and `leads_created` with lead IDs.
3. **Verify in DB** that new leads have `assigned_to_user_id` and `assigned_to_user_type = 'presales'`:

```bash
docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db -c "
SELECT name, phone, source, assigned_to_user_id, assigned_to_user_type
FROM leads
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Bhoomi Plots & Lands' LIMIT 1)
  AND created_at > NOW() - INTERVAL '1 hour'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
"
```

With **no routing rules**, leads are distributed equally among all Presales (least-busy). With **one Presales**, all leads assign to that user. With **routing rules** that match the lead (source/area/budget/status), the first matching rule chooses the caller.

---

## 8. WhatsApp Chat APIs (Communication - Phase 2)

Full two-way WhatsApp chat via Meta Cloud API, tied to lead stages with per-stage conversation isolation.

### Architecture

- **Meta Cloud API** (v21.0) for sending/receiving messages
- **Per-stage conversations**: Each lead stage gets its own conversation. When a lead is forwarded to a new stage, active conversations are auto-closed (read-only). New stage = new conversation on first message.
- **24-hour window**: Non-template messages only within 24h of lead's last inbound message. Templates bypass this.
- **Media**: Separate B2 bucket (`crownco-wa-media`). Outbound: upload via presigned URL → send object key. Inbound: download from Meta → upload to B2.
- **Real-time**: SSE (Server-Sent Events) for live message push to connected clients.
- **Webhook**: Idempotent processing, HMAC-SHA256 signature verification, async message handling. Inbound messages are matched to leads by phone, associated with the current active stage, and persisted; outbound send and stage-wise listing are covered by E2E and webhook flow tests.

### Env Variables

| Variable | Default | Description |
|---|---|---|
| `WA_APP_SECRET` | (empty) | Meta App Secret for webhook signature verification |
| `WA_VERIFY_TOKEN` | `crownco_wa_verify` | Token for webhook URL verification |
| `WA_MEDIA_BUCKET_NAME` | `crownco-wa-media` | B2 bucket for WhatsApp media |
| `WA_GRAPH_API_VERSION` | `v21.0` | Meta Graph API version |

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/whatsapp/accounts` | Manager/GM | Register WA account |
| GET | `/api/v1/whatsapp/accounts` | Any | List WA accounts |
| PUT | `/api/v1/whatsapp/accounts/:id` | Manager/GM | Update WA account |
| DELETE | `/api/v1/whatsapp/accounts/:id` | Manager/GM | Delete WA account |
| GET | `/api/v1/whatsapp/templates` | Any | List approved templates |
| POST | `/api/v1/leads/:id/whatsapp/send` | Presales/Sales | Send message |
| GET | `/api/v1/leads/:id/whatsapp/conversations` | Any | List conversations |
| GET | `/api/v1/leads/:id/whatsapp/conversations/:conv_id/messages` | Any | Get messages |
| POST | `/api/v1/leads/:id/whatsapp/media/upload-url` | Presales/Sales | Get media upload URL |
| GET | `/api/v1/leads/:id/whatsapp/live` | Any | SSE live stream |
| GET | `/api/v1/webhook/whatsapp` | None | Webhook verification |
| POST | `/api/v1/webhook/whatsapp` | None (signature) | Receive messages |

### Send Message Body

```json
{
  "lead_stage_id": "uuid (required, must be active)",
  "message_type": "text | template | image | document | audio | video",
  "message_text": "Hello! (required for text)",
  "template_name": "welcome_msg (required for template)",
  "template_language": "en_US",
  "template_components": [],
  "attachment_url": "B2 object key or public URL (for media)",
  "attachment_filename": "document.pdf (for documents)"
}
```

### Stage Forward Auto-Close

When `ForwardLeadToStage()` is called, all active WhatsApp conversations for that lead are automatically closed:
```sql
UPDATE whatsapp_conversations SET status = 'closed', conversation_closed_at = NOW()
WHERE lead_id = ? AND organization_id = ? AND status = 'active'
```

### DB Schema Additions

- `whatsapp_messages`: Added `sender_user_id`, `sender_user_type`, `attachment_filename`, `attachment_size`, `template_name`, `template_language`
- `whatsapp_conversations`: Added `last_inbound_at`
- `message_type` enum: Added `'template'`
- `whatsapp_accounts`: Added `app_secret`

### Testing webhook and messaging flow

Use `scripts/test_whatsapp_webhook_flow.sh` to verify end-to-end:

- **Webhook receive**: Simulated Meta POST to `/api/v1/webhook/whatsapp` with inbound text; expects 200.
- **Save**: After webhook, confirms inbound message is stored (DB count for lead + direction=inbound).
- **Send**: `POST /api/v1/leads/:id/whatsapp/send` returns 201 and outbound message is stored.
- **Stage-wise get**: `GET .../whatsapp/conversations` returns conversations with correct `lead_stage_id`; `GET .../conversations/:conv_id/messages` returns messages for that conversation only.

```bash
BASE_URL=http://localhost:3001 ./scripts/test_whatsapp_webhook_flow.sh
```

Use `SKIP_DB=1` to skip DB checks when Docker/Postgres is not available.

### Edge case tests (60 tests)

Use `scripts/test_whatsapp_edge_cases.sh` for comprehensive edge-case coverage across all WhatsApp message APIs and flows:

**A. Send message edge cases (13 tests):**
- No auth → 401; Manager send → 403
- Missing `lead_stage_id`, `message_type`, `message_text` (text type), `template_name` (template type) → 400
- Invalid/fake `lead_stage_id` UUID → 400; non-existent lead → 400; empty body → 400
- Valid send (Meta API fails with test token but message still stored) → 201 with direction=outbound
- Same stage reuses existing conversation

**B. Webhook edge cases (10 tests):**
- Invalid JSON → 400; empty `entry[]` → 200
- Unknown `phone_number_id` → 200, message silently skipped (not saved)
- Unknown sender phone (no matching lead) → 200, not saved
- Valid inbound → 200 + saved in DB
- Duplicate webhook (same `wamid`) → idempotent, not inserted twice
- Non-message field (e.g. `account_update`) → 200, ignored
- Unsupported message type (`location`) → stored as text `[Unsupported message type: location]`

**C. Get conversations/messages edge cases (11 tests):**
- No auth → 401; valid → 200 with correct `lead_stage_id` and status
- Messages return both inbound + outbound directions
- Non-existent conversation → 200, 0 messages
- Non-existent lead → 200, empty list
- Pagination past total (page=999) → empty

**D. Stage forward flow (11 tests):**
- Forward stage → old conversations auto-closed
- Send to closed stage → 400 (`STAGE_NOT_ACTIVE`)
- Send to new stage → 201 with new conversation (different ID)
- Conversations list shows both old (closed) + new (active)
- Old closed conversation messages still readable (not deleted)
- Inbound webhook after forward → goes to new stage conversation

**E. Media upload URL edge cases (3 tests):**
- No auth → 401; Manager → 403; empty `file_extension` → 400

**F. Webhook verify edge cases (4 tests):**
- Correct token → 200 + challenge echoed; wrong token → 403; missing `hub.mode` → 403

```bash
BASE_URL=http://localhost:3001 ./scripts/test_whatsapp_edge_cases.sh
```

**Prerequisites:** API running, Docker with `crownco-postgres`, E2E users + lead with active stage.

---

## 🔌 Lead Sourcing Integration (External Provider Sync)

Automatically fetch leads from external providers (Housing.com, 99acres, NoBroker, MagicBricks, etc.) with per-organization credentials, configurable field mapping, external→internal project resolution, and deduplication.

### Architecture

```
Organization adds API creds (POST /organization-apis)
       │
       ▼
Create sourcing config with field mapping (POST /lead-sourcing-configs)
       │
       ▼
Map external project IDs to internal projects (POST /external-project-mappings)
       │
       ▼
Background scheduler polls provider API on interval
       │
       ▼
┌──────────────────────────────────────────────┐
│  Provider Adapter  (e.g. HousingProvider)    │
│  → Fetch raw leads from API                  │
│  → Return []RawLead (generic map)            │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  Field Mapper (mapping_config_json)          │
│  → Transform RawLead → NormalizedLead        │
│  → Resolve external_project_id → project_id  │
│  → Normalize phone numbers                   │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│  Insert with dedup                           │
│  → ON CONFLICT (org, source, external_id)    │
│  → DO NOTHING (skip duplicates)              │
│  → Route new leads to presales               │
│  → Write sync log entry                      │
└──────────────────────────────────────────────┘
```

### Provider Adapter Pattern

Each external provider implements the `Provider` interface:

```go
type Provider interface {
    Name() string
    FetchLeads(ctx context.Context, creds OrgAPICredentials, config SourcingConfig) ([]RawLead, error)
}
```

Currently implemented: **Housing.com** (HMAC-SHA256 auth, daily range fetch).
New providers only need to implement this interface and register in the provider registry.

### Endpoints

#### Organization API Credentials

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/organization-apis` | Store provider API credentials (api_key is encrypted at rest) |
| GET | `/api/v1/organization-apis` | List credentials for current org |
| GET | `/api/v1/organization-apis/:id` | Get one credential |
| PUT | `/api/v1/organization-apis/:id` | Update credential or status |
| DELETE | `/api/v1/organization-apis/:id` | Delete credential (cascades to configs and logs) |

#### Lead Sourcing Configs (Field Mapping + Sync)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/lead-sourcing-configs` | Create config with field mapping |
| GET | `/api/v1/lead-sourcing-configs` | List configs for current org |
| GET | `/api/v1/lead-sourcing-configs/:id` | Get one config |
| PUT | `/api/v1/lead-sourcing-configs/:id` | Update config (interval, mapping) |
| DELETE | `/api/v1/lead-sourcing-configs/:id` | Delete config |
| POST | `/api/v1/lead-sourcing-configs/:id/sync-now` | Trigger immediate sync |

#### External Project Mappings

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/external-project-mappings` | Map external project ID → internal project UUID |
| GET | `/api/v1/external-project-mappings` | List mappings (optional `?provider=housing`) |
| PUT | `/api/v1/external-project-mappings/:id` | Update mapping |
| DELETE | `/api/v1/external-project-mappings/:id` | Delete mapping |

#### Sync Logs (Observability)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/lead-sync-logs` | List sync runs (optional `?config_id=uuid`) |

### Mapping Config JSON Example

```json
{
  "response_leads_path": "data",
  "field_map": {
    "name": "lead_name",
    "phone": "lead_phone",
    "email": "lead_email",
    "city": "lead_city",
    "budget_min": "budget",
    "source_detail": "project_name",
    "external_project_id": "project_id",
    "external_lead_id": "lead_date"
  },
  "provider_config": {
    "profile_id": "24039743"
  }
}
```

- `response_leads_path`: Dot-path to the leads array in the provider response
- `field_map`: Maps internal field names (left) to provider field names (right)
- `provider_config`: Provider-specific settings passed to the adapter

### Deduplication

Leads are deduplicated at the database level using a unique partial index:

```sql
CREATE UNIQUE INDEX idx_leads_external_dedup
ON leads(organization_id, source, external_lead_id)
WHERE external_lead_id IS NOT NULL AND deleted_at IS NULL;
```

The insert uses `ON CONFLICT DO NOTHING` — if a lead with the same org + source + external_lead_id already exists, it is silently skipped.

### Example: Full Setup

```bash
# 1. Add Housing.com credentials
curl -X POST "$BASE/api/v1/organization-apis" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "provider": "housing",
    "api_category": "lead_sourcing",
    "auth_type": "api_key",
    "api_key": "YOUR_HOUSING_ENCRYPTION_KEY",
    "username": "YOUR_PROFILE_ID"
  }'

# 2. Create external project mapping
curl -X POST "$BASE/api/v1/external-project-mappings" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "provider": "housing",
    "external_project_id": "288969",
    "external_project_name": "Pawa Blossom",
    "internal_project_id": "INTERNAL_PROJECT_UUID"
  }'

# 3. Create sourcing config with field mapping
curl -X POST "$BASE/api/v1/lead-sourcing-configs" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "org_api_id": "ORG_API_UUID",
    "sync_mode": "scheduled",
    "sync_interval_min": 60,
    "lead_source_tag": "housing",
    "mapping_config": {
      "response_leads_path": "data",
      "field_map": {
        "name": "lead_name",
        "phone": "lead_phone",
        "email": "lead_email",
        "external_project_id": "project_id",
        "external_lead_id": "lead_date"
      },
      "provider_config": {
        "profile_id": "24039743"
      }
    }
  }'

# 4. Trigger immediate sync
curl -X POST "$BASE/api/v1/lead-sourcing-configs/CONFIG_UUID/sync-now" \
  -H "Authorization: Bearer $TOKEN"

# 5. Check sync logs
curl "$BASE/api/v1/lead-sync-logs?config_id=CONFIG_UUID" \
  -H "Authorization: Bearer $TOKEN"
```

### Database Changes

- `leads.external_lead_id` — VARCHAR(255), stores provider-specific lead identifier
- `external_project_mappings` — Maps (org, provider, external_project_id) → internal project UUID
- `lead_sync_logs` — Tracks each sync run with counts and error messages
- `api_provider` enum expanded: `housing`, `nobroker`, `magicbricks`
- `lead_source_tag` enum expanded: `housing`, `nobroker`, `magicbricks`, `google_ads`

---

## 📚 Additional Resources

- **OpenAPI Docs**: `docs/open-api.yml` (includes Leads, Assigned leads, Lead summary, Get by stage, Forward stage, Accept lead, Get stage by type, Get stage details, Add stage remarks, Follow-up create/get/complete/delete, Lead qualify/connected/reject, Rejection questions, Rejected leads list, Routing Rules, Booking stage, Call APIs with presigned upload URLs, WhatsApp Chat APIs, and Lead Sourcing Integration APIs)
- **Postman Collection**: `docs/core-api.json`
- **Database Schema**: `../../Database/`
- **E2E tests**: Ensure API is running (e.g. `PORT=3001 ./core-api`). Run with `BASE_URL=http://localhost:3001 TEST_PASSWORD=Test@123456` (or your API URL/password).
  - `scripts/test_lead_stage_e2e.sh` – Get by stage, forward stage, **stage remarks** (Presales any stage; Sales on non-PV → 403/404; Sales on property_visit → 200 when lead in PV).
  - `scripts/test_followup_e2e.sh` – Follow-up create, get, complete, delete + edge cases.
  - `scripts/test_negotiation_e2e.sh` – Negotiation + quotation flow (create, price-breakdown, submit, approve, duplicate 400, presales 403).
  - `scripts/test_booking_e2e.sh` – Booking stage (Stage 5): GET/PATCH booking, add/list/get/update/delete documents, submit (token received + lead status = deal), GM confirm, presales 403.
  - `scripts/test_call_e2e.sh` – Call APIs (Phase 1): initiate, list, get, update metadata/outcome, upload-url, auth/role checks.
  - `scripts/test_whatsapp_e2e.sh` – WhatsApp Chat APIs: account CRUD, webhook verify, inbound message, send text, conversations, messages, media upload-url, templates, edge cases.
  - `scripts/test_whatsapp_webhook_flow.sh` – Webhook + save + send + stage-wise get: verifies inbound messages received and saved, outbound send and persistence, and conversations/messages returned per stage.
  - `scripts/test_whatsapp_edge_cases.sh` – WhatsApp edge cases (60 tests): send validation (auth, missing fields, invalid stage, non-existent lead), webhook (invalid JSON, unknown phone, duplicate idempotency, unsupported types), conversations/messages (auth, pagination, empty results), stage forward flow (auto-close, send to closed stage, new conv after forward, inbound routing), media upload (auth, validation), webhook verify (token, mode).
  - `scripts/test_visit_e2e.sh` – Property visit create, get, update, complete, reschedule.
  - `scripts/test_assigned_and_summary_e2e.sh` – GET /leads/assigned and GET /leads/:id/summary (sales only).
  - `scripts/test_sales_handoff_e2e.sh` – Sales handoff, accept, presales read-only after handoff.
  - `scripts/test_lead_qualify_connected_reject.sh` – Qualify, connected, rejection-questions, reject.
  - `scripts/test_lead_stats_e2e.sh` – Lead stats (aggregate and per lead).
  - `scripts/test_new_endpoints_e2e.sh` – Dashboard, leaderboard, users list/detail, qualify with body, PUT lead update.
  - `test_leads_api.sh` – Get Leads (basic).

---

## 🚦 Quick Start

```bash
# 1. Start database
docker-compose up -d

# 2. Build API
go build -o core-api

# 3. Run API
./core-api

# 4. Test health check
curl http://localhost:3000/health
# Or if using PORT=3001: curl http://localhost:3001/health
```

---

## 📞 Support

For issues or questions, contact the development team or refer to the API documentation at `/docs`.
