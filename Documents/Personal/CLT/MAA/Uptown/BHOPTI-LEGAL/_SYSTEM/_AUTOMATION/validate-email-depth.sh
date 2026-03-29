#!/bin/bash
# validate-email-depth.sh
# Strategic depth validator for .eml files
# Usage: ./validate-email-depth.sh path/to/email.eml
# Exit 0 = PASS (strategic depth adequate)
# Exit 160 = FAIL (low strategic depth score)
# Exit 161 = FAIL (missing urgency framing)
# Exit 162 = FAIL (missing consequence articulation)
# Exit 163 = FAIL (missing authority invocation)
# Exit 164 = FAIL (missing business value)
# Exit 165 = FAIL (missing relationship context)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=exit-codes.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/exit-codes.sh" 2>/dev/null || true

# Exit code constants
EXIT_SUCCESS=0
EXIT_WSJF_SCORE_LOW=160
EXIT_MISSING_URGENCY=161
EXIT_MISSING_CONSEQUENCES=162
EXIT_MISSING_AUTHORITY=163
EXIT_MISSING_BUSINESS_VALUE=164
EXIT_MISSING_RELATIONSHIP_CONTEXT=165

EML_FILE="${1:-}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ PASS${NC} $*"; }
fail() { echo -e "${RED}❌ FAIL${NC} $*"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC} $*"; }
info() { echo -e "${BLUE}ℹ️  INFO${NC} $*"; }

if [[ -z "$EML_FILE" ]]; then
  echo "Usage: $0 path/to/email.eml"
  exit 10
fi

if [[ ! -f "$EML_FILE" ]]; then
  fail "File not found: $EML_FILE"
  exit 11
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EMAIL STRATEGIC DEPTH VALIDATOR"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
info "Analyzing: ${EML_FILE##*/}"
echo ""

# Scoring dimensions (0-10 each, max 70)
SCORE=0
FAILURES=0
FAIL_EXIT_CODE=0

# ─── DIMENSION 1: URGENCY FRAMING ─────────────────────────────────────────────
echo "━━━ DIMENSION 1: Urgency Framing ━━━"
URGENCY_SCORE=0

# Check for deadline language
if grep -qiE "(urgent|deadline|due|by [A-Z][a-z]+ [0-9]+|within [0-9]+ days)" "$EML_FILE"; then
  URGENCY_SCORE=$((URGENCY_SCORE + 3))
  pass "Contains deadline/urgency language (+3)"
else
  warn "No explicit deadline/urgency language"
fi

# Check for specific date references
if grep -qE "[A-Z][a-z]+ [0-9]{1,2}, 20[0-9]{2}" "$EML_FILE"; then
  URGENCY_SCORE=$((URGENCY_SCORE + 2))
  pass "Contains specific dates (+2)"
fi

# Check for time pressure indicators
if grep -qiE "(immediate|asap|time-sensitive|pressing|critical timeline)" "$EML_FILE"; then
  URGENCY_SCORE=$((URGENCY_SCORE + 2))
  pass "Contains time pressure indicators (+2)"
fi

# Check for subject line urgency
SUBJECT=$(grep -i "^Subject:" "$EML_FILE" | head -1 | sed 's/^Subject: *//i')
if echo "$SUBJECT" | grep -qiE "(urgent|deadline|action required|time-sensitive)"; then
  URGENCY_SCORE=$((URGENCY_SCORE + 3))
  pass "Subject line conveys urgency (+3)"
else
  warn "Subject line lacks urgency markers"
fi

echo "Urgency Score: ${URGENCY_SCORE}/10"
SCORE=$((SCORE + URGENCY_SCORE))
if [[ $URGENCY_SCORE -lt 5 ]]; then
  fail "Urgency framing inadequate (${URGENCY_SCORE}/10)"
  FAILURES=$((FAILURES + 1))
  FAIL_EXIT_CODE="${EXIT_MISSING_URGENCY}"
fi
echo ""

# ─── DIMENSION 2: CONSEQUENCE ARTICULATION ────────────────────────────────────
echo "━━━ DIMENSION 2: Consequence Articulation ━━━"
CONSEQUENCE_SCORE=0

# Check for "if not" / "otherwise" language
if grep -qiE "(if (you|we|I|not|no)|otherwise|alternatively|failing (to|that))" "$EML_FILE"; then
  CONSEQUENCE_SCORE=$((CONSEQUENCE_SCORE + 3))
  pass "Contains conditional consequence language (+3)"
else
  warn "No explicit consequences articulated"
fi

