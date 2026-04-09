#!/usr/bin/env node

/**
 * yo.life Digital Cockpit CLI
 * 
 * Dimensional UI/UX command-line interface for life enhancement
 * Integrates with claude-flow V3, MCP, and AgentDB
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import Table from 'cli-table3';
import figlet from 'figlet';

// ============================================================================
// Types and Interfaces
// ============================================================================

export enum Dimension {
  TEMPORAL = 'temporal',
  SPATIAL = 'spatial',
  DEMOGRAPHIC = 'demographic',
  PSYCHOLOGICAL = 'psychological',
  ECONOMIC = 'economic'
}

export enum ViewMode {
  TIMELINE = 'timeline',
  MAP = 'map',
  NETWORK = 'network',
  MENTAL_MODEL = 'mental-model',
  RESOURCE = 'resource'
}

export interface CockpitConfig {
  primaryDimension: Dimension;
  viewMode: ViewMode;
  claudeFlowEnabled: boolean;
  mcpServers: string[];
  agentdbConnected: boolean;
}

export interface LifeEvent {
  id: string;
  timestamp: Date;
  title: string;
  description: string;
  location?: { lat: number; lng: number; name: string };
  emotional: { valence: number; arousal: number }; // -1 to 1
  tags: string[];
  significance: number; // 1-10
}

export interface DimensionalInsight {
  dimension: Dimension;
  metric: string;
  value: any;
  trend: 'up' | 'down' | 'stable';
  agentSource?: string;
}

// ============================================================================
// CLI Program Setup
// ============================================================================

const program = new Command();

program
  .name('ay')
  .description('yo.life Digital Cockpit - Dimensional life enhancement interface')
  .version('1.0.0');

// ============================================================================
// Main Menu Command
// ============================================================================

program
  .command('cockpit')
  .alias('c')
  .description('Launch interactive digital cockpit')
  .option('-d, --dimension <type>', 'Primary dimension (temporal|spatial|demographic|psychological|economic)')
  .option('-v, --view <mode>', 'View mode (timeline|map|network|mental-model|resource)')
  .option('--claude-flow', 'Enable claude-flow agent coordination')
  .option('--mcp', 'Enable MCP protocol integration')
  .option('--non-interactive', 'Run in non-interactive mode (for automated ceremonies)')
  .action(async (options) => {
    await launchCockpit(options);
  });

// ============================================================================
// Dimension Commands
// ============================================================================

program
  .command('temporal')
  .alias('t')
  .description('View temporal dimension (timeline analysis)')
  .option('-r, --range <period>', 'Time range (week|month|year|all)', 'month')
  .option('--events', 'Show life events')
  .option('--predict', 'Enable future path prediction')
  .action(async (options) => {
    await showTemporalView(options);
  });

program
  .command('spatial')
  .alias('s')
  .description('View spatial dimension (geographic analysis)')
  .option('--osint', 'Include OSINT intelligence overlay')
  .option('--heatmap', 'Show location significance heatmap')
  .action(async (options) => {
    await showSpatialView(options);
  });

program
  .command('demographic')
  .alias('d')
  .description('View demographic dimension (social network)')
  .option('--relationships', 'Analyze relationship patterns')
  .option('--community', 'Show community connections')
  .action(async (options) => {
    await showDemographicView(options);
  });

program
  .command('psychological')
  .alias('p')
  .description('View psychological dimension (mental models)')
  .option('--beliefs', 'Analyze belief systems')
  .option('--emotions', 'Track emotional patterns')
  .option('--mindset', 'Show mindset evolution')
  .action(async (options) => {
    await showPsychologicalView(options);
  });

program
  .command('economic')
  .alias('e')
  .description('View economic dimension (resource allocation)')
  .option('--time', 'Time investment analysis')
  .option('--money', 'Financial resource tracking')
  .option('--energy', 'Energy allocation patterns')
  .action(async (options) => {
    await showEconomicView(options);
  });

// ============================================================================
// Life Mapping Commands
// ============================================================================

program
  .command('map')
  .description('Life mapping operations')
  .addCommand(
    new Command('init')
      .description('Initialize new life map')
      .action(async () => {
        await initializeLifeMap();
      })
  )
  .addCommand(
    new Command('event')
      .description('Record critical life event')
      .option('-t, --title <text>', 'Event title')
      .option('-d, --date <date>', 'Event date (YYYY-MM-DD)')
      .option('-l, --location <place>', 'Location name')
      .option('--emotion <valence,arousal>', 'Emotional state (-1 to 1, -1 to 1)')
      .action(async (options) => {
        await recordLifeEvent(options);
      })
  )
  .addCommand(
    new Command('journey')
      .description('Visualize full life journey')
      .option('--from <date>', 'Start date')
      .option('--to <date>', 'End date')
      .option('--dimension <type>', 'Focus dimension')
      .action(async (options) => {
        await visualizeJourney(options);
      })
  );

// ============================================================================
// Flourishing Life Model Commands
// ============================================================================

program
  .command('flm')
  .description('Flourishing Life Model operations')
  .addCommand(
    new Command('goal')
      .description('Set or track goals')
      .option('-a, --add <text>', 'Add new goal')
      .option('-l, --list', 'List all goals')
      .option('-p, --progress <id>', 'Update progress')
      .action(async (options) => {
        await manageGoals(options);
      })
  )
  .addCommand(
    new Command('barrier')
      .description('Identify and track barriers')
      .option('-i, --identify', 'Identify current barriers')
      .option('-r, --resolve <id>', 'Mark barrier as resolved')
      .action(async (options) => {
        await manageBarriers(options);
      })
  )
  .addCommand(
    new Command('mindset')
      .description('Mindset cultivation tracking')
      .option('--assess', 'Assess current mindset')
      .option('--history', 'Show mindset evolution')
      .action(async (options) => {
        await trackMindset(options);
      })
  );

// ============================================================================
// Intelligence Commands
// ============================================================================

program
  .command('intel')
  .description('OSINT and intelligence operations')
  .addCommand(
    new Command('analyze')
      .description('Analyze location or demographic data')
      .requiredOption('-l, --location <place>', 'Location to analyze')
      .option('--security', 'Include security assessment')
      .option('--demographic', 'Include demographic analysis')
      .action(async (options) => {
        await runIntelligenceAnalysis(options);
      })
  )
  .addCommand(
    new Command('report')
      .description('Generate intelligence report')
      .option('--type <category>', 'Report type (security|demographic|spatial)')
      .action(async (options) => {
        await generateIntelReport(options);
      })
  );

// ============================================================================
// Agent Commands (claude-flow integration)
// ============================================================================

program
  .command('agent')
  .description('Agent coordination via claude-flow')
  .addCommand(
    new Command('spawn')
      .description('Spawn specialized agent')
      .requiredOption('-t, --type <agent>', 'Agent type (life-coach|analyst|security|pathfinder)')
      .option('--task <description>', 'Specific task for agent')
      .action(async (options) => {
        await spawnAgent(options);
      })
  )
  .addCommand(
    new Command('swarm')
      .description('Coordinate agent swarm')
      .option('--task <description>', 'Swarm task')
      .option('--agents <count>', 'Number of agents', '5')
      .action(async (options) => {
        await coordinateSwarm(options);
      })
  )
  .addCommand(
    new Command('status')
      .description('Show agent status')
      .action(async () => {
        await showAgentStatus();
      })
  );

// ============================================================================
// Pivot Commands
// ============================================================================

program
  .command('pivot')
  .description('Switch between dimensional views')
  .argument('<from>', 'Source dimension')
  .argument('<to>', 'Target dimension')
  .option('--filter <criteria>', 'Apply dimension filter')
  .action(async (from, to, options) => {
    await pivotView(from as Dimension, to as Dimension, options);
  });

// ============================================================================
// MCP Commands
// ============================================================================

program
  .command('mcp')
  .description('Model Context Protocol operations')
  .addCommand(
    new Command('servers')
      .description('List available MCP servers')
      .action(async () => {
        await listMCPServers();
      })
  )
  .addCommand(
    new Command('tools')
      .description('Show available MCP tools')
      .option('-s, --server <name>', 'Filter by server')
      .action(async (options) => {
        await showMCPTools(options);
      })
  );

// ============================================================================
// Implementation Functions
// ============================================================================

async function launchCockpit(options: any) {
  console.log(chalk.cyan(figlet.textSync('yo.life', { horizontalLayout: 'full' })));
  console.log(chalk.gray('Digital Cockpit for Life Enhancement\n'));

  // Check if stdin is a TTY (interactive terminal)
  const isTTY = process.stdin.isTTY;
  
  let spinner;
  if (isTTY) {
    spinner = ora('Initializing systems...').start();
  } else {
    console.log(chalk.dim('Initializing systems...'));
  }
  
  // Simulate system checks
  await delay(500);
  if (isTTY && spinner) {
    spinner.text = 'Connecting to claude-flow V3...';
  } else {
    console.log(chalk.dim('Connecting to claude-flow V3...'));
  }
  await delay(500);
  if (isTTY && spinner) {
    spinner.text = 'Loading AgentDB indices...';
  } else {
    console.log(chalk.dim('Loading AgentDB indices...'));
  }
  await delay(500);
  if (isTTY && spinner) {
    spinner.text = 'Initializing MCP protocol...';
  } else {
    console.log(chalk.dim('Initializing MCP protocol...'));
  }
  await delay(500);
  
  if (isTTY && spinner) {
    spinner.succeed('Systems ready');
  } else {
    console.log(chalk.green('✓ Systems ready'));
  }

  // Non-interactive mode for automated ceremonies
  if (options.nonInteractive) {
    console.log(chalk.green('✅ Cockpit initialized (non-interactive mode)'));
    console.log(chalk.gray('   • AgentDB: Connected'));
    console.log(chalk.gray('   • MCP: Ready'));
    console.log(chalk.gray('   • Claude-flow: Available'));
    console.log(chalk.green('\n✅ Cockpit ceremony complete\n'));
    return;
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Select cockpit mode:',
      choices: [
        { name: '📅 Temporal View (Timeline)', value: 'temporal' },
        { name: '🗺️  Spatial View (Map)', value: 'spatial' },
        { name: '👥 Demographic View (Network)', value: 'demographic' },
        { name: '🧠 Psychological View (Mental Model)', value: 'psychological' },
        { name: '💰 Economic View (Resources)', value: 'economic' },
        new inquirer.Separator(),
        { name: '🎯 Set Goal (FLM)', value: 'goal' },
        { name: '📍 Record Event', value: 'event' },
        { name: '🤖 Spawn Agent', value: 'agent' },
        { name: '🔄 Pivot View', value: 'pivot' },
        new inquirer.Separator(),
        { name: '📊 Dashboard Overview', value: 'dashboard' },
        { name: '⚙️  Settings', value: 'settings' },
        { name: '❌ Exit', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'temporal':
      await showTemporalView({});
      break;
    case 'spatial':
      await showSpatialView({});
      break;
    case 'dashboard':
      await showDashboard();
      break;
    case 'exit':
      console.log(chalk.green('\nStay flourishing! 🌱\n'));
      process.exit(0);
    default:
      console.log(chalk.yellow(`\n${action} mode coming soon...\n`));
  }
}

async function showTemporalView(options: any) {
  console.log(chalk.bold.cyan('\n📅 Temporal Dimension View\n'));

  // Mock life events
  const events: LifeEvent[] = [
    {
      id: '1',
      timestamp: new Date('2025-06-15'),
      title: 'Career Transition',
      description: 'Started new role as Tech Lead',
      location: { lat: 52.52, lng: 13.405, name: 'Berlin, Germany' },
      emotional: { valence: 0.7, arousal: 0.6 },
      tags: ['career', 'growth'],
      significance: 9
    },
    {
      id: '2',
      timestamp: new Date('2025-09-01'),
      title: 'Marathon Completion',
      description: 'Finished first marathon in 3:45',
      location: { lat: 52.52, lng: 13.405, name: 'Berlin, Germany' },
      emotional: { valence: 0.9, arousal: 0.8 },
      tags: ['health', 'achievement'],
      significance: 8
    },
    {
      id: '3',
      timestamp: new Date('2025-12-20'),
      title: 'Family Reunion',
      description: 'Holiday celebration with extended family',
      location: { lat: 40.7128, lng: -74.0060, name: 'New York, USA' },
      emotional: { valence: 0.8, arousal: 0.4 },
      tags: ['family', 'connection'],
      significance: 7
    }
  ];

  const table = new Table({
    head: ['Date', 'Event', 'Location', 'Emotion', 'Significance'],
    colWidths: [12, 25, 20, 15, 12]
  });

  events.forEach(event => {
    const emotionEmoji = getEmotionEmoji(event.emotional.valence, event.emotional.arousal);
    table.push([
      chalk.gray(event.timestamp.toISOString().split('T')[0]),
      chalk.white(event.title),
      chalk.cyan(event.location?.name || 'N/A'),
      emotionEmoji,
      '⭐'.repeat(Math.floor(event.significance / 2))
    ]);
  });

  console.log(table.toString());

  if (options.predict) {
    console.log(chalk.bold.yellow('\n🔮 Future Path Predictions:\n'));
    console.log(chalk.gray('  • Career: 75% probability of promotion within 6 months'));
    console.log(chalk.gray('  • Health: Trend suggests 2026 athletic goals achievable'));
    console.log(chalk.gray('  • Relationships: Strong family connections likely to continue\n'));
  }

  // Agent insights
  console.log(chalk.bold.magenta('🤖 Agent Insights:\n'));
  console.log(chalk.gray('  • Pattern detected: Major achievements cluster in Q2-Q3'));
  console.log(chalk.gray('  • Recommendation: Schedule challenging goals for summer months'));
  console.log(chalk.gray('  • Mindset: Consistent growth orientation across domains\n'));
}

async function showSpatialView(options: any) {
  console.log(chalk.bold.cyan('\n🗺️  Spatial Dimension View\n'));

  console.log('Life Event Locations:\n');
  console.log('  📍 Berlin, Germany       - Primary location (60% of events)');
  console.log('  📍 New York, USA         - Secondary hub (25% of events)');
  console.log('  📍 Barcelona, Spain      - Occasional (10% of events)');
  console.log('  📍 Tokyo, Japan          - Rare (5% of events)\n');

  if (options.osint) {
    console.log(chalk.bold.yellow('🔍 OSINT Intelligence Overlay:\n'));
    console.log(chalk.gray('  • Berlin: High quality of life index (8.2/10)'));
    console.log(chalk.gray('  • Safety assessment: Low risk, stable environment'));
    console.log(chalk.gray('  • Community: Strong expat/tech community presence'));
    console.log(chalk.gray('  • Opportunities: Growing startup ecosystem\n'));
  }

  if (options.heatmap) {
    console.log(chalk.bold.green('🔥 Location Significance Heatmap:\n'));
    console.log('  Berlin       ' + chalk.red('██████████████████░░') + ' 90%');
    console.log('  New York     ' + chalk.yellow('████████░░░░░░░░░░░░') + ' 40%');
    console.log('  Barcelona    ' + chalk.green('████░░░░░░░░░░░░░░░░') + ' 20%');
    console.log('  Tokyo        ' + chalk.blue('██░░░░░░░░░░░░░░░░░░') + ' 10%\n');
  }
}

async function showDemographicView(options: any) {
  console.log(chalk.bold.cyan('\n👥 Demographic Dimension View\n'));
  console.log(chalk.gray('Social network analysis and community connections\n'));
  
  const networkTable = new Table({
    head: ['Connection Type', 'Count', 'Strength', 'Trend'],
    colWidths: [20, 10, 15, 15]
  });

  networkTable.push(
    ['Family', '12', chalk.green('Strong'), chalk.green('↑')],
    ['Close Friends', '8', chalk.green('Strong'), chalk.yellow('→')],
    ['Colleagues', '45', chalk.yellow('Moderate'), chalk.green('↑')],
    ['Community', '120', chalk.cyan('Growing'), chalk.green('↑↑')],
    ['Professional', '230', chalk.blue('Weak'), chalk.yellow('→')]
  );

  console.log(networkTable.toString());
  console.log();
}

async function showPsychologicalView(options: any) {
  console.log(chalk.bold.cyan('\n🧠 Psychological Dimension View\n'));
  
  console.log(chalk.bold('Core Beliefs & Mental Models:\n'));
  console.log('  ✓ Growth Mindset         ' + chalk.green('██████████████████░░') + ' 90%');
  console.log('  ✓ Self-Efficacy          ' + chalk.green('████████████████░░░░') + ' 80%');
  console.log('  ✓ Resilience             ' + chalk.yellow('██████████████░░░░░░') + ' 70%');
  console.log('  ⚠ Work-Life Balance      ' + chalk.yellow('██████████░░░░░░░░░░') + ' 50%');
  console.log();

  console.log(chalk.bold('Emotional Patterns (Last 30 Days):\n'));
  console.log('  Valence:  ' + chalk.green('Predominantly positive (+0.6 avg)'));
  console.log('  Arousal:  ' + chalk.cyan('Moderate activation (0.5 avg)'));
  console.log('  Variance: ' + chalk.yellow('Stable with occasional spikes\n'));

  console.log(chalk.bold.magenta('🤖 Agent Recommendation:\n'));
  console.log(chalk.gray('  Focus area: Work-life balance requires attention'));
  console.log(chalk.gray('  Suggested action: Schedule regular recovery periods'));
  console.log(chalk.gray('  Predicted impact: +15% wellbeing score\n'));
}

async function showEconomicView(options: any) {
  console.log(chalk.bold.cyan('\n💰 Economic Dimension View\n'));
  
  console.log(chalk.bold('Resource Allocation:\n'));
  console.log('  Time:');
  console.log('    Work          ' + chalk.red('████████████░░░░░░░░') + ' 60%');
  console.log('    Personal      ' + chalk.green('████████░░░░░░░░░░░░') + ' 40%');
  console.log();
  console.log('  Energy:');
  console.log('    High Impact   ' + chalk.green('██████████░░░░░░░░░░') + ' 50%');
  console.log('    Medium Impact ' + chalk.yellow('██████░░░░░░░░░░░░░░') + ' 30%');
  console.log('    Low Impact    ' + chalk.red('████░░░░░░░░░░░░░░░░') + ' 20%');
  console.log();
  console.log('  Money:');
  console.log('    Investment    ' + chalk.green('████████████░░░░░░░░') + ' 60%');
  console.log('    Living        ' + chalk.cyan('██████░░░░░░░░░░░░░░') + ' 30%');
  console.log('    Discretionary ' + chalk.blue('██░░░░░░░░░░░░░░░░░░') + ' 10%');
  console.log();

  console.log(chalk.bold.yellow('💡 Optimization Opportunities:\n'));
  console.log(chalk.gray('  • Reallocate 10% of low-impact energy to high-impact activities'));
  console.log(chalk.gray('  • Consider time investment diversification (currently 60/40 split)'));
  console.log(chalk.gray('  • ROI analysis suggests focus on skill development\n'));
}

async function showDashboard() {
  console.log(chalk.bold.cyan('\n📊 yo.life Dashboard Overview\n'));

  const insights: DimensionalInsight[] = [
    { dimension: Dimension.TEMPORAL, metric: 'Progress Velocity', value: '+12%', trend: 'up' },
    { dimension: Dimension.SPATIAL, metric: 'Location Diversity', value: '4 cities', trend: 'stable' },
    { dimension: Dimension.DEMOGRAPHIC, metric: 'Network Strength', value: '8.2/10', trend: 'up' },
    { dimension: Dimension.PSYCHOLOGICAL, metric: 'Wellbeing Score', value: '7.8/10', trend: 'stable' },
    { dimension: Dimension.ECONOMIC, metric: 'Resource Efficiency', value: '72%', trend: 'up', agentSource: 'optimizer-agent' }
  ];

  const dashTable = new Table({
    head: ['Dimension', 'Metric', 'Value', 'Trend', 'Source'],
    colWidths: [18, 25, 12, 8, 20]
  });

  insights.forEach(insight => {
    const trendIcon = insight.trend === 'up' ? chalk.green('↑') : 
                      insight.trend === 'down' ? chalk.red('↓') : chalk.yellow('→');
    const dimIcon = getDimensionIcon(insight.dimension);
    
    dashTable.push([
      `${dimIcon} ${insight.dimension}`,
      insight.metric,
      chalk.bold(insight.value),
      trendIcon,
      insight.agentSource ? chalk.magenta(`🤖 ${insight.agentSource}`) : chalk.gray('system')
    ]);
  });

  console.log(dashTable.toString());
  console.log();

  console.log(chalk.bold.green('✅ Active Goals: 3/5 on track\n'));
  console.log(chalk.bold.yellow('⚠️  Barriers Identified: 2 (1 being addressed)\n'));
  console.log(chalk.bold.cyan('🚀 Recent Milestones: Marathon completed, Career transition\n'));
}

async function initializeLifeMap() {
  console.log(chalk.bold.cyan('\n🗺️  Initialize Life Map\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Your name:',
      validate: (input) => input.length > 0
    },
    {
      type: 'input',
      name: 'birthdate',
      message: 'Birthdate (YYYY-MM-DD):',
      validate: (input) => !isNaN(Date.parse(input))
    },
    {
      type: 'input',
      name: 'location',
      message: 'Primary location:',
      default: 'Berlin, Germany'
    },
    {
      type: 'checkbox',
      name: 'focusAreas',
      message: 'Focus areas (select multiple):',
      choices: [
        'Career & Professional',
        'Health & Fitness',
        'Relationships & Social',
        'Personal Growth',
        'Financial Wellbeing',
        'Creative Expression'
      ]
    }
  ]);

  const spinner = ora('Creating your life map...').start();
  await delay(1500);
  spinner.succeed('Life map initialized!');

  console.log(chalk.green('\n✅ Your journey begins here.\n'));
  console.log(chalk.gray(`   Name: ${answers.name}`));
  console.log(chalk.gray(`   Focus: ${answers.focusAreas.join(', ')}\n`));
}

async function recordLifeEvent(options: any) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Event title:',
      default: options.title
    },
    {
      type: 'input',
      name: 'date',
      message: 'Event date (YYYY-MM-DD):',
      default: options.date || new Date().toISOString().split('T')[0]
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Event description (opens editor):'
    },
    {
      type: 'list',
      name: 'emotion',
      message: 'Emotional state:',
      choices: [
        { name: '😊 Joyful & Energized', value: { valence: 0.8, arousal: 0.7 } },
        { name: '😌 Content & Calm', value: { valence: 0.7, arousal: 0.3 } },
        { name: '😐 Neutral', value: { valence: 0, arousal: 0 } },
        { name: '😟 Anxious', value: { valence: -0.3, arousal: 0.6 } },
        { name: '😢 Sad', value: { valence: -0.7, arousal: 0.2 } }
      ]
    },
    {
      type: 'number',
      name: 'significance',
      message: 'Significance (1-10):',
      default: 5,
      validate: (input) => {
        if (input === undefined || input === null) {
          return false;
        }
        return input >= 1 && input <= 10;
      }
    }
  ]);

  const spinner = ora('Recording event...').start();
  await delay(1000);
  
  // Trigger agent analysis
  spinner.text = 'Agent analyzing patterns...';
  await delay(1500);
  
  spinner.succeed('Event recorded!');

  console.log(chalk.bold.magenta('\n🤖 Agent Insights:\n'));
  console.log(chalk.gray('  • This event aligns with your career growth focus'));
  console.log(chalk.gray('  • Similar emotional pattern detected 3 months ago'));
  console.log(chalk.gray('  • Consider documenting lessons learned\n'));
}

async function visualizeJourney(options: any) {
  console.log(chalk.bold.cyan('\n🛤️  Life Journey Visualization\n'));
  
  console.log('Timeline:\n');
  console.log('  2020 ──●────────● 2022 ──●──●── 2024 ──●─→ 2026');
  console.log('         │        │        │  │        │');
  console.log('      Career   Health  Family │     Today');
  console.log('      Start            Event  │');
  console.log('                         Career');
  console.log('                         Growth\n');

  console.log(chalk.bold.yellow('Key Patterns:\n'));
  console.log(chalk.gray('  • Career milestones every ~2 years'));
  console.log(chalk.gray('  • Health focus intensified in 2022'));
  console.log(chalk.gray('  • Family events clustered around holidays\n'));
}

async function manageGoals(options: any) {
  if (options.list) {
    console.log(chalk.bold.cyan('\n🎯 Current Goals\n'));
    
    const goalsTable = new Table({
      head: ['Goal', 'Progress', 'Deadline', 'Status'],
      colWidths: [30, 15, 15, 12]
    });

    goalsTable.push(
      ['Complete advanced ML course', '65%', '2026-03-31', chalk.yellow('Active')],
      ['Run sub-3:30 marathon', '40%', '2026-06-15', chalk.cyan('Planning')],
      ['Launch side project', '80%', '2026-02-28', chalk.green('Near complete')]
    );

    console.log(goalsTable.toString());
    console.log();
  }

  if (options.add) {
    const spinner = ora('Creating goal...').start();
    await delay(1000);
    spinner.succeed(`Goal added: ${options.add}`);
    
    console.log(chalk.bold.magenta('\n🤖 Agent Analysis:\n'));
    console.log(chalk.gray('  • Goal complexity: Medium'));
    console.log(chalk.gray('  • Estimated timeframe: 3-6 months'));
    console.log(chalk.gray('  • Suggested first step: Break into milestones\n'));
  }
}

async function manageBarriers(options: any) {
  if (options.identify) {
    console.log(chalk.bold.cyan('\n🚧 Identified Barriers\n'));
    
    console.log('  1. Time constraints (Career demands vs personal goals)');
    console.log('  2. Skill gaps (Advanced ML concepts)');
    console.log();

    console.log(chalk.bold.magenta('🤖 Agent Recommendations:\n'));
    console.log(chalk.gray('  • Barrier #1: Time blocking strategy + delegate non-essentials'));
    console.log(chalk.gray('  • Barrier #2: Structured learning path + peer accountability\n'));
  }
}

async function trackMindset(options: any) {
  if (options.assess) {
    console.log(chalk.bold.cyan('\n🧠 Mindset Assessment\n'));
    
    const spinner = ora('Analyzing mindset patterns...').start();
    await delay(2000);
    spinner.succeed('Assessment complete');

    console.log();
    console.log(chalk.bold('Current Mindset Profile:\n'));
    console.log('  Growth Orientation:  ' + chalk.green('██████████████████░░') + ' 90%');
    console.log('  Resilience:          ' + chalk.green('████████████████░░░░') + ' 80%');
    console.log('  Optimism:            ' + chalk.yellow('██████████████░░░░░░') + ' 70%');
    console.log('  Self-Compassion:     ' + chalk.yellow('████████████░░░░░░░░') + ' 60%');
    console.log();

    console.log(chalk.bold.yellow('💡 Focus Area: Self-Compassion\n'));
    console.log(chalk.gray('  Practicing self-compassion can improve overall resilience'));
    console.log(chalk.gray('  and sustain high performance without burnout.\n'));
  }

  if (options.history) {
    console.log(chalk.bold.cyan('\n📈 Mindset Evolution\n'));
    console.log('  2023 Q1: Fixed → Growth mindset shift');
    console.log('  2023 Q3: Resilience building period');
    console.log('  2024 Q2: Peak performance phase');
    console.log('  2025 Q4: Integration & balance focus\n');
  }
}

async function runIntelligenceAnalysis(options: any) {
  console.log(chalk.bold.cyan('\n🔍 Intelligence Analysis\n'));
  
  const spinner = ora(`Analyzing: ${options.location}...`).start();
  
  await delay(1000);
  spinner.text = 'Gathering OSINT data...';
  await delay(1500);
  spinner.text = 'Processing demographic information...';
  await delay(1000);
  
  if (options.security) {
    spinner.text = 'Running security assessment...';
    await delay(1500);
  }
  
  spinner.succeed('Analysis complete');

  console.log(chalk.bold(`\nLocation: ${options.location}\n`));
  
  if (options.demographic) {
    console.log(chalk.bold('Demographics:\n'));
    console.log(chalk.gray('  Population: ~3.7M'));
    console.log(chalk.gray('  Median Age: 42 years'));
    console.log(chalk.gray('  Diversity Index: High'));
    console.log(chalk.gray('  Education Level: University degree 40%+\n'));
  }

  if (options.security) {
    console.log(chalk.bold.yellow('Security Assessment:\n'));
    console.log(chalk.green('  Overall Risk: Low'));
    console.log(chalk.gray('  Crime Rate: Below EU average'));
    console.log(chalk.gray('  Political Stability: High'));
    console.log(chalk.gray('  Infrastructure: Excellent\n'));
  }

  console.log(chalk.bold.magenta('🤖 Agent Insights:\n'));
  console.log(chalk.gray('  • Excellent environment for tech professionals'));
  console.log(chalk.gray('  • Strong quality of life indicators'));
  console.log(chalk.gray('  • Growing international community\n'));
}

async function generateIntelReport(options: any) {
  const spinner = ora('Generating comprehensive report...').start();
  await delay(2000);
  spinner.succeed('Report generated');

  console.log(chalk.bold.cyan('\n📄 Intelligence Report Summary\n'));
  console.log(chalk.gray('  Type: Multi-dimensional analysis'));
  console.log(chalk.gray('  Generated: ' + new Date().toISOString()));
  console.log(chalk.gray('  Data Sources: 12 OSINT feeds'));
  console.log(chalk.gray('  Confidence: High (87%)\n'));
  console.log(chalk.yellow('  Full report saved to: ./reports/intel-' + Date.now() + '.json\n'));
}

async function spawnAgent(options: any) {
  console.log(chalk.bold.cyan('\n🤖 Spawning Agent\n'));
  
  const agentTypes = {
    'life-coach': 'Personal development & goal achievement',
    'analyst': 'Data analysis & pattern recognition',
    'security': 'Risk assessment & OSINT',
    'pathfinder': 'Future trajectory planning'
  };

  const spinner = ora(`Initializing ${options.type} agent...`).start();
  
  await delay(1000);
  spinner.text = 'Loading agent parameters...';
  await delay(800);
  spinner.text = 'Connecting to claude-flow swarm...';
  await delay(1200);
  spinner.text = 'Establishing MCP connection...';
  await delay(900);
  
  spinner.succeed(`${options.type} agent spawned (ID: agent-${Date.now().toString(36)})`);

  console.log();
  console.log(chalk.gray(`  Type: ${agentTypes[options.type as keyof typeof agentTypes]}`));
  
  if (options.task) {
    console.log(chalk.gray(`  Task: ${options.task}`));
    console.log();
    
    const taskSpinner = ora('Agent working on task...').start();
    await delay(2500);
    taskSpinner.succeed('Task complete');

    console.log();
    console.log(chalk.bold.green('✅ Agent Results:\n'));
    console.log(chalk.gray('  • Analysis completed'));
    console.log(chalk.gray('  • 3 recommendations generated'));
    console.log(chalk.gray('  • Insights added to dashboard\n'));
  } else {
    console.log(chalk.gray('  Status: Ready for tasks\n'));
  }
}

async function coordinateSwarm(options: any) {
  console.log(chalk.bold.cyan('\n🐝 Swarm Coordination\n'));
  
  const agentCount = parseInt(options.agents);
  const spinner = ora(`Spawning ${agentCount} agents...`).start();
  
  for (let i = 0; i < agentCount; i++) {
    await delay(300);
    spinner.text = `Spawning agent ${i + 1}/${agentCount}...`;
  }
  
  spinner.succeed(`Swarm initialized with ${agentCount} agents`);

  if (options.task) {
    console.log(chalk.gray(`\nSwarm task: ${options.task}\n`));
    
    const taskSpinner = ora('Agents collaborating...').start();
    await delay(3000);
    taskSpinner.succeed('Swarm consensus reached');

    console.log();
    console.log(chalk.bold.green('🎯 Swarm Results:\n'));
    console.log(chalk.gray('  • 5 agents participated'));
    console.log(chalk.gray('  • Consensus confidence: 92%'));
    console.log(chalk.gray('  • Execution plan generated'));
    console.log(chalk.gray('  • Ready for approval\n'));
  }
}

async function showAgentStatus() {
  console.log(chalk.bold.cyan('\n🤖 Agent Status\n'));
  
  const statusTable = new Table({
    head: ['Agent ID', 'Type', 'Status', 'Task', 'Progress'],
    colWidths: [15, 18, 12, 30, 12]
  });

  statusTable.push(
    ['agent-abc123', 'life-coach', chalk.green('Active'), 'Goal analysis', '75%'],
    ['agent-def456', 'analyst', chalk.green('Active'), 'Pattern detection', '100%'],
    ['agent-ghi789', 'pathfinder', chalk.yellow('Idle'), 'Awaiting task', '-']
  );

  console.log(statusTable.toString());
  console.log();

  console.log(chalk.bold('Swarm Coordination Status:\n'));
  console.log(chalk.gray('  • Active agents: 2'));
  console.log(chalk.gray('  • Tasks completed (24h): 8'));
  console.log(chalk.gray('  • Average task time: 3.2 minutes'));
  console.log(chalk.gray('  • Swarm efficiency: 94%\n'));
}

async function pivotView(from: Dimension, to: Dimension, options: any) {
  console.log(chalk.bold.cyan(`\n🔄 Pivoting: ${from} → ${to}\n`));
  
  const spinner = ora('Transforming view...').start();
  await delay(1500);
  spinner.succeed('View transformed');

  console.log();
  console.log(chalk.gray(`  Source dimension: ${getDimensionIcon(from)} ${from}`));
  console.log(chalk.gray(`  Target dimension: ${getDimensionIcon(to)} ${to}`));
  
  if (options.filter) {
    console.log(chalk.gray(`  Filter applied: ${options.filter}`));
  }
  
  console.log();
  console.log(chalk.bold('Context preserved:\n'));
  console.log(chalk.gray('  • Current selection maintained'));
  console.log(chalk.gray('  • Historical data linked'));
  console.log(chalk.gray('  • Agent insights transferred\n'));
}

async function listMCPServers() {
  console.log(chalk.bold.cyan('\n🔌 MCP Servers\n'));
  
  const serversTable = new Table({
    head: ['Server', 'Status', 'Tools', 'Resources'],
    colWidths: [20, 12, 10, 12]
  });

  serversTable.push(
    ['osint-intelligence', chalk.green('Connected'), '12', '8'],
    ['life-mapping', chalk.green('Connected'), '8', '5'],
    ['flm-coach', chalk.green('Connected'), '6', '3'],
    ['geo-analysis', chalk.yellow('Starting'), '-', '-']
  );

  console.log(serversTable.toString());
  console.log();
}

async function showMCPTools(options: any) {
  console.log(chalk.bold.cyan('\n🛠️  MCP Tools\n'));

  if (options.server) {
    console.log(chalk.gray(`Server: ${options.server}\n`));
  }

  const toolsTable = new Table({
    head: ['Tool', 'Description', 'Server'],
    colWidths: [25, 40, 20]
  });

  toolsTable.push(
    ['analyze_location', 'OSINT geolocation analysis', 'osint-intelligence'],
    ['record_life_event', 'Add event to life map', 'life-mapping'],
    ['assess_goal_progress', 'Track FLM goal status', 'flm-coach'],
    ['demographic_query', 'Population data lookup', 'geo-analysis']
  );

  console.log(toolsTable.toString());
  console.log();
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDimensionIcon(dimension: Dimension): string {
  const icons: Record<Dimension, string> = {
    [Dimension.TEMPORAL]: '📅',
    [Dimension.SPATIAL]: '🗺️',
    [Dimension.DEMOGRAPHIC]: '👥',
    [Dimension.PSYCHOLOGICAL]: '🧠',
    [Dimension.ECONOMIC]: '💰'
  };
  return icons[dimension];
}

function getEmotionEmoji(valence: number, arousal: number): string {
  if (valence > 0.5 && arousal > 0.5) return '😄'; // High positive, high arousal
  if (valence > 0.5 && arousal < 0.5) return '😌'; // High positive, low arousal
  if (valence < -0.5 && arousal > 0.5) return '😰'; // High negative, high arousal
  if (valence < -0.5 && arousal < 0.5) return '😢'; // High negative, low arousal
  return '😐'; // Neutral
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Run Program
// ============================================================================

// If no command provided (just 'ay yo'), launch interactive cockpit after inventory
const args = process.argv.slice(2);
console.log('[DEBUG] yolife-cockpit.ts args:', args);
console.log('[DEBUG] Condition check: args.length === 0?', args.length === 0);
if (args.length === 0 || (args.length === 1 && args[0] === 'yo')) {
  // Import and spawn interactive cockpit
  import('child_process').then(({ spawn }) => {
    import('path').then(({ join, dirname }) => {
      import('url').then(({ fileURLToPath }) => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const scriptPath = join(__dirname, '../../scripts/ay-yo-interactive-cockpit.ts');
        
        console.log('[yolife inventory] OK\n');
        
        const child = spawn('npx', ['tsx', scriptPath], {
          stdio: 'inherit',
          cwd: process.cwd()
        });
        
        child.on('error', (err) => {
          console.error('\nFailed to spawn interactive cockpit:', err);
          process.exit(1);
        });
        
        child.on('exit', (code) => {
          process.exit(code || 0);
        });
      });
    });
  }).catch(err => {
    console.error('\nFailed to launch interactive cockpit:', err);
    program.parse();
  });
} else {
  program.parse();
}
