-- Sovereign Swarm: Wave 2 - Immutable Data Plane
-- Primitive: EventOps Location Fact
-- Rule: Operational event facts cannot be updated or deleted.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table definition
CREATE TABLE IF NOT EXISTS eventops_location_fact (
    fact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL,
    project_id UUID NOT NULL,
    -- Strictly ISO 8601 formatting or UTC offsets enforced at application layer
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ARRIVAL', 'DEPARTURE', 'ONSITE', 'OFFSITE', 'CORRECTION')),
    geo_latitude DECIMAL(9, 6) NOT NULL,
    geo_longitude DECIMAL(9, 6) NOT NULL,
    -- Any offsetting correction requires a pointer to the original fact
    reference_fact_id UUID REFERENCES eventops_location_fact(fact_id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexing for High-Velocity Parallel Reads (Monday morning billing syncs)
CREATE INDEX IF NOT EXISTS idx_eventops_technician_time 
    ON eventops_location_fact(technician_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_eventops_project_status 
    ON eventops_location_fact(project_id, status);

-- ==========================================
-- THE IMMUTABILITY GOVERNANCE RULE
-- ==========================================
-- Ensure that even if application logic is compromised, the database physically rejects mutations.

-- 1. Create a Role for Application execution if it doesn't exist
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'swarm_app_role') THEN
      CREATE ROLE swarm_app_role NOLOGIN;
   END IF;
END
$do$;

-- 2. Grant only Append/Insert and Read capabilities
GRANT SELECT, INSERT ON eventops_location_fact TO swarm_app_role;

-- 3. Explicitly Revoke Destructive Operations
REVOKE UPDATE, DELETE, TRUNCATE ON eventops_location_fact FROM swarm_app_role;

-- 4. Create a trigger to hard-block superuser/owner manual tampering
CREATE OR REPLACE FUNCTION enforce_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ERR_IMMUTABILITY_VIOLATION: EventOps facts are append-only. No UPDATE or DELETE allowed.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_mutation ON eventops_location_fact;
CREATE TRIGGER trg_prevent_mutation
    BEFORE UPDATE OR DELETE ON eventops_location_fact
    FOR EACH ROW
    EXECUTE FUNCTION enforce_immutability();

-- EOF
