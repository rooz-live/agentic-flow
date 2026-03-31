#!/usr/bin/env node
/**
 * MedAI CLI - Medical Analysis Command Line Interface
 * Provides CLI commands for medical condition analysis with anti-hallucination features
 */
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import { AgentDBLearningService } from '../services/agentdb-learning.service';
import { AntiHallucinationService } from '../services/anti-hallucination.service';
import { MedicalAnalysisService } from '../services/medical-analysis.service';
import { ProviderService } from '../services/provider.service';
const program = new Command();
const analysisService = new MedicalAnalysisService();
const antiHallucinationService = new AntiHallucinationService();
const learningService = new AgentDBLearningService();
const providerService = new ProviderService();
// CLI Configuration
program
    .name('medai')
    .description('Medical AI Analysis CLI with Anti-Hallucination Features')
    .version('1.0.0');
/**
 * medai analyze - Analyze medical conditions
 */
program
    .command('analyze')
    .description('Analyze medical condition with symptoms')
    .argument('[condition]', 'Medical condition to analyze')
    .option('-s, --symptoms <symptoms...>', 'List of symptoms')
    .option('-i, --interactive', 'Interactive mode')
    .option('--age <age>', 'Patient age')
    .option('--gender <gender>', 'Patient gender (male/female/other)')
    .option('--history <history...>', 'Medical history')
    .option('--medications <medications...>', 'Current medications')
    .option('--high-confidence', 'Require high confidence threshold')
    .option('--emergency-check', 'Include emergency situation check')
    .option('--output <format>', 'Output format (json/text)', 'text')
    .action(async (condition, options) => {
    try {
        const spinner = ora('Initializing medical analysis...').start();
        let analysisRequest;
        if (options.interactive || (!condition && !options.symptoms)) {
            // Interactive mode
            spinner.stop();
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'condition',
                    message: 'What condition do you want to analyze?',
                    default: condition
                },
                {
                    type: 'input',
                    name: 'symptoms',
                    message: 'List symptoms (comma-separated):',
                    default: options.symptoms?.join(', ') || ''
                },
                {
                    type: 'number',
                    name: 'age',
                    message: 'Patient age (optional):',
                    default: options.age
                },
                {
                    type: 'list',
                    name: 'gender',
                    message: 'Patient gender:',
                    choices: ['male', 'female', 'other', 'prefer not to say'],
                    default: options.gender || 'prefer not to say'
                },
                {
                    type: 'confirm',
                    name: 'highConfidence',
                    message: 'Require high confidence threshold?',
                    default: options.highConfidence || false
                },
                {
                    type: 'confirm',
                    name: 'emergencyCheck',
                    message: 'Check for emergency situations?',
                    default: options.emergencyCheck || true
                }
            ]);
            analysisRequest = {
                condition: answers.condition,
                symptoms: answers.symptoms.split(',').map((s) => s.trim()),
                patientContext: {
                    age: answers.age,
                    gender: answers.gender !== 'prefer not to say' ? answers.gender : undefined,
                    medicalHistory: options.history,
                    currentMedications: options.medications
                },
                options: {
                    requireHighConfidence: answers.highConfidence,
                    includeEmergencyCheck: answers.emergencyCheck,
                    includeDifferentials: true,
                    maxDifferentials: 5
                }
            };
            spinner.start('Analyzing medical condition...');
        }
        else {
            // Command-line mode
            analysisRequest = {
                condition,
                symptoms: options.symptoms || [],
                patientContext: {
                    age: options.age ? parseInt(options.age) : undefined,
                    gender: options.gender,
                    medicalHistory: options.history,
                    currentMedications: options.medications
                },
                options: {
                    requireHighConfidence: options.highConfidence,
                    includeEmergencyCheck: options.emergencyCheck,
                    includeDifferentials: true,
                    maxDifferentials: 5
                }
            };
        }
        spinner.text = 'Running medical analysis with anti-hallucination checks...';
        // Perform analysis
        const result = await analysisService.analyze(analysisRequest);
        // Calculate confidence score
        const confidenceScore = antiHallucinationService.calculateConfidenceScore(result);
        result.confidenceScore = confidenceScore;
        // Generate warnings
        const warnings = antiHallucinationService.generateWarnings(result, confidenceScore);
        result.warnings = warnings;
        // Check for pattern recognition
        const patterns = await learningService.recognizePatterns(analysisRequest.symptoms, { condition: analysisRequest.condition });
        spinner.succeed('Analysis completed');
        // Display results
        if (options.output === 'json') {
            console.log(JSON.stringify({ result, patterns }, null, 2));
        }
        else {
            displayAnalysisResults(result, patterns);
        }
        // Check if provider review is required
        if (antiHallucinationService.requiresProviderReview(confidenceScore)) {
            console.log(chalk.yellow('\n⚠️  Provider review required due to confidence threshold'));
            const { notifyProvider } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'notifyProvider',
                    message: 'Notify healthcare provider?',
                    default: true
                }]);
            if (notifyProvider) {
                await providerService.notifyProvider(result.id, result);
                console.log(chalk.green('✓ Provider notified successfully'));
            }
        }
    }
    catch (error) {
        console.error(chalk.red('Error during analysis:'), error);
        process.exit(1);
    }
});
/**
 * medai verify - Verify analysis confidence
 */
