#!/usr/bin/env node

/**
 * External Resource Integration Risk Assessment
 * 
 * Evaluates integration risks for external resources including:
 * - Anthropic Resources (HuggingFace datasets)
 * - Agent Systems (GitHub repositories)
 * - Google Research Integration
 * - ConceptNet Framework
 * - Neural Network Simulators
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

class ExternalResourceRiskAssessment {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || path.join(__dirname, '..', '..');
    this.reportDir = path.join(this.projectRoot, 'reports', 'risk-assessments');
    this.timeout = options.timeout || 10000; // 10 seconds
    this.debug = options.debug || false;
    
    // Define external resources to assess
    this.resources = {
      anthropic: [
        {
          name: 'Anthropic Interviewer Dataset',
          url: 'https://huggingface.co/datasets/Anthropic/AnthropicInterviewer',
          type: 'dataset',
          criticality: 'high'
        },
        {
          name: 'HF Skills Training',
          url: 'https://huggingface.co/blog/hf-skills-training',
          type: 'documentation',
          criticality: 'medium'
        }
      ],
      agentSystems: [
        {
          name: 'Kodit',
          url: 'https://github.com/helixml/kodit',
          type: 'repository',
          criticality: 'high'
        },
        {
          name: 'Agentic Drift',
          url: 'https://github.com/k2jac9/agentic-drift',
          type: 'repository',
          criticality: 'medium'
        },
        {
          name: 'AI Agent Cognitive Drift',
          url: 'https://github.com/dabit3/ai-agent-cognitivedriftt',
          type: 'repository',
          criticality: 'medium'
        },
        {
          name: 'Docker Time Sync Agent',
          url: 'https://github.com/arunvelsriram/docker-time-sync-agent',
          type: 'repository',
          criticality: 'low'
        },
        {
          name: 'Pourpoise',
          url: 'https://github.com/brazil-bench/pourpoise',
          type: 'repository',
          criticality: 'medium'
        },
        {
          name: 'Unstoppable Swarm',
          url: 'https://github.com/BigBirdReturns/unstoppable-swarm',
          type: 'repository',
          criticality: 'high'
        }
      ],
      googleResearch: [
        {
          name: 'Titans Memory Integration',
          url: 'https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/',
          type: 'research',
          criticality: 'high'
        }
      ],
      conceptNet: [
        {
          name: 'ConceptNet API',
          url: 'https://github.com/commonsense/conceptnet5/wiki/API',
          type: 'api',
          criticality: 'high'
        },
        {
          name: 'ConceptNet Build Process',
          url: 'https://github.com/commonsense/conceptnet5/wiki/Build-process',
          type: 'documentation',
          criticality: 'medium'
        },
        {
          name: 'ConceptNet Data Structures',
          url: 'https://github.com/commonsense/conceptnet5/wiki/Edges',
          type: 'documentation',
          criticality: 'medium'
        },
        {
          name: 'ConceptNet Language Support',
          url: 'https://github.com/commonsense/conceptnet5/wiki/Languages',
          type: 'documentation',
          criticality: 'medium'
        },
        {
          name: 'ConceptNet Relations',
          url: 'https://github.com/commonsense/conceptnet5/wiki/Relations',
          type: 'documentation',
          criticality: 'medium'
        },
        {
          name: 'ConceptNet URI Hierarchy',
          url: 'https://github.com/commonsense/conceptnet5/wiki/URI-hierarchy',
          type: 'documentation',
          criticality: 'low'
        }
      ],
      neuralNetworks: [
        {
          name: 'Brian2 Neural Simulator',
          url: 'https://github.com/brian-team/brian2',
          type: 'repository',
          criticality: 'high'
        },
        {
          name: 'RUVector Examples',
          url: 'https://github.com/ruvnet/ruvector/tree/main/examples/exo-ai-2025/research',
          type: 'repository',
          criticality: 'medium'
        },
        {
          name: 'Spiking Neural Implementation',
          url: 'https://github.com/ruvnet/ruvector/tree/b0caa23091952de4336f1025134e16d715e33b91/npm/packages/spiking-neural',
          type: 'repository',
          criticality: 'high'
        },
        {
          name: 'Meta-cognition Integration',
          url: 'https://github.com/ruvnet/ruvector/tree/b0caa23091952de4336f1025134e16d715e33b91/examples/meta-cognition-spiking-neural-network',
          type: 'repository',
          criticality: 'high'
        }
      ]
    };
  }

  /**
   * Initialize assessment directories
   */
  initialize() {
    fs.mkdirSync(this.reportDir, { recursive: true });
    this.log('Risk assessment directories initialized');
  }

  /**
   * Log message with timestamp
   */
  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  /**
   * Check if URL is accessible
   */
  async checkUrlAccessibility(url) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const request = https.get(url, { timeout: this.timeout }, (response) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        resolve({
          accessible: response.statusCode >= 200 && response.statusCode < 400,
          statusCode: response.statusCode,
          responseTime,
          headers: response.headers
        });
      });

      request.on('error', (error) => {
        const endTime = Date.now();
        resolve({
          accessible: false,
          error: error.message,
          responseTime: endTime - startTime
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          accessible: false,
          error: 'Request timeout',
          responseTime: this.timeout
        });
      });
    });
  }

  /**
   * Assess GitHub repository health
   */
  async assessGitHubRepository(repoUrl) {
    try {
      // Extract owner/repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
      if (!match) {
        return { error: 'Invalid GitHub URL format' };
      }

      const [, owner, repo] = match;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      
      const response = await this.makeGitHubApiCall(apiUrl);
      
      if (response.error) {
        return response;
      }

      const repo = response.data;
      const healthMetrics = {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        lastCommit: repo.pushed_at,
        language: repo.language,
        size: repo.size,
        isArchived: repo.archived,
        hasWiki: repo.has_wiki,
        hasIssues: repo.has_issues,
        hasDownloads: repo.has_downloads
      };

      // Calculate health score
      const healthScore = this.calculateRepoHealthScore(healthMetrics);
      
      return {
        health: healthScore,
        metrics: healthMetrics,
        lastUpdated: repo.updated_at
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Make GitHub API call
   */
  async makeGitHubApiCall(apiUrl) {
    return new Promise((resolve) => {
      const request = https.get(apiUrl, {
        headers: {
          'User-Agent': 'External-Resource-Risk-Assessment'
        }
      }, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            try {
              resolve({ data: JSON.parse(data) });
            } catch (error) {
              resolve({ error: 'Failed to parse GitHub API response' });
            }
          } else {
            resolve({ error: `GitHub API returned ${response.statusCode}` });
          }
        });
      });

      request.on('error', (error) => {
        resolve({ error: error.message });
      });
    });
  }

  /**
   * Calculate repository health score
   */
  calculateRepoHealthScore(metrics) {
    let score = 0;
    let maxScore = 0;

    // Stars (0-20 points)
    if (metrics.stars > 1000) score += 20;
    else if (metrics.stars > 100) score += 15;
    else if (metrics.stars > 10) score += 10;
    else if (metrics.stars > 0) score += 5;
    maxScore += 20;

    // Forks (0-15 points)
    if (metrics.forks > 500) score += 15;
    else if (metrics.forks > 50) score += 10;
    else if (metrics.forks > 5) score += 5;
    maxScore += 15;

    // Issues (0-15 points)
    if (metrics.openIssues < 10) score += 15;
    else if (metrics.openIssues < 50) score += 10;
    else if (metrics.openIssues < 100) score += 5;
    maxScore += 15;

    // Recent activity (0-25 points)
    const lastCommitDate = new Date(metrics.lastCommit);
    const daysSinceLastCommit = (Date.now() - lastCommitDate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastCommit < 7) score += 25;
    else if (daysSinceLastCommit < 30) score += 20;
    else if (daysSinceLastCommit < 90) score += 15;
    else if (daysSinceLastCommit < 365) score += 10;
    else score += 5;
    maxScore += 25;

    // Repository size (0-10 points)
    if (metrics.size > 1000) score += 10;
    else if (metrics.size > 100) score += 7;
    else if (metrics.size > 10) score += 5;
    maxScore += 10;

    // Not archived (0-15 points)
    if (!metrics.isArchived) score += 15;
    maxScore += 15;

    return {
      score: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      grade: this.getHealthGrade(score / maxScore)
    };
  }

  /**
   * Get health grade from score
   */
  getHealthGrade(ratio) {
    if (ratio >= 0.9) return 'A';
    if (ratio >= 0.8) return 'B';
    if (ratio >= 0.7) return 'C';
    if (ratio >= 0.6) return 'D';
    return 'F';
  }

  /**
   * Assess individual resource
   */
  async assessResource(resource) {
    const assessment = {
      name: resource.name,
      url: resource.url,
      type: resource.type,
      criticality: resource.criticality,
      timestamp: new Date().toISOString()
    };

    // Check accessibility
    const accessibility = await this.checkUrlAccessibility(resource.url);
    assessment.accessibility = accessibility;

    // Additional assessment based on type
    if (resource.type === 'repository' && resource.url.includes('github.com')) {
      const repoHealth = await this.assessGitHubRepository(resource.url);
      assessment.repositoryHealth = repoHealth;
    }

    // Calculate risk score
    assessment.riskScore = this.calculateRiskScore(assessment);
    assessment.riskLevel = this.getRiskLevel(assessment.riskScore);

    return assessment;
  }

  /**
   * Calculate overall risk score
   */
  calculateRiskScore(assessment) {
    let riskScore = 50; // Base risk score

    // Accessibility impact
    if (!assessment.accessibility.accessible) {
      riskScore += 30;
    } else if (assessment.accessibility.responseTime > 5000) {
      riskScore += 15;
    }

    // Repository health impact
    if (assessment.repositoryHealth && assessment.repositoryHealth.health) {
      const healthScore = assessment.repositoryHealth.health.score;
      if (healthScore < 50) {
        riskScore += 25;
      } else if (healthScore < 70) {
        riskScore += 15;
      } else if (healthScore < 85) {
        riskScore += 5;
      }
    }

    // Criticality impact
    if (assessment.criticality === 'high') {
      riskScore += 10;
    } else if (assessment.criticality === 'low') {
      riskScore -= 5;
    }

    return Math.max(0, Math.min(100, riskScore));
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'NEGLIGIBLE';
  }

  /**
   * Run complete risk assessment
   */
  async runAssessment() {
    this.log('Starting external resource risk assessment...');
    this.initialize();

    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalResources: 0,
        accessibleResources: 0,
        criticalRisk: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        negligibleRisk: 0
      },
      categories: {},
      recommendations: []
    };

    // Assess each category
    for (const [categoryName, resources] of Object.entries(this.resources)) {
      this.log(`Assessing category: ${categoryName}`);
      
      const categoryResults = [];
      
      for (const resource of resources) {
        this.log(`Assessing resource: ${resource.name}`);
        const assessment = await this.assessResource(resource);
        categoryResults.push(assessment);
        
        // Update summary
        results.summary.totalResources++;
        if (assessment.accessibility.accessible) {
          results.summary.accessibleResources++;
        }
        
        results.summary[`${assessment.riskLevel.toLowerCase()}Risk`]++;
      }
      
      results.categories[categoryName] = categoryResults;
    }

    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);

    // Save assessment report
    const reportFile = path.join(this.reportDir, `external_resource_risk_assessment_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    
    this.log(`Risk assessment saved to: ${reportFile}`);
    
    // Print summary
    this.printSummary(results);
    
    return results;
  }

  /**
   * Generate recommendations based on assessment results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Check for critical risks
    if (results.summary.criticalRisk > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'critical_resources',
        message: `${results.summary.criticalRisk} resources have CRITICAL risk levels`,
        action: 'Immediate mitigation required - consider alternatives or implement fallback mechanisms'
      });
    }

    // Check accessibility issues
    const inaccessibleCount = results.summary.totalResources - results.summary.accessibleResources;
    if (inaccessibleCount > 0) {
      recommendations.push({
        priority: 'HIGH',
        type: 'accessibility',
        message: `${inaccessibleCount} resources are not accessible`,
        action: 'Verify URLs and network connectivity, implement monitoring for availability'
      });
    }

    // Check high-risk resources
    if (results.summary.highRisk > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'high_risk_resources',
        message: `${results.summary.highRisk} resources have HIGH risk levels`,
        action: 'Monitor closely and develop contingency plans'
      });
    }

    // Check repository health
    Object.entries(results.categories).forEach(([category, resources]) => {
      const unhealthyRepos = resources.filter(r => 
        r.repositoryHealth && r.repositoryHealth.health && r.repositoryHealth.health.score < 70
      );
      
      if (unhealthyRepos.length > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'repository_health',
          message: `${unhealthyRepos.length} repositories in ${category} have low health scores`,
          action: 'Consider forking or finding more actively maintained alternatives'
        });
      }
    });

    return recommendations;
  }

  /**
   * Print assessment summary
   */
  printSummary(results) {
    console.log('\n=== External Resource Risk Assessment Summary ===');
    console.log(`Total Resources: ${results.summary.totalResources}`);
    console.log(`Accessible: ${results.summary.accessibleResources}`);
    console.log(`Critical Risk: ${results.summary.criticalRisk}`);
    console.log(`High Risk: ${results.summary.highRisk}`);
    console.log(`Medium Risk: ${results.summary.mediumRisk}`);
    console.log(`Low Risk: ${results.summary.lowRisk}`);
    console.log(`Negligible Risk: ${results.summary.negligibleRisk}`);
    
    if (results.recommendations.length > 0) {
      console.log('\n=== Recommendations ===');
      results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.message}`);
        console.log(`   Action: ${rec.action}`);
      });
    }
    
    console.log('\n=== Category Breakdown ===');
    Object.entries(results.categories).forEach(([category, resources]) => {
      const avgRisk = resources.reduce((sum, r) => sum + r.riskScore, 0) / resources.length;
      console.log(`${category}: ${resources.length} resources, avg risk: ${avgRisk.toFixed(1)}`);
    });
  }
}

// CLI interface
if (require.main === module) {
  const options = {
    debug: process.env.DEBUG_RISK_ASSESSMENT === 'true',
    timeout: parseInt(process.env.RISK_ASSESSMENT_TIMEOUT) || 10000
  };

  const assessment = new ExternalResourceRiskAssessment(options);
  
  assessment.runAssessment()
    .then(results => {
      process.exit(0);
    })
    .catch(error => {
      console.error('External resource risk assessment failed:', error);
      process.exit(1);
    });
}

module.exports = ExternalResourceRiskAssessment;