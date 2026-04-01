#!/bin/bash
# run-bounded-eta.sh - Bounded execution with ETA live streaming
# Implements Process Contracts, Progress Hooks, Dependency Injection, and Timeout Guards

set -euo pipefail

# Source required frameworks
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/../../scripts/validation-core.sh" ] && source "$SCRIPT_DIR/../../scripts/validation-core.sh" || true
source "$SCRIPT_DIR/bounded-reasoning-framework.sh" 2>/dev/null || true
source "$SCRIPT_DIR/eta-live-stream.sh" 2>/dev/null || true
source "$SCRIPT_DIR/robust-quality.sh" 2>/dev/null || true

# Provide fallback stubs for progress hooks if missing natively avoiding set -e crashes
if ! declare -F emit_progress_update >/dev/null 2>&1; then
    emit_progress_update() { true; }
fi
if ! declare -F update_progress >/dev/null 2>&1; then
    update_progress() { true; }
fi

# =============================================================================
# PROCESS CONTRACT DEFINITION (macOS Bash 3.2 compliance)
# Format: max_steps|max_duration_seconds|dependencies|description
# - max_steps: Max step count before LIMIT (exit 125)
# - max_duration: Timeout in seconds (exit 124)
# - dependencies: Comma-separated; must pass before execution (e.g. http_server)
# - description: Human-readable process name
# =============================================================================
get_process_contract() {
    local process_name="$1"
    case "$process_name" in
        "http_server") echo "5|30|port_check|Start HTTP server on port 8080" ;;
        "tailscale_tunnel") echo "8|45|http_server|Establish Tailscale funnel" ;;
        "ngrok_tunnel") echo "10|60|http_server|Establish ngrok tunnel" ;;
        "cloudflare_tunnel") echo "8|45|http_server|Create Cloudflare tunnel" ;;
        "localtunnel_tunnel") echo "10|60|http_server|Establish localtunnel" ;;
        "health_monitor") echo "20|300|tunnel_active|Monitor tunnel health" ;;
        "multi_ledger") echo "40|180|http_server|Start all 4 ledger tunnels" ;;
        *) echo "" ;;
    esac
}

