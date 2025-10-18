/**
 * ExperienceBuffer - Manages experience replay buffer with prioritization
 */
export class ExperienceBuffer {
    constructor(maxSize = 10000) {
        this.buffer = [];
        this.priorities = new Map();
        this.maxSize = maxSize;
    }
    /**
     * Add experience to buffer
     */
    add(experience) {
        this.buffer.push(experience);
        // Calculate priority based on reward and recency
        const priority = this.calculatePriority(experience);
        const actionId = experience.metadata.actionId || experience.timestamp.toString();
        this.priorities.set(actionId, priority);
        // Prune if buffer exceeds max size
        if (this.buffer.length > this.maxSize) {
            this.prune();
        }
    }
    /**
     * Sample random batch from buffer
     */
    sample(batchSize) {
        if (this.buffer.length === 0) {
            return [];
        }
        const samples = [];
        const size = Math.min(batchSize, this.buffer.length);
        for (let i = 0; i < size; i++) {
            const idx = Math.floor(Math.random() * this.buffer.length);
            samples.push(this.buffer[idx]);
        }
        return samples;
    }
    /**
     * Sample batch with prioritized experience replay
     */
    samplePrioritized(batchSize, alpha = 0.6) {
        if (this.buffer.length === 0) {
            return [];
        }
        const size = Math.min(batchSize, this.buffer.length);
        const samples = [];
        // Calculate probability distribution based on priorities
        const priorities = this.buffer.map((exp) => {
            const actionId = exp.metadata.actionId || exp.timestamp.toString();
            const priority = this.priorities.get(actionId) || 1.0;
            return Math.pow(priority, alpha);
        });
        const totalPriority = priorities.reduce((sum, p) => sum + p, 0);
        const probabilities = priorities.map((p) => p / totalPriority);
        // Sample using probability distribution
        for (let i = 0; i < size; i++) {
            const rand = Math.random();
            let cumulative = 0;
            for (let j = 0; j < probabilities.length; j++) {
                cumulative += probabilities[j];
                if (rand <= cumulative) {
                    samples.push(this.buffer[j]);
                    break;
                }
            }
        }
        return samples;
    }
    /**
     * Get recent experiences
     */
    getRecent(count) {
        const start = Math.max(0, this.buffer.length - count);
        return this.buffer.slice(start);
    }
    /**
     * Get high-reward experiences
     */
    getTopRewarded(count) {
        const sorted = [...this.buffer].sort((a, b) => b.reward - a.reward);
        return sorted.slice(0, count);
    }
    /**
     * Get experiences by task type
     */
    getByTaskType(taskType) {
        return this.buffer.filter((exp) => exp.metadata.taskType === taskType);
    }
    /**
     * Get buffer statistics
     */
    getStats() {
        if (this.buffer.length === 0) {
            return {
                size: 0,
                avgReward: 0,
                maxReward: 0,
                minReward: 0,
                taskDistribution: {},
            };
        }
        const rewards = this.buffer.map((exp) => exp.reward);
        const avgReward = rewards.reduce((sum, r) => sum + r, 0) / rewards.length;
        const maxReward = Math.max(...rewards);
        const minReward = Math.min(...rewards);
        const taskDistribution = {};
        for (const exp of this.buffer) {
            const taskType = exp.metadata.taskType;
            taskDistribution[taskType] = (taskDistribution[taskType] || 0) + 1;
        }
        return {
            size: this.buffer.length,
            avgReward,
            maxReward,
            minReward,
            taskDistribution,
        };
    }
    /**
     * Clear buffer
     */
    clear() {
        this.buffer = [];
        this.priorities.clear();
    }
    /**
     * Get buffer size
     */
    size() {
        return this.buffer.length;
    }
    /**
     * Calculate priority for experience
     */
    calculatePriority(experience) {
        // Priority based on:
        // 1. Reward magnitude (higher reward = higher priority)
        // 2. Recency (more recent = higher priority)
        // 3. Uniqueness (rare task types = higher priority)
        const rewardComponent = Math.abs(experience.reward);
        const recencyComponent = 1.0 / (1.0 + (Date.now() - experience.timestamp) / 1000000);
        // Simple priority: weighted sum
        return rewardComponent * 0.7 + recencyComponent * 0.3;
    }
    /**
     * Prune buffer to maintain max size
     */
    prune() {
        // Strategy: Remove lowest priority experiences
        const withPriorities = this.buffer.map((exp) => {
            const actionId = exp.metadata.actionId || exp.timestamp.toString();
            const priority = this.priorities.get(actionId) || 0;
            return { experience: exp, priority };
        });
        // Sort by priority (descending)
        withPriorities.sort((a, b) => b.priority - a.priority);
        // Keep top maxSize experiences
        this.buffer = withPriorities
            .slice(0, this.maxSize)
            .map((item) => item.experience);
        // Clean up priorities map
        const validActionIds = new Set(this.buffer.map((exp) => exp.metadata.actionId || exp.timestamp.toString()));
        for (const actionId of this.priorities.keys()) {
            if (!validActionIds.has(actionId)) {
                this.priorities.delete(actionId);
            }
        }
    }
}
