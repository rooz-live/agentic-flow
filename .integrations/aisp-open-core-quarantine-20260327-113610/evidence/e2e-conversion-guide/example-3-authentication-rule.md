# Example 3: Authentication Rule

> Converting a conditional authentication logic from prose to AISP.

**Tier:** Standard
**Complexity:** Medium
**Expected Quality:** ◊⁺ (Gold) or higher

---

## TL;DR

| Metric | Value |
|--------|-------|
| Input Tokens | ~15 |
| Output Tokens | ~8 |
| Compression | 47% |
| Confidence | 0.88 |
| LLM Required | No |

---

## Step 0: Setup

### Install Dependencies

```bash
npm init -y
npm install aisp-converter aisp-validator
```

### Reference Files

- `AI_GUIDE.md` - Section `⟦Σ:Rosetta⟧` for logic symbols
- `reference.md` - Logic: ⇒ (implies), ∧ (and), ∨ (or)

---

## Step 1: Prose Input

**Natural Language:**
```
If user is authenticated then user can access resources
```

**Analysis:**
- Pattern: "If [condition] then [consequence]"
- Matches Rosetta entries:
  - `if then` / `implies` / `then` → `⇒`
- Contains: subject (user), predicate (authenticated), action (access)
- Tier: Standard (logic with context)

---

## Step 2: Conversion Triage

### Command

```typescript
import { autoConvert } from 'aisp-converter';

const result = autoConvert('If user is authenticated then user can access resources');
console.log(result);
```

### Output

```json
{
  "tier": "standard",
  "output": "𝔸:1.0\n⟦Γ:rule⟧\nauthenticated(user)⇒access(user,resources)",
  "confidence": 0.88,
  "mappings": [
    { "pattern": "if then", "symbol": "⇒", "category": "logic" }
  ]
}
```

### Explanation

The triage identifies:
- **Tier: Standard** - Business logic requiring context
- **Mode: Rust/WASM** - Deterministic, no LLM needed
- **Confidence: 0.88** - Good confidence (>0.8 threshold)

---

## Step 3: AISP Conversion

### Command

```typescript
import { convert, Tier } from 'aisp-converter';

const result = convert('If user is authenticated then user can access resources', {
  tier: Tier.Standard
});
console.log(result);
```

### Copy/Paste Input

```
If user is authenticated then user can access resources
```

### Expected Response

```json
{
  "output": "𝔸:1.0\n⟦Γ:rule⟧\nauthenticated(user)⇒access(user,resources)",
  "tier": "standard",
  "confidence": 0.88,
  "transformations": [
    {
      "original": "If ... then",
      "pattern": "if then",
      "symbol": "⇒"
    },
    {
      "original": "user is authenticated",
      "result": "authenticated(user)"
    },
    {
      "original": "user can access resources",
      "result": "access(user,resources)"
    }
  ]
}
```

---

## Step 4: Rust Validation (First Pass)

### Command

```bash
# Using aisp-validator npm package
npx aisp-validator validate "authenticated(user)⇒access(user,resources)"

# Or using Rust CLI
aisp validate "authenticated(user)⇒access(user,resources)"
```

### Programmatic Validation

```typescript
import { validate } from 'aisp-validator';

const validation = validate('authenticated(user)⇒access(user,resources)');
console.log(validation);
```

### Expected Output

```json
{
  "valid": true,
  "tier": "◊⁺",
  "density": 0.65,
  "errors": [],
  "warnings": [],
  "symbols": {
    "used": ["⇒"],
    "count": 1,
    "categories": ["logic"]
  }
}
```

### Quality Assessment

| Metric | Value | Status |
|--------|-------|--------|
| Valid | ✅ true | Passed |
| Tier | ◊⁺ (Gold) | Meets target |
| Density | 0.65 | Good compression |
| Errors | 0 | No issues |

---

## Step 5: LLM Conversion (Not Required)

Since confidence is **0.88** (above 0.8 threshold), LLM fallback is **skipped**.

```typescript
import { convertWithFallback } from 'aisp-converter';

const result = await convertWithFallback(
  'If user is authenticated then user can access resources',
  {
    tier: Tier.Standard,
    llmProvider: 'anthropic',
    confidenceThreshold: 0.8,
  }
);

console.log(result.usedFallback); // false - LLM not needed
```

---

## Step 6: Rust Validation (Final)

```typescript
import { convertAndValidate } from 'aisp-converter';

const result = await convertAndValidate(
  'If user is authenticated then user can access resources',
  {
    tier: Tier.Standard,
    minTier: 'silver',
    maxAttempts: 3,
  }
);

console.log(result);
```

