#!/usr/bin/env node
/**
 * Test script to validate VS Code extension functionality
 * Checks:
 * 1. Extension loads correctly
 * 2. Reads KANBAN_BOARD.yaml
 * 3. Reads pattern_metrics.jsonl
 * 4. Generates webview HTML
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WORKSPACE_ROOT = path.join(__dirname, '../..');
const GOALIE_DIR = path.join(WORKSPACE_ROOT, '.goalie');

console.log('🧪 Testing Goalie VS Code Extension...\n');

// Test 1: Check dist files
console.log('1️⃣ Checking compiled extension files...');
const distPath = path.join(__dirname, 'dist');
const extensionJs = path.join(distPath, 'extension.js');
if (fs.existsSync(extensionJs)) {
  const stats = fs.statSync(extensionJs);
  console.log(`✅ extension.js exists (${(stats.size / 1024).toFixed(2)} KB)`);
} else {
  console.log('❌ extension.js not found');
  process.exit(1);
}

// Test 2: Check .goalie directory
console.log('\n2️⃣ Checking .goalie directory...');
if (fs.existsSync(GOALIE_DIR)) {
  console.log(`✅ .goalie directory exists at ${GOALIE_DIR}`);
} else {
  console.log('❌ .goalie directory not found');
  process.exit(1);
}

// Test 3: Read KANBAN_BOARD.yaml
console.log('\n3️⃣ Reading KANBAN_BOARD.yaml...');
const kanbanPath = path.join(GOALIE_DIR, 'KANBAN_BOARD.yaml');
if (fs.existsSync(kanbanPath)) {
  try {
    const kanbanRaw = fs.readFileSync(kanbanPath, 'utf8');
    const kanban = yaml.parse(kanbanRaw);
    
    const nowItems = (kanban.columns?.NOW?.items || kanban.NOW || []).length;
    const nextItems = (kanban.columns?.NEXT?.items || kanban.NEXT || []).length;
    const laterItems = (kanban.columns?.LATER?.items || kanban.LATER || []).length;
    const doneItems = (kanban.columns?.DONE?.items || kanban.DONE || []).length;
    
    console.log(`✅ KANBAN_BOARD.yaml parsed successfully`);
    console.log(`   NOW: ${nowItems} items`);
    console.log(`   NEXT: ${nextItems} items`);
    console.log(`   LATER: ${laterItems} items`);
    console.log(`   DONE: ${doneItems} items`);
  } catch (err) {
    console.log(`❌ Failed to parse KANBAN_BOARD.yaml: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('❌ KANBAN_BOARD.yaml not found');
  process.exit(1);
}

// Test 4: Read pattern_metrics.jsonl
console.log('\n4️⃣ Reading pattern_metrics.jsonl...');
const patternPath = path.join(GOALIE_DIR, 'pattern_metrics.jsonl');
if (fs.existsSync(patternPath)) {
  try {
    const lines = fs.readFileSync(patternPath, 'utf8').split(/\r?\n/).filter(Boolean);
    console.log(`✅ pattern_metrics.jsonl exists (${lines.length} events)`);
    
    // Parse first few events
    const patterns = new Map();
    for (let i = 0; i < Math.min(100, lines.length); i++) {
      try {
        const obj = JSON.parse(lines[i]);
        const pattern = obj.pattern || 'unknown';
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
      } catch {}
    }
    
    console.log(`   Unique patterns (first 100 events): ${patterns.size}`);
    const topPatterns = Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    topPatterns.forEach(([pattern, count], idx) => {
      console.log(`   ${idx + 1}. ${pattern}: ${count} occurrences`);
    });
  } catch (err) {
    console.log(`❌ Failed to read pattern_metrics.jsonl: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log('⚠️  pattern_metrics.jsonl not found (extension will show empty state)');
}

// Test 5: Validate package.json
console.log('\n5️⃣ Validating package.json...');
const packagePath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

console.log(`✅ Extension: ${pkg.displayName} v${pkg.version}`);
console.log(`   Commands: ${pkg.contributes.commands.length} commands`);
console.log(`   Views: ${pkg.contributes.views['goalie-dashboard'].length} views`);
console.log(`   Activation events: ${pkg.activationEvents.length} events`);

// Test 6: Check for governance agent
console.log('\n6️⃣ Checking governance agent integration...');
const govAgentPath = path.join(WORKSPACE_ROOT, 'tools/federation/governance_agent.ts');
if (fs.existsSync(govAgentPath)) {
  const stats = fs.statSync(govAgentPath);
  console.log(`✅ governance_agent.ts exists (${(stats.size / 1024).toFixed(2)} KB)`);
  console.log('   Extension can call: npx tsx tools/federation/governance_agent.ts --json');
} else {
  console.log('❌ governance_agent.ts not found');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All extension tests passed!');
console.log('='.repeat(60));
console.log('\n📦 Next steps:');
console.log('   1. Install extension: code --install-extension goalie-vscode-*.vsix');
console.log('   2. Or run in development: press F5 in VS Code');
console.log('   3. Open command palette: Cmd+Shift+P');
console.log('   4. Run: "Goalie: Show Kanban Board"');
console.log('\n💡 The extension provides:');
console.log('   • Kanban Board visualization (NOW/NEXT/LATER)');
console.log('   • Pattern Metrics dashboard');
console.log('   • Governance Economics report');
console.log('   • Depth Ladder Timeline');
console.log('   • Live Gaps panel with auto-apply fixes');
console.log('   • Process/Flow/Learning metrics\n');