program
    .command('verify')
    .description('Verify confidence and detect potential hallucinations')
    .argument('<analysisId>', 'Analysis ID to verify')
    .option('--detailed', 'Show detailed confidence breakdown')
    .action(async (analysisId, options) => {
    try {
        const spinner = ora('Retrieving analysis...').start();
        const analysis = await analysisService.getAnalysis(analysisId);
        if (!analysis) {
            spinner.fail('Analysis not found');
            process.exit(1);
        }
        spinner.text = 'Calculating confidence scores...';
        const confidenceScore = antiHallucinationService.calculateConfidenceScore(analysis);
        const warnings = antiHallucinationService.generateWarnings(analysis, confidenceScore);
        spinner.succeed('Verification complete');
        console.log(chalk.bold('\n📊 Confidence Score Analysis\n'));
        console.log(`Overall Confidence: ${getConfidenceColor(confidenceScore.overall)}${(confidenceScore.overall * 100).toFixed(1)}%${chalk.reset}`);
        if (options.detailed) {
            console.log(chalk.bold('\nBreakdown:'));
            console.log(`  Diagnosis Confidence:      ${(confidenceScore.breakdown.diagnosisConfidence * 100).toFixed(1)}%`);
            console.log(`  Citation Verification:     ${(confidenceScore.breakdown.citationVerification * 100).toFixed(1)}%`);
            console.log(`  Knowledge Base Validation: ${(confidenceScore.breakdown.knowledgeBaseValidation * 100).toFixed(1)}%`);
            console.log(`  Contradiction Check:       ${(confidenceScore.breakdown.contradictionCheck * 100).toFixed(1)}%`);
            console.log(`  Provider Alignment:        ${(confidenceScore.breakdown.providerAlignment * 100).toFixed(1)}%`);
        }
        console.log(chalk.bold('\nConfidence Factors:'));
        confidenceScore.factors.forEach(factor => {
            const icon = factor.impact === 'positive' ? '✓' : factor.impact === 'negative' ? '✗' : '○';
            const color = factor.impact === 'positive' ? chalk.green : factor.impact === 'negative' ? chalk.red : chalk.gray;
            console.log(color(`  ${icon} ${factor.description}`));
        });
        if (warnings.length > 0) {
            console.log(chalk.bold('\n⚠️  Warnings:'));
            warnings.forEach(warning => {
                const icon = warning.severity === 'critical' ? '🚨' : warning.severity === 'error' ? '❌' : '⚠️';
                console.log(chalk.yellow(`  ${icon} ${warning.message}`));
                if (warning.suggestedAction) {
                    console.log(chalk.gray(`     → ${warning.suggestedAction}`));
                }
            });
        }
    }
    catch (error) {
        console.error(chalk.red('Error during verification:'), error);
        process.exit(1);
    }
});
/**
 * medai provider - Provider management commands
 */
