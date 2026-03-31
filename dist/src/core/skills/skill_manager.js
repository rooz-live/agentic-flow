import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
export class SkillManager {
    db;
    dbPath;
    constructor(baseDir = '.goalie') {
        if (!existsSync(baseDir)) {
            mkdirSync(baseDir, { recursive: true });
        }
        this.dbPath = join(baseDir, 'agentdb.db');
        this.db = new Database(this.dbPath);
        this.initializeSchema();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        confidence REAL DEFAULT 0.5,
        usage_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        last_used_at INTEGER,
        created_at INTEGER,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_skills_confidence ON skills(confidence DESC);

      CREATE TABLE IF NOT EXISTS skill_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        skill_id TEXT,
        run_id TEXT,
        context TEXT,
        outcome TEXT,
        timestamp INTEGER
      );
    `);
    }
    registerSkill(name, confidence = 0.5, description = '') {
        const now = Date.now();
        const id = name.toLowerCase().replace(/\s+/g, '_');
        const stmt = this.db.prepare(`
      INSERT INTO skills (id, name, description, confidence, created_at, last_used_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
      confidence = excluded.confidence,
      last_used_at = excluded.last_used_at
    `);
        stmt.run(id, name, description, confidence, now, now);
    }
    getSkill(name) {
        const id = name.toLowerCase().replace(/\s+/g, '_');
        const row = this.db.prepare('SELECT * FROM skills WHERE id = ?').get(id);
        if (!row)
            return undefined;
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            confidence: row.confidence,
            usageCount: row.usage_count,
            successCount: row.success_count,
            lastUsedAt: row.last_used_at,
            createdAt: row.created_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        };
    }
    updateOutcome(name, success, runId = 'unknown') {
        const skill = this.getSkill(name);
        if (!skill)
            return;
        const newConfidence = success
            ? skill.confidence + (1 - skill.confidence) * 0.1
            : skill.confidence * 0.8;
        const now = Date.now();
        this.db.prepare(`
      UPDATE skills
      SET confidence = ?,
          usage_count = usage_count + 1,
          success_count = success_count + ?,
          last_used_at = ?
      WHERE id = ?
    `).run(newConfidence, success ? 1 : 0, now, skill.id);
        // Log validation
        this.db.prepare(`
        INSERT INTO skill_validations (skill_id, run_id, context, outcome, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `).run(skill.id, runId, 'execution', success ? 'SUCCESS' : 'FAILURE', now);
    }
    exportSkills(path) {
        const skills = this.db.prepare('SELECT * FROM skills').all();
        writeFileSync(path, JSON.stringify(skills, null, 2));
    }
    importSkills(path) {
        if (!existsSync(path))
            return;
        const content = readFileSync(path, 'utf-8');
        const skills = JSON.parse(content);
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO skills (id, name, description, confidence, usage_count, success_count, last_used_at, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const importTx = this.db.transaction((skills) => {
            for (const s of skills) {
                stmt.run(s.id, s.name, s.description, s.confidence, s.usage_count, s.success_count, s.last_used_at, s.created_at, s.metadata);
            }
        });
        importTx(skills);
    }
    close() {
        this.db.close();
    }
}
export default SkillManager;
//# sourceMappingURL=skill_manager.js.map