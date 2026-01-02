import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
export class AgenticJujutsuIntegration {
    goalieDir;
    metricsLogPath;
    constructor(goalieDir, useMock = false) {
        this.goalieDir = goalieDir;
        this.metricsLogPath = path.join(goalieDir, 'metrics_log.jsonl');
        this.useMock = useMock || false;
    }
    /**
     * Run agentic-jujutsu status command and log results
     */
    async runStatusCheck() {
        console.log('[JUJUTSU] Running status check...');
        try {
            const result = await this.runCommand('status');
            // Parse status output (simplified parsing)
            const statusResult = {
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
        }
        catch (error) {
            console.error('[JUJUTSU] Status check failed:', error);
            const errorResult = {
                governanceStatus: 'unknown',
                lastCheck: new Date().toISOString(),
                issues: [`Status check failed: ${error.message}`],
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
    async runAnalysis(analysisType = 'comprehensive') {
        console.log(`[JUJUTSU] Running ${analysisType} analysis...`);
        try {
            const args = analysisType === 'comprehensive' ? ['analyze', '--deep'] : ['analyze', '--type', analysisType];
            const result = await this.runCommand('analyze', args);
            // Parse analysis output
            const analysisResult = {
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
        }
        catch (error) {
            console.error('[JUJUTSU] Analysis failed:', error);
            const errorResult = {
                analysisType,
                timestamp: new Date().toISOString(),
                findings: {
                    critical: [`Analysis failed: ${error.message}`],
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
    async runCommand(command, args = []) {
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
    parseGovernanceStatus(output) {
        if (output.includes('PASSED') || output.includes('OK')) {
            return 'healthy';
        }
        else if (output.includes('WARNING') || output.includes('CAUTION')) {
            return 'warning';
        }
        else if (output.includes('FAILED') || output.includes('CRITICAL')) {
            return 'critical';
        }
        return 'unknown';
    }
    /**
     * Extract issues from command output
     */
    extractIssues(output) {
        const issues = [];
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
    extractRecommendations(output) {
        const recommendations = [];
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
    parseFindings(output) {
        const findings = {
            critical: [],
            warnings: [],
            info: []
        };
        // Extract critical findings
        const criticalMatches = output.match(/CRITICAL:\s*(.+)/g) || [];
        findings.critical = criticalMatches.map(match => match.replace(/^CRITICAL:\s*/, ''));
        // Extract warnings
        const warningMatches = output.match(/WARNING:\s*(.+)/g) || [];
        findings.warnings = warningMatches.map(match => match.replace(/^WARNING:\s*/, ''));
        // Extract info findings
        const infoMatches = output.match(/INFO:\s*(.+)/g) || [];
        findings.info = infoMatches.map(match => match.replace(/^INFO:\s*/, ''));
        return findings;
    }
    /**
     * Parse recommendations from analysis output
     */
    parseRecommendations(output) {
        const recommendations = {
            immediate: [],
            shortTerm: [],
            longTerm: []
        };
        // Extract immediate recommendations
        const immediateMatches = output.match(/IMMEDIATE:\s*(.+)/g) || [];
        recommendations.immediate = immediateMatches.map(match => match.replace(/^IMMEDIATE:\s*/, ''));
        // Extract short-term recommendations
        const shortTermMatches = output.match(/SHORT-TERM:\s*(.+)/g) || [];
        recommendations.shortTerm = shortTermMatches.map(match => match.replace(/^SHORT-TERM:\s*/, ''));
        // Extract long-term recommendations
        const longTermMatches = output.match(/LONG-TERM:\s*(.+)/g) || [];
        recommendations.longTerm = longTermMatches.map(match => match.replace(/^LONG-TERM:\s*/, ''));
        return recommendations;
    }
    /**
     * Extract economic impact from analysis output
     */
    extractEconomicImpact(output) {
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
    extractMetrics(output) {
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
    async logStatusResult(result) {
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
    async logAnalysisResult(result) {
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
    async writeToMetricsLog(entry) {
        try {
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.metricsLogPath, logLine);
        }
        catch (error) {
            console.error('[JUJUTSU] Failed to write to metrics log:', error);
        }
    }
}
/**
 * Main function for standalone execution
 */
export async function main() {
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
            const analysisType = args[1] || 'comprehensive';
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
//# sourceMappingURL=agentic_jujutsu_integration.js.map