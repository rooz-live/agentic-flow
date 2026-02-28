#!/usr/bin/env bash
# compare-all-validators.sh - Run ALL validators on given emails and write CONSOLIDATION-TRUTH-REPORT.md
#
# Input: Paths to .eml/.md files, or --latest (resolve latest .eml from Desktop/Downloads/legal dirs)
# Output: reports/CONSOLIDATION-TRUTH-REPORT.md with run metadata, results table, coverage, discrepancies
#
# Usage:
#   ./scripts/compare-all-validators.sh path/to/file.eml path/to/other.md
#   ./scripts/compare-all-validators.sh --latest
#   ./scripts/compare-all-validators.sh --json
#   ./scripts/compare-all-validators.sh   # uses in-repo docs/110-frazier drafts if no args

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORT_FILE="$PROJECT_ROOT/reports/CONSOLIDATION-TRUTH-REPORT.md"
mkdir -p "$PROJECT_ROOT/reports"

JSON_OUTPUT=false
SELF_TEST=false
POSITIONAL_ARGS=()
LATEST_FLAG=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --latest) LATEST_FLAG=true; shift ;;
        --json) JSON_OUTPUT=true; shift ;;
        --self-test) SELF_TEST=true; shift ;;
        *) POSITIONAL_ARGS+=("$1"); shift ;;
    esac
done

