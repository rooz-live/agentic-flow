#!/usr/bin/env bash
set -euo pipefail

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
  iterate           ROI iteration: iterate [cycle] — snapshot + ceremony + next step
  ceremony          Bounded ceremony unit: ceremony [standup|retro|pi-sync|wsjf] [--commit-unit]
  schedule|wsjf     Update WSJF schedule ledger (LNNNL)
  dod-gate          DoR/DoD gate: --pre-task | --post-task | --full (default)
  scorecard         Originality/Impact gate: [--verify] [--file PATH] [--json]
  upstream          Upstream repo upgrade engine: [--dry-run] [--force] [--parallel] [--json]
  edge-sync         Edge gateway DNS sync + health probe: [--dry-run] [--force] [--json]
  fetch-run-report  Query the CICD receipt store: [--summary] [--json] [--context C] [--status S]
  aqe               Agentic QE v3.11.3: init, status, test, coverage, quality, workflow, ...
  ruflo|workflow    Ruflo v3.15.0: init, workflow, task, swarm, session, memory, hooks, ...
  harness           Dispatch to the upgraded AI Agent Harness: <doctor|evolve|evolve:dry|init>
  agenticow           Probe agenticow CLI/MCP pin (offline-safe)
  weight-eft          Probe @metaharness/weight-eft gate (degraded_ok, probe-only)
  run-all             Fast/slow CI runner (AF_RUN_ALL_STRICT=1 default)
HELP
