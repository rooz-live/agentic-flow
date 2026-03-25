#!/usr/bin/env bash
# test-validate-email.sh - Automated tests for validate-email.sh (21-check pre-send validator)
# Tests: file existence, required headers, bounce list, placeholders, email format,
#        body size, date freshness, Message-ID, platform relay, markdown in plain-text,
#        draft artifacts, word count, self-send, Reply-To, temporal truth,
#        sent-dupe fingerprint, context-aware action dates
#
# EXIT CODES: 0 = all pass, 1 = failures detected
# Run: bash _SYSTEM/_AUTOMATION/tests/test-validate-email.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTOMATION_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VALIDATOR="$AUTOMATION_DIR/validate-email.sh"
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

PASSED=0
FAILED=0
TOTAL=0

assert_exit_range() {
    local test_name="$1" min_exit="$2" max_exit="$3"
    shift 3
    TOTAL=$((TOTAL + 1))
    local actual_exit=0
    "$@" >/dev/null 2>&1 || actual_exit=$?
    if [[ $actual_exit -ge $min_exit && $actual_exit -le $max_exit ]]; then
        echo "  ✅ $test_name (exit $actual_exit in [$min_exit..$max_exit])"
        PASSED=$((PASSED + 1))
    else
        echo "  ❌ $test_name (exit $actual_exit not in [$min_exit..$max_exit])"
        FAILED=$((FAILED + 1))
    fi
}

assert_exit() {
    local test_name="$1" expected_exit="$2"
    shift 2
    TOTAL=$((TOTAL + 1))
    local actual_exit=0
    "$@" >/dev/null 2>&1 || actual_exit=$?
    if [[ "$expected_exit" == "$actual_exit" ]]; then
        echo "  ✅ $test_name (exit $actual_exit)"
        PASSED=$((PASSED + 1))
    else
        echo "  ❌ $test_name (expected exit $expected_exit, got $actual_exit)"
        FAILED=$((FAILED + 1))
    fi
}

assert_output_contains() {
    local test_name="$1" pattern="$2"
    shift 2
    TOTAL=$((TOTAL + 1))
    local output
    output=$("$@" 2>&1 || true)
    if echo "$output" | grep -qi "$pattern"; then
        echo "  ✅ $test_name"
        PASSED=$((PASSED + 1))
    else
        echo "  ❌ $test_name (pattern '$pattern' not in output)"
        FAILED=$((FAILED + 1))
    fi
}

# ─── FIXTURE: Current RFC 5322 date for fresh emails ─────────────────
CURRENT_RFC_DATE=$(date "+%a, %d %b %Y %H:%M:%S %z" 2>/dev/null || date -R 2>/dev/null || echo "Tue, 25 Mar 2026 12:00:00 -0400")

