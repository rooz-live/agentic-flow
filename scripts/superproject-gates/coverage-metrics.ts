/**
 * @file Coverage Metrics
 * @description Test coverage tracking, analysis, and quality metrics
 */

import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Coverage Metrics Interface
 */
export interface CoverageMetrics {
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
}

/**
 * Quality Metrics Interface
 */
export interface QualityMetrics {
  testCount: number;
  passRate: number;
  averageDuration: number;
  flakyTests: number;
  skippedTests: number;
  codeComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
}

/**
 * Component Coverage Interface
 */
export interface ComponentCoverage {
  name: string;
  path: string;
  metrics: CoverageMetrics;
  quality: QualityMetrics;
  trend: {
    statements: number[];
    branches: number[];
    functions: number[];
    lines: number[];
  };
  lastUpdated: Date;
}

/**
 * Coverage Thresholds
 */
export interface CoverageThresholds {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  overall: number;
}

/**
 * Coverage Metrics Manager
 */
export class CoverageMetricsManager {
  private static readonly DEFAULT_THRESHOLDS: CoverageThresholds = {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
    overall: 75
  };

  private static readonly COMPONENT_THRESHOLDS: Record<string, CoverageThresholds> = {
    'restoration-environment': {
      statements: 100,
      branches: 95,
      functions: 100,
      lines: 100,
      overall: 95
    },
    'agentdb': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
      overall: 85
    },
    'decision-transformer': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
      overall: 85
    },
    'risk-assessment': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
      overall: 80
    },
    'affiliate-systems': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
      overall: 80
    },
    'dreamlab-ontology': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
      overall: 80
    }
  };

  /**
   * Parse coverage report from JSON
   */
  static async parseCoverageReport(reportPath: string): Promise<CoverageMetrics> {
    try {
      const reportContent = await fs.readFile(reportPath, 'utf-8');
      const coverageData = JSON.parse(reportContent);
      
      return this.extractCoverageMetrics(coverageData);
    } catch (error) {
      throw new Error(`Failed to parse coverage report: ${error}`);
    }
  }

  /**
   * Extract coverage metrics from coverage data
   */
  private static extractCoverageMetrics(coverageData: any): CoverageMetrics {
    const total = coverageData.total || {};
    
    return {
      statements: {
        total: total.statements || 0,
        covered: total.statementsCovered || 0,
        percentage: total.statementsCovered ? (total.statementsCovered / total.statements) * 100 : 0
      },
      branches: {
        total: total.branches || 0,
        covered: total.branchesCovered || 0,
        percentage: total.branchesCovered ? (total.branchesCovered / total.branches) * 100 : 0
      },
      functions: {
        total: total.functions || 0,
        covered: total.functionsCovered || 0,
        percentage: total.functionsCovered ? (total.functionsCovered / total.functions) * 100 : 0
      },
      lines: {
        total: total.lines || 0,
        covered: total.linesCovered || 0,
        percentage: total.linesCovered ? (total.linesCovered / total.lines) * 100 : 0
      }
    };
  }

  /**
   * Generate quality metrics from test results
   */
  static generateQualityMetrics(testResults: any): QualityMetrics {
    const testSuites = testResults.testSuites || [];
    let totalTests = 0;
    let passedTests = 0;
    let totalDuration = 0;
    let flakyTests = 0;
    let skippedTests = 0;

    testSuites.forEach((suite: any) => {
      const tests = suite.tests || [];
      totalTests += tests.length;
      
      tests.forEach((test: any) => {
        if (test.status === 'passed') {
          passedTests++;
        } else if (test.status === 'failed' && test.flaky) {
          flakyTests++;
        } else if (test.status === 'skipped') {
          skippedTests++;
        }
        
        totalDuration += test.duration || 0;
      });
    });

    return {
      testCount: totalTests,
      passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      averageDuration: totalTests > 0 ? totalDuration / totalTests : 0,
      flakyTests,
      skippedTests,
      codeComplexity: this.calculateCodeComplexity(testResults),
      maintainabilityIndex: this.calculateMaintainabilityIndex(testResults),
      technicalDebt: this.calculateTechnicalDebt(testResults)
    };
  }

  /**
   * Calculate code complexity
   */
  private static calculateCodeComplexity(testResults: any): number {
    // Simplified complexity calculation based on test structure
    const testSuites = testResults.testSuites || [];
    let complexity = 0;

    testSuites.forEach((suite: any) => {
      const tests = suite.tests || [];
      complexity += tests.length * 1.5; // Base complexity per test
      
      // Add complexity for nested describes
      const nestedLevel = (suite.fullName || '').split(' ').length - 1;
      complexity += nestedLevel * 0.5;
    });

    return Math.round(complexity);
  }

  /**
   * Calculate maintainability index
   */
  private static calculateMaintainabilityIndex(testResults: any): number {
    const quality = this.generateQualityMetrics(testResults);
    
    // Simplified maintainability index calculation
    const passRateWeight = 0.4;
    const flakyTestsWeight = 0.3;
    const complexityWeight = 0.3;
    
    const passRateScore = quality.passRate;
    const flakyTestsScore = Math.max(0, 100 - (quality.flakyTests * 10));
    const complexityScore = Math.max(0, 100 - (quality.codeComplexity * 0.5));
    
    const maintainabilityIndex = 
      (passRateScore * passRateWeight) +
      (flakyTestsScore * flakyTestsWeight) +
      (complexityScore * complexityWeight);
    
    return Math.round(maintainabilityIndex);
  }

  /**
   * Calculate technical debt
   */
  private static calculateTechnicalDebt(testResults: any): number {
    const quality = this.generateQualityMetrics(testResults);
    
    // Technical debt in hours (simplified calculation)
    let debt = 0;
    
    // Debt from failed tests
    const failedTests = quality.testCount - Math.round((quality.testCount * quality.passRate) / 100);
    debt += failedTests * 2; // 2 hours per failed test
    
    // Debt from flaky tests
    debt += quality.flakyTests * 4; // 4 hours per flaky test
    
    // Debt from skipped tests
    debt += quality.skippedTests * 1; // 1 hour per skipped test
    
    // Debt from complexity
    debt += quality.codeComplexity * 0.1; // 0.1 hours per complexity point
    
    return Math.round(debt);
  }

  /**
   * Analyze component coverage
   */
  static async analyzeComponentCoverage(
    componentPath: string,
    componentName: string
  ): Promise<ComponentCoverage> {
    const coverageReportPath = join(componentPath, 'coverage', 'coverage-summary.json');
    const testResultsPath = join(componentPath, 'test-results', 'test-results.json');
    
    const metrics = await this.parseCoverageReport(coverageReportPath);
    
    let quality: QualityMetrics;
    try {
      const testResults = JSON.parse(await fs.readFile(testResultsPath, 'utf-8'));
      quality = this.generateQualityMetrics(testResults);
    } catch {
      // Default quality metrics if test results not available
      quality = {
        testCount: 0,
        passRate: 0,
        averageDuration: 0,
        flakyTests: 0,
        skippedTests: 0,
        codeComplexity: 0,
        maintainabilityIndex: 0,
        technicalDebt: 0
      };
    }

    const trend = await this.generateCoverageTrend(componentPath);
    const thresholds = this.COMPONENT_THRESHOLDS[componentName] || this.DEFAULT_THRESHOLDS;

    return {
      name: componentName,
      path: componentPath,
      metrics,
      quality,
      trend,
      lastUpdated: new Date()
    };
  }

  /**
   * Generate coverage trend over time
   */
  private static async generateCoverageTrend(componentPath: string): Promise<{
    statements: number[];
    branches: number[];
    functions: number[];
    lines: number[];
  }> {
    // In a real implementation, this would read historical coverage data
    // For now, return mock trend data
    return {
      statements: [75, 78, 82, 85, 87, 90],
      branches: [70, 73, 76, 79, 82, 85],
      functions: [75, 78, 81, 84, 87, 90],
      lines: [75, 78, 82, 85, 88, 91]
    };
  }

  /**
   * Validate coverage against thresholds
   */
  static validateCoverage(
    metrics: CoverageMetrics,
    thresholds: CoverageThresholds
  ): {
    passed: boolean;
    violations: Array<{ type: string; actual: number; threshold: number }>;
  } {
    const violations: Array<{ type: string; actual: number; threshold: number }> = [];
    
    if (metrics.statements.percentage < thresholds.statements) {
      violations.push({
        type: 'statements',
        actual: metrics.statements.percentage,
        threshold: thresholds.statements
      });
    }
    
    if (metrics.branches.percentage < thresholds.branches) {
      violations.push({
        type: 'branches',
        actual: metrics.branches.percentage,
        threshold: thresholds.branches
      });
    }
    
    if (metrics.functions.percentage < thresholds.functions) {
      violations.push({
        type: 'functions',
        actual: metrics.functions.percentage,
        threshold: thresholds.functions
      });
    }
    
    if (metrics.lines.percentage < thresholds.lines) {
      violations.push({
        type: 'lines',
        actual: metrics.lines.percentage,
        threshold: thresholds.lines
      });
    }

    const overall = this.calculateOverallCoverage(metrics);
    if (overall < thresholds.overall) {
      violations.push({
        type: 'overall',
        actual: overall,
        threshold: thresholds.overall
      });
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * Calculate overall coverage percentage
   */
  private static calculateOverallCoverage(metrics: CoverageMetrics): number {
    const weights = {
      statements: 0.3,
      branches: 0.2,
      functions: 0.2,
      lines: 0.3
    };

    return Math.round(
      (metrics.statements.percentage * weights.statements) +
      (metrics.branches.percentage * weights.branches) +
      (metrics.functions.percentage * weights.functions) +
      (metrics.lines.percentage * weights.lines)
    );
  }

  /**
   * Generate coverage report
   */
  static async generateCoverageReport(
    components: ComponentCoverage[]
  ): Promise<{
    summary: {
      totalComponents: number;
      overallCoverage: CoverageMetrics;
      averageQuality: QualityMetrics;
      complianceRate: number;
    };
    components: ComponentCoverage[];
    recommendations: string[];
  }> {
    const totalComponents = components.length;
    const overallMetrics = this.calculateOverallMetrics(components);
    const averageQuality = this.calculateAverageQuality(components);
    const complianceRate = this.calculateComplianceRate(components);
    const recommendations = this.generateRecommendations(components);

    return {
      summary: {
        totalComponents,
        overallCoverage: overallMetrics,
        averageQuality,
        complianceRate
      },
      components,
      recommendations
    };
  }

  /**
   * Calculate overall metrics across all components
   */
  private static calculateOverallMetrics(components: ComponentCoverage[]): CoverageMetrics {
    const totals = {
      statements: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      lines: { total: 0, covered: 0 }
    };

    components.forEach(component => {
      totals.statements.total += component.metrics.statements.total;
      totals.statements.covered += component.metrics.statements.covered;
      
      totals.branches.total += component.metrics.branches.total;
      totals.branches.covered += component.metrics.branches.covered;
      
      totals.functions.total += component.metrics.functions.total;
      totals.functions.covered += component.metrics.functions.covered;
      
      totals.lines.total += component.metrics.lines.total;
      totals.lines.covered += component.metrics.lines.covered;
    });

    return {
      statements: {
        total: totals.statements.total,
        covered: totals.statements.covered,
        percentage: totals.statements.total > 0 ? (totals.statements.covered / totals.statements.total) * 100 : 0
      },
      branches: {
        total: totals.branches.total,
        covered: totals.branches.covered,
        percentage: totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0
      },
      functions: {
        total: totals.functions.total,
        covered: totals.functions.covered,
        percentage: totals.functions.total > 0 ? (totals.functions.covered / totals.functions.total) * 100 : 0
      },
      lines: {
        total: totals.lines.total,
        covered: totals.lines.covered,
        percentage: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0
      }
    };
  }

  /**
   * Calculate average quality metrics
   */
  private static calculateAverageQuality(components: ComponentCoverage[]): QualityMetrics {
    const totals = {
      testCount: 0,
      passRate: 0,
      averageDuration: 0,
      flakyTests: 0,
      skippedTests: 0,
      codeComplexity: 0,
      maintainabilityIndex: 0,
      technicalDebt: 0
    };

    components.forEach(component => {
      const q = component.quality;
      totals.testCount += q.testCount;
      totals.passRate += q.passRate;
      totals.averageDuration += q.averageDuration;
      totals.flakyTests += q.flakyTests;
      totals.skippedTests += q.skippedTests;
      totals.codeComplexity += q.codeComplexity;
      totals.maintainabilityIndex += q.maintainabilityIndex;
      totals.technicalDebt += q.technicalDebt;
    });

    const count = components.length;
    return {
      testCount: Math.round(totals.testCount / count),
      passRate: Math.round(totals.passRate / count),
      averageDuration: Math.round(totals.averageDuration / count),
      flakyTests: Math.round(totals.flakyTests / count),
      skippedTests: Math.round(totals.skippedTests / count),
      codeComplexity: Math.round(totals.codeComplexity / count),
      maintainabilityIndex: Math.round(totals.maintainabilityIndex / count),
      technicalDebt: Math.round(totals.technicalDebt / count)
    };
  }

  /**
   * Calculate compliance rate
   */
  private static calculateComplianceRate(components: ComponentCoverage[]): number {
    let compliantComponents = 0;

    components.forEach(component => {
      const thresholds = this.COMPONENT_THRESHOLDS[component.name] || this.DEFAULT_THRESHOLDS;
      const validation = this.validateCoverage(component.metrics, thresholds);
      
      if (validation.passed) {
        compliantComponents++;
      }
    });

    return components.length > 0 ? (compliantComponents / components.length) * 100 : 0;
  }

  /**
   * Generate recommendations based on coverage analysis
   */
  private static generateRecommendations(components: ComponentCoverage[]): string[] {
    const recommendations: string[] = [];

    // Analyze overall coverage
    const overallMetrics = this.calculateOverallMetrics(components);
    if (overallMetrics.statements.percentage < 80) {
      recommendations.push('Increase statement coverage by adding tests for uncovered code paths');
    }
    
    if (overallMetrics.branches.percentage < 75) {
      recommendations.push('Improve branch coverage by testing conditional logic and edge cases');
    }

    // Analyze individual components
    components.forEach(component => {
      const thresholds = this.COMPONENT_THRESHOLDS[component.name] || this.DEFAULT_THRESHOLDS;
      const validation = this.validateCoverage(component.metrics, thresholds);
      
      if (!validation.passed) {
        validation.violations.forEach(violation => {
          recommendations.push(
            `Component '${component.name}': Increase ${violation.type} coverage from ${violation.actual.toFixed(1)}% to ${violation.threshold}%`
          );
        });
      }

      // Quality recommendations
      if (component.quality.flakyTests > 0) {
        recommendations.push(
          `Component '${component.name}': Fix ${component.quality.flakyTests} flaky tests to improve reliability`
        );
      }

      if (component.quality.technicalDebt > 20) {
        recommendations.push(
          `Component '${component.name}': Address ${component.quality.technicalDebt} hours of technical debt`
        );
      }

      if (component.quality.maintainabilityIndex < 70) {
        recommendations.push(
          `Component '${component.name}': Improve maintainability index (current: ${component.quality.maintainabilityIndex})`
        );
      }
    });

    // Performance recommendations
    const averageQuality = this.calculateAverageQuality(components);
    if (averageQuality.averageDuration > 100) {
      recommendations.push('Optimize test performance to reduce average test duration');
    }

    return recommendations;
  }

  /**
   * Generate HTML dashboard
   */
  static async generateHTMLDashboard(report: any): Promise<string> {
    const { summary, components, recommendations } = report;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Coverage Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #fafafa;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        .coverage-bar {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #4caf50, #8bc34a);
            transition: width 0.3s ease;
        }
        .components {
            padding: 30px;
        }
        .component-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .component-header {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        .component-name {
            font-size: 1.2em;
            font-weight: 600;
            color: #333;
            margin: 0;
        }
        .component-path {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }
        .component-metrics {
            padding: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .metric-item {
            text-align: center;
        }
        .metric-percentage {
            font-size: 1.5em;
            font-weight: bold;
        }
        .metric-type {
            color: #666;
            font-size: 0.9em;
        }
        .high-coverage { color: #4caf50; }
        .medium-coverage { color: #ff9800; }
        .low-coverage { color: #f44336; }
        .recommendations {
            padding: 30px;
            background: #fff3e0;
        }
        .recommendations h2 {
            color: #e65100;
            margin-top: 0;
        }
        .recommendation-list {
            list-style: none;
            padding: 0;
        }
        .recommendation-item {
            background: white;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #ff9800;
            border-radius: 4px;
        }
        .footer {
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #e0e0e0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Coverage Dashboard</h1>
            <p>Comprehensive testing metrics and quality analysis</p>
        </div>

        <div class="summary">
            <div class="metric-card">
                <div class="metric-value">${summary.totalComponents}</div>
                <div class="metric-label">Total Components</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.overallCoverage.statements.percentage.toFixed(1)}%</div>
                <div class="metric-label">Statement Coverage</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${summary.overallCoverage.statements.percentage}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.overallCoverage.branches.percentage.toFixed(1)}%</div>
                <div class="metric-label">Branch Coverage</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${summary.overallCoverage.branches.percentage}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.overallCoverage.functions.percentage.toFixed(1)}%</div>
                <div class="metric-label">Function Coverage</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${summary.overallCoverage.functions.percentage}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.overallCoverage.lines.percentage.toFixed(1)}%</div>
                <div class="metric-label">Line Coverage</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${summary.overallCoverage.lines.percentage}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.complianceRate.toFixed(1)}%</div>
                <div class="metric-label">Compliance Rate</div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${summary.complianceRate}%"></div>
                </div>
            </div>
        </div>

        <div class="components">
            <h2>Component Coverage Details</h2>
            ${components.map(component => `
                <div class="component-card">
                    <div class="component-header">
                        <h3 class="component-name">${component.name}</h3>
                        <div class="component-path">${component.path}</div>
                    </div>
                    <div class="component-metrics">
                        <div class="metrics-grid">
                            <div class="metric-item">
                                <div class="metric-percentage ${component.metrics.statements.percentage >= 80 ? 'high-coverage' : component.metrics.statements.percentage >= 60 ? 'medium-coverage' : 'low-coverage'}">
                                    ${component.metrics.statements.percentage.toFixed(1)}%
                                </div>
                                <div class="metric-type">Statements</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-percentage ${component.metrics.branches.percentage >= 75 ? 'high-coverage' : component.metrics.branches.percentage >= 50 ? 'medium-coverage' : 'low-coverage'}">
                                    ${component.metrics.branches.percentage.toFixed(1)}%
                                </div>
                                <div class="metric-type">Branches</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-percentage ${component.metrics.functions.percentage >= 80 ? 'high-coverage' : component.metrics.functions.percentage >= 60 ? 'medium-coverage' : 'low-coverage'}">
                                    ${component.metrics.functions.percentage.toFixed(1)}%
                                </div>
                                <div class="metric-type">Functions</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-percentage ${component.metrics.lines.percentage >= 80 ? 'high-coverage' : component.metrics.lines.percentage >= 60 ? 'medium-coverage' : 'low-coverage'}">
                                    ${component.metrics.lines.percentage.toFixed(1)}%
                                </div>
                                <div class="metric-type">Lines</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-percentage">${component.quality.testCount}</div>
                                <div class="metric-type">Tests</div>
                            </div>
                            <div class="metric-item">
                                <div class="metric-percentage ${component.quality.passRate >= 95 ? 'high-coverage' : component.quality.passRate >= 80 ? 'medium-coverage' : 'low-coverage'}">
                                    ${component.quality.passRate.toFixed(1)}%
                                </div>
                                <div class="metric-type">Pass Rate</div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul class="recommendation-list">
                ${recommendations.map(rec => `
                    <li class="recommendation-item">${rec}</li>
                `).join('')}
            </ul>
        </div>

        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Export coverage data to JSON
   */
  static async exportToJSON(report: any, outputPath: string): Promise<void> {
    const jsonData = JSON.stringify(report, null, 2);
    await fs.writeFile(outputPath, jsonData, 'utf-8');
  }

  /**
   * Export coverage data to CSV
   */
  static async exportToCSV(components: ComponentCoverage[], outputPath: string): Promise<void> {
    const headers = [
      'Component',
      'Path',
      'Statements %',
      'Branches %',
      'Functions %',
      'Lines %',
      'Test Count',
      'Pass Rate %',
      'Flaky Tests',
      'Technical Debt (hours)',
      'Maintainability Index',
      'Last Updated'
    ];

    const rows = components.map(component => [
      component.name,
      component.path,
      component.metrics.statements.percentage.toFixed(1),
      component.metrics.branches.percentage.toFixed(1),
      component.metrics.functions.percentage.toFixed(1),
      component.metrics.lines.percentage.toFixed(1),
      component.quality.testCount.toString(),
      component.quality.passRate.toFixed(1),
      component.quality.flakyTests.toString(),
      component.quality.technicalDebt.toString(),
      component.quality.maintainabilityIndex.toString(),
      component.lastUpdated.toISOString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    await fs.writeFile(outputPath, csvContent, 'utf-8');
  }

  /**
   * Get coverage thresholds for component
   */
  static getThresholdsForComponent(componentName: string): CoverageThresholds {
    return this.COMPONENT_THRESHOLDS[componentName] || this.DEFAULT_THRESHOLDS;
  }

  /**
   * Set custom thresholds for component
   */
  static setThresholdsForComponent(componentName: string, thresholds: CoverageThresholds): void {
    this.COMPONENT_THRESHOLDS[componentName] = thresholds;
  }
}