# Example 2: Quantified Statement

> Converting a universal quantifier statement from prose to AISP.

**Tier:** Minimal
**Complexity:** Low-Medium
**Expected Quality:** ◊⁺ (Gold) or higher

---

## TL;DR

| Metric | Value |
|--------|-------|
| Input Tokens | ~8 |
| Output Tokens | ~5 |
| Compression | 38% |
| Confidence | 0.90+ |
| LLM Required | No |

---

## Step 0: Setup

### Install Dependencies

```bash
npm init -y
npm install aisp-converter aisp-validator
```

### Reference Files

- `AI_GUIDE.md` - Section `⟦Σ:Rosetta⟧` for quantifier symbols
- `reference.md` - Quantifiers: ∀ (for all), ∃ (exists), ∃! (unique)

---

## Step 1: Prose Input

**Natural Language:**
```
For all x in S, P(x) holds
```

**Analysis:**
- Pattern: "For all [var] in [set], [predicate]"
- Matches Rosetta entries:
  - `for all` → `∀`
  - `in` → `∈`
- Tier: Minimal (quantifier substitution)

---

## Step 2: Conversion Triage

### Command

```typescript
import { autoConvert } from 'aisp-converter';

const result = autoConvert('For all x in S, P(x) holds');
console.log(result);
```

### Output

```json
{
  "tier": "minimal",
  "output": "∀x∈S:P(x)",
  "confidence": 0.92,
  "mappings": [
    { "pattern": "for all", "symbol": "∀", "category": "quantifier" },
    { "pattern": "in", "symbol": "∈", "category": "set" }
  ]
}
```

### Explanation

The triage identifies:
- **Tier: Minimal** - Quantifier pattern, direct substitution
- **Mode: Rust/WASM** - Deterministic, no LLM needed
- **Confidence: 0.92** - High confidence (>0.8 threshold)

---

## Step 3: AISP Conversion

### Command

```typescript
import { convert, Tier } from 'aisp-converter';

const result = convert('For all x in S, P(x) holds', { tier: Tier.Minimal });
console.log(result);
```

### Copy/Paste Input

```
For all x in S, P(x) holds
```

### Expected Response

```json
{
  "output": "∀x∈S:P(x)",
  "tier": "minimal",
  "confidence": 0.92,
  "transformations": [
    {
      "original": "For all",
      "pattern": "for all",
      "symbol": "∀"
    },
    {
      "original": "in S",
      "pattern": "in",
      "symbol": "∈"
    },
    {
      "original": "P(x) holds",
      "pattern": "predicate",
      "result": ":P(x)"
    }
  ]
}
```

---

## Step 4: Rust Validation (First Pass)

### Command

```bash
# Using aisp-validator npm package
npx aisp-validator validate "∀x∈S:P(x)"

# Or using Rust CLI
aisp validate "∀x∈S:P(x)"
```

### Programmatic Validation

```typescript
import { validate } from 'aisp-validator';

const validation = validate('∀x∈S:P(x)');
console.log(validation);
```

### Expected Output

```json
{
  "valid": true,
  "tier": "◊⁺",
  "density": 0.72,
  "errors": [],
  "warnings": [],
  "symbols": {
    "used": ["∀", "∈"],
    "count": 2,
    "categories": ["quantifier", "set"]
  }
}
```

### Quality Assessment

| Metric | Value | Status |
|--------|-------|--------|
| Valid | ✅ true | Passed |
| Tier | ◊⁺ (Gold) | Meets target |
| Density | 0.72 | Excellent compression |
| Errors | 0 | No issues |

---

## Step 5: LLM Conversion (Not Required)

Since confidence is **0.92** (above 0.8 threshold), LLM fallback is **skipped**.

```typescript
import { convertWithFallback } from 'aisp-converter';

const result = await convertWithFallback('For all x in S, P(x) holds', {
  tier: Tier.Minimal,
  llmProvider: 'anthropic',
  confidenceThreshold: 0.8,
});

console.log(result.usedFallback); // false - LLM not needed
```

---

## Step 6: Rust Validation (Final)

