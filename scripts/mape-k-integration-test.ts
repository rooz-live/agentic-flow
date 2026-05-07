/**
 * MAPE-K Integration Test & Demonstration
 *
 * @business-context ADR-092: Provider-Agnostic Advisor Strategy with self-optimization
 * @purpose End-to-end test of MAPE-K self-adaptive loop with multi-agent hierarchy
 *
 * Demonstrates:
 * 1. Basic MAPE-K loop (Monitor → Analyze → Plan → Execute → Knowledge)
 * 2. Multi-agent recursive validation with dual-loop feedback
 * 3. Edge-IoT-Cloud continuum optimization
 * 4. Knowledge consolidation and learning
 */

import * as fs from 'fs';
import * as path from 'path';
import { MAPEKLoop } from '../src/routing/advisor/mape-k-loop';
import { MultiAgentMAPEK } from '../src/routing/advisor/multi-agent-mape-k';
import { FakeDoorE2BSimulation } from './fake-door-e2b-simulation';
import { SwarmExperimentationRunner } from './swarm-experimentation-runner';

interface IntegrationTestResults {
  timestamp: string;
  mape_k_results: {
    loop_ran: boolean;
    adaptations_triggered: number;
    knowledge_entries_created: number;
  };
  multi_agent_results: {
    agents_initialized: number;
    tasks_processed: number;
    refinements_applied: number;
  };
  e2b_simulation_results: {
    simulations_executed: number;
    success_rate: number;
    avg_latency_ms: number;
  };
  swarm_experiment_results: {
    experiments_completed: number;
    bml_decision: string;
    confidence: number;
  };
}

export class MAPEKIntegrationTest {
  private resultsPath: string;

  constructor() {
    this.resultsPath = path.resolve(process.cwd(), '.goalie/mape-k-integration-results.json');
  }

  /**
   * Test 1: Basic MAPE-K Loop
   */
  public async testBasicMAPEKLoop(): Promise<any> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST 1: Basic MAPE-K Self-Adaptive Loop');
    console.log('═══════════════════════════════════════════════════════════\n');

    const loop = new MAPEKLoop();

    // Start monitoring
    loop.start();

    // Run for 10 seconds
    await this.delay(10000);

    // Check status
    const status = loop.getStatus();
    console.log('MAPE-K Status:');
    console.log(`  Running: ${status.running}`);
    console.log(`  Knowledge entries: ${status.knowledge_entries}`);
    console.log(`  Recent adaptations: ${status.recent_adaptations}`);

    // Stop
    loop.stop();

