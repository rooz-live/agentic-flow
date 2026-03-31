---
contract: true
version: 1.0
---

## § GOAL (Success Metric)
Achieve 100% test pass validating WSJF ROI traces across explicit temporal arrays (hourly, daily, weekly, seasonal, annual).

## § CONSTRAINTS (Hard Boundaries)
- Token budget: <= 4000 tokens per evaluation loop.
- Modifies strictly `scripts/validators/wsjf/skill-harvest.py` maintaining purely internal dependencies natively.
- Zero tolerance for simulated/stubbed dates in the test matrix; timestamps MUST execute against chronological evaluation logically.

## § OUTPUT FORMAT (Structure Specification)
Return structured CLI traces mapping accurate `.goalie/wsjf` ROI evaluations natively.
Do NOT return prose. Output must generate standard physical metrics bounding hourly to annual calculations accurately.

## § FAILURE CONDITIONS (Rejection Criteria)
Output is UNACCEPTABLE if:
- Temporal granularity ignores precision limits (e.g. calculates daily shifts but ignores hourly maturity logic).
- `test-wsjf-harvest.sh` fails to return Red prior to implementation cleanly proving validation structure.

## § VERIFICATION (How We Know It Worked)
Run: `bash tests/wsjf/test-wsjf-harvest.sh`
Parse: Exit code 0 (100% test suite completion rate natively mapping execution).
