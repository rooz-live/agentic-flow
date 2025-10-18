/**
 * Template library for common learning algorithms
 */

export interface Template {
  name: string;
  description: string;
  algorithm: string;
  useCase: string;
  config: any;
}

const templates: Template[] = [
  {
    name: 'decision-transformer',
    description: 'Sequence modeling approach to RL (recommended)',
    algorithm: 'decision_transformer',
    useCase: 'Sequential decision-making tasks',
    config: {
      algorithm: {
        type: 'decision_transformer',
        base: 'decision_transformer',
        state_dim: 768,
        action_dim: 768,
        hidden_size: 256,
        learning_rate: 0.001,
        action_selection: '3_tier',
      },
      reward: {
        type: 'success_based',
      },
      storage: {
        backend: 'agentdb',
        hnsw: {
          enabled: true,
          M: 16,
          efConstruction: 200,
        },
      },
      training: {
        batch_size: 32,
        epochs: 10,
        min_experiences: 100,
        train_every: 100,
        validation_split: 0.2,
      },
    },
  },
  {
    name: 'q-learning',
    description: 'Model-free value-based learning',
    algorithm: 'q_learning',
    useCase: 'Discrete action spaces with experience replay',
    config: {
      algorithm: {
        type: 'q_learning',
        base: 'q_learning',
        learning_rate: 0.001,
        discount_factor: 0.99,
        epsilon_start: 1.0,
        epsilon_end: 0.01,
        epsilon_decay: 0.995,
        experience_replay_type: 'uniform',
      },
      reward: {
        type: 'success_based',
      },
      storage: {
        backend: 'agentdb',
        hnsw: {
          enabled: true,
          M: 16,
          efConstruction: 200,
        },
      },
      training: {
        batch_size: 32,
        min_experiences: 100,
        train_every: 4,
      },
    },
  },
  {
    name: 'sarsa',
    description: 'On-policy variant of Q-learning',
    algorithm: 'sarsa',
    useCase: 'On-policy learning with eligibility traces',
    config: {
      algorithm: {
        type: 'sarsa',
        base: 'sarsa',
        learning_rate: 0.001,
        discount_factor: 0.99,
        epsilon: 0.1,
        lambda: 0.9,
      },
      reward: {
        type: 'success_based',
      },
      storage: {
        backend: 'agentdb',
      },
      training: {
        online: true,
        min_experiences: 100,
      },
    },
  },
  {
    name: 'actor-critic',
    description: 'Policy gradient with value function baseline',
    algorithm: 'actor_critic',
    useCase: 'Continuous action spaces',
    config: {
      algorithm: {
        type: 'actor_critic',
        base: 'actor_critic',
        actor_lr: 0.0001,
        critic_lr: 0.001,
        discount_factor: 0.99,
        gae_lambda: 0.95,
      },
      reward: {
        type: 'success_based',
      },
      storage: {
        backend: 'agentdb',
      },
      training: {
        batch_size: 32,
        min_experiences: 100,
      },
    },
  },
  {
    name: 'curiosity-driven',
    description: 'Intrinsic motivation for exploration',
    algorithm: 'decision_transformer',
    useCase: 'Sparse reward environments',
    config: {
      algorithm: {
        type: 'decision_transformer',
        base: 'decision_transformer',
        state_dim: 768,
        action_dim: 768,
        hidden_size: 256,
        learning_rate: 0.001,
      },
      reward: {
        type: 'custom',
        function: `function computeReward(outcome, context) {
  const extrinsic = outcome.success ? 1.0 : -1.0;
  const intrinsic = 0.1; // Curiosity bonus
  return extrinsic + intrinsic;
}`,
      },
      storage: {
        backend: 'agentdb',
        hnsw: {
          enabled: true,
          M: 16,
          efConstruction: 200,
        },
      },
      training: {
        batch_size: 32,
        epochs: 10,
        min_experiences: 100,
      },
    },
  },
];

export async function getAvailableTemplates(): Promise<Template[]> {
  return templates;
}

export async function getTemplateConfig(name: string): Promise<any> {
  const template = templates.find((t) => t.name === name);
  if (!template) {
    throw new Error(`Template "${name}" not found`);
  }
  return template.config;
}

export async function getTemplate(name: string): Promise<Template | undefined> {
  return templates.find((t) => t.name === name);
}
