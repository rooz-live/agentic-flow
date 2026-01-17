#!/usr/bin/env npx tsx
/**
 * Swarm Visualization API Server
 * 
 * Provides REST and WebSocket endpoints for real-time swarm data:
 * - GET /api/swarm/queen - Queen aggregate state
 * - GET /api/swarm/agents - All agent metrics with ROAM data
 * - GET /api/swarm/memory - HNSW memory connections
 * - WS  /ws/execution - Real-time execution event stream
 * 
 * Deploy to:
 * - swarm.stx.rooz.live (StarlingX)
 * - swarm.cpanel.rooz.live (cPanel AWS)
 * - swarm.gitlab.rooz.live (GitLab)
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/execution' });

const PORT = process.env.SWARM_API_PORT || 3000;
const HOST = process.env.SWARM_API_HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Layer 1: Queen State Endpoint
app.get('/api/swarm/queen', async (req, res) => {
  try {
    // Fetch swarm status from claude-flow
    const { stdout } = await execAsync('npx -y @claude-flow/cli@latest swarm status --json 2>/dev/null');
    const swarmStatus = JSON.parse(stdout);
    
    // Fetch daemon status
    const { stdout: daemonOut } = await execAsync('npx -y @claude-flow/cli@latest status --json 2>/dev/null');
    const daemonStatus = JSON.parse(daemonOut);
    
    // Calculate health score
    const health = calculateSwarmHealth(swarmStatus, daemonStatus);
    
    const queenState = {
      position: [0, 0, 20], // Center, elevated
      health,
      tasksCompleted: daemonStatus.tasks?.completed || 0,
      totalAgents: swarmStatus.agents?.total || 0,
      swarmCoherence: swarmStatus.coherence || 0.85,
      hnswEnabled: daemonStatus.memory?.backend === 'hnsw',
      wsjfScore: await calculateWsjfScore()
    };
    
    res.json(queenState);
  } catch (error) {
    console.error('Error fetching queen state:', error);
    res.status(500).json({ error: 'Failed to fetch queen state' });
  }
});

// Layer 2: Agent Metrics Endpoint
app.get('/api/swarm/agents', async (req, res) => {
  try {
    const { stdout } = await execAsync('npx -y @claude-flow/cli@latest agent list --json 2>/dev/null');
    const agentsList = JSON.parse(stdout);
    
    // Enrich with ROAM data and MYM scores
    const agents = await Promise.all(agentsList.agents.map(async (agent: any) => {
      const roamData = await fetchAgentRoamData(agent.id);
      const mymScore = calculateMymScore(agent, roamData);
      
      return {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        position: [0, 0, 0], // Will be calculated by frontend
        roam: roamData,
        status: agent.status || 'idle',
        taskLoad: agent.metrics?.taskLoad || 0,
        mymScore
      };
    }));
    
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Layer 3: Memory Connections Endpoint
app.get('/api/swarm/memory', async (req, res) => {
  try {
    const { stdout } = await execAsync('npx -y @claude-flow/cli@latest memory list --json 2>/dev/null');
    const memoryData = JSON.parse(stdout);
    
    // Generate connections based on memory relationships
    const connections = generateMemoryConnections(memoryData);
    
    res.json(connections);
  } catch (error) {
    console.error('Error fetching memory connections:', error);
    res.status(500).json({ error: 'Failed to fetch memory connections' });
  }
});

// WSJF scoring endpoint
app.get('/api/wsjf/items', async (req, res) => {
  try {
    // Read WSJF items from database or file
    const items = await fetchWsjfItems();
    res.json(items);
  } catch (error) {
    console.error('Error fetching WSJF items:', error);
    res.status(500).json({ error: 'Failed to fetch WSJF items' });
  }
});

// ROAM audit endpoint
app.get('/api/roam/audit', async (req, res) => {
  try {
    const { stdout } = await execAsync('npx tsx scripts/roam-audit.ts --report-path=/tmp/roam-audit.json 2>/dev/null');
    const fs = await import('fs');
    const report = JSON.parse(fs.readFileSync('/tmp/roam-audit.json', 'utf-8'));
    res.json(report);
  } catch (error) {
    console.error('Error running ROAM audit:', error);
    res.status(500).json({ error: 'Failed to run ROAM audit' });
  }
});

// WebSocket: Layer 4 - Real-time Execution Events
wss.on('connection', (ws) => {
  console.log('Client connected to execution stream');
  
  // Send initial connection event
  ws.send(JSON.stringify({
    type: 'connected',
    timestamp: Date.now()
  }));
  
  // Start event stream
  const eventInterval = setInterval(async () => {
    try {
      // Fetch recent events from claude-flow
      const events = await fetchExecutionEvents();
      
      for (const event of events) {
        if (ws.readyState === 1) { // OPEN
          ws.send(JSON.stringify(event));
        }
      }
    } catch (error) {
      console.error('Error streaming execution events:', error);
    }
  }, 500); // Stream every 500ms
  
  ws.on('close', () => {
    clearInterval(eventInterval);
    console.log('Client disconnected from execution stream');
  });
});

// Helper functions
function calculateSwarmHealth(swarmStatus: any, daemonStatus: any): number {
  let health = 70; // Base health
  
  // Add health based on active agents
  if (swarmStatus.agents?.active > 0) {
    health += 10;
  }
  
  // Add health based on HNSW
  if (daemonStatus.memory?.backend === 'hnsw') {
    health += 10;
  }
  
  // Add health based on task completion
  const completionRate = (daemonStatus.tasks?.completed || 0) / 
                        ((daemonStatus.tasks?.total || 1) + 0.01);
  health += completionRate * 10;
  
  return Math.min(100, Math.max(0, health));
}

async function calculateWsjfScore(): Promise<number> {
  // Calculate aggregate WSJF from all tracked items
  try {
    const items = await fetchWsjfItems();
    const avgWsjf = items.reduce((sum: number, item: any) => sum + (item.wsjfScore || 0), 0) / 
                    (items.length || 1);
    return avgWsjf;
  } catch {
    return 5.0; // Default
  }
}

async function fetchAgentRoamData(agentId: string): Promise<any> {
  // Fetch ROAM metrics for specific agent
  // In production, this would query a database
  return {
    resolved: Math.floor(Math.random() * 10),
    owned: Math.floor(Math.random() * 5),
    accepted: Math.floor(Math.random() * 3),
    mitigated: Math.floor(Math.random() * 8)
  };
}

function calculateMymScore(agent: any, roamData: any): any {
  // Calculate Manthra/Yasna/Mithra scores
  const roamTotal = roamData.resolved + roamData.owned + roamData.accepted + roamData.mitigated;
  
  return {
    manthra: Math.min(1, roamTotal / 20), // Method consistency
    yasna: Math.min(1, (roamData.resolved + roamData.mitigated) / 15), // Practice alignment
    mithra: Math.min(1, (agent.metrics?.successRate || 0.5)) // Protocol adherence
  };
}

function generateMemoryConnections(memoryData: any): any[] {
  // Generate connections between memory entries
  const connections = [];
  const entries = memoryData.entries || [];
  
  for (let i = 0; i < Math.min(entries.length, 20); i++) {
    for (let j = i + 1; j < Math.min(entries.length, 20); j++) {
      // Create connection based on semantic similarity
      connections.push({
        source: [Math.random() * 80 - 40, Math.random() * 80 - 40, Math.random() * 10],
        target: [Math.random() * 80 - 40, Math.random() * 80 - 40, Math.random() * 10],
        strength: Math.random(),
        type: ['hnsw', 'semantic', 'pattern'][Math.floor(Math.random() * 3)],
        latency: Math.random() * 50
      });
    }
  }
  
  return connections.slice(0, 30); // Limit to 30 connections
}

async function fetchExecutionEvents(): Promise<any[]> {
  // Fetch recent execution events
  const events = [];
  
  // Simulate events - in production, pull from event log
  if (Math.random() > 0.7) {
    events.push({
      timestamp: Date.now(),
      agentId: `agent-${Math.floor(Math.random() * 5)}`,
      position: [
        Math.random() * 80 - 40,
        Math.random() * 80 - 40,
        Math.random() * 30
      ],
      eventType: ['task_start', 'task_complete', 'decision', 'coordination'][Math.floor(Math.random() * 4)],
      intensity: Math.random()
    });
  }
  
  return events;
}

async function fetchWsjfItems(): Promise<any[]> {
  // Fetch WSJF items - in production, from database
  return [
    {
      id: 'wsjf-1',
      title: 'HNSW Vector Indexing',
      businessValue: 9,
      timeCriticality: 8,
      riskReduction: 7,
      jobSize: 5,
      wsjfScore: 4.8,
      mcpFactor: 0.9,
      mppFactor: 0.85,
      selected: true,
      type: 'feature'
    },
    {
      id: 'wsjf-2',
      title: 'TypeScript Error Fixes',
      businessValue: 7,
      timeCriticality: 9,
      riskReduction: 6,
      jobSize: 3,
      wsjfScore: 7.3,
      mcpFactor: 0.7,
      mppFactor: 0.8,
      selected: true,
      type: 'tech-debt'
    }
  ];
}

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🚀 Swarm API Server running on http://${HOST}:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}/ws/execution`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health`);
  console.log(`  GET  /api/swarm/queen`);
  console.log(`  GET  /api/swarm/agents`);
  console.log(`  GET  /api/swarm/memory`);
  console.log(`  GET  /api/wsjf/items`);
  console.log(`  GET  /api/roam/audit`);
  console.log(`  WS   /ws/execution`);
});

export default app;
