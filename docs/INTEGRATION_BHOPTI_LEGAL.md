# Integration: agentic-flow ↔ BHOPTI-LEGAL Advocacy Pipeline

**Date**: Feb 1, 2026  
**Purpose**: Connect test automation framework to existing advocacy system  
**Principle**: DRY (Don't Repeat Yourself) - use existing mature system

## Existing System Status ✅

Your **BHOPTI-LEGAL/11-ADVOCACY-PIPELINE** is production-ready:

- ✅ **TUI Binary**: `advocate-tui` (4.8MB, Go-based)
- ✅ **React Visualization**: Mind map for court evidence
- ✅ **Test Coverage**: 31 BATS tests passing
- ✅ **State Management**: JSON-based day tracking
- ✅ **Templates**: Email, social media, PDF generation
- ✅ **Evidence Tracking**: Screenshots, timeline exports
- ✅ **WSJF Backlog**: Prioritized work items

**Location**: `/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/`

## Integration Points (NOT Duplication)

### 1. Test Automation Enhancement

agentic-flow's test suite can validate BHOPTI-LEGAL system:

```bash
# From agentic-flow, test the advocacy system
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Create symlink to avoid duplication
ln -s /Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE ./external/advocacy

# Add test that validates advocacy system state
npm test -- tests/integration/advocacy-pipeline-validation.test.ts
```

### 2. Daily Send Integration

Use agentic-flow's `DailySendAutomation` class to **orchestrate** (not replace) your existing system:

```typescript
// In agentic-flow
import { DailySendAutomation } from './src/automation/daily-send';

const automation = new DailySendAutomation({
  workDir: '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE',
  templateDir: '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/domains/templates',
  enableMCP: true
});

// Schedule trigger that calls YOUR advocate-tui binary
await automation.schedule({
  template: 'external-trigger',
  cron: '0 9 * * *',
  variables: {
    command: '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/advocate-tui'
  }
});
```

### 3. Metrics Aggregation

agentic-flow can aggregate metrics FROM your advocacy system:

```typescript
// Read state from your existing JSON
const stateFile = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/tracking/daily-send-state.json';
const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

// Track in agentic-flow for cross-system analytics
await automation.recordSend({
  template: `day-${state.current_day}`,
  success: state.days[state.current_day]?.email === true
});
```

## What agentic-flow Provides (Unique Value)

### 1. Test Infrastructure Already Built ✅
- Jest config optimized for TypeScript
- 88 passing test suites (96% pass rate)
- Mock frameworks for external services
- Coverage reporting

### 2. TypeScript Type Safety
- Strong typing for state management
- Interface contracts for external systems
- Compile-time validation

### 3. CI/CD Integration Ready
- GitHub Actions workflows
- Automated test runs
- Quality gates

### 4. Pattern Validation
- Mithra coherence checks (epistemic wholeness validation)
- Decision audit logging (tracks causality)
- Pattern metrics (WSJF consistency)

## Today's Workflow (Corrected)

**EXISTING SYSTEM** (use this, don't duplicate):

```bash
# 1. Launch your TUI (as documented in READY-TO-FIRE.md)
cd /Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE
./scripts/daily-send-tui/advocate-tui

# 2. Navigate TUI and send Day 1 emails
# (Use existing workflow you already built)

# 3. Take screenshot for evidence
# (Save to Sent/TIER-5-DIGITAL/Email/evidence/)
```

**NEW ADDITION** (agentic-flow validation):

```bash
# 4. After sending, validate with agentic-flow test
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
npm test -- tests/integration/advocacy-validation.test.ts
```

This validates:
- ✓ State file updated correctly
- ✓ Evidence file exists
- ✓ Email metadata logged
- ✓ No regressions in automation

## Recommended Integration Tests

Create in agentic-flow (NOT duplicate functionality):

```typescript
// tests/integration/advocacy-pipeline-validation.test.ts
describe('BHOPTI-LEGAL Advocacy Pipeline Integration', () => {
  const PIPELINE_ROOT = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE';
  
  it('should have advocate-tui binary built', () => {
    const binaryPath = path.join(PIPELINE_ROOT, 'scripts/daily-send-tui/advocate-tui');
    expect(fs.existsSync(binaryPath)).toBe(true);
  });
  
  it('should have valid state file', () => {
    const statePath = path.join(PIPELINE_ROOT, 'tracking/daily-send-state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    
    expect(state.current_day).toBeGreaterThanOrEqual(1);
    expect(state.current_day).toBeLessThanOrEqual(5);
    expect(state.days).toBeDefined();
  });
  
  it('should have evidence folder structure', () => {
    const evidencePath = path.join(PIPELINE_ROOT, 'Sent/TIER-5-DIGITAL/Email/evidence');
    expect(fs.existsSync(evidencePath)).toBe(true);
  });
  
  // More validation tests, NO duplication of functionality
});
```

## Anti-Pattern: What NOT to Do ❌

~~1. Create duplicate letter templates in agentic-flow~~ **REMOVED**  
~~2. Build new TUI in TypeScript~~ **Use existing Go binary**  
~~3. Rewrite React mind map~~ **Use existing web/ folder**  
~~4. Duplicate state management~~ **Read from existing JSON**  
~~5. Create new evidence tracking~~ **Use existing Sent/ structure**

## Correct Pattern: What TO Do ✅

1. **Test validation** from agentic-flow → advocacy pipeline
2. **Metrics aggregation** (pull data from existing system)
3. **CI/CD integration** (run advocacy tests as part of agentic-flow suite)
4. **Type safety wrapper** (TypeScript interfaces for state files)
5. **Cross-system analytics** (combine agentic-flow + advocacy metrics)

## Quick Reference

| System | Purpose | Location |
|--------|---------|----------|
| **BHOPTI-LEGAL** | Production advocacy | `/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/` |
| **agentic-flow** | Test automation, validation | `/Users/shahroozbhopti/Documents/code/investing/agentic-flow/` |
| **Integration** | Validation tests only | `agentic-flow/tests/integration/advocacy-*.test.ts` |

## Today's Action (Feb 1, 2026)

1. **Use existing system**: Run `advocate-tui` as documented in READY-TO-FIRE.md ✅
2. **Optional validation**: Add integration test in agentic-flow (5 min) ⏳
3. **NO duplication**: Removed duplicate letter-generator, scripts, docs ✅

---

**Principle**: One source of truth for advocacy automation.  
**Integration**: Lightweight validation, not heavyweight duplication.  
**Result**: Reduced technical debt, maintained DRY principle.
