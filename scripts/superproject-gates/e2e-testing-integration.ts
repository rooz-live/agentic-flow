#!/usr/bin/env tsx
/**
 * E2E Testing Integration - Playwright + Vibium
 * TUX GUI UX UI testing with auto/interactivity
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface E2EConfig {
  framework: 'playwright' | 'vibium';
  vibium: {
    enabled: boolean;
    autoInteractivity: boolean;
  };
  coverage: {
    target: number;
    gui: boolean;
    ux: boolean;
    ui: boolean;
  };
}

export class E2ETestingIntegration {
  private projectRoot: string;
  private config: E2EConfig;
  
  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.config = this.loadConfig();
  }
  
  private loadConfig(): E2EConfig {
    const settingsPath = path.join(this.projectRoot, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return settings.testing?.e2e || {
        framework: 'playwright',
        vibium: { enabled: true, autoInteractivity: true },
        coverage: { target: 80, gui: true, ux: true, ui: true }
      };
    }
    return {
      framework: 'playwright',
      vibium: { enabled: true, autoInteractivity: true },
      coverage: { target: 80, gui: true, ux: true, ui: true }
    };
  }
  
  /**
   * Install dependencies
   */
  async installDependencies(): Promise<void> {
    console.log('📦 Installing E2E testing dependencies...');
    
    const packages = ['@playwright/test'];
    if (this.config.vibium.enabled) {
      packages.push('@vibium/playwright');
    }
    
    try {
      execSync(`npm install --save-dev ${packages.join(' ')}`, {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      console.log('✓ Dependencies installed');
    } catch (error: any) {
      console.error('✗ Installation failed:', error.message);
    }
  }
  
  /**
   * Run E2E tests
   */
  async runTests(): Promise<{ success: boolean; coverage: number }> {
    console.log('🧪 Running E2E tests...');
    
    try {
      // Run Playwright tests
      execSync('npx playwright test', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
      
      // Get coverage if available
      const coverage = await this.getCoverage();
      
      return { success: true, coverage };
    } catch (error: any) {
      console.error('✗ Tests failed:', error.message);
      return { success: false, coverage: 0 };
    }
  }
  
  /**
   * Get coverage percentage
   */
  private async getCoverage(): Promise<number> {
    try {
      const coveragePath = path.join(this.projectRoot, 'coverage-v8/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
        return coverage.total?.lines?.pct || 0;
      }
    } catch {
      // Ignore
    }
    return 0;
  }
  
  /**
   * Generate coverage report
   */
  async generateCoverageReport(): Promise<void> {
    console.log('📊 Generating coverage report...');
    
    try {
      execSync('npx playwright show-report', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
    } catch (error: any) {
      console.error('✗ Report generation failed:', error.message);
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const integration = new E2ETestingIntegration();
  const command = process.argv[2] || 'run';
  
  switch (command) {
    case 'install':
      integration.installDependencies();
      break;
    case 'run':
      integration.runTests();
      break;
    case 'coverage':
      integration.generateCoverageReport();
      break;
    default:
      console.log('Usage: e2e-testing-integration.ts [install|run|coverage]');
  }
}
