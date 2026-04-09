#!/usr/bin/env node

/**
 * Evidence CLI
 * 
 * Command-line interface for evidence collection, assessment, and management
 * Provides comprehensive tools for evidence logging and analysis
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getPatternLogger } from './pattern-logger';
import { EvidenceManager } from './evidence-manager';

const program = new Command();

program
  .name('evidence')
  .description('CLI for evidence collection and assessment')
  .version('1.0.0');

// Global options
program
  .option('-v, --verbose', 'Verbose output')
  .option('--log-goalie', 'Enable Goalie logging integration')
  .option('--tier-depth-coverage', 'Enable tier depth coverage logging')
  .option('--ab-reps <reps>', 'Number of A/B test repetitions (maps from --rotations)', '10')
  .option('--rotations <reps>', 'Legacy alias for --ab-reps (deprecated)');

/**
 * Initialize pattern logger
 */
async function initializePatternLogger() {
  const logger = getPatternLogger();
  await logger.initialize();
  return logger;
}

/**
 * Map legacy arguments to current ones
 */
function mapLegacyArgs(options: any): any {
  const mapped = { ...options };
  
  // Map --rotations to --ab-reps for backward compatibility
  if (options.rotations && !options.abReps) {
    mapped.abReps = options.rotations;
    console.warn('[EVIDENCE_CLI] --rotations is deprecated, using --ab-reps instead');
  }
  
  return mapped;
}

/**
 * Emit command
 */
program
  .command('emit')
  .description('Emit evidence events')
  .option('-t, --type <type>', 'Evidence type (economic_compounding, maturity_coverage, observability_gaps)', 'economic_compounding')
  .option('-d, --data <data>', 'Evidence data as JSON string')
  .option('-f, --file <file>', 'Evidence data file path')
  .action(async (options) => {
    try {
      const mappedOptions = mapLegacyArgs(program.opts());
      const logger = await initializePatternLogger();
      
      let evidenceData: any;
      
      if (options.file) {
        const fileContent = await fs.readFile(options.file, 'utf-8');
        evidenceData = JSON.parse(fileContent);
      } else if (options.data) {
        evidenceData = JSON.parse(options.data);
      } else {
        // Default sample data based on type
        switch (options.type) {
          case 'economic_compounding':
            evidenceData = {
              energy_cost_usd: 0.01,
              value_per_hour: 100
            };
            break;
          case 'maturity_coverage':
            evidenceData = {
              tier_depth: 3,
              coverage_pct: 75.5
            };
            break;
          case 'observability_gaps':
            evidenceData = {
              gaps: ['missing_metrics', 'incomplete_traces'],
              severity: 'medium'
            };
            break;
          default:
            evidenceData = { sample: true };
        }
      }
      
      const manager = new EvidenceManager();
      manager.emit(options.type, evidenceData);
      manager.flush();
      
      // Also log to pattern logger for comprehensive tracking
      if (mappedOptions.logGoalie) {
        await logger.logLearningEvidence(
          evidenceData,
          {
            source: 'evidence-cli',
            type: options.type
          },
          `Evidence CLI logged ${options.type} evidence from user input. Supports manual evidence entry and testing.`,
          {
            circle: 'system-optimization',
            purpose: 'manual_evidence',
            domain: 'technical-operations',
            triggering_event: 'evidence_cli_emit'
          }
        );
      }
      
      if (mappedOptions.tierDepthCoverage && options.type === 'maturity_coverage') {
        await logger.logTierDepthCoverage(
          evidenceData,
          {
            source: 'evidence-cli',
            type: options.type
          },
          `Tier depth coverage evidence logged from CLI. Tracks maturity and coverage metrics for governance assessment.`,
          {
            circle: 'system-optimization',
            purpose: 'tier_depth_coverage',
            domain: 'technical-operations',
            triggering_event: 'evidence_cli_emit'
          }
        );
      }
      
      console.log(`✓ Evidence emitted: ${options.type}`);
      
    } catch (error) {
      console.error('Error emitting evidence:', error);
      process.exit(1);
    }
  });

/**
 * Assess command
 */
