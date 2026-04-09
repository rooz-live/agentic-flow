import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

type ExportedSkill = { name: string; description: string; code?: string };

function die(msg: string): never {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): void {
  const res = spawnSync(cmd, args, { encoding: 'utf-8', cwd: process.cwd(), env });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`Command failed (${cmd} ${args.join(' ')}): ${res.status}\n${res.stderr || res.stdout}`);
  }
}

function exportSkills(dbPath: string, outPath: string): void {
  const absDb = path.resolve(dbPath);
  const absOut = path.resolve(outPath);

  if (!fs.existsSync(absDb)) {
    die(`AgentDB file not found: ${absDb}`);
  }

  const db = new Database(absDb, { readonly: true });
  try {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='skills'").get() as { name: string } | undefined;
    if (!row) {
      fs.writeFileSync(absOut, JSON.stringify({ exportedAt: new Date().toISOString(), skills: [] }, null, 2));
      return;
    }

    const cols = db.prepare('PRAGMA table_info(skills)').all() as Array<{ name: string }>;
    const names = new Set(cols.map(c => c.name));

    const skillsRows = db.prepare('SELECT * FROM skills').all() as Array<Record<string, any>>;
    const skills: ExportedSkill[] = skillsRows
      .map(r => ({
        name: String(r.name ?? ''),
        description: String(r.description ?? ''),
        code: names.has('code') ? String(r.code ?? '') : (names.has('pattern') ? String(r.pattern ?? '') : undefined),
      }))
      .filter(s => s.name.length > 0);

    fs.writeFileSync(absOut, JSON.stringify({ exportedAt: new Date().toISOString(), skills }, null, 2));
  } finally {
    db.close();
  }
}

function importSkills(dbPath: string, inPath: string): void {
  const absIn = path.resolve(inPath);
  if (!fs.existsSync(absIn)) {
    die(`Snapshot file not found: ${absIn}`);
  }

  const data = JSON.parse(fs.readFileSync(absIn, 'utf-8')) as { skills?: ExportedSkill[] };
  const skills = Array.isArray(data.skills) ? data.skills : [];

  for (const s of skills) {
    run(
      'npx',
      ['agentdb', 'skill', 'create', s.name, s.description || s.name, s.code || ''],
      { ...process.env, AGENTDB_PATH: dbPath }
    );
  }
}

const [command, dbPath, filePath] = process.argv.slice(2);

if (!command || !dbPath || !filePath) {
  die('Usage: p0-agentdb-skills-worker.ts <export|import> <dbPath> <filePath>');
}

if (command === 'export') {
  exportSkills(dbPath, filePath);
} else if (command === 'import') {
  importSkills(dbPath, filePath);
} else {
  die(`Unknown command: ${command}`);
}
