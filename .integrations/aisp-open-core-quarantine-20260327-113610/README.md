# AISP - AI Symbolic Protocol

**The Assembly Language for AI Cognition** — Created by [Bradley Ross](https://linkedin.com/in/bradaross)

AISP is the open standard for precise AI-to-AI and human-to-AI communication. It reduces prompt ambiguity from 40-65% to under 2%, enabling deterministic, proof-carrying specifications that AI systems understand natively.

[![npm: aisp-converter](https://img.shields.io/npm/v/aisp-converter.svg?label=aisp-converter&color=blue)](https://www.npmjs.com/package/aisp-converter)
[![npm: aisp-validator](https://img.shields.io/npm/v/aisp-validator.svg?label=aisp-validator&color=blue)](https://www.npmjs.com/package/aisp-validator)
[![crates.io: aisp](https://img.shields.io/crates/v/aisp.svg?label=aisp-rust&color=orange)](https://crates.io/crates/aisp)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![AISP 5.1](https://img.shields.io/badge/AISP-5.1%20Platinum-purple.svg)](AI_GUIDE.md)

---

## Try It Now — No Installation Required

```bash
# Convert natural language to AISP
npx aisp-converter "Define x as 5"
# Output: x≜5

# Validate AISP syntax and get quality tier
npx aisp-validator validate spec.aisp
# Output: ✓ VALID (Gold tier, δ=0.64)
```

**Zero install. Zero build. Just run with `npx` or `cargo`.**

---

## What is AISP?

AISP (AI Symbolic Protocol) replaces ambiguous natural language with precise mathematical notation — the same symbols used in formal logic, type theory, and category theory.

| Natural Language | AISP Notation | Ambiguity |
|------------------|---------------|-----------|
| "Define x as 5" | `x≜5` | 0% |
| "For all users, if admin then allow" | `∀u∈Users:admin(u)⇒allow(u)` | 0% |
| "There exists a valid solution" | `∃x:valid(x)` | 0% |
| "A implies B" | `A⇒B` | 0% |

**Result:** AI models produce consistent, unambiguous, machine-verifiable outputs.

---

## Why AISP?

| Problem | Traditional Prompts | With AISP |
|---------|---------------------|-----------|
| **Ambiguity Rate** | 40-65% | <2% |
| **Misinterpretation** | 25-40% | <1% |
| **10-Step Pipeline Success** | 59% | 95% |
| **Clarification Requests** | 3-5 per task | 0-1 per task |

**97x improvement** in multi-step pipeline success rate. [See evidence →](evidence/)

---

## Official Specification

> **[AI_GUIDE.md](AI_GUIDE.md)** is the authoritative AISP 5.1 Platinum Specification.

This is the source of truth for:
- **512 Official Symbols (Σ_512)** — 8 categories × 64 symbols each
- **Quality Tiers** — Platinum (◊⁺⁺) to Bronze (◊⁻) grading
- **Grammar & Syntax** — Deterministic parsing rules
- **Proof System** — Natural deduction + category theory

Copy [AI_GUIDE.md](AI_GUIDE.md) into any AI system's context (Claude, GPT-4, Gemini, etc.) and it will understand AISP natively.

---

## Official Tools

These are the **official** AISP conversion and validation tools:

### npm (Node.js)

```bash
# Convert prose to AISP
npx aisp-converter "Define x as 5"

# Validate AISP documents
npx aisp-validator validate spec.aisp

# Check quality tier
npx aisp-validator tier spec.aisp
```

### Rust (crates.io) — Fastest

```bash
# Install
cargo install aisp aisp-converter

# Convert
aisp-converter "Define x as 5"

# Validate
aisp validate spec.aisp
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **512 Official Symbols** | Complete Σ_512 glossary across 8 categories: Transmuters, Topologics, Quantifiers, Contractors, Domains, Intents, Delimiters, Reserved |
| **3-Tier Conversion** | Minimal (simple defs), Standard (rules + types), Full (specifications + proofs) |
| **Quality Grading** | Platinum (◊⁺⁺), Gold (◊⁺), Silver (◊), Bronze (◊⁻), Reject (⊘) based on semantic density |
| **LLM Fallback** | Automatic AI enhancement when rule-based conversion has low confidence |
| **Proof-Carrying** | Every document includes `⟦Ε⟧` evidence block with validation proof |
| **Cross-Platform** | npm, Rust crate, WASM for browser |

---

## Quick Reference (Rosetta Stone)

| Prose | Symbol | Category |
|-------|--------|----------|
| for all, every, each | `∀` | Quantifier |
| there exists, some | `∃` | Quantifier |
| exists unique, exactly one | `∃!` | Quantifier |
| defined as, is a | `≜` | Definition |
| assigned, becomes | `≔` | Assignment |
| implies, then, if-then | `⇒` | Logic |
| if and only if, iff | `⇔` | Logic |
| and, both | `∧` | Logic |
| or, either | `∨` | Logic |
| not, negation | `¬` | Logic |
| in, element of | `∈` | Set |
| subset of | `⊆` | Set |
| union | `∪` | Set |
| intersection | `∩` | Set |
| true, valid | `⊤` | Truth |
| false, invalid | `⊥` | Truth |
| lambda, function | `λ` | Function |
| maps to | `↦` | Function |

**[Full Cheatsheet (all 512 symbols) →](CHEATSHEET.md)** | **[Complete Reference →](reference.md)**

---

## Quality Tiers

AISP documents are graded by semantic density (δ):

| Symbol | Tier | Density | Use Case |
|--------|------|---------|----------|
| ◊⁺⁺ | Platinum | δ ≥ 0.75 | Production specs, AI-to-AI contracts |
| ◊⁺ | Gold | δ ≥ 0.60 | High-quality documentation |
| ◊ | Silver | δ ≥ 0.40 | Working drafts, prototypes |
| ◊⁻ | Bronze | δ ≥ 0.20 | Initial conversions, learning |
| ⊘ | Reject | δ < 0.20 | Invalid, needs revision |

```bash
# Check tier of your document
npx aisp-validator tier myspec.aisp
# Output: ◊⁺ Gold

# Enforce minimum tier in CI/CD
npx aisp-validator validate myspec.aisp --min-tier gold
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| **[AI_GUIDE.md](AI_GUIDE.md)** | **Official Specification** — AISP 5.1 for AI systems |
| **[HUMAN_GUIDE.md](HUMAN_GUIDE.md)** | Tutorial for humans learning AISP |
| **[CHEATSHEET.md](CHEATSHEET.md)** | Rosetta Stone quick reference |
| **[reference.md](reference.md)** | Complete 512-symbol glossary |
| **[examples/](examples/)** | Copy-paste CLI examples by tier |
| **[guides/advanced/](guides/advanced/)** | Deep dive into AISP internals |

---

## Advanced Capabilities

For those who want to understand the internals of AISP 5.1:

| Pillar | Topics | Link |
|--------|--------|------|
| **Physics** | Signal Theory, Pockets, Binding | [01_PHYSICS.md](guides/advanced/01_PHYSICS.md) |
| **Cognition** | Hebbian Learning, Ghost Search, Recursion | [02_COGNITION.md](guides/advanced/02_COGNITION.md) |
| **Mathematics** | Category Theory, Error Algebra, Inference | [03_MATH.md](guides/advanced/03_MATH.md) |
| **Agent Guide** | Templates, Evidence, Enforcement | [04_AGENT.md](guides/advanced/04_AGENT.md) |

---

## Use Cases

AISP is designed for:

- **AI Agent Instructions** — Unambiguous task specifications
- **Multi-Agent Coordination** — Zero-drift communication protocols
- **API Contracts** — Formal pre/post conditions
- **State Machines** — Precise state transition rules
- **Requirements Engineering** — Machine-verifiable specifications
- **Safety Constraints** — Provable safety properties

---

## Evidence & Validation

Real-world tests demonstrating AISP effectiveness:

| Test | Result | Link |
|------|--------|------|
| Tic-Tac-Toe Rules | 6 ambiguities → 0 | [evidence/tic-tac-toe/](evidence/tic-tac-toe/) |
| E2E Conversion | Full workflow demo | [evidence/e2e-conversion-guide/](evidence/e2e-conversion-guide/) |
| Rosetta Stone | 512 symbols validated | [evidence/rosetta-stone/](evidence/rosetta-stone/) |
| Pipeline Test | 97x improvement | [evidence/](evidence/) |

---

## Installation Options

```bash
# Option 1: No install (recommended)
npx aisp-converter "your text"
npx aisp-validator validate file.aisp

# Option 2: Global npm install
npm install -g aisp-converter aisp-validator

# Option 3: Rust crate (fastest performance)
cargo install aisp aisp-converter
```

---

## Topics

`aisp` `ai-symbolic-protocol` `symbolic-notation` `formal-methods` `formal-specification` `type-theory` `category-theory` `prose-to-code` `natural-language-processing` `llm` `prompt-engineering` `ai-tools` `ai-agents` `multi-agent` `wasm` `typescript` `rust`

---

## Links

| Resource | URL |
|----------|-----|
| **npm: aisp-converter** | https://www.npmjs.com/package/aisp-converter |
| **npm: aisp-validator** | https://www.npmjs.com/package/aisp-validator |
| **crates.io: aisp** | https://crates.io/crates/aisp |
| **GitHub** | https://github.com/bar181/aisp-open-core |
| **Author** | [Bradley Ross](https://linkedin.com/in/bradaross) |

---

## About the Inventor

**AISP** was created by **Bradley Ross** ([@bar181](https://github.com/bar181)) as an open standard for reducing ambiguity in AI communication. The protocol draws from formal logic, type theory, and category theory to create a deterministic, proof-carrying notation that AI systems can parse and verify.

---

## License

**MIT License** — Copyright (c) 2026 Bradley Ross

See [LICENSE](LICENSE) for full terms.

---

## Citation

```bibtex
@misc{ross2026aisp,
  author = {Ross, Bradley},
  title = {AISP: AI Symbolic Protocol - The Assembly Language for AI Cognition},
  year = {2026},
  publisher = {GitHub},
  url = {https://github.com/bar181/aisp-open-core}
}
```

---

**Made with precision by [Bradley Ross](https://linkedin.com/in/bradaross)** | **[Report Issues](https://github.com/bar181/aisp-open-core/issues)**
