# AF CLI - Agentic Flow Production Tools

This directory contains the AF CLI implementation with production cycle and swarm comparison capabilities.

## Files

- `af.sh` - Main CLI dispatcher script that provides unified access to production tools
- `af_cli` - Internal CLI dispatcher (linked from main script)
- `af_prod_cycle.py` - Production cycle implementation with WSJF integration
- `af_prod_swarm.py` - Production swarm comparison and analysis implementation

## Features

### Core Commands

- **prod-cycle**: Run production cycle with WSJF prioritization
  - Supports multiple execution modes (mutate, advisory, enforcement)
  - Integrates with existing cmd_prod_cycle.py when available
  - Provides fallback implementation when existing scripts not found
  - Supports JSON output format
  - Includes tier-depth coverage analysis
  - Validates inputs and provides proper error handling

- **prod-swarm**: Run production swarm comparison and analysis
  - Integrates with existing cmd_swarm_compare.py when available
  - Provides fallback analysis when existing scripts not found
  - Supports JSON output format
  - Includes mock data generation for testing
  - Validates input files and provides comprehensive error handling

- **pattern-stats**: View pattern metrics and statistics
  - Passthrough to existing cmd_pattern_stats.py when available

- **correlation-analysis**: Analyze pattern correlations over 72-hour time windows
  - Implements comprehensive correlation analysis with statistical significance testing
  - Supports Pearson and Spearman correlation calculations
  - Includes temporal trend analysis and anomaly detection
  - Provides pattern co-occurrence and lead/lag relationship detection
  - Generates automated insights and recommendations
  - Supports JSON output format and visualization data export
  - Integrates with existing pattern metrics data from .goalie/pattern_metrics.jsonl

- **wsjf commands**: WSJF prioritization and analysis
  - `wsjf`: View WSJF scores for all items
  - `wsjf-top`: Show top WSJF items
  - `wsjf-by-circle`: Show WSJF scores by circle
  - `wsjf-replenish`: Replenish with WSJF calculation

## Integration Points

The AF CLI integrates with the existing investing/agentic-flow/scripts/ infrastructure:

- **cmd_prod_cycle.py**: Production cycle with schema validation, guardrail checks, and WSJF integration
- **cmd_swarm_compare.py**: Swarm comparison with comprehensive metrics analysis
- **cmd_wsjf.py**: WSJF scoring and prioritization
- **cmd_pattern_stats.py**: Pattern metrics and statistics

## Usage Examples

```bash
# Run production cycle with JSON output
./scripts/af.sh prod-cycle --mode mutate --json

# Run production swarm comparison
./scripts/af.sh prod-swarm --prior baseline.tsv --current current.tsv --auto-ref optimized.tsv --json

# View WSJF scores
./scripts/af.sh wsjf-top 10 --json

# View pattern statistics
./scripts/af.sh pattern-stats --circle analyst --json

# Run correlation analysis
./scripts/af.sh correlation-analysis --circle ui,core --json

# Run correlation analysis with filters and visualization data
./scripts/af.sh correlation-analysis --pattern-type feature --time-window 48 --include-viz --output results.json
```

## Environment Variables

- `PROJECT_ROOT`: Project root directory
- `AF_RUN_ID`: Unique run identifier
- `AF_PROD_OBSERVABILITY_FIRST`: Enable observability-first mode
- `AF_ENABLE_IRIS_METRICS`: Enable IRIS metrics logging
- `AF_PROD_CYCLE_MODE`: Production cycle execution mode

## Goalie Integration

The CLI ensures `.goalie/` directory structure exists and integrates with pattern logging and metrics collection.

## Error Handling

All commands include comprehensive error handling with JSON-formatted error messages when appropriate.

## JSON Output

All commands support `--json` flag for structured output suitable for automation and integration.