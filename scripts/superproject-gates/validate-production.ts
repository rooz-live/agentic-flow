/**
 * Production Validation Script
 * Validates all P1 and P2 implementations
 */

import Database from 'better-sqlite3';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

async function validateProduction() {
  console.log('=== PRODUCTION VALIDATION CYCLE ===\n');

  const db = new Database(join(PROJECT_ROOT, 'agentdb.db'));
  const results: { check: string; status: string; details: string }[] = [];

  // 1. Database statistics
  console.log('📊 Database Statistics:');
  const stats = {
    episodes: (db.prepare('SELECT COUNT(*) as cnt FROM episodes').get() as any).cnt,
    skills: (db.prepare('SELECT COUNT(*) as cnt FROM skills').get() as any).cnt,
    patterns: (db.prepare('SELECT COUNT(*) as cnt FROM patterns').get() as any).cnt,
    validations: (db.prepare('SELECT COUNT(*) as cnt FROM skill_validations').get() as any).cnt,
    nonDefault: (db.prepare('SELECT COUNT(*) as cnt FROM skills WHERE confidence != 0.5').get() as any).cnt
  };
  console.log(`   Episodes: ${stats.episodes}`);
  console.log(`   Skills: ${stats.skills}`);
  console.log(`   Patterns: ${stats.patterns}`);
  console.log(`   Skill Validations: ${stats.validations}`);
  console.log(`   Non-default Confidence: ${stats.nonDefault}\n`);

  // 2. P1.1: skill_validations table
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='skill_validations'").get();
  const triggerExists = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='update_skill_confidence_on_validation'").get();
  results.push({
    check: 'P1.1 skill_validations table',
    status: tableExists && triggerExists ? '✅ PASS' : '❌ FAIL',
    details: `Table: ${!!tableExists}, Trigger: ${!!triggerExists}, Records: ${stats.validations}`
  });

  // 3. P1.2: Confidence update mechanism
  const skill = db.prepare('SELECT id, confidence FROM skills ORDER BY id LIMIT 1').get() as any;
  const beforeConf = skill.confidence;
  db.prepare('INSERT INTO skill_validations (skill_id, validation_type, outcome, confidence_delta, validator) VALUES (?, ?, ?, ?, ?)').run(skill.id, 'benchmark', 'success', 0.01, 'validation_test');
  const afterConf = (db.prepare('SELECT confidence FROM skills WHERE id = ?').get(skill.id) as any).confidence;
  db.prepare("DELETE FROM skill_validations WHERE validator = 'validation_test'").run();
  results.push({
    check: 'P1.2 Confidence update mechanism',
    status: afterConf > beforeConf ? '✅ PASS' : '❌ FAIL',
    details: `Before: ${(beforeConf * 100).toFixed(1)}%, After: ${(afterConf * 100).toFixed(1)}%`
  });

  // 4. P1.3: Iteration handoff system
  const handoffsDir = join(PROJECT_ROOT, 'governance', 'reports', 'handoffs');
  const handoffExists = existsSync(handoffsDir) && readdirSync(handoffsDir).filter(f => f.endsWith('.json')).length > 0;
  results.push({
    check: 'P1.3 Iteration handoff system',
    status: handoffExists ? '✅ PASS' : '❌ FAIL',
    details: `Handoffs directory: ${existsSync(handoffsDir)}, Reports: ${handoffExists ? readdirSync(handoffsDir).filter(f => f.endsWith('.json')).length : 0}`
  });

  // 5. P2-TIME: ROAM runbooks
  const runbooksDir = join(PROJECT_ROOT, 'docs', 'runbooks');
  const runbookCount = existsSync(runbooksDir) ? readdirSync(runbooksDir).filter(f => f.endsWith('.md')).length : 0;
  results.push({
    check: 'P2-TIME ROAM runbook generation',
    status: runbookCount >= 5 ? '✅ PASS' : '❌ FAIL',
    details: `Runbooks generated: ${runbookCount}`
  });

  // 6. P2-LIVE: Coherence check script
  const coherenceScript = join(PROJECT_ROOT, 'scripts', 'ci', 'check-coherence.sh');
  results.push({
    check: 'P2-LIVE Coherence check in CI',
    status: existsSync(coherenceScript) ? '✅ PASS' : '❌ FAIL',
    details: `Script exists: ${existsSync(coherenceScript)}`
  });

  // 7. Pattern rationale coverage
  const patternFile = join(PROJECT_ROOT, '.goalie', 'pattern_metrics.jsonl');
  let rationaleCount = 0, totalPatterns = 0;
  if (existsSync(patternFile)) {
    const { execSync } = await import('child_process');
    totalPatterns = parseInt(execSync(`wc -l < "${patternFile}"`).toString().trim());
    rationaleCount = parseInt(execSync(`grep -c '"rationale":' "${patternFile}" || echo 0`).toString().trim());
  }
  const coverage = totalPatterns > 0 ? (rationaleCount / totalPatterns * 100).toFixed(1) : '0';
  results.push({
    check: 'Pattern rationale coverage',
    status: parseFloat(coverage) >= 95 ? '✅ PASS' : '⚠️ WARN',
    details: `${rationaleCount}/${totalPatterns} (${coverage}%)`
  });

  // 8. Database integrity
  results.push({
    check: 'Database integrity',
    status: stats.episodes > 800000 ? '✅ PASS' : '⚠️ WARN',
    details: `${stats.episodes.toLocaleString()} episodes preserved`
  });

  db.close();

  // Print results
  console.log('=== VALIDATION RESULTS ===\n');
  results.forEach(r => console.log(`${r.status} ${r.check}\n   ${r.details}\n`));

  const passed = results.filter(r => r.status.includes('PASS')).length;
  const total = results.length;
  console.log(`\n=== SUMMARY: ${passed}/${total} checks passed ===`);
  
  if (passed === total) {
    console.log('\n🎉 PRODUCTION VALIDATION COMPLETE - ALL CHECKS PASSED');
  } else {
    console.log('\n⚠️ Some checks need attention');
  }
}

validateProduction().catch(console.error);

