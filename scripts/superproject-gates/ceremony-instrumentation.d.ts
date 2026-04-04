/**
 * @fileoverview Ceremony Instrumentation with State Tracking
 *
 * Enhances all 6 ceremonies (assessor, orchestrator, seeker, analyst, innovator, intuitive)
 * with before/after state snapshots for remediation effectiveness tracking.
 *
 * **Usage in bash scripts:**
 * ```bash
 * # Before ceremony
 * BEFORE_STATE=$(node -e "import('./dist/core/ceremony-instrumentation.js').then(m => m.captureSystemState().then(s => console.log(JSON.stringify(s))))")
 *
 * # Execute ceremony
 * ./scripts/ay-yo-seeker-replenish.sh
 *
 * # After ceremony
 * AFTER_STATE=$(node -e "import('./dist/core/ceremony-instrumentation.js').then(m => m.captureSystemState().then(s => console.log(JSON.stringify(s))))")
 *
 * # Record observation
 * node -e "import('./dist/core/ceremony-instrumentation.js').then(m => m.recordCeremonyExecution({
 *   episodeId: 'ep_xxx',
 *   circle: 'seeker',
 *   ceremony: 'replenish',
 *   beforeState: $BEFORE_STATE,
 *   afterState: $AFTER_STATE,
 *   actions: [{type: 'fix_config', outcome: 'success'}]
 * }))"
 * ```
 */
import { Circle } from './completion-tracker.js';
export interface SystemState {
    timestamp: number;
    ssh_reachable: boolean;
    ssh_host?: string;
    ssh_port?: number;
    ssh_error?: string;
    services_healthy: string[];
    services_unhealthy: string[];
    config_placeholders: string[];
    config_valid: boolean;
    memory_available_mb: number;
    disk_free_gb: number;
    mcp_responsive: boolean;
    database_accessible: boolean;
    custom_metrics?: Record<string, any>;
}
export interface CeremonyAction {
    action_type: string;
    description: string;
    outcome: 'success' | 'failure' | 'partial';
    details?: Record<string, any>;
}
export interface CeremonyExecution {
    episode_id: string;
    circle: Circle;
    ceremony: string;
    before_state: SystemState;
    after_state: SystemState;
    actions: CeremonyAction[];
    timestamp: number;
}
/**
 * Capture current system state snapshot
 *
 * Probes:
 * - SSH connectivity (from .env)
 * - System services (docker, nginx, etc.)
 * - Configuration validity
 * - Resource availability
 * - Application health (MCP, database)
 */
export declare function captureSystemState(): Promise<SystemState>;
/**
 * Record a ceremony execution with before/after state snapshots
 *
 * This stores the observation in causal_observations table for later analysis.
 */
export declare function recordCeremonyExecution(execution: CeremonyExecution): Promise<void>;
/**
 * CLI entry point for capturing state
 *
 * Usage: node -e "import('./dist/core/ceremony-instrumentation.js').then(m => m.captureStateJSON())"
 */
export declare function captureStateJSON(): Promise<void>;
/**
 * CLI entry point for recording ceremony
 *
 * Usage: node -e "import('./dist/core/ceremony-instrumentation.js').then(m => m.recordCeremonyJSON(process.argv[1]))" "$(cat /tmp/ceremony-execution.json)"
 */
export declare function recordCeremonyJSON(executionJSON: string): Promise<void>;
//# sourceMappingURL=ceremony-instrumentation.d.ts.map