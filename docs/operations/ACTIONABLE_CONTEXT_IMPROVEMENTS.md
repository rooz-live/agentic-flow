# Actionable Context, WSJF Protocols, Testing & UI/UX Improvements

**Status**: 🚧 In Progress  
**Date**: 2025-12-11  
**Plan ID**: `7642b4bb-f8b3-40ad-80af-21da44c2da43`

## Executive Summary

This document tracks the implementation of comprehensive improvements to the WSJF/CoD system, focusing on:
1. **Actionable Context**: DoR/DoD enforcement, metadata enrichment
2. **Testing Rigor**: Forward/backtesting for WSJF accuracy validation
3. **UI/UX**: Web dashboard for admin/user panels
4. **Pattern Execution**: Executable workflow checklists
5. **Relentless Execution**: Velocity and cycle time tracking

## Immediate Actions Completed ✅

### 1. Directory Structure Created
```bash
scripts/patterns/templates/    # DoR/DoD templates
scripts/patterns/workflows/    # Executable workflows
scripts/testing/               # Backtest/forward test
scripts/metrics/               # Execution tracking
scripts/web/static/            # Web dashboard
logs/wsjf_validation/          # Test results
```

### 2. TDD Pattern Template ✅
**File**: `scripts/patterns/templates/TDD.yaml`

**Features**:
- 3 Definition of Ready criteria
- 5 Definition of Done criteria (2 blocking)
- Automated validation commands
- Telemetry configuration
- WSJF guidance
- Real-world examples

**DoR Criteria**:
1. Test cases written (test file exists)
2. Test data prepared (fixtures/mocks)
3. Acceptance criteria clear (DoD populated)

**DoD Criteria** (Blocking):
1. ✅ All tests pass (pytest returns 0)
2. ✅ Code coverage >= 80% (pytest --cov)
3. ✅ No regressions (full test suite passes)
4. Code reviewed (PR approved)
5. Documentation updated

### 3. DoR/DoD Validation Tool ✅
**File**: `scripts/patterns/validate_dor_dod.py`

**Usage**:
```bash
# Validate single backlog
python3 scripts/patterns/validate_dor_dod.py circles/analyst/operational-analyst-roles/Analyst/backlog.md

# Check all backlogs
python3 scripts/patterns/validate_dor_dod.py --check-all

# Output
📋 Validation Report
Total Items: 5
Valid Items: 0 (0.0%)
Items with Issues: 5 (100.0%)

⚠️  Issues Found:
  Line 1: Automate CoD calculation...
    Pattern: TDD
    • Missing DoR (expected 3 criteria)
    • Missing DoD (expected 5 criteria)
```

**Test Results**:
- Tested on `circles/orchestrator/operational-orchestration-roles/Facilitator/backlog.md`
- Detected 5 items with missing DoR/DoD
- Validation working correctly ✅

## Next Steps (Priority Order)

### Phase 1A: Complete DoR/DoD Templates (This Week)

**Remaining Templates** (Need to create):
1. `Safe-Degrade.yaml` - Graceful degradation pattern
2. `Observability-First.yaml` - Metrics before mutation
3. `Guardrail-Lock.yaml` - Enforce guardrails
4. `Depth-Ladder.yaml` - Incremental escalation
5. `Kanban-WIP.yaml` - WIP limit enforcement

**Template Structure** (Standard format):
```yaml
pattern: <NAME>
description: <SHORT DESC>
category: <execution|governance|flow|architecture|innovation>

definition_of_ready:
  - criterion: <NAME>
    description: <WHAT>
    validation: <HOW TO CHECK>
    command: <AUTOMATED CHECK> (optional)

definition_of_done:
  - criterion: <NAME>
    description: <WHAT>
    validation: <HOW TO CHECK>
    command: <AUTOMATED CHECK>
    blocking: <true|false>
    threshold: <VALUE> (if applicable)

telemetry:
  emit_on_start: true
  emit_on_complete: true
  metrics: [<METRIC_LIST>]

wsjf_guidance:
  user_value: <GUIDANCE>
  time_criticality: <GUIDANCE>
  risk_reduction: <GUIDANCE>
  job_size: <GUIDANCE>

examples:
  - title: <EXAMPLE TASK>
    wsjf: <SCORE>
    cod: <VALUE>
    size: <VALUE>
    outcome: <RESULT>
```

