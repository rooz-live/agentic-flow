#!/usr/bin/env npx tsx
/**
 * Interactive Yo.life Digital Cockpit
 * 
 * Keyboard shortcuts to execute recommended actions directly from the dashboard.
 * Press number keys to execute corresponding actions, 'r' to refresh, 'q' to quit.
 */

import { CompletionTracker } from '../src/core/completion-tracker.js';
import type { Circle } from '../src/core/completion-tracker.js';
import { CausalLearningIntegration } from '../src/core/causal-learning-integration.js';
import { InfrastructureHealthChecker } from '../src/core/infrastructure-health.js';
import * as readline from 'readline';
import { spawn } from 'child_process';

// Simple arg parsing
const argv = process.argv.slice(2);
const argSet = new Set(argv);
function getArg(name: string, def?: string): string | undefined {
  const pref = `--${name}=`;
  const hit = argv.find(a => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : def;
}

const CIRCLE_CEREMONY_MAP: Record<string, { ceremonies: string[]; dimension: string; skills: string[] }> = {
  orchestrator: { ceremonies: ['standup'], dimension: 'temporal', skills: ['chaotic_workflow', 'minimal_cycle'] },
  assessor: { ceremonies: ['wsjf', 'review'], dimension: 'goal', skills: ['planning_heavy', 'assessment_focused'] },
  innovator: { ceremonies: ['retro'], dimension: 'barrier', skills: ['retro_driven', 'high_failure_cycle'] },
  analyst: { ceremonies: ['refine'], dimension: 'mindset', skills: ['planning_heavy', 'full_cycle'] },
  seeker: { ceremonies: ['replenish'], dimension: 'cockpit', skills: ['full_sprint_cycle'] },
  intuitive: { ceremonies: ['synthesis'], dimension: 'psychological', skills: ['full_cycle'] }
};

interface RecommendedAction {
  key: number;
  description: string;
  command: string;
  args: string[];
  wsjfScore: number;
  causalInsight?: string;
  wsjfBoost?: number;
}

let recommendedActions: RecommendedAction[] = [];

/**
 * Calculate WSJF score for circle actions
 * WSJF = (Cost of Delay) / Job Size
 * Cost of Delay = Completion Gap × 0.6 + Success Gap × 0.4
 */
function calculateCircleWSJF(circle: any): number {
  const completionGap = 100 - circle.avgCompletionPct;
  const successGap = 100 - circle.successRate;
  const costOfDelay = (completionGap * 0.6) + (successGap * 0.4);
  const jobSize = Math.max(1, circle.episodeCount * 0.2); // More history = easier to improve
  return costOfDelay / jobSize;
}

/**
 * Calculate WSJF score for dimension actions
 */
function calculateDimensionWSJF(completion: number, episodes: number): number {
  const completionGap = 100 - completion;
  const costOfDelay = completionGap;
  const jobSize = Math.max(1, episodes * 0.2);
  return costOfDelay / jobSize;
}

async function getRecentEpisodes(): Promise<any[]> {
  try {
    const tracker = new CompletionTracker();
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const query = `SELECT * FROM completion_episodes WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 10`;
    const rows = await (tracker as any).agentdb.query(query, [cutoff]);
    tracker.close();
    return rows;
  } catch (error) {
    console.error('Error fetching recent episodes:', error);
    return [];
  }
}

async function ensureSchemaAndSeed(tracker: CompletionTracker) {
  // Always initialize schema (idempotent)
  await tracker.initSchema();
  // Check if we have any data; seed minimal if empty so WSJF can compute
  const rows = await (tracker as any).agentdb.query('SELECT COUNT(*) as c FROM completion_episodes');
  const count = rows?.[0]?.c ?? 0;
  if (count === 0) {
    const now = Date.now();
    await tracker.storeEpisode({
      episode_id: 'assessor_seed_1', circle: 'assessor', ceremony: 'wsjf', outcome: 'partial',
      completion_pct: 35, confidence: 0.6, timestamp: now - 60*60*1000
    } as any);
    await tracker.storeEpisode({
      episode_id: 'orchestrator_seed_1', circle: 'orchestrator', ceremony: 'standup', outcome: 'success',
      completion_pct: 60, confidence: 0.7, timestamp: now - 30*60*1000
    } as any);
    await tracker.storeEpisode({
      episode_id: 'analyst_seed_1', circle: 'analyst', ceremony: 'refine', outcome: 'success',
      completion_pct: 95, confidence: 0.9, timestamp: now - 45*60*1000
    } as any);
    await tracker.storeEpisode({
      episode_id: 'innovator_seed_1', circle: 'innovator', ceremony: 'retro', outcome: 'success',
      completion_pct: 100, confidence: 1.0, timestamp: now - 90*60*1000
    } as any);
  }
}

async function renderCockpit(autoCycleMode: boolean = false) {
  const tracker = new CompletionTracker();
  const causalLearning = new CausalLearningIntegration();
  recommendedActions = [];
  
  console.clear();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Yo.life Digital Cockpit (Interactive)');
  console.log('   Unified ay-prod × yo.life Dashboard + WHY Learning');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  
  try {
    // Preflight: guarantee schema and minimal data so WSJF can render
    await ensureSchemaAndSeed(tracker);
    // Quick Status (unified view)
    const system = await tracker.getSystemOverview();
    const currentTime = new Date().toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });
    
    console.log(`\n📊 System Overview:`);
    console.log(`   Time: ${currentTime} EST`);
    console.log(`   Mode: production`);
    console.log(`   Total Episodes: ${system.totalEpisodes}`);
    console.log(`   Overall Completion: ${system.overallCompletionPct.toFixed(1)}%`);
    
    // Infrastructure Health Status
    const infraChecker = new InfrastructureHealthChecker();
    const infraHealth = await infraChecker.getOverallHealth();
    const healthIcon = infraChecker.getStatusIcon(infraHealth.overallHealth);
    const timeAgo = infraChecker.getTimeAgo(infraHealth.lastCheckTime);
    
    console.log(`\n🏗️  Infrastructure Health:`);
    console.log(`   ${healthIcon} SSH Connectivity: ${infraHealth.ssh.status} (${timeAgo})`);
    if (infraHealth.ssh.latency) {
      console.log(`   📡 Latency: ${infraHealth.ssh.latency}ms`);
    }
    if (infraHealth.ssh.details) {
      console.log(`   ℹ️  ${infraHealth.ssh.details}`);
    }
    
    // All circle metrics
    const circles = await tracker.getAllCircleMetrics();
    
    // Yo.life dimensions mapping
    console.log(`\n🌐 Yo.life Dimensional Health:`);
    const dimensionMap = new Map<string, { circle: string; completion: number; episodes: number }>();
    
    for (const [circleName, config] of Object.entries(CIRCLE_CEREMONY_MAP)) {
      const circleMetrics = circles.find(c => c.circle === circleName);
      if (circleMetrics) {
        dimensionMap.set(config.dimension, {
          circle: circleName,
          completion: circleMetrics.avgCompletionPct,
          episodes: circleMetrics.episodeCount
        });
      }
    }
    
    // Render dimensions
    const dimensions = ['temporal', 'goal', 'barrier', 'mindset', 'cockpit', 'psychological', 'event'];
    for (const dim of dimensions) {
      const data = dimensionMap.get(dim);
      if (data) {
        const status = data.completion >= 80 ? '✅' : data.completion >= 50 ? '⚠️ ' : '❌';
        const bar = '█'.repeat(Math.floor(data.completion / 10));
        console.log(`   ${status} ${dim.padEnd(15)}: [${bar.padEnd(10)}] ${data.completion.toFixed(1)}% (${data.circle}, ${data.episodes} eps)`);
      } else {
        console.log(`   ⚪ ${dim.padEnd(15)}: [          ] 0.0% (no data)`);
      }
    }
    
    // Circle status
    console.log(`\n🔄 Circle Status:`);
    for (const circle of circles) {
      const bar = '█'.repeat(Math.floor(circle.avgCompletionPct / 10));
      const trend = circle.successRate >= 80 ? '📈' : circle.successRate >= 50 ? '➡️ ' : '📉';
      console.log(`   ${trend} ${circle.circle.padEnd(12)}: [${bar.padEnd(10)}] ${circle.avgCompletionPct.toFixed(1)}% (${circle.episodeCount} eps, ${circle.successRate.toFixed(0)}% success)`);
    }
    
    // Phase breakdown
    const phases = await tracker.getAllPhaseMetrics();
    if (phases.length > 0) {
      console.log(`\n📈 Phase Rollup (A→B→C→D):`);
      for (const phase of phases) {
        const criticalPath = phase.criticalPathPct;
        const avgCompletion = phase.overallCompletionPct;
        const status = avgCompletion >= 80 ? '✅' : avgCompletion >= 50 ? '⚠️ ' : '❌';
        console.log(`   ${status} Phase ${phase.phase}: Overall ${avgCompletion.toFixed(1)}% | Critical Path ${criticalPath.toFixed(1)}% | ${phase.activeCircles} circles`);
      }
    }
    
    // Get recent activity to filter out just-executed actions
    const recentEpisodes = await getRecentEpisodes();
    const recentActions = new Set<string>();
    const COOLDOWN_MINUTES = 10; // Don't recommend actions executed in last 10 minutes
    
    recentEpisodes.forEach((ep: any) => {
      const ageMinutes = (Date.now() - ep.timestamp) / (1000 * 60);
      if (ageMinutes < COOLDOWN_MINUTES) {
        recentActions.add(`${ep.circle}/${ep.ceremony}`);
      }
    });
    
    // Build recommended actions with WSJF scoring + causal insights
    const unsortedActions: Array<Omit<RecommendedAction, 'key'>> = [];
    
    // CRITICAL: Check infrastructure health FIRST before any circle actions
    const infraActions = await infraChecker.getRecommendedActions();
    for (const action of infraActions) {
      // Infrastructure actions get highest priority - add to top of list
      unsortedActions.push({
        description: action.description,
        command: action.command,
        args: action.args,
        wsjfScore: action.wsjfScore,
        causalInsight: action.causalInsight
      });
    }
    
    for (const circle of circles) {
      if (circle.avgCompletionPct < 70) {
        const ceremony = CIRCLE_CEREMONY_MAP[circle.circle as Circle]?.ceremonies[0] || 'ceremony';
        
        // Skip if recently executed (cooldown period)
        const actionKey = `${circle.circle}/${ceremony}`;
        if (recentActions.has(actionKey)) {
          continue; // Skip this action - just executed
        }
        
        // Use deep resolution orchestrator for circle issues
        const command = './scripts/ay-yo-resolve-action.sh';
        const args = ['circle', circle.circle];
        let wsjfScore = calculateCircleWSJF(circle);
        
        // Get causal insights
        const insights = await causalLearning.getCausalInsights(circle.circle, ceremony);
        let causalInsight: string | undefined;
        let wsjfBoost = 0;
        
        if (insights.hasInsights && insights.uplift && Math.abs(insights.uplift) > 15) {
          causalInsight = `WHY: ${insights.mechanism} (N=${insights.sampleSize})`;
          // Boost WSJF for proven high-impact actions (uplift >15% = 1.5x multiplier)
          wsjfBoost = Math.abs(insights.uplift) / 100;
          wsjfScore *= (1 + wsjfBoost);
        }
        
        unsortedActions.push({
          description: `Circle "${circle.circle}" at ${circle.avgCompletionPct.toFixed(1)}%`,
          command,
          args,
          wsjfScore,
          causalInsight,
          wsjfBoost
        });
      }
    }
    
    // Yo.life dimension recommendations  
    for (const [dim, data] of dimensionMap) {
      if (data && data.completion < 60) {
        // Use deep resolution orchestrator for dimension issues
        const command = './scripts/ay-yo-resolve-action.sh';
        const args = ['dimension', dim];
        const wsjfScore = calculateDimensionWSJF(data.completion, data.episodes);
        unsortedActions.push({
          description: `Yo.life dimension "${dim}" at ${data.completion.toFixed(1)}%`,
          command,
          args,
          wsjfScore
        });
      }
    }
    
    // Sort by WSJF score (highest first) and assign keys
    unsortedActions.sort((a, b) => b.wsjfScore - a.wsjfScore);
    recommendedActions = unsortedActions.map((action, index) => ({
      ...action,
      key: index + 1
    }));
    
    // Display WSJF-prioritized actions with causal WHY
    console.log(`\n💡 Recommended Actions (WSJF-Prioritized - Press number to execute):`);
    if (recommendedActions.length === 0) {
      console.log(`   🎉 All systems performing well! Continue current pace.`);
    } else {
      recommendedActions.forEach(action => {
        const wsjfDisplay = action.wsjfBoost 
          ? `WSJF: ${action.wsjfScore.toFixed(1)} ⚡+${(action.wsjfBoost * 100).toFixed(0)}%` 
          : `WSJF: ${action.wsjfScore.toFixed(1)}`;
        console.log(`   [${action.key}] ${action.description} (${wsjfDisplay})`);
        if (action.causalInsight) {
          console.log(`       💡 ${action.causalInsight}`);
        }
        console.log(`       → ${action.command} ${action.args.join(' ')}`);
      });
    }
    
    if (recommendedActions.length === 0) {
      console.log(`   🎉 All systems performing well! Continue current pace.`);
    }
    
    // Recent activity (already fetched above for cooldown filtering)
    if (recentEpisodes.length > 0) {
      console.log(`\n🕒 Recent Activity (last 24h):`);
      recentEpisodes.slice(0, 5).forEach((ep: any) => {
        const ageMinutes = (Date.now() - ep.timestamp) / (1000 * 60);
        const ageHours = (ageMinutes / 60).toFixed(1);
        const outcomeIcon = ep.outcome === 'success' ? '✅' : ep.outcome === 'partial' ? '⚠️ ' : '❌';
        const cooldownIcon = ageMinutes < COOLDOWN_MINUTES ? '⏳' : '';
        console.log(`   ${outcomeIcon} ${ep.circle}/${ep.ceremony} - ${ageHours}h ago (${ep.completion_pct}%) ${cooldownIcon}`);
      });
      if (recentActions.size > 0) {
        console.log(`   💡 Actions with ⏳ are on cooldown (${COOLDOWN_MINUTES}min) and won't be recommended`);
      }
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📅 Last updated: ${new Date().toISOString()}`);
    console.log(`\n⌨️  Commands: [1-${recommendedActions.length}] Execute action | [s] Smart-cycle 🎯 | [a] Auto-cycle | [r] Refresh | [q] Quit\n`);
    
    tracker.close();
    
    // Auto-cycle mode: execute all actions sequentially
    if (autoCycleMode && recommendedActions.length > 0) {
      console.log('\n🔄 Auto-cycle mode: Executing all recommendations in WSJF order...\n');
      
      for (let i = 0; i < recommendedActions.length; i++) {
        const action = recommendedActions[i];
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`[${i + 1}/${recommendedActions.length}] Executing: ${action.description}`);
        console.log(`   WSJF Score: ${action.wsjfScore.toFixed(1)}`);
        if (action.causalInsight) {
          console.log(`   ${action.causalInsight}`);
        }
        console.log(`   Command: ${action.command} ${action.args.join(' ')}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        
        await executeAction(action);
        
        // Brief pause between actions
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('\n✅ Auto-cycle complete! All recommendations executed.\n');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Error rendering cockpit:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  } finally {
    tracker.close();
    causalLearning.close();
  }
}

