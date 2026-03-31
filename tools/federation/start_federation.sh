#!/bin/bash

# Federation Startup Script for Agentic-Flow
# 
# This script starts the agentic-flow federation with:
# - Governance and retro coach agents
# - Periodic WSJF and prod-cycle execution
# - Health monitoring and restart capabilities
# - Integration with agentic-jujutsu

set -e

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FEDERATION_DIR="$PROJECT_ROOT/tools/federation"
GOALIE_DIR="$PROJECT_ROOT/.goalie"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check npm/npx
    if ! command -v npx &> /dev/null; then
        log_error "npx is not installed or not in PATH"
        exit 1
    fi
    
    # Check TypeScript
    if ! command -v npx ts-node &> /dev/null; then
        log_error "ts-node is not available via npx"
        exit 1
    fi
    
    # Check agentic-jujutsu
    if ! command -v npx agentic-jujutsu &> /dev/null; then
        log_warning "agentic-jujutsu not found, using mock"
    fi
    
    log_success "Dependencies check passed"
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."
    
    # Check if .goalie directory exists
    if [[ ! -d "$GOALIE_DIR" ]]; then
        log_error "Goalie directory not found: $GOALIE_DIR"
        exit 1
    fi
    
    # Check if federation files exist
    if [[ ! -f "$FEDERATION_DIR/federation_config.ts" ]]; then
        log_error "Federation config not found: $FEDERATION_DIR/federation_config.ts"
        exit 1
    fi
    
    if [[ ! -f "$FEDERATION_DIR/federation_orchestrator.ts" ]]; then
        log_error "Federation orchestrator not found: $FEDERATION_DIR/federation_orchestrator.ts"
        exit 1
    fi
    
    # Check if agent files exist
    if [[ ! -f "$FEDERATION_DIR/governance_agent.ts" ]]; then
        log_error "Governance agent not found: $FEDERATION_DIR/governance_agent.ts"
        exit 1
    fi
    
    if [[ ! -f "$FEDERATION_DIR/retro_coach.ts" ]]; then
        log_error "Retro coach agent not found: $FEDERATION_DIR/retro_coach.ts"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment..."
    
    export GOALIE_DIR="$GOALIE_DIR"
    export AF_FEDERATION_MODE="true"
    export AF_RUN_ID="federation-$(date +%s)"
    export AF_FRAMEWORK="federation"
    export AF_SCHEDULER="orchestrator"
    
    # Create necessary directories
    mkdir -p "$GOALIE_DIR/logs"
    mkdir -p "$GOALIE_DIR/federation"
    
    log_success "Environment setup completed"
}

# Generate default configuration if needed
generate_config() {
    local config_file="$GOALIE_DIR/federation_config.yaml"
    
    if [[ ! -f "$config_file" ]]; then
        log_info "Generating default federation configuration..."
        
        cat > "$config_file" << 'EOF'
# Federation Configuration for Agentic-Flow
version: "1.0.0"
goalieDir: "${GOALIE_DIR}"

agents:
  governance:
    name: "governance-agent"
    scriptPath: "./tools/federation/governance_agent.ts"
    enabled: true
    intervalMinutes: 15
    args: ["--goalie-dir", "${GOALIE_DIR}", "--federation-mode"]
    env:
      AF_RUN_ID: "federation-gov-${TIMESTAMP}"
      AF_CIRCLE: "governance"
      AF_FRAMEWORK: "federation"
      AF_SCHEDULER: "periodic"
    healthCheck: "node -e \"console.log('governance-agent-ok')\""
    restartOnFailure: true
    maxRestartAttempts: 3
    
  retroCoach:
    name: "retro-coach"
    scriptPath: "./tools/federation/retro_coach.ts"
    enabled: true
    intervalMinutes: 30
    args: ["--goalie-dir", "${GOALIE_DIR}", "--federation-mode", "--analytics"]
    env:
      AF_RUN_ID: "federation-retro-${TIMESTAMP}"
      AF_CIRCLE: "retro"
      AF_FRAMEWORK: "federation"
      AF_SCHEDULER: "periodic"
    healthCheck: "node -e \"console.log('retro-coach-ok')\""
    restartOnFailure: true
    maxRestartAttempts: 3

schedule:
  wsjfSchedule:
    enabled: true
    intervalMinutes: 60
    command: "af wsjf"
    args: ["--goalie-dir", "${GOALIE_DIR}", "--output-format", "jsonl"]
    
  prodCycleSchedule:
    enabled: true
    intervalMinutes: 120
    command: "af prod-cycle"
    args: ["--goalie-dir", "${GOALIE_DIR}", "--mode", "advisory"]
    
  agenticJujutsuIntegration:
    enabled: true
    statusIntervalMinutes: 45
    analyzeIntervalMinutes: 90
    prePostSteps: true

output:
  metrics:
    patternMetrics: true
    metricsLog: true
    governanceOutput: true
  outputFormat: "jsonl"
  retentionDays: 30

healthMonitoring:
  enabled: true
  checkIntervalMinutes: 5
  logPath: ".goalie/federation_health.jsonl"
  alertThresholds:
    failureRate: 20
    responseTime: 30000

startup:
  validateEnvironment: true
  checkDependencies: true
  startAgents: true
  enableHealthMonitoring: true
EOF
        
        log_success "Default configuration generated: $config_file"
    else
        log_info "Using existing configuration: $config_file"
    fi
}

