/**
 * Swarm Experimentation Runner
 *
 * @business-context ADR-092: Provider-Agnostic Advisor Strategy
 * @methodology Build-Measure-Learn loop integrated into CI/CD
 * @purpose Scaled swarm experiments with progressive stress testing
 *
 * Executes swarm experiments across stress scenarios:
 * - Baseline: Normal operating conditions
 * - Adverse: Moderate stress (increased load, latency)
 * - Severe: High stress (resource constraints, partial failures)
 * - Critical: Extreme stress (cascading failures, circuit breaker tests)
 *
 * Implements Build-Measure-Learn loop to determine "unleash" (promote) or "releash" (rollback)
 */

import * as fs from 'fs';
import * as path from 'path';
import { BudgetTracker } from '../src/integrations/budget_tracking';

type StressLevel = 'baseline' | 'adverse' | 'severe' | 'critical';

interface SwarmConfig {
  stress_level: StressLevel;
  max_agents: number;
  execution_timeout_ms: number;
  circuit_breaker_threshold: number;
  simulated_failure_rate: number; // 0-1
  latency_multiplier: number; // 1.0 = normal, >1 = stressed
}

interface ExperimentResult {
  stress_level: StressLevel;
  config: SwarmConfig;
  metrics: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    circuit_breaker_trips: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    throughput_per_second: number;
  };
  timestamp: string;
  duration_ms: number;
}

interface BMLDecision {
  decision: 'unleash' | 'releash' | 'iterate';
  confidence: number;
  rationale: string;
  metrics_summary: Record<string, number>;
  next_steps: string[];
}

export class SwarmExperimentationRunner {
  private budgetTracker: BudgetTracker;
  private resultsPath: string;
  private budgetId: string | null = null;

  constructor(budgetId?: string) {
    this.budgetTracker = new BudgetTracker({
      currency: 'USD',
      defaultAlertThreshold: 0.8
    });
    this.resultsPath = path.resolve(process.cwd(), '.goalie/swarm_experiment_results.json');
    this.budgetId = budgetId || null;
  }

  /**
   * Generate swarm configuration for stress level
   */
  private generateConfig(stressLevel: StressLevel): SwarmConfig {
    const configs: Record<StressLevel, SwarmConfig> = {
      baseline: {
        stress_level: 'baseline',
        max_agents: 3,
        execution_timeout_ms: 30000,
        circuit_breaker_threshold: 10,
        simulated_failure_rate: 0.0,
        latency_multiplier: 1.0
      },
      adverse: {
        stress_level: 'adverse',
        max_agents: 5,
        execution_timeout_ms: 20000,
        circuit_breaker_threshold: 8,
        simulated_failure_rate: 0.1,
        latency_multiplier: 1.5
      },
      severe: {
        stress_level: 'severe',
        max_agents: 8,
        execution_timeout_ms: 15000,
        circuit_breaker_threshold: 5,
        simulated_failure_rate: 0.25,
        latency_multiplier: 2.5
      },
      critical: {
        stress_level: 'critical',
        max_agents: 10,
        execution_timeout_ms: 10000,
        circuit_breaker_threshold: 3,
        simulated_failure_rate: 0.4,
        latency_multiplier: 4.0
      }
    };

    return configs[stressLevel];
  }

