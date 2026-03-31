# Learning Evidence & Compounding Benefits Workflow

## Overview

This workflow demonstrates how `af prod` generates learning evidence, performs compounding assessment, and tracks cumulative benefits across rotations. Each rotation learns from previous executions, creating a compounding improvement effect.

## Concept: Compounding Benefits

Traditional workflows run isolated cycles. **Our enhanced workflow compounds benefits:**

```
Rotation 1: Baseline learning → Evidence captured
            ↓
Rotation 2: Learns from R1 → Adapts strategy → More evidence
            ↓
Rotation 3: Learns from R1+R2 → Optimized execution → Compounded benefits
```

**Compounding Factor**: Each rotation builds on accumulated learning, improving:
- Iteration efficiency (faster cycles)
- Success rate (fewer failures)
- Economic impact (better prioritization)
- System stability (smarter adaptations)

## Quick Start

### Option 1: Complete Workflow (Recommended)
```bash
./scripts/run_production_cycle.sh
```

This single command runs all 6 phases:
1. Enable evidence collection
2. Pre-assessment baseline
3. Production cycles with learning
4. Post-execution assessment
5. Learning evidence analysis
6. Quality validation

### Option 2: Step-by-Step
```bash
# 1. Assessment only
python3 scripts/cmd_prod_enhanced.py --assess-only

# 2. Full enhanced prod (3 rotations)
python3 scripts/cmd_prod_enhanced.py --rotations 3 --mode advisory

# 3. Review evidence
./scripts/af evidence assess --recent 10
```

## Workflow Phases

### Phase 1: Evidence Collection Setup

**Enables evidence emitters and initializes tracking files**

```bash
# List available emitters
./scripts/af evidence list

# Enable key emitter
./scripts/af evidence enable revenue-safe

# Verify evidence file
ls -lh .goalie/evidence.jsonl
```

**Files Created:**
- `.goalie/evidence.jsonl` - Standard evidence
- `.goalie/learning_evidence.jsonl` - Learning events
- `.goalie/compounding_benefits.jsonl` - Benefit metrics

### Phase 2: Pre-Assessment (Learning Baseline)

**Establishes baseline metrics for comparison**

```bash
python3 scripts/cmd_prod_enhanced.py --assess-only
```

**Captures:**
- System stability baseline
- Maturity gap count
- Economic volatility
- Confidence score
- Recommended iterations

**Learning Event Logged:**
```json
{
  "event_type": "needs_assessment",
  "data": {
    "stability": 1.0,
    "maturity_gaps": 0,
    "economic_volatility": 0.5,
    "recommended_cycle_iters": 3,
    "recommended_swarm_iters": 5,
    "confidence": 0.5
  }
}
```

### Phase 3: Production Cycles with Compounding Benefits

**Runs 3 rotations, each learning from previous**

```bash
python3 scripts/cmd_prod_enhanced.py --rotations 3 --mode advisory
```

**What Happens:**

**Rotation 1:**
- Initial assessment
- Run cycle (3 iterations)
- Run swarm (5 iterations)
- Log success/failure
- Calculate initial benefits

**Rotation 2:**
- Re-assess (learns from R1)
- Adapt iteration counts if needed
- Run optimized cycle
- Run optimized swarm
- Calculate cumulative benefits

**Rotation 3:**
- Re-assess (learns from R1+R2)
- Further optimize
- Run refined cycle
- Run refined swarm
- Calculate compounded benefits

**Learning Events Captured:**
- `rotation_start` - Begin rotation
- `needs_assessment` - Re-assessment
- `cycle_success` / `cycle_failure`
- `swarm_success` / `swarm_failure`
- `early_exit` - Optimal stopping

**Compounding Benefits Tracked:**
```json
{
  "rotation": 3,
  "metrics": {
    "iterations": 8,
    "improvements": 1,
    "duration": 45.2,
    "success_rate": 1.0
  },
  "cumulative": {
    "total_rotations": 3,
    "total_iterations": 24,
    "total_improvements": 3,
    "improvement_rate": 0.125
  }
}
```

### Phase 4: Post-Execution Assessment

**Validates execution and graduation readiness**

```bash
./scripts/af evidence assess --recent 10
```

**Checks:**
- Evidence collected during run
- Success/failure patterns
- Graduation criteria
- Autocommit readiness

