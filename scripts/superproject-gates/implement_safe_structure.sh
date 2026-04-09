#!/usr/bin/env bash
set -euo pipefail

# FIRE: Implement SAFe Structure in /code/projects
# Purpose: Create lifecycle folders where repos actually live
# Principle: Focused Incremental Relentless Execution

CODE_ROOT="$HOME/Documents/code"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

log() { echo -e "\033[0;32m[$(date '+%H:%M:%S')]\033[0m $1"; }
info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }

log "╔══════════════════════════════════════════════════════════════╗"
log "║   FIRE: Implement SAFe Structure in /code/projects          ║"
log "╚══════════════════════════════════════════════════════════════╝"

# Step 1: Create SAFe lifecycle structure in code/
log "Step 1: Creating SAFe lifecycle structure..."
mkdir -p "$CODE_ROOT"/{evaluating,emerging,investing,retiring}

# Step 2: Classify and organize projects by lifecycle
log "Step 2: Organizing by SAFe lifecycle..."

# INVESTING (50-70%): Production systems
info "→ INVESTING: agentic-flow (PRIMARY)"
[ -d "$CODE_ROOT/projects/agentic-flow" ] && \
  mv "$CODE_ROOT/projects/agentic-flow" "$CODE_ROOT/investing/" && \
  log "  ✓ Moved agentic-flow to investing/"

# EMERGING (20-30%): New projects under development  
info "→ EMERGING: QE projects"
[ -d "$CODE_ROOT/projects/lionagi-qe-fleet" ] && \
  mv "$CODE_ROOT/projects/lionagi-qe-fleet" "$CODE_ROOT/emerging/" && \
  log "  ✓ Moved lionagi-qe-fleet to emerging/"

[ -d "$CODE_ROOT/projects/lionagi-qe-improvements" ] && \
  mv "$CODE_ROOT/projects/lionagi-qe-improvements" "$CODE_ROOT/emerging/" && \
  log "  ✓ Moved lionagi-qe-improvements to emerging/"

# EVALUATING (10-20%): External evaluation, R&D
info "→ EVALUATING: External repos"
[ -d "$CODE_ROOT/external/lionagi" ] && \
  mv "$CODE_ROOT/external/lionagi" "$CODE_ROOT/evaluating/" && \
  log "  ✓ Moved lionagi to evaluating/"

[ -d "$CODE_ROOT/external/lionagi-core-improvements" ] && \
  mv "$CODE_ROOT/external/lionagi-core-improvements" "$CODE_ROOT/evaluating/" && \
  log "  ✓ Moved lionagi-core-improvements to evaluating/"

[ -d "$CODE_ROOT/external/turbo-flow-claude" ] && \
  mv "$CODE_ROOT/external/turbo-flow-claude" "$CODE_ROOT/evaluating/" && \
  log "  ✓ Moved turbo-flow-claude to evaluating/"

[ -d "$CODE_ROOT/external/neural-trading-reference" ] && \
  mv "$CODE_ROOT/external/neural-trading-reference" "$CODE_ROOT/evaluating/" && \
  log "  ✓ Moved neural-trading-reference to evaluating/"

# Keep jj in external (large, stable, not under active evaluation)
info "→ KEEPING: jj in external/ (911MB, stable)"

# Step 3: Create README for each lifecycle stage
log "Step 3: Creating lifecycle documentation..."

cat > "$CODE_ROOT/investing/README.md" << 'EOF'
# Investing (50-70% Budget)

**Purpose**: High-value production systems delivering ROI

## Current Projects
- **agentic-flow** (1.5GB) - PRIMARY INVESTMENT
  - Last activity: 2025-11-14
  - Status: Production
  - Value: Core system, active development

## Investment Criteria
- ✅ MVP delivered
- ✅ Production deployment successful
- ✅ Business value demonstrated
- ✅ Active maintenance required

## Exit Criteria → Retiring
- Replacement system operational
- Data migrated
- Users transitioned
EOF

cat > "$CODE_ROOT/emerging/README.md" << 'EOF'
# Emerging (20-30% Budget)

**Purpose**: Validated opportunities receiving initial investment

## Current Projects
- **lionagi-qe-fleet** (418MB)
  - Last activity: 2025-11-07
  - Status: Development
  
