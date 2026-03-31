# AISP Agent Guide: Implementation & Templates

> How AI agents should implement and enforce AISP in production.

*Based on [AI_GUIDE.md](../../AI_GUIDE.md) sections: Agent Guide, Templates, Evidence, Grammar*

---

## Overview

The Agent Guide defines **enforcement rules** for AI systems implementing AISP. It ensures consistent behavior across all AISP-compliant agents.

---

## 1. Agent Enforcement Rules

### Core Requirements

```aisp
∀agent: task ∈ {spec, instruct, coordinate} ⇒ output(AISP)
∀response: Ambig(response) < 0.02 ∧ δ ≥ 0.40
prose_only ∧ task(spec) ⇒ reject ∧ request(AISP)
```

**Translation:**
- Specification/instruction/coordination tasks → MUST output AISP
- All responses → MUST have <2% ambiguity AND ≥40% density
- Prose-only spec requests → REJECT and request AISP format

### Output Structure

```aisp
Output ≜ 𝔸 ∘ γ ∘ ⟦Ω⟧ ∘ ⟦Σ⟧ ∘ ⟦Γ⟧ ∘ ⟦Λ⟧ ∘ ⟦Ε⟧
```

Every agent output must include:
1. Header (`𝔸`)
2. Context (`γ`)
3. All required blocks (Ω, Σ, Γ, Λ, Ε)

---

## 2. Anti-Drift Rules

Drift is the #1 enemy of AI coordination. AISP enforces strict anti-drift policies.

### The Rules

```aisp
∀s ∈ Σ_512: Mean(s) ≡ Mean_0(s)         ;; Symbols never change meaning
∀D: Ambig(D) < 0.02                      ;; Always below 2% ambiguity
∀bind: Δ⊗λ ∈ {0,1,2,3}                   ;; Binding is deterministic
¬(prose ≈ AISP)                          ;; Prose is NOT equivalent to AISP
¬(∃s: Mean(s,ctx1) ≠ Mean(s,ctx2))       ;; No context-dependent meanings
```

### Drift Detection & Recovery

```aisp
drift_detected ⇒ reparse(original)       ;; Re-parse from source
ambiguity_detected ⇒ reject ∧ clarify    ;; Reject and ask for clarity
```

### Practical Example

```
Agent A: ∀u∈Users:admin(u)⇒allow(u)
Agent B receives: "For all users, if admin then allow"

Problem: Agent B has DRIFTED from formal to prose
Action:  REJECT → Request AISP format
Result:  Zero-drift coordination maintained
```

---

## 3. Document Templates

AISP provides two standard templates: Minimal and Full.

### Minimal Template

For simple specifications with basic requirements:

```aisp
𝔸1.0.[name]@YYYY-MM-DD
γ≔[context]

⟦Ω⟧{
  ;; Invariants
  inv
}

⟦Σ⟧{
  ;; Type definitions
  types
}

⟦Γ⟧{
  ;; Business rules
  rules
}

⟦Λ⟧{
  ;; Functions
  funcs
}

⟦Ε⟧⟨δ≜N; φ≜N; τ≜◊X⟩
```

### Full Template

For complete specifications with proofs and claims:

```aisp
𝔸X.Y.[name]@YYYY-MM-DD
γ≔[domain]
ρ≔⟨[tags]⟩
⊢[claims]

⟦Ω:Meta⟧{
  ∀D: C
}

⟦Σ:Types⟧{
  T ≜ def
}

⟦Γ:Rules⟧{
  ∀x: P ⇒ Q
}

⟦Λ:Funcs⟧{
  f ≜ λx.b
}

⟦Χ:Errors⟧{
  c ⇒ r
}

⟦Ε⟧⟨δ; φ; τ; ⊢⟩
```

### Block Requirements

| Block | Symbol | Required? | Purpose |
|-------|--------|-----------|---------|
| Meta | `⟦Ω⟧` | Yes | Document invariants |
| Types | `⟦Σ⟧` | Yes | Type definitions |
| Rules | `⟦Γ⟧` | Yes | Business rules |
| Functions | `⟦Λ⟧` | Yes | Function definitions |
| Errors | `⟦Χ⟧` | No | Error handling |
| Evidence | `⟦Ε⟧` | Yes | Validation proof |

---

## 4. Evidence Block

Every AISP document must include self-validating evidence.

### Evidence Structure

```aisp
⟦Ε⟧⟨
  δ ≜ [density]          ;; Semantic density (0.0-1.0)
  φ ≜ [completeness]     ;; Completeness score (0-100)
  τ ≜ [tier]             ;; Quality tier (◊⁺⁺, ◊⁺, ◊, ◊⁻, ⊘)
  ⊢ [proofs]             ;; Proof claims (optional)
⟩
```

### Example Evidence

```aisp
⟦Ε⟧⟨
  δ ≜ 0.81
  |𝔅| ≜ 18/18
  φ ≜ 98
  τ ≜ ◊⁺⁺
  ⊢ ND                   ;; Uses Natural Deduction
  ⊢ CAT: 𝔽,𝔾,η,ζ,ε⊣ρ    ;; Category Theory elements
  ⊢ Ambig < 0.02         ;; Ambiguity guarantee
⟩
```

---

## 5. Use Cases

AISP is designed for these specific applications:

```aisp
UC ≜ {
  AgentInstr,        ;; AI Agent Instructions
  MultiAgentCoord,   ;; Multi-Agent Coordination
  APIContracts,      ;; API Specifications
  StateMachines,     ;; State Machine Rules
  Requirements,      ;; Requirements Engineering
  FlywheelLearn,     ;; Self-Improving Learning
  SafetyConstraints, ;; Safety-Critical Rules
  DocValidation      ;; Document Validation
}
```

### Target Metrics

```aisp
Target ≜ {
  Ambig:    < 0.02,   ;; Under 2% ambiguity
  δ:        ≥ 0.40,   ;; Minimum Silver tier
  AgentAcc: ↑ 30%,    ;; 30% accuracy improvement
  CoordErr: ↓ 80%     ;; 80% coordination error reduction
}
```

---

## 6. North Star Vision

The ultimate goal of AISP:

```aisp
Vision ≜ "AISP: Assembly for AI cognition"

∀prose: Ambig ∈ [0.40, 0.65]   ;; Prose is 40-65% ambiguous
∀code:  Ambig ∈ [0.05, 0.15]   ;; Code is 5-15% ambiguous
∀AISP:  Ambig < 0.02            ;; AISP is <2% ambiguous

⊢ deterministic:    ∀D: ∃!AST. parse(D) → AST
⊢ proof-carrying:   𝔻oc ≜ Σ(content)(π: Γ⊢wf)
⊢ lossless:         ∀L: Signal(L) ≡ L
⊢ self-certifying:  ⟦Ε⟧ ∈ every(D)
```

---

## Quick Reference Card

### Validation Command

```bash
npx aisp-validator validate myspec.aisp --min-tier gold
```

### Agent Checklist

- [ ] Output includes AISP header (`𝔸`)
- [ ] All 5 required blocks present
- [ ] Ambiguity < 2%
- [ ] Density ≥ 40% (Silver minimum)
- [ ] Evidence block included
- [ ] No prose in formal sections

---

**[Previous: Mathematics](03_MATH.md)** | **[Back to Guides](../README.md)** | **[Full Specification](../../AI_GUIDE.md)**
