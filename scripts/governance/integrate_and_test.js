#!/usr/bin/env node
/**
 * Integration script to:
 * 1. Generate pattern events
 * 2. Enable decision audit logging
 * 3. Test semantic enrichment
 * 4. Integrate circuit breaker
 */

const fs = require('fs');
const path = require('path');

const GOALIE_DIR = path.join(__dirname, '../../.goalie');
const PATTERN_METRICS = path.join(GOALIE_DIR, 'pattern_metrics.jsonl');

console.log('='.repeat(70));
console.log('GOVERNANCE INTEGRATION & TEST SUITE');
console.log('='.repeat(70));
console.log('');

// Task 1: Generate Pattern Events
console.log('Task 1: Generate Pattern Events');
console.log('-'.repeat(70));

const testEvents = [
  // Circuit breaker events
  {
    ts: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    pattern: 'circuit-breaker',
    run_kind: 'prod-cycle',
    correlation_id: 'test-001',
    iteration: 0,
    circle: 'orchestrator',
    depth: 2,
    mode: 'enforcement',
    mutation: false,
    gate: 'health',
    behavioral_type: 'resilience',
    tags: ['circuit-breaker', 'health', 'resilience'],
    economic: {
      cost_of_delay: 50,
      cod: 50,
      wsjf_score: 25,
      job_duration: 1
    },
    risk_score: 8,
    duration_ms: 150,
    metrics: {
      error_rate: 0.45,
      latency_p95: 850
    }
  },
  // Health check events
  {
    ts: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    pattern: 'health-check',
    run_kind: 'prod-cycle',
    correlation_id: 'test-002',
    iteration: 1,
    circle: 'assessor',
    depth: 1,
    mode: 'advisory',
    mutation: false,
    gate: 'health',
    behavioral_type: 'observability',
    tags: ['health', 'monitoring'],
    economic: {
      cost_of_delay: 10,
      cod: 10,
      wsjf_score: 5,
      job_duration: 1
    },
    risk_score: 2,
    duration_ms: 50
  },
  // Guardrail enforcement
  {
    ts: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    pattern: 'guardrail-lock',
    run_kind: 'prod-cycle',
    correlation_id: 'test-003',
    iteration: 2,
    circle: 'orchestrator',
    depth: 1,
    mode: 'enforcement',
    mutation: false,
    gate: 'governance',
    behavioral_type: 'governance',
    tags: ['guardrail', 'governance', 'compliance'],
    economic: {
      cost_of_delay: 30,
      cod: 30,
      wsjf_score: 15,
      job_duration: 1
    },
    risk_score: 5,
    duration_ms: 100
  },
  // Safe degrade event
  {
    ts: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    pattern: 'safe-degrade',
    run_kind: 'prod-cycle',
    correlation_id: 'test-004',
    iteration: 0,
    circle: 'orchestrator',
    depth: 2,
    mode: 'enforcement',
    mutation: false,
    gate: 'health',
    behavioral_type: 'resilience',
    tags: ['safe-degrade', 'resilience'],
    economic: {
      cost_of_delay: 40,
      cod: 40,
      wsjf_score: 20,
      job_duration: 1
    },
    risk_score: 7,
    duration_ms: 200,
    metrics: {
      degradation_level: 0.3
    }
  },
  // Adaptive learning event
  {
    ts: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    pattern: 'adaptive-threshold',
    run_kind: 'prod-cycle',
    correlation_id: 'test-005',
    iteration: 3,
    circle: 'innovator',
    depth: 2,
    mode: 'mutation',
    mutation: true,
    gate: 'wsjf',
    behavioral_type: 'learning',
    tags: ['adaptive', 'learning', 'optimization'],
    economic: {
      cost_of_delay: 15,
      cod: 15,
      wsjf_score: 8,
      job_duration: 1
    },
    risk_score: 4,
    duration_ms: 300
  }
];

try {
  // Ensure directory exists
  if (!fs.existsSync(GOALIE_DIR)) {
    fs.mkdirSync(GOALIE_DIR, { recursive: true });
  }

  // Write events to pattern metrics
  testEvents.forEach(event => {
    fs.appendFileSync(PATTERN_METRICS, JSON.stringify(event) + '\n');
  });

  console.log(`✓ Generated ${testEvents.length} test pattern events`);
  console.log(`  - File: ${PATTERN_METRICS}`);
  console.log(`  - Patterns: circuit-breaker, health-check, guardrail-lock, safe-degrade, adaptive-threshold`);
  console.log('');
} catch (error) {
  console.log(`✗ Error generating events: ${error.message}`);
  console.log('');
}

// Task 2: Verify Decision Audit Integration
console.log('Task 2: Verify Decision Audit Logging');
console.log('-'.repeat(70));

