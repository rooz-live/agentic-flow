#!/usr/bin/env tsx
/**
 * Causal Learning Integration
 *
 * Bridges ay-prod-cycle.sh completion tracking with AgentDB causal memory.
 * Records observations, experiments, and extracts causal insights to enhance WSJF.
 */
import { createDatabase } from '../../packages/agentdb/src/db-fallback.js';
import { CausalMemoryGraph } from '../../packages/agentdb/src/controllers/CausalMemoryGraph.js';
import { EmbeddingService } from '../../packages/agentdb/src/controllers/EmbeddingService.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class CausalLearningIntegration {
    dbPath;
    db;
    causalGraph;
    embedder;
    constructor(dbPath = './agentdb.db') {
        this.dbPath = dbPath;
    }
    async initialize() {
        // Initialize database
        this.db = await createDatabase(this.dbPath);
        // Load causal schema
        const schemaPath = path.join(__dirname, '../../packages/agentdb/src/schemas/frontier-schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            this.db.exec(schema);
        }
        // Initialize controllers
        this.causalGraph = new CausalMemoryGraph(this.db);
        // Optional: Initialize embedder for advanced similarity
        try {
            this.embedder = new EmbeddingService({
                model: 'Xenova/all-MiniLM-L6-v2',
                dimension: 384,
                provider: 'transformers'
            });
            await this.embedder.initialize();
        }
        catch (error) {
            console.warn('⚠️  Embedder unavailable, using fallback similarity');
        }
    }
    /**
     * Record a causal observation from a completion episode
     * Called after each ceremony execution
     */
    async recordObservation(episode) {
        const hadSkills = episode.skills.length > 0;
        const outcome = episode.outcome === 'success' ? 1.0 : 0.0;
        // Find or create experiment for this circle+ceremony combination
        let experimentId = await this.findOrCreateExperiment(episode.circle, episode.ceremony);
        // Record observation (matching CausalMemoryGraph schema)
        this.causalGraph.recordObservation({
            experimentId,
            episodeId: 0, // Placeholder - would be real episode ID in production
            isTreatment: hadSkills,
            outcomeValue: outcome,
            outcomeType: 'success',
            context: {
                circle: episode.circle,
                ceremony: episode.ceremony,
                skills: episode.skills,
                duration: episode.duration,
                ...episode.metadata
            }
        });
        console.log(`✅ Recorded causal observation for ${episode.circle}::${episode.ceremony}`);
        console.log(`   Treatment: ${hadSkills ? 'WITH' : 'WITHOUT'} skills, Outcome: ${outcome}`);
        // Persist to disk if using sql.js
        if (typeof this.db.save === 'function') {
            this.db.save();
            console.log(`   💾 Persisted to ${this.dbPath}`);
        }
    }
    /**
     * Find or create experiment for circle+ceremony
     */
    async findOrCreateExperiment(circle, ceremony) {
        const name = `${circle}_${ceremony}_skills_experiment`;
        // Check if experiment exists
        const existing = this.db.prepare(`
      SELECT id FROM causal_experiments
      WHERE name = ?
    `).get(name);
        if (existing) {
            return existing.id;
        }
        // Create new experiment
        const experimentId = this.causalGraph.createExperiment({
            name,
            hypothesis: `Do skills improve completion rate for ${circle}::${ceremony}?`,
            treatmentId: 0, // Placeholder
            treatmentType: 'skills',
            controlId: undefined,
            startTime: Math.floor(Date.now() / 1000),
            sampleSize: 0,
            status: 'running',
            metadata: {
                circle,
                ceremony,
                type: 'skills_uplift'
            }
        });
        console.log(`🧪 Created experiment #${experimentId}: ${name}`);
        return experimentId;
    }
    /**
     * Analyze completed experiments and extract causal edges
     */
    async analyzeExperiments(minSampleSize = 30) {
        console.log('\n📊 Analyzing causal experiments...\n');
        // Get experiments with sufficient data
        const experiments = this.db.prepare(`
      SELECT 
        e.id,
        e.name,
        e.hypothesis,
        e.metadata,
        COUNT(o.id) as sample_size,
        AVG(CASE WHEN o.is_treatment = 1 THEN o.outcome_value ELSE NULL END) as treatment_outcome,
        AVG(CASE WHEN o.is_treatment = 0 THEN o.outcome_value ELSE NULL END) as control_outcome
      FROM causal_experiments e
      LEFT JOIN causal_observations o ON e.id = o.experiment_id
      WHERE e.status = 'running'
      GROUP BY e.id
      HAVING sample_size >= ?
    `).all(minSampleSize);
        for (const exp of experiments) {
            const uplift = exp.treatment_outcome - exp.control_outcome;
            const metadata = JSON.parse(exp.metadata || '{}');
            console.log(`\n🧪 Experiment: ${exp.name}`);
            console.log(`   Sample Size: ${exp.sample_size}`);
            console.log(`   Treatment: ${(exp.treatment_outcome * 100).toFixed(1)}%`);
            console.log(`   Control: ${(exp.control_outcome * 100).toFixed(1)}%`);
            console.log(`   Uplift: ${(uplift * 100).toFixed(1)}%`);
            // Create causal edge if significant uplift
            if (Math.abs(uplift) > 0.05) { // 5% threshold
                const edgeId = this.causalGraph.addCausalEdge({
                    fromMemoryId: 0, // Placeholder
                    fromMemoryType: 'skill',
                    toMemoryId: 0, // Placeholder
                    toMemoryType: 'completion',
                    similarity: 0.9,
                    uplift,
                    confidence: this.calculateConfidence(exp.sample_size, uplift),
                    sampleSize: exp.sample_size,
                    mechanism: `Skills → ${metadata.circle}::${metadata.ceremony} completion`,
                    evidenceIds: []
                });
                console.log(`   ✅ Created causal edge #${edgeId}`);
            }
        }
    }
    /**
     * Calculate confidence based on sample size and effect size
     */
    calculateConfidence(sampleSize, uplift) {
        // Simple heuristic: higher sample size and effect size = higher confidence
        const sampleFactor = Math.min(sampleSize / 100, 1.0);
        const effectFactor = Math.min(Math.abs(uplift) * 2, 1.0);
        return (sampleFactor * 0.5 + effectFactor * 0.5);
    }
    /**
     * Get causal insights for WSJF enhancement
     */
    async getCausalInsights(circle, ceremony) {
        // Find causal edges related to this circle+ceremony
        const edges = this.db.prepare(`
      SELECT 
        uplift,
        confidence,
        mechanism,
        sample_size
      FROM causal_edges
      WHERE mechanism LIKE ?
      ORDER BY confidence DESC, sample_size DESC
      LIMIT 1
    `).all(`%${circle}::${ceremony}%`);
        if (edges.length === 0) {
            return {
                hasSkillsUplift: false,
                upliftPercentage: 0,
                confidence: 0,
                recommendation: 'Insufficient data for causal insights'
            };
        }
        const edge = edges[0];
        const upliftPct = edge.uplift * 100;
        return {
            hasSkillsUplift: edge.uplift > 0,
            upliftPercentage: upliftPct,
            confidence: edge.confidence,
            recommendation: edge.uplift > 0
                ? `Load skills first (+${upliftPct.toFixed(1)}% proven uplift)`
                : `Skills show negative impact (${upliftPct.toFixed(1)}%)`
        };
    }
    /**
     * Generate WHY explanations for dashboard
     */
    async explainCompletion(circle, ceremony, currentRate) {
        const insights = await this.getCausalInsights(circle, ceremony);
        if (!insights.hasSkillsUplift) {
            return `${circle} at ${(currentRate * 100).toFixed(0)}%`;
        }
        return `${circle} at ${(currentRate * 100).toFixed(0)}% BECAUSE missing ${ceremony} skills (+${insights.upliftPercentage.toFixed(0)}% uplift proven)`;
    }
}
/**
 * CLI entry point for integration with ay-prod-cycle.sh
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const integration = new CausalLearningIntegration();
    await integration.initialize();
    switch (command) {
        case 'record': {
            // Record observation from episode JSON
            const episodeJson = args[1];
            if (!episodeJson) {
                console.error('Usage: causal-learning-integration.ts record <episode-json>');
                process.exit(1);
            }
            const data = JSON.parse(fs.readFileSync(episodeJson, 'utf-8'));
            // Transform to expected format
            const episode = {
                circle: data.circle,
                ceremony: data.ceremony,
                skills: data.skills || [],
                duration: data.duration,
                outcome: data.episode?.status === 'success' ? 'success' : 'failure',
                metadata: {
                    reward: data.episode?.reward,
                    timestamp: data.episode?.timestamp,
                    divergence_mode: data.episode?.divergence_mode
                }
            };
            await integration.recordObservation(episode);
            break;
        }
        case 'analyze': {
            // Analyze all experiments
            const minSampleSize = parseInt(args[1] || '30', 10);
            await integration.analyzeExperiments(minSampleSize);
            break;
        }
        case 'insights': {
            // Get insights for circle+ceremony
            const circle = args[1];
            const ceremony = args[2];
            if (!circle || !ceremony) {
                console.error('Usage: causal-learning-integration.ts insights <circle> <ceremony>');
                process.exit(1);
            }
            const insights = await integration.getCausalInsights(circle, ceremony);
            console.log(JSON.stringify(insights, null, 2));
            break;
        }
        case 'explain': {
            // Generate WHY explanation
            const circle = args[1];
            const ceremony = args[2];
            const rate = parseFloat(args[3] || '0');
            if (!circle || !ceremony) {
                console.error('Usage: causal-learning-integration.ts explain <circle> <ceremony> <current-rate>');
                process.exit(1);
            }
            const explanation = await integration.explainCompletion(circle, ceremony, rate);
            console.log(explanation);
            break;
        }
        default:
            console.log(`
Causal Learning Integration - CLI

Usage:
  tsx src/integrations/causal-learning-integration.ts <command> [args]

Commands:
  record <episode-json>           Record observation from episode
  analyze [min-sample-size]       Analyze experiments and extract causal edges
  insights <circle> <ceremony>    Get causal insights for WSJF
  explain <circle> <ceremony> <rate>  Generate WHY explanation

Examples:
  tsx src/integrations/causal-learning-integration.ts record /tmp/episode.json
  tsx src/integrations/causal-learning-integration.ts analyze 30
  tsx src/integrations/causal-learning-integration.ts insights assessor wsjf
  tsx src/integrations/causal-learning-integration.ts explain assessor wsjf 0.35
      `);
            process.exit(1);
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
export default CausalLearningIntegration;
//# sourceMappingURL=causal-learning-integration.js.map