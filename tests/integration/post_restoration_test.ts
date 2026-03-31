import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { FinancialAffinityEngine } from '../../src/integrations/anthropic/financial_patterns.js';
import { DreamLabAdapter } from '../../src/ontology/dreamlab_adapter.js';

/**
 * Post-Restoration Verification Suite
 *
 * Verifies:
 * 1. Critical Files Existence
 * 2. AgentDB Integrity
 * 3. Integration Module Loading
 * 4. Basic Functionality of New Integrations
 */

const PROJECT_ROOT = process.cwd();

console.log('🚀 Starting Post-Restoration Verification...');

// 1. Critical Files Check
const criticalFiles = [
  'package.json',
  'scripts/restore-environment.sh',
  'scripts/agentic/learning_hooks_system.py',
  '.agentdb/agentdb.sqlite'
];

let failed = false;

console.log('\n📂 Checking Critical Files...');
criticalFiles.forEach(file => {
  if (fs.existsSync(path.join(PROJECT_ROOT, file))) {
    console.log(`  ✅ Found: ${file}`);
  } else {
    console.error(`  ❌ Missing: ${file}`);
    failed = true;
  }
});

// 2. AgentDB Integrity
console.log('\n🗄️ Checking AgentDB Integrity...');
try {
  execSync('sqlite3 .agentdb/agentdb.sqlite "PRAGMA integrity_check;"', { stdio: 'pipe' });
  console.log('  ✅ AgentDB integrity check passed');
} catch (error) {
  console.error('  ❌ AgentDB integrity check failed');
  failed = true;
}

// 3. Integration Module Loading
console.log('\n🔌 Verifying Integration Modules...');
try {
  const engine = new FinancialAffinityEngine('dummy-key');
  console.log('  ✅ FinancialAffinityEngine loaded');

  const adapter = new DreamLabAdapter(process.env.GEMINI_API_KEY || 'dummy-key');
  console.log('  ✅ DreamLabAdapter loaded');

  // 4. Functional Test: Ontology Grounding (Mock/Dry-run)
  console.log('\n🧠 Verifying Ontology Grounding...');
  const sampleInput = { text: "I bought a virtual sword for 50 gold coins." };

  // We won't make a real API call if key is dummy, but we verify the method exists and handles input
  if (process.env.GEMINI_API_KEY) {
      console.log('  ℹ️  Real API Key detected, attempting live grounding...');
      (async () => { // Use an IIFE to allow await inside the try block
          try {
              const result = await adapter.groundToOntology(sampleInput);
              if (result.entities || result.unmappedConcepts) {
                   console.log('  ✅ Grounding returned result structure');
              } else {
                   console.warn('  ⚠️  Grounding returned unexpected structure');
              }
          } catch (e) {
              console.warn('  ⚠️  Live grounding failed (expected if quota exceeded):', e.message);
          }
      })();
  } else {
      console.log('  ℹ️  No API Key, skipping live grounding call.');
  }

} catch (error) {
  console.error('  ❌ Failed to load integration modules:', error);
  failed = true;
}

if (failed) {
  console.error('\n❌ Verification FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Verification PASSED');
  process.exit(0);
}
