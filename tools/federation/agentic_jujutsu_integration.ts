import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

/**
 * Agentic-Jujutsu Integration for Federation
 * 
 * Provides integration with agentic-jujutsu status and analyze commands
 * Logs results to .goalie/metrics_log.jsonl for federation tracking
 */

export interface JujutsuStatusResult {
  governanceStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastCheck: string;
  issues: string[];
  recommendations: string[];
  metrics?: {
    totalPatterns: number;
    activePatterns: number;
    riskLevel: number;
    complianceScore: number;
  };
}

export interface JujutsuAnalysisResult {
  analysisType: 'comprehensive' | 'focused' | 'trend';
  timestamp: string;
  findings: {
    critical: string[];
    warnings: string[];
    info: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  economicImpact?: {
    costOfDelay: number;
    potentialSavings: number;
    priorityScore: number;
  };
}

export class AgenticJujutsuIntegration {
  private goalieDir: string;
  private metricsLogPath: string;

  constructor(goalieDir: string, useMock: boolean = false) {
    this.goalieDir = goalieDir;
    this.metricsLogPath = path.join(goalieDir, 'metrics_log.jsonl');
    this.useMock = useMock || false;
  }

  /**
   * Run agentic-jujutsu status command and log results
   */
  async runStatusCheck(): Promise<JujutsuStatusResult> {
    console.log('[JUJUTSU] Running status check...');
    
    try {
      const result = await this.runCommand('status');
      
      // Parse status output (simplified parsing)
      const statusResult: JujutsuStatusResult = {
        governanceStatus: this.parseGovernanceStatus(result.stdout),
        lastCheck: new Date().toISOString(),
        issues: this.extractIssues(result.stdout),
        recommendations: this.extractRecommendations(result.stdout),
        metrics: this.extractMetrics(result.stdout)
      };

      // Log status result to metrics
      await this.logStatusResult(statusResult);
      
      console.log(`[JUJUTSU] Status: ${statusResult.governanceStatus}`);
      console.log(`[JUJUTSU] Issues: ${statusResult.issues.length}`);
      console.log(`[JUJUTSU] Recommendations: ${statusResult.recommendations.length}`);
      
      return statusResult;
      
    } catch (error) {
      console.error('[JUJUTSU] Status check failed:', error);
      
      const errorResult: JujutsuStatusResult = {
        governanceStatus: 'unknown',
        lastCheck: new Date().toISOString(),
        issues: [`Status check failed: ${(error as Error).message}`],
        recommendations: ['Check agentic-jujutsu installation and configuration'],
        metrics: undefined
      };
      
      await this.logStatusResult(errorResult);
      return errorResult;
    }
  }

  /**
   * Run agentic-jujutsu analyze command and log results
   */
  async runAnalysis(analysisType: 'comprehensive' | 'focused' | 'trend' = 'comprehensive'): Promise<JujutsuAnalysisResult> {
    console.log(`[JUJUTSU] Running ${analysisType} analysis...`);
    
    try {
      const args = analysisType === 'comprehensive' ? ['analyze', '--deep'] : ['analyze', '--type', analysisType];
      const result = await this.runCommand('analyze', args);
      
      // Parse analysis output
      const analysisResult: JujutsuAnalysisResult = {
        analysisType,
        timestamp: new Date().toISOString(),
        findings: this.parseFindings(result.stdout),
        recommendations: this.parseRecommendations(result.stdout),
        economicImpact: this.extractEconomicImpact(result.stdout)
      };

      // Log analysis result to metrics
      await this.logAnalysisResult(analysisResult);
      
      console.log(`[JUJUTSU] Analysis complete: ${analysisResult.findings.critical.length} critical, ${analysisResult.findings.warnings.length} warnings`);
      console.log(`[JUJUTSU] Recommendations: ${analysisResult.recommendations.immediate.length} immediate, ${analysisResult.recommendations.shortTerm.length} short-term`);
      
      return analysisResult;
      
    } catch (error) {
      console.error('[JUJUTSU] Analysis failed:', error);
      
      const errorResult: JujutsuAnalysisResult = {
        analysisType,
        timestamp: new Date().toISOString(),
        findings: {
          critical: [`Analysis failed: ${(error as Error).message}`],
          warnings: [],
          info: []
        },
        recommendations: {
          immediate: ['Check agentic-jujutsu configuration and dependencies'],
          shortTerm: ['Verify system requirements and permissions'],
          longTerm: ['Review error logs and system state']
        }
      };
      
      await this.logAnalysisResult(errorResult);
      return errorResult;
    }
  }

