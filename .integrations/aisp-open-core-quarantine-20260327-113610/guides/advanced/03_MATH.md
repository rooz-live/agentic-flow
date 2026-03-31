# AISP Mathematics: Proofs & Safety

> Why AISP is mathematically guaranteed to be crash-proof and consistent.

*Based on [AI_GUIDE.md](../../AI_GUIDE.md) sections: Category Theory, Error Algebra, Inference Rules, Theorems*

---

## Overview

AISP is built on **Category Theory** and **Natural Deduction**—treating code as mathematical proofs. This provides formal guarantees that are impossible with traditional programming.

---

## 1. Category Theory Foundation

AISP operates across 4 mathematical categories, with functors that preserve structure between them.

### The 4 Categories

```aisp
𝐁𝐥𝐤 ≜ ⟨Ob≜𝔅, Hom≜λAB.A→B, ∘, id⟩    ;; Code blocks
𝐕𝐚𝐥 ≜ ⟨Ob≜𝕍, Hom≜λVW.V⊑W, ∘, id⟩    ;; Validation logic
𝐏𝐤𝐭 ≜ ⟨Ob≜𝒫, Hom≜λPQ.bind(P,Q), ∘, id⟩  ;; Pocket storage
𝐒𝐢𝐠 ≜ ⟨Ob≜Signal, Hom≜λST.S→T, ∘, id⟩   ;; Vector signals
```

### The Functors

```aisp
𝔽: 𝐁𝐥𝐤 ⇒ 𝐕𝐚𝐥    ;; Blocks → Validation
  𝔽.ob ≜ λb. validate(b)
  𝔽.mor ≜ λf. 𝔽(cod f) ⊒ 𝔽(dom f)

𝔾: 𝐏𝐤𝐭 ⇒ 𝐒𝐢𝐠    ;; Pockets → Signals
  𝔾.ob ≜ λp. p.ℋ.V
  𝔾.mor ≜ λf. 𝔾(cod f) ∼ 𝔾(dom f)
```

### The Composition Theorem

```aisp
∴ 𝔽(g ∘ f) = 𝔽(g) ∘ 𝔽(f)
```

**Translation:** If Component A validates, and Component B validates, combining them (A∘B) is **mathematically guaranteed** to validate.

### Practical Example

```
Block A: User login validator     → validates ✓
Block B: Session manager          → validates ✓
Block A∘B: Login + session combo  → GUARANTEED to validate ✓
```

---

## 2. Error Algebra (The Safety Net)

In most languages, errors crash the program. In AISP, **errors are valid data types** with defined recovery paths.

### Error Type Definition

```aisp
ε ≜ Σ(ψ:𝔻oc→𝔹)(ρ:Πd:𝔻oc.ψ(d)=⊤→𝔻oc)
```

*Translation:* An error is a pair of (predicate, recovery function).

### The 11 Error Types

| Error | Trigger | Recovery |
|-------|---------|----------|
| `ε_parse` | Parse failure | Reject |
| `ε_ambig` | Ambiguity ≥ 2% | Reject |
| `ε_token` | Unknown token | Register or reject |
| `ε_H` | Missing header | Add header |
| `ε_C` | Bad comment format | Fix comment |
| `ε_E` | Bad evidence format | Fix evidence |
| `ε_dist` | Vector too distant | Skip |
| `ε_veto` | Affinity too low | Veto |
| `ε_sig` | Signature invalid | Quarantine |
| `ε_dead` | No search results | Bridge |
| `ε_risk` | Risk exceeded | Adjust threshold |

### Auto-Recovery Pipeline

```aisp
ρ*: 𝔻oc → 𝔻oc
ρ* ≜ foldl(>=>)(pure){ρᵢ | ψᵢ = ⊤}
```

*Translation:* Chain all applicable recovery functions automatically.

### Practical Example

```aisp
Input document has:
├── ε_H (missing header)  → Recovery: Add 𝔸1.0.doc@date
├── ε_E (bad evidence)    → Recovery: Fix to ⟨δ;φ;τ⟩
└── Result: Valid document (auto-repaired)
```

