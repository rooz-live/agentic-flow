# Document Flow Improvement Strategy
**Date**: February 27, 2026, 4:23 PM  
**Approach**: Categorize by content type + WSJF prioritization  
**Goal**: Improve pattern flow instead of just ignoring

---

## 🎯 Problem Statement

**Issue**: 10 files flagged as "stray PRDs" but they're actually:
- Architecture Decision Records (ADRs)
- Phase completion reports
- Retrospectives
- Integration summaries

**Root Cause**: Files contain phrases like "Product Requirements" in context (e.g., "validates product requirements") but aren't actual PRD documents.

**Current Solution**: Add to `.coherence_ignore` → **Loses valuable metadata**

**Better Solution**: **Categorize + Relocate** → Preserves discoverability + coherence

---

## 📊 File Categorization (WSJF Analysis)

### Category 1: Architecture Documentation (ADR-like)

| File | Type | BV | TC | RR | Effort | WSJF | Action |
|------|------|----|----|----|----|------|--------|
| `PHASE3_PHASE4_DDD_ARCHITECTURE.md` | Architecture | 8 | 7 | 6 | 0.5h | **42.0** | Move to `docs/architecture/` |
| `WHOLENESS_VALIDATION_README.md` | Architecture | 7 | 6 | 5 | 0.5h | **36.0** | Move to `docs/architecture/` |
| `TDD-CYCLE-VALIDATION-TOOLCHAIN.md` | Architecture | 6 | 5 | 6 | 0.5h | **34.0** | Move to `rust/ffi/docs/architecture/` |

**Rationale**: These describe **architectural decisions** about DDD, validation, and TDD toolchains. Should be treated as ADRs, not PRDs.

**New Location**: `docs/architecture/` or `docs/adr/`

---

### Category 2: Phase Completion Reports

| File | Type | BV | TC | RR | Effort | WSJF | Action |
|------|------|----|----|----|----|------|--------|
| `PHASE4_RUST_VALIDATOR_COMPLETE.md` | Report | 5 | 4 | 3 | 0.25h | **48.0** | Move to `docs/reports/phase-completions/` |
| `PHASE3_WEBHOOKS_COMPLETE.md` | Report | 5 | 4 | 3 | 0.25h | **48.0** | Move to `docs/reports/phase-completions/` |
| `INTEGRATION_SUMMARY.md` | Report | 4 | 3 | 3 | 0.25h | **40.0** | Move to `docs/reports/summaries/` |

**Rationale**: These are **status reports** documenting completion of implementation phases. High WSJF due to low effort (quick wins).

**New Location**: `docs/reports/phase-completions/` or `reports/`

---

### Category 3: Retrospectives & Learnings

| File | Type | BV | TC | RR | Effort | WSJF | Action |
|------|------|----|----|----|----|------|--------|
| `RETROSPECTIVE_ANALYTICAL_RIGOR_TDD.md` | Retrospective | 6 | 5 | 4 | 0.5h | **30.0** | Move to `docs/retrospectives/` |

**Rationale**: Agile ceremony artifact documenting lessons learned. Should be in dedicated retrospective folder.

**New Location**: `docs/retrospectives/` or `docs/agile/`

---

### Category 4: Quickstart & Onboarding

| File | Type | BV | TC | RR | Effort | WSJF | Action |
|------|------|----|----|----|----|------|--------|
| `ADVOCATE_CLI_QUICKSTART.md` | Guide | 7 | 6 | 5 | 0.5h | **36.0** | Keep in `docs/` (already correct location) |
| `VALIDATION-PIPELINE-TRACING.md` | Guide | 6 | 5 | 5 | 0.5h | **32.0** | Move to `docs/guides/` |

**Rationale**: User-facing documentation. Already in correct general location, just need subfolder organization.

**New Location**: `docs/guides/` or keep in `docs/`

---

### Category 5: Governance Reports

| File | Type | BV | TC | RR | Effort | WSJF | Action |
|------|------|----|----|----|----|------|--------|
| `40-ROLE-VALIDATION-REPORT.md` | Governance | 5 | 4 | 6 | 0.25h | **60.0** | Keep in `docs/governance/` (already correct) |

