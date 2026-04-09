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

import { exec } from 'child_process';
import { promisify } from 'util';
import { AgentDB } from './agentdb-client.js';
import { Circle } from './completion-tracker.js';

const execAsync = promisify(exec);

// ════════════════════════════════════════════════════════════════════════════
// System State Snapshot
// ════════════════════════════════════════════════════════════════════════════

export interface SystemState {
  timestamp: number;
  
  // Infrastructure health
  ssh_reachable: boolean;
  ssh_host?: string;
  ssh_port?: number;
  ssh_error?: string;
  
  // Services
  services_healthy: string[];
  services_unhealthy: string[];
  
  // Configuration
  config_placeholders: string[];
  config_valid: boolean;
  
  // Resources
  memory_available_mb: number;
  disk_free_gb: number;
  
  // Application
  mcp_responsive: boolean;
  database_accessible: boolean;
  
  // Custom metrics
  custom_metrics?: Record<string, any>;
}

// ════════════════════════════════════════════════════════════════════════════
// Ceremony Action Tracking
// ════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════
// System State Capture
// ════════════════════════════════════════════════════════════════════════════

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
export async function captureSystemState(): Promise<SystemState> {
  const state: SystemState = {
    timestamp: Date.now(),
    ssh_reachable: false,
    services_healthy: [],
    services_unhealthy: [],
    config_placeholders: [],
    config_valid: false,
    memory_available_mb: 0,
    disk_free_gb: 0,
    mcp_responsive: false,
    database_accessible: false
  };
  
  try {
    // 1. Check SSH connectivity (from .env)
    const sshCheck = await checkSSHConnectivity();
    state.ssh_reachable = sshCheck.reachable;
    state.ssh_host = sshCheck.host;
    state.ssh_port = sshCheck.port;
    state.ssh_error = sshCheck.error;
    
    // 2. Check services health
    const servicesCheck = await checkServicesHealth();
    state.services_healthy = servicesCheck.healthy;
    state.services_unhealthy = servicesCheck.unhealthy;
    
    // 3. Check configuration
    const configCheck = await checkConfiguration();
    state.config_placeholders = configCheck.placeholders;
    state.config_valid = configCheck.valid;
    
    // 4. Check resources
    const resourceCheck = await checkResources();
    state.memory_available_mb = resourceCheck.memoryMB;
    state.disk_free_gb = resourceCheck.diskGB;
    
    // 5. Check application health
    state.mcp_responsive = await checkMCPHealth();
    state.database_accessible = await checkDatabaseHealth();
    
  } catch (error) {
    console.error('Error capturing system state:', error);
  }
  
  return state;
}

// ════════════════════════════════════════════════════════════════════════════
// Health Check Functions
// ════════════════════════════════════════════════════════════════════════════

async function checkSSHConnectivity(): Promise<{
  reachable: boolean;
  host?: string;
  port?: number;
  error?: string;
}> {
  try {
    // Read SSH config from .env
    const { stdout: envOutput } = await execAsync('grep -E "^(STX_HOST|STX_PORT|STX_USER|STX_KEY)" .env 2>/dev/null || true');
    
    const config: Record<string, string> = {};
    for (const line of envOutput.split('\n')) {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim();
      }
    }
    
    const host = config.STX_HOST || config.YOLIFE_STX_HOST;
    const port = parseInt(config.STX_PORT || config.YOLIFE_STX_PORT || '2222');
    const user = config.STX_USER || config.YOLIFE_STX_USER || 'ubuntu';
    const keyFile = config.STX_KEY || config.YOLIFE_STX_KEY;
    
    // Skip if placeholder
    if (!host || host.includes('{{') || host.includes('}}')) {
      return { reachable: false, host, port, error: 'Placeholder host' };
    }
    
    // Try SSH connection (timeout after 3 seconds)
    if (keyFile) {
      const { stderr } = await execAsync(
        `timeout 3 ssh -i ${keyFile} -o ConnectTimeout=3 -o StrictHostKeyChecking=no ${user}@${host} -p ${port} echo OK 2>&1 || echo FAILED`,
        { timeout: 5000 }
      );
      
      const reachable = !stderr.includes('FAILED') && !stderr.includes('refused') && !stderr.includes('timed out');
      return { reachable, host, port, error: reachable ? undefined : stderr.trim() };
    }
    
    return { reachable: false, host, port, error: 'No SSH key configured' };
  } catch (error: any) {
    return { reachable: false, error: error.message };
  }
}

async function checkServicesHealth(): Promise<{ healthy: string[]; unhealthy: string[] }> {
  const healthy: string[] = [];
  const unhealthy: string[] = [];
  
  const services = ['docker', 'nginx', 'postgresql'];
  
  for (const service of services) {
    try {
      const { stdout } = await execAsync(`pgrep -x ${service} >/dev/null 2>&1 && echo RUNNING || echo STOPPED`);
      if (stdout.trim() === 'RUNNING') {
        healthy.push(service);
      } else {
        unhealthy.push(service);
      }
    } catch {
      unhealthy.push(service);
    }
  }
  
  return { healthy, unhealthy };
}

