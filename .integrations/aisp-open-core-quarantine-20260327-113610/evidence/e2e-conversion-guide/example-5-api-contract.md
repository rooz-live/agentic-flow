# Example 5: API Contract

> Converting a REST API contract specification from prose to AISP.

**Tier:** Full
**Complexity:** High
**Expected Quality:** ◊⁺ (Gold) or higher

---

## TL;DR

| Metric | Value |
|--------|-------|
| Input Tokens | ~60 |
| Output Tokens | ~35 |
| Compression | 42% |
| Confidence | 0.82 |
| LLM Required | Optional (for full enrichment) |

---

## Step 0: Setup

### Install Dependencies

```bash
npm init -y
npm install aisp-converter aisp-validator

# Optional: LLM SDK for enhanced contracts
npm install @anthropic-ai/sdk
```

### Reference Files

- `AI_GUIDE.md` - Section `⟦Σ:Rosetta⟧` for function/type symbols
- `reference.md` - Types: 𝕊 (string), ℤ (integer), 𝔹 (boolean)

---

## Step 1: Prose Input

**Natural Language:**
```
Define a REST API endpoint: GET /users/{id} that accepts an integer user ID parameter, returns a User object containing name (string), email (string), and active status (boolean), and returns 404 if user not found
```

**Analysis:**
- Pattern: API contract with input/output types
- Matches Rosetta entries:
  - `defined as` → ≜
  - `returns` → →
  - `string` → 𝕊
  - `integer` → ℤ
  - `boolean` → 𝔹
  - `not` → ¬
- Tier: Full (complete contract specification)

---

## Step 2: Conversion Triage

### Command

```typescript
import { autoConvert } from 'aisp-converter';

const prose = `Define a REST API endpoint: GET /users/{id} that accepts an integer user ID parameter, returns a User object containing name (string), email (string), and active status (boolean), and returns 404 if user not found`;

const result = autoConvert(prose);
console.log(result);
```

### Output

```json
{
  "tier": "full",
  "output": "...",
  "confidence": 0.82,
  "mappings": [
    { "pattern": "defined as", "symbol": "≜", "category": "definition" },
    { "pattern": "returns", "symbol": "→", "category": "function" },
    { "pattern": "string", "symbol": "𝕊", "category": "type" },
    { "pattern": "integer", "symbol": "ℤ", "category": "type" },
    { "pattern": "boolean", "symbol": "𝔹", "category": "type" }
  ]
}
```

### Explanation

The triage identifies:
- **Tier: Full** - API/endpoint keywords detected
- **Mode: Rust/WASM** - Deterministic (confidence 0.82 > 0.8)
- **Confidence: 0.82** - Just above threshold

---

## Step 3: AISP Conversion

### Command

```typescript
import { convert, Tier } from 'aisp-converter';

const prose = `Define a REST API endpoint: GET /users/{id} that accepts an integer user ID parameter, returns a User object containing name (string), email (string), and active status (boolean), and returns 404 if user not found`;

const result = convert(prose, { tier: Tier.Full });
console.log(result);
```

### Copy/Paste Input

```
Define a REST API endpoint: GET /users/{id} that accepts an integer user ID parameter, returns a User object containing name (string), email (string), and active status (boolean), and returns 404 if user not found
```

### Expected Response

```json
{
  "output": "𝔸:5.1::◊⁺\nCTX{domain≜\"api\";scope≜\"rest\"}\n⟦Ω:objective⟧\n  Define GET /users/{id} endpoint\n\n⟦Σ:types⟧\n  id:ℤ; User:{name:𝕊,email:𝕊,active:𝔹}\n\n⟦Γ:contract⟧\n  GET/users/{id}:ℤ→User∨404\n\n⟦Χ:constraints⟧\n  ¬∃user(id)⇒404\n\n⟦Ε:end⟧\n∎",
  "tier": "full",
  "confidence": 0.82,
  "transformations": [
    {
      "original": "integer user ID parameter",
      "result": "id:ℤ"
    },
    {
      "original": "User object containing name (string), email (string), and active status (boolean)",
      "result": "User:{name:𝕊,email:𝕊,active:𝔹}"
    },
    {
      "original": "returns 404 if user not found",
      "result": "¬∃user(id)⇒404"
    }
  ]
}
```

---

## Step 4: Rust Validation (First Pass)

### Command

```bash
npx aisp-validator validate "GET/users/{id}:ℤ→User∨404"
```

### Programmatic Validation

```typescript
import { validate } from 'aisp-validator';

const aisp = `𝔸:5.1::◊⁺
CTX{domain≜"api";scope≜"rest"}
⟦Ω:objective⟧
  Define GET /users/{id} endpoint

