# DBOS Telemetry & Monitoring Setup

## Core Pipelines
1. **DBOS Durable Execution:** `scripts/ci/collect_metrics.py`
   - Dynamically bounds context strings within `metrics_log.jsonl`.
   - Strips static memory in favor of cognitive token efficiency to maintain the 4000 ceiling.

2. **OpenStack StarlingX Telemetry:** 
   - Managed via `mcp-scheduler-daemon.sh` (IPMI loops).
   - Maps physical power thresholds natively into the swarm context arrays.

## Activation
Ensure the DBOS python context (`pip install dbos`) is active in the cluster execution node. The scheduler daemon will proactively collect and push metrics out via the Pydantic workflow models. 

Check `docs/TURBOQUANT-DGM-METRICS-*.md` for cycle velocity baseline standards and 1D contrastive intelligence metrics.
