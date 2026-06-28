#!/usr/bin/env bash
# deploy-uapi.sh — Hardened WHM/UAPI file-sync deploy.
# Extracted and hardened from scripts/deploy_uapi.sh.
#
# DoR (checked below before any network call):
#   - .env exists OR WHM_API_TOKEN already set in environment
#   - CPANEL_HOST, CPANEL_USERS_MAPPING non-empty after sourcing
#   - jq installed
#   - Playwright installed (for post-deploy validation)
#
# DoD: .goalie/evidence/deploy_uapi_{run_id}.json written with
#       domains_attempted, domains_ok, playwright_exit.
#
# Usage:
#   bash scripts/deploy/deploy-uapi.sh
#   WHM_API_TOKEN=<token> CPANEL_HOST=<host> bash scripts/deploy/deploy-uapi.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/.goalie/evidence"
ENV_FILE="$ROOT_DIR/.env"

red()    { printf "\033[31m%s\033[0m\n" "$1"; }
green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }

echo "====================================================================="
echo "🚀 DEPLOY-UAPI GATE"
echo "====================================================================="

# ── DoR Check 1: .env source ──────────────────────────────────────────────────
if [[ -f "$ENV_FILE" && -z "${DEPLOY_UAPI_TEST:-}" ]]; then
    echo "--> Sourcing $ENV_FILE..."
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
elif [[ -n "${WHM_API_TOKEN:-}" || -n "${CPANEL_PASSWORD:-}" ]]; then
    yellow "--> .env not found; using pre-set environment variables."
else
    red "❌ [DoR FAIL] .env not found at $ENV_FILE and no WHM_API_TOKEN/CPANEL_PASSWORD in environment."
    red "   Create .env with: WHM_API_TOKEN, CPANEL_HOST, CPANEL_USERS_MAPPING"
    red "   OR set WHM_API_TOKEN (preferred) / CPANEL_PASSWORD + CPANEL_USER before running."
    exit 1
fi

# Override with local cPanel credentials if present to prevent op keychain timeout
LOCAL_CPANEL_ENV="$ROOT_DIR/credentials/.env.cpanel"
if [[ -f "$LOCAL_CPANEL_ENV" && -z "${DEPLOY_UAPI_TEST:-}" ]]; then
    echo "--> Sourcing local credentials from credentials/.env.cpanel..."
    set -a
    source "$LOCAL_CPANEL_ENV"
    set +a
fi

