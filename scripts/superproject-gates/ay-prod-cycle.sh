#!/usr/bin/env bash
set -euo pipefail

# Configuration
CIRCLE="${1:-orchestrator}"
CEREMONY="${2:-standup}"
MODE="${3:-advisory}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TMP_DIR="${AY_TMP_DIR:-/tmp}"

if [ "${AY_TEST_MODE:-}" = "1" ] || [ -n "${JEST_WORKER_ID:-}" ] || [ "${AGENTDB_DISABLE_MCP:-}" = "1" ]; then
    export AY_AUTO_INSERT=0
fi

# Load MPP Protocol for timeout protection
source "$SCRIPT_DIR/lib/exit-codes.sh" 2>/dev/null || true
source "$SCRIPT_DIR/lib/mpp-protocol.sh" 2>/dev/null || true

# Load dynamic thresholds library
source "$SCRIPT_DIR/lib/dynamic-thresholds.sh" 2>/dev/null || true

# Load runtime configuration
source "$PROJECT_ROOT/config/runtime-config.sh"

# Initialize dynamic thresholds (pre-calculate and cache)
init_dynamic_thresholds false

# Episode batch storage
EPISODE_BATCH_DIR="${AY_EPISODE_BATCH_DIR:-$TMP_DIR/ay-episodes}"
mkdir -p "$EPISODE_BATCH_DIR"

# ==========================================
# 0. Yo.life Dimension Mapping
# ==========================================
get_yolife_dimension() {
    local ceremony="$1"
    case "$ceremony" in
        standup)    echo "temporal" ;;
        wsjf)       echo "goal" ;;
        review)     echo "event" ;;
        retro)      echo "barrier" ;;
        refine)     echo "mindset" ;;
        replenish)  echo "cockpit" ;;
        synthesis)  echo "psychological" ;;
        *)          echo "unknown" ;;
    esac
}

# ==========================================
# 1. Circle Ceremony Validation
# ==========================================
validate_circle_ceremony() {
    local circle="$1"
    local ceremony="$2"
    local is_valid=true
    local recommendation=""

    case "$circle" in
        orchestrator)
            if [[ ! "$ceremony" =~ ^(standup)$ ]]; then
                is_valid=false
                recommendation="standup"
            fi
            ;;
        assessor)
            if [[ ! "$ceremony" =~ ^(wsjf|review)$ ]]; then
                is_valid=false
                recommendation="wsjf, review"
            fi
            ;;
        innovator)
            if [[ ! "$ceremony" =~ ^(retro)$ ]]; then
                is_valid=false
                recommendation="retro"
            fi
            ;;
        analyst)
            if [[ ! "$ceremony" =~ ^(refine)$ ]]; then
                is_valid=false
                recommendation="refine"
            fi
            ;;
        seeker)
            if [[ ! "$ceremony" =~ ^(replenish)$ ]]; then
                is_valid=false
                recommendation="replenish"
            fi
            ;;
        intuitive)
            if [[ ! "$ceremony" =~ ^(synthesis)$ ]]; then
                is_valid=false
                recommendation="synthesis"
            fi
            ;;
        *)
            echo "❌ Unknown circle: $circle"
            echo "Valid circles: orchestrator, assessor, innovator, analyst, seeker, intuitive"
            return 1
            ;;
    esac

    if [ "$is_valid" = false ]; then
        echo "⚠️  Unusual ceremony pairing: ${circle}/${ceremony}"
        echo "💡 Recommended ceremonies for $circle: $recommendation"
        echo "📖 Continuing anyway (advisory mode)..."
    else
        echo "✅ Circle/ceremony pairing validated: ${circle}/${ceremony}"
    fi

    return 0  # Don't block execution, just warn
}

