/**
 * Tier-Based Coverage Framework
 * 
 * Implements tier-based coverage reporting with three tiers:
 * High Structure, Medium Structure, and Flexible
 */

import { EventEmitter } from 'events';
import {
  TierLevel,
  TierDefinition,
  TierRequirements,
  GovernanceRequirement,
  DocumentationRequirement,
  ProcessRequirement,
  MetricsRequirement,
  ValidationRequirement,
  SchemaValidationRules,
  ComplianceThresholds,
  CrossFieldValidation,
  CoverageError
} from './types';

export class TierFramework extends EventEmitter {
  private tierDefinitions: Map<TierLevel, TierDefinition> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    super();
    this.initializeTierDefinitions();
  }

  /**
   * Initialize tier definitions with default configurations
   */
  private initializeTierDefinitions(): void {
    // High Structure Tier
    this.tierDefinitions.set('high-structure', {
      level: 'high-structure',
      name: 'High Structure',
      description: 'Rigid governance with comprehensive validation and documentation requirements',
      structureRequirements: {
        governance: {
          requiredRoles: ['analyst', 'assessor', 'innovator', 'intuitive', 'orchestrator', 'seeker'],
          decisionFramework: true,
          escalationPaths: true,
          approvalWorkflows: true,
          riskAssessment: true
        },
        documentation: {
          purposeStatement: true,
          domainDefinition: true,
          accountabilityMatrix: true,
          processDocumentation: true,
          changeLog: true
        },
        process: {
          definedWorkflows: true,
          qualityGates: true,
          reviewCycles: true,
          feedbackLoops: true,
          continuousImprovement: true
        },
        metrics: {
          performanceMetrics: true,
          qualityMetrics: true,
          efficiencyMetrics: true,
          maturityMetrics: true,
          trendAnalysis: true
        },
        validation: {
          automatedTesting: true,
          manualReview: true,
          complianceChecks: true,
          securityValidation: true,
          performanceValidation: true
        }
      },
      depthLevels: 5,
      schemaValidation: {
        requiredFields: [
          'id', 'title', 'description', 'type', 'priority', 'tierLevel',
          'circleId', 'estimatedSize', 'dependencies', 'tags', 'metadata',
          'purposeStatement', 'domainDefinition', 'accountabilityMatrix',
          'processDocumentation', 'validationResults', 'complianceStatus'
        ],
        optionalFields: [
          'wsjfScore', 'riskAssessment', 'securityReview', 'performanceMetrics',
          'qualityMetrics', 'stakeholderApproval', 'changeLog', 'auditTrail'
        ],
        fieldTypes: {
          id: 'string',
          title: 'string',
          description: 'string',
          type: 'string',
          priority: 'number',
          tierLevel: 'string',
          circleId: 'string',
          estimatedSize: 'number',
          dependencies: 'array',
          tags: 'array',
          metadata: 'object',
          purposeStatement: 'string',
          domainDefinition: 'string',
          accountabilityMatrix: 'object',
          processDocumentation: 'string',
          validationResults: 'object',
          complianceStatus: 'string'
        },
        validationPatterns: {
          id: /^[a-zA-Z0-9-_]+$/,
          title: /^.{1,200}$/,
          priority: /^[1-9][0-9]*$/,
          tierLevel: /^(high-structure|medium-structure|flexible)$/,
          circleId: /^[a-z]+$/
        },
        crossFieldValidation: [
          {
            fields: ['priority', 'estimatedSize'],
            rule: 'dependency',
            description: 'High priority items must have detailed size estimates'
          },
          {
            fields: ['type', 'validationResults'],
            rule: 'required_if',
            description: 'Security-related items require security validation results'
          }
        ]
      },
      complianceThresholds: {
        minimumCoverage: 95,
        minimumDepth: 4,
        criticalFieldCompliance: 100,
        processCompliance: 90,
        documentationCompliance: 95
      }
    });

    // Medium Structure Tier
    this.tierDefinitions.set('medium-structure', {
      level: 'medium-structure',
      name: 'Medium Structure',
      description: 'Balanced governance with moderate validation and documentation requirements',
      structureRequirements: {
        governance: {
          requiredRoles: ['analyst', 'assessor', 'orchestrator'],
          decisionFramework: true,
          escalationPaths: true,
          approvalWorkflows: false,
          riskAssessment: true
        },
        documentation: {
          purposeStatement: true,
          domainDefinition: true,
          accountabilityMatrix: false,
          processDocumentation: true,
          changeLog: false
        },
        process: {
          definedWorkflows: true,
          qualityGates: false,
          reviewCycles: true,
          feedbackLoops: true,
          continuousImprovement: false
        },
        metrics: {
          performanceMetrics: true,
          qualityMetrics: true,
          efficiencyMetrics: false,
          maturityMetrics: false,
          trendAnalysis: true
        },
        validation: {
          automatedTesting: true,
          manualReview: false,
          complianceChecks: true,
          securityValidation: false,
          performanceValidation: false
        }
      },
      depthLevels: 3,
      schemaValidation: {
        requiredFields: [
          'id', 'title', 'description', 'type', 'priority', 'tierLevel',
          'circleId', 'estimatedSize', 'dependencies', 'tags', 'metadata',
          'purposeStatement', 'domainDefinition', 'processDocumentation',
          'complianceStatus'
        ],
        optionalFields: [
          'wsjfScore', 'accountabilityMatrix', 'validationResults', 'qualityMetrics',
          'stakeholderApproval', 'feedbackData'
        ],
        fieldTypes: {
          id: 'string',
          title: 'string',
          description: 'string',
          type: 'string',
          priority: 'number',
          tierLevel: 'string',
          circleId: 'string',
          estimatedSize: 'number',
          dependencies: 'array',
          tags: 'array',
          metadata: 'object',
          purposeStatement: 'string',
          domainDefinition: 'string',
          processDocumentation: 'string',
          complianceStatus: 'string'
        },
        validationPatterns: {
          id: /^[a-zA-Z0-9-_]+$/,
          title: /^.{1,200}$/,
          priority: /^[1-9][0-9]*$/,
          tierLevel: /^(high-structure|medium-structure|flexible)$/,
          circleId: /^[a-z]+$/
        },
        crossFieldValidation: [
          {
            fields: ['priority', 'estimatedSize'],
            rule: 'dependency',
            description: 'High priority items should have size estimates'
          }
        ]
      },
      complianceThresholds: {
        minimumCoverage: 80,
        minimumDepth: 2,
        criticalFieldCompliance: 95,
        processCompliance: 75,
        documentationCompliance: 80
      }
    });

    // Flexible Tier
    this.tierDefinitions.set('flexible', {
      level: 'flexible',
      name: 'Flexible',
      description: 'Minimal governance with basic validation and documentation requirements',
      structureRequirements: {
        governance: {
          requiredRoles: ['orchestrator'],
          decisionFramework: false,
          escalationPaths: false,
          approvalWorkflows: false,
          riskAssessment: false
        },
        documentation: {
          purposeStatement: true,
          domainDefinition: false,
          accountabilityMatrix: false,
          processDocumentation: false,
          changeLog: false
        },
        process: {
          definedWorkflows: false,
          qualityGates: false,
          reviewCycles: false,
          feedbackLoops: true,
          continuousImprovement: false
        },
        metrics: {
          performanceMetrics: true,
          qualityMetrics: false,
          efficiencyMetrics: false,
          maturityMetrics: false,
          trendAnalysis: false
        },
        validation: {
          automatedTesting: false,
          manualReview: false,
          complianceChecks: true,
          securityValidation: false,
          performanceValidation: false
        }
      },
      depthLevels: 1,
      schemaValidation: {
        requiredFields: [
          'id', 'title', 'description', 'type', 'priority', 'tierLevel',
          'circleId', 'tags', 'metadata', 'purposeStatement', 'complianceStatus'
        ],
        optionalFields: [
          'wsjfScore', 'estimatedSize', 'dependencies', 'domainDefinition',
          'processDocumentation', 'validationResults', 'feedbackData'
        ],
        fieldTypes: {
          id: 'string',
          title: 'string',
          description: 'string',
          type: 'string',
          priority: 'number',
          tierLevel: 'string',
          circleId: 'string',
          tags: 'array',
          metadata: 'object',
          purposeStatement: 'string',
          complianceStatus: 'string'
        },
        validationPatterns: {
          id: /^[a-zA-Z0-9-_]+$/,
          title: /^.{1,200}$/,
          priority: /^[1-9][0-9]*$/,
          tierLevel: /^(high-structure|medium-structure|flexible)$/,
          circleId: /^[a-z]+$/
        },
        crossFieldValidation: []
      },
      complianceThresholds: {
        minimumCoverage: 60,
        minimumDepth: 1,
        criticalFieldCompliance: 80,
        processCompliance: 50,
        documentationCompliance: 60
      }
    });

    this.isInitialized = true;
    this.emit('initialized', this.getTierDefinitions());
  }

  /**
   * Get all tier definitions
   */
  public getTierDefinitions(): TierDefinition[] {
    return Array.from(this.tierDefinitions.values());
  }

  /**
   * Get specific tier definition
   */
  public getTierDefinition(tierLevel: TierLevel): TierDefinition | undefined {
    return this.tierDefinitions.get(tierLevel);
  }

  /**
   * Validate tier level
   */
  public isValidTierLevel(tierLevel: string): tierLevel is TierLevel {
    return ['high-structure', 'medium-structure', 'flexible'].includes(tierLevel);
  }

  /**
   * Get tier requirements for a specific tier
   */
  public getTierRequirements(tierLevel: TierLevel): TierRequirements | undefined {
    const tierDef = this.tierDefinitions.get(tierLevel);
    return tierDef?.structureRequirements;
  }

  /**
   * Get schema validation rules for a specific tier
   */
  public getSchemaValidationRules(tierLevel: TierLevel): SchemaValidationRules | undefined {
    const tierDef = this.tierDefinitions.get(tierLevel);
    return tierDef?.schemaValidation;
  }

  /**
   * Get compliance thresholds for a specific tier
   */
  public getComplianceThresholds(tierLevel: TierLevel): ComplianceThresholds | undefined {
    const tierDef = this.tierDefinitions.get(tierLevel);
    return tierDef?.complianceThresholds;
  }

  /**
   * Get maximum depth levels for a specific tier
   */
  public getMaxDepthLevels(tierLevel: TierLevel): number | undefined {
    const tierDef = this.tierDefinitions.get(tierLevel);
    return tierDef?.depthLevels;
  }

  /**
   * Compare tiers to determine if one is stricter than another
   */
  public compareTiers(tier1: TierLevel, tier2: TierLevel): number {
    const tierHierarchy = {
      'high-structure': 3,
      'medium-structure': 2,
      'flexible': 1
    };

    const level1 = tierHierarchy[tier1];
    const level2 = tierHierarchy[tier2];

    if (level1 === level2) return 0;
    return level1 > level2 ? 1 : -1;
  }

  /**
   * Get tier progression path
   */
  public getTierProgression(currentTier: TierLevel): TierLevel[] {
    const progression: TierLevel[] = ['flexible', 'medium-structure', 'high-structure'];
    const currentIndex = progression.indexOf(currentTier);
    
    if (currentIndex === -1) {
      throw new CoverageError(
        'INVALID_TIER',
        `Invalid tier level: ${currentTier}`,
        { currentTier }
      );
    }

    return progression.slice(currentIndex + 1);
  }

  /**
   * Check if tier requirements are met
   */
  public validateTierRequirements(
    tierLevel: TierLevel,
    requirements: Partial<TierRequirements>
  ): { valid: boolean; gaps: string[] } {
    const tierDef = this.tierDefinitions.get(tierLevel);
    if (!tierDef) {
      throw new CoverageError(
        'TIER_NOT_FOUND',
        `Tier definition not found: ${tierLevel}`,
        { tierLevel }
      );
    }

    const gaps: string[] = [];
    const tierReqs = tierDef.structureRequirements;

    // Check governance requirements
    if (requirements.governance) {
      if (tierReqs.governance.requiredRoles.length > 0) {
        const missingRoles = tierReqs.governance.requiredRoles.filter(
          role => !requirements.governance?.requiredRoles?.includes(role)
        );
        if (missingRoles.length > 0) {
          gaps.push(`Missing required roles: ${missingRoles.join(', ')}`);
        }
      }
    }

    // Check documentation requirements
    if (requirements.documentation) {
      Object.entries(tierReqs.documentation).forEach(([key, required]) => {
        if (required && !requirements.documentation?.[key as keyof DocumentationRequirement]) {
          gaps.push(`Missing documentation requirement: ${key}`);
        }
      });
    }

    // Check process requirements
    if (requirements.process) {
      Object.entries(tierReqs.process).forEach(([key, required]) => {
        if (required && !requirements.process?.[key as keyof ProcessRequirement]) {
          gaps.push(`Missing process requirement: ${key}`);
        }
      });
    }

    // Check metrics requirements
    if (requirements.metrics) {
      Object.entries(tierReqs.metrics).forEach(([key, required]) => {
        if (required && !requirements.metrics?.[key as keyof MetricsRequirement]) {
          gaps.push(`Missing metrics requirement: ${key}`);
        }
      });
    }

    // Check validation requirements
    if (requirements.validation) {
      Object.entries(tierReqs.validation).forEach(([key, required]) => {
        if (required && !requirements.validation?.[key as keyof ValidationRequirement]) {
          gaps.push(`Missing validation requirement: ${key}`);
        }
      });
    }

    return {
      valid: gaps.length === 0,
      gaps
    };
  }

  /**
   * Get tier statistics
   */
  public getTierStatistics(): Record<TierLevel, {
    requiredFields: number;
    optionalFields: number;
    totalRequirements: number;
    depthLevels: number;
    minCoverage: number;
  }> {
    const stats: Record<string, any> = {};

    this.tierDefinitions.forEach((tierDef, tierLevel) => {
      const reqs = tierDef.structureRequirements;
      const totalRequirements = Object.values(reqs.governance).filter(Boolean).length +
                            Object.values(reqs.documentation).filter(Boolean).length +
                            Object.values(reqs.process).filter(Boolean).length +
                            Object.values(reqs.metrics).filter(Boolean).length +
                            Object.values(reqs.validation).filter(Boolean).length;

      stats[tierLevel] = {
        requiredFields: tierDef.schemaValidation.requiredFields.length,
        optionalFields: tierDef.schemaValidation.optionalFields.length,
        totalRequirements,
        depthLevels: tierDef.depthLevels,
        minCoverage: tierDef.complianceThresholds.minimumCoverage
      };
    });

    return stats as Record<TierLevel, any>;
  }

  /**
   * Export tier definitions to JSON
   */
  public exportDefinitions(): string {
    const definitions = Object.fromEntries(this.tierDefinitions);
    return JSON.stringify(definitions, null, 2);
  }

  /**
   * Import tier definitions from JSON
   */
  public importDefinitions(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      Object.entries(data).forEach(([tierLevel, tierDef]) => {
        if (this.isValidTierLevel(tierLevel)) {
          this.tierDefinitions.set(tierLevel as TierLevel, tierDef as TierDefinition);
        }
      });
      this.emit('definitionsUpdated', this.getTierDefinitions());
    } catch (error) {
      throw new CoverageError(
        'IMPORT_FAILED',
        'Failed to import tier definitions',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}