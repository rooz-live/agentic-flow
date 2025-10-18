/**
 * SessionManager - Manages learning session lifecycle and state
 */
export class SessionManager {
    constructor(db) {
        this.activeSessions = new Map();
        this.db = db;
    }
    /**
     * Create a new learning session
     */
    async createSession(userId, sessionType, plugin, config = {}) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = {
            sessionId,
            userId,
            sessionType,
            plugin,
            status: 'active',
            startTime: Date.now(),
            experienceCount: 0,
            config,
        };
        this.activeSessions.set(sessionId, session);
        await this.persistSession(session);
        return session;
    }
    /**
     * Get active session by ID
     */
    getSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    /**
     * Get all active sessions for a user
     */
    getUserSessions(userId) {
        return Array.from(this.activeSessions.values()).filter((session) => session.userId === userId && session.status === 'active');
    }
    /**
     * Pause a learning session
     */
    async pauseSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.status = 'paused';
        await this.persistSession(session);
    }
    /**
     * Resume a paused session
     */
    async resumeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        if (session.status !== 'paused') {
            throw new Error(`Session ${sessionId} is not paused`);
        }
        session.status = 'active';
        await this.persistSession(session);
    }
    /**
     * End a learning session
     */
    async endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.status = 'ended';
        session.endTime = Date.now();
        await this.persistSession(session);
        this.activeSessions.delete(sessionId);
        return session;
    }
    /**
     * Update session experience count
     */
    incrementExperienceCount(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.experienceCount++;
        }
    }
    /**
     * Update session policy
     */
    async updateSessionPolicy(sessionId, policy) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        session.currentPolicy = policy;
        await this.persistSession(session);
    }
    /**
     * Get session metrics
     */
    getSessionMetrics(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const endTime = session.endTime || Date.now();
        const duration = endTime - session.startTime;
        return {
            duration,
            experienceCount: session.experienceCount,
            status: session.status,
        };
    }
    /**
     * Persist session to vector database
     */
    async persistSession(session) {
        // Create a simple embedding for session metadata
        const sessionText = JSON.stringify({
            userId: session.userId,
            sessionType: session.sessionType,
            plugin: session.plugin,
        });
        const embedding = new Float32Array(768);
        for (let i = 0; i < sessionText.length; i++) {
            const index = sessionText.charCodeAt(i) % 768;
            embedding[index] += 1;
        }
        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= magnitude;
            }
        }
        await this.db.insert({
            embedding: Array.from(embedding),
            metadata: {
                type: 'learning_session',
                sessionId: session.sessionId,
                userId: session.userId,
                sessionType: session.sessionType,
                plugin: session.plugin,
                status: session.status,
                startTime: session.startTime,
                endTime: session.endTime,
                experienceCount: session.experienceCount,
                config: session.config,
                currentPolicy: session.currentPolicy,
            },
        });
    }
    /**
     * Restore sessions from database
     */
    async restoreSessions(userId) {
        const filter = { type: 'learning_session', status: 'active' };
        if (userId) {
            filter.userId = userId;
        }
        const results = await this.db.search(Array(768).fill(0), 1000);
        const sessions = [];
        for (const result of results) {
            const session = {
                sessionId: result.metadata.sessionId,
                userId: result.metadata.userId,
                sessionType: result.metadata.sessionType,
                plugin: result.metadata.plugin,
                status: result.metadata.status,
                startTime: result.metadata.startTime,
                endTime: result.metadata.endTime,
                experienceCount: result.metadata.experienceCount,
                config: result.metadata.config,
                currentPolicy: result.metadata.currentPolicy,
            };
            this.activeSessions.set(session.sessionId, session);
            sessions.push(session);
        }
        return sessions;
    }
    /**
     * Cleanup old sessions
     */
    async cleanupOldSessions(maxAge = 7 * 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - maxAge;
        let cleaned = 0;
        for (const [sessionId, session] of this.activeSessions.entries()) {
            const endTime = session.endTime || Date.now();
            if (endTime < cutoff && session.status === 'ended') {
                this.activeSessions.delete(sessionId);
                cleaned++;
            }
        }
        return cleaned;
    }
}
