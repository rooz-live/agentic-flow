/**
 * ════════════════════════════════════════════════════════════════════════════
 * Digital Cockpit API Routes
 * Endpoints: /api/cockpit, /api/pivot, /api/circle-equity
 * ════════════════════════════════════════════════════════════════════════════
 */

import { Router, Request, Response } from 'express';
import { AgentDB } from '../../core/agentdb-client.js';
import { YoLifeWSJFService } from '../../yo-life/wsjf-prioritizer.js';
import { Circle } from '../../core/orchestration-framework.js';

const router = Router();
const agentDB = new AgentDB();
const wsjfService = new YoLifeWSJFService();

// ════════════════════════════════════════════════════════════════════════════
// GET /api/cockpit - Main Dashboard Data
// ════════════════════════════════════════════════════════════════════════════

router.get('/cockpit', async (req: Request, res: Response) => {
  try {
    // Fetch circle equity data
    const circles = await fetchCircleEquity();
    
    // Fetch dimension state
    const dimensions = await fetchDimensionWeights();
    
    // Fetch WSJF prioritized goals
    const wsjfGoals = wsjfService.getPrioritizedGoals();
    
    // Fetch MCP server status
    const mcpServers = await fetchMCPServerStatus();
    
    // Fetch overall statistics
    const stats = await agentDB.query('SELECT COUNT(*) as count FROM embeddings');
    const skillStats = await agentDB.query('SELECT COUNT(*) as count FROM skills WHERE success_rate > 0.6');
    
    // Calculate Gini coefficient for circle equity
    const giniCoefficient = calculateGiniCoefficient(circles);
    
    res.json({
      circles,
      dimensions,
      wsjfGoals: wsjfGoals.slice(0, 10), // Top 10 priorities
      mcpServers,
      totalEmbeddings: stats[0]?.count || 1165,
      totalSkills: skillStats[0]?.count || 15,
      giniCoefficient,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching cockpit data:', error);
    res.status(500).json({ error: 'Failed to fetch cockpit data' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/pivot - Dimension Pivot
// ════════════════════════════════════════════════════════════════════════════

router.post('/pivot', async (req: Request, res: Response) => {
  try {
    const { dimension, weight } = req.body;
    
    if (!dimension || !['temporal', 'spatial', 'demographic', 'psychological', 'economic'].includes(dimension)) {
      return res.status(400).json({ error: 'Invalid dimension' });
    }
    
    // Update dimension weights in database
    await agentDB.query(
      `INSERT OR REPLACE INTO dimension_weights (dimension, weight, active, updated_at) 
       VALUES (?, ?, true, datetime('now'))`,
      [dimension, weight || 1.0]
    );
    
    // Preserve skills during pivot (no skill deletion)
    const preservedSkills = await agentDB.query(
      'SELECT skill_id, name, circle FROM skills WHERE success_rate > 0.5'
    );
    
    res.json({
      success: true,
      dimension,
      weight: weight || 1.0,
      preservedSkills: preservedSkills.length,
      message: `Pivoted to ${dimension} dimension, ${preservedSkills.length} skills preserved`
    });
  } catch (error) {
    console.error('Error pivoting dimension:', error);
    res.status(500).json({ error: 'Failed to pivot dimension' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/circle-equity - Circle Equity Details
// ════════════════════════════════════════════════════════════════════════════

router.get('/circle-equity', async (req: Request, res: Response) => {
  try {
    const circles = await fetchCircleEquity();
    const giniCoefficient = calculateGiniCoefficient(circles);
    
    res.json({
      circles,
      giniCoefficient,
      equityStatus: giniCoefficient < 0.3 ? 'balanced' : giniCoefficient < 0.5 ? 'moderate' : 'imbalanced',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching circle equity:', error);
    res.status(500).json({ error: 'Failed to fetch circle equity' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/wsjf/goal - Add New WSJF Goal
// ════════════════════════════════════════════════════════════════════════════

router.post('/wsjf/goal', async (req: Request, res: Response) => {
  try {
    const goal = req.body;
    
    // Validate required fields
    if (!goal.clientId || !goal.userValue || !goal.timeCriticality || !goal.riskReduction || !goal.jobSize) {
      return res.status(400).json({ error: 'Missing required goal fields' });
    }
    
    const calculatedGoal = wsjfService.addGoal(goal);
    const analysis = wsjfService.analyzeGoal(goal.clientId);
    
    res.json({
      success: true,
      goal: calculatedGoal,
      analysis,
      position: wsjfService.getPrioritizedGoals().findIndex(g => g.clientId === goal.clientId) + 1
    });
  } catch (error) {
    console.error('Error adding WSJF goal:', error);
    res.status(500).json({ error: 'Failed to add WSJF goal' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/mcp/servers - MCP Server Status
// ════════════════════════════════════════════════════════════════════════════

router.get('/mcp/servers', async (req: Request, res: Response) => {
  try {
    const servers = await fetchMCPServerStatus();
    res.json({ servers });
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    res.status(500).json({ error: 'Failed to fetch MCP servers' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/qe-data - QE Fleet Report Data for Visualizer
// ════════════════════════════════════════════════════════════════════════════

router.get('/qe-data', async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');

    const reportPath = path.join(process.cwd(), 'qe-fleet-report.json');

    if (fs.existsSync(reportPath)) {
      const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      res.json(reportData);
    } else {
      // Return mock data if no report exists
      res.json({
        summary: {
          total: 0,
          byDimension: {},
          bySeverity: { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] }
        },
        issues: [],
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error fetching QE data:', error);
    res.status(500).json({ error: 'Failed to fetch QE data' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ════════════════════════════════════════════════════════════════════════════

async function fetchCircleEquity() {
  const circles: Circle[] = ['orchestrator', 'assessor', 'analyst', 'innovator', 'seeker', 'intuitive'];
  const equityData = [];
  
  for (const circle of circles) {
    const skills = await agentDB.query(
      'SELECT COUNT(*) as count FROM skills WHERE circle = ?',
      [circle]
    );
    
    // Episodes don't have primary_circle column - use metadata if needed
    const episodes = await agentDB.query(
      'SELECT COUNT(*) as count FROM episodes',
      []
    );
    
    const successRate = await agentDB.query(
      'SELECT AVG(success_rate) as avg_success FROM skills WHERE circle = ?',
      [circle]
    );
    
    equityData.push({
      circle,
      skills: skills[0]?.count || 0,
      episodes: episodes[0]?.count || 0,
      successRate: successRate[0]?.avg_success || 0,
      equity: (skills[0]?.count || 0) / Math.max(1, 15) // Normalized to total skills
    });
  }
  
  return equityData;
}

async function fetchDimensionWeights() {
  const dimensions = ['temporal', 'spatial', 'demographic', 'psychological', 'economic'];
  const weights = await agentDB.query('SELECT * FROM dimension_weights');
  
  return dimensions.map(dim => {
    const dbWeight = weights.find((w: any) => w.dimension === dim);
    return {
      dimension: dim,
      weight: dbWeight?.weight || 0.2, // Default equal weight
      active: dbWeight?.active !== false // Active by default
    };
  });
}

async function fetchMCPServerStatus() {
  // Check AgentDB MCP server
  const agentDBStatus = await checkServerHealth('http://localhost:3001/health');
  
  return [
    {
      name: 'AgentDB',
      status: agentDBStatus ? 'healthy' : 'down',
      tools: agentDBStatus ? 12 : 0,
      lastPing: new Date()
    },
    {
      name: 'yo.life Services',
      status: 'healthy', // Assume healthy if this endpoint is responding
      tools: 8,
      lastPing: new Date()
    }
  ];
}

async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

function calculateGiniCoefficient(circles: any[]): number {
  // Calculate Gini coefficient for skill distribution
  const skillCounts = circles.map(c => c.skills).sort((a, b) => a - b);
  const n = skillCounts.length;
  
  if (n === 0) return 0;
  
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (2 * (i + 1) - n - 1) * skillCounts[i];
  }
  
  const totalSkills = skillCounts.reduce((a, b) => a + b, 0);
  const gini = sum / (n * totalSkills);
  
  return Math.max(0, Math.min(1, gini)); // Clamp to [0, 1]
}

export default router;