async function checkConfiguration(): Promise<{ placeholders: string[]; valid: boolean }> {
  try {
    const { stdout } = await execAsync('grep -E "\\{\\{[^}]+\\}\\}" .env 2>/dev/null || true');
    const placeholders = stdout.trim().split('\n').filter(Boolean);
    return {
      placeholders,
      valid: placeholders.length === 0
    };
  } catch {
    return { placeholders: [], valid: true };
  }
}

async function checkResources(): Promise<{ memoryMB: number; diskGB: number }> {
  try {
    // Memory (macOS)
    const { stdout: memOutput } = await execAsync('sysctl hw.memsize 2>/dev/null || echo "hw.memsize: 0"');
    const memBytes = parseInt(memOutput.split(':')[1]?.trim() || '0');
    const memoryMB = Math.floor(memBytes / 1024 / 1024);
    
    // Disk (macOS)
    const { stdout: diskOutput } = await execAsync('df -g / | tail -1 | awk \'{print $4}\'');
    const diskGB = parseInt(diskOutput.trim() || '0');
    
    return { memoryMB, diskGB };
  } catch {
    return { memoryMB: 0, diskGB: 0 };
  }
}

async function checkMCPHealth(): Promise<boolean> {
  try {
    // Check if MCP server is responsive (simple heuristic: check if process exists)
    const { stdout } = await execAsync('pgrep -f "claude-flow" >/dev/null 2>&1 && echo RUNNING || echo STOPPED');
    return stdout.trim() === 'RUNNING';
  } catch {
    return false;
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = new AgentDB();
    await db.query('SELECT 1');
    db.close();
    return true;
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Ceremony Execution Recording
// ════════════════════════════════════════════════════════════════════════════

/**
 * Record a ceremony execution with before/after state snapshots
 * 
 * This stores the observation in causal_observations table for later analysis.
 */
export async function recordCeremonyExecution(execution: CeremonyExecution): Promise<void> {
  const db = new AgentDB();
  
  try {
    const observationId = `obs_${execution.timestamp}_${execution.circle}_${execution.ceremony}`;
    
    await db.query(
      `INSERT INTO causal_observations 
       (observation_id, episode_id, circle, ceremony, before_state, after_state, actions, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        observationId,
        execution.episode_id,
        execution.circle,
        execution.ceremony,
        JSON.stringify(execution.before_state),
        JSON.stringify(execution.after_state),
        JSON.stringify(execution.actions),
        execution.timestamp
      ]
    );
    
    console.log(`📊 Recorded ceremony execution: ${execution.circle}/${execution.ceremony}`);
    
    // Calculate state diff
    const diff = calculateStateDiff(execution.before_state, execution.after_state);
    if (diff.changes.length > 0) {
      console.log(`   State changes: ${diff.changes.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error recording ceremony execution:', error);
  } finally {
    db.close();
  }
}

/**
 * Calculate diff between before/after states
 */
function calculateStateDiff(before: SystemState, after: SystemState): {
  changes: string[];
  improvements: number;
  regressions: number;
} {
  const changes: string[] = [];
  let improvements = 0;
  let regressions = 0;
  
  // SSH reachability
  if (before.ssh_reachable !== after.ssh_reachable) {
    changes.push(`ssh_reachable: ${before.ssh_reachable} → ${after.ssh_reachable}`);
    if (after.ssh_reachable) improvements++;
    else regressions++;
  }
  
  // Config validity
  if (before.config_valid !== after.config_valid) {
    changes.push(`config_valid: ${before.config_valid} → ${after.config_valid}`);
    if (after.config_valid) improvements++;
    else regressions++;
  }
  
  // Placeholders
  const beforePlaceholders = before.config_placeholders.length;
  const afterPlaceholders = after.config_placeholders.length;
  if (beforePlaceholders !== afterPlaceholders) {
    changes.push(`placeholders: ${beforePlaceholders} → ${afterPlaceholders}`);
    if (afterPlaceholders < beforePlaceholders) improvements++;
    else regressions++;
  }
  
  // Services
  const beforeHealthy = before.services_healthy.length;
  const afterHealthy = after.services_healthy.length;
  if (beforeHealthy !== afterHealthy) {
    changes.push(`services_healthy: ${beforeHealthy} → ${afterHealthy}`);
    if (afterHealthy > beforeHealthy) improvements++;
    else regressions++;
  }
  
  return { changes, improvements, regressions };
}

// ════════════════════════════════════════════════════════════════════════════
// CLI Helpers (for bash scripts)
// ════════════════════════════════════════════════════════════════════════════

/**
 * CLI entry point for capturing state
 * 
 * Usage: node -e "import('./dist/core/ceremony-instrumentation.js').then(m => m.captureStateJSON())"
 */
export async function captureStateJSON(): Promise<void> {
  const state = await captureSystemState();
  console.log(JSON.stringify(state));
}

/**
 * CLI entry point for recording ceremony
 * 
 * Usage: node -e "import('./dist/core/ceremony-instrumentation.js').then(m => m.recordCeremonyJSON(process.argv[1]))" "$(cat /tmp/ceremony-execution.json)"
 */
export async function recordCeremonyJSON(executionJSON: string): Promise<void> {
  const execution: CeremonyExecution = JSON.parse(executionJSON);
  await recordCeremonyExecution(execution);
}
