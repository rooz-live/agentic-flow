# Week 2 Quick Reference

## ✅ What's New

**Dynamic Weights & Variable Rewards** (v2.0)

- Rewards now range: **0.49-0.83** (was 0.5 static)
- Weights stored in database with history
- 5-level granular scoring per metric
- Pattern learning ready for Week 3

## 🎯 Key Commands

```bash
# Check weights
./scripts/ay-mpp-weights.sh get standup

# Set custom weights  
./scripts/ay-mpp-weights.sh set standup "alignment:0.4,blockers:0.3,actions:0.2,time:0.1"

# View history
./scripts/ay-mpp-weights.sh history standup 10

# Calculate reward
./scripts/ay-reward-calculator.sh standup "Team aligned, 1 blocker, 2 actions"

# Run ceremony
ENABLE_AUTO_LEARNING=1 ./scripts/ay-yo.sh orchestrator standup advisory

# Check governance
./scripts/ay-enhanced.sh | grep -A12 "Governance Review"
```

## 📊 Reward Examples

| Quality | Content | Reward |
|---------|---------|--------|
| Perfect | Fully aligned, no blockers, 3 actions, efficient | 0.83 |
| Good | Aligned, 1 blocker resolved, 2 actions | 0.79 |
| Medium | Discussed, 1 blocker, working on tasks | 0.67 |
| Poor | Unclear, 4 blockers, no actions, too long | 0.49 |

## 🏗️ Architecture

```
Ceremony → Reward Calculator → Weights DB → Weighted Score
                   ↓
              Multi-level
              Metrics (4)
              
Standup Metrics:
  - alignment (0.3)
  - blockers  (0.3)
  - actions   (0.2)
  - time      (0.2)
```

## ✓ Status

- **Corruption Score**: 0/6 (PASSING)
- **Reward Method**: v2 (measured, weighted)
- **Variance**: 68% (target: >30%)
- **Episodes**: 567+
- **Week 3 Ready**: ✅

## 🔄 Next: Week 3

Pattern Learning & Adaptive Weights (60-90min)

- Correlation analysis
- Automatic weight adjustment
- Confidence tracking
- Learning effectiveness metrics