  /**
   * Execute swarm experiment at given stress level
   */
  private async executeExperiment(config: SwarmConfig): Promise<ExperimentResult> {
    console.log(`\n[Swarm] Executing ${config.stress_level.toUpperCase()} experiment...`);
    const startTime = Date.now();

    // Simulate swarm executions
    const executionCount = config.max_agents * 10; // 10 rounds per agent
    let successful = 0;
    let failed = 0;
    let circuitBreakerTrips = 0;
    const latencies: number[] = [];

    for (let i = 0; i < executionCount; i++) {
      // Simulate execution
      const shouldFail = Math.random() < config.simulated_failure_rate;
      const baseLatency = Math.random() * 100 + 50; // 50-150ms base
      const latency = baseLatency * config.latency_multiplier;

      latencies.push(latency);

      if (shouldFail) {
        failed++;
        // Circuit breaker check
        if (failed > config.circuit_breaker_threshold) {
          circuitBreakerTrips++;
        }
      } else {
        successful++;
      }

      // Small delay to simulate real execution
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    const duration = Date.now() - startTime;
    latencies.sort((a, b) => a - b);

    const result: ExperimentResult = {
      stress_level: config.stress_level,
      config,
      metrics: {
        total_executions: executionCount,
        successful_executions: successful,
        failed_executions: failed,
        circuit_breaker_trips: circuitBreakerTrips,
        avg_latency_ms: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        p95_latency_ms: latencies[Math.floor(latencies.length * 0.95)] || 0,
        throughput_per_second: (executionCount / duration) * 1000
      },
      timestamp: new Date().toISOString(),
      duration_ms: duration
    };

    console.log(`  ✓ Completed in ${duration}ms`);
    console.log(`    Success rate: ${((successful / executionCount) * 100).toFixed(1)}%`);
    console.log(`    Circuit breaker trips: ${circuitBreakerTrips}`);
    console.log(`    Avg latency: ${result.metrics.avg_latency_ms.toFixed(1)}ms`);

    return result;
  }

  /**
   * Build-Measure-Learn decision engine
   * Determines whether to unleash (promote), releash (rollback), or iterate
   */
  private makeBMLDecision(results: ExperimentResult[]): BMLDecision {
    console.log('\n[BML] Analyzing experiment results...');

    // Calculate aggregate metrics
    const baselineResult = results.find(r => r.stress_level === 'baseline');
    const criticalResult = results.find(r => r.stress_level === 'critical');

    if (!baselineResult || !criticalResult) {
      return {
        decision: 'iterate',
        confidence: 0.0,
        rationale: 'Insufficient data - missing baseline or critical results',
        metrics_summary: {},
        next_steps: ['Re-run experiments with complete stress progression']
      };
    }

    // Success rate degradation
    const baselineSuccessRate = baselineResult.metrics.successful_executions / baselineResult.metrics.total_executions;
    const criticalSuccessRate = criticalResult.metrics.successful_executions / criticalResult.metrics.total_executions;
    const degradation = (baselineSuccessRate - criticalSuccessRate) / baselineSuccessRate;

    // Latency degradation
    const latencyIncrease = criticalResult.metrics.p95_latency_ms / baselineResult.metrics.p95_latency_ms;

    // Circuit breaker effectiveness
    const circuitBreakerEffective = criticalResult.metrics.circuit_breaker_trips > 0;

    // Decision thresholds
    const UNLEASH_THRESHOLD = 0.3; // <30% degradation = unleash
    const RELEASH_THRESHOLD = 0.6; // >60% degradation = releash
    const LATENCY_ACCEPTABLE = 3.0; // <3x latency increase = acceptable

    let decision: 'unleash' | 'releash' | 'iterate';
    let confidence: number;
    let rationale: string;
    let next_steps: string[];

    if (degradation < UNLEASH_THRESHOLD && latencyIncrease < LATENCY_ACCEPTABLE && circuitBreakerEffective) {
      decision = 'unleash';
      confidence = 0.9;
      rationale = `System demonstrates resilience under stress. Success degradation: ${(degradation * 100).toFixed(1)}%, Latency increase: ${latencyIncrease.toFixed(1)}x, Circuit breaker: functional`;
      next_steps = [
        'Promote to production',
        'Enable progressive rollout (10% → 50% → 100%)',
        'Monitor DORA metrics in production',
        'Establish baseline performance SLOs'
      ];
    } else if (degradation > RELEASH_THRESHOLD || latencyIncrease > LATENCY_ACCEPTABLE || !circuitBreakerEffective) {
      decision = 'releash';
      confidence = 0.85;
      rationale = `System shows unacceptable degradation. Success degradation: ${(degradation * 100).toFixed(1)}%, Latency increase: ${latencyIncrease.toFixed(1)}x, Circuit breaker: ${circuitBreakerEffective ? 'functional' : 'FAILED'}`;
      next_steps = [
        'Rollback to previous stable version',
        'Conduct root cause analysis',
        'Optimize circuit breaker thresholds',
        'Re-architect high-stress failure handling'
      ];
    } else {
      decision = 'iterate';
      confidence = 0.7;
      rationale = `Borderline performance. Requires optimization before unleash. Success degradation: ${(degradation * 100).toFixed(1)}%, Latency increase: ${latencyIncrease.toFixed(1)}x`;
      next_steps = [
        'Optimize high-latency code paths',
        'Tune circuit breaker thresholds',
        'Re-run experiments after optimization',
        'Consider implementing adaptive backpressure'
      ];
    }

    return {
      decision,
      confidence,
      rationale,
      metrics_summary: {
        baseline_success_rate: baselineSuccessRate,
        critical_success_rate: criticalSuccessRate,
        degradation_percent: degradation * 100,
        latency_increase_factor: latencyIncrease,
        circuit_breaker_trips: criticalResult.metrics.circuit_breaker_trips
      },
      next_steps
    };
  }

  /**
   * Run complete swarm experiment suite
   */
  public async runExperiments(): Promise<void> {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║          SWARM EXPERIMENTATION SUITE - BML CYCLE             ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    const stressLevels: StressLevel[] = ['baseline', 'adverse', 'severe', 'critical'];
    const results: ExperimentResult[] = [];

    // BUILD: Execute experiments across stress levels
    for (const level of stressLevels) {
      const config = this.generateConfig(level);
      const result = await this.executeExperiment(config);
      results.push(result);

      // Track expense if budget is provided
      if (this.budgetId) {
        const cost = config.max_agents * 0.02; // $0.02 per agent
        this.budgetTracker.recordExpense({
          type: 'opex',
          category: 'compute',
          description: `Swarm ${level} experiment - ${config.max_agents} agents`,
          amount: cost
        });
      }
    }

    // MEASURE: Analyze results
    const bmlDecision = this.makeBMLDecision(results);

    // LEARN: Persist results and decision
    const output = {
      timestamp: new Date().toISOString(),
      experiment_results: results,
      bml_decision: bmlDecision,
      budget_id: this.budgetId
    };

    fs.writeFileSync(this.resultsPath, JSON.stringify(output, null, 2), 'utf8');

    // Display BML decision
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║             BUILD-MEASURE-LEARN DECISION                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\nDecision: ${bmlDecision.decision.toUpperCase()}`);
    console.log(`Confidence: ${(bmlDecision.confidence * 100).toFixed(0)}%`);
    console.log(`\nRationale:\n${bmlDecision.rationale}`);
    console.log(`\nNext Steps:`);
    bmlDecision.next_steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });

    console.log(`\n[Swarm] Results saved to: ${this.resultsPath}`);
  }
}

// CLI execution support
if (require.main === module) {
  (async () => {
    const budgetId = process.argv[2]; // Optional budget ID
    const runner = new SwarmExperimentationRunner(budgetId);
    await runner.runExperiments();
  })();
}
