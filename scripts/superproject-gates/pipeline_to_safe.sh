#!/usr/bin/env bash
set -euo pipefail

# FIRE: Pipeline Archive → SAFe Lifecycle Folders
# Principle: Context-aware routing, value extraction over compression

CODE="$HOME/Documents/code"
ARCHIVED="$CODE/archived"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

log() { echo -e "\033[0;32m[$(date '+%H:%M:%S')]\033[0m $1"; }
info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }

log "╔══════════════════════════════════════════════════════════════╗"
log "║     Pipeline: Archive → SAFe Lifecycle (Context-Aware)      ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""

# ITEM 1: repo-improvement-workspace → EVALUATING (benchmarks, analysis docs)
log "1. repo-improvement-workspace → evaluating/"
info "  Contains: Benchmark reports, improvement analysis, nested repos"
info "  Classification: R&D evaluation artifacts"

if [[ -d "$ARCHIVED/repo-improvement-workspace" ]]; then
  mkdir -p "$CODE/evaluating/repo-improvement-workspace"
  
  # Move analysis docs to evaluating
  log "  → Moving analysis documents..."
  for doc in BASELINE_PERFORMANCE_REPORT.md IMPROVEMENT_ANALYSIS.md \
             EXECUTION_PLAN.md QUICK_WINS_SUMMARY.md RCA_DETAILED.md \
             ROAM_TRACKER.md; do
    if [[ -f "$ARCHIVED/repo-improvement-workspace/$doc" ]]; then
      mv "$ARCHIVED/repo-improvement-workspace/$doc" \
         "$CODE/evaluating/repo-improvement-workspace/" 2>/dev/null || true
    fi
  done
  
  # Move benchmark data
  if [[ -f "$ARCHIVED/repo-improvement-workspace/controlled_bench.txt" ]]; then
    mv "$ARCHIVED/repo-improvement-workspace/controlled_bench.txt" \
       "$CODE/evaluating/repo-improvement-workspace/" 2>/dev/null || true
  fi
  
  # Nested repos already extracted to evaluating/, delete duplicates
  log "  → Cleaning nested repos (already in evaluating/)..."
  rm -rf "$ARCHIVED/repo-improvement-workspace/jj" 2>/dev/null || true
  rm -rf "$ARCHIVED/repo-improvement-workspace/lionagi" 2>/dev/null || true
  rm -rf "$ARCHIVED/repo-improvement-workspace/lionagi-qe-fleet" 2>/dev/null || true
  
  # Remove empty workspace
  rmdir "$ARCHIVED/repo-improvement-workspace" 2>/dev/null || \
    rm -rf "$ARCHIVED/repo-improvement-workspace"
  
  log "  ✓ Pipelined to evaluating/repo-improvement-workspace/"
fi

# ITEM 2: legacy engineering/DevOps → EVALUATING (historical devops configs)
log ""
log "2. legacy engineering → evaluating/legacy-devops/"
info "  Contains: DevOps configs, mcp_dynamic_context_loader.py"
info "  Classification: Legacy reference for evaluation"

if [[ -d "$ARCHIVED/legacy engineering" ]]; then
  mkdir -p "$CODE/evaluating/legacy-devops"
  
  # Extract potentially useful DevOps scripts/configs
  if [[ -d "$ARCHIVED/legacy engineering/DevOps" ]]; then
    log "  → Evaluating DevOps directory..."
    # Sample to see if there's value
    DEVOPS_COUNT=$(find "$ARCHIVED/legacy engineering/DevOps" -type f -name "*.sh" -o -name "*.py" -o -name "*.yml" 2>/dev/null | wc -l | tr -d ' ')
    
    if [[ "$DEVOPS_COUNT" -gt 0 ]]; then
      log "  → Found $DEVOPS_COUNT config/script files"
      mv "$ARCHIVED/legacy engineering/DevOps" "$CODE/evaluating/legacy-devops/" 2>/dev/null || true
    fi
  fi
  
  # Move MCP loader if valuable
  if [[ -f "$ARCHIVED/legacy engineering/mcp_dynamic_context_loader.py" ]]; then
    mv "$ARCHIVED/legacy engineering/mcp_dynamic_context_loader.py" \
       "$CODE/evaluating/legacy-devops/" 2>/dev/null || true
  fi
  
  # Clean up empty directory
  rm -rf "$ARCHIVED/legacy engineering"
  log "  ✓ Pipelined to evaluating/legacy-devops/"
fi

# ITEM 3: agentic-prediction-risk-analytics → RETIRING (node_modules bloat)
log ""
log "3. agentic-prediction-risk-analytics → retiring/"
info "  Contains: Mostly node_modules (56MB), minimal source"
info "  Classification: Build artifacts, retire"

