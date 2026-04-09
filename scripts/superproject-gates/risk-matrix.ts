/**
 * Risk Matrix Generation and Visualization Tools
 * 
 * Implements risk matrix creation, management, and visualization
 * for ROAM risk assessment framework with advanced interactive features
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import {
  RiskMatrix,
  RiskMatrixCell,
  RiskProbability,
  RiskSeverity,
  Risk,
  RiskThresholds,
  ROAMCategory,
  RiskAssessmentEvent
} from './types';

export interface RiskMatrixConfig {
  name: string;
  description: string;
  probabilityAxis: RiskProbability[];
  severityAxis: RiskSeverity[];
  colorScheme: {
    critical: string;
    high: string;
    medium: string;
    low: string;
    unknown: string;
  };
  cellSize: {
    width: number;
    height: number;
  };
  showRiskCounts: boolean;
  showRiskIds: boolean;
  groupByCategory: boolean;
  enableDrillDown: boolean;
}

export interface RiskMatrixVisualization {
  matrixId: string;
  type: 'heatmap' | 'bubble' | 'scatter' | 'table' | '3d' | 'treemap';
  format: 'html' | 'svg' | 'canvas' | 'json' | 'png' | 'pdf' | 'csv';
  data: any;
  metadata: {
    generatedAt: Date;
    totalRisks: number;
    colorScheme: Record<string, string>;
    dimensions: {
      width: number;
      height: number;
    };
    interactive: boolean;
    drillDownEnabled: boolean;
    exportFormats: string[];
  };
}

export interface InteractiveVisualizationConfig {
  enableZoom: boolean;
  enablePan: boolean;
  enableFilter: boolean;
  enableSearch: boolean;
  enableDrillDown: boolean;
  enableTooltips: boolean;
  enableSelection: boolean;
  enableRealTimeUpdates: boolean;
  animationDuration: number; // in milliseconds
  colorTransitions: boolean;
  responsive: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface ExportConfig {
  format: 'png' | 'pdf' | 'svg' | 'csv' | 'json' | 'html';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  includeMetadata: boolean;
  includeRawData: boolean;
  customStyling?: Record<string, any>;
  filename?: string;
  destination?: string;
}

export interface RealTimeUpdateConfig {
  enabled: boolean;
  updateInterval: number; // in milliseconds
  enableAnimations: boolean;
  enableNotifications: boolean;
  thresholdAlerts: {
    riskCount: number;
    scoreIncrease: number;
    newCriticalRisks: number;
  };
}

export interface RiskMatrixFilter {
  categories?: ROAMCategory[];
  severities?: RiskSeverity[];
  probabilities?: RiskProbability[];
  impactAreas?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  owners?: string[];
  circles?: string[];
}

export interface RiskMatrixAnalysis {
  matrixId: string;
  riskDistribution: {
    bySeverity: Record<RiskSeverity, number>;
    byProbability: Record<RiskProbability, number>;
    byCategory: Record<ROAMCategory, number>;
  };
  hotspots: Array<{
    probability: RiskProbability;
    severity: RiskSeverity;
    riskCount: number;
    riskIds: string[];
    recommendations: string[];
  }>;
  trends: {
    emergingRisks: string[];
    increasingRisks: string[];
    decreasingRisks: string[];
  };
  recommendations: string[];
  analyzedAt: Date;
}

export class RiskMatrixGenerator extends EventEmitter {
  private matrices: Map<string, RiskMatrix> = new Map();
  private defaultConfig: RiskMatrixConfig;
  private interactiveConfig: InteractiveVisualizationConfig;
  private realTimeConfig: RealTimeUpdateConfig;
  private realTimeUpdateInterval?: NodeJS.Timeout;
  private visualizationCache: Map<string, RiskMatrixVisualization> = new Map();

  constructor() {
    super();
    this.defaultConfig = {
      name: 'Default Risk Matrix',
      description: 'Standard 5x4 risk matrix for risk assessment',
      probabilityAxis: ['very_high', 'high', 'medium', 'low', 'very_low'],
      severityAxis: ['critical', 'high', 'medium', 'low'],
      colorScheme: {
        critical: '#d32f2f', // Red
        high: '#f57c00', // Orange
        medium: '#fbc02d', // Yellow
        low: '#388e3c', // Green
        unknown: '#757575' // Grey
      },
      cellSize: {
        width: 120,
        height: 80
      },
      showRiskCounts: true,
      showRiskIds: false,
      groupByCategory: true,
      enableDrillDown: true
    };

    this.interactiveConfig = {
      enableZoom: true,
      enablePan: true,
      enableFilter: true,
      enableSearch: true,
      enableDrillDown: true,
      enableTooltips: true,
      enableSelection: true,
      enableRealTimeUpdates: false,
      animationDuration: 300,
      colorTransitions: true,
      responsive: true,
      theme: 'light'
    };

    this.realTimeConfig = {
      enabled: false,
      updateInterval: 30000, // 30 seconds
      enableAnimations: true,
      enableNotifications: true,
      thresholdAlerts: {
        riskCount: 10,
        scoreIncrease: 20,
        newCriticalRisks: 2
      }
    };
  }

  public async createRiskMatrix(
    risks: Risk[], 
    config?: Partial<RiskMatrixConfig>,
    thresholds?: RiskThresholds
  ): Promise<RiskMatrix> {
    console.log(`[RISK-MATRIX] Creating risk matrix with ${risks.length} risks`);

    const matrixConfig = { ...this.defaultConfig, ...config };
    const matrixId = this.generateId('matrix');

    // Initialize matrix cells
    const cells: RiskMatrixCell[] = [];
    
    for (const probability of matrixConfig.probabilityAxis) {
      for (const severity of matrixConfig.severityAxis) {
        const cell: RiskMatrixCell = {
          probability,
          severity,
          riskIds: [],
          recommendedAction: this.getRecommendedAction(probability, severity, thresholds),
          color: this.getCellColor(probability, severity, matrixConfig.colorScheme),
          count: 0
        };
        cells.push(cell);
      }
    }

    // Populate cells with risks
    for (const risk of risks) {
      const cell = cells.find(c => 
        c.probability === risk.probability && 
        c.severity === risk.severity
      );
      
      if (cell) {
        cell.riskIds.push(risk.id);
        cell.count++;
      }
    }

    // Create matrix object
    const matrix: RiskMatrix = {
      id: matrixId,
      name: matrixConfig.name,
      description: matrixConfig.description,
      createdAt: new Date(),
      lastUpdated: new Date(),
      probabilityAxis: matrixConfig.probabilityAxis,
      severityAxis: matrixConfig.severityAxis,
      cells,
      thresholds: thresholds || this.getDefaultThresholds(),
      metadata: {
        config: matrixConfig,
        totalRisks: risks.length,
        generatedBy: 'risk-matrix-generator'
      }
    };

    // Store matrix
    this.matrices.set(matrixId, matrix);

    // Emit event
    this.emit('matrixCreated', {
      type: 'risk_matrix_generated',
      timestamp: new Date(),
      data: { matrix, riskCount: risks.length },
      description: `Risk matrix created: ${matrix.name}`
    } as RiskAssessmentEvent);

    console.log(`[RISK-MATRIX] Matrix created with ID: ${matrixId}, Cells: ${cells.length}`);

    return matrix;
  }

  private getRecommendedAction(
    probability: RiskProbability, 
    severity: RiskSeverity, 
    thresholds?: RiskThresholds
  ): string {
    const actions: Record<string, string> = {
      'critical-very_high': 'Immediate action required - Executive notification',
      'critical-high': 'Urgent mitigation required - Daily monitoring',
      'critical-medium': 'High priority mitigation - Weekly review',
      'critical-low': 'Priority mitigation - Bi-weekly review',
      
      'high-very_high': 'Immediate attention required - Escalate to leadership',
      'high-high': 'Urgent action needed - Assign owner immediately',
      'high-medium': 'High priority action - Weekly monitoring',
      'high-low': 'Priority action - Monthly review',
      
      'medium-very_high': 'Prompt action needed - Risk assessment required',
      'medium-high': 'Action required - Risk mitigation planning',
      'medium-medium': 'Monitor closely - Regular assessment',
      'medium-low': 'Standard monitoring - Quarterly review',
      
      'low-very_high': 'Monitor - Risk assessment if conditions change',
      'low-high': 'Monitor - Consider mitigation if trend increases',
      'low-medium': 'Accept - Document acceptance rationale',
      'low-low': 'Accept - Standard monitoring procedures'
    };

    const key = `${severity}-${probability}`;
    return actions[key] || 'Assess and determine appropriate action';
  }

  private getCellColor(
    probability: RiskProbability, 
    severity: RiskSeverity, 
    colorScheme: RiskMatrixConfig['colorScheme']
  ): string {
    // Calculate risk level based on probability and severity
    const probabilityScore = this.getProbabilityScore(probability);
    const severityScore = this.getSeverityScore(severity);
    const riskScore = (probabilityScore + severityScore) / 2;

    if (riskScore >= 80) {
      return colorScheme.critical;
    } else if (riskScore >= 60) {
      return colorScheme.high;
    } else if (riskScore >= 40) {
      return colorScheme.medium;
    } else {
      return colorScheme.low;
    }
  }

  private getProbabilityScore(probability: RiskProbability): number {
    const scores: Record<RiskProbability, number> = {
      very_high: 95,
      high: 80,
      medium: 60,
      low: 30,
      very_low: 10
    };
    return scores[probability] || 50;
  }

  private getSeverityScore(severity: RiskSeverity): number {
    const scores: Record<RiskSeverity, number> = {
      critical: 95,
      high: 80,
      medium: 60,
      low: 30
    };
    return scores[severity] || 50;
  }

  private getDefaultThresholds(): RiskThresholds {
    return {
      critical: {
        minScore: 80,
        minProbability: 'high',
        minSeverity: 'high'
      },
      high: {
        minScore: 60,
        minProbability: 'medium',
        minSeverity: 'medium'
      },
      medium: {
        minScore: 40,
        minProbability: 'low',
        minSeverity: 'medium'
      },
      low: {
        minScore: 20,
        minProbability: 'low',
        minSeverity: 'low'
      }
    };
  }

  public async generateVisualization(
    matrixId: string, 
    type: RiskMatrixVisualization['type'],
    format: RiskMatrixVisualization['format'] = 'html',
    interactive?: Partial<InteractiveVisualizationConfig>
  ): Promise<RiskMatrixVisualization> {
    console.log(`[RISK-MATRIX] Generating ${type} visualization in ${format} format`);

    const matrix = this.matrices.get(matrixId);
    if (!matrix) {
      throw new Error(`Matrix not found: ${matrixId}`);
    }

    // Merge interactive config
    const config = { ...this.interactiveConfig, ...interactive };

    let data: any;

    switch (type) {
      case 'heatmap':
        data = this.generateHeatmapData(matrix, config);
        break;
      case 'bubble':
        data = this.generateBubbleData(matrix, config);
        break;
      case 'scatter':
        data = this.generateScatterData(matrix, config);
        break;
      case 'table':
        data = this.generateTableData(matrix, config);
        break;
      case '3d':
        data = this.generate3DData(matrix, config);
        break;
      case 'treemap':
        data = this.generateTreemapData(matrix, config);
        break;
      default:
        throw new Error(`Unsupported visualization type: ${type}`);
    }

    const visualization: RiskMatrixVisualization = {
      matrixId,
      type,
      format,
      data,
      metadata: {
        generatedAt: new Date(),
        totalRisks: matrix.cells.reduce((sum, cell) => sum + cell.count, 0),
        colorScheme: (matrix.metadata.config as RiskMatrixConfig).colorScheme,
        dimensions: {
          width: matrix.probabilityAxis.length * (matrix.metadata.config as RiskMatrixConfig).cellSize.width,
          height: matrix.severityAxis.length * (matrix.metadata.config as RiskMatrixConfig).cellSize.height
        },
        interactive: config.enableZoom || config.enablePan || config.enableFilter,
        drillDownEnabled: config.enableDrillDown,
        exportFormats: this.getSupportedFormats(format)
      }
    };

    // Cache visualization for real-time updates
    this.visualizationCache.set(matrixId, visualization);

    // Enable real-time updates if configured
    if (config.enableRealTimeUpdates && !this.realTimeUpdateInterval) {
      this.startRealTimeUpdates(matrixId);
    }

    // Emit event
    this.emit('visualizationGenerated', {
      type: 'visualization_generated',
      timestamp: new Date(),
      data: { visualization, config },
      description: `Risk matrix visualization generated: ${type} in ${format}`
    } as RiskAssessmentEvent);

    return visualization;
  }

  private getSupportedFormats(format: string): string[] {
    const formatMap: Record<string, string[]> = {
      'html': ['html', 'png', 'pdf', 'svg'],
      'svg': ['svg', 'png', 'pdf'],
      'canvas': ['png', 'jpg', 'webp'],
      'json': ['json', 'csv'],
      'png': ['png'],
      'pdf': ['pdf'],
      'csv': ['csv']
    };
    return formatMap[format] || [format];
  }

  private generateHeatmapData(matrix: RiskMatrix, config: InteractiveVisualizationConfig): any {
    const matrixConfig = matrix.metadata.config as RiskMatrixConfig;
    
    return {
      type: 'heatmap',
      data: matrix.cells.map(cell => ({
        x: matrix.probabilityAxis.indexOf(cell.probability),
        y: matrix.severityAxis.indexOf(cell.severity),
        value: cell.count,
        color: cell.color,
        riskIds: cell.riskIds,
        recommendedAction: cell.recommendedAction,
        tooltip: this.generateTooltip(cell),
        interactive: {
          clickable: config.enableDrillDown,
          selectable: config.enableSelection,
          zoomable: config.enableZoom,
          searchable: config.enableSearch
        }
      })),
      xAxis: {
        categories: matrix.probabilityAxis,
        title: 'Probability',
        interactive: {
          filterable: config.enableFilter,
          searchable: config.enableSearch
        }
      },
      yAxis: {
        categories: matrix.severityAxis,
        title: 'Severity',
        interactive: {
          filterable: config.enableFilter,
          searchable: config.enableSearch
        }
      },
      colorScale: matrixConfig.colorScheme,
      interactive: {
        zoom: config.enableZoom,
        pan: config.enablePan,
        tooltips: config.enableTooltips,
        animations: config.colorTransitions,
        duration: config.animationDuration,
        theme: config.theme
      },
      responsive: config.responsive
    };
  }

  private generateBubbleData(matrix: RiskMatrix, config: InteractiveVisualizationConfig): any {
    const bubbles: any[] = [];
    
    for (const cell of matrix.cells) {
      if (cell.count > 0) {
        bubbles.push({
          x: this.getProbabilityScore(cell.probability),
          y: this.getSeverityScore(cell.severity),
          r: Math.sqrt(cell.count) * 10, // Size based on risk count
          color: cell.color,
          riskIds: cell.riskIds,
          count: cell.count,
          recommendedAction: cell.recommendedAction,
          interactive: {
            clickable: config.enableDrillDown,
            selectable: config.enableSelection,
            tooltip: this.generateTooltip(cell),
            hoverable: config.enableTooltips
          }
        });
      }
    }

    return {
      type: 'bubble',
      data: bubbles,
      xAxis: {
        min: 0,
        max: 100,
        title: 'Probability Score',
        interactive: {
          filterable: config.enableFilter,
          searchable: config.enableSearch
        }
      },
      yAxis: {
        min: 0,
        max: 100,
        title: 'Severity Score',
        interactive: {
          filterable: config.enableFilter,
          searchable: config.enableSearch
        }
      },
      interactive: {
        zoom: config.enableZoom,
        pan: config.enablePan,
        animations: config.colorTransitions,
        duration: config.animationDuration,
        theme: config.theme
      },
      responsive: config.responsive
    };
  }

  private generateScatterData(matrix: RiskMatrix, config: InteractiveVisualizationConfig): any {
    const points: any[] = [];
    
    for (const cell of matrix.cells) {
      for (let i = 0; i < cell.count; i++) {
        points.push({
          x: this.getProbabilityScore(cell.probability) + (Math.random() - 0.5) * 10,
          y: this.getSeverityScore(cell.severity) + (Math.random() - 0.5) * 10,
          color: cell.color,
          riskId: cell.riskIds[i] || 'unknown',
          recommendedAction: cell.recommendedAction,
          interactive: {
            clickable: config.enableDrillDown,
            selectable: config.enableSelection,
            tooltip: this.generateTooltip(cell),
            hoverable: config.enableTooltips
          }
        });
      }
    }

    return {
      type: 'scatter',
      data: points,
      xAxis: {
        min: 0,
        max: 100,
        title: 'Probability Score',
        interactive: {
          filterable: config.enableFilter,
          searchable: config.enableSearch
        }
      },
      yAxis: {
        min: 0,
        max: 100,
        title: 'Severity Score',
        interactive: {
          filterable: config.enableFilter,
          searchable: config.enableSearch
        }
      },
      interactive: {
        zoom: config.enableZoom,
        pan: config.enablePan,
        animations: config.colorTransitions,
        duration: config.animationDuration,
        theme: config.theme
      },
      responsive: config.responsive
    };
  }

  private generateTableData(matrix: RiskMatrix, config: InteractiveVisualizationConfig): any {
    const rows: any[] = [];
    
    for (const severity of matrix.severityAxis) {
      const row: any = { severity };
      
      for (const probability of matrix.probabilityAxis) {
        const cell = matrix.cells.find(c => 
          c.severity === severity && c.probability === probability
        );
        
        row[probability] = cell ? {
          count: cell.count,
          riskIds: cell.riskIds,
          color: cell.color,
          recommendedAction: cell.recommendedAction,
          interactive: {
            clickable: config.enableDrillDown,
            selectable: config.enableSelection,
            tooltip: this.generateTooltip(cell)
          }
        } : null;
      }
      
      rows.push(row);
    }

    return {
      type: 'table',
      data: rows,
      headers: {
        rows: matrix.severityAxis,
        columns: matrix.probabilityAxis
      },
      interactive: {
        sortable: true,
        filterable: config.enableFilter,
        searchable: config.enableSearch,
        theme: config.theme
      },
      responsive: config.responsive
    };
  }

  private generate3DData(matrix: RiskMatrix, config: InteractiveVisualizationConfig): any {
    const points: any[] = [];
    
    for (const cell of matrix.cells) {
      if (cell.count > 0) {
        points.push({
          x: this.getProbabilityScore(cell.probability),
          y: this.getSeverityScore(cell.severity),
          z: cell.count * 5, // Height based on risk count
          color: cell.color,
          riskIds: cell.riskIds,
          count: cell.count,
          recommendedAction: cell.recommendedAction,
          interactive: {
            clickable: config.enableDrillDown,
            selectable: config.enableSelection,
            rotatable: true,
            tooltip: this.generateTooltip(cell)
          }
        });
      }
    }

    return {
      type: '3d',
      data: points,
      xAxis: {
        min: 0,
        max: 100,
        title: 'Probability Score'
      },
      yAxis: {
        min: 0,
        max: 100,
        title: 'Severity Score'
      },
      zAxis: {
        title: 'Risk Count'
      },
      interactive: {
        rotation: true,
        zoom: config.enableZoom,
        pan: config.enablePan,
        animations: config.colorTransitions,
        duration: config.animationDuration,
        theme: config.theme
      },
      responsive: config.responsive
    };
  }

  private generateTreemapData(matrix: RiskMatrix, config: InteractiveVisualizationConfig): any {
    const data: any[] = [];
    
    for (const severity of matrix.severityAxis) {
      const severityData: any = {
        name: severity,
        value: 0,
        color: (matrix.metadata.config as RiskMatrixConfig).colorScheme[severity],
        children: []
      };

      for (const probability of matrix.probabilityAxis) {
        const cell = matrix.cells.find(c => 
          c.severity === severity && c.probability === probability
        );
        
        if (cell && cell.count > 0) {
          severityData.children.push({
            name: probability,
            value: cell.count,
            riskIds: cell.riskIds,
            recommendedAction: cell.recommendedAction,
            interactive: {
              clickable: config.enableDrillDown,
              selectable: config.enableSelection,
              tooltip: this.generateTooltip(cell)
            }
          });
          severityData.value += cell.count;
        }
      }

      if (severityData.value > 0) {
        data.push(severityData);
      }
    }

    return {
      type: 'treemap',
      data,
      interactive: {
        zoom: config.enableZoom,
        drillDown: config.enableDrillDown,
        animations: config.colorTransitions,
        duration: config.animationDuration,
        theme: config.theme
      },
      responsive: config.responsive
    };
  }

  private generateTooltip(cell: RiskMatrixCell): string {
    return `
      <strong>${cell.severity} / ${cell.probability}</strong><br/>
      Risk Count: ${cell.count}<br/>
      Risk IDs: ${cell.riskIds.join(', ')}<br/>
      Action: ${cell.recommendedAction}
    `;
  }

  public async analyzeMatrix(matrixId: string, risks: Risk[]): Promise<RiskMatrixAnalysis> {
    console.log(`[RISK-MATRIX] Analyzing matrix: ${matrixId}`);

    const matrix = this.matrices.get(matrixId);
    if (!matrix) {
      throw new Error(`Matrix not found: ${matrixId}`);
    }

    // Calculate risk distribution
    const riskDistribution = this.calculateRiskDistribution(risks);

    // Identify hotspots
    const hotspots = this.identifyHotspots(matrix);

    // Analyze trends
    const trends = this.analyzeTrends(risks);

    // Generate recommendations
    const recommendations = this.generateMatrixRecommendations(matrix, hotspots, trends);

    const analysis: RiskMatrixAnalysis = {
      matrixId,
      riskDistribution,
      hotspots,
      trends,
      recommendations,
      analyzedAt: new Date()
    };

    // Emit event
    this.emit('matrixAnalyzed', {
      type: 'matrix_analyzed',
      timestamp: new Date(),
      data: { analysis },
      description: `Risk matrix analysis completed: ${matrixId}`
    } as RiskAssessmentEvent);

    return analysis;
  }

  private calculateRiskDistribution(risks: Risk[]): RiskMatrixAnalysis['riskDistribution'] {
    const bySeverity: Record<RiskSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    const byProbability: Record<RiskProbability, number> = {
      very_high: 0,
      high: 0,
      medium: 0,
      low: 0,
      very_low: 0
    };

    const byCategory: Record<ROAMCategory, number> = {
      resolved: 0,
      owned: 0,
      accepted: 0,
      mitigated: 0
    };

    for (const risk of risks) {
      bySeverity[risk.severity]++;
      byProbability[risk.probability]++;
      byCategory[risk.category]++;
    }

    return {
      bySeverity,
      byProbability,
      byCategory
    };
  }

  private identifyHotspots(matrix: RiskMatrix): RiskMatrixAnalysis['hotspots'] {
    const hotspots: RiskMatrixAnalysis['hotspots'] = [];
    
    for (const cell of matrix.cells) {
      if (cell.count >= 3) { // Threshold for hotspot
        const recommendations = this.generateHotspotRecommendations(cell);
        
        hotspots.push({
          probability: cell.probability,
          severity: cell.severity,
          riskCount: cell.count,
          riskIds: cell.riskIds,
          recommendations
        });
      }
    }

    return hotspots.sort((a, b) => b.riskCount - a.riskCount);
  }

  private generateHotspotRecommendations(cell: RiskMatrixCell): string[] {
    const recommendations: string[] = [];
    
    if (cell.severity === 'critical' || cell.probability === 'very_high') {
      recommendations.push('Immediate executive attention required');
      recommendations.push('Dedicated risk management team assignment');
      recommendations.push('Daily monitoring and reporting');
    } else if (cell.severity === 'high' || cell.probability === 'high') {
      recommendations.push('Urgent mitigation planning required');
      recommendations.push('Weekly progress reviews');
      recommendations.push('Stakeholder communication plan');
    } else {
      recommendations.push('Standard risk management procedures');
      recommendations.push('Regular monitoring and assessment');
    }

    if (cell.riskCount > 5) {
      recommendations.push('Consider risk consolidation strategies');
      recommendations.push('Resource allocation for bulk mitigation');
    }

    return recommendations;
  }

  private analyzeTrends(risks: Risk[]): RiskMatrixAnalysis['trends'] {
    // This would typically analyze historical data
    // For now, provide basic trend analysis
    const recentRisks = risks.filter(risk => {
      const daysSinceIdentified = (new Date().getTime() - risk.identifiedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceIdentified <= 30; // Last 30 days
    });

    const highScoreRisks = recentRisks.filter(risk => risk.score >= 70);
    const increasingRisks = recentRisks.filter(risk => risk.score > 50);

    return {
      emergingRisks: recentRisks.slice(0, 5).map(risk => risk.id),
      increasingRisks: increasingRisks.slice(0, 5).map(risk => risk.id),
      decreasingRisks: [] // Would need historical data
    };
  }

  private generateMatrixRecommendations(
    matrix: RiskMatrix, 
    hotspots: RiskMatrixAnalysis['hotspots'],
    trends: RiskMatrixAnalysis['trends']
  ): string[] {
    const recommendations: string[] = [];

    // Recommendations based on hotspots
    if (hotspots.length > 0) {
      recommendations.push('Focus mitigation efforts on identified hotspots');
      recommendations.push('Allocate additional resources to high-concentration areas');
    }

    // Recommendations based on trends
    if (trends.emergingRisks.length > 0) {
      recommendations.push('Enhanced monitoring for emerging risk patterns');
    }

    if (trends.increasingRisks.length > 0) {
      recommendations.push('Proactive mitigation for increasing risks');
    }

    // General recommendations
    const totalRisks = matrix.cells.reduce((sum, cell) => sum + cell.count, 0);
    if (totalRisks > 50) {
      recommendations.push('Consider risk portfolio optimization');
    }

    const criticalRisks = matrix.cells
      .filter(cell => cell.severity === 'critical')
      .reduce((sum, cell) => sum + cell.count, 0);
    
    if (criticalRisks > 5) {
      recommendations.push('Executive risk committee activation');
    }

    return recommendations;
  }

  public async exportVisualization(
    matrixId: string,
    exportConfig: ExportConfig
  ): Promise<string> {
    console.log(`[RISK-MATRIX] Exporting visualization as ${exportConfig.format}`);

    const visualization = this.visualizationCache.get(matrixId);
    if (!visualization) {
      throw new Error(`No visualization found for matrix: ${matrixId}`);
    }

    const filename = exportConfig.filename || `risk-matrix-${matrixId}-${Date.now()}`;
    const destination = exportConfig.destination || './exports';

    // Ensure destination directory exists
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    let filePath: string;
    let content: string | Buffer;

    switch (exportConfig.format) {
      case 'json':
        content = JSON.stringify({
          visualization,
          metadata: exportConfig.includeMetadata ? visualization.metadata : undefined,
          rawData: exportConfig.includeRawData ? visualization.data : undefined
        }, null, 2);
        filePath = path.join(destination, `${filename}.json`);
        fs.writeFileSync(filePath, content as string);
        break;

      case 'csv':
        content = this.generateCSVExport(visualization);
        filePath = path.join(destination, `${filename}.csv`);
        fs.writeFileSync(filePath, content as string);
        break;

      case 'html':
        content = this.generateHTMLExport(visualization, exportConfig);
        filePath = path.join(destination, `${filename}.html`);
        fs.writeFileSync(filePath, content as string);
        break;

      case 'svg':
        content = this.generateSVGExport(visualization, exportConfig);
        filePath = path.join(destination, `${filename}.svg`);
        fs.writeFileSync(filePath, content as string);
        break;

      case 'png':
      case 'pdf':
        // These would require additional libraries like puppeteer or canvas
        // For now, generate a placeholder
        content = `Export to ${exportConfig.format} not yet implemented`;
        filePath = path.join(destination, `${filename}.${exportConfig.format}`);
        fs.writeFileSync(filePath, content);
        break;

      default:
        throw new Error(`Unsupported export format: ${exportConfig.format}`);
    }

    // Emit export event
    this.emit('visualizationExported', {
      type: 'visualization_exported',
      timestamp: new Date(),
      data: { matrixId, filePath, format: exportConfig.format },
      description: `Risk matrix visualization exported: ${exportConfig.format}`
    } as RiskAssessmentEvent);

    return filePath;
  }

  private generateCSVExport(visualization: RiskMatrixVisualization): string {
    const headers = ['Type', 'X', 'Y', 'Value', 'Color', 'Risk IDs', 'Recommended Action'];
    const rows = [headers.join(',')];

    if (visualization.type === 'heatmap' || visualization.type === 'table') {
      visualization.data.data.forEach((cell: any) => {
        rows.push([
          visualization.type,
          cell.x,
          cell.y,
          cell.value,
          cell.color,
          `"${cell.riskIds.join(';')}"`,
          `"${cell.recommendedAction}"`
        ].join(','));
      });
    }

    return rows.join('\n');
  }

  private generateHTMLExport(visualization: RiskMatrixVisualization, config: ExportConfig): string {
    const theme = config.customStyling?.theme || 'light';
    const interactive = visualization.metadata.interactive;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Risk Matrix Visualization</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'}; color: ${theme === 'dark' ? '#ffffff' : '#000000'}; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .visualization { border: 1px solid #ccc; padding: 20px; background: ${theme === 'dark' ? '#2a2a2a' : '#f9f9f9'}; }
        .metadata { margin-top: 20px; padding: 15px; background: ${theme === 'dark' ? '#333' : '#f0f0f0'}; border-radius: 5px; }
        .export-info { margin-top: 10px; font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Risk Matrix Visualization</h1>
            <p>Type: ${visualization.type} | Format: ${visualization.format} | Generated: ${visualization.metadata.generatedAt}</p>
        </div>
        <div class="visualization">
            <div id="chart-container">
                <!-- Chart rendering would go here -->
                <p>Interactive chart rendering requires JavaScript libraries</p>
            </div>
        </div>
        <div class="metadata">
            <h3>Visualization Metadata</h3>
            <p>Total Risks: ${visualization.metadata.totalRisks}</p>
            <p>Interactive: ${visualization.metadata.interactive ? 'Yes' : 'No'}</p>
            <p>Drill Down: ${visualization.metadata.drillDownEnabled ? 'Yes' : 'No'}</p>
            <p>Supported Export Formats: ${visualization.metadata.exportFormats.join(', ')}</p>
        </div>
        <div class="export-info">
            <p>Exported on: ${new Date().toISOString()}</p>
            <p>Quality: ${config.quality}</p>
            <p>Include Metadata: ${config.includeMetadata ? 'Yes' : 'No'}</p>
            <p>Include Raw Data: ${config.includeRawData ? 'Yes' : 'No'}</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateSVGExport(visualization: RiskMatrixVisualization, config: ExportConfig): string {
    // Basic SVG export - would be enhanced with actual chart rendering
    const width = visualization.metadata.dimensions.width;
    const height = visualization.metadata.dimensions.height;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f9f9f9"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="16">
        Risk Matrix Visualization (${visualization.type})
    </text>
    <text x="50%" y="60%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="12">
        Total Risks: ${visualization.metadata.totalRisks}
    </text>
</svg>`;
  }

  public enableRealTimeUpdates(matrixId: string, config?: Partial<RealTimeUpdateConfig>): void {
    const updatedConfig = { ...this.realTimeConfig, ...config };
    this.realTimeConfig = updatedConfig;

    if (updatedConfig.enabled) {
      this.startRealTimeUpdates(matrixId);
    } else {
      this.stopRealTimeUpdates();
    }
  }

  private startRealTimeUpdates(matrixId: string): void {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
    }

    this.realTimeUpdateInterval = setInterval(async () => {
      await this.performRealTimeUpdate(matrixId);
    }, this.realTimeConfig.updateInterval);

    console.log(`[RISK-MATRIX] Real-time updates enabled for matrix: ${matrixId}`);
  }

  private stopRealTimeUpdates(): void {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
      this.realTimeUpdateInterval = undefined;
      console.log('[RISK-MATRIX] Real-time updates disabled');
    }
  }

  private async performRealTimeUpdate(matrixId: string): Promise<void> {
    try {
      const matrix = this.matrices.get(matrixId);
      if (!matrix) {
        return;
      }

      // Check for threshold alerts
      const totalRisks = matrix.cells.reduce((sum, cell) => sum + cell.count, 0);
      const criticalRisks = matrix.cells
        .filter(cell => cell.severity === 'critical')
        .reduce((sum, cell) => sum + cell.count, 0);

      if (totalRisks > this.realTimeConfig.thresholdAlerts.riskCount) {
        this.emit('thresholdAlert', {
          type: 'threshold_alert',
          timestamp: new Date(),
          data: { 
            matrixId, 
            type: 'risk_count', 
            value: totalRisks, 
            threshold: this.realTimeConfig.thresholdAlerts.riskCount 
          },
          description: `Risk count threshold exceeded: ${totalRisks} > ${this.realTimeConfig.thresholdAlerts.riskCount}`
        } as RiskAssessmentEvent);
      }

      if (criticalRisks > this.realTimeConfig.thresholdAlerts.newCriticalRisks) {
        this.emit('thresholdAlert', {
          type: 'threshold_alert',
          timestamp: new Date(),
          data: { 
            matrixId, 
            type: 'critical_risks', 
            value: criticalRisks, 
            threshold: this.realTimeConfig.thresholdAlerts.newCriticalRisks 
          },
          description: `Critical risks threshold exceeded: ${criticalRisks} > ${this.realTimeConfig.thresholdAlerts.newCriticalRisks}`
        } as RiskAssessmentEvent);
      }

      // Update cached visualization if real-time updates are enabled
      const cachedVisualization = this.visualizationCache.get(matrixId);
      if (cachedVisualization && this.realTimeConfig.enableAnimations) {
        // Update visualization with animation
        this.emit('visualizationUpdated', {
          type: 'visualization_updated',
          timestamp: new Date(),
          data: { matrixId, visualization: cachedVisualization },
          description: `Real-time visualization update: ${matrixId}`
        } as RiskAssessmentEvent);
      }

    } catch (error) {
      console.error('[RISK-MATRIX] Real-time update failed:', error);
    }
  }

  public getInteractiveConfig(): InteractiveVisualizationConfig {
    return { ...this.interactiveConfig };
  }

  public updateInteractiveConfig(config: Partial<InteractiveVisualizationConfig>): void {
    this.interactiveConfig = { ...this.interactiveConfig, ...config };
    
    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.interactiveConfig },
      description: 'Interactive visualization configuration updated'
    } as RiskAssessmentEvent);
  }

  public getRealTimeConfig(): RealTimeUpdateConfig {
    return { ...this.realTimeConfig };
  }

  public updateRealTimeConfig(config: Partial<RealTimeUpdateConfig>): void {
    this.realTimeConfig = { ...this.realTimeConfig, ...config };
    
    if (config.enabled !== undefined) {
      if (config.enabled) {
        // Start real-time updates for all cached matrices
        for (const matrixId of this.visualizationCache.keys()) {
          this.startRealTimeUpdates(matrixId);
        }
      } else {
        this.stopRealTimeUpdates();
      }
    }

    this.emit('configUpdated', {
      type: 'config_updated',
      timestamp: new Date(),
      data: { config: this.realTimeConfig },
      description: 'Real-time update configuration updated'
    } as RiskAssessmentEvent);
  }

  public clearVisualizationCache(): void {
    this.visualizationCache.clear();
    this.stopRealTimeUpdates();
    
    this.emit('cacheCleared', {
      type: 'cache_cleared',
      timestamp: new Date(),
      data: {},
      description: 'Visualization cache cleared'
    } as RiskAssessmentEvent);
  }

  public getMatrix(id: string): RiskMatrix | undefined {
    return this.matrices.get(id);
  }

  public getAllMatrices(): RiskMatrix[] {
    return Array.from(this.matrices.values());
  }

  public updateMatrix(matrixId: string, updates: Partial<RiskMatrix>): RiskMatrix | undefined {
    const matrix = this.matrices.get(matrixId);
    if (!matrix) {
      return undefined;
    }

    const updatedMatrix = { 
      ...matrix, 
      ...updates, 
      lastUpdated: new Date()
    };
    
    this.matrices.set(matrixId, updatedMatrix);

    // Emit update event
    this.emit('matrixUpdated', {
      type: 'matrix_updated',
      timestamp: new Date(),
      data: { updates, matrix: updatedMatrix },
      description: `Risk matrix updated: ${updatedMatrix.name}`
    } as RiskAssessmentEvent);

    return updatedMatrix;
  }

  public deleteMatrix(matrixId: string): boolean {
    const deleted = this.matrices.delete(matrixId);
    if (deleted) {
      this.emit('matrixDeleted', {
        type: 'matrix_deleted',
        timestamp: new Date(),
        data: { matrixId },
        description: `Risk matrix deleted: ${matrixId}`
      } as RiskAssessmentEvent);
    }
    return deleted;
  }

  private generateId(type: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }
}