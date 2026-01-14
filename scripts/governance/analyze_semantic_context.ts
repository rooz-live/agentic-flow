#!/usr/bin/env node
/**
 * Analyze Semantic Context Coverage
 * P1-TIME: Measure how many pattern metrics have rich semantic context
 */

import { SemanticContextEnricher } from '../../src/governance/core/semantic_context_enricher';
import * as fs from 'fs';
import * as path from 'path';

interface AnalysisOptions {
  goalieDir?: string;
  hours?: number;
  outputFormat?: 'text' | 'json';
  reportFile?: string;
}

function parseArgs(): AnalysisOptions {
  const args = process.argv.slice(2);
  const options: AnalysisOptions = {
    goalieDir: '.goalie',
    hours: 24,
    outputFormat: 'text'
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--goalie-dir' && i + 1 < args.length) {
      options.goalieDir = args[++i];
    } else if (args[i] === '--hours' && i + 1 < args.length) {
      options.hours = parseInt(args[++i], 10);
    } else if (args[i] === '--output' && i + 1 < args.length) {
      options.outputFormat = args[++i] as 'text' | 'json';
    } else if (args[i] === '--report-file' && i + 1 < args.length) {
      options.reportFile = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      showUsage();
      process.exit(0);
    }
  }
  
  return options;
}

function showUsage() {
  console.log(`
Usage: analyze_semantic_context.ts [options]

Options:
  --goalie-dir <path>     Path to .goalie directory (default: .goalie)
  --hours <number>        Hours to look back (default: 24)
  --output <format>       Output format: text|json (default: text)
  --report-file <path>    Save JSON report to file
  --help, -h              Show this help message

Examples:
  # Analyze last 24 hours
  npx ts-node scripts/governance/analyze_semantic_context.ts
  
  # Analyze last week
  npx ts-node scripts/governance/analyze_semantic_context.ts --hours 168
  
  # JSON output with report file
  npx ts-node scripts/governance/analyze_semantic_context.ts --output json --report-file .goalie/context_coverage.json
`);
}

function main() {
  const options = parseArgs();
  
  try {
    const enricher = new SemanticContextEnricher({
      goalieDir: options.goalieDir
    });
    
    const coverage = enricher.analyzeContextCoverage(options.hours || 24);
    
    if (options.outputFormat === 'json') {
      const report = {
        timestamp: new Date().toISOString(),
        analysis_window_hours: options.hours,
        ...coverage,
        status: coverage.coverage_percentage >= 60 ? 'ADEQUATE' : 
                coverage.coverage_percentage >= 30 ? 'NEEDS_IMPROVEMENT' : 'CRITICAL',
        target_coverage: 60,
        gap: Math.max(0, 60 - coverage.coverage_percentage)
      };
      
      console.log(JSON.stringify(report, null, 2));
      
      if (options.reportFile) {
        fs.writeFileSync(options.reportFile, JSON.stringify(report, null, 2));
        console.error(`\n✓ Report saved to ${options.reportFile}`);
      }
    } else {
      // Text output
      console.log('======================================================================');
      console.log('SEMANTIC CONTEXT COVERAGE ANALYSIS');
      console.log('======================================================================');
      console.log(`Time Window: Last ${options.hours} hours`);
      console.log(`Analysis Time: ${new Date().toISOString()}`);
      console.log('');
      console.log(`Total Events: ${coverage.total_events}`);
      console.log(`Enriched Events: ${coverage.enriched_events}`);
      console.log(`Coverage: ${coverage.coverage_percentage.toFixed(1)}%`);
      console.log('');
      
      const status = coverage.coverage_percentage >= 60 ? '✓ ADEQUATE' :
                     coverage.coverage_percentage >= 30 ? '⚠ NEEDS_IMPROVEMENT' : '✗ CRITICAL';
      console.log(`Status: ${status} (Target: 60%)`);
      
      if (coverage.coverage_percentage < 60) {
        const gap = 60 - coverage.coverage_percentage;
        console.log(`Gap: ${gap.toFixed(1)}% below target`);
      }
      
      console.log('');
      console.log(`Patterns with Context (${coverage.patterns_with_context.length}):`);
      if (coverage.patterns_with_context.length > 0) {
        coverage.patterns_with_context.slice(0, 10).forEach(p => {
          console.log(`  ✓ ${p}`);
        });
        if (coverage.patterns_with_context.length > 10) {
          console.log(`  ... and ${coverage.patterns_with_context.length - 10} more`);
        }
      } else {
        console.log('  (none)');
      }
      
      console.log('');
      console.log(`Patterns without Context (${coverage.patterns_without_context.length}):`);
      if (coverage.patterns_without_context.length > 0) {
        coverage.patterns_without_context.slice(0, 10).forEach(p => {
          console.log(`  ✗ ${p}`);
        });
        if (coverage.patterns_without_context.length > 10) {
          console.log(`  ... and ${coverage.patterns_without_context.length - 10} more`);
        }
      } else {
        console.log('  (none)');
      }
      
      console.log('======================================================================');
      
      if (options.reportFile) {
        const report = {
          timestamp: new Date().toISOString(),
          analysis_window_hours: options.hours,
          ...coverage,
          status,
          target_coverage: 60,
          gap: Math.max(0, 60 - coverage.coverage_percentage)
        };
        fs.writeFileSync(options.reportFile, JSON.stringify(report, null, 2));
        console.log(`\n✓ Report saved to ${options.reportFile}`);
      }
    }
    
    // Exit with error code if coverage is critical
    if (coverage.coverage_percentage < 30) {
      process.exit(1);
    }
  } catch (error) {
    console.error('ERROR:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
