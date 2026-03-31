#!/usr/bin/env bash
set -euo pipefail

# verify-otlp.sh – end-to-end test of OTLP telemetry export
#
# Usage:
#   1. Start a local OTel collector:
#      docker run --rm -p 4318:4318 -p 16686:16686 \
#        otel/opentelemetry-collector:latest \
#        --config=/etc/otel-collector-config.yaml
#   2. Run this script:
#      ./scripts/verify-otlp.sh
#   3. Check Jaeger UI at http://localhost:16686 for traces
#
# Requirements:
#   - Docker running
#   - OpenTelemetry NPM packages installed (if not, script will remind)

COLLECTOR_ENDPOINT="${OTEL_EXPORTER_OTLP_ENDPOINT:-http://localhost:4318}"
SERVICE_NAME="${OTEL_SERVICE_NAME:-agentic-flow-verify}"

echo "═══════════════════════════════════════════════════════════════"
echo " OTLP End-to-End Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Collector endpoint: ${COLLECTOR_ENDPOINT}"
echo "Service name:       ${SERVICE_NAME}"
echo ""

# Check if OTel collector is reachable
if ! curl -s -f "${COLLECTOR_ENDPOINT}/v1/traces" -X POST -H "Content-Type: application/json" -d '{}' &>/dev/null; then
  echo "⚠️  WARNING: OTel collector at ${COLLECTOR_ENDPOINT} is not reachable."
  echo ""
  echo "To start a local collector with Jaeger backend:"
  echo ""
  echo "  docker run --rm -p 4318:4318 -p 16686:16686 \\"
  echo "    otel/opentelemetry-collector-contrib:latest"
  echo ""
  echo "Continuing anyway (will fail to export)..."
  echo ""
fi

# Check if OTel deps are installed
if ! npm ls @opentelemetry/sdk-node &>/dev/null; then
  echo "⚠️  OpenTelemetry packages not installed."
  echo ""
  echo "To install:"
  echo "  npm install --save-optional \\"
  echo "    @opentelemetry/api \\"
  echo "    @opentelemetry/sdk-node \\"
  echo "    @opentelemetry/exporter-trace-otlp-http \\"
  echo "    @opentelemetry/exporter-metrics-otlp-http \\"
  echo "    @opentelemetry/resources \\"
  echo "    @opentelemetry/semantic-conventions"
  echo ""
  echo "Script will run with no-op OTel (safe mode)."
  echo ""
fi

# Set environment for test run
export AF_OTEL_ENABLED=1
export AF_OTEL_TRACES=1
export AF_OTEL_METRICS=1
export AF_OTEL_METRICS_INTERVAL_MS=5000
export OTEL_EXPORTER_OTLP_ENDPOINT="${COLLECTOR_ENDPOINT}"
export OTEL_SERVICE_NAME="${SERVICE_NAME}"
export OTEL_RESOURCE_ATTRIBUTES="service.version=2.4.0,deployment.environment=verify"

# Create a small test script that emits telemetry
TEST_SCRIPT=$(cat <<'EOTS'
const { startTelemetry, stopTelemetry } = require('./dist/telemetry/bootstrap');

(async () => {
  console.log('[verify-otlp] Starting telemetry...');
  const { events, metrics } = await startTelemetry();
  
  console.log('[verify-otlp] Emitting test events...');
  events.emit('notifier.init', { configHash: 'test-verify-otlp' });
  events.emit('cleanup.cycle.completed', { removed: 5, scanned: 100, durationMs: 42 });
  
  console.log('[verify-otlp] Recording test metrics...');
  metrics.recordCounter('cleanup_cycles_total', 1);
  metrics.recordGauge('notifications_in_store', 123);
  metrics.recordHistogram('cleanup_cycle_duration_ms', 42);
  
  console.log('[verify-otlp] Waiting 2s for batching...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('[verify-otlp] Stopping telemetry (flush & shutdown)...');
  await stopTelemetry();
  
  console.log('[verify-otlp] ✅ Done. Check collector logs and Jaeger UI.');
  console.log('[verify-otlp] Jaeger UI: http://localhost:16686');
})();
EOTS
)

echo "Running test script..."
echo ""
node -e "$TEST_SCRIPT"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " Verification Complete"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Check collector logs for received spans and metrics"
echo "  2. Open Jaeger UI at http://localhost:16686"
echo "  3. Search for service: ${SERVICE_NAME}"
echo "  4. Verify spans for 'notifier.init' and 'cleanup.cycle.completed'"
echo ""