# Resolve files to validate
resolve_input_files() {
    if [[ "$LATEST_FLAG" == "true" ]]; then
        find_latest_email
        return
    fi
    if [[ ${#POSITIONAL_ARGS[@]} -gt 0 ]]; then
        printf '%s\n' "${POSITIONAL_ARGS[@]}"
        return
    fi
    # Default: in-repo 110-frazier drafts
    local default1="$PROJECT_ROOT/docs/110-frazier/EMAIL-TO-LANDLORD-110-FRAZIER.md"
    local default2="$PROJECT_ROOT/docs/110-frazier/EMAIL-TO-AMANDA-REQUEST-APPROVAL.md"
    [[ -f "$default1" ]] && echo "$default1"
    [[ -f "$default2" ]] && echo "$default2"
}


find_latest_email() {
    local search_paths=(
        "$HOME/Desktop/EMAIL-"*.eml
        "$HOME/Downloads/EMAIL-"*.eml
        "$PROJECT_ROOT/docs/110-frazier/"*.md
    )
    for pattern in "${search_paths[@]}"; do
        local latest
        latest=$(ls -t $pattern 2>/dev/null | head -1)
        if [[ -n "$latest" && -f "$latest" ]]; then
            echo "$latest"
            return 0
        fi
    done
    return 1
}

# Run a validator and capture exit code and one-line summary (strip ANSI)
run_validator() {
    local name="$1"
    local cmd="$2"
    local exit_code=0
    local summary="SKIP"
    local outfile
    outfile=$(mktemp "${RESULTS_DIR}/validator-out.XXXXXX")
    # Use bash -c with 60s timeout to avoid hangs from slow validators
    timeout 60 bash -c "$cmd" > "$outfile" 2>&1 || exit_code=$?
    # Detect PASS/FAIL from output file (avoids bash variable size limits)
    if grep -qiE 'PASS|APPROVED TO SEND|passed|FRESH|"result"[[:space:]]*:[[:space:]]*"PASS"|checks_passed' "$outfile" 2>/dev/null; then
        summary="PASS"
    elif grep -qiE 'FAIL|BLOCKED|failed|STALE|"result"[[:space:]]*:[[:space:]]*"FAIL"' "$outfile" 2>/dev/null; then
        summary="FAIL"
    elif [[ $exit_code -eq 0 ]]; then
        # Exit 0 with no keyword match → treat as PASS (handles JSON-only output)
        summary="PASS"
    fi
    # When output contains BOTH PASS and FAIL, let the overall verdict win
    if [[ "$summary" == "PASS" ]] && grep -qiE 'Overall:.*FAIL|VALIDATION:.*FAIL|verdict.*FAIL' "$outfile" 2>/dev/null; then
        summary="FAIL"
    fi
    local first_line
    first_line=$(sed 's/\x1b\[[0-9;]*m//g' "$outfile" | grep -v '^[[:space:]]*$' | head -1 | tr '|' ' ' | cut -c1-80)
    rm -f "$outfile"
    echo "${exit_code}|${summary}|${first_line}"
}

# --- Collect file list
FILES=()
while IFS= read -r f; do
    [[ -n "$f" && -f "$f" ]] && FILES+=("$f")
done < <(resolve_input_files)

if [[ ${#FILES[@]} -eq 0 ]]; then
    echo "No files to validate. Usage: $0 [--latest] [--json] [path/to/file.eml ...]" >&2
    exit 1
fi

# --- Temp results for this run
RESULTS_DIR=$(mktemp -d)
trap 'rm -rf "$RESULTS_DIR"' EXIT

RUN_TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RUN_CMD="compare-all-validators.sh $*"

# File-level validators: name, command_template (use FILE for path)
VALIDATOR_FILE_DIR="$SCRIPT_DIR/validators/file"
VALIDATOR_PROJ_DIR="$SCRIPT_DIR/validators/project"

FILE_VALIDATORS=(
    "pre-send-email-gate.sh|SKIP_MESH=true $VALIDATOR_FILE_DIR/pre-send-email-gate.sh FILE"
    "validation-runner.sh|$VALIDATOR_FILE_DIR/validation-runner.sh FILE"
    "pre-send-email-workflow.sh|COMPARE_MODE=true AUTO_REPLACE_PLACEHOLDERS=false $VALIDATOR_FILE_DIR/pre-send-email-workflow.sh FILE"
    "comprehensive-wholeness-validator.sh|$VALIDATOR_FILE_DIR/comprehensive-wholeness-validator.sh --target-file FILE"
    "mail-capture-validate.sh|$VALIDATOR_FILE_DIR/mail-capture-validate.sh --file FILE"
)

# Project-level validators: name, command (no file)
PROJECT_VALIDATORS=(
    "unified-validation-mesh.sh|cd $PROJECT_ROOT && $VALIDATOR_PROJ_DIR/unified-validation-mesh.sh validate personal-only"
    "validate_coherence.py|cd $PROJECT_ROOT && python3 $VALIDATOR_PROJ_DIR/validate_coherence.py --quiet --json 2>&1"
    "check_roam_staleness.py|cd $PROJECT_ROOT && python3 $VALIDATOR_PROJ_DIR/check_roam_staleness.py --roam-path $PROJECT_ROOT/ROAM_TRACKER.yaml 2>&1"
    "contract-enforcement-gate.sh|cd $PROJECT_ROOT && $VALIDATOR_PROJ_DIR/contract-enforcement-gate.sh roam"
)

# Run file-level validators per file (quote file path so spaces don't break bash -c → fixes exit 126)
for file in "${FILES[@]}"; do
    base=$(basename "$file")
    for entry in "${FILE_VALIDATORS[@]}"; do
        name="${entry%%|*}"
        cmd="${entry#*|}"
        cmd="${cmd//FILE/\"$file\"}"
        result=$(run_validator "$name" "$cmd" "$file")
        echo "$base|$name|$result" >> "$RESULTS_DIR/file_results.txt"
    done
done

# Run project-level validators once
for entry in "${PROJECT_VALIDATORS[@]}"; do
    name="${entry%%|*}"
    cmd="${entry#*|}"
    result=$(run_validator "$name" "$cmd" "")
    echo "PROJECT|$name|$result" >> "$RESULTS_DIR/project_results.txt"
done

# --- Compute %/# metrics (file_results: file|name|exit|summary|note; project_results: PROJECT|name|exit|summary|note)
file_total=0
file_pass=0
file_fail=0
file_skip=0
while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    file_total=$((file_total + 1))
    summary=$(echo "$line" | cut -d'|' -f4)
    case "$summary" in
        PASS) file_pass=$((file_pass + 1)) ;;
        FAIL) file_fail=$((file_fail + 1)) ;;
        *)    file_skip=$((file_skip + 1)) ;;
    esac
done < "$RESULTS_DIR/file_results.txt" 2>/dev/null || true

proj_total=0
proj_pass=0
proj_fail=0
proj_skip=0
while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    proj_total=$((proj_total + 1))
    summary=$(echo "$line" | cut -d'|' -f4)
    case "$summary" in
        PASS) proj_pass=$((proj_pass + 1)) ;;
        FAIL) proj_fail=$((proj_fail + 1)) ;;
        *)    proj_skip=$((proj_skip + 1)) ;;
    esac
