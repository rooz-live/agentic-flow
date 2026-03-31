#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=../_SYSTEM/_AUTOMATION/email-hash-db.sh
# shellcheck disable=SC1091
source "$BASE_DIR/_SYSTEM/_AUTOMATION/email-hash-db.sh"

TMP=$(mktemp -d)
export EMAIL_HASH_LOG="$TMP/hashes.log"
export EMAIL_HASH_LOCK_DIR="$TMP/locks"
trap 'rm -rf "$TMP"' EXIT

pass() { echo "PASS: $*"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

f1="$TMP/a.eml"
echo "body one" > "$f1"
f2="$TMP/b.eml"
echo "body two" > "$f2"

init_hash_db "$EMAIL_HASH_LOG"
[[ -f "$EMAIL_HASH_LOG" ]] || fail "init_hash_db should create log"

h1=$(compute_email_hash "$f1") || fail "hash f1"
h2=$(compute_email_hash "$f2") || fail "hash f2"
[[ -n "$h1" && "$h1" != "$h2" ]] || fail "hashes should differ"

if check_duplicate_email "$h1" "$EMAIL_HASH_LOG"; then fail "new hash should not duplicate"; fi
pass "check_duplicate new hash"

acquire_lock "$EMAIL_HASH_LOG"
register_hash "$h1" "a.eml" "$EMAIL_HASH_LOG"
release_lock

check_duplicate_email "$h1" "$EMAIL_HASH_LOG" || fail "registered hash should be duplicate"
pass "check_duplicate after register"

if check_duplicate_email "$h2" "$EMAIL_HASH_LOG"; then fail "h2 should not be duplicate"; fi
pass "second file still new"

echo "email-hash-db CRUD tests: OK"
exit 0
