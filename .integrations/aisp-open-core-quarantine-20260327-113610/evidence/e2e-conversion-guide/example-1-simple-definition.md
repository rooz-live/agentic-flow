# Example 1: Simple Definition

> Converting a basic variable definition from prose to AISP.

**Tier:** Minimal
**Complexity:** Low
**Expected Quality:** ◊⁺ (Gold) or higher

---

## TL;DR

| Metric | Value |
|--------|-------|
| Input Tokens | ~4 |
| Output Tokens | ~2 |
| Compression | 50% |
| Confidence | 0.95+ |
| LLM Required | No |

---

## Step 0: Setup

### Install Dependencies

```bash
npm init -y
npm install aisp-converter aisp-validator
```

### Reference Files

- `AI_GUIDE.md` - Section `⟦Σ:Rosetta⟧` for symbol mappings
- `reference.md` - Definition symbols: ≜ (defined as), ≔ (assigned)

---

## Step 1: Prose Input

**Natural Language:**
```
Define x as 5
```

**Analysis:**
- Pattern: "Define [var] as [value]"
- Matches Rosetta entry: `defined as` → `≜`
- Tier: Minimal (simple symbol substitution)

---

## Step 2: Conversion Triage

### Command

```typescript
import { autoConvert } from 'aisp-converter';

const result = autoConvert('Define x as 5');
console.log(result);
```

### Output

```json
{
  "tier": "minimal",
  "output": "x≜5",
  "confidence": 0.95,
  "mappings": [
    { "pattern": "defined as", "symbol": "≜", "category": "definition" }
  ]
}
```

### Explanation

The triage identifies:
- **Tier: Minimal** - Simple pattern, no complex logic
- **Mode: Rust/WASM** - Deterministic, no LLM needed
- **Confidence: 0.95** - High confidence (>0.8 threshold)

---

## Step 3: AISP Conversion

### Command

```typescript
import { convert, Tier } from 'aisp-converter';

const result = convert('Define x as 5', { tier: Tier.Minimal });
console.log(result);
```

### Copy/Paste Input

```
Define x as 5
```

### Expected Response

```json
{
  "output": "x≜5",
  "tier": "minimal",
  "confidence": 0.95,
  "transformations": [
    {
      "original": "Define x as 5",
      "pattern": "defined as",
      "symbol": "≜",
      "result": "x≜5"
    }
  ]
}
```

---

## Step 4: Rust Validation (First Pass)

### Command

```bash
# Using aisp-validator npm package
npx aisp-validator validate "x≜5"

# Or using Rust CLI
aisp validate "x≜5"
```

### Programmatic Validation

```typescript
import { validate } from 'aisp-validator';

const validation = validate('x≜5');
console.log(validation);
```

### Expected Output

```json
{
  "valid": true,
  "tier": "◊⁺",
  "density": 0.67,
  "errors": [],
  "warnings": [],
  "symbols": {
    "used": ["≜"],
    "count": 1,
    "categories": ["definition"]
  }
}
```

### Quality Assessment

| Metric | Value | Status |
|--------|-------|--------|
| Valid | ✅ true | Passed |
| Tier | ◊⁺ (Gold) | Meets target |
| Density | 0.67 | Good compression |
| Errors | 0 | No issues |

---

## Step 5: LLM Conversion (Not Required)

Since confidence is **0.95** (above 0.8 threshold), LLM fallback is **skipped**.

```typescript
import { convertWithFallback } from 'aisp-converter';

const result = await convertWithFallback('Define x as 5', {
  tier: Tier.Minimal,
  llmProvider: 'anthropic',
  confidenceThreshold: 0.8,
});

console.log(result.usedFallback); // false - LLM not needed
```

---

## Step 6: Rust Validation (Final)

Since no LLM correction was needed, the first validation is final.

```typescript
import { convertAndValidate } from 'aisp-converter';

const result = await convertAndValidate('Define x as 5', {
  tier: Tier.Minimal,
  minTier: 'silver',
  maxAttempts: 3,
});

console.log(result);
```

### Final Validation Result

```json
{
  "output": "x≜5",
  "tier": "minimal",
  "confidence": 0.95,
  "validation": {
    "valid": true,
    "tier": "◊⁺",
    "density": 0.67
  },
  "correctionAttempts": 0,
  "usedFallback": false
}
```

---

## Step 7: Final AISP Output

### Minimal Format

```
x≜5
```

### Standard Format (if requested)

```
𝔸:1.0
⟦Γ:def⟧
x≜5
```

### Full Format (if requested)

```
𝔸:5.1::◊⁺
CTX{domain≜"mathematics";scope≜"variable-definition"}
⟦Ω:objective⟧
  Define variable x with value 5

⟦Σ:symbols⟧
  x:ℤ; ≜:definition

⟦Γ:definition⟧
  x≜5

⟦Ε:end⟧
∎
```

---

## Notes

### Symbol Mapping Used

| Prose | Symbol | Category |
|-------|--------|----------|
| `defined as` | `≜` | definition |

### Alternative Inputs (Same Output)

All of these produce `x≜5`:

```
Define x as 5
x is defined as 5
x equals by definition 5
x is a 5
const x = 5
```

### When LLM Would Be Required

The following would trigger LLM fallback (confidence < 0.8):

```
Set the variable named x to hold the integer value five
```

This prose is too verbose and ambiguous for deterministic conversion.

### Quality Tier Explanation

- **◊⁺ (Gold)**: Achieved because:
  - Single, correct symbol used (≜)
  - No ambiguity in mapping
  - Proper AISP syntax
  - High compression ratio (3 chars vs ~15 chars prose)

### Common Errors to Avoid

| Error | Cause | Fix |
|-------|-------|-----|
| `x=5` (plain equals) | Missing definition symbol | Use `≜` for "defined as" |
| `x:=5` (assignment) | Wrong symbol | `:=` is `≔` (assigned), not `≜` |
| `x ≜ 5` (spaces) | Spacing | Minimal tier should be compact |

---

## Summary

| Step | Action | Result |
|------|--------|--------|
| 0 | Setup | npm install |
| 1 | Input | "Define x as 5" |
| 2 | Triage | Minimal tier, Rust mode |
| 3 | Convert | `x≜5` |
| 4 | Validate | ◊⁺ (Gold), valid |
| 5 | LLM | Skipped (confidence 0.95) |
| 6 | Final Validate | ◊⁺ (Gold), 0 corrections |
| 7 | Output | `x≜5` |

**Total Time:** <100ms (deterministic conversion)
**LLM Calls:** 0
**Validation Passes:** 1

---

[← Back to Guide](./README.md) | [Next: Example 2 →](./example-2-quantified-statement.md)
