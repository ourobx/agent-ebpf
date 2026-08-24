-- Agent-eBPF Policy & Telemetry Gateway PostgreSQL 16 Schema with Row-Level Security (RLS)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Multi-Tenant Policy Rules Table
CREATE TABLE IF NOT EXISTS tenant_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default_tenant',
    name VARCHAR(128) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    pattern TEXT NOT NULL,
    decision VARCHAR(16) NOT NULL DEFAULT 'BLOCK',
    reason TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for tenant and action_type lookup performance
CREATE INDEX IF NOT EXISTS idx_tenant_policies_lookup 
ON tenant_policies (tenant_id, action_type) 
WHERE enabled = TRUE;

-- Enable Row-Level Security (RLS)
ALTER TABLE tenant_policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any
DROP POLICY IF EXISTS tenant_isolation ON tenant_policies;

-- RLS Policy: Enforce isolation based on app.current_tenant setting
CREATE POLICY tenant_isolation ON tenant_policies
    USING (tenant_id = current_setting('app.current_tenant', true) OR tenant_id = 'default_tenant');

-- 2. Asynchronous Telemetry Audit Log Table
CREATE TABLE IF NOT EXISTS telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'default_tenant',
    event_id VARCHAR(128) NOT NULL,
    agent_id VARCHAR(128),
    action_type VARCHAR(64) NOT NULL,
    target TEXT NOT NULL,
    decision VARCHAR(16) NOT NULL,
    reason TEXT,
    kernel_trace_id VARCHAR(128),
    duration_ms NUMERIC(10, 3),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for telemetry time-series analytics
CREATE INDEX IF NOT EXISTS idx_telemetry_tenant_time 
ON telemetry_events (tenant_id, created_at DESC);

-- Enable Row-Level Security on Telemetry
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_telemetry_isolation ON telemetry_events;

CREATE POLICY tenant_telemetry_isolation ON telemetry_events
    USING (tenant_id = current_setting('app.current_tenant', true) OR tenant_id = 'default_tenant');

-- 3. Default Seed Data
INSERT INTO tenant_policies (tenant_id, name, action_type, pattern, decision, reason)
VALUES 
    (
        'default_tenant',
        'Restricted Shell Tools',
        'tool_execution',
        '^(bash_exec|sh|exec|eval|rm_rf|write_file|delete_file)$',
        'BLOCK',
        '[ksec-gateway] Restricted shell or mutating tool prohibited by tenant policy'
    ),
    (
        'default_tenant',
        'SSRF Private IP Block',
        'network_request',
        '^https?://(localhost|127\.0\.0\.1|10\.|192\.168\.)',
        'BLOCK',
        '[ksec-gateway] SSRF protection: private IP range forbidden'
    )
ON CONFLICT DO NOTHING;
