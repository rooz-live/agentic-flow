#!/usr/bin/env bash
# test-validate-email.sh - Automated tests for validate-email.sh (22-check pre-send validator)
# Tests: file existence, required headers, bounce list, placeholders, email format,
#        body size, date freshness, Message-ID, reply thread, platform relay, markdown,
#        draft artifacts, word count, self-send, Reply-To, ADR gate, sent-dupe,
#        temporal truth, context-aware action dates, deadline proximity (CHECK 22)
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
echo "  VALIDATE-EMAIL.SH TEST SUITE (22 CHECKS)"
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

# ─── TEST 16: Reply thread headers (Check 11b) ──────────────────
echo "TEST 16: Reply thread headers (Check 11b)"
REPLY_EML="$TEMP_DIR/reply-thread.eml"
cat > "$REPLY_EML" <<EOF
Message-ID: <reply-test-$$@rooz.live>
In-Reply-To: <original-msg-123@shumaker.com>
References: <original-msg-123@shumaker.com>
Date: $CURRENT_RFC_DATE
From: Shahrooz Bhopti <rooz@rooz.live>
To: dgrimes@shumaker.com
Subject: Re: Follow-Up on Previous Discussion

Dear Mr. Grimes, following up on your message from last week.
The proposed terms remain as previously discussed and documented.
Please confirm receipt and advise on next steps for resolution.
We are prepared to move forward pending your confirmation on terms.
EOF
# Reply email with In-Reply-To/References should pass (CHECK 11b is info only)
assert_exit_range "Reply thread email passes validation" 0 1 bash "$VALIDATOR" "$REPLY_EML"
# Output should confirm In-Reply-To was detected
assert_output_contains "In-Reply-To detected in output" "In-Reply-To present" bash "$VALIDATOR" "$REPLY_EML"
echo ""

# ─── TEST 17: ADR frontmatter gate (Check 18) ──────────────────
echo "TEST 17: ADR gate (Check 18)"
# Non-legal subject: ADR gate should be skipped entirely
NONLEGAL_EML="$TEMP_DIR/nonlegal.eml"
cat > "$NONLEGAL_EML" <<EOF
Message-ID: <nonlegal-$$@rooz.live>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: someone@real-domain.com
Subject: Moving Logistics Update

Hi, just wanted to confirm the logistics for the upcoming move.
The schedule has been finalized and all parties have been notified.
Please confirm receipt of this scheduling update at your earliest convenience.
Thank you for coordinating on this important logistics matter.
EOF
assert_output_contains "Non-legal email skips ADR gate" "not a legal/case email" bash "$VALIDATOR" "$NONLEGAL_EML"

# Legal subject triggers ADR gate check path
LEGAL_EML="$TEMP_DIR/legal-subject.eml"
cat > "$LEGAL_EML" <<EOF
Message-ID: <legal-$$@rooz.live>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: dgrimes@shumaker.com
Subject: Case 26CV005596 - Arbitration Settlement Discussion

Dear Mr. Grimes, this correspondence concerns the pending arbitration.
We would like to discuss settlement options before the hearing date.
Please advise on your availability for a brief telephone conference.
All communications are made in good faith toward resolution.
EOF
assert_output_contains "Legal email triggers ADR gate path" "ADR gate" bash "$VALIDATOR" "$LEGAL_EML"
echo ""

# ─── TEST 18: Sent-dupe fingerprint detection (Check 19) ────────────
echo "TEST 18: Sent-dupe fingerprint (Check 19)"
DUPE_EML="$TEMP_DIR/dupe-test.eml"
cat > "$DUPE_EML" <<EOF
Message-ID: <dupe-check-$$@rooz.live>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: dgrimes@shumaker.com
Subject: Duplicate Detection Test

This email is used to test duplicate fingerprint detection logic.
The validator computes SHA256 of To, Subject, and body snippet.
A second attempt to send this exact email should be flagged as duplicate.
This prevents accidental re-sends of already-delivered correspondence.
EOF
# First run: no fingerprint DB → no dupe (pass/warn only)
assert_exit_range "First send: no dupe detected" 0 1 bash "$VALIDATOR" "$DUPE_EML"
# Create fingerprint entry matching this email
_to=$(grep -i '^To:' "$DUPE_EML" | head -1 | sed 's/^To: *//i' | tr -d '\r')
_subj=$(grep -i '^Subject:' "$DUPE_EML" | head -1 | sed 's/^Subject: *//i' | tr -d '\r')
_body=$(awk '/^$/{found=1; next} found{print}' "$DUPE_EML" | head -c 512 | tr -d '\n\r ')
_fp=$(echo "${_to}${_subj}${_body}" | shasum -a 256 | cut -d' ' -f1 2>/dev/null || echo "")
if [[ -n "$_fp" ]]; then
  mkdir -p "$TEMP_DIR" && echo "$_fp" > "${TEMP_DIR}/.sent-fingerprints"
  assert_exit "Dupe re-send warns (exit 1)" 1 bash "$VALIDATOR" "${TEMP_DIR}/dupe-test.eml"
  rm -f "${TEMP_DIR}/.sent-fingerprints"
