
import { existsSync, unlinkSync } from 'fs';
import { SkillManager } from '../src/core/skills/skill_manager';

const GOALIE_DIR_RUN1 = '.goalie-skills-run1';
const GOALIE_DIR_RUN2 = '.goalie-skills-run2';
const EXPORT_FILE = 'skills_export.json';

// Helper to calculate mock mode score based on confidence
function getModeScore(confidence: number): number {
  // Simple mapping: 0.9 -> 95, 0.5 -> 70, 0.1 -> 30
  // Formula: 30 + (confidence * 70) roughly
  return Math.floor(30 + (confidence * 70));
}

async function run1() {
  console.log('--- Run 1: Generation & Export ---');
  if (existsSync(GOALIE_DIR_RUN1)) {
    require('fs').rmSync(GOALIE_DIR_RUN1, { recursive: true, force: true });
  }

  const manager = new SkillManager(GOALIE_DIR_RUN1);

  // Register skills with varying confidence
  manager.registerSkill('sql_query', 0.95, 'Execute SQL queries');
  manager.registerSkill('api_call', 0.80, 'Call external APIs');
  manager.registerSkill('new_skill', 0.10, 'Experimental skill');
  manager.registerSkill('data_parse', 0.50, 'Parse JSON/XML');
  manager.registerSkill('legacy_code', 0.30, 'Maintain legacy systems');

  console.log('Registered 5 skills.');

  // Export
  manager.exportSkills(EXPORT_FILE);
  console.log(`Exported skills to ${EXPORT_FILE}`);

  manager.close();
}

async function run2() {
  console.log('\n--- Run 2: Persistence & Usage ---');
  if (existsSync(GOALIE_DIR_RUN2)) {
    require('fs').rmSync(GOALIE_DIR_RUN2, { recursive: true, force: true });
  }

  const manager = new SkillManager(GOALIE_DIR_RUN2);

  // Import
  manager.importSkills(EXPORT_FILE);
  console.log(`Imported skills from ${EXPORT_FILE}`);

  // Verify & Simulate Usage
  const skillsToVerify = ['sql_query', 'new_skill'];

  for (const name of skillsToVerify) {
    const skill = manager.getSkill(name);
    if (!skill) {
      console.error(`FAIL: Skill ${name} not found after import`);
      process.exit(1);
    }

    const score = getModeScore(skill.confidence);
    console.log(`Skill: ${name}, Confidence: ${skill.confidence.toFixed(2)} -> Mode Score: ${score}`);

    if (name === 'sql_query' && score < 90) {
      console.error(`FAIL: High confidence skill ${name} has low score ${score}`);
      process.exit(1);
    }

    if (name === 'new_skill' && score > 50) {
      console.error(`FAIL: Low confidence skill ${name} has high score ${score}`);
      process.exit(1);
    }
  }

  // Feedback Loop Simulation
  console.log('\nSimulating Execution Outcome...');
  console.log('Executing sql_query -> SUCCESS');
  manager.updateOutcome('sql_query', true, 'run-2-test');

  const updatedSql = manager.getSkill('sql_query');
  console.log(`Updated Confidence (sql_query): ${updatedSql?.confidence.toFixed(4)}`);

  if (updatedSql && updatedSql.confidence <= 0.95) {
     console.error('FAIL: Confidence did not increase after success');
     // Note: 0.95 + (0.05 * 0.1) = 0.955
  }

  console.log('Executing new_skill -> FAILURE');
  manager.updateOutcome('new_skill', false, 'run-2-test');

  const updatedNew = manager.getSkill('new_skill');
  console.log(`Updated Confidence (new_skill): ${updatedNew?.confidence.toFixed(4)}`);

  if (updatedNew && updatedNew.confidence >= 0.10) {
     console.error('FAIL: Confidence did not decrease after failure');
  }

  manager.close();

  // Cleanup
  if (existsSync(EXPORT_FILE)) unlinkSync(EXPORT_FILE);
  if (existsSync(GOALIE_DIR_RUN1)) require('fs').rmSync(GOALIE_DIR_RUN1, { recursive: true, force: true });
  if (existsSync(GOALIE_DIR_RUN2)) require('fs').rmSync(GOALIE_DIR_RUN2, { recursive: true, force: true });

  console.log('\n--- P0 Skills Verification Complete ---');
}

async function verify() {
    await run1();
    await run2();
}

verify().catch(console.error);
