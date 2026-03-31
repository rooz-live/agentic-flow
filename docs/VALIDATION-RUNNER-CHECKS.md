# validation-runner.sh check order

Orchestrator: [`scripts/validators/file/validation-runner.sh`](../scripts/validators/file/validation-runner.sh) (sources [`validation-core.sh`](../scripts/validation-core.sh)).

| Step | Name | Function | Env skip |
|------|------|----------|----------|
| 1 | Placeholder | `core_check_placeholders` | `SKIP_PLACEHOLDER_CHECK=true` |
| 2 | Legal citations | `core_check_legal_citations` | `SKIP_LEGAL_VALIDATION=true` |
| 3 | Pro se signature | `core_check_pro_se_signature` | (skips if no case number) |
| 4 | Attachments | `core_check_attachments` | — |
| 5 | Date consistency | `core_check_date_consistency` | `SKIP_DATE_CHECK=true` |
| 6 | Semantic facts | `semantic-validation-gate.sh` | `SKIP_SEMANTIC_VALIDATION=true` |

Legacy alias: `validate_date_consistency` → `core_check_date_consistency`.

Exit mapping: placeholder failure → `EXIT_PLACEHOLDER_DETECTED`; hard date failure (past) → `EXIT_DATE_IN_PAST` (110); other failures → `EXIT_SCHEMA_VALIDATION_FAILED` (100).
