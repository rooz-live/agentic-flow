---
date: YYYY-MM-DD
status: proposed | accepted | superseded | deprecated
supersedes: ADR-XXX (if applicable)
superseded_by: ADR-XXX (if applicable)
tests: tests/integration/test-xxx.spec.ts
related_prd: docs/prds/PRD-XXX.md (if applicable)
trial_exhibit: yes | no
---

# ADR-XXX: [Title]

## Context
**Problem**: What problem are we solving?

**Constraints**: What limits our options?

**Deadline**: Any time pressure (e.g., March 7 move, April 16 arbitration)?

## Decision
**Chosen Solution**: What did we decide?

**Why**: Key reasons for this choice

**Alternatives Considered**:
1. Alternative A - rejected because...
2. Alternative B - rejected because...

## Consequences
### Positive
- Benefit 1
- Benefit 2

### Negative  
- Trade-off 1
- Trade-off 2

### Neutral
- Side effect 1

## Implementation
**Files Changed**:
- `path/to/file.ts`
- `path/to/test.spec.ts`

**Tests Required**:
- [ ] Unit tests for X
- [ ] Integration tests for Y

## Verification
**How to verify this decision works**:
```bash
# Command to test
npm run test:integration
```

**Success Criteria**:
- [ ] Tests pass
- [ ] No performance regression
- [ ] Trial exhibits unaffected

---

**Template Usage**:
1. Copy this template to `ADR-{number}-{title}.md`
2. Fill in all sections
3. Date MUST be filled (YYYY-MM-DD format)
4. Link related tests
5. Mark trial-critical decisions with `trial_exhibit: yes`
