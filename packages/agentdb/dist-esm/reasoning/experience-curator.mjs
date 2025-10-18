/**
 * ExperienceCurator - Store and retrieve successful task execution experiences
 *
 * Curates high-quality experiences for learning and adaptation.
 * Scores experiences based on quality metrics and retrieves relevant ones.
 */
export class ExperienceCurator {
    constructor(db) {
        this.experienceTable = 'reasoning_experiences';
        this.db = db;
        this.initializeExperienceStorage();
    }
    initializeExperienceStorage() {
        const rawDb = this.db.getDatabase();
        rawDb.exec(`
      CREATE TABLE IF NOT EXISTS ${this.experienceTable} (
        id TEXT PRIMARY KEY,
        task_description TEXT NOT NULL,
        success INTEGER NOT NULL,
        duration REAL NOT NULL,
        approach TEXT NOT NULL,
        outcome TEXT NOT NULL,
        quality REAL NOT NULL,
        domain TEXT NOT NULL,
        agent_type TEXT,
        error_type TEXT,
        tokens_used INTEGER,
        iteration_count INTEGER DEFAULT 1,
        metadata TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_exp_success ON ${this.experienceTable}(success);
      CREATE INDEX IF NOT EXISTS idx_exp_quality ON ${this.experienceTable}(quality);
      CREATE INDEX IF NOT EXISTS idx_exp_domain ON ${this.experienceTable}(domain);
      CREATE INDEX IF NOT EXISTS idx_exp_timestamp ON ${this.experienceTable}(timestamp);
    `);
    }
    /**
     * Store a task execution experience
     */
    async storeExperience(experience) {
        const id = this.generateExperienceId();
        const timestamp = Date.now();
        // Calculate quality score if not provided
        const quality = experience.quality || this.calculateQualityScore(experience);
        // Store vector embedding for similarity matching
        this.db.insert({
            id: `exp_${id}`,
            embedding: experience.taskEmbedding,
            metadata: {
                type: 'experience',
                experienceId: id,
                success: experience.success,
                quality,
                domain: experience.metadata.domain
            },
            timestamp
        });
        // Store experience metadata
        const rawDb = this.db.getDatabase();
        const stmt = rawDb.prepare(`
      INSERT INTO ${this.experienceTable}
      (id, task_description, success, duration, approach, outcome, quality,
       domain, agent_type, error_type, tokens_used, iteration_count, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, experience.taskDescription, experience.success ? 1 : 0, experience.duration, experience.approach, experience.outcome, quality, experience.metadata.domain, experience.metadata.agentType || null, experience.metadata.errorType || null, experience.metadata.tokensUsed || null, experience.metadata.iterationCount || 1, JSON.stringify(experience.metadata), timestamp);
        return id;
    }
    /**
     * Calculate quality score for an experience
     * Factors: success, duration, token efficiency, iteration count
     */
    calculateQualityScore(experience) {
        let score = 0;
        // Success factor (60% weight)
        if (experience.success) {
            score += 0.6;
        }
        else {
            // Failed experiences can still be valuable for learning
            score += 0.1;
        }
        // Duration factor (20% weight) - faster is better
        const durationScore = Math.max(0, 1 - (experience.duration / 60000)); // Normalize to 1 minute
        score += durationScore * 0.2;
        // Token efficiency factor (10% weight)
        if (experience.metadata.tokensUsed) {
            const tokenScore = Math.max(0, 1 - (experience.metadata.tokensUsed / 10000)); // Normalize to 10k tokens
            score += tokenScore * 0.1;
        }
        // Iteration efficiency factor (10% weight)
        if (experience.metadata.iterationCount) {
            const iterationScore = Math.max(0, 1 - (experience.metadata.iterationCount / 5)); // Normalize to 5 iterations
            score += iterationScore * 0.1;
        }
        return Math.min(1, score);
    }
    /**
     * Query experiences similar to a task
     *
     * @param taskEmbedding - Vector embedding of current task
     * @param k - Number of experiences to return
     * @param filters - Optional filters
     * @returns Array of relevant experiences sorted by relevance
     */
    async queryExperiences(taskEmbedding, k = 10, filters) {
        const startTime = Date.now();
        // Search for similar experience embeddings
        const threshold = filters?.minQuality || 0.5;
        const results = this.db.search(taskEmbedding, k * 2, 'cosine', threshold);
        // Filter to experience vectors only
        const expResults = results.filter(r => r.metadata?.type === 'experience');
        // Get full experience metadata
        const rawDb = this.db.getDatabase();
        const experiences = [];
        for (const result of expResults) {
            const metadata = result.metadata || {};
            const expId = metadata.experienceId;
            let sql = `SELECT * FROM ${this.experienceTable} WHERE id = ?`;
            const params = [expId];
            if (filters?.successOnly) {
                sql += ' AND success = 1';
            }
            if (filters?.domain) {
                sql += ' AND domain = ?';
                params.push(filters.domain);
            }
            if (filters?.minQuality) {
                sql += ' AND quality >= ?';
                params.push(filters.minQuality);
            }
            if (filters?.maxAge) {
                const cutoffTime = Date.now() - filters.maxAge;
                sql += ' AND timestamp >= ?';
                params.push(cutoffTime);
            }
            const stmt = rawDb.prepare(sql);
            const row = stmt.get(...params);
            if (row) {
                const metadata = JSON.parse(row.metadata);
                experiences.push({
                    id: row.id,
                    taskEmbedding: result.embedding,
                    taskDescription: row.task_description,
                    success: row.success === 1,
                    duration: row.duration,
                    approach: row.approach,
                    outcome: row.outcome,
                    quality: row.quality,
                    metadata: {
                        ...metadata,
                        domain: row.domain,
                        agentType: row.agent_type,
                        errorType: row.error_type,
                        tokensUsed: row.tokens_used,
                        iterationCount: row.iteration_count
                    },
                    timestamp: row.timestamp,
                    relevance: result.score
                });
            }
            if (experiences.length >= k)
                break;
        }
        const duration = Date.now() - startTime;
        console.log(`[ExperienceCurator] Found ${experiences.length} experiences in ${duration}ms`);
        return experiences;
    }
    /**
     * Get best experiences for a domain
     */
    async getBestExperiences(domain, limit = 10) {
        const rawDb = this.db.getDatabase();
        const stmt = rawDb.prepare(`
      SELECT * FROM ${this.experienceTable}
      WHERE domain = ? AND success = 1
      ORDER BY quality DESC, timestamp DESC
      LIMIT ?
    `);
        const rows = stmt.all(domain, limit);
        return rows.map(row => {
            const vector = this.db.get(`exp_${row.id}`);
            const metadata = JSON.parse(row.metadata);
            return {
                id: row.id,
                taskEmbedding: vector?.embedding || [],
                taskDescription: row.task_description,
                success: row.success === 1,
                duration: row.duration,
                approach: row.approach,
                outcome: row.outcome,
                quality: row.quality,
                metadata: {
                    ...metadata,
                    domain: row.domain,
                    agentType: row.agent_type,
                    errorType: row.error_type,
                    tokensUsed: row.tokens_used,
                    iterationCount: row.iteration_count
                },
                timestamp: row.timestamp
            };
        });
    }
    /**
     * Get learning statistics
     */
    getStats() {
        const rawDb = this.db.getDatabase();
        // Total experiences
        const countStmt = rawDb.prepare(`SELECT COUNT(*) as count FROM ${this.experienceTable}`);
        const totalExperiences = countStmt.get().count;
        // Success rate
        const successStmt = rawDb.prepare(`
      SELECT AVG(success) as rate FROM ${this.experienceTable}
    `);
        const successRate = successStmt.get().rate || 0;
        // Average quality
        const qualityStmt = rawDb.prepare(`
      SELECT AVG(quality) as avg FROM ${this.experienceTable}
    `);
        const avgQuality = qualityStmt.get().avg || 0;
        // Average duration
        const durationStmt = rawDb.prepare(`
      SELECT AVG(duration) as avg FROM ${this.experienceTable}
    `);
        const avgDuration = durationStmt.get().avg || 0;
        // Domain breakdown
        const domainStmt = rawDb.prepare(`
      SELECT domain, COUNT(*) as count, AVG(success) as success_rate
      FROM ${this.experienceTable}
      GROUP BY domain
    `);
        const domainRows = domainStmt.all();
        const domainBreakdown = new Map(domainRows.map(row => [
            row.domain,
            { count: row.count, successRate: row.success_rate }
        ]));
        return {
            totalExperiences,
            successRate,
            avgQuality,
            avgDuration,
            domainBreakdown
        };
    }
    /**
     * Prune low-quality old experiences
     */
    async pruneExperiences(options) {
        const rawDb = this.db.getDatabase();
        const { minQuality = 0.3, maxAge = 30 * 24 * 60 * 60 * 1000, keepMinimum = 100 } = options;
        // Get count of experiences
        const countStmt = rawDb.prepare(`SELECT COUNT(*) as count FROM ${this.experienceTable}`);
        const totalCount = countStmt.get().count;
        if (totalCount <= keepMinimum) {
            return 0;
        }
        // Delete low-quality old experiences
        const cutoffTime = Date.now() - maxAge;
        const deleteStmt = rawDb.prepare(`
      DELETE FROM ${this.experienceTable}
      WHERE quality < ? AND timestamp < ?
      AND id NOT IN (
        SELECT id FROM ${this.experienceTable}
        ORDER BY quality DESC, timestamp DESC
        LIMIT ?
      )
    `);
        const result = deleteStmt.run(minQuality, cutoffTime, keepMinimum);
        // Clean up orphaned vectors
        const expIds = rawDb.prepare(`SELECT id FROM ${this.experienceTable}`).all()
            .map(row => `exp_${row.id}`);
        // Note: In a production system, you'd want to clean up orphaned vectors
        // For now, we'll leave them as they don't significantly impact performance
        return result.changes;
    }
    generateExperienceId() {
        return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
