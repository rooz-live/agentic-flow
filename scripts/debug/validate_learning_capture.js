#!/usr/bin/env node

/**
 * Learning Capture Validation Script
 * 
 * Validates the flow from processGovernor.ts to learning system
 * Tests for parity between governor incidents and learning events
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const GOVERNOR_LOG = path.join(PROJECT_ROOT, 'logs', 'governor_incidents.jsonl');
const LEARNING_LOG = path.join(PROJECT_ROOT, 'logs', 'learning', 'events.jsonl');

// Colors for output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

function log(message, color = NC) {
  console.log(`${color}[VALIDATION]${NC} ${message}`);
}

function logError(message) {
  console.log(`${RED}[VALIDATION ERROR]${NC} ${message}`);
}

function logSuccess(message) {
  console.log(`${GREEN}[VALIDATION SUCCESS]${NC} ${message}`);
}

function logWarning(message) {
  console.log(`${YELLOW}[VALIDATION WARNING]${NC} ${message}`);
}

function countLines(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.trim().split('\n').length;
    }
    return 0;
  } catch (error) {
    logError(`Failed to count lines in ${filePath}: ${error.message}`);
    return 0;
  }
}

function parseJsonLines(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            logWarning(`Failed to parse JSON line: ${line.substring(0, 50)}...`);
            return null;
          }
        })
        .filter(item => item !== null);
    }
    return [];
  } catch (error) {
    logError(`Failed to parse JSON lines in ${filePath}: ${error.message}`);
    return [];
  }
}

function validateLearningCaptureParity() {
  log('Starting learning capture parity validation...');
  
  // Count incidents in both logs
  const governorCount = countLines(GOVERNOR_LOG);
  const learningCount = countLines(LEARNING_LOG);
  
  log(`Governor incidents: ${governorCount}`);
  log(`Learning events: ${learningCount}`);
  
  if (governorCount === 0 && learningCount === 0) {
    logWarning('Both logs are empty - cannot validate parity');
    return false;
  }
  
  const ratio = learningCount > 0 ? (governorCount / learningCount).toFixed(2) : 'N/A';
  log(`Current ratio (governor:learning): ${ratio}`);
  
  // Expected ratio should be much closer to 1:1 for proper parity
  if (ratio === 'N/A' || parseFloat(ratio) > 100) {
    logError('CRITICAL: Learning capture parity gap detected!');
    logError(`Expected: ~1:1 ratio, Actual: ${ratio}`);
    return false;
  }
  
  logSuccess('Learning capture parity appears acceptable');
  return true;
}

function testProcessGovernorEventGeneration() {
  log('Testing processGovernor event generation...');
  
  // Test if processGovernor can generate events
  const testScript = `
    const { processGovernor } = require('./src/runtime/processGovernor.ts');
    
    // Generate a test incident
    processGovernor.logIncident('RATE_LIMITED', { 
      test: true,
      activeWork: 5,
      queuedWork: 10
    });
    
    console.log('Test incident generated. Check logs for validation.');
  `;
  
  try {
    const result = spawn('node', ['-e', testScript], {
      cwd: PROJECT_ROOT,
      stdio: ['inherit', 'inherit']
    });
    
    result.on('exit', (code) => {
      if (code === 0) {
        logSuccess('ProcessGovernor event generation test completed');
      } else {
        logError(`ProcessGovernor test failed with exit code: ${code}`);
      }
    });
  } catch (error) {
    logError(`Failed to test ProcessGovernor: ${error.message}`);
  }
}

function testLearningBridgeIngestion() {
  log('Testing learning bridge ingestion...');
  
  // Test the learning bridge with sample data
  const testData = {
    timestamp: new Date().toISOString(),
    type: 'CPU_OVERLOAD',
    details: { test: true, cpuUsage: 95 },
    stateSnapshot: {
      activeWork: 3,
      queuedWork: 5,
      completedWork: 10,
      failedWork: 1,
      circuitBreaker: 'CLOSED',
      availableTokens: 15,
      queuedIncidents: 2
    }
  };
  
  try {
    const result = spawn('node', ['./scripts/agentdb/process_governor_ingest.js'], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe'],
      input: JSON.stringify(testData)
    });
    
    result.on('exit', (code) => {
      if (code === 0) {
        logSuccess('Learning bridge ingestion test completed');
      } else {
        logError(`Learning bridge test failed with exit code: ${code}`);
      }
    });
  } catch (error) {
    logError(`Failed to test learning bridge: ${error.message}`);
  }
}

function main() {
  log('=== Learning Capture Validation ===');
  log(`Timestamp: ${new Date().toISOString()}`);
  log(`Project Root: ${PROJECT_ROOT}`);
  log('');
  
  // Check if required files exist
  const requiredFiles = [
    'src/runtime/processGovernor.ts',
    'scripts/agentdb/process_governor_ingest.js',
    'logs/governor_incidents.jsonl',
    'logs/learning/events.jsonl'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(PROJECT_ROOT, file)));
  if (missingFiles.length > 0) {
    logError('Missing required files:');
    missingFiles.forEach(file => logError(`  - ${file}`));
    return 1;
  }
  
  // Run validation tests
  const parityValid = validateLearningCaptureParity();
  
  if (!parityValid) {
    logError('Learning capture parity validation FAILED');
    return 1;
  }
  
  // Test individual components
  testProcessGovernorEventGeneration();
  testLearningBridgeIngestion();
  
  log('');
  logSuccess('Learning capture validation completed');
  log('Run this script again after fixing issues to verify improvements');
  return 0;
}

if (require.main === module) {
  main();
}