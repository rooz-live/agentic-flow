#!/bin/bash
# scripts/validators/validate-email-master.sh
# Purpose: Master email validation pipeline with backup/comparison + WSJF integration
# Exit Code: 0=send-safe, 1=blocker, 2=warning, 3=deps-missing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_PATH="$(cd "$SCRIPT_DIR/.." && pwd)/validation-core.sh"
if [ -f "$CORE_PATH" ]; then
    source "$CORE_PATH"
else
    EXIT_SUCCESS=0
    EXIT_SUCCESS_WITH_WARNINGS=1
    EXIT_INVALID_ARGS=10
    EXIT_TOOL_MISSING=60
    EXIT_SCHEMA_VALIDATION_FAILED=100
    EXIT_DUPLICATE_DETECTED=120
fi

EMAIL_FILE="$1"
BACKUP_MODE="${2:-auto}"  # auto, force, skip

if [ -z "$EMAIL_FILE" ] || [ ! -f "$EMAIL_FILE" ]; then
  echo "❌ Usage: $0 <email-file.eml> [backup-mode: auto|force|skip]"
  echo "   backup-mode: auto (default, backup if not exists), force (always backup), skip (no backup)"
  exit $EXIT_INVALID_ARGS
fi

EXIT_CODE=$EXIT_SUCCESS
VALIDATORS_DIR="$SCRIPT_DIR"  # Use robust absolute path (SCRIPT_DIR computed via cd+pwd at top)
BACKUP_DIR="$(dirname "$EMAIL_FILE")/SENT_BACKUPS"

# Initialize per-stage exit codes (avoid unbound variable in summary)
LEAN_EXIT=0
DUPE_EXIT=0
PRESEND_EXIT=0
BOUNCE_EXIT=0

echo "🔍 Email Validation Pipeline Starting..."
echo "   File: $(basename "$EMAIL_FILE")"
echo "   Backup Mode: $BACKUP_MODE"
echo ""

# CSQBM Governance Constraint: Trace Master Top-Level Routing
local_proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
[ -f "$local_proj_root/scripts/validation-core.sh" ] && source "$local_proj_root/scripts/validation-core.sh" || true

# ===================================
# STAGE 0: Backup + Comparison
# ===================================
if [ "$BACKUP_MODE" != "skip" ]; then
  echo "═══ STAGE 0: Backup + Comparison ═══"

  # Create backup directory if not exists
  mkdir -p "$BACKUP_DIR"

  BACKUP_FILE="$BACKUP_DIR/$(basename "$EMAIL_FILE" .eml)-$(date +%Y%m%d-%H%M%S).eml"

  # Check if backup already exists (for auto mode)
  EXISTING_BACKUP=$(find "$BACKUP_DIR" -name "$(basename "$EMAIL_FILE" .eml)-*.eml" | head -1)

  if [ -n "$EXISTING_BACKUP" ] && [ "$BACKUP_MODE" = "auto" ]; then
    echo "ℹ️  Existing backup found: $(basename "$EXISTING_BACKUP")"

    # Compare current vs backup
    DIFF_COUNT=$(diff "$EMAIL_FILE" "$EXISTING_BACKUP" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$DIFF_COUNT" -eq 0 ]; then
      echo "✅ No changes since last backup (identical)"
    else
      echo "⚠️  Changes detected: $DIFF_COUNT diff lines"
      echo "   Creating new backup: $(basename "$BACKUP_FILE")"
      cp "$EMAIL_FILE" "$BACKUP_FILE"
    fi
  else
    echo "📦 Creating backup: $(basename "$BACKUP_FILE")"
    cp "$EMAIL_FILE" "$BACKUP_FILE"
  fi

  echo ""
fi

# ===================================
# STAGE 0.5: Lean Fast-Fail Gate
# ===================================
echo "═══ STAGE 0.5: Lean Fast-Fail Gate ═══"
LEAN_GATE="$VALIDATORS_DIR/email-gate-lean.sh"
if [ -f "$LEAN_GATE" ]; then
  bash "$LEAN_GATE" --file "$EMAIL_FILE"
  LEAN_EXIT=$?
  case $LEAN_EXIT in
    0)   echo "✅ Lean gate passed" ;;
    2|160) echo "⚠️  Lean gate passed with warnings" ;;
    150)
      echo "❌ BLOCKER: Lean gate failed (placeholders/bounds/contact)"
      echo "   Fix issues before running heavier stages."
      EXIT_CODE=150
      echo ""
      echo "Exit Code: $EXIT_CODE"
      exit $EXIT_CODE
      ;;
    *)
      echo "⚠️  Lean gate returned unexpected exit $LEAN_EXIT (continuing)"
      ;;
  esac
else
  echo "⚠️  WARNING: email-gate-lean.sh not found (skipping fast-fail)"
fi
echo ""

# ===================================
# STAGE 1: Dupe Detection
# ===================================
echo "═══ STAGE 1: Dupe Detection ═══"
if [ -f "$VALIDATORS_DIR/validate-email-dupe.sh" ]; then
  bash "$VALIDATORS_DIR/validate-email-dupe.sh" "$EMAIL_FILE"
  DUPE_EXIT=$?
  if [ $DUPE_EXIT -eq $EXIT_DUPLICATE_DETECTED ] || [ $DUPE_EXIT -eq 1 ]; then
    echo "❌ BLOCKER: Duplicate email detected"
    EXIT_CODE=$EXIT_DUPLICATE_DETECTED
  fi
