/**
 * Ceremony Automation REST API Routes
 *
 * Provides HTTP endpoints for:
 * - Executing ceremonies programmatically
 * - Querying ceremony history
 * - Tracking risks and obstacles
 */

import Database from 'better-sqlite3';
import { exec } from 'child_process';
import { Request, Response, Router } from 'express';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

// Database connections
const getRiskDB = () => {
  const dbPath = path.join(process.cwd(), '.db/risk-traceability.db');
  return new Database(dbPath);
};

/**
 * POST /api/ceremonies/execute
 * Execute a ceremony for a circle
 */
router.post('/execute', async (req: Request, res: Response) => {
  const { circle, ceremony, mode = 'advisory' } = req.body;

  if (!circle || !ceremony) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['circle', 'ceremony']
    });
  }

  // Validate circle/ceremony pairing
  const validCircles = ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive'];
  const validCeremonies = ['standup', 'wsjf', 'review', 'retro', 'refine', 'replenish', 'synthesis'];

  if (!validCircles.includes(circle)) {
    return res.status(400).json({ error: `Invalid circle: ${circle}`, validCircles });
  }

  if (!validCeremonies.includes(ceremony)) {
    return res.status(400).json({ error: `Invalid ceremony: ${ceremony}`, validCeremonies });
  }

  try {
    const scriptPath = path.join(process.cwd(), 'scripts/ay-prod-cycle.sh');
    const { stdout, stderr } = await execAsync(
      `bash ${scriptPath} ${circle} ${ceremony} ${mode}`,
      { timeout: 300000 } // 5 minute timeout
    );

    // Extract episode ID from output
    const episodeMatch = stdout.match(/Episode: (ep_\d+_\w+_\w+)/);
    const episodeId = episodeMatch ? episodeMatch[1] : null;

    // Extract result
    const resultMatch = stdout.match(/Cycle complete \(exit: (\d+)\)/);
    const exitCode = resultMatch ? parseInt(resultMatch[1]) : 0;

    res.json({
      success: exitCode === 0,
      circle,
      ceremony,
      mode,
      episodeId,
      exitCode,
      output: stdout,
      errors: stderr || null
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Ceremony execution failed',
      message: error.message,
      circle,
      ceremony
    });
  }
});

/**
 * GET /api/ceremonies/history/:circle
 * Get ceremony execution history for a circle
 */
router.get('/history/:circle', (req: Request, res: Response) => {
  const { circle } = req.params;
  const { limit = 50, status } = req.query;

  try {
    const db = getRiskDB();

    let query = `
      SELECT
        episode_id,
        check_type,
        check_name,
        passed,
        checked_at
      FROM dor_dod_checks
      WHERE episode_id LIKE '%_${circle}_%'
    `;

    if (status) {
      query += ` AND passed = ${status === 'passed' ? 1 : 0}`;
    }

    query += ` ORDER BY checked_at DESC LIMIT ${limit}`;

    const history = db.prepare(query).all();
    db.close();

    res.json({
      circle,
      totalExecutions: history.length,
      history
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch ceremony history',
      message: error.message
    });
  }
});

/**
 * POST /api/risks/track
 * Track a new risk or update existing risk
 */
router.post('/track', (req: Request, res: Response) => {
  const {
    id,
    title,
    description,
    severity,
    status = 'identified',
    category = 'risk',
    circle,
    ceremony,
    mitigation_strategy_id
  } = req.body;

  if (!id || !title || !severity) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['id', 'title', 'severity']
    });
  }

  try {
    const db = getRiskDB();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO risks (
        id, title, description, severity, status, category, circle, ceremony, mitigation_strategy_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, title, description, severity, status, category, circle, ceremony, mitigation_strategy_id);

    const risk = db.prepare('SELECT * FROM risks WHERE id = ?').get(id);
    db.close();

    res.json({
      success: true,
      risk
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to track risk',
      message: error.message
    });
  }
});

/**
 * GET /api/risks
 * List all risks with optional filters
 */
router.get('/', (req: Request, res: Response) => {
  const { status, severity, circle, limit = 100 } = req.query;

  try {
    const db = getRiskDB();

    let query = 'SELECT * FROM risks WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    if (circle) {
      query += ' AND circle = ?';
      params.push(circle);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const risks = db.prepare(query).all(...params);
    db.close();

    res.json({
      total: risks.length,
      risks
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch risks',
      message: error.message
    });
  }
});

