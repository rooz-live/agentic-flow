#!/usr/bin/env node

/**
 * Performance Baseline Establishment Script
 * 
 * Establishes measurable baselines for project performance
 * Creates benchmark tests for critical system components
 * Sets up performance monitoring thresholds
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const os = require('os');

class PerformanceBaseline {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || path.join(__dirname, '..', '..');
    this.baselineDir = path.join(this.projectRoot, 'metrics', 'baselines');
    this.reportDir = path.join(this.projectRoot, 'reports', 'performance');
    this.thresholds = {
      responseTime: options.responseTimeThreshold || 1000, // ms
      memoryUsage: options.memoryThreshold || 512 * 1024 * 1024, // 512MB
      cpuUsage: options.cpuThreshold || 80, // %
      diskIO: options.diskIOThreshold || 100 * 1024 * 1024, // 100MB/s
      networkLatency: options.networkLatencyThreshold || 100 // ms
    };
    this.debug = options.debug || false;
  }

  /**
   * Initialize baseline directories
   */
  initialize() {
    fs.mkdirSync(this.baselineDir, { recursive: true });
    fs.mkdirSync(this.reportDir, { recursive: true });
    this.log('Performance baseline directories initialized');
  }

  /**
   * Log message with timestamp
   */
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  /**
   * Measure system resource usage
   */
  async measureSystemResources() {
    return new Promise((resolve) => {
      const cpus = os.cpus();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const loadAvg = os.loadavg();
      
      const resourceMetrics = {
        timestamp: new Date().toISOString(),
        cpu: {
          count: cpus.length,
          model: cpus[0].model,
          speed: cpus[0].speed,
          loadAverage: loadAvg,
          utilization: (loadAvg[0] / cpus.length) * 100
        },
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: totalMemory - freeMemory,
          utilization: ((totalMemory - freeMemory) / totalMemory) * 100
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          uptime: os.uptime(),
          hostname: os.hostname()
        }
      };

      resolve(resourceMetrics);
    });
  }

  /**
   * Benchmark process governor performance
   */
  async benchmarkProcessGovernor() {
    this.log('Benchmarking Process Governor performance...');
    
    const testIncidents = [
      { type: 'CPU_OVERLOAD', details: { cpuUsage: 95 } },
      { type: 'MEMORY_PRESSURE', details: { memoryUsage: 90 } },
      { type: 'RATE_LIMITED', details: { activeWork: 10, queuedWork: 25 } }
    ];

    const results = [];
    
    for (const incident of testIncidents) {
      const startTime = Date.now();
      
      try {
        // Test process governor response time
        const result = await this.testProcessGovernorIncident(incident);
        const endTime = Date.now();
        
        results.push({
          incidentType: incident.type,
          responseTime: endTime - startTime,
          success: result.success,
          metrics: result.metrics
        });
      } catch (error) {
        const endTime = Date.now();
        results.push({
          incidentType: incident.type,
          responseTime: endTime - startTime,
          success: false,
          error: error.message
        });
      }
    }

    return {
      component: 'processGovernor',
      timestamp: new Date().toISOString(),
      tests: results,
      averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
      successRate: results.filter(r => r.success).length / results.length * 100
    };
  }

  /**
   * Test individual process governor incident
   */
  async testProcessGovernorIncident(incident) {
    return new Promise((resolve) => {
      const testScript = `
        const { processGovernor } = require('./src/runtime/processGovernor.ts');
        
        // Generate test incident
        processGovernor.logIncident('${incident.type}', ${JSON.stringify(incident.details)});
        
        console.log('Test incident processed successfully');
      `;

      const child = spawn('node', ['-e', testScript], {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          metrics: {
            exitCode: code,
            hasOutput: stdout.length > 0,
            hasErrors: stderr.length > 0
          }
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          metrics: { error: true }
        });
      });
    });
  }

  /**
   * Benchmark learning bridge performance
   */
  async benchmarkLearningBridge() {
    this.log('Benchmarking Learning Bridge performance...');
    
    const testEvents = [
      {
        timestamp: new Date().toISOString(),
        type: 'process_governor_incident',
        incidentType: 'CPU_OVERLOAD',
        details: { cpuUsage: 95 },
        stateSnapshot: {
          activeWork: 5,
          queuedWork: 10,
          completedWork: 20,
          failedWork: 2,
          circuitBreaker: 'CLOSED',
          availableTokens: 15
        }
      },
      {
        timestamp: new Date().toISOString(),
        type: 'process_governor_incident',
        incidentType: 'MEMORY_PRESSURE',
        details: { memoryUsage: 90 },
        stateSnapshot: {
          activeWork: 3,
          queuedWork: 8,
          completedWork: 15,
          failedWork: 1,
          circuitBreaker: 'OPEN',
          availableTokens: 5
        }
      }
    ];

    const results = [];
    
    for (const event of testEvents) {
      const startTime = Date.now();
      
      try {
        const result = await this.testLearningBridgeEvent(event);
        const endTime = Date.now();
        
        results.push({
          eventType: event.incidentType,
          responseTime: endTime - startTime,
          success: result.success,
          metrics: result.metrics
        });
      } catch (error) {
        const endTime = Date.now();
        results.push({
          eventType: event.incidentType,
          responseTime: endTime - startTime,
          success: false,
          error: error.message
        });
      }
    }

    return {
      component: 'learningBridge',
      timestamp: new Date().toISOString(),
      tests: results,
      averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
      successRate: results.filter(r => r.success).length / results.length * 100
    };
  }

  /**
   * Test individual learning bridge event
   */
  async testLearningBridgeEvent(event) {
    return new Promise((resolve) => {
      const child = spawn('node', ['./scripts/agentdb/process_governor_ingest_dedup.js'], {
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.stdin.write(JSON.stringify(event));
      child.stdin.end();

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          stdout,
          stderr,
          metrics: {
            exitCode: code,
            hasOutput: stdout.length > 0,
            hasErrors: stderr.length > 0
          }
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          metrics: { error: true }
        });
      });
    });
  }

  /**
   * Benchmark database performance
   */
  async benchmarkDatabase() {
    this.log('Benchmarking Database performance...');
    
    const dbPath = path.join(this.projectRoot, 'risks.db');
    const results = [];

    // Test database connection
    const connectionStart = Date.now();
    try {
      const connectionResult = await this.testDatabaseConnection(dbPath);
      const connectionEnd = Date.now();
      
      results.push({
        test: 'connection',
        responseTime: connectionEnd - connectionStart,
        success: connectionResult.success,
        metrics: connectionResult.metrics
      });
    } catch (error) {
      const connectionEnd = Date.now();
      results.push({
        test: 'connection',
        responseTime: connectionEnd - connectionStart,
        success: false,
        error: error.message
      });
    }

    // Test database query performance
    const queryStart = Date.now();
    try {
      const queryResult = await this.testDatabaseQuery(dbPath);
      const queryEnd = Date.now();
      
      results.push({
        test: 'query',
        responseTime: queryEnd - queryStart,
        success: queryResult.success,
        metrics: queryResult.metrics
      });
    } catch (error) {
      const queryEnd = Date.now();
      results.push({
        test: 'query',
        responseTime: queryEnd - queryStart,
        success: false,
        error: error.message
      });
    }

    return {
      component: 'database',
      timestamp: new Date().toISOString(),
      tests: results,
      averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
      successRate: results.filter(r => r.success).length / results.length * 100
    };
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection(dbPath) {
    return new Promise((resolve) => {
      try {
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database(dbPath);
        
        const startTime = Date.now();
        db.get('SELECT 1 as test', (err, row) => {
          const endTime = Date.now();
          
          if (err) {
            resolve({
              success: false,
              error: err.message,
              metrics: { responseTime: endTime - startTime }
            });
          } else {
            resolve({
              success: true,
              metrics: { 
                responseTime: endTime - startTime,
                testResult: row.test
              }
            });
          }
          db.close();
        });
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          metrics: { error: true }
        });
      }
    });
  }

  /**
   * Test database query performance
   */
  async testDatabaseQuery(dbPath) {
    return new Promise((resolve) => {
      try {
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database(dbPath);
        
        const startTime = Date.now();
        db.all('SELECT COUNT(*) as count FROM governor_incidents', (err, rows) => {
          const endTime = Date.now();
          
          if (err) {
            resolve({
              success: false,
              error: err.message,
              metrics: { responseTime: endTime - startTime }
            });
          } else {
            resolve({
              success: true,
              metrics: { 
                responseTime: endTime - startTime,
                rowCount: rows[0].count
              }
            });
          }
          db.close();
        });
      } catch (error) {
        resolve({
          success: false,
          error: error.message,
          metrics: { error: true }
        });
      }
    });
  }

  /**
   * Generate performance baseline report
   */
  generateBaselineReport(systemMetrics, benchmarks) {
    const report = {
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      benchmarks: benchmarks,
      thresholds: this.thresholds,
      summary: {
        totalComponents: benchmarks.length,
        averageResponseTime: benchmarks.reduce((sum, b) => sum + b.averageResponseTime, 0) / benchmarks.length,
        overallSuccessRate: benchmarks.reduce((sum, b) => sum + b.successRate, 0) / benchmarks.length,
        recommendations: this.generateRecommendations(benchmarks)
      }
    };

    // Save baseline report
    const baselineFile = path.join(this.baselineDir, `performance_baseline_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(baselineFile, JSON.stringify(report, null, 2));
    
    this.log(`Performance baseline saved to: ${baselineFile}`);
    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(benchmarks) {
    const recommendations = [];

    benchmarks.forEach(benchmark => {
      if (benchmark.averageResponseTime > this.thresholds.responseTime) {
        recommendations.push({
          component: benchmark.component,
          type: 'performance',
          severity: 'high',
          message: `Average response time (${benchmark.averageResponseTime}ms) exceeds threshold (${this.thresholds.responseTime}ms)`,
          suggestion: 'Consider optimizing code or increasing resources'
        });
      }

      if (benchmark.successRate < 95) {
        recommendations.push({
          component: benchmark.component,
          type: 'reliability',
          severity: 'medium',
          message: `Success rate (${benchmark.successRate}%) is below acceptable threshold (95%)`,
          suggestion: 'Review error handling and improve robustness'
        });
      }
    });

    return recommendations;
  }

  /**
   * Run complete baseline establishment
   */
  async run() {
    this.log('Starting performance baseline establishment...');
    
    // Initialize directories
    this.initialize();

    // Measure system resources
    const systemMetrics = await this.measureSystemResources();
    this.log('System resource metrics collected');

    // Run benchmarks
    const benchmarks = [];
    
    try {
      const processGovernorBenchmark = await this.benchmarkProcessGovernor();
      benchmarks.push(processGovernorBenchmark);
      this.log('Process Governor benchmark completed');
    } catch (error) {
      this.log(`Process Governor benchmark failed: ${error.message}`, 'ERROR');
    }

    try {
      const learningBridgeBenchmark = await this.benchmarkLearningBridge();
      benchmarks.push(learningBridgeBenchmark);
      this.log('Learning Bridge benchmark completed');
    } catch (error) {
      this.log(`Learning Bridge benchmark failed: ${error.message}`, 'ERROR');
    }

    try {
      const databaseBenchmark = await this.benchmarkDatabase();
      benchmarks.push(databaseBenchmark);
      this.log('Database benchmark completed');
    } catch (error) {
      this.log(`Database benchmark failed: ${error.message}`, 'ERROR');
    }

    // Generate report
    const report = this.generateBaselineReport(systemMetrics, benchmarks);
    
    this.log('Performance baseline establishment completed');
    this.log(`Components benchmarked: ${benchmarks.length}`);
    this.log(`Average response time: ${report.summary.averageResponseTime.toFixed(2)}ms`);
    this.log(`Overall success rate: ${report.summary.overallSuccessRate.toFixed(2)}%`);
    
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const options = {
    debug: process.env.DEBUG_PERFORMANCE === 'true',
    responseTimeThreshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 1000,
    memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD) || 512 * 1024 * 1024,
    cpuThreshold: parseInt(process.env.CPU_THRESHOLD) || 80
  };

  const baseline = new PerformanceBaseline(options);
  
  baseline.run()
    .then(report => {
      console.log('\n=== Performance Baseline Summary ===');
      console.log(`Components: ${report.summary.totalComponents}`);
      console.log(`Avg Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms`);
      console.log(`Success Rate: ${report.summary.overallSuccessRate.toFixed(2)}%`);
      console.log(`Recommendations: ${report.summary.recommendations.length}`);
      
      if (report.summary.recommendations.length > 0) {
        console.log('\nRecommendations:');
        report.summary.recommendations.forEach(rec => {
          console.log(`- ${rec.component}: ${rec.message}`);
        });
      }
      
      process.exit(0);
    })
    .catch(error => {
      console.error('Performance baseline establishment failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceBaseline;