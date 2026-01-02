#!/usr/bin/env bash
set -euo pipefail

# Docker Swarm Deployment Script
# Deploys trading stack with secrets from 1Password or Passbolt

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
STACK_NAME="${STACK_NAME:-trading}"
ENVIRONMENT="${ENVIRONMENT:-production}"
DOMAIN="${DOMAIN:-localhost}"
VERSION="${VERSION:-latest}"

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in swarm mode
check_swarm() {
    if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
        log_error "Docker Swarm is not active!"
        log_info "Initialize swarm with: docker swarm init"
        exit 1
    fi
    log_info "Docker Swarm is active"
}

# Load credentials from 1Password or Passbolt
load_credentials() {
    log_info "Loading credentials..."
    
    # Try to use the credential loader
    if [ -x "$PROJECT_ROOT/scripts/credentials/load_credentials.py" ]; then
        export CREDENTIAL_LOADER="$PROJECT_ROOT/scripts/credentials/load_credentials.py"
    else
        log_warn "Credential loader not found, using environment variables"
        return
    fi
    
    # Load required credentials
    local required_creds=(
        "ANTHROPIC_API_KEY"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "POSTGRES_PASSWORD"
        "GRAFANA_PASSWORD"
    )
    
    for cred in "${required_creds[@]}"; do
        if [ -z "${!cred:-}" ]; then
            log_warn "$cred not set in environment"
        fi
    done
}

# Create Docker secrets from credentials
create_secrets() {
    log_info "Creating Docker secrets..."
    
    # Function to create secret if it doesn't exist
    create_secret() {
        local name=$1
        local value=$2
        
        if docker secret inspect "$name" >/dev/null 2>&1; then
            log_info "Secret '$name' already exists, skipping"
        else
            echo -n "$value" | docker secret create "$name" -
            log_info "Created secret: $name"
        fi
    }
    
    # Create secrets from environment or 1Password
    if command -v op >/dev/null 2>&1; then
        log_info "Using 1Password CLI for secrets"
        
        # Try to read from 1Password, fall back to environment
        ANTHROPIC_KEY="${ANTHROPIC_API_KEY:-$(op read 'op://Private/ANTHROPIC_API_KEY' 2>/dev/null || echo '')}"
        AWS_KEY_ID="${AWS_ACCESS_KEY_ID:-$(op read 'op://Private/AWS_ACCESS_KEY_ID' 2>/dev/null || echo '')}"
        AWS_SECRET="${AWS_SECRET_ACCESS_KEY:-$(op read 'op://Private/AWS_SECRET_ACCESS_KEY' 2>/dev/null || echo '')}"
        POSTGRES_PASS="${POSTGRES_PASSWORD:-$(op read 'op://Private/POSTGRES_PASSWORD' 2>/dev/null || echo 'changeme')}"
        GRAFANA_PASS="${GRAFANA_PASSWORD:-$(op read 'op://Private/GRAFANA_PASSWORD' 2>/dev/null || echo 'admin')}"
    else
        log_warn "1Password CLI not found, using environment variables"
        ANTHROPIC_KEY="${ANTHROPIC_API_KEY:-}"
        AWS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
        AWS_SECRET="${AWS_SECRET_ACCESS_KEY:-}"
        POSTGRES_PASS="${POSTGRES_PASSWORD:-changeme}"
        GRAFANA_PASS="${GRAFANA_PASSWORD:-admin}"
    fi
    
    # Create secrets
    [ -n "$ANTHROPIC_KEY" ] && create_secret "anthropic_api_key" "$ANTHROPIC_KEY"
    [ -n "$AWS_KEY_ID" ] && create_secret "aws_access_key_id" "$AWS_KEY_ID"
    [ -n "$AWS_SECRET" ] && create_secret "aws_secret_access_key" "$AWS_SECRET"
    create_secret "postgres_password" "$POSTGRES_PASS"
    create_secret "grafana_password" "$GRAFANA_PASS"
    
    # IBKR credentials (combined username:password)
    if [ -n "${IBKR_USERNAME:-}" ] && [ -n "${IBKR_PASSWORD:-}" ]; then
        echo -n "${IBKR_USERNAME}:${IBKR_PASSWORD}" | docker secret create ibkr_credentials - 2>/dev/null || true
    else
        echo -n "demo:demo" | docker secret create ibkr_credentials - 2>/dev/null || true
        log_warn "Using demo IBKR credentials"
    fi
}

# Deploy or update stack
deploy_stack() {
    log_info "Deploying stack: $STACK_NAME"
    
    cd "$SCRIPT_DIR"
    
    # Export environment variables for docker-compose
    export VERSION DOMAIN ENVIRONMENT
    
    # Deploy the stack
    docker stack deploy \
        -c trading-stack.yml \
        --prune \
        --resolve-image always \
        "$STACK_NAME"
    
    log_info "Stack deployed successfully!"
    log_info ""
    log_info "Access services at:"
    log_info "  - Trading API: http://trading.$DOMAIN"
    log_info "  - Grafana: http://grafana.$DOMAIN"
    log_info "  - Prometheus: http://prometheus.$DOMAIN"
    log_info "  - Traefik Dashboard: http://traefik.$DOMAIN"
}

# Monitor stack deployment
monitor_deployment() {
    log_info "Monitoring deployment..."
    
    local max_wait=120
    local elapsed=0
    
    while [ $elapsed -lt $max_wait ]; do
        local services=$(docker stack services "$STACK_NAME" --format "{{.Name}}: {{.Replicas}}" 2>/dev/null || echo "")
        
        if [ -n "$services" ]; then
            echo ""
            log_info "Service status:"
            echo "$services" | while read -r line; do
                echo "  $line"
            done
            
            # Check if all services are running
            if ! echo "$services" | grep -q "0/"; then
                log_info "All services are running!"
                return 0
            fi
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
    done
    
    log_warn "Deployment monitoring timed out after ${max_wait}s"
    log_info "Check status with: docker stack services $STACK_NAME"
}

# Show stack status
show_status() {
    log_info "Stack status:"
    docker stack services "$STACK_NAME" || true
    echo ""
    log_info "Stack tasks:"
    docker stack ps "$STACK_NAME" --no-trunc || true
}

# Main execution
main() {
    log_info "Starting deployment to Docker Swarm"
    log_info "Environment: $ENVIRONMENT"
    log_info "Domain: $DOMAIN"
    log_info "Version: $VERSION"
    echo ""
    
    check_swarm
    load_credentials
    create_secrets
    deploy_stack
    
    if [ "${MONITOR:-yes}" = "yes" ]; then
        monitor_deployment
    fi
    
    show_status
    
    log_info ""
    log_info "Deployment complete!"
    log_info "View logs with: docker service logs -f ${STACK_NAME}_trading-api"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    status)
        show_status
        ;;
    secrets)
        load_credentials
        create_secrets
        ;;
    *)
        echo "Usage: $0 {deploy|status|secrets}"
        exit 1
        ;;
esac
