# Production Maturity Retrospective Questions (Part 7)

This document summarizes the core retrospective questions for the Agentic Flow
production maturity patterns (Safe Degrade, Depth Ladder, Circle Risk Focus,
Autocommit Shadow, Guardrail Lock, Failure Strategy, Iteration Budget,
Observability-First). It is used by scripts/analysis/retrospective_analysis.py
as the reference for what should be answerable from telemetry.

## Safe Degrade
- Did degrade-on-failure contain blast radius or just create noise?
- When we degraded, did we also get useful feedback (logs, metrics) to fix the root cause?
- Were there any times we wanted to continue deploying but the system degraded too aggressively?

## Depth Ladder
- Did depth escalations happen too often, too late, or not enough?
- Did teams experience friction from sudden depth changes?
- Did depth changes feel incremental (ladder) or discontinuous (cliff)?

## Circle Risk Focus
- Did risk scores for key circles (Analyst, Assessor, Innovator, etc.) trend down over time?
- Were any circles consistently neglected (high risk, low iteration counts)?
- Did actions taken in a circle actually reduce the associated ROAM risks?

## Autocommit Shadow
- How accurate were shadow autocommit candidates (would they have passed executor/guardrails)?
- Where did guardrails fail to catch bad candidates that only appeared after real deploys?
- How often were we surprised by changes that looked safe in shadow but failed in production?

## Guardrail Lock
- Did guardrail requirements (tests, validation, approvals) prevent real incidents?
- When did guardrails create unnecessary friction or force manual bypasses?
- Which incidents correlated with missing, bypassed, or misconfigured guardrails?

## Failure Strategy
- Did the chosen failure strategy (degrade-and-continue vs fail-fast) prevent spammy cycles?
- Did early stopping correlate with faster MTTR, or just more partial work?
- Were repeated failures clustered around the same patterns or circles?

## Iteration Budget
- Did the iteration budget prevent runaway cycles while still allowing meaningful progress?
- How often did we hit the iteration cap, and did that feel too tight or too loose?
- Did additional iterations correlate with measurable improvement in risk or incidents?

## Observability-First
- Did every significant failure have enough telemetry to debug it without guesswork?
- Where did we detect observability gaps (missing metrics, logs, traces)?
- Are we over-instrumented in any areas (noise outweighing signal)?
## Decision Transformer Readiness
- Are we collecting sufficient, sequence-ready trajectories (episodes, horizons) for DT training?
- What does `af validate-dt --json` report for current runs (episode count, malformed reward fraction, key readiness warnings)?
- Have we tuned `dt_validation_thresholds.yaml` based on observed data distributions, or are we still using overly conservative defaults?
- When DT readiness fails, do we convert those warnings into concrete backlog items (e.g., "increase prod-cycle runs", "fix reward instrumentation")?


