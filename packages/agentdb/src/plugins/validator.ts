/**
 * Plugin Configuration Validator
 *
 * This module provides validation utilities for plugin configurations,
 * ensuring they meet required schemas and constraints.
 *
 * @module plugins/validator
 */

import { PluginConfig } from './interface';

/**
 * Validation error details
 */
export interface ValidationError {
  /** Field path (e.g., 'algorithm.learningRate') */
  field: string;
  /** Error message */
  message: string;
  /** Current value */
  value?: any;
  /** Expected value or constraint */
  expected?: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of validation errors */
  errors: ValidationError[];
  /** Warnings (non-fatal issues) */
  warnings?: ValidationError[];
}

/**
 * Plugin name regex (kebab-case)
 */
const PLUGIN_NAME_REGEX = /^[a-z0-9-]+$/;

/**
 * Semantic version regex
 */
const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Validate plugin configuration
 *
 * @param config - Plugin configuration to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * const result = validatePluginConfig(config);
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validatePluginConfig(config: Partial<PluginConfig>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // ============ Required Fields ============

  if (!config.name) {
    errors.push({
      field: 'name',
      message: 'Plugin name is required',
      value: config.name
    });
  } else if (!PLUGIN_NAME_REGEX.test(config.name)) {
    errors.push({
      field: 'name',
      message: 'Plugin name must be kebab-case (lowercase letters, numbers, and hyphens)',
      value: config.name,
      expected: 'e.g., my-plugin-name'
    });
  } else if (config.name.length < 3 || config.name.length > 50) {
    errors.push({
      field: 'name',
      message: 'Plugin name must be between 3 and 50 characters',
      value: config.name,
      expected: '3-50 characters'
    });
  }

  if (!config.version) {
    errors.push({
      field: 'version',
      message: 'Plugin version is required',
      value: config.version
    });
  } else if (!VERSION_REGEX.test(config.version)) {
    errors.push({
      field: 'version',
      message: 'Plugin version must follow semantic versioning (X.Y.Z)',
      value: config.version,
      expected: 'e.g., 1.0.0'
    });
  }

  if (!config.description) {
    errors.push({
      field: 'description',
      message: 'Plugin description is required',
      value: config.description
    });
  } else if (config.description.length < 10 || config.description.length > 200) {
    errors.push({
      field: 'description',
      message: 'Description must be between 10 and 200 characters',
      value: config.description,
      expected: '10-200 characters'
    });
  }

  if (!config.baseAlgorithm) {
    errors.push({
      field: 'baseAlgorithm',
      message: 'Base algorithm is required',
      value: config.baseAlgorithm
    });
  } else {
    const validAlgorithms = ['decision_transformer', 'q_learning', 'sarsa', 'actor_critic', 'custom'];
    if (!validAlgorithms.includes(config.baseAlgorithm)) {
      errors.push({
        field: 'baseAlgorithm',
        message: 'Invalid base algorithm',
        value: config.baseAlgorithm,
        expected: validAlgorithms.join(', ')
      });
    }
  }

  // ============ Algorithm Configuration ============

  if (!config.algorithm) {
    errors.push({
      field: 'algorithm',
      message: 'Algorithm configuration is required',
      value: config.algorithm
    });
  } else {
    if (!config.algorithm.type) {
      errors.push({
        field: 'algorithm.type',
        message: 'Algorithm type is required',
        value: config.algorithm.type
      });
    }

    if (config.algorithm.learningRate !== undefined) {
      if (config.algorithm.learningRate <= 0 || config.algorithm.learningRate > 1) {
        errors.push({
          field: 'algorithm.learningRate',
          message: 'Learning rate must be between 0 and 1',
          value: config.algorithm.learningRate,
          expected: '0 < learningRate <= 1'
        });
      }
    }

    if (config.algorithm.discountFactor !== undefined) {
      if (config.algorithm.discountFactor < 0 || config.algorithm.discountFactor > 1) {
        errors.push({
          field: 'algorithm.discountFactor',
          message: 'Discount factor must be between 0 and 1',
          value: config.algorithm.discountFactor,
          expected: '0 <= discountFactor <= 1'
        });
      }
    }
  }

  // ============ State Configuration ============

  if (config.state) {
    if (!config.state.dimension || config.state.dimension <= 0) {
      errors.push({
        field: 'state.dimension',
        message: 'State dimension must be a positive integer',
        value: config.state.dimension,
        expected: 'dimension > 0'
      });
    }
  }

  // ============ Action Configuration ============

  if (config.action) {
    if (!config.action.type) {
      errors.push({
        field: 'action.type',
        message: 'Action type is required',
        value: config.action.type
      });
    } else if (!['discrete', 'continuous'].includes(config.action.type)) {
      errors.push({
        field: 'action.type',
        message: 'Action type must be discrete or continuous',
        value: config.action.type,
        expected: 'discrete, continuous'
      });
    }

    if (config.action.type === 'discrete' && !config.action.spaceSize) {
      errors.push({
        field: 'action.spaceSize',
        message: 'Space size is required for discrete actions',
        value: config.action.spaceSize
      });
    }

    if (config.action.type === 'continuous' && !config.action.spaceBounds) {
      warnings.push({
        field: 'action.spaceBounds',
        message: 'Space bounds recommended for continuous actions',
        value: config.action.spaceBounds
      });
    }

    if (!config.action.selectionStrategy) {
      errors.push({
        field: 'action.selectionStrategy',
        message: 'Action selection strategy is required',
        value: config.action.selectionStrategy
      });
    }
  }

  // ============ Reward Configuration ============

  if (config.reward) {
    const validRewardTypes = ['success_based', 'time_aware', 'token_aware', 'custom'];
    if (!validRewardTypes.includes(config.reward.type)) {
      errors.push({
        field: 'reward.type',
        message: 'Invalid reward type',
        value: config.reward.type,
        expected: validRewardTypes.join(', ')
      });
    }

    if (config.reward.type === 'custom' && !config.reward.function) {
      errors.push({
        field: 'reward.function',
        message: 'Custom reward function is required when type is custom',
        value: config.reward.function
      });
    }
  }

  // ============ Experience Replay Configuration ============

  if (config.experienceReplay) {
    const validReplayTypes = ['none', 'uniform', 'prioritized'];
    if (!validReplayTypes.includes(config.experienceReplay.type)) {
      errors.push({
        field: 'experienceReplay.type',
        message: 'Invalid experience replay type',
        value: config.experienceReplay.type,
        expected: validReplayTypes.join(', ')
      });
    }

    if (config.experienceReplay.type !== 'none') {
      if (!config.experienceReplay.capacity || config.experienceReplay.capacity <= 0) {
        errors.push({
          field: 'experienceReplay.capacity',
          message: 'Replay capacity must be a positive integer',
          value: config.experienceReplay.capacity,
          expected: 'capacity > 0'
        });
      }
    }

    if (config.experienceReplay.type === 'prioritized') {
      if (config.experienceReplay.alpha !== undefined) {
        if (config.experienceReplay.alpha < 0 || config.experienceReplay.alpha > 1) {
          errors.push({
            field: 'experienceReplay.alpha',
            message: 'Priority alpha must be between 0 and 1',
            value: config.experienceReplay.alpha,
            expected: '0 <= alpha <= 1'
          });
        }
      }

      if (config.experienceReplay.beta !== undefined) {
        if (config.experienceReplay.beta < 0 || config.experienceReplay.beta > 1) {
          errors.push({
            field: 'experienceReplay.beta',
            message: 'Priority beta must be between 0 and 1',
            value: config.experienceReplay.beta,
            expected: '0 <= beta <= 1'
          });
        }
      }
    }
  }

  // ============ Storage Configuration ============

  if (!config.storage) {
    errors.push({
      field: 'storage',
      message: 'Storage configuration is required',
      value: config.storage
    });
  } else {
    if (!config.storage.backend) {
      errors.push({
        field: 'storage.backend',
        message: 'Storage backend is required',
        value: config.storage.backend
      });
    } else if (config.storage.backend !== 'agentdb') {
      errors.push({
        field: 'storage.backend',
        message: 'Only agentdb backend is supported',
        value: config.storage.backend,
        expected: 'agentdb'
      });
    }

    if (!config.storage.path) {
      errors.push({
        field: 'storage.path',
        message: 'Storage path is required',
        value: config.storage.path
      });
    }

    if (config.storage.hnsw) {
      if (config.storage.hnsw.M && (config.storage.hnsw.M < 2 || config.storage.hnsw.M > 100)) {
        warnings.push({
          field: 'storage.hnsw.M',
          message: 'HNSW M parameter typically between 2 and 100',
          value: config.storage.hnsw.M,
          expected: '2 <= M <= 100'
        });
      }

      if (config.storage.hnsw.efConstruction && config.storage.hnsw.efConstruction < 10) {
        warnings.push({
          field: 'storage.hnsw.efConstruction',
          message: 'HNSW efConstruction should be at least 10 for good quality',
          value: config.storage.hnsw.efConstruction,
          expected: 'efConstruction >= 10'
        });
      }
    }

    if (config.storage.quantization?.enabled && config.storage.quantization.bits) {
      if (![8, 16].includes(config.storage.quantization.bits)) {
        errors.push({
          field: 'storage.quantization.bits',
          message: 'Quantization bits must be 8 or 16',
          value: config.storage.quantization.bits,
          expected: '8, 16'
        });
      }
    }
  }

  // ============ Training Configuration ============

  if (!config.training) {
    errors.push({
      field: 'training',
      message: 'Training configuration is required',
      value: config.training
    });
  } else {
    if (!config.training.batchSize || config.training.batchSize < 1) {
      errors.push({
        field: 'training.batchSize',
        message: 'Batch size must be at least 1',
        value: config.training.batchSize,
        expected: 'batchSize >= 1'
      });
    } else if (config.training.batchSize > 1024) {
      warnings.push({
        field: 'training.batchSize',
        message: 'Large batch size may cause memory issues',
        value: config.training.batchSize,
        expected: 'batchSize <= 1024 recommended'
      });
    }

    if (config.training.epochs && config.training.epochs < 1) {
      errors.push({
        field: 'training.epochs',
        message: 'Epochs must be at least 1',
        value: config.training.epochs,
        expected: 'epochs >= 1'
      });
    }

    if (config.training.validationSplit !== undefined) {
      if (config.training.validationSplit < 0 || config.training.validationSplit >= 1) {
        errors.push({
          field: 'training.validationSplit',
          message: 'Validation split must be between 0 and 1',
          value: config.training.validationSplit,
          expected: '0 <= validationSplit < 1'
        });
      }
    }

    if (!config.training.minExperiences || config.training.minExperiences < 1) {
      errors.push({
        field: 'training.minExperiences',
        message: 'Minimum experiences must be at least 1',
        value: config.training.minExperiences,
        expected: 'minExperiences >= 1'
      });
    }

    if (config.training.trainEvery && config.training.trainEvery < 1) {
      errors.push({
        field: 'training.trainEvery',
        message: 'Train every must be at least 1',
        value: config.training.trainEvery,
        expected: 'trainEvery >= 1'
      });
    }
  }

  // ============ Monitoring Configuration ============

  if (config.monitoring) {
    if (!config.monitoring.trackMetrics || config.monitoring.trackMetrics.length === 0) {
      warnings.push({
        field: 'monitoring.trackMetrics',
        message: 'No metrics are being tracked',
        value: config.monitoring.trackMetrics
      });
    }

    if (config.monitoring.logInterval && config.monitoring.logInterval < 1) {
      errors.push({
        field: 'monitoring.logInterval',
        message: 'Log interval must be at least 1',
        value: config.monitoring.logInterval,
        expected: 'logInterval >= 1'
      });
    }

    if (config.monitoring.saveCheckpoints && !config.monitoring.checkpointInterval) {
      warnings.push({
        field: 'monitoring.checkpointInterval',
        message: 'Checkpoint interval not set, will checkpoint every episode',
        value: config.monitoring.checkpointInterval
      });
    }
  }

  // ============ Extensions Configuration ============

  if (config.extensions) {
    config.extensions.forEach((ext, index) => {
      if (!ext.name) {
        errors.push({
          field: `extensions[${index}].name`,
          message: 'Extension name is required',
          value: ext.name
        });
      }

      if (ext.enabled === undefined) {
        warnings.push({
          field: `extensions[${index}].enabled`,
          message: 'Extension enabled flag not set, defaulting to false',
          value: ext.enabled
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate required configuration fields only
 *
 * @param config - Partial plugin configuration
 * @returns Whether required fields are present
 */
export function validateRequired(config: Partial<PluginConfig>): boolean {
  return !!(
    config.name &&
    config.version &&
    config.description &&
    config.baseAlgorithm &&
    config.algorithm &&
    config.storage &&
    config.training
  );
}

/**
 * Get validation error summary
 *
 * @param result - Validation result
 * @returns Human-readable error summary
 */
export function getErrorSummary(result: ValidationResult): string {
  if (result.valid) {
    return 'Configuration is valid';
  }

  const errorList = result.errors.map(err =>
    `  - ${err.field}: ${err.message}${err.expected ? ` (expected: ${err.expected})` : ''}`
  ).join('\n');

  let summary = `Found ${result.errors.length} validation error(s):\n${errorList}`;

  if (result.warnings && result.warnings.length > 0) {
    const warningList = result.warnings.map(warn =>
      `  - ${warn.field}: ${warn.message}`
    ).join('\n');

    summary += `\n\nWarnings (${result.warnings.length}):\n${warningList}`;
  }

  return summary;
}
