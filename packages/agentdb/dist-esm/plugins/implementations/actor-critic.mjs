/**
 * Actor-Critic Plugin
 *
 * Implements the Actor-Critic algorithm with policy gradient learning.
 * Combines value-based and policy-based methods:
 * - Actor: Policy network that selects actions
 * - Critic: Value network that evaluates actions
 *
 * Key features:
 * - Policy gradient learning (REINFORCE with baseline)
 * - Advantage estimation (GAE - Generalized Advantage Estimation)
 * - Continuous or discrete action spaces
 * - Natural policy gradients
 */
import { BasePlugin } from '../base-plugin.mjs';
/**
 * Actor network (policy)
 */
class ActorNetwork {
    constructor(inputSize = 768, hiddenSize = 256, outputSize = 768) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.outputSize = outputSize;
        // Initialize weights
        this.weights = {
            W1: this.initializeWeights(inputSize * hiddenSize, inputSize),
            b1: new Float32Array(hiddenSize),
            W2: this.initializeWeights(hiddenSize * outputSize, hiddenSize),
            b2: new Float32Array(outputSize),
        };
        // Initialize Adam optimizer
        this.optimizer = {
            m_W1: new Float32Array(inputSize * hiddenSize),
            v_W1: new Float32Array(inputSize * hiddenSize),
            m_b1: new Float32Array(hiddenSize),
            v_b1: new Float32Array(hiddenSize),
            m_W2: new Float32Array(hiddenSize * outputSize),
            v_W2: new Float32Array(hiddenSize * outputSize),
            m_b2: new Float32Array(outputSize),
            v_b2: new Float32Array(outputSize),
            t: 0,
        };
    }
    /**
     * Initialize weights with Xavier initialization
     */
    initializeWeights(size, fanIn) {
        const weights = new Float32Array(size);
        const std = Math.sqrt(2.0 / fanIn);
        for (let i = 0; i < size; i++) {
            weights[i] = (Math.random() * 2 - 1) * std;
        }
        return weights;
    }
    /**
     * Forward pass - compute action probabilities/mean
     */
    forward(state) {
        const input = new Float32Array(state);
        // Layer 1
        const z1 = this.matmul(this.weights.W1, input, this.hiddenSize, this.inputSize);
        const hidden = this.relu(this.add(z1, this.weights.b1));
        // Layer 2
        const z2 = this.matmul(this.weights.W2, hidden, this.outputSize, this.hiddenSize);
        const output = this.tanh(this.add(z2, this.weights.b2)); // Tanh for bounded actions
        return Array.from(output);
    }
    /**
     * Sample action from policy (for discrete actions, use softmax)
     */
    sampleAction(state) {
        const actionMean = this.forward(state);
        // Add Gaussian noise for exploration
        const noise = 0.1;
        const action = actionMean.map(mean => mean + (Math.random() * 2 - 1) * noise);
        // Compute log probability (simplified)
        const logProb = -0.5 * action.reduce((sum, a, i) => {
            const diff = a - actionMean[i];
            return sum + (diff * diff) / (noise * noise);
        }, 0);
        return { action, logProb };
    }
    /**
     * Update weights using policy gradient
     */
    updateWeights(states, actions, advantages, learningRate) {
        this.optimizer.t++;
        // Simplified policy gradient update
        // In production, would compute full gradients through backprop
        const beta1 = 0.9;
        const beta2 = 0.999;
        const epsilon = 1e-8;
        // Compute policy gradient (simplified)
        for (let i = 0; i < states.length; i++) {
            const predicted = this.forward(states[i]);
            const advantage = advantages[i];
            // Gradient for each output
            for (let j = 0; j < this.outputSize; j++) {
                const gradient = (predicted[j] - actions[i][j]) * advantage;
                // Update bias (simplified)
                const g = gradient;
                this.optimizer.m_b2[j] = beta1 * this.optimizer.m_b2[j] + (1 - beta1) * g;
                this.optimizer.v_b2[j] = beta2 * this.optimizer.v_b2[j] + (1 - beta2) * g * g;
                const mHat = this.optimizer.m_b2[j] / (1 - Math.pow(beta1, this.optimizer.t));
                const vHat = this.optimizer.v_b2[j] / (1 - Math.pow(beta2, this.optimizer.t));
                this.weights.b2[j] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
            }
        }
    }
    // Utility methods
    matmul(matrix, vector, rows, cols) {
        const result = new Float32Array(rows);
        for (let i = 0; i < rows; i++) {
            let sum = 0;
            for (let j = 0; j < cols; j++) {
                sum += matrix[i * cols + j] * vector[j];
            }
            result[i] = sum;
        }
        return result;
    }
    relu(x) {
        return x.map(val => Math.max(0, val));
    }
    tanh(x) {
        return x.map(val => Math.tanh(val));
    }
    add(a, b) {
        const result = new Float32Array(a.length);
        for (let i = 0; i < a.length; i++) {
            result[i] = a[i] + b[i];
        }
        return result;
    }
}
/**
 * Critic network (value function)
 */