⟦Σ:types⟧
  id:ℤ; User:{name:𝕊,email:𝕊,active:𝔹}

⟦Γ:contract⟧
  GET/users/{id}:ℤ→User∨404

⟦Χ:constraints⟧
  ¬∃user(id)⇒404

⟦Ε:end⟧
∎`;

const validation = validate(aisp);
console.log(validation);
```

### Expected Output

```json
{
  "valid": true,
  "tier": "◊⁺",
  "density": 0.62,
  "errors": [],
  "warnings": [],
  "symbols": {
    "used": ["≜", "→", "∨", "¬", "∃", "⇒", "ℤ", "𝕊", "𝔹"],
    "count": 9,
    "categories": ["definition", "function", "logic", "quantifier", "type"]
  },
  "sections": {
    "header": true,
    "context": true,
    "objective": true,
    "types": true,
    "body": true,
    "constraints": true,
    "end": true
  }
}
```

### Quality Assessment

| Metric | Value | Status |
|--------|-------|--------|
| Valid | ✅ true | Passed |
| Tier | ◊⁺ (Gold) | Meets target |
| Density | 0.62 | Good compression |
| Errors | 0 | No issues |

---

## Step 5: LLM Conversion (Optional Enhancement)

Since confidence is **0.82** (above threshold) and quality is **◊⁺** (meets target), LLM is optional but can enhance documentation.

### Optional Enhancement

```typescript
import { convertWithFallback } from 'aisp-converter';

const result = await convertWithFallback(prose, {
  tier: Tier.Full,
  llmProvider: 'anthropic',
  confidenceThreshold: 0.9, // Higher threshold to trigger LLM
});

console.log(result.usedFallback); // true - enhanced with LLM
```

### LLM-Enhanced Output

```
𝔸:5.1::◊⁺⁺
CTX{domain≜"api";scope≜"rest";version≜"1.0"}
⟦Ω:objective⟧
  Define RESTful user retrieval endpoint with error handling

⟦Σ:types⟧
  id:ℤ⁺                          // positive integer
  User≜{
    name:𝕊,                      // required, non-empty
    email:𝕊,                     // RFC 5322 format
    active:𝔹                     // account status
  }
  Error≜{code:ℤ,message:𝕊}

⟦Γ:contract⟧
  GET/users/{id}:ℤ⁺→User∨Error

⟦Λ:semantics⟧
  ∀id∈ℤ⁺:
    ∃user(id)⇒response(200,User)
    ¬∃user(id)⇒response(404,Error{code≜404,message≜"User not found"})

⟦Χ:constraints⟧
  id>0                           // positive constraint
  |name|>0∧|name|≤100           // name length
  email∈RFC5322                  // email format

⟦Ε:end⟧
∎
```

---

## Step 6: Rust Validation (Final)

### Command

```typescript
import { convertAndValidate } from 'aisp-converter';

const result = await convertAndValidate(prose, {
  tier: Tier.Full,
  minTier: 'gold',
  maxAttempts: 3,
  llmProvider: 'anthropic',
});

console.log(result);
```

### Final Validation Result

```json
{
  "output": "𝔸:5.1::◊⁺\n...\n∎",
  "tier": "full",
  "confidence": 0.82,
  "validation": {
    "valid": true,
    "tier": "◊⁺",
    "density": 0.62,
    "sections": {
      "header": true,
      "context": true,
      "objective": true,
      "types": true,
      "body": true,
      "constraints": true,
      "end": true
    }
  },
  "correctionAttempts": 0,
  "usedFallback": false
}
```

---

## Step 7: Final AISP Output

### Full Format (Standard)

```
𝔸:5.1::◊⁺
CTX{domain≜"api";scope≜"rest"}
⟦Ω:objective⟧
  Define GET /users/{id} endpoint

⟦Σ:types⟧
  id:ℤ; User:{name:𝕊,email:𝕊,active:𝔹}

⟦Γ:contract⟧
  GET/users/{id}:ℤ→User∨404

⟦Χ:constraints⟧
  ¬∃user(id)⇒404

⟦Ε:end⟧
∎
```

### Full Format (Enhanced with Comments)

```
𝔸:5.1::◊⁺⁺
CTX{domain≜"api";scope≜"rest";version≜"1.0"}

⟦Ω:objective⟧
  // User retrieval endpoint with comprehensive error handling

⟦Σ:types⟧
  id:ℤ⁺                          // path parameter
  User≜{name:𝕊,email:𝕊,active:𝔹} // response body

⟦Γ:contract⟧
  GET/users/{id}:ℤ⁺→User∨404

  // Signature breakdown:
  // - Method: GET
  // - Path: /users/{id}
  // - Input: ℤ⁺ (positive integer)
  // - Output: User object OR 404 error

⟦Λ:semantics⟧
  ∃user(id)⇒200:User             // success case
  ¬∃user(id)⇒404                 // not found case

⟦Χ:constraints⟧
  id>0                           // id must be positive
  |name|∈[1,100]                 // name length constraint
  email∈RFC5322                  // valid email format

⟦Ε:end⟧
∎
```

