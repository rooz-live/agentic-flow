/**
 * Configuration Drift Monitor
 * 
 * Monitors configuration states across environments and detects drift
 * between expected and actual configurations. Supports auto-remediation
 * and drift history tracking.
 * 
 * @module structural-diagnostics/drift-monitor
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  ConfigurationState,
  DriftDetection,
  ConfigDifference,
  RemediationAction
} from './types.js';

/**
 * ConfigurationDriftMonitor tracks configuration states and detects
 * drift between expected and actual configurations.
 */
export class ConfigurationDriftMonitor extends EventEmitter {
  private expectedStates: Map<string, ConfigurationState>;
  private actualStates: Map<string, ConfigurationState>;
  private driftHistory: DriftDetection[];
  private watchIntervals: Map<string, NodeJS.Timeout>;
  private remediationLog: RemediationAction[];
  private readonly maxHistorySize = 1000;

  /**
   * Create a new ConfigurationDriftMonitor instance
   */
  constructor() {
    super();
    this.expectedStates = new Map();
    this.actualStates = new Map();
    this.driftHistory = [];
    this.watchIntervals = new Map();
    this.remediationLog = [];
  }

  /**
   * Capture and store expected configuration state
   * 
   * @param environment - Environment name (e.g., 'production', 'staging')
   * @param configPath - Path to the configuration
   * @param values - Configuration values
   * @returns Captured configuration state
   */
  captureExpectedState(
    environment: string,
    configPath: string,
    values: Record<string, any>
  ): ConfigurationState {
    const id = this.generateConfigId(environment, configPath);
    const hash = this.hashValues(values);

    const state: ConfigurationState = {
      id,
      environment,
      configPath,
      values: this.deepClone(values),
      hash,
      capturedAt: new Date(),
      source: 'expected'
    };

    this.expectedStates.set(id, state);
    this.emit('expectedStateCaptured', state);

    return state;
  }

  /**
   * Capture actual configuration state from the filesystem or environment
   * 
   * @param environment - Environment name
   * @param configPath - Path to the configuration file
   * @returns Promise resolving to the captured configuration state
   */
  async captureActualState(
    environment: string,
    configPath: string
  ): Promise<ConfigurationState> {
    const id = this.generateConfigId(environment, configPath);
    let values: Record<string, any>;

    try {
      // Try to read from filesystem
      if (await this.fileExists(configPath)) {
        const content = await fs.promises.readFile(configPath, 'utf-8');
        values = this.parseConfig(content, configPath);
      } else {
        // Try to read from environment variables with prefix
        values = this.readFromEnvironment(environment, configPath);
      }
    } catch (error) {
      // Return empty state on error
      values = {};
      this.emit('captureError', { environment, configPath, error });
    }

    const hash = this.hashValues(values);

    const state: ConfigurationState = {
      id,
      environment,
      configPath,
      values,
      hash,
      capturedAt: new Date(),
      source: 'actual'
    };

    this.actualStates.set(id, state);
    this.emit('actualStateCaptured', state);

    return state;
  }

