# ay yo & ay prod - Wrapper Integration Guide

## 🎯 Overview

Two production-ready wrappers that simplify ceremony execution with built-in safety, divergence control, and dynamic thresholds.

- **`ay yo`** - Development/Learning mode (faster iteration)
- **`ay prod`** - Production mode (safety-first)

## 📦 What Was Integrated

### 1. Dynamic Thresholds Integration
**File**: `scripts/ay-prod-cycle.sh`

Added `get_dynamic_thresholds()` function that:
- Loads statistical thresholds from `ay-dynamic-thresholds.sh`
- Calculates circuit breaker from historical reward distribution
- Determines divergence rate based on Sharpe ratio
- Sets check frequency based on risk volatility
- Falls back to safe defaults if no data available

**Usage**: Set `USE_DYNAMIC_THRESHOLDS=1` to enable

### 2. ay yo - Development Wrapper
**File**: `scripts/ay-yo.sh` (147 lines)

Quick, iterative development with controlled learning:
- Default 5% divergence for gentle exploration
- `--diverge` flag for 10% variance
- `--dynamic` flag for adaptive thresholds
- `--clean` flag for deterministic execution
- Quick commands: `test`, `learn`, `learn <N>`

### 3. ay prod - Production Wrapper  
**File**: `scripts/ay-prod.sh` (259 lines)

Production-safe execution with comprehensive checks:
- Pre-flight validation (database, backups, validity)
- Safe mode (default) - no divergence
- Adaptive mode - dynamic thresholds, no variance
- Learning mode - 5% divergence + human confirmation
- Post-execution summary
- `--check` flag for dry-run validation

## 🚀 Quick Start

### Development (ay yo)

```bash
# Quick test
./scripts/ay-yo.sh test

# Run with minimal learning
./scripts/ay-yo.sh orchestrator standup

# Run with 10% divergence
./scripts/ay-yo.sh --diverge analyst refine

# Use dynamic thresholds
./scripts/ay-yo.sh --dynamic orchestrator standup

# Learning cycles
./scripts/ay-yo.sh learn 10

# Clean deterministic run
./scripts/ay-yo.sh --clean orchestrator standup
```

### Production (ay prod)

```bash
# Pre-flight check (no execution)
./scripts/ay-prod.sh --check orchestrator standup

# Safe production run (default)
./scripts/ay-prod.sh orchestrator standup

# Adaptive mode (recommended)
./scripts/ay-prod.sh --adaptive analyst refine

# Learning mode (requires confirmation)
./scripts/ay-prod.sh --learn orchestrator standup
```

## 🎛️ Configuration Matrix

| Mode | Divergence | Dynamic Thresholds | Use Case |
|------|------------|-------------------|----------|
| **ay yo (default)** | 5% | No | Dev, quick iteration |
| **ay yo --diverge** | 10% | No | Active learning |
| **ay yo --dynamic** | Variable | Yes | Research, tuning |
| **ay yo --clean** | 0% | No | Debugging |
| **ay prod (default)** | 0% | No | Production, safe |
| **ay prod --adaptive** | 0% | Yes | Production, optimized |
| **ay prod --learn** | 5% | Yes | Production learning |

## 📊 How Dynamic Thresholds Work

When `USE_DYNAMIC_THRESHOLDS=1`:

### 1. Circuit Breaker Threshold
**Replaces**: Hardcoded 0.7  
**Calculates**: Mean - N*StdDev from last 30 days
- Large sample (>30): 2.5σ below mean
- Medium sample (>10): 3.0σ below mean
- Small sample (>5): 85% of mean
- No data: Conservative 0.5

### 2. Divergence Rate
**Replaces**: Hardcoded 0.1  
**Calculates**: Risk-adjusted based on Sharpe ratio
- Excellent performance (Sharpe >2.0): 30% divergence
- Good (>1.5): 20%
- Solid (>1.0): 15%
- Acceptable (>0.5): 10%
- Poor: 3-5%

### 3. Check Frequency
**Replaces**: Every 10 episodes  
**Calculates**: Based on reward volatility
- High volatility (>30%): Check every 5
- Elevated (>20%): Every 7
- Medium (>15%): Every 10
- Low (>10%): Every 15
- Very low: Every 20

## 🔒 Safety Features

### ay yo Safety
- Minimal defaults (5% divergence)
- No confirmation required
- Fast iteration
- Suitable for local dev

### ay prod Safety
✅ **Pre-flight checks:**
- Database existence
- Recent backup (<24h)
- Circle/ceremony validity
- Framework availability

