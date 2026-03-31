#!/usr/bin/env bash
# Test dynamic thresholds with yo.life observations data

export PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"

echo "═══════════════════════════════════════════"
echo "  Dynamic Threshold Validation"
echo "  Using observations table (yo.life data)"
echo "═══════════════════════════════════════════"
echo ""

# Check current data
echo "📊 Current Data:"
echo ""
OBS_COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM observations;")
CIRCLES=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(DISTINCT circle) FROM observations;")
ORCH_COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM observations WHERE circle='orchestrator';")

echo "  Total Observations: $OBS_COUNT"
echo "  Unique Circles: $CIRCLES"
echo "  Orchestrator: $ORCH_COUNT"
echo ""

#═══════════════════════════════════════════
# 1. CIRCUIT BREAKER (Using observations)
#═══════════════════════════════════════════

echo "1️⃣ Circuit Breaker Threshold"
echo "─────────────────────────────"

CIRCUIT_RESULT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<'SQL'
WITH recent_stats AS (
  SELECT 
    AVG(CAST(success AS REAL)) as mean_reward,
    SQRT(SUM((CAST(success AS REAL) - (SELECT AVG(CAST(success AS REAL)) FROM observations WHERE circle='orchestrator')) * (CAST(success AS REAL) - (SELECT AVG(CAST(success AS REAL)) FROM observations WHERE circle='orchestrator'))) / (COUNT(*) - 1)) as stddev_reward,
    COUNT(*) as sample_size,
    (SELECT AVG(CAST(success AS REAL)) FROM observations WHERE circle='orchestrator') as historical_mean
  FROM observations 
  WHERE circle='orchestrator' 
    AND success=1
)
SELECT 
  CASE 
    WHEN sample_size >= 30 THEN mean_reward - (2.5 * stddev_reward)
    WHEN sample_size >= 10 THEN mean_reward - (3.0 * stddev_reward)
    WHEN sample_size >= 5 THEN historical_mean * 0.70
    ELSE 0.50
  END as threshold,
  mean_reward,
  stddev_reward,
  sample_size
FROM recent_stats;
SQL
)

THRESHOLD=$(echo "$CIRCUIT_RESULT" | cut -d'|' -f1)
MEAN=$(echo "$CIRCUIT_RESULT" | cut -d'|' -f2)
STDDEV=$(echo "$CIRCUIT_RESULT" | cut -d'|' -f3)
N=$(echo "$CIRCUIT_RESULT" | cut -d'|' -f4)

echo "  Hardcoded:        0.70"
echo "  Dynamic:          $THRESHOLD"
echo "  Mean Success:     $MEAN"
echo "  Std Dev:          $STDDEV"
echo "  Sample Size:      $N"
echo "  Method:           ${N} samples → 2.5-sigma"
echo ""

#═══════════════════════════════════════════
# 2. DEGRADATION THRESHOLD
#═══════════════════════════════════════════

echo "2️⃣ Degradation Threshold"
echo "─────────────────────────"

DEGRADATION_RESULT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<'SQL'
WITH stats AS (
  SELECT 
    AVG(CAST(success AS REAL)) as mean_success,
    SQRT(SUM((CAST(success AS REAL) - (SELECT AVG(CAST(success AS REAL)) FROM observations WHERE circle='orchestrator')) * (CAST(success AS REAL) - (SELECT AVG(CAST(success AS REAL)) FROM observations WHERE circle='orchestrator'))) / (COUNT(*) - 1)) as stddev_success,
    COUNT(*) as n
  FROM observations 
  WHERE circle='orchestrator'
)
SELECT 
  CASE
    WHEN n >= 30 THEN mean_success - (1.96 * stddev_success / SQRT(n))
    WHEN n >= 10 THEN mean_success - (2.5 * stddev_success / SQRT(n))
    ELSE mean_success * 0.80
  END as threshold,
  mean_success,
  stddev_success / NULLIF(mean_success, 0) as coeff_variation,
  n
FROM stats;
SQL
)