  /**
   * Detect drift for a specific configuration
   * 
   * @param environment - Environment name
   * @param configPath - Path to the configuration
   * @returns Drift detection result
   */
  detectDrift(environment: string, configPath: string): DriftDetection {
    const id = this.generateConfigId(environment, configPath);
    const expected = this.expectedStates.get(id);
    const actual = this.actualStates.get(id);

    if (!expected) {
      return {
        configId: id,
        environment,
        drifted: false,
        differences: [],
        severity: 'low',
        detectedAt: new Date(),
        autoRemediable: false
      };
    }

    if (!actual) {
      return {
        configId: id,
        environment,
        drifted: true,
        differences: [{
          path: configPath,
          expectedValue: expected.values,
          actualValue: undefined,
          type: 'missing'
        }],
        severity: 'critical',
        detectedAt: new Date(),
        autoRemediable: false
      };
    }

    // Quick hash comparison
    const drifted = expected.hash !== actual.hash;

    if (!drifted) {
      return {
        configId: id,
        environment,
        drifted: false,
        differences: [],
        severity: 'low',
        detectedAt: new Date(),
        autoRemediable: true
      };
    }

    // Calculate detailed differences
    const differences = this.calculateDifferences(expected, actual);
    const severity = this.calculateSeverity(differences);
    const autoRemediable = this.canAutoRemediate({ 
      configId: id, 
      environment, 
      drifted, 
      differences, 
      severity, 
      detectedAt: new Date(), 
      autoRemediable: false 
    });

    const detection: DriftDetection = {
      configId: id,
      environment,
      drifted,
      differences,
      severity,
      detectedAt: new Date(),
      autoRemediable
    };

    // Record in history
    this.driftHistory.push(detection);
    if (this.driftHistory.length > this.maxHistorySize) {
      this.driftHistory.shift();
    }

    this.emit('driftDetected', detection);
    return detection;
  }

  /**
   * Detect drift for all configurations in an environment
   * 
   * @param environment - Environment name
   * @returns Array of drift detection results
   */
  detectAllDrift(environment: string): DriftDetection[] {
    const results: DriftDetection[] = [];

    for (const [id, state] of this.expectedStates) {
      if (state.environment === environment) {
        const detection = this.detectDrift(environment, state.configPath);
        results.push(detection);
      }
    }

    return results;
  }

  /**
   * Calculate differences between expected and actual configurations
   * 
   * @param expected - Expected configuration state
   * @param actual - Actual configuration state
   * @returns Array of configuration differences
   */
  calculateDifferences(
    expected: ConfigurationState,
    actual: ConfigurationState
  ): ConfigDifference[] {
    const differences: ConfigDifference[] = [];
    
    this.compareObjects(
      expected.values,
      actual.values,
      '',
      differences
    );

    return differences;
  }

  /**
   * Check if drift can be automatically remediated
   * 
   * @param drift - Drift detection result
   * @returns Whether auto-remediation is possible
   */
  canAutoRemediate(drift: DriftDetection): boolean {
    if (!drift.drifted) return true;

    // Cannot auto-remediate critical changes or missing configurations
    if (drift.severity === 'critical') return false;

    // Check each difference
    for (const diff of drift.differences) {
      // Cannot auto-remediate type mismatches or structural changes
      if (diff.type === 'type_mismatch') return false;
      
      // Cannot auto-remediate security-sensitive paths
      if (this.isSecuritySensitive(diff.path)) return false;
    }

    return true;
  }

  /**
   * Generate a remediation plan for detected drift
   * 
   * @param drift - Drift detection result
   * @returns Array of remediation actions
   */
  generateRemediationPlan(drift: DriftDetection): RemediationAction[] {
    const actions: RemediationAction[] = [];
    const expected = this.expectedStates.get(drift.configId);

    if (!expected) return actions;

    for (const diff of drift.differences) {
      let action: RemediationAction;

      switch (diff.type) {
        case 'missing':
          action = {
            configId: drift.configId,
            action: 'set',
            path: diff.path,
            value: diff.expectedValue,
            reason: `Missing configuration value at ${diff.path}`,
            requiresApproval: this.isSecuritySensitive(diff.path)
          };
          break;

        case 'extra':
          action = {
            configId: drift.configId,
            action: 'delete',
            path: diff.path,
            reason: `Unexpected configuration value at ${diff.path}`,
            requiresApproval: true // Always require approval for deletions
          };
          break;

        case 'changed':
        case 'type_mismatch':
          action = {
            configId: drift.configId,
            action: 'restore',
            path: diff.path,
            value: diff.expectedValue,
            reason: `Configuration value changed at ${diff.path}: expected ${JSON.stringify(diff.expectedValue)}, found ${JSON.stringify(diff.actualValue)}`,
            requiresApproval: diff.type === 'type_mismatch' || this.isSecuritySensitive(diff.path)
          };
          break;

        default:
          continue;
      }

      actions.push(action);
    }

    return actions;
  }

