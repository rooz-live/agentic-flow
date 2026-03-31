---
contract: true
version: "1.0"
goal:
  metric: "100% Evidence Collection and 80% Method Score on validate-email"
  threshold: 100
  unit: "percent"
constraints:
  token_budget: 4000
  file_boundary: ["_SYSTEM/_AUTOMATION/"]
  no_mocks_when_real_available: true
output_format:
  type: "json"
  required_fields: ["summary", "files_modified", "metrics"]
failure_conditions:
  - "mock used where real DB connection available"
  - "coverage self-reported without running jest --coverage"
  - "file outside constraint boundary modified"
verification:
  command: "echo 'verified'"
  parse: "true"
---

# Contract: Evidence and Validation Upgrade

## Objective
Run the 0% -> 100% Evidence Quality collection and optimize test suite for `validate-email.sh` based on architecture review.

## Steps
1. Determine `now, next, later` classification.
2. Execute the evidence quality tracker.
3. Add automated tests to hit the target metrics.
