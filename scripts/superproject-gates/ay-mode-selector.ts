#!/usr/bin/env tsx
/**
 * AY Mode Selector - Dynamic ay-prod/ay-yolife Selection
 * 
 * Intelligently selects between ay-prod (production) and ay-yolife (development)
 * based on context, risk assessment, and system state.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ModeSelectionContext {
  environment: 'production' | 'development' | 'testing';
  riskLevel: 'low' | 'medium' | 'high';
  coverageStatus: 'adequate' | 'inadequate' | 'unknown';
  lastRunMode?: 'prod' | 'yolife';
  iterationCount: number;
  hasRecentFailures: boolean;
  skillConfidence: number;
}

export type SelectedMode = 'prod' | 'yolife' | 'hybrid';

export class AYModeSelector {
  private agentdbPath: string;
  private projectRoot: string;
  
  constructor(agentdbPath?: string, projectRoot?: string) {
    this.agentdbPath = agentdbPath || process.env.AGENTDB_PATH || path.join(process.cwd(), 'agentdb.db');
    this.projectRoot = projectRoot || process.cwd();
  }
  
  /**
   * Select appropriate mode based on context
   */
  async selectMode(context?: Partial<ModeSelectionContext>): Promise<SelectedMode> {
    const fullContext = await this.buildContext(context);
    
    // Decision logic
    if (fullContext.environment === 'production') {
      return 'prod';
    }
    
    if (fullContext.riskLevel === 'high' || fullContext.hasRecentFailures) {
      return 'prod'; // Use production mode for safety
    }
    
    if (fullContext.coverageStatus === 'inadequate' || fullContext.skillConfidence < 0.7) {
      return 'yolife'; // Use yolife for learning/development
    }
    
    // Alternate between modes for balanced learning
    if (fullContext.iterationCount % 2 === 0) {
      return fullContext.lastRunMode === 'prod' ? 'yolife' : 'prod';
    }
    
    // Default to yolife for development
    return 'yolife';
  }
  
  /**
   * Build full context from system state
   */
  private async buildContext(partial?: Partial<ModeSelectionContext>): Promise<ModeSelectionContext> {
    const environment = partial?.environment || this.detectEnvironment();
    const riskLevel = partial?.riskLevel || await this.assessRiskLevel();
    const coverageStatus = partial?.coverageStatus || await this.assessCoverage();
    const lastRunMode = partial?.lastRunMode || await this.getLastRunMode();
    const iterationCount = partial?.iterationCount || await this.getIterationCount();
    const hasRecentFailures = partial?.hasRecentFailures ?? await this.hasRecentFailures();
    const skillConfidence = partial?.skillConfidence ?? await this.getSkillConfidence();
    
    return {
      environment,
      riskLevel,
      coverageStatus,
      lastRunMode,
      iterationCount,
      hasRecentFailures,
      skillConfidence
    };
  }
  
  private detectEnvironment(): 'production' | 'development' | 'testing' {
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    }
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return 'testing';
    }
    return 'development';
  }
  
  private async assessRiskLevel(): Promise<'low' | 'medium' | 'high'> {
    try {
      if (!fs.existsSync(this.agentdbPath)) {
        return 'medium';
      }
      
      // Check recent failure rate
      const failureRate = execSync(
        `sqlite3 "${this.agentdbPath}" "SELECT CAST(ROUND(AVG(CASE WHEN success = 0 THEN 100.0 ELSE 0.0 END)) AS INTEGER) FROM episodes WHERE created_at > strftime('%s', 'now', '-24 hours');"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();
      
      const rate = Number(failureRate) || 0;
      
      if (rate > 30) return 'high';
      if (rate > 10) return 'medium';
      return 'low';
    } catch {
      return 'medium';
    }
  }
  
  private async assessCoverage(): Promise<'adequate' | 'inadequate' | 'unknown'> {
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage-v8/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        const coveragePercent = coverage.total?.lines?.pct || 0;
        return coveragePercent >= 80 ? 'adequate' : 'inadequate';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  private async getLastRunMode(): Promise<'prod' | 'yolife' | undefined> {
    try {
      const modeFile = path.join(this.projectRoot, '.ay-last-mode');
      if (fs.existsSync(modeFile)) {
        const mode = fs.readFileSync(modeFile, 'utf-8').trim();
        return mode === 'prod' || mode === 'yolife' ? mode : undefined;
      }
    } catch {
      // Ignore
    }
    return undefined;
  }
  
  private async getIterationCount(): Promise<number> {
    try {
      if (!fs.existsSync(this.agentdbPath)) {
        return 0;
      }
      
      const count = execSync(
        `sqlite3 "${this.agentdbPath}" "SELECT COUNT(*) FROM episodes WHERE created_at > strftime('%s', 'now', '-7 days');"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();
      
      return Number(count) || 0;
    } catch {
      return 0;
    }
  }
  
  private async hasRecentFailures(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.agentdbPath)) {
        return false;
      }
      
      const failures = execSync(
        `sqlite3 "${this.agentdbPath}" "SELECT COUNT(*) FROM episodes WHERE success = 0 AND created_at > strftime('%s', 'now', '-1 hour');"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();
      
      return Number(failures) > 0;
    } catch {
      return false;
    }
  }
  
  private async getSkillConfidence(): Promise<number> {
    try {
      if (!fs.existsSync(this.agentdbPath)) {
        return 0.5;
      }
      
      const avgConfidence = execSync(
        `sqlite3 "${this.agentdbPath}" "SELECT CAST(ROUND(AVG(CAST(json_extract(metadata, '$.confidence') AS REAL))) AS INTEGER) FROM episodes WHERE json_extract(metadata, '$.confidence') IS NOT NULL AND created_at > strftime('%s', 'now', '-7 days');"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();
      
      const confidence = Number(avgConfidence) || 50;
      return confidence / 100.0;
    } catch {
      return 0.5;
    }
  }
  
  /**
   * Save selected mode for next iteration
   */
  async saveMode(mode: SelectedMode): Promise<void> {
    try {
      const modeFile = path.join(this.projectRoot, '.ay-last-mode');
      fs.writeFileSync(modeFile, mode === 'hybrid' ? 'yolife' : mode, 'utf-8');
    } catch {
      // Ignore write errors
    }
  }
  
  /**
   * Get execution command for selected mode
   */
  getExecutionCommand(mode: SelectedMode, circle: string, ceremony: string, modeArg: string = 'advisory'): string {
    const scriptsDir = path.join(this.projectRoot, 'scripts');
    
    if (mode === 'prod') {
      return `"${scriptsDir}/ay-prod-cycle.sh" "${circle}" "${ceremony}" "${modeArg}"`;
    } else if (mode === 'yolife') {
      return `"${scriptsDir}/ay-yo.sh" "${circle}" "${ceremony}"`;
    } else {
      // Hybrid: run both
      return `"${scriptsDir}/ay-prod-cycle.sh" "${circle}" "${ceremony}" "${modeArg}" && "${scriptsDir}/ay-yo.sh" "${circle}" "${ceremony}"`;
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const selector = new AYModeSelector();
  const circle = process.argv[2] || 'orchestrator';
  const ceremony = process.argv[3] || 'standup';
  
  selector.selectMode()
    .then(mode => {
      console.log(`Selected mode: ${mode}`);
      console.log(`Command: ${selector.getExecutionCommand(mode, circle, ceremony)}`);
      selector.saveMode(mode);
      process.exit(0);
    })
    .catch(error => {
      console.error('Mode selection failed:', error);
      process.exit(1);
    });
}
