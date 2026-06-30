# Crownco Database Schema

This directory contains the PostgreSQL database schema for the Crownco CRM system. The schema is organized into multiple SQL files that should be executed in a specific order due to dependencies.

## 📁 File Structure & Execution Order

Execute the SQL files in the following order:

1. **01-enums.sql** - All PostgreSQL enum types (must be created first)
2. **02-organizations.sql** - Organizations table (core entity)
3. **03-users-and-teams.sql** - Users (presales, sales, managers) and Teams tables
4. **04-subscriptions-and-plans.sql** - Subscription plans and organization subscriptions
5. **05-leads.sql** - Leads table (core entity for lead management)
6. **06-projects.sql** - Projects, Project Units, and Project Addons tables; adds `project_id` to leads (lead–project link)
7. **07-apis.sql** - API configurations (organization APIs, lead sourcing configs, WhatsApp accounts)
8. **08-lead-communication.sql** - Lead calls, WhatsApp conversations, and messages
9. **09-lead-management.sql** - Lead stages, followups, property visits, negotiations, bookings, documents, and quotations
10. **10-lead-routing.sql** - Lead routing rules, rejections, and rejection questions

## 🗄️ Database Overview

The Crownco database is designed for a real estate CRM system that manages:
- **Organizations** (builders, brokers, agencies)
- **Users** (presales, sales, managers) organized in **Teams**
- **Leads** and their complete lifecycle
- **Projects** and **Units** with pricing and addons
- **Communication** tracking (calls, WhatsApp)
- **Lead Management** (stages, followups, visits, negotiations, bookings)
- **Subscriptions** and **Plans**0
- **API Integrations** for lead sourcing and communication

## 🔗 Table Relationships

### Core Hierarchy

```
organizations (root entity)
├── users_presales
├── users_sales
├── users_managers
├── teams
│   └── (references users_managers as manager)
├── subscriptions
│   └── plans
├── organization_apis
│   └── lead_sourcing_api_configs
├── whatsapp_accounts
└── leads (core entity)
    ├── lead_stages
    ├── lead_calls
    ├── whatsapp_conversations
    │   └── whatsapp_messages
    ├── lead_followups
    ├── lead_property_visits
    ├── lead_negotiations
    ├── lead_bookings
    │   └── lead_booking_documents
    ├── lead_quotations
    ├── lead_rejections
    └── (referenced by lead_routing_rules)
```

### Detailed Relationships

#### 1. Organizations & Users
- **organizations** → **users_presales** (1:N, CASCADE DELETE)
- **organizations** → **users_sales** (1:N, CASCADE DELETE)
- **organizations** → **users_managers** (1:N, CASCADE DELETE)
- **organizations** → **teams** (1:N, CASCADE DELETE)
- **teams** → **users_managers** (N:1, manager_user_id, SET NULL)
- **teams** → **users_presales** (1:N, team_id, SET NULL)
- **teams** → **users_sales** (1:N, team_id, SET NULL)
- **teams** → **users_managers** (1:N, team_id, SET NULL)

#### 2. Subscriptions
- **organizations** → **subscriptions** (1:N, CASCADE DELETE)
- **plans** → **subscriptions** (1:N)

#### 3. Leads & Communication
- **organizations** → **leads** (1:N, CASCADE DELETE)
- **projects** → **leads** (1:N, project_id on leads, SET NULL) — lead interested in which project
- **leads** → **lead_stages** (1:N, CASCADE DELETE)
- **leads** → **lead_calls** (1:N, CASCADE DELETE)
- **leads** → **whatsapp_conversations** (1:N, CASCADE DELETE)
- **whatsapp_conversations** → **whatsapp_messages** (1:N, CASCADE DELETE)
- **lead_stages** → **whatsapp_conversations** (1:N, lead_stage_id, SET NULL). Conversations are per-stage; when a lead is forwarded to a new stage, active WhatsApp conversations for that lead are auto-closed (core-api).
- **lead_calls** → **lead_followups** (1:N, lead_call_id, SET NULL)

#### 4. Lead Management
- **leads** → **lead_followups** (1:N, CASCADE DELETE)
- **lead_stages** → **lead_followups** (1:N, lead_stage_id, SET NULL)
- **leads** → **lead_property_visits** (1:N, CASCADE DELETE)
- **leads** → **lead_negotiations** (1:N, CASCADE DELETE)
- **leads** → **lead_bookings** (1:N, CASCADE DELETE)
- **leads** → **lead_quotations** (1:N, CASCADE DELETE)
- **leads** → **lead_rejections** (1:N, CASCADE DELETE)
- **lead_stages** → **lead_negotiations** (1:N, stage_id, SET NULL)
- **lead_stages** → **lead_bookings** (1:N, stage_id, SET NULL)
- **lead_stages** → **lead_rejections** (1:N, stage_id, SET NULL)
- **lead_bookings** → **lead_booking_documents** (1:N, CASCADE DELETE)