  /**
   * Apply a remediation action
   * 
   * @param action - Remediation action to apply
   * @param approver - Optional approver identifier
   */
  async applyRemediation(action: RemediationAction, approver?: string): Promise<void> {
    if (action.requiresApproval && !approver) {
      throw new Error(`Remediation action requires approval: ${action.reason}`);
    }

    const expected = this.expectedStates.get(action.configId);
    const actual = this.actualStates.get(action.configId);

    if (!actual) {
      throw new Error(`No actual configuration state found for ${action.configId}`);
    }

    // Apply the action to the actual state
    switch (action.action) {
      case 'set':
      case 'restore':
        this.setValueAtPath(actual.values, action.path, action.value);
        break;

      case 'delete':
        this.deleteValueAtPath(actual.values, action.path);
        break;
    }

    // Update hash
    actual.hash = this.hashValues(actual.values);
    actual.capturedAt = new Date();

    // Log the action
    const loggedAction: RemediationAction = {
      ...action,
      appliedAt: new Date(),
      appliedBy: approver
    };
    this.remediationLog.push(loggedAction);

    // Try to persist if it's a file
    try {
      const configPath = actual.configPath;
      if (await this.fileExists(configPath)) {
        const content = this.serializeConfig(actual.values, configPath);
        await fs.promises.writeFile(configPath, content, 'utf-8');
      }
    } catch (error) {
      this.emit('remediationPersistError', { action, error });
    }

    this.emit('remediationApplied', loggedAction);
  }

  /**
   * Get drift history for an environment
   * 
   * @param environment - Environment name
   * @returns Array of drift detections for the environment
   */
  getDriftHistory(environment: string): DriftDetection[] {
    return this.driftHistory.filter(d => d.environment === environment);
  }

  /**
   * Get drift trend for an environment
   * 
   * @param environment - Environment name
   * @returns Drift rate and average severity
   */
  getDriftTrend(environment: string): { driftRate: number; avgSeverity: string } {
    const history = this.getDriftHistory(environment);
    
    if (history.length === 0) {
      return { driftRate: 0, avgSeverity: 'low' };
    }

    const driftedCount = history.filter(d => d.drifted).length;
    const driftRate = driftedCount / history.length;

    // Calculate average severity
    const severityScores: Record<string, number> = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };

    const totalSeverity = history.reduce(
      (sum, d) => sum + severityScores[d.severity],
      0
    );
    const avgScore = totalSeverity / history.length;

    let avgSeverity: string;
    if (avgScore >= 3.5) avgSeverity = 'critical';
    else if (avgScore >= 2.5) avgSeverity = 'high';
    else if (avgScore >= 1.5) avgSeverity = 'medium';
    else avgSeverity = 'low';

