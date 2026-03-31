# AISP Standard Tier Examples

> **Standard Tier** — Balanced conversion for rules, types, and conditional logic.

---

## When to Use Standard Tier

Use **Standard** tier when you have:
- Quantified statements (for all, there exists)
- Conditional logic (if-then, implies)
- Type definitions with fields
- Rules with multiple conditions
- Set membership operations

**Token Ratio:** 1.5-2x (slightly more tokens, much more precision)

---

## Try It Yourself

### Example 1: Universal Quantifier

**Input:**
```bash
npx aisp-converter standard "For all x in S, P(x) holds"
```

**Expected Output:**
```
∀x∈S:P(x)
```

**Explanation:**
- `∀` — Universal quantifier ("for all")
- `∈` — Set membership ("in")
- `S` — Set name preserved
- `:` — Separator (such that)
- `P(x)` — Predicate application

---

### Example 2: Existential Quantifier

**Input:**
```bash
npx aisp-converter standard "There exists an x such that f(x) equals 0"
```

**Expected Output:**
```
∃x:f(x)≡0
```

**Explanation:**
- `∃` — Existential quantifier ("there exists")

---

### Example 3: Conditional Rule

**Input:**
```bash
npx aisp-converter standard "If user is admin then allow access"
```

**Expected Output:**
```
admin(user)⇒allow(user)
```

**Explanation:**
- `⇒` — Implication ("if-then", "implies")
- Predicates formatted as function calls

---

### Example 4: Universal with Implication

**Input:**
```bash
npx aisp-converter standard "For all users, if authenticated then allow access"
```

**Expected Output:**
```
∀u∈Users:auth(u)⇒allow(u)
```

**Explanation:**
- Combines quantifier (`∀`) with implication (`⇒`)
- Variable abbreviated to `u` for conciseness

---

### Example 5: Type Definition

**Input:**
```bash
npx aisp-converter standard "User has name (string) and age (natural number)"
```

**Expected Output:**
```
User≜⟨name:𝕊,age:ℕ⟩
```

**Explanation:**
- `≜` — Type definition
- `⟨⟩` — Record/tuple notation
- `𝕊` — String type
- `ℕ` — Natural number type

---

### Example 6: Logical Conjunction

**Input:**
```bash
npx aisp-converter standard "A and B and C"
```

**Expected Output:**
```
A∧B∧C
```

**Explanation:**
- `∧` — Logical AND

---

### Example 7: Logical Disjunction

**Input:**
```bash
npx aisp-converter standard "Either A or B"
```

**Expected Output:**
```
A∨B
```

**Explanation:**
- `∨` — Logical OR

---

### Example 8: Negation

**Input:**
```bash
npx aisp-converter standard "Not A implies B"
```

**Expected Output:**
```
¬A⇒B
```

**Explanation:**
- `¬` — Logical NOT

---

## How to Read the Response

| Symbol | Meaning |
|--------|---------|
| `∀` | For all (universal quantifier) |
| `∃` | There exists (existential quantifier) |
| `∃!` | There exists exactly one (unique) |
| `∈` | Element of / in |
| `⇒` | Implies / if-then |
| `⇔` | If and only if (biconditional) |
| `∧` | And (conjunction) |
| `∨` | Or (disjunction) |
| `¬` | Not (negation) |
| `⟨⟩` | Tuple/record notation |
| `𝕊` | String type |
| `ℕ` | Natural numbers |
| `ℤ` | Integers |
| `ℝ` | Real numbers |
| `𝔹` | Boolean |

---

## Validate Your Conversion

```bash
# Convert and validate
npx aisp-converter standard --validate "For all x in S, P(x)"
```

**Expected Output:**
```
∀x∈S:P(x)
✓ Valid (Silver tier)
```

**Note:** Standard conversions typically result in Silver (◊) to Gold (◊⁺) tier.

---

## Use Cases for Standard Tier

1. **Business rules** — "All premium users get priority support"
2. **Access control** — "If admin then allow delete"
3. **Data validation** — "For all inputs, length must be positive"
4. **API contracts** — Type definitions with constraints
5. **State machine rules** — Conditional transitions

---

## JSON Output

```bash
npx aisp-converter standard --json "For all x in S, P(x) holds"
```

**Expected Output:**
```json
{
  "input": "For all x in S, P(x) holds",
  "output": "∀x∈S:P(x)",
  "tier": "standard",
  "confidence": 0.95,
  "unmapped": []
}
```

---

## Triage Mode

Not sure if Standard is right? Use triage:

```bash
npx aisp-converter --triage "For all users, if admin then allow access"
```

**Expected Output:**
```
╔════════════════════════════════════════╗
║       AISP TIER RECOMMENDATION         ║
╚════════════════════════════════════════╝

  Recommended Tier: STANDARD
  Reason: Contains quantifier (∀) and implication (⇒)
  Confidence: 0.92
```

---

**[Minimal Tier Examples →](minimal-tier.md)** | **[Full Tier Examples →](full-tier.md)** | **[Back to Examples →](README.md)**