---

## 3. Inference Rules (The Logic Gates)

These rules decide if code is Platinum, Gold, Silver, Bronze, or Reject.

### Tier Introduction Rules

```aisp
;; Platinum Introduction
⊢ wf(d)   δ(d) ≥ ¾
─────────────────────   [◊⁺⁺-I]
      ⊢ d:◊⁺⁺

;; Gold Introduction
⊢ wf(d)   ⅗ ≤ δ(d) < ¾
─────────────────────────   [◊⁺-I]
        ⊢ d:◊⁺

;; Silver Introduction
⊢ wf(d)   ⅖ ≤ δ(d) < ⅗
─────────────────────────   [◊-I]
        ⊢ d:◊

;; Bronze Introduction
⊢ wf(d)   ⅕ ≤ δ(d) < ⅖
─────────────────────────   [◊⁻-I]
        ⊢ d:◊⁻

;; Reject
δ(d) < ⅕ ∨ ¬wf(d)
─────────────────────   [⊘-I]
      ⊢ d:⊘
```

### Well-Formedness Rules

```aisp
;; Header check
d↓₁ ≡ 𝔸 ⊢ wf₁(d)   ;; First token must be 𝔸

;; Block check
|b⃗| ≥ 2 ⊢ wf₂(d)    ;; At least 2 blocks required

;; Combined
wf₁(d)   wf₂(d)
───────────────────   [∧I-wf]
     ⊢ wf(d)
```

### Practical Example

```
Document: spec.aisp
├── Check wf₁: Header = 𝔸5.1.spec@2026-01-26 ✓
├── Check wf₂: Blocks = 5 (Ω,Σ,Γ,Λ,Ε) ✓
├── Check δ:   Density = 0.78 ≥ 0.75
└── Apply [◊⁺⁺-I]: Document is PLATINUM ✓
```

---

## 4. Key Theorems (The Guarantees)

AISP proves 14+ theorems that guarantee system behavior.

### T1: Signal Losslessness

```aisp
∴ ∀L: Signal(L) ≡ L
π: V_H ⊕ V_L ⊕ V_S preserves; direct sum lossless ∎
```

*Guarantee:* No information is lost in signal encoding.

### T2: Binding Determinism

```aisp
∴ ∀A,B: |{Δ⊗λ(A,B)}| ≡ 1
π: cases exhaustive ∧ disjoint; exactly one ∎
```

*Guarantee:* Binding always produces exactly one result.

### T3: Tamper Detection

```aisp
∴ ∀p: tamper(𝒩) ⇒ SHA256(𝒩) ≠ ℋ.id ⇒ ¬reach(p)
π: CAS addressing; content-hash mismatch blocks ∎
```

*Guarantee:* Tampered pockets are automatically rejected.

### T4: Search Termination

```aisp
∴ ∀ψ_*. ∃t:ℕ. search terminates at t
π: |Φ(B_t)| < |Φ(B_{t-1})| ∨ t=T; ghost shrinks ∨ timeout ∎
```

*Guarantee:* Search always terminates.

### T5: Tier Total Order

```aisp
∴ ∀τ₁,τ₂ ∈ ◊. τ₁ ≤ τ₂ ∨ τ₂ ≤ τ₁
π: ◊ defined as total order ⊘ < ◊⁻ < ◊ < ◊⁺ < ◊⁺⁺ ∎
```

*Guarantee:* Quality tiers are always comparable.

---

## Summary

| Concept | Symbol | Guarantee |
|---------|--------|-----------|
| Category Theory | `𝔽`, `𝔾` | Composition preserves validity |
| Error Algebra | `ε`, `ρ*` | Errors are recoverable, not crashes |
| Inference Rules | `[◊⁺⁺-I]` | Tier assignment is deterministic |
| Theorems | `∴...∎` | Mathematical proofs of behavior |

---

**[Previous: Cognition](02_COGNITION.md)** | **[Next: Agent Guide →](04_AGENT.md)** | **[Back to Guides](../README.md)**
