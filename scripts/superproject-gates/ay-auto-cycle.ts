#!/usr/bin/env tsx
/**
 * @fileoverview Intelligent Auto-Cycle Mode for ay command
 * Iteratively resolves recommended actions with go/no-go decision points
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

interface ActionRecommendation {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'reward' | 'threshold' | 'skill' | 'health' | 'performance';
  testable: boolean;
  estimatedDuration: number; // seconds
  command: string;
  validation?: string;
}

interface CycleState {
  iteration: number;
  actionsCompleted: number;
  actionsFailed: number;
  actionsSkipped: number;
  startTime: number;
  recommendations: ActionRecommendation[];
}

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// UI Components
function clearScreen() {
  process.stdout.write('\x1Bc');
}

function printHeader(text: string) {
  const width = 80;
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  console.log('\n' + colors.cyan + '━'.repeat(width) + colors.reset);
  console.log(colors.cyan + ' '.repeat(padding) + colors.bright + text + colors.reset);
  console.log(colors.cyan + '━'.repeat(width) + colors.reset + '\n');
}

function printProgress(state: CycleState) {
  const total = state.recommendations.length;
  const completed = state.actionsCompleted;
  const failed = state.actionsFailed;
  const skipped = state.actionsSkipped;
  const remaining = total - completed - failed - skipped;
  
  const percentage = Math.floor((completed / total) * 100);
  const barWidth = 50;
  const filled = Math.floor((completed / total) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
  
  console.log(`${colors.bright}Progress:${colors.reset}`);
  console.log(`${colors.green}${bar}${colors.reset} ${percentage}%`);
  console.log(`${colors.green}✓ ${completed}${colors.reset} completed | ${colors.red}✗ ${failed}${colors.reset} failed | ${colors.yellow}⊘ ${skipped}${colors.reset} skipped | ${colors.cyan}◯ ${remaining}${colors.reset} remaining`);
  
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
  console.log(`${colors.dim}Elapsed: ${formatDuration(elapsed)} | Iteration: ${state.iteration}${colors.reset}\n`);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function printAction(action: ActionRecommendation, index: number) {
  const priorityColor = {
    critical: colors.bgRed,
    high: colors.red,
    medium: colors.yellow,
    low: colors.dim,
  }[action.priority];
  
  const categoryIcon = {
    reward: '💰',
    threshold: '📊',
    skill: '🧠',
    health: '💊',
    performance: '⚡',
  }[action.category];
  
  console.log(`${colors.bright}${index + 1}.${colors.reset} ${categoryIcon} ${action.title}`);
  console.log(`   ${priorityColor}${action.priority.toUpperCase()}${colors.reset} | ${action.testable ? colors.green + '✓ Testable' : colors.yellow + '⊘ Not testable'}${colors.reset} | ~${formatDuration(action.estimatedDuration)}`);
  console.log(`   ${colors.dim}Command: ${action.command}${colors.reset}\n`);
}

async function promptGoNoGo(action: ActionRecommendation): Promise<'go' | 'skip' | 'stop'> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}Action: ${action.title}${colors.reset}`);
    console.log(`Priority: ${action.priority} | Estimated: ${formatDuration(action.estimatedDuration)}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    rl.question(`${colors.cyan}Execute this action?${colors.reset} [${colors.green}Y${colors.reset}es/${colors.yellow}s${colors.reset}kip/${colors.red}q${colors.reset}uit] (default: Y): `, (answer) => {
      rl.close();
      const choice = (answer || 'y').toLowerCase();
      
      if (choice === 'q' || choice === 'quit') {
        resolve('stop');
      } else if (choice === 's' || choice === 'skip') {
        resolve('skip');
      } else {
        resolve('go');
      }
    });
  });
}

function executeAction(action: ActionRecommendation): { success: boolean; output: string; error?: string } {
  console.log(`${colors.blue}▶ Executing: ${action.command}${colors.reset}\n`);
  
  try {
    const output = execSync(action.command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: action.estimatedDuration * 2000, // 2x estimated for safety
    });
    
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.message,
    };
  }
}

function validateAction(action: ActionRecommendation, output: string): boolean {
  if (!action.validation) return true;
  
  console.log(`${colors.cyan}⚙ Running validation: ${action.validation}${colors.reset}\n`);
  
  try {
    const validationOutput = execSync(action.validation, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 10000,
    });
    
    // Check for success indicators
    const successIndicators = ['✅', '✓', 'success', 'passed', 'ok', 'healthy'];
    const hasSuccess = successIndicators.some(indicator => 
      validationOutput.toLowerCase().includes(indicator)
    );
    
    // Check for failure indicators
    const failureIndicators = ['❌', '✗', 'failed', 'error', 'degenerate'];
    const hasFailure = failureIndicators.some(indicator => 
      validationOutput.toLowerCase().includes(indicator)
    );
    
    return hasSuccess && !hasFailure;
  } catch (error) {
    return false;
  }
}

// Generate recommendations based on system state
function generateRecommendations(): ActionRecommendation[] {
  const recommendations: ActionRecommendation[] = [];
  
  // Check reward distribution health
  try {
    const diagOutput = execSync('./scripts/diagnose-rewards.sh', { encoding: 'utf-8' });
    
    if (diagOutput.includes('DEGENERATE') || diagOutput.includes('0.0%')) {
      recommendations.push({
        id: 'reward-variance',
        title: 'Fix Degenerate Reward Distribution',
        priority: 'critical',
        category: 'reward',
        testable: true,
        estimatedDuration: 120,
        command: 'echo "⚠️  Manual integration required: Update episode recording to use reward calculator"',
        validation: './scripts/diagnose-rewards.sh',
      });
      
      recommendations.push({
        id: 'reward-simulate',
        title: 'Simulate Expected Reward Distribution',
        priority: 'high',
        category: 'reward',
        testable: true,
        estimatedDuration: 30,
        command: './scripts/ay-yo.sh rewards simulate 100',
      });
    }
  } catch (error) {
    // Diagnostic tool not available
  }
  
  // Check thresholds
  recommendations.push({
    id: 'threshold-check',
    title: 'Verify Dynamic Thresholds',
    priority: 'medium',
    category: 'threshold',
    testable: true,
    estimatedDuration: 15,
    command: './scripts/ay-yo.sh thresholds',
    validation: './scripts/calculate-thresholds.sh all',
  });
  
  // Check skill balance
  recommendations.push({
    id: 'skill-equity',
    title: 'Analyze Circle Skill Equity',
    priority: 'medium',
    category: 'skill',
    testable: false,
    estimatedDuration: 20,
    command: './scripts/ay-yo.sh equity',
  });
  
  // Infrastructure health
  recommendations.push({
    id: 'ssh-probe',
    title: 'Verify Infrastructure Connectivity',
    priority: 'high',
    category: 'health',
    testable: true,
    estimatedDuration: 10,
    command: './scripts/ay-yo.sh ssh-probe',
  });
  
  // Database optimization
  recommendations.push({
    id: 'db-stats',
    title: 'Check Database Statistics',
    priority: 'low',
    category: 'performance',
    testable: false,
    estimatedDuration: 5,
    command: './scripts/ay-yo.sh servers',
  });
  
  // Test reward calculator
  recommendations.push({
    id: 'reward-test',
    title: 'Test Reward Calculator',
    priority: 'high',
    category: 'reward',
    testable: true,
    estimatedDuration: 10,
    command: './scripts/ay-yo.sh rewards test',
  });
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

async function runCycle(
  maxIterations: number = 10,
  interactive: boolean = true
): Promise<void> {
  clearScreen();
  printHeader('🔄 ay Auto-Cycle Mode');
  
  const state: CycleState = {
    iteration: 0,
    actionsCompleted: 0,
    actionsFailed: 0,
    actionsSkipped: 0,
    startTime: Date.now(),
    recommendations: generateRecommendations(),
  };
  
  console.log(`${colors.bright}Found ${state.recommendations.length} recommended actions${colors.reset}`);
  console.log(`${colors.dim}Mode: ${interactive ? 'Interactive (go/no-go prompts)' : 'Automatic'}${colors.reset}\n`);
  
  // Show all recommendations first
  console.log(`${colors.bright}📋 Action Plan:${colors.reset}\n`);
  state.recommendations.forEach((action, idx) => printAction(action, idx));
  
  if (interactive) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    await new Promise<void>((resolve) => {
      rl.question(`\n${colors.cyan}Press Enter to start, or 'q' to quit: ${colors.reset}`, (answer) => {
        rl.close();
        if (answer.toLowerCase() === 'q') {
          process.exit(0);
        }
        resolve();
      });
    });
  }
  
  // Execute actions
  for (const action of state.recommendations) {
    if (state.iteration >= maxIterations) {
      console.log(`\n${colors.yellow}⚠️  Max iterations (${maxIterations}) reached${colors.reset}`);
      break;
    }
    
    state.iteration++;
    
    clearScreen();
    printHeader(`🔄 Iteration ${state.iteration}/${Math.min(maxIterations, state.recommendations.length)}`);
    printProgress(state);
    printAction(action, state.recommendations.indexOf(action));
    
    // Go/No-Go decision
    let decision: 'go' | 'skip' | 'stop' = 'go';
    if (interactive) {
      decision = await promptGoNoGo(action);
      
      if (decision === 'stop') {
        console.log(`\n${colors.yellow}🛑 Cycle stopped by user${colors.reset}`);
        break;
      }
      
      if (decision === 'skip') {
        console.log(`${colors.yellow}⊘ Skipped${colors.reset}\n`);
        state.actionsSkipped++;
        continue;
      }
    }
    
    // Execute
    const result = executeAction(action);
    
    // Show output
    if (result.output) {
      console.log(`${colors.dim}${result.output.slice(0, 500)}${result.output.length > 500 ? '...' : ''}${colors.reset}\n`);
    }
    
    if (result.success) {
      // Validate if testable
      if (action.testable && action.validation) {
        const validated = validateAction(action, result.output);
        
        if (validated) {
          console.log(`${colors.green}✓ Action completed and validated${colors.reset}\n`);
          state.actionsCompleted++;
        } else {
          console.log(`${colors.yellow}⚠️  Action completed but validation failed${colors.reset}\n`);
          state.actionsFailed++;
        }
      } else {
        console.log(`${colors.green}✓ Action completed${colors.reset}\n`);
        state.actionsCompleted++;
      }
    } else {
      console.log(`${colors.red}✗ Action failed: ${result.error}${colors.reset}\n`);
      state.actionsFailed++;
    }
    
    // Pause between actions
    if (interactive) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Final summary
  clearScreen();
  printHeader('📊 Cycle Complete');
  printProgress(state);
  
  const totalTime = Math.floor((Date.now() - state.startTime) / 1000);
  
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`${colors.green}✓ ${state.actionsCompleted}${colors.reset} actions completed successfully`);
  console.log(`${colors.red}✗ ${state.actionsFailed}${colors.reset} actions failed`);
  console.log(`${colors.yellow}⊘ ${state.actionsSkipped}${colors.reset} actions skipped`);
  console.log(`${colors.cyan}⏱  ${formatDuration(totalTime)}${colors.reset} total time\n`);
  
  // Recommendations
  if (state.actionsFailed > 0) {
    console.log(`${colors.yellow}⚠️  Some actions failed. Review errors and retry.${colors.reset}`);
  }
  
  if (state.actionsCompleted === state.recommendations.length) {
    console.log(`${colors.green}🎉 All recommended actions completed!${colors.reset}`);
  }
  
  console.log(`\n${colors.dim}Run 'ay rewards diagnose' to verify system health${colors.reset}\n`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const maxIterations = parseInt(args[0] || '10', 10);
  const interactive = !args.includes('--auto') && !args.includes('-a');
  
  try {
    await runCycle(maxIterations, interactive);
  } catch (error: any) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

main();