DEG_THRESHOLD=$(echo "$DEGRADATION_RESULT" | cut -d'|' -f1)
DEG_MEAN=$(echo "$DEGRADATION_RESULT" | cut -d'|' -f2)
DEG_CV=$(echo "$DEGRADATION_RESULT" | cut -d'|' -f3)
DEG_N=$(echo "$DEGRADATION_RESULT" | cut -d'|' -f4)

# Hardcoded comparison
HARDCODED_DEG=$(echo "scale=4; $DEG_MEAN * 0.90" | bc)

echo "  Hardcoded (10% drop): $HARDCODED_DEG"
echo "  Dynamic (95% CI):     $DEG_THRESHOLD"
echo "  Mean Success:         $DEG_MEAN"
echo "  Coeff Variation:      $DEG_CV"
echo "  Sample Size:          $DEG_N"
echo ""

# Risk classification
if (( $(echo "$DEG_CV > 0.30" | bc -l) )); then
  echo "  Volatility: HIGH (CV > 0.30)"
elif (( $(echo "$DEG_CV > 0.15" | bc -l) )); then
  echo "  Volatility: MEDIUM (CV > 0.15)"
else
  echo "  Volatility: LOW (CV < 0.15)"
fi
echo ""

#═══════════════════════════════════════════
# 3. CASCADE FAILURE THRESHOLD
#═══════════════════════════════════════════

echo "3️⃣ Cascade Failure Threshold"
echo "─────────────────────────────"

CASCADE_RESULT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<'SQL'
WITH episode_stats AS (
  SELECT 
    AVG(duration_seconds) as avg_duration_min,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as baseline_failure_rate,
    COUNT(*) as total_obs
  FROM observations
  WHERE circle='orchestrator'
)
SELECT 
  CASE 
    WHEN total_obs >= 50 THEN CAST(ROUND(baseline_failure_rate * 100 * 3) AS INTEGER)
    WHEN total_obs >= 20 THEN CAST(ROUND(MAX(5, baseline_failure_rate * 100 * 2.5)) AS INTEGER)
    ELSE CAST(ROUND(MAX(5, (60.0 / NULLIF(avg_duration_min, 1)) * 2.0)) AS INTEGER)
  END as failure_threshold,
  CAST(MAX(5, avg_duration_min * 3) AS INTEGER) as window_minutes,
  baseline_failure_rate,
  total_obs
FROM episode_stats;
SQL
)

CAS_THRESHOLD=$(echo "$CASCADE_RESULT" | cut -d'|' -f1)
CAS_WINDOW=$(echo "$CASCADE_RESULT" | cut -d'|' -f2)
CAS_BASELINE=$(echo "$CASCADE_RESULT" | cut -d'|' -f3)
CAS_N=$(echo "$CASCADE_RESULT" | cut -d'|' -f4)

echo "  Hardcoded:            10 failures in 5 minutes"
echo "  Dynamic:              $CAS_THRESHOLD failures in $CAS_WINDOW minutes"
echo "  Baseline Failure:     $CAS_BASELINE"
echo "  Sample Size:          $CAS_N"
echo ""

#═══════════════════════════════════════════
# 4. CHECK FREQUENCY
#═══════════════════════════════════════════

echo "4️⃣ Check Frequency"
echo "──────────────────"

FREQ_RESULT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" <<'SQL'
WITH risk_factors AS (
  SELECT 
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    AVG(duration_seconds) as avg_duration
  FROM observations
  WHERE circle='orchestrator'
)
SELECT 
  CASE
    WHEN failure_rate > 0.25 THEN 3
    WHEN failure_rate > 0.15 THEN 5
    WHEN failure_rate > 0.08 THEN 8
    WHEN failure_rate > 0.03 THEN 12
    ELSE 15
  END as check_every_n_episodes,
  failure_rate,
  avg_duration
FROM risk_factors;
SQL
)