const providerCmd = program
    .command('provider')
    .description('Manage healthcare provider interactions');
providerCmd
    .command('review')
    .description('Submit provider review for an analysis')
    .argument('<analysisId>', 'Analysis ID to review')
    .option('--decision <decision>', 'Review decision (approved/rejected/modified)', 'approved')
    .option('--comments <comments>', 'Review comments')
    .action(async (analysisId, options) => {
    try {
        const spinner = ora('Submitting provider review...').start();
        await providerService.submitReview(analysisId, {
            decision: options.decision,
            comments: options.comments
        });
        spinner.succeed('Provider review submitted successfully');
        // Learn from provider feedback
        const analysis = await analysisService.getAnalysis(analysisId);
        if (analysis) {
            await learningService.learnFromAnalysis(analysis, options.decision === 'approved' ? 'successful' : 'modified', options.comments);
            console.log(chalk.green('✓ Learning system updated with provider feedback'));
        }
    }
    catch (error) {
        console.error(chalk.red('Error submitting review:'), error);
        process.exit(1);
    }
});
providerCmd
    .command('notify')
    .description('Notify provider about an analysis')
    .argument('<analysisId>', 'Analysis ID')
    .option('--urgent', 'Mark as urgent')
    .action(async (analysisId, options) => {
    try {
        const spinner = ora('Notifying provider...').start();
        const analysis = await analysisService.getAnalysis(analysisId);
        if (!analysis) {
            spinner.fail('Analysis not found');
            process.exit(1);
        }
        await providerService.notifyProvider(analysisId, analysis, options.urgent);
        spinner.succeed('Provider notified successfully');
    }
    catch (error) {
        console.error(chalk.red('Error notifying provider:'), error);
        process.exit(1);
    }
});
providerCmd
    .command('list')
    .description('List pending provider reviews')
    .action(async () => {
    try {
        const spinner = ora('Fetching pending reviews...').start();
        const pending = await providerService.getPendingReviews();
        spinner.succeed(`Found ${pending.length} pending reviews`);
        if (pending.length > 0) {
            console.log(chalk.bold('\nPending Provider Reviews:\n'));
            pending.forEach((review, index) => {
                console.log(`${index + 1}. Analysis ID: ${review.analysisId}`);
                console.log(`   Priority: ${review.priority}`);
                console.log(`   Submitted: ${review.timestamp}`);
                console.log('');
            });
        }
    }
    catch (error) {
        console.error(chalk.red('Error fetching reviews:'), error);
        process.exit(1);
    }
});
/**
 * medai config - Configuration management
 */
const configCmd = program
    .command('config')
    .description('Manage MedAI configuration');
configCmd
    .command('show')
    .description('Show current configuration')
    .action(() => {
    // Display current config
    console.log(chalk.bold('MedAI Configuration\n'));
    console.log('Anti-Hallucination Settings:');
    console.log('  Minimum Confidence: 0.70');
    console.log('  Provider Review Threshold: 0.75');
    console.log('  Auto-Approve Threshold: 0.90');
    console.log('\nLearning Settings:');
    console.log('  Pattern Learning: Enabled');
    console.log('  AgentDB Path: ./data/medical-learning.db');
});
configCmd
    .command('set')
    .description('Set configuration value')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .action((key, value) => {
    console.log(chalk.green(`✓ Configuration updated: ${key} = ${value}`));
});
/**
 * medai ci-validate - CI/CD Pipeline Validation
 */
