# Agentic Flow - Quick Reference Guide

## 🚀 New Commands

### Guardrails (WIP Limits, Advisory Mode, Schema Validation)
```bash
# Check current guardrail status
./scripts/af guardrails --status

# Test guardrails in different modes
./scripts/af guardrails --test --mode mutate
./scripts/af guardrails --test --mode advisory
./scripts/af guardrails --test --mode enforcement

# JSON output
./scripts/af guardrails --status --json
```

### Site Health Monitor (interface.tag.ooo ecosystem)
```bash
# Check all sites
./scripts/af site-health

# Check specific site
./scripts/af site-health --site app
./scripts/af site-health --site billing
./scripts/af site-health --site blog
./scripts/af site-health --site dev
./scripts/af site-health --site forum
./scripts/af site-health --site starlingx

# Summary only
./scripts/af site-health --summary --json
```

### Existing Commands (Enhanced)
```bash
# Dashboard
./scripts/af dashboard --port 5000

# WSJF & Prioritization
./scripts/af wsjf --top 10
./scripts/af wsjf-by-circle orchestrator

# Execution Metrics
./scripts/af execution-velocity --hours 72
./scripts/af flow-efficiency --json

# Pattern Analysis
./scripts/af actionable-context
./scripts/af pattern-stats --pattern safe_degrade
```

## 📊 Key Concepts

### Guardrails
- **WIP Limits**: Prevents too many concurrent items per circle
- **Advisory Mode**: Read-only analysis, no system modifications
- **Enforcement Mode**: Strict governance, blocks all mutations
- **Mutate Mode** (default): Safe modifications allowed

### Site Health
- **Components**: Individual service availability
- **Protocols**: Active communication protocols
- **Productivity Metrics**: Quality over quantity
  - User engagement (not just views)
  - Success rates (not just volume)
  - Coverage (not just count)

### Budget Tracking
- **CapEx→Revenue**: Track capital expenditure conversion
- **Iteration Budgets**: Limit execution with early stopping
- **Early Stop**: Prevents exhaustion (default 80% threshold)

## 🎯 Quick Wins

### 1. Run Guardrails Test
```bash
./scripts/af guardrails --test --mode advisory
```
Expected: See WIP limits and schema validation in action

### 2. Check Site Ecosystem
```bash
./scripts/af site-health --json | jq '.summary'
```
Expected: Availability % and response times for all sites

### 3. View Dashboard
```bash
./scripts/af dashboard
# Open: http://127.0.0.1:5000
```
Expected: Multitenant dashboard with tenant filtering

## 🔧 Configuration

### Environment Variables
```bash
# Guardrails
export AF_GUARDRAIL_MODE="mutate"

# Budget tracking
export AF_EARLY_STOP_THRESHOLD="0.8"

# Site health
export AF_SITE_HEALTH_TIMEOUT="10"
```

### WIP Limits (edit `scripts/agentic/guardrails.py`)
```python
orchestrator: int = 3
analyst: int = 5
innovator: int = 4
intuitive: int = 2
assessor: int = 6
seeker: int = 8
```

## 📁 File Structure

```
scripts/
├── agentic/
│   ├── guardrails.py          ← WIP limits, advisory mode
│   └── pattern_logger.py      ← Event logging
├── monitoring/
│   └── site_health.py          ← interface.tag.ooo monitor
├── temporal/
│   └── budget_tracker.py       ← CapEx/Revenue tracking
├── deploy/
│   ├── nginx_config.conf       ← Multitenant domains
│   ├── systemd_dashboard.service
│   └── deploy_domains.sh       ← Deployment automation
├── web_dashboard.py            ← Flask dashboard
└── af                          ← CLI entrypoint
```

## 🌐 Domains

### Multitenant Dashboards
- `decisioncall.com` - Main dashboard
- `analytics.interface.tag.ooo` - Analytics
- `half.masslessmassive.com` - Risk/Budget halving
- `multi.masslessmassive.com` - Admin

### Monitored Sites
- `app.interface.tag.ooo` - Main application
- `billing.interface.tag.ooo` - Billing system
- `blog.interface.tag.ooo` - Content
- `dev.interface.tag.ooo` - Development
- `forum.interface.tag.ooo` - Community
- `starlingx.interface.tag.ooo` - Infrastructure

## 📖 Full Documentation

- **Governance Details**: `docs/governance-implementation.md`
- **Multitenant Integration**: `docs/multitenant-integration.md`
- **Phase A-C Analysis**: `docs/phase-a-actionable-context.md`

## 🚨 Important Notes

1. **Advisory Mode** prevents all write operations - use for analysis only
2. **Early Stopping** triggers at 80% by default - prevents budget exhaustion
3. **WIP Limits** block new work when limit reached - prevents overload
4. **Schema Validation** enforces required fields per tier - maintains data quality
5. **Productivity Metrics** track quality, not just output - better insights

## 💡 Pro Tips

```bash
# Watch guardrail status in real-time
watch -n 5 './scripts/af guardrails --status'

# Monitor site health continuously
watch -n 30 './scripts/af site-health --summary'

# Export metrics for analysis
./scripts/af execution-velocity --json > velocity.json
./scripts/af flow-efficiency --json > flow.json
```

## 🎓 Learning Path

1. ✅ Start with guardrails: `./scripts/af guardrails --test`
2. ✅ Check site health: `./scripts/af site-health`
3. ⏳ Review governance docs: `docs/governance-implementation.md`
4. ⏳ Deploy to staging: `scripts/deploy/deploy_domains.sh`
5. ⏳ Integrate with WSJF: Connect budget tracker
6. ⏳ Add AI reasoning: Phase 2 (VibeThinker, Harbor)

---

**Questions?** Check `docs/governance-implementation.md` for detailed implementation guide.
