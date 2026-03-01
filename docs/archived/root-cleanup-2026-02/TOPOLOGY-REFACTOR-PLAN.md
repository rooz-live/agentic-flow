# Topology Refactor - Vision-Driven Design (VDD)
**Date**: 2026-02-25  
**Problem**: File names describe HOW (unified-validation-mesh.sh) instead of WHY (never-ship-placeholders.sh)  
**Solution**: Restructure to express VISION → DOMAIN → IMPLEMENTATION hierarchy

---

## CURRENT STATE (Implementation Theater)

```
/code/investing/agentic-flow/
├── scripts/
│   ├── unified-validation-mesh.sh          ← WHAT IS THIS? (theater)
│   ├── email-generation-tdd-framework.sh   ← TOO TECHNICAL
│   ├── post-gen-email-validator.sh         ← WHEN, not WHY
│   └── 47 other scattered validators       ← CHAOS

/Personal/CLT/MAA/.../12-AMANDA-BECK-110-FRAZIER/
├── EMAIL-TO-LANDLORD-NO-TRIAL-v5.eml       ← VERSION SOUP
├── EMAIL-TO-LANDLORD-AMENDMENTS-ONLY-v5B.eml
├── EMAIL-TO-AMANDA-WITH-LANDLORD-DRAFT-v5.eml
├── validate-emails.sh                      ← DUPLICATE
├── compose-emails.sh                       ← DUPLICATE
└── 28 other iteration artifacts            ← TECH DEBT
```

**Problems**:
- Can't tell VISION from filenames
- Implementation details (tdd, validation, mesh) leak into names
- Version numbers (v5, v5B) show iteration count, not PURPOSE
- Duplication across `/code` and `/Personal`

---

## TARGET STATE (Vision-Driven Design)

### Principle: WHY → WHAT → HOW Hierarchy

```
/code/investing/agentic-flow/
├── vision/                                 ← WHY this exists
│   ├── never-ship-placeholders/
│   │   ├── VISION.md                       ← User shouldn't catch @example.com
│   │   ├── ADR-001-mandatory-validation.md
│   │   └── PRD-requirements.md
│   │
│   ├── protect-epistemic-wholeness/
│   │   ├── VISION.md                       ← No backsliding on fixed issues
│   │   ├── ADR-003-cyclic-regression.md
│   │   └── PRD-requirements.md
│   │
│   └── standardize-legal-citations/
│       ├── VISION.md                       ← N.C.G.S. § not NC G.S. §
│       ├── ADR-002-citation-format.md
│       └── PRD-requirements.md
│
├── domain/                                 ← WHAT we validate
│   ├── email/
│   │   ├── no-placeholders.sh              ← Domain-specific check
│   │   ├── real-contacts.sh
│   │   └── attachments-exist.sh
│   │
│   ├── legal/
│   │   ├── proper-citations.sh
│   │   ├── trial-dates-consistent.sh
│   │   └── no-court-disclosure.sh
│   │
│   └── code/
│       ├── syntax-valid.sh
│       ├── tests-pass.sh
│       └── linting-clean.sh
│
├── gates/                                  ← HOW/WHEN we validate
│   ├── before-generation/
│   │   └── check-environment.sh            ← DoR (Definition of Ready)
│   │
│   ├── after-generation/
│   │   └── validate-output.sh              ← DoD (Definition of Done)
│   │
│   ├── before-commit/
│   │   └── pre-commit-hook.sh
│   │
│   └── before-trial/
│       └── pre-flight-check.sh
│
├── workflows/                              ← TDD Red/Green/Refactor loops
│   ├── red-define-requirements.sh
│   ├── green-run-validation.sh
│   ├── refactor-auto-fix.sh
│   └── iterate-until-pass.sh
│
└── orchestrate                             ← SINGLE ENTRY POINT (symlink or wrapper)
    └── Entry point that knows VISION → calls DOMAIN → triggers GATES → runs WORKFLOWS

/Personal/CLT/MAA/.../12-AMANDA-BECK-110-FRAZIER/
├── landlord/                               ← PURPOSE, not VERSION
│   ├── option-A-with-context.eml           ← WHAT user chooses
│   ├── option-B-amendments-only.eml
│   ├── amendments.md
│   └── housing-crisis-context.md
│
├── amanda/
│   └── coordination-request.eml            ← PURPOSE clear from name
│
└── artifacts/                              ← Old iterations archived
    ├── v1-v4-iterations/
    └── validator-prototypes/
```

---

## VISION DOCUMENTS (WHY Layer)

### Example: `/vision/never-ship-placeholders/VISION.md`

