/**
 * Model-Pattern-Protocol (MPP) Registry
 * 
 * P0-2 (WSJF 6.2): MCP Server Integration Enhancement
 * P0-3: MPP Registry and Context Persistence
 * 
 * Features:
 * - Model routing based on complexity
 * - Pattern matching for tool selection
 * - Protocol versioning for compatibility
 * - Context persistence across sessions
 * - Health monitoring and diagnostics
 * - Server lifecycle management
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ModelCapability {
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
  latency: number; // ms
  capabilities: string[];
  useCase: 'simple' | 'moderate' | 'complex';
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  tools: string[];
  requiredCapabilities: string[];
  complexity: 'low' | 'medium' | 'high';
  successRate: number;
}

export interface Protocol {
  version: string;
  name: string;
  methods: string[];
  compatibility: string[];
  deprecated: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  protocol: string;
  status: 'healthy' | 'degraded' | 'down';
  lastHealthCheck: string;
  version: string;
  capabilities: string[];
}

export interface ContextSession {
  sessionId: string;
  startedAt: string;
  lastActivity: string;
  swarmId?: string;
  modelUsed: string;
  tokensUsed: number;
  context: Record<string, any>;
}

export class MPPRegistry {
  private registryPath: string;
  private models: Map<string, ModelCapability>;
  private patterns: Map<string, Pattern>;
  private protocols: Map<string, Protocol>;
  private servers: Map<string, MCPServer>;
  private sessions: Map<string, ContextSession>;

  constructor(baseDir: string = '.swarm/mcp') {
    this.registryPath = baseDir;
    
    if (!existsSync(baseDir)) {
      mkdirSync(baseDir, { recursive: true });
    }

    this.models = new Map();
    this.patterns = new Map();
    this.protocols = new Map();
    this.servers = new Map();
    this.sessions = new Map();

    this.initializeDefaults();
    this.loadFromDisk();
  }

  /**
   * Initialize default models, patterns, and protocols
   */
  private initializeDefaults(): void {
    // Models (ADR-026 3-tier routing)
    this.registerModel({
      name: 'agent-booster',
      maxTokens: 0, // Rule-based, no LLM
      costPer1kTokens: 0,
      latency: 1,
      capabilities: ['var-to-const', 'add-types', 'remove-console'],
      useCase: 'simple'
    });

    this.registerModel({
      name: 'haiku',
      maxTokens: 200000,
      costPer1kTokens: 0.0002,
      latency: 500,
      capabilities: ['code-generation', 'bug-fixes', 'refactoring'],
      useCase: 'moderate'
    });

    this.registerModel({
      name: 'sonnet',
      maxTokens: 200000,
      costPer1kTokens: 0.003,
      latency: 2000,
      capabilities: ['architecture', 'complex-reasoning', 'security'],
      useCase: 'complex'
    });

    this.registerModel({
      name: 'opus',
      maxTokens: 200000,
      costPer1kTokens: 0.015,
      latency: 5000,
      capabilities: ['deep-analysis', 'research', 'optimization'],
      useCase: 'complex'
    });

    // Patterns
    this.registerPattern({
      id: 'code-review',
      name: 'Code Review Pattern',
      description: 'Multi-agent code review with consensus',
      tools: ['code-analyzer', 'security-scanner', 'test-coverage'],
      requiredCapabilities: ['code-generation', 'security'],
      complexity: 'medium',
      successRate: 0.92
    });

    this.registerPattern({
      id: 'swarm-coordination',
      name: 'Swarm Coordination Pattern',
      description: 'Byzantine fault-tolerant coordination',
      tools: ['agent-spawn', 'task-queue', 'consensus'],
      requiredCapabilities: ['coordination', 'distributed-systems'],
      complexity: 'high',
      successRate: 0.85
    });

    // Protocols
    this.registerProtocol({
      version: '2024-11-05',
      name: 'MCP Standard',
      methods: ['initialize', 'tools/list', 'tools/call', 'resources/list'],
      compatibility: ['2024-10-01', '2024-09-01'],
      deprecated: false
    });

    this.registerProtocol({
      version: 'claude-flow-v3',
      name: 'Claude Flow V3 Extension',
      methods: ['swarm/init', 'swarm/status', 'agent/spawn', 'memory/store'],
      compatibility: ['2024-11-05'],
      deprecated: false
    });
  }

  /**
   * Register a model
   */
  registerModel(model: ModelCapability): void {
    this.models.set(model.name, model);
  }

  /**
   * Register a pattern
   */
  registerPattern(pattern: Pattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Register a protocol
   */
  registerProtocol(protocol: Protocol): void {
    this.protocols.set(protocol.version, protocol);
  }

  /**
   * Register an MCP server
   */
  registerServer(server: MCPServer): void {
    this.servers.set(server.id, server);
  }

  /**
   * Route task to optimal model based on complexity
   */
  routeToModel(taskDescription: string, taskComplexity?: 'low' | 'medium' | 'high'): ModelCapability {
    // Check for agent booster intents
    const boosterIntents = [
      'var to const',
      'add types',
      'remove console',
      'add error handling',
      'async await'
    ];

    const lowerDesc = taskDescription.toLowerCase();
    if (boosterIntents.some(intent => lowerDesc.includes(intent))) {
      return this.models.get('agent-booster')!;
    }

    // Determine complexity if not provided
    if (!taskComplexity) {
      taskComplexity = this.assessComplexity(taskDescription);
    }

    // Route based on complexity
    const complexityMap: Record<string, string> = {
      'low': 'haiku',
      'medium': 'haiku',
      'high': 'sonnet'
    };

    const modelName = complexityMap[taskComplexity] || 'haiku';
    return this.models.get(modelName)!;
  }

  /**
   * Assess task complexity from description
   */
  private assessComplexity(description: string): 'low' | 'medium' | 'high' {
    const highKeywords = ['architecture', 'security', 'refactor', 'optimize', 'complex'];
    const lowKeywords = ['fix typo', 'add comment', 'format', 'simple'];

    const lower = description.toLowerCase();
    
    if (highKeywords.some(kw => lower.includes(kw))) {
      return 'high';
    }
    
    if (lowKeywords.some(kw => lower.includes(kw))) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Match task to pattern
   */
  matchPattern(taskDescription: string): Pattern | null {
    const lower = taskDescription.toLowerCase();

    for (const pattern of this.patterns.values()) {
      if (lower.includes(pattern.name.toLowerCase()) ||
          pattern.description.toLowerCase().includes(lower)) {
        return pattern;
      }
    }

    return null;
  }

  /**
   * Verify protocol compatibility
   */
  verifyProtocol(serverVersion: string, clientVersion: string): boolean {
    const serverProtocol = this.protocols.get(serverVersion);
    const clientProtocol = this.protocols.get(clientVersion);

    if (!serverProtocol || !clientProtocol) {
      return false;
    }

    if (serverProtocol.deprecated || clientProtocol.deprecated) {
      return false;
    }

    return serverProtocol.compatibility.includes(clientVersion) ||
           clientProtocol.compatibility.includes(serverVersion);
  }

  /**
   * Health check all registered servers
   */
  async healthCheckServers(): Promise<Map<string, 'healthy' | 'degraded' | 'down'>> {
    const results = new Map<string, 'healthy' | 'degraded' | 'down'>();

    for (const [id, server] of this.servers) {
      try {
        // In production, make actual HTTP requests
        // For now, simulate
        const isHealthy = Math.random() > 0.1; // 90% healthy
        const status = isHealthy ? 'healthy' : 'degraded';
        
        server.status = status;
        server.lastHealthCheck = new Date().toISOString();
        results.set(id, status);
      } catch (error) {
        server.status = 'down';
        results.set(id, 'down');
      }
    }

    this.saveToDisk();
    return results;
  }

  /**
   * Create or restore context session
   */
  createSession(sessionId?: string, swarmId?: string): ContextSession {
    const id = sessionId || `session-${Date.now()}`;
    
    const session: ContextSession = {
      sessionId: id,
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      swarmId,
      modelUsed: 'haiku',
      tokensUsed: 0,
      context: {}
    };

    this.sessions.set(id, session);
    this.saveToDisk();

    return session;
  }

  /**
   * Update session context
   */
  updateSession(sessionId: string, context: Record<string, any>, tokensUsed?: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context = { ...session.context, ...context };
    session.lastActivity = new Date().toISOString();
    
    if (tokensUsed) {
      session.tokensUsed += tokensUsed;
    }

    this.saveToDisk();
  }

  /**
   * Get session context
   */
  getSession(sessionId: string): ContextSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Calculate cost savings from routing
   */
  calculateCostSavings(): {
    totalTokens: number;
    estimatedCost: number;
    savingsVsOpus: number;
    savingsPercentage: number;
  } {
    let totalTokens = 0;
    let estimatedCost = 0;

    for (const session of this.sessions.values()) {
      const model = this.models.get(session.modelUsed);
      if (model) {
        totalTokens += session.tokensUsed;
        estimatedCost += (session.tokensUsed / 1000) * model.costPer1kTokens;
      }
    }

    const opusModel = this.models.get('opus')!;
    const opusCost = (totalTokens / 1000) * opusModel.costPer1kTokens;
    const savingsVsOpus = opusCost - estimatedCost;
    const savingsPercentage = (savingsVsOpus / opusCost) * 100;

    return {
      totalTokens,
      estimatedCost,
      savingsVsOpus,
      savingsPercentage
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    models: number;
    patterns: number;
    protocols: number;
    servers: number;
    sessions: number;
    healthyServers: number;
  } {
    const healthyServers = Array.from(this.servers.values())
      .filter(s => s.status === 'healthy').length;

    return {
      models: this.models.size,
      patterns: this.patterns.size,
      protocols: this.protocols.size,
      servers: this.servers.size,
      sessions: this.sessions.size,
      healthyServers
    };
  }

  /**
   * Save registry to disk
   */
  private saveToDisk(): void {
    try {
      const data = {
        models: Array.from(this.models.values()),
        patterns: Array.from(this.patterns.values()),
        protocols: Array.from(this.protocols.values()),
        servers: Array.from(this.servers.values()),
        sessions: Array.from(this.sessions.values())
      };

      writeFileSync(
        join(this.registryPath, 'registry.json'),
        JSON.stringify(data, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save MPP registry:', error);
    }
  }

  /**
   * Load registry from disk
   */
  private loadFromDisk(): void {
    const filePath = join(this.registryPath, 'registry.json');
    
    if (!existsSync(filePath)) {
      return;
    }

    try {
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));

      data.models?.forEach((m: ModelCapability) => this.models.set(m.name, m));
      data.patterns?.forEach((p: Pattern) => this.patterns.set(p.id, p));
      data.protocols?.forEach((pr: Protocol) => this.protocols.set(pr.version, pr));
      data.servers?.forEach((s: MCPServer) => this.servers.set(s.id, s));
      data.sessions?.forEach((se: ContextSession) => this.sessions.set(se.sessionId, se));
    } catch (error) {
      console.error('Failed to load MPP registry:', error);
    }
  }
}

export default MPPRegistry;
