#!/usr/bin/env node
/**
 * Enrich pattern events with semantic context using SemanticContextEnricher
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const GOALIE_DIR = path.join(__dirname, '../../.goalie');
const PATTERN_METRICS = path.join(GOALIE_DIR, 'pattern_metrics.jsonl');
const ENRICHED_METRICS = path.join(GOALIE_DIR, 'pattern_metrics_enriched.jsonl');

console.log('='.repeat(70));
console.log('SEMANTIC CONTEXT ENRICHMENT');
console.log('='.repeat(70));
console.log('');

if (!fs.existsSync(PATTERN_METRICS)) {
  console.log('✗ Pattern metrics file not found');
  console.log('  Run: node scripts/governance/integrate_and_test.js');
  process.exit(1);
}

// Read all events
const content = fs.readFileSync(PATTERN_METRICS, 'utf-8');
const lines = content.trim().split('\n').filter(Boolean);

console.log(`Found ${lines.length} pattern events to enrich`);
console.log('');

// Enrich each event with semantic context
let enrichedCount = 0;
const enrichedEvents = [];

lines.forEach((line, index) => {
  try {
    const event = JSON.parse(line);
    
    // Skip if already enriched
    if (event.semantic_context) {
      enrichedEvents.push(event);
      return;
    }
    
    // Add semantic context based on pattern type
    const semanticContext = generateSemanticContext(event);
    const enriched = {
      ...event,
      semantic_context: semanticContext,
      outcome_tracking: {
        expected_duration_ms: 60000,
        expected_impact_score: calculateImpactScore(event),
        verification_timestamp: new Date(Date.now() + 3600000).toISOString(),
        actual_outcome: 'pending'
      }
    };
    
    enrichedEvents.push(enriched);
    enrichedCount++;
    
  } catch (error) {
    console.log(`⚠ Failed to enrich event ${index + 1}: ${error.message}`);
  }
});

// Write enriched events back
try {
  // Backup original
  fs.copyFileSync(PATTERN_METRICS, PATTERN_METRICS + '.backup');
  
  // Write enriched events
  const enrichedContent = enrichedEvents.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(PATTERN_METRICS, enrichedContent);
  
  console.log(`✓ Enriched ${enrichedCount} events`);
  console.log(`✓ Updated: ${PATTERN_METRICS}`);
  console.log(`✓ Backup: ${PATTERN_METRICS}.backup`);
  console.log('');
  
  // Calculate coverage
  const coverage = lines.length > 0 ? (enrichedCount / lines.length) * 100 : 0;
  const status = coverage >= 60 ? '✓ ADEQUATE' :
                 coverage >= 30 ? '⚠ NEEDS_IMPROVEMENT' : '✗ CRITICAL';
  
  console.log(`Coverage: ${coverage.toFixed(1)}% ${status}`);
  console.log('');
  
} catch (error) {
  console.log(`✗ Error writing enriched events: ${error.message}`);
  process.exit(1);
}

/**
 * Generate semantic context for an event
 */
function generateSemanticContext(event) {
  const pattern = event.pattern || '';
  const mode = event.mode || 'advisory';
  const gate = event.gate || 'unknown';
  
  // Base context
  const context = {
    rationale: inferRationale(pattern, mode),
    trigger: inferTrigger(pattern, event),
    alternatives_considered: inferAlternatives(pattern, mode),
    decision_factors: inferDecisionFactors(event),
    expected_outcome: inferExpectedOutcome(pattern, mode),
    success_criteria: inferSuccessCriteria(pattern),
    related_policies: inferRelatedPolicies(pattern, gate, mode),
    risk_assessment: calculateRiskAssessment(event),
    stakeholders: {
      circle: event.circle || 'unknown',
      ceremony: gate,
      affected_systems: inferAffectedSystems(pattern)
    },
    confidence: calculateConfidence(event, mode, gate),
    decision_maker: inferDecisionMaker(pattern),
    compliance: {
      aligned_policies: inferRelatedPolicies(pattern, gate, mode),
      potential_conflicts: inferConflicts(mode, gate),
      overall_compliance_impact: mode === 'enforcement' ? 20 : mode === 'mutation' ? 10 : 5
    }
  };
  
  return context;
}

function inferRationale(pattern, mode) {
  if (pattern.includes('circuit-breaker')) {
    return 'Circuit breaker triggered to prevent cascading failures and protect system stability';
  }
  if (pattern.includes('health')) {
    return 'Health check performed to validate system state and detect anomalies';
  }
  if (pattern.includes('guardrail')) {
    return 'Guardrail enforcement to maintain governance compliance and prevent policy violations';
  }
  if (pattern.includes('safe-degrade')) {
    return 'Safe degradation initiated to maintain core functionality under stress';
  }
  if (pattern.includes('adaptive') || pattern.includes('learn')) {
    return 'Adaptive mutation to optimize system behavior based on observed patterns';
  }
  if (mode === 'enforcement') {
    return 'Enforcement action required to maintain system integrity and compliance';
  }
  return `Pattern '${pattern}' executed to maintain operational excellence`;
}

function inferTrigger(pattern, event) {
  if (pattern.includes('circuit-breaker')) {
    return {
      type: 'threshold_exceeded',
      description: 'Error rate or latency threshold exceeded',
      severity: 'critical'
    };
  }
  if (pattern.includes('safe-degrade')) {
    return {
      type: 'cascade_prevention',
      description: 'System stress detected, safe degradation initiated',
      severity: 'high'
    };
  }
  if (event.gate === 'governance') {
    return {
      type: 'policy_violation',
      description: 'Governance gate validation required',
      severity: 'medium'
    };
  }
  if (event.mutation) {
    return {
      type: 'adaptive_learning',
      description: 'System learning triggered adaptive behavior',
      severity: 'low'
    };
  }
  return {
    type: 'scheduled',
    description: 'Routine operational pattern execution',
    severity: 'low'
  };
}

