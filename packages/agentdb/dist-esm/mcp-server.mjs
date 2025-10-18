#!/usr/bin/env node
/**
 * AgentDB MCP Server
 * Production-ready MCP server for Claude Code integration
 * Exposes AgentDB vector database and ReasoningBank operations via MCP protocol
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { SQLiteVectorDB } from './core/vector-db.mjs';
import { PatternMatcher } from './reasoning/pattern-matcher.mjs';
import { BackendType } from './core/backend-interface.mjs';
import { z } from 'zod';
import { LearningManager } from './mcp/learning/core/learning-manager.mjs';
import { MCPLearningTools } from './mcp/learning/tools/mcp-learning-tools.mjs';
// ============================================================================
// Type Definitions
// ============================================================================
const VectorSchema = z.object({
    id: z.string().optional(),
    embedding: z.array(z.number()),
    metadata: z.record(z.any()).optional(),
    timestamp: z.number().optional(),
});
const PatternSchema = z.object({
    embedding: z.array(z.number()),
    taskType: z.string(),
    approach: z.string(),
    successRate: z.number().min(0).max(1),
    avgDuration: z.number().positive(),
    metadata: z.object({
        domain: z.string(),
        complexity: z.enum(['simple', 'medium', 'complex']),
        learningSource: z.enum(['success', 'failure', 'adaptation']),
        tags: z.array(z.string()),
    }),
});
// ============================================================================
// MCP Tool Definitions
// ============================================================================
const tools = [
    {
        name: 'agentdb_init',
        description: 'Initialize a new AgentDB vector database with specified configuration. Supports both in-memory and persistent storage with optional quantization and caching.',
        inputSchema: {
            type: 'object',
            properties: {
                path: {
                    type: 'string',
                    description: 'Database file path (optional, uses in-memory if not provided)',
                },
                memoryMode: {
                    type: 'boolean',
                    description: 'Use in-memory database (default: true if no path provided)',
                    default: true,
                },
                backend: {
                    type: 'string',
                    enum: ['native', 'wasm'],
                    description: 'Backend type: native (Node.js) or wasm (browser/universal)',
                    default: 'native',
                },
                enableQueryCache: {
                    type: 'boolean',
                    description: 'Enable query caching for 50-100x speedup',
                    default: true,
                },
                enableQuantization: {
                    type: 'boolean',
                    description: 'Enable vector quantization for 4-32x compression',
                    default: false,
                },
            },
        },
    },
    {
        name: 'agentdb_insert',
        description: 'Insert a single vector into AgentDB with optional metadata. Returns the generated vector ID.',
        inputSchema: {
            type: 'object',
            properties: {
                vector: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'Optional vector ID (auto-generated if not provided)',
                        },
                        embedding: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Vector embedding values',
                        },
                        metadata: {
                            type: 'object',
                            description: 'Optional metadata as key-value pairs',
                        },
                    },
                    required: ['embedding'],
                },
            },
            required: ['vector'],
        },
    },
    {
        name: 'agentdb_insert_batch',
        description: 'Insert multiple vectors in batch for better performance. Optimized for high-throughput operations.',
        inputSchema: {
            type: 'object',
            properties: {
                vectors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            embedding: {
                                type: 'array',
                                items: { type: 'number' },
                            },
                            metadata: { type: 'object' },
                        },
                        required: ['embedding'],
                    },
                    description: 'Array of vectors to insert',
                },
            },
            required: ['vectors'],
        },
    },
    {
        name: 'agentdb_search',
        description: 'Perform k-nearest neighbor search to find similar vectors. Uses cosine similarity by default with optional query caching.',
        inputSchema: {
            type: 'object',
            properties: {
                queryEmbedding: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'Query vector embedding',
                },
                k: {
                    type: 'number',
                    description: 'Number of nearest neighbors to return',
                    minimum: 1,
                    maximum: 1000,
                    default: 5,
                },
                metric: {
                    type: 'string',
                    enum: ['cosine', 'euclidean', 'dot'],
                    description: 'Similarity metric',
                    default: 'cosine',
                },
                threshold: {
                    type: 'number',
                    description: 'Minimum similarity threshold',
                    minimum: 0,
                    maximum: 1,
                    default: 0.0,
                },
            },
            required: ['queryEmbedding'],
        },
    },
    {
        name: 'agentdb_delete',
        description: 'Delete a vector by ID from the database.',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'Vector ID to delete',
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'agentdb_stats',
        description: 'Get comprehensive database statistics including vector count, cache stats, and compression metrics.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'agentdb_pattern_store',
        description: 'Store a reasoning pattern in ReasoningBank for future retrieval and learning.',
        inputSchema: {
            type: 'object',
            properties: {
                pattern: {
                    type: 'object',
                    properties: {
                        embedding: {
                            type: 'array',
                            items: { type: 'number' },
                            description: 'Pattern embedding vector',
                        },
                        taskType: {
                            type: 'string',
                            description: 'Type of task this pattern applies to',
                        },
                        approach: {
                            type: 'string',
                            description: 'Approach or solution strategy',
                        },
                        successRate: {
                            type: 'number',
                            description: 'Success rate (0-1)',
                            minimum: 0,
                            maximum: 1,
                        },
                        avgDuration: {
                            type: 'number',
                            description: 'Average execution duration in milliseconds',
                            minimum: 0,
                        },
                        metadata: {
                            type: 'object',
                            properties: {
                                domain: { type: 'string' },
                                complexity: {
                                    type: 'string',
                                    enum: ['simple', 'medium', 'complex'],
                                },
                                learningSource: {
                                    type: 'string',
                                    enum: ['success', 'failure', 'adaptation'],
                                },
                                tags: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
                            },
                            required: ['domain', 'complexity', 'learningSource', 'tags'],
                        },
                    },
                    required: ['embedding', 'taskType', 'approach', 'successRate', 'avgDuration', 'metadata'],
                },
            },
            required: ['pattern'],
        },
    },
    {
        name: 'agentdb_pattern_search',
        description: 'Search for similar reasoning patterns in ReasoningBank based on task embedding.',
        inputSchema: {
            type: 'object',
            properties: {
                taskEmbedding: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'Task embedding to find similar patterns for',
                },
                k: {
                    type: 'number',
                    description: 'Number of similar patterns to return',
                    minimum: 1,
                    maximum: 50,
                    default: 5,
                },
                threshold: {
                    type: 'number',
                    description: 'Minimum similarity threshold',
                    minimum: 0,
                    maximum: 1,
                    default: 0.7,
                },
                filters: {
                    type: 'object',
                    properties: {
                        domain: { type: 'string' },
                        taskType: { type: 'string' },
                        minSuccessRate: { type: 'number' },
                    },
                },
            },
            required: ['taskEmbedding'],
        },
    },
    {
        name: 'agentdb_pattern_stats',
        description: 'Get statistics about stored reasoning patterns in ReasoningBank.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'agentdb_clear_cache',
        description: 'Clear the query cache to free memory or force fresh queries.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    // Learning tools - will be dynamically added
];
// Helper function to merge learning tools
function getAllTools() {
    return [...tools];
}
// ============================================================================
// Database Registry
// ============================================================================
class AgentDBRegistry {
    constructor() {
        this.db = null;
        this.patternMatcher = null;
        this.learningManager = null;
        this.config = null;
    }
    async getOrCreate(config = {}) {
        if (!this.db) {
            // Set default config
            const dbConfig = {
                path: config.path,
                memoryMode: config.memoryMode ?? (!config.path),
                backend: config.backend === 'wasm' ? BackendType.WASM : BackendType.NATIVE,
                queryCache: {
                    enabled: config.enableQueryCache ?? true,
                },
                quantization: config.enableQuantization ? {
                    enabled: true,
                    dimensions: 768, // Default, will be updated
                    subvectors: 8,
                    bits: 8,
                } : undefined,
            };
            this.db = new SQLiteVectorDB(dbConfig);
            this.config = dbConfig;
            // Initialize async if WASM backend
            if (dbConfig.backend === BackendType.WASM) {
                await this.db.initializeAsync();
            }
            // Initialize PatternMatcher for ReasoningBank
            if (dbConfig.backend === BackendType.NATIVE) {
                this.patternMatcher = new PatternMatcher(this.db);
            }
        }
        return this.db;
    }
    get() {
        return this.db;
    }
    getPatternMatcher() {
        return this.patternMatcher;
    }
    getLearningManager() {
        return this.learningManager;
    }
    getOrCreateLearningManager() {
        if (!this.learningManager) {
            if (!this.db) {
                throw new Error('Database must be initialized before learning manager');
            }
            this.learningManager = new LearningManager(this.db);
        }
        return this.learningManager;
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.patternMatcher = null;
        }
    }
}
// ============================================================================
// Resource Handler
// ============================================================================
class ResourceHandler {
    constructor(registry) {
        this.registry = registry;
    }
    async listResources() {
        return {
            resources: [
                {
                    uri: 'agentdb://stats',
                    name: 'Database Statistics',
                    description: 'Current AgentDB statistics and metrics',
                    mimeType: 'application/json',
                },
                {
                    uri: 'agentdb://cache-stats',
                    name: 'Query Cache Statistics',
                    description: 'Query cache hit rates and performance metrics',
                    mimeType: 'application/json',
                },
                {
                    uri: 'agentdb://pattern-stats',
                    name: 'ReasoningBank Pattern Statistics',
                    description: 'Statistics about stored reasoning patterns',
                    mimeType: 'application/json',
                },
            ],
        };
    }
    async readResource(uri) {
        const db = this.registry.get();
        if (!db) {
            throw new Error('Database not initialized. Call agentdb_init first.');
        }
        switch (uri) {
            case 'agentdb://stats': {
                const stats = db.stats();
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify(stats, null, 2),
                        },
                    ],
                };
            }
            case 'agentdb://cache-stats': {
                const cacheStats = db.getCacheStats();
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify(cacheStats || { message: 'Cache not enabled' }, null, 2),
                        },
                    ],
                };
            }
            case 'agentdb://pattern-stats': {
                const patternMatcher = this.registry.getPatternMatcher();
                if (!patternMatcher) {
                    throw new Error('PatternMatcher not available (WASM backend or not initialized)');
                }
                const patternStats = patternMatcher.getStats();
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify({
                                totalPatterns: patternStats.totalPatterns,
                                avgSuccessRate: patternStats.avgSuccessRate,
                                domainDistribution: Object.fromEntries(patternStats.domainDistribution),
                                topPatterns: patternStats.topPatterns,
                            }, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown resource: ${uri}`);
        }
    }
}
// ============================================================================
// Main MCP Server
// ============================================================================
export class AgentDBMCPServer {
    constructor() {
        this.learningTools = null;
        this.registry = new AgentDBRegistry();
        this.resourceHandler = new ResourceHandler(this.registry);
        this.server = new Server({
            name: 'agentdb-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
            },
        });
        this.setupHandlers();
        this.setupErrorHandlers();
    }
    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const allTools = [...tools];
            // Add learning tools if learning manager is available
            if (this.learningTools) {
                const learningToolDefs = this.learningTools.getToolDefinitions();
                for (const [name, def] of Object.entries(learningToolDefs)) {
                    allTools.push({
                        name,
                        description: def.description,
                        inputSchema: def.inputSchema,
                    });
                }
            }
            return { tools: allTools };
        });
        // List available resources
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => this.resourceHandler.listResources());
        // Read resource
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => this.resourceHandler.readResource(request.params.uri));
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'agentdb_init':
                        return await this.handleInit(args);
                    case 'agentdb_insert':
                        return await this.handleInsert(args);
                    case 'agentdb_insert_batch':
                        return await this.handleInsertBatch(args);
                    case 'agentdb_search':
                        return await this.handleSearch(args);
                    case 'agentdb_delete':
                        return await this.handleDelete(args);
                    case 'agentdb_stats':
                        return await this.handleStats(args);
                    case 'agentdb_pattern_store':
                        return await this.handlePatternStore(args);
                    case 'agentdb_pattern_search':
                        return await this.handlePatternSearch(args);
                    case 'agentdb_pattern_stats':
                        return await this.handlePatternStats(args);
                    case 'agentdb_clear_cache':
                        return await this.handleClearCache(args);
                    // Learning tools
                    case 'learning_start_session':
                    case 'learning_end_session':
                    case 'learning_predict':
                    case 'learning_feedback':
                    case 'learning_train':
                    case 'learning_metrics':
                    case 'learning_transfer':
                    case 'learning_explain':
                    case 'experience_record':
                    case 'reward_signal':
                        return await this.handleLearningTool(name, args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                error: errorMessage,
                                tool: name,
                                timestamp: Date.now(),
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    setupErrorHandlers() {
        this.server.onerror = (error) => {
            console.error('[AgentDB MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            await this.cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            await this.cleanup();
            process.exit(0);
        });
    }
    // ============================================================================
    // Tool Handlers
    // ============================================================================
    async handleInit(args) {
        const db = await this.registry.getOrCreate(args);
        // Initialize learning tools
        const learningManager = this.registry.getOrCreateLearningManager();
        this.learningTools = new MCPLearningTools(learningManager);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'AgentDB initialized successfully with learning capabilities',
                        backend: db.getBackendType(),
                        config: {
                            path: args.path || 'in-memory',
                            memoryMode: args.memoryMode ?? true,
                            queryCache: args.enableQueryCache ?? true,
                            quantization: args.enableQuantization ?? false,
                        },
                        learningEnabled: true,
                    }, null, 2),
                },
            ],
        };
    }
    async handleInsert(args) {
        const db = this.registry.get();
        if (!db) {
            throw new Error('Database not initialized. Call agentdb_init first.');
        }
        const vector = VectorSchema.parse(args.vector);
        const id = db.insert(vector);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        id,
                        message: 'Vector inserted successfully',
                    }, null, 2),
                },
            ],
        };
    }
    async handleInsertBatch(args) {
        const db = this.registry.get();
        if (!db) {
            throw new Error('Database not initialized. Call agentdb_init first.');
        }
        const vectors = z.array(VectorSchema).parse(args.vectors);
        const ids = db.insertBatch(vectors);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        inserted: ids.length,
                        ids,
                        message: `${ids.length} vectors inserted successfully`,
                    }, null, 2),
                },
            ],
        };
    }
    async handleSearch(args) {
        const db = this.registry.get();
        if (!db) {
            throw new Error('Database not initialized. Call agentdb_init first.');
        }
        const { queryEmbedding, k = 5, metric = 'cosine', threshold = 0.0 } = args;
        const results = db.search(queryEmbedding, k, metric, threshold);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        results,
                        count: results.length,
                        message: `Found ${results.length} similar vectors`,
                    }, null, 2),
                },
            ],
        };
    }
    async handleDelete(args) {
        const db = this.registry.get();
        if (!db) {
            throw new Error('Database not initialized. Call agentdb_init first.');
        }
        const success = db.delete(args.id);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success,
                        id: args.id,
                        message: success ? 'Vector deleted successfully' : 'Vector not found',
                    }, null, 2),
                },
            ],
        };
    }
    async handleStats(args) {
        const db = this.registry.get();
        if (!db) {
            throw new Error('Database not initialized. Call agentdb_init first.');
        }
        const stats = db.stats();
        const cacheStats = db.getCacheStats();
        const compressionStats = db.getCompressionStats();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        stats: {
                            vectors: stats,
                            cache: cacheStats || { enabled: false },
                            compression: compressionStats || { enabled: false },
                        },
                        message: 'Statistics retrieved successfully',
                    }, null, 2),
                },
            ],
        };
    }
    async handlePatternStore(args) {
        const patternMatcher = this.registry.getPatternMatcher();
        if (!patternMatcher) {
            throw new Error('PatternMatcher not available (WASM backend or not initialized)');
        }
        const pattern = PatternSchema.parse(args.pattern);
        // Add default iterations field required by PatternMetadata
        const patternWithIterations = {
            ...pattern,
            metadata: {
                ...pattern.metadata,
                iterations: 1, // Initial iteration count
            },
        };
        const id = await patternMatcher.storePattern(patternWithIterations);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        id,
                        message: 'Reasoning pattern stored successfully',
                    }, null, 2),
                },
            ],
        };
    }
    async handlePatternSearch(args) {
        const patternMatcher = this.registry.getPatternMatcher();
        if (!patternMatcher) {
            throw new Error('PatternMatcher not available (WASM backend or not initialized)');
        }
        const { taskEmbedding, k = 5, threshold = 0.7, filters } = args;
        const patterns = await patternMatcher.findSimilar(taskEmbedding, k, threshold, filters);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        patterns: patterns.map((p) => ({
                            id: p.id,
                            taskType: p.taskType,
                            approach: p.approach,
                            successRate: p.successRate,
                            avgDuration: p.avgDuration,
                            similarity: p.similarity,
                            metadata: p.metadata,
                        })),
                        count: patterns.length,
                        message: `Found ${patterns.length} similar patterns`,
                    }, null, 2),
                },
            ],
        };
    }
    async handlePatternStats(args) {
        const patternMatcher = this.registry.getPatternMatcher();
        if (!patternMatcher) {
            throw new Error('PatternMatcher not available (WASM backend or not initialized)');
        }
        const stats = patternMatcher.getStats();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        stats: {
                            totalPatterns: stats.totalPatterns,
                            avgSuccessRate: stats.avgSuccessRate,
                            domainDistribution: Object.fromEntries(stats.domainDistribution),
                            topPatterns: stats.topPatterns,
                        },
                        message: 'Pattern statistics retrieved successfully',
                    }, null, 2),
                },
            ],
        };
    }
    async handleClearCache(args) {
        const db = this.registry.get();
        if (!db) {
            throw new Error('Database not initialized. Call agentdb_init first.');
        }
        db.clearCache();
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Query cache cleared successfully',
                    }, null, 2),
                },
            ],
        };
    }
    async handleLearningTool(toolName, args) {
        if (!this.learningTools) {
            throw new Error('Learning tools not initialized. Call agentdb_init first.');
        }
        const result = await this.learningTools.handleToolCall(toolName, args);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        tool: toolName,
                        result,
                        timestamp: Date.now(),
                    }, null, 2),
                },
            ],
        };
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('AgentDB MCP Server started');
    }
    async cleanup() {
        console.error('Shutting down AgentDB MCP Server...');
        this.registry.close();
        await this.server.close();
    }
}
// ============================================================================
// Entry Point
// ============================================================================
async function main() {
    const server = new AgentDBMCPServer();
    try {
        await server.start();
    }
    catch (error) {
        console.error('Failed to start AgentDB MCP Server:', error);
        process.exit(1);
    }
}
// Only run if this is the main module
// Note: This check works in ESM modules. For CommonJS, check require.main === module
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
