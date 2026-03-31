# Continuous Improvement Workflow Strategy

## 1. Plan-Do-Act (P/D/A) Cycle
- **Plan:** Replenish backlogs using `replenish_circle.sh`. Assign Budget (CapEx/OpEx) and Patterns.
- **Do:** Execute tasks. Update status in `backlog.md`.
- **Act:** Daily Standup via `daily_standup.sh`. Review metrics. Refine processes based on "Learning Metrics".

## 2. Protocols
- **Standup:** Run daily. Review OpEx ratio (Target < 40%).
- **Review:** Weekly. Verify `risk_analytics_baseline.db`.
- **Retrospective:** Monthly. Update `QUICK_WINS.md` with system-level improvements.

## 3. Forensic Verification
- All "Success Criteria" must be verifiable via CLI command or Database Query.