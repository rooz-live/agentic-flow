# VALIDATION INFRASTRUCTURE CONSOLIDATION PLAN
**Date**: February 27, 2026  
**Status**: 🎯 READY FOR EXECUTION  
**Mode Strategy**: Semi-Auto (Trial Prep) → Full-Auto (Post-Trial)

---

## EXECUTIVE SUMMARY

**Problem**: Duplicate validation logic across 2 repos + 3+ directories  
**Solution**: Merge into single canonical source with mode flags  
**Timeline**: Semi-auto tonight (4 hours) → Full-auto post-Trial #1 (March 11+)

### Exit Code Convention (Unified)
```
0 - PASS (all checks passed)
1 - BLOCKER (critical failure, must fix)
2 - WARNING (passed with warnings)
3 - DEPS_MISSING (tools not installed)
```

---

## CURRENT STATE AUDIT

### Duplicate Files Detected
| Location | File | Version | Status |
|----------|------|---------|--------|
| `/Documents/code/investing/agentic-flow/scripts/` | `validation-core.sh` | v0.9 (109 lines) | ⚠️ **Simpler, no DDD aggregate** |
| `/Documents/Personal/CLT/MAA/scripts/` | `validation-core.sh` | v1.0 (337 lines) | ✅ **DDD aggregate pattern** |
| `/Documents/Personal/CLT/MAA/scripts/` | `pre-send-email-gate.sh` | v2.0 (295 lines) | ✅ **5-section gate with ROAM** |

### Neural Trader Sprawl
```
❌ ARCHIVE (4 copies - candidates for deletion):
/code/projects/agentic-flow/archive/legacy-projects/neural_trader/
/code/projects/agentic-flow/archive/legacy-projects/packages/neural-trader/
/Documents/code/archive/investing/agentic-flow/neural_trader/
/Documents/code/archive/investing/agentic-flow/packages/neural-trader/

⚠️ ACTIVE (3 copies - needs consolidation):
/Documents/code/investing/agentic-flow/neural_trader/risk_calculator.py
/Documents/code/investing/agentic-flow/packages/neural-trader/index.js
/Documents/code/rust/ruvector/examples/apify/neural-trader-system/

✅ CANONICAL TARGET:
/Documents/code/investing/agentic-flow/packages/neural-trader/ (JS)
/Documents/code/rust/ruvector/examples/neural-trader/ (Rust)
```

---

## CONSOLIDATION STRATEGY

### Phase 1: SEMI-AUTO (Tonight - 4 hours)
**Goal**: Merge validation-core.sh + enable DDD aggregate for Trial #1 emails

**Tasks** (WSJF-scored):
| Task | BV | TC | RR | JS | WSJF | Priority |
|------|----|----|----|----|------|----------|
| Merge validation-core.sh (MAA v1.0 → agentic-flow) | 40 | 50 | 30 | 2 | 60.0 | P0 |
| Copy pre-send-email-gate.sh to agentic-flow | 30 | 40 | 20 | 1 | 90.0 | P0 |
| Create advocate CLI wrappers | 20 | 30 | 10 | 3 | 20.0 | P1 |
| Add --mode=semi-auto flag (skip heavy checks) | 15 | 20 | 10 | 2 | 22.5 | P1 |
| Archive neural_trader duplicates | 10 | 5 | 5 | 1 | 20.0 | P2 |

**Deliverables**:
- ✅ Single validation-core.sh with DDD aggregate
- ✅ pre-send-email-gate.sh callable from both repos
- ✅ Exit codes 0/1/2/3 enforced
- ✅ ROAM R-2026-011 integration (employment claims gate)

---

### Phase 2: FULL-AUTO (Post-Trial #1 - March 11+)
**Goal**: Red/Green TDD pipeline + Claude Flow hooks + agentic-qe integration