# Check for cost/loss framing
if grep -qiE "(\\\$|cost|expense|loss|risk|penalty|damage)" "$EML_FILE"; then
  CONSEQUENCE_SCORE=$((CONSEQUENCE_SCORE + 3))
  pass "Quantifies costs/losses (+3)"
fi

# Check for escalation path
if grep -qiE "(escalate|next step|proceed (to|with)|arbitration|litigation|court)" "$EML_FILE"; then
  CONSEQUENCE_SCORE=$((CONSEQUENCE_SCORE + 4))
  pass "Defines escalation path (+4)"
else
  warn "No escalation path defined"
fi

echo "Consequence Score: ${CONSEQUENCE_SCORE}/10"
SCORE=$((SCORE + CONSEQUENCE_SCORE))
if [[ $CONSEQUENCE_SCORE -lt 5 ]]; then
  fail "Consequence articulation weak (${CONSEQUENCE_SCORE}/10)"
  FAILURES=$((FAILURES + 1))
  [[ $FAIL_EXIT_CODE -eq 0 ]] && FAIL_EXIT_CODE="${EXIT_MISSING_CONSEQUENCES}"
fi
echo ""

# ─── DIMENSION 3: AUTHORITY INVOCATION ────────────────────────────────────────
echo "━━━ DIMENSION 3: Authority Invocation ━━━"
AUTHORITY_SCORE=0

# Check for court/judge references
if grep -qiE "(judge|court|ruling|order|magistrate|justice|tribunal)" "$EML_FILE"; then
  AUTHORITY_SCORE=$((AUTHORITY_SCORE + 4))
  pass "Invokes judicial authority (+4)"
fi

# Check for specific authority names
if grep -qE "[A-Z][a-z]+ [A-Z][a-z]+ (said|ordered|requested|directed|ruled)" "$EML_FILE"; then
  AUTHORITY_SCORE=$((AUTHORITY_SCORE + 3))
  pass "Names specific authority figure (+3)"
fi

# Check for case/docket numbers
if grep -qE "[0-9]{2}[A-Z]{2}[0-9]{6}" "$EML_FILE"; then
  AUTHORITY_SCORE=$((AUTHORITY_SCORE + 2))
  pass "Cites case/docket number (+2)"
fi

# Check for legal citations
if grep -qE "(pursuant to|per|in accordance with|as directed by)" "$EML_FILE"; then
  AUTHORITY_SCORE=$((AUTHORITY_SCORE + 1))
  pass "Uses formal authority language (+1)"
fi

echo "Authority Score: ${AUTHORITY_SCORE}/10"
SCORE=$((SCORE + AUTHORITY_SCORE))
if [[ $AUTHORITY_SCORE -lt 4 ]]; then
  fail "Authority invocation weak (${AUTHORITY_SCORE}/10)"
  FAILURES=$((FAILURES + 1))
  [[ $FAIL_EXIT_CODE -eq 0 ]] && FAIL_EXIT_CODE="${EXIT_MISSING_AUTHORITY}"
fi
echo ""

# ─── DIMENSION 4: BUSINESS VALUE ──────────────────────────────────────────────
echo "━━━ DIMENSION 4: Business Value ━━━"
BUSINESS_VALUE_SCORE=0

# Check for financial figures
DOLLAR_MENTIONS=$(grep -oE '\$[0-9,]+' "$EML_FILE" | wc -l | tr -d ' ')
if [[ $DOLLAR_MENTIONS -gt 0 ]]; then
  BUSINESS_VALUE_SCORE=$((BUSINESS_VALUE_SCORE + 3))
  pass "Quantifies financial value (${DOLLAR_MENTIONS} amounts) (+3)"
else
  warn "No financial quantification"
fi

# Check for cost comparison
if grep -qiE "(cheaper|less expensive|save|savings|reduce|lower cost)" "$EML_FILE"; then
  BUSINESS_VALUE_SCORE=$((BUSINESS_VALUE_SCORE + 3))
  pass "Articulates cost savings (+3)"
fi

# Check for efficiency/time savings
if grep -qiE "(faster|quicker|efficient|streamline|avoid)" "$EML_FILE"; then
  BUSINESS_VALUE_SCORE=$((BUSINESS_VALUE_SCORE + 2))
  pass "Articulates efficiency gains (+2)"
fi

# Check for risk mitigation
if grep -qiE "(mitigate|reduce risk|protect|avoid (loss|damage|cost))" "$EML_FILE"; then
  BUSINESS_VALUE_SCORE=$((BUSINESS_VALUE_SCORE + 2))
  pass "Articulates risk mitigation (+2)"
fi

