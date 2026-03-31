# AISP End-to-End Conversion Guide

> Complete step-by-step examples for converting prose to AISP with validation.

**AISP Version:** 5.1 Platinum
**Quality Target:** ◊⁺ (Gold) or higher

---

## TL;DR Summary

| Metric | Value |
|--------|-------|
| Ambiguity Reduction | <2% |
| Token Compression | 60-90% |
| Conversion Tiers | 3 (Minimal, Standard, Full) |
| Quality Tiers | 5 (◊⁺⁺, ◊⁺, ◊, ◊⁻, ⊘) |
| Rosetta Mappings | 30+ bidirectional |

### Key Stats

- **Symbols:** 512 in Σ_512 glossary (8 categories × 64 each)
- **Quantifiers:** ∀ (for all), ∃ (exists), ∃! (unique)
- **Logic:** ∧ (and), ∨ (or), ¬ (not), ⇒ (implies), ⇔ (iff)
- **Definition:** ≜ (defined as), ≔ (assigned)
- **Functions:** λ (lambda), → (returns/maps to)
- **Sets:** ∈ (in), ⊆ (subset), ∪ (union), ∩ (intersection)
- **Types:** ℕ (natural), ℤ (integer), ℝ (real), 𝔹 (boolean), 𝕊 (string)

---

## Quick Setup

### 1. Install Dependencies

```bash
# Initialize npm project
npm init -y

# Install AISP converter and validator
npm install aisp-converter aisp-validator

# Optional: Install LLM SDKs for fallback
npm install @anthropic-ai/sdk  # Anthropic
npm install openai             # OpenAI
```

### 2. Key Reference Files

| File | Purpose |
|------|---------|
| `AI_GUIDE.md` | Full AISP 5.1 specification (for AI consumption) |
| `HUMAN_GUIDE.md` | Human-friendly tutorials |
| `reference.md` | Complete symbol glossary |

### 3. Environment Variables (Optional)

```bash
# For LLM fallback (when deterministic conversion < 0.8 confidence)
export ANTHROPIC_API_KEY="sk-ant-..."  # Preferred
export OPENAI_API_KEY="sk-..."         # Alternative
```

---

## Examples

| # | Example | Tier | Complexity |
|---|---------|------|------------|
| 1 | [Simple Definition](./example-1-simple-definition.md) | Minimal | Low |
| 2 | [Quantified Statement](./example-2-quantified-statement.md) | Minimal | Low |
| 3 | [Authentication Rule](./example-3-authentication-rule.md) | Standard | Medium |
| 4 | [Mathematical Theorem](./example-4-mathematical-theorem.md) | Full | High |
| 5 | [API Contract](./example-5-api-contract.md) | Full | High |

---

## Conversion Workflow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 0: Setup                                                   │
│  npm install aisp-converter aisp-validator                       │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Prose Input                                             │
│  "Define x as 5"                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Tier Detection                                          │
│  autoConvert() → determines Minimal/Standard/Full                │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Deterministic Conversion (Rosetta Stone)                │
│  convert(prose, { tier }) → AISP output                         │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Confidence Check                                        │
│  If confidence < 0.8 AND LLM available → fallback               │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Validation                                              │
│  validate(output) → quality tier (◊⁺⁺, ◊⁺, ◊, ◊⁻, ⊘)           │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Correction Loop (if needed)                             │
│  If tier < minTier → retry with LLM (max 3 attempts)            │
└──────────────────────────────┬──────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Final Output                                            │
│  x≜5  (validated, quality tier assigned)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conversion Tiers

| Tier | Name | Token Ratio | Use Case |
|------|------|-------------|----------|
| 1 | **Minimal** | 0.5-1x | Quick symbol substitution |
| 2 | **Standard** | 1.5-2x | With header, context |
| 3 | **Full** | 4-8x | Complete AISP document |

### Tier Detection Heuristics

| Pattern | Detected Tier |
|---------|---------------|
| Simple assignment (`x = 5`) | Minimal |
| Variable declaration (`const x = 5`) | Minimal |
| API keywords (`endpoint`, `REST`) | Standard |
| Proof keywords (`prove`, `theorem`) | Full |
| Complex logic (multiple quantifiers) | Full |

---

## Quality Tiers

| Symbol | Name | δ (density) | Meaning |
|--------|------|-------------|---------|
| ◊⁺⁺ | Platinum | δ ≥ 0.75 | Exceptional, highly optimized |
| ◊⁺ | Gold | δ ≥ 0.60 | Good, clear and correct |
| ◊ | Silver | δ ≥ 0.40 | Acceptable, functional |
| ◊⁻ | Bronze | δ ≥ 0.20 | Marginal, needs improvement |
| ⊘ | Reject | δ < 0.20 | Invalid, failed validation |

---

## API Reference

### Basic Conversion

```typescript
import { convert, autoConvert, Tier } from 'aisp-converter';

// Explicit tier
const result = convert('Define x as 5', { tier: Tier.Minimal });
console.log(result.output);     // "x≜5"
console.log(result.confidence); // 0.95

// Auto-detect tier
const auto = autoConvert('Prove that for all n, n > 0');
console.log(auto.tier);   // "full"
console.log(auto.output); // Full AISP document
```

### With LLM Fallback

```typescript
import { convertWithFallback } from 'aisp-converter';

const result = await convertWithFallback('complex ambiguous prose', {
  tier: Tier.Standard,
  llmProvider: 'anthropic',
  confidenceThreshold: 0.8,
});

console.log(result.usedFallback);    // true if LLM was used
console.log(result.fallbackProvider); // 'anthropic' if fallback used
```

### With Validation Loop

```typescript
import { convertAndValidate } from 'aisp-converter';

const result = await convertAndValidate('Define x as 5', {
  tier: Tier.Minimal,
  minTier: 'silver',       // Minimum quality
  maxAttempts: 3,          // Max correction attempts
  llmProvider: 'anthropic',
});

console.log(result.validation.valid); // true
console.log(result.validation.tier);  // '◊⁺' (Gold)
console.log(result.correctionAttempts); // 0-3
```

---

## CLI Usage (Rust)

```bash
# Install Rust validator
cargo install aisp

# Validate AISP file
aisp validate output.aisp

# Convert with tier selection
aisp convert --tier minimal "Define x as 5"

# Full document validation
aisp validate --strict --tier platinum document.aisp
```

---

## Next Steps

1. Start with [Example 1: Simple Definition](./example-1-simple-definition.md)
2. Progress through examples 2-5
3. Review the [AI_GUIDE.md](../../AI_GUIDE.md) for full specification
4. Check [reference.md](../../reference.md) for complete symbol glossary

---

*For questions or issues, see the [aisp-open-core](https://github.com/bar181/aisp-open-core) repository.*