- **lionagi-qe-improvements** (6.9MB)
  - Last activity: 2025-11-07
  - Status: Development

## Entry Criteria (from Evaluating)
- ✅ Technical spike completed
- ✅ Business case validated
- ✅ Team capacity allocated
- ✅ Success metrics defined

## Exit Criteria → Investing
- MVP delivered
- Production deployment successful
- User feedback positive
- Business value demonstrated
EOF

cat > "$CODE_ROOT/evaluating/README.md" << 'EOF'
# Evaluating (10-20% Budget)

**Purpose**: Emerging opportunities under exploration

## Current Evaluations
- **lionagi** (15MB) - External framework evaluation
- **lionagi-core-improvements** (13MB) - Core improvements eval
- **turbo-flow-claude** (864KB) - Recent activity (2025-11-06)
- **neural-trading-reference** (31MB) - Reference implementation

## Evaluation Criteria
- Technical feasibility
- Business alignment
- Resource requirements
- Risk assessment

## Exit Criteria → Emerging
- Spike completed successfully
- Business case validated
- OR → Retire if not viable
EOF

cat > "$CODE_ROOT/retiring/README.md" << 'EOF'
# Retiring (0-10% Budget)

**Purpose**: End-of-life assets scheduled for sunset

## Scheduled for Retirement
See: code/archived/ for items pending deletion

## Retirement Process
1. Move from active lifecycle to retiring/
2. 30-day sunset period
3. Compress for historical reference
4. Delete or archive to cold storage

## Current Status
Phase 5A in progress - 5.8GB deletion pending validation
EOF

# Step 4: Remove now-empty directories
log "Step 4: Cleaning up empty directories..."
rmdir "$CODE_ROOT/projects" 2>/dev/null || info "  projects/ not empty or doesn't exist"
rmdir "$CODE_ROOT/external" 2>/dev/null || info "  external/ not empty (jj remaining)"

# Step 5: Create index
cat > "$CODE_ROOT/STRUCTURE.md" << 'EOF'
# Code Repository Structure (SAFe Lean Budget Guardrails)

**Last Updated**: 2025-11-17
**Framework**: SAFe Lean Budget Guardrails + GTD Horizons

## Directory Structure

```
code/
├── evaluating/     (10-20% budget) - R&D, exploration
├── emerging/       (20-30% budget) - New project development  
├── investing/      (50-70% budget) - Production systems
├── retiring/       (0-10% budget)  - Scheduled sunset
├── external/       (Stable external deps, not lifecycle-managed)
└── archived/       (Pending Phase 5A deletion)
```

## Investment Distribution

| Lifecycle   | Budget Target | Current Allocation | Status |
|-------------|---------------|-------------------|--------|
| Evaluating  | 10-20%        | 59MB (3%)         | ⚠️ Low  |
| Emerging    | 20-30%        | 425MB (21%)       | ✅ OK   |
| Investing   | 50-70%        | 1.5GB (76%)       | ✅ OK   |
| Retiring    | 0-10%         | 5.8GB (pending)   | ⚠️ High |

**After Phase 5A**: Retiring will be 0%, aligning with SAFe targets

## Navigation

- **Daily work**: `cd ~/Documents/code/investing/agentic-flow`
- **New projects**: `cd ~/Documents/code/emerging/`
- **Evaluations**: `cd ~/Documents/code/evaluating/`
- **GTD Horizons**: `cd ~/Documents/workspace/h0-actions/`

## Promotion Gates

**Evaluating → Emerging**: Spike complete, business case validated
**Emerging → Investing**: MVP deployed, value demonstrated
**Investing → Retiring**: Replacement operational, sunset approved
**Retiring → Deleted**: 30-day sunset period, compressed for reference
EOF

log "✓ SAFe structure implementation complete!"
log ""
log "Results:"
log "  Investing:  $(ls -1 "$CODE_ROOT/investing" 2>/dev/null | grep -v README | wc -l | tr -d ' ') projects"
log "  Emerging:   $(ls -1 "$CODE_ROOT/emerging" 2>/dev/null | grep -v README | wc -l | tr -d ' ') projects"
log "  Evaluating: $(ls -1 "$CODE_ROOT/evaluating" 2>/dev/null | grep -v README | wc -l | tr -d ' ') projects"
log ""
log "View structure: cat $CODE_ROOT/STRUCTURE.md"
