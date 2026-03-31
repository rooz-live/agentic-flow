/**
 * Semantic Pattern Logger - P1-2 Implementation
 * ==============================================
 * Adds semantic context (rationale) to pattern metrics with vector embeddings
 * for similarity search and knowledge preservation.
 *
 * Features:
 * - Rationale field for WHY patterns occurred
 * - Alternatives considered during decision-making
 * - Vector embeddings for semantic similarity search
 * - Integration with existing pattern_metrics.jsonl
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
export class SemanticPatternLogger {
    db = null;
    goalieDir;
    useFallback = false;
    embeddingCache = new Map();
    constructor(goalieDir = '.goalie') {
        this.goalieDir = goalieDir;
        if (!existsSync(this.goalieDir)) {
            mkdirSync(this.goalieDir, { recursive: true });
        }
        this.initializeDatabase();
    }
    initializeDatabase() {
        try {
            const dbPath = join(this.goalieDir, 'semantic_patterns.db');
            this.db = new Database(dbPath);
            // Create semantic patterns table
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS semantic_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          circle TEXT NOT NULL,
          ceremony TEXT NOT NULL,
          pattern TEXT NOT NULL,
          metric_value REAL NOT NULL,
          timestamp TEXT NOT NULL,
          rationale_why TEXT NOT NULL,
          rationale_context TEXT NOT NULL,
          rationale_decision_logic TEXT,
          rationale_alternatives TEXT,
          rationale_outcome_expected TEXT,
          rationale_outcome_actual TEXT,
          semantic_tags TEXT,
          embeddings BLOB,
          embedding_model TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE INDEX IF NOT EXISTS idx_semantic_patterns_ts ON semantic_patterns(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_semantic_patterns_pattern ON semantic_patterns(pattern);
        CREATE INDEX IF NOT EXISTS idx_semantic_patterns_circle ON semantic_patterns(circle, ceremony);
        CREATE INDEX IF NOT EXISTS idx_semantic_patterns_event_type ON semantic_patterns(event_type);
      `);
            console.log('✅ Semantic patterns database initialized');
        }
        catch (error) {
            console.warn('SQLite database not available, falling back to JSONL:', error);
            this.useFallback = true;
            this.db = null;
        }
    }
    /**
     * Log a semantic pattern with rationale and embeddings
     */
    async logPattern(metric) {
        // Generate embeddings if not provided
        if (!metric.embeddings) {
            const textForEmbedding = this.prepareTextForEmbedding(metric);
            metric.embeddings = await this.generateEmbeddings(textForEmbedding);
            metric.embedding_model = 'all-MiniLM-L6-v2';
        }
        if (this.db && !this.useFallback) {
            return this.logToDatabase(metric);
        }
        else {
            return this.logToJsonl(metric);
        }
    }
    prepareTextForEmbedding(metric) {
        // Combine key semantic fields for embedding
        return [
            metric.rationale.why,
            metric.rationale.context,
            metric.rationale.decision_logic,
            metric.pattern,
            metric.ceremony
        ].filter(Boolean).join(' ');
    }
    /**
     * Generate vector embeddings using Transformers.js
     */
    async generateEmbeddings(text) {
        // Check cache first
        if (this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text);
        }
        try {
            // Use Transformers.js (if available)
            const { pipeline } = await import('@xenova/transformers');
            const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            const output = await embedder(text, { pooling: 'mean', normalize: true });
            const embeddings = Array.from(output.data);
            // Cache for future use
            this.embeddingCache.set(text, embeddings);
            return embeddings;
        }
        catch (error) {
            console.warn('Transformers.js not available, using simple hash-based embedding:', error);
            return this.generateSimpleEmbedding(text);
        }
    }
    /**
     * Fallback: Generate simple hash-based embedding (384-dim)
     */
    generateSimpleEmbedding(text) {
        const hash = this.simpleHash(text);
        const embedding = new Array(384).fill(0);
        // Distribute hash across embedding dimensions
        for (let i = 0; i < embedding.length; i++) {
            embedding[i] = Math.sin(hash + i) * 0.5 + 0.5;
        }
        return embedding;
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    logToDatabase(metric) {
        const id = `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        try {
            const stmt = this.db.prepare(`
        INSERT INTO semantic_patterns (
          event_type, circle, ceremony, pattern, metric_value, timestamp,
          rationale_why, rationale_context, rationale_decision_logic, 
          rationale_alternatives, rationale_outcome_expected, rationale_outcome_actual,
          semantic_tags, embeddings, embedding_model
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const embeddingsBuffer = Buffer.from(new Float32Array(metric.embeddings).buffer);
            stmt.run(metric.event_type, metric.circle, metric.ceremony, metric.pattern, metric.metric_value, metric.timestamp.toISOString(), metric.rationale.why, metric.rationale.context, metric.rationale.decision_logic, JSON.stringify(metric.rationale.alternatives_considered), metric.rationale.outcome_expected, metric.rationale.outcome_actual || null, JSON.stringify(metric.semantic_tags), embeddingsBuffer, metric.embedding_model || 'all-MiniLM-L6-v2');
            return id;
        }
        catch (error) {
            console.error('Failed to log to database, falling back to JSONL:', error);
            return this.logToJsonl(metric);
        }
    }
    logToJsonl(metric) {
        const id = `pattern-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const logPath = join(this.goalieDir, 'semantic_patterns.jsonl');
        const entry = {
            id,
            ...metric,
            timestamp: metric.timestamp.toISOString()
        };
        appendFileSync(logPath, JSON.stringify(entry) + '\n');
        return id;
    }
    /**
     * Find similar patterns using cosine similarity
     */
    async findSimilarPatterns(queryText, limit = 10, minSimilarity = 0.5) {
        const queryEmbedding = await this.generateEmbeddings(queryText);
        if (this.db && !this.useFallback) {
            return this.findSimilarInDatabase(queryEmbedding, limit, minSimilarity);
        }
        else {
            return this.findSimilarInJsonl(queryEmbedding, limit, minSimilarity);
        }
    }
    async findSimilarInDatabase(queryEmbedding, limit, minSimilarity) {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM semantic_patterns
        WHERE embeddings IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1000
      `);
            const rows = stmt.all();
            const results = [];
            for (const row of rows) {
                const embeddings = new Float32Array(row.embeddings);
                const similarity = this.cosineSimilarity(queryEmbedding, Array.from(embeddings));
                if (similarity >= minSimilarity) {
                    results.push({
                        pattern: this.rowToMetric(row, Array.from(embeddings)),
                        similarity,
                        distance: this.euclideanDistance(queryEmbedding, Array.from(embeddings))
                    });
                }
            }
            // Sort by similarity (descending) and return top N
            return results
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        }
        catch (error) {
            console.error('Failed to search database:', error);
            return [];
        }
    }
    findSimilarInJsonl(queryEmbedding, limit, minSimilarity) {
        const logPath = join(this.goalieDir, 'semantic_patterns.jsonl');
        if (!existsSync(logPath)) {
            return [];
        }
        try {
            const content = readFileSync(logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l.trim());
            const results = [];
            for (const line of lines) {
                const metric = JSON.parse(line);
                if (metric.embeddings) {
                    const similarity = this.cosineSimilarity(queryEmbedding, metric.embeddings);
                    if (similarity >= minSimilarity) {
                        results.push({
                            pattern: metric,
                            similarity,
                            distance: this.euclideanDistance(queryEmbedding, metric.embeddings)
                        });
                    }
                }
            }
            return results
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        }
        catch (error) {
            console.error('Failed to read JSONL:', error);
            return [];
        }
    }
    rowToMetric(row, embeddings) {
        return {
            event_type: row.event_type,
            circle: row.circle,
            ceremony: row.ceremony,
            pattern: row.pattern,
            metric_value: row.metric_value,
            timestamp: new Date(row.timestamp),
            rationale: {
                why: row.rationale_why,
                context: row.rationale_context,
                decision_logic: row.rationale_decision_logic,
                alternatives_considered: JSON.parse(row.rationale_alternatives || '[]'),
                outcome_expected: row.rationale_outcome_expected,
                outcome_actual: row.rationale_outcome_actual
            },
            semantic_tags: JSON.parse(row.semantic_tags || '[]'),
            embeddings,
            embedding_model: row.embedding_model
        };
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same dimension');
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Calculate Euclidean distance between two vectors
     */
    euclideanDistance(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same dimension');
        }
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }
    /**
     * Get recent patterns with rationale
     */
    async getRecentPatterns(limit = 100) {
        if (this.db && !this.useFallback) {
            return this.getFromDatabase(limit);
        }
        else {
            return this.getFromJsonl(limit);
        }
    }
    getFromDatabase(limit) {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM semantic_patterns
        ORDER BY timestamp DESC
        LIMIT ?
      `);
            const rows = stmt.all(limit);
            return rows.map(row => {
                const embeddings = row.embeddings ? Array.from(new Float32Array(row.embeddings)) : undefined;
                return this.rowToMetric(row, embeddings || []);
            });
        }
        catch (error) {
            console.error('Failed to query database:', error);
            return [];
        }
    }
    getFromJsonl(limit) {
        const logPath = join(this.goalieDir, 'semantic_patterns.jsonl');
        if (!existsSync(logPath)) {
            return [];
        }
        try {
            const content = readFileSync(logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(l => l.trim());
            const patterns = lines
                .map(line => JSON.parse(line))
                .slice(-limit)
                .reverse();
            return patterns;
        }
        catch (error) {
            console.error('Failed to read JSONL:', error);
            return [];
        }
    }
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}
export default SemanticPatternLogger;
//# sourceMappingURL=semantic-pattern-logger.js.map