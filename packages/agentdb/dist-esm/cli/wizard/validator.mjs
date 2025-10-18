/**
 * Configuration validation
 */
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });
// JSON Schema for plugin configuration
const pluginConfigSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Learning Plugin Configuration',
    type: 'object',
    required: ['name', 'version', 'description', 'algorithm', 'storage', 'training'],
    properties: {
        name: {
            type: 'string',
            pattern: '^[a-z0-9-]+$',
            minLength: 3,
            maxLength: 50,
        },
        version: {
            type: 'string',
            pattern: '^\\d+\\.\\d+\\.\\d+$',
        },
        author: {
            type: 'string',
        },
        description: {
            type: 'string',
            minLength: 10,
            maxLength: 500,
        },
        algorithm: {
            type: 'object',
            required: ['type', 'base'],
            properties: {
                type: {
                    type: 'string',
                },
                base: {
                    type: 'string',
                    enum: ['decision_transformer', 'q_learning', 'sarsa', 'actor_critic', 'custom'],
                },
                learning_rate: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                },
                discount_factor: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                },
            },
        },
        reward: {
            type: 'object',
            required: ['type'],
            properties: {
                type: {
                    type: 'string',
                    // SECURITY FIX: Removed 'custom' to prevent code injection
                    enum: ['success_based', 'time_aware', 'token_aware'],
                },
                // SECURITY: function field removed
            },
        },
        storage: {
            type: 'object',
            required: ['backend', 'path'],
            properties: {
                backend: {
                    type: 'string',
                    enum: ['agentdb'],
                },
                path: {
                    type: 'string',
                },
                hnsw: {
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean' },
                        M: { type: 'number', minimum: 2, maximum: 100 },
                        efConstruction: { type: 'number', minimum: 10, maximum: 1000 },
                    },
                },
                quantization: {
                    type: 'object',
                    properties: {
                        enabled: { type: 'boolean' },
                        bits: { type: 'number', enum: [8, 16] },
                    },
                },
            },
        },
        training: {
            type: 'object',
            required: ['min_experiences'],
            properties: {
                batch_size: {
                    type: 'number',
                    minimum: 1,
                    maximum: 1024,
                },
                epochs: {
                    type: 'number',
                    minimum: 1,
                    maximum: 1000,
                },
                min_experiences: {
                    type: 'number',
                    minimum: 10,
                },
                train_every: {
                    type: 'number',
                    minimum: 1,
                },
                validation_split: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                },
                online: {
                    type: 'boolean',
                },
            },
        },
        monitoring: {
            type: 'object',
            properties: {
                track_metrics: {
                    type: 'array',
                    items: { type: 'string' },
                },
                log_interval: {
                    type: 'number',
                    minimum: 1,
                },
                save_checkpoints: {
                    type: 'boolean',
                },
                checkpoint_interval: {
                    type: 'number',
                    minimum: 1,
                },
            },
        },
    },
};
const validate = ajv.compile(pluginConfigSchema);
export function validateConfig(config) {
    const valid = validate(config);
    if (valid) {
        // Additional custom validation
        const customErrors = performCustomValidation(config);
        if (customErrors.length > 0) {
            return {
                valid: false,
                errors: customErrors,
            };
        }
        return {
            valid: true,
            errors: [],
        };
    }
    const errors = validate.errors?.map((err) => {
        return `${err.instancePath} ${err.message}`;
    }) || ['Unknown validation error'];
    return {
        valid: false,
        errors,
    };
}
function performCustomValidation(config) {
    const errors = [];
    // SECURITY FIX: Custom reward functions completely removed from type system
    // Type system now prevents 'custom' at compile time
    // This check is kept for runtime validation of external JSON configs
    // Validate algorithm-specific configuration
    if (config.algorithm.base === 'q_learning') {
        if (!config.algorithm.learning_rate) {
            errors.push('Q-Learning requires learning_rate');
        }
        if (!config.algorithm.discount_factor) {
            errors.push('Q-Learning requires discount_factor');
        }
    }
    if (config.algorithm.base === 'decision_transformer') {
        if (!config.algorithm.state_dim) {
            errors.push('Decision Transformer requires state_dim');
        }
        if (!config.algorithm.action_dim) {
            errors.push('Decision Transformer requires action_dim');
        }
    }
    // Validate training configuration
    if (!config.training.online && !config.training.batch_size) {
        errors.push('Offline training requires batch_size');
    }
    // Validate HNSW configuration
    if (config.storage.hnsw?.enabled) {
        if (config.storage.hnsw.M && (config.storage.hnsw.M < 2 || config.storage.hnsw.M > 100)) {
            errors.push('HNSW M parameter must be between 2 and 100');
        }
        if (config.storage.hnsw.efConstruction && config.storage.hnsw.efConstruction < 10) {
            errors.push('HNSW efConstruction must be at least 10');
        }
    }
    return errors;
}
export function validatePluginName(name) {
    return /^[a-z0-9-]+$/.test(name) && name.length >= 3 && name.length <= 50;
}
export function validateVersion(version) {
    return /^\d+\.\d+\.\d+$/.test(version);
}
export function validateRewardFunction(func) {
    try {
        new Function('return ' + func);
        return true;
    }
    catch {
        return false;
    }
}
