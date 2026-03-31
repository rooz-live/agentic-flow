/**
 * Semantic Context Enricher - P1-TIME Implementation
 * 
 * Adds rich semantic context to pattern metrics, capturing the "why"
 * behind governance decisions for improved TIME dimension (Decision Audit Coverage)
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SemanticContext {
  /**
   * Primary reason for the governance decision/action
   */
  rationale: string;
  
  /**
   * The trigger event or condition that led to this action
   */
  trigger: {
    type: 'policy_violation' | 'threshold_exceeded' | 'manual_override' | 'adaptive_learning' | 'scheduled' | 'cascade_prevention';
    description: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
  
  /**
   * What alternatives were considered
   */
  alternatives_considered?: string[];
  
  /**
   * Why this action was chosen over alternatives
   */
  decision_factors?: {
    factor: string;
    weight: number;
    reasoning: string;
  }[];
  
  /**
   * Expected outcome of this action
   */
  expected_outcome: string;
  
  /**
   * How success will be measured
   */
  success_criteria?: string[];
  
  /**
   * Related governance policies
   */
  related_policies?: string[];
  
  /**
   * Historical context (similar past decisions)
   */
  historical_context?: {
    similar_decisions: number;
    success_rate: number;
    avg_impact: number;
  };
  
  /**
   * Risk assessment
   */
  risk_assessment?: {
    pre_action_risk: number;
    post_action_risk: number;
    risk_reduction: number;
    residual_risks: string[];
  };
  
  /**
   * Stakeholders impacted
   */
  stakeholders?: {
    circle?: string;
    ceremony?: string;
    affected_systems?: string[];
  };
  
  /**
   * Confidence level in this decision (0-1)
   */
  confidence: number;
  
  /**
   * Decision maker (human or automated)
   */
  decision_maker: 'governance_system' | 'circuit_breaker' | 'health_monitor' | 'manual_intervention' | 'adaptive_agent';
  
  /**
   * Compliance alignment
   */
  compliance: {
    aligned_policies: string[];
    potential_conflicts: string[];
    overall_compliance_impact: number; // Change in compliance score (-100 to +100)
  };
}

export interface EnrichedPatternEvent {
  // Original pattern event fields
  ts: string;
  pattern: string;
  mode: string;
  mutation: boolean;
  gate: string;
  circle: string;
  correlation_id?: string;
  
  // Enhanced semantic context
  semantic_context?: SemanticContext;
  
  // Decision lineage
  decision_lineage?: {
    parent_decision_id?: string;
    influenced_by?: string[];
    influences?: string[];
  };
  
  // Outcome tracking
  outcome_tracking?: {
    expected_duration_ms?: number;
    expected_impact_score?: number;
    verification_timestamp?: string;
    actual_outcome?: 'success' | 'failure' | 'partial' | 'pending';
  };
}

export interface ContextEnricherConfig {
  goalieDir?: string;
  enableHistoricalAnalysis?: boolean;
  confidenceThreshold?: number;
}

export class SemanticContextEnricher {
  private goalieDir: string;
  private config: ContextEnricherConfig;
  private decisionHistory: Map<string, SemanticContext[]> = new Map();
  
  constructor(config?: ContextEnricherConfig) {
    this.config = {
      goalieDir: config?.goalieDir || process.env.GOALIE_DIR || '.goalie',
      enableHistoricalAnalysis: config?.enableHistoricalAnalysis !== false,
      confidenceThreshold: config?.confidenceThreshold || 0.7
    };
    this.goalieDir = this.config.goalieDir;
    
    if (this.config.enableHistoricalAnalysis) {
      this.loadDecisionHistory();
    }
  }
  
  /**
   * Enrich a pattern event with semantic context
   */
  enrichEvent(
    event: any,
    context: Partial<SemanticContext>
  ): EnrichedPatternEvent {
    const enriched: EnrichedPatternEvent = {
      ...event,
      semantic_context: this.buildSemanticContext(event, context)
    };
    
    // Add decision lineage if available
    if (this.config.enableHistoricalAnalysis) {
      enriched.decision_lineage = this.inferDecisionLineage(event, context);
    }
    
    // Add outcome tracking
    enriched.outcome_tracking = {
      expected_duration_ms: context.expected_outcome ? 60000 : undefined,
      expected_impact_score: this.estimateImpactScore(event, context),
      verification_timestamp: new Date(Date.now() + 3600000).toISOString(),
      actual_outcome: 'pending'
    };
    
    return enriched;
  }
  
