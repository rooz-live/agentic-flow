/**
 * @file CI Pipeline Configuration
 * @description Configuration for continuous integration and automated testing pipelines
 */

import { TestHelpers } from '../utils/test-helpers';

/**
 * CI Pipeline Configuration
 */
export class CIPipelineConfig {
  /**
   * Pipeline stages configuration
   */
  static readonly PIPELINE_STAGES = {
    SETUP: {
      name: 'Setup',
      timeout: 600000, // 10 minutes
      commands: [
        'npm ci',
        'npm run build',
        'npm run lint'
      ]
    },
    
    UNIT_TESTS: {
      name: 'Unit Tests',
      timeout: 300000, // 5 minutes
      commands: [
        'npm run test:unit',
        'npm run test:coverage:unit'
      ],
      coverageThreshold: 80
    },
    
    INTEGRATION_TESTS: {
      name: 'Integration Tests',
      timeout: 600000, // 10 minutes
      commands: [
        'npm run test:integration',
        'npm run test:coverage:integration'
      ],
      coverageThreshold: 75
    },
    
    E2E_TESTS: {
      name: 'End-to-End Tests',
      timeout: 900000, // 15 minutes
      commands: [
        'npm run test:e2e',
        'npm run test:coverage:e2e'
      ],
      coverageThreshold: 70
    },
    
    PERFORMANCE_TESTS: {
      name: 'Performance Tests',
      timeout: 1200000, // 20 minutes
      commands: [
        'npm run test:performance',
        'npm run test:load',
        'npm run test:stress'
      ],
      performanceThresholds: {
        responseTime: 1000, // 1 second
        throughput: 100, // requests per second
        errorRate: 0.01 // 1%
      }
    },
    
    SECURITY_TESTS: {
      name: 'Security Tests',
      timeout: 600000, // 10 minutes
      commands: [
        'npm run test:security',
        'npm run audit:dependencies',
        'npm run scan:vulnerabilities'
      ],
      securityThresholds: {
        highVulnerabilities: 0,
        mediumVulnerabilities: 5,
        lowVulnerabilities: 20
      }
    },
    
    COMPLIANCE_TESTS: {
      name: 'Compliance Tests',
      timeout: 300000, // 5 minutes
      commands: [
        'npm run test:compliance',
        'npm run validate:gdpr',
        'npm run validate:hipaa',
        'npm run validate:pci-dss'
      ],
      complianceThresholds: {
        gdpr: 100,
        hipaa: 100,
        pciDss: 100
      }
    },
    
    DEPLOYMENT: {
      name: 'Deployment',
      timeout: 600000, // 10 minutes
      commands: [
        'npm run build:production',
        'npm run deploy:staging',
        'npm run smoke:tests'
      ]
    }
  };

  /**
   * Test matrix configuration
   */
  static readonly TEST_MATRIX = {
    NODE_VERSIONS: ['16.x', '18.x', '20.x'],
    OPERATING_SYSTEMS: ['ubuntu-latest', 'windows-latest', 'macos-latest'],
    BROWSERS: ['chrome', 'firefox', 'safari', 'edge'],
    DATABASES: ['postgresql', 'mysql', 'mongodb', 'redis'],
    CLOUD_PROVIDERS: ['aws', 'gcp', 'azure']
  };

  /**
   * Parallel execution configuration
   */
  static readonly PARALLEL_CONFIG = {
    MAX_PARALLEL_JOBS: 8,
    SHARD_STRATEGY: 'round-robin',
    SHARD_COUNT: 4,
    BALANCE_LOAD: true,
    RETRY_FAILED_SHARDS: true,
    MAX_RETRIES: 2
  };

  /**
   * Notification configuration
   */
  static readonly NOTIFICATION_CONFIG = {
    SUCCESS: {
      channels: ['slack', 'email'],
      recipients: ['dev-team@company.com'],
      message: '✅ Pipeline completed successfully'
    },
    FAILURE: {
      channels: ['slack', 'email', 'pagerduty'],
      recipients: ['dev-team@company.com', 'ops-team@company.com'],
      message: '❌ Pipeline failed - immediate attention required'
    },
    WARNING: {
      channels: ['slack'],
      recipients: ['dev-team@company.com'],
      message: '⚠️ Pipeline completed with warnings'
    }
  };

