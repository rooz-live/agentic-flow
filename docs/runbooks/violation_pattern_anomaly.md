# Violation Runbook: Pattern Anomaly Investigation (PATTERN-ANOMALY)

**Trigger**: Governance violation detected for PATTERN-ANOMALY
**Generated**: 2026-01-13T17:52:00.084129

## Remediation Steps
1. Check .goalie/pattern_metrics.jsonl for high drift events
2. Run 'af retro-coach' to analyze patterns
3. If safe_degrade triggered, check system load
4. Adjust circuit breaker thresholds if false positive
