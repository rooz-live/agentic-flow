/**
 * Express API Server for yo.life Cockpit
 * Provides REST endpoints for circle equity, episodes, and ROAM data
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { 
  authenticate, 
  optionalAuthenticate, 
  requireCircleAccess,
  login,
  LoginCredentials 
} from './middleware/auth';
import { initDatabase } from '../db/connection';
import EpisodeRepository from '../db/repositories/EpisodeRepository';

const app = express();
const PORT = process.env.PORT || 3001;
const ROOT_DIR = path.resolve(__dirname, '../..');

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Types
interface Circle {
  name: string;
  color: string;
  episodes: number;
  percentage: number;
  lastActivity?: string;
}

interface EquityResponse {
  timestamp: number;
  totalEpisodes: number;
  circles: Circle[];
}

interface ROAMMetrics {
  risk: number;
  obstacle: number;
  assumption: number;
  mitigation: number;
  exposureScore: number;
  entities: number;
  relationships: number;
  timestamp: number;
}

const CIRCLE_COLORS: Record<string, string> = {
  orchestrator: '#3b82f6',
  assessor: '#22c55e',
  innovator: '#ec4899',
  analyst: '#06b6d4',
  seeker: '#eab308',
  intuitive: '#ef4444'
};

/**
 * Calculate circle equity from database
 */
async function calculateCircleEquity(): Promise<EquityResponse> {
  try {
    const equity = await EpisodeRepository.getCircleEquity();
    const totalEpisodes = await EpisodeRepository.getTotalEpisodeCount();

    const circles: Circle[] = equity.map(e => ({
      name: e.circle,
      color: e.color,
      episodes: e.episode_count,
      percentage: e.percentage,
      lastActivity: e.last_activity ? new Date(e.last_activity * 1000).toISOString() : undefined
    }));

    return {
      timestamp: Date.now(),
      totalEpisodes,
      circles
    };
  } catch (error) {
    console.error('Error reading circle equity from database:', error);
    // Fallback to file-based if database fails
    return calculateCircleEquityFromFiles();
  }
}

/**
 * Fallback: Calculate circle equity from episode files
 */
async function calculateCircleEquityFromFiles(): Promise<EquityResponse> {
  const episodesDir = path.join(ROOT_DIR, '.episodes');
  const circles: Circle[] = [];
  let totalEpisodes = 0;

  const circleCounts: Record<string, { count: number; latestTimestamp: number }> = {
    orchestrator: { count: 0, latestTimestamp: 0 },
    assessor: { count: 0, latestTimestamp: 0 },
    innovator: { count: 0, latestTimestamp: 0 },
    analyst: { count: 0, latestTimestamp: 0 },
    seeker: { count: 0, latestTimestamp: 0 },
    intuitive: { count: 0, latestTimestamp: 0 }
  };

  try {
    const files = await fs.readdir(episodesDir);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const parts = file.replace('.json', '').split('_');
      if (parts.length < 3) continue;
      const circle = parts[0];
      const timestamp = parseInt(parts[2], 10);
      if (circleCounts[circle]) {
        circleCounts[circle].count++;
        totalEpisodes++;
        if (timestamp > circleCounts[circle].latestTimestamp) {
          circleCounts[circle].latestTimestamp = timestamp;
        }
      }
    }
  } catch (error) {
    console.error('Error reading episodes directory:', error);
  }

  for (const [name, data] of Object.entries(circleCounts)) {
    const percentage = totalEpisodes > 0 ? Math.round((data.count / totalEpisodes) * 100) : 0;
    const lastActivity = data.latestTimestamp > 0 
      ? new Date(data.latestTimestamp * 1000).toISOString()
      : undefined;
    circles.push({
      name,
      color: CIRCLE_COLORS[name],
      episodes: data.count,
      percentage,
      lastActivity
    });
  }

  return { timestamp: Date.now(), totalEpisodes, circles };
}

/**
 * Read equity from cache file
 */
async function readEquityCache(): Promise<EquityResponse | null> {
  const cacheFile = path.join(ROOT_DIR, '.equity', 'circle_equity.json');
  
  try {
    const data = await fs.readFile(cacheFile, 'utf-8');
    const cache = JSON.parse(data);
    
    // Convert to our response format
    const circles: Circle[] = Object.entries(cache.circles || {}).map(([name, data]: [string, any]) => ({
      name,
      color: CIRCLE_COLORS[name],
      episodes: data.count || 0,
      percentage: data.percentage || 0
    }));

    return {
      timestamp: cache.timestamp || Date.now(),
      totalEpisodes: cache.total_episodes || 0,
      circles
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/auth/login
 * Login endpoint - returns JWT token
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const credentials: LoginCredentials = req.body;

    if (!credentials.email || !credentials.password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
      return;
    }

    const result = await login(credentials);

    if (!result) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint (public)
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/circles/equity
 * Get circle equity distribution (protected)
 */
app.get('/api/circles/equity', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    // Try cache first
    let equity = await readEquityCache();
    
    // If cache is stale or missing, calculate fresh
    if (!equity || (Date.now() - equity.timestamp > 30000)) {
      equity = await calculateCircleEquity();
    }

    res.json(equity);
  } catch (error) {
    console.error('Error getting circle equity:', error);
    res.status(500).json({
      error: 'Failed to retrieve circle equity',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/circles/:circleName/episodes
 * Get episodes for a specific circle (protected, requires circle access)
 */
app.get('/api/circles/:circleName/episodes', authenticate, requireCircleAccess, async (req: Request, res: Response) => {
  try {
    const circleName = Array.isArray(req.params.circleName) ? req.params.circleName[0] : req.params.circleName;
    const limit = parseInt((Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit) as string || '50');
    const offset = parseInt((Array.isArray(req.query.offset) ? req.query.offset[0] : req.query.offset) as string || '0');

    const episodes = await EpisodeRepository.getEpisodesByCircle(circleName, limit, offset);

    res.json({
      circle: circleName,
      count: episodes.length,
      limit,
      offset,
      episodes
    });
  } catch (error) {
    console.error('Error getting circle episodes:', error);
    res.status(500).json({
      error: 'Failed to retrieve episodes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/roam/metrics
 * Get current ROAM exposure metrics
 */
app.get('/api/roam/metrics', (req: Request, res: Response) => {
  // Return mock data for now - will be replaced with real metrics
  const metrics: ROAMMetrics = {
    risk: 23,
    obstacle: 15,
    assumption: 31,
    mitigation: 18,
    exposureScore: 6.2,
    entities: 1247,
    relationships: 3891,
    timestamp: Date.now()
  };

  res.json(metrics);
});

/**
 * GET /api/system/status
 * Get system status
 */
app.get('/api/system/status', (req: Request, res: Response) => {
  res.json({
    mcpServer: 'online',
    agentdb: 'connected',
    episodeStore: 'ready',
    timestamp: Date.now()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ yo.life API server listening on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔄 Circle equity: http://localhost:${PORT}/api/circles/equity`);
  });
}).catch(error => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});

export default app;
