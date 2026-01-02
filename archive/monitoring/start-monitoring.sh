#!/bin/bash

# Agentic Flow Monitoring System Startup Script
# This script starts the complete monitoring and observability stack

set -e

# Configuration
MONITORING_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$MONITORING_DIR/config"
LOG_FILE="$MONITORING_DIR/logs/monitoring-startup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

# Success message
success() {
    log "${GREEN}SUCCESS: $1${NC}"
}

# Warning message
warning() {
    log "${YELLOW}WARNING: $1${NC}"
}

# Info message
info() {
    log "${BLUE}INFO: $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed or not running"
    fi
}

# Check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        error_exit "docker-compose is not installed"
    fi
}

# Create necessary directories
create_directories() {
    info "Creating necessary directories..."
    
    mkdir -p "$MONITORING_DIR/logs"
    mkdir -p "$MONITORING_DIR/data/prometheus"
    mkdir -p "$MONITORING_DIR/data/grafana"
    mkdir -p "$MONITORING_DIR/data/elasticsearch"
    mkdir -p "$MONITORING_DIR/data/alertmanager"
    mkdir -p "$MONITORING_DIR/data/jaeger"
    mkdir -p "$MONITORING_DIR/data/logstash"
    mkdir -p "$MONITORING_DIR/data/kibana"
    
    success "Directories created"
}

# Set proper permissions
set_permissions() {
    info "Setting proper permissions..."
    
    chmod 755 "$MONITORING_DIR/logs"
    chmod 644 "$LOG_FILE"
    
    success "Permissions set"
}

# Check environment variables
check_environment() {
    info "Checking environment variables..."
    
    # Required environment variables
    required_vars=("GRAFANA_ADMIN_PASSWORD" "SMTP_USERNAME" "SMTP_PASSWORD")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            warning "Environment variable $var is not set"
        fi
    done
    
    # Optional environment variables
    optional_vars=("SLACK_WEBHOOK_URL" "DISCORD_WEBHOOK_URL" "WEBHOOK_AUTH_TOKEN")
    
    for var in "${optional_vars[@]}"; do
        if [ -n "${!var}" ]; then
            info "Optional variable $var is set"
        fi
    done
}

# Generate configuration files from templates
generate_configs() {
    info "Generating configuration files..."
    
    # Create environment-specific configs
    local env="${ENVIRONMENT:-production}"
    
    case "$env" in
        "development")
            info "Using development configuration"
            cp "$CONFIG_DIR/environments/development.yml" "$CONFIG_DIR/current.yml" 2>/dev/null || \
            cp "$CONFIG_DIR/environments/production.yml" "$CONFIG_DIR/current.yml"
            ;;
        "staging")
            info "Using staging configuration"
            cp "$CONFIG_DIR/environments/staging.yml" "$CONFIG_DIR/current.yml" 2>/dev/null || \
            cp "$CONFIG_DIR/environments/production.yml" "$CONFIG_DIR/current.yml"
            ;;
        "production"|*)
            info "Using production configuration"
            cp "$CONFIG_DIR/environments/production.yml" "$CONFIG_DIR/current.yml"
            ;;
    esac
    
    # Generate AlertManager template with environment variables
    if [ -n "${SMTP_USERNAME}" ] && [ -n "${SMTP_PASSWORD}" ]; then
        sed -i "s/\${SMTP_USERNAME}/$SMTP_USERNAME/g" "$CONFIG_DIR/alertmanager/alertmanager.yml"
        sed -i "s/\${SMTP_PASSWORD}/$SMTP_PASSWORD/g" "$CONFIG_DIR/alertmanager/alertmanager.yml"
    fi
    
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        sed -i "s/\${SLACK_WEBHOOK_URL}/$SLACK_WEBHOOK_URL/g" "$CONFIG_DIR/alertmanager/alertmanager.yml"
    fi
    
    if [ -n "${DISCORD_WEBHOOK_URL}" ]; then
        sed -i "s/\${DISCORD_WEBHOOK_URL}/$DISCORD_WEBHOOK_URL/g" "$CONFIG_DIR/alertmanager/alertmanager.yml"
    fi
    
    success "Configuration files generated"
}