try {
  const auditFile = path.join(GOALIE_DIR, 'governance_decisions.jsonl');
  const dbFile = path.join(GOALIE_DIR, 'agentdb.db');
  
  console.log(`  - JSONL audit file: ${fs.existsSync(auditFile) ? '✓ exists' : '✗ not found'}`);
  console.log(`  - SQLite database: ${fs.existsSync(dbFile) ? '✓ exists' : '✗ not found'}`);
  
  if (fs.existsSync(auditFile)) {
    const lines = fs.readFileSync(auditFile, 'utf-8').trim().split('\n').filter(Boolean);
    console.log(`  - Decision entries: ${lines.length}`);
  }
  
  console.log('');
} catch (error) {
  console.log(`✗ Error checking audit logs: ${error.message}`);
  console.log('');
}

// Task 3: Analyze Semantic Context Coverage
console.log('Task 3: Semantic Context Coverage Analysis');
console.log('-'.repeat(70));

try {
  if (fs.existsSync(PATTERN_METRICS)) {
    const content = fs.readFileSync(PATTERN_METRICS, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    let enrichedCount = 0;
    let totalCount = lines.length;
    const patternsWithContext = new Set();
    const patternsWithoutContext = new Set();
    
    lines.forEach(line => {
      try {
        const event = JSON.parse(line);
        if (event.semantic_context) {
          enrichedCount++;
          patternsWithContext.add(event.pattern);
        } else {
          patternsWithoutContext.add(event.pattern);
        }
      } catch (e) {
        // Skip invalid lines
      }
    });
    
    const coverage = totalCount > 0 ? (enrichedCount / totalCount) * 100 : 0;
    
    console.log(`  - Total events: ${totalCount}`);
    console.log(`  - Enriched events: ${enrichedCount}`);
    console.log(`  - Coverage: ${coverage.toFixed(1)}% (target: >60%)`);
    console.log(`  - Patterns with context: ${patternsWithContext.size}`);
    console.log(`  - Patterns without context: ${patternsWithoutContext.size}`);
    
    const status = coverage >= 60 ? '✓ ADEQUATE' :
                   coverage >= 30 ? '⚠ NEEDS_IMPROVEMENT' : '✗ CRITICAL';
    console.log(`  - Status: ${status}`);
    console.log('');
    
    if (patternsWithoutContext.size > 0) {
      console.log(`  Patterns needing enrichment:`);
      Array.from(patternsWithoutContext).slice(0, 5).forEach(p => {
        console.log(`    - ${p}`);
      });
      console.log('');
    }
  } else {
    console.log('  ✗ Pattern metrics file not found');
    console.log('');
  }
} catch (error) {
  console.log(`✗ Error analyzing coverage: ${error.message}`);
  console.log('');
}

// Task 4: Check Circuit Breaker State
console.log('Task 4: Circuit Breaker Integration Status');
console.log('-'.repeat(70));

try {
  const cbStateFile = path.join(GOALIE_DIR, 'circuit_breaker_state.json');
  const cbMetricsFile = path.join(GOALIE_DIR, 'circuit_breaker_metrics.jsonl');
  const cbLearningFile = path.join(GOALIE_DIR, 'circuit_breaker_learning.json');
  
  console.log(`  - State file: ${fs.existsSync(cbStateFile) ? '✓ exists' : '✗ not found'}`);
  console.log(`  - Metrics file: ${fs.existsSync(cbMetricsFile) ? '✓ exists' : '✗ not found'}`);
  console.log(`  - Learning file: ${fs.existsSync(cbLearningFile) ? '✓ exists' : '✗ not found'}`);
  
  if (fs.existsSync(cbStateFile)) {
    const state = JSON.parse(fs.readFileSync(cbStateFile, 'utf-8'));
    console.log(`  - State: ${state.state}`);
    console.log(`  - Error threshold: ${state.errorThreshold.toFixed(3)}`);
    console.log(`  - Latency threshold: ${state.latencyThreshold.toFixed(0)}ms`);
    console.log(`  - Adaptations: ${state.adaptationCount}`);
    console.log(`  - Total requests: ${state.totalRequests}`);
  }
  
  console.log('');
} catch (error) {
  console.log(`✗ Error checking circuit breaker: ${error.message}`);
  console.log('');
}

// Summary
console.log('='.repeat(70));
console.log('INTEGRATION SUMMARY');
console.log('='.repeat(70));
console.log('');
console.log('Next Steps:');
console.log('1. Run GovernanceSystem.checkCompliance() to generate audit logs');
console.log('2. Enrich pattern events using SemanticContextEnricher');
console.log('3. Generate traffic for circuit breaker learning');
console.log('4. Re-run coverage assessment');
console.log('');
console.log('Commands:');
console.log('  # Test governance system');
console.log('  node scripts/governance/test_governance.js');
console.log('');
console.log('  # Enrich pattern events');
console.log('  node scripts/governance/enrich_events.js');
console.log('');
console.log('  # Test circuit breaker');
console.log('  node scripts/governance/test_circuit_breaker.js');
console.log('');