**Tasks** (WSJF-scored):
| Task | BV | TC | RR | JS | WSJF | Priority |
|------|----|----|----|----|------|----------|
| Git pre-commit hooks (block bad commits) | 50 | 10 | 40 | 5 | 20.0 | P0 |
| Claude Flow hooks (session-start, pre-tool-use) | 40 | 10 | 30 | 8 | 10.0 | P1 |
| agentic-qe fleet orchestration | 30 | 5 | 20 | 13 | 4.2 | P2 |
| JSON schema validation (PRD/ADR/DDD/TDD) | 25 | 5 | 15 | 8 | 5.6 | P2 |
| RuVector domain expansion (validation embeddings) | 20 | 2 | 10 | 21 | 1.5 | P3 |

**Deliverables**:
- 🎯 Git pre-commit hook blocks invalid emails before commit
- 🎯 Claude Flow auto-validates on session-start
- 🎯 agentic-qe fleet runs parallel checks (placeholder + ROAM + citations)
- 🎯 JSON output for all validators (aggregate metrics)

---

## IMPLEMENTATION: PHASE 1 (TONIGHT)

### Step 1: Consolidate validation-core.sh (30 min)

**Action**: Copy MAA v1.0 → agentic-flow, preserve both versions temporarily

```bash
# Backup existing
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts
cp validation-core.sh validation-core-v0.9-backup.sh

# Copy enhanced version
cp /Users/shahroozbhopti/Documents/Personal/CLT/MAA/scripts/validation-core.sh \
   /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/validation-core.sh

# Verify DDD aggregate exists
grep -n "validate_email_aggregate" validation-core.sh
# Expected: lines 234-324
```

**Validation**:
```bash
# Test DDD aggregate
source validation-core.sh
init_colors
validate_email_aggregate "/path/to/test.eml" "normal"
echo $?  # Should be 0, 1, or 2
```

---

### Step 2: Add Mode Flags (45 min)

**Edit**: Add `--mode` support to validation-core.sh

```bash
# Add after line 148 in validation-core.sh
local mode="normal"  # Options: semi-auto, full-auto, strict

case "$mode" in
    semi-auto)
        # Skip heavy checks (ROAM deep scan, citation context)
        skip_roam_deep_scan=true
        skip_citation_context=true
        ;;
    full-auto)
        # Run all checks + JSON output
        json_out=true
        ;;
    strict)
        # Treat warnings as blockers
        warnings_as_blockers=true
        ;;
esac
```

**New Function**: `validate_email_with_mode()`

```bash
validate_email_with_mode() {
    local email_file="$1"
    local mode="${2:-normal}"  # normal|semi-auto|full-auto|strict
    
    case "$mode" in
        semi-auto)
            # Fast path: placeholder + headers only
            validate_email_aggregate "$email_file" "lenient"
            ;;
        full-auto)
            # Complete gate: 5 sections + JSON
            /path/to/pre-send-email-gate.sh "$email_file" --mode=strict --json
            ;;
        *)
            # Normal mode: DDD aggregate
            validate_email_aggregate "$email_file" "normal"
            ;;
    esac
}
```

---

### Step 3: Create advocate CLI (1 hour)

**File**: `/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/advocate`

```bash
#!/usr/bin/env bash
# advocate - Legal workflow automation CLI

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/validation-core.sh"

usage() {
    cat <<EOF
advocate - Legal Workflow CLI v1.0.0

Commands:
  validate-email <file> [--mode=semi-auto|full-auto|strict]
      Validate email before sending
      
  compare-validators [--latest] <file...>
      Compare validator results across implementations
      
  classify <path> [--auto-rename]
      Auto-organize documents (PDFs → Filings/, Photos → Evidence/)
      
  session restore [--latest]
      Load previous session state (~/.advocate/session.json)

Exit Codes:
  0 - Success/Pass
  1 - Critical failure (blocker)
  2 - Passed with warnings
  3 - Missing dependencies

Examples:
  advocate validate-email draft.eml --mode=semi-auto
  advocate compare-validators EMAIL-*.eml
  advocate classify ~/Downloads/ --auto-rename
EOF
}

cmd_validate_email() {
    local file="$1"
    local mode="normal"
    
    # Parse --mode flag
    shift
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --mode=*) mode="${1#*=}"; shift ;;
            *) shift ;;
        esac
    done
    
    if [ ! -f "$file" ]; then
        echo "❌ ERROR: File not found: $file"
        return 1
    fi
    
    echo "🔍 Validating: $(basename "$file") (mode: $mode)"
    validate_email_with_mode "$file" "$mode"
}

cmd_compare_validators() {
    echo "⏳ Comparing validators..."
    "$SCRIPT_DIR/compare-all-validators.sh" "$@"
}

cmd_classify() {
    echo "📁 Document classification not yet implemented"
    return 3
}

cmd_session_restore() {
    local session_file="$HOME/.advocate/session.json"
    if [ -f "$session_file" ]; then
        echo "✅ Session restored from $session_file"
        cat "$session_file"
    else
        echo "⚠️ No session file found"
        return 2
    fi
}

# Main dispatcher
case "${1:-}" in
    validate-email) shift; cmd_validate_email "$@" ;;
    compare-validators) shift; cmd_compare_validators "$@" ;;
    classify) shift; cmd_classify "$@" ;;
    session) shift; cmd_session_restore "$@" ;;
    --help|-h|help) usage; exit 0 ;;
    *) usage; exit 2 ;;
esac
```

