import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import net from 'net';
import { generateMockRoamData } from './roam-generator.js';
import cockpitRoutes from './api/cockpit-routes.js';
import roozRoutes from './api/rooz-routes.js';
import ceremonyRoutes from '../api/ceremony-routes.js';
import integrationRoutes from './api/integration-routes.js';
import { initializeStripe, getStripeInstance } from '../rooz/stripe-integration.js';
import { initializeSlopDetection, getSlopDetectionInstance } from '../af-prod/slop-detection.js';
// import { initializeScheduler, getSchedulerInstance } from '../services/ceremony-scheduler.js'; // TODO: Implement scheduler
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

/**
 * Find an available port within a range
 * @param startPort Starting port to scan
 * @param range Number of ports to try
 * @returns Available port number or null
 */
async function findAvailablePort(startPort: number, range: number = 10): Promise<number | null> {
  for (let port = startPort; port < startPort + range; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Check if a port is available
 * @param port Port number to check
 * @returns true if available, false if in use
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

/**
 * Get process info for a port (macOS/Linux)
 * @param port Port number
 * @returns Process info or null
 */
async function getPortOwner(port: number): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -P -n | tail -n +2 | awk '{print $1" (PID "$2")"}' | head -1`);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Port configuration with fallback scanning
const PREFERRED_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const PORT_RANGE = 10; // Try 10 ports if preferred is busy
let PORT = PREFERRED_PORT;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize systems
const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (stripeKey && webhookSecret) {
  initializeStripe(stripeKey, webhookSecret);
  console.log('[SERVER] Stripe integration initialized');
} else {
  console.warn('[SERVER] Stripe not configured (missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET)');
}

initializeSlopDetection({ enabled: true });
console.log('[SERVER] Slop detection initialized');

// initializeScheduler(); // TODO: Implement cron-based scheduler
// console.log('[SERVER] Ceremony scheduler initialized');

// API Routes
// Mount Digital Cockpit routes
app.use('/api', cockpitRoutes);
// Mount rooz.yo.life routes
app.use('/api', roozRoutes);
// Mount ceremony automation routes
app.use('/api/ceremonies', ceremonyRoutes);
app.use('/api/risks', ceremonyRoutes);
app.use('/api/obstacles', ceremonyRoutes);
app.use('/api/scheduler', ceremonyRoutes);
app.use('/api/circle-proficiency', ceremonyRoutes);
// Mount integration routes (Stripe + Slop Detection)
app.use('/api', integrationRoutes);

// Get dashboard data
app.get('/api/dashboard', async (req, res) => {
  try {
    const { stdout } = await execAsync('npx agentdb skill search --json 2>/dev/null');
    // Extract JSON from output (skip any non-JSON lines)
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in agentdb output');
    }
    const data = JSON.parse(jsonMatch[0]);
    
    // Organize by circle
    const circles = ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive'];
    const dashboard = {
      circles: {} as Record<string, any>,
      timestamp: new Date().toISOString()
    };
    
    for (const circle of circles) {
      const { stdout: circleSkills } = await execAsync(`npx agentdb skill search --circle ${circle} --json 2>/dev/null`);
      // Extract JSON from output (skip any non-JSON lines)
      const jsonMatch = circleSkills.match(/\{[\s\S]*\}/);
      const skills = jsonMatch ? JSON.parse(jsonMatch[0]) : { skills: [] };
      
      dashboard.circles[circle] = {
        skillCount: skills.skills?.length || 0,
        avgSuccessRate: skills.skills?.reduce((acc: number, s: any) => acc + s.success_rate, 0) / (skills.skills?.length || 1) * 100 || 0,
        topSkills: skills.skills?.slice(0, 3) || []
      };
    }
    
    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get database stats (replaces MCP servers)
app.get('/api/stats', async (req, res) => {
  try {
    const { stdout } = await execAsync('npx agentdb stats 2>/dev/null');
    const embeddings = stdout.match(/Embeddings:\s*(\d+)/)?.[1] || '0';
    const skills = stdout.match(/Skills:\s*(\d+)/)?.[1] || '0';
    const episodes = stdout.match(/Episodes:\s*(\d+)/)?.[1] || '0';
    
    res.json({
      embeddings: parseInt(embeddings),
      skills: parseInt(skills),
      episodes: parseInt(episodes),
      status: 'healthy'
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.json({ embeddings: 0, skills: 0, episodes: 0, status: 'error' });
  }
});

// Get system health
app.get('/api/health', async (req, res) => {
  try {
    const { stdout } = await execAsync('npx agentdb stats 2>/dev/null');
    const isHealthy = stdout.includes('Statistics');
    
    res.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: [
        { name: 'AgentDB', status: isHealthy ? 'operational' : 'down' },
        { name: 'Skills', status: 'operational' },
        { name: 'Episodes', status: 'operational' }
      ]
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.json({ status: 'error', timestamp: new Date().toISOString(), components: [] });
  }
});

// Spawn agent
app.post('/api/spawn', async (req, res) => {
  const { circle = 'orchestrator', task = 'standup' } = req.body;
  
  try {
    const scriptsPath = path.join(__dirname, '../../scripts');
    const { stdout } = await execAsync(`${scriptsPath}/ay-prod-cycle.sh ${circle} ${task} advisory`);
    
    res.json({ success: true, output: stdout });
  } catch (error: any) {
    console.error('Spawn error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pivot dimension
app.post('/api/pivot', async (req, res) => {
  const { dimension = 'temporal' } = req.body;
  
  const validDimensions = ['temporal', 'spatial', 'demographic', 'psychological', 'economic'];
  if (!validDimensions.includes(dimension)) {
    return res.status(400).json({ error: 'Invalid dimension' });
  }
  
  try {
    const scriptsPath = path.join(__dirname, '../../scripts');
    const { stdout } = await execAsync(`${scriptsPath}/ay-yo-enhanced.sh pivot ${dimension}`);
    
    res.json({ success: true, dimension, output: stdout });
  } catch (error: any) {
    console.error('Pivot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ROAM graph data
app.get('/api/roam', async (req, res) => {
  try {
    // Mock ROAM data for now - will integrate with roam-generator later
    const circles = ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive'];
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // Create circle nodes
    circles.forEach(circle => {
      nodes.push({
        id: `circle:${circle}`,
        type: 'circle',
        label: circle.charAt(0).toUpperCase() + circle.slice(1),
        circle
      });
    });
    
    // Add sample skill nodes
    for (let i = 0; i < 10; i++) {
      const circle = circles[i % circles.length];
      nodes.push({
        id: `skill:${i}`,
        type: 'skill',
        label: `Skill ${i + 1}`,
        circle,
        metric: Math.random()
      });
      
      // Add edge from skill to circle
      edges.push({
        source: `skill:${i}`,
        target: `circle:${circle}`,
        type: 'attribution',
        weight: Math.random()
      });
    }
    
    res.json({ nodes, edges });
  } catch (error) {
    console.error('ROAM error:', error);
    res.status(500).json({ error: 'Failed to fetch ROAM data' });
  }
});

// Get circle equity report
app.get('/api/equity', async (req, res) => {
  try {
    const circles = ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive'];
    const equity: Record<string, any> = {};
    let totalSkills = 0;
    
    for (const circle of circles) {
      const { stdout } = await execAsync(`npx agentdb skill search --circle ${circle} --json`);
      const skills = JSON.parse(stdout);
      
      equity[circle] = {
        count: skills.skills?.length || 0,
        avgSuccess: skills.skills?.reduce((acc: number, s: any) => acc + s.success_rate, 0) / (skills.skills?.length || 1) * 100 || 0,
        topSkills: skills.skills?.slice(0, 3) || []
      };
      
      totalSkills += equity[circle].count;
    }
    
    res.json({
      circles: equity,
      total: totalSkills,
      average: Math.round(totalSkills / circles.length),
      balance: totalSkills > 0 ? 'Balanced' : 'Needs Development'
    });
  } catch (error) {
    console.error('Equity error:', error);
    res.status(500).json({ error: 'Failed to fetch equity data' });
  }
});

// Get ROAM graph data
app.get('/api/roam', async (req, res) => {
  try {
    const roamData = generateMockRoamData();
    res.json(roamData);
  } catch (error) {
    console.error('ROAM data error:', error);
    res.status(500).json({ error: 'Failed to generate ROAM data' });
  }
});

// Get risk dashboard data
app.get('/api/risk-dashboard', async (req, res) => {
  try {
    const dbPath = path.join(process.cwd(), '.db/risk-traceability.db');
    const db = new Database(dbPath);
    
    // Get risk summary by severity
    const risksBySeverity = db.prepare(`
      SELECT severity, COUNT(*) as count, status
      FROM risks
      GROUP BY severity, status
    `).all();
    
    // Get top obstacles by circle
    const obstaclesByCircle = db.prepare(`
      SELECT owner_circle, COUNT(*) as count, resolution_status
      FROM obstacles
      GROUP BY owner_circle, resolution_status
    `).all();
    
    // Get recent episodes with DoR/DoD results
    const recentEpisodes = db.prepare(`
      SELECT 
        episode_id,
        COUNT(*) as total_checks,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passed_checks,
        MAX(checked_at) as latest_check
      FROM dor_dod_checks
      GROUP BY episode_id
      ORDER BY latest_check DESC
      LIMIT 20
    `).all();
    
    // Get mitigation effectiveness
    const mitigationEffectiveness = db.prepare(`
      SELECT 
        m.title,
        COUNT(re.episode_id) as applied_count,
        AVG(re.effectiveness) as avg_effectiveness
      FROM mitigation_strategies m
      LEFT JOIN risks r ON r.mitigation_strategy_id = m.id
      LEFT JOIN risk_episodes re ON re.risk_id = r.id
      GROUP BY m.id, m.title
    `).all();
    
    db.close();
    
    res.json({
      risksBySeverity,
      obstaclesByCircle,
      recentEpisodes,
      mitigationEffectiveness
    });
  } catch (error: any) {
    console.error('Risk dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch risk dashboard data' });
  }
});

// Trigger learning loop
app.post('/api/learn', async (req, res) => {
  const { circle = 'orchestrator', iterations = 3 } = req.body;
  
  try {
    const scriptsPath = path.join(__dirname, '../../scripts');
    // Run learning loop asynchronously
    exec(`${scriptsPath}/ay-prod-cycle.sh learn ${iterations}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Learning error:', error);
      }
      // Emit completion event
      io.emit('learning:complete', { circle, iterations });
    });
    
    res.json({ success: true, message: 'Learning loop started', circle, iterations });
  } catch (error: any) {
    console.error('Learn API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log(`✓ Client connected: ${socket.id}`);

  // Send initial dashboard state
  socket.emit('connected', { timestamp: new Date().toISOString() });

  socket.on('subscribe:dashboard', () => {
    console.log(`Client ${socket.id} subscribed to dashboard`);
  });

  socket.on('subscribe:equity', () => {
    console.log(`Client ${socket.id} subscribed to equity updates`);
  });

  socket.on('subscribe:roam', () => {
    console.log(`Client ${socket.id} subscribed to ROAM updates`);
    // Send initial ROAM data
    const roamData = generateMockRoamData();
    socket.emit('roam:update', roamData);
  });

  // WebRTC signaling for video conferencing
  socket.on('video:join', () => {
    console.log(`Client ${socket.id} joined video room`);
    socket.broadcast.emit('video:peer-joined', { peerId: socket.id });
  });

  socket.on('video:offer', (data) => {
    socket.to(data.to).emit('video:offer', { from: socket.id, offer: data.offer });
  });

  socket.on('video:answer', (data) => {
    socket.to(data.to).emit('video:answer', { from: socket.id, answer: data.answer });
  });

  socket.on('video:ice-candidate', (data) => {
    socket.to(data.to).emit('video:ice-candidate', { from: socket.id, candidate: data.candidate });
  });

  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
    socket.broadcast.emit('video:peer-left', { peerId: socket.id });
  });
});

