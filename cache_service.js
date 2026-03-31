/**
 * Cache Service - Node.js Express API
 * Pure JS implementation for immediate testing
 * (Replace with NAPI-RS bindings for production)
 */

const express = require('express');

const app = express();
app.use(express.json());

// Pure JavaScript LRU Cache implementation (mock for testing)
class MockCacheService {
  constructor(capacity = 10000) {
    this.capacity = capacity;
    this.store = new Map(); // Maintains insertion order (LRU-like)
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  insert(key, value, ttlSeconds = 3600) {
    // Evict if at capacity
    if (this.store.size >= this.capacity && !this.store.has(key)) {
      // Remove expired first
      const now = Date.now();
      for (const [k, entry] of this.store) {
        if (entry.ttlSeconds > 0 && (now - entry.timestamp) / 1000 > entry.ttlSeconds) {
          this.store.delete(k);
          this.stats.evictions++;
        }
      }
      
      // If still at capacity, remove oldest (first item)
      if (this.store.size >= this.capacity) {
        const firstKey = this.store.keys().next().value;
        this.store.delete(firstKey);
        this.stats.evictions++;
      }
    }
    
    this.store.set(key, {
      value,
      timestamp: Date.now(),
      ttlSeconds,
      hitCount: 0
    });
    return true;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check TTL
    if (entry.ttlSeconds > 0) {
      const age = (Date.now() - entry.timestamp) / 1000;
      if (age > entry.ttlSeconds) {
        this.store.delete(key);
        this.stats.evictions++;
        this.stats.misses++;
        return null;
      }
    }
    
    entry.hitCount++;
    this.stats.hits++;
    
    // Move to end (most recently used)
    this.store.delete(key);
    this.store.set(key, entry);
    
    return entry.value;
  }

  remove(key) {
    return this.store.delete(key);
  }

  clear() {
    const count = this.store.size;
    this.store.clear();
    this.stats.evictions += count;
    return count;
  }

  statistics() {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.store.size,
      capacity: this.capacity,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  keys() {
    return Array.from(this.store.keys());
  }
}

// Initialize cache
const cache = new MockCacheService(10000);

// Cache metrics for dashboard
let requestMetrics = {
  totalRequests: 0,
  avgResponseTime: 0,
  lastUpdated: new Date().toISOString()
};

/**
 * POST /insert
 * Insert a key-value pair into cache
 * Body: { key: string, value: string, ttlSeconds?: number }
 */
app.post('/insert', (req, res) => {
  const start = Date.now();
  
  try {
    const { key, value, ttlSeconds = 3600 } = req.body;
    
    if (!key || !value) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: key and value'
      });
    }
    
    const success = cache.insert(key, value, ttlSeconds);
    
    const responseTime = Date.now() - start;
    updateMetrics(responseTime);
    
    res.json({
      success,
      key,
      ttlSeconds,
      responseTimeMs: responseTime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /get/:key
 * Retrieve value by key
 */
app.get('/get/:key', (req, res) => {
  const start = Date.now();
  
  try {
    const { key } = req.params;
    const value = cache.get(key);
    
    const responseTime = Date.now() - start;
    updateMetrics(responseTime);
    
    if (value === null || value === undefined) {
      return res.status(404).json({
        success: false,
        error: 'Key not found or expired',
        key
      });
    }
    
    res.json({
      success: true,
      key,
      value,
      responseTimeMs: responseTime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /stats
 * Get cache statistics and metrics
 */
app.get('/stats', (req, res) => {
  try {
    const stats = cache.statistics();
    
    res.json({
      success: true,
      cache: {
        size: stats.size,
        capacity: stats.capacity,
        utilization: (stats.size / stats.capacity * 100).toFixed(2) + '%',
        hits: stats.hits,
        misses: stats.misses,
        evictions: stats.evictions,
        hitRate: (stats.hit_rate * 100).toFixed(2) + '%'
      },
      metrics: requestMetrics,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /remove
 * Remove a key from cache
 * Body: { key: string }
 */
app.post('/remove', (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: key'
      });
    }
    
    const removed = cache.remove(key);
    
    res.json({
      success: removed,
      key,
      message: removed ? 'Key removed' : 'Key not found'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /clear
 * Clear all cache entries
 */
app.post('/clear', (req, res) => {
  try {
    const count = cache.clear();
    
    res.json({
      success: true,
      cleared: count,
      message: `Cleared ${count} entries from cache`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /keys
 * Get all cache keys (debug endpoint)
 */
app.get('/keys', (req, res) => {
  try {
    const keys = cache.keys();
    
    res.json({
      success: true,
      count: keys.length,
      keys: keys.slice(0, 100) // Limit to first 100
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /batch
 * Batch insert multiple entries
 * Body: { entries: [{ key, value, ttlSeconds }] }
 */
app.post('/batch', (req, res) => {
  const start = Date.now();
  
  try {
    const { entries } = req.body;
    
    if (!Array.isArray(entries)) {
      return res.status(400).json({
        success: false,
        error: 'entries must be an array'
      });
    }
    
    const cacheEntries = entries.map(e => ({
      key: e.key,
      value: e.value,
      ttl_seconds: e.ttlSeconds || 3600,
      timestamp: Date.now(),
      hit_count: 0
    }));
    
    const count = cache.insert_batch(cacheEntries);
    
    const responseTime = Date.now() - start;
    updateMetrics(responseTime);
    
    res.json({
      success: true,
      inserted: count,
      total: entries.length,
      responseTimeMs: responseTime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  try {
    const stats = cache.statistics();
    
    res.json({
      status: 'healthy',
      cache: {
        operational: true,
        size: stats.size,
        capacity: stats.capacity
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Update request metrics
 */
function updateMetrics(responseTime) {
  requestMetrics.totalRequests++;
  
  // Rolling average
  const prevAvg = requestMetrics.avgResponseTime;
  const n = requestMetrics.totalRequests;
  requestMetrics.avgResponseTime = prevAvg + (responseTime - prevAvg) / n;
  requestMetrics.lastUpdated = new Date().toISOString();
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const PORT = process.env.CACHE_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Cache Service running on port ${PORT}`);
  console.log(`Cache capacity: 10,000 entries`);
  console.log(`Endpoints:`);
  console.log(`  POST /insert  - Insert key-value pair`);
  console.log(`  GET  /get/:key - Retrieve value`);
  console.log(`  GET  /stats   - Cache statistics`);
  console.log(`  POST /remove  - Remove key`);
  console.log(`  POST /clear   - Clear all entries`);
  console.log(`  GET  /keys    - List keys (debug)`);
  console.log(`  POST /batch   - Batch insert`);
  console.log(`  GET  /health  - Health check`);
});

module.exports = app;