echo "Business Value Score: ${BUSINESS_VALUE_SCORE}/10"
SCORE=$((SCORE + BUSINESS_VALUE_SCORE))
if [[ $BUSINESS_VALUE_SCORE -lt 5 ]]; then
  fail "Business value articulation weak (${BUSINESS_VALUE_SCORE}/10)"
  FAILURES=$((FAILURES + 1))
  [[ $FAIL_EXIT_CODE -eq 0 ]] && FAIL_EXIT_CODE="${EXIT_MISSING_BUSINESS_VALUE}"
fi
echo ""

# ─── DIMENSION 5: RELATIONSHIP CONTEXT ────────────────────────────────────────
echo "━━━ DIMENSION 5: Relationship Context ━━━"
RELATIONSHIP_SCORE=0

# Check for past interaction references
if grep -qiE "(previous|prior|last|earlier|we (discussed|spoke|met))" "$EML_FILE"; then
  RELATIONSHIP_SCORE=$((RELATIONSHIP_SCORE + 3))
  pass "References prior interactions (+3)"
else
  warn "No relationship history referenced"
fi

# Check for specific dates of past interactions
if grep -qE "(on|dated) [A-Z][a-z]+ [0-9]{1,2}" "$EML_FILE"; then
  RELATIONSHIP_SCORE=$((RELATIONSHIP_SCORE + 2))
  pass "Cites specific interaction dates (+2)"
fi

# Check for status update language
if grep -qiE "(status|update|following up|checking in|per (our|your))" "$EML_FILE"; then
  RELATIONSHIP_SCORE=$((RELATIONSHIP_SCORE + 2))
  pass "Frames as relationship update (+2)"
fi

# Check for mutual benefit framing
if grep -qiE "(we|both|mutual|together|coordinate)" "$EML_FILE"; then
  RELATIONSHIP_SCORE=$((RELATIONSHIP_SCORE + 2))
  pass "Uses collaborative language (+2)"
fi

# Penalty for no-reply elapsed time (if detectable)
if grep -qiE "(no response|haven't heard|awaiting|still waiting)" "$EML_FILE"; then
  RELATIONSHIP_SCORE=$((RELATIONSHIP_SCORE + 1))
  pass "Acknowledges communication gap (+1)"
fi

echo "Relationship Score: ${RELATIONSHIP_SCORE}/10"
SCORE=$((SCORE + RELATIONSHIP_SCORE))
if [[ $RELATIONSHIP_SCORE -lt 5 ]]; then
  fail "Relationship context inadequate (${RELATIONSHIP_SCORE}/10)"
  FAILURES=$((FAILURES + 1))
  [[ $FAIL_EXIT_CODE -eq 0 ]] && FAIL_EXIT_CODE="${EXIT_MISSING_RELATIONSHIP_CONTEXT}"
fi
echo ""

# ─── DIMENSION 6: CLARITY & STRUCTURE ─────────────────────────────────────────
echo "━━━ DIMENSION 6: Clarity & Structure ━━━"
CLARITY_SCORE=0

# Check for section headers
SECTION_COUNT=$(grep -cE "^\*\*[A-Z]" "$EML_FILE" 2>/dev/null || echo 0)
if [[ $SECTION_COUNT -ge 3 ]]; then
  CLARITY_SCORE=$((CLARITY_SCORE + 3))
  pass "Well-structured (${SECTION_COUNT} sections) (+3)"
elif [[ $SECTION_COUNT -ge 1 ]]; then
  CLARITY_SCORE=$((CLARITY_SCORE + 1))
  pass "Some structure (${SECTION_COUNT} sections) (+1)"
else
  warn "No clear section headers"
fi

# Check for numbered lists
LIST_COUNT=$(grep -cE "^[0-9]+\." "$EML_FILE" 2>/dev/null || echo 0)
if [[ $LIST_COUNT -ge 3 ]]; then
  CLARITY_SCORE=$((CLARITY_SCORE + 2))
  pass "Uses numbered lists (${LIST_COUNT} items) (+2)"
fi

# Check for bullet points
BULLET_COUNT=$(grep -cE "^[-•*] " "$EML_FILE" 2>/dev/null || echo 0)
if [[ $BULLET_COUNT -ge 3 ]]; then
  CLARITY_SCORE=$((CLARITY_SCORE + 2))
  pass "Uses bullet points (${BULLET_COUNT} items) (+2)"
fi

# Check for clear CTA (call to action)
if grep -qiE "(please|kindly|request|need|require)" "$EML_FILE"; then
  CLARITY_SCORE=$((CLARITY_SCORE + 2))
  pass "Contains clear call to action (+2)"
fi