function executeAction(action: RecommendedAction) {
  console.log('[DEBUG] executeAction() called');
  console.log(`\n🚀 Executing: ${action.command} ${action.args.join(' ')}`);
  console.log(`   ${action.description}\n`);
  
  // Temporarily pause keypress listener to avoid conflicts
  console.log('[DEBUG] Disabling raw mode');
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  console.log('[DEBUG] About to spawn child process');
  
  const startTime = Date.now();
  const child = spawn(action.command, action.args, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    env: {
      ...process.env,
      AY_AUTO_INSERT: '1'  // Auto-insert episodes into AgentDB
    }
  });
  
  child.on('close', async (code) => {
    console.log('[DEBUG] Child process closed with code:', code);
    const executionTime = Date.now() - startTime;
    console.log(`\n✨ Command finished with code: ${code} (${(executionTime / 1000).toFixed(1)}s)`);
    
    // Note: ay-prod-cycle.sh already tracks completion automatically (Step 7.5)
    // So circle ceremonies executed via interactive mode are already tracked
    // We only need to handle non-ay-prod commands (like ay-yo.sh dimension)
    const isYolifeDimension = action.command.includes('ay-yo.sh');
    if (isYolifeDimension && action.args.length >= 1) {
      const dimension = action.args[0];
      // For yo.life dimensions, we don't have a circle, so we track separately
      // This is informational only - dimensions are tracked via their mapped circles
      console.log(`\nℹ️  Note: Yo.life dimension "${dimension}" tracked via mapped circle ceremonies`);
    }
    
    // Trigger skill consolidation (runs in background, non-blocking)
    if (process.env.AY_AUTO_CONSOLIDATE === '1') {
      console.log('\n🔄 Checking for skill consolidation...');
      const consolidationScript = `${process.env.HOME}/Documents/code/agentic-flow-core/scripts/ay-auto-consolidate-skills.sh`;
      spawn(consolidationScript, [], {
        detached: true,
        stdio: 'ignore',
        shell: true
      }).unref(); // Fire and forget - don't block dashboard refresh
    }
    
    // Auto-return to dashboard after brief delay
    console.log('\n🔄 Refreshing dashboard in 2 seconds...');
    console.log('[DEBUG] Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Re-enable keypress listener and refresh dashboard
    console.log('[DEBUG] Re-enabling raw mode');
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    console.log('[DEBUG] Calling renderCockpit()');
    await renderCockpit();
    console.log('[DEBUG] renderCockpit() completed, should show dashboard now');
  });
}

