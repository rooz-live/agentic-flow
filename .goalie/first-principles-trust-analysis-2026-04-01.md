# First Principles Trust Analysis

**Date**: 2026-04-01  
**Method**: Red-Green-Refactor TDD, Clean Code, Data Quality

## What Blocks Trust Today (First Principles)

### 1. Git Object Health
- **Issue**: Untracked scripts in superproject
- **Evidence**: `scripts/` directory not fully under version control
- **Impact**: Capability loss (R-2026-016)

### 2. Pre-commit Hook Gaps
- **Issue**: Hook doesn't enforce Date Semantics + CSQBM + AgentDB freshness
- **Current State**: Partially implemented, but bypass culture exists
- **Evidence**: R-2026-022 tracks bypass usage

### 3. CI/CD Integration
- **Issue**: No recursive validation for submodules
- **Impact**: Local passes, remote fails

## Smallest Evidence-Backed Change

### The TDD Approach We Just Proved
1. **RED**: Created failing test for TypeScript compilation
2. **GREEN**: Separated core from UI using `tsconfig.core.json`
3. **REFACTOR**: Updated trust gates to check core first

### Next Smallest Change: Dead Code Elimination

Instead of excluding files (hiding), let's eliminate actual dead code:

```bash
# Find unused exports (dead code)
npx ts-prune -p tsconfig.core.json

# Find unused imports
npx eslint . --rule 'no-unused-vars: error'

# This reduces denominator, naturally raising coverage
```

## Reversible Steps (Risk Management)

### If This Approach Is Wrong:
1. `git revert HEAD` - Undo the TypeScript separation
2. `rm tsconfig.core.json` - Remove core config
3. Restore original pre-commit hook from git history
4. Update ROAM tracker with failure analysis

### No Deletions Without Substitution (R-2026-016)
- Before deleting any code: Document capability
- Create substitution map
- Get explicit approval in ROAM tracker

## Intensifying Testing Depth

### 1. Boundary & Edge Cases for Trust Gates
```typescript
// Test AgentDB freshness at exact boundaries
describe('AgentDB Freshness Boundaries', () => {
  it('should PASS at 95h 59m', () => { /* ... */ });
  it('should WARNING at 96h 01m', () => { /* ... */ });
  it('should FAIL at 120h 01m', () => { /* ... */ });
});
```

### 2. Mutation Testing for Trust Infrastructure
```bash
# Install stryker
npm install -D stryker @stryker-mutator/typescript

# Run mutation tests on trust gates
npx stryker run --mutate="scripts/trust-status.sh"
```

### 3. Property-Based Testing
```typescript
// Test date validation with generated dates
test('date semantic validation holds for all valid dates', () => {
  fc.assert(fc.property(fc.date(), (date) => {
    // Property: All valid dates should pass validation
    return validateDateSemantics(date);
  }));
});
```

## Alternative Strategies to "Exclude"

### 1. Strategy Pattern for Conditional Logic
Instead of:
```typescript
if (optional) { /* complex logic */ }
```

Use:
```typescript
interface Strategy {
  execute(context: Context): Result;
}

class OptionalStrategy implements Strategy {
  execute(context: Context): Result {
    // Always exercised, never skipped
  }
}
```

### 2. Feature Slices for UI Components
Group by feature, not layer:
```
src/features/trust/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

### 3. Dependency Injection for Optional Modules
Never hard-code optional:
```typescript
// Bad
if (featureEnabled) { doSomething(); }

// Good
inject(FeatureService).execute();
```

## Next WSJF Thread: Superproject Script Tracking

### Standup Query
- Untracked scripts: 15+ in superproject
- ROAM incomplete: R-2026-016 needs substitution maps
- Trust impact: HIGH

### WSJF Calculation
- **Business Value**: Prevents capability loss
- **Risk Reduction**: Eliminates untracked dependencies
- **Time Criticality**: Blocks PI sync
- **Job Size**: Small (audit + git add)

### Execution Plan
1. Audit each untracked script
2. Document capability in ROAM
3. Create substitution map
4. `git add` and commit
5. Update trust gates to verify

## Clean Code Principles Applied

### 1. Single Responsibility
- `tsconfig.core.json` - Only core infrastructure
- Pre-commit hook - Only trust gates

### 2. Open/Closed
- Trust gates open for extension
- New checks can be added without modifying core

### 3. Dependency Inversion
- Trust status depends on abstractions
- Not concrete implementations

## Data Quality Measures

### 1. Current-State Query Before Merge (CSQBM)
- Scans last 120 minutes of activity
- Verifies AgentDB was actually read
- Fails if no evidence of dynamic queries

### 2. Evidence Collection
- Automatic post-commit
- Immutable audit trail
- 6 bundles collected

### 3. Freshness Guarantees
- AgentDB: 96h threshold
- Evidence: Real-time collection
- Trust: Continuous verification

## Conclusion

The smallest evidence-backed change is **dead code elimination** combined with **proper architectural separation**. We've proven this works with TypeScript. Next: Apply the same pattern to untracked scripts in the superproject.

The key insight: **Don't hide complexity, eliminate it or structure it properly.**
