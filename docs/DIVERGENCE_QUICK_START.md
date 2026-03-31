# Divergence Testing - Quick Start Card

## 🚀 Fastest Path to Safe Testing

```bash
# 1. Start Phase 1 (safest circle, 50 episodes, 10% divergence)
./scripts/divergence-test.sh --phase 1 orchestrator

# 2. Wait for completion, review report

# 3. Validate learned skills
./scripts/validate-learned-skills.sh orchestrator

# 4. If successful, expand to Phase 2
./scripts/divergence-test.sh --phase 2
```

## 📊 What to Expect

### Phase 1 Results (Good)
- ✅ Skills learned: 3-5
- ✅ Avg reward: >0.8
- ✅ Failures: <5%
- ✅ Time: ~5-10 minutes

### Phase 1 Results (Bad)
- ❌ Skills: 0
- ❌ Reward: <0.7
- ❌ Many failures
- 🚨 ROLLBACK IMMEDIATELY

## 🆘 Emergency Commands

```bash
# Stop everything
export DIVERGENCE_RATE=0
export MPP_ENABLED=0

# Rollback database
./scripts/divergence-test.sh --rollback

# Check current status
npx agentdb stats
```

## 📈 Live Monitoring

```bash
# Terminal 1: Watch real-time
./scripts/divergence-test.sh --monitor-only

# Terminal 2: Run test
./scripts/divergence-test.sh --phase 1 orchestrator
```

## ✅ Success Checklist

After Phase 1:
- [ ] Report shows 3+ skills learned
- [ ] Average reward stayed >0.8
- [ ] No "hack"/"skip" patterns found
- [ ] Validation script passes
- [ ] You understand what was learned

✅ **PROCEED to Phase 2**

## ❌ Failure Response

If Phase 1 fails:
- [ ] Rollback: `./scripts/divergence-test.sh --rollback`
- [ ] Review: `npx agentdb stats`
- [ ] Check: `./scripts/validate-learned-skills.sh orchestrator`
- [ ] Adjust: Lower divergence or increase episodes
- [ ] Retry with safer parameters

## 🎛️ Parameter Tuning

### More Conservative
```bash
./scripts/divergence-test.sh \
  --divergence 0.05 \
  --episodes 25 \
  --circuit-breaker 0.85 \
  orchestrator
```

### More Aggressive
```bash
./scripts/divergence-test.sh \
  --divergence 0.15 \
  --episodes 100 \
  --circuit-breaker 0.7 \
  orchestrator
```

## 📞 Help

```bash
# Full help
./scripts/divergence-test.sh --help

# Read docs
cat docs/DIVERGENCE_TESTING.md

# Check summary
cat docs/DIVERGENCE_TESTING_SUMMARY.md
```

## ⏱️ Time Estimates

- Phase 1: 5-10 minutes
- Validation: 1-2 minutes
- Phase 2: 40-60 minutes
- Phase 3: 2-4 hours

## 🎯 Remember

1. **Backup happens automatically** - safe to experiment
2. **Circuit breakers protect you** - system will auto-abort
3. **Start small** - prove concept before scaling
4. **Validate results** - prevent reward hacking
5. **Monitor closely** - watch for issues early

---

**Most Important:** If in doubt, start with Phase 1 on `orchestrator`. It's the safest circle with the lowest risk!