program
  .command('assess')
  .description('Assess evidence data integrity and quality')
  .option('-t, --type <type>', 'Evidence type to assess (all, learning_evidence, compounding_benefits)', 'all')
  .option('-l, --limit <limit>', 'Limit number of entries to assess', '100')
  .option('-o, --output <file>', 'Output assessment results to file')
  .option('--threshold <threshold>', 'Quality threshold percentage', '80')
  .action(async (options) => {
    try {
      const logger = await initializePatternLogger();
      const threshold = parseFloat(options.threshold) || 80;
      const limit = parseInt(options.limit) || 100;
      
      console.log(`Assessing evidence data with threshold: ${threshold}%`);
      
      const assessmentResults = {
        timestamp: new Date().toISOString(),
        threshold,
        assessed: {
          learning_evidence: { entries: 0, valid: 0, quality: 0 },
          compounding_benefits: { entries: 0, valid: 0, quality: 0 },
          pattern_hits: { entries: 0, valid: 0, quality: 0 },
          tier_depth_coverage: { entries: 0, valid: 0, quality: 0 }
        },
        overall: {
          totalEntries: 0,
          validEntries: 0,
          qualityScore: 0,
          status: 'unknown'
        },
        issues: [] as string[],
        recommendations: [] as string[]
      };
      
      const typesToAssess = options.type === 'all' 
        ? ['learning_evidence', 'compounding_benefits', 'pattern_hits', 'tier_depth_coverage']
        : [options.type];
      
      for (const type of typesToAssess) {
        try {
          const entries = await logger.readLogEntries(type, limit);
          const validEntries = entries.filter(entry => {
            // Basic validation
            return entry.timestamp && 
                   entry.run_id && 
                   entry.pattern_type && 
                   entry.data &&
                   Object.keys(entry.data).length > 0;
          });
          
          const qualityScore = entries.length > 0 
            ? (validEntries.length / entries.length) * 100 
            : 0;
          
          assessmentResults.assessed[type] = {
            entries: entries.length,
            valid: validEntries.length,
            quality: Math.round(qualityScore * 100) / 100
          };
          
          assessmentResults.overall.totalEntries += entries.length;
          assessmentResults.overall.validEntries += validEntries.length;
          
          // Check for specific issues
          if (qualityScore < threshold) {
            assessmentResults.issues.push(
              `${type}: Quality score ${qualityScore.toFixed(2)}% below threshold ${threshold}%`
            );
          }
          
          if (entries.length === 0) {
            assessmentResults.issues.push(`${type}: No entries found`);
          }
          
        } catch (error) {
          assessmentResults.issues.push(`${type}: Error reading entries - ${error}`);
        }
      }
      
      // Calculate overall quality
      assessmentResults.overall.qualityScore = assessmentResults.overall.totalEntries > 0
        ? (assessmentResults.overall.validEntries / assessmentResults.overall.totalEntries) * 100
        : 0;
      
      assessmentResults.overall.qualityScore = Math.round(assessmentResults.overall.qualityScore * 100) / 100;
      assessmentResults.overall.status = assessmentResults.overall.qualityScore >= threshold ? 'pass' : 'fail';
      
      // Generate recommendations
      if (assessmentResults.overall.status === 'fail') {
        assessmentResults.recommendations.push(
          'Increase evidence collection frequency',
          'Validate evidence data structure before logging',
          'Check for missing required fields in evidence entries'
        );
      }
      
      if (assessmentResults.issues.length > 0) {
        assessmentResults.recommendations.push(
          'Review and fix evidence logging implementation',
          'Implement proper error handling in evidence collection'
        );
      }
      
      // Output results
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(assessmentResults, null, 2));
        console.log(`✓ Assessment results saved to: ${options.output}`);
      } else {
        console.log(JSON.stringify(assessmentResults, null, 2));
      }
      
    } catch (error) {
      console.error('Error during assessment:', error);
      process.exit(1);
    }
  });

/**
 * Status command
 */