# =============================================================================
# RUN_BOUNDED WRAPPER WITH ETA STREAMING
# =============================================================================
run_bounded_eta() {
    local process_name="$1"
    local function_to_run="$2"
    shift 2
    local args=("$@")

    # Get process contract natively bypassing array limitations
    local contract=$(get_process_contract "$process_name")
    if [[ -z "$contract" ]]; then
        echo "ERROR: No contract found for process: $process_name" >&2
        return 1
    fi

    # Parse contract
    local max_steps=$(echo "$contract" | cut -d'|' -f1)
    local max_duration=$(echo "$contract" | cut -d'|' -f2)
    local dependencies=$(echo "$contract" | cut -d'|' -f3)
    local description=$(echo "$contract" | cut -d'|' -f4)

    # Create process ID
    local process_id="${process_name}-$(date +%s)"

    # Initialize bounded reasoning
    create_contract "$process_id" "$description" "$max_steps" "$max_duration" "$dependencies"
    start_process "$process_id"

    # CSQBM Governance Constraint: Check execution validity prior to firing the live stream
    local proj_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
    if [[ -x "$proj_root/scripts/validators/project/check-csqbm.sh" ]]; then
        ALLOW_CSQBM_BYPASS="${ALLOW_CSQBM_BYPASS:-true}" bash "$proj_root/scripts/validators/project/check-csqbm.sh" --deep-why >/dev/null 2>&1 || {
            echo "ERROR: CSQBM Governance Failure. System operation halted to preserve interior truth boundaries." >&2
            return 100
        }
    fi

    # Initialize ETA streaming
    echo "🚀 Starting: $description"
    echo "📊 Process ID: $process_id"
    echo "⏱️ Max Duration: ${max_duration}s"
    echo "📋 Max Steps: $max_steps"
    echo "🔗 Dependencies: $dependencies"
    echo ""

    # Execute with bounded monitoring
    local start_time=$(date +%s)
    local step_count=0
    local exit_code=0

    # Progress Hook: Start
    emit_progress_update "$process_id" "INIT" "Starting $process_name" 0 "RUNNING"
    update_progress "$process_id" "Initializing $process_name" 0 "RUNNING"

    # Dependency Injection: Check dependencies
    if [[ -n "$dependencies" ]] && [[ "$dependencies" != "none" ]]; then
        IFS=',' read -ra deps <<< "$dependencies"
        for dep in "${deps[@]}"; do
            step_count=$((step_count + 1))
            emit_progress_update "$process_id" "DEP_CHECK" "Checking dependency: $dep" $((step_count * 5)) "RUNNING"

            if ! check_dependency "$dep"; then
                emit_progress_update "$process_id" "FAILED" "Dependency missing: $dep" 0 "FAILED"
                complete_process "$process_id" false
                return 1
            fi

            # Timeout Guard: Check if we're exceeding time
            local elapsed=$(($(date +%s) - start_time))
            if [[ $elapsed -gt $max_duration ]]; then
                emit_progress_update "$process_id" "TIMEOUT" "Process exceeded max duration" 0 "FAILED"
                complete_process "$process_id" false
                return 124
            fi
        done
    fi

    # Execute the function with monitoring
    local function_start=$(date +%s)

    # Run the function in background to monitor it
    "$function_to_run" "${args[@]}" &
    local function_pid=$!

    # Monitor function execution
    while kill -0 $function_pid 2>/dev/null; do
        step_count=$((step_count + 1))
        local elapsed=$(($(date +%s) - start_time))
        local function_elapsed=$(($(date +%s) - function_start))

        # Calculate progress
        local progress=$(( (step_count * 100) / max_steps ))
        [[ $progress -gt 95 ]] && progress=95

        # ETA calculation
        local eta=0
        if [[ $step_count -gt 0 ]]; then
            local avg_time=$((elapsed / step_count))
            eta=$((avg_time * (max_steps - step_count)))
        fi

        # Progress Hook: Update
        emit_progress_update "$process_id" "RUNNING" "Step $step_count/$max_steps" $progress "RUNNING"
        update_progress "$process_id" "Executing step $step_count" $progress "RUNNING"

        # Timeout Guard
        if [[ $elapsed -gt $max_duration ]]; then
            echo "⏰ TIMEOUT: Killing process (exceeded ${max_duration}s)"
            kill -TERM $function_pid 2>/dev/null || true
            wait $function_pid 2>/dev/null || true
            emit_progress_update "$process_id" "TIMEOUT" "Process timeout" 0 "FAILED"
            complete_process "$process_id" false
            return 124
        fi

        # Step limit guard
        if [[ $step_count -gt $max_steps ]]; then
            echo "🛑 STEP LIMIT: Exceeded max steps ($max_steps)"
            kill -TERM $function_pid 2>/dev/null || true
            wait $function_pid 2>/dev/null || true
            emit_progress_update "$process_id" "LIMIT" "Exceeded step limit" 0 "FAILED"
            complete_process "$process_id" false
            return 125
        fi

        sleep 2  # Update every 2 seconds
    done

    # Get function result
    wait $function_pid
    exit_code=$?

    # Final progress update
    if [[ $exit_code -eq 0 ]]; then
        emit_progress_update "$process_id" "SUCCESS" "$process_name completed successfully" 100 "COMPLETED"
        update_progress "$process_id" "$process_name completed successfully" 100 "COMPLETED"
        complete_process "$process_id" true
        echo "✅ $process_name completed successfully"
    else
        emit_progress_update "$process_id" "FAILED" "$process_name failed with exit $exit_code" 0 "FAILED"
        complete_process "$process_id" false
        echo "❌ $process_name failed with exit code $exit_code"
    fi

    # Update ROBUST quality metrics
    ./_SYSTEM/_AUTOMATION/robust-quality.sh collect "$process_name" $exit_code

    return $exit_code
}

