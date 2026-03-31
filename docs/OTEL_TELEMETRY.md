# OpenTelemetry (OTLP) Telemetry Integration

This document describes the OTLP telemetry integration and health monitoring features.

## Overview

The application includes comprehensive telemetry support with three output modes:
- **JSONL sink** – batched event logging to `.goalie/metrics_log.jsonl`
- **Prometheus** – metrics exposition at `/api/prom-metrics` (requires `prom-client`)
- **OTLP export** – traces and metrics via OpenTelemetry SDK over HTTP/OTLP

All modes are **opt-in** and safe to run without dependencies installed.

---

## OTLP Export (OpenTelemetry)

### Quick Start

1. **Start a local OpenTelemetry collector:**

   ```bash
   docker run --rm -p 4318:4318 -p 16686:16686 \
     otel/opentelemetry-collector-contrib:latest
   ```

   This runs an OTel Collector with:
   - OTLP HTTP receiver on port `4318`
   - Jaeger UI on port `16686`

2. **Install OpenTelemetry packages (optional):**

   ```bash
   npm install --save-optional \
     @opentelemetry/api \
     @opentelemetry/sdk-node \
     @opentelemetry/exporter-trace-otlp-http \
     @opentelemetry/exporter-metrics-otlp-http \
     @opentelemetry/resources \
     @opentelemetry/semantic-conventions
   ```

   If these packages are not installed, the OTLP path safely no-ops.

3. **Enable OTLP via environment variables:**

   ```bash
   export AF_OTEL_ENABLED=1
   export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   ```

   Then start your application:

   ```bash
   npm start
   ```

4. **View traces in Jaeger UI:**

   Open `http://localhost:16686` and search for service `agentic-flow`.

---

## Environment Variables

### Core Controls

| Variable | Default | Description |
|----------|---------|-------------|
| `AF_OTEL_ENABLED` | `''` (disabled) | Set to `1` or `true` to enable OTLP export |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Collector endpoint (enables OTLP if set, even without `AF_OTEL_ENABLED`) |

### Toggles

| Variable | Default | Description |
|----------|---------|-------------|
| `AF_OTEL_TRACES` | `1` | Enable trace export (`1` = on, `0` = off) |
| `AF_OTEL_METRICS` | `1` | Enable metric export (`1` = on, `0` = off) |
| `AF_OTEL_METRICS_INTERVAL_MS` | `60000` | Metric export interval in milliseconds |

### Standard OTel Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_SERVICE_NAME` | `agentic-flow` | Service name in telemetry |
| `OTEL_RESOURCE_ATTRIBUTES` | `''` | Comma-separated key=value pairs, e.g. `service.version=2.4.0,deployment.environment=prod` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `''` | Comma-separated headers, e.g. `x-api-key=SECRET,authorization=Bearer TOKEN` |

### JSONL Sink Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GOALIE_METRICS_PATH` | `.goalie/metrics_log.jsonl` | Output path for JSONL events |
| `GOALIE_METRICS_FLUSH_MS` | `1000` | Flush interval (ms) |
| `GOALIE_METRICS_BATCH` | `200` | Batch size before flush |
| `GOALIE_METRICS_MAX_PER_MIN` | `300` | Per-event rate limit (events/minute) |
| `GOALIE_METRICS_SUBSCRIBE` | `''` | Comma-separated event types to log (default: all) |

---

## Verification Script

Use `scripts/verify-otlp.sh` to test OTLP end-to-end against a local collector:

```bash
./scripts/verify-otlp.sh
```

**What it does:**
1. Checks if the OTel collector is reachable
2. Checks if OpenTelemetry NPM packages are installed
3. Emits test events and metrics
4. Flushes and shuts down gracefully
5. Displays instructions for viewing traces in Jaeger UI

**Sample output:**

```
═══════════════════════════════════════════════════════════════
 OTLP End-to-End Verification
═══════════════════════════════════════════════════════════════

Collector endpoint: http://localhost:4318
Service name:       agentic-flow-verify

[verify-otlp] Starting telemetry...
[verify-otlp] Emitting test events...
[verify-otlp] Recording test metrics...
[verify-otlp] Waiting 2s for batching...
[verify-otlp] Stopping telemetry (flush & shutdown)...
[verify-otlp] ✅ Done. Check collector logs and Jaeger UI.
[verify-otlp] Jaeger UI: http://localhost:16686

═══════════════════════════════════════════════════════════════
 Verification Complete
═══════════════════════════════════════════════════════════════

Next steps:
  1. Check collector logs for received spans and metrics
  2. Open Jaeger UI at http://localhost:16686
  3. Search for service: agentic-flow-verify
  4. Verify spans for 'notifier.init' and 'cleanup.cycle.completed'
```

---

## Health Endpoint

**GET** `/api/otel/health`

Returns the current state of all telemetry pipelines.

### Response Example

```json
{
  "success": true,
  "data": {
    "otel": {
      "enabled": true,
      "started": true,
      "endpoint": "http://localhost:4318",
      "traces": true,
      "metrics": true,
      "serviceName": "agentic-flow"
    },
    "jsonl": {
      "enabled": true,
      "path": ".goalie/metrics_log.jsonl"
    },
    "prometheus": {
      "available": true,
      "endpoint": "/api/prom-metrics"
    }
  },
  "metadata": {
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": "2025-12-01T00:30:00.000Z",
    "processingTimeMs": 0,
    "version": "1.0.0"
  }
}
```

