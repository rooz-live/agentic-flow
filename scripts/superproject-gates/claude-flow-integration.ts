#!/usr/bin/env tsx
/**
 * Claude-Flow v3alpha Integration
 * Hierarchical mesh topology with sparse attention
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ClaudeFlowConfig {
  topology: 'hierarchical' | 'mesh' | 'star';
  maxAgents: number;
  sparseAttention: boolean;
  mcpEnabled: boolean;
}

export class ClaudeFlowIntegration {
  private projectRoot: string;
  private config: ClaudeFlowConfig;
  
  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.config = this.loadConfig();
  }
  
  private loadConfig(): ClaudeFlowConfig {
    const settingsPath = path.join(this.projectRoot, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return {
        topology: settings.claudeFlow?.swarm?.topology || 'hierarchical',
        maxAgents: settings.claudeFlow?.swarm?.maxAgents || 8,
        sparseAttention: settings.claudeFlow?.swarm?.sparseAttention || true,
        mcpEnabled: settings.claudeFlow?.mcp?.enabled || true
      };
    }
    return {
      topology: 'hierarchical',
      maxAgents: 8,
      sparseAttention: true,
      mcpEnabled: true
    };
  }
  
  /**
   * Initialize Claude-Flow with hierarchical mesh
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Claude-Flow v3alpha...');
    
    try {
      // Force re-initialization
      execSync('npx claude-flow@v3alpha init --force', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      
      console.log('✓ Claude-Flow initialized');
    } catch (error: any) {
      console.error('✗ Initialization failed:', error.message);
      throw error;
    }
  }
  
  /**
   * Start MCP server
   */
  async startMCP(): Promise<void> {
    if (!this.config.mcpEnabled) {
      console.log('⚠ MCP disabled in config');
      return;
    }
    
    console.log('🔌 Starting MCP server...');
    
    try {
      // Start MCP server in background
      const mcpProcess = spawn('npx', ['claude-flow@v3alpha', 'mcp', 'start'], {
        cwd: this.projectRoot,
        detached: true,
        stdio: 'ignore'
      });
      
      mcpProcess.unref();
      console.log(`✓ MCP server started (PID: ${mcpProcess.pid})`);
    } catch (error: any) {
      console.error('✗ MCP server start failed:', error.message);
    }
  }
  
  /**
   * Start daemon
   */
  async startDaemon(): Promise<void> {
    console.log('👻 Starting Claude-Flow daemon...');
    
    try {
      const daemonProcess = spawn('npx', ['claude-flow@v3alpha', 'daemon', 'start'], {
        cwd: this.projectRoot,
        detached: true,
        stdio: 'ignore'
      });
      
      daemonProcess.unref();
      console.log(`✓ Daemon started (PID: ${daemonProcess.pid})`);
    } catch (error: any) {
      console.error('✗ Daemon start failed:', error.message);
    }
  }
  
  /**
   * Initialize hierarchical swarm
   */
  async initSwarm(): Promise<void> {
    console.log(`🌐 Initializing ${this.config.topology} swarm...`);
    
    try {
      execSync(
        `npx claude-flow@v3alpha swarm init --topology ${this.config.topology} --max-agents ${this.config.maxAgents}`,
        { cwd: this.projectRoot, stdio: 'inherit' }
      );
      
      console.log('✓ Swarm initialized');
    } catch (error: any) {
      console.error('✗ Swarm initialization failed:', error.message);
    }
  }
  
  /**
   * Spawn agents
   */
  async spawnAgents(types: string[] = ['coder', 'tester', 'reviewer']): Promise<void> {
    console.log('🤖 Spawning agents...');
    
    for (const type of types) {
      try {
        execSync(
          `npx claude-flow@v3alpha agent spawn -t ${type} --name my-${type}`,
          { cwd: this.projectRoot, stdio: 'inherit' }
        );
        console.log(`✓ Spawned ${type} agent`);
      } catch (error: any) {
        console.error(`✗ Failed to spawn ${type} agent:`, error.message);
      }
    }
  }
  
  /**
   * Store pattern in memory
   */
  async storePattern(key: string, value: string, namespace: string = 'patterns'): Promise<void> {
    try {
      execSync(
        `npx claude-flow@v3alpha memory store --key "${key}" --value "${value}" --namespace ${namespace}`,
        { cwd: this.projectRoot, stdio: 'pipe' }
      );
      console.log(`✓ Pattern stored: ${key}`);
    } catch (error: any) {
      console.error(`✗ Failed to store pattern:`, error.message);
    }
  }
  
  /**
   * Search patterns (HNSW-indexed)
   */
  async searchPatterns(query: string, namespace: string = 'patterns'): Promise<string> {
    try {
      const result = execSync(
        `npx claude-flow@v3alpha memory search --query "${query}" --namespace ${namespace}`,
        { cwd: this.projectRoot, encoding: 'utf-8', stdio: 'pipe' }
      );
      return result;
    } catch (error: any) {
      console.error(`✗ Search failed:`, error.message);
      return '';
    }
  }
  
  /**
   * Check status
   */
  async checkStatus(): Promise<void> {
    try {
      execSync('npx claude-flow@v3alpha status', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
    } catch (error: any) {
      console.error('✗ Status check failed:', error.message);
    }
  }
  
  /**
   * Full setup
   */
  async setup(): Promise<void> {
    await this.initialize();
    await this.startMCP();
    await this.startDaemon();
    await this.initSwarm();
    await this.checkStatus();
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const integration = new ClaudeFlowIntegration();
  const command = process.argv[2] || 'setup';
  
  switch (command) {
    case 'setup':
      integration.setup();
      break;
    case 'init':
      integration.initialize();
      break;
    case 'mcp':
      integration.startMCP();
      break;
    case 'daemon':
      integration.startDaemon();
      break;
    case 'swarm':
      integration.initSwarm();
      break;
    case 'status':
      integration.checkStatus();
      break;
    default:
      console.log('Usage: claude-flow-integration.ts [setup|init|mcp|daemon|swarm|status]');
  }
}