  /**
   * Artifact configuration
   */
  static readonly ARTIFACT_CONFIG = {
    TEST_REPORTS: {
      path: 'test-results',
      format: ['junit', 'html', 'json'],
      retention: 30 // days
    },
    COVERAGE_REPORTS: {
      path: 'coverage',
      format: ['lcov', 'html', 'json'],
      retention: 30 // days
    },
    PERFORMANCE_REPORTS: {
      path: 'performance-reports',
      format: ['json', 'html'],
      retention: 30 // days
    },
    SECURITY_REPORTS: {
      path: 'security-reports',
      format: ['json', 'sarif'],
      retention: 30 // days
    },
    LOGS: {
      path: 'pipeline-logs',
      format: ['txt', 'json'],
      retention: 7 // days
    }
  };

  /**
   * Cache configuration
   */
  static readonly CACHE_CONFIG = {
    DEPENDENCIES: {
      key: 'npm-deps-${{ hashFiles(\'**/package-lock.json\') }}',
      paths: ['~/.npm'],
      restoreKeys: ['npm-deps-']
    },
    BUILD_CACHE: {
      key: 'build-cache-${{ github.sha }}',
      paths: ['dist', '.next', 'build'],
      restoreKeys: ['build-cache-']
    },
    TEST_CACHE: {
      key: 'test-cache-${{ github.sha }}',
      paths: ['.jest-cache'],
      restoreKeys: ['test-cache-']
    }
  };

  /**
   * Environment configuration
   */
  static readonly ENVIRONMENT_CONFIG = {
    TEST: {
      NODE_ENV: 'test',
      CI: 'true',
      LOG_LEVEL: 'debug',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379/1',
      AWS_REGION: 'us-west-2',
      GOOGLE_CLOUD_PROJECT: 'test-project'
    },
    STAGING: {
      NODE_ENV: 'staging',
      CI: 'true',
      LOG_LEVEL: 'info',
      DATABASE_URL: '${{ secrets.STAGING_DATABASE_URL }}',
      REDIS_URL: '${{ secrets.STAGING_REDIS_URL }}',
      AWS_REGION: 'us-west-2',
      GOOGLE_CLOUD_PROJECT: 'staging-project'
    },
    PRODUCTION: {
      NODE_ENV: 'production',
      CI: 'true',
      LOG_LEVEL: 'warn',
      DATABASE_URL: '${{ secrets.PRODUCTION_DATABASE_URL }}',
      REDIS_URL: '${{ secrets.PRODUCTION_REDIS_URL }}',
      AWS_REGION: 'us-west-2',
      GOOGLE_CLOUD_PROJECT: 'production-project'
    }
  };

  /**
   * Quality gates configuration
   */
  static readonly QUALITY_GATES = {
    COVERAGE: {
      UNIT: 80,
      INTEGRATION: 75,
      E2E: 70,
      OVERALL: 75
    },
    PERFORMANCE: {
      RESPONSE_TIME: 1000, // ms
      THROUGHPUT: 100, // requests/second
      ERROR_RATE: 0.01, // 1%
      MEMORY_USAGE: 512 * 1024 * 1024, // 512MB
      CPU_USAGE: 80 // %
    },
    SECURITY: {
      HIGH_VULNERABILITIES: 0,
      MEDIUM_VULNERABILITIES: 5,
      LOW_VULNERABILITIES: 20,
      DEPENDENCY_VULNERABILITIES: 10
    },
    COMPLIANCE: {
      GDPR: 100,
      HIPAA: 100,
      PCI_DSS: 100,
      ACCESSIBILITY: 90
    }
  };

  /**
   * Rollback configuration
   */
  static readonly ROLLBACK_CONFIG = {
    TRIGGERS: [
      'performance_degradation',
      'security_vulnerability',
      'compliance_failure',
      'high_error_rate',
      'user_complaints'
    ],
    AUTOMATIC_ROLLBACK: true,
    ROLLBACK_TIMEOUT: 300000, // 5 minutes
    NOTIFICATION_CHANNELS: ['slack', 'email', 'pagerduty'],
    MANUAL_APPROVAL_REQUIRED: false
  };

