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
        echo "====================================================================="
        echo "🦅 ONE.SH CI — Assessor → Orchestrator → Swarm"
        echo "====================================================================="
        EXIT_CODE=0
        bash "$ROOT_DIR/scripts/ci/ci-assess.sh"      || EXIT_CODE=$?
        [[ $EXIT_CODE -eq 0 ]] && \
            bash "$ROOT_DIR/scripts/ci/ci-orchestrate.sh" || EXIT_CODE=$?
        [[ $EXIT_CODE -eq 0 ]] && \
            bash "$ROOT_DIR/scripts/ci/ci-swarm.sh"   || EXIT_CODE=$?
        exit $EXIT_CODE
        ;;

    deploy-uapi)
        exec bash "$ROOT_DIR/scripts/deploy/deploy-uapi.sh" "${@:2}"
        ;;

    deploy-edge)
        exec bash "$ROOT_DIR/scripts/deploy/deploy-edge-cfg.sh" "${@:2}"
        ;;

    run-safely)
        shift
        if [[ $# -eq 0 ]]; then
            echo "Usage: ./scripts/one.sh run-safely <command> [args...]"
            exit 1
        fi
        LAST_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
        echo "--> run-safely: checkpoint at HEAD ${LAST_SHA:-no-git}"
        HAS_CHANGES=0
        if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
            HAS_CHANGES=1
            git stash push -m "one-sh-checkpoint-$(date +%s)" >/dev/null
            echo "--> run-safely: dirty tree stashed."
        fi
        CMD_EXIT=0
        "$@" || CMD_EXIT=$?
        if [[ $CMD_EXIT -ne 0 ]]; then
            echo "❌ [run-safely] Command failed (exit $CMD_EXIT). Rolling back..."
            git reset --hard HEAD >/dev/null
            git clean -fd >/dev/null
            [[ $HAS_CHANGES -eq 1 ]] && git stash pop >/dev/null || true
            exit $CMD_EXIT
        fi
        echo "✅ [run-safely] Command succeeded."
        [[ $HAS_CHANGES -eq 1 ]] && git stash pop >/dev/null || true
        ;;

    mail-wave-close)
        exec bash "$ROOT_DIR/scripts/mail/mail-wave-close.sh" "${@:2}"
        ;;

    wsjf)
        echo "--> WSJF Schedule update..."
        exec python3 "$ROOT_DIR/scripts/cicd/update_lnnnl.py"
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
        # Fetches remote SHAs (parallel by default), diffs against cache,
        # runs per-repo integration tests with retry and DoR checking,
        # writes DLQ/ROAM signals on failure, and emits a DoD artefact.
        #
        # Flags (passed through):
        #   --dry-run       Fetch only; print plan; exit 0
        #   --force         Validate all repos, ignoring SHA cache
        #   --parallel      Run integration tests concurrently
        #   --json          Emit summary JSON to stdout
        #   --no-coherence  Skip coherence gate (CI use only)
        shift
        exec python3 "$ROOT_DIR/scripts/cicd/upstream_upgrade_engine.py" "$@"
        ;;

    help|--help|-h)
        cat <<'HELP'
Usage: ./scripts/one.sh <subcommand> [args...]

  coherence         Run cargo check + pytest + no-invented-symbols
  trust-path        Run zero-trust foundation gate
  verify-contract   Verify last gate-one-pass artifact matches HEAD
  ci                Run full CI circle (assess → orchestrate → swarm)
  deploy-uapi       Deploy TLD files via WHM UAPI (requires .env or env vars)
  deploy-edge       Validate DNS integrity for edge_gateway.cfg hosts
  run-safely        Run a command with git stash checkpoint + rollback on failure
  mail-wave-close   Close a mail wave (delegates to scripts/mail/)
  wsjf              Update WSJF schedule ledger
  dod-gate          DoR/DoD gate: --pre-task | --post-task | --full (default)
  scorecard         Originality/Impact gate: [--verify] [--file PATH] [--json]
  upstream          Upstream repo upgrade engine: [--dry-run] [--force] [--parallel] [--json]
HELP
        exit 0
        ;;

    *)
        echo "❌ Unknown subcommand: $CMD"
        echo "   Run: ./scripts/one.sh help"
        exit 1
        ;;
esac
