#!/usr/bin/env node
/**
 * OpenCode AI Documentation MCP Server
 * Provides access to OpenCode AI documentation and knowledge base
 */

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentationQuery,
  DocumentationResult,
  SafetyMonitor,
  SafetyAlert
} from '../types';

export class OpenCodeDocsServer {
  private server: FastMCP;
  private documentationCache: Map<string, DocumentationResult[]> = new Map();
  private safetyMonitor: SafetyMonitor;

  // Mock documentation database - in real implementation, this would connect to OpenCode AI APIs
  private mockDocumentation: Record<string, DocumentationResult[]> = {
    'api': [
      {
        title: 'REST API Authentication',
        content: 'OpenCode AI uses OAuth 2.0 for API authentication. Include Bearer token in Authorization header.',
        source: 'opencode',
        relevance: 0.95,
        metadata: { category: 'api', version: 'v2', tags: ['authentication', 'oauth'] }
      },
      {
        title: 'GraphQL API Reference',
        content: 'GraphQL endpoint supports queries for repositories, issues, and pull requests with full filtering.',
        source: 'opencode',
        relevance: 0.90,
        metadata: { category: 'api', version: 'v2', tags: ['graphql', 'queries'] }
      }
    ],
    'deployment': [
      {
        title: 'Container Deployment Guide',
        content: 'Deploy applications using Docker containers with Kubernetes orchestration for scalability.',
        source: 'opencode',
        relevance: 0.92,
        metadata: { category: 'deployment', tags: ['docker', 'kubernetes', 'containers'] }
      },
      {
        title: 'CI/CD Pipeline Setup',
        content: 'Automate deployment with GitHub Actions, including testing, building, and release management.',
        source: 'opencode',
        relevance: 0.88,
        metadata: { category: 'deployment', tags: ['ci-cd', 'github-actions', 'automation'] }
      }
    ],
    'security': [
      {
        title: 'Security Best Practices',
        content: 'Implement OWASP guidelines, regular security audits, and dependency vulnerability scanning.',
        source: 'opencode',
        relevance: 0.96,
        metadata: { category: 'security', tags: ['owasp', 'audits', 'vulnerabilities'] }
      },
      {
        title: 'Access Control Implementation',
        content: 'Use role-based access control (RBAC) with JWT tokens and API key management.',
        source: 'opencode',
        relevance: 0.91,
        metadata: { category: 'security', tags: ['rbac', 'jwt', 'access-control'] }
      }
    ]
  };

  constructor() {
    this.server = new FastMCP({
      name: 'opencode-docs',
      version: '1.0.0'
    });

    this.safetyMonitor = {
      id: 'opencode-docs-safety',
      type: 'security',
      thresholds: {
        maxQueriesPerMinute: 60,
        maxResultsPerQuery: 50,
        cacheExpirationHours: 24
      },
      alerts: [],
      enabled: true
    };

    this.setupTools();
    this.setupSafetyMonitoring();
    this.initializeDocumentationCache();
  }

