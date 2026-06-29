#!/usr/bin/env bash
# CICD contract tests — fast tier (gates/pace/provenance) vs slow tier (deploy/OP live).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

FAST_TESTS=(
  test_cls_manifest_canonical.sh
  test_perceive_metrics_split.sh
  test_tick_post_hooks_contract.sh
  test_ceremony_engine.sh
  test_max_roi_iterate.sh
  test_inbox_minimal_zero.sh
  test_loop_item_binding_contract.sh
  test_wsjf_canonical_owner.sh
  test_tld_targets_generator.sh
  test_lnnnl_dual_lane_contract.sh
  test_receipt_chain.sh
  test_receipt_chain_enforce.sh
  test_tick_post_timescape_order.sh
  test_tick_post_stale_enforce.sh
  test_tick_post_trap_pace_order.sh
  test_emit_ci_provenance_failclosed.sh
  test_provenance.sh
  test_tick_post_trap_on_exit.sh
  test_update_lnnnl_integrity.sh
  test_ruflo_upgrade_contract.sh
  test_version_portfolio_probe.sh
  test_render_version_pins.sh
  test_roam_edge_contract.sh
  test_dor_dod_matrix.sh
  test_auto_dor_contract.sh
  test_tick_rehydration_manifest.sh
  test_session_rehydration_reader.sh
  test_doctor_shape_consistency.sh
)

SLOW_TESTS=(
  test_ruflo_doctor_remediate.sh
  test_redblue_mock.sh
  test_redblue_mock_judge.sh
  test_wsjf_ruflo_exec.sh
  test_op_invert_bootstrap.sh
  test_wave_autopilot_contract.sh
  test_deploy_happy_path_contract.sh
  test_deploy_receipt_behavior.sh
  test_intel_pipeline_contract.sh
  test_exit_artifact_inbox.sh
  test_ruflo_plugins_manifest.sh
  test_memory_graph_config.sh
  test_ruflo_plugins_installed.sh
  test_agenticow_mcp_smoke.sh
  test_ruflo_mcp_smoke.sh
  test_weight_eft_probe.sh
)

# AF_SLOW_SKIP_CONTRACTS: explicit, NAMED allowlist (slow tier only, comma-separated).
# Replaces blanket `|| true` masking — skipped contracts are LOGGED, never silently
# swallowed. An unlisted failing contract still aborts the tier (exit code propagates).
_in_skip_list() {
  local needle="$1" csv="$2"
  [[ -z "$csv" ]] && return 1
  local IFS=','
  local entry
  for entry in $csv; do
    [[ "$entry" == "$needle" ]] && return 0
  done
  return 1
}

run_tier() {
  local label="$1"
  shift
  local tests=("$@")
  local skipped=0
  local skip_csv=""
  # Named skip list applies only to the slow tier (honors the AF_SLOW_* name).
  [[ "$label" == "slow" ]] && skip_csv="${AF_SLOW_SKIP_CONTRACTS:-}"
  for t in "${tests[@]}"; do
    if _in_skip_list "$t" "$skip_csv"; then
      echo "SKIP $t (AF_SLOW_SKIP_CONTRACTS)"
      skipped=$((skipped + 1))
      continue
    fi
    echo "=== $t ==="
    bash "tests/cicd/$t"
  done
  echo "PASS test:cicd:$label (${#tests[@]} contracts, $skipped skipped)"
}

TIER="${1:-fast}"
case "$TIER" in
  fast)
    run_tier fast "${FAST_TESTS[@]}"
    ;;
  slow)
    run_tier slow "${SLOW_TESTS[@]}"
    ;;
  all)
    run_tier fast "${FAST_TESTS[@]}"
    run_tier slow "${SLOW_TESTS[@]}"
    echo "PASS test:cicd:all ($(( ${#FAST_TESTS[@]} + ${#SLOW_TESTS[@]} )) contracts)"
    ;;
  *)
    echo "usage: $0 [fast|slow|all]" >&2
    exit 2
    ;;
esac