/**
 * GET /api/risks/:id
 * Get a specific risk with full details
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = getRiskDB();

    const risk = db.prepare('SELECT * FROM risks WHERE id = ?').get(id);

    if (!risk) {
      db.close();
      return res.status(404).json({ error: 'Risk not found' });
    }

    // Get related episodes
    const episodes = db.prepare(`
      SELECT episode_id, effectiveness, risk_reduction_achieved, notes, created_at
      FROM risk_episodes
      WHERE risk_id = ?
      ORDER BY created_at DESC
    `).all(id);

    // Get mitigation strategy if applicable
    let mitigation: unknown = null;
    if ((risk as any).mitigation_strategy_id) {
      mitigation = db.prepare('SELECT * FROM mitigation_strategies WHERE id = ?')
        .get((risk as any).mitigation_strategy_id);
    }

    db.close();

    res.json({
      risk,
      episodes,
      mitigation
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch risk details',
      message: error.message
    });
  }
});

/**
 * POST /api/obstacles/track
 * Track an obstacle with ownership
 */
router.post('/obstacles/track', (req: Request, res: Response) => {
  const {
    id,
    type,
    description,
    owner_circle,
    owner_agent,
    related_risk_id
  } = req.body;

  if (!id || !description || !owner_circle) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['id', 'description', 'owner_circle']
    });
  }

  try {
    const db = getRiskDB();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO obstacles (
        id, type, description, owner_circle, owner_agent, related_risk_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, type, description, owner_circle, owner_agent, related_risk_id);

    const obstacle = db.prepare('SELECT * FROM obstacles WHERE id = ?').get(id);
    db.close();

    res.json({
      success: true,
      obstacle
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to track obstacle',
      message: error.message
    });
  }
});

/**
 * GET /api/obstacles
 * List obstacles with ownership info
 */
router.get('/obstacles', (req: Request, res: Response) => {
  const { owner_circle, resolution_status, limit = 100 } = req.query;

  try {
    const db = getRiskDB();

    let query = 'SELECT * FROM obstacles WHERE 1=1';
    const params: any[] = [];

    if (owner_circle) {
      query += ' AND owner_circle = ?';
      params.push(owner_circle);
    }

    if (resolution_status) {
      query += ' AND resolution_status = ?';
      params.push(resolution_status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const obstacles = db.prepare(query).all(...params);
    db.close();

    res.json({
      total: obstacles.length,
      obstacles
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch obstacles',
      message: error.message
    });
  }
});

// ============================================================================
// Scheduler Endpoints
// ============================================================================

/**
 * GET /api/scheduler/schedules
 * List all ceremony schedules
 */
router.get('/scheduler/schedules', (req: Request, res: Response) => {
  try {
    const db = getRiskDB();

    const schedules = db.prepare(`
      SELECT * FROM ceremony_schedules
      ORDER BY circle, ceremony_type
    `).all();

    db.close();

    res.json({ schedules, count: schedules.length });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch schedules',
      message: error.message
    });
  }
});

/**
 * PATCH /api/scheduler/schedules/:id
 * Update ceremony schedule (cron expression, mode, enabled status)
 */
