/**
 * Predictive Simulation Engine
 *
 * Engine for running predictive simulations to support decision-making and planning
 */

import { EventEmitter } from 'events';
import {
  PredictiveSimulation,
  SimulationModel,
  SimulationScenario,
  SimulationResult
} from './types';
import { GLMIntegration } from './glm-integration';

export class PredictiveSimulator extends EventEmitter {
  private simulations: Map<string, PredictiveSimulation> = new Map();
  private glmIntegration: GLMIntegration;
  private runningSimulations: Set<string> = new Set();

  constructor(glmIntegration: GLMIntegration) {
    super();
    this.glmIntegration = glmIntegration;
  }

  createSimulation(simulation: Omit<PredictiveSimulation, 'id' | 'results' | 'status'>): PredictiveSimulation {
    const fullSimulation: PredictiveSimulation = {
      ...simulation,
      id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      results: [],
      status: 'pending'
    };

    this.simulations.set(fullSimulation.id, fullSimulation);
    this.emit('simulation-created', fullSimulation);

    return fullSimulation;
  }

  async runSimulation(simulationId: string): Promise<SimulationResult[]> {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) {
      throw new Error(`Simulation not found: ${simulationId}`);
    }

    if (this.runningSimulations.has(simulationId)) {
      throw new Error(`Simulation already running: ${simulationId}`);
    }

    this.runningSimulations.add(simulationId);
    simulation.status = 'running';
    this.emit('simulation-started', simulation);

