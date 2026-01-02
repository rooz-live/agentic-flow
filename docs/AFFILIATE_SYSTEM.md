# Affiliate Affinity System

## Overview

The Affiliate Affinity System provides comprehensive affiliate relationship management, real-time activity tracking, risk assessment, and affinity scoring for the agentic-flow platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Affiliate Affinity System                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ AffiliateState  │  │   Midstreamer   │  │    Neo4j        │ │
│  │    Tracker      │  │   Integration   │  │   Ontology      │ │
│  │   (SQLite)      │  │  (Real-time)    │  │   (Graph)       │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                 │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │                    Governance Agent                        │  │
│  │         (WSJF Economics, Pattern Telemetry)               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. AffiliateStateTracker (`src/affiliate/AffiliateStateTracker.ts`)

Core class for affiliate state management with SQLite persistence.

**Features:**
- CRUD operations for affiliates, activities, risks, and affinities
- State machine for affiliate lifecycle (pending → active → suspended → archived)
- Event emission for state changes
- AgentDB learning integration

**Usage:**
```typescript
import { AffiliateStateTracker } from './affiliate/AffiliateStateTracker';

const tracker = new AffiliateStateTracker('./logs/device_state_tracking.db');

// Create affiliate
const affiliate = tracker.createAffiliate({
  name: 'Partner Corp',
  tier: 'gold',
  metadata: { region: 'US' }
});

// Transition state
tracker.transitionState(affiliate.id, 'active');

// Log activity
tracker.logActivity(affiliate.id, {
  activity_type: 'referral',
  description: 'Referred new customer'
});
```

### 2. Midstreamer Integration (`src/integrations/midstreamer_affiliate.ts`)

Real-time event streaming for affiliate activity monitoring.

**Features:**
- Event processing with batch handling
- Special event handlers (tier_change, suspension, referral)
- Metrics tracking and health monitoring
- Configurable flush intervals

**Usage:**
```typescript
import { createMidstreamerAffiliateStream } from './integrations/midstreamer_affiliate';

const stream = createMidstreamerAffiliateStream(tracker);
stream.on('tier_change', (event) => {
  console.log('Tier changed:', event);
});
stream.start();
```

### 3. Neo4j Ontology (`src/ontology/affiliate.cypher`, `src/integrations/neo4j_affiliate.ts`)

Knowledge graph for affiliate relationship modeling.

**Features:**
- Node labels: Affiliate, Activity, Risk, Affinity
- Relationship types: HAS_ACTIVITY, HAS_RISK, AFFILIATED_WITH
- Graph analytics for collaboration networks
- High affinity pair detection

### 4. ROAM Risk Integration

Affiliate-specific blockers tracked in `.goalie/ROAM_TRACKER.yaml`:
- BLOCKER-008: Affiliate database schema
- BLOCKER-009: AffiliateStateTracker deployment
- BLOCKER-010: Neo4j ontology connection
- BLOCKER-011: Midstreamer integration

### 5. Governance Patterns

Affiliate patterns in `governance_agent.ts` and `.goalie/PATTERNS.yaml`:
- `affiliate-monitoring`: Real-time state tracking
- `affinity-scoring`: Relationship strength scoring
- `affiliate-tier-change`: Tier promotion/demotion events
- `affiliate-risk-assessment`: ROAM framework integration

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `affiliate_states` | Core affiliate records with state machine |
| `affiliate_activities` | Activity log with timestamps |
| `affiliate_risks` | Risk records with ROAM status |
| `affiliate_affinities` | Relationship scores between affiliates |

### Migrations

Run migrations:
```bash
./scripts/migrations/run_migrations.sh
```

## CLI Commands

### Health Check
```bash
# Human-readable output
./scripts/af affiliate-health

# JSON output for automation
./scripts/af affiliate-health --json
```

### Sample Output
```json
{
  "status": "healthy",
  "health_score": 100,
  "tables": {
    "affiliate_states": 6,
    "affiliate_activities": 10,
    "affiliate_risks": 4,
    "affiliate_affinities": 5
  }
}
```

## Testing

Run affiliate tests:
```bash
npm test -- tests/affiliate/
```

Test files:
- `AffiliateStateTracker.test.ts` - CRUD and state machine
- `AffiliateActivities.test.ts` - Activity logging
- `AffiliateRisks.test.ts` - Risk assessment
- `AffiliateAffinities.test.ts` - Affinity scoring
- `MidstreamerIntegration.test.ts` - Real-time streaming
- `Neo4jIntegration.test.ts` - Graph operations

## WSJF Economics

Affiliate patterns include WSJF boost values:
- `affiliate-monitoring`: +10 WSJF
- `affinity-scoring`: +15 WSJF
- `affiliate-risk-assessment`: +20 WSJF

## Related Documentation

- [ROAM Tracker](.goalie/ROAM_TRACKER.yaml)
- [Patterns Configuration](.goalie/PATTERNS.yaml)
- [Governance Agent](tools/federation/governance_agent.ts)

