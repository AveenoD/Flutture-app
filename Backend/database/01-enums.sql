-- ============================================
-- ENUMS for Crownco Database
-- Extracted from newERD.txt
-- PostgreSQL Enum Types
-- ============================================

-- ============================================
-- API & Provider Related Enums
-- ============================================

-- API Provider types
CREATE TYPE api_provider AS ENUM (
    'meta',
    'google',
    '99acres',
    'housing',
    'nobroker',
    'magicbricks',
    'whatsapp',
    'ivr'
);

-- API Category types
CREATE TYPE api_category AS ENUM (
    'lead_sourcing',
    'communication'
);

-- Authentication types
CREATE TYPE auth_type AS ENUM (
    'api_key',
    'oauth',
    'basic_auth'
);

-- API Status
CREATE TYPE api_status AS ENUM (
    'active',
    'disabled',
    'error'
);

-- Sync Mode
CREATE TYPE sync_mode AS ENUM (
    'realtime',
    'scheduled'
);

-- Lead Source Tag
CREATE TYPE lead_source_tag AS ENUM (
    '99acres',
    'meta_ads',
    'housing',
    'nobroker',
    'magicbricks',
    'google_ads'
);

-- ============================================
-- User Type Enums
-- ============================================

-- User Type (used across multiple tables)
CREATE TYPE user_type AS ENUM (
    'presales',
    'sales',
    'postsales',
    'general_manager',
    'subadmin',
    'superadmin'
);

-- Gender
CREATE TYPE gender AS ENUM (
    'male',
    'female',
    'other'
);

-- User Status
CREATE TYPE user_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'on_leave'
);

-- User Permissions (for array usage)
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
    'import_data',
    'manage_projects'
);

-- ============================================
-- Communication & Call Related Enums
-- ============================================

-- Call Status
CREATE TYPE call_status AS ENUM (
    'initiated',
    'ringing',
    'answered',
    'missed',
    'failed',
    'rejected'
);

-- Call Outcome
CREATE TYPE call_outcome AS ENUM (
    'interested',
    'not_interested',
    'follow_up',
    'wrong_number'
);

-- WhatsApp Conversation Status
CREATE TYPE whatsapp_conversation_status AS ENUM (
    'active',
    'closed'
);

-- WhatsApp Message Direction
CREATE TYPE message_direction AS ENUM (
    'inbound',
    'outbound'
);

-- WhatsApp Message Type
CREATE TYPE message_type AS ENUM (
    'text',
    'image',
    'document',
    'audio',
    'video'
);

-- Message Delivery Status
CREATE TYPE delivery_status AS ENUM (
    'sent',
    'delivered',
    'read',
    'failed'
);

-- ============================================
-- Lead & Follow-up Related Enums
-- ============================================

-- Follow-up Type
CREATE TYPE followup_type AS ENUM (
    'call',
    'whatsapp',
    'visit',
    'meeting',
    'document'
);

-- Follow-up Status
CREATE TYPE followup_status AS ENUM (
    'pending',
    'completed',
    'skipped',
    'overdue'
);

-- Follow-up Outcome
CREATE TYPE followup_outcome AS ENUM (
    'interested',
    'not_interested',
    'follow_up',
    'no_response'
);

-- Lead Source
CREATE TYPE lead_source AS ENUM (
    'website',
    'walking',
    'assigned',
    'magicbricks',
    '99acres',
    'housing',
    'nobroker',
    'google',
    'meta',
    'referral',
    'other',
    'imported'
);

-- Lead Temperature
CREATE TYPE lead_temperature AS ENUM (
    'veryhot',
    'hot',
    'warm',
    'cold'
);

-- Lead Status
CREATE TYPE lead_status AS ENUM (
    'unqualified',
    'called',
    'qualified',
    'visit',
    'negotiation',
    'deal',
    'dropped',
    'rejected'
);

-- Lead Stage
CREATE TYPE lead_stage AS ENUM (
    'qualification',
    'communication',
    'site_visit',
    'negotiation',
    'booking'
);

-- Lead Stage Type
CREATE TYPE lead_stage_type AS ENUM (
    'qualification',
    'communication',
    'property_visit',
    'negotiation',
    'booking',
    'deal_closed',
    'dropped'
);

-- Lead Priority
CREATE TYPE lead_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

-- Stage Status
CREATE TYPE stage_status AS ENUM (
    'active',
    'completed'
);

-- ============================================
-- Property Visit Related Enums
-- ============================================

-- Visit Type
CREATE TYPE visit_type AS ENUM (
    'first_visit',
    'revisit'
);

-- Visit Status
CREATE TYPE visit_status AS ENUM (
    'scheduled',
    'completed',
    'delayed_by_client',
    'missed_by_sales_person'
);

-- Delay Reason
CREATE TYPE delay_reason AS ENUM (
    'client_unavailable',
    'traffic',
    'weather',
    'sales_unavailable',
    'other'
);

-- Visit Outcome
CREATE TYPE visit_outcome AS ENUM (
    'interested',
    'not_interested',
    'follow_up',
    'negotiation_started'
);

-- ============================================
-- Booking & Payment Related Enums
-- ============================================