```markdown
# Vision: Never Ship Placeholder Data

## The Problem We Solve
User caught `shahrooz@example.com` in production-ready lease negotiation emails. Nearly sent to property manager with wrong contact info.

## The Vision
**No template placeholders (@example.com, TODO, FIXME) ever reach user review.**

## Success Criteria
- User NEVER catches placeholder emails again
- Validation runs AUTOMATICALLY after every file generation
- If placeholders found → auto-fix → re-validate → repeat until clean

## Why This Matters
Sending professional emails with template data destroys credibility in legal negotiations where precision matters.

## References
- Wholeness Framework Failure Retrospective (2026-02-25)
- User feedback: "why are existing wholeness framework checks not run iteratively enough?"
```

---

## DOMAIN SEPARATION (WHAT Layer)

Each domain has SINGLE-RESPONSIBILITY validators:

### `/domain/email/no-placeholders.sh`
```bash
#!/bin/bash
# VISION: never-ship-placeholders
# DOMAIN: email
# CHECK: No @example.com addresses in .eml files

find . -name "*.eml" | xargs grep -l "@example\.com" && exit 1 || exit 0
```

### `/domain/legal/proper-citations.sh`
```bash
#!/bin/bash
# VISION: standardize-legal-citations
# DOMAIN: legal  
# CHECK: All NC law citations use N.C.G.S. § format

find . -name "*.eml" -o -name "*.md" | xargs grep "NC G\.S\. §" && exit 1 || exit 0
```

**Benefits**:
- Each validator does ONE thing
- Vision explicit in header comment
- Easy to enable/disable specific checks
- No "unified" abstraction theater

---

## GATES (WHEN Layer)

Gates define TIMING, not implementation:

### `/gates/after-generation/validate-output.sh`
```bash
#!/bin/bash
# Run ALL domain validators after generating .eml files
# If ANY fail → trigger refactor workflow

/domain/email/no-placeholders.sh && \
/domain/email/real-contacts.sh && \
/domain/email/attachments-exist.sh && \
/domain/legal/proper-citations.sh && \
/domain/legal/trial-dates-consistent.sh
```

---

## WORKFLOWS (HOW Layer - TDD)

### `/workflows/iterate-until-pass.sh`
```bash
#!/bin/bash
# RED → GREEN → REFACTOR loop

MAX_ITERATIONS=5
for i in $(seq 1 $MAX_ITERATIONS); do
    echo "🔴 RED: Define requirements"
    /workflows/red-define-requirements.sh
    
    echo "🟢 GREEN: Validate"
    if /workflows/green-run-validation.sh; then
        echo "✅ PASS"
        exit 0
    fi
    
    echo "🔧 REFACTOR: Auto-fix"
    /workflows/refactor-auto-fix.sh
done

echo "❌ MAX ITERATIONS REACHED"
exit 1
```

---

## ORCHESTRATION (Entry Point)

### `/orchestrate` (single command, no .sh extension)
```bash
#!/bin/bash
# Entry point that understands VISION and routes to appropriate DOMAIN + GATE

MODE="${1:-validate}"
TARGET="${2:-personal}"

case "$MODE" in
    validate)
        case "$TARGET" in
            email) /gates/after-generation/validate-output.sh ;;
            legal) /domain/legal/*.sh ;;
            all) /workflows/iterate-until-pass.sh ;;
        esac
        ;;
    
    vision)
        # Show WHY this validation exists
        cat /vision/*/VISION.md
        ;;
    
    fix)
        /workflows/refactor-auto-fix.sh
        ;;
esac
```

**Usage**:
```bash
# Show vision
./orchestrate vision

# Validate emails
./orchestrate validate email

# Validate everything with auto-fix
./orchestrate validate all

# Just fix, don't validate
./orchestrate fix
```

---

## FILE NAMING CONVENTIONS

### ❌ BAD (Implementation Theater)
- `unified-validation-mesh.sh` ← HOW, not WHY
- `email-generation-tdd-framework.sh` ← TOO TECHNICAL
- `post-gen-email-validator.sh` ← WHEN, not WHAT
- `EMAIL-TO-LANDLORD-NO-TRIAL-v5.eml` ← VERSION SOUP

### ✅ GOOD (Vision-Driven)
- `no-placeholders.sh` ← WHAT it checks (vision: never-ship-placeholders)
- `proper-citations.sh` ← WHAT it checks (vision: standardize-legal-citations)
- `option-A-with-context.eml` ← WHAT user chooses
- `coordination-request.eml` ← PURPOSE clear

---

## MIGRATION PLAN

