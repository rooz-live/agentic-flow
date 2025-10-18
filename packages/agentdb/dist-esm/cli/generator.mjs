/**
 * Plugin code generator
 * Generates complete plugin structure from configuration
 */
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import YAML from 'yaml';
import { getTemplateConfig } from './templates.mjs';
export async function generatePlugin(config, options = {}) {
    let pluginConfig;
    // Handle quick template creation
    if ('template' in config && 'useDefaults' in config) {
        const templateConfig = await getTemplateConfig(config.template);
        const template = await import('./templates.js').then(m => m.getTemplate(config.template));
        pluginConfig = {
            ...templateConfig,
            name: config.name,
            description: template ? (await template).description : 'AI learning plugin',
            version: '1.0.0',
            author: 'Unknown',
        };
    }
    else {
        pluginConfig = config;
    }
    // SECURITY FIXES: Enhanced path validation
    const pluginName = pluginConfig.name;
    // 1. Validate format (already enforced by schema, but double-check)
    if (!/^[a-z0-9-]+$/.test(pluginName)) {
        throw new Error('Invalid plugin name format. Use only lowercase letters, numbers, and hyphens.');
    }
    // 2. Validate length
    if (pluginName.length < 3 || pluginName.length > 50) {
        throw new Error('Plugin name must be between 3 and 50 characters');
    }
    // 3. Check for reserved OS names
    const RESERVED_NAMES = [
        'con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5',
        'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4',
        'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9', 'clock$'
    ];
    if (RESERVED_NAMES.includes(pluginName.toLowerCase())) {
        throw new Error(`Plugin name '${pluginName}' is reserved by the operating system`);
    }
    // 4. Construct paths safely
    const pluginsBaseDir = path.resolve(process.cwd(), 'plugins');
    const pluginDir = path.join(pluginsBaseDir, pluginName);
    // 5. Verify resolved path is within plugins directory (prevent traversal via symlinks)
    const resolvedPluginDir = path.resolve(pluginDir);
    if (!resolvedPluginDir.startsWith(pluginsBaseDir + path.sep) && resolvedPluginDir !== pluginsBaseDir) {
        throw new Error('Invalid plugin directory path (security violation)');
    }
    // 6. Check if path exists and is not a symlink
    try {
        const stats = await fs.lstat(pluginDir);
        if (stats.isSymbolicLink()) {
            throw new Error('Plugin directory cannot be a symlink (security violation)');
        }
        // Directory exists and is not a symlink - check if we should overwrite
        if (!options.force) {
            throw new Error(`Plugin directory already exists: ${pluginDir}. Use --force to overwrite.`);
        }
    }
    catch (err) {
        // ENOENT is expected (directory doesn't exist yet)
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
    try {
        // Create directory structure
        await createDirectoryStructure(pluginDir);
        if (options.configOnly) {
            // Save configuration only
            await saveConfiguration(pluginDir, pluginConfig);
            console.log(chalk.green(`✓ Configuration saved to ${pluginDir}/plugin.yaml`));
            return;
        }
        // Generate all files
        await Promise.all([
            saveConfiguration(pluginDir, pluginConfig),
            generateIndexFile(pluginDir, pluginConfig),
            generateAgentFile(pluginDir, pluginConfig),
            generateRewardFile(pluginDir, pluginConfig),
            generatePolicyFile(pluginDir, pluginConfig),
            generateTestFile(pluginDir, pluginConfig),
            generateReadme(pluginDir, pluginConfig),
            generatePackageJson(pluginDir, pluginConfig),
            generateTsConfig(pluginDir),
        ]);
        console.log(chalk.green('✓ Created plugin structure at'), pluginDir);
        console.log(chalk.green('✓ Generated plugin.yaml'));
        console.log(chalk.green('✓ Generated src/index.ts'));
        console.log(chalk.green('✓ Generated src/agent.ts'));
        console.log(chalk.green('✓ Generated src/reward.ts'));
        console.log(chalk.green('✓ Generated src/policy.ts'));
        console.log(chalk.green('✓ Generated tests/plugin.test.ts'));
        console.log(chalk.green('✓ Generated README.md'));
        console.log(chalk.green('✓ Generated package.json'));
    }
    catch (error) {
        console.error(chalk.red('Error generating plugin:'), error);
        throw error;
    }
}
async function createDirectoryStructure(pluginDir) {
    await fs.mkdir(path.join(pluginDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(pluginDir, 'tests'), { recursive: true });
}
async function saveConfiguration(pluginDir, config) {
    const yamlStr = YAML.stringify(config);
    await fs.writeFile(path.join(pluginDir, 'plugin.yaml'), yamlStr, 'utf-8');
}
async function generateIndexFile(pluginDir, config) {
    const content = `/**
 * ${config.name}
 * ${config.description}
 *
 * Generated by SQLite Vector Learning Plugin CLI
 */

import type { LearningPlugin, PluginConfig, Experience, Vector, Action } from 'agentdb/plugins';
import { ${getAgentClassName(config)} } from './agent.mjs';

export class ${getPluginClassName(config)} implements LearningPlugin {
  name = '${config.name}';
  version = '${config.version}';
  config: PluginConfig;

  private agent: ${getAgentClassName(config)};

  async initialize(config: PluginConfig): Promise<void> {
    this.config = config;
    this.agent = new ${getAgentClassName(config)}(config);
    await this.agent.initialize();
  }

  async destroy(): Promise<void> {
    await this.agent.destroy();
  }

  async storeExperience(experience: Experience): Promise<void> {
    await this.agent.storeExperience(experience);
  }

  async storeBatch(experiences: Experience[]): Promise<void> {
    await this.agent.storeBatch(experiences);
  }

  async retrieveSimilar(state: Vector, k: number): Promise<Experience[]> {
    return await this.agent.retrieveSimilar(state, k);
  }

  async selectAction(state: Vector, context?: any): Promise<Action> {
    return await this.agent.selectAction(state, context);
  }

  async train(options?: any): Promise<any> {
    return await this.agent.train(options);
  }

  async getMetrics(): Promise<any> {
    return await this.agent.getMetrics();
  }

  getConfig(): PluginConfig {
    return this.config;
  }

  async save(path: string): Promise<void> {
    await this.agent.save(path);
  }

  async load(path: string): Promise<void> {
    await this.agent.load(path);
  }
}

// Export plugin factory
export default function createPlugin(config: PluginConfig): LearningPlugin {
  return new ${getPluginClassName(config)}();
}
`;
    await fs.writeFile(path.join(pluginDir, 'src', 'index.ts'), content, 'utf-8');
}
async function generateAgentFile(pluginDir, config) {
    const algorithmImpl = generateAlgorithmImplementation(config);
    const content = `/**
 * Learning agent implementation for ${config.name}
 */

import type { PluginConfig, Experience, Vector, Action } from 'agentdb/plugins';
import { SQLiteVectorDB } from 'agentdb';
import { RewardFunction } from './reward.mjs';
import { PolicyFunction } from './policy.mjs';

export class ${getAgentClassName(config)} {
  private vectorDB: SQLiteVectorDB;
  private rewardFn: RewardFunction;
  private policy: PolicyFunction;
  private metrics: Map<string, number[]>;

${algorithmImpl.fields}

  constructor(private config: PluginConfig) {
    this.metrics = new Map();
    this.rewardFn = new RewardFunction(config.reward);
    this.policy = new PolicyFunction(config.algorithm);
  }

  async initialize(): Promise<void> {
    // Initialize vector database
    this.vectorDB = new SQLiteVectorDB({
      path: this.config.storage.path,
      hnsw: this.config.storage.hnsw,
    });

${algorithmImpl.initialization}
  }

  async destroy(): Promise<void> {
    // Cleanup resources
  }

  async storeExperience(experience: Experience): Promise<void> {
    // Store in vector database
    await this.vectorDB.insert({
      embedding: experience.state,
      metadata: {
        action: experience.action,
        reward: experience.reward,
        nextState: experience.nextState,
        done: experience.done,
        timestamp: Date.now(),
      },
    });

${algorithmImpl.onStoreExperience}
  }

  async storeBatch(experiences: Experience[]): Promise<void> {
    for (const exp of experiences) {
      await this.storeExperience(exp);
    }
  }

  async retrieveSimilar(state: Vector, k: number): Promise<Experience[]> {
    const results = await this.vectorDB.search(state, k);
    return results.map((r) => ({
      state: r.embedding,
      action: r.metadata.action,
      reward: r.metadata.reward,
      nextState: r.metadata.nextState,
      done: r.metadata.done,
    }));
  }

  async selectAction(state: Vector, context?: any): Promise<Action> {
    return await this.policy.selectAction(state, context);
  }

  async train(options?: any): Promise<any> {
${algorithmImpl.training}
  }

  async getMetrics(): Promise<any> {
    const result: any = {};
    for (const [key, values] of this.metrics) {
      result[key] = {
        current: values[values.length - 1] || 0,
        average: values.reduce((a, b) => a + b, 0) / values.length || 0,
        min: Math.min(...values) || 0,
        max: Math.max(...values) || 0,
      };
    }
    return result;
  }

  async save(path: string): Promise<void> {
    // Save model state
  }

  async load(path: string): Promise<void> {
    // Load model state
  }

  private trackMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }
}
`;
    await fs.writeFile(path.join(pluginDir, 'src', 'agent.ts'), content, 'utf-8');
}
async function generateRewardFile(pluginDir, config) {
    // SECURITY FIX: Never use custom functions - always use predefined safe functions
    const rewardImpl = generateDefaultReward(config.reward.type);
    const content = `/**
 * Reward function for ${config.name}
 */

export class RewardFunction {
  constructor(private config: any) {}

  compute(outcome: any, context: any): number {
    ${rewardImpl}
  }
}
`;
    await fs.writeFile(path.join(pluginDir, 'src', 'reward.ts'), content, 'utf-8');
}
async function generatePolicyFile(pluginDir, config) {
    const content = `/**
 * Policy/action selection for ${config.name}
 */

import type { Vector, Action } from 'agentdb/plugins';

export class PolicyFunction {
  constructor(private config: any) {}

  async selectAction(state: Vector, context?: any): Promise<Action> {
    // ${config.algorithm.action_selection || 'epsilon_greedy'} strategy
    // TODO: Implement action selection logic
    return { id: 0, type: 'discrete' };
  }
}
`;
    await fs.writeFile(path.join(pluginDir, 'src', 'policy.ts'), content, 'utf-8');
}
async function generateTestFile(pluginDir, config) {
    const content = `/**
 * Tests for ${config.name}
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ${getPluginClassName(config)} } from '../src/index.mjs';
import type { PluginConfig } from 'agentdb/plugins';

describe('${config.name}', () => {
  let plugin: ${getPluginClassName(config)};

  beforeAll(async () => {
    const config: PluginConfig = {
      // Load from plugin.yaml
    };

    plugin = new ${getPluginClassName(config)}();
    await plugin.initialize(config);
  });

  afterAll(async () => {
    await plugin.destroy();
  });

  it('should initialize correctly', () => {
    expect(plugin.name).toBe('${config.name}');
    expect(plugin.version).toBe('${config.version}');
  });

  it('should store experiences', async () => {
    const experience = {
      state: new Float32Array(${config.algorithm.state_dim || 768}),
      action: { id: 0, type: 'discrete' },
      reward: 1.0,
      nextState: new Float32Array(${config.algorithm.state_dim || 768}),
      done: false,
    };

    await plugin.storeExperience(experience);
  });

  it('should select actions', async () => {
    const state = new Float32Array(${config.algorithm.state_dim || 768});
    const action = await plugin.selectAction(state);
    expect(action).toBeDefined();
  });

  it('should train successfully', async () => {
    const metrics = await plugin.train();
    expect(metrics).toBeDefined();
  });
});
`;
    await fs.writeFile(path.join(pluginDir, 'tests', 'plugin.test.ts'), content, 'utf-8');
}
async function generateReadme(pluginDir, config) {
    const content = `# ${config.name}

${config.description}

**Version:** ${config.version}
**Author:** ${config.author || 'Unknown'}
**Algorithm:** ${config.algorithm.base}

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`typescript
import { PluginRegistry } from 'agentdb/plugins';

// Load plugin
const plugin = await PluginRegistry.load('${config.name}');

// Initialize
await plugin.initialize(config);

// Use in your application
const action = await plugin.selectAction(state);
\`\`\`

## Configuration

See \`plugin.yaml\` for complete configuration options.

## Testing

\`\`\`bash
npm test
\`\`\`

## License

MIT
`;
    await fs.writeFile(path.join(pluginDir, 'README.md'), content, 'utf-8');
}
async function generatePackageJson(pluginDir, config) {
    const pkg = {
        name: config.name,
        version: config.version,
        description: config.description,
        type: 'module',
        main: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: {
            build: 'tsc',
            test: 'vitest',
            'test:coverage': 'vitest --coverage',
        },
        dependencies: {
            'agentdb': '^1.0.0',
        },
        devDependencies: {
            typescript: '^5.0.0',
            vitest: '^1.0.0',
            '@types/node': '^20.0.0',
        },
    };
    await fs.writeFile(path.join(pluginDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8');
}
async function generateTsConfig(pluginDir) {
    const tsconfig = {
        compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            declaration: true,
            outDir: './dist',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'tests'],
    };
    await fs.writeFile(path.join(pluginDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2), 'utf-8');
}
// Helper functions
function getPluginClassName(config) {
    return config.name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('') + 'Plugin';
}
function getAgentClassName(config) {
    return config.name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('') + 'Agent';
}
function generateAlgorithmImplementation(config) {
    switch (config.algorithm.base) {
        case 'q_learning':
            return {
                fields: `  private qTable: Map<string, number[]>;\n  private epsilon: number;`,
                initialization: `    this.qTable = new Map();\n    this.epsilon = ${config.algorithm.epsilon_start || 1.0};`,
                onStoreExperience: `    // Update Q-values if needed`,
                training: `    const metrics = { loss: 0, epsilon: this.epsilon };\n    // TODO: Implement Q-learning training\n    return metrics;`,
            };
        case 'decision_transformer':
            return {
                fields: `  private model: any; // Neural network model`,
                initialization: `    // Initialize Decision Transformer model`,
                onStoreExperience: `    // Store trajectory for training`,
                training: `    const metrics = { loss: 0 };\n    // TODO: Implement Decision Transformer training\n    return metrics;`,
            };
        default:
            return {
                fields: '',
                initialization: '',
                onStoreExperience: '',
                training: `    const metrics = {};\n    // TODO: Implement training logic\n    return metrics;`,
            };
    }
}
function generateDefaultReward(type) {
    switch (type) {
        case 'success_based':
            return 'return outcome.success ? 1.0 : -1.0;';
        case 'time_aware':
            return `const base = outcome.success ? 1.0 : -1.0;\nconst timePenalty = -0.1 * (context.duration / 1000);\nreturn base + timePenalty;`;
        case 'token_aware':
            return `const base = outcome.success ? 1.0 : -1.0;\nconst tokenPenalty = -0.01 * (context.tokensUsed / 100);\nreturn base + tokenPenalty;`;
        default:
            return 'return outcome.success ? 1.0 : -1.0;';
    }
}