program
  .command('status')
  .description('Show evidence logging system status')
  .option('-t, --type <type>', 'Specific log type to check')
  .option('--detailed', 'Show detailed statistics')
  .action(async (options) => {
    try {
      const logger = await initializePatternLogger();
      
      if (options.type) {
        const stats = await logger.getLogStatistics(options.type);
        console.log(`\n=== ${options.type.toUpperCase()} Status ===`);
        console.log(`Total Entries: ${stats.totalEntries}`);
        console.log(`File Size: ${(stats.fileSize / 1024).toFixed(2)} KB`);
        console.log(`Entries Today: ${stats.entriesToday}`);
        if (stats.lastEntry) {
          console.log(`Last Entry: ${stats.lastEntry.timestamp}`);
        }
      } else {
        const types = ['learning_evidence', 'compounding_benefits', 'pattern_hits', 'tier_depth_coverage'];
        
        console.log('\n=== Evidence Logging System Status ===');
        
        for (const type of types) {
          const stats = await logger.getLogStatistics(type);
          console.log(`\n${type.toUpperCase()}:`);
          console.log(`  Entries: ${stats.totalEntries} (${stats.entriesToday} today)`);
          console.log(`  Size: ${(stats.fileSize / 1024).toFixed(2)} KB`);
          
          if (options.detailed && stats.lastEntry) {
            console.log(`  Last Entry: ${stats.lastEntry.timestamp}`);
            if (stats.lastEntry.metadata?.source) {
              console.log(`  Source: ${stats.lastEntry.metadata.source}`);
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error getting status:', error);
      process.exit(1);
    }
  });

/**
 * Test command
 */
program
  .command('test')
  .description('Test evidence logging system')
  .option('-c, --count <count>', 'Number of test entries to generate', '5')
  .option('-t, --type <type>', 'Type of test entries to generate', 'all')
  .action(async (options) => {
    try {
      const mappedOptions = mapLegacyArgs(program.opts());
      const logger = await initializePatternLogger();
      const count = parseInt(options.count) || 5;
      
      console.log(`Generating ${count} test entries for ${options.type}...`);
      
      for (let i = 0; i < count; i++) {
        // Generate learning evidence
        if (options.type === 'all' || options.type === 'learning_evidence') {
          await logger.logLearningEvidence(
            {
              test_id: i,
              data_quality: Math.random() * 100,
              completeness: Math.random() * 100,
              timestamp: new Date().toISOString()
            },
            {
              source: 'evidence-cli-test',
              severity: 'low'
            },
            `Test evidence generated for learning evidence validation. Verifies data quality and completeness metrics.`,
            {
              circle: 'system-optimization',
              purpose: 'test_validation',
              domain: 'technical-operations',
              triggering_event: 'evidence_cli_test'
            }
          );
        }
        
        // Generate compounding benefits
        if (options.type === 'all' || options.type === 'compounding_benefits') {
          await logger.logCompoundingBenefits(
            {
              test_id: i,
              energy_cost_usd: Math.random() * 0.1,
              value_per_hour: Math.random() * 1000,
              wsjf_per_hour: Math.random() * 10000
            },
            {
              source: 'evidence-cli-test',
              severity: 'medium'
            },
            `Test evidence for economic compounding metrics. Validates cost-benefit analysis and WSJF calculations.`,
            {
              circle: 'system-optimization',
              purpose: 'test_validation',
              domain: 'technical-operations',
              triggering_event: 'evidence_cli_test'
            }
          );
        }
        
        // Generate pattern hits
        if (options.type === 'all' || options.type === 'pattern_hits') {
          await logger.logPatternHit(
            `test_pattern_${i}`,
            {
              confidence: Math.random() * 100,
              frequency: Math.floor(Math.random() * 100),
              detected_at: new Date().toISOString()
            },
            {
              source: 'evidence-cli-test',
              severity: 'low'
            },
            `Test pattern hit evidence. Validates pattern detection confidence and frequency tracking.`,
            {
              circle: 'system-optimization',
              purpose: 'test_validation',
              domain: 'technical-operations',
              triggering_event: 'evidence_cli_test'
            }
          );
        }
        
        // Generate tier depth coverage
        if (options.type === 'all' || options.type === 'tier_depth_coverage') {
          await logger.logTierDepthCoverage(
            {
              test_id: i,
              tier_depth: Math.floor(Math.random() * 5) + 1,
              coverage_pct: Math.random() * 100,
              quality_score: Math.random() * 100
            },
            {
              source: 'evidence-cli-test',
              severity: 'medium'
            },
            `Test evidence for tier depth coverage. Validates maturity and coverage percentage metrics.`,
            {
              circle: 'system-optimization',
              purpose: 'test_validation',
              domain: 'technical-operations',
              triggering_event: 'evidence_cli_test'
            }
          );
        }
      }
      
      console.log(`✓ Generated ${count} test entries`);
      
      // Show status if verbose
      if (mappedOptions.verbose) {
        const statusCmd = program.commands.find(cmd => cmd.name() === 'status');
        if (statusCmd) {
          await statusCmd.action({ detailed: true });
        }
      }
      
    } catch (error) {
      console.error('Error during test:', error);
      process.exit(1);
    }
  });

/**
 * Config command
 */
program
  .command('config')
  .description('Configure evidence logging system')
  .option('--show', 'Show current configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--reset', 'Reset to default configuration')
  .action(async (options) => {
    try {
      if (options.show) {
        const logger = getPatternLogger();
        console.log('Current Evidence Configuration:');
        console.log(JSON.stringify({
          logDir: logger['config']?.logDir || '.goalie/logs',
          maxFileSize: logger['config']?.maxFileSize || 104857600,
          maxFiles: logger['config']?.maxFiles || 5,
          compressionEnabled: logger['config']?.compressionEnabled || true
        }, null, 2));
      } else if (options.reset) {
        console.log('Configuration reset not yet implemented');
      } else if (options.set) {
        console.log('Configuration setting not yet implemented');
      } else {
        console.log('Please specify an action: --show, --set, or --reset');
      }
      
    } catch (error) {
      console.error('Error managing configuration:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Handle legacy argument mapping at the top level
const opts = mapLegacyArgs(program.opts());

// Initialize logging if requested
if (opts.logGoalie || opts.tierDepthCoverage) {
  initializePatternLogger().then(() => {
    console.log('[EVIDENCE_CLI] Pattern logger initialized with requested options');
  }).catch(error => {
    console.error('[EVIDENCE_CLI] Failed to initialize pattern logger:', error);
  });
}