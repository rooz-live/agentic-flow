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

    loop)
        shift
        exec bash "$ROOT_DIR/scripts/cicd/loop_timer_engine.sh" "$@"
        ;;

    cycle)
        shift
        exec bash "$ROOT_DIR/scripts/cicd/cycle_tick.sh" "$@"
        ;;

    goal)
        shift
        exec python3 "$ROOT_DIR/scripts/metrics/max_roi_cycles.py" --json
        ;;

    ceremony)
        # Bounded standup/review/retro/wsjf/pi_sync between max-ROI cycles.
        # CEREMONY_MODE=light|full|heavy  CEREMONY_PI_SYNC=1 for live pi_plan_sync.sh
        shift
        ONLY=""
        COMMIT=""
        while [[ $# -gt 0 ]]; do
            case "$1" in
                --commit-unit) COMMIT="--commit-unit"; shift ;;
                standup) ONLY="--only standup"; shift ;;
                review) ONLY="--only review"; shift ;;
                retro|retro_replenish) ONLY="--only retro_replenish"; shift ;;
                wsjf|wsjf_refine) ONLY="--only wsjf_refine"; shift ;;
                roam|roam_risks) ONLY="--only roam_risks"; shift ;;
                pi|pi_prep) ONLY="--only pi_prep"; shift ;;
                pi-sync|pi_sync) ONLY="--only pi_sync"; shift ;;
                *) break ;;
            esac
        done
        exec python3 "$ROOT_DIR/scripts/cicd/lib/ceremony_engine.py" ${ONLY} ${COMMIT} --json
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
        exec python3 "$ROOT_DIR/scripts/cicd/upstream_upgrade_engine.py" --print-receipt "$@"
        ;;

    edge-sync)
        # Edge Gateway Synchronization Engine.
        # Parses edge_gateway.cfg, resolves live DNS, compares against fqdn_registry.yaml,
        # health-probes each FQDN's health_path, writes DLQ + ROAM signals on drift,
        # and emits a DoD artefact edge_sync_{run_id}.json.
        #
        # Flags (passed through):
        #   --dry-run       Fetch + resolve only; print plan; exit 0
        #   --force         Check all FQDNs, ignoring cache
        #   --json          Emit final summary JSON to stdout
        #   --no-coherence  Skip coherence gate (CI use only)
        shift
        exec python3 "$ROOT_DIR/scripts/cicd/edge_gateway_sync_engine.py" --print-receipt "$@"
        ;;

    fetch-run-report)
        # Fetch-Run-Report CLI over the CICD receipt store.
        # Scans .goalie/evidence for cicd.receipt.v1 artefacts and emits a summary or JSON.
        #
        # Examples:
        #   one.sh fetch-run-report --summary
        #   one.sh fetch-run-report --json --context upstream --status FAIL
        #   one.sh fetch-run-report --context edge --since 2026-06-25T00:00:00
        shift
        exec python3 "$ROOT_DIR/scripts/cicd/fetch_run_report.py" "$@"
        ;;

    aqe)
        # Agentic QE v3.11.1 dispatch — full utilization for testing cycles.
        # Darwin self-learning / cheap-first / best-of-k / cross-model / adversarial-verify
        # Examples:
        #   one.sh aqe status
        #   one.sh aqe test generate <target>
        #   one.sh aqe coverage <path>
        #   one.sh aqe quality
        #   one.sh aqe workflow list
        shift
        exec npx --yes agentic-qe@3.11.1 "$@"
        ;;

    ruflo)
        # Ruflo v3.14.1 orchestration dispatch — swarm, task, workflow, session, memory, hooks
        # Examples:
        #   one.sh ruflo workflow list
        #   one.sh ruflo task list
        #   one.sh ruflo swarm init --topology hierarchical --max-agents 8
        #   one.sh ruflo status
        #   one.sh ruflo doctor
        shift
        exec npx --yes ruflo@3.14.1 "$@"
        ;;

    harness)
        # Dispatch to the upgraded agent harness (Darwin Mode self-improvement)
        shift
        if [[ $# -eq 0 ]]; then
            echo "Usage: ./scripts/one.sh harness <doctor|evolve|evolve:dry|init>"
            exit 1
        fi
        # Execute the corresponding npm script from within the apps/agent-harness directory
        exec npm --prefix "$ROOT_DIR/apps/agent-harness" run "$@"
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
  loop              Loop timer engine (/loop): LOOP_ONCE=1 LOOP_LIGHT=1 ...
  cycle             FA/SA cycle tick + knob adjust: cycle FA | cycle SA
  goal              Max-ROI cycles/hour snapshot (metrics)
  ceremony          Bounded ceremony unit: ceremony [standup|retro|pi-sync|wsjf] [--commit-unit]
  wsjf              Update WSJF schedule ledger
  dod-gate          DoR/DoD gate: --pre-task | --post-task | --full (default)
  scorecard         Originality/Impact gate: [--verify] [--file PATH] [--json]
  upstream          Upstream repo upgrade engine: [--dry-run] [--force] [--parallel] [--json]
  edge-sync         Edge gateway DNS sync + health probe: [--dry-run] [--force] [--json]
  fetch-run-report  Query the CICD receipt store: [--summary] [--json] [--context C] [--status S]
  aqe               Agentic QE v3.11.1: status, test, coverage, quality, workflow, ...
  ruflo             Ruflo v3.14.1: workflow, task, swarm, session, memory, hooks, ...
  harness           Dispatch to the upgraded AI Agent Harness: <doctor|evolve|evolve:dry|init>
HELP
        exit 0
        ;;

    *)
        echo "❌ Unknown subcommand: $CMD"
        echo "   Run: ./scripts/one.sh help"
        exit 1
        ;;
esac
