/**
 * ROAM Framework Factory
 * 
 * Factory functions for creating ROAM framework instances
 * with different configurations and integration levels
 */

import { ROAMFramework } from './core/roam-framework';
import { ROAMFrameworkConfig } from './core/types';
import { createDefaultROAMConfig, createProductionROAMConfig, createDevelopmentROAMConfig } from './core/config';
import { createFullyIntegratedROAM, createROAMWithOrchestration, createROAMWithWSJF } from './integration';
import { TechnicalRiskAnalyzer, BusinessRiskAnalyzer, OperationalRiskAnalyzer } from './analysis';

// Import workflow engines
import { RiskIdentificationWorkflowEngine } from './workflows/risk-identification-workflow';
import { RiskMonitoringSystem } from './monitoring/risk-monitoring-system';
import { MitigationWorkflowEngine } from './workflows/mitigation-workflow';
import { RiskReportingWorkflowEngine } from './workflows/risk-reporting-workflow';
import { ContinuousImprovementCycleEngine } from './workflows/continuous-improvement-cycle';

// Import core components for workflow engines
import { RiskIdentifier } from './core/risk-identifier';
import { RiskScorer } from './core/risk-scorer';
import { MitigationStrategyManager } from './core/mitigation-strategy';
import { ActionTracker } from './core/action-tracker';

/**
 * Factory function types
 */
export type ROAMEnvironment = 'development' | 'staging' | 'production' | 'testing';

export interface ROAMFactoryOptions {
  environment: ROAMEnvironment;
  config?: Partial<ROAMFrameworkConfig>;
  autoInitialize?: boolean;
  includeWorkflows?: boolean;
  includeMonitoring?: boolean;
  includeReporting?: boolean;
  includeContinuousImprovement?: boolean;
}

/**
 * Creates ROAM framework instance based on environment
 */
export function createROAMFramework(options: ROAMFactoryOptions = { environment: 'production' }): ROAMFramework {
  console.log(`[ROAM-FACTORY] Creating ROAM framework for environment: ${options.environment}`);

  let config: ROAMFrameworkConfig;

  switch (options.environment) {
    case 'development':
      config = {
        ...createDevelopmentROAMConfig(),
        ...options.config
      };
      break;
    case 'staging':
      config = {
        ...createDefaultROAMConfig(),
        ...options.config,
        enableAutoMonitoring: true,
        monitoringInterval: 30 // 30 minutes
      };
      break;
    case 'testing':
      config = {
        ...createDevelopmentROAMConfig(),
        ...options.config,
        enableAutoScoring: false, // Disable auto-scoring in testing
        enableAutoPrioritization: false, // Disable auto-prioritization in testing
        enableAutoMonitoring: false, // Disable auto-monitoring in testing
        integrationSettings: {
          orchestrationFramework: false,
          wsjfSystem: false,
          healthChecks: false,
          agentDB: false
        }
      };
      break;
    case 'production':
    default:
      config = {
        ...createProductionROAMConfig(),
        ...options.config
      };
      break;
  }

  console.log(`[ROAM-FACTORY] ROAM framework configuration created for ${options.environment}`);

  // Create framework instance
  const roamFramework = new ROAMFramework(config);

  // Auto-initialize if requested (default for production/staging)
  if (options.autoInitialize !== false) {
    // Note: In a real implementation, this would require actual integration components
    // For now, we'll create the framework without integrations
    console.log('[ROAM-FACTORY] Framework created (auto-initialization would require integration components)');
  }

  return roamFramework;
}

/**
 * Creates development ROAM framework
 */
export function createDevelopmentROAMFramework(config?: Partial<ROAMFrameworkConfig>): ROAMFramework {
  return createROAMFramework({
    environment: 'development',
    config,
    autoInitialize: true
  });
}

/**
 * Creates staging ROAM framework
 */
export function createStagingROAMFramework(config?: Partial<ROAMFrameworkConfig>): ROAMFramework {
  return createROAMFramework({
    environment: 'staging',
    config,
    autoInitialize: true
  });
}

/**
 * Creates production ROAM framework
 */
export function createProductionROAMFramework(config?: Partial<ROAMFrameworkConfig>): ROAMFramework {
  return createROAMFramework({
    environment: 'production',
    config,
    autoInitialize: true
  });
}

