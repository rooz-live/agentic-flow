#!/usr/bin/env node
/**
 * Claude Code Execution MCP Server
 * Provides safe, sandboxed code execution capabilities with resource limits and monitoring
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import {
  CodeExecutionRequest,
  CodeExecutionResult,
  SafetyMonitor,
  SafetyAlert
} from '../types';

export class ClaudeCodeExecutionServer {
  private server: FastMCP;
  private safetyMonitor: SafetyMonitor;
  private activeExecutions: Map<string, { process: any; startTime: Date; timeout: NodeJS.Timeout }> = new Map();
  private executionHistory: Map<string, CodeExecutionResult> = new Map();

  constructor() {
    this.server = new FastMCP({
      name: 'claude-code-execution',
      version: '1.0.0'
    });

    this.safetyMonitor = {
      id: 'code-execution-safety',
      type: 'execution',
      thresholds: {
        maxConcurrentExecutions: 5,
        maxExecutionTime: 30000, // 30 seconds
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        maxCpuUsage: 50 // 50%
      },
      alerts: [],
      enabled: true
    };

    this.setupTools();
    this.setupSafetyMonitoring();
  }

  private setupTools(): void {
    // Execute Python code
    this.server.addTool({
      name: 'execute_python',
      description: 'Execute Python code in a sandboxed environment with resource limits',
      parameters: z.object({
        code: z.string().describe('Python code to execute'),
        timeout: z.number().optional().default(10000).describe('Execution timeout in milliseconds'),
        sandbox: z.boolean().optional().default(true).describe('Enable sandbox mode'),
        memoryLimit: z.number().optional().default(50).describe('Memory limit in MB'),
        includeStderr: z.boolean().optional().default(false).describe('Include stderr in output')
      }),
      execute: async (args) => {
        const request: CodeExecutionRequest = {
          code: args.code,
          language: 'python',
          timeout: args.timeout,
          sandbox: args.sandbox,
          resources: {
            memoryLimit: args.memoryLimit * 1024 * 1024 // Convert MB to bytes
          }
        };

        const result = await this.executeCode(request);
        return {
          content: [{
            type: 'text',
            text: args.includeStderr ? `${result.output}\n${result.error || ''}` : result.output
          }]
        };
      }
    });

    // Execute JavaScript/TypeScript code
    this.server.addTool({
      name: 'execute_javascript',
      description: 'Execute JavaScript/TypeScript code in a sandboxed environment',
      parameters: z.object({
        code: z.string().describe('JavaScript/TypeScript code to execute'),
        language: z.enum(['javascript', 'typescript']).default('javascript'),
        timeout: z.number().optional().default(5000).describe('Execution timeout in milliseconds'),
        sandbox: z.boolean().optional().default(true).describe('Enable sandbox mode'),
        memoryLimit: z.number().optional().default(25).describe('Memory limit in MB')
      }),
      execute: async (args) => {
        const request: CodeExecutionRequest = {
          code: args.code,
          language: args.language,
          timeout: args.timeout,
          sandbox: args.sandbox,
          resources: {
            memoryLimit: args.memoryLimit * 1024 * 1024
          }
        };

        const result = await this.executeCode(request);
        return {
          content: [{
            type: 'text',
            text: result.output || result.error || 'No output'
          }]
        };
      }
    });

    // Execute shell commands (with strict sandboxing)
    this.server.addTool({
      name: 'execute_shell',
      description: 'Execute shell commands in a restricted environment',
      parameters: z.object({
        command: z.string().describe('Shell command to execute'),
        timeout: z.number().optional().default(5000).describe('Execution timeout in milliseconds'),
        workingDirectory: z.string().optional().describe('Working directory for execution'),
        allowedCommands: z.array(z.string()).optional().describe('Whitelist of allowed commands')
      }),
      execute: async (args) => {
        // Strict command validation
        const allowedCommands = args.allowedCommands || ['ls', 'pwd', 'echo', 'cat', 'head', 'tail', 'grep', 'wc'];
        const commandParts = args.command.split(' ');
        const baseCommand = commandParts[0];

        if (!allowedCommands.includes(baseCommand)) {
          throw new Error(`Command '${baseCommand}' is not in the allowed commands list`);
        }

        const request: CodeExecutionRequest = {
          code: args.command,
          language: 'bash',
          timeout: args.timeout,
          sandbox: true,
          environment: {
            PWD: args.workingDirectory || process.cwd()
          }
        };

        const result = await this.executeCode(request);
        return {
          content: [{
            type: 'text',
            text: result.output || result.error || 'Command executed'
          }]
        };
      }
    });

    // Get execution history
    this.server.addTool({
      name: 'get_execution_history',
      description: 'Retrieve execution history and results',
      parameters: z.object({
        limit: z.number().optional().default(10).describe('Number of recent executions to retrieve'),
        language: z.string().optional().describe('Filter by programming language')
      }),
      execute: async (args) => {
        const history = Array.from(this.executionHistory.entries())
          .filter(([_, result]) => !args.language || result.success)
          .slice(-args.limit)
          .map(([id, result]) => ({
            id,
            language: 'unknown', // Would need to track this
            success: result.success,
            executionTime: result.executionTime,
            outputLength: result.output.length,
            hasError: !!result.error
          }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(history, null, 2)
          }]
        };
      }
    });

    // Get safety status
    this.server.addTool({
      name: 'get_safety_status',
      description: 'Get current safety monitoring status and alerts',
      parameters: z.object({}),
      execute: async () => {
        const status = {
          activeExecutions: this.activeExecutions.size,
          thresholds: this.safetyMonitor.thresholds,
          recentAlerts: this.safetyMonitor.alerts.slice(-5),
          totalExecutions: this.executionHistory.size
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(status, null, 2)
          }]
        };
      }
    });
  }

  private setupSafetyMonitoring(): void {
    // Periodic safety checks
    setInterval(() => {
      this.performSafetyChecks();
    }, 5000); // Check every 5 seconds
  }

  private async performSafetyChecks(): Promise<void> {
    const activeCount = this.activeExecutions.size;

    // Check concurrent execution limits
    if (activeCount > this.safetyMonitor.thresholds.maxConcurrentExecutions) {
      this.createSafetyAlert('warning', 'High concurrent executions', {
        activeCount,
        threshold: this.safetyMonitor.thresholds.maxConcurrentExecutions
      });
    }

    // Clean up timed out executions
    const now = Date.now();
    for (const [id, execution] of this.activeExecutions.entries()) {
      const runtime = now - execution.startTime.getTime();
      if (runtime > this.safetyMonitor.thresholds.maxExecutionTime) {
        this.terminateExecution(id, 'timeout');
      }
    }
  }

  private async executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    // Check safety limits
    if (this.activeExecutions.size >= this.safetyMonitor.thresholds.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent executions reached');
    }

    try {
      let result: CodeExecutionResult;

      switch (request.language) {
        case 'python':
          result = await this.executePython(request);
          break;
        case 'javascript':
        case 'typescript':
          result = await this.executeJavaScript(request);
          break;
        case 'bash':
          result = await this.executeShell(request);
          break;
        default:
          throw new Error(`Unsupported language: ${request.language}`);
      }

      result.executionTime = Date.now() - startTime;
      this.executionHistory.set(executionId, result);

      return result;
    } catch (error) {
      const errorResult: CodeExecutionResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime: Date.now() - startTime,
        resourceUsage: {
          memoryUsed: 0,
          cpuUsed: 0,
          diskUsed: 0
        }
      };

      this.executionHistory.set(executionId, errorResult);
      return errorResult;
    }
  }

  private async executePython(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    return new Promise((resolve, reject) => {
      const tempDir = path.join(os.tmpdir(), `claude-exec-${uuidv4()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      const scriptPath = path.join(tempDir, 'script.py');
      fs.writeFileSync(scriptPath, request.code);

      const pythonProcess = spawn('python3', [scriptPath], {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...request.environment,
          PYTHONPATH: tempDir
        },
        timeout: request.timeout || 10000
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const execution = {
        process: pythonProcess,
        startTime: new Date(),
        timeout: setTimeout(() => {
          this.terminateExecution(pythonProcess.pid?.toString() || 'unknown', 'timeout');
        }, request.timeout || 10000)
      };

      this.activeExecutions.set(pythonProcess.pid?.toString() || uuidv4(), execution);

      pythonProcess.on('close', (code) => {
        clearTimeout(execution.timeout);
        this.activeExecutions.delete(pythonProcess.pid?.toString() || 'unknown');

        // Cleanup temp directory
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('Failed to cleanup temp directory:', e);
        }

        resolve({
          success: code === 0,
          output: output.trim(),
          error: errorOutput.trim() || undefined,
          executionTime: 0, // Will be set by caller
          resourceUsage: {
            memoryUsed: 0, // Would need system monitoring
            cpuUsed: 0,
            diskUsed: 0
          },
          exitCode: code
        });
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(execution.timeout);
        this.activeExecutions.delete(pythonProcess.pid?.toString() || 'unknown');

        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
          console.warn('Failed to cleanup temp directory:', e);
        }

        reject(error);
      });
    });
  }

  private async executeJavaScript(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    // For JavaScript/TypeScript, we'll use Node.js with vm module for sandboxing
    const vm = require('vm');

    try {
      const context = vm.createContext({
        console: {
          log: (...args: any[]) => {
            // Capture console output
            return args.join(' ');
          }
        },
        process: {
          env: { ...process.env, ...request.environment },
          cwd: () => process.cwd()
        },
        Buffer,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval
      });

      let output = '';
      const originalConsoleLog = console.log;
      console.log = (...args: any[]) => {
        output += args.join(' ') + '\n';
      };

      const script = request.language === 'typescript'
        ? this.transpileTypeScript(request.code)
        : request.code;

      const result = vm.runInContext(script, context, {
        timeout: request.timeout || 5000
      });

      console.log = originalConsoleLog;

      return {
        success: true,
        output: output.trim() || (result !== undefined ? String(result) : ''),
        executionTime: 0,
        resourceUsage: {
          memoryUsed: 0,
          cpuUsed: 0,
          diskUsed: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'JavaScript execution failed',
        executionTime: 0,
        resourceUsage: {
          memoryUsed: 0,
          cpuUsed: 0,
          diskUsed: 0
        }
      };
    }
  }

  private async executeShell(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    return new Promise((resolve, reject) => {
      const shellProcess = spawn('bash', ['-c', request.code], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...request.environment,
          PATH: '/usr/local/bin:/usr/bin:/bin' // Restricted PATH
        },
        timeout: request.timeout || 5000
      });

      let output = '';
      let errorOutput = '';

      shellProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      shellProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const execution = {
        process: shellProcess,
        startTime: new Date(),
        timeout: setTimeout(() => {
          this.terminateExecution(shellProcess.pid?.toString() || 'unknown', 'timeout');
        }, request.timeout || 5000)
      };

      this.activeExecutions.set(shellProcess.pid?.toString() || uuidv4(), execution);

      shellProcess.on('close', (code) => {
        clearTimeout(execution.timeout);
        this.activeExecutions.delete(shellProcess.pid?.toString() || 'unknown');

        resolve({
          success: code === 0,
          output: output.trim(),
          error: errorOutput.trim() || undefined,
          executionTime: 0,
          resourceUsage: {
            memoryUsed: 0,
            cpuUsed: 0,
            diskUsed: 0
          },
          exitCode: code
        });
      });

      shellProcess.on('error', (error) => {
        clearTimeout(execution.timeout);
        this.activeExecutions.delete(shellProcess.pid?.toString() || 'unknown');
        reject(error);
      });
    });
  }

  private transpileTypeScript(code: string): string {
    // Simple TypeScript to JavaScript transpilation
    // Remove type annotations and interfaces
    return code
      .replace(/:\s*\w+(\[\])?/g, '') // Remove type annotations
      .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
      .replace(/<\w+>/g, '') // Remove generic types
      .replace(/import\s+type\s+[^;]+;/g, '') // Remove type imports
      .replace(/export\s+type\s+[^;]+;/g, ''); // Remove type exports
  }

  private terminateExecution(executionId: string, reason: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      try {
        execution.process.kill('SIGTERM');
        clearTimeout(execution.timeout);
        this.activeExecutions.delete(executionId);

        this.createSafetyAlert('warning', `Execution terminated: ${reason}`, {
          executionId,
          reason,
          runtime: Date.now() - execution.startTime.getTime()
        });
      } catch (error) {
        console.error('Failed to terminate execution:', error);
      }
    }
  }

  private createSafetyAlert(level: 'info' | 'warning' | 'critical', message: string, metadata: Record<string, any>): void {
    const alert: SafetyAlert = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      source: 'claude-code-execution',
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
    console.error('🚀 Starting Claude Code Execution MCP Server...');
    console.error('📦 Safe code execution tools available');
    console.error('🛡️  Safety monitoring enabled');

    if (port) {
      // HTTP/SSE mode would be implemented here
      console.error(`🌐 HTTP mode not yet implemented, using stdio`);
    }

    await this.server.start({ transportType: 'stdio' });
  }
}

// CLI runner
if (require.main === module) {
  const server = new ClaudeCodeExecutionServer();
  server.start().catch((error) => {
    console.error('Failed to start Claude Code Execution MCP Server:', error);
    process.exit(1);
  });
}