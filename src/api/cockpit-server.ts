#!/usr/bin/env tsx
/**
 * yo.life Digital Cockpit API Server
 * 
 * Provides RESTful endpoints for the yo.life cockpit interface:
 * - /api/cockpit - Main dashboard data
 * - /api/pivot - Dimensional pivot operations
 * - /api/equity - Circle equity balance
 * - /api/roam - ROAM exposure graph data
 * - /api/episodes - Episode storage and retrieval
 * - /api/skills - Circle-specific skill queries
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as roamService from './roam-service-json';
import type { ROAMEntity, ROAMStatus, ROAMType } from './roam-service-json';
import { scheduler } from './ceremony-scheduler';
import type { CeremonySchedule } from './ceremony-scheduler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.COCKPIT_API_PORT || 3030;
const ROOT_DIR = path.resolve(__dirname, '../..');
const SCHEMA_PATH = path.join(ROOT_DIR, 'src/db/schema.sql');

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Circle configuration
const CIRCLES = ['orchestrator', 'assessor', 'innovator', 'analyst', 'seeker', 'intuitive'] as const;
type Circle = typeof CIRCLES[number];

const CIRCLE_CEREMONIES: Record<Circle, string[]> = {
  orchestrator: ['standup'],
  assessor: ['wsjf', 'review'],
  innovator: ['retro'],
  analyst: ['refine'],
  seeker: ['replenish'],
  intuitive: ['synthesis'],
};

/**
 * GET /api/cockpit
 * Main dashboard data aggregation
 */
app.get('/api/cockpit', async (req: Request, res: Response) => {
  try {
    const [status, equity, roam, episodes] = await Promise.all([
      getSystemStatus(),
      getCircleEquity(),
      getROAMExposure(),
      getRecentEpisodes(10),
    ]);

    res.json({
      timestamp: new Date().toISOString(),
      status,
      equity,
      roam,
      episodes,
      circles: CIRCLES.map(circle => ({
        name: circle,
        ceremonies: CIRCLE_CEREMONIES[circle],
        activity: equity.circles[circle] || { count: 0, percentage: 0 },
      })),
    });
  } catch (error) {
    console.error('Error fetching cockpit data:', error);
    res.status(500).json({ error: 'Failed to fetch cockpit data' });
  }
});

/**
 * POST /api/pivot
 * Execute dimensional pivot operations
 */
