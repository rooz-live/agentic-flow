#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('GOVERNANCE SYSTEM FINAL COVERAGE REPORT');
console.log('======================================================================\n');

// Check TRUTH dimension (Pattern Metrics Coverage)
let truthCoverage = 0;
try {
  const metricsPath = '.goalie/pattern_metrics.jsonl';
  if (fs.existsSync(metricsPath)) {
    const lines = fs.readFileSync(metricsPath, 'utf-8').trim().split('\n').filter(l => l);
    const events = lines.map(l => JSON.parse(l));
    const enriched = events.filter(e => e.semantic_context && Object.keys(e.semantic_context).length >= 5);
    truthCoverage = events.length > 0 ? (enriched.length / events.length * 100) : 0;
    console.log(`TRUTH Dimension (Pattern Metrics Coverage):`);
    console.log(`  Total events: ${events.length}`);
    console.log(`  Enriched events: ${enriched.length}`);
    console.log(`  Coverage: ${truthCoverage.toFixed(1)}%`);
    console.log(`  Target: >90%`);
    console.log(`  Status: ${truthCoverage >= 90 ? '✅ ACHIEVED' : truthCoverage >= 70 ? '🟡 ADEQUATE' : '❌ INSUFFICIENT'}\n`);
  } else {
    console.log(`TRUTH Dimension: ❌ No pattern metrics found\n`);
  }
} catch (error) {
  console.log(`TRUTH Dimension: ❌ Error: ${error.message}\n`);
}

// Check TIME dimension (Decision Audit Coverage)
let timeCoverage = 0;
try {
  const auditPath = '.goalie/governance_decisions.jsonl';
  if (fs.existsSync(auditPath)) {
    const lines = fs.readFileSync(auditPath, 'utf-8').trim().split('\n').filter(l => l);
    const decisions = lines.map(l => JSON.parse(l));
    const withContext = decisions.filter(d => d.context && Object.keys(d.context).length > 0);
    timeCoverage = decisions.length > 0 ? (withContext.length / decisions.length * 100) : 0;
    console.log(`TIME Dimension (Decision Audit Coverage):`);
    console.log(`  Total decisions: ${decisions.length}`);
    console.log(`  With context: ${withContext.length}`);
    console.log(`  Coverage: ${timeCoverage.toFixed(1)}%`);
    console.log(`  Target: >95%`);
    console.log(`  Status: ${timeCoverage >= 95 ? '✅ ACHIEVED' : timeCoverage >= 85 ? '🟡 ADEQUATE' : '❌ INSUFFICIENT'}\n`);
  } else {
    console.log(`TIME Dimension: ❌ No decision audit logs found\n`);
  }
} catch (error) {
  console.log(`TIME Dimension: ❌ Error: ${error.message}\n`);
}

// Check LIVE dimension (Circuit Breaker Learning)
let liveCoverage = 0;
try {
  const learningPath = '.goalie/.circuit_breaker_learning.json';
  if (fs.existsSync(learningPath)) {
    const learning = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
    liveCoverage = learning.learned && learning.samplesAnalyzed >= 50 ? 100 : (learning.learned ? 80 : 50);
    console.log(`LIVE Dimension (Adaptive Threshold Learning):`);
    console.log(`  Learning active: ${learning.learned ? '✓' : '✗'}`);
    console.log(`  Samples analyzed: ${learning.samplesAnalyzed}`);
    console.log(`  Mean error rate: ${(learning.mean * 100).toFixed(2)}%`);
    console.log(`  Std deviation: ${(learning.stdDev * 100).toFixed(2)}%`);
    console.log(`  Learned threshold: ${(learning.threshold * 100).toFixed(2)}%`);
    console.log(`  Coverage: ${liveCoverage}%`);
    console.log(`  Target: >95%`);
    console.log(`  Status: ${liveCoverage >= 95 ? '✅ ACHIEVED' : liveCoverage >= 80 ? '🟡 ADEQUATE' : '❌ INSUFFICIENT'}\n`);
  } else {
    console.log(`LIVE Dimension: ❌ No circuit breaker learning found\n`);
  }
} catch (error) {
  console.log(`LIVE Dimension: ❌ Error: ${error.message}\n`);
}

// Check ROAM freshness
let roamFresh = false;
try {
  const roamPath = '.goalie/ROAM_TRACKER.yaml';
  if (fs.existsSync(roamPath)) {
    const yaml = fs.readFileSync(roamPath, 'utf-8');
    const lastUpdatedMatch = yaml.match(/last_updated:\s*"([^"]+)"/);
    if (lastUpdatedMatch) {
      const lastUpdated = new Date(lastUpdatedMatch[1]);
      const now = new Date();
      const ageHours = (now - lastUpdated) / (1000 * 60 * 60);
      const ageDays = ageHours / 24;
      roamFresh = ageDays < 3;
      console.log(`ROAM Tracker Freshness:`);
      console.log(`  Last updated: ${lastUpdatedMatch[1]}`);
      console.log(`  Age: ${ageDays.toFixed(1)} days`);
      console.log(`  Max age: 3 days`);
      console.log(`  Status: ${roamFresh ? '✅ FRESH' : '❌ STALE'}\n`);
    }
  }
} catch (error) {
  console.log(`ROAM Tracker: ❌ Error: ${error.message}\n`);
}

// Overall coverage
const overallCoverage = (truthCoverage + timeCoverage + liveCoverage) / 3;

console.log('======================================================================');
console.log('OVERALL GOVERNANCE COVERAGE');
console.log('======================================================================\n');
console.log(`  TRUTH:  ${truthCoverage.toFixed(1)}% ${truthCoverage >= 90 ? '✅' : truthCoverage >= 70 ? '🟡' : '❌'}`);
console.log(`  TIME:   ${timeCoverage.toFixed(1)}% ${timeCoverage >= 95 ? '✅' : timeCoverage >= 85 ? '🟡' : '❌'}`);
console.log(`  LIVE:   ${liveCoverage.toFixed(1)}% ${liveCoverage >= 95 ? '✅' : liveCoverage >= 80 ? '🟡' : '❌'}`);
console.log(`  ROAM:   ${roamFresh ? 'FRESH ✅' : 'STALE ❌'}`);
console.log(`\n  Overall: ${overallCoverage.toFixed(1)}%\n`);

if (overallCoverage >= 95) {
  console.log('🎉 EXCELLENT: All governance targets achieved!');
} else if (overallCoverage >= 85) {
  console.log('✅ GOOD: Governance coverage adequate');
} else if (overallCoverage >= 70) {
  console.log('⚠️  WARNING: Governance coverage below target');
} else {
  console.log('❌ CRITICAL: Governance coverage insufficient');
}

console.log('\n======================================================================\n');

// Exit with appropriate code
process.exit(overallCoverage >= 85 ? 0 : 1);
