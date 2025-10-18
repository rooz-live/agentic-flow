/**
 * Q-Learning Plugin
 *
 * Implements the Q-Learning algorithm with experience replay.
 * Q-Learning is a model-free, off-policy RL algorithm that learns
 * the optimal action-value function (Q-function).
 *
 * Key features:
 * - Epsilon-greedy exploration
 * - Experience replay buffer
 * - Optional prioritized experience replay
 * - Temporal difference learning
 */
import { BasePlugin } from '../base-plugin.mjs';
/**
 * Experience replay buffer
 */
class ReplayBuffer {
    constructor(capacity) {
        this.buffer = [];
        this.position = 0;
        this.capacity = capacity;
    }
    /**
     * Add experience to buffer
     */
    add(experience) {
        if (this.buffer.length < this.capacity) {
            this.buffer.push(experience);
        }
        else {
            this.buffer[this.position] = experience;
        }
        this.position = (this.position + 1) % this.capacity;
    }
    /**
     * Sample random batch
     */
    sample(batchSize) {
        const batch = [];
        for (let i = 0; i < Math.min(batchSize, this.buffer.length); i++) {
            const index = Math.floor(Math.random() * this.buffer.length);
            batch.push(this.buffer[index]);
        }
        return batch;
    }
    /**
     * Get buffer size
     */
    size() {
        return this.buffer.length;
    }
    /**
     * Check if buffer has enough samples
     */
    hasEnough(minSize) {
        return this.buffer.length >= minSize;
    }
}
/**
 * Prioritized Experience Replay Buffer
 */
class PrioritizedReplayBuffer extends ReplayBuffer {
    constructor(capacity, alpha = 0.6, beta = 0.4, betaIncrement = 0.001) {
        super(capacity);
        this.priorities = [];
        this.alpha = alpha;
        this.beta = beta;
        this.betaIncrement = betaIncrement;
    }
    /**
     * Add experience with priority
     */
    addWithPriority(experience, priority) {
        this.add(experience);
        if (this.priorities.length < this.size()) {
            this.priorities.push(priority);
        }
        else {
            const pos = this.position - 1;
            this.priorities[pos >= 0 ? pos : this.priorities.length - 1] = priority;
        }
    }
    /**
     * Sample batch using prioritized sampling
     */
    samplePrioritized(batchSize) {
        const n = this.size();
        const batch = [];
        const indices = [];
        const weights = [];
        // Compute sampling probabilities
        const probs = this.priorities.map(p => Math.pow(p, this.alpha));
        const totalProb = probs.reduce((sum, p) => sum + p, 0);
        // Sample
        for (let i = 0; i < Math.min(batchSize, n); i++) {
            const rand = Math.random() * totalProb;
            let cumProb = 0;
            let index = 0;
            for (let j = 0; j < probs.length; j++) {
                cumProb += probs[j];
                if (rand <= cumProb) {
                    index = j;
                    break;
                }
            }
            batch.push(this.buffer[index]);
            indices.push(index);
            // Compute importance sampling weight
            const prob = probs[index] / totalProb;
            const weight = Math.pow(n * prob, -this.beta);
            weights.push(weight);
        }
        // Normalize weights
        const maxWeight = Math.max(...weights);
        const normalizedWeights = weights.map(w => w / maxWeight);
        // Anneal beta
        this.beta = Math.min(1.0, this.beta + this.betaIncrement);
        return { experiences: batch, indices, weights: normalizedWeights };
    }
    /**
     * Update priority for specific experience
     */
    updatePriority(index, priority) {
        if (index >= 0 && index < this.priorities.length) {
            this.priorities[index] = priority;
        }
    }
}
/**
 * Q-Learning Plugin Implementation
 */