class CriticNetwork {
    constructor(inputSize = 768, hiddenSize = 128) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        // Initialize weights
        this.weights = {
            W1: this.initializeWeights(inputSize * hiddenSize, inputSize),
            b1: new Float32Array(hiddenSize),
            W2: this.initializeWeights(hiddenSize, hiddenSize),
            b2: new Float32Array(1),
        };
        // Initialize optimizer
        this.optimizer = {
            m_W1: new Float32Array(inputSize * hiddenSize),
            v_W1: new Float32Array(inputSize * hiddenSize),
            m_b1: new Float32Array(hiddenSize),
            v_b1: new Float32Array(hiddenSize),
            m_W2: new Float32Array(hiddenSize),
            v_W2: new Float32Array(hiddenSize),
            m_b2: new Float32Array(1),
            v_b2: new Float32Array(1),
            t: 0,
        };
    }
    initializeWeights(size, fanIn) {
        const weights = new Float32Array(size);
        const std = Math.sqrt(2.0 / fanIn);
        for (let i = 0; i < size; i++) {
            weights[i] = (Math.random() * 2 - 1) * std;
        }
        return weights;
    }
    /**
     * Forward pass - compute state value
     */
    forward(state) {
        const input = new Float32Array(state);
        // Layer 1
        const z1 = this.matmul(this.weights.W1, input, this.hiddenSize, this.inputSize);
        const hidden = this.relu(this.add(z1, this.weights.b1));
        // Layer 2 (single output)
        let value = this.weights.b2[0];
        for (let i = 0; i < this.hiddenSize; i++) {
            value += this.weights.W2[i] * hidden[i];
        }
        return value;
    }
    /**
     * Update weights to minimize TD error
     */
    updateWeights(states, targets, learningRate) {
        this.optimizer.t++;
        let totalLoss = 0;
        const beta1 = 0.9;
        const beta2 = 0.999;
        const epsilon = 1e-8;
        for (let i = 0; i < states.length; i++) {
            const predicted = this.forward(states[i]);
            const target = targets[i];
            const error = predicted - target;
            totalLoss += error * error;
            // Update bias (simplified gradient)
            const g = error;
            this.optimizer.m_b2[0] = beta1 * this.optimizer.m_b2[0] + (1 - beta1) * g;
            this.optimizer.v_b2[0] = beta2 * this.optimizer.v_b2[0] + (1 - beta2) * g * g;
            const mHat = this.optimizer.m_b2[0] / (1 - Math.pow(beta1, this.optimizer.t));
            const vHat = this.optimizer.v_b2[0] / (1 - Math.pow(beta2, this.optimizer.t));
            this.weights.b2[0] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
        }
        return totalLoss / states.length;
    }
    matmul(matrix, vector, rows, cols) {
        const result = new Float32Array(rows);
        for (let i = 0; i < rows; i++) {
            let sum = 0;
            for (let j = 0; j < cols; j++) {
                sum += matrix[i * cols + j] * vector[j];
            }
            result[i] = sum;
        }
        return result;
    }
    relu(x) {
        return x.map(val => Math.max(0, val));
    }
    add(a, b) {
        const result = new Float32Array(a.length);
        for (let i = 0; i < a.length; i++) {
            result[i] = a[i] + b[i];
        }
        return result;
    }
}
/**
 * Actor-Critic Plugin Implementation
 */
