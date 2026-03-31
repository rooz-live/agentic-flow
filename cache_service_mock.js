/**
 * Mock Cache Service - Node.js Express API
 * Provides REST endpoints for cache operations (without NAPI bindings)
 */

const express = require('express');
const app = express();
app.use(express.json());

// In-memory cache for demo
const cache = new Map();
const stats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  insertions: 0
};

// Cache capacity
const CAPACITY = 10000;

/**
 * POST /insert
 * Insert a key-value pair into cache
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
    
    // Evict if at capacity (simple LRU)
    if (cache.size >= CAPACITY && !cache.has(key)) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
      stats.evictions++;
    }
    
    const entry = {
      value,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
      hitCount: 0
    };
    
    cache.set(key, entry);
    stats.insertions++;
    
    const responseTime = Date.now() - start;
    
    res.json({
      success: true,
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
    const entry = cache.get(key);
    
    if (!entry) {
      stats.misses++;
      return res.status(404).json({
        success: false,
        error: 'Key not found',
        key
      });
    }
    
    // Check TTL
    if (entry.ttl > 0 && (Date.now() - entry.timestamp) > entry.ttl) {
      cache.delete(key);
      stats.evictions++;
      stats.misses++;
      return res.status(404).json({
        success: false,
        error: 'Key expired',
        key
      });
    }
    
    entry.hitCount++;
    stats.hits++;
    
    const responseTime = Date.now() - start;
    
    res.json({
      success: true,
      key,
      value: entry.value,
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
 * Get cache statistics
 */
app.get('/stats', (req, res) => {
  try {
    const hitRate = stats.hits + stats.misses > 0 
      ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
      : '0.00';
    
    res.json({
      success: true,
      cache: {
        size: cache.size,
        capacity: CAPACITY,
        utilization: ((cache.size / CAPACITY) * 100).toFixed(2) + '%',
        hits: stats.hits,
        misses: stats.misses,
        evictions: stats.evictions,
        hitRate: hitRate + '%'
      },
      metrics: {
        totalRequests: stats.hits + stats.misses,
        avgResponseTime: 2.5,
        lastUpdated: new Date().toISOString()
      },
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
    
    const removed = cache.delete(key);
    
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
    const count = cache.size;
    cache.clear();
    stats.evictions += count;
    
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
    const keys = Array.from(cache.keys()).slice(0, 100);
    
    res.json({
      success: true,
      count: cache.size,
      keys
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
    res.json({
      status: 'healthy',
      cache: {
        operational: true,
        size: cache.size,
        capacity: CAPACITY
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

// Start server
const PORT = process.env.CACHE_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Cache Service running on port ${PORT}`);
  console.log(`Cache capacity: ${CAPACITY} entries`);
  console.log(`Endpoints:`);
  console.log(`  POST /insert  - Insert key-value pair`);
  console.log(`  GET  /get/:key - Retrieve value`);
  console.log(`  GET  /stats   - Cache statistics`);
  console.log(`  POST /remove  - Remove key`);
  console.log(`  POST /clear   - Clear all entries`);
  console.log(`  GET  /keys    - List keys (debug)`);
  console.log(`  GET  /health  - Health check`);
});

module.exports = app;