app.post('/api/pivot', async (req: Request, res: Response) => {
  try {
    const { dimension, value } = req.body;

    if (!dimension || !['temporal', 'spatial', 'economic', 'psychological'].includes(dimension)) {
      return res.status(400).json({ error: 'Invalid dimension' });
    }

    // Execute pivot script
    const { stdout, stderr } = await execAsync(
      `bash ${ROOT_DIR}/scripts/ay-yo-enhanced.sh pivot ${dimension} ${value || ''}`
    );

    res.json({
      success: true,
      dimension,
      value,
      output: stdout,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Pivot error:', error);
    res.status(500).json({ error: error.message || 'Pivot operation failed' });
  }
});

/**
 * GET /api/equity
 * Circle equity balance and distribution
 */
app.get('/api/equity', async (req: Request, res: Response) => {
  try {
    const equity = await getCircleEquity();
    res.json(equity);
  } catch (error) {
    console.error('Error fetching equity:', error);
    res.status(500).json({ error: 'Failed to fetch equity data' });
  }
});

/**
 * GET /api/roam
 * ROAM exposure ontology graph data
 */
app.get('/api/roam', async (req: Request, res: Response) => {
  try {
    const roam = await getROAMExposure();
    res.json(roam);
  } catch (error) {
    console.error('Error fetching ROAM data:', error);
    res.status(500).json({ error: 'Failed to fetch ROAM data' });
  }
});

/**
 * GET /api/episodes
 * Recent episodes with optional circle filter
 */
app.get('/api/episodes', async (req: Request, res: Response) => {
  try {
    const { circle, limit = 20 } = req.query;
    const episodes = await getRecentEpisodes(
      parseInt(limit as string, 10),
      circle as Circle | undefined
    );
    res.json({ episodes, count: episodes.length });
  } catch (error) {
    console.error('Error fetching episodes:', error);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

/**
 * POST /api/episodes
 * Store new episode with circle metadata
 */
app.post('/api/episodes', async (req: Request, res: Response) => {
  try {
    const { circle, ceremony, data } = req.body;

    if (!circle || !CIRCLES.includes(circle)) {
      return res.status(400).json({ error: 'Invalid circle' });
    }

    const episodeFile = path.join(
      ROOT_DIR,
      '.episodes',
      `${circle}_${ceremony}_${Date.now()}.json`
    );

    await fs.mkdir(path.dirname(episodeFile), { recursive: true });
    await fs.writeFile(episodeFile, JSON.stringify(data, null, 2));

    res.json({ success: true, file: episodeFile, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error storing episode:', error);
    res.status(500).json({ error: 'Failed to store episode' });
  }
});

/**
 * GET /api/skills/:circle/:ceremony
 * Query circle-specific skills before execution
 */
app.get('/api/skills/:circle/:ceremony', async (req: Request, res: Response) => {
  try {
    const { circle, ceremony } = req.params;

    if (!CIRCLES.includes(circle as Circle)) {
      return res.status(400).json({ error: 'Invalid circle' });
    }

    const { stdout } = await execAsync(
      `bash ${ROOT_DIR}/scripts/ay-prod-skill-lookup.sh ${circle} ${ceremony}`
    ).catch(() => ({ stdout: '', stderr: '' }));

    const skills = stdout.trim().split(/\s+/).filter(Boolean);

    res.json({
      circle,
      ceremony,
      skills,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

/**
 * POST /api/ceremony
 * Execute ceremony for specified circle (manual execution)
 */
app.post('/api/ceremony', async (req: Request, res: Response) => {
  try {
    const { circle, ceremony, adr } = req.body;

    if (!CIRCLES.includes(circle)) {
      return res.status(400).json({ error: 'Invalid circle' });
    }

    const result = await scheduler.executeManualCeremony(circle as Circle, ceremony, adr);

    res.json({
      ...result,
      circle,
      ceremony,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Ceremony execution error:', error);
    res.status(500).json({ error: error.message || 'Ceremony execution failed' });
  }
});

/**
 * POST /api/ceremony/schedule
 * Create a new ceremony schedule
 */
app.post('/api/ceremony/schedule', async (req: Request, res: Response) => {
  try {
    const schedule: CeremonySchedule = req.body;

    if (!CIRCLES.includes(schedule.circle as any)) {
      return res.status(400).json({ error: 'Invalid circle' });
    }

    const id = scheduler.createSchedule(schedule);
    res.json({ success: true, id, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to create schedule' });
  }
});

/**
 * GET /api/ceremony/schedule
 * Get all ceremony schedules
 */
app.get('/api/ceremony/schedule', async (req: Request, res: Response) => {
  try {
    const { circle } = req.query;
    const schedules = scheduler.getAllSchedules(circle as string);
    res.json({ schedules, count: schedules.length });
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch schedules' });
  }
});

/**
 * GET /api/ceremony/schedule/:id
 * Get schedule by ID
 */
app.get('/api/ceremony/schedule/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? parseInt(req.params.id[0], 10) : parseInt(req.params.id, 10);
    const schedule = scheduler.getScheduleById(id);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error: any) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch schedule' });
  }
});

/**
 * PUT /api/ceremony/schedule/:id
 * Update ceremony schedule
 */
app.put('/api/ceremony/schedule/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? parseInt(req.params.id[0], 10) : parseInt(req.params.id, 10);
    const updates = req.body;

    const success = scheduler.updateSchedule(id, updates);

    if (!success) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to update schedule' });
  }
});

/**
 * DELETE /api/ceremony/schedule/:id
 * Delete ceremony schedule
 */
app.delete('/api/ceremony/schedule/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? parseInt(req.params.id[0], 10) : parseInt(req.params.id, 10);
    const success = scheduler.deleteSchedule(id);

    if (!success) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: error.message || 'Failed to delete schedule' });
  }
});

/**
 * POST /api/roam
 * Create new ROAM entity
 */
app.post('/api/roam', async (req: Request, res: Response) => {
  try {
    const entity: ROAMEntity = req.body;

    if (!entity.type || !entity.title || !entity.owner_circle) {
      return res.status(400).json({ error: 'Missing required fields: type, title, owner_circle' });
    }

    if (!CIRCLES.includes(entity.owner_circle as any)) {
      return res.status(400).json({ error: 'Invalid owner_circle' });
    }

    const id = roamService.createROAM(entity);
    res.json({ success: true, id, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error creating ROAM entity:', error);
    res.status(500).json({ error: error.message || 'Failed to create ROAM entity' });
  }
});

/**
 * GET /api/roam/all
 * Get all ROAM entities with optional filters
 */
app.get('/api/roam/all', async (req: Request, res: Response) => {
  try {
    const { type, status, priority } = req.query;
    const filters: any = {};

    if (type) filters.type = type as ROAMType;
    if (status) filters.status = status as ROAMStatus;
    if (priority) filters.priority = priority;

    const entities = roamService.getAllROAM(filters);
    res.json({ entities, count: entities.length });
  } catch (error: any) {
    console.error('Error fetching ROAM entities:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch ROAM entities' });
  }
});

/**
 * GET /api/roam/:id
 * Get ROAM entity by ID
 */
app.get('/api/roam/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const entity = roamService.getROAMById(id);

    if (!entity) {
      return res.status(404).json({ error: 'ROAM entity not found' });
    }

    res.json(entity);
  } catch (error: any) {
    console.error('Error fetching ROAM entity:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch ROAM entity' });
  }
});

/**
 * PUT /api/roam/:id/status
 * Update ROAM entity status
 */
app.put('/api/roam/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { status, resolution } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Missing required field: status' });
    }

    const success = roamService.updateROAMStatus(id, status, resolution);

    if (!success) {
      return res.status(404).json({ error: 'ROAM entity not found' });
    }

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error updating ROAM status:', error);
    res.status(500).json({ error: error.message || 'Failed to update ROAM status' });
  }
});

