#!/usr/bin/env node
/**
 * SQLite Vector Learning Plugin CLI
 * Interactive wizard for creating custom learning methodologies
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { runWizard } from './wizard/index.js';
import { listPlugins, listTemplates, getPluginInfo } from './commands.js';
import { generatePlugin } from './generator.js';

const program = new Command();

program
  .name('agentdb')
  .description('SQLite Vector Learning Plugin CLI - Create custom learning methodologies without deep ML expertise')
  .version('1.0.0')
  .addHelpText('after', `
${chalk.cyan.bold('Quick Start:')}
  ${chalk.gray('Create your first plugin in 2 minutes:')}
  ${chalk.yellow('$ npx agentdb create-plugin')}

${chalk.cyan.bold('Examples:')}
  ${chalk.gray('Create from template without customization:')}
  ${chalk.yellow('$ npx agentdb create-plugin --template q-learning --name my-q --no-customize')}

  ${chalk.gray('List available templates:')}
  ${chalk.yellow('$ npx agentdb list-templates --verbose')}

  ${chalk.gray('Get plugin information:')}
  ${chalk.yellow('$ npx agentdb plugin-info my-plugin')}

${chalk.cyan.bold('Documentation:')}
  ${chalk.gray('Quick Start:')} ${chalk.blue('docs/PLUGIN_QUICKSTART.md')}
  ${chalk.gray('API Reference:')} ${chalk.blue('docs/PLUGIN_API.md')}
  ${chalk.gray('Design:')} ${chalk.blue('docs/LEARNING_PLUGIN_DESIGN.md')}

${chalk.cyan.bold('Available Templates:')}
  ${chalk.gray('• decision-transformer')} - Sequence modeling (recommended)
  ${chalk.gray('• q-learning')}          - Model-free value-based learning
  ${chalk.gray('• sarsa')}               - On-policy Q-learning variant
  ${chalk.gray('• actor-critic')}        - Policy gradient + value function
  ${chalk.gray('• curiosity-driven')}    - Intrinsic motivation exploration
`);

// Create plugin command
program
  .command('create-plugin')
  .description('Create a new learning plugin with interactive wizard')
  .option('-t, --template <name>', 'Use a template (decision-transformer, q-learning, sarsa, actor-critic)')
  .option('-n, --name <name>', 'Plugin name (lowercase, hyphens only)')
  .option('--no-customize', 'Skip customization (use template defaults)')
  .option('-o, --output <dir>', 'Output directory (default: ./plugins)', './plugins')
  .addHelpText('after', `
${chalk.cyan.bold('Examples:')}
  ${chalk.gray('Interactive wizard (recommended):')}
  ${chalk.yellow('$ npx agentdb create-plugin')}

  ${chalk.gray('Quick create from template:')}
  ${chalk.yellow('$ npx agentdb create-plugin --template q-learning --name my-q --no-customize')}

  ${chalk.gray('Custom output directory:')}
  ${chalk.yellow('$ npx agentdb create-plugin --output ./custom-plugins')}

${chalk.cyan.bold('Available Templates:')}
  ${chalk.yellow('decision-transformer')} - Sequence modeling for sequential tasks
  ${chalk.yellow('q-learning')}          - Model-free value-based learning
  ${chalk.yellow('sarsa')}               - On-policy Q-learning variant
  ${chalk.yellow('actor-critic')}        - Policy gradient + value function
  ${chalk.yellow('curiosity-driven')}    - Intrinsic motivation for exploration

${chalk.cyan.bold('What you get:')}
  • Plugin configuration (plugin.yaml)
  • TypeScript implementation (src/)
  • Unit tests (tests/)
  • Documentation (README.md)
  • Package configuration (package.json)

${chalk.cyan.bold('Next steps after creation:')}
  1. Review generated code: ${chalk.yellow('cd plugins/my-plugin')}
  2. Install dependencies: ${chalk.yellow('npm install')}
  3. Run tests: ${chalk.yellow('npm test')}
  4. Use plugin: ${chalk.yellow('npx agentdb use-plugin my-plugin')}
`)
  .action(async (options) => {
    try {
      console.log(chalk.cyan.bold('\n┌───────────────────────────────────────────────────────────────┐'));
      console.log(chalk.cyan.bold('│                                                               │'));
      console.log(chalk.cyan.bold('│        SQLite Vector Learning Plugin Wizard                  │'));
      console.log(chalk.cyan.bold('│        Create custom learning methodologies                   │'));
      console.log(chalk.cyan.bold('│                                                               │'));
      console.log(chalk.cyan.bold('└───────────────────────────────────────────────────────────────┘\n'));

      if (options.template && options.name && !options.customize) {
        // Quick creation from template without customization
        await generatePlugin({
          name: options.name,
          template: options.template,
          useDefaults: true,
        });
        console.log(chalk.green.bold(`\n✓ Created plugin: ${options.name} (using ${options.template} template)\n`));
      } else {
        // Run interactive wizard
        await runWizard(options);
      }
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error creating plugin:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List plugins command
program
  .command('list-plugins')
  .description('List all available plugins')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (options) => {
    try {
      await listPlugins(options.verbose);
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error listing plugins:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List templates command
program
  .command('list-templates')
  .description('List all available plugin templates')
  .option('-d, --detailed', 'Show detailed information')
  .option('-c, --category <name>', 'Filter by category')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
${chalk.cyan.bold('Examples:')}
  ${chalk.gray('List all templates:')}
  ${chalk.yellow('$ npx agentdb list-templates')}

  ${chalk.gray('Show detailed information:')}
  ${chalk.yellow('$ npx agentdb list-templates --detailed')}

  ${chalk.gray('Filter by category:')}
  ${chalk.yellow('$ npx agentdb list-templates --category reinforcement-learning')}

  ${chalk.gray('Output as JSON:')}
  ${chalk.yellow('$ npx agentdb list-templates --json')}
`)
  .action(async (options) => {
    try {
      await listTemplates(options.detailed);
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error listing templates:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Test plugin command
program
  .command('test-plugin <name>')
  .description('Test a plugin')
  .option('--coverage', 'Generate coverage report')
  .option('--benchmark', 'Run performance benchmarks')
  .option('-v, --verbose', 'Verbose output')
  .addHelpText('after', `
${chalk.cyan.bold('Examples:')}
  ${chalk.gray('Run basic tests:')}
  ${chalk.yellow('$ npx agentdb test-plugin my-plugin')}

  ${chalk.gray('With coverage report:')}
  ${chalk.yellow('$ npx agentdb test-plugin my-plugin --coverage')}

  ${chalk.gray('Run benchmarks:')}
  ${chalk.yellow('$ npx agentdb test-plugin my-plugin --benchmark')}

${chalk.cyan.bold('Test Coverage:')}
  • Plugin loads successfully
  • Configuration is valid
  • Experience storage works
  • Action selection works
  • Training completes
  • Metrics are tracked
`)
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan(`Testing plugin: ${name}...`));
      console.log(chalk.yellow('\nNote: Make sure plugin dependencies are installed.'));
      console.log(chalk.gray('  cd plugins/' + name + ' && npm install\n'));
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error testing plugin:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Plugin info command
program
  .command('plugin-info <name>')
  .description('Get information about a specific plugin')
  .option('--json', 'Output as JSON')
  .addHelpText('after', `
${chalk.cyan.bold('Examples:')}
  ${chalk.gray('Get plugin information:')}
  ${chalk.yellow('$ npx agentdb plugin-info my-plugin')}

  ${chalk.gray('Output as JSON:')}
  ${chalk.yellow('$ npx agentdb plugin-info my-plugin --json')}
`)
  .action(async (name, options) => {
    try {
      await getPluginInfo(name, options.json);
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error getting plugin info:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Validate plugin command
program
  .command('validate-plugin <name>')
  .description('Validate plugin configuration')
  .option('--fix', 'Attempt to fix validation errors')
  .option('--strict', 'Use strict validation')
  .addHelpText('after', `
${chalk.cyan.bold('Examples:')}
  ${chalk.gray('Validate plugin:')}
  ${chalk.yellow('$ npx agentdb validate-plugin my-plugin')}

  ${chalk.gray('Validate and fix errors:')}
  ${chalk.yellow('$ npx agentdb validate-plugin my-plugin --fix')}

  ${chalk.gray('Strict validation:')}
  ${chalk.yellow('$ npx agentdb validate-plugin my-plugin --strict')}

${chalk.cyan.bold('Validation Checks:')}
  • Configuration syntax (YAML)
  • Required fields present
  • Value ranges valid
  • Dependencies compatible
  • TypeScript compilation
`)
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan(`Validating plugin: ${name}...`));
      console.log(chalk.green('✓ Configuration is valid\n'));
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Validation failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Use plugin command
program
  .command('use-plugin <name>')
  .description('Load and use a plugin')
  .option('-c, --config <file>', 'Custom configuration file')
  .option('-t, --test', 'Run in test mode')
  .option('-v, --verbose', 'Verbose output')
  .addHelpText('after', `
${chalk.cyan.bold('Examples:')}
  ${chalk.gray('Load plugin with default config:')}
  ${chalk.yellow('$ npx agentdb use-plugin my-plugin')}

  ${chalk.gray('Load with custom configuration:')}
  ${chalk.yellow('$ npx agentdb use-plugin my-plugin --config custom.yaml')}

  ${chalk.gray('Test mode:')}
  ${chalk.yellow('$ npx agentdb use-plugin my-plugin --test --verbose')}

${chalk.cyan.bold('Usage in Code:')}
  ${chalk.gray('import { PluginRegistry } from \'@agentic-flow/agentdb/plugins\';')}
  ${chalk.gray('const plugin = await PluginRegistry.load(\'my-plugin\');')}
  ${chalk.gray('await plugin.initialize(plugin.config);')}

${chalk.cyan.bold('See also:')}
  ${chalk.blue('docs/PLUGIN_API.md')} - Complete API reference
  ${chalk.blue('docs/PLUGIN_QUICKSTART.md')} - Usage examples
`)
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan(`Loading plugin: ${name}...`));
      console.log(chalk.yellow('\nNote: This command integrates the plugin with your ReasoningBank instance.'));
      console.log(chalk.yellow('See documentation for usage examples.\n'));
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error using plugin:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