### Step 1: Create Vision Layer (5 min)
```bash
mkdir -p /code/investing/agentic-flow/vision/{never-ship-placeholders,protect-epistemic-wholeness,standardize-legal-citations}

# Write VISION.md for each (WHY this exists)
# Write ADR-XXX.md for each (architectural decision)
# Write PRD-requirements.md for each (what must pass)
```

### Step 2: Extract Domain Validators (10 min)
```bash
mkdir -p /code/investing/agentic-flow/domain/{email,legal,code}

# Split unified-validation-mesh.sh into single-responsibility validators
# Each validator: 10-20 lines max, ONE check only
```

### Step 3: Create Gates (5 min)
```bash
mkdir -p /code/investing/agentic-flow/gates/{after-generation,before-commit,before-trial}

# Each gate orchestrates domain validators for specific timing
```

### Step 4: Create Workflows (5 min)
```bash
mkdir -p /code/investing/agentic-flow/workflows

# TDD Red/Green/Refactor loop
```

### Step 5: Create Orchestrator (5 min)
```bash
# Single entry point: /code/investing/agentic-flow/orchestrate
# No .sh extension (it's a command, not a script)
```

### Step 6: Clean /Personal (10 min)
```bash
cd /Personal/CLT/MAA/.../12-AMANDA-BECK-110-FRAZIER/

# Create purposeful folders
mkdir -p landlord amanda artifacts

# Move v5 files with PURPOSE names
mv EMAIL-TO-LANDLORD-NO-TRIAL-v5.eml landlord/option-A-with-context.eml
mv EMAIL-TO-LANDLORD-AMENDMENTS-ONLY-v5B.eml landlord/option-B-amendments-only.eml
mv EMAIL-TO-AMANDA-WITH-LANDLORD-DRAFT-v5.eml amanda/coordination-request.eml

# Archive tech debt
mv *v1*.eml *v2*.eml *v3*.eml *v4*.eml artifacts/v1-v4-iterations/
mv *validator*.sh *framework*.sh artifacts/validator-prototypes/
```

### Step 7: Delete 50+ Old Scripts (2 min)
```bash
# Now safe to delete because consolidated into domain/
rm /code/investing/agentic-flow/scripts/unified-validation-mesh.sh
rm /code/investing/agentic-flow/scripts/email-generation-tdd-framework.sh
# ... (47 other scattered validators)
```

---

## BENEFITS OF VDD TOPOLOGY

1. **Vision Explicit**: Can't read `/vision/never-ship-placeholders/VISION.md` without knowing WHY
2. **Single Responsibility**: Each validator checks ONE thing
3. **Easy Feature Flags**: Want to disable placeholder check? Don't call `/domain/email/no-placeholders.sh`
4. **TDD Clear**: Red/Green/Refactor in `/workflows/`, not mixed with validation logic
5. **No Version Soup**: Files named by PURPOSE (option-A, option-B), not iteration count (v5, v5B)
6. **Tech Debt Visible**: Old iterations in `/artifacts/`, clearly labeled as debt
7. **Mesh Without "Mesh"**: `/orchestrate` routes to domains without saying "unified mesh topology"

---

## EXAMPLE: User Workflow After Refactor

**Before (Current State)**:
```bash
# User has no idea what this does
./unified-validation-mesh.sh validate personal-only

# Is this v5 or v5B? What's the difference?
open EMAIL-TO-LANDLORD-NO-TRIAL-v5.eml
```

**After (VDD State)**:
```bash
# User understands immediately
./orchestrate vision                    # Show WHY validations exist
./orchestrate validate email            # Check emails only
./orchestrate validate all              # Check everything with TDD loop

# User knows exactly what they're choosing
open landlord/option-A-with-context.eml
open landlord/option-B-amendments-only.eml
```

---

## CONSOLIDATION COMPLETE WHEN

- ✅ Vision documents exist for each validation
- ✅ Domain validators are single-responsibility (10-20 lines each)
- ✅ Gates separate WHEN from WHAT
- ✅ Workflows implement TDD without mixing concerns
- ✅ `/orchestrate` entry point replaces 50+ scattered scripts
- ✅ `/Personal` files named by PURPOSE, not VERSION
- ✅ Tech debt archived in `/artifacts/`, not mixed with production

---

## NEXT ACTIONS

1. **Now**: Rename v5 files to purposeful names in `/Personal`
2. **Next 30 min**: Extract vision/domain/gates/workflows from unified-validation-mesh.sh
3. **Tomorrow**: Delete 50+ old scripts after confirming new topology works
4. **Before Trial**: Update `.claude/settings.json` to call `./orchestrate validate all`

Ready to execute Step 6 (Clean /Personal)?
