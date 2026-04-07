# ADR-007: Classification and Bounce-Routing Migration to TypeScript Domain Aggregate

## Status
PROPOSED — 2026-04-07

## Context
Classification, bounce routing, and ROAM cross-referencing logic is currently implemented as shell functions in `_classifier-rules.sh` (interim bridge extracted in T1). This works for the current operational cadence but has limitations:

1. **Testing**: Shell-based tests are string-comparison-heavy; no type safety or structured assertions.
2. **Extensibility**: Adding new classification dimensions (e.g., confidence scoring from content analysis, ML-based categorization) is awkward in bash.
3. **Reuse**: The Rust CLI (Horizon 3) and React dashboard (Horizon 3) both need classification logic but can't easily source a bash module.
4. **Maintenance**: 60+ FILE_CLASSIFIER rules are pattern-string arrays with pipe-delimited fields — no schema enforcement.

The canonical email validator (`validate-email.sh`) is shell-based and stable; it should remain the validation engine. The migration targets only the classifier domain (rules, classification, bounce routing, ROAM mapping).

## Decision
Migrate classification and bounce-routing logic into a TypeScript domain aggregate, while keeping `_classifier-rules.sh` as the active bridge until the TypeScript implementation reaches parity.

### Architecture

```
_SYSTEM/_AUTOMATION/
├── _classifier-rules.sh          # INTERIM: shell rules (current, active)
├── classifier/                   # NEW: TypeScript domain aggregate
│   ├── src/
│   │   ├── rules.ts              # Classification rules (typed, schema-enforced)
│   │   ├── classify.ts           # classify_file() equivalent
│   │   ├── bounce-router.ts      # get_bounce_roam_ref() equivalent (content-first)
│   │   ├── roam-mapper.ts        # ROAM ID resolution
│   │   └── types.ts              # ClassificationResult, BounceResult, RoamRef
│   ├── tests/
│   │   ├── rules.test.ts
│   │   ├── classify.test.ts
│   │   └── bounce-router.test.ts
│   ├── cli.ts                    # CLI wrapper for shell interop
│   ├── package.json
│   └── tsconfig.json
```

### Migration Phases

**Phase A (Parity)**: Port all 60+ FILE_CLASSIFIER rules and 4 bounce-routing functions to TypeScript with 1:1 behavior. Run shell tests and TS tests in parallel; both must produce identical outputs for the same inputs.

**Phase B (Switchover)**: Update `file-to-wsjf-router.sh` to call the TypeScript CLI (`classifier/cli.ts classify --file <path>`) instead of sourcing `_classifier-rules.sh`. Keep the shell module as fallback (`source _classifier-rules.sh` if `ts-node` unavailable).

**Phase C (Extension)**: Add content-based classification (body analysis, not just filename patterns), confidence scoring, and ML integration hooks. These features are only available in the TypeScript path.

**Phase D (Decommission)**: Remove `_classifier-rules.sh` after 30 days with zero fallback invocations logged.

### Invariants During Migration
1. `_classifier-rules.sh` remains the active source of truth until Phase B switchover.
2. No classification behavior changes during Phase A (strict parity).
3. Shell fallback is always available — TypeScript failures must not break the pipeline.
4. All changes gated by existing test suite (`tests/test-classifier-rules.sh` must pass).

## Consequences

### Positive
- Type-safe classification rules with schema enforcement
- Testable with Jest/Vitest (structured assertions, mocking)
- Shareable with Rust CLI (via JSON schema) and React dashboard (via import)
- Content-based classification becomes feasible (body parsing, NLP hooks)
- Confidence scoring enables graduated escalation (not just RED/YELLOW/GREEN)

### Negative
- Node.js / ts-node dependency in the automation path (mitigated: shell fallback)
- Two implementations to maintain during Phase A-B overlap (mitigated: automated parity tests)
- `com.wsjf.validator` already runs ts-node; adding another TS dependency is acceptable

### Neutral
- `validate-email.sh` (canonical validator) is NOT migrated — it stays as shell. Only the classifier domain moves to TypeScript.
- `batch-classify.sh` and `la-health-check.sh` remain shell-only (no TypeScript dependency).

## References
- `_SYSTEM/_AUTOMATION/_classifier-rules.sh` — current shell rules (123 lines, 60+ patterns)
- `_SYSTEM/_AUTOMATION/tests/test-classifier-rules.sh` — shell parity tests (11 cases)
- `_SYSTEM/_AUTOMATION/batch-classify.sh` — batch classifier using shell rules
- `file-to-wsjf-router.sh` — primary consumer of classifier module
- `wsjf-roam-escalator.ts` — existing TypeScript component (validates TS feasibility)
