#!/usr/bin/env bash
# mcp-setup.sh - Comprehensive MCP setup with diagnostics
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }
log_header() { echo -e "\n${BLUE}=== $* ===${NC}\n"; }

# Parse command
COMMAND="${1:-diagnose}"

case "$COMMAND" in
    diagnose)
        log_header "MCP Server Diagnostics"
        
        # Check processes
        log_info "Checking MCP processes..."
        if ps aux | grep -E "agentdb.*mcp" | grep -v grep; then
            log_success "MCP processes found"
            
            # Check if suspended
            if ps aux | grep -E "agentdb.*mcp.*start" | grep -v grep | grep -q " T "; then
                log_error "MCP server is SUSPENDED (needs resume)"
                echo "  Run: kill -CONT \$(pgrep -f 'agentdb.*mcp')"
            else
                log_success "MCP server is RUNNING"
            fi
        else
            log_warn "No MCP processes found"
        fi
        
        # Check ports
        log_info "Checking port usage..."
        for port in 3000 3001 3002; do
            if lsof -i :$port 2>/dev/null | tail -1; then
                process=$(lsof -i :$port 2>/dev/null | tail -1 | awk '{print $1}')
                if [[ "$process" == "agentdb" ]]; then
                    log_success "Port $port: agentdb (MCP server)"
                else
                    log_warn "Port $port: $process (conflict)"
                fi
            else
                log_info "Port $port: available"
            fi
        done
        
        # Check agentdb installation
        log_info "Checking agentdb installation..."
        if command -v agentdb >/dev/null 2>&1; then
            version=$(agentdb --version 2>/dev/null || echo "unknown")
            log_success "agentdb installed: $version"
        elif npx agentdb --version 2>/dev/null; then
            version=$(npx agentdb --version 2>/dev/null)
            log_success "agentdb available via npx: $version"
        else
            log_error "agentdb not found"
        fi
        
        # Check cache
        log_info "Checking skills cache..."
        if [[ -d "$ROOT_DIR/.cache/skills" ]]; then
            count=$(find "$ROOT_DIR/.cache/skills" -name "*.json" -type f | wc -l | tr -d ' ')
            log_success "Cache directory exists: $count files"
            ls -lh "$ROOT_DIR/.cache/skills/"
        else
            log_warn "No skills cache found"
        fi
        ;;
        
    fix)
        log_header "Fixing MCP Server Issues"
        
        # Kill suspended processes
        log_info "Cleaning up suspended processes..."
        pkill -9 -f "agentdb.*mcp" 2>/dev/null || true
        sleep 2
        
        # Create cache directory
        log_info "Creating cache directory..."
        mkdir -p "$ROOT_DIR/.cache/skills"
        
        # Start MCP server on alternate port
        log_info "Starting MCP server..."
        "$SCRIPT_DIR/mcp-start.sh"
        ;;
        
    test)
        log_header "Testing MCP Integration"
        
        # Test health check
        log_info "Testing health check..."
        if "$SCRIPT_DIR/mcp-health-check.sh"; then
            log_success "Health check passed"
        else
            log_error "Health check failed"
        fi
        
        # Test skill export
        log_info "Testing skill export..."
        if npx agentdb skill export --circle orchestrator 2>/dev/null | jq empty 2>/dev/null; then
            log_success "Skill export working"
        else
            log_warn "Skill export failed - will use offline mode"
        fi
        
        # Test prod-cycle script
        log_info "Testing prod-cycle with fallback..."
        "$SCRIPT_DIR/ay-prod-cycle.sh" status
        ;;
        
    cache)
        log_header "Building Skills Cache"
        
        if "$SCRIPT_DIR/mcp-health-check.sh" 2>/dev/null; then
            "$SCRIPT_DIR/export-skills-cache.sh"
        else
            log_error "MCP server not available - cannot build cache"
            log_info "Run: $0 fix"
            exit 1
        fi
        ;;
        
    init)
        log_header "Initializing Claude-Flow v3alpha"
        
        # Initialize experimental features
        log_info "Initializing claude-flow..."
        if npx claude-flow@v3alpha init 2>/dev/null; then
            log_success "Claude-flow initialized"
        else
            log_warn "Claude-flow init failed or not available"
        fi
        
        # Run full setup
        "$0" fix
        "$0" cache
        "$0" test
        ;;
        
    *)
        cat <<EOF
Usage: $0 <command>

Commands:
  diagnose   Show MCP server status and diagnostics
  fix        Fix common issues (kill suspended, start server)
  test       Test MCP integration and fallback
  cache      Export skills to local cache
  init       Initialize claude-flow v3alpha + full setup

Examples:
  $0 diagnose
  $0 fix
  $0 cache
  $0 init

EOF
        exit 1
        ;;
esac
