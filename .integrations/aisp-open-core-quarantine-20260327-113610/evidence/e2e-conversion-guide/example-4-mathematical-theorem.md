# Example 4: Mathematical Theorem

> Converting a formal mathematical theorem with proof structure to AISP.

**Tier:** Full
**Complexity:** High
**Expected Quality:** ◊⁺ (Gold) or higher

---

## TL;DR

| Metric | Value |
|--------|-------|
| Input Tokens | ~40 |
| Output Tokens | ~25 |
| Compression | 38% |
| Confidence | 0.75 (triggers LLM) |
| LLM Required | Yes (for full document) |

---

## Step 0: Setup

### Install Dependencies

```bash
npm init -y
npm install aisp-converter aisp-validator

# LLM SDK required for this example
npm install @anthropic-ai/sdk
```

### Environment Variables

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Reference Files

- `AI_GUIDE.md` - Full document structure (𝔸 → ⟦Ω⟧ → ⟦Σ⟧ → ⟦Γ⟧ → ⟦Λ⟧ → ⟦Ε⟧)
- `reference.md` - Proof symbols: ⊢ (proves), ∎ (QED)

---

## Step 1: Prose Input

**Natural Language:**
```
Prove that for all natural numbers n, if n is greater than 0 then n squared is also greater than 0
```

**Analysis:**
- Pattern: Proof statement with quantifier and implication
- Matches Rosetta entries:
  - `prove` → ⊢ (proof structure)
  - `for all` → ∀
  - `natural` → ℕ
  - `greater than` → > (contextual)
  - `if then` → ⇒
- Tier: Full (requires complete document structure)

---

## Step 2: Conversion Triage

### Command

```typescript
import { autoConvert } from 'aisp-converter';

const result = autoConvert(
  'Prove that for all natural numbers n, if n is greater than 0 then n squared is also greater than 0'
);
console.log(result);
```

### Output

```json
{
  "tier": "full",
  "output": "...",
  "confidence": 0.75,
  "recommendation": "LLM fallback recommended for full document generation",
  "mappings": [
    { "pattern": "for all", "symbol": "∀", "category": "quantifier" },
    { "pattern": "natural", "symbol": "ℕ", "category": "type" },
    { "pattern": "if then", "symbol": "⇒", "category": "logic" }
  ]
}
```

### Explanation

The triage identifies:
- **Tier: Full** - Proof keyword detected, requires complete structure
- **Mode: Hybrid** - Deterministic + LLM recommended
- **Confidence: 0.75** - Below 0.8 threshold, LLM recommended

---

## Step 3: AISP Conversion (Deterministic First)

### Command

```typescript
import { convert, Tier } from 'aisp-converter';

const result = convert(
  'Prove that for all natural numbers n, if n is greater than 0 then n squared is also greater than 0',
  { tier: Tier.Full }
);
console.log(result);
```

### Copy/Paste Input

```
Prove that for all natural numbers n, if n is greater than 0 then n squared is also greater than 0
```

### Expected Response (Deterministic)

```json
{
  "output": "𝔸:5.1\n⟦Γ:theorem⟧\n∀n∈ℕ:n>0⇒n²>0",
  "tier": "full",
  "confidence": 0.75,
  "warning": "Confidence below threshold. Full document may require LLM enhancement."
}
```

---

## Step 4: Rust Validation (First Pass)

### Command

```bash
npx aisp-validator validate "∀n∈ℕ:n>0⇒n²>0"
```

### Programmatic Validation

```typescript
import { validate } from 'aisp-validator';

const validation = validate('∀n∈ℕ:n>0⇒n²>0');
console.log(validation);
```

### Expected Output

```json
{
  "valid": true,
  "tier": "◊",
  "density": 0.45,
  "errors": [],
  "warnings": [
    "Full tier document missing required sections: ⟦Ω⟧, ⟦Σ⟧, ⟦Λ⟧, ⟦Ε⟧"
  ],
  "symbols": {
    "used": ["∀", "∈", "ℕ", "⇒"],
    "count": 4,
    "categories": ["quantifier", "set", "type", "logic"]
  }
}
```

### Quality Assessment

| Metric | Value | Status |
|--------|-------|--------|
| Valid | ✅ true | Passed |
| Tier | ◊ (Silver) | Below target |
| Density | 0.45 | Adequate |
| Warnings | 1 | Missing sections |

**Decision:** Quality ◊ (Silver) is below target ◊⁺ (Gold). LLM enhancement needed.

---

## Step 5: LLM Conversion (Required)

Since confidence is **0.75** (below 0.8 threshold) and quality is **◊** (below ◊⁺ target), LLM fallback is **triggered**.

### Command

```typescript
import { convertWithFallback } from 'aisp-converter';

const result = await convertWithFallback(
  'Prove that for all natural numbers n, if n is greater than 0 then n squared is also greater than 0',
  {
    tier: Tier.Full,
    llmProvider: 'anthropic',
    confidenceThreshold: 0.8,
  }
);

console.log(result);
```

### LLM Request (Internal)

```json
{
  "model": "claude-sonnet-4-20250514",
  "system": "You are an AISP converter. Convert prose to AISP 5.1 format...",
  "prompt": "Convert to full AISP document:\n\nProve that for all natural numbers n, if n is greater than 0 then n squared is also greater than 0\n\nDeterministic conversion: ∀n∈ℕ:n>0⇒n²>0\n\nGenerate complete document with all required sections."
}
```

### LLM Response

