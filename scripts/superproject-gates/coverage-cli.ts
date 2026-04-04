#!/usr/bin/env node

/**
 * Coverage Reporting CLI
 * 
 * Command-line interface for tier/depth coverage reporting and management
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CoverageAnalyzer } from '../../agentic-flow-core/src/coverage/coverage-analyzer';
import {
  CoverageReport,
  CoveragePeriod,
  CoverageScope,
  TierType,
  CoverageConfiguration,
  ReportingSettings
} from '../../agentic-flow-core/src/coverage/types';

const program = new Command();

program
  .name('coverage')
  .description('Tier/Depth Coverage Reporting and Management CLI')
  .version('1.0.0');

// Analyze command
program
  .command('analyze')
  .description('Analyze coverage for specified circles and tiers')
  .option('--circles <circles>', 'Comma-separated list of circles to analyze', 'analyst,assessor,innovator')
  .option('--tiers <tiers>', 'Comma-separated list of tiers to analyze', 'high-structure,medium-structure,flexible')
  .option('--depth <depth>', 'Maximum depth level to analyze', '5')
  .option('--scope <scope>', 'Analysis scope (all, schema, backlog, telemetry)', 'all')
  .option('--period <period>', 'Analysis period (daily, weekly, monthly)', 'weekly')
  .option('--output <output>', 'Output file path', './coverage-analysis.json')
  .option('--format <format>', 'Output format (json, html, csv)', 'json')
  .action(async (options) => {
    try {
      const analyzer = new CoverageAnalyzer();
      
      const circles = options.circles ? options.circles.split(',') : ['analyst', 'assessor', 'innovator'];
      const tiers = options.tiers ? options.tiers.split(',').map(t => t.trim() as TierType) : ['high-structure', 'medium-structure', 'flexible'];
      const maxDepth = parseInt(options.depth) || 5;
      const scope = options.scope || 'all';
      const format = options.format || 'json';
      const outputFile = options.output || './coverage-analysis.json';
      
      const coverageScope: CoverageScope = {
        circles,
        tiers,
        depthLevels: Array.from({length: maxDepth}, (_, i) => i + 1),
        includeTelemetry: scope === 'all' || scope === 'telemetry',
        includeEconomic: scope === 'all' || scope === 'economic',
        includeWSJF: scope === 'all' || scope === 'wsjf'
      };
      
      const period: CoveragePeriod = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date(),
        type: options.period || 'weekly'
      };
      
      console.log('Analyzing coverage...');
      const report = await analyzer.generateCoverageReport(period, coverageScope);
      
      await saveReport(report, outputFile, format);
      console.log(`Coverage analysis complete. Report saved to: ${outputFile}`);
      
    } catch (error) {
      console.error('Error analyzing coverage:', error);
      process.exit(1);
    }
  });

// Report command
program
  .command('report')
  .description('Generate comprehensive coverage report')
  .option('--circles <circles>', 'Comma-separated list of circles', 'analyst,assessor,innovator')
  .option('--tiers <tiers>', 'Comma-separated list of tiers', 'high-structure,medium-structure,flexible')
  .option('--period <period>', 'Report period (daily, weekly, monthly)', 'weekly')
  .option('--include-trends', 'Include trend analysis in report')
  .option('--include-predictions', 'Include predictions in report')
  .option('--template <template>', 'Report template to use', 'standard')
  .option('--output <output>', 'Output file path', './coverage-report.html')
  .option('--format <format>', 'Output format (json, html, pdf)', 'html')
  .action(async (options) => {
    try {
      const analyzer = new CoverageAnalyzer();
      
      const circles = options.circles ? options.circles.split(',') : ['analyst', 'assessor', 'innovator'];
      const tiers = options.tiers ? options.tiers.split(',').map(t => t.trim() as TierType) : ['high-structure', 'medium-structure', 'flexible'];
      const format = options.format || 'html';
      const outputFile = options.output || './coverage-report.html';
      
      const coverageScope: CoverageScope = {
        circles,
        tiers,
        depthLevels: [1, 2, 3, 4, 5],
        includeTelemetry: true,
        includeEconomic: true,
        includeWSJF: true
      };
      
      const period: CoveragePeriod = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date(),
        type: options.period || 'weekly'
      };
      
      console.log('Generating coverage report...');
      const report = await analyzer.generateCoverageReport(period, coverageScope);
      
      // Generate formatted report
      if (format === 'html') {
        await generateHTMLReport(report, outputFile, {
          includeTrends: options.includeTrends || false,
          includePredictions: options.includePredictions || false,
          template: options.template || 'standard'
        });
      } else {
        await saveReport(report, outputFile, format);
      }
      
      console.log(`Coverage report generated. Report saved to: ${outputFile}`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      process.exit(1);
    }
  });

// Trends command
program
  .command('trends')
  .description('Analyze coverage trends over time')
  .option('--circles <circles>', 'Comma-separated list of circles', 'analyst,assessor,innovator')
  .option('--tiers <tiers>', 'Comma-separated list of tiers', 'high-structure,medium-structure,flexible')
  .option('--window <window>', 'Time window for trend analysis (days)', '30')
  .option('--output <output>', 'Output file path', './coverage-trends.json')
  .action(async (options) => {
    try {
      const analyzer = new CoverageAnalyzer();
      
      const circles = options.circles ? options.circles.split(',') : ['analyst', 'assessor', 'innovator'];
      const tiers = options.tiers ? options.tiers.split(',').map(t => t.trim() as TierType) : ['high-structure', 'medium-structure', 'flexible'];
      const window = parseInt(options.window) || 30;
      const outputFile = options.output || './coverage-trends.json';
      
      const coverageScope: CoverageScope = {
        circles,
        tiers,
        depthLevels: [1, 2, 3, 4, 5],
        includeTelemetry: true,
        includeEconomic: true,
        includeWSJF: true
      };
      
      const period: CoveragePeriod = {
        start: new Date(Date.now() - window * 24 * 60 * 60 * 1000),
        end: new Date(),
        type: 'custom'
      };
      
      console.log('Analyzing coverage trends...');
      const report = await analyzer.generateCoverageReport(period, coverageScope);
      
      // Extract and save trends
      const trendsData = {
        period,
        overallTrend: report.trends.overallTrend,
        tierTrends: report.trends.tierTrends,
        depthTrends: report.trends.depthTrends,
        circleTrends: report.trends.circleTrends,
        keyInsights: report.trends.keyInsights
      };
      
      await fs.writeFile(outputFile, JSON.stringify(trendsData, null, 2));
      console.log(`Trends analysis complete. Data saved to: ${outputFile}`);
      
    } catch (error) {
      console.error('Error analyzing trends:', error);
      process.exit(1);
    }
  });

// Maturity command
program
  .command('maturity')
  .description('Analyze maturity surface')
  .option('--circles <circles>', 'Comma-separated list of circles', 'analyst,assessor,innovator')
  .option('--tiers <tiers>', 'Comma-separated list of tiers', 'high-structure,medium-structure,flexible')
  .option('--dimensions <dimensions>', 'Comma-separated list of maturity dimensions', 'Coverage Completeness,Depth Sophistication,Quality Assurance,Process Maturity')
  .option('--assessments <assessments>', 'Include assessment details', 'false')
  .option('--output <output>', 'Output file path', './maturity-analysis.json')
  .action(async (options) => {
    try {
      const analyzer = new CoverageAnalyzer();
      
      const circles = options.circles ? options.circles.split(',') : ['analyst', 'assessor', 'innovator'];
      const tiers = options.tiers ? options.tiers.split(',').map(t => t.trim() as TierType) : ['high-structure', 'medium-structure', 'flexible'];
      const dimensions = options.dimensions ? options.dimensions.split(',') : ['Coverage Completeness', 'Depth Sophistication', 'Quality Assurance', 'Process Maturity'];
      const includeAssessments = options.assessments === 'true';
      const outputFile = options.output || './maturity-analysis.json';
      
      const coverageScope: CoverageScope = {
        circles,
        tiers,
        depthLevels: [1, 2, 3, 4, 5],
        includeTelemetry: true,
        includeEconomic: true,
        includeWSJF: true
      };
      
      const period: CoveragePeriod = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date(),
        type: 'monthly'
      };
      
      console.log('Analyzing maturity surface...');
      const report = await analyzer.generateCoverageReport(period, coverageScope);
      
      // Extract and save maturity data
      const maturityData = {
        period,
        dimensions: report.maturitySurface.dimensions,
        overallScore: report.maturitySurface.overallScore,
        maturityLevel: report.maturitySurface.maturityLevel,
        assessment: includeAssessments ? report.maturitySurface.assessment : undefined,
        evolution: report.maturitySurface.evolution
      };
      
      await fs.writeFile(outputFile, JSON.stringify(maturityData, null, 2));
      console.log(`Maturity analysis complete. Data saved to: ${outputFile}`);
      
    } catch (error) {
      console.error('Error analyzing maturity:', error);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate coverage items against tier requirements')
  .option('--input <input>', 'Input file with coverage items to validate', './coverage-items.json')
  .option('--tier <tier>', 'Target tier for validation', 'medium-structure')
  .option('--output <output>', 'Output file path', './validation-results.json')
  .action(async (options) => {
    try {
      const analyzer = new CoverageAnalyzer();
      
      const inputFile = options.input || './coverage-items.json';
      const tier = (options.tier || 'medium-structure') as TierType;
      const outputFile = options.output || './validation-results.json';
      
      // Load coverage items
      const inputData = await fs.readFile(inputFile, 'utf-8');
      const coverageItems = JSON.parse(inputData);
      
      console.log(`Validating coverage items against ${tier} tier...`);
      
      // Get tier definition
      const tierDefinitions = analyzer.getTierDefinitions();
      const tierDefinition = tierDefinitions.get(tier);
      
      if (!tierDefinition) {
        throw new Error(`Unknown tier: ${tier}`);
      }
      
      // Validate items
      const validationResults = {
        tier,
        itemCount: coverageItems.length,
        validItems: 0,
        invalidItems: 0,
        issues: [],
        compliance: {
          overall: 'compliant',
          score: 0,
          details: {}
        }
      };
      
      for (const item of coverageItems) {
        const validation = validateItem(item, tierDefinition);
        if (validation.valid) {
          validationResults.validItems++;
        } else {
          validationResults.invalidItems++;
          validationResults.issues.push(...validation.issues);
        }
      }
      
      // Calculate compliance score
      validationResults.compliance.score = (validationResults.validItems / validationResults.itemCount) * 100;
      validationResults.compliance.overall = validationResults.compliance.score >= tierDefinition.complianceThreshold ? 'compliant' : 'non_compliant';
      
      await fs.writeFile(outputFile, JSON.stringify(validationResults, null, 2));
      console.log(`Validation complete. Results saved to: ${outputFile}`);
      console.log(`Valid items: ${validationResults.validItems}/${validationResults.itemCount}`);
      console.log(`Compliance score: ${validationResults.compliance.score.toFixed(2)}%`);
      
    } catch (error) {
      console.error('Error validating items:', error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show coverage system status')
  .option('--verbose', 'Show detailed status information')
  .action(async (options) => {
    try {
      const analyzer = new CoverageAnalyzer();
      const config = analyzer.getConfiguration();
      const verbose = options.verbose || false;
      
      console.log('Coverage System Status');
      console.log('======================');
      console.log(`Configuration loaded: ${config ? 'Yes' : 'No'}`);
      console.log(`Default tier: ${config.defaultTier}`);
      console.log(`Max depth: ${config.maxDepth}`);
      console.log(`Pattern metrics integration: ${config.integrationSettings.patternMetrics.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`WSJF integration: ${config.integrationSettings.wsjf.enabled ? 'Enabled' : 'Disabled'}`);
      console.log(`Economic integration: ${config.integrationSettings.economics.enabled ? 'Enabled' : 'Disabled'}`);
      
      if (verbose) {
        console.log('\nDetailed Configuration:');
        console.log(JSON.stringify(config, null, 2));
        
        const historicalReports = analyzer.getHistoricalReports();
        console.log(`\nHistorical reports: ${historicalReports.length}`);
        
        if (historicalReports.length > 0) {
          const latestReport = historicalReports[historicalReports.length - 1];
          console.log(`Latest report: ${latestReport.id} (${latestReport.generatedAt.toISOString()})`);
          console.log(`Overall score: ${latestReport.summary.overallScore.toFixed(2)}`);
          console.log(`Status: ${latestReport.summary.status}`);
        }
      }
      
    } catch (error) {
      console.error('Error getting status:', error);
      process.exit(1);
    }
  });

// Config command
program
  .command('config')
  .description('Manage coverage configuration')
  .option('--show', 'Show current configuration')
  .option('--set <key=value>', 'Set configuration value (can be used multiple times)')
  .option('--reset', 'Reset configuration to defaults')
  .action(async (options) => {
    try {
      const analyzer = new CoverageAnalyzer();
      
      if (options.reset) {
        console.log('Resetting configuration to defaults...');
        const defaultConfig = new CoverageAnalyzer().getConfiguration();
        analyzer.updateConfiguration(defaultConfig);
        console.log('Configuration reset successfully');
        return;
      }
      
      if (options.show) {
        const config = analyzer.getConfiguration();
        console.log('Current Configuration:');
        console.log(JSON.stringify(config, null, 2));
        return;
      }
      
      if (options.set) {
        console.log('Updating configuration...');
        const config = analyzer.getConfiguration();
        
        // Parse key=value pairs
        const updates: any = {};
        for (const setting of options.set) {
          const [key, value] = setting.split('=');
          setNestedProperty(updates, key, parseValue(value));
        }
        
        analyzer.updateConfiguration({ ...config, ...updates });
        console.log('Configuration updated successfully');
        return;
      }
      
      console.log('No action specified. Use --help for available options.');
      
    } catch (error) {
      console.error('Error managing configuration:', error);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize coverage system')
  .option('--force', 'Force initialization even if already initialized')
  .action(async (options) => {
    try {
      const configDir = path.join(process.cwd(), '.goalie');
      const configFile = path.join(configDir, 'coverage-config.json');
      
      // Check if already initialized
      if (!options.force) {
        try {
          await fs.access(configFile);
          console.log('Coverage system already initialized. Use --force to reinitialize.');
          return;
        } catch (error) {
          // File doesn't exist, proceed with initialization
        }
      }
      
      // Ensure .goalie directory exists
      await fs.mkdir(configDir, { recursive: true });
      
      // Create default configuration
      const defaultConfig = new CoverageAnalyzer().getConfiguration();
      await fs.writeFile(configFile, JSON.stringify(defaultConfig, null, 2));
      
      // Create empty reports file
      const reportsFile = path.join(configDir, 'coverage-reports.json');
      try {
        await fs.access(reportsFile);
      } catch (error) {
        await fs.writeFile(reportsFile, JSON.stringify([], null, 2));
      }
      
      console.log('Coverage system initialized successfully');
      console.log(`Configuration file: ${configFile}`);
      console.log(`Reports file: ${reportsFile}`);
      
    } catch (error) {
      console.error('Error initializing coverage system:', error);
      process.exit(1);
    }
  });

// Helper functions
async function saveReport(report: CoverageReport, outputFile: string, format: string): Promise<void> {
  const data = format === 'json' ? JSON.stringify(report, null, 2) : 
                 format === 'csv' ? convertToCSV(report) : 
                 JSON.stringify(report, null, 2);
  
  await fs.writeFile(outputFile, data);
}

async function generateHTMLReport(report: CoverageReport, outputFile: string, options: any): Promise<void> {
  const html = generateHTML(report, options);
  await fs.writeFile(outputFile, html);
}

function generateHTML(report: CoverageReport, options: any): string {
  const includeTrends = options.includeTrends || false;
  const includePredictions = options.includePredictions || false;
  const template = options.template || 'standard';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report - ${report.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 3px; }
        .score { font-size: 24px; font-weight: bold; color: #007bff; }
        .status { padding: 5px 10px; border-radius: 3px; font-weight: bold; }
        .status.excellent { background: #d4edda; color: #155724; }
        .status.good { background: #cce5b4; color: #155724; }
        .status.fair { background: #fff3cd; color: #856404; }
        .status.poor { background: #f8d7da; color: #721c24; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f2f2f2; font-weight: bold; }
        .chart { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.name}</h1>
        <p>${report.description}</p>
        <p>Generated: ${report.generatedAt.toISOString()}</p>
        <p>Period: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}</p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="score">${report.summary.overallScore.toFixed(2)}</div>
        <div class="status ${report.summary.status}">${report.summary.status.toUpperCase()}</div>
        
        <h3>Highlights</h3>
        <ul>
            ${report.summary.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
        
        <h3>Concerns</h3>
        <ul>
            ${report.summary.concerns.map(c => `<li>${c}</li>`).join('')}
        </ul>
    </div>
    
    <div class="section">
        <h2>Tier Coverage</h2>
        <table>
            <tr>
                <th>Tier</th>
                <th>Score</th>
                <th>Items</th>
                <th>Coverage</th>
                <th>Quality</th>
                <th>Compliance</th>
            </tr>
            ${report.tiers.map(tier => `
            <tr>
                <td>${tier.definition.name}</td>
                <td>${tier.score.toFixed(2)}</td>
                <td>${tier.metrics.totalItems}</td>
                <td>${tier.metrics.averageCoverage.toFixed(1)}%</td>
                <td>${tier.metrics.averageQuality.toFixed(1)}%</td>
                <td>${tier.compliance.overall}</td>
            </tr>
            `).join('')}
        </table>
    </div>
    
    <div class="section">
        <h2>Depth Analysis</h2>
        <table>
            <tr>
                <th>Depth</th>
                <th>Items</th>
                <th>Percentage</th>
                <th>Average Quality</th>
            </tr>
            ${report.depthAnalysis.depthDistribution.map(depth => `
            <tr>
                <td>${depth.depth}</td>
                <td>${depth.count}</td>
                <td>${depth.percentage.toFixed(1)}%</td>
                <td>${depth.averageQuality.toFixed(1)}%</td>
            </tr>
            `).join('')}
        </table>
    </div>
    
    <div class="section">
        <h2>Maturity Surface</h2>
        <div class="score">${report.maturitySurface.overallScore.toFixed(2)}</div>
        <div class="status ${report.maturitySurface.maturityLevel}">${report.maturitySurface.maturityLevel.toUpperCase()}</div>
        
        <h3>Dimensions</h3>
        <table>
            <tr>
                <th>Dimension</th>
                <th>Score</th>
                <th>Weight</th>
                <th>Level</th>
            </tr>
            ${report.maturitySurface.dimensions.map(dim => `
            <tr>
                <td>${dim.name}</td>
                <td>${dim.score.toFixed(2)}</td>
                <td>${dim.weight}</td>
                <td>${dim.level}</td>
            </tr>
            `).join('')}
        </table>
    </div>
    
    ${includeTrends ? `
    <div class="section">
        <h2>Trends</h2>
        <div class="status ${report.trends.overallTrend}">${report.trends.overallTrend.toUpperCase()}</div>
        
        <h3>Key Insights</h3>
        <ul>
            ${report.trends.keyInsights.map(insight => `
            <li><strong>${insight.title}:</strong> ${insight.description}</li>
            `).join('')}
        </ul>
    </div>
    ` : ''}
    
    ${includePredictions ? `
    <div class="section">
        <h2>Predictions</h2>
        <p>Future projections based on current trends...</p>
        <!-- Add prediction charts and analysis here -->
    </div>
    ` : ''}
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `
            <li><strong>${rec.title}:</strong> ${rec.description}</li>
            `).join('')}
        </ul>
    </div>
</body>
</html>
  `;
}

function convertToCSV(report: CoverageReport): string {
  const headers = ['Type', 'Category', 'Name', 'Tier', 'Depth', 'Coverage', 'Quality', 'Status'];
  const rows = [headers.join(',')];
  
  // Add tier coverage data
  for (const tier of report.tiers) {
    rows.push(`Tier,${tier.tier},${tier.definition.name},${tier.tier},${tier.metrics.averageDepth},${tier.metrics.averageCoverage},${tier.metrics.averageQuality},${tier.compliance.overall}`);
  }
  
  return rows.join('\n');
}

function validateItem(item: any, tierDefinition: any): { valid: boolean; issues: any[] } {
  const issues: any[] = [];
  
  // Check required fields
  for (const field of tierDefinition.schema.fields.filter(f => f.required)) {
    if (!item[field.name]) {
      issues.push({
        type: 'missing_field',
        field: field.name,
        message: `Required field '${field.name}' is missing`
      });
    }
  }
  
  // Check field validations
  for (const field of tierDefinition.schema.fields) {
    if (item[field.name] && field.validation) {
      const value = item[field.name];
      
      if (field.validation.minLength && value.length < field.validation.minLength) {
        issues.push({
          type: 'invalid_value',
          field: field.name,
          message: `Field '${field.name}' is too short`
        });
      }
      
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        issues.push({
          type: 'invalid_value',
          field: field.name,
          message: `Field '${field.name}' is too long`
        });
      }
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

function parseValue(value: string): any {
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch (error) {
    // If not JSON, return as string
    return value;
  }
}

// Parse command line arguments
program.parse();