# Affiliate Affinity System - Hackathon Submission

## Overview
Multi-agent AI system for real-time affiliate relationship management with learning trajectory tracking, semantic scoring, and distributed coordination.

## Quick Start

```bash
# Clone repository
cd investing/agentic-flow

# Install dependencies
npm install

# Run tests (528 tests, 60 suites)
npm test

# Start development server
npm run dev
```

## Key Features

### 1. Multi-Agent Coordination (4+ workers)
- Mesh, hierarchical, and adaptive topologies
- Consensus mechanisms (majority/unanimous)
- Session persistence and recovery

### 2. Learning Trajectory Tracking
- **ReflexionMemory**: Prediction storage with confidence scoring
- **CausalRecall**: Causal link recording with strength values
- **ProcessGovernor**: Dynamic concurrency control with circuit breakers

### 3. Real-Time Analytics
- **Midstreamer**: 416K+ ops/sec throughput
- **Neo4j Integration**: Graph-based affiliate relationships
- **AgentDB**: 8-table learning infrastructure

### 4. Semantic Scoring
- **ConceptNet Integration**: Semantic relationship queries
- **Ruvector Packages**: Synthetic data generation, GNN models

### 5. ROAM Risk Integration
- Risk-based swarm allocation
- WSJF prioritization (Cost of Delay / Job Duration)
- Auto-apply governance policies

## Architecture

```
src/
├── affiliate/           # Core affiliate management
├── integrations/        # External service integrations
│   ├── agentdb_learning.ts    # ReflexionMemory, CausalRecall
│   ├── ml_training.ts         # ML training trajectories
│   ├── neo4j_integration.ts   # Graph database
│   ├── midstreamer_affiliate.ts
│   └── conceptnet_integration.ts
├── runtime/
│   └── processGovernor.ts     # Concurrency control
└── tools/federation/    # Governance & WSJF
```

## Test Coverage

| Category | Tests | Suites |
|----------|-------|--------|
| Affiliate | 285 | 23 |
| Integration | 61 | 8 |
| Pattern Metrics | 182 | 29 |
| **Total** | **528** | **60** |

## Differentiators

1. **Production-Ready**: 528 passing tests, <22s build time
2. **Learning System**: Full ReflexionMemory + CausalRecall pipeline
3. **Risk-Aware**: ROAM framework with WSJF prioritization
4. **Multi-Modal**: Text, graph, and time-series analytics
5. **Scalable**: Swarm coordination with 4+ parallel workers

## Demo Scenario

See `demo_scenario.jsonl` for the 5-step campaign optimization demo.

## Links

- Hackathon: https://github.com/agenticsorg/hackathon-tv5
- Ruvector: https://github.com/ruvnet/ruvector