  /**
   * Generate GitHub Actions workflow
   */
  static generateGitHubWorkflow(): string {
    return `
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM UTC

env:
  NODE_VERSION: '18.x'

jobs:
  setup:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    outputs:
      cache-hit: \${{ steps.cache.outputs.cache-hit }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build project
        run: npm run build

      - name: Run linting
        run: npm run lint

  unit-tests:
    needs: setup
    runs-on: \${{ matrix.os }}
    timeout-minutes: 5
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16.x, 18.x, 20.x]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Generate coverage report
        run: npm run test:coverage:unit

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unit-tests
          name: unit-coverage

  integration-tests:
    needs: setup
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until nc -z localhost 5432; do sleep 1; done'
          timeout 60 bash -c 'until nc -z localhost 6379; do sleep 1; done'

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379/1

      - name: Generate coverage report
        run: npm run test:coverage:integration

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: integration-tests
          name: integration-coverage

  e2e-tests:
    needs: setup
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      matrix:
        browser: [chrome, firefox]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BROWSER: \${{ matrix.browser }}

      - name: Generate coverage report
        run: npm run test:coverage:e2e

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: e2e-tests
          name: e2e-coverage

  performance-tests:
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm run test:performance

      - name: Run load tests
        run: npm run test:load

      - name: Run stress tests
        run: npm run test:stress

      - name: Upload performance reports
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: performance-reports/
          retention-days: 30

  security-tests:
    needs: setup
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run security tests
        run: npm run test:security

      - name: Audit dependencies
        run: npm audit --audit-level moderate

      - name: Run vulnerability scan
        run: npm run scan:vulnerabilities

      - name: Upload security reports
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: security-reports/
          retention-days: 30

  compliance-tests:
    needs: setup
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run compliance tests
        run: npm run test:compliance

      - name: Validate GDPR compliance
        run: npm run validate:gdpr

      - name: Validate HIPAA compliance
        run: npm run validate:hipaa

      - name: Validate PCI-DSS compliance
        run: npm run validate:pci-dss

      - name: Upload compliance reports
        uses: actions/upload-artifact@v3
        with:
          name: compliance-reports
          path: compliance-reports/
          retention-days: 30

  deploy-staging:
    needs: [unit-tests, integration-tests, e2e-tests, performance-tests, security-tests, compliance-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 10
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for production
        run: npm run build:production

      - name: Deploy to staging
        run: npm run deploy:staging

      - name: Run smoke tests
        run: npm run smoke:tests

  deploy-production:
    needs: [unit-tests, integration-tests, e2e-tests, performance-tests, security-tests, compliance-tests]
    runs-on: ubuntu-latest
    timeout-minutes: 10
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build for production
        run: npm run build:production

      - name: Deploy to production
        run: npm run deploy:production

      - name: Run smoke tests
        run: npm run smoke:tests

  notify:
    needs: [unit-tests, integration-tests, e2e-tests, performance-tests, security-tests, compliance-tests]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Notify success
        if: needs.unit-tests.result == 'success' && needs.integration-tests.result == 'success' && needs.e2e-tests.result == 'success' && needs.performance-tests.result == 'success' && needs.security-tests.result == 'success' && needs.compliance-tests.result == 'success'
        run: |
          echo "✅ Pipeline completed successfully"
          # Add Slack notification here

      - name: Notify failure
        if: needs.unit-tests.result == 'failure' || needs.integration-tests.result == 'failure' || needs.e2e-tests.result == 'failure' || needs.performance-tests.result == 'failure' || needs.security-tests.result == 'failure' || needs.compliance-tests.result == 'failure'
        run: |
          echo "❌ Pipeline failed"
          # Add Slack notification here
`;
  }

