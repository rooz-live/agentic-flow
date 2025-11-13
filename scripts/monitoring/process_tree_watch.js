#!/usr/bin/env node
/**
 * Process Tree Watch - Real-time monitoring with load alerts
 * 
 * Polls system every 10s, captures process tree snapshot, detects load spikes
 * Integrates with Process Governor incident logging
 * 
 * Usage:
 *   node scripts/monitoring/process_tree_watch.js
 *   node scripts/monitoring/process_tree_watch.js --once  # Run once for validation
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

// Configuration
const POLL_INTERVAL_MS = 10000; // 10 seconds
const CPU_COUNT = os.cpus().length;
const CAPACITY_THRESHOLD = 0.70; // 70% of CPU count
const LOAD_THRESHOLD = CPU_COUNT * CAPACITY_THRESHOLD;
const SNAPSHOT_FILE = 'logs/process_tree_snapshot.json';
const INCIDENTS_LOG = 'logs/governor_incidents.jsonl';

// Run once flag (for validation)
const RUN_ONCE = process.argv.includes('--once');

/**
 * Get system load averages
 */
function getLoadAverages() {
  const [load1, load5, load15] = os.loadavg();
  return { load1, load5, load15 };
}

/**
 * Parse ps output into process tree
 */
async function captureProcessTree() {
  try {
    const cmd = process.platform === 'darwin'
      ? 'ps -eo pid,ppid,%cpu,%mem,etime,state,command'
      : 'ps -eo pid,ppid,%cpu,%mem,etime,stat,cmd';
    
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer
    const lines = stdout.trim().split('\n').slice(1); // Skip header
    
    const processes = [];
    
    for (const line of lines) {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d:-]+)\s+(\S+)\s+(.+)$/);
      if (!match) continue;
      
      const [, pidStr, ppidStr, cpuStr, memStr, elapsedStr, state, command] = match;
      
      processes.push({
        pid: parseInt(pidStr, 10),
        ppid: parseInt(ppidStr, 10),
        cpu: parseFloat(cpuStr),
        mem: parseFloat(memStr),
        elapsed: elapsedStr,
        state: state,
        command: command.slice(0, 120), // Truncate long commands
      });
    }
    
    return processes;
  } catch (err) {
    console.error('[ProcessWatch] Failed to capture process tree:', err);
    return [];
  }
}

/**
 * Build parent-child relationship map
 */
function buildProcessTree(processes) {
  const tree = {};
  const rootProcesses = [];
  
  // Group by parent PID
  for (const proc of processes) {
    if (proc.ppid === 0 || proc.ppid === 1) {
      rootProcesses.push(proc);
    } else {
      if (!tree[proc.ppid]) {
        tree[proc.ppid] = [];
      }
      tree[proc.ppid].push(proc);
    }
  }
  
  return { tree, rootProcesses };
}

/**
 * Check for load spike and log alert
 */
function checkLoadAlert(loads) {
  const { load1, load5, load15 } = loads;
  
  if (load1 > LOAD_THRESHOLD) {
    const alert = {
      pid: 0,
      ppid: 0,
      command: 'LOAD_ALERT',
      reason: 'system_overload',
      action: 'warn',
      timestamp: new Date().toISOString(),
      load1,
      load5,
      load15,
      cpu_count: CPU_COUNT,
      threshold: LOAD_THRESHOLD,
      headroom_pct: ((CPU_COUNT - load1) / CPU_COUNT * 100).toFixed(1),
    };
    
    console.warn(
      `[ProcessWatch] LOAD SPIKE: ${load1.toFixed(2)} (threshold: ${LOAD_THRESHOLD.toFixed(1)}, ` +
      `headroom: ${alert.headroom_pct}%)`
    );
    
    // Log to governor incidents file
    try {
      const logDir = path.dirname(INCIDENTS_LOG);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(INCIDENTS_LOG, JSON.stringify(alert) + '\n');
    } catch (err) {
      console.error('[ProcessWatch] Failed to log alert:', err);
    }
  }
}

/**
 * Write snapshot to JSON file
 */
function writeSnapshot(data) {
  try {
    const snapshotDir = path.dirname(SNAPSHOT_FILE);
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }
    
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[ProcessWatch] Failed to write snapshot:', err);
  }
}

/**
 * Main monitoring loop
 */
async function monitorLoop() {
  const loads = getLoadAverages();
  const processes = await captureProcessTree();
  const { tree, rootProcesses } = buildProcessTree(processes);
  
  const snapshot = {
    timestamp: new Date().toISOString(),
    system: {
      cpu_count: CPU_COUNT,
      load1: loads.load1,
      load5: loads.load5,
      load15: loads.load15,
      threshold: LOAD_THRESHOLD,
      headroom_pct: ((CPU_COUNT - loads.load1) / CPU_COUNT * 100).toFixed(1),
    },
    process_count: processes.length,
    interesting_processes: processes.filter(p => 
      /jest|stress|claude-flow|test-runner|node/i.test(p.command) && p.cpu > 1.0
    ),
    tree,
    rootProcesses,
  };
  
  // Write snapshot
  writeSnapshot(snapshot);
  
  // Check for load alerts
  checkLoadAlert(loads);
  
  // Log status
  console.log(
    `[ProcessWatch] ${new Date().toISOString()} - ` +
    `Load: ${loads.load1.toFixed(2)}/${loads.load5.toFixed(2)}/${loads.load15.toFixed(2)}, ` +
    `Processes: ${processes.length}, ` +
    `Interesting: ${snapshot.interesting_processes.length}`
  );
  
  // Continue loop unless --once
  if (!RUN_ONCE) {
    setTimeout(monitorLoop, POLL_INTERVAL_MS);
  }
}

// Start monitoring
console.log(`[ProcessWatch] Starting process tree monitoring (CPU=${CPU_COUNT}, threshold=${LOAD_THRESHOLD.toFixed(1)})`);
monitorLoop().catch((err) => {
  console.error('[ProcessWatch] Fatal error:', err);
  process.exit(1);
});