-- Payment Mode
CREATE TYPE payment_mode AS ENUM (
    'upi',
    'cheque',
    'net_banking',
    'dd',
    'cash',
    'other'
);

-- Booking Status
CREATE TYPE booking_status AS ENUM (
    'initiated',
    'token_received',
    'confirmed',
    'cancelled'
);

-- Document Type
CREATE TYPE document_type AS ENUM (
    'pancard',
    'aadharcard',
    'booking_agreement',
    'passport_photo',
    'electricity_bill',
    'voter_id',
    'driving_license',
    'bank_passbook'
);

-- ============================================
-- Project & Unit Related Enums
-- ============================================

-- Project Type
CREATE TYPE project_type AS ENUM (
    'commercial',
    'residential',
    'educational',
    'government',
    'mixed'
);

-- Area Type
CREATE TYPE area_type AS ENUM (
    'rural',
    'urban'
);

-- Project Status
CREATE TYPE project_status AS ENUM (
    'planning_stage',
    'under_construction',
    'ready_to_move'
);

-- Project State
CREATE TYPE project_state AS ENUM (
    'new',
    'old'
);

-- Unit Type
CREATE TYPE unit_type AS ENUM (
    'flat',
    'penthouse',
    'plot',
    'shop',
    'row_house',
    'bungalow',
    'mansion',
    'haveli'
);

-- Facing Direction
CREATE TYPE facing_direction AS ENUM (
    'north',
    'south',
    'east',
    'west',
    'north-east',
    'north-west',
    'south-east',
    'south-west'
);

-- Unit Status
CREATE TYPE unit_status AS ENUM (
    'available',
    'under_negotiation',
    'booked',
    'unavailable',
    'not_for_sale'
);

-- Addon Category
CREATE TYPE addon_category AS ENUM (
    'kitchen',
    'flooring',
    'window',
    'door',
    'ceiling',
    'sanitary',
    'furniture',
    'electrical',
    'parking',
    'stairs',
    'painting'
);

-- Addon Status
CREATE TYPE addon_status AS ENUM (
    'active',
    'discontinued'
);

-- ============================================
-- Quotation Related Enums
-- ============================================

-- Quotation Status
CREATE TYPE quotation_status AS ENUM (
    'draft',
    'shared',
    'revised',
    'approved',
    'rejected',
    'expired'
);

-- Shared Via
CREATE TYPE shared_via AS ENUM (
    'whatsapp',
    'email',
    'pdf_download'
);

-- Negotiation Status
CREATE TYPE negotiation_status AS ENUM (
    'draft',
    'submitted_for_approval',
    'approved',
    'rejected'
);

-- ============================================
-- Organization Related Enums
-- ============================================

-- Organization Type
CREATE TYPE organization_type AS ENUM (
    'builder',
    'broker',
    'agency'
);

-- Company Size
CREATE TYPE company_size AS ENUM (
    'small',
    'medium',
    'large',
    'enterprise'
);

-- Organization Status
CREATE TYPE organization_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'trial'
);

-- ============================================
-- Subscription Related Enums
-- ============================================

-- Subscription Status
CREATE TYPE subscription_status AS ENUM (
    'active',
    'expired',
    'cancelled',
    'trial',
    'pending'
);

-- Billing Cycle
CREATE TYPE billing_cycle AS ENUM (
    'monthly',
    'quarterly',
    'yearly'
);

-- ============================================
-- Team Related Enums
-- ============================================

-- Team Type
CREATE TYPE team_type AS ENUM (
    'presales',
    'sales',
    'postsales',
    'mixed'
);

-- Team Label
CREATE TYPE team_label AS ENUM (
    'inbound',
    'outbound',
    'luxury',
    'budget',
    'commercial',
    'residential'
);

-- Team Status
CREATE TYPE team_status AS ENUM (
    'active',
    'inactive',
    'blocked'
);

-- ============================================
-- Routing Related Enums
-- ============================================

-- Routing Lead Source
CREATE TYPE routing_lead_source AS ENUM (
    '99acres',
    'housing',
    'meta_ads',
    'google_ads',
    'referral',
    'website',
    'imported'
);

-- Language
CREATE TYPE language AS ENUM (
    'en',
    'hi',
    'mr',
    'ta',
    'te',
    'mixed'
);

-- Routing Lead Status
CREATE TYPE routing_lead_status AS ENUM (
    'landed',
    'called',
    'hot',
    'warm',
    'cold',
    'qualified'
);

-- Rule Status
CREATE TYPE rule_status AS ENUM (
    'active',
    'inactive'
);

-- Flow Type Order
CREATE TYPE flow_type_order AS ENUM (
    'round-robin',
    'least-busy-first',
    'order-by-call-time',
    'order-by-call-connect-rate',
    'order-by-conversion-rate'
);

-- ============================================
-- Rejection Related Enums
-- ============================================

-- Rejection Question Category
CREATE TYPE rejection_category AS ENUM (
    'budget',
    'area',
    'timeline',
    'spam',
    'project_quality',
    'loan_rejected',
    'plan_dropped',
    'caller_behaviour',
    'mis_management',
    'other'
);

-- Question Status
CREATE TYPE question_status AS ENUM (
    'active',
    'inactive'
);

-- ============================================
-- End of Enums
-- ============================================
