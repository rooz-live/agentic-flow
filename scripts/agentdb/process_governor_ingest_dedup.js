#!/usr/bin/env node

/**
 * Process Governor Ingest with Deduplication
 * 
 * Enhanced version of process_governor_ingest.js with event deduplication
 * to ensure learning capture parity with processGovernor.ts events
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const crypto = require('crypto');

const REPO_ROOT = path.join(__dirname, '..', '..');
const LOGS_DIR = path.join(REPO_ROOT, 'logs', 'learning');
const EVENTS_LOG = path.join(LOGS_DIR, 'events.jsonl');
const DEDUP_LOG = path.join(LOGS_DIR, 'processed_events.txt');
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

// Validation logging
const VALIDATION_ENABLED = process.env.LEARNING_BRIDGE_VALIDATION !== 'false';

function logValidation(message) {
  if (VALIDATION_ENABLED) {
    console.log(`[LearningBridge-VALIDATION] ${new Date().toISOString()} - ${message}`);
  }
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

function generateEventId(event) {
  // Create a deterministic hash for deduplication
  const eventString = JSON.stringify({
    timestamp: event.timestamp,
    incidentType: event.incidentType,
    details: event.details
  });
  return crypto.createHash('sha256').update(eventString).digest('hex');
}

function isEventProcessed(eventId) {
  try {
    if (!fs.existsSync(DEDUP_LOG)) {
      return false;
    }
    
    const processedEvents = fs.readFileSync(DEDUP_LOG, 'utf8')
      .split('\n')
      .filter(line => line.trim());
    
    return processedEvents.includes(eventId);
  } catch (error) {
    console.warn('[LearningBridge] Failed to check dedup log:', error);
    return false;
  }
}

function markEventProcessed(eventId) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(DEDUP_LOG, eventId + '\n');
    logValidation(`Event marked as processed: ${eventId.substring(0, 16)}...`);
  } catch (error) {
    console.warn('[LearningBridge] Failed to mark event as processed:', error);
  }
}

function buildEvent(rawIncident) {
  const incident = rawIncident || {};
  const event = {
    timestamp: incident.timestamp || new Date().toISOString(),
    source: process.env.AF_LEARNING_SOURCE || 'processGovernor',
    type: 'process_governor_incident',
    incidentType: incident.type || 'unknown',
    details: incident.details || {},
    stateSnapshot: incident.stateSnapshot || {},
    meta: {
      host: os.hostname(),
      pid: process.pid,
      bridgeVersion: '2025-12-06-dedup',
    },
  };
  
  // Add event ID for deduplication
  event.eventId = generateEventId(event);
  
  return event;
}

function appendToLearningLog(event) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.appendFileSync(EVENTS_LOG, JSON.stringify(event) + '\n');
  logValidation(`Event appended to learning log: ${event.incidentType}`);
}

function forwardToAgentDbHook(event) {
  if (!fs.existsSync(HOOK_PATH)) {
    logValidation('AgentDB hook not found, skipping forward');
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
    logValidation('Event forwarded to AgentDB hook');
    
    hook.on('error', (err) => {
      console.warn('[LearningBridge] Hook spawn failed:', err);
    });
  } catch (error) {
    console.warn('[LearningBridge] Unable to forward to AgentDB hook:', error);
  }
}

function logToRiskDb(event) {
  if (!RISK_DB_ENABLED || !sqlite3 || !fs.existsSync(RISK_DB_PATH)) {
    logValidation('Risk DB disabled or not available, skipping');
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
      snapshot.circuitBreaker || 'UNKNOWN',
      snapshot.availableTokens || 0,
      JSON.stringify(event.details)
    ], (err) => {
      if (err) {
        console.warn('[LearningBridge] Risk DB insert failed:', err);
      } else {
        logValidation('Event logged to risk database');
      }
      db.close();
    });
  } catch (error) {
    console.warn('[LearningBridge] Risk DB logging failed:', error);
  }
}

async function main() {
  logValidation('Starting process governor ingest with deduplication');
  
  try {
    const raw = await readStdIn();
    if (!raw) {
      logValidation('No input received, exiting');
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
    const eventId = event.eventId;
    
    logValidation(`Processing event: ${event.incidentType} (ID: ${eventId.substring(0, 16)}...)`);
    
    // Check for duplicates
    if (isEventProcessed(eventId)) {
      logValidation(`Duplicate event detected, skipping: ${eventId.substring(0, 16)}...`);
      return;
    }
    
    // Process the event
    appendToLearningLog(event);
    forwardToAgentDbHook(event);
    logToRiskDb(event);
    
    // Mark as processed
    markEventProcessed(eventId);
    
    logValidation(`Event processing completed: ${event.incidentType}`);
    
  } catch (error) {
    console.warn('[LearningBridge] Unexpected error:', error);
  }
}

if (require.main === module) {
  main();
}