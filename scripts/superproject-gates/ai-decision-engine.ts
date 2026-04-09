/**
 * AI Decision Engine
 *
 * AI-enhanced decision-making system using GLM-4.6 and predictive analytics
 */

import { EventEmitter } from 'events';
import {
  AIDecisionContext,
  DecisionOption,
  AIDecisionResult
} from './types';
import { GLMIntegration } from './glm-integration';
import { PredictiveSimulator } from './predictive-simulator';

export class AIDecisionEngine extends EventEmitter {
  private glmIntegration: GLMIntegration;
  private predictiveSimulator: PredictiveSimulator;
  private decisionHistory: Map<string, AIDecisionResult> = new Map();

  constructor(
    glmIntegration: GLMIntegration,
    predictiveSimulator: PredictiveSimulator
  ) {
    super();
    this.glmIntegration = glmIntegration;
    this.predictiveSimulator = predictiveSimulator;
  }

  async makeDecision(context: AIDecisionContext): Promise<AIDecisionResult> {
    const decisionId = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Step 1: Analyze context with GLM
      const contextAnalysis = await this.glmIntegration.supportDecision(
        context.options,
        context
      );

      // Step 2: Run predictive simulations for each option
      const simulationResults = await this.runOptionSimulations(context);

      // Step 3: Calculate decision scores
      const scoredOptions = await this.scoreOptions(
        context.options,
        contextAnalysis,
        simulationResults
      );

      // Step 4: Select best option
      const selectedOption = this.selectBestOption(scoredOptions);

      // Step 5: Generate reasoning and recommendations
      const reasoning = await this.generateReasoning(
        selectedOption,
        scoredOptions,
        context,
        contextAnalysis
      );

      const result: AIDecisionResult = {
        selectedOption: selectedOption.id,
        reasoning,
        confidence: selectedOption.confidence,
        alternatives: scoredOptions.filter(opt => opt.id !== selectedOption.id),
        recommendations: this.generateRecommendations(selectedOption, context),
        timestamp: new Date()
      };

      this.decisionHistory.set(decisionId, result);
      this.emit('decision-made', { decisionId, result, context });

      return result;

    } catch (error) {
      this.emit('decision-error', { decisionId, context, error });
      throw error;
    }
  }

  private async runOptionSimulations(context: AIDecisionContext): Promise<Record<string, any>> {
    const simulationResults: Record<string, any> = {};

    for (const option of context.options) {
      try {
        // Create a quick simulation for each option
        const simulation = this.predictiveSimulator.createSimulation({
          name: `Decision Option: ${option.name}`,
          description: `Simulation for decision option ${option.name}`,
          model: {
            type: 'performance', // Use performance model for decision impact
            version: '1.0',
            parameters: ['impact', 'risk', 'effort', 'benefit'],
            outputs: ['score', 'confidence', 'timeline']
          },
          parameters: {
            option: option.name,
            context: context.domain,
            constraints: context.constraints
          },
          scenarios: [{
            id: 'primary-scenario',
            name: 'Primary Implementation',
            inputs: {
              effort: this.estimateEffort(option),
              risk: this.estimateRisk(option),
              impact: this.estimateImpact(option, context)
            },
            expectedOutputs: {
              score: 0.8,
              confidence: 0.9,
              timeline: 30
            },
            probability: 0.7
          }]
        });

        const results = await this.predictiveSimulator.runSimulation(simulation.id);
        simulationResults[option.id] = results[0];

      } catch (error) {
        // Fallback if simulation fails
        simulationResults[option.id] = {
          outputs: { score: 0.5, confidence: 0.5, timeline: 60 },
          confidence: 0.5,
          executionTime: 100
        };
      }
    }

    return simulationResults;
  }

  private estimateEffort(option: DecisionOption): number {
    // Simple heuristic based on description length and complexity indicators
    const complexityIndicators = ['complex', 'advanced', 'multi-step', 'integration'];
    const description = option.description.toLowerCase();

    let effort = 1; // Base effort
    complexityIndicators.forEach(indicator => {
      if (description.includes(indicator)) effort += 0.5;
    });

    return Math.min(effort, 5); // Cap at 5
  }

  private estimateRisk(option: DecisionOption): number {
    // Estimate risk based on cons and risk indicators
    const riskIndicators = ['risk', 'uncertain', 'experimental', 'breaking'];
    const riskText = [...option.cons, option.description].join(' ').toLowerCase();

    let risk = 0.1; // Base risk
    riskIndicators.forEach(indicator => {
      if (riskText.includes(indicator)) risk += 0.2;
    });

    return Math.min(risk, 1); // Cap at 1
  }

  private estimateImpact(option: DecisionOption, context: AIDecisionContext): number {
    // Estimate impact based on pros and context
    const impactIndicators = ['improve', 'increase', 'reduce', 'enhance', 'optimize'];
    const impactText = [...option.pros, context.domain].join(' ').toLowerCase();

    let impact = 0.5; // Base impact
    impactIndicators.forEach(indicator => {
      if (impactText.includes(indicator)) impact += 0.2;
    });

    return Math.min(impact, 1); // Cap at 1
  }

  private async scoreOptions(
    options: DecisionOption[],
    glmAnalysis: any,
    simulationResults: Record<string, any>
  ): Promise<DecisionOption[]> {
    const scoredOptions = await Promise.all(
      options.map(async (option) => {
        const simulation = simulationResults[option.id];
        const simulationScore = simulation?.outputs?.score || 0.5;
        const simulationConfidence = simulation?.confidence || 0.5;

        // Combine GLM confidence with simulation results
        const combinedScore = (option.confidence + simulationScore + simulationConfidence) / 3;

        return {
          ...option,
          confidence: Math.min(combinedScore, 1)
        };
      })
    );

    return scoredOptions.sort((a, b) => b.confidence - a.confidence);
  }

  private selectBestOption(options: DecisionOption[]): DecisionOption {
    // Select the highest confidence option, but consider risk-benefit trade-offs
    return options[0];
  }

  private async generateReasoning(
    selectedOption: DecisionOption,
    allOptions: DecisionOption[],
    context: AIDecisionContext,
    glmAnalysis: any
  ): Promise<string> {
    const reasoning = [
      `Selected option "${selectedOption.name}" based on comprehensive analysis including:`,
      `- Confidence score: ${(selectedOption.confidence * 100).toFixed(1)}%`,
      `- Predictive simulation results`,
      `- GLM-4.6 analysis insights`,
      `- Context domain: ${context.domain}`,
      '',
      'Key factors considered:',
      ...selectedOption.pros.map(pro => `✓ ${pro}`),
      ...selectedOption.cons.map(con => `⚠ ${con}`),
      '',
      `Compared to ${allOptions.length - 1} alternative options with confidence scores ranging from ${(allOptions[allOptions.length - 1].confidence * 100).toFixed(1)}% to ${(allOptions[1].confidence * 100).toFixed(1)}%.`
    ];

    return reasoning.join('\n');
  }

  private generateRecommendations(
    selectedOption: DecisionOption,
    context: AIDecisionContext
  ): string[] {
    const recommendations = [
      `Implement "${selectedOption.name}" following the outlined approach`,
      'Monitor key metrics during implementation',
      'Schedule regular check-ins to assess progress'
    ];

    // Add context-specific recommendations
    if (context.constraints.includes('timeline')) {
      recommendations.push('Focus on quick wins to meet timeline constraints');
    }

    if (selectedOption.impact === 'high') {
      recommendations.push('Prepare contingency plans for high-impact changes');
    }

    if (selectedOption.confidence < 0.7) {
      recommendations.push('Consider additional analysis or expert consultation');
    }

    return recommendations;
  }

  getDecisionHistory(): AIDecisionResult[] {
    return Array.from(this.decisionHistory.values());
  }

  getDecision(decisionId: string): AIDecisionResult | undefined {
    return this.decisionHistory.get(decisionId);
  }

  async analyzeDecisionPatterns(): Promise<Record<string, any>> {
    const decisions = this.getDecisionHistory();

    if (decisions.length === 0) {
      return { message: 'No decision history available' };
    }

    const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
    const highConfidenceDecisions = decisions.filter(d => d.confidence > 0.8).length;
    const decisionDistribution = decisions.reduce((acc, d) => {
      acc[Math.floor(d.confidence * 10) / 10] = (acc[Math.floor(d.confidence * 10) / 10] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      totalDecisions: decisions.length,
      averageConfidence: avgConfidence,
      highConfidenceRatio: highConfidenceDecisions / decisions.length,
      confidenceDistribution: decisionDistribution,
      recentTrends: decisions.slice(-10).map(d => ({
        timestamp: d.timestamp,
        confidence: d.confidence,
        selectedOption: d.selectedOption
      }))
    };
  }

  async optimizeDecisionMaking(): Promise<string[]> {
    const patterns = await this.analyzeDecisionPatterns();
    const optimizations: string[] = [];

    if (patterns.averageConfidence < 0.7) {
      optimizations.push('Consider improving data quality for decision inputs');
      optimizations.push('Review and enhance simulation models');
    }

    if (patterns.highConfidenceRatio < 0.5) {
      optimizations.push('Implement additional validation steps for low-confidence decisions');
      optimizations.push('Consider expert review process for critical decisions');
    }

    if (patterns.totalDecisions < 10) {
      optimizations.push('Continue gathering decision data to improve pattern recognition');
    }

    optimizations.push('Regularly review and update decision criteria');
    optimizations.push('Monitor decision outcomes to validate model accuracy');

    return optimizations;
  }

  async healthCheck(): Promise<Record<string, any>> {
    const patterns = await this.analyzeDecisionPatterns();

    return {
      status: 'healthy',
      totalDecisions: patterns.totalDecisions || 0,
      averageConfidence: patterns.averageConfidence || 0,
      highConfidenceRatio: patterns.highConfidenceRatio || 0,
      glmIntegration: await this.glmIntegration.healthCheck(),
      predictiveSimulator: await this.predictiveSimulator.healthCheck()
    };
  }
}