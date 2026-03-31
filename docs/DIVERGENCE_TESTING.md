# Controlled Divergence Testing Guide

## 🎯 Overview

This guide explains how to safely enable MPP (Model Predictive Policy) learning through controlled divergence testing. This allows the system to learn from imperfect executions while maintaining safety through circuit breakers and monitoring.

## ⚠️ Safety First

**Before you start:**
- ✅ Database is automatically backed up before each test
- ✅ Circuit breakers abort if reward drops too low
- ✅ Cascade failure detection prevents systemic issues
- ✅ Real-time monitoring tracks all metrics
- ✅ Rollback capability restores previous state
- ✅ Human-in-loop validation prevents reward hacking

## 🚀 Quick Start

### Phase 1: Safe Testing (RECOMMENDED START HERE)

Test a single isolated circle with minimal risk:

```bash
# Start with safest circle (orchestrator)
./scripts/divergence-test.sh --phase 1 orchestrator

# Or choose analyst (also safe)
./scripts/divergence-test.sh --phase 1 analyst
```

**What this does:**
- Runs 50 episodes with 10% divergence rate
- Monitors reward every 10 episodes
- Auto-aborts if reward drops below 0.7
- Generates detailed report at end

**Expected results:**
- Some episodes may have variance (this is intentional)
- System should learn patterns within 30-50 episodes
- Average reward should stay above 0.8
- 1-5 new skills should be detected

### Phase 2: Multi-Circle Testing

After Phase 1 succeeds, expand to multiple circles:

```bash
./scripts/divergence-test.sh --phase 2
```

**What this does:**
- Tests: orchestrator, analyst, innovator, intuitive
- Runs 100 episodes per circle with 15% divergence
- Monitors for cascade failures between circles
- 10-second cool-down between circles

### Phase 3: Production Learning (HIGH RISK)

**⚠️ Only proceed if Phases 1 & 2 succeeded:**

```bash
./scripts/divergence-test.sh --phase 3
```

## 📊 Monitoring

### Real-Time Dashboard

Watch metrics live during testing:

```bash
./scripts/divergence-test.sh --monitor-only
```

Updates every 10 seconds with:
- Episode count
- Skills learned
- Average reward
- Recent failures

### Check Current Status

```bash
./scripts/divergence-test.sh --report
```

## 🔍 Validation

After any test phase, validate learned skills:

```bash
./scripts/validate-learned-skills.sh orchestrator
```

**This checks for:**
- Anti-patterns (skip, bypass, shortcut)
- Low confidence skills (<0.7)
- Low usage patterns (<5 uses)
- Potential reward hacking

## 🛟 Emergency Procedures

### Rollback to Previous State

If something goes wrong:

```bash
./scripts/divergence-test.sh --rollback
```

This restores the most recent backup (keeps last 5 backups).

### Manual Backup

Before risky operations:

```bash
cp agentdb.db agentdb.db.manual_backup_$(date +%Y%m%d_%H%M%S)
```

### Disable Learning

Immediately stop divergence:

```bash
export DIVERGENCE_RATE=0
export MPP_ENABLED=0
```

## 🎛️ Advanced Usage

### Custom Divergence Rate

```bash
# Higher divergence = more variance, more learning potential
./scripts/divergence-test.sh --divergence 0.2 --episodes 100 orchestrator
```

### Custom Circuit Breaker

```bash
# Stricter threshold (abort sooner)
./scripts/divergence-test.sh --circuit-breaker 0.8 orchestrator

# More lenient (allow more degradation)
./scripts/divergence-test.sh --circuit-breaker 0.6 orchestrator
```

### Longer Test Run

```bash
# Statistical significance needs more data
./scripts/divergence-test.sh --episodes 200 orchestrator
```

### Skip Backup (NOT RECOMMENDED)

```bash
# Only if you have external backups
./scripts/divergence-test.sh --no-backup orchestrator
```

## 📈 Interpreting Results

### Good Signs ✅
- Skills learned: +3 to +10
- Average reward: 0.8 - 1.0
- Most episodes successful (>95%)
- No anti-patterns detected
- Patterns are generalizable