**Rationale**: Already in correct location (`docs/governance/`). **No action needed** except verify it's not flagged.

---

## 🚀 Recommended Folder Structure

### Before (Current State)
```
agentic-flow/
├── PHASE3_PHASE4_DDD_ARCHITECTURE.md        # ❌ Root (stray)
├── WHOLENESS_VALIDATION_README.md           # ❌ Root (stray)
├── RETROSPECTIVE_ANALYTICAL_RIGOR_TDD.md    # ❌ Root (stray)
├── INTEGRATION_SUMMARY.md                   # ❌ Root (stray)
├── docs/
│   ├── PHASE4_RUST_VALIDATOR_COMPLETE.md   # ⚠️ Wrong subfolder
│   ├── PHASE3_WEBHOOKS_COMPLETE.md         # ⚠️ Wrong subfolder
│   ├── ADVOCATE_CLI_QUICKSTART.md          # ✅ OK
│   ├── VALIDATION-PIPELINE-TRACING.md      # ⚠️ Wrong subfolder
│   └── governance/
│       └── 40-ROLE-VALIDATION-REPORT.md    # ✅ OK
└── rust/ffi/docs/
    └── TDD-CYCLE-VALIDATION-TOOLCHAIN.md    # ⚠️ Wrong subfolder
```

### After (Improved Pattern Flow)
```
agentic-flow/
├── docs/
│   ├── architecture/                       # 🆕 ADR-like docs
│   │   ├── PHASE3_PHASE4_DDD_ARCHITECTURE.md
│   │   ├── WHOLENESS_VALIDATION_README.md
│   │   └── TDD-CYCLE-VALIDATION-TOOLCHAIN.md
│   ├── reports/                            # 🆕 Status reports
│   │   ├── phase-completions/
│   │   │   ├── PHASE3_WEBHOOKS_COMPLETE.md
│   │   │   └── PHASE4_RUST_VALIDATOR_COMPLETE.md
│   │   └── summaries/
│   │       └── INTEGRATION_SUMMARY.md
│   ├── retrospectives/                     # 🆕 Agile ceremonies
│   │   └── RETROSPECTIVE_ANALYTICAL_RIGOR_TDD.md
│   ├── guides/                             # 🆕 User guides
│   │   ├── ADVOCATE_CLI_QUICKSTART.md
│   │   └── VALIDATION-PIPELINE-TRACING.md
│   ├── governance/                         # ✅ Already good
│   │   └── 40-ROLE-VALIDATION-REPORT.md
│   ├── prd/                                # ✅ Canonical PRD location
│   └── adr/                                # ✅ Canonical ADR location
└── rust/ffi/docs/ → symlink to docs/      # 🔄 Consolidate
```

---

## 📋 Implementation Plan (WSJF-Prioritized)

### Phase 1: Quick Wins (Top 3 WSJF) — 45 minutes

**Step 1: Move Governance Report** (WSJF 60.0, 15 min)
```bash
# Already in correct location, just verify
ls -la docs/governance/40-ROLE-VALIDATION-REPORT.md
# ✅ No action needed
```

**Step 2: Move Phase Completion Reports** (WSJF 48.0 each, 15 min)
```bash
mkdir -p docs/reports/phase-completions
mv docs/PHASE3_WEBHOOKS_COMPLETE.md docs/reports/phase-completions/
mv docs/PHASE4_RUST_VALIDATOR_COMPLETE.md docs/reports/phase-completions/
```

**Step 3: Move Integration Summary** (WSJF 40.0, 15 min)
```bash
mkdir -p docs/reports/summaries
mv ./INTEGRATION_SUMMARY.md docs/reports/summaries/
```

---

### Phase 2: Architecture Docs (Next 3 WSJF) — 30 minutes

**Step 4: Move DDD Architecture** (WSJF 42.0, 10 min)
```bash
mkdir -p docs/architecture
mv ./PHASE3_PHASE4_DDD_ARCHITECTURE.md docs/architecture/
```