#### 5. Projects & Units
- **organizations** → **projects** (1:N, CASCADE DELETE)
- **projects** → **project_units** (1:N, CASCADE DELETE)
- **projects** → **project_addons** (1:N, CASCADE DELETE)
- **projects** → **lead_property_visits** (1:N, project_id, SET NULL)
- **projects** → **lead_negotiations** (1:N, project_id, SET NULL)
- **projects** → **lead_bookings** (1:N, project_id, SET NULL)
- **projects** → **lead_quotations** (1:N, project_id, SET NULL)
- **project_units** → **lead_negotiations** (1:N, unit_id, SET NULL)
- **project_units** → **lead_bookings** (1:N, unit_id, SET NULL)
- **project_units** → **lead_quotations** (1:N, unit_id, SET NULL)

#### 6. API Integrations
- **organizations** → **organization_apis** (1:N, CASCADE DELETE)
- **organizations** → **whatsapp_accounts** (1:N, CASCADE DELETE)
- **organization_apis** → **lead_sourcing_api_configs** (1:N, CASCADE DELETE)

#### 7. Lead Routing & Rejections
- **organizations** → **lead_routing_rules** (1:N, CASCADE DELETE)
- **users_managers** → **lead_routing_rules** (1:N, manager_user_id, SET NULL)
- **rejection_questions** → **lead_rejections** (N:M, via rejection_reason_ids UUID[] array)

## 👥 Polymorphic Relationships

Several tables use **polymorphic references** to users (can reference any user type):

- **lead_calls.caller_user_id** + **caller_user_type** → users_presales/users_sales/users_managers
- **whatsapp_conversations.user_id** + **user_type** → users_presales/users_sales/users_managers
- **lead_followups.user_id** + **user_type** → users_presales/users_sales/users_managers
- **lead_property_visits.created_by_user_id** + **created_by_user_type** → users_presales/users_sales/users_managers
- **lead_negotiations.user_id** + **user_type** → users_presales/users_sales/users_managers
- **lead_bookings.user_id** + **user_type** → users_presales/users_sales/users_managers
- **lead_quotations.user_id** + **user_type** → users_presales/users_sales/users_managers
- **lead_rejections.rejected_by_user_id** + **rejected_by_user_type** → users_presales/users_sales/users_managers
- **leads.assigned_to_user_id** + **assigned_to_user_type** → users_presales/users_sales/users_managers

**Note:** These are implemented using separate `user_id` (UUID) and `user_type` (VARCHAR/enum) columns. Application logic must validate the combination.

## 🗑️ Soft Deletes

The following tables implement soft deletes using `deleted_at`:
- **organizations**
- **users_presales**
- **users_sales**
- **users_managers**

Queries should filter with `WHERE deleted_at IS NULL` to exclude soft-deleted records.

## 📊 Key Concepts

### Lead Lifecycle

1. **Lead Creation** → `leads` table
2. **Lead Stages** → `lead_stages` (qualification → communication → property_visit → negotiation → booking → deal_closed/dropped)
3. **Communication** → `lead_calls`, `whatsapp_conversations`
4. **Followups** → `lead_followups`
5. **Property Visits** → `lead_property_visits`
6. **Negotiations** → `lead_negotiations` (with project/unit selection)
7. **Bookings** → `lead_bookings` (with payment details)
8. **Documents** → `lead_booking_documents`
9. **Quotations** → `lead_quotations` (can be created at any stage)

### Lead Routing

- **lead_routing_rules** define how leads are automatically assigned
- Rules can filter by: source, area, language, budget, status, user/team
- Routing algorithms: round-robin, least-busy-first, order-by-call-time, etc.

### Lead Rejections

- **rejection_questions** table contains pre-defined questions with multiple-choice options
- When a lead is rejected, users select relevant questions and answer options
- Selected questions are stored in **lead_rejections.rejection_reason_ids** (UUID[] array)
- Selected answer options are stored in **lead_rejections.selected_options** (TEXT[] array)
- This enables detailed analytics on rejection patterns and common objections

### Project Structure