router.patch('/scheduler/schedules/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { cronExpression, mode, enabled } = req.body;

  try {
    const db = getRiskDB();

    const updates: string[] = [];
    const params: any[] = [];

    if (cronExpression !== undefined) {
      updates.push('cron_expression = ?');
      params.push(cronExpression);
    }

    if (mode !== undefined) {
      updates.push('mode = ?');
      params.push(mode);
    }

    if (enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      db.close();
      return res.status(400).json({ error: 'No updates provided' });
    }

    params.push(id);

    const stmt = db.prepare(`
      UPDATE ceremony_schedules
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);

    const schedule = db.prepare('SELECT * FROM ceremony_schedules WHERE id = ?').get(id);
    db.close();

    res.json({ success: true, schedule });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to update schedule',
      message: error.message
    });
  }
});

// ============================================================================
// Circle Proficiency Endpoints
// ============================================================================

/**
 * GET /api/circle-proficiency
 * Get proficiency metrics for all circles (equity + ceremonies + risks)
 */
router.get('/circle-proficiency', async (req: Request, res: Response) => {
  const { circle } = req.query;

  try {
    const db = getRiskDB();

    // Get circle equity from circle_equity database
    const equityDbPath = path.join(process.cwd(), '.db/circle_equity.db');
    const equityDb = new Database(equityDbPath);

    let equityQuery = 'SELECT * FROM circle_equity';
    const equityParams: any[] = [];

    if (circle) {
      equityQuery += ' WHERE circle = ?';
      equityParams.push(circle);
    }

    const equityData = equityDb.prepare(equityQuery).all(...equityParams);
    equityDb.close();

    // Get ceremony execution stats from DoR/DoD checks
    const ceremonyStats = db.prepare(`
      SELECT
        SUBSTR(episode_id, INSTR(episode_id, '_') + 1,
               INSTR(SUBSTR(episode_id, INSTR(episode_id, '_') + 1), '_') - 1) as circle,
        COUNT(DISTINCT episode_id) as total_ceremonies,
        MAX(checked_at) as last_ceremony
      FROM dor_dod_checks
      ${circle ? "WHERE episode_id LIKE '%_" + circle + "_%'" : ''}
      GROUP BY circle
    `).all();

    // Get risk handling stats
    const riskStats = db.prepare(`
      SELECT
        circle,
        COUNT(*) as total_risks,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_risks
      FROM risks
      ${circle ? 'WHERE circle = ?' : ''}
      GROUP BY circle
    `).all(...(circle ? [circle] : []));

    db.close();

    // Merge data
    const proficiency = equityData.map((equity: any) => {
      const ceremony = ceremonyStats.find((c: any) => c.circle === equity.circle) || {} as any;
      const risk = riskStats.find((r: any) => r.circle === equity.circle) || {} as any;

      const totalRisks = (risk.total_risks as number) || 0;
      const resolvedRisks = (risk.resolved_risks as number) || 0;

      return {
        circle: equity.circle,
        skills: {
          total: equity.total_skills,
          avgSuccessRate: parseFloat(equity.avg_success_rate || 0),
          avgReward: parseFloat(equity.avg_reward || 0),
          totalUses: equity.total_uses
        },
        ceremonies: {
          total: (ceremony.total_ceremonies as number) || 0,
          lastExecution: (ceremony.last_ceremony as string) || null
        },
        risks: {
          total: totalRisks,
          resolved: resolvedRisks,
          resolutionRate: totalRisks ? (resolvedRisks / totalRisks * 100).toFixed(1) : 0
        },
        proficiencyScore: calculateProficiencyScore(equity, ceremony, risk),
        lastUpdated: equity.last_updated
      };
    });

    res.json({ proficiency, count: proficiency.length });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to calculate proficiency',
      message: error.message
    });
  }
});

/**
 * Helper function to calculate proficiency score (0-100)
 */
function calculateProficiencyScore(equity: any, ceremony: any, risk: any): number {
  const skillScore = Math.min((equity.total_skills || 0) / 10 * 25, 25);
  const successScore = (equity.avg_success_rate || 0) * 25;
  const ceremonyScore = Math.min((ceremony.total_ceremonies || 0) / 20 * 25, 25);
  const riskScore = risk.total_risks
    ? (risk.resolved_risks / risk.total_risks) * 25
    : 12.5; // Default to 50% if no risks tracked

  return Math.round(skillScore + successScore + ceremonyScore + riskScore);
}

export default router;

/**
 * GET /api/scheduler/schedules
 * List all ceremony schedules
 */
router.get('/scheduler/schedules', (req: Request, res: Response) => {
  try {
    const db = getRiskDB();
    const schedules = db.prepare('SELECT * FROM ceremony_schedules ORDER BY circle, ceremony').all();
    db.close();
    res.json({ total: schedules.length, schedules });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch schedules', message: error.message });
  }
});

/**
 * PATCH /api/scheduler/schedules/:id
 * Update schedule configuration
 */
router.patch('/scheduler/schedules/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const db = getRiskDB();
    const allowedFields = ['enabled', 'auto_execute', 'notify_only', 'cron_expression'];
    const updateFields = Object.keys(updates).filter(k => allowedFields.includes(k));

    if (updateFields.length === 0) {
      db.close();
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = updateFields.map(f => `${f} = ?`).join(', ');
    const values = updateFields.map(f => updates[f]);
    values.push(id);

    const result = db.prepare(`UPDATE ceremony_schedules SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);

    if (result.changes === 0) {
      db.close();
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const updated = db.prepare('SELECT * FROM ceremony_schedules WHERE id = ?').get(id);
    db.close();
    res.json({ success: true, schedule: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update schedule', message: error.message });
  }
});

/**
 * GET /api/circle-proficiency
 * Get circle proficiency metrics
 */
router.get('/circle-proficiency', (req: Request, res: Response) => {
  try {
    const db = getRiskDB();
    const proficiency = db.prepare('SELECT * FROM circle_proficiency ORDER BY proficiency_score DESC').all();
    db.close();
    res.json({ total: proficiency.length, proficiency });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch proficiency', message: error.message });
  }
});
