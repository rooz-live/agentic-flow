# AISP Full Tier Examples

> **Full Tier** — Complete specifications with proofs, evidence blocks, and formal structure.

---

## When to Use Full Tier

Use **Full** tier when you need:
- Complete AISP documents with all required blocks
- Formal specifications with proofs
- Evidence blocks (`⟦Ε⟧`) for validation
- Multi-block structure (Types, Rules, Functions, Errors)
- Production-ready, machine-verifiable specifications

**Token Ratio:** 4-8x (more tokens, maximum precision and provability)

---

## Full Document Structure

A complete AISP document follows this structure:

```
𝔸[version].[name]@[date]     # Header
γ≔[context]                  # Context
ρ≔⟨[tags]⟩                   # References (optional)
⊢[claims]                    # Claims (optional)

⟦Ω:Meta⟧{ ... }              # Metadata block
⟦Σ:Types⟧{ ... }             # Type definitions
⟦Γ:Rules⟧{ ... }             # Business rules
⟦Λ:Funcs⟧{ ... }             # Function definitions
⟦Χ:Errors⟧{ ... }            # Error handling (optional)
⟦Ε⟧⟨δ;φ;τ;⊢⟩                 # Evidence block (required)
```

---

## Try It Yourself

### Example 1: Simple Full Document

**Input:**
```bash
npx aisp-converter full "Define User type with name and age. Rule: all users must be 18 or older."
```

**Expected Output:**
```
𝔸1.0.user-spec@2026-01-26
γ≔user.specification

⟦Σ:Types⟧{
  User≜⟨name:𝕊,age:ℕ⟩
}

⟦Γ:Rules⟧{
  ∀u∈User:u.age≥18
}

⟦Λ:Funcs⟧{
  valid≜λu.u.age≥18
}

⟦Ε⟧⟨δ≜0.65;φ≜85;τ≜◊⁺⟩
```

**Explanation:**
- `𝔸1.0.user-spec@2026-01-26` — AISP header with version, name, date
- `γ≔` — Context identifier
- `⟦Σ:Types⟧` — Type definitions block
- `⟦Γ:Rules⟧` — Business rules block
- `⟦Λ:Funcs⟧` — Function definitions block
- `⟦Ε⟧` — Evidence block with density (δ), completeness (φ), tier (τ)

---

### Example 2: Authentication Specification

**Input:**
```bash
npx aisp-converter full "Authentication: Users have username and password. Rule: authenticated users can access resources. Function: authenticate checks credentials."
```

**Expected Output:**
```
𝔸1.0.auth-spec@2026-01-26
γ≔auth.specification

⟦Σ:Types⟧{
  User≜⟨username:𝕊,password:𝕊⟩
  Credentials≜⟨user:𝕊,pass:𝕊⟩
}

⟦Γ:Rules⟧{
  ∀u∈User:auth(u)⇒access(u,Resources)
}

⟦Λ:Funcs⟧{
  auth≜λc.verify(c.user,c.pass)
}

⟦Ε⟧⟨δ≜0.72;φ≜90;τ≜◊⁺⟩
```

---

### Example 3: API Contract

**Input:**
```bash
npx aisp-converter full "API: getUser takes userId (natural) returns User or Error. Precondition: userId must be positive. Postcondition: result is valid user or error."
```

**Expected Output:**
```
𝔸1.0.api-contract@2026-01-26
γ≔api.getuser

⟦Σ:Types⟧{
  UserId≜ℕ
  User≜⟨id:UserId,name:𝕊⟩
  Error≜⟨code:ℕ,msg:𝕊⟩
  Result≜User⊕Error
}

⟦Γ:Rules⟧{
  Pre:∀id:UserId:id>0
  Post:∀r:Result:valid(r)
}

⟦Λ:Funcs⟧{
  getUser:UserId→Result
  getUser≜λid.id>0→fetch(id)|Error(404,"Not found")
}

⟦Χ:Errors⟧{
  id≤0⇒Error(400,"Invalid ID")
  ¬exists(id)⇒Error(404,"Not found")
}

⟦Ε⟧⟨δ≜0.78;φ≜95;τ≜◊⁺⁺⟩
```

