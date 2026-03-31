# Using Dynamic Thresholds in ay yo and ay prod

## Quick Start

Dynamic thresholds are now **automatically integrated** into all ay commands. No changes needed to your existing workflows!

```bash
# Just run your normal commands - thresholds adapt automatically
./scripts/ay-prod-cycle.sh orchestrator standup
./scripts/ay-yo-enhanced.sh run 10 false orchestrator
./scripts/ay-divergence-test.sh single orchestrator
```

---

## What's Changed

### Before (Hardcoded Values)
```bash
DIVERGENCE_RATE=0.1           # Same for all circles
CIRCUIT_BREAKER=0.7           # Universal threshold
CHECK_FREQUENCY=10            # Fixed monitoring
```

### After (Dynamic Adaptation)
```bash
# Automatically calculated from your data
orchestrator: divergence=0.05, circuit_breaker=0.70
assessor:     divergence=0.08, circuit_breaker=0.68
innovator:    divergence=0.12, circuit_breaker=0.65
```

Each circle gets **optimized thresholds** based on its actual performance history.

---

## Commands

### 1. View Current Thresholds

```bash
# All thresholds for a circle/ceremony
./scripts/ay-dynamic-thresholds.sh all orchestrator standup

# Individual threshold
./scripts/ay-dynamic-thresholds.sh circuit-breaker orchestrator standup
./scripts/ay-dynamic-thresholds.sh divergence orchestrator standup
./scripts/ay-dynamic-thresholds.sh frequency orchestrator standup
```

**Example output:**
```
═══════════════════════════════════════════
  Dynamic Threshold Calculator
  Circle: orchestrator | Ceremony: standup
═══════════════════════════════════════════

1. Circuit Breaker Threshold:
   Threshold: 0.7
   Confidence: 0.7
   Sample: 33 episodes

2. Divergence Rate:
   Rate: 0.05
   Sharpe: 0.0
   Confidence: NO_DATA
```

---

### 2. Run Production Ceremonies (ay prod)

**Basic usage** - Thresholds auto-calculated:
```bash
./scripts/ay-prod-cycle.sh orchestrator standup
```

**Override thresholds** if needed:
```bash
DIVERGENCE_RATE=0.15 ./scripts/ay-prod-cycle.sh orchestrator standup
```

**Learning cycles** - Uses dynamic thresholds:
```bash
./scripts/ay-prod-cycle.sh learn 10
```

---

### 3. Run Learning Cycles (ay yo)

**Default** - Shows dynamic thresholds before execution:
```bash
./scripts/ay-yo-enhanced.sh run 10 false orchestrator
```

**Output:**
```
═══════════════════════════════════════════
  Learning Cycles (n=10)
═══════════════════════════════════════════

[INFO] Dynamic thresholds: AVAILABLE
  • Dynamic thresholds for orchestrator:
    - Divergence rate: 0.05
    - Circuit breaker: 0.7
    - Check frequency: every 20 episodes

[INFO] Ceremony hooks: ENABLED
  • Observability checks: ON
```

**With analysis** - Runs causal analysis after cycles:
```bash
./scripts/ay-yo-enhanced.sh run 20 analyze orchestrator
```

---

### 4. Run Divergence Tests

**Single circle** - Uses dynamic thresholds throughout:
```bash
./scripts/ay-divergence-test.sh single orchestrator
```

**Multi-circle** - Tests all circles with adaptive thresholds:
```bash
./scripts/ay-divergence-test.sh multi
```

**Monitor live** - Watch thresholds adapt in real-time:
```bash
./scripts/ay-divergence-test.sh monitor
```

---

## Understanding the Output

### Circuit Breaker Threshold
**What it does:** Stops execution if success rate drops below this value

```
Threshold: 0.7
Confidence: HIGH
Sample: 33 episodes
```

- **Threshold**: Abort if success rate < 70%
- **Confidence**: HIGH = reliable (30+ observations), LOW = needs more data
- **Sample**: Number of episodes used for calculation

### Divergence Rate
**What it does:** Controls how much variance/exploration to inject

```
Rate: 0.05
Sharpe: 0.0
Confidence: NO_DATA
```

- **Rate**: 5% of episodes will have variance injected
- **Sharpe**: Risk-adjusted return ratio (higher = better performance)
- **Confidence**: NO_DATA = using conservative fallback

### Check Frequency
**What it does:** How often to evaluate metrics and circuit breaker

```
Check every: 20 episodes
Method: DATA_DRIVEN
```

- **Frequency**: Check after every 20 episodes
- **Method**: DATA_DRIVEN = calculated from observation density

---

## When to Override

Dynamic thresholds are conservative by default. Override when:

### Scenario 1: Need More Exploration
```bash
# Increase divergence for faster learning
DIVERGENCE_RATE=0.15 ./scripts/ay-prod-cycle.sh orchestrator standup
```

### Scenario 2: Too Sensitive to Failures
```bash
# Lower circuit breaker threshold
CIRCUIT_BREAKER_THRESHOLD=0.6 ./scripts/ay-divergence-test.sh single orchestrator
```

### Scenario 3: Need More Frequent Checks
```bash
# Check every 5 episodes instead of calculated frequency
CHECK_FREQUENCY=5 ./scripts/ay-divergence-test.sh single orchestrator
```

### Scenario 4: Disable Dynamic Thresholds Entirely
```bash
# Use all hardcoded values
export USE_DYNAMIC_THRESHOLDS=0
./scripts/ay-prod-cycle.sh orchestrator standup
```