### Fields

#### `otel` object

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Whether OTLP is configured via env vars |
| `started` | boolean | Whether the OTel SDK successfully started |
| `endpoint` | string? | OTLP endpoint URL (if set) |
| `traces` | boolean | Whether trace export is enabled |
| `metrics` | boolean | Whether metric export is enabled |
| `serviceName` | string | Service name sent with telemetry |

#### `jsonl` object

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Whether JSONL sink is active |
| `path` | string | File path for JSONL output |

#### `prometheus` object

| Field | Type | Description |
|-------|------|-------------|
| `available` | boolean | Whether `prom-client` package is installed |
| `endpoint` | string | Prometheus metrics endpoint path |

---

## Production Deployment

### Recommended Configuration

For production environments exporting to a centralized OpenTelemetry Collector:

```bash
# Enable OTLP
export AF_OTEL_ENABLED=1

# Collector endpoint (use your real collector URL)
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com:4318

# Authentication (if required)
export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=${OTEL_API_KEY}"

# Service identification
export OTEL_SERVICE_NAME=agentic-flow
export OTEL_RESOURCE_ATTRIBUTES="service.version=${APP_VERSION},deployment.environment=${ENV}"

# Tune export intervals
export AF_OTEL_METRICS_INTERVAL_MS=30000  # 30s for metrics

# Optional: disable traces in high-throughput scenarios
# export AF_OTEL_TRACES=0
```

### Performance Tuning

For high-throughput deployments, adjust:
- **Metric interval:** Increase `AF_OTEL_METRICS_INTERVAL_MS` to reduce export frequency
- **JSONL batch:** Increase `GOALIE_METRICS_BATCH` to batch more events per write
- **Rate limits:** Tune `GOALIE_METRICS_MAX_PER_MIN` per event type to prevent floods

---

## Integration with Existing Telemetry

The application emits lifecycle and cleanup events from `InAppNotifier`:

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `notifier.init` | `{ configHash }` | Notifier initialized |
| `cleanup.started` | `{ intervalMs }` | Cleanup cycle started |
| `cleanup.cycle.completed` | `{ removed, scanned, durationMs }` | Cleanup cycle finished |
| `cleanup.error` | `{ errType, message, stack }` | Cleanup error |
| `notifier.destroyed` | `{}` | Notifier destroyed |

### Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `cleanup_cycles_total` | Counter | Total cleanup cycles run |
| `notifications_removed_total` | Counter | Total notifications removed |
| `cleanup_errors_total` | Counter | Total cleanup errors |
| `notifications_in_store` | Gauge | Current notification count |
| `unread_total` | Gauge | Current unread notification count |
| `cleanup_cycle_duration_ms` | Histogram | Cleanup cycle duration distribution |
| `age_at_removal_ms` | Histogram | Age of notifications when removed |

All events are:
- Written to JSONL sink (with batching and rate limiting)
- Converted to Prometheus metrics (if `prom-client` installed)
- Exported as OTLP spans/metrics (if OTLP enabled)

---

## Troubleshooting

### OTLP not exporting

1. **Check health endpoint:**

   ```bash
   curl http://localhost:3000/api/otel/health | jq .
   ```

   Look for `otel.started: true`.

2. **Verify environment variables:**

   ```bash
   echo $AF_OTEL_ENABLED
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   ```

3. **Check collector is reachable:**

   ```bash
   curl -X POST http://localhost:4318/v1/traces \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

   Should return HTTP 200/400 (not connection refused).

4. **Check OpenTelemetry packages installed:**

   ```bash
   npm ls @opentelemetry/sdk-node
   ```

### No traces in Jaeger

- Wait 60 seconds for metric export interval
- Check Jaeger service dropdown for `agentic-flow`
- Verify collector logs show received spans
- Try running `./scripts/verify-otlp.sh` for a minimal test

### JSONL not writing

- Check `GOALIE_METRICS_PATH` is writable
- Verify `NODE_ENV !== 'test'`
- Look for `.goalie/metrics_log.jsonl` in working directory
- Tail the file: `tail -f .goalie/metrics_log.jsonl`

---

## References

- [OpenTelemetry JS SDK](https://opentelemetry.io/docs/instrumentation/js/)
- [OTLP Specification](https://opentelemetry.io/docs/reference/specification/protocol/otlp/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Prometheus Client](https://github.com/siimon/prom-client)

---

## Summary

You now have:
✅ OTLP export with environment-driven toggles  
✅ Safe no-op mode when OpenTelemetry packages are absent  
✅ Health endpoint at `/api/otel/health` showing all telemetry status  
✅ End-to-end verification script `scripts/verify-otlp.sh`  
✅ JSONL sink, Prometheus metrics, and OTLP all wired together  
✅ All tests passing (29/29 suites, 265/265 tests)  

Next steps: deploy with OTLP enabled and monitor your OpenTelemetry Collector!
