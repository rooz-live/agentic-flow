/**
 * Architectural Decay Detector
 *
 * Detects architectural decay through entropy measurement, coupling analysis,
 * cycle detection, and abstraction leak identification.
 *
 * Integrates with SonaAnomalyDetector for entropy anomaly detection and
 * GNNTestAnalyzer for dependency graph analysis.
 *
 * @module structural-diagnostics/decay-detector
 */
import { EventEmitter } from 'events';
import { SonaAnomalyDetector } from '../ruvector/sona-anomaly-detector.js';
import { DependencyNode, DependencyEdge, EntropyMeasurement, DecayIndicator } from './types.js';
/**
 * ArchitecturalDecayDetector monitors and detects architectural decay patterns.
 * Uses entropy measurement, coupling analysis, and cycle detection to identify
 * signs of architectural degradation.
 */
export declare class ArchitecturalDecayDetector extends EventEmitter {
    private anomalyDetector;
    private gnnAnalyzer;
    private graphBuilder;
    private baselines;
    private history;
    private readonly maxHistorySize;
    /**
     * Create a new ArchitecturalDecayDetector instance
     * @param anomalyDetector - Optional SonaAnomalyDetector for entropy anomaly detection
     */
    constructor(anomalyDetector?: SonaAnomalyDetector);
    /**
     * Build a dependency graph from source file paths
     * Analyzes imports and dependencies to construct the graph structure
     *
     * @param sourcePaths - Array of source file paths to analyze
     * @returns Dependency graph with nodes and edges
     */
    buildDependencyGraph(sourcePaths: string[]): {
        nodes: DependencyNode[];
        edges: DependencyEdge[];
    };
    /**
     * Measure entropy of the dependency graph
     * Calculates various metrics including Shannon entropy, coupling, and cohesion
     *
     * @param nodes - Dependency graph nodes
     * @param edges - Dependency graph edges
     * @returns Entropy measurement
     */
    measureEntropy(nodes: DependencyNode[], edges: DependencyEdge[]): EntropyMeasurement;
    /**
     * Calculate coupling coefficient for the dependency graph
     * Higher values indicate tighter coupling between components
     *
     * @param nodes - Dependency graph nodes
     * @param edges - Dependency graph edges
     * @returns Coupling coefficient (0-1)
     */
    calculateCouplingCoefficient(nodes: DependencyNode[], edges: DependencyEdge[]): number;
    /**
     * Calculate cohesion score for the dependency graph
     * Higher values indicate better internal cohesion of modules
     *
     * @param nodes - Dependency graph nodes
     * @param edges - Dependency graph edges
     * @returns Cohesion score (0-1)
     */
    calculateCohesionScore(nodes: DependencyNode[], edges: DependencyEdge[]): number;
    /**
     * Detect cycles in the dependency graph using DFS
     *
     * @param nodes - Dependency graph nodes
     * @param edges - Dependency graph edges
     * @returns Array of cycles (each cycle is an array of node IDs)
     */
    detectCycles(nodes: DependencyNode[], edges: DependencyEdge[]): string[][];
    /**
     * Detect abstraction leaks in the dependency graph
     * Identifies concrete modules depending on abstract ones inappropriately
     *
     * @param nodes - Dependency graph nodes
     * @param edges - Dependency graph edges
     * @returns Array of decay indicators for abstraction leaks
     */
    detectAbstractionLeaks(nodes: DependencyNode[], edges: DependencyEdge[]): DecayIndicator[];
    /**
     * Analyze decay trend from historical measurements
     *
     * @param measurements - Array of entropy measurements (uses history if not provided)
     * @returns Trend analysis with direction, rate, and projected breach date
     */
    analyzeDecayTrend(measurements?: EntropyMeasurement[]): {
        direction: 'improving' | 'stable' | 'decaying';
        rate: number;
        projectedBreachDate?: Date;
    };
    /**
     * Set a baseline measurement for comparison
     *
     * @param key - Baseline key identifier
     * @param measurement - Entropy measurement to set as baseline
     */
    setBaseline(key: string, measurement: EntropyMeasurement): void;
    /**
     * Get a baseline measurement
     *
     * @param key - Baseline key identifier
     * @returns Baseline measurement or null if not found
     */
    getBaseline(key: string): EntropyMeasurement | null;
    /**
     * Detect decay by comparing current measurement to baseline
     *
     * @param current - Current entropy measurement
     * @param baseline - Optional baseline (uses 'default' if not provided)
     * @returns Array of decay indicators
     */
    detectDecay(current: EntropyMeasurement, baseline?: EntropyMeasurement): DecayIndicator[];
    /**
     * Generate a comprehensive decay report
     *
     * @returns Decay report with summary, entropy, indicators, and recommendations
     */
    generateDecayReport(): {
        summary: string;
        entropy: EntropyMeasurement;
        indicators: DecayIndicator[];
        recommendations: string[];
    };
    /**
     * Get measurement history
     */
    getHistory(): EntropyMeasurement[];
    /**
     * Clear all history and baselines
     */
    reset(): void;
    private pathToId;
    private extractName;
    private extractModule;
    private inferNodeType;
    private inferEdgeType;
    private estimateComplexity;
    private calculateAbstractionLevel;
    private inferDependencies;
    private calculateGraphEntropy;
    private calculateAbstractionBalance;
    private countComponents;
    private calculateAbstractionLeakSeverity;
    private getSeverity;
}
/**
 * Factory function to create an ArchitecturalDecayDetector
 * @param anomalyDetector - Optional SonaAnomalyDetector instance
 * @returns Configured ArchitecturalDecayDetector instance
 */
export declare function createDecayDetector(anomalyDetector?: SonaAnomalyDetector): ArchitecturalDecayDetector;
//# sourceMappingURL=decay-detector.d.ts.map