#!/usr/bin/env tsx
/**
 * Subdomain Testing Integration
 * Test on actual subdomains (AWS, cPanel, STX, Hivelocity/Hetzner)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SubdomainConfig {
  name: string;
  host: string;
  port: number;
  key: string;
  type: 'aws' | 'cpanel' | 'stx' | 'hivelocity' | 'hetzner';
  subdomain?: string;
}

export class SubdomainTesting {
  private configs: SubdomainConfig[];
  
  constructor() {
    this.configs = this.loadConfigs();
  }
  
  private loadConfigs(): SubdomainConfig[] {
    return [
      {
        name: 'STX',
        host: process.env.YOLIFE_STX_HOST || '23.92.79.2',
        port: parseInt(process.env.YOLIFE_STX_PORTS?.split(',')[0] || '2222'),
        key: process.env.YOLIFE_STX_KEY || '~/.ssh/starlingx_key',
        type: 'stx',
        subdomain: 'stx-aio-0.corp.interface.tag.ooo'
      },
      {
        name: 'AWS cPanel',
        host: process.env.YOLIFE_CPANEL_HOST || '54.241.233.105',
        port: parseInt(process.env.YOLIFE_CPANEL_PORTS?.split(',')[0] || '22'),
        key: process.env.YOLIFE_CPANEL_KEY || '~/pem/rooz.pem',
        type: 'cpanel',
        subdomain: 'dev.interface.tag.ooo'
      },
      {
        name: 'GitLab',
        host: process.env.YOLIFE_GITLAB_HOST || '13.56.222.100',
        port: parseInt(process.env.YOLIFE_GITLAB_PORTS?.split(',')[0] || '22'),
        key: process.env.YOLIFE_GITLAB_KEY || '~/pem/rooz.pem',
        type: 'aws',
        subdomain: 'dev.interface.tag.ooo'
      }
    ];
  }
  
  /**
   * Test connection to subdomain
   */
  async testConnection(config: SubdomainConfig): Promise<boolean> {
    try {
      const sshCmd = `ssh -i ${config.key} -p ${config.port} -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@${config.host} "echo OK"`;
      const result = execSync(sshCmd, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 10000
      });
      return result.trim() === 'OK';
    } catch {
      return false;
    }
  }
  
  /**
   * Run test on subdomain
   */
  async runTest(config: SubdomainConfig, testCommand: string): Promise<{ success: boolean; output: string }> {
    try {
      const sshCmd = `ssh -i ${config.key} -p ${config.port} -o StrictHostKeyChecking=no ubuntu@${config.host} "${testCommand}"`;
      const output = execSync(sshCmd, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 30000
      });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  }
  
  /**
   * Deploy to subdomain
   */
  async deploy(config: SubdomainConfig, sourcePath: string, targetPath: string): Promise<boolean> {
    try {
      const scpCmd = `scp -i ${config.key} -P ${config.port} -r "${sourcePath}" ubuntu@${config.host}:${targetPath}`;
      execSync(scpCmd, {
        stdio: 'inherit',
        timeout: 60000
      });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Test all subdomains
   */
  async testAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const config of this.configs) {
      console.log(`Testing ${config.name} (${config.subdomain})...`);
      results[config.name] = await this.testConnection(config);
      console.log(`  ${results[config.name] ? '✓' : '✗'} ${config.name}`);
    }
    
    return results;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SubdomainTesting();
  const command = process.argv[2] || 'test';
  
  switch (command) {
    case 'test':
      tester.testAll().then(results => {
        console.log('\nResults:');
        for (const [name, success] of Object.entries(results)) {
          console.log(`  ${name}: ${success ? '✓' : '✗'}`);
        }
      });
      break;
    default:
      console.log('Usage: subdomain-testing.ts [test|deploy|run]');
  }
}
