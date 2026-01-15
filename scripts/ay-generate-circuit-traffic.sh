#!/usr/bin/env bash
# ay-generate-circuit-traffic.sh - Generate circuit breaker traffic for threshold learning

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRAFFIC_LOG="${PROJECT_ROOT}/reports/production/circuit-breaker-traffic.json"

echo "Generating circuit breaker traffic patterns..."

cat > "$TRAFFIC_LOG" <<EOF
{
  "traffic_generation": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "patterns": [
      {
        "pattern": "gradual_failure",
        "description": "Gradual increase in error rate",
        "thresholds": {
          "error_rate": [0.01, 0.05, 0.10, 0.15, 0.20],
          "response_time_ms": [100, 200, 500, 1000, 2000]
        }
      },
      {
        "pattern": "spike_recovery",
        "description": "Sudden spike followed by recovery",
        "thresholds": {
          "error_rate": [0.01, 0.50, 0.10, 0.02, 0.01],
          "response_time_ms": [100, 5000, 500, 200, 100]
        }
      },
      {
        "pattern": "cascading_failure",
        "description": "Multiple dependent service failures",
        "thresholds": {
          "error_rate": [0.01, 0.05, 0.20, 0.50, 0.90],
          "affected_services": [1, 2, 4, 8, 12]
        }
      }
    ]
  }
}
EOF

echo "✓ Circuit breaker traffic patterns generated: $TRAFFIC_LOG"