/**
 * Creates testing ROAM framework
 */
export function createTestingROAMFramework(config?: Partial<ROAMFrameworkConfig>): ROAMFramework {
  return createROAMFramework({
    environment: 'testing',
    config,
    autoInitialize: false // Don't auto-initialize in testing
  });
}

/**
 * Creates ROAM framework with minimal configuration
 */
export function createMinimalROAMFramework(config?: Partial<ROAMFrameworkConfig>): ROAMFramework {
  const minimalConfig: Partial<ROAMFrameworkConfig> = {
    ...config,
    enableAutoScoring: false,
    enableAutoPrioritization: false,
    enableAutoMonitoring: false,
    monitoringInterval: 0, // Disabled
    reportingInterval: 0, // Disabled
    integrationSettings: {
      orchestrationFramework: false,
      wsjfSystem: false,
      healthChecks: false,
      agentDB: false,
      ...config?.integrationSettings
    }
  };

  return createROAMFramework({
    environment: 'development',
    config: minimalConfig,
    autoInitialize: false
  });
}

/**
 * Creates ROAM framework with custom environment
 */
export function createCustomROAMFramework(
  environment: string,
  config?: Partial<ROAMFrameworkConfig>
): ROAMFramework {
  return createROAMFramework({
    environment: environment as ROAMEnvironment,
    config,
    autoInitialize: true
  });
}

/**
 * Creates ROAM framework with all workflow components
 */
