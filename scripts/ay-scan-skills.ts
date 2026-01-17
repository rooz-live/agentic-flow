#!/usr/bin/env tsx
/**
 * ay Skill Scanner CLI
 * Scans and exports skills for integration into bash script
 * 
 * Usage: npx tsx scripts/ay-scan-skills.ts [auto|iterative|interactive]
 */

import { SkillScanner, SkillContext } from '../src/core/skill-scanner';
import * as path from 'path';
import * as fs from 'fs';

const projectRoot = path.resolve(__dirname, '..');
const mode = (process.argv[2] || 'interactive') as 'auto' | 'iterative' | 'interactive';

async function main() {
  console.log('🔍 Scanning for skills...');
  
  // Create scanner
  const scanner = new SkillScanner(projectRoot);
  const skills = await scanner.scanAll();
  
  console.log(`✅ Found ${skills.length} total skills`);
  console.log('');
  
  // Create context (would be dynamically calculated in real scenario)
  const context: SkillContext = {
    currentHealth: 75,
    currentROAM: 78,
    typescriptErrors: 66,
    testsPassing: 1100,
    deploymentTargets: ['aws', 'stx', 'hivelocity', 'hetzner'],
    mode,
  };
  
  // Select optimal skills
  const optimal = scanner.selectOptimalSkills(context, 10);
  
  console.log(`📋 Top ${optimal.length} skills for ${mode} mode:`);
  console.log('');
  
  optimal.forEach((skill, i) => {
    console.log(`${i + 1}. ${skill.name}`);
    console.log(`   Type: ${skill.type} | Confidence: ${(skill.confidence * 100).toFixed(0)}%`);
    if (skill.command) {
      console.log(`   Command: ${skill.command}`);
    }
    console.log('');
  });
  
  // Export for bash script consumption
  const outputDir = path.join(projectRoot, 'reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'discovered-skills.json');
  scanner.exportSkills(outputPath);
  
  // Also export bash-friendly format
  const bashOutput = optimal.map((skill, i) => ({
    index: i + 1,
    id: skill.id,
    name: skill.name,
    command: skill.command || '',
    type: skill.type,
    healthImpact: skill.impact.health || 0,
  }));
  
  fs.writeFileSync(
    path.join(outputDir, 'ay-skills.json'),
    JSON.stringify({ mode, skills: bashOutput }, null, 2)
  );
  
  // Export bash array format
  const bashScript = `#!/usr/bin/env bash
# Auto-generated skill commands for ay ${mode} mode
# Generated: ${new Date().toISOString()}

declare -A SKILLS
declare -A SKILL_NAMES
declare -A SKILL_TYPES

${bashOutput
  .map(
    (s) => `
SKILLS[${s.index}]="${s.command.replace(/"/g, '\\"')}"
SKILL_NAMES[${s.index}]="${s.name.replace(/"/g, '\\"')}"
SKILL_TYPES[${s.index}]="${s.type}"
`
  )
  .join('\n')}

SKILL_COUNT=${bashOutput.length}
`;
  
  const bashScriptPath = path.join(outputDir, 'ay-skills.sh');
  fs.writeFileSync(bashScriptPath, bashScript);
  fs.chmodSync(bashScriptPath, 0o755);

  console.log(`✅ Exported skills to:`);
  console.log(`   - ${outputPath}`);
  console.log(`   - ${path.join(outputDir, 'ay-skills.json')}`);
  console.log(`   - ${path.join(outputDir, 'ay-skills.sh')}`);
  
  // Print summary by type
  console.log('');
  console.log('📊 Summary by type:');
  const types = ['script', 'deployment', 'test', 'analysis', 'pattern'] as const;
  types.forEach((type) => {
    const count = skills.filter((s) => s.type === type).length;
    if (count > 0) {
      console.log(`   ${type}: ${count}`);
    }
  });
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
