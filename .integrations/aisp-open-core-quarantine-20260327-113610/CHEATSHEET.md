# AISP Cheatsheet

**Quick reference for converting prose to AISP symbols** — Part of the official 512-symbol glossary (Σ_512).

*Created by [Bradley Ross](https://linkedin.com/in/bradaross) | [Full Specification →](AI_GUIDE.md)*

---

## Quantifiers

| Prose | Symbol | Example |
|-------|--------|---------|
| for all, every, each | `∀` | `∀x∈S` |
| there exists, some | `∃` | `∃x:P(x)` |
| exists unique, exactly one | `∃!` | `∃!x:unique(x)` |
| does not exist | `∄` | `∄x:false(x)` |

---

## Logic

| Prose | Symbol | Example |
|-------|--------|---------|
| and, both | `∧` | `A∧B` |
| or, either | `∨` | `A∨B` |
| not, negation | `¬` | `¬A` |
| implies, then, if-then | `⇒` | `A⇒B` |
| if and only if, iff | `⇔` | `A⇔B` |
| to, returns, maps to | `→` | `f:A→B` |
| xor, exclusive or | `⊕` | `A⊕B` |

---

## Comparison

| Prose | Symbol | Example |
|-------|--------|---------|
| greater than | `>` | `x>5` |
| less than | `<` | `x<10` |
| greater than or equal, at least | `≥` | `x≥0` |
| less than or equal, at most | `≤` | `x≤100` |
| equals, identical to | `≡` | `x≡y` |
| not equal, differs from | `≢` | `x≢y` |
| approximately | `≈` | `x≈3.14` |

---

## Definition

| Prose | Symbol | Example |
|-------|--------|---------|
| defined as, is a | `≜` | `x≜5` |
| assigned, set to, becomes | `≔` | `x≔x+1` |
| maps to | `↦` | `x↦x²` |

---

## Sets

| Prose | Symbol | Example |
|-------|--------|---------|
| in, element of, member of | `∈` | `x∈S` |
| not in | `∉` | `x∉S` |
| subset of | `⊆` | `A⊆B` |
| superset of | `⊇` | `A⊇B` |
| union | `∪` | `A∪B` |
| intersection | `∩` | `A∩B` |
| empty set, null | `∅` | `S=∅` |
| power set | `𝒫` | `𝒫(S)` |
| set difference, except | `∖` | `A∖B` |

---

## Types

| Prose | Symbol | Example |
|-------|--------|---------|
| natural numbers | `ℕ` | `n∈ℕ` |
| integers | `ℤ` | `z∈ℤ` |
| real numbers | `ℝ` | `x∈ℝ` |
| rational numbers | `ℚ` | `q∈ℚ` |
| boolean | `𝔹` | `flag∈𝔹` |
| string | `𝕊` | `name∈𝕊` |
| complex numbers | `ℂ` | `c∈ℂ` |

---

## Functions

| Prose | Symbol | Example |
|-------|--------|---------|
| lambda, function | `λ` | `λx.x+1` |
| compose, followed by | `∘` | `f∘g` |
| fixpoint, recursive | `fix` | `fix(f)` |

---

## Truth Values

| Prose | Symbol | Example |
|-------|--------|---------|
| true, valid, yes | `⊤` | `valid(x)=⊤` |
| false, invalid, no | `⊥` | `error(x)=⊥` |

---

## Special

| Prose | Symbol | Example |
|-------|--------|---------|
| QED, proven | `∎` | `proof∎` |
| proves, entails | `⊢` | `Γ⊢φ` |
| satisfies, models | `⊨` | `M⊨φ` |
| necessarily, always | `□` | `□P` |
| possibly, eventually | `◇` | `◇P` |

---

## Math Operators

| Prose | Symbol | Example |
|-------|--------|---------|
| plus, add | `+` | `x+y` |
| minus, subtract | `−` | `x−y` |
| times, multiply | `×` | `x×y` |
| divided by | `÷` | `x÷y` |
| squared | `²` | `x²` |
| cubed | `³` | `x³` |
| square root | `√` | `√x` |
| sum, summation | `Σ` | `Σᵢxᵢ` |
| product | `Π` | `Πᵢxᵢ` |
| infinity | `∞` | `n→∞` |

---

## Block Markers

| Block | Symbol | Purpose |
|-------|--------|---------|
| Meta | `⟦Ω⟧` | Document metadata |
| Types | `⟦Σ⟧` | Type definitions |
| Rules | `⟦Γ⟧` | Business rules |
| Functions | `⟦Λ⟧` | Function definitions |
| Errors | `⟦Χ⟧` | Error handling |
| Evidence | `⟦Ε⟧` | Validation proof |

---

## Quality Tiers

| Symbol | Tier | Density (δ) |
|--------|------|-------------|
| `◊⁺⁺` | Platinum | δ ≥ 0.75 |
| `◊⁺` | Gold | δ ≥ 0.60 |
| `◊` | Silver | δ ≥ 0.40 |
| `◊⁻` | Bronze | δ ≥ 0.20 |
| `⊘` | Reject | δ < 0.20 |

---

## Tuples & Records

| Prose | Symbol | Example |
|-------|--------|---------|
| tuple start | `⟨` | `⟨x,y⟩` |
| tuple end | `⟩` | `⟨a,b,c⟩` |

---

## Common Patterns

### Simple Definition
```
Prose: Define x as 5
AISP:  x≜5
```

### Quantified Statement
```
Prose: For all x in S, P(x) holds
AISP:  ∀x∈S:P(x)
```

### Conditional Rule
```
Prose: If user is admin then allow access
AISP:  admin(u)⇒allow(u)
```

### Type Declaration
```
Prose: User has name (string) and age (natural)
AISP:  User≜⟨name:𝕊,age:ℕ⟩
```

### Function Definition
```
Prose: Function f takes x and returns x plus 1
AISP:  f≜λx.x+1
```

### Existential Claim
```
Prose: There exists a valid solution
AISP:  ∃x:valid(x)
```

### Universal Rule with Implication
```
Prose: All authenticated users can access resources
AISP:  ∀u∈Users:auth(u)⇒access(u,resources)
```

---

## CLI Quick Reference

```bash
# Convert
npx aisp-converter "Define x as 5"

# Triage (analyze tier)
npx aisp-converter --triage "Your prose"

# Validate
npx aisp-validator validate file.aisp

# Validate with tier requirement
npx aisp-validator validate file.aisp --min-tier gold
```

---

**[Full Reference →](reference.md)** | **[AI Guide →](AI_GUIDE.md)** | **[Examples →](examples/)**
