// src/routing/advisor/pewma-density-scanner.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PEWMAScanner } from './pewma-density-scanner';

describe('PEWMA Density Scanner: Frugal Self-Optimization and Intentional Fails', () => {
  let scanner: PEWMAScanner;

  beforeEach(() => {
    // Initialize PEWMA Scanner with default threshold (0.25 density)
    scanner = new PEWMAScanner({ threshold: 0.25 });
  });

  it('should maintain baseline alpha (0.05) and local lbec routing during normal operation', () => {
    // Normal latencies (baseline scenario)
    const normalBurst = [40, 52, 48, 60, 55];
    
    let result;
    for (const latency of normalBurst) {
      result = scanner.registerObservation(latency, 0.1); // risk_score = 0.1
    }

    expect(result).toBeDefined();
    expect(result?.anomalyDetected).toBe(false);
    expect(result?.alpha).toBeCloseTo(0.05, 2);
    expect(result?.suggestedRouting).toBe('LOCAL_EDGE');
  });

  it('should spike alpha (0.3) and enforce Cloud Offload when executing the "Inverted Fake Door" payload', () => {
    // Injecting severe constraint failure (inverted fake door, rapid high risk/latency)
    const invertedPayloadRuns = 20;
    let result;

    for (let i = 0; i < invertedPayloadRuns; i++) {
        // High latency (>9000ms) with risk_score = 1.0
        result = scanner.registerObservation(9500, 1.0); 
    }

    expect(result).toBeDefined();
    // The density scanner must correctly flag this as an anomaly despite arbitrary low volume limits
    expect(result?.anomalyDetected).toBe(true);
    // Alpha smoothing factor is spiked
    expect(result?.alpha).toBeCloseTo(0.3, 2);
    // System must automatically enforce Dynamic Offload to the Cloud (LBEC)
    expect(result?.suggestedRouting).toBe('CLOUD_OFFLOAD_LBEC');
  });

  it('should detect hypoactivity hangs: excruciating latency on microscopic volume', () => {
    // Injecting a severe hang: Execution layer blocking for 29s despite remaining under max session bounded limits (1 call!)
    const result = scanner.registerObservation(29500, 0.1); 

    expect(result).toBeDefined();
    // The density scanner must mathematically trigger critical failure immediately despite low volume
    expect(result?.anomalyDetected).toBe(true);
    // Alpha smoothing factor must spike wildly
    expect(result?.alpha).toBeCloseTo(0.3, 2);
    // System must dynamically offload to bypass the frozen execution layer limit
    expect(result?.suggestedRouting).toBe('CLOUD_OFFLOAD_LBEC');
  });

});
