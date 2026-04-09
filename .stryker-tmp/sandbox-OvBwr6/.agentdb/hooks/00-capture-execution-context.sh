#!/usr/bin/env bash
#
# 00-capture-execution-context.sh
# Captures execution context for learning pipeline
#
# Called by scripts/execute_with_learning.sh
# Outputs JSON context to stdout for downstream processing

set -euo pipefail

# Capture context
cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_ref": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "pwd": "$(pwd)",
  "command": "${1:-unknown}",
  "exit_code": "${2:-unknown}",
  "duration_ms": "${3:-unknown}"
}
EOF
