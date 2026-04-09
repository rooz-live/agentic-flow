#!/usr/bin/env node
/**
 * Agent Harness MCP Server
 * Provides harnesses for long-running agents with state management, interruption handling, and progress tracking
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentHarnessConfig,
  AgentState,
  AgentCheckpoint,
  SafetyMonitor,
  SafetyAlert
} from '../types';

export class AgentHarnessServer {
  private server: FastMCP;
  private harnesses: Map<string, AgentHarnessConfig> = new Map();
  private agentStates: Map<string, AgentState> = new Map();
  private safetyMonitor: SafetyMonitor;
  private stateStoragePath: string;

  constructor(storagePath?: string) {
    this.server = new FastMCP({
      name: 'agent-harness',
      version: '1.0.0'
    });

    this.stateStoragePath = storagePath || path.join(process.cwd(), 'agent-states');

    this.safetyMonitor = {
      id: 'agent-harness-safety',
      type: 'resource',
      thresholds: {
        maxActiveAgents: 10,
        maxMemoryPerAgent: 200 * 1024 * 1024, // 200MB
        maxCpuPerAgent: 25, // 25%
        checkpointInterval: 300000 // 5 minutes
      },
      alerts: [],
      enabled: true
    };

    this.setupTools();
    this.setupSafetyMonitoring();
    this.ensureStorageDirectory();
    this.loadPersistedStates();
  }

  private setupTools(): void {
    // Create agent harness
    this.server.addTool({
      name: 'create_harness',
      description: 'Create a new agent harness configuration for long-running agents',
      parameters: z.object({
        name: z.string().describe('Name of the harness'),
        description: z.string().describe('Description of the harness purpose'),
        maxRuntime: z.number().optional().default(3600000).describe('Maximum runtime in milliseconds (default: 1 hour)'),
        checkpointInterval: z.number().optional().default(300000).describe('Checkpoint interval in milliseconds (default: 5 minutes)'),
        memoryLimit: z.number().optional().default(100).describe('Memory limit in MB'),
        cpuLimit: z.number().optional().default(20).describe('CPU limit percentage'),
        enablePersistence: z.boolean().optional().default(true).describe('Enable state persistence'),
        enableInterruption: z.boolean().optional().default(true).describe('Enable interruption handling')
      }),
      execute: async (args) => {
        const harnessId = uuidv4();
        const harness: AgentHarnessConfig = {
          id: harnessId,
          name: args.name,
          description: args.description,
          maxRuntime: args.maxRuntime,
          checkpointInterval: args.checkpointInterval,
          statePersistence: args.enablePersistence,
          interruptionHandling: args.enableInterruption,
          resourceLimits: {
            memory: args.memoryLimit * 1024 * 1024,
            cpu: args.cpuLimit,
            network: true // Default to enabled
          }
        };

        this.harnesses.set(harnessId, harness);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              harnessId,
              status: 'created',
              config: harness
            }, null, 2)
          }]
        };
      }
    });

    // Start agent with harness
    this.server.addTool({
      name: 'start_agent',
      description: 'Start an agent using a specific harness configuration',
      parameters: z.object({
        harnessId: z.string().describe('ID of the harness to use'),
        agentId: z.string().optional().describe('Custom agent ID (auto-generated if not provided)'),
        initialData: z.record(z.any()).optional().default({}).describe('Initial agent state data'),
        task: z.string().optional().describe('Initial task description')
      }),
      execute: async (args) => {
        const harness = this.harnesses.get(args.harnessId);
        if (!harness) {
          throw new Error(`Harness ${args.harnessId} not found`);
        }

        // Check resource limits
        if (this.agentStates.size >= this.safetyMonitor.thresholds.maxActiveAgents) {
          throw new Error('Maximum number of active agents reached');
        }

        const agentId = args.agentId || uuidv4();
        const agentState: AgentState = {
          id: agentId,
          harnessId: args.harnessId,
          status: 'running',
          startTime: new Date(),
          lastCheckpoint: new Date(),
          progress: 0,
          currentTask: args.task,
          data: args.initialData,
          checkpoints: []
        };

        this.agentStates.set(agentId, agentState);

        // Start checkpoint timer
        this.scheduleCheckpoint(agentId, harness.checkpointInterval);

        // Schedule max runtime timeout
        this.scheduleMaxRuntimeTimeout(agentId, harness.maxRuntime);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agentId,
              status: 'started',
              harnessId: args.harnessId,
              startTime: agentState.startTime
            }, null, 2)
          }]
        };
      }
    });

    // Update agent progress
    this.server.addTool({
      name: 'update_progress',
      description: 'Update an agent\'s progress and state',
      parameters: z.object({
        agentId: z.string().describe('ID of the running agent'),
        progress: z.number().min(0).max(100).describe('Progress percentage (0-100)'),
        currentTask: z.string().optional().describe('Current task description'),
        data: z.record(z.any()).optional().describe('Additional state data to merge'),
        forceCheckpoint: z.boolean().optional().default(false).describe('Force immediate checkpoint')
      }),
      execute: async (args) => {
        const agentState = this.agentStates.get(args.agentId);
        if (!agentState) {
          throw new Error(`Agent ${args.agentId} not found`);
        }

        agentState.progress = args.progress;
        if (args.currentTask) {
          agentState.currentTask = args.currentTask;
        }
        if (args.data) {
          agentState.data = { ...agentState.data, ...args.data };
        }

        const harness = this.harnesses.get(agentState.harnessId);
        if (args.forceCheckpoint && harness?.statePersistence) {
          await this.createCheckpoint(agentState);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agentId: args.agentId,
              progress: agentState.progress,
              currentTask: agentState.currentTask,
              updated: true
            }, null, 2)
          }]
        };
      }
    });

    // Pause agent
    this.server.addTool({
      name: 'pause_agent',
      description: 'Pause a running agent',
      parameters: z.object({
        agentId: z.string().describe('ID of the agent to pause'),
        reason: z.string().optional().describe('Reason for pausing')
      }),
      execute: async (args) => {
        const agentState = this.agentStates.get(args.agentId);
        if (!agentState) {
          throw new Error(`Agent ${args.agentId} not found`);
        }

        if (agentState.status !== 'running') {
          throw new Error(`Agent ${args.agentId} is not running (status: ${agentState.status})`);
        }

        agentState.status = 'paused';
        agentState.data.pausedReason = args.reason;
        agentState.data.pausedAt = new Date();

        // Create checkpoint on pause
        const harness = this.harnesses.get(agentState.harnessId);
        if (harness?.statePersistence) {
          await this.createCheckpoint(agentState);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agentId: args.agentId,
              status: 'paused',
              reason: args.reason,
              pausedAt: agentState.data.pausedAt
            }, null, 2)
          }]
        };
      }
    });

    // Resume agent
    this.server.addTool({
      name: 'resume_agent',
      description: 'Resume a paused agent',
      parameters: z.object({
        agentId: z.string().describe('ID of the agent to resume')
      }),
      execute: async (args) => {
        const agentState = this.agentStates.get(args.agentId);
        if (!agentState) {
          throw new Error(`Agent ${args.agentId} not found`);
        }

        if (agentState.status !== 'paused') {
          throw new Error(`Agent ${args.agentId} is not paused (status: ${agentState.status})`);
        }

        agentState.status = 'running';
        agentState.data.resumedAt = new Date();

        // Resume checkpoint timer
        const harness = this.harnesses.get(agentState.harnessId);
        if (harness) {
          this.scheduleCheckpoint(args.agentId, harness.checkpointInterval);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agentId: args.agentId,
              status: 'resumed',
              resumedAt: agentState.data.resumedAt
            }, null, 2)
          }]
        };
      }
    });

    // Stop agent
    this.server.addTool({
      name: 'stop_agent',
      description: 'Stop a running or paused agent',
      parameters: z.object({
        agentId: z.string().describe('ID of the agent to stop'),
        reason: z.string().optional().describe('Reason for stopping'),
        saveState: z.boolean().optional().default(true).describe('Save final state')
      }),
      execute: async (args) => {
        const agentState = this.agentStates.get(args.agentId);
        if (!agentState) {
          throw new Error(`Agent ${args.agentId} not found`);
        }

        agentState.status = 'completed';
        agentState.data.stoppedReason = args.reason;
        agentState.data.stoppedAt = new Date();

        if (args.saveState) {
          const harness = this.harnesses.get(agentState.harnessId);
          if (harness?.statePersistence) {
            await this.createCheckpoint(agentState);
          }
        }

        // Clean up timers
        this.clearAgentTimers(args.agentId);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agentId: args.agentId,
              status: 'stopped',
              reason: args.reason,
              stoppedAt: agentState.data.stoppedAt
            }, null, 2)
          }]
        };
      }
    });

    // Get agent status
    this.server.addTool({
      name: 'get_agent_status',
      description: 'Get the current status of an agent',
      parameters: z.object({
        agentId: z.string().describe('ID of the agent to check')
      }),
      execute: async (args) => {
        const agentState = this.agentStates.get(args.agentId);
        if (!agentState) {
          throw new Error(`Agent ${args.agentId} not found`);
        }

        const harness = this.harnesses.get(agentState.harnessId);
        const runtime = Date.now() - agentState.startTime.getTime();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agentId: args.agentId,
              harnessId: agentState.harnessId,
              status: agentState.status,
              progress: agentState.progress,
              currentTask: agentState.currentTask,
              startTime: agentState.startTime,
              runtime,
              lastCheckpoint: agentState.lastCheckpoint,
              checkpointCount: agentState.checkpoints.length,
              harness: harness ? {
                name: harness.name,
                maxRuntime: harness.maxRuntime,
                checkpointInterval: harness.checkpointInterval
              } : null
            }, null, 2)
          }]
        };
      }
    });

    // List agents
    this.server.addTool({
      name: 'list_agents',
      description: 'List all agents with their current status',
      parameters: z.object({
        status: z.enum(['idle', 'running', 'paused', 'completed', 'failed', 'interrupted']).optional().describe('Filter by status'),
        harnessId: z.string().optional().describe('Filter by harness ID'),
        limit: z.number().optional().default(50).describe('Maximum number of agents to return')
      }),
      execute: async (args) => {
        let agents = Array.from(this.agentStates.values());

        if (args.status) {
          agents = agents.filter(agent => agent.status === args.status);
        }

        if (args.harnessId) {
          agents = agents.filter(agent => agent.harnessId === args.harnessId);
        }

        agents = agents.slice(0, args.limit);

        const result = agents.map(agent => {
          const harness = this.harnesses.get(agent.harnessId);
          const runtime = Date.now() - agent.startTime.getTime();

          return {
            agentId: agent.id,
            harnessId: agent.harnessId,
            harnessName: harness?.name,
            status: agent.status,
            progress: agent.progress,
            currentTask: agent.currentTask,
            runtime,
            startTime: agent.startTime,
            lastCheckpoint: agent.lastCheckpoint
          };
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              total: result.length,
              agents: result
            }, null, 2)
          }]
        };
      }
    });

    // Get agent checkpoints
    this.server.addTool({
      name: 'get_checkpoints',
      description: 'Get checkpoint history for an agent',
      parameters: z.object({
        agentId: z.string().describe('ID of the agent'),
        limit: z.number().optional().default(10).describe('Maximum number of checkpoints to return')
      }),
      execute: async (args) => {
        const agentState = this.agentStates.get(args.agentId);
        if (!agentState) {
          throw new Error(`Agent ${args.agentId} not found`);
        }

        const checkpoints = agentState.checkpoints
          .slice(-args.limit)
          .map(cp => ({
            id: cp.id,
            timestamp: cp.timestamp,
            progress: cp.progress,
            metadata: cp.metadata
          }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agentId: args.agentId,
              totalCheckpoints: agentState.checkpoints.length,
              checkpoints
            }, null, 2)
          }]
        };
      }
    });

    // Restore agent from checkpoint
    this.server.addTool({
      name: 'restore_from_checkpoint',
      description: 'Restore an agent from a specific checkpoint',
      parameters: z.object({
        agentId: z.string().describe('ID of the agent to restore'),
        checkpointId: z.string().describe('ID of the checkpoint to restore from')
      }),
      execute: async (args) => {
        const agentState = this.agentStates.get(args.agentId);
        if (!agentState) {
          throw new Error(`Agent ${args.agentId} not found`);
        }

        const checkpoint = agentState.checkpoints.find(cp => cp.id === args.checkpointId);
        if (!checkpoint) {
          throw new Error(`Checkpoint ${args.checkpointId} not found for agent ${args.agentId}`);
        }

        // Restore state from checkpoint
        agentState.progress = checkpoint.progress;
        agentState.data = { ...agentState.data, ...checkpoint.state };
        agentState.lastCheckpoint = checkpoint.timestamp;

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              agentId: args.agentId,
              restoredFrom: args.checkpointId,
              progress: agentState.progress,
              restoredAt: new Date()
            }, null, 2)
          }]
        };
      }
    });
  }

  private setupSafetyMonitoring(): void {
    // Periodic safety checks
    setInterval(() => {
      this.performSafetyChecks();
    }, 30000); // Check every 30 seconds
  }

  private async performSafetyChecks(): Promise<void> {
    const activeAgents = Array.from(this.agentStates.values())
      .filter(agent => agent.status === 'running');

    // Check active agent limits
    if (activeAgents.length > this.safetyMonitor.thresholds.maxActiveAgents) {
      this.createSafetyAlert('warning', 'High number of active agents', {
        activeCount: activeAgents.length,
        threshold: this.safetyMonitor.thresholds.maxActiveAgents
      });
    }

    // Check for agents exceeding max runtime
    const now = Date.now();
    for (const agent of activeAgents) {
      const harness = this.harnesses.get(agent.harnessId);
      if (harness && (now - agent.startTime.getTime()) > harness.maxRuntime) {
        await this.handleAgentTimeout(agent.id);
      }
    }
  }

  private async handleAgentTimeout(agentId: string): Promise<void> {
    const agentState = this.agentStates.get(agentId);
    if (agentState) {
      agentState.status = 'failed';
      agentState.data.failureReason = 'Max runtime exceeded';
      agentState.data.failedAt = new Date();

      this.createSafetyAlert('critical', 'Agent exceeded maximum runtime', {
        agentId,
        maxRuntime: this.harnesses.get(agentState.harnessId)?.maxRuntime,
        actualRuntime: Date.now() - agentState.startTime.getTime()
      });

      this.clearAgentTimers(agentId);
    }
  }

  private scheduleCheckpoint(agentId: string, interval: number): void {
    const timeout = setTimeout(async () => {
      const agentState = this.agentStates.get(agentId);
      if (agentState && agentState.status === 'running') {
        const harness = this.harnesses.get(agentState.harnessId);
        if (harness?.statePersistence) {
          await this.createCheckpoint(agentState);
        }
        // Schedule next checkpoint
        this.scheduleCheckpoint(agentId, interval);
      }
    }, interval);

    // Store timeout reference for cleanup
    if (!agentState.data.timers) {
      agentState.data.timers = {};
    }
    agentState.data.timers.checkpoint = timeout;
  }

  private scheduleMaxRuntimeTimeout(agentId: string, maxRuntime: number): void {
    const timeout = setTimeout(() => {
      this.handleAgentTimeout(agentId);
    }, maxRuntime);

    const agentState = this.agentStates.get(agentId);
    if (agentState) {
      if (!agentState.data.timers) {
        agentState.data.timers = {};
      }
      agentState.data.timers.maxRuntime = timeout;
    }
  }

  private clearAgentTimers(agentId: string): void {
    const agentState = this.agentStates.get(agentId);
    if (agentState?.data.timers) {
      if (agentState.data.timers.checkpoint) {
        clearTimeout(agentState.data.timers.checkpoint);
      }
      if (agentState.data.timers.maxRuntime) {
        clearTimeout(agentState.data.timers.maxRuntime);
      }
    }
  }

  private async createCheckpoint(agentState: AgentState): Promise<void> {
    const checkpoint: AgentCheckpoint = {
      id: uuidv4(),
      timestamp: new Date(),
      progress: agentState.progress,
      state: { ...agentState.data },
      metadata: {
        currentTask: agentState.currentTask,
        status: agentState.status
      }
    };

    agentState.checkpoints.push(checkpoint);
    agentState.lastCheckpoint = checkpoint.timestamp;

    // Keep only last 50 checkpoints
    if (agentState.checkpoints.length > 50) {
      agentState.checkpoints = agentState.checkpoints.slice(-50);
    }

    // Persist to disk if enabled
    const harness = this.harnesses.get(agentState.harnessId);
    if (harness?.statePersistence) {
      await this.persistAgentState(agentState);
    }
  }

  private async persistAgentState(agentState: AgentState): Promise<void> {
    try {
      const filePath = path.join(this.stateStoragePath, `${agentState.id}.json`);
      const data = JSON.stringify(agentState, null, 2);
      await fs.promises.writeFile(filePath, data, 'utf8');
    } catch (error) {
      console.error(`Failed to persist agent state ${agentState.id}:`, error);
      this.createSafetyAlert('warning', 'Failed to persist agent state', {
        agentId: agentState.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async loadPersistedStates(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.stateStoragePath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.stateStoragePath, file);
            const data = await fs.promises.readFile(filePath, 'utf8');
            const agentState: AgentState = JSON.parse(data);

            // Convert date strings back to Date objects
            agentState.startTime = new Date(agentState.startTime);
            agentState.lastCheckpoint = new Date(agentState.lastCheckpoint);
            agentState.checkpoints = agentState.checkpoints.map(cp => ({
              ...cp,
              timestamp: new Date(cp.timestamp)
            }));

            this.agentStates.set(agentState.id, agentState);
          } catch (error) {
            console.warn(`Failed to load persisted state from ${file}:`, error);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist yet, that's fine
      if ((error as any).code !== 'ENOENT') {
        console.error('Failed to load persisted states:', error);
      }
    }
  }

  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.stateStoragePath)) {
        fs.mkdirSync(this.stateStoragePath, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create state storage directory:', error);
    }
  }

  private createSafetyAlert(level: 'info' | 'warning' | 'critical', message: string, metadata: Record<string, any>): void {
    const alert: SafetyAlert = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      source: 'agent-harness',
      metadata
    };

    this.safetyMonitor.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.safetyMonitor.alerts.length > 100) {
      this.safetyMonitor.alerts = this.safetyMonitor.alerts.slice(-100);
    }

    console.warn(`[SAFETY ALERT ${level.toUpperCase()}] ${message}`, metadata);
  }

  public async start(port?: number): Promise<void> {
    console.error('🚀 Starting Agent Harness MCP Server...');
    console.error('📦 Long-running agent management tools available');
    console.error('🛡️  Safety monitoring and state persistence enabled');

    if (port) {
      console.error(`🌐 HTTP mode not yet implemented, using stdio`);
    }

    await this.server.start({ transportType: 'stdio' });
  }
}

// CLI runner
if (require.main === module) {
  const server = new AgentHarnessServer();
  server.start().catch((error) => {
    console.error('Failed to start Agent Harness MCP Server:', error);
    process.exit(1);
  });
}