if [[ -d "$ARCHIVED/agentic-prediction-risk-analytics" ]]; then
  # Extract .env and prisma schema if valuable
  mkdir -p "$CODE/retiring/risk-analytics-reference"
  
  if [[ -f "$ARCHIVED/agentic-prediction-risk-analytics/.env" ]]; then
    mv "$ARCHIVED/agentic-prediction-risk-analytics/.env" \
       "$CODE/retiring/risk-analytics-reference/.env.template" 2>/dev/null || true
  fi
  
  if [[ -d "$ARCHIVED/agentic-prediction-risk-analytics/prisma" ]]; then
    mv "$ARCHIVED/agentic-prediction-risk-analytics/prisma" \
       "$CODE/retiring/risk-analytics-reference/" 2>/dev/null || true
  fi
  
  # Delete node_modules bloat
  log "  → Deleting node_modules (56MB)..."
  rm -rf "$ARCHIVED/agentic-prediction-risk-analytics"
  log "  ✓ Config extracted to retiring/, node_modules deleted"
fi

# ITEM 4: ssr_test → EMERGING (active deployment artifacts?)
log ""
log "4. ssr_test → emerging/ or retiring/?"
info "  Contains: Deployment scripts, configs, artifacts"

if [[ -d "$ARCHIVED/ssr_test" ]]; then
  # Check for recent activity
  LAST_MODIFIED=$(find "$ARCHIVED/ssr_test" -type f -exec stat -f "%m" {} \; 2>/dev/null | sort -n | tail -1)
  NOW=$(date +%s)
  AGE_DAYS=$(( (NOW - LAST_MODIFIED) / 86400 ))
  
  if [[ "$AGE_DAYS" -lt 30 ]]; then
    log "  → Recent activity ($AGE_DAYS days) → emerging/"
    mkdir -p "$CODE/emerging/ssr-test"
    
    # Move deployment scripts and configs
    for item in deploy_production.sh Dockerfile.* config configs deployment; do
      if [[ -e "$ARCHIVED/ssr_test/$item" ]]; then
        mv "$ARCHIVED/ssr_test/$item" "$CODE/emerging/ssr-test/" 2>/dev/null || true
      fi
    done
    
    # Move docs
    if [[ -d "$ARCHIVED/ssr_test/docs" ]]; then
      mv "$ARCHIVED/ssr_test/docs" "$CODE/emerging/ssr-test/" 2>/dev/null || true
    fi
    
    # Clean artifacts and build dirs
    rm -rf "$ARCHIVED/ssr_test/artifacts" "$ARCHIVED/ssr_test/build" 2>/dev/null || true
    rm -rf "$ARCHIVED/ssr_test"
    log "  ✓ Pipelined to emerging/ssr-test/"
  else
    log "  → Old ($AGE_DAYS days) → retiring/"
    mkdir -p "$CODE/retiring"
    tar czf "$CODE/retiring/ssr_test-$TIMESTAMP.tar.gz" \
      -C "$ARCHIVED" ssr_test 2>/dev/null
    rm -rf "$ARCHIVED/ssr_test"
    log "  ✓ Compressed to retiring/"
  fi
fi

# ITEM 5: legacy-root → workspace/h4-retiring (GTD context)
log ""
log "5. legacy-root → workspace/h4-retiring/"
info "  Contains: Root-level legacy files from initial cleanup"
info "  Classification: Historical context for GTD workflow"

if [[ -d "$ARCHIVED/legacy-root" ]]; then
  mkdir -p "$HOME/Documents/workspace/h4-retiring"
  mv "$ARCHIVED/legacy-root" "$HOME/Documents/workspace/h4-retiring/" 2>/dev/null || true
  log "  ✓ Moved to workspace/h4-retiring/ (GTD context)"
fi

log ""
log "═══════════════════════════════════════════════════════════════"
log "              Pipeline Complete - Value Extracted             "
log "═══════════════════════════════════════════════════════════════"
log ""

# Final inventory
log "SAFe Lifecycle Distribution:"
log ""
log "EVALUATING (R&D):"
ls -1 "$CODE/evaluating" 2>/dev/null | grep -v README | while read item; do
  size=$(du -sh "$CODE/evaluating/$item" 2>/dev/null | cut -f1)
  log "  - $item ($size)"
done

log ""
log "EMERGING (Development):"
ls -1 "$CODE/emerging" 2>/dev/null | grep -v README | while read item; do
  size=$(du -sh "$CODE/emerging/$item" 2>/dev/null | cut -f1)
  log "  - $item ($size)"
done

log ""
log "INVESTING (Production):"
ls -1 "$CODE/investing" 2>/dev/null | grep -v README | while read item; do
  size=$(du -sh "$CODE/investing/$item" 2>/dev/null | cut -f1)
  log "  - $item ($size)"
done

log ""
log "ARCHIVED (Remaining):"
if [[ -d "$ARCHIVED" ]] && [[ "$(ls -A "$ARCHIVED" 2>/dev/null)" ]]; then
  ls -1 "$ARCHIVED" 2>/dev/null | while read item; do
    size=$(du -sh "$ARCHIVED/$item" 2>/dev/null | cut -f1)
    log "  - $item ($size)"
  done
else
  log "  ✓ Empty - all value extracted!"
fi