---

## Notes

### Symbol Mappings Used

| Prose | Symbol | Category |
|-------|--------|----------|
| `defined as` | `≜` | definition |
| `returns` / `maps to` | `→` | function |
| `or` | `∨` | logic |
| `not` | `¬` | logic |
| `exists` | `∃` | quantifier |
| `implies` / `if then` | `⇒` | logic |
| `string` | `𝕊` | type |
| `integer` | `ℤ` | type |
| `boolean` | `𝔹` | type |

### API Contract Patterns

| Pattern | AISP |
|---------|------|
| `GET /resource` | `GET/resource:∅→R` |
| `GET /resource/{id}` | `GET/resource/{id}:ℤ→R` |
| `POST /resource` | `POST/resource:R→R∨Error` |
| `PUT /resource/{id}` | `PUT/resource/{id}:R→R∨Error` |
| `DELETE /resource/{id}` | `DELETE/resource/{id}:ℤ→∅∨Error` |

### Type Definitions

| Prose | AISP |
|-------|------|
| `object with fields a, b, c` | `{a:T₁,b:T₂,c:T₃}` |
| `array of T` | `[T]` or `T[]` |
| `optional T` | `T?` |
| `nullable T` | `T∨∅` |
| `T or error` | `T∨Error` |

### HTTP Status Codes in AISP

| Code | AISP Pattern |
|------|--------------|
| 200 | `→R` (implicit success) |
| 201 | `→201:R` (created) |
| 204 | `→∅` (no content) |
| 400 | `∨400` (bad request) |
| 401 | `∨401` (unauthorized) |
| 403 | `∨403` (forbidden) |
| 404 | `∨404` (not found) |
| 500 | `∨500` (server error) |

### OpenAPI Equivalence

```yaml
# OpenAPI 3.0
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          schema:
            type: integer
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        404:
          description: User not found
components:
  schemas:
    User:
      type: object
      properties:
        name:
          type: string
        email:
          type: string
        active:
          type: boolean
```

Equivalent AISP (90% token reduction):

```
GET/users/{id}:ℤ→User∨404
User≜{name:𝕊,email:𝕊,active:𝔹}
```

### Common Errors to Avoid

| Error | Cause | Fix |
|-------|-------|-----|
| `GET /users/{id}` | Missing type signature | Add `:ℤ→User` |
| `→ User` | Space in arrow | No space: `→User` |
| `string` instead of `𝕊` | Incomplete conversion | Use type symbols |
| Missing error handling | Incomplete contract | Add `∨404` or `∨Error` |

### Best Practices for API Contracts

1. **Always include error cases**
   ```
   GET/resource/{id}:ℤ→R∨404∨500
   ```

2. **Define reusable types**
   ```
   Error≜{code:ℤ,message:𝕊}
   ```

3. **Add constraints for validation**
   ```
   ⟦Χ:constraints⟧
   id>0; |name|≤100; email∈RFC5322
   ```

4. **Include semantic descriptions**
   ```
   ⟦Λ:semantics⟧
   ∃user(id)⇒200:User
   ¬∃user(id)⇒404:Error
   ```

---

## Summary

| Step | Action | Result |
|------|--------|--------|
| 0 | Setup | npm install |
| 1 | Input | "Define a REST API endpoint: GET /users/{id}..." |
| 2 | Triage | Full tier, Rust mode |
| 3 | Convert | Complete contract specification |
| 4 | Validate | ◊⁺ (Gold), valid |
| 5 | LLM | Optional (confidence 0.82 > threshold) |
| 6 | Final Validate | ◊⁺ (Gold), 0 corrections |
| 7 | Output | Full AISP API contract |

**Total Time:** ~200ms (deterministic conversion)
**LLM Calls:** 0 (optional 1 for enhancement)
**Validation Passes:** 1

---

## Comparison: OpenAPI vs AISP

| Metric | OpenAPI | AISP |
|--------|---------|------|
| Tokens | ~150 | ~35 |
| Compression | - | 77% |
| Machine Readable | Yes | Yes |
| Human Readable | Moderate | High (with training) |
| Ambiguity | Low | Very Low (<2%) |

---

[← Example 4](./example-4-mathematical-theorem.md) | [Back to Guide](./README.md)