# Start federation orchestrator
start_orchestrator() {
    log_info "Starting federation orchestrator..."
    
    cd "$PROJECT_ROOT"
    
    # Start orchestrator in background
    nohup npx ts-node "$FEDERATION_DIR/federation_orchestrator.ts" \
        > "$GOALIE_DIR/logs/federation_orchestrator.log" 2>&1 &
    
    local orchestrator_pid=$!
    echo $orchestrator_pid > "$GOALIE_DIR/federation.pid"
    
    log_success "Federation orchestrator started (PID: $orchestrator_pid)"
    log_info "Logs: $GOALIE_DIR/logs/federation_orchestrator.log"
    log_info "PID file: $GOALIE_DIR/federation.pid"
}

# Stop federation
stop_federation() {
    log_info "Stopping federation..."
    
    local pid_file="$GOALIE_DIR/federation.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping orchestrator (PID: $pid)"
            kill "$pid"
            
            # Wait for graceful shutdown
            local count=0
            while kill -0 "$pid" 2>/dev/null && [[ $count -lt 10 ]]; do
                sleep 1
                ((count++))
            done
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Force killing orchestrator"
                kill -9 "$pid"
            fi
            
            rm -f "$pid_file"
            log_success "Federation stopped"
        else
            log_warning "Orchestrator PID $pid not running"
        fi
    else
        log_warning "No PID file found, federation may not be running"
    fi
}

# Check federation status
check_status() {
    local pid_file="$GOALIE_DIR/federation.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_success "Federation is running (PID: $pid)"
            
            # Show recent health status
            if [[ -f "$GOALIE_DIR/federation_health.jsonl" ]]; then
                log_info "Recent health status:"
                tail -5 "$GOALIE_DIR/federation_health.jsonl" | while read line; do
                    echo "  $line"
                done
            fi
        else
            log_error "Federation PID file exists but process not running"
            rm -f "$pid_file"
        fi
    else
        log_info "Federation is not running"
    fi
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
  start     Start the federation orchestrator
  stop      Stop the federation orchestrator
  restart   Restart the federation orchestrator
  status    Check federation status
  logs      Show federation logs
  config    Show/generate configuration

Options:
  --goalie-dir PATH    Specify custom .goalie directory
  --config PATH        Specify custom configuration file
  --no-deps          Skip dependency check
  --no-validate       Skip environment validation

Examples:
  $0 start
  $0 start --goalie-dir /custom/path/.goalie
  $0 status
  $0 logs
  $0 restart
EOF
}

# Show logs
show_logs() {
    local log_file="$GOALIE_DIR/logs/federation_orchestrator.log"
    
    if [[ -f "$log_file" ]]; then
        log_info "Showing federation logs (tail -f):"
        tail -f "$log_file"
    else
        log_warning "Log file not found: $log_file"
    fi
}

# Parse command line arguments
COMMAND=""
SKIP_DEPS=false
SKIP_VALIDATE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        start|stop|restart|status|logs|config)
            COMMAND="$1"
            shift
            ;;
        --goalie-dir)
            GOALIE_DIR="$2"
            export GOALIE_DIR="$2"
            shift 2
            ;;
        --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --no-deps)
            SKIP_DEPS=true
            shift
            ;;
        --no-validate)
            SKIP_VALIDATE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Execute command
case $COMMAND in
    start)
        if [[ "$SKIP_DEPS" != "true" ]]; then
            check_dependencies
        fi
        if [[ "$SKIP_VALIDATE" != "true" ]]; then
            validate_environment
        fi
        setup_environment
        generate_config
        start_orchestrator
        ;;
    stop)
        stop_federation
        ;;
    restart)
        stop_federation
        sleep 2
        $0 start "$@"
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    config)
        generate_config
        ;;
    *)
        log_error "No command specified"
        show_usage
        exit 1
        ;;
esac