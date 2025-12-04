#!/usr/bin/env node

/**
 * process_governor_ingest.js
 *
 * Mirrors processGovernor incidents into logs/learning/events.jsonl and AgentDB hooks.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const LOGS_DIR = path.join(REPO_ROOT, 'logs', 'learning');
const EVENTS_LOG = path.join(LOGS_DIR, 'events.jsonl');
const HOOK_PATH = path.join(REPO_ROOT, '.agentdb', 'hooks', '99-emit-metrics.sh');

// Risk database integration
const RISK_DB_ENABLED = process.env.RISK_DB_ENABLED !== 'false';
const RISK_DB_PATH = process.env.RISK_DB_PATH || path.join(REPO_ROOT, 'risks.db');

let sqlite3;
try {
  sqlite3 = require('sqlite3');
} catch (err) {
  // sqlite3 not installed, will skip risk DB logging
}

function readStdIn() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data.trim()));
    process.stdin.on('error', reject);
  });
}

function buildEvent(rawIncident) {
  const incident = rawIncident || {};
  return {
    timestamp: incident.timestamp || new Date().toISOString(),
    source: process.env.AF_LEARNING_SOURCE || 'processGovernor',
    type: 'process_governor_incident',
    incidentType: incident.type || 'unknown',
    details: incident.details || {},
    stateSnapshot: incident.stateSnapshot || {},
    meta: {
      host: os.hostname(),
      pid: process.pid,
      bridgeVersion: '2025-12-04',
    },
  };
}

function appendToLearningLog(event) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.appendFileSync(EVENTS_LOG, JSON.stringify(event) + '\n');
}

function forwardToAgentDbHook(event) {
  if (!fs.existsSync(HOOK_PATH)) {
    return;
  }

  try {
    const hook = spawn(HOOK_PATH, {
      cwd: REPO_ROOT,
      stdio: ['pipe', 'ignore', 'ignore'],
      env: { ...process.env, AF_LEARNING_BRIDGE: 'processGovernor' },
    });

    hook.stdin.write(JSON.stringify(event));
    hook.stdin.end();
    hook.on('error', (err) => {
      console.warn('[LearningBridge] Hook spawn failed:', err);
    });
  } catch (error) {
    console.warn('[LearningBridge] Unable to forward to AgentDB hook:', error);
  }
}

function logToRiskDb(event) {
  if (!RISK_DB_ENABLED || !sqlite3 || !fs.existsSync(RISK_DB_PATH)) {
    return;
  }

  try {
    const db = new sqlite3.Database(RISK_DB_PATH);
    
    const snapshot = event.stateSnapshot || {};
    const sql = `
      INSERT INTO governor_incidents (
        timestamp, incident_type, active_work, queued_work, 
        completed_work, failed_work, circuit_breaker_state, 
        available_tokens, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(sql, [
      event.timestamp,
      event.incidentType,
      snapshot.activeWork || 0,
      snapshot.queuedWork || 0,
      snapshot.completedWork || 0,
      snapshot.failedWork || 0,
      snapshot.circuitBreaker || 'CLOSED',
      snapshot.availableTokens || 0,
      JSON.stringify(event.details || {})
    ], (err) => {
      if (err) {
        console.warn('[RiskDB] Failed to log incident:', err.message);
      }
      db.close();
    });
  } catch (error) {
    console.warn('[RiskDB] Unable to log to risk database:', error);
  }
}

async function main() {
  try {
    const raw = await readStdIn();
    if (!raw) {
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn('[LearningBridge] Failed to parse incident payload:', err);
      return;
    }

    const event = buildEvent(parsed);
    appendToLearningLog(event);
    forwardToAgentDbHook(event);
    logToRiskDb(event); // NEW: Log to risk database
  } catch (error) {
    console.warn('[LearningBridge] Unexpected error:', error);
  }
}

main();