export class QLearningPlugin extends BasePlugin {
    constructor() {
        super(...arguments);
        this.name = 'q-learning';
        this.version = '1.0.0';
        this.qTable = new Map();
        this.epsilon = 1.0;
        this.epsilonMin = 0.01;
        this.epsilonDecay = 0.995;
        this.usePrioritized = false;
        this.trainCounter = 0;
    }
    /**
     * Initialize Q-Learning plugin
     */
    async onInitialize() {
        // Initialize epsilon
        this.epsilon = this.config.algorithm.epsilonStart || 1.0;
        this.epsilonMin = this.config.algorithm.epsilonEnd || 0.01;
        this.epsilonDecay = this.config.algorithm.epsilonDecay || 0.995;
        // Initialize replay buffer
        const replayConfig = this.config.experienceReplay;
        if (replayConfig && replayConfig.type === 'prioritized') {
            this.usePrioritized = true;
            this.replayBuffer = new PrioritizedReplayBuffer(replayConfig.capacity, replayConfig.alpha, replayConfig.beta, replayConfig.betaIncrement);
        }
        else if (replayConfig && replayConfig.type === 'uniform') {
            this.replayBuffer = new ReplayBuffer(replayConfig.capacity);
        }
        else {
            // Default replay buffer
            this.replayBuffer = new ReplayBuffer(10000);
        }
    }
    /**
     * Select action using epsilon-greedy policy
     *
     * @param state - Current state vector
     * @param context - Optional context
     * @returns Selected action
     */
    async selectAction(state, context) {
        this.checkInitialized();
        // Epsilon-greedy exploration
        if (Math.random() < this.epsilon) {
            return this.randomAction(state);
        }
        // Exploit: Select action with highest Q-value
        return this.greedyAction(state);
    }
    /**
     * Select random action (exploration)
     */
    async randomAction(state) {
        // Find similar states to get action space
        const similar = await this.retrieveSimilar(state, 10);
        if (similar.length === 0) {
            // No similar states, return random embedding
            return {
                id: 'random',
                embedding: Array.from({ length: 768 }, () => Math.random() * 2 - 1),
                source: 'policy',
                confidence: 0,
                metadata: { exploration: true },
            };
        }
        // Random action from similar states
        const randomIdx = Math.floor(Math.random() * similar.length);
        const randomExp = similar[randomIdx];
        if (!randomExp.metadata) {
            // Fallback to random embedding
            return {
                id: 'random',
                embedding: Array.from({ length: 768 }, () => Math.random() * 2 - 1),
                source: 'policy',
                confidence: 0,
                metadata: { exploration: true },
            };
        }
        return {
            id: randomExp.id,
            embedding: randomExp.metadata.action,
            source: 'policy',
            confidence: 0,
            metadata: { exploration: true },
        };
    }
    /**
     * Select greedy action (exploitation)
     */
    async greedyAction(state) {
        const stateKey = this.hashState(state);
        // Get Q-values for this state
        const qValues = this.qTable.get(stateKey);
        if (!qValues || qValues.size === 0) {
            // No Q-values yet, explore similar states
            const similar = await this.retrieveSimilar(state, 1);
            if (similar.length > 0 && similar[0].metadata) {
                return {
                    id: similar[0].id,
                    embedding: similar[0].metadata.action,
                    source: 'policy',
                    confidence: similar[0].score,
                    metadata: { exploration: false },
                };
            }
            // Fallback to random
            return this.randomAction(state);
        }
        // Find action with maximum Q-value
        let maxQ = -Infinity;
        let bestAction = '';
        for (const [action, qValue] of qValues.entries()) {
            if (qValue > maxQ) {
                maxQ = qValue;
                bestAction = action;
            }
        }
        // Retrieve action embedding from storage
        const actionData = await this.getActionEmbedding(bestAction);
        return {
            id: bestAction,
            embedding: actionData,
            source: 'policy',
            confidence: this.normalizeQValue(maxQ),
            metadata: { exploration: false, qValue: maxQ },
        };
    }
    /**
     * Store experience and update Q-table
     */
    async onStoreExperience(experience) {
        // Add to replay buffer
        if (this.usePrioritized) {
            const tdError = this.computeTDError(experience);
            this.replayBuffer.addWithPriority(experience, Math.abs(tdError) + 1e-6);
        }
        else {
            this.replayBuffer.add(experience);
        }
        // Train periodically
        this.trainCounter++;
        const trainEvery = this.config.training.trainEvery || 100;
        if (this.trainCounter >= trainEvery && this.replayBuffer.hasEnough(this.config.training.minExperiences)) {
            await this.train({ epochs: 1, verbose: false });
            this.trainCounter = 0;
        }
    }
    /**
     * Train Q-Learning on replay buffer
     */
    async train(options) {
        this.checkInitialized();
        const epochs = options?.epochs || 1;
        const batchSize = options?.batchSize || this.config.training.batchSize;
        const learningRate = options?.learningRate || this.config.algorithm.learningRate;
        const gamma = this.config.algorithm.discountFactor;
        let totalLoss = 0;
        let avgQValue = 0;
        for (let epoch = 0; epoch < epochs; epoch++) {
            let epochLoss = 0;
            let epochQSum = 0;
            // Sample batch
            let batch;
            let weights = [];
            if (this.usePrioritized) {
                const sampled = this.replayBuffer.samplePrioritized(batchSize);
                batch = sampled.experiences;
                weights = sampled.weights;
            }
            else {
                batch = this.replayBuffer.sample(batchSize);
                weights = new Array(batch.length).fill(1.0);
            }
            // Update Q-values
            for (let i = 0; i < batch.length; i++) {
                const exp = batch[i];
                const weight = weights[i];
                const stateKey = this.hashState(exp.state);
                const actionKey = this.hashAction(exp.action);
                // Get current Q-value
                const currentQ = this.getQValue(stateKey, actionKey);
                // Compute target Q-value
                const nextStateKey = this.hashState(exp.nextState);
                const maxNextQ = exp.done ? 0 : this.getMaxQValue(nextStateKey);
                const targetQ = exp.reward + gamma * maxNextQ;
                // TD error
                const tdError = targetQ - currentQ;
                // Update Q-value
                const newQ = currentQ + learningRate * weight * tdError;
                this.setQValue(stateKey, actionKey, newQ);
                // Track metrics
                epochLoss += tdError * tdError * weight;
                epochQSum += newQ;
                // Update priority if using prioritized replay
                if (this.usePrioritized) {
                    const sampled = this.replayBuffer.samplePrioritized(batchSize);
                    this.replayBuffer.updatePriority(sampled.indices[i], Math.abs(tdError) + 1e-6);
                }
            }
            totalLoss = epochLoss / batch.length;
            avgQValue = epochQSum / batch.length;
        }
        // Decay epsilon
        this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
        return {
            loss: totalLoss,
            avgQValue,
            epsilon: this.epsilon,
        };
    }
    /**
     * Compute TD error for prioritized replay
     */
    computeTDError(experience) {
        const stateKey = this.hashState(experience.state);
        const actionKey = this.hashAction(experience.action);
        const gamma = this.config.algorithm.discountFactor;
        const currentQ = this.getQValue(stateKey, actionKey);
        const nextStateKey = this.hashState(experience.nextState);
        const maxNextQ = experience.done ? 0 : this.getMaxQValue(nextStateKey);
        const targetQ = experience.reward + gamma * maxNextQ;
        return targetQ - currentQ;
    }
    /**
     * Get Q-value for state-action pair
     */
    getQValue(stateKey, actionKey) {
        const qValues = this.qTable.get(stateKey);
        return qValues?.get(actionKey) || 0;
    }
    /**
     * Set Q-value for state-action pair
     */
    setQValue(stateKey, actionKey, value) {
        if (!this.qTable.has(stateKey)) {
            this.qTable.set(stateKey, new Map());
        }
        this.qTable.get(stateKey).set(actionKey, value);
    }
    /**
     * Get maximum Q-value for a state
     */
    getMaxQValue(stateKey) {
        const qValues = this.qTable.get(stateKey);
        if (!qValues || qValues.size === 0) {
            return 0;
        }
        return Math.max(...Array.from(qValues.values()));
    }
    /**
     * Hash state vector to string key
     */
    hashState(state) {
        // Simple hash - in production, use better hashing or clustering
        return state.slice(0, 10).map((x) => x.toFixed(2)).join(',');
    }
    /**
     * Hash action to string key
     */
    hashAction(action) {
        if (typeof action === 'string') {
            return action;
        }
        if (Array.isArray(action)) {
            return action.slice(0, 10).map((x) => x.toFixed(2)).join(',');
        }
        return String(action);
    }
    /**
     * Get action embedding from ID
     */
    async getActionEmbedding(actionId) {
        // In production, retrieve from database
        // For now, return random embedding
        return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    }
    /**
     * Normalize Q-value to 0-1 confidence
     */
    normalizeQValue(qValue) {
        return 1 / (1 + Math.exp(-qValue)); // Sigmoid
    }
    /**
     * Save Q-table
     */
    async onSave(path) {
        console.log(`Saving Q-Learning model to ${path}`);
        // In production, serialize Q-table to file
    }
    /**
     * Load Q-table
     */
    async onLoad(path) {
        console.log(`Loading Q-Learning model from ${path}`);
        // In production, deserialize Q-table from file
    }
}