    return {
      loop_ran: true,
      adaptations_triggered: status.recent_adaptations,
      knowledge_entries_created: status.knowledge_entries
    };
  }

  /**
   * Test 2: Multi-Agent Recursive Validation
   */
  public async testMultiAgentValidation(): Promise<any> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST 2: Multi-Agent Recursive Validation');
    console.log('═══════════════════════════════════════════════════════════\n');

    const multiAgent = new MultiAgentMAPEK();

    let tasksProcessed = 0;
    let refinementsApplied = 0;

    // Test 1: Geometry analysis
    console.log('[Task 1] Analyze system geometry...');
    const geometryResult = await multiAgent.processWithRecursiveValidation('analyze_geometry', {
      metrics: {
        timestamp: new Date().toISOString(),
        latency_ms: 150,
        throughput_rps: 120,
        circuit_breaker_trips: 1,
        error_rate: 0.03,
        cpu_percent: 65,
        memory_mb: 1400,
        active_agents: 5
      }
    });
    console.log('  ✓ Geometry analysis complete');
    tasksProcessed++;

    // Test 2: Optimization with refinement
    console.log('[Task 2] Optimize adaptation strategy...');
    const optimizationResult = await multiAgent.processWithRecursiveValidation('optimize_plan', {
      deviations: [
        {
          metric: 'latency_ms',
          current_value: 250,
          baseline_value: 100,
          deviation_percent: 150,
          threshold_exceeded: true,
          severity: 'critical' as const
        }
      ],
      metrics: {
        timestamp: new Date().toISOString(),
        latency_ms: 250,
        throughput_rps: 80,
        circuit_breaker_trips: 3,
        error_rate: 0.08,
        cpu_percent: 85,
        memory_mb: 1800,
        active_agents: 8
      }
    });
    console.log('  ✓ Optimization complete');
    tasksProcessed++;

    if (optimizationResult.self_edits) {
      refinementsApplied = optimizationResult.self_edits.length;
    }

    return {
      agents_initialized: 6, // primary + 5 specialists
      tasks_processed: tasksProcessed,
      refinements_applied: refinementsApplied
    };
  }

  /**
   * Test 3: E2B Fake Door Simulation
   */
  public async testE2BSimulation(): Promise<any> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST 3: E2B Fake Door Architectural Dry Run');
    console.log('═══════════════════════════════════════════════════════════\n');

    const simulation = new FakeDoorE2BSimulation();
    const telemetry = await simulation.runComprehensiveSimulation();

    return {
      simulations_executed: telemetry.payloads.length,
      success_rate: (telemetry.metrics.successful_simulations / telemetry.metrics.total_simulations) * 100,
      avg_latency_ms: telemetry.metrics.avg_duration_ms
    };
  }

  /**
   * Test 4: Swarm Experimentation with BML
   */
  public async testSwarmExperimentation(): Promise<any> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST 4: Swarm Experimentation (Build-Measure-Learn)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const runner = new SwarmExperimentationRunner();
    await runner.runExperiments();

    // Read results
    const resultsPath = path.resolve(process.cwd(), '.goalie/swarm_experiment_results.json');
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

    return {
      experiments_completed: results.experiment_results.length,
      bml_decision: results.bml_decision.decision,
      confidence: results.bml_decision.confidence
    };
  }

  /**
   * Run complete integration test suite
   */
  public async runFullIntegration(): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║      MAPE-K INTEGRATION TEST SUITE - FULL EXECUTION      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    const startTime = Date.now();

    // Run all tests
    const mapekResults = await this.testBasicMAPEKLoop();
    const multiAgentResults = await this.testMultiAgentValidation();
    const e2bResults = await this.testE2BSimulation();
    const swarmResults = await this.testSwarmExperimentation();

    const duration = Date.now() - startTime;

    // Compile results
    const integrationResults: IntegrationTestResults = {
      timestamp: new Date().toISOString(),
      mape_k_results: mapekResults,
      multi_agent_results: multiAgentResults,
      e2b_simulation_results: e2bResults,
      swarm_experiment_results: swarmResults
    };

    // Save results
    fs.mkdirSync(path.dirname(this.resultsPath), { recursive: true });
    fs.writeFileSync(this.resultsPath, JSON.stringify(integrationResults, null, 2), 'utf8');

    // Display summary
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║               INTEGRATION TEST SUMMARY                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\nTotal Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log('\n📊 MAPE-K Loop:');
    console.log(`   • Adaptations triggered: ${mapekResults.adaptations_triggered}`);
    console.log(`   • Knowledge entries: ${mapekResults.knowledge_entries_created}`);
    console.log('\n🤖 Multi-Agent System:');
    console.log(`   • Agents initialized: ${multiAgentResults.agents_initialized}`);
    console.log(`   • Tasks processed: ${multiAgentResults.tasks_processed}`);
    console.log(`   • Refinements applied: ${multiAgentResults.refinements_applied}`);
    console.log('\n🧪 E2B Simulation:');
    console.log(`   • Simulations executed: ${e2bResults.simulations_executed}`);
    console.log(`   • Success rate: ${e2bResults.success_rate.toFixed(1)}%`);
    console.log(`   • Avg latency: ${e2bResults.avg_latency_ms.toFixed(1)}ms`);
    console.log('\n🔬 Swarm Experiments:');
    console.log(`   • Experiments completed: ${swarmResults.experiments_completed}`);
    console.log(`   • BML Decision: ${swarmResults.bml_decision.toUpperCase()}`);
    console.log(`   • Confidence: ${(swarmResults.confidence * 100).toFixed(0)}%`);
    console.log(`\n✅ Results saved to: ${this.resultsPath}`);
    console.log('');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution support
if (require.main === module) {
  (async () => {
    const test = new MAPEKIntegrationTest();
    await test.runFullIntegration();
  })();
}
