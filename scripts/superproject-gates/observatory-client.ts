/**
 * LLM Observatory SDK Integration
 * 
 * Wrapper for distributed metrics collection from pattern logger and decision audit.
 * Integrates with @llm-observatory/sdk for comprehensive observability.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Note: @llm-observatory/sdk will be installed separately
// This is a placeholder implementation that provides the interface

interface ObservatoryMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface ObservatoryConfig {
  projectRoot: string;
  endpoint?: string;
  apiKey?: string;
  enablePatternLogging?: boolean;
  enableDecisionAudit?: boolean;
  enableSkillTracking?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

export class ObservatoryClient {
  private config: ObservatoryConfig;
  private decisionDb?: Database.Database;
  private skillsDb?: Database.Database;
  private metricsBuffer: ObservatoryMetric[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: ObservatoryConfig) {
    this.config = {
      endpoint: 'https://observatory.example.com/api/v1/metrics',
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      enablePatternLogging: true,
      enableDecisionAudit: true,
      enableSkillTracking: true,
      ...config
    };

    this.initDatabases();
    this.startAutoFlush();

    console.log('✅ Observatory Client initialized');
    console.log(`📊 Endpoint: ${this.config.endpoint}`);
    console.log(`⚙️  Pattern Logging: ${this.config.enablePatternLogging}`);
    console.log(`⚙️  Decision Audit: ${this.config.enableDecisionAudit}`);
    console.log(`⚙️  Skill Tracking: ${this.config.enableSkillTracking}`);
  }

  private initDatabases(): void {
    const decisionDbPath = join(this.config.projectRoot, '.goalie/logs/decision_audit.db');
    const skillsDbPath = join(this.config.projectRoot, '.goalie/logs/skills.db');

    if (existsSync(decisionDbPath)) {
      this.decisionDb = new Database(decisionDbPath, { readonly: true });
      console.log('✅ Connected to decision audit database');
    }

    if (existsSync(skillsDbPath)) {
      this.skillsDb = new Database(skillsDbPath, { readonly: true });
      console.log('✅ Connected to skills database');
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Record a custom metric
   */
  public recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    this.metricsBuffer.push({
      name,
      value,
      timestamp: Date.now(),
      labels,
      metadata
    });

    if (this.metricsBuffer.length >= this.config.batchSize!) {
      this.flush();
    }
  }

  /**
   * Collect governance metrics
   */
  public collectGovernanceMetrics(): void {
    if (!this.decisionDb) return;

    try {
      // Decision count
      const decisionCount = this.decisionDb.prepare(`
        SELECT COUNT(*) as count FROM decision_audit
      `).get() as any;

      this.recordMetric(
        'governance.decisions.total',
        decisionCount.count,
        { source: 'decision_audit' }
      );

      // Decisions with rationale
      const withRationale = this.decisionDb.prepare(`
        SELECT COUNT(*) as count FROM decision_audit 
        WHERE rationale IS NOT NULL AND rationale != ''
      `).get() as any;

      this.recordMetric(
        'governance.decisions.with_rationale',
        withRationale.count,
        { source: 'decision_audit' }
      );

      // Average rationale length
      const avgLength = this.decisionDb.prepare(`
        SELECT AVG(LENGTH(rationale)) as avg_length FROM decision_audit
        WHERE rationale IS NOT NULL
      `).get() as any;

      this.recordMetric(
        'governance.rationale.avg_length',
        Math.round(avgLength.avg_length || 0),
        { source: 'decision_audit', unit: 'characters' }
      );

      console.log('📊 Collected governance metrics');
    } catch (error) {
      console.error('Error collecting governance metrics:', error);
    }
  }

  /**
   * Collect skill metrics
   */
  public collectSkillMetrics(): void {
    if (!this.skillsDb) return;

    try {
      // Total skills
      const totalSkills = this.skillsDb.prepare(`
        SELECT COUNT(*) as count FROM skills
      `).get() as any;

      this.recordMetric(
        'skills.total',
        totalSkills.count,
        { source: 'skills_db' }
      );

      // Confident skills (>0.5)
      const confidentSkills = this.skillsDb.prepare(`
        SELECT COUNT(*) as count FROM skills WHERE confidence > 0.5
      `).get() as any;

      this.recordMetric(
        'skills.confident',
        confidentSkills.count,
        { source: 'skills_db', threshold: '0.5' }
      );

      // Average confidence
      const avgConfidence = this.skillsDb.prepare(`
        SELECT AVG(confidence) as avg_confidence FROM skills
      `).get() as any;

      this.recordMetric(
        'skills.avg_confidence',
        Math.round((avgConfidence.avg_confidence || 0) * 100) / 100,
        { source: 'skills_db' }
      );

      // Dimension coverage
      const dimensions = this.skillsDb.prepare(`
        SELECT COUNT(DISTINCT dimension) as count FROM skills
        WHERE confidence > 0.5
      `).get() as any;

      this.recordMetric(
        'skills.dimensions.covered',
        dimensions.count,
        { source: 'skills_db', target: '4' }
      );

      console.log('📊 Collected skill metrics');
    } catch (error) {
      console.error('Error collecting skill metrics:', error);
    }
  }

  /**
   * Collect pattern log metrics
   */
  public collectPatternMetrics(): void {
    const patternLogsDir = join(this.config.projectRoot, '.goalie/logs');
    
    if (!existsSync(patternLogsDir)) return;

    try {
      const { readdirSync } = require('fs');
      const files = readdirSync(patternLogsDir).filter((f: string) => f.endsWith('.json'));

      this.recordMetric(
        'patterns.log_files.total',
        files.length,
        { source: 'pattern_logs' }
      );

      // Sample patterns for type distribution
      let patternTypes: Record<string, number> = {};
      let totalPatterns = 0;

      files.slice(0, 100).forEach((file: string) => {
        try {
          const content = readFileSync(join(patternLogsDir, file), 'utf-8');
          const pattern = JSON.parse(content);
          const type = pattern.type || 'unknown';
          patternTypes[type] = (patternTypes[type] || 0) + 1;
          totalPatterns++;
        } catch (error) {
          // Skip invalid files
        }
      });

      this.recordMetric(
        'patterns.total',
        totalPatterns,
        { source: 'pattern_logs', sampled: 'true' }
      );

      // Record pattern type distribution
      Object.entries(patternTypes).forEach(([type, count]) => {
        this.recordMetric(
          'patterns.by_type',
          count,
          { source: 'pattern_logs', type }
        );
      });

      console.log('📊 Collected pattern metrics');
    } catch (error) {
      console.error('Error collecting pattern metrics:', error);
    }
  }

  /**
   * Collect all metrics
   */
  public collectAll(): void {
    console.log('📊 Collecting all metrics...');
    
    if (this.config.enableDecisionAudit) {
      this.collectGovernanceMetrics();
    }

    if (this.config.enableSkillTracking) {
      this.collectSkillMetrics();
    }

    if (this.config.enablePatternLogging) {
      this.collectPatternMetrics();
    }

    console.log(`✅ Collected ${this.metricsBuffer.length} metrics`);
  }

  /**
   * Flush metrics buffer
   */
  public async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToSend = [...this.metricsBuffer];
    this.metricsBuffer = [];

    console.log(`📤 Flushing ${metricsToSend.length} metrics to Observatory...`);

    try {
      // TODO: Replace with actual @llm-observatory/sdk client
      // For now, just log to console
      if (this.config.apiKey) {
        // const response = await fetch(this.config.endpoint!, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${this.config.apiKey}`
        //   },
        //   body: JSON.stringify({ metrics: metricsToSend })
        // });
        
        console.log('📡 Would send metrics to:', this.config.endpoint);
        console.log('📊 Metrics summary:', {
          count: metricsToSend.length,
          names: [...new Set(metricsToSend.map(m => m.name))]
        });
      } else {
        console.log('⚠️  No API key configured, metrics logged locally only');
      }
    } catch (error) {
      console.error('Error flushing metrics:', error);
      // Put metrics back in buffer for retry
      this.metricsBuffer.unshift(...metricsToSend);
    }
  }

  /**
   * Generate metrics report
   */
  public generateReport(): string {
    const metricsByName: Record<string, ObservatoryMetric[]> = {};
    
    this.metricsBuffer.forEach(metric => {
      if (!metricsByName[metric.name]) {
        metricsByName[metric.name] = [];
      }
      metricsByName[metric.name].push(metric);
    });

    let report = '\n';
    report += '╔════════════════════════════════════════════════════════════════════╗\n';
    report += '║          LLM Observatory - Metrics Report                         ║\n';
    report += '╚════════════════════════════════════════════════════════════════════╝\n\n';

    report += `📊 Total Metrics in Buffer: ${this.metricsBuffer.length}\n`;
    report += `🔄 Flush Interval: ${this.config.flushInterval}ms\n`;
    report += `📦 Batch Size: ${this.config.batchSize}\n\n`;

    report += '─────────────────────────────────────────────────────────────────────\n';
    report += 'METRICS SUMMARY\n';
    report += '─────────────────────────────────────────────────────────────────────\n\n';

    Object.entries(metricsByName).forEach(([name, metrics]) => {
      const latestMetric = metrics[metrics.length - 1];
      report += `📈 ${name}\n`;
      report += `   Value: ${latestMetric.value}\n`;
      if (latestMetric.labels) {
        report += `   Labels: ${JSON.stringify(latestMetric.labels)}\n`;
      }
      report += `   Count: ${metrics.length} measurements\n\n`;
    });

    return report;
  }

  /**
   * Shutdown and cleanup
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Observatory Client...');

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    await this.flush();

    if (this.decisionDb) this.decisionDb.close();
    if (this.skillsDb) this.skillsDb.close();

    console.log('✅ Observatory Client shutdown complete');
  }
}

// CLI interface (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  const projectRoot = process.argv[2] || process.cwd();
  
  const client = new ObservatoryClient({
    projectRoot,
    apiKey: process.env.OBSERVATORY_API_KEY,
    endpoint: process.env.OBSERVATORY_ENDPOINT
  });

  // Collect metrics
  client.collectAll();

  // Wait a bit for auto-flush
  setTimeout(async () => {
    console.log(client.generateReport());
    await client.shutdown();
    process.exit(0);
  }, 2000);
}

export default ObservatoryClient;