### Warning Signs ⚠️
- Skills learned: 0-2 (not enough variance)
- Average reward: 0.7 - 0.8 (degradation)
- Some cascade failures detected
- Fast/skip patterns found (investigate)

### Critical Issues ❌
- Skills learned: 0 after 100+ episodes
- Average reward: <0.7 (circuit breaker)
- Many cascade failures
- Shortcut/hack patterns (reward gaming)
- Rollback immediately

## 🧪 Example Workflows

### Conservative Testing (Production-Safe)

```bash
# 1. Backup manually first
cp agentdb.db agentdb.db.before_learning

# 2. Small test with strict circuit breaker
./scripts/divergence-test.sh \
  --divergence 0.05 \
  --episodes 25 \
  --circuit-breaker 0.85 \
  orchestrator

# 3. Validate results
./scripts/validate-learned-skills.sh orchestrator

# 4. If good, proceed to phase 2
./scripts/divergence-test.sh --phase 2
```

### Aggressive Testing (Research/Development)

```bash
# Higher variance, more learning potential
./scripts/divergence-test.sh \
  --divergence 0.25 \
  --episodes 200 \
  --circuit-breaker 0.6 \
  orchestrator
```

### Multi-Circle Parallel (Advanced)

```bash
# Terminal 1: Monitor
./scripts/divergence-test.sh --monitor-only

# Terminal 2: Run test
./scripts/divergence-test.sh --phase 2
```

## 📋 Circle Risk Classifications

### Safe (Start Here)
- **orchestrator**: Minimal dependencies, safe for learning
- **analyst**: Independent analysis, low risk

### Moderate
- **innovator**: Some cross-circle dependencies
- **intuitive**: Synthesis may affect downstream

### Risky (Avoid Until Proven)
- **assessor**: WSJF affects prioritization across circles
- **seeker**: Replenishment cascades to multiple areas

## 🔬 Understanding Divergence

### What is Divergence Rate?

- **0.0**: Perfect execution (no learning, deterministic)
- **0.1**: 10% chance of variance per decision point
- **0.2**: 20% chance of variance (high learning potential)
- **0.5+**: Too much chaos, likely to break

### How MPP Uses Variance

1. System occasionally makes "imperfect" choices
2. Episode still completes (with varied outcome)
3. MPP observes: context → action → outcome
4. Over time, patterns emerge: "When X, doing Y works better"
5. Skills extracted: generalizable decision policies
6. Future episodes use learned skills for better outcomes

### The Learning Curve

```
Episodes:    0     25    50    75   100
             ├─────┼─────┼─────┼─────┤
Reward:   1.0 ──┐
              0.9   └──┐
                   0.85 └──┐
                       0.9  └──┐
                            1.05 (improved!)
```

Initial dip is normal - system explores bad paths to learn from them.

## 🎯 Success Criteria

After Phase 1, you should see:
- [ ] 3+ skills learned
- [ ] Average reward >0.8
- [ ] <5% episode failures
- [ ] No anti-patterns in validation
- [ ] Human expert approves learned patterns

## 🚨 When to Abort

Stop immediately if:
- Circuit breaker triggers repeatedly
- Cascade failures across circles
- Reward drops below 0.6
- Anti-patterns detected in validation
- Domain expert rejects learned skills

## 📚 Additional Resources

- See `scripts/divergence-test.sh --help` for all options
- Review `scripts/ay-prod-cycle.sh` for ceremony details  
- Check `npx agentdb --help` for data inspection tools
- Read `docs/MPP_ARCHITECTURE.md` for theory

## ⚡ TL;DR - Safest Path

```bash
# 1. Start small
./scripts/divergence-test.sh --phase 1 orchestrator

# 2. Validate
./scripts/validate-learned-skills.sh orchestrator

# 3. If good, expand
./scripts/divergence-test.sh --phase 2

# 4. If bad, rollback
./scripts/divergence-test.sh --rollback
```

---

**Remember:** The goal is adaptive learning, not perfection. Some temporary degradation is expected and necessary for the system to learn better strategies. The safety mechanisms ensure this degradation stays within acceptable bounds.