  private setupTools(): void {
    // Search documentation
    this.server.addTool({
      name: 'search_docs',
      description: 'Search OpenCode AI documentation and knowledge base',
      parameters: z.object({
        query: z.string().describe('Search query for documentation'),
        category: z.string().optional().describe('Filter by category (api, deployment, security, etc.)'),
        tags: z.array(z.string()).optional().describe('Filter by tags'),
        limit: z.number().optional().default(10).describe('Maximum number of results to return'),
        includeContent: z.boolean().optional().default(true).describe('Include full content in results')
      }),
      execute: async (args) => {
        // Rate limiting check
        if (!this.checkRateLimit()) {
          throw new Error('Rate limit exceeded. Please wait before making another request.');
        }

        const results = await this.searchDocumentation({
          query: args.query,
          source: 'opencode',
          filters: {
            category: args.category,
            tags: args.tags
          },
          limit: Math.min(args.limit, this.safetyMonitor.thresholds.maxResultsPerQuery)
        });

        const formattedResults = results.map(result => ({
          title: result.title,
          content: args.includeContent ? result.content : result.content.substring(0, 200) + '...',
          source: result.source,
          relevance: result.relevance,
          url: result.url,
          category: result.metadata.category,
          tags: result.metadata.tags
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              totalResults: results.length,
              results: formattedResults
            }, null, 2)
          }]
        };
      }
    });

    // Get documentation by category
    this.server.addTool({
      name: 'get_category_docs',
      description: 'Get all documentation for a specific category',
      parameters: z.object({
        category: z.string().describe('Documentation category to retrieve'),
        limit: z.number().optional().default(20).describe('Maximum number of documents to return'),
        sortBy: z.enum(['relevance', 'title', 'date']).optional().default('relevance').describe('Sort order')
      }),
      execute: async (args) => {
        const cached = this.documentationCache.get(args.category);
        if (!cached) {
          throw new Error(`Category '${args.category}' not found`);
        }

        let results = [...cached];

        // Sort results
        switch (args.sortBy) {
          case 'title':
            results.sort((a, b) => a.title.localeCompare(b.title));
            break;
          case 'relevance':
          default:
            results.sort((a, b) => b.relevance - a.relevance);
            break;
        }

        results = results.slice(0, args.limit);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              category: args.category,
              totalDocuments: cached.length,
              returnedDocuments: results.length,
              documents: results.map(doc => ({
                title: doc.title,
                content: doc.content,
                relevance: doc.relevance,
                tags: doc.metadata.tags
              }))
            }, null, 2)
          }]
        };
      }
    });

    // Get documentation by ID or URL
    this.server.addTool({
      name: 'get_doc_by_id',
      description: 'Get specific documentation by ID or URL',
      parameters: z.object({
        identifier: z.string().describe('Document ID or URL to retrieve'),
        includeMetadata: z.boolean().optional().default(false).describe('Include full metadata')
      }),
      execute: async (args) => {
        // Search through all cached documentation
        for (const [category, docs] of this.documentationCache.entries()) {
          const doc = docs.find(d =>
            d.title.toLowerCase().includes(args.identifier.toLowerCase()) ||
            (d.url && d.url.includes(args.identifier))
          );

          if (doc) {
            const result: any = {
              title: doc.title,
              content: doc.content,
              source: doc.source,
              relevance: doc.relevance,
              url: doc.url,
              category
            };

            if (args.includeMetadata) {
              result.metadata = doc.metadata;
            }

            return {
              content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }]
            };
          }
        }

        throw new Error(`Documentation '${args.identifier}' not found`);
      }
    });

    // List available categories
    this.server.addTool({
      name: 'list_categories',
      description: 'List all available documentation categories',
      parameters: z.object({}),
      execute: async () => {
        const categories = Array.from(this.documentationCache.entries()).map(([category, docs]) => ({
          category,
          documentCount: docs.length,
          topTags: this.getTopTags(docs)
        }));

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              totalCategories: categories.length,
              categories
            }, null, 2)
          }]
        };
      }
    });

    // Get related documentation
    this.server.addTool({
      name: 'get_related_docs',
      description: 'Find documentation related to a specific topic',
      parameters: z.object({
        topic: z.string().describe('Topic to find related documentation for'),
        currentDocId: z.string().optional().describe('Current document ID to exclude from results'),
        limit: z.number().optional().default(5).describe('Maximum number of related documents')
      }),
      execute: async (args) => {
        const relatedDocs: DocumentationResult[] = [];

        // Simple relatedness algorithm based on tag overlap and content similarity
        for (const [category, docs] of this.documentationCache.entries()) {
          for (const doc of docs) {
            if (args.currentDocId && doc.title.includes(args.currentDocId)) {
              continue; // Skip current document
            }

            let score = 0;

            // Title similarity
            if (doc.title.toLowerCase().includes(args.topic.toLowerCase())) {
              score += 0.4;
            }

            // Content similarity
            if (doc.content.toLowerCase().includes(args.topic.toLowerCase())) {
              score += 0.3;
            }

            // Tag relevance
            if (doc.metadata.tags?.some((tag: string) =>
              args.topic.toLowerCase().includes(tag.toLowerCase()) ||
              tag.toLowerCase().includes(args.topic.toLowerCase())
            )) {
              score += 0.3;
            }

            if (score > 0.2) { // Minimum relevance threshold
              relatedDocs.push({
                ...doc,
                relevance: score
              });
            }
          }
        }

        // Sort by relevance and limit results
        relatedDocs.sort((a, b) => b.relevance - a.relevance);
        const results = relatedDocs.slice(0, args.limit);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              topic: args.topic,
              relatedDocuments: results.map(doc => ({
                title: doc.title,
                relevance: doc.relevance,
                category: doc.metadata.category,
                tags: doc.metadata.tags
              }))
            }, null, 2)
          }]
        };
      }
    });

    // Get documentation statistics
    this.server.addTool({
      name: 'get_docs_stats',
      description: 'Get documentation statistics and health metrics',
      parameters: z.object({}),
      execute: async () => {
        const stats = {
          totalCategories: this.documentationCache.size,
          totalDocuments: Array.from(this.documentationCache.values())
            .reduce((sum, docs) => sum + docs.length, 0),
          categories: Array.from(this.documentationCache.entries())
            .map(([category, docs]) => ({
              category,
              count: docs.length,
              avgRelevance: docs.reduce((sum, doc) => sum + doc.relevance, 0) / docs.length
            })),
          cacheStatus: 'healthy',
          lastUpdated: new Date().toISOString()
        };

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(stats, null, 2)
          }]
        };
      }
    });
  }

  private setupSafetyMonitoring(): void {
    // Periodic cache refresh and safety checks
    setInterval(() => {
      this.performSafetyChecks();
    }, 60000); // Check every minute
  }

  private async performSafetyChecks(): Promise<void> {
    // Check cache freshness
    const now = Date.now();
    const cacheExpirationMs = this.safetyMonitor.thresholds.cacheExpirationHours * 60 * 60 * 1000;

    // In a real implementation, this would refresh from OpenCode AI APIs
    // For now, just log that cache is being maintained
    console.log(`[OpenCode Docs] Cache status healthy - ${this.documentationCache.size} categories`);
  }

  private async searchDocumentation(query: DocumentationQuery): Promise<DocumentationResult[]> {
    const results: DocumentationResult[] = [];
    const queryLower = query.query.toLowerCase();

    // Search through all documentation
    for (const [category, docs] of this.documentationCache.entries()) {
      // Category filter
      if (query.filters?.category && category !== query.filters.category) {
        continue;
      }

      for (const doc of docs) {
        let relevance = 0;

        // Title matching
        if (doc.title.toLowerCase().includes(queryLower)) {
          relevance += 0.4;
        }

        // Content matching
        if (doc.content.toLowerCase().includes(queryLower)) {
          relevance += 0.3;
        }

        // Tag matching
        if (query.filters?.tags && doc.metadata.tags) {
          const tagMatches = query.filters.tags.filter(tag =>
            doc.metadata.tags.some((docTag: string) => docTag.toLowerCase().includes(tag.toLowerCase()))
          );
          relevance += tagMatches.length * 0.2;
        }

        // URL matching
        if (doc.url && doc.url.toLowerCase().includes(queryLower)) {
          relevance += 0.1;
        }

        if (relevance > 0) {
          results.push({
            ...doc,
            relevance
          });
        }
      }
    }

    // Sort by relevance and limit results
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, query.limit || 10);
  }

  private initializeDocumentationCache(): void {
    // Load mock documentation into cache
    for (const [category, docs] of Object.entries(this.mockDocumentation)) {
      this.documentationCache.set(category, docs);
    }

    console.log(`[OpenCode Docs] Loaded ${this.documentationCache.size} documentation categories`);
  }

  private checkRateLimit(): boolean {
    // Simple rate limiting - in production, this would be more sophisticated
    return true; // For now, always allow
  }

  private getTopTags(docs: DocumentationResult[]): string[] {
    const tagCount: Record<string, number> = {};

    docs.forEach(doc => {
      if (doc.metadata.tags) {
        doc.metadata.tags.forEach((tag: string) => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  private createSafetyAlert(level: 'info' | 'warning' | 'critical', message: string, metadata: Record<string, any>): void {
    const alert: SafetyAlert = {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      source: 'opencode-docs',
      metadata
    };

    this.safetyMonitor.alerts.push(alert);

    // Keep only last 50 alerts
    if (this.safetyMonitor.alerts.length > 50) {
      this.safetyMonitor.alerts = this.safetyMonitor.alerts.slice(-50);
    }

    console.warn(`[SAFETY ALERT ${level.toUpperCase()}] ${message}`, metadata);
  }

  public async start(port?: number): Promise<void> {
    console.error('🚀 Starting OpenCode AI Documentation MCP Server...');
    console.error('📚 OpenCode AI documentation access available');
    console.error('🔍 Full-text search and categorization enabled');

    if (port) {
      console.error(`🌐 HTTP mode not yet implemented, using stdio`);
    }

    await this.server.start({ transportType: 'stdio' });
  }
}

// CLI runner
if (require.main === module) {
  const server = new OpenCodeDocsServer();
  server.start().catch((error) => {
    console.error('Failed to start OpenCode AI Documentation MCP Server:', error);
    process.exit(1);
  });
}