  /**
   * Generate Jenkins pipeline configuration
   */
  static generateJenkinsPipeline(): string {
    return `
pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18.x'
        NODE_ENV = 'test'
        CI = 'true'
    }
    
    stages {
        stage('Setup') {
            steps {
                checkout scm
                nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                    sh 'npm ci'
                    sh 'npm run build'
                    sh 'npm run lint'
                }
            }
        }
        
        stage('Unit Tests') {
            parallel {
                stage('Unit Tests - Linux') {
                    agent { label 'linux' }
                    steps {
                        nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                            sh 'npm run test:unit'
                            sh 'npm run test:coverage:unit'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'test-results/unit/*.xml'
                            publishCoverage adapters: [lcovAdapter('coverage/lcov.info')]
                        }
                    }
                }
                
                stage('Unit Tests - Windows') {
                    agent { label 'windows' }
                    steps {
                        nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                            bat 'npm run test:unit'
                            bat 'npm run test:coverage:unit'
                        }
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'test-results/unit/*.xml'
                        }
                    }
                }
            }
        }
        
        stage('Integration Tests') {
            steps {
                script {
                    try {
                        nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                            sh 'npm run test:integration'
                            sh 'npm run test:coverage:integration'
                        }
                    } catch (Exception e) {
                        currentBuild.result = 'UNSTABLE'
                        echo "Integration tests failed: \${e}"
                    }
                }
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results/integration/*.xml'
                }
            }
        }
        
        stage('E2E Tests') {
            parallel {
                stage('Chrome') {
                    steps {
                        nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                            sh 'BROWSER=chrome npm run test:e2e'
                        }
                    }
                }
                
                stage('Firefox') {
                    steps {
                        nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                            sh 'BROWSER=firefox npm run test:e2e'
                        }
                    }
                }
            }
            post {
                always {
                    publishTestResults testResultsPattern: 'test-results/e2e/*.xml'
                }
            }
        }
        
        stage('Performance Tests') {
            steps {
                nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                    sh 'npm run test:performance'
                    sh 'npm run test:load'
                    sh 'npm run test:stress'
                }
                archiveArtifacts artifacts: 'performance-reports/**/*', fingerprint: true
            }
        }
        
        stage('Security Tests') {
            steps {
                nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                    sh 'npm run test:security'
                    sh 'npm audit --audit-level moderate'
                    sh 'npm run scan:vulnerabilities'
                }
                archiveArtifacts artifacts: 'security-reports/**/*', fingerprint: true
            }
        }
        
        stage('Compliance Tests') {
            steps {
                nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                    sh 'npm run test:compliance'
                    sh 'npm run validate:gdpr'
                    sh 'npm run validate:hipaa'
                    sh 'npm run validate:pci-dss'
                }
                archiveArtifacts artifacts: 'compliance-reports/**/*', fingerprint: true
            }
        }
        
        stage('Deploy') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            parallel {
                stage('Deploy to Staging') {
                    when {
                        branch 'develop'
                    }
                    steps {
                        nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                            sh 'npm run build:production'
                            sh 'npm run deploy:staging'
                            sh 'npm run smoke:tests'
                        }
                    }
                }
                
                stage('Deploy to Production') {
                    when {
                        branch 'main'
                    }
                    steps {
                        input message: 'Deploy to production?', ok: 'Deploy'
                        nodejs(nodeJSInstallationName: 'Node \${NODE_VERSION}') {
                            sh 'npm run build:production'
                            sh 'npm run deploy:production'
                            sh 'npm run smoke:tests'
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        
        success {
            slackSend(
                channel: '#ci-cd',
                color: 'good',
                message: "✅ Pipeline \${env.JOB_NAME} - \${env.BUILD_NUMBER} completed successfully"
            )
        }
        
        failure {
            slackSend(
                channel: '#ci-cd',
                color: 'danger',
                message: "❌ Pipeline \${env.JOB_NAME} - \${env.BUILD_NUMBER} failed"
            )
        }
        
        unstable {
            slackSend(
                channel: '#ci-cd',
                color: 'warning',
                message: "⚠️ Pipeline \${env.JOB_NAME} - \${env.BUILD_NUMBER} completed with warnings"
            )
        }
    }
}
`;
  }