```typescript
import { convertAndValidate } from 'aisp-converter';

const result = await convertAndValidate('For all x in S, P(x) holds', {
  tier: Tier.Minimal,
  minTier: 'silver',
  maxAttempts: 3,
});

console.log(result);
```

### Final Validation Result

```json
{
  "output": "∀x∈S:P(x)",
  "tier": "minimal",
  "confidence": 0.92,
  "validation": {
    "valid": true,
    "tier": "◊⁺",
    "density": 0.72
  },
  "correctionAttempts": 0,
  "usedFallback": false
}
```

---

## Step 7: Final AISP Output

### Minimal Format

```
∀x∈S:P(x)
```

### Standard Format (if requested)

```
𝔸:1.0
⟦Γ:quantified⟧
∀x∈S:P(x)
```

### Full Format (if requested)

```
𝔸:5.1::◊⁺
CTX{domain≜"logic";scope≜"predicate-logic"}
⟦Ω:objective⟧
  Universal quantification over set S

⟦Σ:symbols⟧
  x:element; S:set; P:predicate
  ∀:universal-quantifier; ∈:membership

⟦Γ:statement⟧
  ∀x∈S:P(x)

⟦Λ:semantics⟧
  "For every element x that is a member of set S,
   the predicate P applied to x evaluates to true"

⟦Ε:end⟧
∎
```

---

## Notes

### Symbol Mappings Used

| Prose | Symbol | Category |
|-------|--------|----------|
| `for all` | `∀` | quantifier |
| `in` | `∈` | set |

### Alternative Inputs (Same Output)

All of these produce `∀x∈S:P(x)`:

```
For all x in S, P(x) holds
For every x in S, P(x)
Every x in S satisfies P(x)
All x in S have P(x)
```

### Related Quantifier Examples

| Prose | AISP |
|-------|------|
| `There exists x in S such that P(x)` | `∃x∈S:P(x)` |
| `Exactly one x in S satisfies P(x)` | `∃!x∈S:P(x)` |
| `No x in S satisfies P(x)` | `¬∃x∈S:P(x)` |

### JavaScript Array Equivalents

| JavaScript | AISP |
|------------|------|
| `S.every(x => P(x))` | `∀x∈S:P(x)` |
| `S.some(x => P(x))` | `∃x∈S:P(x)` |
| `S.filter(x => P(x)).length === 1` | `∃!x∈S:P(x)` |

### When LLM Would Be Required

The following would trigger LLM fallback (confidence < 0.8):

```
Considering each and every possible element that could potentially
be found within the collection known as S, we assert that the
property P must necessarily be satisfied
```

This verbose prose has too much noise for deterministic conversion.

### Quality Tier Explanation

- **◊⁺ (Gold)**: Achieved because:
  - Correct quantifier symbol (∀)
  - Correct set membership symbol (∈)
  - Standard notation (variable:predicate)
  - High compression (9 chars vs ~30 chars prose)

### Common Errors to Avoid

| Error | Cause | Fix |
|-------|-------|-----|
| `∀x:S:P(x)` | Wrong separator | Use `∈` for membership |
| `∀x in S:P(x)` | Mixed notation | Replace `in` with `∈` |
| `∀x∈S,P(x)` | Wrong predicate separator | Use `:` before predicate |
| `for all x∈S:P(x)` | Incomplete conversion | Convert `for all` to `∀` |

---

## Summary

| Step | Action | Result |
|------|--------|--------|
| 0 | Setup | npm install |
| 1 | Input | "For all x in S, P(x) holds" |
| 2 | Triage | Minimal tier, Rust mode |
| 3 | Convert | `∀x∈S:P(x)` |
| 4 | Validate | ◊⁺ (Gold), valid |
| 5 | LLM | Skipped (confidence 0.92) |
| 6 | Final Validate | ◊⁺ (Gold), 0 corrections |
| 7 | Output | `∀x∈S:P(x)` |

**Total Time:** <100ms (deterministic conversion)
**LLM Calls:** 0
**Validation Passes:** 1

---

[← Example 1](./example-1-simple-definition.md) | [Back to Guide](./README.md) | [Next: Example 3 →](./example-3-authentication-rule.md)
