export class AgentDBIntegration {
    learningEnabled = true;
    patterns = new Map();
    async recordAnalysis(patientData, analysis) {
        if (!this.learningEnabled)
            return;
        // Record successful analysis pattern
        const pattern = this.extractPattern(patientData, analysis);
        await this.storePattern(pattern);
    }
    async applyLearning(patientData) {
        if (!this.learningEnabled)
            return null;
        // Apply learned patterns to improve analysis
        const similarPatterns = await this.findSimilarPatterns(patientData);
        return this.synthesizeLearning(similarPatterns);
    }
    async trainFromFeedback(analysisId, feedback) {
        // Train AgentDB from provider feedback
        const pattern = {
            analysisId,
            feedback,
            timestamp: new Date().toISOString(),
        };
        await this.storePattern(pattern);
    }
    enableLearning() {
        this.learningEnabled = true;
    }
    disableLearning() {
        this.learningEnabled = false;
    }
    isLearningEnabled() {
        return this.learningEnabled;
    }
    extractPattern(patientData, analysis) {
        return {
            symptoms: patientData.symptoms,
            diagnosis: analysis.diagnosis,
            confidence: analysis.confidence,
            verificationScore: analysis.verificationScore,
            timestamp: new Date().toISOString(),
        };
    }
    async storePattern(pattern) {
        const key = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.patterns.set(key, pattern);
    }
    async findSimilarPatterns(patientData) {
        const similarPatterns = [];
        for (const [key, pattern] of this.patterns.entries()) {
            if (pattern.symptoms) {
                const similarity = this.calculateSimilarity(patientData.symptoms, pattern.symptoms);
                if (similarity > 0.7) {
                    similarPatterns.push({ ...pattern, similarity });
                }
            }
        }
        return similarPatterns.sort((a, b) => b.similarity - a.similarity);
    }
    calculateSimilarity(symptoms1, symptoms2) {
        const set1 = new Set(symptoms1.map(s => s.toLowerCase()));
        const set2 = new Set(symptoms2.map(s => s.toLowerCase()));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    synthesizeLearning(patterns) {
        if (patterns.length === 0)
            return null;
        return {
            suggestedDiagnoses: patterns.flatMap(p => p.diagnosis),
            averageConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length,
            patternsFound: patterns.length,
        };
    }
}
//# sourceMappingURL=agentdb-integration.js.map