  /**
   * Build semantic context from partial input
   */
  private buildSemanticContext(
    event: any,
    partial: Partial<SemanticContext>
  ): SemanticContext {
    const historical = this.config.enableHistoricalAnalysis
      ? this.getHistoricalContext(event.pattern)
      : undefined;
    
    const riskAssessment = this.assessRisk(event, partial);
    const compliance = this.assessCompliance(event, partial);
    
    return {
      rationale: partial.rationale || this.inferRationale(event),
      trigger: partial.trigger || this.inferTrigger(event),
      alternatives_considered: partial.alternatives_considered || this.inferAlternatives(event),
      decision_factors: partial.decision_factors || this.inferDecisionFactors(event),
      expected_outcome: partial.expected_outcome || this.inferExpectedOutcome(event),
      success_criteria: partial.success_criteria || this.inferSuccessCriteria(event),
      related_policies: partial.related_policies || this.findRelatedPolicies(event),
      historical_context: historical,
      risk_assessment: riskAssessment,
      stakeholders: partial.stakeholders || this.identifyStakeholders(event),
      confidence: partial.confidence || this.calculateConfidence(event, partial),
      decision_maker: partial.decision_maker || this.identifyDecisionMaker(event),
      compliance
    };
  }
  
  /**
   * Infer rationale from event properties
   */
  private inferRationale(event: any): string {
    if (event.pattern?.includes('circuit-breaker')) {
      return 'Circuit breaker triggered to prevent cascading failures and protect system stability';
    }
    if (event.pattern?.includes('health')) {
      return 'Health check performed to validate system state and detect anomalies';
    }
    if (event.pattern?.includes('guardrail')) {
      return 'Guardrail enforcement to maintain governance compliance and prevent policy violations';
    }
    if (event.mode === 'enforcement') {
      return 'Enforcement action required to maintain system integrity and compliance';
    }
    if (event.mutation) {
      return 'Adaptive mutation to optimize system behavior based on observed patterns';
    }
    
    return `Pattern '${event.pattern}' executed to maintain operational excellence`;
  }
  
  /**
   * Infer trigger from event
   */
  private inferTrigger(event: any): SemanticContext['trigger'] {
    if (event.pattern?.includes('circuit-breaker')) {
      return {
        type: 'threshold_exceeded',
        description: 'Error rate or latency threshold exceeded',
        severity: 'critical'
      };
    }
    if (event.pattern?.includes('safe-degrade')) {
      return {
        type: 'cascade_prevention',
        description: 'System stress detected, safe degradation initiated',
        severity: 'high'
      };
    }
    if (event.gate === 'governance') {
      return {
        type: 'policy_violation',
        description: 'Governance gate validation required',
        severity: 'medium'
      };
    }
    if (event.mutation) {
      return {
        type: 'adaptive_learning',
        description: 'System learning triggered adaptive behavior',
        severity: 'low'
      };
    }
    
    return {
      type: 'scheduled',
      description: 'Routine operational pattern execution',
      severity: 'low'
    };
  }
  
  /**
   * Infer alternatives that were considered
   */
  private inferAlternatives(event: any): string[] {
    const alternatives: string[] = [];
    
    if (event.pattern?.includes('circuit-breaker')) {
      alternatives.push('Continue with increased error logging');
      alternatives.push('Gradual throttling instead of immediate break');
      alternatives.push('Route to backup service');
    }
    
    if (event.pattern?.includes('safe-degrade')) {
      alternatives.push('Full system shutdown');
      alternatives.push('Maintain full functionality with increased risk');
      alternatives.push('Partial feature disable');
    }
    
    if (event.mode === 'advisory') {
      alternatives.push('Upgrade to enforcement mode');
      alternatives.push('Log only without action');
    }
    
    return alternatives;
  }
  
  /**
   * Infer decision factors
   */
  private inferDecisionFactors(event: any): SemanticContext['decision_factors'] {
    const factors: SemanticContext['decision_factors'] = [];
    
    if (event.economic?.wsjf_score) {
      factors.push({
        factor: 'Economic Value',
        weight: 0.3,
        reasoning: `WSJF score of ${event.economic.wsjf_score} indicates high business value`
      });
    }
    
    if (event.gate === 'governance') {
      factors.push({
        factor: 'Compliance Requirement',
        weight: 0.4,
        reasoning: 'Governance gate mandates policy compliance'
      });
    }
    
    if (event.mutation) {
      factors.push({
        factor: 'Adaptive Learning',
        weight: 0.2,
        reasoning: 'Historical patterns suggest optimization opportunity'
      });
    }
    
    factors.push({
      factor: 'System Stability',
      weight: 0.3,
      reasoning: 'Action chosen to minimize operational risk'
    });
    
    return factors;
  }
  
