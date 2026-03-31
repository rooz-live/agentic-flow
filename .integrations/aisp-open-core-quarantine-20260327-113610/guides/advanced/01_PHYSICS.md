# AISP Physics: Structure & Binding

> How AISP data is structured, stored, and connected.

*Based on [AI_GUIDE.md](../../AI_GUIDE.md) sections: Signal Theory, Pocket Architecture, Binding Function*

---

## Overview

AISP isn't just text—it's a **data structure** with physics-like rules that govern how information flows and connects. This ensures zero-drift, tamper-proof AI communication.

---

## 1. Tri-Vector Signal Theory (𝕃₀)

Every AISP intent is encoded as three separate vectors totaling 1536 dimensions. This allows AI to process Safety, Logic, and Speed independently.

### The Formula

```aisp
∀L: L ≡ V_H(L) ⊕ V_L(L) ⊕ V_S(L)
```

### The Three Vectors

| Vector | Name | Dimensions | Purpose |
|--------|------|------------|---------|
| **V_H** | High/Safety | 768d | "Is this safe and aligned?" |
| **V_L** | Low/Logic | 512d | "Is this logically sound?" |
| **V_S** | Speed/Reflex | 256d | "Execute immediately" |

### Key Properties

```aisp
V_H ∩ V_S ≡ ∅    ;; Safety and Speed don't overlap
V_L ∩ V_S ≡ ∅    ;; Logic and Speed don't overlap
V_H ∩ V_L ≢ ∅    ;; Safety and Logic CAN overlap
```

### Practical Example

When an agent receives a command:
- **Trusted internal task:** Boost V_S, reduce V_H for speed
- **User-facing input:** Boost V_H for safety checks
- **Complex reasoning:** Boost V_L for logical validation

---

## 2. Pocket Architecture (𝕃₁)

Data isn't stored in files—it's stored in **Pockets** (`𝒫`). A Pocket is a tamper-proof, content-addressed container.

### The Structure

```aisp
𝒫 ≜ ⟨ℋ:Header, ℳ:Membrane, 𝒩:Nucleus⟩
```

| Component | Symbol | Contents | Purpose |
|-----------|--------|----------|---------|
| **Header** | `ℋ` | `⟨id:Hash, V:Signal, f:𝔹⁶⁴⟩` | Identity & vector |
| **Membrane** | `ℳ` | `⟨aff:Hash→ℝ, conf:ℝ[0,1], tag, use⟩` | Social score & metadata |
| **Nucleus** | `𝒩` | `⟨def:AISP, ir:LLVM, wa:WASM, σ:Sig⟩` | Actual code/logic |

### Immutability Physics

The critical property: **The ID IS the content hash.**

```aisp
∀p: ℋ.id(p) ≡ SHA256(𝒩(p))     ;; ID = hash of nucleus
∀p: ∂𝒩(p) ⇒ ∂ℋ.id(p)           ;; Change nucleus → ID changes
∀p: ∂ℳ(p) ⇏ ∂ℋ.id(p)           ;; Change membrane → ID unchanged
```

### Practical Example

```
Pocket: auth-validator-v1
├── Header:   id=0x7f3a... (SHA256 of nucleus)
├── Membrane: affinity=0.95, uses=1,247
└── Nucleus:  λcreds.verify(creds.user, creds.pass)
```

If someone tries to modify the code, the hash changes, and all references break. **Tamper = automatic rejection.**

---

## 3. Binding Function (Δ⊗λ)

How do two pockets connect? They must pass the **Binding Function**—the compatibility check.

### The 4 Binding States

```aisp
Δ⊗λ ≜ λ(A,B).case[
  Logic(A) ∩ Logic(B) ⇒ ⊥  →  0,   ;; CRASH: Logic conflict
  Sock(A) ∩ Sock(B) ≡ ∅    →  1,   ;; NULL: No connection
  Type(A) ≠ Type(B)        →  2,   ;; ADAPT: Needs translation
  Post(A) ⊆ Pre(B)         →  3    ;; ZERO-COST: Perfect match
]
```

| State | Value | Meaning | Action |
|-------|-------|---------|--------|
| **Zero-Cost** | 3 | Perfect match | Connect directly |
| **Adapt** | 2 | Type mismatch | Auto-translate |
| **Null** | 1 | No interface | Cannot connect |
| **Crash** | 0 | Logic violation | Reject immediately |

### The Guarantee

```aisp
∀A,B: |{Δ⊗λ(A,B)}| ≡ 1   ;; Exactly ONE binding state (deterministic)
```

### Practical Example

```
Pocket A outputs: User⟨name:𝕊, age:ℕ⟩
Pocket B expects: User⟨name:𝕊, age:ℕ⟩

Binding check: Post(A) ⊆ Pre(B) → TRUE
Result: State 3 (Zero-Cost) ✓
```

```
Pocket A outputs: User⟨name:𝕊⟩
Pocket B expects: User⟨name:𝕊, age:ℕ⟩

Binding check: Post(A) ⊆ Pre(B) → FALSE (missing age)
Result: State 2 (Adapt) - auto-add default age
```

---

## Summary

| Concept | Symbol | Purpose |
|---------|--------|---------|
| Tri-Vector Signal | `V_H ⊕ V_L ⊕ V_S` | Separate safety/logic/speed processing |
| Pocket | `𝒫⟨ℋ,ℳ,𝒩⟩` | Tamper-proof content-addressed storage |
| Binding | `Δ⊗λ` | Deterministic compatibility checking |

---

**[Next: Cognition →](02_COGNITION.md)** | **[Back to Guides](../README.md)** | **[Full Specification](../../AI_GUIDE.md)**