---

## How to Read the Response

### Document Blocks

| Block | Symbol | Purpose |
|-------|--------|---------|
| Meta | `⟦Ω⟧` | Document metadata and invariants |
| Types | `⟦Σ⟧` | Type definitions |
| Rules | `⟦Γ⟧` | Business rules and constraints |
| Functions | `⟦Λ⟧` | Function definitions |
| Errors | `⟦Χ⟧` | Error handling (optional) |
| Evidence | `⟦Ε⟧` | Validation proof (required) |

### Evidence Block Fields

| Field | Meaning |
|-------|---------|
| `δ` | Semantic density (0.0-1.0) |
| `φ` | Completeness score (0-100) |
| `τ` | Quality tier (◊⁺⁺, ◊⁺, ◊, ◊⁻, ⊘) |
| `⊢` | Proof claims (optional) |

### Type Constructors

| Symbol | Meaning |
|--------|---------|
| `⟨a:A,b:B⟩` | Record type |
| `A⊕B` | Sum type (either A or B) |
| `A×B` | Product type (A and B) |
| `A→B` | Function type (A to B) |
| `List⟨A⟩` | List of A |
| `Maybe⟨A⟩` | Optional A |

---

## Validate Your Conversion

```bash
# Convert and validate with minimum tier requirement
npx aisp-converter full --validate --min-tier gold "Define User type with name and age"
```

**Expected Output:**
```
𝔸1.0.user-spec@2026-01-26
γ≔user.specification
⟦Σ:Types⟧{User≜⟨name:𝕊,age:ℕ⟩}
⟦Γ:Rules⟧{⊤}
⟦Λ:Funcs⟧{id≜λx.x}
⟦Ε⟧⟨δ≜0.62;φ≜80;τ≜◊⁺⟩

✓ Valid (Gold tier)
  Min-tier: gold ✓
```

---

## Use Cases for Full Tier

1. **Production specifications** — Formal API contracts
2. **AI agent instructions** — Unambiguous task definitions
3. **Multi-agent coordination** — Zero-drift protocols
4. **Safety-critical systems** — Provable constraints
5. **Compliance documentation** — Machine-verifiable requirements
6. **Smart contracts** — Formal pre/post conditions

---

## JSON Output

```bash
npx aisp-converter full --json "Define User with name. All users must be valid."
```

**Expected Output:**
```json
{
  "input": "Define User with name. All users must be valid.",
  "output": "𝔸1.0.user@2026-01-26\nγ≔user\n⟦Σ:Types⟧{User≜⟨name:𝕊⟩}\n⟦Γ:Rules⟧{∀u∈User:valid(u)}\n⟦Λ:Funcs⟧{valid≜λu.⊤}\n⟦Ε⟧⟨δ≜0.68;φ≜88;τ≜◊⁺⟩",
  "tier": "full",
  "confidence": 0.88,
  "unmapped": [],
  "validation": {
    "valid": true,
    "tier": "◊⁺",
    "tierName": "Gold",
    "delta": 0.68
  }
}
```

---

## LLM Enhancement

For complex specifications, enable LLM fallback:

```bash
npx aisp-converter full --llm "Complex specification with edge cases and error handling"
```

The LLM will:
1. Parse semantic structure
2. Identify types, rules, and functions
3. Generate appropriate blocks
4. Validate and optimize density

---

## Quality Tier Targets

| Tier | Density | Typical Use |
|------|---------|-------------|
| ◊⁺⁺ Platinum | δ ≥ 0.75 | Production-ready, CI/CD enforced |
| ◊⁺ Gold | δ ≥ 0.60 | High-quality specs |
| ◊ Silver | δ ≥ 0.40 | Working drafts |

**Tip:** To achieve Platinum, ensure:
- All 5 required blocks present (Ω, Σ, Γ, Λ, Ε)
- High semantic operator density (≜, ≔, ∀, ∃, λ, ⇒)
- Meaningful rules and type definitions

---

**[Minimal Tier Examples →](minimal-tier.md)** | **[Standard Tier Examples →](standard-tier.md)** | **[Back to Examples →](README.md)**
