#!/usr/bin/env ts-node
/**
 * Tier-Depth Coverage Bridge
 * 
 * Bridges Python CLI calls to TypeScript tier-depth coverage analyzer
 * Provides Node.js interface for cross-language integration
 */

import * as fs from 'fs';
import * as path from 'path';
import { TierDepthCoverageAnalyzer } from '../../agentic-flow-core/dist/coverage/tier-depth-coverage-analyzer.js';
import type { CoveragePeriod, CoverageScope, TierType } from '../../agentic-flow-core/dist/coverage/types.js';

interface BridgeRequest {
  method: string;
  params: any;
  runId: string;
}

interface BridgeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class TierDepthBridge {
  private analyzer: TierDepthCoverageAnalyzer;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    
    // Create evidence emitter
    const evidenceEmitter = {
      emit: (event: string, data: any) => {
        console.log(`[EVIDENCE] ${event}:`, JSON.stringify(data, null, 2));
        
        // Write to unified evidence log
        const goalieDir = path.join(projectRoot, '.goalie');
        const evidenceFile = path.join(goalieDir, 'unified_evidence.jsonl');
        
        try {
          fs.mkdirSync(goalieDir, { recursive: true });
          const evidence = {
            timestamp: new Date().toISOString(),
            command: data.command || 'tier-depth',
            mode: data.mode || 'normal',
            event_type: event,
            run_id: data.runId || 'unknown',
            data: data
          };
          
          fs.appendFileSync(evidenceFile, JSON.stringify(evidence) + '\n');
        } catch (error) {
          console.error('[EVIDENCE] Error writing evidence:', error);
        }
      }
    };
    
    this.analyzer = new TierDepthCoverageAnalyzer(evidenceEmitter, projectRoot);
  }

  async handleRequest(request: BridgeRequest): Promise<BridgeResponse> {
    try {
      console.log(`[BRIDGE] Handling request: ${request.method}`);
      
      let result: any;
      
      switch (request.method) {
        case 'analyzeProdCycleCoverage':
          result = await this.handleProdCycleAnalysis(request.params);
          break;
          
        case 'analyzeProdSwarmCoverage':
          result = await this.handleProdSwarmAnalysis(request.params);
          break;
          
        default:
          throw new Error(`Unknown method: ${request.method}`);
      }
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      console.error(`[BRIDGE] Error handling request:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async handleProdCycleAnalysis(params: any): Promise<any> {
    const { period, scope, options } = params;
    
    // Convert period
    const coveragePeriod: CoveragePeriod = {
      start: new Date(period.start),
      end: new Date(period.end),
      type: period.type
    };
    
    // Convert scope
    const coverageScope: CoverageScope = {
      circles: scope.circles || [],
      domains: scope.domains || [],
      tiers: scope.tiers as TierType[] || ['high-structure', 'medium-structure', 'flexible'],
      depthLevels: scope.depthLevels || [1, 2, 3, 4, 5],
      includeTelemetry: scope.includeTelemetry || false,
      includeEconomic: scope.includeEconomic || false,
      includeWSJF: scope.includeWSJF || false
    };
    
    // Run analysis
    const report = await this.analyzer.analyzeProdCycleCoverage(
      coveragePeriod,
      coverageScope,
      options
    );
    
    return this.formatReport(report);
  }

  private async handleProdSwarmAnalysis(params: any): Promise<any> {
    const { period, scope, swarmData, options } = params;
    
    // Convert period
    const coveragePeriod: CoveragePeriod = {
      start: new Date(period.start),
      end: new Date(period.end),
      type: period.type
    };
    
    // Convert scope
    const coverageScope: CoverageScope = {
      circles: scope.circles || [],
      domains: scope.domains || [],
      tiers: scope.tiers as TierType[] || ['high-structure', 'medium-structure', 'flexible'],
      depthLevels: scope.depthLevels || [1, 2, 3, 4, 5],
      includeTelemetry: scope.includeTelemetry || false,
      includeEconomic: scope.includeEconomic || false,
      includeWSJF: scope.includeWSJF || false
    };
    
    // Run analysis
    const report = await this.analyzer.analyzeProdSwarmCoverage(
      coveragePeriod,
      coverageScope,
      swarmData,
      options
    );
    
    return this.formatReport(report);
  }

  private formatReport(report: any): any {
    // Format the report for JSON serialization
    return {
      id: report.id,
      generatedAt: report.generatedAt,
      period: report.period,
      scope: report.scope,
      metrics: report.metrics,
      tierBreakdown: report.tierBreakdown,
      depthBreakdown: report.depthBreakdown,
      circleBreakdown: report.circleBreakdown,
      recommendations: report.recommendations,
      summary: report.summary
    };
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: tier-depth-bridge.ts <input-file>');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const projectRoot = process.cwd();
  
  try {
    // Read input file
    const inputContent = fs.readFileSync(inputFile, 'utf-8');
    const request: BridgeRequest = JSON.parse(inputContent);
    
    // Create bridge and handle request
    const bridge = new TierDepthBridge(projectRoot);
    const response = await bridge.handleRequest(request);
    
    // Output response
    console.log(JSON.stringify(response, null, 2));
    
    // Exit with appropriate code
    process.exit(response.success ? 0 : 1);
    
  } catch (error) {
    console.error('Error processing request:', error);
    process.exit(1);
  }
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}