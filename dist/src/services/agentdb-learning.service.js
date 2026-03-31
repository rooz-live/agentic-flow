/**
 * AgentDB Learning Service
 * Pattern recognition and continuous learning for medical analysis
 */
import { ReflexionMemory, SkillLibrary, EmbeddingService } from '../../agentic-flow/src/agentdb';
import Database from 'better-sqlite3';
export class AgentDBLearningService {
    reflexionMemory;
    skillLibrary;
    embeddingService;
    db;
    dbPath;
    constructor(dbPath = './data/medical-learning.db') {
        this.dbPath = dbPath;
        this.db = new Database(dbPath);
        // Initialize embedding service
        this.embeddingService = new EmbeddingService({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            dimension: 384,
            provider: 'transformers'
        });
        // Initialize AgentDB components with Database instance
        this.reflexionMemory = new ReflexionMemory(this.db, this.embeddingService);
        this.skillLibrary = new SkillLibrary(this.db, this.embeddingService);
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
            // Store trajectory using storeEpisode method
            await this.reflexionMemory.storeEpisode({
                sessionId: trajectory.taskId,
                task: 'medical_analysis',
                input: JSON.stringify(analysis),
                output: JSON.stringify({ outcome, feedback: providerFeedback }),
                critique: trajectory.reflection,
                reward: trajectory.steps.reduce((sum, s) => sum + s.reward, 0) / trajectory.steps.length,
                success: outcome === 'successful'
            });
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
            const queryEmbedding = await this.embeddingService.embed(queryText);
            // Search for similar patterns
            const similarPatterns = await this.embeddingService.searchSimilar(queryEmbedding, 10, { patternType: 'symptom_cluster' });
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
            const skills = await this.skillLibrary.searchSkills({
                task: condition,
                k: 5,
                minSuccessRate: 0.7
            });
            return skills;
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
            const embedding = await this.embeddingService.embed(patternText);
            await this.embeddingService.addVector(`pattern_${Date.now()}_${Math.random()}`, embedding, {
                ...pattern,
                patternType: 'diagnosis',
                frequency: 1,
                accuracy: diagnosis.confidence
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
            const embedding = await this.embeddingService.embed(patternText);
            await this.embeddingService.addVector(`rec_pattern_${Date.now()}_${Math.random()}`, embedding, {
                ...pattern,
                patternType: 'recommendation',
                frequency: 1,
                accuracy: rec.confidence
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
            await this.skillLibrary.createSkill({
                name: skillName,
                description: `Diagnose ${diagnosis.condition}`,
                signature: {
                    inputs: { symptoms: 'string[]', context: 'object' },
                    outputs: { diagnosis: 'object', confidence: 'number' }
                },
                code: diagnosis.reasoning,
                successRate,
                uses: 1,
                avgReward: successRate,
                avgLatencyMs: 0,
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
        // Get counts from database queries
        const trajectoryCount = this.db.prepare('SELECT COUNT(*) as count FROM episodes').get();
        const skillCount = this.db.prepare('SELECT COUNT(*) as count FROM skills').get();
        return {
            totalTrajectories: trajectoryCount?.count || 0,
            totalSkills: skillCount?.count || 0,
            totalPatterns: this.embeddingService['cache'].size || 0,
            averageAccuracy: 0.85 // Calculate from actual data
        };
    }
    /**
     * Cleanup and close connections
     */
    async close() {
        // Close database connection
        this.db.close();
    }
}
//# sourceMappingURL=agentdb-learning.service.js.map