  /**
   * Run agentic-jujutsu command with arguments
   */
  private async runCommand(command: string, args: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn('npx', ['agentic-jujutsu', command, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.resolve(this.goalieDir, '..')
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode: exitCode || 0 });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Parse governance status from command output
   */
  private parseGovernanceStatus(output: string): JujutsuStatusResult['governanceStatus'] {
    if (output.includes('PASSED') || output.includes('OK')) {
      return 'healthy';
    } else if (output.includes('WARNING') || output.includes('CAUTION')) {
      return 'warning';
    } else if (output.includes('FAILED') || output.includes('CRITICAL')) {
      return 'critical';
    }
    return 'unknown';
  }

  /**
   * Extract issues from command output
   */
  private extractIssues(output: string): string[] {
    const issues: string[] = [];
    
    // Look for common issue patterns
    const issuePatterns = [
      /ERROR:\s*(.+)/g,
      /WARNING:\s*(.+)/g,
      /CRITICAL:\s*(.+)/g,
      /FAILED:\s*(.+)/g
    ];

    for (const pattern of issuePatterns) {
      const matches = output.match(new RegExp(pattern, 'gm'));
      if (matches) {
        issues.push(...matches.map(match => match.replace(/^(ERROR|WARNING|CRITICAL|FAILED):\s*/, '')));
      }
    }

    return [...new Set(issues)]; // Remove duplicates
  }

  /**
   * Extract recommendations from command output
   */
  private extractRecommendations(output: string): string[] {
    const recommendations: string[] = [];
    
    // Look for common recommendation patterns
    const recommendationPatterns = [
      /RECOMMENDATION:\s*(.+)/g,
      /SUGGESTION:\s*(.+)/g,
      /ACTION:\s*(.+)/g
    ];

    for (const pattern of recommendationPatterns) {
      const matches = output.match(new RegExp(pattern, 'gm'));
      if (matches) {
        recommendations.push(...matches.map(match => match.replace(/^(RECOMMENDATION|SUGGESTION|ACTION):\s*/, '')));
      }
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Parse findings from analysis output
   */
  private parseFindings(output: string): JujutsuAnalysisResult['findings'] {
    const findings = {
      critical: [] as string[],
      warnings: [] as string[],
      info: [] as string[]
    };

    // Extract critical findings
    const criticalMatches = output.match(/CRITICAL:\s*(.+)/g) || [];
    findings.critical = criticalMatches.map(match => 
      match.replace(/^CRITICAL:\s*/, '')
    );

    // Extract warnings
    const warningMatches = output.match(/WARNING:\s*(.+)/g) || [];
    findings.warnings = warningMatches.map(match => 
      match.replace(/^WARNING:\s*/, '')
    );

    // Extract info findings
    const infoMatches = output.match(/INFO:\s*(.+)/g) || [];
    findings.info = infoMatches.map(match => 
      match.replace(/^INFO:\s*/, '')
    );

    return findings;
  }

  /**
   * Parse recommendations from analysis output
   */
  private parseRecommendations(output: string): JujutsuAnalysisResult['recommendations'] {
    const recommendations = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[]
    };

    // Extract immediate recommendations
    const immediateMatches = output.match(/IMMEDIATE:\s*(.+)/g) || [];
    recommendations.immediate = immediateMatches.map(match => 
      match.replace(/^IMMEDIATE:\s*/, '')
    );

    // Extract short-term recommendations
    const shortTermMatches = output.match(/SHORT-TERM:\s*(.+)/g) || [];
    recommendations.shortTerm = shortTermMatches.map(match => 
      match.replace(/^SHORT-TERM:\s*/, '')
    );

    // Extract long-term recommendations
    const longTermMatches = output.match(/LONG-TERM:\s*(.+)/g) || [];
    recommendations.longTerm = longTermMatches.map(match => 
      match.replace(/^LONG-TERM:\s*/, '')
    );

    return recommendations;
  }

  /**
   * Extract economic impact from analysis output
   */
  private extractEconomicImpact(output: string): JujutsuAnalysisResult['economicImpact'] {
    // Look for economic impact patterns
    const codMatch = output.match(/COST OF DELAY:\s*([\d.]+)/);
    const savingsMatch = output.match(/POTENTIAL SAVINGS:\s*([\d.]+)/);
    const priorityMatch = output.match(/PRIORITY SCORE:\s*([\d.]+)/);

    if (codMatch || savingsMatch || priorityMatch) {
      return {
        costOfDelay: codMatch ? parseFloat(codMatch[1]) : 0,
        potentialSavings: savingsMatch ? parseFloat(savingsMatch[1]) : 0,
        priorityScore: priorityMatch ? parseFloat(priorityMatch[1]) : 0
      };
    }

    return undefined;
  }

  /**
   * Extract metrics from status output
   */
  private extractMetrics(output: string): JujutsuStatusResult['metrics'] {
    // Look for metric patterns
    const patternsMatch = output.match(/TOTAL PATTERNS:\s*(\d+)/);
    const activeMatch = output.match(/ACTIVE PATTERNS:\s*(\d+)/);
    const riskMatch = output.match(/RISK LEVEL:\s*(\d+)/);
    const complianceMatch = output.match(/COMPLIANCE SCORE:\s*(\d+)/);

    if (patternsMatch || activeMatch || riskMatch || complianceMatch) {
      return {
        totalPatterns: patternsMatch ? parseInt(patternsMatch[1]) : 0,
        activePatterns: activeMatch ? parseInt(activeMatch[1]) : 0,
        riskLevel: riskMatch ? parseInt(riskMatch[1]) : 0,
        complianceScore: complianceMatch ? parseInt(complianceMatch[1]) : 0
      };
    }

    return undefined;
  }

  /**
   * Log status result to metrics log
   */
  private async logStatusResult(result: JujutsuStatusResult): Promise<void> {
    const logEntry = {
      ts: new Date().toISOString(),
      run: 'agentic-jujutsu-status',
      run_id: process.env.AF_RUN_ID || `jujutsu-status-${Date.now()}`,
      iteration: 0,
      circle: 'jujutsu',
      depth: 0,
      pattern: 'governance-status',
      mode: 'advisory',
      mutation: false,
      gate: 'health-check',
      framework: 'agentic-jujutsu',
      scheduler: 'federation',
      tags: ['Federation', 'Health-Check'],
      economic: {
        cod: 0.0,
        wsjf_score: 0.0
      },
      governance_status: result.governanceStatus,
      issues_count: result.issues.length,
      recommendations_count: result.recommendations.length,
      metrics: result.metrics
    };

    await this.writeToMetricsLog(logEntry);
  }

  /**
   * Log analysis result to metrics log
   */
  private async logAnalysisResult(result: JujutsuAnalysisResult): Promise<void> {
    const logEntry = {
      ts: new Date().toISOString(),
      run: 'agentic-jujutsu-analysis',
      run_id: process.env.AF_RUN_ID || `jujutsu-analysis-${Date.now()}`,
      iteration: 0,
      circle: 'jujutsu',
      depth: 0,
      pattern: 'governance-analysis',
      mode: 'advisory',
      mutation: false,
      gate: 'analysis',
      framework: 'agentic-jujutsu',
      scheduler: 'federation',
      tags: ['Federation', 'Analysis'],
      economic: {
        cod: result.economicImpact?.costOfDelay || 0.0,
        wsjf_score: result.economicImpact?.priorityScore || 0.0
      },
      analysis_type: result.analysisType,
      critical_findings: result.findings.critical.length,
      warning_findings: result.findings.warnings.length,
      info_findings: result.findings.info.length,
      immediate_recommendations: result.recommendations.immediate.length,
      short_term_recommendations: result.recommendations.shortTerm.length,
      long_term_recommendations: result.recommendations.longTerm.length,
      economic_impact: result.economicImpact
    };

    await this.writeToMetricsLog(logEntry);
  }

  /**
   * Write entry to metrics log
   */
  private async writeToMetricsLog(entry: any): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.metricsLogPath, logLine);
    } catch (error) {
      console.error('[JUJUTSU] Failed to write to metrics log:', error);
    }
  }
}

/**
 * Main function for standalone execution
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const goalieDir = process.env.GOALIE_DIR || path.resolve(process.cwd(), 'investing/agentic-flow/.goalie');
  const useMock = args.includes('--use-mock');
  
  if (!command) {
    console.error('Usage: npx ts-node agentic_jujutsu_integration.ts <status|analyze> [--use-mock]');
    process.exit(1);
  }

  const integration = new AgenticJujutsuIntegration(goalieDir, useMock);

  switch (command) {
    case 'status':
      await integration.runStatusCheck();
      break;
    case 'analyze':
      const analysisType = (args[1] as 'comprehensive' | 'focused' | 'trend') || 'comprehensive';
      await integration.runAnalysis(analysisType);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}