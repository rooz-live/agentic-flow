# Causal Learning Integration

## Overview

The agentic-flow system now includes fully integrated causal learning capabilities that automatically track, analyze, and explain ceremony performance across all circles.

## ✅ Integrated Features

### 1. **Automatic Observation Recording**
Every ceremony execution via `ay-prod-cycle.sh` automatically records causal observations to the database.

```bash
./scripts/ay-prod-cycle.sh assessor wsjf
# ✅ Auto-records: circle=assessor, ceremony=wsjf, treatment=WITH/WITHOUT skills
```

### 2. **Auto-Analysis in Learning Loops**
The `ay-prod-learn-loop.sh` script now supports `--analyze` flag for automatic analysis every 5 iterations.

```bash
# Run 10 iterations with auto-analysis every 5
./scripts/ay-prod-learn-loop.sh --analyze 10

# Output:
# [AUTO-ANALYZE] Running causal analysis after 30 observations...
# Final Causal Analysis after all iterations
```

### 3. **Dashboard Insights & Explanations**
The `ay-yo-enhanced.sh` dashboard now includes:
- `insights` command - View causal learning summary
- `explain` command - Get causal explanations for low performance

```bash
# View insights
./scripts/ay-yo-enhanced.sh insights

# Explain low performance
./scripts/ay-yo-enhanced.sh explain assessor wsjf 0.35
# Output: "assessor at 35% BECAUSE missing wsjf skills (+46% uplift proven)"
```

### 4. **Comprehensive Reporting Tool**
New `ay-insights` CLI for advanced analysis and reporting:

```bash
# Show statistics
./scripts/ay-insights stats

# Analyze experiments
./scripts/ay-insights analyze 50

# Explain multiple performance levels
./scripts/ay-insights explain assessor wsjf 0.30,0.35,0.40

# Generate report
./scripts/ay-insights report

# Export data
./scripts/ay-insights export csv reports/data.csv
./scripts/ay-insights export json reports/data.json
```

## 🔄 Complete Workflow

### Quick Start (30-observation sprint)
```bash
# 1. Run ceremonies with auto-analysis
./scripts/ay-prod-learn-loop.sh --analyze 5

# 2. View statistics
./scripts/ay-insights stats

# 3. Explain low performers
./scripts/ay-insights explain assessor wsjf
```

### Production Workflow
```bash
# 1. Continuous learning (100 iterations with analysis)
./scripts/ay-prod-learn-loop.sh --analyze 20

# 2. Check what's been collected
./scripts/ay-insights stats

# 3. Deep analysis
./scripts/ay-insights analyze 100

# 4. Multi-level explanations
./scripts/ay-insights explain assessor wsjf 0.30,0.35,0.40,0.45

# 5. Generate comprehensive report
./scripts/ay-insights report reports/weekly-insights.txt
```

## 📊 Commands Reference

### ay-prod-learn-loop.sh
```bash
./scripts/ay-prod-learn-loop.sh [--analyze] <iterations>

# Examples:
./scripts/ay-prod-learn-loop.sh 10              # 10 iterations (no analysis)
./scripts/ay-prod-learn-loop.sh --analyze 10    # 10 iterations + auto-analysis
./scripts/ay-prod-learn-loop.sh --parallel 20   # Parallel mode
./scripts/ay-prod-learn-loop.sh --sequential 5  # Sequential mode
```

### ay-yo-enhanced.sh
```bash
./scripts/ay-yo-enhanced.sh <command>

# Commands:
dashboard                # Main cockpit
insights                 # Causal learning summary
explain <circle> <ceremony> [perf]  # Explain performance
spawn <circle> <ceremony>           # Run ceremony

# Examples:
./scripts/ay-yo-enhanced.sh insights
./scripts/ay-yo-enhanced.sh explain assessor wsjf 0.35
```