  /**
   * Generate GitLab CI configuration
   */
  static generateGitLabCI(): string {
    return `
stages:
  - setup
  - test
  - security
  - performance
  - deploy
  - notify

variables:
  NODE_VERSION: "18"
  NODE_ENV: "test"
  CI: "true"

cache:
  paths:
    - node_modules/
    - .npm/
    - .jest-cache/

.setup_template: &setup_template
  stage: setup
  image: node:\${NODE_VERSION}
  cache:
    key: \${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .npm/
  before_script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    paths:
      - node_modules/
    expire_in: 1 hour

.test_template: &test_template
  image: node:\${NODE_VERSION}
  before_script:
    - npm ci --cache .npm --prefer-offline
  artifacts:
    reports:
      junit: test-results/**/*.xml
    paths:
      - coverage/
    expire_in: 1 week

setup:
  <<: *setup_template
  script:
    - npm run build
    - npm run lint
  artifacts:
    paths:
      - dist/
      - .next/
      - build/
    expire_in: 1 hour

unit_tests:
  <<: *test_template
  stage: test
  parallel:
    matrix:
      - NODE_VERSION: ["16", "18", "20"]
  script:
    - npm run test:unit
    - npm run test:coverage:unit
  coverage: '/Lines\\s*:\\s*(\\d+\\.\\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

integration_tests:
  <<: *test_template
  stage: test
  services:
    - postgres:15
    - redis:7
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@postgres:5432/test
    REDIS_URL: redis://redis:6379/1
  script:
    - npm run test:integration
    - npm run test:coverage:integration

e2e_tests:
  <<: *test_template
  stage: test
  parallel:
    matrix:
      - BROWSER: ["chrome", "firefox"]
  script:
    - npx playwright install --with-deps
    - npm run test:e2e
    - npm run test:coverage:e2e

security_tests:
  <<: *test_template
  stage: security
  script:
    - npm run test:security
    - npm audit --audit-level moderate
    - npm run scan:vulnerabilities
  artifacts:
    paths:
      - security-reports/
    expire_in: 1 month

performance_tests:
  <<: *test_template
  stage: performance
  script:
    - npm run test:performance
    - npm run test:load
    - npm run test:stress
  artifacts:
    paths:
      - performance-reports/
    expire_in: 1 month

compliance_tests:
  <<: *test_template
  stage: security
  script:
    - npm run test:compliance
    - npm run validate:gdpr
    - npm run validate:hipaa
    - npm run validate:pci-dss
  artifacts:
    paths:
      - compliance-reports/
    expire_in: 1 month

deploy_staging:
  stage: deploy
  image: node:\${NODE_VERSION}
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - npm run build:production
    - npm run deploy:staging
    - npm run smoke:tests
  only:
    - develop

deploy_production:
  stage: deploy
  image: node:\${NODE_VERSION}
  environment:
    name: production
    url: https://example.com
  script:
    - npm run build:production
    - npm run deploy:production
    - npm run smoke:tests
  only:
    - main
  when: manual

notify_success:
  stage: notify
  image: alpine:latest
  script:
    - echo "✅ Pipeline completed successfully"
    - curl -X POST -H 'Content-type: application/json' --data '{"text":"✅ Pipeline completed successfully"}' \$SLACK_WEBHOOK
  only:
    - main
    - develop

notify_failure:
  stage: notify
  image: alpine:latest
  script:
    - echo "❌ Pipeline failed"
    - curl -X POST -H 'Content-type: application/json' --data '{"text":"❌ Pipeline failed - immediate attention required"}' \$SLACK_WEBHOOK
  when: on_failure
  only:
    - main
    - develop
`;
  }