### Final Validation Result

```json
{
  "output": "𝔸:1.0\n⟦Γ:rule⟧\nauthenticated(user)⇒access(user,resources)",
  "tier": "standard",
  "confidence": 0.88,
  "validation": {
    "valid": true,
    "tier": "◊⁺",
    "density": 0.65
  },
  "correctionAttempts": 0,
  "usedFallback": false
}
```

---

## Step 7: Final AISP Output

### Minimal Format

```
authenticated(user)⇒access(user,resources)
```

### Standard Format (Default for this tier)

```
𝔸:1.0
⟦Γ:rule⟧
authenticated(user)⇒access(user,resources)
```

### Full Format (if requested)

```
𝔸:5.1::◊⁺
CTX{domain≜"security";scope≜"authorization"}
⟦Ω:objective⟧
  Define authentication-based access control rule

⟦Σ:symbols⟧
  user:𝕊; authenticated:𝔹→𝔹; access:𝕊×𝕊→𝔹
  ⇒:implication

⟦Γ:rule⟧
  authenticated(user)⇒access(user,resources)

⟦Λ:semantics⟧
  "When the predicate authenticated evaluates to true for a given user,
   that user is granted the access predicate for the resources domain"

⟦Χ:constraints⟧
  authenticated(user)⇒¬anonymous(user)
  access(user,resources)⇒log(user,resources,timestamp)

⟦Ε:end⟧
∎
```

---

## Notes

### Symbol Mappings Used

| Prose | Symbol | Category |
|-------|--------|----------|
| `if then` / `then` | `⇒` | logic |

### Alternative Inputs (Same Output)

All of these produce equivalent AISP:

```
If user is authenticated then user can access resources
User authenticated implies user can access resources
authenticated(user) therefore access(user, resources)
When user authenticates, grant resource access
```

### Extended Authentication Examples

| Prose | AISP |
|-------|------|
| `If auth and admin then full access` | `authenticated(u)∧admin(u)⇒fullAccess(u)` |
| `If not auth then redirect to login` | `¬authenticated(u)⇒redirect(u,"/login")` |
| `Auth or token implies access` | `authenticated(u)∨validToken(u)⇒access(u)` |

### JavaScript Equivalents

```javascript
// JavaScript
if (isAuthenticated(user)) {
  grantAccess(user, resources);
}

// AISP
authenticated(user)⇒access(user,resources)
```

### When LLM Would Be Required

The following would trigger LLM fallback (confidence < 0.8):

```
In the event that our system has successfully verified the identity
of the individual attempting to utilize our platform through our
multi-factor authentication protocol, said individual shall be
permitted to interact with and retrieve information from our
protected resource repositories
```

This legalistic prose requires LLM interpretation.

### Quality Tier Explanation

- **◊⁺ (Gold)**: Achieved because:
  - Correct implication symbol (⇒)
  - Proper predicate notation
  - Clear subject-predicate structure
  - Good compression ratio

### Common Errors to Avoid

| Error | Cause | Fix |
|-------|-------|-----|
| `auth → access` | Wrong arrow | Use `⇒` for implication |
| `if auth then access` | Incomplete conversion | Convert keywords to symbols |
| `auth => access` | ASCII substitute | Use proper Unicode `⇒` |
| `auth ⇒ access` (no predicates) | Missing structure | Include full predicates |

### Security Considerations

When converting authentication rules:

1. **Completeness**: Ensure negation cases are covered
   ```
   authenticated(u)⇒access(u)
   ¬authenticated(u)⇒deny(u)
   ```

2. **Ordering**: Deny rules should precede allow rules
   ```
   blocked(u)⇒deny(u)
   authenticated(u)∧¬blocked(u)⇒access(u)
   ```

3. **Audit**: Include logging predicates
   ```
   access(u,r)⇒log(u,r,now())
   ```

---

## Summary

| Step | Action | Result |
|------|--------|--------|
| 0 | Setup | npm install |
| 1 | Input | "If user is authenticated then user can access resources" |
| 2 | Triage | Standard tier, Rust mode |
| 3 | Convert | `authenticated(user)⇒access(user,resources)` |
| 4 | Validate | ◊⁺ (Gold), valid |
| 5 | LLM | Skipped (confidence 0.88) |
| 6 | Final Validate | ◊⁺ (Gold), 0 corrections |
| 7 | Output | Standard format with header |

**Total Time:** <150ms (deterministic conversion)
**LLM Calls:** 0
**Validation Passes:** 1

---

[← Example 2](./example-2-quantified-statement.md) | [Back to Guide](./README.md) | [Next: Example 4 →](./example-4-mathematical-theorem.md)
