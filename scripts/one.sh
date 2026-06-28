#!/usr/bin/env bash
# one.sh — Canonical Owner Shim (thin dispatch)
# All logic lives in bounded slice scripts. This file routes only.
#
# Usage: ./scripts/one.sh <subcommand> [args...]
#
# Subcommands:
#   coherence        → scripts/gates/coherence-gate.sh
#   trust-path       → scripts/gates/trust-path-gate.sh
#   verify-contract  → scripts/gate-one-pass.sh verify-contract
#   ci               → scripts/ci/ci-assess.sh → ci-orchestrate.sh → ci-swarm.sh
#   deploy-uapi      → scripts/deploy/deploy-uapi.sh
#   deploy-edge      → scripts/deploy/deploy-edge-cfg.sh
#   run-safely       → (inline: git stash checkpoint + rollback on failure)
#   mail-wave-close  → scripts/mail/mail-wave-close.sh
#   wsjf             → scripts/cicd/update_lnnnl.py
#   dod-gate         → scripts/dod-gate.sh [--pre-task|--post-task|--full]
#   scorecard        → scripts/gates/scorecard_gate.py [--verify|--file PATH|--json]
#   upstream         → scripts/cicd/upstream_upgrade_engine.py [--dry-run|--force|--parallel|--json]
#   edge-sync        → scripts/cicd/edge_gateway_sync_engine.py [--dry-run|--force|--json]
#   aqe              → npx agentic-qe@3.11.1 <cmd> [args...]
#   ruflo            → npx ruflo@3.14.1 <cmd> [args...] (workflow, task, swarm, session, ...)
#   harness          → apps/agent-harness npm run <doctor|evolve|evolve:dry|init>
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    # Being sourced — expose helpers only, do not parse commands
    return 0
fi

CMD="${1:-help}"

case "$CMD" in
    coherence)
        exec bash "$ROOT_DIR/scripts/gates/coherence-gate.sh" "${@:2}"
        ;;

    trust-path)
        exec bash "$ROOT_DIR/scripts/gates/trust-path-gate.sh" "${@:2}"
        ;;

    verify-contract)
        exec bash "$ROOT_DIR/scripts/gate-one-pass.sh" verify-contract "${@:2}"
        ;;

    ci)
        exec bash "$ROOT_DIR/scripts/one-sh.d/ci.sh"
        ;;

    deploy-uapi)
        exec bash "$ROOT_DIR/scripts/deploy/deploy-uapi.sh" "${@:2}"
        ;;
    tld-gate-trigger|tld-gate-ci)
        exec bash "$ROOT_DIR/scripts/deploy/trigger_tld_gate_ci.sh" "${@:2}"
        ;;
    tld-targets-generate)
        exec pnpm run tld:targets:generate
        ;;
    tld-targets-check)
        exec pnpm run tld:targets:check
        ;;

    deploy-edge)
        exec bash "$ROOT_DIR/scripts/deploy/deploy-edge-cfg.sh" "${@:2}"
        ;;

    deploy-happy|happy-path)
        # DoR → swarm iterations → deploy-uapi → optional strict TLD gate
        shift
        exec bash "$ROOT_DIR/scripts/cicd/deploy_happy_path.sh" "$@"
        ;;

    run-safely)
        exec bash "$ROOT_DIR/scripts/one-sh.d/run-safely.sh" "${@:2}"
        ;;

    mail-wave-close)
        exec bash "$ROOT_DIR/scripts/mail/mail-wave-close.sh" "${@:2}"
        ;;

    loop)
        exec bash "$ROOT_DIR/scripts/one-sh.d/loop.sh" "${@:2}"
        ;;

    cycle)
        shift
        exec bash "$ROOT_DIR/scripts/cicd/cycle_tick.sh" "$@"
        ;;

    goal)
        exec bash "$ROOT_DIR/scripts/one-sh.d/goal.sh" "${@:2}"
        ;;

    iterate)
        # Bounded ROI iteration: goal snapshot → ceremony → next-step hints [→ cycle FA]
        shift
        EXTRA=""
        [[ "${1:-}" == "cycle" ]] && EXTRA="--cycle" && shift
        exec python3 "$ROOT_DIR/scripts/cicd/lib/roi_iterate.py" $EXTRA --json
        ;;

    ceremony)
        exec bash "$ROOT_DIR/scripts/one-sh.d/ceremony.sh" "${@:2}"
        ;;

    schedule|wsjf)
        exec bash "$ROOT_DIR/scripts/one-sh.d/schedule.sh" "${@:2}"
        ;;

    dod-gate)
        # DoR/DoD gate — pre-task perception, post-task proof, or full circuit.
        # DoR: AGENT_SLICE=publication bash tooling/scripts/agent_session_dor.sh must exit 0 first.
        # DoD: --post-task verifies committed tests, tracked capability, public edge proof.
        # Full: --full runs both gates + DoD checklist.
        shift
        MODE="${1:---full}"
        exec bash "$ROOT_DIR/scripts/dod-gate.sh" "$MODE"
        ;;

    scorecard)
        # Run the Originality/Impact scorecard gate.
        # --verify mode derives coherence from .goalie/evidence/coherence_results.json
        # (produced by real cargo check + pytest + no-invented-symbols).
        # Gate_integrity requires CI or AF_GATE_CONTEXT=review/ci/precommit.
        shift
        exec python3 "$ROOT_DIR/scripts/gates/scorecard_gate.py" "$@"
        ;;

    upstream)
        # Upstream Repository Upgrade Validation Engine.
        shift
        exec python3 "$ROOT_DIR/scripts/cicd/upstream_upgrade_engine.py" --print-receipt "$@"
        ;;

    edge-sync)
        # Edge Gateway Synchronization Engine.
        shift
        exec python3 "$ROOT_DIR/scripts/cicd/edge_gateway_sync_engine.py" --print-receipt "$@"
        ;;

    fetch-run-report)
        # Fetch-Run-Report CLI over the CICD receipt store.
        shift
        exec python3 "$ROOT_DIR/scripts/cicd/fetch_run_report.py" "$@"
        ;;

    aqe)
        exec bash "$ROOT_DIR/scripts/one-sh.d/aqe.sh" "${@:2}"
        ;;

    ruflo|workflow)
        exec bash "$ROOT_DIR/scripts/one-sh.d/workflow.sh" "${@:2}"
        ;;

    harness)
        # Dispatch to the upgraded agent harness.
        shift
        if [[ $# -eq 0 ]]; then
            echo "Usage: ./scripts/one.sh harness <doctor|evolve|evolve:dry|init>"
            exit 1
        fi
        exec npm --prefix "$ROOT_DIR/apps/agent-harness" run "$@"
        ;;

    help|--help|-h)
        exec bash "$ROOT_DIR/scripts/one-sh.d/help.sh"
        ;;

    *)
        echo "❌ Unknown subcommand: $CMD"
        echo "   Run: ./scripts/one.sh help"
        exit 1
        ;;
esac