### Phase 1B: Integrate Validation into Replenishment (This Week)

**Goal**: Block adding items without valid DoR/DoD

**Changes to `replenish_circle.sh`**:
```bash
# After generating WSJF, before adding to backlog
echo "  🔍 Validating DoR/DoD..."
python3 "$PROJECT_ROOT/scripts/patterns/validate_dor_dod.py" "$TARGET_BACKLOG" --pattern "$PATTERN" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "  ⚠️  DoR/DoD validation failed - using pattern template defaults"
    # Auto-populate from template
    python3 "$PROJECT_ROOT/scripts/patterns/apply_template.py" "$PATTERN" --output-dor-dod
fi
```

**New Script Needed**:
- `scripts/patterns/apply_template.py` - Auto-populate DoR/DoD from template

### Phase 1C: Execution Tracking (This Week)

**Goal**: Track cycle time, lead time, throughput

**Implementation**:
```python
# scripts/metrics/execution_tracker.py
import json
from datetime import datetime
from pathlib import Path

def log_transition(item_id, from_status, to_status, wsjf_score):
    """Log status transition to timeline"""
    event = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "item_id": item_id,
        "transition": f"{from_status} → {to_status}",
        "wsjf_score": wsjf_score,
        "actor": os.getenv("USER", "unknown")
    }
    
    with open("logs/execution_timeline.jsonl", "a") as f:
        f.write(json.dumps(event) + "\n")
```

**Integration Points**:
- `scripts/circles/promote_to_kanban.py` - Log PENDING → IN_PROGRESS
- Manual completion - Log IN_PROGRESS → DONE
- `scripts/af` - Add `af track-completion <ITEM_ID>` command

**Metrics to Calculate**:
```python
# scripts/metrics/calculate_velocity.py
def calculate_metrics(days=7):
    """Calculate velocity metrics for last N days"""
    events = load_timeline_events(days)
    
    # Cycle Time: IN_PROGRESS → DONE
    cycle_times = [e["duration"] for e in events if e["transition"] == "DONE"]
    avg_cycle_time = sum(cycle_times) / len(cycle_times)
    
    # Lead Time: PENDING → DONE
    lead_times = [e["duration"] for e in events if e["start_status"] == "PENDING"]
    avg_lead_time = sum(lead_times) / len(lead_times)
    
    # Throughput: Items completed
    throughput = len([e for e in events if "→ DONE" in e["transition"]])
    
    return {
        "cycle_time_avg": avg_cycle_time,
        "lead_time_avg": avg_lead_time,
        "throughput": throughput,
        "period_days": days
    }
```

### Phase 2: Testing Framework (Next Week)

#### 2.1 WSJF Backtesting Script
**File**: `scripts/testing/wsjf_backtest.py`

**Algorithm**:
1. Load all completed items from `CONSOLIDATED_ACTIONS.yaml` (status = DONE/COMPLETE)
2. Extract predicted vs actual values:
   - Predicted: `wsjf_score`, `cost_of_delay`, `job_size` (at creation)
   - Actual: Calculate from completion data (if tracked)
3. Calculate errors:
   - MAPE (Mean Absolute Percentage Error)
   - Systematic bias (over/underestimate)
4. Group by pattern, circle, time period

**Output**:
```json
{
  "period": "2025-09-11 to 2025-12-11",
  "total_items": 127,
  "wsjf_accuracy": {
    "within_20_pct": 0.78,
    "avg_error_pct": 12.3
  },
  "cod_prediction": {
    "avg_error_pct": 15.2,
    "bias": "overestimate"
  },
  "size_prediction": {
    "avg_error_pct": -8.5,
    "bias": "underestimate"
  },
  "by_pattern": {
    "TDD": {
      "success_rate": 0.92,
      "avg_wsjf_error": 8.3
    },
    "Safe-Degrade": {
      "success_rate": 0.88,
      "avg_wsjf_error": 11.2
    }
  }
}
```