# Start monitoring services
start_services() {
    info "Starting monitoring services..."
    
    cd "$MONITORING_DIR"
    
    # Check if services are already running
    if docker-compose ps | grep -q "Up"; then
        warning "Some services are already running"
        read -p "Do you want to restart them? (y/N): " -n 1 -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Stopping existing services..."
            docker-compose down
        else
            info "Continuing with existing services..."
            return
        fi
    fi
    
    # Start the monitoring stack
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        success "Monitoring services started successfully"
    else
        error_exit "Failed to start monitoring services"
    fi
}

# Wait for services to be ready
wait_for_services() {
    info "Waiting for services to be ready..."
    
    # Wait for Prometheus
    info "Waiting for Prometheus..."
    local prometheus_ready=false
    for i in {1..30}; do
        if curl -f http://localhost:9090/-/healthy >/dev/null 2>&1; then
            prometheus_ready=true
            success "Prometheus is ready"
            break
        fi
        sleep 2
    done
    
    if [ "$prometheus_ready" = false ]; then
        warning "Prometheus may not be fully ready"
    fi
    
    # Wait for Grafana
    info "Waiting for Grafana..."
    local grafana_ready=false
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
            grafana_ready=true
            success "Grafana is ready"
            break
        fi
        sleep 2
    done
    
    if [ "$grafana_ready" = false ]; then
        warning "Grafana may not be fully ready"
    fi
    
    # Wait for Elasticsearch
    info "Waiting for Elasticsearch..."
    local elasticsearch_ready=false
    for i in {1..60}; do
        if curl -f http://localhost:9200/_cluster/health >/dev/null 2>&1; then
            elasticsearch_ready=true
            success "Elasticsearch is ready"
            break
        fi
        sleep 2
    done
    
    if [ "$elasticsearch_ready" = false ]; then
        warning "Elasticsearch may not be fully ready"
    fi
    
    # Wait for Kibana
    info "Waiting for Kibana..."
    local kibana_ready=false
    for i in {1..30}; do
        if curl -f http://localhost:5601/api/status >/dev/null 2>&1; then
            kibana_ready=true
            success "Kibana is ready"
            break
        fi
        sleep 2
    done
    
    if [ "$kibana_ready" = false ]; then
        warning "Kibana may not be fully ready"
    fi
    
    # Wait for Jaeger
    info "Waiting for Jaeger..."
    local jaeger_ready=false
    for i in {1..30}; do
        if curl -f http://localhost:16686 >/dev/null 2>&1; then
            jaeger_ready=true
            success "Jaeger is ready"
            break
        fi
        sleep 2
    done
    
    if [ "$jaeger_ready" = false ]; then
        warning "Jaeger may not be fully ready"
    fi
}

# Display service URLs
display_service_urls() {
    info "Service URLs:"
    echo "----------------------------------------"
    echo "Prometheus:     http://localhost:9090"
    echo "Grafana:        http://localhost:3000"
    echo "AlertManager:    http://localhost:9093"
    echo "Jaeger:         http://localhost:16686"
    echo "Elasticsearch:   http://localhost:9200"
    echo "Kibana:         http://localhost:5601"
    echo "----------------------------------------"
    
    if [ -n "${GRAFANA_ADMIN_PASSWORD}" ]; then
        echo "Grafana Admin: admin / $GRAFANA_ADMIN_PASSWORD"
    fi
    
    echo "Use 'docker-compose logs -f' to view service logs"
    echo "Use 'docker-compose down' to stop all services"
    echo "Use 'docker-compose ps' to check service status"
}

# Health check for monitoring services
health_check() {
    info "Performing health check..."
    
    cd "$MONITORING_DIR"
    
    # Check if services are running
    if ! docker-compose ps | grep -q "Up"; then
        error_exit "No monitoring services are running"
    fi
    
    # Check each service
    local services=("prometheus" "grafana" "alertmanager" "elasticsearch" "jaeger")
    local healthy=true
    
    for service in "${services[@]}"; do
        if ! curl -f "http://localhost:${service_ports[$service]}/-/healthy" >/dev/null 2>&1; then
            warning "Service $service is not healthy"
            healthy=false
        fi
    done
    
    if [ "$healthy" = true ]; then
        success "All services are healthy"
    else
        warning "Some services are not healthy"
    fi
}

