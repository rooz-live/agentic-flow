import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

console.log = (...args: any[]) => {
  process.stderr.write(args.map(String).join(' ') + '\n');
};
console.info = console.log;
console.warn = console.log;
console.error = console.log;

const { SkillsManager } = await import('../domain/skills/skills-manager.ts');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p0-skillmgr-'));

const run1Db = path.join(tempDir, 'skills-run1.sqlite');
const run2Db = path.join(tempDir, 'skills-run2.sqlite');

const mgr1 = new SkillsManager(run1Db);

mgr1.upsertSkill({
  name: 'p0_analyst_skill',
  description: 'P0 analyst skill',
  circle: 'analyst',
  confidence: 76,
  usageCount: 1,
  successCount: 1,
  failureCount: 0,
  tags: ['p0'],
  metadata: { source: 'p0' },
});

mgr1.upsertSkill({
  name: 'p0_assessor_skill',
  description: 'P0 assessor skill',
  circle: 'assessor',
  confidence: 72,
  usageCount: 1,
  successCount: 1,
  failureCount: 0,
  tags: ['p0'],
  metadata: { source: 'p0' },
});

mgr1.upsertSkill({
  name: 'p0_innovator_skill',
  description: 'P0 innovator skill',
  circle: 'innovator',
  confidence: 64,
  usageCount: 1,
  successCount: 1,
  failureCount: 0,
  tags: ['p0'],
  metadata: { source: 'p0' },
});

const exportJson = mgr1.exportSkills();
mgr1.close();

const mgr2 = new SkillsManager(run2Db);
const importResult = mgr2.importSkills(exportJson);

if (importResult.errors.length > 0) {
  console.error(JSON.stringify({ errors: importResult.errors }, null, 2));
  process.exit(1);
}

const scores = mgr2.getModeScores();
mgr2.close();

process.stdout.write(JSON.stringify(scores));
