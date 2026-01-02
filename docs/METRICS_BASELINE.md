# Metrics Baseline

Established after IRE agentic-flow prod maturity execution (NOW block complete, cycle exit 0).

## Current Baseline Metrics

| Metric | Value | Target | Notes/Source |
|--------|-------|--------|--------------|
| Diagnostics Gaps | 1/40 patterns | 0/40 | Reduced 10%→1%; [.goalie/metrics_baseline.json](.goalie/metrics_baseline.json) |
| Calibration ok_rate | 100% | ≥95% | DoD met; [prod_cycle_calibration.json](.goalie/prod_cycle_calibration.json) |
| rev_per_h | 0 | >0 | Stable, pending revenue impl |
| Autocommit green_streak | 4/100 | 100/100 | GRADUATED |

## Validation
- STX partial IPMI healthy (scripts missing)
- WSJF/circles updated
- .goalie/*.json logged for tracking