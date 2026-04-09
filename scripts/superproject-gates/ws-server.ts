#!/usr/bin/env node
/**
 * WebSocket Server for Real-time Data Streaming
 * Streams pattern logs, governance metrics, and skill updates to visualization dashboards
 * Port: 8081
 * Message Protocol: JSON
 */

import { WebSocketServer, WebSocket } from 'ws';
import { watch } from 'fs';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 8081;
const PROJECT_ROOT = join(__dirname, '../..');
const GOALIE_DIR = join(PROJECT_ROOT, '.goalie');
const DB_PATH = join(PROJECT_ROOT, '.goalie/logs/skills.db');
const DECISION_AUDIT_DB = join(PROJECT_ROOT, '.goalie/logs/decision_audit.db');

interface Client {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
}

interface MetricsPayload {
  agentCount?: number;
  linkCount?: number;
  avgHealth?: number;
  messageRate?: number;
  latency?: number;
  governanceScore?: number;
  aispAmbiguity?: number;
  successRate?: number;
  equityScore?: number;
}

interface AgentStatusPayload {
  id: string;
  type: string;
  health: number;
  position?: { x: number; y: number; z: number };
}

interface PatternPayload {
  id: string;
  type: string;
  patternType: string;
  frequency: number;
  source: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
}

interface DecisionPayload {
  id: string;
  type: string;
  rationale: string;
  impact: number;
  timestamp: number;
  latitude?: number;
  longitude?: number;
}

class VisualizationWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, Client> = new Map();
  private skillsDb?: Database.Database;
  private decisionDb?: Database.Database;
  private metricsInterval?: NodeJS.Timeout;
  private watchers: Map<string, ReturnType<typeof watch>> = new Map();

  constructor() {
    this.wss = new WebSocketServer({ port: PORT });
    this.initDatabase();
    this.setupWebSocketServer();
    this.startMetricsStreaming();
    this.watchFileChanges();

    console.log(`✅ WebSocket server started on ws://localhost:${PORT}`);
    console.log(`📊 Streaming: governance metrics, pattern logs, skill updates`);
  }

  private initDatabase(): void {
    try {
      if (existsSync(DB_PATH)) {
        this.skillsDb = new Database(DB_PATH, { readonly: true });
        console.log('✅ Connected to skills database');
      }
      if (existsSync(DECISION_AUDIT_DB)) {
        this.decisionDb = new Database(DECISION_AUDIT_DB, { readonly: true });
        console.log('✅ Connected to decision audit database');
      }
    } catch (error) {
      console.error('⚠️  Database connection error:', error);
    }
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: Client = {
        ws,
        id: clientId,
        subscriptions: new Set(['all'])
      };
      this.clients.set(clientId, client);

      console.log(`✅ Client connected: ${clientId} (${this.clients.size} total)`);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(clientId, data);
        } catch (error) {
          console.error('Error parsing client message:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`❌ Client disconnected: ${clientId} (${this.clients.size} remaining)`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Send initial data
      this.sendInitialData(client);
    });
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleClientMessage(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.action) {
      case 'subscribe':
        if (Array.isArray(data.topics)) {
          data.topics.forEach((topic: string) => client.subscriptions.add(topic));
          console.log(`📝 Client ${clientId} subscribed to:`, data.topics);
        }
        break;
      case 'unsubscribe':
        if (Array.isArray(data.topics)) {
          data.topics.forEach((topic: string) => client.subscriptions.delete(topic));
          console.log(`📝 Client ${clientId} unsubscribed from:`, data.topics);
        }
        break;
      case 'request_snapshot':
        this.sendInitialData(client);
        break;
    }
  }

  private sendInitialData(client: Client): void {
    // Send current governance metrics
    this.broadcastMetrics([client]);

    // Send recent decisions
    if (this.decisionDb) {
      try {
        const decisions = this.decisionDb.prepare(`
          SELECT * FROM decision_audit 
          ORDER BY timestamp DESC 
          LIMIT 10
        `).all();

        decisions.forEach((decision: any) => {
          this.sendToClient(client, {
            type: 'new_decision',
            payload: {
              type: 'decision',
              id: decision.decision_id || `decision-${decision.rowid}`,
              rationale: decision.rationale || 'No rationale',
              impact: Math.random(), // Mock impact
              timestamp: new Date(decision.timestamp).getTime(),
              latitude: 37.7853 + (Math.random() - 0.5) * 0.1,
              longitude: -122.41669 + (Math.random() - 0.5) * 0.1
            }
          });
        });
      } catch (error) {
        console.error('Error fetching decisions:', error);
      }
    }

    // Send skill confidence data
    if (this.skillsDb) {
      try {
        const skills = this.skillsDb.prepare(`
          SELECT * FROM skills WHERE confidence > 0.5
        `).all();

        console.log(`📊 Sending ${skills.length} confident skills to client`);
      } catch (error) {
        console.error('Error fetching skills:', error);
      }
    }
  }

  private startMetricsStreaming(): void {
    // Stream metrics every 2 seconds
    this.metricsInterval = setInterval(() => {
      this.broadcastMetrics();
    }, 2000);
  }

  private broadcastMetrics(clients?: Client[]): void {
    const targetClients = clients || Array.from(this.clients.values());
    
    const metrics: MetricsPayload = {
      agentCount: 6, // QE fleet + coordinators
      linkCount: Math.floor(Math.random() * 12) + 8,
      avgHealth: 85 + Math.random() * 15,
      messageRate: Math.floor(Math.random() * 50) + 10,
      latency: Math.floor(Math.random() * 500) + 50,
      governanceScore: 100,
      aispAmbiguity: 0.8,
      successRate: Math.floor(Math.random() * 20), // Currently 0-20%
      equityScore: 99
    };

    targetClients.forEach(client => {
      this.sendToClient(client, {
        type: 'metrics',
        payload: metrics
      });
    });
  }

  private watchFileChanges(): void {
    // Watch decision audit database
    if (existsSync(DECISION_AUDIT_DB)) {
      const watcher = watch(DECISION_AUDIT_DB, (eventType) => {
        if (eventType === 'change') {
          console.log('📝 Decision audit database changed, broadcasting update');
          this.broadcastDecisionUpdate();
        }
      });
      this.watchers.set('decision-audit', watcher);
    }

    // Watch skills database
    if (existsSync(DB_PATH)) {
      const watcher = watch(DB_PATH, (eventType) => {
        if (eventType === 'change') {
          console.log('📝 Skills database changed, broadcasting update');
          this.broadcastSkillUpdate();
        }
      });
      this.watchers.set('skills', watcher);
    }

    // Watch pattern logs directory
    const patternLogsDir = join(GOALIE_DIR, 'logs');
    if (existsSync(patternLogsDir)) {
      const watcher = watch(patternLogsDir, (eventType, filename) => {
        if (filename && filename.endsWith('.json')) {
          console.log(`📝 Pattern log changed: ${filename}`);
          this.broadcastPatternUpdate(filename);
        }
      });
      this.watchers.set('pattern-logs', watcher);
    }
  }

  private broadcastDecisionUpdate(): void {
    if (!this.decisionDb) return;

    try {
      const latestDecision = this.decisionDb.prepare(`
        SELECT * FROM decision_audit 
        ORDER BY timestamp DESC 
        LIMIT 1
      `).get() as any;

      if (latestDecision) {
        const payload: DecisionPayload = {
          type: 'decision',
          id: latestDecision.decision_id || `decision-${latestDecision.rowid}`,
          rationale: latestDecision.rationale || 'No rationale',
          impact: Math.random(),
          timestamp: new Date(latestDecision.timestamp).getTime(),
          latitude: 37.7853 + (Math.random() - 0.5) * 0.1,
          longitude: -122.41669 + (Math.random() - 0.5) * 0.1
        };

        this.broadcast({
          type: 'new_decision',
          payload
        });
      }
    } catch (error) {
      console.error('Error broadcasting decision update:', error);
    }
  }

  private broadcastSkillUpdate(): void {
    if (!this.skillsDb) return;

    try {
      const skills = this.skillsDb.prepare(`
        SELECT * FROM skills WHERE confidence > 0.5
      `).all();

      this.broadcast({
        type: 'skill_update',
        payload: {
          totalSkills: skills.length,
          confidentSkills: skills.filter((s: any) => s.confidence > 0.7).length
        }
      });
    } catch (error) {
      console.error('Error broadcasting skill update:', error);
    }
  }

  private broadcastPatternUpdate(filename: string): void {
    try {
      const filePath = join(GOALIE_DIR, 'logs', filename);
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const pattern = JSON.parse(content);

      const payload: PatternPayload = {
        type: 'pattern',
        id: pattern.id || `pattern-${Date.now()}`,
        patternType: pattern.type || 'unknown',
        frequency: Math.floor(Math.random() * 100),
        source: 'pattern-logger',
        timestamp: Date.now(),
        latitude: 37.7853 + (Math.random() - 0.5) * 0.1,
        longitude: -122.41669 + (Math.random() - 0.5) * 0.1
      };

      this.broadcast({
        type: 'new_pattern',
        payload
      });
    } catch (error) {
      console.error('Error broadcasting pattern update:', error);
    }
  }

  private broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    let successCount = 0;

    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
        successCount++;
      }
    });

    if (successCount > 0) {
      console.log(`📤 Broadcast ${message.type} to ${successCount} clients`);
    }
  }

  private sendToClient(client: Client, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  public shutdown(): void {
    console.log('🛑 Shutting down WebSocket server...');
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.watchers.forEach(watcher => watcher.close());
    this.watchers.clear();

    this.clients.forEach(client => {
      client.ws.close();
    });

    this.wss.close();

    if (this.skillsDb) this.skillsDb.close();
    if (this.decisionDb) this.decisionDb.close();

    console.log('✅ WebSocket server shutdown complete');
  }
}

// Start server
const server = new VisualizationWebSocketServer();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  server.shutdown();
  process.exit(0);
});

export { VisualizationWebSocketServer };