  /**
   * Infer expected outcome
   */
  private inferExpectedOutcome(event: any): string {
    if (event.pattern?.includes('circuit-breaker')) {
      return 'Prevent cascading failures, maintain system availability at reduced capacity';
    }
    if (event.pattern?.includes('health')) {
      return 'Validate system health metrics, identify anomalies early';
    }
    if (event.pattern?.includes('guardrail')) {
      return 'Maintain governance compliance, prevent policy violations';
    }
    if (event.mode === 'enforcement') {
      return 'Enforce policy compliance, block non-compliant actions';
    }
    
    return 'Improve system reliability and operational excellence';
  }
  
  /**
   * Infer success criteria
   */
  private inferSuccessCriteria(event: any): string[] {
    const criteria: string[] = [];
    
    if (event.pattern?.includes('circuit-breaker')) {
      criteria.push('Error rate drops below threshold within 5 minutes');
      criteria.push('No cascading failures observed');
      criteria.push('Service availability maintained above 95%');
    }
    
    if (event.pattern?.includes('health')) {
      criteria.push('All health metrics within acceptable ranges');
      criteria.push('No critical anomalies detected');
      criteria.push('Response time under 200ms');
    }
    
    if (event.gate === 'governance') {
      criteria.push('Compliance score above 90%');
      criteria.push('No critical policy violations');
    }
    
    return criteria;
  }
  
  /**
   * Find related policies
   */
  private findRelatedPolicies(event: any): string[] {
    const policies: string[] = [];
    
    if (event.pattern) {
      policies.push(`pattern-compliance-${event.pattern}`);
    }
    if (event.gate) {
      policies.push(`gate-policy-${event.gate}`);
    }
    if (event.mutation) {
      policies.push('mutation-governance');
    }
    if (event.mode === 'enforcement') {
      policies.push('enforcement-mode-required');
    }
    
    return policies;
  }
  
  /**
   * Get historical context for a pattern
   */
  private getHistoricalContext(pattern: string): SemanticContext['historical_context'] | undefined {
    const history = this.decisionHistory.get(pattern);
    if (!history || history.length === 0) {
      return undefined;
    }
    
    const successCount = history.filter(h => 
// @ts-expect-error - Type incompatibility requires refactoring
      h.outcome_tracking?.actual_outcome === 'success'
    ).length;
    
    return {
      similar_decisions: history.length,
      success_rate: history.length > 0 ? successCount / history.length : 0,
      avg_impact: history.reduce((sum, h) => 
        sum + (h.risk_assessment?.risk_reduction || 0), 0
      ) / history.length
    };
  }
  
  /**
   * Assess risk
   */
  private assessRisk(event: any, context: Partial<SemanticContext>): SemanticContext['risk_assessment'] {
    const severity = context.trigger?.severity || 'low';
    const severityScores = { low: 10, medium: 30, high: 60, critical: 90 };
    const preActionRisk = severityScores[severity];
    const postActionRisk = event.mode === 'enforcement' ? preActionRisk * 0.2 : preActionRisk * 0.5;
    
    return {
      pre_action_risk: preActionRisk,
      post_action_risk: postActionRisk,
      risk_reduction: preActionRisk - postActionRisk,
      residual_risks: this.identifyResidualRisks(event)
    };
  }
  
  /**
   * Identify residual risks
   */
  private identifyResidualRisks(event: any): string[] {
    const risks: string[] = [];
    
    if (event.pattern?.includes('circuit-breaker')) {
      risks.push('Service degradation during recovery');
      risks.push('False positive breaking on legitimate traffic');
    }
    
    if (event.mode === 'advisory') {
      risks.push('Policy violations may continue without enforcement');
    }
    
    if (event.mutation) {
      risks.push('Adaptive changes may introduce unexpected behavior');
    }
    
    return risks;
  }
  
  /**
   * Assess compliance impact
   */
  private assessCompliance(event: any, context: Partial<SemanticContext>): SemanticContext['compliance'] {
    const aligned = context.related_policies || this.findRelatedPolicies(event);
    const conflicts: string[] = [];
    
    // Check for potential conflicts
    if (event.mode === 'advisory' && event.gate === 'governance') {
      conflicts.push('Advisory mode conflicts with governance gate enforcement requirement');
    }
    
    const impactScore = event.mode === 'enforcement' ? 20 : event.mutation ? 10 : 5;
    
    return {
      aligned_policies: aligned,
      potential_conflicts: conflicts,
      overall_compliance_impact: impactScore
    };
  }
  
  /**
   * Identify stakeholders
   */
  private identifyStakeholders(event: any): SemanticContext['stakeholders'] {
    const affected_systems: string[] = [];
    
    if (event.pattern?.includes('circuit-breaker')) {
      affected_systems.push('load-balancer', 'api-gateway', 'downstream-services');
    }
    if (event.pattern?.includes('health')) {
      affected_systems.push('monitoring-platform', 'alerting-system');
    }
    
    return {
      circle: event.circle || 'unknown',
      ceremony: event.gate || undefined,
      affected_systems
    };
  }
  
