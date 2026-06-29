#!/usr/bin/env bash
# Match scripts/gates/scorecard_gate.py is_ci_env() — value-aware, not key-presence.
is_ci_env() {
  case "${CI:-}" in 1|true|TRUE|yes|YES) return 0 ;; esac
  case "${GITHUB_ACTIONS:-}" in 1|true|TRUE|yes|YES) return 0 ;; esac
  return 1
}
