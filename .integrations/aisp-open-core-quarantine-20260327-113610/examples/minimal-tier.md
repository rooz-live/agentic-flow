# AISP Minimal Tier Examples

> **Minimal Tier** — Fast, simple conversions for definitions and basic math.

---

## When to Use Minimal Tier

Use **Minimal** tier when you have:
- Simple variable definitions
- Basic mathematical expressions
- Single-line assignments
- No complex logic or quantifiers

**Token Ratio:** 0.5-1x (same or fewer tokens than input)

---

## Try It Yourself

### Example 1: Simple Definition

**Input:**
```bash
npx aisp-converter minimal "Define x as 5"
```

**Expected Output:**
```
x≜5
```

**Explanation:**
- `x` — Variable name preserved
- `≜` — "defined as" symbol (from Rosetta Stone)
- `5` — Value preserved

---

### Example 2: Assignment

**Input:**
```bash
npx aisp-converter minimal "Set y to 10"
```

**Expected Output:**
```
y≔10
```

**Explanation:**
- `≔` — "assigned/set to" symbol (different from definition)

---

### Example 3: Mathematical Expression

**Input:**
```bash
npx aisp-converter minimal "x equals y plus z"
```

**Expected Output:**
```
x≡y+z
```

**Explanation:**
- `≡` — "equals/identical to" symbol
- `+` — Addition preserved

---

### Example 4: Comparison

**Input:**
```bash
npx aisp-converter minimal "x is greater than 0"
```

**Expected Output:**
```
x>0
```

---

### Example 5: Square Root

**Input:**
```bash
npx aisp-converter minimal "y equals square root of x"
```

**Expected Output:**
```
y≡√x
```

---

## How to Read the Response

| Symbol | Meaning |
|--------|---------|
| `≜` | Defined as (permanent definition) |
| `≔` | Assigned to (mutable assignment) |
| `≡` | Identical to / equals |
| `+` `-` `×` `÷` | Arithmetic operators |
| `√` | Square root |
| `²` `³` | Superscripts (squared, cubed) |

---

## Validate Your Conversion

```bash
# Convert and validate in one step
npx aisp-converter minimal --validate "Define x as 5"
```

**Expected Output:**
```
x≜5
✓ Valid (Bronze tier)
```

**Note:** Minimal conversions typically result in Bronze (◊⁻) tier due to low symbol density.

---

## Use Cases for Minimal Tier

1. **Quick variable definitions** in documentation
2. **Mathematical constants** in specifications
3. **Simple config values** in AI prompts
4. **Learning AISP** — start here before moving to Standard

---

## JSON Output

```bash
npx aisp-converter minimal --json "Define x as 5"
```

**Expected Output:**
```json
{
  "input": "Define x as 5",
  "output": "x≜5",
  "tier": "minimal",
  "confidence": 1.0,
  "unmapped": []
}
```

---

**[Standard Tier Examples →](standard-tier.md)** | **[Full Tier Examples →](full-tier.md)** | **[Back to Examples →](README.md)**