### ay-insights
```bash
./scripts/ay-insights <command>

# Commands:
stats                    # Database statistics
analyze [N]              # Analyze N observations
explain <circle> <ceremony> [perfs]  # Explain performance
report [file]            # Generate report
export [format] [file]   # Export data (csv/json)

# Examples:
./scripts/ay-insights stats
./scripts/ay-insights analyze 50
./scripts/ay-insights explain assessor wsjf 0.30,0.35,0.40
./scripts/ay-insights report
./scripts/ay-insights export csv
```

## 🎯 Key Metrics

### Observation Requirements
- **Minimum**: 30 observations for reliable analysis
- **Recommended**: 50+ observations per circle/ceremony pair
- **Optimal**: 100+ observations for high confidence

### Treatment Balance
- **Target**: ~50% WITH skills, ~50% WITHOUT skills
- **Check**: `./scripts/ay-insights stats` shows treatment distribution

### Analysis Triggers
- Auto-analysis runs every 5 iterations when `--analyze` flag is used
- Final analysis runs at the end of learning loop
- Manual analysis available via `ay-insights analyze`

## 🔬 Database Schema

Location: `src/integrations/causal-learning.db` (SQLite)

**Tables**:
- `experiments` - Causal experiment definitions
- `observations` - Individual ceremony observations

**Query Examples**:
```bash
# Coverage by circle/ceremony
sqlite3 src/integrations/causal-learning.db \
  "SELECT circle, ceremony, COUNT(*) FROM observations GROUP BY circle, ceremony;"

# Treatment balance
sqlite3 src/integrations/causal-learning.db \
  "SELECT treatment, COUNT(*) FROM observations GROUP BY treatment;"
```

## 🚀 Production Maturity Path

### Phase 1: Data Collection (Days 1-3)
```bash
# Run diverse ceremonies
for circle in assessor orchestrator analyst; do
  for ceremony in wsjf standup review; do
    ./scripts/ay-prod-cycle.sh $circle $ceremony
  done
done
```

### Phase 2: Initial Analysis (Days 4-7)
```bash
# Analyze accumulated data
./scripts/ay-insights analyze 30

# Identify patterns
./scripts/ay-insights explain assessor wsjf
```

### Phase 3: Continuous Learning (Ongoing)
```bash
# Daily learning cycles with auto-analysis
./scripts/ay-prod-learn-loop.sh --analyze 10

# Weekly reports
./scripts/ay-insights report reports/week-$(date +%U).txt
```

## 📈 Expected Outcomes

### After 30 observations
- Initial causal patterns detected
- Basic skill gap identification

### After 50 observations
- Reliable uplift measurements (e.g., "+46% with skills")
- Actionable recommendations per circle/ceremony

### After 100+ observations
- High-confidence causal models
- Predictive performance optimization
- Automated skill training prioritization

## 🔧 Troubleshooting

### No data found
```bash
# Check database
./scripts/ay-insights stats

# Run ceremonies to collect data
./scripts/ay-prod-learn-loop.sh 5
```

### Low observation count
```bash
# Fast 30-observation sprint
for i in {1..30}; do 
  ./scripts/ay-prod-cycle.sh assessor wsjf & 
  sleep 0.5
done
wait
```

### Imbalanced treatments
```bash
# Check balance
./scripts/ay-insights stats

# Run more ceremonies to balance
./scripts/ay-prod-learn-loop.sh 10
```

## 📚 Related Documentation

- [Causal Learning Theory](./causal-learning-theory.md)
- [Circle Ceremonies](./circle-ceremonies.md)
- [Production Cycle Guide](./production-cycle.md)

## 🎓 Next Steps

1. **Immediate**: Run `./scripts/ay-prod-learn-loop.sh --analyze 10`
2. **Short-term**: Accumulate 50+ observations per circle
3. **Long-term**: Set up automated daily learning cycles

---

**Key Innovation**: This integration closes the Build-Measure-Learn loop with *causal* feedback, not just correlational metrics. You now know **WHY** ceremonies perform differently, not just **THAT** they differ.
