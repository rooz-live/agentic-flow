#!/bin/bash
# debug-exit-codes.sh - Enhanced exit code debugging for tunnel orchestration
# Provides detailed RCA for exit codes with actionable fixes

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/exit-codes-robust.sh" 2>/dev/null || true

# Colors for debugging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Debug logging
debug_log() { echo -e "${PURPLE}[DEBUG]${NC} $*"; }
error_log() { echo -e "${RED}[ERROR]${NC} $*"; }
warn_log() { echo -e "${YELLOW}[WARN]${NC} $*"; }
info_log() { echo -e "${BLUE}[INFO]${NC} $*"; }
success_log() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }

# Exit code analyzer with RCA
analyze_exit_code() {
    local exit_code=$1
    local context="${2:-generic}"
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    info_log "EXIT CODE ANALYSIS: $exit_code (Context: $context)"
    echo "═══════════════════════════════════════════════════════════════"
    
    case $exit_code in
        0)
            success_log "✅ SUCCESS - Operation completed"
            echo "  No action needed"
            ;;
            
        10|11|12|13)
            error_log "❌ CLIENT ERROR - Invalid usage or configuration"
            echo "  RCA: User input or script configuration issue"
            echo "  Fix: Check command syntax and file paths"
            echo "  Prevention: Add input validation"
            ;;
            
        110)
            error_log "❌ VALIDATION ERROR - DATE_IN_PAST"
            echo "  RCA: Temporal reference points to a past date without acceptable context"
            echo "  Fix: Rewrite with explicit, current date context"
            echo "  Prevention: Re-run validate-full before send"
            ;;
            
        111)
            error_log "❌ VALIDATION ERROR - PLACEHOLDER_DETECTED"
            echo "  RCA: Template placeholders were not replaced"
            echo "  Fix: Replace all {{PLACEHOLDER}} fields"
            echo "  Prevention: Add pre-send placeholder scan in workflow"
            ;;
            
        211)
            error_log "❌ PORT CONFLICT - Port 8080 already in use"
            echo "  RCA: Previous tunnel process didn't clean up properly"
            echo "  Fix: lsof -ti:8080 | xargs kill -9"
            echo "  Prevention: Implement proper process cleanup with wait()"
            ;;
            
        212)
            error_log "❌ HTTP SERVER FAILED - Python server not responding"
            echo "  RCA: Server crashed or never started properly"
            echo "  Fix: Check /tmp/http-server.log for errors"
            echo "  Prevention: Add health check before starting tunnel"
            ;;
            
        213|214|215|216)
            error_log "❌ TUNNEL PROVIDER FAILED"
            echo "  RCA: Network, auth, or service availability issue"
            case $exit_code in
                213) echo "  Provider: Tailscale - Check auth: 'tailscale status'" ;;
                214) echo "  Provider: ngrok - Check config: 'ngrok config check'" ;;
                215) echo "  Provider: Cloudflare - Check auth: 'cloudflared tunnel login'" ;;
                216) echo "  Provider: localtunnel - Check npm: 'npx --version'" ;;
            esac
            echo "  Fix: Verify authentication and network connectivity"
            echo "  Prevention: Implement pre-flight checks"
            ;;
            
        116|217)
            error_log "❌ ALL TUNNELS FAILED - Complete cascade failure (116/217)"
            echo "  RCA: Systemic issue - network, permissions, or HTTP server"
            echo "  Fix: 1) Check HTTP server: curl localhost:8080"
            echo "       2) Check network: ping 8.8.8.8"
            echo "       3) Check permissions: ls -la /tmp/"
            echo "  Prevention: Add comprehensive pre-flight validation"
            ;;
            
        218)
            warn_log "⚠️ TUNNEL URL EXPIRED - Ephemeral URL changed"
            echo "  RCA: Cloudflare/localtunnel URLs rotate on restart"
            echo "  Fix: Update bookmarks with new URL"
            echo "  Prevention: Use ngrok reserved domain or Tailscale"
            ;;
            
        219)
            error_log "❌ ERROR 1033 - Origin unreachable"
            echo "  RCA: HTTP server died after tunnel established"
            echo "  Fix: Restart cascade tunnel with cleanup"
            echo "  Prevention: Add server health monitoring"
            ;;
            
        221)
            warn_log "⚠️ HEALTH CHECK FAILED - Tunnel not responding"
            echo "  RCA: Network latency or tunnel instability"
            echo "  Fix: Increase timeout or check network"
            echo "  Prevention: Implement retry with exponential backoff"
            ;;
            
        150|151|152|153|154|155|156|157)
            error_log "❌ DOMAIN VALIDATION FAILED - Legal case context issue"
            case $exit_code in
                150) echo "  Domain: law - Legal context or citation error" ;;
                151) echo "  Domain: pur - Purpose/WSJF validation failed" ;;
                152) echo "  Domain: hab - Habitability evidence missing" ;;
                153) echo "  Domain: file - Filing/execution error" ;;
                154) echo "  Domain: policy - Governance policy violation detected" ;;
                155) echo "  Domain: coherence - PRD/ADR/DDD/TDD coherence failed" ;;
                156) echo "  Domain: roam - Risk tracker freshness exceeded threshold" ;;
                157) echo "  Domain: wsjf - Candidate rejected by WSJF policy" ;;
            esac
            echo "  Fix: Review case documentation and evidence"
            echo "  Prevention: Pre-validate before sending"
            ;;
            
        170|171|172)
            error_log "❌ NGROK V3 CONFIG ISSUE"
            case $exit_code in
                170) echo "  Issue: api_key missing or invalid" ;;
                171) echo "  Issue: config file not found" ;;
                172) echo "  Issue: reserved domain not available" ;;
            esac
            echo "  Fix: Run 'ngrok config add-authtoken <token>'"
            echo "  Prevention: Validate config on startup"
            ;;
            
        *)
            error_log "❌ UNKNOWN EXIT CODE: $exit_code"
            echo "  RCA: Unhandled error condition"
            echo "  Fix: Check logs: /tmp/*-tunnel.log"
            echo "  Prevention: Add comprehensive error handling"
            ;;
    esac
    
    echo ""
    debug_log "RECENT LOGS:"
    echo "  HTTP Server: /tmp/http-server.log"
    echo "  Tailscale: /tmp/tailscale-tunnel.log"
    echo "  ngrok: /tmp/ngrok-tunnel.log"
    echo "  Cloudflare: /tmp/cloudflare-tunnel.log"
    echo "  localtunnel: /tmp/localtunnel.log"
    echo ""
}