async function startInteractiveMode() {
  console.log('[DEBUG] startInteractiveMode() called');
  // Setup readline for key capture
  console.log('[DEBUG] Setting up readline keypress events');
  readline.emitKeypressEvents(process.stdin);
  console.log('[DEBUG] process.stdin.isTTY:', process.stdin.isTTY);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    console.log('[DEBUG] Raw mode enabled');
  }
  
  try {
    console.log('[DEBUG] About to call renderCockpit()');
    await renderCockpit();
    console.log('[DEBUG] renderCockpit() completed, setting up keypress listener');
  } catch (error) {
    console.error('\n❌ Failed to render initial cockpit:', error);
    process.exit(1);
  }
  
  console.log('[DEBUG] Attaching keypress listener to process.stdin');
  process.stdin.on('keypress', async (str, key) => {
    console.log('[DEBUG] Keypress detected:', { str, key: key?.name, ctrl: key?.ctrl });
    try {
      if (key.ctrl && key.name === 'c') {
        process.exit(0);
      }
      
      if (key.name === 'q') {
        console.log('\n👋 Goodbye!');
        process.exit(0);
      }
      
      if (key.name === 'r') {
        await renderCockpit();
        return;
      }
      
      if (key.name === 's') {
        // Smart-cycle mode: intelligent auto-improvement
        console.log('\n🎯 Starting smart-cycle mode...');
        console.log('Intelligent orchestrator will select and execute optimal improvement modes\n');
        
        // Disable raw mode temporarily
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        
        const scriptDir = process.env.HOME + '/Documents/code/agentic-flow-core/scripts';
        const smartCycleScript = `${scriptDir}/ay-smart-cycle.sh`;
        
        const child = spawn(smartCycleScript, [], {
          stdio: 'inherit',
          shell: true,
          env: {
            ...process.env,
            AY_NON_INTERACTIVE: '1'
          }
        });
        
        child.on('close', async (code) => {
          console.log(`\n✨ Smart-cycle finished with code: ${code}`);
          
          // Re-enable raw mode
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          await renderCockpit();
        });
        
        return;
      }
      
      if (key.name === 'a') {
        // Auto-cycle mode: execute all recommendations in WSJF order
        if (recommendedActions.length === 0) {
          console.log('\n✨ No recommendations to auto-cycle.');
          await new Promise(resolve => setTimeout(resolve, 2000));
          await renderCockpit();
          return;
        }
        
        console.log('\n🔄 Auto-cycle mode: Executing all recommendations in WSJF order...\n');
        
        for (let i = 0; i < recommendedActions.length; i++) {
          const action = recommendedActions[i];
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          console.log(`[${i + 1}/${recommendedActions.length}] Executing: ${action.description}`);
          console.log(`   WSJF Score: ${action.wsjfScore.toFixed(1)}`);
          if (action.causalInsight) {
            console.log(`   ${action.causalInsight}`);
          }
          console.log(`   Command: ${action.command} ${action.args.join(' ')}`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
          
          await executeActionAsync(action);
          
          // Brief pause between actions
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('\n✅ Auto-cycle complete! All recommendations executed.');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await renderCockpit();
        return;
      }
      
      // Check if number key pressed
      const num = parseInt(str);
      if (!isNaN(num) && num >= 1 && num <= recommendedActions.length) {
        const action = recommendedActions[num - 1];
        console.log(`[DEBUG] Number ${num} pressed, executing action:`, action.command, action.args);
        executeAction(action);
        console.log('[DEBUG] executeAction called (note: it\'s async)');
      }
    } catch (error) {
      console.error('\n❌ Error handling keypress:', error);
    }
  });
}

async function executeActionAsync(action: RecommendedAction): Promise<number> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn(action.command, action.args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      env: {
        ...process.env,
        AY_AUTO_INSERT: '1',  // Auto-insert episodes into AgentDB
        AY_NON_INTERACTIVE: '1'  // Prevent nested interactive mode during auto-cycle
      }
    });
    child.on('close', (code) => {
      const executionTime = Date.now() - startTime;
      console.log(`\n✨ Command finished with code: ${code} (${(executionTime / 1000).toFixed(1)}s)`);
      resolve(code ?? 0);
    });
  });
}

