# ROAM Quick Reference Guide

## 🚀 One-Line Commands

### Check System Status
```bash
scripts/ay-yo-integrate.sh dashboard
```

### Monitor ROAM Risks
```bash
scripts/ay-yo-monitor-roam.sh
```

### Clean Up Resources (M1)
```bash
scripts/ay-yo-cleanup.sh
```

### Balance Circle Equity (M3)
```bash
scripts/ay-yo-integrate.sh all
```

---

## 🎯 Complete WSJF Workflow

```bash
# 1. Initialize
scripts/ay-yo-integrate.sh init

# 2. Check current risks
scripts/ay-yo-monitor-roam.sh

# 3. Balance circles (if R3 detected)
scripts/ay-yo-integrate.sh all

# 4. Clean resources (if R1 detected)
scripts/ay-yo-cleanup.sh

# 5. View dashboard
scripts/ay-yo-integrate.sh dashboard

# 6. Analyze state
scripts/ay-yo-continuous-improvement.sh analyze
```

---

## 📊 Risk-Specific Commands

### R1: Resource Exhaustion
```bash
# Check disk/memory
df -h ~/Documents/code/investing/agentic-flow
vm_stat | grep "Pages free"

# Cleanup
scripts/ay-yo-cleanup.sh

# Vacuum database
sqlite3 agentdb.db "VACUUM;"
```

### R2: Learning Loop Instability
```bash
# Check observations
sqlite3 agentdb.db "SELECT COUNT(*) FROM observations;"

# Check variance
cat .dor-metrics/*.json | jq -r '.compliance_percentage' | awk '{sum+=$1; n++} END {print sum/n}'

# Build baseline (need 30+ observations)
scripts/ay-yo-continuous-improvement.sh run 20 quick
```

### R3: Circle Equity Imbalance
```bash
# Check equity
scripts/ay-yo-integrate.sh dashboard | grep "Circle Equity" -A 10

# Balance with all circles
scripts/ay-yo-integrate.sh all

# Or deep mode
scripts/ay-yo-continuous-improvement.sh run 5 deep

# Manual rebalancing
scripts/ay-yo-integrate.sh exec assessor wsjf advisory
scripts/ay-yo-integrate.sh exec analyst refine advisory
scripts/ay-yo-integrate.sh exec innovator retro advisory
scripts/ay-yo-integrate.sh exec seeker replenish advisory
scripts/ay-yo-integrate.sh exec intuitive synthesis advisory
```

### R4: Daemon Runaway
```bash
# Check for daemons
pgrep -f "ay-yo-continuous-improvement.sh daemon"

# Kill if multiple
pkill -f "ay-yo-continuous-improvement.sh daemon"

# Check system load
uptime

# Check all ay-yo processes
ps aux | grep ay-yo
```

---

## 🔄 Production Deployment

### Option 1: Crontab (Recommended)
```bash
crontab -e
```

Add these lines:
```cron
# Quick cycles: Every 2 hours during work day
0 9-17/2 * * 1-5 cd ~/Documents/code/investing/agentic-flow && scripts/ay-yo-continuous-improvement.sh run 3 quick

# Full cycles: Twice daily
0 9,15 * * 1-5 cd ~/Documents/code/investing/agentic-flow && scripts/ay-yo-continuous-improvement.sh run 2 full

# Deep cycles: Weekly Friday afternoon
0 16 * * 5 cd ~/Documents/code/investing/agentic-flow && scripts/ay-yo-continuous-improvement.sh run 5 deep

# Cleanup: Daily at midnight
0 0 * * * cd ~/Documents/code/investing/agentic-flow && scripts/ay-yo-cleanup.sh

# Monitoring: Every 6 hours
0 */6 * * * cd ~/Documents/code/investing/agentic-flow && scripts/ay-yo-monitor-roam.sh
```

### Option 2: Daemon Mode
```bash
# Start daemon (every 30 min, 3 cycles)
nohup scripts/ay-yo-continuous-improvement.sh daemon 1800 3 > /tmp/ay-yo-daemon.log 2>&1 &
echo $! > /tmp/ay-yo-daemon.pid

# Monitor
tail -f /tmp/ay-yo-daemon.log

# Stop
kill $(cat /tmp/ay-yo-daemon.pid)
```

---

## 📊 Risk Thresholds

### ✅ Low Risk (Accept & Monitor)
- Circle equity: 10-25% per circle
- Compliance: 70-100%
- Disk usage: <70%
- Learning variance: <20%

### ⚠️ Medium Risk (Mitigate Proactively)
- Circle equity: 5-10% or 25-40%
- Compliance: 60-70%
- Disk usage: 70-85%
- Learning variance: 20-40%

### 🔴 High Risk (Immediate Action)
- Circle equity: <5% or >40%
- Compliance: <60%
- Disk usage: >85%
- Learning variance: >40%
- Multiple daemons running

---

## 🛠️ Troubleshooting

### Issue: Disk at 89%
```bash
# Solution: Clean up
scripts/ay-yo-cleanup.sh

# Manual cleanup if needed
find .dor-metrics/ -name "*.json" -mtime +30 -delete
find .episodes/ -name "*.json" -mtime +60 -delete
```

### Issue: Circle equity 100% orchestrator
```bash
# Solution: Balance circles
scripts/ay-yo-integrate.sh all
```

### Issue: Insufficient observations (0/30)
```bash
# Solution: Build baseline
scripts/ay-yo-continuous-improvement.sh run 20 quick
```

### Issue: Multiple daemons running
```bash
# Solution: Kill extras
pkill -f "ay-yo-continuous-improvement.sh daemon"

# Restart single daemon
nohup scripts/ay-yo-continuous-improvement.sh daemon 1800 3 > /tmp/ay-yo-daemon.log 2>&1 &
```

### Issue: High compliance variance (>30%)
```bash
# Solution: Check DoR budgets
cat .dor-metrics/*.json | jq -r '[.circle, .dor_budget_minutes, .compliance_percentage] | @csv'

# Reset to defaults
cp config/dor-budgets.json.backup config/dor-budgets.json
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `config/dor-budgets.json` | Time budgets per circle |
| `agentdb.db` | Skills, observations, experiments |
| `.dor-metrics/*.json` | Ceremony metrics |
| `.episodes/*.json` | Episode storage |
| `.archives/*.tar.gz` | Archived old data |

---

## 🎯 Success Indicators

**Healthy System**:
- ✅ Compliance: 90-100%
- ✅ Circle equity: 12-20% per circle
- ✅ Disk usage: <75%
- ✅ Observations: 30+
- ✅ 1 daemon (or 0 if manual)
- ✅ Learning variance: <15%

**Check with**:
```bash
scripts/ay-yo-monitor-roam.sh
scripts/ay-yo-integrate.sh dashboard
```

---

## 📚 Documentation

- **Full ROAM Analysis**: `ROAM_CONTINUOUS_IMPROVEMENT.md`
- **Implementation Summary**: `ROAM_MITIGATION_IMPLEMENTATION.md`
- **DoR/DoD System**: `docs/DOR_DOD_SYSTEM.md`
- **Integration Guide**: `AY_YO_INTEGRATION_COMPLETE.md`

---

**Version**: 1.0.0  
**Date**: 2026-01-08