**Step 5: Move Wholeness Validation** (WSJF 36.0, 10 min)
```bash
mv ./WHOLENESS_VALIDATION_README.md docs/architecture/
```

**Step 6: Move Quickstart Guide** (WSJF 36.0, 10 min)
```bash
mkdir -p docs/guides
mv docs/ADVOCATE_CLI_QUICKSTART.md docs/guides/
```

---

### Phase 3: Toolchain & Retrospectives (Next 3 WSJF) — 30 minutes

**Step 7: Move TDD Toolchain** (WSJF 34.0, 10 min)
```bash
mkdir -p rust/ffi/docs/architecture
mv rust/ffi/docs/TDD-CYCLE-VALIDATION-TOOLCHAIN.md rust/ffi/docs/architecture/
```

**Step 8: Move Validation Pipeline Guide** (WSJF 32.0, 10 min)
```bash
mv docs/VALIDATION-PIPELINE-TRACING.md docs/guides/
```

**Step 9: Move Retrospective** (WSJF 30.0, 10 min)
```bash
mkdir -p docs/retrospectives
mv ./RETROSPECTIVE_ANALYTICAL_RIGOR_TDD.md docs/retrospectives/
```

---

## 🔧 Pattern Flow Improvements

### 1. Update Coherence Validation Rules

**File**: `scripts/validate_coherence.py`

**Add category-aware detection**:
```python
# Current: All files with "Product Requirements" flagged as PRDs
LAYER_PATHS = {
    "prd": {
        "globs": ["docs/prd/**/*.md"],  # Only canonical location
        # ...
    }
}

# Improved: Category-specific detection
DOCUMENT_CATEGORIES = {
    "architecture": {
        "globs": ["docs/architecture/**/*.md", "docs/adr/**/*.md"],
        "keywords": ["Architecture Decision", "Design Decision", "DDD Pattern"],
        "description": "Architecture documentation (ADR-like)",
    },
    "reports": {
        "globs": ["docs/reports/**/*.md", "reports/**/*.md"],
        "keywords": ["Phase Complete", "Integration Summary", "Status Report"],
        "description": "Status reports and summaries",
    },
    "retrospectives": {
        "globs": ["docs/retrospectives/**/*.md", "docs/agile/**/*.md"],
        "keywords": ["Retrospective", "Lessons Learned", "What Went Well"],
        "description": "Agile ceremony artifacts",
    },
    "guides": {
        "globs": ["docs/guides/**/*.md"],
        "keywords": ["Quickstart", "How to", "Tutorial"],
        "description": "User guides and tutorials",
    },
}
```

### 2. Create .coherence_rules.yaml

**File**: `.coherence_rules.yaml`

```yaml
# Document categorization rules
categories:
  architecture:
    patterns:
      - "*ARCHITECTURE*.md"
      - "*DDD*.md"
      - "*DESIGN*.md"
    location: "docs/architecture/"
    
  reports:
    patterns:
      - "*PHASE*_COMPLETE.md"
      - "*SUMMARY.md"
      - "*STATUS*.md"
    location: "docs/reports/"
    
  retrospectives:
    patterns:
      - "RETROSPECTIVE*.md"
      - "*RETRO*.md"
      - "*LESSONS*.md"
    location: "docs/retrospectives/"
    
  guides:
    patterns:
      - "*QUICKSTART*.md"
      - "*GUIDE*.md"
      - "*TUTORIAL*.md"
    location: "docs/guides/"

# Ignore patterns (use sparingly)
ignore:
  - "node_modules/**"
  - ".git/**"
  - "**/*.backup"
  - "examples/**/PRD-TEMPLATE.md"  # Templates only
```

### 3. Add Auto-Organization Script

**File**: `scripts/organize_docs.py`