  /**
   * Generate Azure DevOps pipeline configuration
   */
  static generateAzureDevOpsPipeline(): string {
    return `
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    exclude:
      - docs/*
      - README.md

pr:
  branches:
    include:
      - main

variables:
  NODE_VERSION: '18.x'
  NODE_ENV: 'test'
  CI: 'true'

pool:
  vmImage: 'ubuntu-latest'

stages:
- stage: Setup
  displayName: 'Setup Stage'
  jobs:
  - job: Setup
    displayName: 'Setup Job'
    timeoutInMinutes: 10
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '\$(NODE_VERSION)'
      displayName: 'Install Node.js'

    - task: Npm@1
      inputs:
        command: 'ci'
      displayName: 'Install dependencies'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run build'
      displayName: 'Build project'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run lint'
      displayName: 'Run linting'

- stage: Test
  displayName: 'Test Stage'
  dependsOn: Setup
  jobs:
  - job: UnitTests
    displayName: 'Unit Tests'
    timeoutInMinutes: 5
    strategy:
      matrix:
        Linux:
          vmImage: 'ubuntu-latest'
        Windows:
          vmImage: 'windows-latest'
        macOS:
          vmImage: 'macos-latest'
    pool:
      vmImage: '\$(vmImage)'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '\$(NODE_VERSION)'
      displayName: 'Install Node.js'

    - task: Npm@1
      inputs:
        command: 'ci'
      displayName: 'Install dependencies'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:unit'
      displayName: 'Run unit tests'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:coverage:unit'
      displayName: 'Generate coverage report'

    - task: PublishTestResults@2
      inputs:
        testResultsFormat: 'JUnit'
        testResultsFiles: 'test-results/unit/*.xml'
        failTaskOnFailedTests: true
      displayName: 'Publish test results'

    - task: PublishCodeCoverageResults@1
      inputs:
        codeCoverageTool: 'Cobertura'
        summaryFileLocation: 'coverage/cobertura-coverage.xml'
      displayName: 'Publish coverage results'

  - job: IntegrationTests
    displayName: 'Integration Tests'
    timeoutInMinutes: 10
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '\$(NODE_VERSION)'
      displayName: 'Install Node.js'

    - task: Npm@1
      inputs:
        command: 'ci'
      displayName: 'Install dependencies'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:integration'
      displayName: 'Run integration tests'
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/test
        REDIS_URL: redis://localhost:6379/1

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:coverage:integration'
      displayName: 'Generate coverage report'

    - task: PublishTestResults@2
      inputs:
        testResultsFormat: 'JUnit'
        testResultsFiles: 'test-results/integration/*.xml'
        failTaskOnFailedTests: true
      displayName: 'Publish test results'

  - job: E2ETests
    displayName: 'E2E Tests'
    timeoutInMinutes: 15
    strategy:
      matrix:
        Chrome:
          BROWSER: 'chrome'
        Firefox:
          BROWSER: 'firefox'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '\$(NODE_VERSION)'
      displayName: 'Install Node.js'

    - task: Npm@1
      inputs:
        command: 'ci'
      displayName: 'Install dependencies'

    - script: |
        npx playwright install --with-deps
      displayName: 'Install Playwright'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:e2e'
      displayName: 'Run E2E tests'
      env:
        BROWSER: '\$(BROWSER)'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:coverage:e2e'
      displayName: 'Generate coverage report'

    - task: PublishTestResults@2
      inputs:
        testResultsFormat: 'JUnit'
        testResultsFiles: 'test-results/e2e/*.xml'
        failTaskOnFailedTests: true
      displayName: 'Publish test results'

- stage: Security
  displayName: 'Security Stage'
  dependsOn: Test
  jobs:
  - job: SecurityTests
    displayName: 'Security Tests'
    timeoutInMinutes: 10
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '\$(NODE_VERSION)'
      displayName: 'Install Node.js'

    - task: Npm@1
      inputs:
        command: 'ci'
      displayName: 'Install dependencies'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:security'
      displayName: 'Run security tests'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'audit --audit-level moderate'
      displayName: 'Audit dependencies'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run scan:vulnerabilities'
      displayName: 'Scan for vulnerabilities'

    - task: PublishBuildArtifacts@1
      inputs:
        pathToPublish: 'security-reports'
        artifactName: 'security-reports'
      displayName: 'Publish security reports'

- stage: Performance
  displayName: 'Performance Stage'
  dependsOn: Test
  jobs:
  - job: PerformanceTests
    displayName: 'Performance Tests'
    timeoutInMinutes: 20
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '\$(NODE_VERSION)'
      displayName: 'Install Node.js'

    - task: Npm@1
      inputs:
        command: 'ci'
      displayName: 'Install dependencies'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:performance'
      displayName: 'Run performance tests'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:load'
      displayName: 'Run load tests'

    - task: Npm@1
      inputs:
        command: 'custom'
        customCommand: 'run test:stress'
      displayName: 'Run stress tests'

    - task: PublishBuildArtifacts@1
      inputs:
        pathToPublish: 'performance-reports'
        artifactName: 'performance-reports'
      displayName: 'Publish performance reports'

- stage: Deploy
  displayName: 'Deploy Stage'
  dependsOn: [Test, Security, Performance]
  condition: and(succeeded(), or(eq(variables['Build.SourceBranch'], 'refs/heads/main'), eq(variables['Build.SourceBranch'], 'refs/heads/develop')))
  jobs:
  - deployment: DeployStaging
    displayName: 'Deploy to Staging'
    condition: eq(variables['Build.SourceBranch'], 'refs/heads/develop')
    environment: 'staging'
    timeoutInMinutes: 10
    strategy:
      runOnce:
        deploy:
          steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '\$(NODE_VERSION)'
            displayName: 'Install Node.js'

          - task: Npm@1
            inputs:
              command: 'ci'
            displayName: 'Install dependencies'

          - task: Npm@1
            inputs:
              command: 'custom'
              customCommand: 'run build:production'
            displayName: 'Build for production'

          - task: Npm@1
            inputs:
              command: 'custom'
              customCommand: 'run deploy:staging'
            displayName: 'Deploy to staging'

          - task: Npm@1
            inputs:
              command: 'custom'
              customCommand: 'run smoke:tests'
            displayName: 'Run smoke tests'

  - deployment: DeployProduction
    displayName: 'Deploy to Production'
    condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')
    environment: 'production'
    timeoutInMinutes: 10
    strategy:
      runOnce:
        deploy:
          steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '\$(NODE_VERSION)'
            displayName: 'Install Node.js'

          - task: Npm@1
            inputs:
              command: 'ci'
            displayName: 'Install dependencies'

          - task: Npm@1
            inputs:
              command: 'custom'
              customCommand: 'run build:production'
            displayName: 'Build for production'

          - task: Npm@1
            inputs:
              command: 'custom'
              customCommand: 'run deploy:production'
            displayName: 'Deploy to production'

          - task: Npm@1
            inputs:
              command: 'custom'
              customCommand: 'run smoke:tests'
            displayName: 'Run smoke tests'

- stage: Notify
  displayName: 'Notify Stage'
  dependsOn: [Deploy]
  condition: always()
  jobs:
  - job: NotifySuccess
    displayName: 'Notify Success'
    condition: succeeded()
    steps:
    - script: |
        echo "✅ Pipeline completed successfully"
        curl -X POST -H 'Content-type: application/json' --data '{"text":"✅ Pipeline completed successfully"}' \$(SLACK_WEBHOOK)
      displayName: 'Send success notification'

  - job: NotifyFailure
    displayName: 'Notify Failure'
    condition: failed()
    steps:
    - script: |
        echo "❌ Pipeline failed"
        curl -X POST -H 'Content-type: application/json' --data '{"text":"❌ Pipeline failed - immediate attention required"}' \$(SLACK_WEBHOOK)
      displayName: 'Send failure notification'
`;
  }

