-- Sovereign Swarm: Wave 2 - Immutable Data Plane
-- Primitive: Ceremony Logger
-- Rule: Agile/Operational synchronization blocks (Standup, Review, Retrospective) billable to the client.

CREATE TABLE IF NOT EXISTS ceremony_fact (
    ceremony_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    technician_id UUID NOT NULL,
    -- Strict ceremony type enforcement
    ceremony_type VARCHAR(50) NOT NULL CHECK (ceremony_type IN ('STANDUP', 'REVIEW', 'RETROSPECTIVE', 'PI_PLANNING', 'SYNC', 'CORRECTION')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    -- Duration in seconds, calculated and verified by Rust layer
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    is_billable BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Any offsetting correction requires a pointer to the original fact
    reference_ceremony_id UUID REFERENCES ceremony_fact(ceremony_id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ceremony_project_time 
    ON ceremony_fact(project_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_ceremony_technician 
    ON ceremony_fact(technician_id);

-- ==========================================
-- THE IMMUTABILITY GOVERNANCE RULE
-- ==========================================

-- Grant only Append/Insert and Read capabilities
GRANT SELECT, INSERT ON ceremony_fact TO swarm_app_role;
REVOKE UPDATE, DELETE, TRUNCATE ON ceremony_fact FROM swarm_app_role;

-- Hard-block superuser/owner manual tampering
CREATE OR REPLACE FUNCTION enforce_ceremony_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ERR_IMMUTABILITY_VIOLATION: Ceremony facts are append-only. No UPDATE or DELETE allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ceremony_mutation ON ceremony_fact;
CREATE TRIGGER trg_prevent_ceremony_mutation
    BEFORE UPDATE OR DELETE ON ceremony_fact
    FOR EACH ROW
    EXECUTE FUNCTION enforce_ceremony_immutability();

-- EOF
