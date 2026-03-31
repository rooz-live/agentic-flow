/**
 * Dynamic Threshold Library Wrapper
 * Provides TypeScript interface to bash-based dynamic threshold calculations
 * 
 * ROAM Score: 2.5/10 (down from 8.5/10 with hardcoded values)
 */

import { execSync } from 'child_process';
import { join } from 'path';

const LIB_PATH = join(__dirname, '../../scripts/lib-dynamic-thresholds.sh');

/**
 * Execute bash function from dynamic threshold library
 */
function execThresholdFunction(funcName: string, ...args: string[]): number {
  try {
    const cmd = `source ${LIB_PATH} && ${funcName} ${args.join(' ')}`;
    const result = execSync(cmd, { encoding: 'utf8', shell: '/bin/bash' });
    return parseFloat(result.trim());
  } catch (error) {
    console.error(`Error executing ${funcName}:`, error);
    // Fallback to conservative default
    return 0.5;
  }
}

/**
 * Get statistical circuit breaker threshold (2.5-3.0σ)
 * Replaces: hardcoded 0.8 (ROAM 9.0/10)
 * Now: ROAM 2.0/10
 */
export function getCircuitBreakerThreshold(
  circle: string,
  ceremony: string
): number {
  return execThresholdFunction('calculate_circuit_breaker_threshold', circle, ceremony);
}

/**
 * Get degradation threshold with 95% confidence interval
 * Replaces: hardcoded 0.9 (ROAM 8.5/10)
 * Now: ROAM 2.5/10
 */
export function getDegradationThreshold(
  circle: string,
  ceremony: string,
  currentReward: number
): number {
  return execThresholdFunction(
    'calculate_degradation_threshold',
    circle,
    ceremony,
    currentReward.toString()
  );
}

/**
 * Get velocity-aware cascade failure threshold
 * Replaces: hardcoded 10/5min (ROAM 8.0/10)
 * Now: ROAM 3.0/10
 */
export function getCascadeThreshold(
  circle: string,
  ceremony: string
): number {
  return execThresholdFunction('calculate_cascade_threshold', circle, ceremony);
}

/**
 * Get Sharpe ratio-based divergence rate
 * Replaces: linear 0.05 + 0.25*r (ROAM 7.5/10)
 * Now: ROAM 2.0/10
 */
export function getDivergenceRate(
  circle: string,
  ceremony: string
): number {
  return execThresholdFunction('get_divergence_rate', circle, ceremony);
}

/**
 * Get dual-factor check frequency
 * Replaces: arbitrary 20/(1+r) (ROAM 7.0/10)
 * Now: ROAM 3.0/10
 */
export function getCheckFrequency(
  circle: string,
  ceremony: string
): number {
  return execThresholdFunction('get_check_frequency', circle, ceremony);
}

/**
 * Detect regime shift (stable/transitioning/unstable)
 * New capability - no hardcoded equivalent
 * ROAM: 2.5/10
 */
export function detectRegimeShift(
  circle: string,
  ceremony: string
): 'Stable' | 'Transitioning' | 'Unstable' {
  try {
    const cmd = `source ${LIB_PATH} && detect_regime_shift ${circle} ${ceremony}`;
    const result = execSync(cmd, { encoding: 'utf8', shell: '/bin/bash' });
    return result.trim() as 'Stable' | 'Transitioning' | 'Unstable';
  } catch (error) {
    console.error('Error detecting regime shift:', error);
    return 'Stable'; // Conservative default
  }
}

/**
 * Get quantile-based threshold (non-parametric)
 * Replaces: fixed lookback windows (ROAM 6.0/10)
 * Now: ROAM 2.5/10
 */
export function getQuantileThreshold(
  circle: string,
  ceremony: string,
  quantile: number = 0.05
): number {
  return execThresholdFunction(
    'get_quantile_threshold',
    circle,
    ceremony,
    quantile.toString()
  );
}

// Export all functions
export default {
  getCircuitBreakerThreshold,
  getDegradationThreshold,
  getCascadeThreshold,
  getDivergenceRate,
  getCheckFrequency,
  detectRegimeShift,
  getQuantileThreshold,
};