# Penalty for excessive length
LINE_COUNT=$(wc -l < "$EML_FILE" | tr -d ' ')
if [[ $LINE_COUNT -gt 100 ]]; then
  CLARITY_SCORE=$((CLARITY_SCORE - 2))
  warn "Email very long (${LINE_COUNT} lines), may reduce clarity (-2)"
fi

echo "Clarity Score: ${CLARITY_SCORE}/10"
SCORE=$((SCORE + CLARITY_SCORE))
echo ""

# ─── DIMENSION 7: ACTIONABILITY ───────────────────────────────────────────────
echo "━━━ DIMENSION 7: Actionability ━━━"
ACTIONABILITY_SCORE=0

# Check for "Next Steps" section
if grep -qiE "next steps?:" "$EML_FILE"; then
  ACTIONABILITY_SCORE=$((ACTIONABILITY_SCORE + 3))
  pass "Contains 'Next Steps' section (+3)"
else
  warn "No explicit 'Next Steps' section"
fi

# Check for specific asks/questions
QUESTION_COUNT=$(grep -cE "^[0-9]+\. [A-Z].*\?" "$EML_FILE" 2>/dev/null || echo 0)
if [[ $QUESTION_COUNT -ge 2 ]]; then
  ACTIONABILITY_SCORE=$((ACTIONABILITY_SCORE + 3))
  pass "Asks specific questions (${QUESTION_COUNT}) (+3)"
elif [[ $QUESTION_COUNT -ge 1 ]]; then
  ACTIONABILITY_SCORE=$((ACTIONABILITY_SCORE + 1))
  pass "Asks some questions (${QUESTION_COUNT}) (+1)"
fi

# Check for contact information
if grep -qE "[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}" "$EML_FILE"; then
  ACTIONABILITY_SCORE=$((ACTIONABILITY_SCORE + 2))
  pass "Includes contact information (+2)"
fi

# Check for alternative paths
if grep -qiE "(alternative|if not|otherwise|either.*or)" "$EML_FILE"; then
  ACTIONABILITY_SCORE=$((ACTIONABILITY_SCORE + 2))
  pass "Offers alternative paths (+2)"
fi

echo "Actionability Score: ${ACTIONABILITY_SCORE}/10"
SCORE=$((SCORE + ACTIONABILITY_SCORE))
echo ""

# ─── FINAL SCORING ────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STRATEGIC DEPTH FINAL SCORE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Score: ${SCORE}/70"
echo ""

PERCENTAGE=$((SCORE * 100 / 70))

if [[ $SCORE -ge 50 ]]; then
  pass "EXCELLENT depth (${PERCENTAGE}%) - strategic maturity demonstrated"
  EXIT_CODE=0
elif [[ $SCORE -ge 40 ]]; then
  pass "GOOD depth (${PERCENTAGE}%) - acceptable strategic quality"
  EXIT_CODE=0
elif [[ $SCORE -ge 30 ]]; then
  warn "ADEQUATE depth (${PERCENTAGE}%) - consider strengthening weak dimensions"
  EXIT_CODE=0
else
  fail "INSUFFICIENT depth (${PERCENTAGE}%) - lacks strategic maturity"
  EXIT_CODE="${FAIL_EXIT_CODE:-160}"
fi

echo ""
echo "Dimension Breakdown:"
echo "  1. Urgency Framing:       ${URGENCY_SCORE}/10"
echo "  2. Consequences:          ${CONSEQUENCE_SCORE}/10"
echo "  3. Authority Invocation:  ${AUTHORITY_SCORE}/10"
echo "  4. Business Value:        ${BUSINESS_VALUE_SCORE}/10"
echo "  5. Relationship Context:  ${RELATIONSHIP_SCORE}/10"
echo "  6. Clarity & Structure:   ${CLARITY_SCORE}/10"
echo "  7. Actionability:         ${ACTIONABILITY_SCORE}/10"
echo ""

if [[ $FAILURES -gt 0 ]]; then
  fail "Failed ${FAILURES} critical dimension(s)"
  echo ""
  echo "Recommendations:"
  [[ $URGENCY_SCORE -lt 5 ]] && echo "  • Add explicit deadline/urgency language"
  [[ $CONSEQUENCE_SCORE -lt 5 ]] && echo "  • Articulate consequences of inaction"
  [[ $AUTHORITY_SCORE -lt 4 ]] && echo "  • Invoke relevant authority (court/judge/law)"
  [[ $BUSINESS_VALUE_SCORE -lt 5 ]] && echo "  • Quantify business value/cost savings"
  [[ $RELATIONSHIP_SCORE -lt 5 ]] && echo "  • Add relationship history/context"
fi

echo ""
exit "$EXIT_CODE"