fi
unset _to _subj _body _fp
echo ""

# ─── TEST 19: Temporal truth - stale 'yesterday' (Check 20) ─────────
echo "TEST 19: Temporal truth - stale 'yesterday' (Check 20)"
STALE_YEST="$TEMP_DIR/stale-yesterday.eml"
# Date header from 48 hours ago (stale)
STALE_DATE=$(date -v-48H "+%a, %d %b %Y %H:%M:%S %z" 2>/dev/null || date -d '48 hours ago' "+%a, %d %b %Y %H:%M:%S %z" 2>/dev/null || echo "$CURRENT_RFC_DATE")
cat > "$STALE_YEST" <<EOF
Message-ID: <stale-yest-$$@rooz.live>
Date: $STALE_DATE
From: rooz@rooz.live
To: dgrimes@shumaker.com
Subject: Follow Up After Meeting

Dear Mr. Grimes, yesterday's meeting covered the key settlement terms.
Yesterday we reviewed all open items and made significant progress.
I am following up today to confirm the agreements reached yesterday.
Please confirm receipt and advise on next steps for the settlement.
EOF
# Email is 48h old with 'yesterday' in body: should FAIL exit 110
assert_exit "Stale 'yesterday' fails temporal truth (exit 110)" 110 bash "$VALIDATOR" "$STALE_YEST"

# Fresh email with 'yesterday' (within 30h): should WARN not FAIL
FRESH_YEST="$TEMP_DIR/fresh-yesterday.eml"
cat > "$FRESH_YEST" <<EOF
Message-ID: <fresh-yest-$$@rooz.live>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: dgrimes@shumaker.com
Subject: Following Up on Yesterday Discussion

Dear Mr. Grimes, I am following up on yesterday's call.
Yesterday we discussed the settlement terms in detail and I wanted
to memorialize the key points for the record. Please confirm receipt.
EOF
assert_exit "Fresh 'yesterday' (within 30h) warns only (exit 1)" 1 bash "$VALIDATOR" "$FRESH_YEST"
echo ""

# ─── TEST 20: Deadline proximity - future dates within 14d (Check 22) ───
echo "TEST 20: Deadline proximity (Check 22)"
# Date 7 days from now: should trigger DEADLINE PROXIMITY warn
SOON_DATE=$(date -v+7d "+%B %-d" 2>/dev/null || date -d '7 days' "+%B %-d" 2>/dev/null || echo "April 3")
SEVEN_DAYS_EML="$TEMP_DIR/seven-days.eml"
cat > "$SEVEN_DAYS_EML" <<EOF
Message-ID: <7d-$$@rooz.live>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: dgrimes@shumaker.com
Subject: Preparing for Upcoming Hearing

Dear Mr. Grimes, I want to confirm our preparation for the hearing.
The arbitration date is set for ${SOON_DATE} and we need to finalize all
submissions well in advance. Please advise on outstanding items.
We look forward to a productive resolution of this matter.
EOF
# Future date within 14 days → WARN (exit 1 since no other failures)
assert_exit "Future date within 14d triggers proximity warn (exit 1)" 1 bash "$VALIDATOR" "$SEVEN_DAYS_EML"
assert_output_contains "Output contains DEADLINE PROXIMITY label" "DEADLINE PROXIMITY" bash "$VALIDATOR" "$SEVEN_DAYS_EML"

# Date far in future: should NOT trigger proximity warn
FAR_EML="$TEMP_DIR/far-future.eml"
cat > "$FAR_EML" <<EOF
Message-ID: <far-$$@rooz.live>
Date: $CURRENT_RFC_DATE
From: rooz@rooz.live
To: dgrimes@shumaker.com
Subject: Long Term Planning

Dear Mr. Grimes, this concerns planning for the September 2027 review.
The annual review will assess all outcomes from this litigation cycle.
We request that you retain all correspondence until December 2027.
All files should be preserved for the anticipated regulatory review.
EOF
# December 2027 is > 14 days away: no proximity warn (only other warnings)
assert_output_contains "Far future date skips proximity warn" "No imminent future dates" bash "$VALIDATOR" "$FAR_EML"
echo ""

# ─── SUMMARY ───────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RESULTS: $PASSED/$TOTAL passed ($FAILED failed)"
if [[ $TOTAL -gt 0 ]]; then
    RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)
    echo "  PASS RATE: ${RATE}%"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

[[ $FAILED -eq 0 ]] && exit 0 || exit 1