CHECK_FREQ=$(echo "$FREQ_RESULT" | cut -d'|' -f1)
CHECK_FAIL_RATE=$(echo "$FREQ_RESULT" | cut -d'|' -f2)
CHECK_DUR=$(echo "$FREQ_RESULT" | cut -d'|' -f3)

echo "  Hardcoded:            Every 10 episodes"
echo "  Dynamic:              Every $CHECK_FREQ episodes"
echo "  Failure Rate:         $CHECK_FAIL_RATE"
echo "  Avg Duration:         ${CHECK_DUR}s"
echo ""

#═══════════════════════════════════════════
# 5. ROAM RISK COMPARISON
#═══════════════════════════════════════════

echo "═══════════════════════════════════════════"
echo "  ROAM Risk Summary"
echo "═══════════════════════════════════════════"
echo ""

# Calculate risk reduction percentages
CIRCUIT_DIFF=$(echo "scale=2; (($THRESHOLD - 0.70) / 0.70) * 100" | bc)
DEG_DIFF=$(echo "scale=2; (($DEG_THRESHOLD - $HARDCODED_DEG) / $HARDCODED_DEG) * 100" | bc)

echo "Circuit Breaker:"
echo "  Hardcoded: 70% (regime-blind)"
echo "  Dynamic:   ${THRESHOLD} (adapts to data)"
if (( $(echo "$THRESHOLD > 0.70" | bc -l) )); then
  echo "  ✅ Dynamic is ${CIRCUIT_DIFF}% more conservative (lower false stops)"
else
  echo "  ⚠️ Dynamic is ${CIRCUIT_DIFF}% less conservative (data suggests safety)"
fi
echo ""

echo "Degradation:"
echo "  Hardcoded: $HARDCODED_DEG (arbitrary 10%)"
echo "  Dynamic:   $DEG_THRESHOLD (95% CI)"
if (( $(echo "$DEG_THRESHOLD > $HARDCODED_DEG" | bc -l) )); then
  echo "  ✅ Dynamic allows ${DEG_DIFF}% more tolerance (variance-adjusted)"
else
  echo "  ⚠️ Dynamic is ${DEG_DIFF}% tighter (low variance detected)"
fi
echo ""

echo "Check Frequency:"
echo "  Hardcoded: Every 10 episodes"
echo "  Dynamic:   Every $CHECK_FREQ episodes"
if [[ $CHECK_FREQ -lt 10 ]]; then
  echo "  ⚠️ More frequent (${CHECK_FAIL_RATE} failure rate warrants closer monitoring)"
elif [[ $CHECK_FREQ -gt 10 ]]; then
  echo "  ✅ Less frequent (stable performance allows efficiency)"
else
  echo "  ✓ Same frequency (optimal for current risk)"
fi
echo ""

echo "═══════════════════════════════════════════"
echo "  Recommendation"
echo "═══════════════════════════════════════════"
echo ""

# Overall assessment
TOTAL_WARNINGS=0
if (( $(echo "$DEG_CV > 0.20" | bc -l) )); then
  ((TOTAL_WARNINGS++))
fi
if (( $(echo "$CAS_BASELINE > 0.10" | bc -l) )); then
  ((TOTAL_WARNINGS++))
fi
if [[ $CHECK_FREQ -le 5 ]]; then
  ((TOTAL_WARNINGS++))
fi

if [[ $TOTAL_WARNINGS -eq 0 ]]; then
  echo "✅ LOW RISK: System is stable, dynamic thresholds"
  echo "   recommend standard monitoring."
  echo ""
  echo "   Safe to proceed with divergence testing at 10-15%."
elif [[ $TOTAL_WARNINGS -le 1 ]]; then
  echo "⚠️ MEDIUM RISK: Some volatility detected, dynamic"
  echo "   thresholds recommend increased caution."
  echo ""
  echo "   Proceed with divergence at 5-8% and monitor closely."
else
  echo "🔴 HIGH RISK: Significant instability detected,"
  echo "   dynamic thresholds recommend holding."
  echo ""
  echo "   Complete baseline stabilization before divergence."
fi
echo ""