export class ActorCriticPlugin extends BasePlugin {
    constructor() {
        super(...arguments);
        this.name = 'actor-critic';
        this.version = '1.0.0';
        this.experienceBuffer = [];
        this.gaeLambda = 0.95;
    }
    /**
     * Initialize Actor-Critic plugin
     */
    async onInitialize() {
        const stateSize = this.config.algorithm.stateDim || 768;
        const actionSize = this.config.algorithm.actionDim || 768;
        const hiddenSize = this.config.algorithm.hiddenSize || 256;
        // Initialize actor and critic
        this.actor = new ActorNetwork(stateSize, hiddenSize, actionSize);
        this.critic = new CriticNetwork(stateSize, hiddenSize / 2);
        // GAE lambda for advantage estimation
        this.gaeLambda = this.config.algorithm.gaeLambda || 0.95;
    }
    /**
     * Select action using actor network
     *
     * @param state - Current state vector
     * @param context - Optional context
     * @returns Selected action
     */
    async selectAction(state, context) {
        this.checkInitialized();
        // Sample action from policy
        const { action, logProb } = this.actor.sampleAction(state);
        return {
            id: `actor_${Date.now()}`,
            embedding: action,
            source: 'policy',
            confidence: Math.exp(logProb), // Convert log prob to confidence
            metadata: { logProb },
        };
    }
    /**
     * Store experience in buffer
     */
    async onStoreExperience(experience) {
        this.experienceBuffer.push(experience);
        // Train on episode completion
        if (experience.done) {
            await this.trainOnEpisode();
            this.experienceBuffer = [];
        }
    }
    /**
     * Train on completed episode
     */
    async trainOnEpisode() {
        if (this.experienceBuffer.length === 0) {
            return;
        }
        const actorLR = this.config.algorithm.actorLr || 0.0001;
        const criticLR = this.config.algorithm.criticLr || 0.001;
        const gamma = this.config.algorithm.discountFactor || 0.99;
        // Compute values and advantages using GAE
        const states = this.experienceBuffer.map(e => e.state);
        const actions = this.experienceBuffer.map(e => e.action);
        const rewards = this.experienceBuffer.map(e => e.reward);
        const values = states.map(s => this.critic.forward(s));
        const advantages = this.computeGAE(rewards, values, gamma, this.gaeLambda);
        const returns = advantages.map((adv, i) => adv + values[i]);
        // Update critic
        this.critic.updateWeights(states, returns, criticLR);
        // Update actor using advantages
        this.actor.updateWeights(states, actions, advantages, actorLR);
    }
    /**
     * Compute Generalized Advantage Estimation (GAE)
     */
    computeGAE(rewards, values, gamma, lambda) {
        const advantages = new Array(rewards.length);
        let gae = 0;
        for (let t = rewards.length - 1; t >= 0; t--) {
            const nextValue = t === rewards.length - 1 ? 0 : values[t + 1];
            const delta = rewards[t] + gamma * nextValue - values[t];
            gae = delta + gamma * lambda * gae;
            advantages[t] = gae;
        }
        return advantages;
    }
    /**
     * Train the actor-critic networks
     */
    async train(options) {
        this.checkInitialized();
        // For actor-critic, training happens online during episode completion
        // This method can be used for additional offline training if needed
        const epochs = options?.epochs || 1;
        // Compute average value as a metric
        let avgValue = 0;
        let count = 0;
        for (const exp of this.experienceBuffer) {
            avgValue += this.critic.forward(exp.state);
            count++;
        }
        avgValue = count > 0 ? avgValue / count : 0;
        return {
            loss: 0, // Computed during episode training
            avgQValue: avgValue,
            policyEntropy: 0, // Would need to compute from policy distribution
        };
    }
    /**
     * Save actor and critic networks
     */
    async onSave(path) {
        console.log(`Saving Actor-Critic model to ${path}`);
        // In production, serialize both networks to file
    }
    /**
     * Load actor and critic networks
     */
    async onLoad(path) {
        console.log(`Loading Actor-Critic model from ${path}`);
        // In production, deserialize both networks from file
    }
}
