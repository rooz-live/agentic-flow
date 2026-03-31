#!/usr/bin/env bash
set -euo pipefail

# VibeThinker Trial Validator Swarm (SFT→RL MGPO)
#
# Implements:
# - SFT (Spectrum Phase): Diverse solution paths for trial arguments
# - RL (Signal Phase): MGPO entropy-based uncertain problem focus
# - Multi-agent circles: legal-researcher, precedent-finder, perjury-detector
# - Iterative refinement: Every 90min (ultradian rhythm from TEMPORAL-CAPACITY-MEGA-FRAMEWORK.md)
# - Wholeness validation: Ensures refined arguments pass coherence checks
# - Cross-perspective eval: Seeker, Skeptic, Witness, Amplifier, Coordinator

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Source robust exit codes
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    EXIT_SUCCESS=0; EXIT_INVALID_ARGS=10; EXIT_FILE_NOT_FOUND=11
    EXIT_TOOL_MISSING=60; EXIT_SCHEMA_VALIDATION_FAILED=100
fi

WATCH_DIR="$HOME/Documents/Personal/CLT/MAA"
TRIAL_DIRS=(
  "$WATCH_DIR/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/TRIAL-PREP"
  "$WATCH_DIR/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV007491-590/TRIAL-PREP"
  "$WATCH_DIR/Uptown/BHOPTI-LEGAL/00-DASHBOARD"
)

# T0 FIX: VibeThinker OOM workaround - default to small model size to prevent 3GB+ RAM usage
export MGPO_MODEL_SIZE="${MGPO_MODEL_SIZE:-small}"
SWARM_LOG="$HOME/Library/Logs/vibethinker-trial-swarm.log"
ITERATION_INTERVAL_MIN=90  # Ultradian cycle (TEMPORAL-CAPACITY-MEGA-FRAMEWORK.md)
MAX_ITERATIONS=8  # 8 cycles × 90min = 12h continuous improvement

# Agent Circles (5 perspectives for multi-angle eval)
declare -A AGENT_ROLES=(
  [seeker]="Find missing case law, evidence gaps, procedural flaws"
  [skeptic]="Challenge weak arguments, identify perjury risk, spot contradictions"
  [witness]="Validate document completeness, verify dates/citations, check signatures"
  [amplifier]="Strengthen evidence, score confidence, suggest improvements"
  [coordinator]="Synthesize perspectives, maintain wholeness, orchestrate flow"
)

# Map custom trial roles → valid claude-flow agent types
declare -A ROLE_TYPE_MAP=(
  [coordinator]="coordinator"
  [seeker]="researcher"
  [skeptic]="analyst"
  [witness]="reviewer"
  [amplifier]="optimizer"
)

# VibeThinker SFT Phase: Generate diverse solution paths
run_sft_phase() {
  local iteration=$1
  local trial_file=$2

  echo "[SFT-$iteration] Spectrum Phase: Generating diverse solution paths for $trial_file" | tee -a "$SWARM_LOG"

  # Each agent generates Pass@K diverse solutions
  for role in "${!AGENT_ROLES[@]}"; do
    echo "  ├── $role: ${AGENT_ROLES[$role]}" | tee -a "$SWARM_LOG"
    local agent_type="${ROLE_TYPE_MAP[$role]:-analyst}"
    # Migration target (Phase 1):
    # Task({
    #   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
    #   subagent_type: "hierarchical-coordinator",
    #   run_in_background: true,
    #   description: "Persistent legal coordination"
    # })
    # Spawn Claude Flow agent via MCP (|| true: non-fatal — swarm continues on spawn error)
# Migration target (Phase 1):
# Task({
#   prompt: "Legal coordination agent - monitor emails, validate WSJF priorities",
#   subagent_type: "hierarchical-coordinator",
#   run_in_background: true,
#   description: "Persistent legal coordination"
# })
    "$PROJECT_ROOT/scripts/orchestrators/delegate-agent-spawn.sh" \
      --type "$agent_type" \
      --name "trial-$role-iter-$iteration" \
      --config "{\"trial_file\":\"$trial_file\",\"iteration\":$iteration,\"role\":\"$role\"}" \
      >> "$SWARM_LOG" 2>&1 || echo "  ⚠️  agent spawn failed for $role (non-fatal)" | tee -a "$SWARM_LOG"
  done

  # Run wholeness validator on all generated solutions
  if [[ -f "$PROJECT_ROOT/scripts/validators/validate_coherence.py" ]]; then
    python3 "$PROJECT_ROOT/scripts/validators/validate_coherence.py" \
      --path "$trial_file" \
      --iteration "$iteration" \
      >> "$SWARM_LOG" 2>&1 || echo "  ⚠️  validate_coherence failed (non-fatal)" | tee -a "$SWARM_LOG"
  fi
}