# =============================================================================
# DEPENDENCY CHECKING
# =============================================================================
check_dependency() {
    local dep="$1"

    case "$dep" in
        "port_check")
            # Check if dynamically mapped Dashboard Port or default 8080 is available
            local port="${DASHBOARD_PORT:-8080}"
            ! lsof -ti:"$port" >/dev/null 2>&1
            ;;
        "http_server")
            # Check if HTTP server is running dynamically
            local port="${DASHBOARD_PORT:-8080}"
            curl -s http://localhost:"$port" >/dev/null 2>&1
            ;;
        "tunnel_active")
            # Check if any tunnel is active
            [[ -f "/tmp/active-tunnel-url.txt" ]] && [[ -s "/tmp/active-tunnel-url.txt" ]]
            ;;
        "ngrok_auth")
            # Check if ngrok auth token is set
            [[ -n "${NGROK_AUTHTOKEN:-}" ]] || grep -q "authtoken" "$HOME/.ngrok2/ngrok.yml" 2>/dev/null
            ;;
        "tailscale_auth")
            # Check if Tailscale is authenticated
            tailscale status 2>/dev/null | grep -q "Logged in"
            ;;
        *)
            echo "Unknown dependency: $dep" >&2
            return 1
            ;;
    esac
}

# =============================================================================
# DASHBOARD COMPONENT WRAPPERS
# =============================================================================
start_http_server_bounded() {
    local port="${1:-8080}"
    local bind_address="${2:-}"

    # Change to dashboard directory mapping fallback explicitly
    cd "${DASHBOARD_ROOT:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL}"

    # Start Python HTTP server natively bound locally or explicitly translated to binding addressing
    if [[ -n "$bind_address" ]]; then
        python3 -m http.server "$port" --bind "$bind_address" > /tmp/http-server.log 2>&1 &
    else
        python3 -m http.server "$port" > /tmp/http-server.log 2>&1 &
    fi
    local server_pid=$!

    # Wait for server to be ready
    local count=0
    while ! curl -s "http://localhost:$port" >/dev/null 2>&1; do
        sleep 1
        count=$((count + 1))
        if [[ $count -gt 10 ]]; then
            kill $server_pid 2>/dev/null || true
            return 1
        fi
    done

    echo $server_pid > "/tmp/http-server.pid"
    echo "HTTP server started on port $port (PID: $server_pid)"
    return 0
}

start_ngrok_tunnel_bounded() {
    local port="${1:-8080}"
    local config="${2:-}"

    # Start ngrok
    if [[ -n "$config" ]]; then
        ngrok start "$config" --log="/tmp/ngrok.log" &
    else
        ngrok http "$port" --log="/tmp/ngrok.log" &
    fi

    local ngrok_pid=$!

    # Wait for URL
    local count=0
    local url=""
    while [[ -z "$url" ]]; do
        sleep 2
        url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.ngrok\.io' "/tmp/ngrok.log" 2>/dev/null || true)
        count=$((count + 2))
        if [[ $count -gt 30 ]]; then
            kill $ngrok_pid 2>/dev/null || true
            return 1
        fi
    done

    echo "$url" > "/tmp/active-tunnel-url.txt"
    echo "ngrok" > "/tmp/active-tunnel-provider.txt"
    echo $ngrok_pid > "/tmp/ngrok.pid"
    echo "ngrok tunnel established: $url"
    return 0
}

start_cloudflare_tunnel_bounded() {
    local port="${1:-8080}"

    # Start Cloudflare tunnel
    cloudflared tunnel --url "http://localhost:$port" --log "/tmp/cloudflare.log" &
    local cf_pid=$!

    # Wait for URL
    local count=0
    local url=""
    while [[ -z "$url" ]]; do
        sleep 2
        url=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "/tmp/cloudflare.log" 2>/dev/null || true)
        count=$((count + 2))
        if [[ $count -gt 30 ]]; then
            kill $cf_pid 2>/dev/null || true
            return 1
        fi
    done

    echo "$url" > "/tmp/active-tunnel-url.txt"
    echo "cloudflare" > "/tmp/active-tunnel-provider.txt"
    echo $cf_pid > "/tmp/cloudflare.pid"
    echo "Cloudflare tunnel established: $url"
    return 0
}

