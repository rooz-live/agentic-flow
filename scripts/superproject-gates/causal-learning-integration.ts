/**
 * Causal Learning Integration
 * Connects completion tracking to causal experiments and discovery
 */

import { AgentDB } from './agentdb-client.js';

export interface CausalObservationParams {
  episodeId: string;
  circle: string;
  ceremony: string;
  completionPct: number;
  context: {
    skillCount: number;
    mcpStatus: string;
    dodPassed: boolean;
  };
}

export class CausalLearningIntegration {
  private db: AgentDB;
  
  constructor() {
    this.db = new AgentDB();
  }
  
  /**
   * Record causal observation after episode completion
   */
  async recordObservation(params: CausalObservationParams): Promise<void> {
    try {
      // Find or create experiment for this circle/ceremony
      const experimentId = await this.findOrCreateExperiment(
        params.circle,
        params.ceremony
      );
      
      // Determine if this is treatment or control
      // Treatment = has skills loaded, Control = no skills
      const isTreatment = params.context.skillCount > 0;
      
      // Record observation
      await this.db.query(
        `INSERT INTO causal_observations 
         (experiment_id, episode_id, is_treatment, outcome_value, outcome_type, context)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          experimentId,
          params.episodeId,
          isTreatment ? 1 : 0,
          params.completionPct,
          'completion_pct',
          JSON.stringify(params.context)
        ]
      );
      
      console.log(`🔬 Recorded causal observation: ${params.circle}/${params.ceremony} (${isTreatment ? 'treatment' : 'control'})`);
      
      // Check if experiment has enough data to analyze
      await this.analyzeExperimentIfReady(experimentId);
      
    } catch (error) {
      console.error('Error recording causal observation:', error);
      // Don't throw - causal learning is supplementary
    }
  }
  
  /**
   * Find or create experiment for circle/ceremony combination
   */
  private async findOrCreateExperiment(circle: string, ceremony: string): Promise<number> {
    const name = `${circle}_${ceremony}_skill_impact`;
    
    // Check if experiment exists
    const existing = await this.db.query(
      `SELECT id FROM causal_experiments WHERE name = ? AND status != 'completed'`,
      [name]
    );
    
    if (existing.length > 0) {
      return existing[0].id;
    }
    
    // Create new experiment
    const hypothesis = `Loading skills for ${circle} improves ${ceremony} completion`;
    const result = await this.db.query(
      `INSERT INTO causal_experiments 
       (name, hypothesis, treatment_id, treatment_type, start_time, status)
       VALUES (?, ?, 0, 'skill_loading', ?, 'running')`,
      [name, hypothesis, Date.now()]
    );
    
    return result[0].lastInsertRowid as number;
  }
  
  /**
   * Analyze experiment and create causal edges if significant
   */
  private async analyzeExperimentIfReady(experimentId: number): Promise<void> {
    try {
      // Get all observations for this experiment
      const observations = await this.db.query(
        `SELECT * FROM causal_observations WHERE experiment_id = ?`,
        [experimentId]
      );
      
      if (observations.length < 6) {
        return; // Need at least 6 observations (relaxed from 10)
      }
      
      // Split into treatment and control groups
      const treatment = observations.filter((o: any) => o.is_treatment === 1);
      const control = observations.filter((o: any) => o.is_treatment === 0);
      
      if (treatment.length < 3 || control.length < 3) {
        console.log(`⏸️  Experiment ${experimentId}: Need more data (treatment: ${treatment.length}, control: ${control.length})`);
        return; // Need at least 3 in each group (relaxed from 5)
      }
      
      // Calculate means
      const treatmentMean = treatment.reduce((sum: number, o: any) => sum + o.outcome_value, 0) / treatment.length;
      const controlMean = control.reduce((sum: number, o: any) => sum + o.outcome_value, 0) / control.length;
      const uplift = treatmentMean - controlMean;
      
      // Check for meaningful effect (>10% difference, relaxed from 15%)
      if (Math.abs(uplift) > 10) {
        console.log(`\n🎯 Causal discovery: ${uplift > 0 ? '+' : ''}${uplift.toFixed(1)}% uplift detected!`);
        
        // Create causal edge
        await this.createCausalEdge({
          experimentId,
          uplift,
          confidence: 0.8,
          sampleSize: observations.length,
          mechanism: `Skills ${uplift > 0 ? 'improve' : 'harm'} completion by ${Math.abs(uplift).toFixed(1)}%`
        });
        
        // Mark experiment as completed
        await this.db.query(
          `UPDATE causal_experiments 
           SET status = 'completed', 
               treatment_mean = ?, 
               control_mean = ?, 
               uplift = ?, 
               end_time = ?,
               sample_size = ?
           WHERE id = ?`,
          [treatmentMean, controlMean, uplift, Date.now(), observations.length, experimentId]
        );
      }
    } catch (error) {
      console.error('Error analyzing experiment:', error);
    }
  }
  
  /**
   * Create causal edge from experiment results
   */
  private async createCausalEdge(params: {
    experimentId: number;
    uplift: number;
    confidence: number;
    sampleSize: number;
    mechanism: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO causal_edges 
       (from_memory_id, from_memory_type, to_memory_id, to_memory_type, 
        uplift, confidence, sample_size, mechanism, evidence_ids)
       VALUES (0, 'skill', 0, 'completion_metric', ?, ?, ?, ?, ?)`,
      [
        params.uplift,
        params.confidence,
        params.sampleSize,
        params.mechanism,
        JSON.stringify([params.experimentId])
      ]
    );
    
    console.log(`✨ Created causal edge: ${params.mechanism}`);
  }
  
  /**
   * Get causal insights for a circle/ceremony
   */
  async getCausalInsights(circle: string, ceremony: string): Promise<{
    hasInsights: boolean;
    uplift?: number;
    mechanism?: string;
    sampleSize?: number;
  }> {
    try {
      const experimentName = `${circle}_${ceremony}_skill_impact`;
      
      // Get completed experiment
      const experiments = await this.db.query(
        `SELECT * FROM causal_experiments 
         WHERE name = ? AND status = 'completed'`,
        [experimentName]
      );
      
      if (experiments.length === 0) {
        return { hasInsights: false };
      }
      
      const exp = experiments[0];
      return {
        hasInsights: true,
        uplift: exp.uplift,
        mechanism: `${exp.uplift > 0 ? 'Loading' : 'Avoiding'} skills ${exp.uplift > 0 ? 'improves' : 'degrades'} completion by ${Math.abs(exp.uplift).toFixed(1)}%`,
        sampleSize: exp.sample_size
      };
    } catch (error) {
      console.error('Error getting causal insights:', error);
      return { hasInsights: false };
    }
  }
  
  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
