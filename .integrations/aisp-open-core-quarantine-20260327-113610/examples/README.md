# AISP CLI Examples

> Copy-paste examples for converting and validating AISP — the official tools.

---

## Quick Start

```bash
# Convert prose to AISP (no installation required)
npx aisp-converter "Define x as 5"
# Output: x≜5

# Validate AISP document
npx aisp-validator validate spec.aisp
# Output: ✓ VALID (Gold tier)
```

**Zero install. Just run with `npx` or `cargo`.**

---

## Examples by Tier

| Tier | Complexity | Use Case | Examples |
|------|------------|----------|----------|
| **[Minimal](minimal-tier.md)** | Simple | Definitions, math, assignments | `x≜5` |
| **[Standard](standard-tier.md)** | Balanced | Rules, types, conditions | `∀x∈S:P(x)⇒Q(x)` |
| **[Full](full-tier.md)** | Complete | Specifications with proofs | Full document structure |

---

## Conversion Examples

### Minimal Tier

```bash
npx aisp-converter minimal "Define x as 5"
# Output: x≜5

npx aisp-converter minimal "Set y to 10"
# Output: y≔10

npx aisp-converter minimal "x equals y plus z"
# Output: x≡y+z
```

### Standard Tier

```bash
npx aisp-converter standard "For all x in S, P(x) holds"
# Output: ∀x∈S:P(x)

npx aisp-converter standard "If user is admin then allow access"
# Output: admin(user)⇒allow(user)

npx aisp-converter standard "User has name (string) and age (natural number)"
# Output: User≜⟨name:𝕊,age:ℕ⟩
```

### Full Tier

```bash
npx aisp-converter full "Define User type with name and age. Rule: all users must be 18 or older."
# Output: Complete AISP document with blocks
```

---

## Validation Examples

```bash
# Validate document
npx aisp-validator validate spec.aisp
# Output: ✓ VALID (Gold tier)

# Get tier only
npx aisp-validator tier spec.aisp
# Output: ◊⁺ Gold

# Get density score
npx aisp-validator density spec.aisp
# Output: 0.6400

# Require minimum tier
npx aisp-validator validate spec.aisp --min-tier gold
# Output: ✓ VALID (Min-tier: gold ✓)

# Debug breakdown
npx aisp-validator debug spec.aisp
```

---

## Triage Mode

Not sure which tier to use? Let AISP decide:

```bash
npx aisp-converter --triage "For all users, if authenticated then allow access"
```

**Output:**
```
╔════════════════════════════════════════╗
║       AISP TIER RECOMMENDATION         ║
╚════════════════════════════════════════╝

  Recommended Tier: STANDARD
  Reason: Contains quantifier (∀) and implication (⇒)
```

---

## Rust CLI (Fastest)

```bash
# Install
cargo install aisp aisp-converter

# Convert
aisp-converter "Define x as 5"
# Output: x≜5

# Validate
aisp validate spec.aisp
# Output: ✓ VALID (Gold)

# Tier only
aisp tier spec.aisp
# Output: ◊⁺ Gold
```

---

## JSON Output

### Converter

```bash
npx aisp-converter --json "Define x as 5"
```

```json
{
  "input": "Define x as 5",
  "output": "x≜5",
  "tier": "minimal",
  "confidence": 1.0,
  "unmapped": []
}
```

### Validator

```bash
npx aisp-validator validate spec.aisp --json
```

```json
{
  "file": "spec.aisp",
  "valid": true,
  "tier": "◊⁺",
  "tierName": "Gold",
  "delta": 0.64,
  "pureDensity": 2.29
}
```

---

## End-to-End Workflow

```bash
# 1. Analyze complexity
npx aisp-converter --triage "All authenticated users can access their own data"

# 2. Convert to AISP
npx aisp-converter standard "All authenticated users can access their own data" --output access.aisp

# 3. Validate and check tier
npx aisp-validator validate access.aisp --min-tier gold

# 4. View quality breakdown
npx aisp-validator debug access.aisp
```

---

## CLI Options Quick Reference

### Converter

| Option | Description |
|--------|-------------|
| `minimal` / `standard` / `full` | Force conversion tier |
| `--triage` | Recommend tier (don't convert) |
| `--llm` | Force LLM conversion |
| `--no-llm` | Rosetta-only (no LLM) |
| `--validate` | Validate output |
| `--min-tier TIER` | Require minimum tier |
| `--confidence N` | LLM threshold (0.0-1.0) |
| `--recursions N` | Max correction attempts |
| `--input FILE` | Read from file |
| `--output FILE` | Write to file |
| `--json` | JSON output |
| `--verbose` | Detailed output |

### Validator

| Option | Description |
|--------|-------------|
| `validate` | Validate document |
| `tier` | Get tier only |
| `density` | Get density score |
| `debug` | Detailed breakdown |
| `--min-tier TIER` | Require minimum tier |
| `--long` | Detailed output |
| `--json` | JSON output |

---

## Detailed Examples by Tier

- **[Minimal Tier Examples](minimal-tier.md)** — Simple definitions and math
- **[Standard Tier Examples](standard-tier.md)** — Rules, types, and logic
- **[Full Tier Examples](full-tier.md)** — Complete specifications with proofs

---

**[Specification →](../AI_GUIDE.md)** | **[Cheatsheet →](../CHEATSHEET.md)** | **[Reference →](../reference.md)**
