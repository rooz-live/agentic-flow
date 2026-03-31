#!/usr/bin/env node

/**
 * Simple test script to verify IRIS bridge functionality
 */

import { captureIrisMetrics } from './iris_bridge.js';

async function testIrisBridge() {
  try {
    console.log('Testing IRIS bridge with mock command...');
    
    // Test with a simple command that should work
    const result = await captureIrisMetrics('health', ['--json'], {
      correlationId: 'test-correlation-123',
      executionId: 'test-execution-456',
      logFile: './test_metrics.jsonl'
    });

    console.log('✅ IRIS bridge test successful!');
    console.log('Result structure:', {
      type: result.type,
      timestamp: result.timestamp,
      iris_command: result.iris_command,
      correlation_id: result.correlation_id,
      execution_id: result.execution_id,
      has_circles_involved: !!result.circles_involved,
      has_actions_taken: !!result.actions_taken,
      has_production_maturity: !!result.production_maturity,
      has_execution_context: !!result.execution_context,
      has_performance_metrics: !!result.performance_metrics,
      has_circuit_breaker_metrics: !!result.circuit_breaker_metrics,
      has_resource_metrics: !!result.resource_metrics,
      has_governance_metrics: !!result.governance_metrics
    });

    console.log('📊 Metrics written to test_metrics.jsonl');
    
  } catch (error) {
    console.error('❌ IRIS bridge test failed:', error.message);
    process.exit(1);
  }
}

testIrisBridge();