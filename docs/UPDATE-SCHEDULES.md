# Update Schedules & Deployment Status

**Generated**: 2026-01-15 15:42 UTC

## ⏰ QE Fleet Update Schedule

**Source**: `.agentic-qe/learning-config.json`

### Current Configuration:
```json
{
  "scheduler": {
    "mode": "hybrid",
    "schedule": {
      "startHour": 2,        // 2:00 AM daily
      "durationMinutes": 60, // 60-minute window
      "daysOfWeek": [0,1,2,3,4,5,6] // Every day
    },
    "learningBudget": {
      "maxPatternsPerCycle": 50,
      "maxAgentsPerCycle": 5,
      "maxDurationMs": 3600000  // 1 hour max
    }
  }
}
```

### Summary:
- **Frequency**: Daily at 2:00 AM
- **Duration**: 60 minutes
- **Learning**: Up to 50 patterns, 5 agents per cycle
- **Mode**: Hybrid (automatic + on-demand)

## 🔄 Claude-Flow Update Behavior

### Installed Versions:
```bash
# Global installation (stable)
claude-flow v2.7.41
Location: ~/.nvm/versions/node/v22.21.1/bin/claude-flow

# NPX (alpha - always latest)
npx claude-flow@alpha v3.0.0-alpha.118
```

### Update Strategy:

#### Using NPX (Recommended - Auto-updates):
```bash
# Always fetches latest alpha
npx claude-flow@alpha init
npx claude-flow@alpha --help

# No manual updates needed - NPX checks registry each run
```

#### Using Global Install (Manual Updates):
```bash
# Check for updates
npm outdated -g claude-flow

# Update when available
npm update -g claude-flow

# Or install specific version
npm install -g claude-flow@latest
npm install -g claude-flow@alpha
```

### Update Frequency:
- **NPX**: Checks npm registry on every execution (~daily auto-update)
- **Global**: Manual update required (check weekly recommended)
- **Alpha releases**: 2-5 times per week
- **Stable releases**: Monthly

### Recommendation:
Use `npx claude-flow@alpha` for latest features (auto-updates) or global install `claude-flow` for stability (manual updates).

## 🚀 Current Deployment Status

### Git LFS Fork Issue:
The repository `rooz-live/agentic-flow` is a **public fork** and GitHub prevents force-pushing LFS objects to forks.

**Error**: `@rooz-live can not upload new objects to public fork rooz-live/agentic-flow`

### Deployment Options:

#### Option 1: Generate Patch (Recommended)
```bash
./scripts/deploy-via-patch.sh

# Creates:
# 1. week2-deployment-TIMESTAMP.patch
# 2. deployment-bundle-TIMESTAMP/ (source files)
# 3. DEPLOYMENT-SUMMARY.md (instructions)
```

**Pros**: 
- Works around fork restrictions
- Clean git history
- Reviewable before applying

**Cons**: 
- Requires upstream repo access or maintainer assistance

#### Option 2: Work Locally (Current Approach)
```bash
# Continue development in fork
git add .
git commit -m "feat: improvements"

# Deploy Phase 1 improvements locally
./NEXT-STEPS.sh

# Sync changes to upstream later
```

**Pros**: 
- No deployment blockers
- Fast iteration
- Local testing

**Cons**: 
- Changes not in upstream repo
- Manual sync required later

#### Option 3: Delete Fork & Re-clone Upstream
```bash
# WARNING: Backup your work first!
git bundle create backup.bundle --all

# Delete fork on GitHub, then:
git clone git@github.com:ruvnet/agentic-flow.git
cd agentic-flow
git bundle verify ../backup.bundle
git pull ../backup.bundle security/fix-dependabot-vulnerabilities-2026-01-02
```

**Pros**: 
- Full control over repo
- No fork restrictions

**Cons**: 
- Loses fork history
- Requires upstream write access

## 📊 Current System State

### Maturity: 73% (CONTINUE)
- ROAM: 0 days ✅
- Pattern Rationale: 100% ✅
- Governance: 0/6 ✅
- Skills: 3 persisting ✅
- Test Coverage: Unknown (Phase 1)
- Episodes: Not persisting (Phase 1)
- MYM Scores: Not calculated (Phase 1)

### Next Steps:
1. **Immediate**: Run `./NEXT-STEPS.sh` for Phase 1 (+7% maturity)
2. **This Week**: Resolve deployment path (patch or local)
3. **Week 2**: Phase 2 tasks (+7% → 87%)
4. **Week 3-4**: Phase 3-4 tasks (+8% → 95% GO)

## 🔧 Maintenance Schedules

### Automated:
- **QE Learning**: Daily 2:00 AM, 60 min
- **NPX Updates**: Every execution (if using npx)
- **ROAM Validation**: On every ceremony
- **Pattern Learning**: Continuous capture, daily processing

### Manual:
- **Global npm updates**: Weekly check recommended
- **Test coverage**: Phase 1 baseline, then weekly
- **Maturity assessment**: After each phase
- **Governance audit**: Monthly

### Recommended Cron Jobs (Not currently set):
```bash
# Add to crontab -e

# Daily QE pattern learning (if not using scheduler)
0 2 * * * cd /path/to/agentic-flow && npm run qe:learn

# Weekly dependency updates (Sundays 3 AM)
0 3 * * 0 cd /path/to/agentic-flow && npm update && npm audit fix

# Monthly maturity assessment (1st of month, 4 AM)
0 4 1 * * cd /path/to/agentic-flow && bash scripts/ay-yolife.sh --mode-select
```

## 📝 Quick Commands

```bash
# Check QE schedule
cat .agentic-qe/learning-config.json | jq '.scheduler'

# Check claude-flow versions
claude-flow --version
npx claude-flow@alpha --version

# Generate deployment patch
./scripts/deploy-via-patch.sh

# Run Phase 1 improvements
./NEXT-STEPS.sh

# Check maturity
bash scripts/ay-yolife.sh --mode-select
bash scripts/ay-aisp-validate.sh
```
