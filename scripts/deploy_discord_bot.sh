#!/usr/bin/env bash
set -euo pipefail

# Discord Bot Production Deployment Script
# Deploys to Cloudflare Workers with full validation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/config/.env.production"
ENV_TEMPLATE="${PROJECT_ROOT}/config/discord_production.env.template"
STATUS_DOC="${PROJECT_ROOT}/docs/INCREMENTAL_RELENTLESS_EXECUTION_STATUS.md"

GOALIE_DIR="${PROJECT_ROOT}/.goalie"
DEPLOY_LOG="${GOALIE_DIR}/deployment_log.jsonl"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_discord_deploy_event() {
    local phase="$1"
    local status="${2:-info}"

    mkdir -p "$GOALIE_DIR"

    local ts
    ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    local commit
    commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    local project
    project="${CLOUDFLARE_PROJECT_NAME:-unknown}"

    local environment
    environment="${ENVIRONMENT:-production}"

    {
        printf '{"timestamp":"%s","type":"deployment_event","target":"discord_bot","phase":"%s","status":"%s","project":"%s","environment":"%s","commit":"%s"}' \
            "$ts" "$phase" "$status" "$project" "$environment" "$commit"
        printf '\n'
    } >> "$DEPLOY_LOG"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment configuration
validate_env() {
    log_info "Validating environment configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        log_info "Copy $ENV_TEMPLATE to $ENV_FILE and fill in your credentials"
        return 1
    fi

    # Source environment file
    set -a
    source "$ENV_FILE"
    set +a

    # Required variables for Discord (Cloudflare now optional)
    local required_vars=(
        "DISCORD_APPLICATION_ID"
        "DISCORD_PUBLIC_KEY"
        "DISCORD_BOT_TOKEN"
    )

    # Optional Cloudflare vars (only required for cloudflare mode)
    local cloudflare_vars=(
        "CLOUDFLARE_ACCOUNT_ID"
        "CLOUDFLARE_API_TOKEN"
        "CLOUDFLARE_PROJECT_NAME"
    )

    local missing_vars=()
    local placeholder_vars=()
    local cloudflare_available=true

    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        elif [[ "${!var}" == *"your_"* ]] || [[ "${!var}" == *"placeholder"* ]]; then
            placeholder_vars+=("$var")
        fi
    done

    # Check Cloudflare vars (not required for local mode)
    for var in "${cloudflare_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            cloudflare_available=false
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        printf '  - %s\n' "${missing_vars[@]}"
        return 1
    fi

    if [ ${#placeholder_vars[@]} -gt 0 ]; then
        log_warn "Placeholder values detected (replace before production deployment):"
        printf '  - %s\n' "${placeholder_vars[@]}"
    fi

    # Masked summary
    log_info "Environment validation passed:"
    echo "  DISCORD_APPLICATION_ID: ${DISCORD_APPLICATION_ID:0:10}...${DISCORD_APPLICATION_ID: -4}"
    echo "  DISCORD_PUBLIC_KEY: ${DISCORD_PUBLIC_KEY:0:10}...${DISCORD_PUBLIC_KEY: -4}"
    echo "  DISCORD_BOT_TOKEN: [REDACTED - ${#DISCORD_BOT_TOKEN} chars]"
    echo "  ENVIRONMENT: ${ENVIRONMENT:-production}"

    if [ "$cloudflare_available" = true ]; then
        echo "  CLOUDFLARE_PROJECT: ${CLOUDFLARE_PROJECT_NAME}"
        echo "  DEPLOY_MODE: cloudflare"
    else
        echo "  DEPLOY_MODE: local (Cloudflare credentials not configured)"
        log_info "Cloudflare not configured - use 'deploy-local' for local deployment"
    fi

    return 0
}

# Check if wrangler is installed
ensure_wrangler() {
    if ! command -v wrangler &> /dev/null; then
        log_warn "wrangler CLI not found. Installing globally..."
        npm install -g wrangler
    fi

    log_info "wrangler version: $(wrangler --version)"
}

# Deploy to Cloudflare Workers
deploy_worker() {
    log_info "Deploying Discord bot to Cloudflare Workers..."

    cd "$PROJECT_ROOT"

    # Deploy using wrangler
    wrangler deploy \
        --name "${CLOUDFLARE_PROJECT_NAME}" \
        --compatibility-date "$(date +%Y-%m-%d)" \
        --var DISCORD_PUBLIC_KEY:"${DISCORD_PUBLIC_KEY}" \
        --var ENVIRONMENT:"${ENVIRONMENT:-production}"

    log_info "Deployment complete"
}

# Configure routes
configure_routes() {
    log_info "Configuring Cloudflare routes..."

    if [ -n "${CLOUDFLARE_ROUTE:-}" ]; then
        wrangler routes add \
            "${CLOUDFLARE_ROUTE}" \
            --name "${CLOUDFLARE_PROJECT_NAME}"
        log_info "Route configured: ${CLOUDFLARE_ROUTE}"
    else
        log_warn "CLOUDFLARE_ROUTE not set, skipping route configuration"
    fi
}

# Health check with retries
health_check() {
    local url="${1:-https://go.rooz.live/api/discord/health}"
    local max_retries=5
    local retry_delay=3

    log_info "Running health check: $url"

    for i in $(seq 1 $max_retries); do
        log_info "Attempt $i/$max_retries..."

        if response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null); then
            http_code=$(echo "$response" | tail -n1)
            body=$(echo "$response" | head -n-1)

            if [ "$http_code" = "200" ]; then
                log_info "Health check passed!"
                echo "Response: $body"
                return 0
            else
                log_warn "HTTP $http_code received"
            fi
        else
            log_warn "Health check failed"
        fi

        if [ $i -lt $max_retries ]; then
            log_info "Retrying in ${retry_delay}s..."
            sleep $retry_delay
        fi
    done

    log_error "Health check failed after $max_retries attempts"
    return 1
}

# Record deployment status
record_status() {
    local status="$1"
    local version="${2:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"

    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    local status_line="[$timestamp] Discord Bot Deployment: $status (commit: $version, project: ${CLOUDFLARE_PROJECT_NAME})"

    if [ -f "$STATUS_DOC" ]; then
        echo "$status_line" >> "$STATUS_DOC"
        log_info "Status recorded in $STATUS_DOC"
    else
        log_warn "Status document not found: $STATUS_DOC"
    fi
}

# Rollback function
rollback() {
    log_error "Deployment failed. Initiating rollback..."
    log_discord_deploy_event "rollback" "start"

    # List recent deployments
    log_info "Recent deployments:"
    wrangler deployments list --name "${CLOUDFLARE_PROJECT_NAME}" | head -n 5

    # Rollback to previous deployment
    log_info "Rolling back to previous deployment..."
    local prev_deployment=$(wrangler deployments list --name "${CLOUDFLARE_PROJECT_NAME}" --json | jq -r '.[1].id' 2>/dev/null || echo "")

    if [ -n "$prev_deployment" ]; then
        wrangler deployments rollback "$prev_deployment" --name "${CLOUDFLARE_PROJECT_NAME}"
        log_info "Rollback complete"
        record_status "ROLLED_BACK" "$prev_deployment"
        log_discord_deploy_event "rollback" "success"
    else
        log_error "Could not identify previous deployment for rollback"
        log_discord_deploy_event "rollback" "error"
    fi
}


# Governance executor gate before deploy (non-blocking when disabled)
governance_executor_gate() {
    if [ "${AF_GOVERNANCE_AUTO_APPLY_ENABLED:-0}" != "1" ]; then
        # Auto-apply not enabled; treat as no-op for deploy gating
        return 0
    fi

    local goalie_dir="$PROJECT_ROOT/.goalie"
    local summary_path="$goalie_dir/executor_summary.json"
    local log_path="$goalie_dir/executor_log.jsonl"

    if [ ! -f "$summary_path" ]; then
        log_warn "No executor_summary.json found; skipping governance gate"
        return 0
    fi

    local failure_rate
    failure_rate=$(jq -r '.failureRate // 0' "$summary_path" 2>/dev/null || echo 0)
    local rollback
    rollback=$(jq -r '.rollback // false' "$summary_path" 2>/dev/null || echo false)

    if [ "$rollback" = "true" ]; then
        log_error "Last governance executor run triggered rollback (failureRate=${failure_rate}%). Blocking Discord deploy."
        log_discord_deploy_event "governance_gate" "blocked"
        return 1
    fi

    log_discord_deploy_event "governance_gate" "ok"
    return 0
}

# Main deployment flow
main() {
    log_info "Starting Discord Bot deployment..."
    log_info "Project root: $PROJECT_ROOT"
    log_discord_deploy_event "start" "info"

    # Validate environment
    if ! validate_env; then
        log_error "Environment validation failed"
        log_discord_deploy_event "validate_env" "error"
        exit 1
    fi

    # Governance executor gate (non-blocking when disabled)
    if ! governance_executor_gate; then
        log_error "Governance executor gate blocked deployment"
        exit 1
    fi

    # Ensure wrangler is available
    ensure_wrangler

    # Deploy
    if deploy_worker; then
        log_info "Worker deployed successfully"
        log_discord_deploy_event "deploy" "success"
    else
        log_error "Worker deployment failed"
        log_discord_deploy_event "deploy" "error"
        rollback
        exit 1
    fi

    # Configure routes
    configure_routes || log_warn "Route configuration failed (non-fatal)"

    # Health check
    if health_check; then
        log_info "Deployment verified via health check"
        record_status "SUCCESS"
        log_discord_deploy_event "health_check" "success"
    else
        log_error "Health check failed"
        log_discord_deploy_event "health_check" "error"
        rollback
        exit 1
    fi

    log_info "==========================================="
    log_info "Discord Bot deployment complete!"
    log_info "Endpoint: https://go.rooz.live/api/discord"
    log_info "Health: https://go.rooz.live/api/discord/health"
    log_info "==========================================="
}

# Deploy locally using Python Discord bot (no Cloudflare required)
deploy_local() {
    log_info "Deploying Discord bot locally (no Cloudflare)..."
    log_discord_deploy_event "deploy_local" "start"

    cd "$PROJECT_ROOT"

    # Ensure Python dependencies are installed
    if ! python3 -c "import discord" 2>/dev/null; then
        log_info "Installing discord.py..."
        pip3 install discord.py python-dotenv pyyaml aiohttp 2>/dev/null || pip install discord.py python-dotenv pyyaml aiohttp
    fi

    # Test bot configuration
    log_info "Validating bot configuration..."
    if python3 scripts/discord_trading_bot.py --validate; then
        log_info "Bot configuration valid"
    else
        log_error "Bot configuration validation failed"
        log_discord_deploy_event "deploy_local" "validation_error"
        return 1
    fi

    # Test dry-run
    log_info "Running bot dry-run test..."
    if python3 scripts/discord_wsjf_bot.py --test 2>/dev/null; then
        log_info "Dry-run test passed"
    else
        log_warn "Dry-run test had issues (may be OK if Discord not connected)"
    fi

    log_discord_deploy_event "deploy_local" "success"
    log_info "==========================================="
    log_info "Discord Bot local deployment ready!"
    log_info "To start the bot, run:"
    log_info "  python3 scripts/discord_wsjf_bot.py"
    log_info "Or:"
    log_info "  python3 scripts/discord_trading_bot.py --demo"
    log_info "==========================================="

    record_status "LOCAL_READY"
    return 0
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    deploy-local)
        # Source env and validate first
        if [ -f "$ENV_FILE" ]; then
            set -a
            source "$ENV_FILE"
            set +a
        fi
        if validate_env; then
            deploy_local
        else
            log_error "Environment validation failed"
            exit 1
        fi
        ;;
    validate)
        validate_env
        ;;
    health)
        health_check "${2:-https://go.rooz.live/api/discord/health}"
        ;;
    rollback)
        rollback
        ;;
    *)
        echo "Usage: $0 {deploy|deploy-local|validate|health|rollback}"
        echo ""
        echo "Commands:"
        echo "  deploy       - Deploy to Cloudflare Workers (requires CF credentials)"
        echo "  deploy-local - Deploy locally using Python (no Cloudflare needed)"
        echo "  validate     - Validate environment configuration"
        echo "  health       - Run health check"
        echo "  rollback     - Rollback Cloudflare deployment"
        exit 1
        ;;
esac
