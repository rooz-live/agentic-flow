#!/usr/bin/env node
/**
 * Enhanced Status Line for Claude Flow V3
 * - Real-time swarm health monitoring
 * - Hierarchical-mesh topology status
 * - Agent activity tracking
 * - Memory usage indicators
 * - Task queue depth
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function getClaudeFlowStatus() {
  try {
    const { stdout } = await execAsync('npx -y @claude-flow/cli@latest status --json 2>/dev/null');
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

async function getAgentStatus() {
  try {
    const { stdout } = await execAsync('npx -y @claude-flow/cli@latest agent list --json 2>/dev/null');
    return JSON.parse(stdout);
  } catch {
    return { total: 0, active: 0 };
  }
}

async function getSwarmStatus() {
  try {
    const { stdout } = await execAsync('npx -y @claude-flow/cli@latest swarm status --json 2>/dev/null');
    return JSON.parse(stdout);
  } catch {
    return { topology: 'unknown', health: 'unknown' };
  }
}

async function getMemoryStats() {
  try {
    const { stdout } = await execAsync('npx -y @claude-flow/cli@latest memory stats --json 2>/dev/null');
    return JSON.parse(stdout);
  } catch {
    return { entries: 0, backend: 'none', hnsw: false };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getHealthIcon(status) {
  const icons = {
    running: '●',
    stopped: '○',
    degraded: '◐',
    error: '✖',
    unknown: '?'
  };
  return icons[status?.toLowerCase()] || '?';
}

function getTopologyIcon(topology) {
  const icons = {
    'hierarchical': '▲',
    'hierarchical-mesh': '◆',
    'mesh': '✱',
    'star': '✦',
    'unknown': '○'
  };
  return icons[topology] || '○';
}

async function main() {
  try {
    const [status, agents, swarm, memory] = await Promise.all([
      getClaudeFlowStatus(),
      getAgentStatus(),
      getSwarmStatus(),
      getMemoryStats()
    ]);

    const parts = [];

    // Claude Flow status
    const flowStatus = status?.status || 'STOPPED';
    parts.push(`${getHealthIcon(flowStatus)} Claude Flow V3`);

    // Swarm topology
    if (swarm.topology) {
      parts.push(`${getTopologyIcon(swarm.topology)} ${swarm.topology.toUpperCase()}`);
    }

    // Agent count
    const activeAgents = agents.active || 0;
    const totalAgents = agents.total || 0;
    if (totalAgents > 0) {
      parts.push(`👥 ${activeAgents}/${totalAgents} agents`);
    }

    // Memory backend
    if (memory.backend && memory.backend !== 'none') {
      const hnswStatus = memory.hnsw ? '⚡' : '';
      parts.push(`💾 ${memory.backend}${hnswStatus}`);
      if (memory.entries > 0) {
        parts.push(`📊 ${memory.entries} entries`);
      }
    }

    // Task queue (if available)
    if (status?.tasks) {
      const pending = status.tasks.pending || 0;
      const running = status.tasks.running || 0;
      if (pending + running > 0) {
        parts.push(`⏳ ${pending + running} tasks`);
      }
    }

    // Coverage indicator (if available)
    if (status?.coverage) {
      const coverage = Math.round(status.coverage * 100);
      parts.push(`📈 ${coverage}% cov`);
    }

    console.log(`▊ ${parts.join(' │ ')}`);
  } catch (error) {
    console.log('▊ Claude Flow V3');
  }
}

main();