✅ **Learning mode confirmation:**
- Human approval required
- Checklist validation
- Can cancel

✅ **Post-execution:**
- Summary with exit code
- Next steps guidance
- Validation recommendations

## 📝 Integration with Existing Scripts

### Updated Files

**`ay-prod-cycle.sh`:**
- Added `get_dynamic_thresholds()` function (lines 217-258)
- Integrated into `execute_ceremony()` (lines 283-286)
- Enabled via `USE_DYNAMIC_THRESHOLDS=1`

**New Files:**
- `scripts/ay-yo.sh` - Development wrapper
- `scripts/ay-prod.sh` - Production wrapper

**No Breaking Changes:**
- All existing scripts work unchanged
- Dynamic thresholds are opt-in
- Falls back to static values if unavailable

## 🎓 Usage Patterns

### Pattern 1: Development Iteration
```bash
# Quick feedback loop
for i in {1..10}; do
  ./scripts/ay-yo.sh test
  sleep 2
done
```

### Pattern 2: Controlled Learning
```bash
# Start learning mode
./scripts/ay-yo.sh --diverge orchestrator standup

# Monitor progress
./scripts/divergence-test.sh --report

# Validate skills
./scripts/validate-learned-skills.sh orchestrator
```

### Pattern 3: Production Deployment
```bash
# 1. Pre-flight check
./scripts/ay-prod.sh --check orchestrator standup

# 2. Safe initial run
./scripts/ay-prod.sh orchestrator standup

# 3. Adaptive mode (after validation)
./scripts/ay-prod.sh --adaptive orchestrator standup

# 4. Learning mode (after Phase 1 success)
./scripts/ay-prod.sh --learn orchestrator standup
```

### Pattern 4: Gradual Rollout
```bash
# Week 1: Safe mode
./scripts/ay-prod.sh orchestrator standup

# Week 2: Adaptive thresholds
./scripts/ay-prod.sh --adaptive orchestrator standup

# Week 3: Controlled learning (if metrics good)
./scripts/ay-prod.sh --learn orchestrator standup
```

## 🔍 Troubleshooting

### "Dynamic thresholds not available"
```bash
# Check if script exists
ls -l scripts/ay-dynamic-thresholds.sh

# Make executable
chmod +x scripts/ay-dynamic-thresholds.sh

# Verify database
ls -l agentdb.db
```

### "Pre-flight failed"
```bash
# Check which checks failed
./scripts/ay-prod.sh --check orchestrator standup

# Create backup if missing
cp agentdb.db agentdb.db.backup_$(date +%Y%m%d_%H%M%S)

# Verify database
npx agentdb stats
```

### "Learning mode cancelled"
This is by design - learning mode requires explicit confirmation in production.

## 🎯 Best Practices

### Development
1. **Start with `ay yo test`** - Quick validation
2. **Use `--clean` for debugging** - Deterministic behavior
3. **Use `--diverge` for learning** - Active exploration
4. **Monitor with `--report`** - Track progress

### Production
1. **Always run `--check` first** - Validate before execution
2. **Start with safe mode** - No surprises
3. **Graduate to adaptive** - After validation
4. **Enable learning last** - After Phase 1 success
5. **Keep recent backups** - Safety net

## 📈 Expected Behavior

### ay yo
- Fast execution (no pre-flight)
- Immediate feedback
- Gentle learning by default
- Suitable for 100s of runs/day

### ay prod
- Pre-flight adds 2-3 seconds
- Comprehensive validation
- Conservative defaults
- Suitable for critical ceremonies

## 🔗 Related Documentation

- `docs/DIVERGENCE_TESTING.md` - Full divergence framework
- `docs/DIVERGENCE_QUICK_START.md` - Quick reference
- `scripts/ay-dynamic-thresholds.sh` - Threshold calculations
- `scripts/divergence-test.sh` - Batch testing framework

## ⚡ TL;DR

```bash
# Development: Fast iteration with learning
./scripts/ay-yo.sh test                    # Quick test
./scripts/ay-yo.sh --diverge analyst refine  # With learning

# Production: Safe execution with checks
./scripts/ay-prod.sh --check orchestrator standup  # Validate
./scripts/ay-prod.sh orchestrator standup          # Execute

# Advanced: Dynamic thresholds
./scripts/ay-yo.sh --dynamic orchestrator standup
./scripts/ay-prod.sh --adaptive analyst refine
```

---

**Integration Complete!** Both wrappers are production-ready with full safety measures, dynamic threshold support, and seamless integration with existing ceremony execution.
