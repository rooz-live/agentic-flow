#!/usr/bin/env bash
# Match scripts/gates/scorecard_gate.py is_ci_env() — value-aware, not key-presence.
is_ci_env() {
  local val
  val=$(echo "${CI:-}" | tr '[:upper:]' '[:lower:]')
  case "$val" in 1|true|yes) return 0 ;; esac
  val=$(echo "${GITHUB_ACTIONS:-}" | tr '[:upper:]' '[:lower:]')
  case "$val" in 1|true|yes) return 0 ;; esac
  return 1
}