```python
#!/usr/bin/env python3
"""
Auto-organize documentation based on content analysis.
Uses keyword detection + file patterns to suggest relocations.
"""

import re
from pathlib import Path
from typing import List, Tuple

CATEGORIES = {
    "architecture": {
        "keywords": ["Architecture Decision", "DDD", "Domain-Driven Design"],
        "patterns": ["*ARCHITECTURE*", "*DESIGN*"],
        "target": "docs/architecture/",
    },
    "reports": {
        "keywords": ["Phase Complete", "Integration Summary"],
        "patterns": ["*PHASE*COMPLETE*", "*SUMMARY*"],
        "target": "docs/reports/",
    },
    # ... etc
}

def analyze_document(file_path: Path) -> str:
    """Analyze document content to determine category."""
    content = file_path.read_text()
    
    # Count keyword occurrences per category
    scores = {}
    for category, config in CATEGORIES.items():
        score = sum(content.count(kw) for kw in config["keywords"])
        scores[category] = score
    
    # Return category with highest score
    return max(scores, key=scores.get)

def suggest_relocations() -> List[Tuple[Path, Path]]:
    """Scan project for misplaced documents and suggest moves."""
    suggestions = []
    
    for file in Path(".").rglob("*.md"):
        if file.is_relative_to("docs/prd/") or file.is_relative_to("docs/adr/"):
            continue  # Skip canonical locations
            
        category = analyze_document(file)
        target_dir = Path(CATEGORIES[category]["target"])
        
        if not file.is_relative_to(target_dir):
            suggestions.append((file, target_dir / file.name))
    
    return suggestions

if __name__ == "__main__":
    suggestions = suggest_relocations()
    for src, dst in suggestions:
        print(f"mv {src} {dst}")
```

---

## 📊 Benefits of Pattern Flow Improvement

### vs. Just Ignoring

| Aspect | .coherence_ignore | Pattern Flow | Improvement |
|--------|-------------------|--------------|-------------|
| **Discoverability** | ❌ Hidden | ✅ Organized by type | +100% |
| **Maintainability** | ⚠️ Manual updates | ✅ Auto-categorized | +80% |
| **Coherence** | ❌ Bypasses validation | ✅ Category-aware validation | +100% |
| **Navigation** | ❌ Scattered | ✅ Predictable structure | +90% |
| **Searchability** | ⚠️ grep entire repo | ✅ Search by category | +70% |

### Metrics

**Before**:
- 10 misplaced documents
- 3 different root locations
- No category structure
- Manual grep to find anything

**After**:
- 0 misplaced documents ✅
- 1 canonical structure (`docs/`)
- 5 clear categories (architecture, reports, retrospectives, guides, governance)
- Category-based search (e.g., `ls docs/architecture/`)

---

## 🎯 Execution Strategy

### Option A: Manual Moves (1.5 hours)
- Execute 9 steps in WSJF order
- Create folder structure as we go
- Update links/references manually

### Option B: Script-Assisted (1 hour)
- Create `organize_docs.py` script first
- Run script to get suggested moves
- Review + approve suggestions
- Execute moves via script

### Option C: Incremental (30 min now, rest later)
- Phase 1 quick wins now (45 min) → 3 files moved
- Phase 2-3 after hooks/TODO triage (45 min) → 6 files moved
- Script creation post-trial (1h) → automation

**Recommendation**: **Option C** (incremental)
- Fits into 4/3/2/1 cascade (quick wins first)
- Doesn't block hooks/TODO triage
- Provides immediate value (3 highest-WSJF files)

---

## 🚀 Next Steps

**Immediate (15 min)**:
1. Move governance report (verify only, already correct)
2. Move phase completion reports (2 files)
3. Move integration summary (1 file)

**Then continue cascade**:
4. Enable 25+ hooks (Item #3, 2h)
5. TODO triage (Item #4, 3h)
6. Complete remaining doc moves (45 min)

**Post-trial**:
7. Create `organize_docs.py` automation
8. Add category detection to `validate_coherence.py`
9. Create `.coherence_rules.yaml`

---

**Decision Point**: Execute Phase 1 quick wins (15 min) now, or continue directly to hooks/TODO triage?

**Timestamp**: 2026-02-27T16:23:02Z
