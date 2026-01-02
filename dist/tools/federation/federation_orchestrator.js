import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
export class FederationOrchestrator {
    config;
    agents = new Map();
    scheduledTasks = new Map();
    healthMonitorInterval;
    schedulerInterval;
    isShuttingDown = false;
    constructor(config) {
        this.config = config;
        this.setupSignalHandlers();
    }
    /**
     * Start the federation orchestrator
     */
    async start() {
        console.log('[Federation] Starting orchestrator...');
        // Validate configuration
        const validation = this.validateConfiguration();
        if (!validation.valid) {
            console.error('[Federation] Configuration validation failed:', validation.errors);
            process.exit(1);
        }
        // Initialize agents
        await this.initializeAgents();
        // Setup scheduled tasks
        this.setupScheduledTasks();
        // Start health monitoring
        if (this.config.healthMonitoring.enabled) {
            this.startHealthMonitoring();
        }
        // Start scheduler
        this.startScheduler();
        console.log('[Federation] Orchestrator started successfully');
        this.logFederationEvent('orchestrator-started', {
            agents: Array.from(this.agents.keys()),
            scheduledTasks: Array.from(this.scheduledTasks.keys())
        });
    }
    /**
     * Stop the federation orchestrator
     */
    async stop() {
        console.log('[Federation] Stopping orchestrator...');
        this.isShuttingDown = true;
        // Clear intervals
        if (this.healthMonitorInterval) {
            clearInterval(this.healthMonitorInterval);
        }
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
        }
        // Stop all agents
        for (const [name, agent] of this.agents) {
            await this.stopAgent(name);
        }
        console.log('[Federation] Orchestrator stopped');
        this.logFederationEvent('orchestrator-stopped', {});
    }
    /**
     * Initialize agents from configuration
     */
    async initializeAgents() {
        const { governance, retroCoach } = this.config.agents;
        if (governance.enabled) {
            this.agents.set('governance', {
                config: governance,
                restartCount: 0,
                isRunning: false,
                healthStatus: 'unknown'
            });
        }
        if (retroCoach.enabled) {
            this.agents.set('retro-coach', {
                config: retroCoach,
                restartCount: 0,
                isRunning: false,
                healthStatus: 'unknown'
            });
        }
        // Start agents if configured
        if (this.config.startup.startAgents) {
            for (const name of this.agents.keys()) {
                await this.startAgent(name);
            }
        }
    }
    /**
     * Setup scheduled tasks
     */
    setupScheduledTasks() {
        const { schedule } = this.config;
        // WSJF calculation task
        if (schedule.wsjfSchedule.enabled) {
            this.scheduledTasks.set('wsjf', {
                name: 'wsjf',
                interval: schedule.wsjfSchedule.intervalMinutes,
                command: schedule.wsjfSchedule.command,
                args: schedule.wsjfSchedule.args,
                enabled: true
            });
        }
        // Prod-cycle task
        if (schedule.prodCycleSchedule.enabled) {
            this.scheduledTasks.set('prod-cycle', {
                name: 'prod-cycle',
                interval: schedule.prodCycleSchedule.intervalMinutes,
                command: schedule.prodCycleSchedule.command,
                args: schedule.prodCycleSchedule.args,
                enabled: true
            });
        }
        // Agentic-jujutsu status task
        if (schedule.agenticJujutsuIntegration.enabled) {
            this.scheduledTasks.set('jujutsu-status', {
                name: 'jujutsu-status',
                interval: schedule.agenticJujutsuIntegration.statusIntervalMinutes,
                command: 'npx agentic-jujutsu status',
                args: [],
                enabled: true
            });
            this.scheduledTasks.set('jujutsu-analyze', {
                name: 'jujutsu-analyze',
                interval: schedule.agenticJujutsuIntegration.analyzeIntervalMinutes,
                command: 'npx agentic-jujutsu analyze',
                args: [],
                enabled: true
            });
        }
    }
    /**
     * Start an agent
     */
    async startAgent(name) {
        const agent = this.agents.get(name);
        if (!agent) {
            console.error(`[Federation] Agent not found: ${name}`);
            return false;
        }
        if (agent.isRunning) {
            console.log(`[Federation] Agent ${name} is already running`);
            return true;
        }
        try {
            const scriptPath = path.resolve(this.config.goalieDir, '..', agent.config.scriptPath);
            const args = agent.config.args.map(arg => this.substituteEnvVars(arg));
            // Set environment variables
            const env = {
                ...process.env,
                GOALIE_DIR: this.config.goalieDir,
                ...agent.config.env
            };
            console.log(`[Federation] Starting agent ${name} with script: ${scriptPath}`);
            const process = spawn('npx', ['ts-node', scriptPath, ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env,
                cwd: path.resolve(this.config.goalieDir, '..')
            });
            agent.process = process;
            agent.isRunning = true;
            agent.lastStartTime = new Date();
            agent.healthStatus = 'unknown';
            // Handle process events
            process.on('error', (error) => {
                console.error(`[Federation] Agent ${name} error:`, error);
                agent.isRunning = false;
                agent.healthStatus = 'unhealthy';
                this.handleAgentFailure(name, error);
            });
            process.on('exit', (code, signal) => {
                console.log(`[Federation] Agent ${name} exited with code ${code}, signal ${signal}`);
                agent.isRunning = false;
                if (code !== 0 && !this.isShuttingDown && agent.config.restartOnFailure) {
                    this.handleAgentFailure(name, new Error(`Exit code: ${code}`));
                }
            });
            // Log output
            process.stdout?.on('data', (data) => {
                console.log(`[${name}] ${data.toString().trim()}`);
            });
            process.stderr?.on('data', (data) => {
                console.error(`[${name}] ${data.toString().trim()}`);
            });
            this.logFederationEvent('agent-started', { name, scriptPath, args });
            return true;
        }
        catch (error) {
            console.error(`[Federation] Failed to start agent ${name}:`, error);
            agent.isRunning = false;
            agent.healthStatus = 'unhealthy';
            return false;
        }
    }
    /**
     * Stop an agent
     */
    async stopAgent(name) {
        const agent = this.agents.get(name);
        if (!agent || !agent.process) {
            return;
        }
        console.log(`[Federation] Stopping agent ${name}`);
        // Try graceful shutdown first
        agent.process.kill('SIGTERM');
        // Force kill after 5 seconds
        setTimeout(() => {
            if (agent.process && !agent.process.killed) {
                console.log(`[Federation] Force killing agent ${name}`);
                agent.process.kill('SIGKILL');
            }
        }, 5000);
        agent.isRunning = false;
        this.logFederationEvent('agent-stopped', { name });
    }
    /**
     * Handle agent failure
     */
    async handleAgentFailure(name, error) {
        const agent = this.agents.get(name);
        if (!agent)
            return;
        agent.restartCount++;
        console.log(`[Federation] Agent ${name} failure #${agent.restartCount}:`, error.message);
        this.logFederationEvent('agent-failure', {
            name,
            error: error.message,
            restartCount: agent.restartCount
        });
        if (agent.restartCount <= agent.config.maxRestartAttempts) {
            console.log(`[Federation] Restarting agent ${name} in 10 seconds...`);
            setTimeout(() => {
                if (!this.isShuttingDown) {
                    this.startAgent(name);
                }
            }, 10000);
        }
        else {
            console.error(`[Federation] Agent ${name} exceeded max restart attempts`);
            agent.healthStatus = 'unhealthy';
        }
    }
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        const intervalMs = this.config.healthMonitoring.checkIntervalMinutes * 60 * 1000;
        this.healthMonitorInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, intervalMs);
        console.log(`[Federation] Health monitoring started (interval: ${this.config.healthMonitoring.checkIntervalMinutes} minutes)`);
    }
    /**
     * Perform health checks for all agents
     */
    async performHealthChecks() {
        for (const [name, agent] of this.agents) {
            if (!agent.isRunning)
                continue;
            try {
                // Simple health check - verify process is still running
                const isHealthy = agent.process && !agent.process.killed;
                agent.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
                agent.lastHealthCheck = new Date();
                if (!isHealthy) {
                    console.warn(`[Federation] Health check failed for agent ${name}`);
                    this.handleAgentFailure(name, new Error('Health check failed'));
                }
            }
            catch (error) {
                console.error(`[Federation] Health check error for agent ${name}:`, error);
                agent.healthStatus = 'unhealthy';
            }
        }
        this.logHealthStatus();
    }
    /**
     * Start scheduler for periodic tasks
     */
    startScheduler() {
        // Check every minute
        this.schedulerInterval = setInterval(async () => {
            await this.checkScheduledTasks();
        }, 60000);
        console.log('[Federation] Task scheduler started');
    }
    /**
     * Check and execute scheduled tasks
     */
    async checkScheduledTasks() {
        const now = new Date();
        for (const [name, task] of this.scheduledTasks) {
            if (!task.enabled)
                continue;
            const shouldRun = !task.lastRun ||
                (now.getTime() - task.lastRun.getTime()) >= (task.interval * 60 * 1000);
            if (shouldRun) {
                console.log(`[Federation] Executing scheduled task: ${name}`);
                await this.executeScheduledTask(task);
                task.lastRun = now;
            }
        }
    }
    /**
     * Execute a scheduled task
     */
    async executeScheduledTask(task) {
        try {
            const args = task.args.map(arg => this.substituteEnvVars(arg));
            console.log(`[Federation] Running: ${task.command} ${args.join(' ')}`);
            const result = await this.runCommand(task.command, args);
            // Log results to .goalie/metrics_log.jsonl
            if (this.config.output.metrics.metricsLog) {
                await this.logMetricsResult(task.name, result);
            }
            this.logFederationEvent('task-executed', {
                taskName: task.name,
                command: task.command,
                args,
                success: result.success,
                output: result.output
            });
        }
        catch (error) {
            console.error(`[Federation] Scheduled task ${task.name} failed:`, error);
            this.logFederationEvent('task-failed', {
                taskName: task.name,
                error: error.message
            });
        }
    }
    /**
     * Run a command and return result
     */
    runCommand(command, args) {
        return new Promise((resolve) => {
            const child = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: path.resolve(this.config.goalieDir, '..')
            });
            let output = '';
            let errorOutput = '';
            child.stdout?.on('data', (data) => {
                output += data.toString();
            });
            child.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });
            child.on('close', (code) => {
                const success = code === 0;
                const fullOutput = success ? output : errorOutput;
                resolve({ success, output: fullOutput.trim() });
            });
        });
    }
    /**
     * Log metrics result to .goalie/metrics_log.jsonl
     */
    async logMetricsResult(taskName, result) {
        const metricsLogPath = path.join(this.config.goalieDir, 'metrics_log.jsonl');
        const entry = {
            ts: new Date().toISOString(),
            run: 'federation-orchestrator',
            run_id: `federation-${Date.now()}`,
            iteration: 0,
            circle: 'orchestrator',
            depth: 0,
            task_name: taskName,
            success: result.success,
            output: result.output,
            tags: ['Federation', 'ScheduledTask']
        };
        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(metricsLogPath, logLine);
        }
        catch (error) {
            console.error('[Federation] Failed to write metrics log:', error);
        }
    }
    /**
     * Log health status
     */
    logHealthStatus() {
        const healthData = {
            ts: new Date().toISOString(),
            agents: Array.from(this.agents.entries()).map(([name, agent]) => ({
                name,
                isRunning: agent.isRunning,
                healthStatus: agent.healthStatus,
                restartCount: agent.restartCount,
                lastStartTime: agent.lastStartTime,
                lastHealthCheck: agent.lastHealthCheck
            }))
        };
        const healthLogPath = path.join(this.config.goalieDir, 'federation_health.jsonl');
        const logLine = JSON.stringify(healthData) + '\n';
        try {
            fs.appendFileSync(healthLogPath, logLine);
        }
        catch (error) {
            console.error('[Federation] Failed to write health log:', error);
        }
    }
    /**
     * Log federation events
     */
    logFederationEvent(eventType, data) {
        const eventPath = path.join(this.config.goalieDir, 'federation_events.jsonl');
        const entry = {
            ts: new Date().toISOString(),
            event_type: eventType,
            data,
            orchestrator_version: this.config.version
        };
        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(eventPath, logLine);
        }
        catch (error) {
            console.error('[Federation] Failed to write event log:', error);
        }
    }
    /**
     * Validate configuration
     */
    validateConfiguration() {
        const errors = [];
        if (!fs.existsSync(this.config.goalieDir)) {
            errors.push(`Goalie directory does not exist: ${this.config.goalieDir}`);
        }
        // Check agent scripts exist
        for (const [name, agent] of this.agents) {
            const scriptPath = path.resolve(this.config.goalieDir, '..', agent.config.scriptPath);
            if (!fs.existsSync(scriptPath)) {
                errors.push(`Agent script not found: ${scriptPath}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    /**
     * Substitute environment variables in strings
     */
    substituteEnvVars(value) {
        return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
            if (varName === 'GOALIE_DIR') {
                return this.config.goalieDir;
            }
            return process.env[varName] || match;
        });
    }
    /**
     * Setup signal handlers for graceful shutdown
     */
    setupSignalHandlers() {
        const shutdown = async (signal) => {
            console.log(`[Federation] Received ${signal}, shutting down gracefully...`);
            await this.stop();
            process.exit(0);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
    }
}
/**
 * Main entry point
 */
export async function main() {
    try {
        // Load configuration
        const { loadFederationConfig } = await import('./federation_config.js');
        const config = loadFederationConfig();
        // Create and start orchestrator
        const orchestrator = new FederationOrchestrator(config);
        await orchestrator.start();
    }
    catch (error) {
        console.error('[Federation] Failed to start orchestrator:', error);
        process.exit(1);
    }
}
// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=federation_orchestrator.js.map