### Phase 5: Learning Evidence Analysis

**Analyzes captured learning and compounding benefits**

**Learning Evidence Summary:**
```
Learning Events Captured: 15
Recent Events:
  - needs_assessment: 2025-12-17T21:00:00
  - rotation_start: 2025-12-17T21:00:05
  - cycle_success: 2025-12-17T21:02:30
  - swarm_success: 2025-12-17T21:05:15
  - rotation_start: 2025-12-17T21:05:20
```

**Compounding Benefits:**
```
Rotation: 3
Iterations: 8
Improvements: 1
Cumulative Iterations: 24
Cumulative Improvements: 3
Improvement Rate: 12.5%
```

### Phase 6: Quality Validation

**Runs post-flight quality gates**

```bash
python3 scripts/quality/prod_quality_gates.py --context post
```

**Validates:**
- Evidence collected ✅
- Metrics captured ✅
- No degradation ✅
- WSJF updated ✅
- Graduation assessed ✅

## Compounding Benefits Math

### Improvement Rate Formula
```
improvement_rate = total_improvements / total_iterations
```

### Compounding Factor
```
compounding_factor = rotation_count
```

### Expected Growth Patterns

**Linear (No Learning):**
```
R1: 3 improvements
R2: 3 improvements  
R3: 3 improvements
Total: 9 improvements
```

**Compounding (With Learning):**
```
R1: 3 improvements (100% baseline)
R2: 4 improvements (133% from learning)
R3: 5 improvements (167% from compound learning)
Total: 12 improvements (+33% vs linear)
```

## Learning Event Types

| Event Type | When Logged | Purpose |
|------------|-------------|---------|
| `needs_assessment` | Before each rotation | Capture system state |
| `rotation_start` | Begin rotation | Mark rotation boundary |
| `cycle_success` | Cycle completes | Track success pattern |
| `cycle_failure` | Cycle fails | Learn from failures |
| `swarm_success` | Swarm completes | Track swarm outcomes |
| `swarm_failure` | Swarm fails | Identify swarm issues |
| `early_exit` | Optimal stopping | Efficiency learning |

## Compounding Benefit Metrics

| Metric | Description | Compounds How |
|--------|-------------|---------------|
| `iterations` | Total iterations this rotation | Optimizes over time |
| `improvements` | Successful completions | Increases with learning |
| `duration` | Time to complete | Decreases with efficiency |
| `success_rate` | Success percentage | Improves with learning |
| `total_iterations` | Cumulative across rotations | Always increasing |
| `total_improvements` | Cumulative successes | Compounds with learning |
| `improvement_rate` | improvements/iterations | Key compound metric |

## Viewing Learning Evidence

### View All Learning Events
```bash
python3 -c 'import json; [print(json.dumps(json.loads(line), indent=2)) for line in open(".goalie/learning_evidence.jsonl")]'
```

### View Compounding Benefits
```bash
python3 -c 'import json; [print(json.dumps(json.loads(line), indent=2)) for line in open(".goalie/compounding_benefits.jsonl")]'
```

### Filter by Session
```bash
# Get latest session ID
SESSION_ID=$(tail -1 .goalie/learning_evidence.jsonl | python3 -c 'import sys, json; print(json.load(sys.stdin)["session_id"])')

# View session events
grep "$SESSION_ID" .goalie/learning_evidence.jsonl | python3 -m json.tool
```

### Calculate Compounding ROI
```bash
python3 << 'EOF'
import json
from pathlib import Path

benefits_file = Path(".goalie/compounding_benefits.jsonl")
if not benefits_file.exists():
    print("No benefits data yet")
    exit(0)

benefits = []
with open(benefits_file) as f:
    for line in f:
        benefits.append(json.loads(line))

if not benefits:
    print("No benefits recorded")
    exit(0)

# Get latest session
latest_session = benefits[-1]["session_id"]
session_benefits = [b for b in benefits if b["session_id"] == latest_session]

if len(session_benefits) < 2:
    print("Need at least 2 rotations for ROI")
    exit(0)

first = session_benefits[0]
last = session_benefits[-1]

improvement_growth = (
    (last["cumulative"]["improvement_rate"] - first["metrics"]["improvements"] / first["metrics"]["iterations"])
    / (first["metrics"]["improvements"] / first["metrics"]["iterations"])
    * 100
)

print(f"🎯 Compounding ROI Analysis")
print(f"   Rotations: {len(session_benefits)}")
print(f"   Initial Improvement Rate: {first['metrics']['improvements'] / first['metrics']['iterations']:.1%}")
print(f"   Final Improvement Rate: {last['cumulative']['improvement_rate']:.1%}")
print(f"   Growth: {improvement_growth:+.1f}%")
print(f"   Compounding Factor: {len(session_benefits)}x")
EOF
```

