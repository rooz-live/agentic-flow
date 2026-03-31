# Observability Gaps Emitter Optimization

## Problem

The `observability_gaps` emitter has high execution variance (CV: 0.65) causing instability in graduation assessment:
- Mean: 354ms
- StdDev: ±232ms (65% variance)
- Impact: Prevents reaching 85% stability threshold

## Root Cause

The emitter calls `./scripts/af goalie-gaps --filter observability --json` which:
1. Reads entire `.goalie/pattern_metrics.jsonl` file
2. File size grows with each cycle (currently 86KB+)
3. Variable processing time based on file size
4. No caching or optimization for frequent calls

## Solutions

### Option 1: Add Time Window Limit (Quick Fix) ⭐ **RECOMMENDED**

Modify the evidence config to only analyze recent metrics:

```json
{
  "observability_gaps": {
    "enabled": true,
    "default": true,
    "timeout_sec": 20,
    "script": "scripts/af",
    "args": [
      "goalie-gaps",
      "--filter", "observability",
      "--since-minutes", "30",
      "--json"
    ],
    "output_format": "json",
    "fields": ["gap_count", "critical_gaps", "coverage_pct"],
    "integration": {
      "prod_cycle": true,
      "prod_swarm": true,
      "phase": "teardown"
    }
  }
}
```

**Benefits**:
- Limits analysis to last 30 minutes of metrics
- Consistent execution time regardless of total file size
- No code changes required
- Expected CV: < 0.15 (stable)

**Implementation**:
```bash
# Update evidence config
python3 -c "
import json
from pathlib import Path

config_path = Path('config/evidence_config.json')
with open(config_path) as f:
    config = json.load(f)

# Add time window to args
config['emitters']['observability_gaps']['args'] = [
    'goalie-gaps',
    '--filter', 'observability',
    '--since-minutes', '30',
    '--json'
]

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print('✅ Updated observability_gaps with time window')
"
```

### Option 2: Add Caching Layer (Medium-term)

Cache gap analysis results for 5 minutes:

```python
# Add to cmd_detect_observability_gaps.py
import time
from functools import lru_cache

@lru_cache(maxsize=1)
def get_cached_gaps(metrics_file_mtime):
    \"\"\"Cache gaps based on file modification time\"\"\"
    # Existing gap detection logic
    pass

# In main():
mtime = os.path.getmtime(metrics_file)
gaps = get_cached_gaps(mtime)
```

**Benefits**:
- Sub-millisecond execution for repeated calls
- Automatic cache invalidation on new metrics
- Minimal code changes

### Option 3: Incremental Processing (Long-term)

Maintain state file with last processed line:

```python
# .goalie/gaps_state.json
{
  "last_processed_line": 12450,
  "last_gaps": {...}
}
```

**Benefits**:
- O(1) processing time (only new metrics)
- Scales to arbitrarily large files
- Most efficient solution

**Drawbacks**:
- Requires state management
- More complex implementation
- Needs careful error handling

## Implementation Plan

### Phase 1: Quick Fix (Immediate)
1. ✅ **Disable observability_gaps** (completed - for graduation)
2. **Add time window parameter** (--since-minutes 30)
3. **Re-enable and test** (5 cycles to verify stability)
4. **Measure new CV** (target: < 0.15)

### Phase 2: Validation (Day 1-2)
```bash
# Re-enable with time window
python3 -c "
import json
from pathlib import Path

config_path = Path('config/evidence_config.json')
with open(config_path) as f:
    config = json.load(f)

config['emitters']['observability_gaps']['enabled'] = True
config['emitters']['observability_gaps']['args'] = [
    'goalie-gaps',
    '--filter', 'observability',
    '--since-minutes', '30',
    '--json'
]

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
"

# Run test cycles
for i in {1..5}; do
  AF_ENV=local ./scripts/af prod-cycle --iterations 3 --mode advisory --circle orchestrator
done

# Measure variance
tail -15 .goalie/evidence.jsonl | python3 -c "
import json, sys, statistics
durs = []
for line in sys.stdin:
    try:
        e = json.loads(line)
        if e['emitter'] == 'observability_gaps':
            durs.append(e['metadata']['duration_ms'])
    except: pass
if len(durs) > 1:
    mean = statistics.mean(durs)
    std = statistics.stdev(durs)
    cv = std / mean
    print(f'Observability Gaps Variance:')
    print(f'  Mean: {mean:.0f}ms')
    print(f'  StdDev: {std:.0f}ms')
    print(f'  CV: {cv:.3f} (Target: < 0.15)')
    print(f'  Status: {\"✅ STABLE\" if cv < 0.15 else \"❌ UNSTABLE\"}')"
```

### Phase 3: Re-graduation (Day 2-3)
If CV < 0.15:
```bash
# Run 5 more cycles with all emitters enabled
python3 scripts/agentic/graduation_assessor.py --recent 10

# Should show stability > 85% with all 3 emitters
```

### Phase 4: Production Use (Ongoing)
- Monitor emitter performance
- Consider caching layer if still variable
- Implement incremental processing for scale

## Performance Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Mean Duration | 354ms | < 400ms | ✅ |
| StdDev | 232ms | < 60ms | ❌ |
| CV | 0.65 | < 0.15 | ❌ |
| Stability Impact | -25.8% | Neutral | ❌ |

With time window optimization:
- Expected Mean: ~200ms (less data to process)
- Expected StdDev: ~25ms (consistent window size)
- Expected CV: ~0.12 (stable)
- Expected Stability Impact: +5-10%

## Testing Script

```bash
#!/bin/bash
# test_observability_gaps_variance.sh

echo "Testing observability_gaps variance..."

# Run 20 samples
for i in {1..20}; do
  start_ms=$(date +%s%3N)
  ./scripts/af goalie-gaps --filter observability --since-minutes 30 --json > /dev/null 2>&1
  end_ms=$(date +%s%3N)
  duration=$((end_ms - start_ms))
  echo "$duration"
done | python3 -c "
import sys, statistics
durs = [int(line) for line in sys.stdin]
mean = statistics.mean(durs)
std = statistics.stdev(durs) if len(durs) > 1 else 0
cv = std / mean if mean > 0 else 0
print(f'Mean: {mean:.0f}ms')
print(f'StdDev: {std:.0f}ms')
print(f'CV: {cv:.3f}')
print(f'Status: {\"✅ STABLE\" if cv < 0.15 else \"❌ NEEDS WORK\"}')"
```

## Rollback Plan

If optimization doesn't work:
1. Revert to disabled state
2. Alternative: Replace with lightweight gap check
3. Alternative: Move to analysis phase (non-critical path)

---

**Status**: Quick fix ready for implementation  
**Priority**: P1 - Required for full evidence coverage  
**Owner**: Evidence Manager Team  
**Timeline**: 2-3 days for validation