// Broadcast dashboard updates every 10 seconds
setInterval(async () => {
  try {
    const { stdout } = await execAsync('npx agentdb stats 2>/dev/null');
    const embeddings = stdout.match(/Embeddings:\s*(\d+)/)?.[1] || '0';
    const skills = stdout.match(/Skills:\s*(\d+)/)?.[1] || '0';
    
    io.emit('dashboard:update', {
      timestamp: new Date().toISOString(),
      embeddings: parseInt(embeddings),
      skills: parseInt(skills)
    });
  } catch (e) {
    // Ignore errors
  }
}, 10000);

// Start server with graceful port fallback
async function startServer() {
  // Check if preferred port is available
  if (!(await isPortAvailable(PORT))) {
    const owner = await getPortOwner(PORT);
    console.log(`⚠️  Port ${PORT} is in use${owner ? ` by ${owner}` : ''}`);
    console.log(`🔍 Scanning for available port in range ${PORT}-${PORT + PORT_RANGE - 1}...`);
    
    const availablePort = await findAvailablePort(PORT, PORT_RANGE);
    
    if (availablePort) {
      PORT = availablePort;
      console.log(`✓ Found available port: ${PORT}\n`);
    } else {
      console.error(`❌ No available ports in range ${PORT}-${PORT + PORT_RANGE - 1}`);
      console.error(`   Try: PORT=<port> npm run start:web`);
      process.exit(1);
    }
  }
  
  httpServer.listen(PORT, () => {
    console.log('');
    console.log('━'.repeat(60));
    console.log('🌐 yo.life Digital Cockpit - Web Server');
    console.log('━'.repeat(60));
    console.log('');
    console.log(`  ✓ Server: http://localhost:${PORT}`);
    console.log(`  ✓ WebSocket: Enabled (real-time updates)`);
    console.log('');
    console.log('  API Endpoints:');
    console.log(`    GET  /api/dashboard      - Complete dashboard`);
    console.log(`    GET  /api/stats          - Database statistics`);
    console.log(`    GET  /api/health         - System health`);
    console.log(`    GET  /api/equity         - Circle equity`);
    console.log(`    GET  /api/roam           - ROAM graph data`);
    console.log(`    POST /api/spawn          - Spawn agent`);
    console.log(`    POST /api/pivot          - Pivot dimension`);
    console.log(`    POST /api/learn          - Start learning loop`);
    console.log('');
    console.log('  Digital Cockpit Routes:');
    console.log(`    GET  /api/cockpit        - Complete cockpit dashboard`);
    console.log(`    GET  /api/circle-equity  - Circle equity details`);
    console.log(`    POST /api/wsjf/goal      - Add WSJF prioritized goal`);
    console.log(`    GET  /api/mcp/servers    - MCP server status`);
    console.log('');
    console.log('  rooz.yo.life Routes:');
    console.log(`    GET  /api/rooz/events          - List events (classes, sports, workshops)`);
    console.log(`    POST /api/rooz/events          - Create new event`);
    console.log(`    POST /api/rooz/events/:id/register - Register for event`);
    console.log(`    GET  /api/rooz/subscriptions   - List subscriptions`);
    console.log(`    POST /api/rooz/subscriptions   - Create subscription`);
    console.log(`    GET  /api/rooz/roam-graph      - ROAM ontology visualization`);
    console.log(`    GET  /api/rooz/circles         - Circle participation stats`);
    console.log('');
    console.log('  Ceremony Automation Routes:');
    console.log(`    POST /api/ceremonies/execute     - Execute ceremony`);
    console.log(`    GET  /api/ceremonies/history/:circle - Get ceremony history`);
    console.log(`    POST /api/risks/track            - Track risk`);
    console.log(`    GET  /api/risks                  - List risks`);
    console.log(`    GET  /api/risks/:id              - Get risk details`);
    console.log(`    POST /api/obstacles/track        - Track obstacle`);
    console.log(`    GET  /api/obstacles              - List obstacles`);
    console.log(`    GET  /api/risk-dashboard         - Risk traceability dashboard`);
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('');
  });
}

startServer();

export { app, httpServer, io };