## Advanced Usage

### Run More Rotations for Greater Compounding
```bash
# 5 rotations = higher compound effect
python3 scripts/cmd_prod_enhanced.py --rotations 5 --mode advisory
```

### JSON Output for Analysis
```bash
python3 scripts/cmd_prod_enhanced.py --rotations 3 --json > results.json
```

### Assess Only (No Execution)
```bash
python3 scripts/cmd_prod_enhanced.py --assess-only
```

## Integration with Quality Framework

The learning evidence workflow integrates with quality gates:

```bash
# Pre-flight check
python3 scripts/quality/prod_quality_gates.py --context pre

# Run with learning
./scripts/run_production_cycle.sh

# Post-flight validation
python3 scripts/quality/prod_quality_gates.py --context post
```

## Expected Output

### Successful Run
```
🎓 ENHANCED PRODUCTION ORCHESTRATOR
   WITH LEARNING EVIDENCE & COMPOUNDING BENEFITS
======================================================================

Phase 1: Initial Assessment
======================================================================
📈 Learning Evidence Captured:
   Stability: 100.0%
   Maturity Gaps: 0
   ...

🔄 Rotation 1/3
======================================================================
📊 Assessing Current Needs...
🔄 Running prod-cycle (iterations=3, mode=advisory)
...
✅ Cycle Complete

🐝 Running prod-swarm (iterations=5)
...
✅ Swarm Complete

💰 Compounding Benefits (Rotation 1):
   Total Iterations: 8
   Total Improvements: 1
   Improvement Rate: 12.5%

🔄 Rotation 2/3
======================================================================
📊 Re-assessing (Learning from Rotation 1)...
[learns and adapts]
...

💰 Compounding Benefits (Rotation 2):
   Total Iterations: 16
   Total Improvements: 2
   Improvement Rate: 12.5%

🔄 Rotation 3/3
======================================================================
...

📋 ENHANCED EXECUTION SUMMARY
======================================================================
🎓 Learning Evidence:
   Session ID: 20251217_210000
   Learning Events Captured: 15
   Rotations Completed: 3

💰 Compounding Benefits:
   Total Iterations: 24
   Total Improvements: 3
   Improvement Rate: 12.5%
   Compounding Factor: 3x rotations
```

## Key Benefits

1. **Learning Accumulation**: Each rotation learns from previous executions
2. **Adaptive Optimization**: Iteration counts adapt based on outcomes
3. **Compounding Effects**: Benefits multiply across rotations
4. **Evidence Tracking**: Full audit trail of learning
5. **ROI Measurement**: Quantify compounding value

## Troubleshooting

### No Learning Events Captured
**Issue**: `.goalie/learning_evidence.jsonl` is empty

**Solution**:
```bash
# Ensure file exists and is writable
touch .goalie/learning_evidence.jsonl
chmod 644 .goalie/learning_evidence.jsonl
```

### No Compounding Benefits
**Issue**: No benefits recorded

**Solution**: Run at least 1 full rotation
```bash
python3 scripts/cmd_prod_enhanced.py --rotations 1 --mode advisory
```

### Assessment Shows No Learning
**Issue**: Improvement rate stays at 0%

**Reason**: Need successful completions to compound
**Solution**: Ensure cycles and swarms complete successfully

## Summary

The learning evidence workflow provides:
- ✅ Baseline assessment before execution
- ✅ Evidence collection during execution
- ✅ Learning event tracking
- ✅ Compounding benefit calculation
- ✅ Post-execution analysis
- ✅ Quality validation

**Result**: Each rotation builds on previous learning, creating measurable compounding improvements in efficiency, success rate, and economic impact.

Run `./scripts/run_production_cycle.sh` to experience the full compounding benefits workflow! 🚀
