#!/bin/bash

# Discord Bot Deployment Script
# Deploys Discord bot and payment integration system to various environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${PROJECT_ROOT}/config/discord_config.json"
ENVIRONMENT="${1:-development}"
REGION="${2:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Discord Bot Deployment Script

Usage: $0 [ENVIRONMENT] [REGION] [OPTIONS]

Environments:
  development     - Development environment with debugging enabled
  staging        - Staging environment for testing
  production     - Production environment with full monitoring

Regions:
  us-east-1      - US East (N. Virginia)
  us-west-2      - US West (Oregon)
  eu-west-1      - EU West (Ireland)
  ap-southeast-1 - Asia Pacific (Singapore)

Options:
  --build-only    - Build without deploying
  --migrate-db    - Run database migrations
  --seed-data     - Seed initial data
  --backup        - Create backup before deployment
  --rollback      - Rollback to previous version
  --dry-run       - Show what would be deployed without executing
  --verbose        - Verbose output
  --help          - Show this help message

Examples:
  $0 production us-east-1
  $0 staging --migrate-db --seed-data
  $0 development --build-only --verbose
EOF
}

# Parse command line arguments
BUILD_ONLY=false
MIGRATE_DB=false
SEED_DATA=false
CREATE_BACKUP=false
ROLLBACK=false
DRY_RUN=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --migrate-db)
            MIGRATE_DB=true
            shift
            ;;
        --seed-data)
            SEED_DATA=true
            shift
            ;;
        --backup)
            CREATE_BACKUP=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Docker (if using Docker deployment)
    if [[ "$ENVIRONMENT" == "production" ]] && ! command -v docker &> /dev/null; then
        log_error "Docker is required for production deployment"
        exit 1
    fi
    
    # Check AWS CLI (if deploying to AWS)
    if [[ "$ENVIRONMENT" == "production" ]] && ! command -v aws &> /dev/null; then
        log_error "AWS CLI is required for production deployment"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Validate configuration
validate_config() {
    log "Validating configuration..."
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Validate JSON syntax
    if ! jq empty "$CONFIG_FILE" &> /dev/null; then
        log_error "Invalid JSON in configuration file"
        exit 1
    fi
    
    # Check required fields
    local bot_token=$(jq -r '.botToken' "$CONFIG_FILE")
    local application_id=$(jq -r '.applicationId' "$CONFIG_FILE")
    local public_key=$(jq -r '.publicKey' "$CONFIG_FILE")
    
    if [[ -z "$bot_token" || -z "$application_id" || -z "$public_key" ]]; then
        log_error "Missing required configuration fields"
        exit 1
    fi
    
    log_info "Configuration validation passed"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    if [[ "$VERBOSE" == "true" ]]; then
        npm install --verbose
    else
        npm ci --silent
    fi
    
    # Run tests
    npm test --silent
    
    # Build application
    if [[ "$ENVIRONMENT" == "production" ]]; then
        npm run build:production
    else
        npm run build:development
    fi
    
    log_info "Application build completed"
}

# Database migration
migrate_database() {
    log "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Check database connection
    if ! npm run db:check; then
        log_error "Database connection failed"
        exit 1
    fi
    
    # Run migrations
    npm run db:migrate
    
    log_info "Database migration completed"
}

# Seed initial data
seed_initial_data() {
    log "Seeding initial data..."
    
    cd "$PROJECT_ROOT"
    
    # Seed subscription plans
    npm run db:seed:plans
    
    # Seed admin users
    npm run db:seed:admins
    
    # Seed default configurations
    npm run db:seed:config
    
    log_info "Initial data seeding completed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup database
    if [[ "$ENVIRONMENT" == "production" ]]; then
        pg_dump "$(jq -r '.database.connection' "$CONFIG_FILE")" > "$backup_dir/database.sql"
    fi
    
    # Backup configuration
    cp "$CONFIG_FILE" "$backup_dir/discord_config.json"
    
    # Backup current deployment
    if [[ -f "$PROJECT_ROOT/current_deployment.json" ]]; then
        cp "$PROJECT_ROOT/current_deployment.json" "$backup_dir/"
    fi
    
    log_info "Backup created: $backup_dir"
}