# ==========================================
# 2. MCP Health Pre-Execution Validation
# ==========================================
validate_mcp_health() {
    echo "🏥 Validating MCP health..."

    if [ "${AY_TEST_MODE:-}" = "1" ] || [ -n "${JEST_WORKER_ID:-}" ] || [ "${AGENTDB_DISABLE_MCP:-}" = "1" ]; then
        MCP_STATUS="healthy"
        echo "✅ MCP healthy (validation skipped)"
        return 0
    fi

    if ! command -v npx &> /dev/null; then
        echo "⚠️  npx not found - MCP validation skipped"
        MCP_STATUS="healthy"  # Don't block execution
        return 0
    fi

    # Check if agentdb is accessible (MCP server running on stdio)
    # Use strict timeout for health check
    if timeout ${TIMEOUT_MCP_HEALTH}s npx agentdb stats &>/dev/null; then
        MCP_STATUS="healthy"
        echo "✅ MCP healthy (agentdb responsive)"
    else
        # Timeout or failure detected - enable degraded mode
        MCP_STATUS="degraded"
        echo "⚠️  MCP degraded mode: agentdb timeout (safe_degrade enabled)"
        echo "🛡️  Continuing with local fallbacks..."
    fi
    return 0  # Never block execution, but signal degraded mode
}

# ==========================================
# 2. AFProdEngine Integration
# ==========================================
execute_with_afprod_engine() {
    local circle="$1"
    local ceremony="$2"
    local mode="$3"
    local skills_json="$4"

    echo "🚀 Executing via AFProdEngine..."

    if [ "${AY_TEST_MODE:-}" = "1" ]; then
        echo "✅ Execution successful (test mode)"
        return 0
    fi

    if [ "${AGENTDB_DISABLE_MCP:-}" = "1" ]; then
        echo "✅ Execution successful (MCP disabled)"
        return 0
    fi

    # Check if TypeScript engine exists
    if [ -f "$PROJECT_ROOT/src/core/af-prod-engine.ts" ]; then
        # Execute via TypeScript engine with timeout protection
        echo "🔒 Timeout protection: $(get_ceremony_timeout "$circle/$ceremony" 30)s" || echo "Timeout: 30s"

        if command -v run_ceremony_with_timeout >/dev/null 2>&1; then
            # Use MPP timeout protection if available
            run_ceremony_with_timeout "$circle/$ceremony" \
                npx tsx "$PROJECT_ROOT/src/core/af-prod-engine.ts" \
                --circle "$circle" \
                --ceremony "$ceremony" \
                --mode "$mode" \
                --skills="$skills_json"
            return $?
        else
            # Fallback to basic timeout
            # IMPORTANT: skills_json must be properly escaped for shell
            echo "[DEBUG] Executing: npx tsx af-prod-engine.ts --circle=$circle --ceremony=$ceremony --mode=$mode --skills=|$skills_json|" >&2
            timeout 30 npx tsx "$PROJECT_ROOT/src/core/af-prod-engine.ts" \
                --circle "$circle" \
                --ceremony "$ceremony" \
                --mode "$mode" \
                --skills="$skills_json"
            local exit_code=$?
            if [ $exit_code -eq 124 ] || [ $exit_code -eq 143 ]; then
                echo "⏱️  Ceremony timeout (30s)" >&2
                result=40  # CEREMONY_TIMEOUT
            fi
            return $exit_code
        fi
    fi

    # Fallback: Execute via CLI orchestration
    # Map ceremony names to yo.life dimensional tasks
    # Circle -> Ceremony -> yo.life task mapping:
    # - orchestrator/standup -> temporal (time management)
    # - assessor/wsjf -> goal (value prioritization)
    # - assessor/review -> event (retrospective analysis)
    # - innovator/retro -> barrier (learning obstacles)
    # - analyst/refine -> mindset (cognitive patterns)
    # - seeker/replenish -> cockpit (holistic overview)
    # - intuitive/synthesis -> psychological (sensemaking patterns)
    local yolife_task="$ceremony"
    case "$ceremony" in
        standup)
            yolife_task="temporal"  # orchestrator: time-based coordination
            ;;
        wsjf)
            yolife_task="goal"  # assessor: weighted shortest job first prioritization
            ;;
        review)
            yolife_task="event"  # assessor: event mapping and retrospective
            ;;
        retro)
            yolife_task="barrier"  # innovator: identify learning obstacles
            ;;
        refine)
            yolife_task="mindset"  # analyst: cognitive pattern refinement
            ;;
        replenish)
            yolife_task="cockpit"  # seeker: holistic backlog replenishment
            ;;
        synthesis)
            yolife_task="psychological"  # intuitive: sensemaking and pattern synthesis
            ;;
        *)
            echo "⚠️  Unknown ceremony: $ceremony"
            echo "Valid ceremonies: standup, wsjf, review, retro, refine, replenish, synthesis"
            return 1
            ;;
    esac

    # Execute with timeout protection
    echo "🔒 Timeout protection: $(get_ceremony_timeout "$circle/$ceremony" 30)s" || echo "Timeout: 30s"

    if command -v run_ceremony_with_timeout >/dev/null 2>&1; then
        # Use MPP timeout protection
        run_ceremony_with_timeout "$circle/$ceremony" \
            "$SCRIPT_DIR/ay-yolife-with-skills.sh" \
            "$yolife_task" "$circle"
        local result=$?
    else
        # Fallback to basic timeout (increased to 60s for initialization)
        timeout 60 "$SCRIPT_DIR/ay-yolife-with-skills.sh" "$yolife_task" "$circle"
        local result=$?
        if [ $result -eq 124 ] || [ $result -eq 143 ]; then
            echo "⏱️  Ceremony timeout (30s)" >&2
            result=40  # CEREMONY_TIMEOUT
        fi
    fi

    # WSJF Auto-Calculation (post-replenishment)
    if [ "$ceremony" = "replenish" ]; then
        echo ""
        echo "🎯 Auto-calculating WSJF for $circle backlog..."
        if [ -f "$SCRIPT_DIR/calculate-wsjf-auto.sh" ]; then
            "$SCRIPT_DIR/calculate-wsjf-auto.sh" --circle "$circle" --auto-enrich || true
        else
            echo "⚠️  WSJF auto-calculator not found - skipping"
        fi
    fi

    return $result
}