# Full system diagnostic (diag command)
quick_diag() {
    echo ""
    info_log "🔍 SYSTEM DIAGNOSTIC (diag)"
    echo "═══════════════════════════════════════════════════════════════"
    
    # Check required tools
    echo "Required tools:"
    for cmd in jq python3 curl lsof; do
        if command -v "$cmd" >/dev/null 2>&1; then
            echo "  $cmd: ✅ $(command -v $cmd)"
        else
            echo "  $cmd: ❌ NOT FOUND"
        fi
    done
    echo ""
    
    # Check port 8080
    if lsof -ti:8080 >/dev/null 2>&1; then
        echo "Port 8080: $(lsof -ti:8080 | wc -l | tr -d ' ') process(es) running"
        lsof -ti:8080 | head -5 | while read pid; do
            echo "  PID $pid: $(ps -p $pid -o comm= 2>/dev/null || echo 'zombie')"
        done
    else
        echo "Port 8080: FREE"
    fi
    
    # Check HTTP server
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ | grep -q "200"; then
        echo "HTTP Server: ✅ Responding"
    else
        echo "HTTP Server: ❌ Not responding"
    fi
    
    # Check active tunnel
    if [[ -f /tmp/active-tunnel-url.txt ]]; then
        echo "Active Tunnel: $(cat /tmp/active-tunnel-provider.txt 2>/dev/null || echo 'unknown')"
        echo "URL: $(cat /tmp/active-tunnel-url.txt 2>/dev/null || echo 'unknown')"
    else
        echo "Active Tunnel: None"
    fi
    
    # Check tunnel processes
    echo ""
    echo "Tunnel Processes:"
    ps aux | grep -E "(tailscale|ngrok|cloudflared|localtunnel)" | grep -v grep | while read line; do
        echo "  $line"
    done
    
    echo ""
}

# Main execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -eq 0 ]]; then
        echo "Usage: $0 <exit-code> [context]"
        echo "       $0 diag"
        echo ""
        echo "Examples:"
        echo "  $0 217 tunnel-failure"
        echo "  $0 diag"
        exit 1
    fi
    
    if [[ "$1" == "diag" ]]; then
        quick_diag
    else
        analyze_exit_code "$1" "$2"
    fi
fi
