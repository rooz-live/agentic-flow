/**
 * WSJF (Weighted Shortest Job First) Calculator
 * 
 * Centralized module for WSJF calculations to establish single source of truth
 * for priority scoring and job sequencing across the system.
 */

'use strict';

const fs = require('fs');
const path = require('path');

class WSJFCalculator {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(process.cwd(), 'risks.db');
    this.defaultCostOfDelay = options.defaultCostOfDelay || 1.0;
    this.defaultJobDuration = options.defaultJobDuration || 1.0;
    this.debug = options.debug || false;
  }

  /**
   * Calculate WSJF score using the formula: WSJF = Cost of Delay / Job Duration
   * @param {Object} params - WSJF calculation parameters
   * @param {number} params.userBusinessValue - User business value (1-10)
   * @param {number} params.timeCriticality - Time criticality (1-10)
   * @param {number} params.riskOpportunity - Risk/opportunity value (1-10)
   * @param {number} params.jobDuration - Job duration in days
   * @returns {Object} WSJF calculation result
   */
  calculateWSJF(params) {
    const {
      userBusinessValue = 1,
      timeCriticality = 1,
      riskOpportunity = 1,
      jobDuration = this.defaultJobDuration
    } = params;

    // Calculate Cost of Delay
    const costOfDelay = userBusinessValue * timeCriticality * riskOpportunity;
    
    // Calculate WSJF score
    const wsjfScore = jobDuration > 0 ? costOfDelay / jobDuration : 0;

    const result = {
      costOfDelay,
      jobDuration,
      wsjfScore,
      components: {
        userBusinessValue,
        timeCriticality,
        riskOpportunity
      },
      timestamp: new Date().toISOString(),
      calculationMethod: 'standard'
    };

    if (this.debug) {
      console.log('[WSJF] Calculation result:', result);
    }

    return result;
  }

  /**
   * Calculate WSJF for multiple jobs and return sorted results
   * @param {Array} jobs - Array of job objects with WSJF parameters
   * @returns {Array} Jobs sorted by WSJF score (highest first)
   */
  prioritizeJobs(jobs) {
    const jobsWithWSJF = jobs.map(job => ({
      ...job,
      wsjf: this.calculateWSJF(job)
    }));

    // Sort by WSJF score (highest first)
    return jobsWithWSJF.sort((a, b) => b.wsjf.wsjfScore - a.wsjf.wsjfScore);
  }

  /**
   * Get WSJF baselines from database
   * @returns {Object} WSJF baseline values
   */
  async getBaselines() {
    try {
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(this.dbPath);
      
      return new Promise((resolve, reject) => {
        db.all(
          'SELECT metric_name, baseline_value FROM baselines WHERE metric_name LIKE "wsjf_%"',
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              const baselines = {};
              rows.forEach(row => {
                const key = row.metric_name.replace('wsjf_', '');
                baselines[key] = row.baseline_value;
              });
              resolve(baselines);
            }
            db.close();
          }
        );
      });
    } catch (error) {
      if (this.debug) {
        console.warn('[WSJF] Could not load baselines from database:', error.message);
      }
      return {
        cost_of_delay: this.defaultCostOfDelay,
        job_duration: this.defaultJobDuration
      };
    }
  }

  /**
   * Save WSJF calculation to database for tracking
   * @param {Object} job - Job object with WSJF result
   * @param {string} jobId - Unique job identifier
   */
  async saveCalculation(job, jobId) {
    try {
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(this.dbPath);
      
      const sql = `
        INSERT INTO wsjf_calculations (
          job_id, job_name, wsjf_score, cost_of_delay, job_duration,
          user_business_value, time_criticality, risk_opportunity,
          created_at, calculation_metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      return new Promise((resolve, reject) => {
        db.run(sql, [
          jobId,
          job.name || 'unnamed',
          job.wsjf.wsjfScore,
          job.wsjf.costOfDelay,
          job.wsjf.jobDuration,
          job.wsjf.components.userBusinessValue,
          job.wsjf.components.timeCriticality,
          job.wsjf.components.riskOpportunity,
          job.wsjf.timestamp,
          JSON.stringify(job.wsjf)
        ], function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
          db.close();
        });
      });
    } catch (error) {
      if (this.debug) {
        console.warn('[WSJF] Could not save calculation to database:', error.message);
      }
      return null;
    }
  }

  /**
   * Get WSJF calculation history for a job
   * @param {string} jobId - Job identifier
   * @returns {Array} Calculation history
   */
  async getCalculationHistory(jobId) {
    try {
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(this.dbPath);
      
      return new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM wsjf_calculations WHERE job_id = ? ORDER BY created_at DESC',
          [jobId],
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
            db.close();
          }
        );
      });
    } catch (error) {
      if (this.debug) {
        console.warn('[WSJF] Could not load calculation history:', error.message);
      }
      return [];
    }
  }

  /**
   * Validate WSJF parameters
   * @param {Object} params - WSJF parameters to validate
   * @returns {Object} Validation result
   */
  validateParameters(params) {
    const errors = [];
    const warnings = [];

    // Check required parameters
    if (params.userBusinessValue !== undefined) {
      if (params.userBusinessValue < 1 || params.userBusinessValue > 10) {
        errors.push('userBusinessValue must be between 1 and 10');
      }
    }

    if (params.timeCriticality !== undefined) {
      if (params.timeCriticality < 1 || params.timeCriticality > 10) {
        errors.push('timeCriticality must be between 1 and 10');
      }
    }

    if (params.riskOpportunity !== undefined) {
      if (params.riskOpportunity < 1 || params.riskOpportunity > 10) {
        errors.push('riskOpportunity must be between 1 and 10');
      }
    }

    if (params.jobDuration !== undefined) {
      if (params.jobDuration <= 0) {
        errors.push('jobDuration must be greater than 0');
      } else if (params.jobDuration > 365) {
        warnings.push('jobDuration exceeds 1 year - consider breaking down the job');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate WSJF report for analysis
   * @param {Array} jobs - Jobs with WSJF calculations
   * @returns {Object} WSJF analysis report
   */
  generateReport(jobs) {
    const totalJobs = jobs.length;
    const totalWSJF = jobs.reduce((sum, job) => sum + (job.wsjf?.wsjfScore || 0), 0);
    const avgWSJF = totalJobs > 0 ? totalWSJF / totalJobs : 0;
    
    const sortedJobs = jobs.sort((a, b) => (b.wsjf?.wsjfScore || 0) - (a.wsjf?.wsjfScore || 0));
    const topJobs = sortedJobs.slice(0, Math.min(5, totalJobs));
    
    return {
      summary: {
        totalJobs,
        totalWSJF,
        averageWSJF: avgWSJF,
        reportTimestamp: new Date().toISOString()
      },
      topPriorities: topJobs.map(job => ({
        name: job.name,
        wsjfScore: job.wsjf?.wsjfScore || 0,
        costOfDelay: job.wsjf?.costOfDelay || 0,
        jobDuration: job.wsjf?.jobDuration || 0
      })),
      distribution: this.calculateDistribution(jobs),
      recommendations: this.generateRecommendations(jobs)
    };
  }

  /**
   * Calculate WSJF score distribution
   * @param {Array} jobs - Jobs with WSJF calculations
   * @returns {Object} Distribution statistics
   */
  calculateDistribution(jobs) {
    const scores = jobs.map(job => job.wsjf?.wsjfScore || 0).filter(score => score > 0);
    
    if (scores.length === 0) {
      return { min: 0, max: 0, median: 0, mean: 0, stdDev: 0 };
    }

    scores.sort((a, b) => a - b);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const median = scores[Math.floor(scores.length / 2)];
    const min = scores[0];
    const max = scores[scores.length - 1];
    
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    return { min, max, median, mean, stdDev };
  }

  /**
   * Generate recommendations based on WSJF analysis
   * @param {Array} jobs - Jobs with WSJF calculations
   * @returns {Array} Recommendations
   */
  generateRecommendations(jobs) {
    const recommendations = [];
    const scores = jobs.map(job => job.wsjf?.wsjfScore || 0).filter(score => score > 0);
    
    if (scores.length === 0) {
      return recommendations;
    }

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highScoreJobs = jobs.filter(job => (job.wsjf?.wsjfScore || 0) > avgScore * 1.5);
    const longJobs = jobs.filter(job => (job.wsjf?.jobDuration || 0) > 30);

    if (highScoreJobs.length > 0) {
      recommendations.push({
        type: 'priority',
        message: `${highScoreJobs.length} jobs have significantly high WSJF scores and should be prioritized`,
        jobs: highScoreJobs.map(job => job.name)
      });
    }

    if (longJobs.length > 0) {
      recommendations.push({
        type: 'breakdown',
        message: `${longJobs.length} jobs have long durations (>30 days) and should be broken down`,
        jobs: longJobs.map(job => job.name)
      });
    }

    return recommendations;
  }
}

module.exports = WSJFCalculator;

// CLI interface for standalone usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  const calculator = new WSJFCalculator({ debug: true });

  switch (command) {
    case 'calculate':
      // Example: node wsjf_calculator.js calculate 8 7 6 5
      const [userValue, timeCritical, riskOpp, duration] = args.slice(1).map(Number);
      const result = calculator.calculateWSJF({
        userBusinessValue: userValue,
        timeCriticality: timeCritical,
        riskOpportunity: riskOpp,
        jobDuration: duration
      });
      console.log('WSJF Result:', JSON.stringify(result, null, 2));
      break;

    case 'validate':
      // Example: node wsjf_calculator.js validate '{"userBusinessValue": 8, "jobDuration": 5}'
      try {
        const params = JSON.parse(args[1]);
        const validation = calculator.validateParameters(params);
        console.log('Validation Result:', JSON.stringify(validation, null, 2));
      } catch (error) {
        console.error('Invalid JSON parameters:', error.message);
      }
      break;

    default:
      console.log('Usage:');
      console.log('  node wsjf_calculator.js calculate <userValue> <timeCritical> <riskOpp> <duration>');
      console.log('  node wsjf_calculator.js validate <json_params>');
      break;
  }
}