# ── DoR Check 2: Resolve auth method ─────────────────────────────────────────
if [[ -n "${WHM_API_TOKEN:-}" ]]; then
    echo "🔑 Using WHM API Token authentication..."
    # Resolve 1Password reference if present
    if [[ "$WHM_API_TOKEN" == op://* ]]; then
        if ! command -v op &>/dev/null; then
            red "❌ [DoR FAIL] WHM_API_TOKEN is an op:// reference but 1Password CLI (op) is not installed."
            exit 1
        fi
        _resolved=$(op read "$WHM_API_TOKEN" 2>/dev/null || true)
        if [[ -z "$_resolved" ]]; then
            red "❌ [DoR FAIL] op read '$WHM_API_TOKEN' returned empty — check 1Password vault access."
            exit 1
        fi
        WHM_API_TOKEN="$_resolved"
    fi
    if [[ -z "$WHM_API_TOKEN" ]]; then
        red "❌ [DoR FAIL] WHM_API_TOKEN resolved to empty string."
        exit 1
    fi
    USE_TOKEN=true
    WHM_HOST="${CPANEL_HOST:?[DoR FAIL] CPANEL_HOST must be set}"
else
    echo "🔐 Using WHM basic auth (WHM_USER + CPANEL_PASSWORD)..."
    WHM_USER="${CPANEL_USER:?[DoR FAIL] CPANEL_USER must be set when WHM_API_TOKEN is absent}"
    if [[ -z "${CPANEL_PASSWORD:-}" ]]; then
        red "❌ [DoR FAIL] CPANEL_PASSWORD is not set."
        exit 1
    fi
    if ! command -v op &>/dev/null; then
        red "❌ [DoR FAIL] CPANEL_PASSWORD requires 1Password CLI (op) but it is not installed."
        exit 1
    fi
    WHM_PASSWORD=$(op read "$CPANEL_PASSWORD" 2>/dev/null || true)
    if [[ -z "$WHM_PASSWORD" ]]; then
        red "❌ [DoR FAIL] op read CPANEL_PASSWORD returned empty — check 1Password vault access."
        exit 1
    fi
    WHM_HOST="${CPANEL_HOST:?[DoR FAIL] CPANEL_HOST must be set}"
    USE_TOKEN=false
fi

# ── DoR Check 3: CPANEL_USERS_MAPPING ────────────────────────────────────────
if [[ -z "${CPANEL_USERS_MAPPING:-}" ]]; then
    red "❌ [DoR FAIL] CPANEL_USERS_MAPPING is not set. Must be a JSON object: {\"fqdn\": \"cpanel_user\", ...}"
    exit 1
fi
if ! echo "$CPANEL_USERS_MAPPING" | jq . &>/dev/null; then
    red "❌ [DoR FAIL] CPANEL_USERS_MAPPING is not valid JSON."
    exit 1
fi

# ── DoR Check 4: jq ──────────────────────────────────────────────────────────
if ! command -v jq &>/dev/null; then
    red "❌ [DoR FAIL] jq is not installed."
    exit 1
fi

# ── DoR Check 5: Playwright ──────────────────────────────────────────────────
if ! command -v npx &>/dev/null; then
    yellow "⚠️  npx not found — post-deploy Playwright validation will be skipped."
    PLAYWRIGHT_AVAILABLE=false
else
    PLAYWRIGHT_AVAILABLE=true
fi

# ── Deploy loop ───────────────────────────────────────────────────────────────
DOMAINS_DIR="$ROOT_DIR/TLD"
DOMAINS_ATTEMPTED=0
DOMAINS_OK=0
CPANEL_ACCT_DEFAULT="admin"

echo "--> Initiating UAPI Deployment to WHM Host: $WHM_HOST on Port 2087..."

shopt -s dotglob
for EXT_PATH in "$DOMAINS_DIR"/*/; do
    [[ -d "$EXT_PATH" ]] || continue
    EXT=$(basename "$EXT_PATH")
    for DOMAIN_PATH in "$EXT_PATH"/*/; do
        [[ -d "$DOMAIN_PATH" ]] || continue
        NAME=$(basename "$DOMAIN_PATH")
        RAW_FQDN="$NAME.$EXT"
        FQDN=$(echo "$RAW_FQDN" | tr '[:upper:]' '[:lower:]')

        MAPPED_USER=$(echo "$CPANEL_USERS_MAPPING" | jq -r ".\"$FQDN\"")
        if [[ "$MAPPED_USER" == "null" || -z "$MAPPED_USER" ]]; then
            CPANEL_ACCT="$CPANEL_ACCT_DEFAULT"
            TARGET_DIR="public_html/$FQDN"
        else
            CPANEL_ACCT="$MAPPED_USER"
            TARGET_DIR="public_html"
        fi

        echo "📡 Uploading $FQDN → $TARGET_DIR (User: $CPANEL_ACCT)..."
        DOMAINS_ATTEMPTED=$((DOMAINS_ATTEMPTED + 1))
        DOMAIN_OK=true
        FILES_UPLOADED=0

        for FILE in "$DOMAIN_PATH"/*; do
            [[ -f "$FILE" ]] || continue
            FILENAME=$(basename "$FILE")

            # Skip binary assets (API limitation)
            if [[ "$FILENAME" =~ \.(png|jpg|jpeg|gif|ico|zip)$ ]]; then
                echo "  └── ⏭ Skipping binary: $FILENAME"
                continue
            fi

            CONTENT=$(cat "$FILE")

            CURL_EC=0
            UPLOAD_TMP="$(mktemp)"
            HTTP_CODE=""
            if [[ "$USE_TOKEN" == "true" ]]; then
                HTTP_CODE=$(curl -s -k -o "$UPLOAD_TMP" -w '%{http_code}' -X POST \
                    -H "Authorization: whm root:${WHM_API_TOKEN}" \
                    "https://${WHM_HOST}:2087/json-api/cpanel?cpanel_jsonapi_user=${CPANEL_ACCT}&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=save_file_content" \
                    --data-urlencode "dir=${TARGET_DIR}" \
                    --data-urlencode "file=${FILENAME}" \
                    --data-urlencode "content=${CONTENT}") || CURL_EC=$?
            else
                HTTP_CODE=$(curl -s -k -o "$UPLOAD_TMP" -w '%{http_code}' -X POST \
                    -u "${WHM_USER}:${WHM_PASSWORD}" \
                    "https://${WHM_HOST}:2087/json-api/cpanel?cpanel_jsonapi_user=${CPANEL_ACCT}&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=save_file_content" \
                    --data-urlencode "dir=${TARGET_DIR}" \
                    --data-urlencode "file=${FILENAME}" \
                    --data-urlencode "content=${CONTENT}") || CURL_EC=$?
            fi
            RESPONSE="$(cat "$UPLOAD_TMP" 2>/dev/null || true)"
            rm -f "$UPLOAD_TMP"

            UPLOAD_OK=true
            if [[ $CURL_EC -ne 0 ]]; then
                yellow "  ⚠️  curl failed (exit $CURL_EC) uploading $FILENAME to $FQDN"
                UPLOAD_OK=false
            elif [[ -z "${RESPONSE//[[:space:]]/}" ]]; then
                yellow "  ⚠️  Empty WHM response uploading $FILENAME to $FQDN (HTTP ${HTTP_CODE:-?})"
                UPLOAD_OK=false
            elif ! echo "$RESPONSE" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
                yellow "  ⚠️  Non-JSON WHM response uploading $FILENAME to $FQDN: ${RESPONSE:0:120}"
                UPLOAD_OK=false
            elif [[ "$RESPONSE" == *'"errors"'* && "$RESPONSE" != *'"errors":null'* ]] \
               || [[ "$RESPONSE" == *'"error":'* ]] \
               || [[ "$RESPONSE" == *'"status":0'* ]]; then
                SAFE_RESPONSE=$(echo "$RESPONSE" | sed 's/"whm root:[^"]*"/"whm root:[REDACTED]"/g')
                yellow "  ⚠️  Error uploading $FILENAME to $FQDN: $SAFE_RESPONSE"
                UPLOAD_OK=false
            fi

            if [[ "$UPLOAD_OK" == "true" ]]; then
                FILES_UPLOADED=$((FILES_UPLOADED + 1))
                echo "  └── ✔ $FILENAME"
            else
                DOMAIN_OK=false
            fi
        done

        if [[ "$DOMAIN_OK" == "true" && "$FILES_UPLOADED" -gt 0 ]]; then
            DOMAINS_OK=$((DOMAINS_OK + 1))
        elif [[ "$DOMAIN_OK" == "true" && "$FILES_UPLOADED" -eq 0 ]]; then
            yellow "  ⚠️  No uploadable files for $FQDN — domain not counted OK"
            DOMAIN_OK=false
        fi
    done
done

echo "✅ UAPI file transfers complete ($DOMAINS_OK/$DOMAINS_ATTEMPTED domains fully clean)."


# ── tag.vote redirect policy (canonical config → WHM local or remote API) ───
TAG_VOTE_REDIRECT_SCRIPT="$ROOT_DIR/scripts/infra/cpanel/tag-vote-redirects.sh"
if [[ -f "$TAG_VOTE_REDIRECT_SCRIPT" ]]; then
    echo "--> Enforcing tag.vote redirects (config/edge/tag_vote_redirect.yaml)..."
    load_env() {
        [[ -f "$ROOT_DIR/.env" ]] && set -a && source "$ROOT_DIR/.env" && set +a
        [[ -f "$ROOT_DIR/credentials/.env.cpanel" ]] && set -a && source "$ROOT_DIR/credentials/.env.cpanel" && set +a
        if [[ "${WHM_API_TOKEN:-}" == op://* ]] && command -v op &>/dev/null; then
            WHM_API_TOKEN="$(op read "$WHM_API_TOKEN")"
        fi
    }
    load_env
    if command -v uapi &>/dev/null && [[ "${TAG_VOTE_REMOTE:-0}" != "1" ]]; then
        bash "$TAG_VOTE_REDIRECT_SCRIPT" || { red "  tag-vote-redirects.sh failed"; exit 1; }
    elif [[ -n "${WHM_API_TOKEN:-}" && -n "${CPANEL_HOST:-}" ]]; then
        bash "$TAG_VOTE_REDIRECT_SCRIPT" || { red "  tag-vote-redirects.sh (remote) failed"; exit 1; }
    else
        yellow "  tag-vote-redirects: skipped (no uapi on host and no WHM_API_TOKEN+CPANEL_HOST)"
    fi
fi

# ── DoD run id (used for artifact + CI dispatch) ─────────────────────────────
RUN_ID=$(date +%s)

# ── Post-deploy TLD gate (strict via GitHub Actions preferred) ───────────────
PLAYWRIGHT_EXIT=0
TLD_GATE_CI_EXIT=0
export DEPLOY_RUN_ID="deploy_uapi_${RUN_ID:-unknown}"

# Test mode skips the external CI dispatch so DoR-only tests stay hermetic.
if [[ -n "${DEPLOY_UAPI_TEST:-}" ]]; then
    AF_TRIGGER_TLD_GATE_CI=0
fi

TLD_GATE_STATUS="skipped"
if [[ "${AF_TRIGGER_TLD_GATE_CI:-1}" == "1" ]]; then
    echo "--> Strict TLD gate via GitHub Actions (fail-closed, AF_TLD_GATE_WAIT=${AF_TLD_GATE_WAIT:-1})..."
    export AF_TLD_GATE_REF="${AF_TLD_GATE_REF:-main}"
    export AF_TLD_GATE_REQUIRE_WAIT=1
    set +e
    bash "$ROOT_DIR/scripts/deploy/trigger_tld_gate_ci.sh"
    TLD_GATE_CI_EXIT=$?
    set -e
    if [[ $TLD_GATE_CI_EXIT -eq 0 ]]; then
        TLD_GATE_STATUS="pass"
        PLAYWRIGHT_EXIT=0
        green "  TLD gate CI: PASS (strict run completed)"
    else
        TLD_GATE_STATUS="fail"
        PLAYWRIGHT_EXIT="${TLD_GATE_CI_EXIT:-1}"
        red "  TLD gate CI: FAIL (exit $TLD_GATE_CI_EXIT) — DoD blocked"
    fi
fi

if [[ "$TLD_GATE_STATUS" == "skipped" && "$PLAYWRIGHT_AVAILABLE" == "true" && "${AF_UAPI_LOCAL_PLAYWRIGHT:-0}" == "1" ]]; then
    npx playwright test tests/e2e/tld-deploy-gate.spec.ts --reporter=list || PLAYWRIGHT_EXIT=$?
elif [[ "$TLD_GATE_STATUS" == "skipped" && "$PLAYWRIGHT_AVAILABLE" != "true" ]]; then
    yellow "  Playwright: SKIPPED (npx not available)"
    PLAYWRIGHT_EXIT=99
fi

# ── DoD artifact ─────────────────────────────────────────────────────────────
HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
mkdir -p "$ARTIFACT_DIR"
ARTIFACT_PATH="$ARTIFACT_DIR/deploy_uapi_${RUN_ID}.json"

DISPATCH_EVIDENCE="$ROOT_DIR/.goalie/evidence/tld_gate_dispatch_latest.json"
export AF_DEPLOY_ARTIFACT_PATH="$ARTIFACT_PATH"
export AF_DEPLOY_DISPATCH_PATH="$DISPATCH_EVIDENCE"
export AF_DEPLOY_RUN_ID="$RUN_ID"
export AF_DEPLOY_HASH="$HASH"
export AF_DEPLOY_DOMAINS_ATTEMPTED="$DOMAINS_ATTEMPTED"
export AF_DEPLOY_DOMAINS_OK="$DOMAINS_OK"
export AF_DEPLOY_PLAYWRIGHT_EXIT="$PLAYWRIGHT_EXIT"
export AF_DEPLOY_TLD_GATE_CI_EXIT="$TLD_GATE_CI_EXIT"
export AF_DEPLOY_TLD_GATE_STATUS="$TLD_GATE_STATUS"
python3 <<'PY'
import json
import os
from datetime import datetime, timezone
from pathlib import Path

out = Path(os.environ["AF_DEPLOY_ARTIFACT_PATH"])
dispatch_path = Path(os.environ["AF_DEPLOY_DISPATCH_PATH"])
dispatch = {}
if dispatch_path.is_file():
    try:
        dispatch = json.loads(dispatch_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        dispatch = {}

doc = {
    "gate": "deploy-uapi",
    "run_id": os.environ["AF_DEPLOY_RUN_ID"],
    "hash": os.environ["AF_DEPLOY_HASH"],
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "domains_attempted": int(os.environ["AF_DEPLOY_DOMAINS_ATTEMPTED"]),
    "domains_ok": int(os.environ["AF_DEPLOY_DOMAINS_OK"]),
    "playwright_exit": int(os.environ["AF_DEPLOY_PLAYWRIGHT_EXIT"]),
    "tld_gate_ci_exit": int(os.environ["AF_DEPLOY_TLD_GATE_CI_EXIT"]),
    "tld_gate_status": os.environ["AF_DEPLOY_TLD_GATE_STATUS"],
    "tld_gate_dispatch": ".goalie/evidence/tld_gate_dispatch_latest.json",
    "tld_gate_github_run_id": dispatch.get("github_run_id"),
    "tld_gate_conclusion": dispatch.get("conclusion"),
    "tld_gate_receipt_status": dispatch.get("status"),
    "tld_gate_github_run_url": dispatch.get("github_run_url"),
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
print(out)
PY

ln -sf "$(basename "$ARTIFACT_PATH")" "$ARTIFACT_DIR/last_deploy_uapi.json"

green "✅ DoD artifact: $ARTIFACT_PATH"

# Gate fails if any domains failed OR TLD gate / playwright not pass (fail-closed DoD)
if [[ $DOMAINS_ATTEMPTED -gt 0 && $DOMAINS_OK -lt $DOMAINS_ATTEMPTED ]]; then
    red "❌ $((DOMAINS_ATTEMPTED - DOMAINS_OK)) domain(s) had upload errors."
    exit 1
fi
if [[ "${AF_TRIGGER_TLD_GATE_CI:-1}" == "1" && "$TLD_GATE_STATUS" != "pass" ]]; then
    red "❌ DoD blocked: tld_gate_status=$TLD_GATE_STATUS (required pass; receipt in tld_gate_dispatch_latest.json)"
    exit 1
fi
if [[ $PLAYWRIGHT_EXIT -ne 0 ]]; then
    red "❌ Post-deploy Playwright gate failed (exit $PLAYWRIGHT_EXIT)."
    exit $PLAYWRIGHT_EXIT
fi

green "====================================================================="
green "✅ DEPLOY-UAPI GATE PASSED"
green "====================================================================="
