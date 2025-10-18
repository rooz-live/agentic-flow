/**
 * Wizard prompt definitions
 */
import inquirer from 'inquirer';
export async function promptMetadata(options) {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Plugin name:',
            default: options.name,
            validate: (input) => {
                if (!/^[a-z0-9-]+$/.test(input)) {
                    return 'Use lowercase letters, numbers, and hyphens only';
                }
                if (input.length < 3 || input.length > 50) {
                    return 'Name must be between 3 and 50 characters';
                }
                return true;
            },
        },
        {
            type: 'input',
            name: 'description',
            message: 'Description:',
            validate: (input) => {
                if (input.length < 10) {
                    return 'Description must be at least 10 characters';
                }
                return true;
            },
        },
        {
            type: 'input',
            name: 'author',
            message: 'Author (optional):',
        },
        {
            type: 'input',
            name: 'version',
            message: 'Version:',
            default: '1.0.0',
            validate: (input) => {
                if (!/^\d+\.\d+\.\d+$/.test(input)) {
                    return 'Version must follow semantic versioning (e.g., 1.0.0)';
                }
                return true;
            },
        },
    ]);
    return answers;
}
export async function promptAlgorithm(template) {
    const { base } = await inquirer.prompt([
        {
            type: 'list',
            name: 'base',
            message: 'Base algorithm:',
            default: template || 'decision_transformer',
            choices: [
                {
                    name: 'Decision Transformer (recommended for sequential tasks)',
                    value: 'decision_transformer',
                },
                {
                    name: 'Q-Learning (model-free, value-based)',
                    value: 'q_learning',
                },
                {
                    name: 'SARSA (on-policy Q-learning variant)',
                    value: 'sarsa',
                },
                {
                    name: 'Actor-Critic (policy gradient + value function)',
                    value: 'actor_critic',
                },
                {
                    name: 'Custom (start from scratch)',
                    value: 'custom',
                },
            ],
        },
    ]);
    let config = { base, type: base };
    switch (base) {
        case 'decision_transformer':
            config = { ...config, ...(await configureDecisionTransformer()) };
            break;
        case 'q_learning':
            config = { ...config, ...(await configureQLearning()) };
            break;
        case 'sarsa':
            config = { ...config, ...(await configureSARSA()) };
            break;
        case 'actor_critic':
            config = { ...config, ...(await configureActorCritic()) };
            break;
        case 'custom':
            config = { ...config, ...(await configureCustom()) };
            break;
    }
    return config;
}
async function configureDecisionTransformer() {
    return await inquirer.prompt([
        {
            type: 'number',
            name: 'state_dim',
            message: 'State embedding dimension:',
            default: 768,
        },
        {
            type: 'number',
            name: 'action_dim',
            message: 'Action embedding dimension:',
            default: 768,
        },
        {
            type: 'number',
            name: 'hidden_size',
            message: 'Hidden layer size:',
            default: 256,
        },
        {
            type: 'number',
            name: 'learning_rate',
            message: 'Learning rate:',
            default: 0.001,
        },
        {
            type: 'list',
            name: 'action_selection',
            message: 'Action selection strategy:',
            choices: [
                { name: '3-tier (exact → interpolation → neural)', value: '3_tier' },
                { name: 'epsilon-greedy', value: 'epsilon_greedy' },
                { name: 'softmax', value: 'softmax' },
                { name: 'UCB (Upper Confidence Bound)', value: 'ucb' },
            ],
            default: '3_tier',
        },
    ]);
}
async function configureQLearning() {
    return await inquirer.prompt([
        {
            type: 'number',
            name: 'learning_rate',
            message: 'Learning rate:',
            default: 0.001,
        },
        {
            type: 'number',
            name: 'discount_factor',
            message: 'Discount factor (gamma):',
            default: 0.99,
        },
        {
            type: 'number',
            name: 'epsilon_start',
            message: 'Initial epsilon (exploration rate):',
            default: 1.0,
        },
        {
            type: 'number',
            name: 'epsilon_end',
            message: 'Final epsilon:',
            default: 0.01,
        },
        {
            type: 'number',
            name: 'epsilon_decay',
            message: 'Epsilon decay rate:',
            default: 0.995,
        },
        {
            type: 'list',
            name: 'experience_replay_type',
            message: 'Experience replay type:',
            choices: [
                { name: 'Uniform (standard replay)', value: 'uniform' },
                { name: 'Prioritized (by TD error)', value: 'prioritized' },
                { name: 'None (online learning)', value: 'none' },
            ],
            default: 'uniform',
        },
    ]);
}
async function configureSARSA() {
    return await inquirer.prompt([
        {
            type: 'number',
            name: 'learning_rate',
            message: 'Learning rate:',
            default: 0.001,
        },
        {
            type: 'number',
            name: 'discount_factor',
            message: 'Discount factor (gamma):',
            default: 0.99,
        },
        {
            type: 'number',
            name: 'epsilon',
            message: 'Epsilon (exploration rate):',
            default: 0.1,
        },
        {
            type: 'number',
            name: 'lambda',
            message: 'Lambda (eligibility trace decay):',
            default: 0.9,
        },
    ]);
}
async function configureActorCritic() {
    return await inquirer.prompt([
        {
            type: 'number',
            name: 'actor_lr',
            message: 'Actor learning rate:',
            default: 0.0001,
        },
        {
            type: 'number',
            name: 'critic_lr',
            message: 'Critic learning rate:',
            default: 0.001,
        },
        {
            type: 'number',
            name: 'discount_factor',
            message: 'Discount factor (gamma):',
            default: 0.99,
        },
        {
            type: 'number',
            name: 'gae_lambda',
            message: 'GAE lambda (generalized advantage estimation):',
            default: 0.95,
        },
    ]);
}
async function configureCustom() {
    return await inquirer.prompt([
        {
            type: 'input',
            name: 'custom_config',
            message: 'Enter custom configuration (JSON):',
            default: '{}',
            validate: (input) => {
                try {
                    const parsed = JSON.parse(input);
                    // SECURITY FIX: Prevent prototype pollution
                    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
                    const hasDangerousKey = (obj) => {
                        if (typeof obj !== 'object' || obj === null)
                            return false;
                        for (const key of Object.keys(obj)) {
                            if (dangerousKeys.includes(key))
                                return true;
                            if (hasDangerousKey(obj[key]))
                                return true;
                        }
                        return false;
                    };
                    if (hasDangerousKey(parsed)) {
                        return 'Invalid configuration keys detected (security risk)';
                    }
                    // SECURITY FIX: Limit payload size to prevent DoS
                    const jsonStr = JSON.stringify(parsed);
                    if (jsonStr.length > 10000) {
                        return 'Configuration too large (max 10KB)';
                    }
                    // Validate against safe schema
                    const validKeys = [
                        'learning_rate', 'discount_factor', 'epsilon_start', 'epsilon_end',
                        'epsilon_decay', 'batch_size', 'hidden_size', 'state_dim', 'action_dim',
                        'actor_lr', 'critic_lr', 'gae_lambda', 'lambda'
                    ];
                    for (const key of Object.keys(parsed)) {
                        if (!validKeys.includes(key)) {
                            return `Unknown configuration key: ${key}`;
                        }
                    }
                    // Validate value types and ranges
                    for (const [key, value] of Object.entries(parsed)) {
                        if (typeof value !== 'number') {
                            return `Value for ${key} must be a number`;
                        }
                        if (!Number.isFinite(value)) {
                            return `Value for ${key} must be finite`;
                        }
                        if (value < 0) {
                            return `Value for ${key} must be non-negative`;
                        }
                    }
                    return true;
                }
                catch {
                    return 'Invalid JSON';
                }
            },
        },
    ]);
}
export async function promptReward() {
    const { type } = await inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Reward function:',
            choices: [
                { name: 'Success-based (1 for success, -1 for failure)', value: 'success_based' },
                { name: 'Time-aware (penalize long execution)', value: 'time_aware' },
                { name: 'Token-aware (penalize high token usage)', value: 'token_aware' },
                // SECURITY FIX: Removed 'custom' option to prevent arbitrary code execution
                // Custom reward functions using new Function() pose a critical security risk
            ],
        },
    ]);
    let config = { type };
    // SECURITY: Custom function support removed
    // If custom reward logic is needed in the future, implement via:
    // 1. Safe expression language (mathjs)
    // 2. Sandboxed VM (vm2/isolated-vm)
    // 3. AST-based code generation
    // Never use new Function() or eval() with user input
    return config;
}
export async function promptStorage(pluginName) {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'path',
            message: 'Database path:',
            default: `./.rl/${pluginName}.db`,
        },
        {
            type: 'confirm',
            name: 'hnsw_enabled',
            message: 'Enable HNSW index for fast similarity search?',
            default: true,
        },
    ]);
    const config = {
        backend: 'agentdb',
        path: answers.path,
    };
    if (answers.hnsw_enabled) {
        const hnsw = await inquirer.prompt([
            {
                type: 'number',
                name: 'M',
                message: 'HNSW M parameter (connections per node):',
                default: 16,
            },
            {
                type: 'number',
                name: 'efConstruction',
                message: 'HNSW efConstruction (build quality):',
                default: 200,
            },
        ]);
        config.hnsw = {
            enabled: true,
            ...hnsw,
        };
    }
    const { quantization } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'quantization',
            message: 'Enable vector quantization (reduces storage)?',
            default: false,
        },
    ]);
    if (quantization) {
        config.quantization = {
            enabled: true,
            bits: 8,
        };
    }
    return config;
}
export async function promptTraining(algorithmType) {
    const isOnline = algorithmType === 'sarsa';
    const answers = await inquirer.prompt([
        {
            type: 'number',
            name: 'batch_size',
            message: 'Batch size:',
            default: 32,
            when: !isOnline,
        },
        {
            type: 'number',
            name: 'epochs',
            message: 'Training epochs:',
            default: 10,
            when: !isOnline,
        },
        {
            type: 'number',
            name: 'min_experiences',
            message: 'Minimum experiences before training:',
            default: 100,
        },
        {
            type: 'number',
            name: 'train_every',
            message: 'Train every N experiences:',
            default: 100,
            when: !isOnline,
        },
        {
            type: 'number',
            name: 'validation_split',
            message: 'Validation split (0-1):',
            default: 0.2,
            when: !isOnline,
        },
    ]);
    return {
        ...answers,
        online: isOnline,
    };
}
export async function promptMonitoring() {
    const { enable } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'enable',
            message: 'Enable monitoring and metrics tracking?',
            default: true,
        },
    ]);
    if (!enable) {
        return undefined;
    }
    const answers = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'track_metrics',
            message: 'Select metrics to track:',
            choices: [
                { name: 'Success rate', value: 'success_rate', checked: true },
                { name: 'Average reward', value: 'avg_reward', checked: true },
                { name: 'Epsilon (exploration)', value: 'epsilon', checked: true },
                { name: 'Loss', value: 'loss', checked: true },
                { name: 'Q-values', value: 'q_values', checked: false },
                { name: 'Episode length', value: 'episode_length', checked: false },
            ],
        },
        {
            type: 'number',
            name: 'log_interval',
            message: 'Log metrics every N episodes:',
            default: 10,
        },
        {
            type: 'confirm',
            name: 'save_checkpoints',
            message: 'Save checkpoints during training?',
            default: true,
        },
    ]);
    return answers;
}