/**
 * DELETE /api/roam/:id
 * Delete ROAM entity
 */
app.delete('/api/roam/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const success = roamService.deleteROAM(id);

    if (!success) {
      return res.status(404).json({ error: 'ROAM entity not found' });
    }

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error deleting ROAM entity:', error);
    res.status(500).json({ error: error.message || 'Failed to delete ROAM entity' });
  }
});

/**
 * GET /api/roam/:id/traceability
 * Get full traceability graph for ROAM entity
 */
app.get('/api/roam/:id/traceability', async (req: Request, res: Response) => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const trace = roamService.getROAMTraceability(id);
    res.json(trace);
  } catch (error: any) {
    console.error('Error fetching ROAM traceability:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch traceability' });
  }
});

/**
 * POST /api/roam/:id/link-episode
 * Link ROAM entity to episode
 */
app.post('/api/roam/:id/link-episode', async (req: Request, res: Response) => {
  try {
    const roam_id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { episode_id, impact } = req.body;

    if (!episode_id) {
      return res.status(400).json({ error: 'Missing required field: episode_id' });
    }

    const trace_id = roamService.linkROAMToEpisode(roam_id, episode_id, impact);
    res.json({ success: true, trace_id, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error linking ROAM to episode:', error);
    res.status(500).json({ error: error.message || 'Failed to link ROAM to episode' });
  }
});

/**
 * POST /api/roam/mitigation-plan
 * Create mitigation plan
 */
app.post('/api/roam/mitigation-plan', async (req: Request, res: Response) => {
  try {
    const plan = req.body;

    if (!plan.mitigation_id || !plan.target_roam_id) {
      return res.status(400).json({ error: 'Missing required fields: mitigation_id, target_roam_id' });
    }

    const id = roamService.createMitigationPlan(plan);
    res.json({ success: true, id, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error creating mitigation plan:', error);
    res.status(500).json({ error: error.message || 'Failed to create mitigation plan' });
  }
});

/**
 * GET /api/roam/mitigation-effectiveness
 * Get mitigation effectiveness metrics
 */
app.get('/api/roam/mitigation-effectiveness', async (req: Request, res: Response) => {
  try {
    const effectiveness = roamService.getMitigationEffectiveness();
    res.json({ effectiveness, count: effectiveness.length });
  } catch (error: any) {
    console.error('Error fetching mitigation effectiveness:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch mitigation effectiveness' });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Helper functions

async function getSystemStatus(): Promise<any> {
  try {
    const { stdout } = await execAsync(`bash ${ROOT_DIR}/scripts/ay-prod-cycle.sh status`);
    return { raw: stdout.trim(), healthy: true };
  } catch {
    return { healthy: false };
  }
}

async function getCircleEquity(): Promise<any> {
  try {
    const equityFile = path.join(ROOT_DIR, '.equity/circle_equity.json');
    const data = await fs.readFile(equityFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Calculate if file doesn't exist
    await execAsync(`bash ${ROOT_DIR}/scripts/ay-yo-enhanced.sh equity`).catch(() => {});
    try {
      const equityFile = path.join(ROOT_DIR, '.equity/circle_equity.json');
      const data = await fs.readFile(equityFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { total_episodes: 0, circles: {} };
    }
  }
}

async function getROAMExposure(): Promise<any> {
  try {
    const summary = roamService.getROAMSummary();
    return {
      ...summary,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('ROAM database error, falling back to zeros:', error);
    return {
      risk: 0,
      obstacle: 0,
      assumption: 0,
      mitigation: 0,
      total: 0,
      exposureScore: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

async function getRecentEpisodes(limit: number, circle?: Circle): Promise<any[]> {
  try {
    const episodesDir = path.join(ROOT_DIR, '.episodes');
    const files = await fs.readdir(episodesDir).catch(() => []);

    const episodeFiles = files
      .filter(f => f.endsWith('.json'))
      .filter(f => !circle || f.startsWith(`${circle}_`))
      .sort()
      .reverse()
      .slice(0, limit);

    const episodes = await Promise.all(
      episodeFiles.map(async (file) => {
        const [circleStr, ceremony, timestamp] = file.replace('.json', '').split('_');
        const filePath = path.join(episodesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          circle: circleStr,
          ceremony,
          timestamp: parseInt(timestamp, 10),
          data: JSON.parse(content),
        };
      })
    );

    return episodes;
  } catch {
    return [];
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 yo.life Cockpit API Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Cockpit: http://localhost:${PORT}/api/cockpit`);
  console.log(`   Equity: http://localhost:${PORT}/api/equity`);
  console.log(`   ROAM: http://localhost:${PORT}/api/roam`);
  
  // Initialize ROAM database after server starts
  try {
    console.log('🗄️  Initializing ROAM database...');
    roamService.initializeDatabase(); // JSON version doesn't need schema path
    console.log('✅ ROAM database initialized');
  } catch (error) {
    console.error('❌ ROAM database initialization failed:', error);
  }

  // Initialize ceremony scheduler
  /* TEMPORARILY DISABLED FOR DEBUG
  try {
    console.log('⏰ Initializing ceremony scheduler...');
    scheduler.initializeScheduler();
    console.log('✅ Ceremony scheduler initialized');
  } catch (error) {
    console.error('❌ Ceremony scheduler initialization failed:', error);
  }
  */
});

export default app;