done < "$RESULTS_DIR/project_results.txt" 2>/dev/null || true

file_pct=0
[[ $file_total -gt 0 ]] && file_pct=$((file_pass * 100 / file_total))
proj_pct=0
[[ $proj_total -gt 0 ]] && proj_pct=$((proj_pass * 100 / proj_total))

# "What works NOW": validators that passed on every file they ran on
green_file_validators=()
for entry in "${FILE_VALIDATORS[@]}"; do
    name="${entry%%|*}"
    run_count=$(grep -c "|${name}|" "$RESULTS_DIR/file_results.txt" 2>/dev/null || true)
    run_count=${run_count:-0}; run_count=${run_count//[^0-9]/}
    pass_count=$(grep "|${name}|" "$RESULTS_DIR/file_results.txt" 2>/dev/null | grep -c "|PASS|" 2>/dev/null || true)
    pass_count=${pass_count:-0}; pass_count=${pass_count//[^0-9]/}
    if [[ "$run_count" -gt 0 && "$run_count" -eq "$pass_count" ]]; then
        green_file_validators+=("$name")
    fi
done
green_proj_validators=()
for entry in "${PROJECT_VALIDATORS[@]}"; do
    name="${entry%%|*}"
    if grep "|${name}|" "$RESULTS_DIR/project_results.txt" 2>/dev/null | grep -q "|PASS|" 2>/dev/null || false; then
        green_proj_validators+=("$name")
    fi
done

# --- Build report
{
    echo "# Consolidation Truth Report"
    echo ""
    echo "## What works NOW"
    green_file_str="none"
    if [[ ${#green_file_validators[@]} -gt 0 ]]; then
        green_file_str=$(IFS=,; echo "${green_file_validators[*]}")
    fi
    green_proj_str="none"
    if [[ ${#green_proj_validators[@]} -gt 0 ]]; then
        green_proj_str=$(IFS=,; echo "${green_proj_validators[*]}")
    fi
    echo "- **File-level:** $file_pass/$file_total passed ($file_pct%). Green: $green_file_str"
    echo "- **Project-level:** $proj_pass/$proj_total passed ($proj_pct%). Green: $green_proj_str"
    echo "- **Conflicting verdicts:** See Discrepancies below."
    echo ""
    echo "## Run metadata"
    echo "- **Date:** $RUN_TS"
    echo "- **Command:** \`$RUN_CMD\`"
    echo "- **Files validated:** ${#FILES[@]}"
    for f in "${FILES[@]}"; do echo "  - $(basename "$f")"; done
    echo ""

    echo "## Coverage metrics (%/#)"
    echo "*(Standard: %/# = state; %.# = velocity. See docs/VALIDATION_METRICS_AND_PROGRESS.md for 4D Progress and one-constant relation.)*"
    echo ""
    echo "| Scope | Passed | Failed | Skipped | Total | % |"
    echo "|-------|--------|--------|---------|-------|---|"
    echo "| File-level | $file_pass | $file_fail | $file_skip | $file_total | $file_pct% |"
    echo "| Project-level | $proj_pass | $proj_fail | $proj_skip | $proj_total | $proj_pct% |"
    echo ""

    echo "## Per-run results"
    echo "| Validator | File(s) | Exit | Result | Notes |"
    echo "|-----------|---------|------|--------|-------|"
    while IFS= read -r line; do
        file_part="${line%%|*}"; rest="${line#*|}"; name="${rest%%|*}"; rest="${rest#*|}"
        exit_code="${rest%%|*}"; rest="${rest#*|}"; summary="${rest%%|*}"; note="${rest#*|}"
        echo "| $name | $file_part | $exit_code | $summary | ${note:0:50} |"
    done < "$RESULTS_DIR/file_results.txt" 2>/dev/null || true
    while IFS= read -r line; do
        rest="${line#*|}"; name="${rest%%|*}"; rest="${rest#*|}"; exit_code="${rest%%|*}"; rest="${rest#*|}"; summary="${rest%%|*}"; note="${rest#*|}"
        echo "| $name | (project) | $exit_code | $summary | ${note:0:50} |"
    done < "$RESULTS_DIR/project_results.txt" 2>/dev/null || true
    echo ""

    echo "## Coverage"
    echo "- **File-level:** pre-send-email-gate.sh, validation-runner.sh, pre-send-email-workflow.sh, comprehensive-wholeness-validator.sh, mail-capture-validate.sh"
    echo "- **Project-level:** unified-validation-mesh.sh, validate_coherence.py, check_roam_staleness.py, contract-enforcement-gate.sh"
    echo ""

    echo "## Discrepancies"
    echo "Same file, different result across validators:"
    for file in "${FILES[@]}"; do
        base=$(basename "$file")
        pass_count=$(grep "^${base}|" "$RESULTS_DIR/file_results.txt" 2>/dev/null | grep -c "|PASS|" 2>/dev/null || echo "0")
        pass_count=${pass_count//[^0-9]/}
        fail_count=$(grep "^${base}|" "$RESULTS_DIR/file_results.txt" 2>/dev/null | grep -c "|FAIL|" 2>/dev/null || echo "0")
        fail_count=${fail_count//[^0-9]/}
        pass_count=$((pass_count + 0)); fail_count=$((fail_count + 0))
        if [[ "$pass_count" -gt 0 && "$fail_count" -gt 0 ]]; then
            echo "- **$base:** mixed PASS/FAIL (review per-validator output above)"
        fi
    done
    echo ""

    echo "## Coherence (DDD/ADR/TDD/PRD)"
    echo "When validate_coherence.py exit 0, see its JSON/output for structural coherence. Traceability: docs/VALIDATION-PIPELINE-TRACING.md"
    echo ""
    echo "## Triggering from CLIs (max coverage)"
    echo "- **Semi-auto (runner + gate):** \`advocate validate-email <file>\` or \`ay validate-email <file>\`"
    echo "- **Full comparison (%/# in this report):** \`advocate compare-validators [--latest] [files...]\` or \`ay compare-validators [--latest] [files...]\`"
    echo "- **Single source of truth (per-check):** \`./scripts/validation-core.sh email --file <path> --check placeholders|signature|citations|attachments|all [--json]\`"
    echo ""
    echo "## Architecture"
    echo "- **validation-core.sh:** Pure functions + CLI; input = file path (+ optional skip flags); output = PASS/FAIL/SKIP lines or JSON. No state."
    echo "- **validation-runner.sh:** Orchestration only; sources core, aggregates exit codes, prints summary. No state."
    echo "- **Stateful scripts:** unified-validation-mesh.sh (VALIDATION_STATE_DIR), mcp-auto-heal.sh (CIRCUIT_STATE_FILE), warp_health_monitor.sh (STATE_FILE). Comparison runs may be order-dependent where cyclic regression or state is used."
    echo "- **Check order:** Cyclic regression in unified-validation-mesh depends on prior run state; first run may differ."
    echo "- **Auto-fix:** unified-validation-mesh can mutate shared email files; run compare with read-only or on copies if comparing before/after."
    echo ""

    echo "## Stub vs implementation"
    echo "| Implemented | Deferred |"
    echo "|-------------|----------|"
    echo "| compare-all-validators.sh, validation-v1-wip.sh (WIP subset: gate + runner only), validation-core.sh, validation-runner.sh, pre-send-email-gate.sh, unified-validation-mesh.sh, pre-send-email-workflow.sh | RAG/AgentDB vector storage, LLMLingua, LazyLLM, BE tokens |"
    echo ""
    echo "---"
    echo ""

} > "$REPORT_FILE"

# --- DPC / %.# Baseline tracking
# Save metrics for velocity computation on next run.
# DPC(t) = %/# × R(t), where R(t) = implemented / declared (anti-fragility).
# DPC_R(t) = (coverage/100) × (T_remain/T_total) × urgency × R(t)
# implemented/declared are now DYNAMIC — computed from green validator counts.
# T_start = sprint start, T_target = trial deadline, T_total = T_target - T_start.
BASELINE_FILE="$PROJECT_ROOT/reports/.validation-baseline.json"
declared=$(( ${#FILE_VALIDATORS[@]} + ${#PROJECT_VALIDATORS[@]} ))  # total declared validators
implemented=$(( ${#green_file_validators[@]} + ${#green_proj_validators[@]} ))  # validators that actually pass
robustness=0
[[ $declared -gt 0 ]] && robustness=$(( implemented * 100 / declared ))
total_runs=$(( file_total + proj_total ))
coverage_count=$(( file_pass + proj_pass ))
coverage_pct=0
[[ $total_runs -gt 0 ]] && coverage_pct=$(( coverage_count * 100 / total_runs ))

# --- Time-based metrics (normalized)
# T_START: sprint/effort start date; T_TARGET: trial deadline
T_START="2026-02-18"
T_TARGET="2026-03-03"
now_epoch=$(date +%s)
target_epoch=$(date -j -f "%Y-%m-%d" "$T_TARGET" +%s 2>/dev/null || date -d "$T_TARGET" +%s 2>/dev/null || echo "$now_epoch")
start_epoch=$(date -j -f "%Y-%m-%d" "$T_START" +%s 2>/dev/null || date -d "$T_START" +%s 2>/dev/null || echo "$now_epoch")
time_remaining_days=$(( (target_epoch - now_epoch) / 86400 ))
[[ $time_remaining_days -lt 0 ]] && time_remaining_days=0
total_sprint_days=$(( (target_epoch - start_epoch) / 86400 ))
[[ $total_sprint_days -lt 1 ]] && total_sprint_days=1

# T_ratio: 1.0 at sprint start → 0.0 at deadline (normalized time budget remaining)
# urgency_factor: inverse of T_ratio — rises as deadline approaches (capped at 100)
time_ratio_pct=$(( time_remaining_days * 100 / total_sprint_days ))
[[ $time_ratio_pct -gt 100 ]] && time_ratio_pct=100
urgency_factor=100
[[ $time_ratio_pct -gt 0 ]] && urgency_factor=$(( 10000 / time_ratio_pct ))  # 100/ratio, scaled ×100
[[ $urgency_factor -gt 10000 ]] && urgency_factor=10000  # cap at 100× (expressed as 10000/100)

# DPC(t) = coverage × robustness (steady-state metric, 0-100)
dpc=$(( coverage_pct * robustness / 100 ))
# DPC_R(t) = (coverage/100) × (T_remain/T_total) × R(t) — normalized, 0-100 range
# This decays toward 0 as deadline approaches (pressure signal)
dpc_r_score=$(( coverage_pct * time_ratio_pct * robustness / 10000 ))

# DPC_U(t) = DPC(t) × urgency_factor/100 — urgency-adjusted score (unbounded upward)
# Rises when DPC is high AND deadline is near ("pressure gauge").
# Low DPC + high urgency → moderate DPC_U (still behind).
# High DPC + high urgency → high DPC_U (on track under pressure).
# Capped at 999 for display sanity.
dpc_u_raw=$(( dpc * urgency_factor / 100 ))
[[ $dpc_u_raw -gt 999 ]] && dpc_u_raw=999

# Urgency zone classification (for dashboard / alerting)
if [[ $time_ratio_pct -ge 75 ]]; then
    urgency_zone="GREEN"
elif [[ $time_ratio_pct -ge 50 ]]; then
    urgency_zone="YELLOW"
elif [[ $time_ratio_pct -ge 25 ]]; then
    urgency_zone="ORANGE"
else
    urgency_zone="RED"
fi

velocity_line=""
velocity_ema=""
if [[ -f "$BASELINE_FILE" ]]; then
    prev_ts=$(python3 -c "import json; print(json.load(open('$BASELINE_FILE')).get('timestamp',''))" 2>/dev/null || true)
    prev_cov=$(python3 -c "import json; print(json.load(open('$BASELINE_FILE')).get('coverage_pct',0))" 2>/dev/null || echo 0)
    prev_ema=$(python3 -c "import json; print(json.load(open('$BASELINE_FILE')).get('velocity_ema',0))" 2>/dev/null || echo 0)
    if [[ -n "$prev_ts" ]]; then
        delta_cov=$((coverage_pct - prev_cov))
        now_epoch=$(date +%s)
        prev_epoch=$(python3 -c "from datetime import datetime; print(int(datetime.fromisoformat('${prev_ts}'.replace('Z','+00:00')).timestamp()))" 2>/dev/null || echo "$now_epoch")
        delta_min=$(( (now_epoch - prev_epoch) / 60 ))
        if [[ $delta_min -gt 0 ]]; then
            vel_per_min=$(python3 -c "print(f'{${delta_cov}/${delta_min}:.2f}')" 2>/dev/null || echo "0")
            # EMA(t) = α × sample + (1-α) × EMA(t-1), α = 0.3
            velocity_ema=$(python3 -c "print(f'{0.3 * (${delta_cov}/${delta_min}) + 0.7 * ${prev_ema}:.2f}')" 2>/dev/null || echo "0")
            velocity_line="- **%.# velocity:** ${delta_cov}% in ${delta_min}min = ${vel_per_min}%/min (EMA: ${velocity_ema}%/min)"
        fi
    fi
fi

# Append DPC section to report
{
    echo ""
    echo "## DPC (Delivery Progress Constant)"
    echo "- **%/# coverage:** ${coverage_pct}% ($((file_pass+proj_pass))/$((file_total+proj_total)))"
    echo "- **R(t) robustness:** ${robustness}% (${implemented}/${declared} implemented)"
    echo "- **DPC(t) = %/# × R(t):** ${dpc}"
    echo "- **T_remain/T_total:** ${time_ratio_pct}% (${time_remaining_days}d / ${total_sprint_days}d) [${T_START} → ${T_TARGET}]"
    echo "- **DPC_R(t) = C × (T/T₀) × R:** ${dpc_r_score} (normalized, decays → 0 at deadline)"
    echo "- **DPC_U(t) = DPC × urgency:** ${dpc_u_raw} (pressure gauge — rises near deadline if DPC maintained)"
    echo "- **Urgency factor:** ${urgency_factor}/100 (rises as deadline approaches)"
    echo "- **Urgency zone:** ${urgency_zone}"
    [[ -n "$velocity_line" ]] && echo "$velocity_line"
    echo ""
} >> "$REPORT_FILE"

# Save baseline (include velocity_ema, time_ratio for next EMA computation)
cat > "$BASELINE_FILE" <<BASELINE_EOF
{"timestamp":"$RUN_TS","file_pass":$file_pass,"file_total":$file_total,"proj_pass":$proj_pass,"proj_total":$proj_total,"coverage_pct":$coverage_pct,"robustness":$robustness,"dpc":$dpc,"dpc_r":$dpc_r_score,"dpc_u":$dpc_u_raw,"time_ratio_pct":$time_ratio_pct,"time_remaining_days":$time_remaining_days,"total_sprint_days":$total_sprint_days,"urgency_factor":$urgency_factor,"urgency_zone":"$urgency_zone","implemented":$implemented,"declared":$declared,"velocity_ema":${velocity_ema:-0}}
BASELINE_EOF

if [[ "$JSON_OUTPUT" == "true" ]]; then
    JSON_FILE="$PROJECT_ROOT/reports/CONSOLIDATION-TRUTH-REPORT.json"
    cat <<EOF > "$JSON_FILE"
{
  "run_ts": "$RUN_TS",
  "command": "$RUN_CMD",
  "files_validated": ${#FILES[@]},
  "metrics": {
    "file_level": { "pass": $file_pass, "fail": $file_fail, "skip": $file_skip, "total": $file_total, "pct": $file_pct },
    "project_level": { "pass": $proj_pass, "fail": $proj_fail, "skip": $proj_skip, "total": $proj_total, "pct": $proj_pct },
    "dpc_metrics": {
      "coverage_pct": $coverage_pct,
      "coverage_count": $coverage_count,
      "time_remaining_days": $time_remaining_days,
      "total_sprint_days": $total_sprint_days,
      "time_ratio_pct": $time_ratio_pct,
      "urgency_factor": $urgency_factor,
      "robustness_factor": $robustness,
      "dpc": $dpc,
      "dpc_r_score": $dpc_r_score,
      "dpc_u_score": $dpc_u_raw,
      "urgency_zone": "$urgency_zone"
    }
  },
  "green_validators": {
    "file_level": [$(joined=$(printf '"%s",' "${green_file_validators[@]:-}"); echo "${joined%,}")],
    "project_level": [$(joined=$(printf '"%s",' "${green_proj_validators[@]:-}"); echo "${joined%,}")]
  }
}
EOF
    echo "$JSON_FILE"
else
    echo "Report written to $REPORT_FILE"
    echo "DPC(t)=$dpc  DPC_R(t)=$dpc_r_score  DPC_U(t)=$dpc_u_raw  C=${coverage_pct}%  R=${robustness}%  T=${time_ratio_pct}%  zone=$urgency_zone  [${implemented}/${declared} green, ${time_remaining_days}d left]"
fi

# --- Self-test mode: verify DPC is sane
if [[ "$SELF_TEST" == "true" ]]; then
    echo ""
    echo "=== SELF-TEST ==="
    errors=0
    # Check 1: declared > 0
    if [[ $declared -eq 0 ]]; then
        echo "FAIL: declared=0 (no validators registered)"
        errors=$((errors + 1))
    else
        echo "PASS: declared=$declared validators registered"
    fi
    # Check 2: implemented <= declared
    if [[ $implemented -gt $declared ]]; then
        echo "FAIL: implemented($implemented) > declared($declared)"
        errors=$((errors + 1))
    else
        echo "PASS: implemented=$implemented <= declared=$declared"
    fi
    # Check 3: DPC in [0,100]
    if [[ $dpc -lt 0 || $dpc -gt 100 ]]; then
        echo "FAIL: DPC=$dpc out of range [0,100]"
        errors=$((errors + 1))
    else
        echo "PASS: DPC=$dpc in range [0,100]"
    fi
    # Check 4: coverage_pct in [0,100]
    if [[ $coverage_pct -lt 0 || $coverage_pct -gt 100 ]]; then
        echo "FAIL: coverage_pct=$coverage_pct out of range"
        errors=$((errors + 1))
    else
        echo "PASS: coverage_pct=$coverage_pct in range"
    fi
    # Check 5: DPC_R in [0,100]
    if [[ $dpc_r_score -lt 0 || $dpc_r_score -gt 100 ]]; then
        echo "FAIL: DPC_R=$dpc_r_score out of range [0,100]"
        errors=$((errors + 1))
    else
        echo "PASS: DPC_R=$dpc_r_score in range [0,100]"
    fi
    # Check 6: time_ratio_pct in [0,100]
    if [[ $time_ratio_pct -lt 0 || $time_ratio_pct -gt 100 ]]; then
        echo "FAIL: time_ratio=$time_ratio_pct out of range [0,100]"
        errors=$((errors + 1))
    else
        echo "PASS: time_ratio=$time_ratio_pct% (${time_remaining_days}d/${total_sprint_days}d)"
    fi
    echo "---"
    if [[ $errors -gt 0 ]]; then
        echo "SELF-TEST: $errors error(s) detected"
        exit 1
    else
        echo "SELF-TEST: ALL CHECKS PASSED (DPC=$dpc, DPC_R=$dpc_r_score, DPC_U=$dpc_u_raw, R=$robustness%, C=$coverage_pct%, T=$time_ratio_pct%, zone=$urgency_zone)"
    fi
fi