  /**
   * Calculate confidence in decision
   */
  private calculateConfidence(event: any, context: Partial<SemanticContext>): number {
    let confidence = 0.5;
    
    // Increase confidence if mode is enforcement
    if (event.mode === 'enforcement') confidence += 0.2;
    
    // Increase if governance gate
    if (event.gate === 'governance') confidence += 0.15;
    
    // Increase if historical data available
    if (this.config.enableHistoricalAnalysis) {
      const history = this.decisionHistory.get(event.pattern);
      if (history && history.length > 5) {
        confidence += 0.15;
      }
    }
    
    // Decrease if mutation (less certain)
    if (event.mutation) confidence -= 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Identify decision maker
   */
  private identifyDecisionMaker(event: any): SemanticContext['decision_maker'] {
    if (event.pattern?.includes('circuit-breaker')) {
      return 'circuit_breaker';
    }
    if (event.pattern?.includes('health')) {
      return 'health_monitor';
    }
    if (event.gate === 'governance') {
      return 'governance_system';
    }
    if (event.mutation) {
      return 'adaptive_agent';
    }
    
    return 'governance_system';
  }
  
  /**
   * Infer decision lineage
   */
  private inferDecisionLineage(event: any, context: Partial<SemanticContext>): EnrichedPatternEvent['decision_lineage'] {
    // This would be enhanced with actual decision tracking
    return {
      parent_decision_id: undefined,
      influenced_by: [],
      influences: []
    };
  }
  
  /**
   * Estimate impact score
   */
  private estimateImpactScore(event: any, context: Partial<SemanticContext>): number {
    let score = 50;
    
    if (event.economic?.wsjf_score) {
      score += event.economic.wsjf_score * 10;
    }
    
    const severity = context.trigger?.severity;
    if (severity === 'critical') score += 40;
    else if (severity === 'high') score += 30;
    else if (severity === 'medium') score += 15;
    
    return Math.min(100, score);
  }
  
  /**
   * Load decision history from pattern metrics
   */
  private loadDecisionHistory(): void {
    const metricsPath = join(this.goalieDir, 'pattern_metrics.jsonl');
    if (!existsSync(metricsPath)) {
      return;
    }
    
    try {
      const content = readFileSync(metricsPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.semantic_context) {
            const pattern = event.pattern;
            if (!this.decisionHistory.has(pattern)) {
              this.decisionHistory.set(pattern, []);
            }
            this.decisionHistory.get(pattern)!.push(event.semantic_context);
          }
        } catch {
          // Skip invalid lines
        }
      }
    } catch (error) {
      console.error('Failed to load decision history:', error);
    }
  }
  
  /**
   * Write enriched event to pattern metrics
   */
  writeEnrichedEvent(enrichedEvent: EnrichedPatternEvent): void {
    const metricsPath = join(this.goalieDir, 'pattern_metrics.jsonl');
    try {
      appendFileSync(metricsPath, JSON.stringify(enrichedEvent) + '\n');
    } catch (error) {
      console.error('Failed to write enriched event:', error);
    }
  }
  
  /**
   * Analyze semantic context coverage
   */
  analyzeContextCoverage(hours: number = 24): {
    total_events: number;
    enriched_events: number;
    coverage_percentage: number;
    patterns_with_context: string[];
    patterns_without_context: string[];
  } {
    const metricsPath = join(this.goalieDir, 'pattern_metrics.jsonl');
    if (!existsSync(metricsPath)) {
      return {
        total_events: 0,
        enriched_events: 0,
        coverage_percentage: 0,
        patterns_with_context: [],
        patterns_without_context: []
      };
    }
    
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const patternsWithContext = new Set<string>();
    const patternsWithoutContext = new Set<string>();
    let total = 0;
    let enriched = 0;
    
    try {
      const content = readFileSync(metricsPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (new Date(event.ts) < cutoff) continue;
          
          total++;
          if (event.semantic_context) {
            enriched++;
            patternsWithContext.add(event.pattern);
          } else {
            patternsWithoutContext.add(event.pattern);
          }
        } catch {
          // Skip invalid lines
        }
      }
    } catch (error) {
      console.error('Failed to analyze context coverage:', error);
    }
    
    return {
      total_events: total,
      enriched_events: enriched,
      coverage_percentage: total > 0 ? (enriched / total) * 100 : 0,
      patterns_with_context: Array.from(patternsWithContext),
      patterns_without_context: Array.from(patternsWithoutContext)
    };
  }
}

export default SemanticContextEnricher;
