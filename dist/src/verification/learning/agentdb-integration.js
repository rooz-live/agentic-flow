/**
 * AgentDB Learning Integration
 * Learn from provider corrections, improve confidence scoring, pattern recognition
 */
export class AgentDBIntegration {
    learningRecords;
    confidenceModel;
    patterns;
    sourceReliability;
    LEARNING_RATE = 0.01;
    PATTERN_THRESHOLD = 0.7;
    constructor() {
        this.learningRecords = new Map();
        this.patterns = new Map();
        this.sourceReliability = new Map();
        this.confidenceModel = this.initializeModel();
    }
    /**
     * Initialize learning model
     */
    initializeModel() {
        return {
            weights: new Map([
                ['citationCount', 0.15],
                ['peerReviewedRatio', 0.25],
                ['recencyScore', 0.10],
                ['evidenceLevelScore', 0.25],
                ['contradictionCount', -0.15],
                ['hallucinationFlags', -0.20],
                ['textLength', 0.05],
                ['quantitativeClaims', 0.05],
            ]),
            bias: 0.5,
            trainingExamples: 0,
            accuracy: 0.5,
            lastUpdated: Date.now(),
        };
    }
    /**
     * Learn from provider correction
     */
    async learnFromCorrection(claim, originalConfidence, feedback, features) {
        // Create learning record
        const record = {
            id: this.generateId(),
            timestamp: Date.now(),
            claim,
            originalConfidence,
            correctedConfidence: feedback.confidenceAssessment,
            providerFeedback: feedback,
            features,
            outcome: feedback.approved ? 'accepted' :
                feedback.corrections.length > 0 ? 'modified' : 'rejected',
        };
        this.learningRecords.set(record.id, record);
        // Update confidence model
        await this.updateConfidenceModel(record);
        // Update pattern recognition
        await this.updatePatterns(record);
        // Update source reliability
        await this.updateSourceReliability(record);
        // Persist to AgentDB (simulated)
        await this.persistToAgentDB(record);
    }
    /**
     * Update confidence scoring model
     */
    async updateConfidenceModel(record) {
        // Calculate prediction error
        const predicted = this.predictConfidence(record.features);
        const actual = record.correctedConfidence;
        const error = actual - predicted;
        // Update weights using gradient descent
        for (const [feature, value] of Object.entries(record.features)) {
            const currentWeight = this.confidenceModel.weights.get(feature) || 0;
            const gradient = error * value;
            const newWeight = currentWeight + this.LEARNING_RATE * gradient;
            this.confidenceModel.weights.set(feature, newWeight);
        }
        // Update bias
        this.confidenceModel.bias += this.LEARNING_RATE * error;
        // Update metadata
        this.confidenceModel.trainingExamples++;
        this.confidenceModel.lastUpdated = Date.now();
        // Recalculate accuracy
        await this.updateModelAccuracy();
    }
    /**
     * Predict confidence using current model
     */
    predictConfidence(features) {
        let prediction = this.confidenceModel.bias;
        for (const [feature, value] of Object.entries(features)) {
            const weight = this.confidenceModel.weights.get(feature) || 0;
            prediction += weight * value;
        }
        // Apply sigmoid to constrain to [0, 1]
        return 1 / (1 + Math.exp(-prediction));
    }
    /**
     * Update model accuracy
     */
    async updateModelAccuracy() {
        if (this.learningRecords.size === 0) {
            this.confidenceModel.accuracy = 0.5;
            return;
        }
        let correctPredictions = 0;
        const threshold = 0.1; // Tolerance for "correct" prediction
        for (const record of this.learningRecords.values()) {
            const predicted = this.predictConfidence(record.features);
            const actual = record.correctedConfidence;
            if (Math.abs(predicted - actual) < threshold) {
                correctPredictions++;
            }
        }
        this.confidenceModel.accuracy = correctPredictions / this.learningRecords.size;
    }
    /**
     * Update pattern recognition
     */
    async updatePatterns(record) {
        // Extract patterns from successful/failed verifications
        const outcome = record.outcome;
        const features = record.features;
        // Pattern 1: High citation count + peer-reviewed = reliable
        if (features.citationCount >= 5 && features.peerReviewedRatio >= 0.8) {
            await this.recordPattern('high-quality-citations', 'High citation count with peer-reviewed sources', outcome === 'accepted' ? 1 : 0, record.claim);
        }
        // Pattern 2: Contradictions = unreliable
        if (features.contradictionCount > 0) {
            await this.recordPattern('contradictions-present', 'Claims with contradictions', outcome === 'rejected' ? 1 : 0, record.claim);
        }
        // Pattern 3: Recent evidence = more reliable
        if (features.recencyScore >= 0.8) {
            await this.recordPattern('recent-evidence', 'Claims based on recent evidence', outcome === 'accepted' ? 1 : 0, record.claim);
        }
        // Pattern 4: Hallucination flags = unreliable
        if (features.hallucinationFlags > 0) {
            await this.recordPattern('hallucination-detected', 'Claims with hallucination flags', outcome === 'rejected' ? 1 : 0, record.claim);
        }
        // Extract patterns from corrections
        for (const correction of record.providerFeedback.corrections) {
            await this.recordCorrectionPattern(correction, record);
        }
    }
    /**
     * Record pattern observation
     */
    async recordPattern(patternId, name, success, example) {
        if (!this.patterns.has(patternId)) {
            this.patterns.set(patternId, {
                id: patternId,
                name,
                frequency: 0,
                confidence: 0.5,
                context: [],
                examples: [],
                reliability: 0.5,
            });
        }
        const pattern = this.patterns.get(patternId);
        pattern.frequency++;
        pattern.examples.push(example);
        // Update reliability using exponential moving average
        const alpha = 0.1;
        pattern.reliability = alpha * success + (1 - alpha) * pattern.reliability;
        // Update confidence based on frequency and reliability
        pattern.confidence = Math.min(1, pattern.reliability * Math.log10(pattern.frequency + 1));
    }
    /**
     * Record correction pattern
     */
    async recordCorrectionPattern(correction, record) {
        const patternId = `correction-${correction.type}`;
        const pattern = this.patterns.get(patternId) || {
            id: patternId,
            name: `Common ${correction.type} corrections`,
            frequency: 0,
            confidence: 0,
            context: [],
            examples: [],
            reliability: 0.5,
        };
        pattern.frequency++;
        pattern.context.push(correction.original);
        pattern.examples.push(correction.corrected);
        this.patterns.set(patternId, pattern);
    }
    /**
     * Update source reliability tracking
     */
    async updateSourceReliability(record) {
        // Extract source information from features/feedback
        const categories = record.providerFeedback.categories;
        for (const category of categories) {
            if (!this.sourceReliability.has(category)) {
                this.sourceReliability.set(category, {
                    sourceId: category,
                    reliability: 0.5,
                    sampleSize: 0,
                    successRate: 0.5,
                    lastUpdated: Date.now(),
                    categories: new Map(),
                });
            }
            const source = this.sourceReliability.get(category);
            source.sampleSize++;
            // Update success rate
            const success = record.outcome === 'accepted' ? 1 : 0;
            source.successRate = (source.successRate * (source.sampleSize - 1) + success) / source.sampleSize;
            // Update reliability (weighted by sample size)
            // Use a more responsive weight that reaches 0.8 at 10 samples
            const weight = Math.min(1, source.sampleSize / 12);
            source.reliability = weight * source.successRate + (1 - weight) * 0.5;
            source.lastUpdated = Date.now();
        }
    }
    /**
     * Get confidence adjustment based on learned patterns
     */
    async getConfidenceAdjustment(features, context) {
        let adjustment = 0;
        const appliedPatterns = [];
        const reasons = [];
        // Check for matching patterns
        for (const pattern of this.patterns.values()) {
            if (pattern.confidence >= this.PATTERN_THRESHOLD) {
                const matches = this.patternMatches(pattern, features, context);
                if (matches) {
                    const patternAdjustment = (pattern.reliability - 0.5) * 0.2; // Max ±0.1
                    adjustment += patternAdjustment;
                    appliedPatterns.push(pattern);
                    reasons.push(`${pattern.name} (${Math.round(pattern.reliability * 100)}% reliable)`);
                }
            }
        }
        // Check source reliability
        const contextArray = Array.isArray(context) ? context : [];
        for (const category of contextArray) {
            const source = this.sourceReliability.get(category);
            if (source && source.sampleSize >= 10) {
                const sourceAdjustment = (source.reliability - 0.5) * 0.15; // Max ±0.075
                adjustment += sourceAdjustment;
                reasons.push(`Source ${category}: ${Math.round(source.reliability * 100)}% reliable`);
            }
        }
        // Clamp adjustment to reasonable range
        adjustment = Math.max(-0.3, Math.min(0.3, adjustment));
        return {
            adjustment,
            reason: reasons.join('; '),
            appliedPatterns,
        };
    }
    /**
     * Check if pattern matches current features
     */
    patternMatches(pattern, features, context) {
        // Simple matching - check if pattern context appears in current context
        if (pattern.id === 'high-quality-citations') {
            return features.citationCount >= 5 && features.peerReviewedRatio >= 0.8;
        }
        if (pattern.id === 'contradictions-present') {
            return features.contradictionCount > 0;
        }
        if (pattern.id === 'recent-evidence') {
            return features.recencyScore >= 0.8;
        }
        if (pattern.id === 'hallucination-detected') {
            return features.hallucinationFlags > 0;
        }
        return false;
    }
    /**
     * Get pattern recognition statistics
     */
    getPatternStatistics() {
        const totalPatterns = this.patterns.size;
        const reliablePatterns = Array.from(this.patterns.values())
            .filter(p => p.confidence >= this.PATTERN_THRESHOLD).length;
        const topPatterns = Array.from(this.patterns.values())
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10);
        const averageReliability = totalPatterns > 0
            ? Array.from(this.patterns.values())
                .reduce((sum, p) => sum + p.reliability, 0) / totalPatterns
            : 0.5;
        return {
            totalPatterns,
            reliablePatterns,
            topPatterns,
            averageReliability,
        };
    }
    /**
     * Get learning model statistics
     */
    getModelStatistics() {
        return {
            trainingExamples: this.confidenceModel.trainingExamples,
            accuracy: this.confidenceModel.accuracy,
            featureWeights: new Map(this.confidenceModel.weights),
            lastUpdated: this.confidenceModel.lastUpdated,
        };
    }
    /**
     * Get source reliability rankings
     */
    getSourceRankings(minSampleSize = 10) {
        return Array.from(this.sourceReliability.values())
            .filter(s => s.sampleSize >= minSampleSize)
            .sort((a, b) => b.reliability - a.reliability);
    }
    /**
     * Persist to AgentDB (simulated - would use actual AgentDB in production)
     */
    async persistToAgentDB(record) {
        // In production, this would:
        // 1. Store learning record in AgentDB vector database
        // 2. Create embeddings for semantic search
        // 3. Link to related records
        // 4. Update indexes for fast retrieval
        // Simulated implementation
        console.log(`Persisting learning record ${record.id} to AgentDB`);
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Export learning data for analysis
     */
    exportLearningData() {
        return {
            records: Array.from(this.learningRecords.values()),
            model: { ...this.confidenceModel, weights: new Map(this.confidenceModel.weights) },
            patterns: Array.from(this.patterns.values()),
            sources: Array.from(this.sourceReliability.values()),
        };
    }
}
//# sourceMappingURL=agentdb-integration.js.map