- **projects** → High-level project information
- **project_units** → Individual units (flats, villas, shops, etc.)
- **project_addons** → Optional addons (kitchen upgrades, parking, etc.)
- Units and addons are referenced in negotiations, bookings, and quotations

## 🔑 Indexes

All tables include comprehensive indexes for:
- Foreign key columns
- Frequently queried columns (status, type, dates)
- Composite indexes for common query patterns
- Partial indexes for nullable columns (WHERE column IS NOT NULL)
- Soft delete indexes (WHERE deleted_at IS NULL)

## 📝 Enum Types

All enum types are defined in `01-enums.sql` and include:
- User types, statuses, permissions
- Lead sources, temperatures, statuses, stages, priorities
- Communication types (call status, message types, delivery status)
- Project types, unit types, addon categories
- Payment modes, booking statuses, document types
- Visit types, outcomes, delay reasons
- Quotation statuses, routing flow types
- And many more...

## 🚀 Usage

### Quick setup with Docker (recommended)

If you use Docker Compose for Postgres (e.g. `Infra/Compose/docker-compose.yml`, container `crownco-postgres`):

1. **Fresh DB:** To avoid "already exists" errors, start with a clean volume:
   ```bash
   cd Infra/Compose && docker-compose down -v && docker-compose up -d
   ```
2. **Run schema + seed in order** (from repo root):
   ```bash
   ./Backend/database/scripts/setup-db.sh
   ```
   This runs `01-enums.sql` through `10-lead-routing.sql`, then `Scripts/seed.sql`.

### Manual setup (psql)

To set up the database manually:

```bash
# Connect to PostgreSQL
psql -U your_user -d your_database

# Execute files in order
\i 01-enums.sql
\i 02-organizations.sql
\i 03-users-and-teams.sql
\i 04-subscriptions-and-plans.sql
\i 05-leads.sql
\i 06-projects.sql
\i 07-apis.sql
\i 08-lead-communication.sql
\i 09-lead-management.sql
\i 10-lead-routing.sql
```

Or use a migration tool that respects the file order.

### Seed Data

After setting up the schema, you can populate the database with initial seed data:

```bash
# Apply seed data
\i Scripts/seed.sql
```

Or using Docker (path relative to repo root):

```bash
docker exec -i crownco-postgres psql -U crownco-db-user -d crownco-db < Backend/database/Scripts/seed.sql
```

#### Seed Data Contents

The `Scripts/seed.sql` file includes:

1. **Subscription Plans**
   - Trial Plan (15-day free trial)
   - Starter with AI Plan

2. **Sample Organization**
   - Bhoomi Plots & Lands organization
   - Complete user setup (GM, Manager, Presales, Sales)
   - Trial subscription

3. **Rejection Questions** (20 questions across 5 categories)
   - Each question includes 4 multiple-choice options
   - Categories: `budget`, `area`, `timeline`, `project_quality`, `loan_rejected`, `plan_dropped`
   - Used when leads are rejected to track detailed rejection reasons

##### Rejection Questions Structure

The `rejection_questions` table contains pre-defined questions that help track why leads are rejected:

- **Budget Category** (4 questions): Price concerns, financing issues, additional charges, affordability
- **Area/Location Category** (4 questions): Distance from workplace, connectivity, neighborhood suitability, amenities proximity
- **Timeline Category** (4 questions): Possession date, immediate need, project delays, timeline changes
- **Project Quality Category** (4 questions): Property size, layout/design, amenities adequacy, construction quality
- **Loan Rejected Category** (2 questions): Home loan application status, loan amount sufficiency
- **Plan Dropped Category** (2 questions): Purchase decision changes, alternative investments

Each question has:
- `question_text`: The rejection question
- `options`: Array of 4 answer options (TEXT[])
- `category`: Enum value from `rejection_category`
- `status`: `active` or `inactive`

**Usage Example:**
```sql
-- Get all active rejection questions by category
SELECT category, question_text, options
FROM rejection_questions
WHERE status = 'active'
ORDER BY category, created_at;
```

When a lead is rejected, users can select one or more questions and their corresponding answer options, which are stored in the `lead_rejections` table for analytics and reporting.

## 📌 Notes

- All primary keys use `UUID` with `gen_random_uuid()` as default
- All timestamps use `TIMESTAMP WITH TIME ZONE`
- Foreign keys use appropriate `ON DELETE` actions (CASCADE for strong relationships, SET NULL for optional)
- Arrays are used for: tags, project assignments, addon IDs, images, videos, etc.
- JSONB is used for: features, mapping configs, AI bullet points, additional charges, etc.