# Deploy to development
deploy_development() {
    log "Deploying to development environment..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export NODE_ENV=development
    export LOG_LEVEL=debug
    
    # Start development server
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would start development server"
    else
        npm run dev
    fi
}

# Deploy to staging
deploy_staging() {
    log "Deploying to staging environment..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export NODE_ENV=staging
    export LOG_LEVEL=info
    
    # Build and deploy
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would deploy to staging"
    else
        # Deploy to staging server
        scp -r dist/* user@staging-server:/opt/discord-bot/
        ssh user@staging-server "cd /opt/discord-bot && npm ci --production && pm2 restart discord-bot"
    fi
}

# Deploy to production
deploy_production() {
    log "Deploying to production environment..."
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export NODE_ENV=production
    export LOG_LEVEL=warn
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "DRY RUN: Would deploy to production"
        return
    fi
    
    # Build Docker image
    docker build -t discord-bot:latest .
    
    # Tag image with version
    local version=$(jq -r '.version' package.json)
    docker tag discord-bot:latest discord-bot:$version
    
    # Push to registry
    docker push discord-bot:latest
    docker push discord-bot:$version
    
    # Deploy to AWS ECS
    aws ecs register-task-definition --cli-input-json file://aws/ecs-task-definition.json
    aws ecs update-service --cluster discord-bot-prod --service discord-bot --task-definition discord-bot:$version
    
    # Update current deployment info
    cat > "$PROJECT_ROOT/current_deployment.json" << EOF
{
  "version": "$version",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "production",
  "region": "$REGION",
  "image": "discord-bot:$version",
  "taskDefinition": "discord-bot:$version"
}
EOF
    
    log_info "Production deployment completed"
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."
    
    if [[ ! -f "$PROJECT_ROOT/current_deployment.json" ]]; then
        log_error "No current deployment found for rollback"
        exit 1
    fi
    
    local previous_version=$(jq -r '.previousVersion' "$PROJECT_ROOT/current_deployment.json")
    
    if [[ -z "$previous_version" ]]; then
        log_error "No previous version found for rollback"
        exit 1
    fi
    
    # Deploy previous version
    docker tag discord-bot:$previous_version discord-bot:rollback
    docker push discord-bot:rollback
    
    # Update ECS service
    aws ecs update-service --cluster discord-bot-prod --service discord-bot --task-definition discord-bot:rollback
    
    log_info "Rollback to version $previous_version completed"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local health_url="https://discord-bot.example.com/health"
    
    if [[ "$ENVIRONMENT" == "development" ]]; then
        health_url="http://localhost:3000/health"
    elif [[ "$ENVIRONMENT" == "staging" ]]; then
        health_url="https://staging.discord-bot.example.com/health"
    fi
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f "$health_url" &> /dev/null; then
            log_info "Health check passed (attempt $attempt/$max_attempts)"
            return 0
        fi
        
        log_info "Health check failed, retrying in 10 seconds... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Remove temporary files
    rm -rf /tmp/discord-bot-deploy-*
    
    # Clean up Docker images
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker rmi discord-bot:rollback 2>/dev/null || true
    fi
    
    log_info "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting Discord bot deployment..."
    log "Environment: $ENVIRONMENT"
    log "Region: $REGION"
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Check prerequisites
    check_prerequisites
    
    # Validate configuration
    validate_config
    
    # Create backup if requested
    if [[ "$CREATE_BACKUP" == "true" ]]; then
        create_backup
    fi
    
    # Build application
    if [[ "$BUILD_ONLY" == "false" ]]; then
        build_application
    fi
    
    # Run database migration if requested
    if [[ "$MIGRATE_DB" == "true" ]]; then
        migrate_database
    fi
    
    # Seed initial data if requested
    if [[ "$SEED_DATA" == "true" ]]; then
        seed_initial_data
    fi
    
    # Deploy based on environment
    case $ENVIRONMENT in
        development)
            deploy_development
            ;;
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            show_help
            exit 1
            ;;
    esac
    
    # Perform health check
    if [[ "$BUILD_ONLY" == "false" && "$DRY_RUN" == "false" ]]; then
        sleep 30  # Wait for application to start
        health_check
    fi
    
    log_info "Deployment completed successfully"
}

# Handle rollback
if [[ "$ROLLBACK" == "true" ]]; then
    rollback_deployment
    exit 0
fi

# Run main function
main