    return { driftRate, avgSeverity };
  }

  /**
   * Start watching for drift in an environment
   * 
   * @param environment - Environment name
   * @param interval - Check interval in milliseconds
   */
  watchForDrift(environment: string, interval: number): void {
    // Stop existing watch if any
    this.stopWatching(environment);

    const watchKey = `watch-${environment}`;
    
    const checkDrift = async () => {
      // Re-capture actual states
      for (const [id, state] of this.expectedStates) {
        if (state.environment === environment) {
          await this.captureActualState(environment, state.configPath);
        }
      }

      // Detect drift
      const drifts = this.detectAllDrift(environment);
      const hasCriticalDrift = drifts.some(d => d.drifted && d.severity === 'critical');

      if (hasCriticalDrift) {
        this.emit('criticalDriftAlert', { environment, drifts });
      }
    };

    // Initial check
    checkDrift();

    // Set up interval
    const intervalId = setInterval(checkDrift, interval);
    this.watchIntervals.set(watchKey, intervalId);

    this.emit('watchStarted', { environment, interval });
  }

  /**
   * Stop watching for drift in an environment
   * 
   * @param environment - Environment name
   */
  stopWatching(environment: string): void {
    const watchKey = `watch-${environment}`;
    const intervalId = this.watchIntervals.get(watchKey);

    if (intervalId) {
      clearInterval(intervalId);
      this.watchIntervals.delete(watchKey);
      this.emit('watchStopped', { environment });
    }
  }

  /**
   * Get all expected states
   */
  getExpectedStates(): Map<string, ConfigurationState> {
    return new Map(this.expectedStates);
  }

  /**
   * Get all actual states
   */
  getActualStates(): Map<string, ConfigurationState> {
    return new Map(this.actualStates);
  }

  /**
   * Get remediation log
   */
  getRemediationLog(): RemediationAction[] {
    return [...this.remediationLog];
  }

  /**
   * Clear all states and stop all watches
   */
  reset(): void {
    // Stop all watches
    for (const [key, intervalId] of this.watchIntervals) {
      clearInterval(intervalId);
    }
    this.watchIntervals.clear();

    // Clear states
    this.expectedStates.clear();
    this.actualStates.clear();
    this.driftHistory = [];
    this.remediationLog = [];

    this.emit('reset');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateConfigId(environment: string, configPath: string): string {
    return `${environment}:${configPath}`.replace(/[^a-zA-Z0-9:/_.-]/g, '_');
  }

  private hashValues(values: Record<string, any>): string {
    const json = JSON.stringify(this.sortObject(values));
    return crypto.createHash('sha256').update(json).digest('hex').substring(0, 16);
  }

  private sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }

    const sorted: Record<string, any> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = this.sortObject(obj[key]);
    }
    return sorted;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private parseConfig(content: string, configPath: string): Record<string, any> {
    const ext = path.extname(configPath).toLowerCase();

    try {
      switch (ext) {
        case '.json':
          return JSON.parse(content);

        case '.yaml':
        case '.yml':
          // Simple YAML parsing for key: value pairs
          return this.parseSimpleYaml(content);

        case '.env':
          return this.parseEnvFile(content);

        default:
          // Try JSON first, then simple key=value
          try {
            return JSON.parse(content);
          } catch {
            return this.parseEnvFile(content);
          }
      }
    } catch (error) {
      return {};
    }
  }

  private parseSimpleYaml(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        let value: any = trimmed.substring(colonIndex + 1).trim();

        // Parse value types
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (value === 'null') value = null;
        else if (!isNaN(Number(value)) && value !== '') value = Number(value);
        else if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }

        result[key] = value;
      }
    }

    return result;
  }

  private parseEnvFile(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        let value = trimmed.substring(eqIndex + 1).trim();

        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        result[key] = value;
      }
    }

    return result;
  }

  private serializeConfig(values: Record<string, any>, configPath: string): string {
    const ext = path.extname(configPath).toLowerCase();

    switch (ext) {
      case '.json':
        return JSON.stringify(values, null, 2);

      case '.yaml':
      case '.yml':
        return this.serializeSimpleYaml(values);

      case '.env':
        return this.serializeEnvFile(values);

      default:
        return JSON.stringify(values, null, 2);
    }
  }

  private serializeSimpleYaml(values: Record<string, any>): string {
    const lines: string[] = [];
    
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === 'string' && (value.includes(':') || value.includes('#'))) {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }

  private serializeEnvFile(values: Record<string, any>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(values)) {
      const strValue = String(value);
      if (strValue.includes(' ') || strValue.includes('=')) {
        lines.push(`${key}="${strValue}"`);
      } else {
        lines.push(`${key}=${strValue}`);
      }
    }

    return lines.join('\n');
  }

  private readFromEnvironment(
    environment: string,
    configPath: string
  ): Record<string, any> {
    const result: Record<string, any> = {};
    const prefix = `${environment.toUpperCase()}_`;

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.substring(prefix.length);
        result[configKey] = value;
      }
    }

    return result;
  }

  private compareObjects(
    expected: any,
    actual: any,
    currentPath: string,
    differences: ConfigDifference[]
  ): void {
    const expectedType = typeof expected;
    const actualType = typeof actual;

    // Handle null/undefined
    if (expected === null || expected === undefined) {
      if (actual !== null && actual !== undefined) {
        differences.push({
          path: currentPath || 'root',
          expectedValue: expected,
          actualValue: actual,
          type: 'extra'
        });
      }
      return;
    }

    if (actual === null || actual === undefined) {
      differences.push({
        path: currentPath || 'root',
        expectedValue: expected,
        actualValue: actual,
        type: 'missing'
      });
      return;
    }

    // Type mismatch
    if (expectedType !== actualType) {
      differences.push({
        path: currentPath || 'root',
        expectedValue: expected,
        actualValue: actual,
        type: 'type_mismatch'
      });
      return;
    }

    // Array comparison
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) {
        differences.push({
          path: currentPath || 'root',
          expectedValue: expected,
          actualValue: actual,
          type: 'type_mismatch'
        });
        return;
      }

      const maxLen = Math.max(expected.length, actual.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
        this.compareObjects(expected[i], actual[i], itemPath, differences);
      }
      return;
    }

    // Object comparison
    if (expectedType === 'object') {
      const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);

      for (const key of allKeys) {
        const keyPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (!(key in expected)) {
          differences.push({
            path: keyPath,
            expectedValue: undefined,
            actualValue: actual[key],
            type: 'extra'
          });
        } else if (!(key in actual)) {
          differences.push({
            path: keyPath,
            expectedValue: expected[key],
            actualValue: undefined,
            type: 'missing'
          });
        } else {
          this.compareObjects(expected[key], actual[key], keyPath, differences);
        }
      }
      return;
    }

    // Primitive comparison
    if (expected !== actual) {
      differences.push({
        path: currentPath || 'root',
        expectedValue: expected,
        actualValue: actual,
        type: 'changed'
      });
    }
  }

  private calculateSeverity(differences: ConfigDifference[]): DriftDetection['severity'] {
    if (differences.length === 0) return 'low';

    let maxScore = 0;

    for (const diff of differences) {
      let score = 0;

      // Type mismatches are more severe
      if (diff.type === 'type_mismatch') score = 3;
      // Missing expected values are severe
      else if (diff.type === 'missing') score = 3;
      // Changes to sensitive paths are severe
      else if (this.isSecuritySensitive(diff.path)) score = 4;
      // Regular changes
      else if (diff.type === 'changed') score = 2;
      // Extra values are less severe
      else if (diff.type === 'extra') score = 1;

      maxScore = Math.max(maxScore, score);
    }

    // Scale by number of differences
    const volumeMultiplier = Math.min(2, 1 + differences.length / 10);
    const finalScore = maxScore * volumeMultiplier;

    if (finalScore >= 6) return 'critical';
    if (finalScore >= 4) return 'high';
    if (finalScore >= 2) return 'medium';
    return 'low';
  }

  private isSecuritySensitive(path: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /api[_-]?key/i,
      /token/i,
      /credential/i,
      /private[_-]?key/i,
      /auth/i,
      /encryption/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(path));
  }

  private setValueAtPath(obj: any, path: string, value: any): void {
    const parts = this.parsePath(path);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        // Create intermediate object or array
        const nextPart = parts[i + 1];
        current[part] = /^\d+$/.test(nextPart) ? [] : {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  private deleteValueAtPath(obj: any, path: string): void {
    const parts = this.parsePath(path);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) return;
      current = current[part];
    }

    delete current[parts[parts.length - 1]];
  }

  private parsePath(path: string): string[] {
    // Handle both dot notation and bracket notation
    return path
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter(p => p.length > 0);
  }
}

/**
 * Factory function to create a ConfigurationDriftMonitor
 * @returns Configured ConfigurationDriftMonitor instance
 */
export function createDriftMonitor(): ConfigurationDriftMonitor {
  return new ConfigurationDriftMonitor();
}