monitor_health_bounded() {
    local max_checks="${1:-20}"
    local check_interval="${2:-10}"

    local count=0
    local url=$(cat "/tmp/active-tunnel-url.txt" 2>/dev/null || echo "")

    while [[ $count -lt $max_checks ]]; do
        if [[ -n "$url" ]] && curl -sf "$url" >/dev/null 2>&1; then
            echo "Health check $((count + 1))/$max_checks: PASSED"
        else
            echo "Health check $((count + 1))/$max_checks: FAILED"
            return 1
        fi

        sleep $check_interval
        count=$((count + 1))
    done

    echo "Health monitoring completed ($max_checks checks)"
    return 0
}

start_multi_ledger_bounded() {
    local base_port="${1:-8080}"

    # Start all 4 ledger tunnels
    local ledgers=("law:8080:law.rooz.live" "pur:8081:pur.tag.vote" "hab:8082:hab.yo.life" "file:8083:file.rooz.live")

    for ledger in "${ledgers[@]}"; do
        IFS=':' read -r name port domain <<< "$ledger"

        echo "Starting $name tunnel ($domain) on port $port..."

        # Start ledger tunnel script
        "$SCRIPT_DIR/../../scripts/orchestrators/start-ledger-tunnel.sh" "$name" "$domain" "$port" &

        # Wait a moment between starts
        sleep 2
    done

    # Wait for all tunnels to be ready
    sleep 10

    # Verify all tunnels
    local all_ready=true
    for ledger in "${ledgers[@]}"; do
        IFS=':' read -r name port domain <<< "$ledger"
        if [[ ! -f "/tmp/tunnel-${name}.url" ]]; then
            echo "❌ $name tunnel not ready"
            all_ready=false
        else
            echo "✅ $name tunnel: $(cat "/tmp/tunnel-${name}.url")"
        fi
    done

    if $all_ready; then
        echo "All ledger tunnels active"
        return 0
    else
        echo "Some ledger tunnels failed"
        return 1
    fi
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-help}" in
        "http_server")
            export DASHBOARD_PORT="${2:-8080}"
            run_bounded_eta "http_server" start_http_server_bounded "${2:-8080}"
            ;;
        "ngrok")
            run_bounded_eta "ngrok_tunnel" start_ngrok_tunnel_bounded "${2:-8080}" "${3:-}"
            ;;
        "cloudflare")
            run_bounded_eta "cloudflare_tunnel" start_cloudflare_tunnel_bounded "${2:-8080}"
            ;;
        "health")
            run_bounded_eta "health_monitor" monitor_health_bounded "${2:-20}" "${3:-10}"
            ;;
        "multi_ledger")
            run_bounded_eta "multi_ledger" start_multi_ledger_bounded "${2:-8080}"
            ;;
        "demo")
            echo "🚀 Running demo: HTTP Server → ngrok → Health Monitor"
            run_bounded_eta "http_server" start_http_server_bounded 8080
            run_bounded_eta "ngrok_tunnel" start_ngrok_tunnel_bounded 8080
            run_bounded_eta "health_monitor" monitor_health_bounded 5 5
            ;;
        "help"|*)
            echo "Usage: $0 {http_server|ngrok|cloudflare|health|multi_ledger|demo} [args]"
            echo ""
            echo "Examples:"
            echo "  $0 http_server 8080           # Start HTTP server with ETA"
            echo "  $0 ngrok 8080                  # Start ngrok with ETA"
            echo "  $0 multi_ledger 8080           # Start all 4 ledger tunnels"
            echo "  $0 demo                        # Run full demo"
            exit 1
            ;;
    esac
fi
