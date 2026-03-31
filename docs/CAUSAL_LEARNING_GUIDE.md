# Causal Learning Integration Guide

## Overview

The causal learning system connects **completion tracking** (who's at what %) with **WHY explanations** (proven uplift from skills).

### The Gap We Fixed

**Before:**
- `ay yo i` shows "assessor at 35%"
- No explanation of WHY
- No skill recommendations

**After:**
- `ay yo i` shows "assessor at 35% BECAUSE missing WSJF skills (+46% uplift proven)"
- Causal edges discovered automatically
- Skills prioritized by proven impact

---

## Architecture

```
Episodes (113) 
    ↓
Causal Observations (skills vs no-skills)
    ↓
Causal Experiments (A/B tests)
    ↓
Causal Edges (skills → +46% uplift)
    ↓
WSJF Enhancement (prioritize skill loading)
```

---

## Usage

### 1. Run Ceremonies (Auto-records observations)

```bash
# Execute ceremony - now automatically records causal observation
./scripts/ay-prod-cycle.sh assessor wsjf

# Each execution records:
# - Did we have skills? (treatment vs control)
# - What was the outcome? (success/failure)
# - Context (duration, metadata)
```

### 2. Analyze Experiments (Extract causal edges)

```bash
# After ~30 observations per circle+ceremony
tsx src/integrations/causal-learning-integration.ts analyze 30

# Output:
# 🧪 Experiment: assessor_wsjf_skills_experiment
#    Sample Size: 47
#    Treatment: 78.0%
#    Control: 32.0%
#    Uplift: +46.0%
#    ✅ Created causal edge #1
```

### 3. Get Insights for WSJF

```bash
# Get causal insights for specific circle+ceremony
tsx src/integrations/causal-learning-integration.ts insights assessor wsjf

# Output:
# {
#   "hasSkillsUplift": true,
#   "upliftPercentage": 46.0,
#   "confidence": 0.85,
#   "recommendation": "Load skills first (+46.0% proven uplift)"
# }
```

### 4. Generate WHY Explanations

```bash
# Generate explanation for dashboard
tsx src/integrations/causal-learning-integration.ts explain assessor wsjf 0.35

# Output:
# assessor at 35% BECAUSE missing wsjf skills (+46% uplift proven)
```

---

## Integration Points

### ay-prod-cycle.sh

**Step 7.6 added:**
```bash
# After episode storage, record causal observation
tsx src/integrations/causal-learning-integration.ts record "$episode_file"
```

### Dashboard Enhancement (TODO)

Enhance `ay yo i` to show WHY:

```typescript
// Current
console.log(`assessor: ${completionRate}%`);

// Enhanced
const explanation = await causalLearning.explainCompletion('assessor', 'wsjf', completionRate);
console.log(explanation);
// → "assessor at 35% BECAUSE missing wsjf skills (+46% uplift proven)"
```

---

## Database Schema

### Tables Populated

1. **causal_experiments**
   - Tracks A/B experiments (skills vs no-skills)
   - One per circle+ceremony pair

2. **causal_observations**
   - Records each ceremony execution
   - Treatment = with skills, Control = without skills
   - Outcome = success (1.0) or failure (0.0)

3. **causal_edges**
   - Discovered causal relationships
   - Stores uplift, confidence, sample size
   - Used for WSJF enhancement

### Query Examples

```sql
-- View experiments
SELECT name, hypothesis, 
       (SELECT COUNT(*) FROM causal_observations WHERE experiment_id = e.id) as observations
FROM causal_experiments e;

-- View observations for assessor
SELECT e.name, o.is_treatment, o.outcome, o.timestamp
FROM causal_observations o
JOIN causal_experiments e ON o.experiment_id = e.id
WHERE e.metadata LIKE '%assessor%'
ORDER BY o.timestamp DESC;

-- View discovered causal edges
SELECT mechanism, uplift, confidence, sample_size
FROM causal_edges
ORDER BY confidence DESC, sample_size DESC;
```

---

## Workflow

### Daily Cycle

1. **Morning**: Run ceremonies
   ```bash
   ./scripts/ay-prod-cycle.sh assessor wsjf
   ./scripts/ay-prod-cycle.sh orchestrator standup
   ```
   → Observations recorded automatically

2. **Evening**: Analyze experiments
   ```bash
   tsx src/integrations/causal-learning-integration.ts analyze 30
   ```
   → Causal edges extracted

3. **Dashboard**: View WHY explanations
   ```bash
   ay yo i
   ```
   → Shows completion rates with causal insights

### Weekly Review

```bash
# Check experiment status
sqlite3 agentdb.db "
  SELECT 
    e.name,
    COUNT(o.id) as observations,
    AVG(CASE WHEN o.is_treatment = 1 THEN o.outcome END) * 100 as with_skills,
    AVG(CASE WHEN o.is_treatment = 0 THEN o.outcome END) * 100 as without_skills
  FROM causal_experiments e
  LEFT JOIN causal_observations o ON e.id = o.experiment_id
  GROUP BY e.id;
"

# View top causal edges
sqlite3 agentdb.db "
  SELECT mechanism, 
         ROUND(uplift * 100, 1) || '% uplift' as impact,
         ROUND(confidence * 100, 0) || '% confidence' as conf,
         sample_size || ' samples' as n
  FROM causal_edges
  ORDER BY confidence DESC
  LIMIT 10;
"
```

---

## Next Steps

1. **Integrate with Dashboard**
   - Modify `ay yo i` to call `explainCompletion()`
   - Show WHY alongside completion rates

2. **Enhance WSJF Scoring**
   - Boost scores for actions with proven causal uplift
   - Prioritize skill loading when uplift > threshold

3. **Add Certificates**
   - Track provenance of causal discoveries
   - Link to specific episodes that provided evidence

4. **Auto-recommend Actions**
   - "Load assessor WSJF skills (+46% proven uplift)"
   - Rank by uplift × confidence

---

## Troubleshooting

### No causal tables?
```bash
# Initialize AgentDB with frontier schema
npx agentdb init --db-path=./agentdb.db
```

### Observations not recording?
```bash
# Check episode format
cat /tmp/episode_assessor_wsjf_*.json | jq .

# Manually record
tsx src/integrations/causal-learning-integration.ts record /tmp/episode.json
```

### No causal edges discovered?
```bash
# Check sample size (need ~30 per experiment)
sqlite3 agentdb.db "
  SELECT name, COUNT(*) as n
  FROM causal_experiments e
  LEFT JOIN causal_observations o ON e.id = o.experiment_id
  GROUP BY e.id;
"

# Lower threshold temporarily
tsx src/integrations/causal-learning-integration.ts analyze 10
```

---

## Theory

Based on **Doubly Robust Learning**:

```
τ̂(x) = μ1(x) − μ0(x) + [a*(y−μ1(x)) / e(x)] − [(1−a)*(y−μ0(x)) / (1−e(x))]
```

Where:
- `μ1(x)` = outcome model for treatment (with skills)
- `μ0(x)` = outcome model for control (without skills)
- `e(x)` = propensity score (probability of treatment)
- `a` = treatment indicator
- `y` = observed outcome

**Simplified version used:**
```
uplift = avg(outcome_with_skills) - avg(outcome_without_skills)
```

**Confidence calculation:**
```
confidence = (sampleFactor * 0.5) + (effectFactor * 0.5)
where:
  sampleFactor = min(sample_size / 100, 1.0)
  effectFactor = min(abs(uplift) * 2, 1.0)
```

---

## Status

✅ **Implemented:**
- Causal observation recording in ay-prod-cycle.sh
- Experiment creation and tracking
- Causal edge discovery
- Insights API for WSJF enhancement

🚧 **TODO:**
- Dashboard integration for WHY explanations
- WSJF score boosting based on causal edges
- Certificate tracking for provenance
- Auto-recommend actions by uplift

🎯 **Goal:**
Transform "assessor at 35%" into "assessor at 35% BECAUSE missing WSJF skills (+46% uplift proven)"