    try {
      const results: SimulationResult[] = [];

      for (const scenario of simulation.scenarios) {
        const result = await this.executeScenario(simulation.model, scenario);
        results.push(result);
        simulation.results.push(result);
      }

      simulation.status = 'completed';
      this.emit('simulation-completed', { simulation, results });

      return results;
    } catch (error) {
      simulation.status = 'failed';
      this.emit('simulation-failed', { simulation, error });
      throw error;
    } finally {
      this.runningSimulations.delete(simulationId);
    }
  }

  private async executeScenario(
    model: SimulationModel,
    scenario: SimulationScenario
  ): Promise<SimulationResult> {
    const startTime = Date.now();

    try {
      let outputs: Record<string, any> = {};

      switch (model.type) {
        case 'agentic-flow':
          outputs = await this.simulateAgenticFlow(scenario.inputs);
          break;
        case 'economic':
          outputs = await this.simulateEconomicModel(scenario.inputs);
          break;
        case 'risk':
          outputs = await this.simulateRiskAssessment(scenario.inputs);
          break;
        case 'performance':
          outputs = await this.simulatePerformanceModel(scenario.inputs);
          break;
        default:
          outputs = { error: 'Unknown model type' };
      }

      // Use GLM for additional analysis
      const glmAnalysis = await this.glmIntegration.predictOutcome({
        model: model.type,
        inputs: scenario.inputs,
        outputs,
        expectedOutputs: scenario.expectedOutputs
      });

      const confidence = this.calculateConfidence(outputs, scenario.expectedOutputs, glmAnalysis.confidence);

      return {
        scenarioId: scenario.id,
        outputs,
        confidence,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        scenarioId: scenario.id,
        outputs: { error: error.message },
        confidence: 0,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  private async simulateAgenticFlow(inputs: Record<string, any>): Promise<Record<string, any>> {
    // Mock agentic flow simulation
    const baseDelay = Math.random() * 1000 + 500;
    await new Promise(resolve => setTimeout(resolve, baseDelay));

    return {
      planSuccessRate: Math.random() * 0.3 + 0.7,
      actionCompletionTime: Math.random() * 5000 + 1000,
      resourceUtilization: Math.random() * 0.4 + 0.6,
      convergenceIterations: Math.floor(Math.random() * 10) + 1,
      stabilityScore: Math.random() * 0.2 + 0.8
    };
  }

  private async simulateEconomicModel(inputs: Record<string, any>): Promise<Record<string, any>> {
    // Mock economic simulation
    const baseDelay = Math.random() * 800 + 300;
    await new Promise(resolve => setTimeout(resolve, baseDelay));

    const baseRevenue = inputs.initialInvestment || 10000;
    const growthRate = Math.random() * 0.3 + 0.1; // 10-40% growth
    const timeHorizon = inputs.timeHorizon || 12;

    return {
      projectedRevenue: baseRevenue * Math.pow(1 + growthRate, timeHorizon / 12),
      roi: (Math.pow(1 + growthRate, timeHorizon / 12) - 1) * 100,
      paybackPeriod: Math.random() * timeHorizon * 0.5 + 1,
      riskAdjustedReturn: growthRate * (1 - Math.random() * 0.3),
      cashFlowVariance: Math.random() * 0.2
    };
  }

  private async simulateRiskAssessment(inputs: Record<string, any>): Promise<Record<string, any>> {
    // Mock risk assessment simulation
    const baseDelay = Math.random() * 600 + 200;
    await new Promise(resolve => setTimeout(resolve, baseDelay));

    return {
      overallRiskScore: Math.random() * 0.7 + 0.1, // 0.1-0.8 scale
      technicalRisk: Math.random() * 0.6 + 0.2,
      operationalRisk: Math.random() * 0.5 + 0.3,
      financialRisk: Math.random() * 0.4 + 0.4,
      mitigationEffectiveness: Math.random() * 0.3 + 0.7,
      recommendedActions: Math.floor(Math.random() * 5) + 1
    };
  }

  private async simulatePerformanceModel(inputs: Record<string, any>): Promise<Record<string, any>> {
    // Mock performance simulation
    const baseDelay = Math.random() * 400 + 100;
    await new Promise(resolve => setTimeout(resolve, baseDelay));

    return {
      throughput: Math.random() * 1000 + 500,
      latency: Math.random() * 200 + 50,
      errorRate: Math.random() * 0.05,
      resourceEfficiency: Math.random() * 0.3 + 0.7,
      scalabilityIndex: Math.random() * 0.4 + 0.6,
      bottleneckProbability: Math.random() * 0.3
    };
  }

  private calculateConfidence(
    actualOutputs: Record<string, any>,
    expectedOutputs: Record<string, any>,
    glmConfidence: number
  ): number {
    let matchScore = 0;
    let totalFields = 0;

    for (const [key, expected] of Object.entries(expectedOutputs)) {
      if (key in actualOutputs) {
        totalFields++;
        const actual = actualOutputs[key];
        const diff = Math.abs(actual - expected);
        const relativeDiff = diff / Math.abs(expected || 1);
        matchScore += Math.max(0, 1 - relativeDiff);
      }
    }

    const outputMatchConfidence = totalFields > 0 ? matchScore / totalFields : 0.5;
    return (outputMatchConfidence + glmConfidence) / 2;
  }

  getSimulation(simulationId: string): PredictiveSimulation | undefined {
    return this.simulations.get(simulationId);
  }

  getAllSimulations(): PredictiveSimulation[] {
    return Array.from(this.simulations.values());
  }

  getRunningSimulations(): PredictiveSimulation[] {
    return Array.from(this.runningSimulations)
      .map(id => this.simulations.get(id))
      .filter(sim => sim !== undefined) as PredictiveSimulation[];
  }

  deleteSimulation(simulationId: string): boolean {
    const simulation = this.simulations.get(simulationId);
    if (simulation && simulation.status !== 'running') {
      this.simulations.delete(simulationId);
      this.emit('simulation-deleted', simulation);
      return true;
    }
    return false;
  }

  async getSimulationReport(simulationId: string): Promise<Record<string, any>> {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) {
      throw new Error(`Simulation not found: ${simulationId}`);
    }

    const completedScenarios = simulation.results.length;
    const avgConfidence = simulation.results.reduce((sum, r) => sum + r.confidence, 0) / completedScenarios;
    const avgExecutionTime = simulation.results.reduce((sum, r) => sum + r.executionTime, 0) / completedScenarios;

    return {
      simulation: {
        id: simulation.id,
        name: simulation.name,
        description: simulation.description,
        status: simulation.status
      },
      summary: {
        totalScenarios: simulation.scenarios.length,
        completedScenarios,
        averageConfidence: avgConfidence,
        averageExecutionTime: avgExecutionTime,
        successRate: completedScenarios / simulation.scenarios.length
      },
      results: simulation.results,
      recommendations: await this.generateRecommendations(simulation)
    };
  }

  private async generateRecommendations(simulation: PredictiveSimulation): Promise<string[]> {
    const recommendations: string[] = [];

    if (simulation.results.length === 0) return recommendations;

    const avgConfidence = simulation.results.reduce((sum, r) => sum + r.confidence, 0) / simulation.results.length;

    if (avgConfidence < 0.6) {
      recommendations.push('Consider refining input parameters for better prediction accuracy');
    }

    const highConfidenceResults = simulation.results.filter(r => r.confidence > 0.8);
    if (highConfidenceResults.length > 0) {
      recommendations.push('High-confidence scenarios identified - prioritize these for implementation');
    }

    // Use GLM for additional recommendations
    try {
      const glmAnalysis = await this.glmIntegration.getSuggestions({
        simulationType: simulation.model.type,
        results: simulation.results,
        confidence: avgConfidence
      });

      recommendations.push(...glmAnalysis.suggestions.slice(0, 3));
    } catch (error) {
      recommendations.push('Consider consulting domain experts for result interpretation');
    }

    return recommendations;
  }

  async healthCheck(): Promise<Record<string, any>> {
    return {
      totalSimulations: this.simulations.size,
      runningSimulations: this.runningSimulations.size,
      completedSimulations: Array.from(this.simulations.values())
        .filter(s => s.status === 'completed').length,
      failedSimulations: Array.from(this.simulations.values())
        .filter(s => s.status === 'failed').length,
      glmIntegration: await this.glmIntegration.healthCheck()
    };
  }
}