```
𝔸:5.1::◊⁺
CTX{domain≜"mathematics";scope≜"number-theory"}
⟦Ω:objective⟧
  Prove positivity preservation under squaring for natural numbers

⟦Σ:symbols⟧
  n:ℕ; >:ordering; ²:exponent
  ∀:universal; ⇒:implication

⟦Γ:theorem⟧
  ∀n∈ℕ:n>0⇒n²>0

⟦Λ:proof⟧
  Let n∈ℕ, n>0
  ∵ n>0 ∧ n>0
  ∴ n×n>0×n (multiplication preserves inequality)
  ∴ n²>0

⟦Ε:end⟧
∎
```

### Fallback Result

```json
{
  "output": "𝔸:5.1::◊⁺\nCTX{domain≜\"mathematics\";scope≜\"number-theory\"}\n⟦Ω:objective⟧\n  Prove positivity preservation under squaring...\n...\n∎",
  "tier": "full",
  "confidence": 0.92,
  "usedFallback": true,
  "fallbackProvider": "anthropic"
}
```

---

## Step 6: Rust Validation (Final)

### Command

```typescript
import { convertAndValidate } from 'aisp-converter';

const result = await convertAndValidate(
  'Prove that for all natural numbers n, if n is greater than 0 then n squared is also greater than 0',
  {
    tier: Tier.Full,
    minTier: 'gold',
    maxAttempts: 3,
    llmProvider: 'anthropic',
  }
);

console.log(result);
```

### Final Validation Result

```json
{
  "output": "𝔸:5.1::◊⁺\n...\n∎",
  "tier": "full",
  "confidence": 0.92,
  "validation": {
    "valid": true,
    "tier": "◊⁺",
    "density": 0.68,
    "sections": {
      "header": true,
      "context": true,
      "objective": true,
      "symbols": true,
      "body": true,
      "proof": true,
      "end": true
    }
  },
  "correctionAttempts": 1,
  "usedFallback": true,
  "fallbackProvider": "anthropic"
}
```

---

## Step 7: Final AISP Output

### Full Format (Required for this tier)

```
𝔸:5.1::◊⁺
CTX{domain≜"mathematics";scope≜"number-theory"}
⟦Ω:objective⟧
  Prove positivity preservation under squaring for natural numbers

⟦Σ:symbols⟧
  n:ℕ; >:ordering; ²:exponent
  ∀:universal; ⇒:implication

⟦Γ:theorem⟧
  ∀n∈ℕ:n>0⇒n²>0

⟦Λ:proof⟧
  Let n∈ℕ, n>0
  ∵ n>0 ∧ n>0
  ∴ n×n>0×n (multiplication preserves inequality)
  ∴ n²>0

⟦Ε:end⟧
∎
```

### Section Breakdown

| Section | Symbol | Purpose |
|---------|--------|---------|
| Header | `𝔸:5.1::◊⁺` | Version and quality tier |
| Context | `CTX{...}` | Domain and scope |
| Objective | `⟦Ω:objective⟧` | Goal statement |
| Symbols | `⟦Σ:symbols⟧` | Symbol definitions |
| Body | `⟦Γ:theorem⟧` | Main theorem |
| Proof | `⟦Λ:proof⟧` | Proof steps |
| End | `⟦Ε:end⟧` `∎` | Completion marker |

---

## Notes

### Symbol Mappings Used

| Prose | Symbol | Category |
|-------|--------|----------|
| `for all` | `∀` | quantifier |
| `natural` | `ℕ` | type |
| `if then` | `⇒` | logic |
| `QED` / end | `∎` | special |
| `because` | `∵` | special |
| `therefore` | `∴` | special |

### Proof Symbols

| Symbol | Meaning | Usage |
|--------|---------|-------|
| `∵` | because | Introduces premise |
| `∴` | therefore | Introduces conclusion |
| `⊢` | proves | Derivation |
| `∎` | QED | End of proof |

### Related Theorem Examples

| Theorem Type | AISP Structure |
|--------------|----------------|
| Existence | `∃x∈S:P(x)` + existence proof |
| Uniqueness | `∃!x∈S:P(x)` + uniqueness proof |
| If and only if | `P⇔Q` + biconditional proof |
| Contradiction | `¬P⇒⊥` + reductio |

### When LLM Is Required

LLM is typically required for:

1. **Full tier documents** - Need complete section structure
2. **Proof generation** - Logical steps require reasoning
3. **Complex predicates** - Multiple nested quantifiers
4. **Verbose prose** - Natural language with ambiguity

### Quality Tier Progression

This example demonstrates tier progression:

| Pass | Quality | Action |
|------|---------|--------|
| 1 (Deterministic) | ◊ (Silver) | Missing sections |
| 2 (LLM Enhanced) | ◊⁺ (Gold) | Complete document |

### Common Errors to Avoid

| Error | Cause | Fix |
|-------|-------|-----|
| Missing `∎` | Incomplete proof | Always end with QED |
| No `⟦Ε:end⟧` | Missing section | Full tier requires all sections |
| Mixed notation | `for all` + `∀` | Consistent symbol use |
| No context | Missing `CTX` | Include domain metadata |

---

## Summary

| Step | Action | Result |
|------|--------|--------|
| 0 | Setup | npm install + API key |
| 1 | Input | "Prove that for all natural numbers n..." |
| 2 | Triage | Full tier, Hybrid mode |
| 3 | Convert | Deterministic: `∀n∈ℕ:n>0⇒n²>0` |
| 4 | Validate | ◊ (Silver) - missing sections |
| 5 | LLM | Enhanced to full document |
| 6 | Final Validate | ◊⁺ (Gold), 1 correction |
| 7 | Output | Complete AISP document |

**Total Time:** ~2-3 seconds (includes LLM call)
**LLM Calls:** 1
**Validation Passes:** 2

---

[← Example 3](./example-3-authentication-rule.md) | [Back to Guide](./README.md) | [Next: Example 5 →](./example-5-api-contract.md)
