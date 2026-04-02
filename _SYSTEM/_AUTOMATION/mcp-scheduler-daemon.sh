#!/usr/bin/env bash
# _SYSTEM/_AUTOMATION/mcp-scheduler-daemon.sh
# Proactive automated trigger schedule for Daemon logic and Resource Recovery

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    EX_OK=0
fi

log_file="/tmp/mcp-scheduler.log"

run_periodic() {
    local task_name="$1"
    local delay_sec="$2"
    local command="$3"

    while true; do
        # CSQBM Governance Constraint: emit background trace telemetry and enforce ADR-005
        local proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
        [ -f "$proj_root/scripts/validation-core.sh" ] && source "$proj_root/scripts/validation-core.sh" || true

        # Enforce agentdb >96h staleness constraint natively (ADR-005)
        local agentdb_path="$proj_root/agentdb.db"
        if [ ! -f "$agentdb_path" ] && [ -f "$proj_root/../../agentdb.db" ]; then
            agentdb_path="$proj_root/../../agentdb.db"
        fi

        # Extract strict bounds documented in docs/architecture/decisions/005-swarm-persistence-architecture.md
        local ADR_005_MAX_STALENESS_SEC=345600 # 96 hours * 60 mins * 60 secs

        if [ -f "$agentdb_path" ]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                local file_age=$(( $(date +%s) - $(stat -f %m "$agentdb_path") ))
            else
                local file_age=$(( $(date +%s) - $(stat -c %Y "$agentdb_path") ))
            fi
            if [ "$file_age" -gt "$ADR_005_MAX_STALENESS_SEC" ]; then
                echo "[$(date -u)] CSQBM Governance Halt: agentdb.db staleness >96h ($file_age seconds). Task $task_name blocked via TurboQuant-DGM Physical Bounds (ADR-005)." >> "$log_file"
                sleep "$delay_sec"
                continue
            fi
        fi

        if [ -f "$proj_root/scripts/validators/project/check-csqbm.sh" ]; then
            if ! bash "$proj_root/scripts/validators/project/check-csqbm.sh" > /dev/null 2>&1; then
                echo "[$(date -u)] CSQBM Governance Halt: CSQBM trace missing. Task $task_name blocked via OpenWorm Physical Bounds (ADR-005)." >> "$log_file"
                sleep "$delay_sec"
                continue
            fi
        fi

        echo "[$(date -u)] Running scheduled task: $task_name" >> "$log_file"
        eval "$command" >> "$log_file" 2>&1 || true
        sleep "$delay_sec"
    done
}

# Core Monitoring Schedules based on User Directives
echo "[$(date -u)] Starting Automated MCP Scheduling Daemon..." > "$log_file"

# Every 5 min (300s): STX OpenStack Telemetry Bridge (IPMI Hardware bounds)
run_periodic "STX Hardware Telemetry Bridge" 300 "ipmitool chassis status >> /tmp/stx_telemetry.log 2>/dev/null || true; ipmitool sensor list >> /tmp/stx_telemetry.log 2>/dev/null || true" &

# Every 10 min (600s): Resource monitor (proactive cleanup at 95% threshold)
run_periodic "Resource Monitor" 600 "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/resource-monitor.sh" &

# Every 30 min (1800s): Swarm supervisor healthcheck
run_periodic "Swarm Supervisor Heartbeat" 1800 "$PROJECT_ROOT/scripts/orchestrators/swarm-agent-supervisor.sh --check-only" &

# Every 1 hour (3600s): ROAM Watchdog (Check staleness and auto-resolve)
run_periodic "ROAM Watchdog" 3600 "$PROJECT_ROOT/scripts/watchdog/roam-staleness-watchdog.sh" &

# Every 15 min (900s): Active AQE Topology + OpenStack STX Telemetry Bridging
run_periodic "AQE Dynamic Matrix & Telemetry Bridge" 900 "bash $PROJECT_ROOT/scripts/orchestrators/aqe-model-router.sh --dynamic-bridge || npx agentic-qe@latest test --focus telemetry" &

# Every 20 min (1200s): HostBill Sync Engine (STX 12/13 URL Shortener & Billing Telemetry)
run_periodic "HostBill OpenStack Sync Engine" 1200 "python3 $PROJECT_ROOT/scripts/ci/hostbill-sync-agent.py" &

# Every 25 min (1500s): Greenfield K8s Prep Matrix Trace
run_periodic "OpenStack STX Greenfield Conformance" 1500 "bash $PROJECT_ROOT/scripts/ci/stx-k8s-prep-matrix.sh" &

echo "[$(date -u)] All MCP schedules backgrounded." >> "$log_file"
wait