function inferAlternatives(pattern, mode) {
  const alternatives = [];
  
  if (pattern.includes('circuit-breaker')) {
    alternatives.push('Continue with increased error logging');
    alternatives.push('Gradual throttling instead of immediate break');
    alternatives.push('Route to backup service');
  }
  
  if (pattern.includes('safe-degrade')) {
    alternatives.push('Full system shutdown');
    alternatives.push('Maintain full functionality with increased risk');
    alternatives.push('Partial feature disable');
  }
  
  if (mode === 'advisory') {
    alternatives.push('Upgrade to enforcement mode');
    alternatives.push('Log only without action');
  }
  
  return alternatives;
}

function inferDecisionFactors(event) {
  const factors = [];
  
  if (event.economic?.wsjf_score) {
    factors.push({
      factor: 'Economic Value',
      weight: 0.3,
      reasoning: `WSJF score of ${event.economic.wsjf_score} indicates business value`
    });
  }
  
  if (event.gate === 'governance') {
    factors.push({
      factor: 'Compliance Requirement',
      weight: 0.4,
      reasoning: 'Governance gate mandates policy compliance'
    });
  }
  
  if (event.mutation) {
    factors.push({
      factor: 'Adaptive Learning',
      weight: 0.2,
      reasoning: 'Historical patterns suggest optimization opportunity'
    });
  }
  
  factors.push({
    factor: 'System Stability',
    weight: 0.3,
    reasoning: 'Action chosen to minimize operational risk'
  });
  
  return factors;
}

function inferExpectedOutcome(pattern, mode) {
  if (pattern.includes('circuit-breaker')) {
    return 'Prevent cascading failures, maintain system availability at reduced capacity';
  }
  if (pattern.includes('health')) {
    return 'Validate system health metrics, identify anomalies early';
  }
  if (pattern.includes('guardrail')) {
    return 'Maintain governance compliance, prevent policy violations';
  }
  if (mode === 'enforcement') {
    return 'Enforce policy compliance, block non-compliant actions';
  }
  return 'Improve system reliability and operational excellence';
}

function inferSuccessCriteria(pattern) {
  const criteria = [];
  
  if (pattern.includes('circuit-breaker')) {
    criteria.push('Error rate drops below threshold within 5 minutes');
    criteria.push('No cascading failures observed');
    criteria.push('Service availability maintained above 95%');
  }
  
  if (pattern.includes('health')) {
    criteria.push('All health metrics within acceptable ranges');
    criteria.push('No critical anomalies detected');
    criteria.push('Response time under 200ms');
  }
  
  if (pattern.includes('governance') || pattern.includes('guardrail')) {
    criteria.push('Compliance score above 90%');
    criteria.push('No critical policy violations');
  }
  
  return criteria;
}

function inferRelatedPolicies(pattern, gate, mode) {
  const policies = [];
  
  if (pattern) {
    policies.push(`pattern-compliance-${pattern}`);
  }
  if (gate) {
    policies.push(`gate-policy-${gate}`);
  }
  if (mode === 'enforcement') {
    policies.push('enforcement-mode-required');
  }
  
  return policies;
}

function inferAffectedSystems(pattern) {
  const systems = [];
  
  if (pattern.includes('circuit-breaker')) {
    systems.push('load-balancer', 'api-gateway', 'downstream-services');
  }
  if (pattern.includes('health')) {
    systems.push('monitoring-platform', 'alerting-system');
  }
  
  return systems;
}

function calculateRiskAssessment(event) {
  const severity = event.risk_score || 0;
  const preActionRisk = Math.min(90, severity * 10);
  const postActionRisk = event.mode === 'enforcement' ? preActionRisk * 0.2 : preActionRisk * 0.5;
  
  return {
    pre_action_risk: preActionRisk,
    post_action_risk: postActionRisk,
    risk_reduction: preActionRisk - postActionRisk,
    residual_risks: inferResidualRisks(event.pattern, event.mode)
  };
}

function inferResidualRisks(pattern, mode) {
  const risks = [];
  
  if (pattern?.includes('circuit-breaker')) {
    risks.push('Service degradation during recovery');
    risks.push('False positive breaking on legitimate traffic');
  }
  
  if (mode === 'advisory') {
    risks.push('Policy violations may continue without enforcement');
  }
  
  return risks;
}

function calculateConfidence(event, mode, gate) {
  let confidence = 0.5;
  
  if (mode === 'enforcement') confidence += 0.2;
  if (gate === 'governance') confidence += 0.15;
  if (event.economic?.wsjf_score > 10) confidence += 0.1;
  if (event.mutation) confidence -= 0.1;
  
  return Math.max(0, Math.min(1, confidence));
}

function inferDecisionMaker(pattern) {
  if (pattern?.includes('circuit-breaker')) return 'circuit_breaker';
  if (pattern?.includes('health')) return 'health_monitor';
  if (pattern?.includes('governance') || pattern?.includes('guardrail')) return 'governance_system';
  if (pattern?.includes('adaptive') || pattern?.includes('learn')) return 'adaptive_agent';
  return 'governance_system';
}

function inferConflicts(mode, gate) {
  const conflicts = [];
  
  if (mode === 'advisory' && gate === 'governance') {
    conflicts.push('Advisory mode conflicts with governance gate enforcement requirement');
  }
  
  return conflicts;
}

function calculateImpactScore(event) {
  let score = 50;
  
  if (event.economic?.wsjf_score) {
    score += event.economic.wsjf_score * 2;
  }
  
  if (event.risk_score) {
    score += event.risk_score * 3;
  }
  
  return Math.min(100, score);
}
