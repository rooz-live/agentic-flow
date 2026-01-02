import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
/**
 * Default federation configuration
 */
export const DEFAULT_FEDERATION_CONFIG = {
    version: '1.0.0',
    goalieDir: path.resolve(process.cwd(), 'investing/agentic-flow/.goalie'),
    agents: {
        governance: {
            name: 'governance-agent',
            scriptPath: './tools/federation/governance_agent.ts',
            enabled: true,
            intervalMinutes: 15,
            args: ['--goalie-dir', '${GOALIE_DIR}', '--federation-mode'],
            env: {
                AF_RUN_ID: 'federation-gov-${TIMESTAMP}',
                AF_CIRCLE: 'governance',
                AF_FRAMEWORK: 'federation',
                AF_SCHEDULER: 'periodic'
            },
            healthCheck: 'node -e "console.log(\'governance-agent-ok\')"',
            restartOnFailure: true,
            maxRestartAttempts: 3
        },
        retroCoach: {
            name: 'retro-coach',
            scriptPath: './tools/federation/retro_coach.ts',
            enabled: true,
            intervalMinutes: 30,
            args: ['--goalie-dir', '${GOALIE_DIR}', '--federation-mode', '--analytics'],
            env: {
                AF_RUN_ID: 'federation-retro-${TIMESTAMP}',
                AF_CIRCLE: 'retro',
                AF_FRAMEWORK: 'federation',
                AF_SCHEDULER: 'periodic'
            },
            healthCheck: 'node -e "console.log(\'retro-coach-ok\')"',
            restartOnFailure: true,
            maxRestartAttempts: 3
        }
    },
    schedule: {
        wsjfSchedule: {
            enabled: true,
            intervalMinutes: 60,
            command: 'af wsjf',
            args: ['--goalie-dir', '${GOALIE_DIR}', '--output-format', 'jsonl']
        },
        prodCycleSchedule: {
            enabled: true,
            intervalMinutes: 120,
            command: 'af prod-cycle',
            args: ['--goalie-dir', '${GOALIE_DIR}', '--mode', 'advisory']
        },
        agenticJujutsuIntegration: {
            enabled: true,
            statusIntervalMinutes: 45,
            analyzeIntervalMinutes: 90,
            prePostSteps: true
        }
    },
    output: {
        metrics: {
            patternMetrics: true,
            metricsLog: true,
            governanceOutput: true
        },
        outputFormat: 'jsonl',
        retentionDays: 30
    },
    healthMonitoring: {
        enabled: true,
        checkIntervalMinutes: 5,
        logPath: '.goalie/federation_health.jsonl',
        alertThresholds: {
            failureRate: 20, // 20% failure rate triggers alert
            responseTime: 30000 // 30 seconds response time threshold
        }
    },
    startup: {
        validateEnvironment: true,
        checkDependencies: true,
        startAgents: true,
        enableHealthMonitoring: true
    }
};
/**
 * Load federation configuration from file
 */
export function loadFederationConfig(configPath) {
    const defaultConfigPath = path.join(process.cwd(), 'investing/agentic-flow/.goalie/federation_config.yaml');
    const filePath = configPath || defaultConfigPath;
    if (!fs.existsSync(filePath)) {
        console.log(`[Federation] Config file not found at ${filePath}, using defaults`);
        return DEFAULT_FEDERATION_CONFIG;
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const config = yaml.parse(raw);
        // Merge with defaults to ensure all fields are present
        return mergeConfig(DEFAULT_FEDERATION_CONFIG, config);
    }
    catch (error) {
        console.error(`[Federation] Failed to load config from ${filePath}:`, error);
        return DEFAULT_FEDERATION_CONFIG;
    }
}
/**
 * Save federation configuration to file
 */
export function saveFederationConfig(config, configPath) {
    const defaultConfigPath = path.join(process.cwd(), 'investing/agentic-flow/.goalie/federation_config.yaml');
    const filePath = configPath || defaultConfigPath;
    try {
        const yamlStr = yaml.stringify(config, {
            indent: 2,
            lineWidth: 120
        });
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, yamlStr, 'utf8');
        console.log(`[Federation] Configuration saved to ${filePath}`);
    }
    catch (error) {
        console.error(`[Federation] Failed to save config to ${filePath}:`, error);
    }
}
/**
 * Merge configuration objects
 */
function mergeConfig(defaults, override) {
    return {
        ...defaults,
        ...override,
        agents: {
            governance: { ...defaults.agents.governance, ...override.agents?.governance },
            retroCoach: { ...defaults.agents.retroCoach, ...override.agents?.retroCoach }
        },
        schedule: {
            wsjfSchedule: { ...defaults.schedule.wsjfSchedule, ...override.schedule?.wsjfSchedule },
            prodCycleSchedule: { ...defaults.schedule.prodCycleSchedule, ...override.schedule?.prodCycleSchedule },
            agenticJujutsuIntegration: {
                ...defaults.schedule.agenticJujutsuIntegration,
                ...override.schedule?.agenticJujutsuIntegration
            }
        },
        output: {
            ...defaults.output,
            ...override.output,
            metrics: { ...defaults.output.metrics, ...override.output?.metrics }
        },
        healthMonitoring: {
            ...defaults.healthMonitoring,
            ...override.healthMonitoring,
            alertThresholds: {
                ...defaults.healthMonitoring.alertThresholds,
                ...override.healthMonitoring?.alertThresholds
            }
        },
        startup: {
            ...defaults.startup,
            ...override.startup
        }
    };
}
/**
 * Validate federation configuration
 */
export function validateFederationConfig(config) {
    const errors = [];
    // Validate goalie directory
    if (!config.goalieDir) {
        errors.push('goalieDir is required');
    }
    else if (!fs.existsSync(config.goalieDir)) {
        errors.push(`goalieDir does not exist: ${config.goalieDir}`);
    }
    // Validate agent configurations
    if (!config.agents.governance.scriptPath) {
        errors.push('governance agent scriptPath is required');
    }
    if (!config.agents.retroCoach.scriptPath) {
        errors.push('retro coach agent scriptPath is required');
    }
    // Validate intervals
    if (config.agents.governance.intervalMinutes < 1) {
        errors.push('governance agent intervalMinutes must be >= 1');
    }
    if (config.agents.retroCoach.intervalMinutes < 1) {
        errors.push('retro coach agent intervalMinutes must be >= 1');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Substitute environment variables in configuration values
 */
export function substituteEnvVars(value) {
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        if (varName === 'TIMESTAMP') {
            return Date.now().toString();
        }
        if (varName === 'GOALIE_DIR') {
            return process.env.GOALIE_DIR || '';
        }
        return process.env[varName] || match;
    });
}
//# sourceMappingURL=federation_config.js.map