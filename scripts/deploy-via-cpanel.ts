#!/usr/bin/env ts-node
/**
 * Deploy agentic-flow to YOLIFE environments via cPanel API
 * Uses REST API instead of SSH for firewall-friendly deployment
 */

import { createCPanelClient } from '../src/deployment/cpanel_api_client';
import * as fs from 'fs';
import * as path from 'path';

interface DeploymentConfig {
  host: string;
  apiToken: string;
  targetPath?: string;
  domain?: string;
}

interface DeploymentResult {
  success: boolean;
  host: string;
  steps: { step: string; status: string; details?: string }[];
  errors: string[];
}

/**
 * Deploy to a single cPanel instance
 */
async function deployToCPanel(config: DeploymentConfig): Promise<DeploymentResult> {
  const result: DeploymentResult = {
    success: false,
    host: config.host,
    steps: [],
    errors: []
  };

  try {
    // Step 1: Health check
    result.steps.push({ step: 'health_check', status: 'running' });
    const client = createCPanelClient();
    const health = await client.healthCheck();
    result.steps[result.steps.length - 1].status = health.healthy ? 'success' : 'failed';
    result.steps[result.steps.length - 1].details = JSON.stringify(health);

    if (!health.healthy) {
      result.errors.push('cPanel health check failed');
      return result;
    }

    // Step 2: Get domain info
    result.steps.push({ step: 'domain_info', status: 'running' });
    const domains = await client.getDomains();
    result.steps[result.steps.length - 1].status = 'success';
    result.steps[result.steps.length - 1].details = `Found ${domains.length} domains`;

    // Step 3: Check SSL certificates
    result.steps.push({ step: 'ssl_check', status: 'running' });
    const ssl = await client.getSSLInfo();
    result.steps[result.steps.length - 1].status = 'success';
    result.steps[result.steps.length - 1].details = `SSL certificates: ${ssl.certificates?.length || 0}`;

    // Step 4: Create deployment directory (using Fileman API)
    result.steps.push({ step: 'create_directory', status: 'running' });
    const targetPath = config.targetPath || '/home/user/agentic-flow';
    // Note: Actual directory creation would use Fileman UAPI
    result.steps[result.steps.length - 1].status = 'skipped';
    result.steps[result.steps.length - 1].details = 'Manual directory creation required';

    // Step 5: Upload files (would use Terminal or Fileman API)
    result.steps.push({ step: 'upload_files', status: 'skipped' });
    result.steps[result.steps.length - 1].details = 'Use Terminal API or FTP for file uploads';

    // Step 6: Install dependencies
    result.steps.push({ step: 'install_deps', status: 'skipped' });
    result.steps[result.steps.length - 1].details = 'Run via Terminal API: cd /path && npm install';

    // Step 7: Start service
    result.steps.push({ step: 'start_service', status: 'skipped' });
    result.steps[result.steps.length - 1].details = 'Configure via Terminal API or process manager';

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    result.errors.push(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Main deployment orchestrator
 */
async function main() {
  console.log('🚀 YOLIFE cPanel Deployment Tool\n');

  // Load environment variables
  const cpanelHost = process.env.YOLIFE_CPANEL_HOST;
  const cpanelToken = process.env.CPANEL_API_TOKEN;

  if (!cpanelHost || !cpanelToken) {
    console.error('❌ Missing required environment variables:');
    if (!cpanelHost) console.error('  - YOLIFE_CPANEL_HOST');
    if (!cpanelToken) console.error('  - CPANEL_API_TOKEN');
    console.error('\nSet these variables and try again.');
    process.exit(1);
  }

  console.log(`📍 Target: ${cpanelHost}`);
  console.log(`🔑 Auth: API Token (${cpanelToken.substring(0, 8)}...)\n`);

  // Deploy configuration
  const config: DeploymentConfig = {
    host: cpanelHost,
    apiToken: cpanelToken,
    targetPath: '/home/rooz/agentic-flow',
    domain: 'rooz.live'
  };

  console.log('🔄 Starting deployment...\n');

  const result = await deployToCPanel(config);

  // Print results
  console.log('\n📊 Deployment Results:\n');
  console.log(`Host: ${result.host}`);
  console.log(`Success: ${result.success ? '✅' : '❌'}\n`);

  console.log('Steps:');
  result.steps.forEach((step, idx) => {
    const icon = step.status === 'success' ? '✅' : 
                 step.status === 'failed' ? '❌' :
                 step.status === 'skipped' ? '⏭️' : '🔄';
    console.log(`  ${icon} ${idx + 1}. ${step.step} - ${step.status}`);
    if (step.details) {
      console.log(`     ${step.details}`);
    }
  });

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Next steps guidance
  console.log('\n📝 Next Steps:');
  console.log('  1. Upload codebase via FTP or Terminal API');
  console.log('  2. Run: npm install --production');
  console.log('  3. Configure environment variables');
  console.log('  4. Start service: npm start');
  console.log('\n💡 Use Terminal API for remote command execution:');
  console.log('  POST /execute/Terminal/run_command');
  console.log('  Body: { "command": "cd /path && npm install" }');

  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { deployToCPanel, DeploymentConfig, DeploymentResult };
