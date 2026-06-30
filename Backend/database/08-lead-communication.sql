-- ============================================
-- Lead Communication Tables
-- ============================================
-- Note: lead_stages table must be created before this file
-- (FK constraint will be added after lead_stages is created)

-- ============================================
-- Lead Calls Table
-- ============================================

CREATE TABLE lead_calls (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    lead_stage_id           UUID,  -- FK to lead_stages.id (stage at time of call; constraint added in 09-lead-management.sql)
    caller_user_id          UUID,  -- Polymorphic reference to users (presales/sales/postsales)
    caller_user_type        user_type,
    call_status             call_status NOT NULL DEFAULT 'initiated',
    call_started_at         TIMESTAMP WITH TIME ZONE,
    call_answered_at        TIMESTAMP WITH TIME ZONE,
    call_ended_at           TIMESTAMP WITH TIME ZONE,
    recording_url           TEXT,  -- S3 / GCS / local path
    recording_duration      INTEGER,  -- seconds
    transcription_text      TEXT,  -- full transcript text
    ai_summary              TEXT,  -- short paragraph summary
    ai_bullet_points        JSONB DEFAULT '[]',  -- JSON array of bullets
    call_outcome            call_outcome,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WhatsApp Conversations Table
-- ============================================

CREATE TABLE whatsapp_conversations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id                 UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id                 UUID,  -- Polymorphic reference to users (presales/sales/postsales)
    user_type               user_type,
    lead_stage_id           UUID,  -- FK to lead_stages.id (will be added after lead_stages is created)
    conversation_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    conversation_closed_at  TIMESTAMP WITH TIME ZONE,
    last_message_at         TIMESTAMP WITH TIME ZONE,
    ai_summary              TEXT,
    ai_bullet_points        JSONB DEFAULT '[]',
    status                  whatsapp_conversation_status NOT NULL DEFAULT 'active',
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- WhatsApp Messages Table
-- ============================================

CREATE TABLE whatsapp_messages (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id         UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    whatsapp_message_id     VARCHAR(255),  -- FROM WhatsApp API
    direction               message_direction NOT NULL,
    message_type            message_type NOT NULL,
    message_text            TEXT,
    attachment_url          TEXT,
    attachment_type         VARCHAR(100),
    delivery_status         delivery_status NOT NULL DEFAULT 'sent',
    sent_at                 TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Add Foreign Key Constraint for lead_stage_id
-- (After lead_stages table is created)
-- ============================================

-- ALTER TABLE whatsapp_conversations 
-- ADD CONSTRAINT fk_whatsapp_conversations_lead_stage_id 
-- FOREIGN KEY (lead_stage_id) 
-- REFERENCES lead_stages(id) 
-- ON DELETE SET NULL;

-- ============================================
-- Indexes for Lead Calls
-- ============================================

CREATE INDEX idx_lead_calls_organization_id ON lead_calls(organization_id);
CREATE INDEX idx_lead_calls_lead_id ON lead_calls(lead_id);
CREATE INDEX idx_lead_calls_lead_stage_id ON lead_calls(lead_stage_id) WHERE lead_stage_id IS NOT NULL;
CREATE INDEX idx_lead_calls_caller_user_id ON lead_calls(caller_user_id) WHERE caller_user_id IS NOT NULL;
CREATE INDEX idx_lead_calls_caller_user_type ON lead_calls(caller_user_type) WHERE caller_user_type IS NOT NULL;
CREATE INDEX idx_lead_calls_call_status ON lead_calls(call_status);
CREATE INDEX idx_lead_calls_call_outcome ON lead_calls(call_outcome) WHERE call_outcome IS NOT NULL;
CREATE INDEX idx_lead_calls_call_started_at ON lead_calls(call_started_at) WHERE call_started_at IS NOT NULL;
CREATE INDEX idx_lead_calls_call_ended_at ON lead_calls(call_ended_at) WHERE call_ended_at IS NOT NULL;
CREATE INDEX idx_lead_calls_created_at ON lead_calls(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_lead_calls_lead_status ON lead_calls(lead_id, call_status);
CREATE INDEX idx_lead_calls_org_lead ON lead_calls(organization_id, lead_id);
CREATE INDEX idx_lead_calls_org_status ON lead_calls(organization_id, call_status);

-- ============================================
-- Indexes for WhatsApp Conversations
-- ============================================

CREATE INDEX idx_whatsapp_conversations_organization_id ON whatsapp_conversations(organization_id);
CREATE INDEX idx_whatsapp_conversations_lead_id ON whatsapp_conversations(lead_id);
CREATE INDEX idx_whatsapp_conversations_user_id ON whatsapp_conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_whatsapp_conversations_user_type ON whatsapp_conversations(user_type) WHERE user_type IS NOT NULL;
CREATE INDEX idx_whatsapp_conversations_lead_stage_id ON whatsapp_conversations(lead_stage_id) WHERE lead_stage_id IS NOT NULL;
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_conversations_conversation_started_at ON whatsapp_conversations(conversation_started_at);
CREATE INDEX idx_whatsapp_conversations_last_message_at ON whatsapp_conversations(last_message_at) WHERE last_message_at IS NOT NULL;
CREATE INDEX idx_whatsapp_conversations_created_at ON whatsapp_conversations(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_whatsapp_conversations_lead_status ON whatsapp_conversations(lead_id, status);
CREATE INDEX idx_whatsapp_conversations_org_lead ON whatsapp_conversations(organization_id, lead_id);
CREATE INDEX idx_whatsapp_conversations_org_status ON whatsapp_conversations(organization_id, status);

-- ============================================
-- Indexes for WhatsApp Messages
-- ============================================

CREATE INDEX idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_whatsapp_message_id ON whatsapp_messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_message_type ON whatsapp_messages(message_type);
CREATE INDEX idx_whatsapp_messages_delivery_status ON whatsapp_messages(delivery_status);
CREATE INDEX idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_whatsapp_messages_conv_direction ON whatsapp_messages(conversation_id, direction);
CREATE INDEX idx_whatsapp_messages_conv_status ON whatsapp_messages(conversation_id, delivery_status);
CREATE INDEX idx_whatsapp_messages_conv_sent_at ON whatsapp_messages(conversation_id, sent_at);
