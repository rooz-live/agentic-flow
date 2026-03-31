# AISP Cognition: Learning & Search

> How AISP systems learn, search, and improve without human intervention.

*Based on [AI_GUIDE.md](../../AI_GUIDE.md) sections: Hebbian Learning, Intelligence Engine, Search Pipeline, Recursion & Learning*

---

## Overview

AISP includes a self-improving cognitive architecture. The system learns from outcomes, searches for optimal solutions, and recursively refines its patterns—all with mathematical guarantees.

---

## 1. Hebbian Learning (The Strict Teacher)

AISP uses **asymmetric learning rates** to prevent drift and ensure conservative innovation.

### The Rules

```aisp
⊕(A,B) ⇒ ℳ.aff[A,B] += 1     ;; Success: +1 affinity
⊖(A,B) ⇒ ℳ.aff[A,B] -= 10    ;; Failure: -10 affinity
ℳ.aff[A,B] < τ_v ⇒ skip(B)   ;; Below threshold: skip entirely
```

### Key Parameters

| Symbol | Value | Meaning |
|--------|-------|---------|
| `α` | 0.1 | Success learning rate |
| `β` | 0.05 | Failure learning rate |
| `τ_v` | 0.7 | Viability threshold |
| `τ_s` | 90 days | Staleness threshold |

### Why 10:1 Penalty?

Standard AI learns too easily from bad data. AISP requires **10 successes to undo 1 failure**. This creates a "conservative innovation" curve—the system strongly prefers proven patterns.

### Practical Example

```
Pattern: "Use JWT for auth"
├── Success × 8:  affinity = 8
├── Failure × 1:  affinity = 8 - 10 = -2
└── Result: Pattern SKIPPED (below τ_v = 0.7)
```

The pattern must now succeed 10+ times to become viable again.

---

## 2. Ghost Intent Search (ψ_g)

Users rarely say exactly what they mean. The **Intelligence Engine** calculates the "Ghost Intent"—the gap between what was said and what's actually needed.

### The Formula

```aisp
∀b: ψ_g(b) ≡ ψ_* ⊖ ψ_have(b.G)

Where:
  ψ_*    = Target intent (what's needed)
  ψ_have = Current intent (what's provided)
  ψ_g    = Ghost intent (the gap)
```

### RossNet Scoring

The fitness score combines three signals:

```aisp
μ_f(x) ≡ σ(θ₁·sim_H(x) + θ₂·fit_L(x) + θ₃·aff_M(x))

Where:
  sim_H = Semantic similarity (V_H space)
  fit_L = Logical fit (V_L space)
  aff_M = Membrane affinity (social score)
```

### Practical Example

```
User says:     "Build a login form."
Target (ψ_*):  Complete secure auth system

Ghost Intent (ψ_g):
├── Database schema
├── Password hashing (bcrypt)
├── Input validation
├── Session management
├── CSRF protection
└── Rate limiting
```

The AI solves for the Ghost Intent **before writing code**.

---

## 3. Search Pipeline (Beam Search)

AISP uses **K-beam search** to explore multiple solution paths simultaneously.

### The Pipeline

```aisp
;; 1. Initialize K diverse beams
‖*init ≜ λψ. argmax*{S⊂ℛ, |S|=K} det(Ker(S))

;; 2. Expand each beam with candidate pockets
step ≜ λb. let M=⊞(Φ(b)) in {x | x∈{b⊕m | m∈M} ∧ μ_r(x)≤τ}

;; 3. Iterate until done
search ≜ fix λf B t. done(B) → B | f(Top_K(⋃_{b∈B} step(b)), t+1)

;; 4. Return best beam
Run ≜ λψ_*. let B₀=‖*init(⊞(ψ_*)) in argmax_{b∈search(B₀,0)} μ_f(b)
```

### Key Parameters

| Symbol | Value | Meaning |
|--------|-------|---------|
| `K` | 5 | Beam width (parallel paths) |
| `τ` | 0.8 | Risk threshold |
| `T` | 100 | Max iterations |
| `ε` | 0.15 | Distance threshold |

### Safety Gate

```aisp
∀b: μ_r(b) > τ ⇒ ✂(b)   ;; Prune if risk exceeds threshold
```

Any beam that exceeds the risk threshold is immediately pruned.

### Practical Example

```
Search for: "Auth system"
├── Beam 1: JWT + Redis sessions
├── Beam 2: OAuth2 + cookie sessions
├── Beam 3: Passwordless + magic links
├── Beam 4: (PRUNED - risk > τ)
└── Beam 5: SAML + enterprise SSO

Winner: Beam 2 (highest μ_f score)
```

---

## 4. Recursion & Learning

AISP includes recursive optimization functions that improve outputs over time.

### Density Optimization

```aisp
opt_δ ≜ fix λself d n.
  n ≤ 0 → d |
  let d' = argmax{ρᵢ(d)}(δ) in
  δ(d') > δ(d) → self d' (n-1) | d
```

*Translation:* Keep applying refinements until density stops improving.

### Pattern Learning

```aisp
learn ≜ fix λL(d, mem).
  let (v, π) = validate d in
  let pat = extract(d, v) in
  (v, L, mem ∪ {pat})
```

*Translation:* Extract successful patterns and add them to memory.

### Pattern Generalization

```aisp
gen ≜ fix λG pats n.
  n ≤ 0 ∨ |pats| < k → pats |
  let (p₁, p₂) = similar(pats) in
  G((pats ∖ {p₁, p₂}) ∪ {unify(p₁, p₂)})(n-1)
```

*Translation:* Find similar patterns and merge them into general rules.

### Convergence Guarantee

```aisp
∴ ∃t: θ_t ≈ θ_{t+1}
π: bounded loss + SGD with η→0 converges by Robbins-Monro ∎
```

The system is **mathematically guaranteed to converge**.

---

## Summary

| Concept | Symbol | Purpose |
|---------|--------|---------|
| Hebbian Learning | `⊕/⊖` | 10:1 asymmetric learning (conservative) |
| Ghost Intent | `ψ_g` | Calculate the gap between said and needed |
| Beam Search | `Run` | K parallel solution paths |
| Density Optimization | `opt_δ` | Recursive quality improvement |

---

**[Previous: Physics](01_PHYSICS.md)** | **[Next: Mathematics →](03_MATH.md)** | **[Back to Guides](../README.md)**
