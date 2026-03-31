/**
 * Learned Circuit Breaker - P1-3 Implementation
 * ==============================================
 * Automatically learns optimal circuit breaker thresholds from failure history.
 * Updates thresholds weekly based on p95 failure rates.
 *
 * Features:
 * - Historical failure rate analysis (last 30 days)
 * - P95 percentile-based threshold calculation
 * - Automatic threshold updates (weekly)
 * - Manual override capability
 * - Audit trail for all threshold changes
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';
export class LearnedCircuitBreaker {
    db = null;
    goalieDir;
    configs = new Map();
    useFallback = false;
    constructor(goalieDir = '.goalie') {
        this.goalieDir = goalieDir;
        if (!existsSync(this.goalieDir)) {
            mkdirSync(this.goalieDir, { recursive: true });
        }
        this.initializeDatabase();
        this.loadConfigs();
    }
    initializeDatabase() {
        try {
            const dbPath = join(this.goalieDir, 'circuit_breaker.db');
            this.db = new Database(dbPath);
            // Create tables
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS service_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          service TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          success INTEGER NOT NULL,
          response_time_ms REAL,
          error_type TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS circuit_breaker_configs (
          service TEXT PRIMARY KEY,
          failure_threshold INTEGER NOT NULL,
          timeout_ms INTEGER NOT NULL,
          reset_timeout_ms INTEGER NOT NULL,
          half_open_max_requests INTEGER NOT NULL,
          last_learned TEXT NOT NULL,
          learning_enabled INTEGER NOT NULL,
          manual_override INTEGER,
          override_reason TEXT,
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS threshold_updates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          service TEXT NOT NULL,
          old_threshold INTEGER NOT NULL,
          new_threshold INTEGER NOT NULL,
          p95_failure_rate REAL NOT NULL,
          sample_size INTEGER NOT NULL,
          confidence REAL NOT NULL,
          timestamp TEXT NOT NULL,
          reason TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE INDEX IF NOT EXISTS idx_service_requests_service ON service_requests(service, timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_service_requests_ts ON service_requests(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_threshold_updates_service ON threshold_updates(service, timestamp DESC);
      `);
            console.log('✅ Circuit breaker database initialized');
        }
        catch (error) {
            console.warn('SQLite database not available, falling back to JSON:', error);
            this.useFallback = true;
            this.db = null;
        }
    }
    loadConfigs() {
        if (this.db && !this.useFallback) {
            this.loadConfigsFromDatabase();
        }
        else {
            this.loadConfigsFromJson();
        }
    }
    loadConfigsFromDatabase() {
        try {
            const stmt = this.db.prepare('SELECT * FROM circuit_breaker_configs');
            const rows = stmt.all();
            for (const row of rows) {
                this.configs.set(row.service, {
                    service: row.service,
                    failureThreshold: row.failure_threshold,
                    timeoutMs: row.timeout_ms,
                    resetTimeoutMs: row.reset_timeout_ms,
                    halfOpenMaxRequests: row.half_open_max_requests,
                    lastLearned: new Date(row.last_learned),
                    learningEnabled: row.learning_enabled === 1,
                    manualOverride: row.manual_override === 1,
                    overrideReason: row.override_reason
                });
            }
        }
        catch (error) {
            console.error('Failed to load configs from database:', error);
        }
    }
    loadConfigsFromJson() {
        const configPath = join(this.goalieDir, 'circuit_breaker_configs.json');
        if (!existsSync(configPath)) {
            return;
        }
        try {
            const content = readFileSync(configPath, 'utf-8');
            const configs = JSON.parse(content);
            for (const config of configs) {
                config.lastLearned = new Date(config.lastLearned);
                this.configs.set(config.service, config);
            }
        }
        catch (error) {
            console.error('Failed to load configs from JSON:', error);
        }
    }
    /**
     * Record a service request (success or failure)
     */
    recordRequest(service, success, responseTimeMs, errorType) {
        if (this.db && !this.useFallback) {
            try {
                const stmt = this.db.prepare(`
          INSERT INTO service_requests (service, timestamp, success, response_time_ms, error_type)
          VALUES (?, ?, ?, ?, ?)
        `);
                stmt.run(service, Math.floor(Date.now() / 1000), success ? 1 : 0, responseTimeMs || null, errorType || null);
            }
            catch (error) {
                console.error('Failed to record request:', error);
            }
        }
    }
    /**
     * Get failure history for a service over the last N days
     */
    async getFailureHistory(service, days = 30) {
        if (this.db && !this.useFallback) {
            return this.getFailureHistoryFromDatabase(service, days);
        }
        return [];
    }
    getFailureHistoryFromDatabase(service, days) {
        try {
            const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);
            const stmt = this.db.prepare(`
        SELECT 
          date(timestamp, 'unixepoch') as date,
          COUNT(*) as total_requests,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures,
          CAST(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as failure_rate,
          AVG(response_time_ms) as avg_response_time
        FROM service_requests
        WHERE service = ? AND timestamp > ?
        GROUP BY date(timestamp, 'unixepoch')
        ORDER BY date DESC
      `);
            const rows = stmt.all(service, cutoff);
            return rows.map(row => ({
                date: row.date,
                totalRequests: row.total_requests,
                failures: row.failures,
                failureRate: row.failure_rate,
                avgResponseTime: row.avg_response_time || 0
            }));
        }
        catch (error) {
            console.error('Failed to get failure history:', error);
            return [];
        }
    }
    /**
     * Calculate p95 failure rate from history
     */
    calculateP95FailureRate(history) {
        if (history.length === 0) {
            return 0;
        }
        const failureRates = history.map(h => h.failureRate).sort((a, b) => a - b);
        const p95Index = Math.ceil(failureRates.length * 0.95) - 1;
        return failureRates[p95Index] || 0;
    }
    /**
     * Calculate optimal threshold from p95 failure rate
     */
    calculateOptimalThreshold(p95FailureRate, avgRequestsPerDay) {
        // Threshold = p95_rate * avg_requests_per_day * 1.1 (10% buffer)
        // This allows for some variance above p95 before triggering
        const baseThreshold = p95FailureRate * avgRequestsPerDay * 1.1;
        // Round up and ensure minimum of 5
        return Math.max(5, Math.ceil(baseThreshold));
    }
    /**
     * Update thresholds from failure history for all services
     */
    async updateAllThresholds(days = 30) {
        const updates = [];
        const services = this.getMonitoredServices();
        for (const service of services) {
            const config = this.configs.get(service);
            // Skip if learning is disabled or manual override is active
            if (!config || !config.learningEnabled || config.manualOverride) {
                console.log(`⏭️  Skipping ${service}: learning disabled or manual override active`);
                continue;
            }
            try {
                const update = await this.updateServiceThreshold(service, days);
                if (update) {
                    updates.push(update);
                }
            }
            catch (error) {
                console.error(`Failed to update threshold for ${service}:`, error);
            }
        }
        return updates;
    }
    /**
     * Update threshold for a single service
     */
    async updateServiceThreshold(service, days = 30) {
        const history = await this.getFailureHistory(service, days);
        if (history.length < 7) {
            console.warn(`Insufficient data for ${service}: ${history.length} days (need 7+)`);
            return null;
        }
        const p95FailureRate = this.calculateP95FailureRate(history);
        const avgRequestsPerDay = history.reduce((sum, h) => sum + h.totalRequests, 0) / history.length;
        const newThreshold = this.calculateOptimalThreshold(p95FailureRate, avgRequestsPerDay);
        const config = this.configs.get(service) || this.getDefaultConfig(service);
        const oldThreshold = config.failureThreshold;
        // Only update if threshold changed significantly (>10% difference)
        const changePercent = Math.abs(newThreshold - oldThreshold) / oldThreshold;
        if (changePercent < 0.1) {
            console.log(`✓ ${service} threshold unchanged: ${oldThreshold} (change: ${(changePercent * 100).toFixed(1)}%)`);
            return null;
        }
        // Calculate confidence based on sample size
        const totalRequests = history.reduce((sum, h) => sum + h.totalRequests, 0);
        const confidence = Math.min(1.0, totalRequests / 1000); // Full confidence at 1000+ requests
        const update = {
            service,
            oldThreshold,
            newThreshold,
            p95FailureRate,
            sampleSize: history.length,
            confidence,
            timestamp: new Date(),
            reason: `Learned from ${history.length} days of history (${totalRequests} requests)`
        };
        // Update config
        config.failureThreshold = newThreshold;
        config.lastLearned = new Date();
        this.configs.set(service, config);
        // Persist update
        this.saveConfig(config);
        this.logThresholdUpdate(update);
        console.log(`✅ Updated ${service}: ${oldThreshold} → ${newThreshold} (p95: ${(p95FailureRate * 100).toFixed(2)}%, confidence: ${(confidence * 100).toFixed(0)}%)`);
        return update;
    }
    saveConfig(config) {
        if (this.db && !this.useFallback) {
            try {
                const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO circuit_breaker_configs 
          (service, failure_threshold, timeout_ms, reset_timeout_ms, half_open_max_requests, 
           last_learned, learning_enabled, manual_override, override_reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
                stmt.run(config.service, config.failureThreshold, config.timeoutMs, config.resetTimeoutMs, config.halfOpenMaxRequests, config.lastLearned.toISOString(), config.learningEnabled ? 1 : 0, config.manualOverride ? 1 : 0, config.overrideReason || null);
            }
            catch (error) {
                console.error('Failed to save config:', error);
            }
        }
        else {
            this.saveConfigsToJson();
        }
    }
    saveConfigsToJson() {
        const configPath = join(this.goalieDir, 'circuit_breaker_configs.json');
        const configs = Array.from(this.configs.values());
        writeFileSync(configPath, JSON.stringify(configs, null, 2));
    }
    logThresholdUpdate(update) {
        if (this.db && !this.useFallback) {
            try {
                const stmt = this.db.prepare(`
          INSERT INTO threshold_updates 
          (service, old_threshold, new_threshold, p95_failure_rate, sample_size, confidence, timestamp, reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
                stmt.run(update.service, update.oldThreshold, update.newThreshold, update.p95FailureRate, update.sampleSize, update.confidence, update.timestamp.toISOString(), update.reason);
            }
            catch (error) {
                console.error('Failed to log threshold update:', error);
            }
        }
    }
    /**
     * Get config for a service
     */
    getConfig(service) {
        return this.configs.get(service) || this.getDefaultConfig(service);
    }
    /**
     * Set manual override for a service
     */
    setManualOverride(service, threshold, reason) {
        const config = this.getConfig(service);
        config.failureThreshold = threshold;
        config.manualOverride = true;
        config.overrideReason = reason;
        config.lastLearned = new Date();
        this.configs.set(service, config);
        this.saveConfig(config);
        console.log(`🔧 Manual override set for ${service}: threshold=${threshold}, reason="${reason}"`);
    }
    /**
     * Remove manual override (re-enable learning)
     */
    removeManualOverride(service) {
        const config = this.getConfig(service);
        config.manualOverride = false;
        config.overrideReason = undefined;
        this.configs.set(service, config);
        this.saveConfig(config);
        console.log(`✅ Manual override removed for ${service}, learning re-enabled`);
    }
    getDefaultConfig(service) {
        return {
            service,
            failureThreshold: 10,
            timeoutMs: 30000,
            resetTimeoutMs: 60000,
            halfOpenMaxRequests: 3,
            lastLearned: new Date(),
            learningEnabled: true,
            manualOverride: false
        };
    }
    getMonitoredServices() {
        if (this.db && !this.useFallback) {
            try {
                const stmt = this.db.prepare('SELECT DISTINCT service FROM service_requests');
                const rows = stmt.all();
                return rows.map(row => row.service);
            }
            catch (error) {
                console.error('Failed to get monitored services:', error);
                return [];
            }
        }
        return Array.from(this.configs.keys());
    }
    /**
     * Get recent threshold updates
     */
    getRecentUpdates(limit = 10) {
        if (!this.db || this.useFallback) {
            return [];
        }
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM threshold_updates
        ORDER BY timestamp DESC
        LIMIT ?
      `);
            const rows = stmt.all(limit);
            return rows.map(row => ({
                service: row.service,
                oldThreshold: row.old_threshold,
                newThreshold: row.new_threshold,
                p95FailureRate: row.p95_failure_rate,
                sampleSize: row.sample_size,
                confidence: row.confidence,
                timestamp: new Date(row.timestamp),
                reason: row.reason
            }));
        }
        catch (error) {
            console.error('Failed to get recent updates:', error);
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
export default LearnedCircuitBreaker;
//# sourceMappingURL=learned-circuit-breaker.js.map