**Installation**:
```bash
chmod +x /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/advocate
ln -s /Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/advocate /usr/local/bin/advocate
```

---

### Step 4: Archive Neural Trader Duplicates (30 min)

**Action**: Move to archive, keep only canonical copies

```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Archive Python legacy
mkdir -p archive/neural-trader-legacy/python
mv neural_trader/risk_calculator.py archive/neural-trader-legacy/python/

# Keep JS package (active)
# packages/neural-trader/ stays as-is

# Add .gitignore
echo "archive/neural-trader-legacy/" >> .gitignore
```

---

## FOLDER STRUCTURE (POST-CONSOLIDATION)

```
/Documents/code/investing/agentic-flow/
├── scripts/
│   ├── validation-core.sh          ← CANONICAL (merged from MAA v1.0)
│   ├── pre-send-email-gate.sh      ← CANONICAL (from MAA)
│   ├── validation-runner.sh         ← Orchestrator
│   ├── compare-all-validators.sh    ← Report generator
│   └── advocate                     ← CLI wrapper (NEW)
├── packages/
│   └── neural-trader/               ← CANONICAL JS
├── archive/
│   ├── neural-trader-legacy/        ← Python legacy
│   └── validation-v0.9/             ← Old validation scripts
└── rust/
    └── core/
        └── src/
            └── validation/          ← DDD aggregates (Rust)

/Documents/Personal/CLT/MAA/
├── scripts/
│   ├── validation-core.sh           ← SYMLINK to agentic-flow
│   └── pre-send-email-gate.sh       ← SYMLINK to agentic-flow
└── CONSOLIDATION-TRUTH-REPORT.md    ← Status tracking
```

---

## WSJF EXECUTION PRIORITY

### Phase 1 (Tonight - Pre-Trial)
```
Priority Queue (WSJF):
1. Copy pre-send-email-gate.sh      (WSJF: 90.0)
2. Merge validation-core.sh          (WSJF: 60.0)
3. Add --mode=semi-auto flag         (WSJF: 22.5)
4. Create advocate CLI               (WSJF: 20.0)
5. Archive neural_trader             (WSJF: 20.0)
```

### Phase 2 (Post-Trial - Full-Auto)
```
Priority Queue (WSJF):
1. Git pre-commit hooks              (WSJF: 20.0)
2. Claude Flow hooks                 (WSJF: 10.0)
3. JSON schema validation            (WSJF: 5.6)
4. agentic-qe fleet                  (WSJF: 4.2)
5. RuVector domain expansion         (WSJF: 1.5)
```

---

## MODE COMPARISON

