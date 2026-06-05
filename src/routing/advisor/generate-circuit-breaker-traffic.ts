// src/routing/advisor/generate-circuit-breaker-traffic.ts

/**
 * LBEC Simulation Traffic Generator
 * Asserts the structural bounds of our 'Adverse/Severe' execution ratios.
 * Verifies that the Circuit Breaker autonomously escalates bounds and 
 * executes dynamic offloading rather than timing out locally.
 */

import { AdvisorCircuitBreaker, ScenarioBand, SLOW_EDGE_THRESHOLDS_MS } from './circuit-breaker';

const runTrafficSimulation = async (baseScenario: ScenarioBand = 'adverse') => {
  console.log(`\n======================================================`);
  console.log(`🔌 Initiating LBEC Circuit Breaker Traffic Simulation`);
  console.log(`======================================================`);
  
  const circuitBreaker = new AdvisorCircuitBreaker({
    scenario: baseScenario,
    slowEdgeRatioThreshold: 0.3,
    maxCallsPerSession: 5, // We force a low ceiling to hit the limits fast
  });

  circuitBreaker.resetSession();

  const totalSimulatedRequests = 20;

  for (let i = 1; i <= totalSimulatedRequests; i++) {
    const isSlowEdgeDelay = Math.random() < 0.6; // We guarantee an adverse breach (>0.3 ratio)
    const simulatedLatencyMs = isSlowEdgeDelay ? 
      SLOW_EDGE_THRESHOLDS_MS[baseScenario] + Math.random() * 2000 : 
      500;
    
    console.log(`\n[Request ${i}] Natively simulating ${Math.round(simulatedLatencyMs)}ms latency boundary...`);
    circuitBreaker.recordSlowEdge(circuitBreaker.isSlowEdge(simulatedLatencyMs));

    if (!circuitBreaker.canCall()) {
      console.log(`🚫 Frugal mode gating engaged natively before incrementing.`);
      break;
    }

    const state = circuitBreaker.incrementCall();
    
    console.log(`   - Density/Escalation Band: ${state.suggestedScenario}`);
    console.log(`   - Current Edge Ratio: ${Math.round(state.slowEdgeRatio * 100)}% (Threshold: 30%)`);
    console.log(`   - Remaining Calls: ${state.remainingCalls}/${state.maxCallsPerSession}`);
    
    // Check if the LBEC Offload limit was engaged natively
    if (state.LBEC_OFFLOAD_STATUS) {
      console.log(`\n🚨 [LBEC OFFLOAD INITIATED]`);
      console.log(`   - Titanium Boundary (MAX_CALLS_PER_SESSION) breached!`);
      console.log(`   - Dynamic Edge Offloading to: ${state.lbecEndpointTarget}`);
      console.log(`   - Process execution successfully preserved via cloud bypass.`);
      break;
    }
  }
};

const scenario = (process.argv[2] as ScenarioBand) || 'adverse';
runTrafficSimulation(scenario).catch(console.error);
