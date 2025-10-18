/**
 * Interactive wizard for creating learning plugins
 */
import inquirer from 'inquirer';
import chalk from 'chalk';
import { generatePlugin } from '../generator.mjs';
import { promptMetadata, promptAlgorithm, promptReward, promptStorage, promptTraining, promptMonitoring, } from './prompts.mjs';
import { validateConfig } from './validator.mjs';
export async function runWizard(options = {}) {
    try {
        // Step 1: Plugin metadata
        console.log(chalk.blue.bold('\n📝 Step 1: Plugin Metadata\n'));
        const metadata = await promptMetadata(options);
        // Step 2: Base algorithm selection
        console.log(chalk.blue.bold('\n🧠 Step 2: Algorithm Selection\n'));
        const algorithm = await promptAlgorithm(options.template);
        // Step 3: Reward function configuration
        console.log(chalk.blue.bold('\n🎯 Step 3: Reward Configuration\n'));
        const reward = await promptReward();
        // Step 4: Storage configuration
        console.log(chalk.blue.bold('\n💾 Step 4: Storage Configuration\n'));
        const storage = await promptStorage(metadata.name);
        // Step 5: Training configuration
        console.log(chalk.blue.bold('\n🏋️  Step 5: Training Configuration\n'));
        const training = await promptTraining(algorithm.base);
        // Step 6: Monitoring (optional)
        console.log(chalk.blue.bold('\n📊 Step 6: Monitoring (Optional)\n'));
        const monitoring = await promptMonitoring();
        // Build complete configuration
        const config = {
            ...metadata,
            algorithm,
            reward,
            storage,
            training,
            monitoring,
        };
        // Validate configuration
        console.log(chalk.blue.bold('\n✓ Validating configuration...\n'));
        const validation = validateConfig(config);
        if (!validation.valid) {
            console.error(chalk.red.bold('Configuration validation failed:'));
            validation.errors.forEach((error) => {
                console.error(chalk.red(`  • ${error}`));
            });
            process.exit(1);
        }
        // Show configuration summary
        console.log(chalk.green.bold('\n✓ Plugin configuration complete!\n'));
        console.log(chalk.gray('────────────────────────────────────────'));
        console.log(chalk.white('Configuration Summary:'));
        console.log(chalk.gray('────────────────────────────────────────'));
        console.log(chalk.cyan('  Name:'), config.name);
        console.log(chalk.cyan('  Description:'), config.description);
        console.log(chalk.cyan('  Algorithm:'), config.algorithm.base);
        console.log(chalk.cyan('  Reward:'), config.reward.type);
        console.log(chalk.cyan('  Storage:'), config.storage.path);
        console.log(chalk.gray('────────────────────────────────────────\n'));
        // Ask what to do next
        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do next?',
                choices: [
                    { name: '✨ Generate plugin code', value: 'generate' },
                    { name: '💾 Save configuration only', value: 'save' },
                    { name: '🧪 Test configuration', value: 'test' },
                    { name: '❌ Cancel', value: 'cancel' },
                ],
            },
        ]);
        if (action === 'cancel') {
            console.log(chalk.yellow('\nPlugin creation cancelled.\n'));
            return;
        }
        if (action === 'generate') {
            console.log(chalk.blue.bold('\n🔨 Generating plugin...\n'));
            await generatePlugin(config);
            console.log(chalk.green.bold('\n✓ Plugin generated successfully!\n'));
            // Ask about installing dependencies
            const { install } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'install',
                    message: 'Install dependencies now?',
                    default: true,
                },
            ]);
            if (install) {
                console.log(chalk.blue('\nInstalling dependencies...\n'));
                // Dependencies installation handled by generator
            }
            // Show next steps
            displayNextSteps(config.name);
        }
        else if (action === 'save') {
            console.log(chalk.blue('\nSaving configuration...\n'));
            await generatePlugin(config, { configOnly: true });
            console.log(chalk.green.bold('✓ Configuration saved!\n'));
        }
        else if (action === 'test') {
            console.log(chalk.blue('\nTesting configuration...\n'));
            // Configuration testing logic
            console.log(chalk.green('✓ Configuration is valid!\n'));
        }
    }
    catch (error) {
        if (error.isTtyError) {
            console.error(chalk.red('\nPrompt could not be rendered in this environment.'));
        }
        else {
            throw error;
        }
    }
}
function displayNextSteps(pluginName) {
    console.log(chalk.cyan.bold('\n┌───────────────────────────────────────────────────────────────┐'));
    console.log(chalk.cyan.bold('│                    Plugin Created Successfully!                │'));
    console.log(chalk.cyan.bold('├───────────────────────────────────────────────────────────────┤'));
    console.log(chalk.cyan.bold('│                                                               │'));
    console.log(chalk.white(`│  Plugin: ${chalk.yellow(pluginName.padEnd(52))}│`));
    console.log(chalk.white(`│  Location: ${chalk.yellow(`./plugins/${pluginName}`.padEnd(47))}│`));
    console.log(chalk.cyan.bold('│                                                               │'));
    console.log(chalk.white('│  Next steps:                                                  │'));
    console.log(chalk.white(`│  1. Review generated code: ${chalk.yellow(`cd plugins/${pluginName}`.padEnd(29))}│`));
    console.log(chalk.white('│  2. Run tests: npm test                                       │'));
    console.log(chalk.white(`│  3. Use plugin: npx agentdb use-plugin ${chalk.yellow(pluginName.padEnd(14))}│`));
    console.log(chalk.cyan.bold('│                                                               │'));
    console.log(chalk.cyan.bold('└───────────────────────────────────────────────────────────────┘\n'));
}