| Feature | Semi-Auto | Full-Auto |
|---------|-----------|-----------|
| **Placeholder Check** | ✅ Yes | ✅ Yes |
| **Email Headers** | ✅ Yes | ✅ Yes |
| **Contact Info** | ✅ Yes | ✅ Yes |
| **Signature Block** | ✅ Yes | ✅ Yes |
| **ROAM R-2026-011** | ⚠️ Basic scan | ✅ Deep scan + override prompt |
| **Legal Citations** | ⚠️ Format only | ✅ Format + context |
| **Recipient Validation** | ✅ Yes | ✅ Yes |
| **Professional Tone** | ❌ Skip | ✅ Yes |
| **Attachment Check** | ⚠️ Warning | ✅ Blocker if mismatch |
| **JSON Output** | ❌ No | ✅ Yes |
| **Execution Time** | ~1 sec | ~2 sec |
| **Exit on Warning** | ❌ No (exit 0) | ✅ Yes (exit 2) |

---

## RED/GREEN TDD INTEGRATION (Phase 2)

### Git Pre-Commit Hook
**File**: `.git/hooks/pre-commit`

```bash
#!/usr/bin/env bash
# Pre-commit hook: validate emails before commit

FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.eml$')
if [ -z "$FILES" ]; then
    exit 0
fi

FAILED=0
for file in $FILES; do
    echo "Validating $file..."
    advocate validate-email "$file" --mode=full-auto
    if [ $? -ne 0 ]; then
        ((FAILED++))
    fi
done

if [ $FAILED -gt 0 ]; then
    echo "❌ COMMIT BLOCKED: $FAILED email(s) failed validation"
    echo "Fix issues and try again"
    exit 1
fi

echo "✅ All emails validated"
exit 0
```

### Claude Flow Hooks
**File**: `.claude/settings.json`

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "advocate session restore | tail -10"
      }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "advocate validate-email \"$CLAUDE_TOOL_INPUT_FILE_PATH\" --mode=semi-auto 2>&1 | head -20"
      }]
    }]
  }
}
```

---

## ROAM RISKS

| Risk ID | Description | Mitigation | Status |
|---------|-------------|------------|--------|
| R-CONSOL-001 | Merge breaks existing validators | Backup v0.9 + side-by-side testing | MITIGATED |
| R-CONSOL-002 | advocate CLI not in PATH | Create symlink to /usr/local/bin | MITIGATED |
| R-CONSOL-003 | Neural trader deps break after archive | Test imports before archiving | ACCEPTED |
| R-CONSOL-004 | Git hooks slow down commits | Only validate .eml files | MITIGATED |

---

## SUCCESS CRITERIA

### Phase 1 (Semi-Auto - Tonight)
- ✅ Single validation-core.sh with DDD aggregate
- ✅ advocate CLI working: `advocate validate-email test.eml --mode=semi-auto`
- ✅ Exit codes enforced (0/1/2/3)
- ✅ ROAM R-2026-011 integrated
- ✅ Neural trader archived (4 duplicates → 1 canonical)

### Phase 2 (Full-Auto - Post-Trial)
- 🎯 Git pre-commit hooks block invalid emails
- 🎯 Claude Flow auto-validates on tool use
- 🎯 JSON output from all validators
- 🎯 agentic-qe fleet runs parallel checks
- 🎯 < 2 sec validation time (full-auto mode)

---

## NEXT STEPS

### Immediate (Tonight - 4 hours)
```bash
# 1. Backup current state
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
git checkout -b feature/validation-consolidation

# 2. Execute Phase 1 consolidation
./scripts/consolidate-validation.sh --phase=1

# 3. Test advocate CLI
advocate validate-email SENT/EMAIL-POST-SIGNATURE-CONFIRMATION_2026-02-27.eml --mode=semi-auto

# 4. Commit changes
git add scripts/validation-core.sh scripts/pre-send-email-gate.sh scripts/advocate
git commit -m "feat: consolidate validation infrastructure (Phase 1)"
```

### Post-Trial #1 (March 11+)
```bash
# 1. Install full-auto dependencies
npm install -g @claude-flow/cli@latest agentic-qe@latest

# 2. Execute Phase 2
./scripts/consolidate-validation.sh --phase=2

# 3. Enable hooks
npx @claude-flow/cli hooks session-start --auto-configure

# 4. Test full pipeline
advocate validate-email test.eml --mode=full-auto --json
```

---

**Validation consolidation plan ready for execution. Phase 1 prioritizes Trial #1 prep (semi-auto), Phase 2 enables full automation post-trial.**
