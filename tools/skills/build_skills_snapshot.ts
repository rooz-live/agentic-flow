import fs from 'node:fs';
import path from 'node:path';

import { buildSkillsSnapshotFromDirectory } from '../../src/core/skills/skillsSnapshot';

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const v = process.argv[idx + 1];
  return v && !v.startsWith('--') ? v : undefined;
}

const cwd = process.cwd();

const skillsDir =
  argValue('--skills-dir') ?? path.join(cwd, '.claude', 'skills');

const outPath =
  argValue('--out') ?? path.join(cwd, '.goalie', 'skills_snapshot.json');

const snapshot = buildSkillsSnapshotFromDirectory(skillsDir);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));

process.stdout.write(outPath + '\n');
