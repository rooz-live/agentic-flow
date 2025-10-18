/**
 * CLI commands implementation
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { getAvailableTemplates } from './templates.js';

export async function listPlugins(verbose: boolean = false): Promise<void> {
  const pluginsDir = path.join(process.cwd(), 'plugins');

  try {
    const plugins = await fs.readdir(pluginsDir);

    console.log(chalk.cyan.bold('\nAvailable Plugins:\n'));

    for (const pluginName of plugins) {
      const pluginPath = path.join(pluginsDir, pluginName);
      const stats = await fs.stat(pluginPath);

      if (!stats.isDirectory()) continue;

      try {
        const configPath = path.join(pluginPath, 'plugin.yaml');
        const config = await fs.readFile(configPath, 'utf-8');

        console.log(chalk.yellow(`  • ${pluginName}`));

        if (verbose) {
          // Parse YAML and show details
          const lines = config.split('\n');
          const description = lines.find(l => l.startsWith('description:'));
          const version = lines.find(l => l.startsWith('version:'));
          const algorithm = lines.find(l => l.startsWith('base_algorithm:'));

          if (description) console.log(chalk.gray(`    ${description.split(':')[1].trim()}`));
          if (version) console.log(chalk.gray(`    Version: ${version.split(':')[1].trim()}`));
          if (algorithm) console.log(chalk.gray(`    Algorithm: ${algorithm.split(':')[1].trim()}`));
          console.log();
        }
      } catch (error) {
        console.log(chalk.red(`    (Invalid plugin configuration)`));
      }
    }
  } catch (error) {
    console.log(chalk.yellow('\nNo plugins found. Create one with:'));
    console.log(chalk.cyan('  npx agentdb create-plugin\n'));
  }
}

export async function listTemplates(detailed: boolean = false): Promise<void> {
  const templates = await getAvailableTemplates();

  console.log(chalk.cyan.bold('\nAvailable Templates:\n'));

  for (const template of templates) {
    console.log(chalk.yellow(`  • ${template.name}`));

    if (detailed) {
      console.log(chalk.gray(`    ${template.description}`));
      console.log(chalk.gray(`    Algorithm: ${template.algorithm}`));
      console.log(chalk.gray(`    Use Case: ${template.useCase}`));
      console.log(chalk.gray(`    Configuration:`));
      console.log(chalk.gray(`      - Learning Rate: ${template.config.algorithm.learning_rate || 'varies'}`));
      console.log(chalk.gray(`      - Batch Size: ${template.config.training.batch_size || 'N/A'}`));
      console.log(chalk.gray(`      - Min Experiences: ${template.config.training.min_experiences}`));
      console.log();
    }
  }

  console.log(chalk.gray('\nCreate a plugin from template:'));
  console.log(chalk.cyan('  npx agentdb create-plugin --template <name>\n'));
}

export async function getPluginInfo(name: string, asJson: boolean = false): Promise<void> {
  const pluginPath = path.join(process.cwd(), 'plugins', name);

  try {
    const configPath = path.join(pluginPath, 'plugin.yaml');
    const config = await fs.readFile(configPath, 'utf-8');

    if (asJson) {
      // Output as JSON
      const lines = config.split('\n');
      const jsonInfo = {
        name: name,
        description: lines.find(l => l.startsWith('description:'))?.split(':')[1]?.trim() || '',
        version: lines.find(l => l.startsWith('version:'))?.split(':')[1]?.trim() || '',
        baseAlgorithm: lines.find(l => l.startsWith('base_algorithm:'))?.split(':')[1]?.trim() || '',
        author: lines.find(l => l.startsWith('author:'))?.split(':')[1]?.trim() || '',
        status: 'ready'
      };
      console.log(JSON.stringify(jsonInfo, null, 2));
      return;
    }

    console.log(chalk.cyan.bold(`\n Plugin: ${name}\n`));
    console.log(chalk.gray('────────────────────────────────────────'));
    console.log(config);
    console.log(chalk.gray('────────────────────────────────────────\n'));

    const readmePath = path.join(pluginPath, 'README.md');
    try {
      const readme = await fs.readFile(readmePath, 'utf-8');
      console.log(chalk.white('\nDocumentation:\n'));
      console.log(readme);
    } catch {
      // No README
    }
  } catch (error) {
    console.error(chalk.red(`\nPlugin "${name}" not found.\n`));
    console.log(chalk.gray('List available plugins:'));
    console.log(chalk.cyan('  npx agentdb list-plugins\n'));
  }
}