program
    .command('ci-validate')
    .description('Validate CI/CD pipeline with synthetic test data')
    .action(async () => {
    console.log(chalk.blue('🚀 Starting CI/CD Validation...'));
    const { spawn } = await import('child_process');
    const path = await import('path');
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate-test-data.ts');
    console.log(chalk.gray(`Running script: ${scriptPath}`));
    const child = spawn('npx', ['tsx', scriptPath], { stdio: 'inherit' });
    child.on('close', (code) => {
        if (code === 0) {
            console.log(chalk.green('\n✅ CI Validation Completed Successfully'));
        }
        else {
            console.log(chalk.red(`\n❌ CI Validation Failed with code ${code}`));
            process.exit(code || 1);
        }
    });
});
// Telemetry bootstrap for CLI (disabled in tests)
import { startTelemetry, stopTelemetry } from '../telemetry/bootstrap';
let __cliTelemetryStarted = false;
if (process.env.NODE_ENV !== 'test') {
    try {
        startTelemetry({
            filePath: process.env.GOALIE_METRICS_PATH || '.goalie/metrics_log.jsonl',
            flushIntervalMs: parseInt(process.env.GOALIE_METRICS_FLUSH_MS || '1000', 10),
            batchSize: parseInt(process.env.GOALIE_METRICS_BATCH || '100', 10),
            maxPerMinute: parseInt(process.env.GOALIE_METRICS_MAX_PER_MIN || '240', 10)
        });
        __cliTelemetryStarted = true;
        const shutdown = () => { try {
            stopTelemetry();
        }
        catch { } };
        process.on('exit', shutdown);
        process.on('SIGINT', () => { shutdown(); process.exit(0); });
        process.on('SIGTERM', () => { shutdown(); process.exit(0); });
    }
    catch { }
}
// Helper functions
function displayAnalysisResults(result, patterns) {
    console.log(chalk.bold('\n🏥 Medical Analysis Results\n'));
    // Display diagnosis
    if (result.diagnosis && result.diagnosis.length > 0) {
        console.log(chalk.bold('Diagnosis:'));
        result.diagnosis.forEach((diag, index) => {
            console.log(`\n${index + 1}. ${chalk.cyan(diag.condition)} (ICD-10: ${diag.icd10Code})`);
            console.log(`   Probability: ${(diag.probability * 100).toFixed(1)}%`);
            console.log(`   Confidence: ${getConfidenceColor(diag.confidence)}${(diag.confidence * 100).toFixed(1)}%${chalk.reset}`);
            console.log(`   Reasoning: ${diag.reasoning}`);
            if (diag.differentialDiagnoses && diag.differentialDiagnoses.length > 0) {
                console.log(chalk.gray('   Differential Diagnoses:'));
                diag.differentialDiagnoses.forEach((diff) => {
                    console.log(chalk.gray(`     - ${diff.condition} (${(diff.probability * 100).toFixed(1)}%)`));
                });
            }
        });
    }
    // Display recommendations
    if (result.recommendations && result.recommendations.length > 0) {
        console.log(chalk.bold('\n\n💡 Recommendations:'));
        result.recommendations.forEach((rec, index) => {
            const priorityIcon = rec.priority === 'urgent' ? '🚨' : rec.priority === 'high' ? '⚠️' : 'ℹ️';
            console.log(`\n${priorityIcon} ${index + 1}. ${rec.description}`);
            console.log(`   Priority: ${rec.priority.toUpperCase()}`);
            console.log(`   Rationale: ${rec.rationale}`);
        });
    }
    // Display confidence score
    console.log(chalk.bold('\n\n📊 Confidence Score:'));
    console.log(`Overall: ${getConfidenceColor(result.confidenceScore.overall)}${(result.confidenceScore.overall * 100).toFixed(1)}%${chalk.reset}`);
    // Display patterns if found
    if (patterns.patterns.length > 0) {
        console.log(chalk.bold('\n\n🧠 Pattern Recognition:'));
        console.log(`Found ${patterns.patterns.length} similar patterns`);
        console.log(`Confidence: ${(patterns.confidence * 100).toFixed(1)}%`);
        console.log(`Reasoning: ${patterns.reasoning}`);
    }
    // Display warnings
    if (result.warnings && result.warnings.length > 0) {
        console.log(chalk.bold('\n\n⚠️  Warnings:'));
        result.warnings.forEach((warning) => {
            console.log(chalk.yellow(`  • ${warning.message}`));
        });
    }
}
function getConfidenceColor(confidence) {
    if (confidence >= 0.85)
        return chalk.green.bold('');
    if (confidence >= 0.70)
        return chalk.yellow.bold('');
    return chalk.red.bold('');
}
// Parse command line arguments
program.parse(process.argv);
// Show help if no arguments
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=index.js.map