---

## Data Requirements

Dynamic thresholds improve as you gather more data:

| Observations | Confidence | Recommendation |
|--------------|------------|----------------|
| 0-19 | VERY_LOW | Use fallback values (conservative) |
| 20-29 | LOW | Basic calculations, monitor closely |
| 30-49 | MEDIUM | Reliable thresholds, safe to use |
| 50-99 | HIGH | Accurate thresholds, fully adaptive |
| 100+ | VERY_HIGH | Statistically robust, trust fully |

**Your current status:** 33 observations = MEDIUM confidence ✅

---

## Monitoring Adaptation

Track how thresholds change over time:

```bash
# View raw observation data
sqlite3 agentdb.db "
SELECT 
  circle,
  ceremony,
  COUNT(*) as episodes,
  ROUND(AVG(success) * 100, 1) as success_pct,
  ROUND(AVG(duration_seconds), 1) as avg_duration
FROM observations
GROUP BY circle, ceremony
ORDER BY episodes DESC;
"
```

**Example output:**
```
orchestrator|standup|33|87.9|12.3
assessor|wsjf|28|82.1|15.7
innovator|retro|25|79.2|18.4
```

---

## Troubleshooting

### Issue: "NO_DATA" Confidence

**Symptom:**
```
Divergence Rate:
  Rate: 0.05
  Confidence: NO_DATA
```

**Cause:** Not enough observations for that circle/ceremony  
**Solution:** Run more episodes to build dataset (30+ recommended)

```bash
# Build baseline
./scripts/ay-prod-cycle.sh learn 20
```

---

### Issue: Thresholds Too Conservative

**Symptom:** Learning too slow, low variance  
**Cause:** Limited data defaults to safe values

**Solution:** Temporarily override while building data
```bash
DIVERGENCE_RATE=0.15 ./scripts/ay-prod-cycle.sh learn 30
```

After 30 more episodes, dynamic thresholds will be more accurate.

---

### Issue: Circuit Breaker Triggers Immediately

**Symptom:**
```
[✗] CIRCUIT BREAKER TRIGGERED
  Current Reward: 0.65
  Threshold: 0.7
```

**Cause:** Recent performance degradation or threshold too strict

**Solution 1:** Lower threshold temporarily
```bash
CIRCUIT_BREAKER_THRESHOLD=0.6 ./scripts/ay-divergence-test.sh single orchestrator
```

**Solution 2:** Investigate why performance dropped
```bash
./scripts/ay-yo-enhanced.sh explain orchestrator standup 0.65
```

---

### Issue: Thresholds Not Updating

**Symptom:** Same thresholds after running more episodes

**Cause:** Using override environment variables

**Solution:** Check and unset overrides
```bash
# Check current overrides
env | grep -E "DIVERGENCE_RATE|CIRCUIT_BREAKER|CHECK_FREQUENCY"

# Unset all
unset DIVERGENCE_RATE CIRCUIT_BREAKER_THRESHOLD CHECK_FREQUENCY

# Now run with dynamic thresholds
./scripts/ay-prod-cycle.sh orchestrator standup
```

---

## Best Practices

### 1. Start Conservative
Let dynamic thresholds use fallback values initially:
```bash
# First 30 episodes - build baseline
./scripts/ay-prod-cycle.sh learn 30
```

### 2. Monitor Adaptation
Check how thresholds change:
```bash
# Before learning
./scripts/ay-dynamic-thresholds.sh all orchestrator standup > before.txt

# After 50 episodes
./scripts/ay-prod-cycle.sh learn 50

# After learning
./scripts/ay-dynamic-thresholds.sh all orchestrator standup > after.txt

# Compare
diff before.txt after.txt
```

### 3. Override Sparingly
Only override when you have a specific reason:
```bash
# ✅ Good: Testing hypothesis
DIVERGENCE_RATE=0.2 ./scripts/ay-divergence-test.sh single orchestrator

# ❌ Bad: Overriding because "it feels right"
DIVERGENCE_RATE=0.5 CIRCUIT_BREAKER_THRESHOLD=0.5 ...
```

### 4. Build Per-Circle Data
Each circle needs its own dataset:
```bash
# Run each circle to build independent thresholds
for circle in orchestrator assessor innovator analyst; do
  ./scripts/ay-prod-cycle.sh $circle standup
done
```

---

## Integration Status

✅ **Fully Integrated:**
- `ay-divergence-test.sh` - Lines 26-40, 354-391
- `ay-prod-cycle.sh` - Lines 46-66, 192-224
- `ay-yo-enhanced.sh` - Lines 522-546

🔄 **Automatic:**
- Thresholds calculated at script initialization
- Per-ceremony adaptation during execution
- Graceful fallback to safe defaults

📊 **Data-Driven:**
- Uses your actual performance history
- Adapts to market regimes automatically
- No manual tuning required

---

## Next Steps

1. **Gather more data**: Run 50-100 episodes per circle
2. **Monitor adaptation**: Track threshold changes
3. **Tune overrides**: Only when data insufficient
4. **Review patterns**: Use `ay-yo-enhanced.sh insights`

---

## Related Documentation

- `DYNAMIC_THRESHOLDS_INTEGRATION.md` - Technical integration details
- `DYNAMIC_THRESHOLDS_ROAM.md` - Statistical methodology
- `WSJF_HARDCODED_VARIABLES_ANALYSIS.md` - WSJF-specific thresholds
