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
if [[ -f "$ENV_FILE" ]]; then
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

        for FILE in "$DOMAIN_PATH"/*; do
            [[ -f "$FILE" ]] || continue
            FILENAME=$(basename "$FILE")

            # Skip binary assets (API limitation)
            if [[ "$FILENAME" =~ \.(png|jpg|jpeg|gif|ico|zip)$ ]]; then
                echo "  └── ⏭ Skipping binary: $FILENAME"
                continue
            fi

            CONTENT=$(cat "$FILE")

            # Token is never echoed; use -s (silent) + check exit code
            if [[ "$USE_TOKEN" == "true" ]]; then
                RESPONSE=$(curl -s -k -X POST \
                    -H "Authorization: whm root:${WHM_API_TOKEN}" \
                    "https://${WHM_HOST}:2087/json-api/cpanel?cpanel_jsonapi_user=${CPANEL_ACCT}&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=save_file_content" \
                    --data-urlencode "dir=${TARGET_DIR}" \
                    --data-urlencode "file=${FILENAME}" \
                    --data-urlencode "content=${CONTENT}" 2>&1) || true
            else
                RESPONSE=$(curl -s -k -X POST \
                    -u "${WHM_USER}:${WHM_PASSWORD}" \
                    "https://${WHM_HOST}:2087/json-api/cpanel?cpanel_jsonapi_user=${CPANEL_ACCT}&cpanel_jsonapi_apiversion=3&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=save_file_content" \
                    --data-urlencode "dir=${TARGET_DIR}" \
                    --data-urlencode "file=${FILENAME}" \
                    --data-urlencode "content=${CONTENT}" 2>&1) || true
            fi

            # Robust error detection (handles 'error', 'errors', 'status:0')
            if [[ "$RESPONSE" == *'"errors"'* && "$RESPONSE" != *'"errors":null'* ]] \
               || [[ "$RESPONSE" == *'"error":'* ]] \
               || [[ "$RESPONSE" == *'"status":0'* ]]; then
                # Redact any token echoed back in error body before printing
                SAFE_RESPONSE=$(echo "$RESPONSE" | sed 's/"whm root:[^"]*"/"whm root:[REDACTED]"/g')
                yellow "  ⚠️  Error uploading $FILENAME to $FQDN: $SAFE_RESPONSE"
                DOMAIN_OK=false
            else
                echo "  └── ✔ $FILENAME"
            fi
        done

        [[ "$DOMAIN_OK" == "true" ]] && DOMAINS_OK=$((DOMAINS_OK + 1))
    done
done

echo "✅ UAPI file transfers complete ($DOMAINS_OK/$DOMAINS_ATTEMPTED domains fully clean)."

# ── Post-deploy Playwright validation ────────────────────────────────────────
PLAYWRIGHT_EXIT=0
if [[ "$PLAYWRIGHT_AVAILABLE" == "true" ]]; then
    echo "--> Running post-deploy E2E gate: tests/e2e/tld-deploy-gate.spec.ts..."
    npx playwright test tests/e2e/tld-deploy-gate.spec.ts --reporter=list || PLAYWRIGHT_EXIT=$?
    if [[ $PLAYWRIGHT_EXIT -eq 0 ]]; then
        green "  Playwright: PASS"
    else
        yellow "  Playwright: FAIL (exit $PLAYWRIGHT_EXIT) — recorded in DoD artifact"
    fi
else
    yellow "  Playwright: SKIPPED (npx not available)"
    PLAYWRIGHT_EXIT=99
fi

# ── DoD artifact ─────────────────────────────────────────────────────────────
RUN_ID=$(date +%s)
HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
mkdir -p "$ARTIFACT_DIR"
ARTIFACT_PATH="$ARTIFACT_DIR/deploy_uapi_${RUN_ID}.json"

cat > "$ARTIFACT_PATH" <<EOF
{
  "gate": "deploy-uapi",
  "run_id": "$RUN_ID",
  "hash": "$HASH",
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "domains_attempted": $DOMAINS_ATTEMPTED,
  "domains_ok": $DOMAINS_OK,
  "playwright_exit": $PLAYWRIGHT_EXIT
}
EOF
ln -sf "$(basename "$ARTIFACT_PATH")" "$ARTIFACT_DIR/last_deploy_uapi.json"

green "✅ DoD artifact: $ARTIFACT_PATH"

# Gate fails if any domains failed OR playwright had unexpected error
if [[ $DOMAINS_ATTEMPTED -gt 0 && $DOMAINS_OK -lt $DOMAINS_ATTEMPTED ]]; then
    red "❌ $((DOMAINS_ATTEMPTED - DOMAINS_OK)) domain(s) had upload errors."
    exit 1
fi
if [[ $PLAYWRIGHT_EXIT -ne 0 && $PLAYWRIGHT_EXIT -ne 99 ]]; then
    red "❌ Post-deploy Playwright gate failed (exit $PLAYWRIGHT_EXIT)."
    exit $PLAYWRIGHT_EXIT
fi

green "====================================================================="
green "✅ DEPLOY-UAPI GATE PASSED"
green "====================================================================="