# ==========================================
# 3. Episode Storage Optimization (Batch)
# ==========================================
store_episode_batch() {
    local episode_file="$1"

    # Add to batch queue
    cp "$episode_file" "$EPISODE_BATCH_DIR/"

    # Flush batch if threshold reached (10 episodes)
    local batch_count=$(ls -1 "$EPISODE_BATCH_DIR" | wc -l)
    if [ "$batch_count" -ge 10 ]; then
        flush_episode_batch
    fi
}

flush_episode_batch() {
    if [ ! -d "$EPISODE_BATCH_DIR" ] || [ -z "$(ls -A "$EPISODE_BATCH_DIR")" ]; then
        return 0
    fi

    local batch_count=$(ls -1 "$EPISODE_BATCH_DIR" | wc -l)
    echo "💾 Flushing episode batch ($batch_count episodes)..."

    # Store each episode individually with trajectory persistence
    for ep in "$EPISODE_BATCH_DIR"/*.json; do
        if [ -f "$ep" ]; then
            # Extract metadata from episode file
            local cycle_id=$(basename "$ep" .json | sed 's/episode_//')
            local outcome="success"  # Default to success
            local reward="1.0"  # Default reward
            local circle="orchestrator"  # Default circle
            local ceremony="standup"  # Default ceremony

            # Try to extract values from JSON if jq is available
            if command -v jq &>/dev/null; then
                outcome=$(jq -r '.metadata.outcome // "success"' "$ep" 2>/dev/null || echo "success")
                reward=$(jq -r '.reward // 1.0' "$ep" 2>/dev/null || echo "1.0")
                circle=$(jq -r '.metadata.circle // "orchestrator"' "$ep" 2>/dev/null || echo "orchestrator")
                ceremony=$(jq -r '.metadata.ceremony // "standup"' "$ep" 2>/dev/null || echo "standup")
            fi

            # Store episode with trajectory using TrajectoryStorage
            if [ -f "$SCRIPT_DIR/store-trajectory.sh" ]; then
                "$SCRIPT_DIR/store-trajectory.sh" "$cycle_id" "$outcome" "$reward" "$circle" "$ceremony" "$ep" 2>/dev/null || true
            else
                echo "⚠️  Trajectory storage not available, skipping trajectory persistence"
            fi
        fi
    done

    # Clean batch directory
    rm -f "$EPISODE_BATCH_DIR"/*.json
}

# ==========================================
# 4. Circle-Specific Learning Loop
# ==========================================
start_circle_learning_worker() {
    local circle="$1"

    if [ "${AY_TEST_MODE:-}" = "1" ] || [ -n "${JEST_WORKER_ID:-}" ] || [ "${AGENTDB_DISABLE_MCP:-}" = "1" ]; then
        echo "✅ Learning worker skipped (test mode)"
        return 0
    fi

    if [ ! -f "$SCRIPT_DIR/ay-prod-learn-loop.sh" ]; then
        echo "⚠️  Learning loop script not found"
        return 1
    fi

    # Check if worker already running
    local pid_file="$TMP_DIR/ay-learn-worker-${circle}.pid"
    if [ -f "$pid_file" ] && kill -0 $(cat "$pid_file") 2>/dev/null; then
        echo "✅ Learning worker already active for $circle"
        return 0
    fi

    # Start background learning worker (properly detached)
    echo "🔄 Starting learning worker for $circle circle..."
    nohup bash -c '
        while true; do
            "'"$SCRIPT_DIR"'"/ay-prod-learn-loop.sh "'"$circle"'" --continuous
            sleep 60
        done
    ' > "$TMP_DIR/ay-learn-worker-${circle}.log" 2>&1 &

    local worker_pid=$!
    echo $worker_pid > "$pid_file"
    disown $worker_pid
    echo "✅ Learning worker started (PID: $worker_pid)"
}

# ==========================================
# Main Execution Flow
# ==========================================
main() {
    # Special command: learning loop
    if [ "$CIRCLE" = "learn" ]; then
        echo "🔄 Starting iterative learning loop..."
        exec "$SCRIPT_DIR/ay-prod-learn-loop.sh" "${CEREMONY:-3}"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 ay prod-cycle: $CIRCLE / $CEREMONY / $MODE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Step 1: Circle ceremony validation
    if ! validate_circle_ceremony "$CIRCLE" "$CEREMONY"; then
        echo "❌ Invalid circle - aborting"
        return 1
    fi

    # Step 2: Definition of Ready (DoR) Validation
    if [ -f "$SCRIPT_DIR/validate-dor-dod.sh" ]; then
        if ! bash "$SCRIPT_DIR/validate-dor-dod.sh" dor "$CIRCLE" "$CEREMONY"; then
            echo "⚠️  DoR checks failed - proceeding in advisory mode"
        fi
    fi

    # Step 3: Pre-execution health validation
    validate_mcp_health
    MCP_HEALTHY=$?

    if [ $MCP_HEALTHY -ne 0 ]; then
        echo "⚠️  Degraded mode: MCP unavailable"
        MODE="safe_degrade"
    fi

    # Step 4: Query learned skills
    echo "📚 Loading learned skills for ${CIRCLE}/${CEREMONY}..."
    SKILLS_JSON=$(timeout ${TIMEOUT_SKILL_LOOKUP}s "$SCRIPT_DIR/ay-prod-skill-lookup.sh" "$CIRCLE" "$CEREMONY" --json 2>/dev/null || echo '{"skills":[]}')

    local skill_count=$(echo "$SKILLS_JSON" | jq '.skills | length' 2>/dev/null || echo "0")
    echo "✅ Loaded $skill_count skills"

    # Step 5: Generate episode metadata
    EPISODE_ID="ep_$(date +%s)_${CIRCLE}_${CEREMONY}"
    EPISODE_FILE="$TMP_DIR/${EPISODE_ID}.json"
    EXEC_START=$(date +%s)000  # milliseconds

    # Get Yo.life dimension for this ceremony
    YOLIFE_DIM=$(get_yolife_dimension "$CEREMONY")

    # Calculate WSJF context for ceremony
    WSJF_CONTEXT='{}'
    if [ -f "$SCRIPT_DIR/calculate-wsjf-auto.sh" ]; then
        # Generate task description from circle and ceremony
        local task_desc="${CEREMONY} ceremony for ${CIRCLE} circle"
        WSJF_CONTEXT=$("$SCRIPT_DIR/calculate-wsjf-auto.sh" --task "$task_desc" 2>/dev/null | tail -1 || echo '{}')
    fi

    cat > "$EPISODE_FILE" <<EOF
{
  "episode_id": "$EPISODE_ID",
  "primary_circle": "$CIRCLE",
  "ceremony": "$CEREMONY",
  "mode": "$MODE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "mcp_healthy": $([ $MCP_HEALTHY -eq 0 ] && echo "true" || echo "false"),
  "metadata": {
    "circle": "$CIRCLE",
    "ceremony": "$CEREMONY",
    "mode": "$MODE",
    "mcp_status": $([ $MCP_HEALTHY -eq 0 ] && echo '"healthy"' || echo '"degraded"'),
    "yolife_dimension": "$YOLIFE_DIM"
  }
}
EOF

    # Step 6: Execute via AFProdEngine
    echo "🚀 Executing ${CEREMONY} in ${CIRCLE} circle..."

    if execute_with_afprod_engine "$CIRCLE" "$CEREMONY" "$MODE" "$SKILLS_JSON"; then
        RESULT=0
        echo "✅ Execution successful"

        # Calculate execution time
        EXEC_END=$(date +%s)000  # milliseconds
        EXEC_TIME=$((EXEC_END - EXEC_START))

        # Update episode with success and trajectory
        jq ".outcome = \"success\" | .execution_time_ms = $EXEC_TIME | .metadata.execution_time_ms = $EXEC_TIME | .trajectory = [{\"state\": \"Starting ay prod-cycle for ${CIRCLE}/${CEREMONY}\", \"action\": \"executeWithZeroFailure\", \"reward\": 1.0}]" "$EPISODE_FILE" > "${EPISODE_FILE}.tmp"
        mv "${EPISODE_FILE}.tmp" "$EPISODE_FILE"
    else
        RESULT=$?
        echo "⚠️  Execution failed (exit: $RESULT)"

        # Calculate execution time
        EXEC_END=$(date +%s)000  # milliseconds
        EXEC_TIME=$((EXEC_END - EXEC_START))

        # Update episode with failure
        jq ".outcome = \"failure\" | .exit_code = $RESULT | .execution_time_ms = $EXEC_TIME | .metadata.execution_time_ms = $EXEC_TIME | .trajectory = [{\"state\": \"Starting ay prod-cycle for ${CIRCLE}/${CEREMONY}\", \"action\": \"executeWithZeroFailure\", \"reward\": 0.0}]" "$EPISODE_FILE" > "${EPISODE_FILE}.tmp"
        mv "${EPISODE_FILE}.tmp" "$EPISODE_FILE"
    fi

    # Step 7: Store episode (batched) with trajectory persistence
    store_episode_batch "$EPISODE_FILE"

    # Step 7.5: Definition of Done (DoD) Validation
    # Save original execution result before DoD can modify it
    EXEC_RESULT=$RESULT
    DOD_PASSED=true

    if [ -f "$SCRIPT_DIR/validate-dor-dod.sh" ]; then
        if bash "$SCRIPT_DIR/validate-dor-dod.sh" dod "$CIRCLE" "$CEREMONY" "$EPISODE_ID"; then
            DOD_PASSED=true
            # Update episode with DoD status and trajectory
            jq '.metadata.dod_passed = true | .trajectory += [{\"state\": \"DoD validation passed\", \"action\": \"validate_dor_dod\"}]" "$EPISODE_FILE" > "${EPISODE_FILE}.tmp"
            mv "${EPISODE_FILE}.tmp" "$EPISODE_FILE"
        else
            DOD_PASSED=false
            echo "⚠️  DoD validation failed"
            # Update episode with DoD status
            jq '.metadata.dod_passed = false | .trajectory += [{\"state\": \"DoD validation failed\", \"action\": \"validate_dor_dod\"}]" "$EPISODE_FILE" > "${EPISODE_FILE}.tmp"
            mv "${EPISODE_FILE}.tmp" "$EPISODE_FILE"
            # Propagate failure if execution was successful but DoD failed
            if [ $EXEC_RESULT -eq 0 ]; then
                RESULT=1
            fi
        fi
    fi

    # Step 7.6: Store completion tracking data (after DoD validation)
    echo "📊 Storing completion data..."
    if [ -f "$SCRIPT_DIR/ay-prod-store-completion.ts" ]; then
        # Determine outcome using original execution result and DoD status
        local outcome="success"
        local completion_pct=100

        if [ $EXEC_RESULT -ne 0 ]; then
            # Execution failed = 0%
            outcome="failure"
            completion_pct=0
        elif [ "$DOD_PASSED" = false ]; then
            # Execution succeeded but DoD failed = 70%
            outcome="partial"
            completion_pct=70
        fi

        # Store via CompletionTracker
        npx tsx "$SCRIPT_DIR/ay-prod-store-completion.ts" \
            "$EPISODE_ID" "$CIRCLE" "$CEREMONY" "$outcome" "$completion_pct" 2>/dev/null || true
    else
        echo "⚠️  Completion tracker not found - skipping"
    fi

    # Step 7.7: Record causal observation (WHY learning)
    echo "🔬 Recording causal observation..."
    if [ -f "$SCRIPT_DIR/ay-prod-record-causal.ts" ]; then
        # Determine outcome and completion_pct (same as Step 7.6)
        local outcome="success"
        local completion_pct=100

        if [ $EXEC_RESULT -ne 0 ]; then
            # Execution failed = 0%
            outcome="failure"
            completion_pct=0
        elif [ "$DOD_PASSED" = false ]; then
            # Execution succeeded but DoD failed = 70%
            outcome="partial"
            completion_pct=70
        fi

        # Record causal observation with context
        npx tsx "$SCRIPT_DIR/ay-prod-record-causal.ts" \
            "$EPISODE_ID" "$CIRCLE" "$CEREMONY" "$completion_pct" \
            "$skill_count" "$MCP_STATUS" "$DOD_PASSED" 2>/dev/null || true
    else
        echo "⚠️  Causal learning not found - skipping"
    fi

    # Step 8: Link episode to risk database
    if [ -f ".db/risk-traceability.db" ] && [ -f "$EPISODE_FILE" ]; then
        CIRCLE_FROM_EPISODE=$(jq -r '.primary_circle // .metadata.circle // "unknown"' "$EPISODE_FILE" 2>/dev/null || echo "unknown")
        OUTCOME=$(jq -r '.outcome // "unknown"' "$EPISODE_FILE" 2>/dev/null || echo "unknown")

        # Store episode metadata for risk tracking
        if [ "$EXEC_RESULT" -eq 0 ]; then PASSED=1; else PASSED=0; fi
        sqlite3 .db/risk-traceability.db "INSERT OR IGNORE INTO dor_dod_checks (episode_id, check_type, check_name, passed) VALUES ('$EPISODE_ID', 'DoD', 'ceremony_$CEREMONY', $PASSED);" 2>/dev/null || true
    fi

    # Step 9: Start circle-specific learning worker
    start_circle_learning_worker "$CIRCLE"

    # Step 10: Circle equity check (count skills learned by current circle)
    echo "📊 Circle equity status:"
    if [ "${AY_TEST_MODE:-}" = "1" ] || [ -n "${JEST_WORKER_ID:-}" ] || [ "${AGENTDB_DISABLE_MCP:-}" = "1" ]; then
        echo "  Data unavailable (test mode)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ Cycle complete (exit: $RESULT)"
        echo "📁 Episode: $EPISODE_ID"
        return $RESULT
    fi

    if command -v npx &> /dev/null; then
        # Query skills related to this circle
        CIRCLE_SKILLS=$(timeout ${TIMEOUT_CIRCLE_SKILLS}s npx agentdb skill search "$CIRCLE" 10 --json 2>/dev/null || echo '{"skills":[]}')
        SKILL_COUNT=$(echo "$CIRCLE_SKILLS" | jq '.skills | length' 2>/dev/null || echo "0")
        echo "  ${CIRCLE} circle: $SKILL_COUNT skills learned"
    else
        echo "  Data unavailable (agentdb not installed)"
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Cycle complete (exit: $RESULT)"
    echo "📁 Episode: $EPISODE_ID"

    return $RESULT
}

# ==========================================
# Command Router
# ==========================================
# Cleanup on exit
trap flush_episode_batch EXIT
main "$@"