#### 2.2 Monte Carlo Forecasting
**File**: `scripts/testing/monte_carlo_forecast.py`

**Algorithm**:
1. Load historical cycle times for similar items (same pattern, size)
2. Fit distribution (lognormal typically)
3. Run 10,000 simulations
4. Calculate percentiles (P50, P85, P95)
5. Identify high-variance items (risky)

**Integration**:
```bash
# Add to af wsjf-top output
af wsjf-top 5 --monte-carlo

# Output
🏆 Top 5 Items by WSJF

Rank  ID          Title              WSJF   Forecast (P50/P85/P95)
1     FLOW-001    Safe-Degrade...    15.0   2d / 4d / 7d ⚠️
2     FLOW-002    TDD Pipeline...    12.5   1d / 2d / 3d ✅
```

### Phase 3: Web Dashboard (Week 3)

#### 3.1 Backend Setup
**File**: `scripts/web/dashboard_server.py`

**Framework**: Flask (already in use for `af_dashboard.py`)

**API Endpoints**:
```python
from flask import Flask, jsonify, request
import yaml

app = Flask(__name__)

@app.route('/api/wsjf/items')
def get_all_items():
    """Get all WSJF items"""
    with open('.goalie/CONSOLIDATED_ACTIONS.yaml') as f:
        data = yaml.safe_load(f)
    return jsonify(data)

@app.route('/api/wsjf/top/<int:n>')
def get_top_items(n):
    """Get top N items by WSJF"""
    items = load_and_sort_items()
    return jsonify(items[:n])

@app.route('/api/wsjf/calculate', methods=['POST'])
def calculate_wsjf():
    """Calculate WSJF from CoD components"""
    data = request.json
    ubv = data['user_value']
    tc = data['time_criticality']
    rr = data['risk_reduction']
    size = data['job_size']
    
    cod = ubv + tc + rr
    wsjf = cod / size if size > 0 else 0
    
    return jsonify({
        'cod': cod,
        'wsjf': wsjf,
        'priority': get_priority_bucket(wsjf)
    })

@app.route('/api/patterns')
def get_patterns():
    """List all pattern templates"""
    templates = list(Path('scripts/patterns/templates').glob('*.yaml'))
    patterns = [load_template(t) for t in templates]
    return jsonify(patterns)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**Start Command**:
```bash
af dashboard --web --port 5000
```

#### 3.2 Frontend (Minimal)
**File**: `scripts/web/static/index.html`

**Tech**: Vanilla JS + Tailwind CSS (CDN)

**Features**:
- Table view of all items (sortable by WSJF, CoD, Size)
- Filter by circle, status, pattern
- WSJF calculator widget
- Bulk replenishment trigger

**No Build Step**: Pure HTML/JS, served directly by Flask

### Phase 4: Pattern Workflows (Week 4)

**Goal**: Turn patterns into executable checklists

**Example**: `scripts/patterns/workflows/TDD.yaml`

**CLI**:
```bash
# Start workflow for item
af pattern-workflow FLOW-001 --pattern TDD

# Continue to next step
af pattern-workflow FLOW-001 --continue

# Check status
af pattern-workflow FLOW-001 --status
```

**Output**:
```
🔄 TDD Workflow for FLOW-001

[✅] Step 1: Write failing test (PASSED)
     Command: pytest tests/gateway/test_degrade.py
     Exit Code: 1 (expected)
     
[▶️] Step 2: Implement minimum code (MANUAL)
     Instructions: Write code to pass test
     Run when ready: af pattern-workflow FLOW-001 --continue
     
[⏸️] Step 3: Run tests (PENDING)
[⏸️] Step 4: Refactor (PENDING)
[⏸️] Step 5: Verify tests (PENDING)