export function createFullROAMFramework(options: ROAMFactoryOptions = { environment: 'production' }): {
  framework: ROAMFramework;
  workflows: {
    riskIdentification: RiskIdentificationWorkflowEngine;
    riskMonitoring: RiskMonitoringSystem;
    mitigation: MitigationWorkflowEngine;
    reporting: RiskReportingWorkflowEngine;
    continuousImprovement: ContinuousImprovementCycleEngine;
  };
} {
  console.log(`[ROAM-FACTORY] Creating full ROAM framework with workflows for environment: ${options.environment}`);

  // Create base framework
  const framework = createROAMFramework(options);

  // Get core components from framework
  const riskIdentifier = framework.getRiskIdentifier();
  const riskScorer = framework.getRiskScorer();
  const mitigationStrategyManager = framework.getMitigationStrategyManager();
  const actionTracker = framework.getActionTracker();

  // Create workflow engines
  const workflows = {
    riskIdentification: new RiskIdentificationWorkflowEngine(
      riskIdentifier,
      riskScorer,
      undefined, // orchestrationFramework - would be passed in real implementation
      undefined // wsjfCalculator - would be passed in real implementation
    ),
    riskMonitoring: new RiskMonitoringSystem(
      {
        id: 'default-monitoring',
        name: 'Default Risk Monitoring',
        description: 'Default monitoring configuration',
        enabled: true,
        monitoringInterval: options.environment === 'production' ? 30 : 60,
        riskMetrics: {
          enabled: true,
          metrics: ['score', 'count', 'severity', 'category'],
          aggregation: 'realtime'
        },
        trendAnalysis: {
          enabled: true,
          lookbackPeriod: 30,
          predictionHorizon: 7,
          algorithms: ['linear_regression', 'moving_average']
        },
        dashboard: {
          enabled: true,
          refreshInterval: 30,
          defaultViews: ['overview', 'trends', 'alerts']
        },
        retention: {
          alerts: 30,
          metrics: 90,
          snapshots: 7
        },
        integration: {
          orchestrationFramework: options.environment !== 'testing',
          healthChecks: options.environment === 'production',
          agentDB: options.environment === 'production'
        }
      },
      undefined // orchestrationFramework - would be passed in real implementation
    ),
    mitigation: new MitigationWorkflowEngine(
      mitigationStrategyManager,
      actionTracker,
      undefined, // orchestrationFramework - would be passed in real implementation
      undefined // wsjfCalculator - would be passed in real implementation
    ),
    reporting: new RiskReportingWorkflowEngine(
      undefined // orchestrationFramework - would be passed in real implementation
    ),
    continuousImprovement: new ContinuousImprovementCycleEngine(
      {
        id: 'default-improvement',
        name: 'Default Continuous Improvement',
        description: 'Default continuous improvement configuration',
        enabled: true,
        cycles: [], // Will be populated with default cycles
        integration: {
          orchestrationFramework: options.environment !== 'testing',
          riskIdentification: true,
          mitigationWorkflows: true,
          reportingSystem: true,
          monitoringSystem: true
        },
        feedback: {
          enabled: true,
          channels: ['surveys', 'metrics', 'observations'],
          frequency: 'weekly',
          stakeholders: ['risk_team', 'management']
        },
        knowledge: {
          enabled: true,
          repository: 'internal',
          capture: 'hybrid',
          sharing: 'internal',
          retention: 12
        },
        evolution: {
          enabled: true,
          adaptationRate: 0.8,
          reviewPeriod: 90,
          approvalRequired: options.environment === 'production',
          approvers: ['risk_manager', 'compliance_officer']
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      undefined // orchestrationFramework - would be passed in real implementation
    )
  };

  return { framework, workflows };
}

/**
 * Creates technical risk analyzer instance
 */
export function createTechnicalRiskAnalyzer(config: any): TechnicalRiskAnalyzer {
  console.log('[ROAM-FACTORY] Creating technical risk analyzer');
  return new TechnicalRiskAnalyzer(config);
}

/**
 * Creates business risk analyzer instance
 */
export function createBusinessRiskAnalyzer(config: any): BusinessRiskAnalyzer {
  console.log('[ROAM-FACTORY] Creating business risk analyzer');
  return new BusinessRiskAnalyzer(config);
}

/**
 * Creates operational risk analyzer instance
 */
export function createOperationalRiskAnalyzer(config: any): OperationalRiskAnalyzer {
  console.log('[ROAM-FACTORY] Creating operational risk analyzer');
  return new OperationalRiskAnalyzer(config);
}

/**
 * Creates all risk analyzers with shared configuration
 */
export function createAllRiskAnalyzers(config: any): {
  technical: TechnicalRiskAnalyzer;
  business: BusinessRiskAnalyzer;
  operational: OperationalRiskAnalyzer;
} {
  console.log('[ROAM-FACTORY] Creating all risk analyzers');
  return {
    technical: createTechnicalRiskAnalyzer(config),
    business: createBusinessRiskAnalyzer(config),
    operational: createOperationalRiskAnalyzer(config)
  };
}

/**
 * Creates individual workflow engines
 */
export function createRiskIdentificationWorkflowEngine(
  riskIdentifier: RiskIdentifier,
  riskScorer: RiskScorer,
  orchestrationFramework?: any,
  wsjfCalculator?: any
): RiskIdentificationWorkflowEngine {
  console.log('[ROAM-FACTORY] Creating risk identification workflow engine');
  return new RiskIdentificationWorkflowEngine(riskIdentifier, riskScorer, orchestrationFramework, wsjfCalculator);
}

export function createRiskMonitoringSystem(
  config: any,
  orchestrationFramework?: any
): RiskMonitoringSystem {
  console.log('[ROAM-FACTORY] Creating risk monitoring system');
  return new RiskMonitoringSystem(config, orchestrationFramework);
}

export function createMitigationWorkflowEngine(
  mitigationStrategyManager: MitigationStrategyManager,
  actionTracker: ActionTracker,
  orchestrationFramework?: any,
  wsjfCalculator?: any
): MitigationWorkflowEngine {
  console.log('[ROAM-FACTORY] Creating mitigation workflow engine');
  return new MitigationWorkflowEngine(mitigationStrategyManager, actionTracker, orchestrationFramework, wsjfCalculator);
}

export function createRiskReportingWorkflowEngine(
  orchestrationFramework?: any
): RiskReportingWorkflowEngine {
  console.log('[ROAM-FACTORY] Creating risk reporting workflow engine');
  return new RiskReportingWorkflowEngine(orchestrationFramework);
}

export function createContinuousImprovementCycleEngine(
  config: any,
  orchestrationFramework?: any
): ContinuousImprovementCycleEngine {
  console.log('[ROAM-FACTORY] Creating continuous improvement cycle engine');
  return new ContinuousImprovementCycleEngine(config, orchestrationFramework);
}

/**
 * Validates ROAM factory options
 */
export function validateROAMFactoryOptions(options: ROAMFactoryOptions): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate environment
  const validEnvironments: ROAMEnvironment[] = ['development', 'staging', 'production', 'testing'];
  if (!validEnvironments.includes(options.environment)) {
    errors.push(`Invalid environment: ${options.environment}. Must be one of: ${validEnvironments.join(', ')}`);
  }

  // Validate config if provided
  if (options.config) {
    if (options.config.riskAssessment) {
      if (!options.config.riskAssessment.id) {
        errors.push('Risk assessment config must have an ID');
      }
    }

    if (options.config.monitoringInterval !== undefined && options.config.monitoringInterval < 0) {
      errors.push('Monitoring interval must be positive');
    }

    if (options.config.reportingInterval !== undefined && options.config.reportingInterval < 0) {
      errors.push('Reporting interval must be positive');
    }
  }

  // Warnings for development environment
  if (options.environment === 'development') {
    if (options.config?.integrationSettings?.healthChecks === true) {
      warnings.push('Health checks integration in development may use mock data');
    }

    if (options.config?.integrationSettings?.agentDB === true) {
      warnings.push('AgentDB integration in development may use mock data');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Gets recommended configuration for environment
 */
export function getRecommendedConfig(environment: ROAMEnvironment): Partial<ROAMFrameworkConfig> {
  switch (environment) {
    case 'development':
      return {
        enableAutoScoring: true,
        enableAutoPrioritization: true,
        enableAutoMonitoring: true,
        monitoringInterval: 120, // 2 hours
        reportingInterval: 14, // 2 weeks
        integrationSettings: {
          orchestrationFramework: true,
          wsjfSystem: true,
          healthChecks: false, // Use mock data in development
          agentDB: false // Use mock data in development
        }
      };
    case 'staging':
      return {
        enableAutoScoring: true,
        enableAutoPrioritization: true,
        enableAutoMonitoring: true,
        monitoringInterval: 60, // 1 hour
        reportingInterval: 7, // 1 week
        integrationSettings: {
          orchestrationFramework: true,
          wsjfSystem: true,
          healthChecks: true,
          agentDB: true
        }
      };
    case 'production':
      return {
        enableAutoScoring: true,
        enableAutoPrioritization: true,
        enableAutoMonitoring: true,
        monitoringInterval: 30, // 30 minutes
        reportingInterval: 1, // 1 day
        integrationSettings: {
          orchestrationFramework: true,
          wsjfSystem: true,
          healthChecks: true,
          agentDB: true
        }
      };
    case 'testing':
      return {
        enableAutoScoring: false,
        enableAutoPrioritization: false,
        enableAutoMonitoring: false,
        monitoringInterval: 0,
        reportingInterval: 0,
        integrationSettings: {
          orchestrationFramework: false,
          wsjfSystem: false,
          healthChecks: false,
          agentDB: false
        }
      };
    default:
      return {};
  }
}

/**
 * Creates ROAM framework with environment-specific optimizations
 */
export function createOptimizedROAMFramework(
  environment: ROAMEnvironment,
  customConfig?: Partial<ROAMFrameworkConfig>
): ROAMFramework {
  const recommendedConfig = getRecommendedConfig(environment);
  const mergedConfig = {
    ...recommendedConfig,
    ...customConfig
  };

  return createROAMFramework({
    environment,
    config: mergedConfig,
    autoInitialize: true
  });
}

/**
 * Factory for creating ROAM framework instances with common patterns
 */
export const ROAMFrameworkFactory = {
  create: createROAMFramework,
  createDevelopment: createDevelopmentROAMFramework,
  createStaging: createStagingROAMFramework,
  createProduction: createProductionROAMFramework,
  createTesting: createTestingROAMFramework,
  createMinimal: createMinimalROAMFramework,
  createCustom: createCustomROAMFramework,
  createFull: createFullROAMFramework,
  createOptimized: createOptimizedROAMFramework,
  validate: validateROAMFactoryOptions,
  getRecommendedConfig,
  // Risk analyzer factory functions
  createTechnicalRiskAnalyzer,
  createBusinessRiskAnalyzer,
  createOperationalRiskAnalyzer,
  createAllRiskAnalyzers,
  // Workflow engine factory functions
  createRiskIdentificationWorkflowEngine,
  createRiskMonitoringSystem,
  createMitigationWorkflowEngine,
  createRiskReportingWorkflowEngine,
  createContinuousImprovementCycleEngine
};

// Export factory as default
export default ROAMFrameworkFactory;