  /**
   * Generate Docker-based testing pipeline
   */
  static generateDockerPipeline(): string {
    return `
# Docker-based Testing Pipeline
FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Testing stage
FROM base AS testing

# Install testing dependencies
RUN npm ci

# Run unit tests
RUN npm run test:unit

# Run integration tests
RUN npm run test:integration

# Run E2E tests
RUN npm run test:e2e

# Run security tests
RUN npm run test:security

# Run performance tests
RUN npm run test:performance

# Run compliance tests
RUN npm run test:compliance

# Production stage
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]

# Development stage
FROM base AS development

# Install development dependencies
RUN npm ci

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000

# Start the development server
CMD ["npm", "run", "dev"]
`;
  }

  /**
   * Generate Kubernetes testing configuration
   */
  static generateKubernetesTesting(): string {
    return `
apiVersion: v1
kind: Namespace
metadata:
  name: testing
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  namespace: testing
data:
  NODE_ENV: "test"
  CI: "true"
  LOG_LEVEL: "debug"
---
apiVersion: v1
kind: Secret
metadata:
  name: test-secrets
  namespace: testing
type: Opaque
data:
  DATABASE_URL: <base64-encoded-database-url>
  REDIS_URL: <base64-encoded-redis-url>
  API_KEY: <base64-encoded-api-key>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-runner
  namespace: testing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-runner
  template:
    metadata:
      labels:
        app: test-runner
    spec:
      containers:
      - name: test-runner
        image: node:18-alpine
        command: ["npm", "run", "test:ci"]
        envFrom:
        - configMapRef:
            name: test-config
        - secretRef:
            name: test-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
      volumes:
      - name: test-results
        persistentVolumeClaim:
          claimName: test-results-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-results-pvc
  namespace: testing
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: batch/v1
kind: Job
metadata:
  name: unit-tests
  namespace: testing
spec:
  template:
    spec:
      containers:
      - name: unit-tests
        image: node:18-alpine
        command: ["npm", "run", "test:unit"]
        envFrom:
        - configMapRef:
            name: test-config
        - secretRef:
            name: test-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
      restartPolicy: Never
      volumes:
      - name: test-results
        persistentVolumeClaim:
          claimName: test-results-pvc
  backoffLimit: 3
---
apiVersion: batch/v1
kind: Job
metadata:
  name: integration-tests
  namespace: testing
spec:
  template:
    spec:
      containers:
      - name: integration-tests
        image: node:18-alpine
        command: ["npm", "run", "test:integration"]
        envFrom:
        - configMapRef:
            name: test-config
        - secretRef:
            name: test-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
      restartPolicy: Never
      volumes:
      - name: test-results
        persistentVolumeClaim:
          claimName: test-results-pvc
  backoffLimit: 3
---
apiVersion: batch/v1
kind: Job
metadata:
  name: e2e-tests
  namespace: testing
spec:
  template:
    spec:
      containers:
      - name: e2e-tests
        image: node:18-alpine
        command: ["npm", "run", "test:e2e"]
        envFrom:
        - configMapRef:
            name: test-config
        - secretRef:
            name: test-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
      restartPolicy: Never
      volumes:
      - name: test-results
        persistentVolumeClaim:
          claimName: test-results-pvc
  backoffLimit: 3
---
apiVersion: batch/v1
kind: Job
metadata:
  name: performance-tests
  namespace: testing
spec:
  template:
    spec:
      containers:
      - name: performance-tests
        image: node:18-alpine
        command: ["npm", "run", "test:performance"]
        envFrom:
        - configMapRef:
            name: test-config
        - secretRef:
            name: test-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
      restartPolicy: Never
      volumes:
      - name: test-results
        persistentVolumeClaim:
          claimName: test-results-pvc
  backoffLimit: 3
---
apiVersion: batch/v1
kind: Job
metadata:
  name: security-tests
  namespace: testing
spec:
  template:
    spec:
      containers:
      - name: security-tests
        image: node:18-alpine
        command: ["npm", "run", "test:security"]
        envFrom:
        - configMapRef:
            name: test-config
        - secretRef:
            name: test-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
      restartPolicy: Never
      volumes:
      - name: test-results
        persistentVolumeClaim:
          claimName: test-results-pvc
  backoffLimit: 3
---
apiVersion: batch/v1
kind: Job
metadata:
  name: compliance-tests
  namespace: testing
spec:
  template:
    spec:
      containers:
      - name: compliance-tests
        image: node:18-alpine
        command: ["npm", "run", "test:compliance"]
        envFrom:
        - configMapRef:
            name: test-config
        - secretRef:
            name: test-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: test-results
          mountPath: /app/test-results
      restartPolicy: Never
      volumes:
      - name: test-results
        persistentVolumeClaim:
          claimName: test-results-pvc
  backoffLimit: 3
`;
  }
}