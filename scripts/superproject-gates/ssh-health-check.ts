#!/usr/bin/env tsx
/**
 * SSH Health Check Validator
 * Tests connectivity to all deployment targets with intelligent fallback detection
 * Exit codes: 0 (all OK), 1 (partial), 2 (all failed)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SSHTarget {
  name: string;
  host: string;
  user: string;
  port: number;
  keyPath: string;
  fallbackMethod?: 'api' | 'https' | 'none';
  fallbackPort?: number;
}

interface HealthCheckResult {
  target: string;
  sshWorking: boolean;
  sshLatency?: number;
  fallbackAvailable: boolean;
  fallbackWorking?: boolean;
  errors: string[];
  recommendations: string[];
}

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class SSHHealthChecker {
  private projectRoot: string;
  private envPath: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.envPath = path.join(this.projectRoot, '.env.yolife');
  }

  /**
   * Load SSH targets from .env.yolife
   */
  private async loadTargets(): Promise<SSHTarget[]> {
    if (!fs.existsSync(this.envPath)) {
      throw new Error(`.env.yolife not found at ${this.envPath}`);
    }

    const envContent = fs.readFileSync(this.envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    const getEnvVar = (key: string): string => {
      const line = lines.find(l => l.startsWith(`${key}=`));
      if (!line) return '';
      return line.split('=')[1]?.trim().replace(/^["']|["']$/g, '') || '';
    };

    const expandPath = (p: string): string => {
      return p.replace('~', process.env.HOME || '');
    };

    const targets: SSHTarget[] = [];

    // StarlingX
    const stxHost = getEnvVar('YOLIFE_STX_HOST');
    const stxUser = getEnvVar('YOLIFE_STX_USER') || 'ubuntu';
    const stxPorts = getEnvVar('YOLIFE_STX_PORTS') || '2222';
    const stxKey = expandPath(getEnvVar('YOLIFE_STX_KEY') || '~/.ssh/starlingx_key');
    
    if (stxHost && !stxHost.includes('*')) {
      targets.push({
        name: 'StarlingX',
        host: stxHost,
        user: stxUser,
        port: parseInt(stxPorts.split(',')[0]) || 2222,
        keyPath: stxKey,
        fallbackMethod: 'none',
      });
    }

    // cPanel
    const cpanelHost = getEnvVar('YOLIFE_CPANEL_HOST');
    const cpanelUser = getEnvVar('YOLIFE_CPANEL_USER') || 'root';
    const cpanelKey = expandPath(getEnvVar('YOLIFE_CPANEL_KEY') || '~/pem/rooz.pem');
    
    if (cpanelHost && !cpanelHost.includes('*')) {
      targets.push({
        name: 'cPanel',
        host: cpanelHost,
        user: cpanelUser,
        port: 22,
        keyPath: cpanelKey,
        fallbackMethod: 'api',
        fallbackPort: 2087,
      });
    }

    // GitLab
    const gitlabHost = getEnvVar('YOLIFE_GITLAB_HOST');
    const gitlabUser = getEnvVar('YOLIFE_GITLAB_USER') || 'git';
    const gitlabKey = expandPath(getEnvVar('YOLIFE_GITLAB_KEY') || '~/.ssh/id_rsa');
    
    if (gitlabHost && !gitlabHost.includes('*')) {
      targets.push({
        name: 'GitLab',
        host: gitlabHost,
        user: gitlabUser,
        port: 22,
        keyPath: gitlabKey,
        fallbackMethod: 'https',
        fallbackPort: 443,
      });
    }

    return targets;
  }

  /**
   * Test SSH connectivity with timeout
   */
  private async testSSH(target: SSHTarget): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Check if key file exists
      if (!fs.existsSync(target.keyPath)) {
        return { success: false, latency: 0, error: `Key file not found: ${target.keyPath}` };
      }

      // Check key permissions
      const stats = fs.statSync(target.keyPath);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);
      if (mode !== '600' && mode !== '400') {
        return { success: false, latency: 0, error: `Insecure key permissions: ${mode} (should be 600 or 400)` };
      }

      // SSH probe command
      const cmd = `timeout 5 ssh -i "${target.keyPath}" -o ConnectTimeout=3 -o StrictHostKeyChecking=no -o BatchMode=yes "${target.user}@${target.host}" -p ${target.port} "echo __SSH_OK__" 2>/dev/null`;
      
      const { stdout } = await execAsync(cmd);
      const latency = Date.now() - startTime;
      
      if (stdout.includes('__SSH_OK__')) {
        return { success: true, latency };
      } else {
        return { success: false, latency, error: 'No response from remote host' };
      }
    } catch (error: any) {
      const latency = Date.now() - startTime;
      return { success: false, latency, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Test fallback method availability
   */
  private async testFallback(target: SSHTarget): Promise<{ available: boolean; working: boolean; error?: string }> {
    if (!target.fallbackMethod || target.fallbackMethod === 'none') {
      return { available: false, working: false };
    }

    try {
      if (target.fallbackMethod === 'api') {
        // Test cPanel API (UAPI)
        const port = target.fallbackPort || 2087;
        const cmd = `timeout 5 curl -k -s -o /dev/null -w "%{http_code}" https://${target.host}:${port}/json-api/ 2>/dev/null`;
        const { stdout } = await execAsync(cmd);
        const httpCode = parseInt(stdout.trim());
        
        if (httpCode === 200 || httpCode === 401 || httpCode === 403) {
          // 401/403 means API is accessible but needs auth - that's OK
          return { available: true, working: true };
        } else {
          return { available: true, working: false, error: `HTTP ${httpCode}` };
        }
      } else if (target.fallbackMethod === 'https') {
        // Test HTTPS connectivity (GitLab)
        const port = target.fallbackPort || 443;
        const cmd = `timeout 5 curl -k -s -o /dev/null -w "%{http_code}" https://${target.host}:${port} 2>/dev/null`;
        const { stdout } = await execAsync(cmd);
        const httpCode = parseInt(stdout.trim());
        
        if (httpCode >= 200 && httpCode < 500) {
          return { available: true, working: true };
        } else {
          return { available: true, working: false, error: `HTTP ${httpCode}` };
        }
      }
    } catch (error: any) {
      return { available: true, working: false, error: error.message };
    }

    return { available: false, working: false };
  }

  /**
   * Perform health check on a single target
   */
  private async checkTarget(target: SSHTarget): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      target: target.name,
      sshWorking: false,
      fallbackAvailable: false,
      errors: [],
      recommendations: [],
    };

    // Test SSH
    const sshResult = await this.testSSH(target);
    result.sshWorking = sshResult.success;
    result.sshLatency = sshResult.latency;

    if (!sshResult.success) {
      result.errors.push(`SSH failed: ${sshResult.error}`);
      result.recommendations.push('Check network connectivity and firewall rules');
      result.recommendations.push(`Verify SSH key exists: ${target.keyPath}`);
    }

    // Test fallback
    if (target.fallbackMethod && target.fallbackMethod !== 'none') {
      const fallbackResult = await this.testFallback(target);
      result.fallbackAvailable = fallbackResult.available;
      result.fallbackWorking = fallbackResult.working;

      if (fallbackResult.available && !fallbackResult.working) {
        result.errors.push(`Fallback (${target.fallbackMethod}) failed: ${fallbackResult.error}`);
      }

      if (!sshResult.success && fallbackResult.working) {
        result.recommendations.push(`Use ${target.fallbackMethod.toUpperCase()} fallback method for deployment`);
      }
    }

    return result;
  }

  /**
   * Run health check on all targets
   */
  async checkAll(): Promise<void> {
    console.log(`${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
    console.log(`${COLORS.blue}🔍 SSH Health Check - Deployment Targets${COLORS.reset}`);
    console.log(`${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n`);

    const targets = await this.loadTargets();

    if (targets.length === 0) {
      console.log(`${COLORS.yellow}⚠️  No deployment targets found in .env.yolife${COLORS.reset}`);
      console.log(`${COLORS.yellow}   (All hosts contain placeholder values like '***')${COLORS.reset}\n`);
      process.exit(2);
    }

    console.log(`Found ${targets.length} deployment target(s):\n`);

    const results: HealthCheckResult[] = [];
    let allOK = true;
    let anyOK = false;

    for (const target of targets) {
      console.log(`${COLORS.cyan}Testing ${target.name}...${COLORS.reset}`);
      const result = await this.checkTarget(target);
      results.push(result);

      // Print result
      if (result.sshWorking) {
        console.log(`  ${COLORS.green}✓${COLORS.reset} SSH: Connected (${result.sshLatency}ms)`);
        anyOK = true;
      } else {
        console.log(`  ${COLORS.red}✗${COLORS.reset} SSH: Failed`);
        allOK = false;
      }

      if (result.fallbackAvailable) {
        if (result.fallbackWorking) {
          console.log(`  ${COLORS.green}✓${COLORS.reset} Fallback: Available (${target.fallbackMethod})`);
        } else {
          console.log(`  ${COLORS.yellow}⚠${COLORS.reset} Fallback: Available but not working`);
        }
      }

      if (result.errors.length > 0) {
        result.errors.forEach(err => {
          console.log(`  ${COLORS.red}→${COLORS.reset} ${err}`);
        });
      }

      if (result.recommendations.length > 0) {
        result.recommendations.forEach(rec => {
          console.log(`  ${COLORS.blue}💡${COLORS.reset} ${rec}`);
        });
      }

      console.log('');
    }

    // Summary
    console.log(`${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
    console.log(`${COLORS.blue}📊 Summary${COLORS.reset}\n`);

    const sshOKCount = results.filter(r => r.sshWorking).length;
    const fallbackOKCount = results.filter(r => r.fallbackWorking).length;

    console.log(`SSH Connectivity: ${sshOKCount}/${results.length} targets`);
    console.log(`Fallback Methods: ${fallbackOKCount}/${results.filter(r => r.fallbackAvailable).length} working\n`);

    if (allOK) {
      console.log(`${COLORS.green}✅ All deployment targets are healthy${COLORS.reset}\n`);
      process.exit(0);
    } else if (anyOK) {
      console.log(`${COLORS.yellow}⚠️  Partial connectivity - some targets unreachable${COLORS.reset}\n`);
      process.exit(1);
    } else {
      console.log(`${COLORS.red}❌ All deployment targets are unreachable${COLORS.reset}\n`);
      process.exit(2);
    }
  }
}

// Main execution (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const checker = new SSHHealthChecker();
  checker.checkAll().catch(error => {
    console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error.message);
    process.exit(3);
  });
}

export { SSHHealthChecker, SSHTarget, HealthCheckResult };