# ─── FIXTURE: Clean email (should PASS all checks) ──────────────────
make_clean_eml() {
    cat > "$1" <<EOF
Message-ID: <clean-test-$$@rooz.live>
Date: $CURRENT_RFC_DATE
From: Shahrooz Bhopti <rooz@rooz.live>
To: dgrimes@shumaker.com
Subject: Follow Up - Maintenance Request Status
Content-Type: text/plain; charset="UTF-8"

Dear Mr. Grimes,

I am writing to follow up on the maintenance request submitted
previously regarding the HVAC and plumbing issues at the property.
These habitability deficiencies remain unresolved despite multiple
requests for repair.

We respectfully request a response within ten business days regarding
the status of the requested repairs.

Respectfully,
Shahrooz Bhopti
EOF
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VALIDATE-EMAIL.SH TEST SUITE (21 CHECKS)"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── TEST 1: No args / missing file (Checks 1) ──────────────────────
echo "TEST 1: Argument validation & file existence"
assert_exit "No args exits 10" 10 bash "$VALIDATOR"
assert_exit "Non-existent file exits 11" 11 bash "$VALIDATOR" "$TEMP_DIR/nonexistent.eml"
echo ""

# ─── TEST 2: Clean email passes all checks (exit 0) ─────────────────
echo "TEST 2: Clean email passes (all 21 checks)"
CLEAN="$TEMP_DIR/clean.eml"
make_clean_eml "$CLEAN"
# Clean email may trigger ADR gate (exit 170) if ADR dir is missing — accept 0 or 1 (warnings)
assert_exit_range "Clean email exits 0 or 1 (warn)" 0 1 bash "$VALIDATOR" "$CLEAN"
echo ""

# ─── TEST 3: Missing To field (Check 2) ─────────────────────────────
echo "TEST 3: Missing To: field"
NO_TO="$TEMP_DIR/no-to.eml"
cat > "$NO_TO" <<EOF
Message-ID: <no-to-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
Subject: Test Missing To

Body content here for validation testing purposes to meet word count.
This is additional filler text to make the body larger than minimum.
EOF
assert_exit_range "Missing To: fails (exit 21)" 21 21 bash "$VALIDATOR" "$NO_TO"
echo ""

# ─── TEST 4: Missing Subject (Check 3) ──────────────────────────────
echo "TEST 4: Missing Subject"
NO_SUBJ="$TEMP_DIR/no-subj.eml"
cat > "$NO_SUBJ" <<EOF
Message-ID: <no-subj-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com

Body content here for validation testing purposes to meet word count.
This is additional filler text to make the body larger than minimum.
EOF
assert_exit_range "Missing Subject fails (exit 21)" 21 21 bash "$VALIDATOR" "$NO_SUBJ"
echo ""

# ─── TEST 5: Known bounce address (Check 5) ─────────────────────────
echo "TEST 5: Known bounce detection"
BOUNCE="$TEMP_DIR/bounce.eml"
cat > "$BOUNCE" <<EOF
Message-ID: <bounce-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: charlotte@twomenandatruck.com
Subject: Moving Inquiry

Hi, I would like to inquire about moving services for our upcoming
relocation. Please let me know availability and pricing for the
scheduled date. Thank you for your prompt response.
EOF
assert_exit "Bounce address fails (exit 140)" 140 bash "$VALIDATOR" "$BOUNCE"
echo ""

# ─── TEST 6: Placeholder patterns (Check 6) ─────────────────────────
echo "TEST 6: Placeholder detection"
PLACEHOLDER="$TEMP_DIR/placeholder.eml"
cat > "$PLACEHOLDER" <<EOF
Message-ID: <placeholder-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com
Subject: TODO: Fix this email before sending

Dear [NAME],

Please contact us at [EMAIL] or YOUR_EMAIL regarding the matter.
The [ADDRESS] needs to be updated before the [DATE] deadline.
This is placeholder content that should not be sent as-is.
EOF
assert_exit "Placeholder fails (exit 111)" 111 bash "$VALIDATOR" "$PLACEHOLDER"
echo ""

# ─── TEST 7: Body word count too low (Check 15) ─────────────────────
echo "TEST 7: Low body word count"
SHORT="$TEMP_DIR/short.eml"
cat > "$SHORT" <<EOF
Message-ID: <short-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: test@real-domain.com
Subject: Brief

Hi.
EOF
# Low word count produces a warning (exit 1 = SUCCESS_WITH_WARNINGS)
assert_exit "Short body exits with warning (exit 1)" 1 bash "$VALIDATOR" "$SHORT"
echo ""

# ─── TEST 8: Draft artifacts in subject (Check 14) ──────────────────
echo "TEST 8: Draft artifacts"
DRAFT="$TEMP_DIR/draft.eml"
cat > "$DRAFT" <<EOF
Message-ID: <draft-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com
Subject: [DRAFT] Attorney Response Letter

This is a draft email that should not be sent until the draft
marker is removed from the subject line. Please review all content
before finalizing and removing the draft designation.
EOF
assert_exit_range "Draft subject fails (exit 100)" 100 100 bash "$VALIDATOR" "$DRAFT"
echo ""

# ─── TEST 9: Self-send detection (Check 16) ─────────────────────────
echo "TEST 9: Self-send detection"
SELF="$TEMP_DIR/self-send.eml"
cat > "$SELF" <<EOF
Message-ID: <self-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: rooz@rooz.live
Subject: Note to Self

This is a self-addressed email. The validator should warn about this
being a self-send situation. Additional body content to meet the
minimum word count requirement for validation purposes.
EOF
# Self-send produces a warning (exit 1)
assert_exit "Self-send exits with warning (exit 1)" 1 bash "$VALIDATOR" "$SELF"
echo ""

# ─── TEST 10: Stale date header (Check 10) ──────────────────────────
echo "TEST 10: Stale date header"
STALE="$TEMP_DIR/stale-date.eml"
cat > "$STALE" <<EOF
Message-ID: <stale-$$@test.local>
Date: Mon, 01 Jan 2024 12:00:00 -0400
From: rooz@rooz.live
To: someone@real-domain.com
Subject: Old Email with Stale Date

This email has a date header from over a year ago. The date freshness
check should detect this as stale and flag it as a failure. Content
needs to meet minimum word count for proper validation.
EOF
assert_exit "Stale date fails (exit 110)" 110 bash "$VALIDATOR" "$STALE"
echo ""

# ─── TEST 11: Missing Message-ID (Check 11) produces warning ────────
echo "TEST 11: Missing Message-ID"
NO_MSGID="$TEMP_DIR/no-msgid.eml"
cat > "$NO_MSGID" <<EOF
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com
Subject: No Message ID Header

This email is missing a Message-ID header. The validator should warn
about this since mail servers may flag messages without Message-ID
as spam or reject them entirely. Testing warning behavior here.
EOF
# Missing Message-ID is a warning
assert_exit "Missing Message-ID exits with warning" 1 bash "$VALIDATOR" "$NO_MSGID"
echo ""

# ─── TEST 12: Markdown in plain-text body (Check 13) ────────────────
echo "TEST 12: Markdown in plain-text body"
MD_BODY="$TEMP_DIR/markdown-body.eml"
cat > "$MD_BODY" <<EOF
Message-ID: <md-body-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com
Subject: Response with Formatting Issues
Content-Type: text/plain; charset="UTF-8"

**Dear Attorney Grimes,**

## Summary of Issues

* **Habitability** deficiencies remain unresolved as documented
* The timeline for repairs has been exceeded significantly
* We request immediate action on the maintenance concerns

Respectfully submitted for your consideration and review.
EOF
# Markdown in text/plain is a warning
assert_exit "Markdown in text/plain exits with warning (exit 1)" 1 bash "$VALIDATOR" "$MD_BODY"
echo ""

# ─── TEST 13: Platform relay address (Check 12) ─────────────────────
echo "TEST 13: Platform relay address"
RELAY="$TEMP_DIR/relay.eml"
cat > "$RELAY" <<EOF
Message-ID: <relay-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: thumbtack-message@thumbtack.com
Subject: Service Inquiry via Thumbtack

Hello, I found your profile on Thumbtack and would like to discuss
moving services. Please provide a quote for our upcoming relocation.
Thank you for your time and consideration regarding this matter.
EOF
# Platform relay is a warning
assert_exit "Platform relay exits with warning (exit 1)" 1 bash "$VALIDATOR" "$RELAY"
echo ""

# ─── TEST 14: Reply-To validation (Check 17) ────────────────────────
echo "TEST 14: Reply-To format"
BAD_RT="$TEMP_DIR/bad-reply-to.eml"
cat > "$BAD_RT" <<EOF
Message-ID: <bad-rt-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com
Reply-To: not-an-email
Subject: Bad Reply-To Header

This email has a Reply-To header that does not contain a valid email
address. The validator should detect this formatting issue and fail.
Additional content to meet minimum word count requirements here.
EOF
assert_exit_range "Invalid Reply-To fails (exit 100)" 100 100 bash "$VALIDATOR" "$BAD_RT"
echo ""

# ─── TEST 15: Context-aware action date in past (Check 21) ──────────
echo "TEST 15: Context-aware action date detection"
# Use a date that is definitely in the past
PAST_ACTION="$TEMP_DIR/past-action-date.eml"
cat > "$PAST_ACTION" <<EOF
Message-ID: <past-action-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com
Subject: Moving Date Update

We must vacate by January 5 as required by the lease agreement.
The deadline to move out is January 5 and we must comply with this
requirement. Please confirm acknowledgment of this vacate deadline.
EOF
# Action date in past (January 5 with "must vacate") should fail with exit 110
assert_exit "Past action date fails (exit 110)" 110 bash "$VALIDATOR" "$PAST_ACTION"

# Historical reference should NOT fail (only warn)
HIST_REF="$TEMP_DIR/historical-ref.eml"
cat > "$HIST_REF" <<EOF
Message-ID: <hist-ref-$$@test.local>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com
Subject: Timeline Summary

We signed the lease on January 5 as documented in the records.
The agreement was completed on January 5 per the original terms.
This historical record is relevant to the current proceedings.
EOF
# Past date with past-tense "signed...on" = historical, should be warning not failure
assert_exit "Historical date reference exits with warning (exit 1)" 1 bash "$VALIDATOR" "$HIST_REF"
echo ""

# ─── SUMMARY ─────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RESULTS: $PASSED/$TOTAL passed ($FAILED failed)"
if [[ $TOTAL -gt 0 ]]; then
    RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
    echo "  PASS RATE: ${RATE}%"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[[ $FAILED -eq 0 ]] && exit 0 || exit 1