Progress: 1/5 (20%)
```

## Success Metrics (Targets)

### Actionable Context
- [ ] **DoR/DoD Compliance**: 100% of items have valid DoR/DoD (Currently: 0%)
- [ ] **Template Coverage**: 16/16 patterns have templates (Currently: 1/16)
- [ ] **Validation Passing**: 0 items with missing DoR/DoD warnings

### Testing & Validation
- [ ] **WSJF Accuracy**: >80% within ±20% (Currently: Unknown)
- [ ] **Backtesting**: 90 days of history analyzed
- [ ] **Pattern Effectiveness**: Success rate calculated for all patterns

### Execution Velocity
- [ ] **Cycle Time**: Tracked for 100% of items
- [ ] **Throughput**: Baseline established (items/week)
- [ ] **Lead Time**: Measured from PENDING → DONE

### UI/UX (Future)
- [ ] **Dashboard Uptime**: 99%
- [ ] **User Adoption**: 80% use web interface
- [ ] **Task Time**: 50% reduction in replenishment time

## Commands Added

### Current
```bash
# Validate DoR/DoD
python3 scripts/patterns/validate_dor_dod.py <backlog> [--pattern PATTERN]
python3 scripts/patterns/validate_dor_dod.py --check-all

# Existing WSJF commands
af wsjf-top [n]
af wsjf-by-circle <circle>
af pattern-coverage
```

### Planned
```bash
# Testing
af wsjf-backtest --days 90
af wsjf-forecast FLOW-001 --monte-carlo

# Execution tracking
af track-completion FLOW-001
af velocity-report [--days 7]

# Web dashboard
af dashboard --web [--port 5000]

# Pattern workflows
af pattern-workflow FLOW-001 --pattern TDD
af pattern-workflow FLOW-001 --continue
```

## Files Created (This Session)

1. ✅ `scripts/patterns/templates/TDD.yaml` - DoR/DoD template
2. ✅ `scripts/patterns/validate_dor_dod.py` - Validation tool
3. ✅ `docs/ACTIONABLE_CONTEXT_IMPROVEMENTS.md` - This document

## Files to Create (Next)

### This Week
1. `scripts/patterns/templates/Safe-Degrade.yaml`
2. `scripts/patterns/templates/Observability-First.yaml`
3. `scripts/patterns/templates/Guardrail-Lock.yaml`
4. `scripts/patterns/templates/Depth-Ladder.yaml`
5. `scripts/patterns/apply_template.py`
6. `scripts/metrics/execution_tracker.py`
7. `scripts/metrics/calculate_velocity.py`

### Next Week
1. `scripts/testing/wsjf_backtest.py`
2. `scripts/testing/wsjf_forward_test.py`
3. `scripts/testing/monte_carlo_forecast.py`

### Week 3
1. `scripts/web/dashboard_server.py`
2. `scripts/web/static/index.html`
3. `scripts/web/static/app.js`

## Risk Assessment

### Technical Risks
✅ **LOW**: DoR/DoD validation - Simple YAML parsing + regex  
⚠️ **MEDIUM**: Backtesting - Depends on data quality  
🔴 **HIGH**: Web dashboard - Adds complexity, deployment concerns

### Mitigation Strategies
- Start with CLI tools (working now)
- Web dashboard is optional enhancement
- All features degrade gracefully (CLI fallback)
- Incremental rollout per circle

## Next Action (Immediate)

**What to do right now**:
```bash
# 1. Create Safe-Degrade template
vim scripts/patterns/templates/Safe-Degrade.yaml

# 2. Run validation on all backlogs
python3 scripts/patterns/validate_dor_dod.py --check-all

# 3. Start execution tracking
vim scripts/metrics/execution_tracker.py
```

**Expected Timeline**:
- Phase 1A-C (Actionable Context): 1 week
- Phase 2 (Testing): 1 week
- Phase 3 (Web Dashboard): 1 week
- Phase 4 (Workflows): 1 week

**Total**: 4 weeks to full implementation

---

**Maintainers**: Circle Orchestrator, Circle Assessor  
**Last Updated**: 2025-12-11T15:15:00Z  
**Plan Document**: See plan ID `7642b4bb-f8b3-40ad-80af-21da44c2da43` for full details