async function autoCycleWSJF() {
  const limitStr = getArg('limit');
  const limit = Math.max(1, parseInt(limitStr || '3', 10));
  const minPhaseA = parseFloat(getArg('phaseA', '70') || '70'); // optional stop when Phase A >= target

  const tracker = new CompletionTracker();
  try {
    await ensureSchemaAndSeed(tracker);
  } catch {}
  finally { tracker.close(); }

  for (let i = 1; i <= limit; i++) {
    await renderCockpit(); // recompute recommendedActions and show status
    if (recommendedActions.length === 0) {
      console.log('\n🎉 No actions to execute (system healthy).');
      break;
    }

    // Optional early stop if Phase A already above target
    const t2 = new CompletionTracker();
    try {
      const phaseA = await t2.getPhaseMetrics('A');
      if (phaseA && phaseA.overallCompletionPct >= minPhaseA) {
        console.log(`\n✅ Phase A target met (>= ${minPhaseA}%). Stopping.`);
        break;
      }
    } catch {}
    finally { t2.close(); }

    const action = recommendedActions[0];
    console.log(`\n🚀 Auto-cycle step ${i}/${limit}: ${action.description} → ${action.command} ${action.args.join(' ')}`);
    await executeActionAsync(action);
  }

  console.log('\n✅ Auto-cycle complete. Final dashboard:');
  await renderCockpit();
}

// Entrypoint: auto-cycle or interactive
console.log('[DEBUG] Script starting, args:', argv);

// Check if running in non-interactive mode (nested execution)
if (process.env.AY_NON_INTERACTIVE === '1') {
  console.log('[DEBUG] AY_NON_INTERACTIVE=1 detected, exiting without interactive mode');
  console.log('ℹ️  Skipping interactive cockpit (nested execution)');
  process.exit(0);
}

if (argSet.has('--autocycle')) {
  console.log('[DEBUG] Starting auto-cycle mode');
  autoCycleWSJF().catch((e) => { console.error(e); process.exit(1); });
} else {
  console.log('[DEBUG] Starting interactive mode');
  startInteractiveMode();
}
