# AISP Guides

> Complete documentation for learning and implementing AISP.

---

## Getting Started

| Guide | Description | Time |
|-------|-------------|------|
| **[Human Guide](../HUMAN_GUIDE.md)** | Tutorial for humans learning AISP | 15 min |
| **[Cheatsheet](../CHEATSHEET.md)** | 512 symbol Rosetta Stone | 5 min |
| **[Examples](../examples/)** | Copy-paste CLI examples | 10 min |

---

## Quick Start

```bash
# Convert prose to AISP (no installation required)
npx aisp-converter "Define x as 5"
# Output: x≜5

# Validate AISP syntax
npx aisp-validator validate spec.aisp
# Output: ✓ VALID (Gold tier)
```

---

## Examples by Tier

| Tier | Complexity | Use Case | Link |
|------|------------|----------|------|
| **Minimal** | Simple | Definitions, math | [minimal-tier.md](../examples/minimal-tier.md) |
| **Standard** | Balanced | Rules, types, logic | [standard-tier.md](../examples/standard-tier.md) |
| **Full** | Complete | Specifications + proofs | [full-tier.md](../examples/full-tier.md) |

---

## Advanced Capabilities

Deep dive into the AISP 5.1 specification internals from [AI_GUIDE.md](../AI_GUIDE.md):

| Pillar | Topics | Purpose |
|--------|--------|---------|
| **[Physics](advanced/01_PHYSICS.md)** | Signal Theory, Pockets, Binding | How data is structured |
| **[Cognition](advanced/02_COGNITION.md)** | Hebbian Learning, Ghost Search | How the system learns |
| **[Mathematics](advanced/03_MATH.md)** | Category Theory, Error Algebra | Why it's crash-proof |
| **[Agent Guide](advanced/04_AGENT.md)** | Templates, Evidence, Enforcement | How to implement |

**[View All Advanced Guides →](advanced/)**

---

## Documentation Map

```
AISP Documentation
├── README.md                    # Main landing page
├── AI_GUIDE.md                  # Official Specification (Source of Truth)
├── HUMAN_GUIDE.md               # Tutorial for humans
├── CHEATSHEET.md                # 512 symbol quick reference
├── reference.md                 # Complete symbol glossary
│
├── examples/
│   ├── README.md                # Examples overview
│   ├── minimal-tier.md          # Simple conversions
│   ├── standard-tier.md         # Rules and types
│   └── full-tier.md             # Complete specifications
│
├── guides/
│   ├── README.md                # This file
│   └── advanced/
│       ├── 01_PHYSICS.md        # Signal, Pockets, Binding
│       ├── 02_COGNITION.md      # Learning, Search, Recursion
│       ├── 03_MATH.md           # Category Theory, Errors
│       └── 04_AGENT.md          # Templates, Evidence
│
└── evidence/
    ├── tic-tac-toe/             # 6 ambiguities → 0
    ├── rosetta-stone/           # 512 symbols validated
    └── e2e-conversion-guide/    # Full workflow demos
```

---

## Official Packages

| Package | Install | Registry |
|---------|---------|----------|
| aisp-converter | `npx aisp-converter` | [npm](https://www.npmjs.com/package/aisp-converter) |
| aisp-validator | `npx aisp-validator` | [npm](https://www.npmjs.com/package/aisp-validator) |
| aisp | `cargo install aisp` | [crates.io](https://crates.io/crates/aisp) |
| aisp-converter | `cargo install aisp-converter` | [crates.io](https://crates.io/crates/aisp-converter) |

---

## API Usage

### JavaScript/TypeScript

```javascript
import { convert } from 'aisp-converter';
import AISP from 'aisp-validator';

// Convert
const result = convert("Define x as 5");
console.log(result.output);  // x≜5

// Validate
await AISP.init();
const valid = AISP.isValid("x≜5");
console.log(valid);  // true
```

### Rust

```rust
use aisp::{convert, validate, Tier};

let result = convert("Define x as 5")?;
assert_eq!(result.output, "x≜5");

let valid = validate("x≜5")?;
assert!(valid.tier >= Tier::Gold);
```

---

**[Main README →](../README.md)** | **[Specification →](../AI_GUIDE.md)** | **[Examples →](../examples/)**

---

*Created by [Bradley Ross](https://linkedin.com/in/bradaross) — Inventor of AISP*