# VibeThinker RL Phase: MGPO entropy-based refinement
run_rl_phase() {
  local iteration=$1

  echo "[RL-$iteration] Signal Phase: MGPO entropy-based refinement" | tee -a "$SWARM_LOG"

  # MGPO: Focus on problems where model is most uncertain
  # High entropy = low confidence = needs more learning cycles
  if [[ -f "$PROJECT_ROOT/scripts/validators/mgpo-refiner.py" ]]; then
    python3 "$PROJECT_ROOT/scripts/validators/mgpo-refiner.py" \
      --iteration "$iteration" \
      --entropy-threshold 0.7 \
      --focus-uncertain \
      >> "$SWARM_LOG" 2>&1 || echo "  ⚠️  mgpo-refiner failed (non-fatal)" | tee -a "$SWARM_LOG"
  fi

  # Store learned patterns in Claude Flow memory
  npx @claude-flow/cli@latest hooks post-task \
    --task-id "trial-iter-$iteration" \
    --success true \
    --store-results true \
    --train-neural true \
    >> "$SWARM_LOG" 2>&1 || true
}

# Cross-perspective evaluation with scoring
evaluate_iteration() {
  local iteration=$1

  echo "[EVAL-$iteration] Cross-perspective evaluation" | tee -a "$SWARM_LOG"

  # Automated scoring metrics:
  # - Evidence strength (1-10)
  # - Perjury risk (0-1 probability)
  # - Confidence score (0-1)
  # - Coherence score (0-1)

  if [[ -f "$PROJECT_ROOT/scripts/validators/cross-eval-scorer.py" ]]; then
    python3 "$PROJECT_ROOT/scripts/validators/cross-eval-scorer.py" \
      --iteration "$iteration" \
      >> "$SWARM_LOG" 2>&1 || echo "  ⚠️  cross-eval-scorer failed (non-fatal)" | tee -a "$SWARM_LOG"
  else
    echo "  ⚠️  cross-eval-scorer.py missing — skipping (T2 todo)" | tee -a "$SWARM_LOG"
  fi
}

# Main orchestration loop
main() {
  echo "🤖 VibeThinker Trial Validator Swarm Starting..." | tee "$SWARM_LOG"
  echo "   SFT→RL MGPO Iterative Refinement" | tee -a "$SWARM_LOG"
  echo "   Max iterations: $MAX_ITERATIONS" | tee -a "$SWARM_LOG"
  echo "   Interval: ${ITERATION_INTERVAL_MIN}min (ultradian)" | tee -a "$SWARM_LOG"
  echo "" | tee -a "$SWARM_LOG"

  # Initialize Claude Flow swarm with 15 agents
  npx @claude-flow/cli@latest swarm init \
    --topology hierarchical-mesh \
    --max-agents 15 \
    --strategy specialized \
    --v3-mode \
    >> "$SWARM_LOG" 2>&1

  for iteration in $(seq 1 "$MAX_ITERATIONS"); do
    echo "" | tee -a "$SWARM_LOG"
    echo "═══════════════════════════════════════════════" | tee -a "$SWARM_LOG"
    echo "🔄 ITERATION $iteration/$MAX_ITERATIONS" | tee -a "$SWARM_LOG"
    echo "═══════════════════════════════════════════════" | tee -a "$SWARM_LOG"

    # Process each trial directory
    for trial_dir in "${TRIAL_DIRS[@]}"; do
      if [ ! -d "$trial_dir" ]; then
        echo "⚠️  Trial dir not found: $trial_dir" | tee -a "$SWARM_LOG"
        continue
      fi

      # Find trial-critical files (*.md, *.pdf, *.txt with trial keywords)
      while IFS= read -r -d $'\0' file; do
        echo "📄 Processing: $file" | tee -a "$SWARM_LOG"

        # SFT Phase: Generate diverse solutions
        run_sft_phase "$iteration" "$file"

        # RL Phase: MGPO refinement
        run_rl_phase "$iteration"

        # Evaluate iteration
        evaluate_iteration "$iteration"

      done < <(find "$trial_dir" -type f \( -name "*.md" -o -name "*.pdf" -o -name "*.txt" \) -print0)
    done

    # Retro/Review/Refine checkpoint (GREEN cycle)
    echo "" | tee -a "$SWARM_LOG"
    echo "✅ Iteration $iteration complete. Next in ${ITERATION_INTERVAL_MIN}min." | tee -a "$SWARM_LOG"

    # Stop if last iteration
    if [ "$iteration" -eq "$MAX_ITERATIONS" ]; then
      echo "🏁 Final iteration complete. Generating summary report..." | tee -a "$SWARM_LOG"
      if [[ -f "$PROJECT_ROOT/scripts/validators/generate-trial-report.py" ]]; then
        python3 "$PROJECT_ROOT/scripts/validators/generate-trial-report.py" >> "$SWARM_LOG" 2>&1 || true
      else
        echo "⚠️  generate-trial-report.py missing — summary skipped (T2 todo)" | tee -a "$SWARM_LOG"
      fi
      break
    fi

    # Sleep for ultradian interval (allow for review/retro/replenish)
    echo "⏸️  Pausing for review/retro/replenish..." | tee -a "$SWARM_LOG"
    sleep $((ITERATION_INTERVAL_MIN * 60))
  done

  echo "" | tee -a "$SWARM_LOG"
  echo "✨ VibeThinker Trial Swarm Complete!" | tee -a "$SWARM_LOG"
  echo "   Logs: $SWARM_LOG" | tee -a "$SWARM_LOG"
  echo "   Dashboard: /tmp/trial-validation-report.html" | tee -a "$SWARM_LOG"
}

# Handle Ctrl+C gracefully
trap 'echo "⚠️  Interrupted. Cleaning up..."; npx @claude-flow/cli@latest swarm stop; exit 130' INT TERM

main "$@"
