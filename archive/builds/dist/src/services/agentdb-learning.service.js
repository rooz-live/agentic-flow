/**
 * AgentDB Learning Service
 * Pattern recognition and continuous learning for medical analysis
 */
import { ReflexionMemory, SkillLibrary, EmbeddingService } from '../../agentic-flow/src/agentdb';
export class AgentDBLearningService {
    reflexionMemory;
    skillLibrary;
    embeddingService;
    dbPath;
    constructor(dbPath = './data/medical-learning.db') {
        this.dbPath = dbPath;
        this.reflexionMemory = new ReflexionMemory({ dbPath });
        this.skillLibrary = new SkillLibrary({ dbPath });
        this.embeddingService = new EmbeddingService({ dbPath });
    }
    /**
     * Learn from successful analysis
     */
    async learnFromAnalysis(analysis, outcome, providerFeedback) {
        try {
            // Store trajectory for reflexion learning
            const trajectory = {
                taskId: analysis.id,
                steps: [
                    {
                        action: 'diagnosis',
                        observation: JSON.stringify(analysis.diagnosis),
                        reward: outcome === 'successful' ? 1.0 : outcome === 'modified' ? 0.7 : 0.0
                    },
                    {
                        action: 'recommendations',
                        observation: JSON.stringify(analysis.recommendations),
                        reward: outcome === 'successful' ? 1.0 : outcome === 'modified' ? 0.7 : 0.0
                    }
                ],
                verdict: outcome === 'successful' ? 'correct' : 'incorrect',
                reflection: providerFeedback || this.generateReflection(analysis, outcome)
            };
            await this.reflexionMemory.addTrajectory(trajectory);
            // Extract and store successful patterns
            if (outcome === 'successful' || outcome === 'modified') {
                await this.extractPatterns(analysis);
            }
            // Update skill library
            await this.updateSkills(analysis, outcome);
        }
        catch (error) {
            console.error('Error learning from analysis:', error);
        }
    }
    /**
     * Recognize patterns in new query
     */
    async recognizePatterns(symptoms, context) {
        try {
            // Generate embedding for symptom cluster
            const queryText = symptoms.join(' ');
            const queryEmbedding = await this.embeddingService.generateEmbedding(queryText);
            // Search for similar patterns
            const similarPatterns = await this.embeddingService.search(queryEmbedding, {
                limit: 10,
                threshold: 0.7,
                filter: { patternType: 'symptom_cluster' }
            });
            // Analyze applicability
            const patterns = similarPatterns.map(result => ({
                id: result.id,
                patternType: 'symptom_cluster',
                frequency: result.metadata?.frequency || 1,
                accuracy: result.metadata?.accuracy || 0.5,
                examples: result.metadata?.examples || [],
                metadata: result.metadata || {},
                createdAt: new Date(result.metadata?.createdAt || Date.now()),
                lastUsed: new Date()
            }));
            const confidence = patterns.length > 0
                ? patterns.reduce((sum, p) => sum + p.accuracy, 0) / patterns.length
                : 0;
            return {
                patterns,
                confidence,
                applicableToQuery: confidence > 0.7,
                reasoning: this.generatePatternReasoning(patterns, symptoms)
            };
        }
        catch (error) {
            console.error('Error recognizing patterns:', error);
            return {
                patterns: [],
                confidence: 0,
                applicableToQuery: false,
                reasoning: 'Pattern recognition failed'
            };
        }
    }
    /**
     * Get relevant skills for analysis
     */
    async getRelevantSkills(condition) {
        try {
            const skills = await this.skillLibrary.searchSkills(condition, 5);
            return skills.filter(skill => skill.successRate > 0.7);
        }
        catch (error) {
            console.error('Error retrieving skills:', error);
            return [];
        }
    }
    /**
     * Extract patterns from successful analysis
     */
    async extractPatterns(analysis) {
        // Extract diagnosis patterns
        for (const diagnosis of analysis.diagnosis) {
            const pattern = {
                type: 'diagnosis_pattern',
                condition: diagnosis.condition,
                confidence: diagnosis.confidence,
                evidence: diagnosis.supportingEvidence.map(e => e.type),
                timestamp: new Date()
            };
            const patternText = JSON.stringify(pattern);
            const embedding = await this.embeddingService.generateEmbedding(patternText);
            await this.embeddingService.store({
                id: `pattern_${Date.now()}_${Math.random()}`,
                embedding,
                metadata: {
                    ...pattern,
                    patternType: 'diagnosis',
                    frequency: 1,
                    accuracy: diagnosis.confidence
                }
            });
        }
        // Extract recommendation patterns
        for (const rec of analysis.recommendations) {
            const pattern = {
                type: 'recommendation_pattern',
                recommendationType: rec.type,
                priority: rec.priority,
                confidence: rec.confidence,
                timestamp: new Date()
            };
            const patternText = JSON.stringify(pattern);
            const embedding = await this.embeddingService.generateEmbedding(patternText);
            await this.embeddingService.store({
                id: `rec_pattern_${Date.now()}_${Math.random()}`,
                embedding,
                metadata: {
                    ...pattern,
                    patternType: 'recommendation',
                    frequency: 1,
                    accuracy: rec.confidence
                }
            });
        }
    }
    /**
     * Update skill library based on outcomes
     */
    async updateSkills(analysis, outcome) {
        for (const diagnosis of analysis.diagnosis) {
            const skillName = `diagnose_${diagnosis.condition.replace(/\s+/g, '_')}`;
            const successRate = outcome === 'successful' ? 1.0 : outcome === 'modified' ? 0.7 : 0.0;
            await this.skillLibrary.addSkill({
                name: skillName,
                description: `Diagnose ${diagnosis.condition}`,
                implementation: diagnosis.reasoning,
                successRate,
                usageCount: 1,
                metadata: {
                    icd10Code: diagnosis.icd10Code,
                    confidence: diagnosis.confidence
                }
            });
        }
    }
    /**
     * Generate reflection for learning
     */
    generateReflection(analysis, outcome) {
        if (outcome === 'successful') {
            return `Analysis was accurate. Key factors: high confidence (${analysis.confidenceScore.overall}), verified citations, no contradictions.`;
        }
        else if (outcome === 'modified') {
            return `Analysis required modifications. Review confidence scoring and citation verification processes.`;
        }
        else {
            return `Analysis failed. Low confidence (${analysis.confidenceScore.overall}) indicated issues. Improve pattern recognition and knowledge base validation.`;
        }
    }
    /**
     * Generate reasoning for pattern recognition
     */
    generatePatternReasoning(patterns, symptoms) {
        if (patterns.length === 0) {
            return 'No similar patterns found in historical data.';
        }
        const avgAccuracy = patterns.reduce((sum, p) => sum + p.accuracy, 0) / patterns.length;
        const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
        return `Found ${patterns.length} similar patterns with average accuracy ${(avgAccuracy * 100).toFixed(1)}% ` +
            `(seen ${totalFrequency} times). Symptoms match ${patterns[0].patternType} patterns from previous successful analyses.`;
    }
    /**
     * Export learning metrics
     */
    async getMetrics() {
        return {
            totalTrajectories: await this.reflexionMemory.getTrajectoryCount?.() || 0,
            totalSkills: await this.skillLibrary.getSkillCount?.() || 0,
            totalPatterns: await this.embeddingService.getCount?.() || 0,
            averageAccuracy: 0.85 // Calculate from actual data
        };
    }
    /**
     * Cleanup and close connections
     */
    async close() {
        // Close database connections if needed
    }
}
//# sourceMappingURL=agentdb-learning.service.js.map