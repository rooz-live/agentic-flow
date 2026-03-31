# LionAGI QE Fleet Integration Plan

**Status**: E-Phase (NOW #4)  
**Version**: v1.3.1  
**Created**: 2025-12-10  
**Branch**: poc/phase3-value-stream-delivery

---

## Overview

Integrate LionAGI QE Fleet (18 specialized agents) with agentic-flow WSJF/COD economics and pattern telemetry.

---

## Integration Touchpoints

### 1. **Test Priorities → WSJF Mapping**

Map LionAGI test categories to WSJF/COD fields:

| QE Agent | Test Category | WSJF Component | Priority |
|----------|--------------|----------------|----------|
| quality-gate | Quality validation | User/Business Value | HIGH |
| security-scanner | SAST/DAST | Risk Reduction | CRITICAL |
| flaky-test-hunter | Test stability | Time Criticality | MEDIUM |
| coverage-analyzer | Coverage gaps | Opportunity Enablement | MEDIUM |
| deployment-readiness | Release risk | Risk Reduction | HIGH |
| regression-risk-analyzer | Smart test selection | Effort Reduction | LOW |

**Mapping Logic**:
```python
# tools/federation/lionagi_wsjf_adapter.py
def map_qe_result_to_wsjf(agent_id: str, result: QEResult) -> WSJFMetrics:
    """Map LionAGI test results to WSJF economic metrics"""
    if agent_id == "security-scanner":
        return WSJFMetrics(
            user_business_value=90,  # Security is high value
            time_criticality=100,     # Critical vulnerabilities urgent
            risk_reduction=95,        # Prevents breaches
            opportunity_enablement=60 # Enables compliance
        )
    elif agent_id == "coverage-analyzer":
        coverage_pct = result.metrics.get("coverage", 0)
        return WSJFMetrics(
            user_business_value=40,
            time_criticality=20,
            risk_reduction=30,
            opportunity_enablement=coverage_pct  # Higher coverage = more enablement
        )
    # ... (18 agent mappings)
```

---

### 2. **Quality Gates Integration**

Wire LionAGI `quality-gate` agent into `af prod-cycle`:

```bash
# scripts/af (cmd_prod_cycle enhancement)
if [ "$AF_LIONAGI_QE_ENABLED" = "1" ]; then
    echo "🦁 Running LionAGI Quality Gate..."
    python3 tools/federation/lionagi_gateway.py \
        --agent quality-gate \
        --context ".goalie/pattern_metrics.jsonl" \
        --threshold 80 \
        --output ".goalie/lionagi_quality_gate.json"
    
    if [ $? -ne 0 ]; then
        log_pattern_event "quality-gate" "fail" "gate" "Orchestrator" "$AF_DEPTH_LEVEL"
        exit 1
    fi
fi
```

**Integration Points**:
- `.goalie/pattern_metrics.jsonl` → LionAGI context
- LionAGI verdict → `af governance-agent` input
- Failed gates → ROAM risk creation

---

### 3. **Pattern Telemetry Enrichment**

Extend `.goalie/pattern_metrics.jsonl` schema with QE fields:

```json
{
  "ts": "2025-12-10T21:45:00Z",
  "pattern": "observability-first",
  "circle": "Assessor",
  "lionagi_qe": {
    "agents_invoked": ["coverage-analyzer", "quality-gate"],
    "coverage_delta": "+12%",
    "quality_score": 87,
    "security_findings": 2,
    "verdict": "PASS"
  }
}
```

---

### 4. **Circle-Specific Agent Assignment**

Map circles to relevant QE agents:

| Circle | Primary Agents | Rationale |
|--------|----------------|-----------|
| Analyst | coverage-analyzer, test-data-architect | Data-driven testing |
| Assessor | quality-gate, flaky-test-hunter | Quality validation |
| Innovator | requirements-validator, chaos-engineer | Experimental testing |
| Intuitive | visual-tester, api-contract-validator | UX/API experience |
| Orchestrator | fleet-commander, deployment-readiness | Coordination |
| Seeker | production-intelligence, regression-risk-analyzer | Discovery |

**Implementation**:
```bash
# scripts/circles/replenish_circle.sh enhancement
LIONAGI_AGENTS_FOR_CIRCLE=$(python3 -c "
import json
mapping = {
    'analyst': ['coverage-analyzer', 'test-data-architect'],
    'assessor': ['quality-gate', 'flaky-test-hunter'],
    # ...
}
print(json.dumps(mapping.get('$CIRCLE', [])))
")

for agent in $(echo "$LIONAGI_AGENTS_FOR_CIRCLE" | jq -r '.[]'); do
    python3 tools/federation/lionagi_gateway.py --agent "$agent" --circle "$CIRCLE"
done
```

---

## Implementation Phases

### Phase 1: Foundation (E-Phase - NOW)
- [x] Review LionAGI v1.3.1 architecture
- [ ] Create `tools/federation/lionagi_gateway.py` adapter
- [ ] Define WSJF mapping schema (`tools/federation/lionagi_wsjf_adapter.py`)
- [ ] Extend `.goalie/pattern_metrics.jsonl` schema

### Phase 2: Core Integration (D-Phase - NEXT)
- [ ] Wire `quality-gate` into `af prod-cycle`
- [ ] Map circles to agent portfolios
- [ ] Test with 1 agent (coverage-analyzer) end-to-end
- [ ] Validate pattern telemetry enrichment

### Phase 3: Scale (C-Phase - LATER)
- [ ] Enable all 18 agents
- [ ] Parallel execution with `.goalie/circuit_breaker_state.json`
- [ ] Performance benchmarking (target: <30s overhead per prod-cycle)
- [ ] Create `.goalie/LIONAGI_BASELINE_METRICS.json`

---

## Success Criteria

1. **WSJF Alignment**
   - 100% of LionAGI test results map to WSJF fields
   - Security findings auto-generate ROAM risks with COD > 5e6

2. **Pattern Telemetry**
   - `.goalie/pattern_metrics.jsonl` contains `lionagi_qe` field for all cycles with QE enabled
   - Retro Coach can query: "Show me test coverage improvements per circle"

3. **Performance**
   - LionAGI overhead < 30s per `af prod-cycle` iteration
   - Parallel agent execution (6 agents concurrently)

4. **Observability**
   - `.goalie/lionagi_quality_gate.json` updated per cycle
   - Governance Agent flags gaps: "No security scan in 72h"

---

## Dependencies

- LionAGI QE Fleet v1.3.1 installed: `uv add lionagi-qe-fleet`
- PostgreSQL for agent persistence (optional): `docker run -p 5432:5432 postgres:16-alpine`
- Pattern helpers enhanced with QE hooks: `scripts/af_pattern_helpers.sh`

---

## Files to Create/Modify

**New Files**:
- `tools/federation/lionagi_gateway.py` (300 lines)
- `tools/federation/lionagi_wsjf_adapter.py` (200 lines)
- `.goalie/lionagi_quality_gate.json` (runtime output)
- `.goalie/LIONAGI_BASELINE_METRICS.json` (first-run snapshot)

**Modified Files**:
- `scripts/af` (add `AF_LIONAGI_QE_ENABLED` flag, wire gateway)
- `scripts/af_pattern_helpers.sh` (add `log_lionagi_qe_event()`)
- `scripts/circles/replenish_circle.sh` (map circles to agents)
- `.goalie/pattern_metrics.jsonl` schema (add `lionagi_qe` field)

---

## Next Actions

1. Create `tools/federation/lionagi_gateway.py` skeleton
2. Define WSJF mapping for 6 critical agents
3. Test end-to-end with `coverage-analyzer` → WSJF → ROAM
4. Update `af prod-cycle --help` with `--lionagi-qe` flag

---

**Status**: Ready for Phase 1 implementation
