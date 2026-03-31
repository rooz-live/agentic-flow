# IRIS Observability Integration

This integration connects the Agentic Flow `prod-cycle` to the IRIS observability system for tracking production maturity and execution context.

## Overview

The integration uses a bridge script (`iris_bridge.ts`) to capture execution metrics during critical phases of the production cycle. These metrics are logged to `.goalie/metrics_log.jsonl` in a schema-compliant JSON format.

## Usage

To enable IRIS metrics logging, use the `--log-goalie` flag with the `af` CLI:

```bash
af prod-cycle --log-goalie
```

This sets the `AF_ENABLE_IRIS_METRICS=1` environment variable, which signals `cmd_prod_cycle.py` to invoke the bridge.

## Configuration

Configuration is managed in `investing/agentic-flow/config/iris/production_environments.yaml`. It defines the tracked environments and components.

### Example Config

```yaml
environments:
  infrastructure:
    - starlingx_openstack
    - hostbill
    - loki
  cms_interfaces:
    - symfony
    - oro
    # ...
monitoring:
  critical_components:
    - starlingx_openstack
    - telnyx
    # ...
```

## Schema

The bridge outputs JSON metrics matching the following schema:

```json
{
  "type": "iris_evaluation",
  "timestamp": "ISO8601 String",
  "iris_command": "String (e.g., 'evaluate', 'patterns')",
  "circles_involved": ["String"],
  "actions_taken": ["String"],
  "production_maturity": {
    "score": "Number",
    "level": "String",
    "stability_index": "Number"
  },
  "execution_context": {
    "environment": "String",
    "mode": "String",
    "depth": "Number"
  }
}
```

## Architecture

1.  **CLI Entry (`scripts/af`)**: Parses `--log-goalie` and sets env var.
2.  **Orchestrator (`scripts/cmd_prod_cycle.py`)**: Checks env var and calls the bridge script via `subprocess`.
3.  **Bridge (`tools/federation/iris_bridge.ts`)**:
    *   Loads YAML config.
    *   Mocks/Wraps IRIS CLI execution.
    *   Formats output to JSON.
    *   Appends to `.goalie/metrics_log.jsonl`.