# Stop monitoring services
stop_services() {
    info "Stopping monitoring services..."
    
    cd "$MONITORING_DIR"
    
    docker-compose down
    
    if [ $? -eq 0 ]; then
        success "Monitoring services stopped successfully"
    else
        error_exit "Failed to stop monitoring services"
    fi
}

# Restart monitoring services
restart_services() {
    info "Restarting monitoring services..."
    
    stop_services
    sleep 5
    start_services
}

# Show logs
show_logs() {
    local service="${1:-all}"
    
    cd "$MONITORING_DIR"
    
    if [ "$service" = "all" ]; then
        docker-compose logs -f --tail=100
    else
        docker-compose logs -f --tail=100 "$service"
    fi
}

# Show status
show_status() {
    info "Monitoring services status:"
    
    cd "$MONITORING_DIR"
    docker-compose ps
}

# Update monitoring stack
update_stack() {
    info "Updating monitoring stack..."
    
    cd "$MONITORING_DIR"
    
    # Pull latest images
    docker-compose pull
    
    # Restart services with new images
    docker-compose up -d --force-recreate
    
    if [ $? -eq 0 ]; then
        success "Monitoring stack updated successfully"
    else
        error_exit "Failed to update monitoring stack"
    fi
}

# Backup monitoring data
backup_data() {
    info "Backing up monitoring data..."
    
    local backup_dir="$MONITORING_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Prometheus data
    if [ -d "$MONITORING_DIR/data/prometheus" ]; then
        cp -r "$MONITORING_DIR/data/prometheus" "$backup_dir/"
    fi
    
    # Backup Grafana data
    if [ -d "$MONITORING_DIR/data/grafana" ]; then
        cp -r "$MONITORING_DIR/data/grafana" "$backup_dir/"
    fi
    
    # Backup Elasticsearch data
    if [ -d "$MONITORING_DIR/data/elasticsearch" ]; then
        cp -r "$MONITORING_DIR/data/elasticsearch" "$backup_dir/"
    fi
    
    success "Backup completed: $backup_dir"
}

# Cleanup old data
cleanup() {
    info "Cleaning up old data..."
    
    # Remove containers older than 7 days
    docker system prune -f --filter "until=168h"
    
    # Remove old logs (keep last 7 days)
    find "$MONITORING_DIR/logs" -name "*.log" -mtime +7 -delete 2>/dev/null
    
    success "Cleanup completed"
}

# Service port mapping
declare -A service_ports=(
    ["prometheus"]=9090
    ["grafana"]=3000
    ["alertmanager"]=9093
    ["elasticsearch"]=9200
    ["jaeger"]=16686
    ["kibana"]=5601
)

# Main function
main() {
    info "Starting Agentic Flow Monitoring System..."
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Create directories
    create_directories
    
    # Set permissions
    set_permissions
    
    # Check environment
    check_environment
    
    # Generate configs
    generate_configs
    
    # Handle command line arguments
    case "${1:-start}" in
        "start")
            start_services
            wait_for_services
            display_service_urls
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        "health")
            health_check
            ;;
        "update")
            update_stack
            ;;
        "backup")
            backup_data
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start     - Start monitoring services (default)"
            echo "  stop      - Stop monitoring services"
            echo "  restart   - Restart monitoring services"
            echo "  status    - Show service status"
            echo "  logs      - Show service logs (optional: service name)"
            echo "  health    - Perform health check"
            echo "  update    - Update monitoring stack"
            echo "  backup    - Backup monitoring data"
            echo "  cleanup   - Cleanup old data"
            echo "  help      - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 start          # Start all services"
            echo "  $0 logs grafana   # Show Grafana logs"
            echo ""
            echo "Environment variables:"
            echo "  ENVIRONMENT           - Environment (development|staging|production)"
            echo "  GRAFANA_ADMIN_PASSWORD - Grafana admin password"
            echo "  SMTP_USERNAME         - SMTP username for alerts"
            echo "  SMTP_PASSWORD         - SMTP password for alerts"
            echo "  SLACK_WEBHOOK_URL    - Slack webhook URL"
            echo "  DISCORD_WEBHOOK_URL  - Discord webhook URL"
            ;;
        *)
            error_exit "Unknown command: $1"
            ;;
    esac
}

# Run main function
main "$@"