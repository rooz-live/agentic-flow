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
    // Mock data for now - in production, fetch from claude-flow
    const queenState = {
      position: [0, 0, 20],
      health: 75,
      tasksCompleted: 42,
      totalAgents: 8,
      swarmCoherence: 0.87,
      hnswEnabled: false,
      wsjfScore: 6.5
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
    // Mock agents data
    const agents = [
      {
        id: 'agent-1',
        name: 'Coder Agent',
        type: 'coder',
        position: [10, 10, 8],
        roam: { resolved: 5, owned: 3, accepted: 2, mitigated: 4 },
        status: 'active',
        taskLoad: 0.6,
        mymScore: { manthra: 0.8, yasna: 0.7, mithra: 0.9 }
      },
      {
        id: 'agent-2',
        name: 'Tester Agent',
        type: 'tester',
        position: [-10, 10, 6],
        roam: { resolved: 7, owned: 4, accepted: 3, mitigated: 5 },
        status: 'busy',
        taskLoad: 0.8,
        mymScore: { manthra: 0.9, yasna: 0.85, mithra: 0.75 }
      },
      {
        id: 'agent-3',
        name: 'Reviewer Agent',
        type: 'reviewer',
        position: [10, -10, 7],
        roam: { resolved: 6, owned: 2, accepted: 4, mitigated: 3 },
        status: 'active',
        taskLoad: 0.5,
        mymScore: { manthra: 0.75, yasna: 0.8, mithra: 0.85 }
      }
    ];
    
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Layer 3: Memory Connections Endpoint
app.get('/api/swarm/memory', async (req, res) => {
  try {
    const connections = [];
    
    for (let i = 0; i < 15; i++) {
      connections.push({
        source: [Math.random() * 80 - 40, Math.random() * 80 - 40, Math.random() * 10],
        target: [Math.random() * 80 - 40, Math.random() * 80 - 40, Math.random() * 10],
        strength: Math.random(),
        type: ['hnsw', 'semantic', 'pattern'][Math.floor(Math.random() * 3)],
        latency: Math.random() * 50
      });
    }
    
    res.json(connections);
  } catch (error) {
    console.error('Error fetching memory connections:', error);
    res.status(500).json({ error: 'Failed to fetch memory connections' });
  }
});

// WSJF scoring endpoint
app.get('/api/wsjf/items', async (req, res) => {
  try {
    const items = [
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
    res.json(items);
  } catch (error) {
    console.error('Error fetching WSJF items:', error);
    res.status(500).json({ error: 'Failed to fetch WSJF items' });
  }
});

// ROAM audit endpoint
app.get('/api/roam/audit', async (req, res) => {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRisks: 24,
        resolved: 18,
        owned: 5,
        accepted: 2,
        mitigated: 16
      },
      agents: [
        { id: 'agent-1', resolved: 5, owned: 3, accepted: 2, mitigated: 4 },
        { id: 'agent-2', resolved: 7, owned: 4, accepted: 3, mitigated: 5 },
        { id: 'agent-3', resolved: 6, owned: 2, accepted: 4, mitigated: 3 }
      ]
    };
    res.json(report);
  } catch (error) {
    console.error('Error running ROAM audit:', error);
    res.status(500).json({ error: 'Failed to run ROAM audit' });
  }
});

// WebSocket: Layer 4 - Real-time Execution Events
wss.on('connection', (ws) => {
  console.log('Client connected to execution stream');
  
  ws.send(JSON.stringify({
    type: 'connected',
    timestamp: Date.now()
  }));
  
  const eventInterval = setInterval(() => {
    if (Math.random() > 0.7) {
      const event = {
        timestamp: Date.now(),
        agentId: `agent-${Math.floor(Math.random() * 3) + 1}`,
        position: [
          Math.random() * 80 - 40,
          Math.random() * 80 - 40,
          Math.random() * 30
        ],
        eventType: ['task_start', 'task_complete', 'decision', 'coordination'][Math.floor(Math.random() * 4)],
        intensity: Math.random()
      };
      
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(event));
      }
    }
  }, 500);
  
  ws.on('close', () => {
    clearInterval(eventInterval);
    console.log('Client disconnected from execution stream');
  });
});

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