else
  echo "⚠️  WARNING: validate-email-dupe.sh not found"
  EXIT_CODE=$EXIT_TOOL_MISSING
fi
echo ""

# ===================================
# STAGE 2: Pre-send Validation
# ===================================
echo "═══ STAGE 2: Pre-send Validation ═══"
if [ -f "$VALIDATORS_DIR/validate-email-pre-send.sh" ]; then
  bash "$VALIDATORS_DIR/validate-email-pre-send.sh" "$EMAIL_FILE"
  PRESEND_EXIT=$?
  if [ $PRESEND_EXIT -eq $EXIT_SCHEMA_VALIDATION_FAILED ] || [ $PRESEND_EXIT -eq 1 ]; then
    echo "❌ BLOCKER: Pre-send validation failed"
    EXIT_CODE=$EXIT_SCHEMA_VALIDATION_FAILED
  fi
else
  echo "⚠️  WARNING: validate-email-pre-send.sh not found"
  EXIT_CODE=$EXIT_TOOL_MISSING
fi
echo ""

# ===================================
# STAGE 3: Response Tracking
# ===================================
echo "═══ STAGE 3: Response Tracking ═══"
if [ -f "$VALIDATORS_DIR/validate-email-response-track.sh" ]; then
  bash "$VALIDATORS_DIR/validate-email-response-track.sh" "$EMAIL_FILE"
else
  echo "⚠️  WARNING: validate-email-response-track.sh not found"
fi
echo ""

# ===================================
# STAGE 4: Bounce Detection
# ===================================
echo "═══ STAGE 4: Bounce Detection ═══"
SENT_DIR=$(dirname "$EMAIL_FILE" | sed 's/SENT.*/INBOUND/')
if [ -f "$VALIDATORS_DIR/validate-email-bounce-detect.sh" ]; then
  bash "$VALIDATORS_DIR/validate-email-bounce-detect.sh" "$SENT_DIR"
  BOUNCE_EXIT=$?
  if [ $BOUNCE_EXIT -eq 2 ]; then
    echo "⚠️  WARNING: Bounce history exists for this recipient"
  fi
else
  echo "⚠️  WARNING: validate-email-bounce-detect.sh not found"
fi
echo ""

# ===================================
# STAGE 5: WSJF Memory Integration
# ===================================
echo "═══ STAGE 5: WSJF Memory Integration ═══"
RECIPIENT=$(grep -E "^To:" "$EMAIL_FILE" | head -1 | sed 's/^To: //' | tr -d '\r')
SUBJECT=$(grep -E "^Subject:" "$EMAIL_FILE" | head -1 | sed 's/^Subject: //' | tr -d '\r')

if command -v npx >/dev/null 2>&1; then
  echo "📝 Storing email metadata in WSJF memory..."

  # Store email send event
  npx @claude-flow/cli@latest memory store \
    --namespace "email-tracking" \
    --key "email-sent-$(date +%Y%m%d-%H%M%S)" \
    --value "{\"to\":\"$RECIPIENT\",\"subject\":\"$SUBJECT\",\"file\":\"$(basename "$EMAIL_FILE")\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    2>&1 | grep -E "✅|❌" || true
else
  echo "⚠️  WARNING: npx not available, skipping WSJF memory integration"
fi
echo ""

# ===================================
# FINAL SUMMARY
# ===================================
echo "════════════════════════════════════════"
echo "📊 Validation Summary"
echo "════════════════════════════════════════"
echo "   Lean Gate: $([ $LEAN_EXIT -eq 0 ] 2>/dev/null && echo '✅ PASS' || echo '⚠️  WARN')"
echo "   Dupe Check: $([ $DUPE_EXIT -eq 0 ] 2>/dev/null && echo '✅ PASS' || echo '❌ FAIL')"
echo "   Pre-send: $([ $PRESEND_EXIT -eq 0 ] 2>/dev/null && echo '✅ PASS' || echo '❌ FAIL')"
echo "   Bounce History: $([ $BOUNCE_EXIT -eq 0 ] 2>/dev/null && echo '✅ CLEAN' || echo '⚠️  EXISTS')"
echo ""

# Exit code interpretation
if [ $EXIT_CODE -eq $EXIT_SUCCESS ]; then
  echo "🎯 VERDICT: SEND-SAFE (exit code $EXIT_SUCCESS)"
  echo "   ✅ All validations passed"
  echo "   ✅ Email is ready to send"
elif [ $EXIT_CODE -eq $EXIT_DUPLICATE_DETECTED ] || [ $EXIT_CODE -eq $EXIT_SCHEMA_VALIDATION_FAILED ]; then
  echo "🚫 VERDICT: BLOCKER (exit code $EXIT_CODE)"
  echo "   ❌ Critical validation failed"
  echo "   ❌ DO NOT SEND until resolved"
elif [ $EXIT_CODE -eq $EXIT_SUCCESS_WITH_WARNINGS ]; then
  echo "⚠️  VERDICT: WARNING (exit code $EXIT_SUCCESS_WITH_WARNINGS)"
  echo "   ⚠️  Non-critical issues detected"
  echo "   ✅ Safe to send with caution"
elif [ $EXIT_CODE -eq $EXIT_TOOL_MISSING ]; then
  echo "🔧 VERDICT: DEPS-MISSING (exit code $EXIT_TOOL_MISSING)"
  echo "   ⚠️  Some validators not found"
  echo "   ⚠️  Manual review recommended"
fi

echo ""
echo "Exit Code: $EXIT_CODE"
exit $EXIT_CODE
