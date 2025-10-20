/**
 * Database configuration presets for common use cases
 * Provides convenient factory functions for different dataset sizes
 *
 * Note: Vector dimension is not part of DatabaseConfig - it's determined
 * by the actual vectors inserted. These presets configure database behavior,
 * caching, and optimization settings.
 */

import { DatabaseConfig } from './types';

export class Presets {
  /**
   * Small dataset preset (< 10K vectors)
   * Optimized for quick initialization and small-scale testing
   *
   * @param dimension - Vector dimension (for backward compatibility, not used)
   * @param path - Database file path (omit or use undefined for in-memory)
   * @returns Database configuration optimized for small datasets
   */
  static smallDataset(dimension?: number, path?: string): DatabaseConfig {
    return {
      path: path || undefined,
      memoryMode: !path || path === ':memory:',
      cacheSize: 100, // 100MB cache for small datasets
      walMode: true,
      queryCache: {
        enabled: true,
        maxSize: 1000,
        ttl: 60000, // 1 minute
        enableStats: true
      }
    };
  }

  /**
   * Medium dataset preset (10K - 100K vectors)
   * Balanced configuration for moderate-scale applications
   *
   * @param dimension - Vector dimension (for backward compatibility, not used)
   * @param path - Database file path (omit or use undefined for in-memory)
   * @returns Database configuration optimized for medium datasets
   */
  static mediumDataset(dimension?: number, path?: string): DatabaseConfig {
    return {
      path: path || undefined,
      memoryMode: !path || path === ':memory:',
      cacheSize: 500, // 500MB cache for medium datasets
      walMode: true,
      queryCache: {
        enabled: true,
        maxSize: 5000,
        ttl: 300000, // 5 minutes
        enableStats: true
      }
    };
  }

  /**
   * Large dataset preset (100K+ vectors)
   * High-performance configuration for large-scale production use
   *
   * @param dimension - Vector dimension (for backward compatibility, not used)
   * @param path - Database file path
   * @returns Database configuration optimized for large datasets
   */
  static largeDataset(dimension?: number, path?: string): DatabaseConfig {
    return {
      path: path || undefined,
      memoryMode: !path || path === ':memory:',
      cacheSize: 2000, // 2GB cache for large datasets
      walMode: true,
      mmapSize: 1073741824, // 1GB mmap
      queryCache: {
        enabled: true,
        maxSize: 10000,
        ttl: 600000, // 10 minutes
        enableStats: true
      }
    };
  }

  /**
   * In-memory preset
   * Fast, ephemeral database for testing and temporary operations
   *
   * @param dimension - Vector dimension (for backward compatibility, not used)
   * @returns Database configuration for in-memory database
   */
  static inMemory(dimension?: number): DatabaseConfig {
    return {
      memoryMode: true,
      cacheSize: 100,
      queryCache: {
        enabled: true,
        maxSize: 500,
        ttl: 60000,
        enableStats: true
      }
    };
  }

  /**
   * High-accuracy preset
   * Larger cache and longer TTL for better accuracy
   *
   * @param dimension - Vector dimension (for backward compatibility, not used)
   * @param path - Database file path
   * @returns Database configuration optimized for accuracy
   */
  static highAccuracy(dimension?: number, path?: string): DatabaseConfig {
    return {
      path: path || undefined,
      memoryMode: !path || path === ':memory:',
      cacheSize: 1000,
      walMode: true,
      queryCache: {
        enabled: true,
        maxSize: 20000,
        ttl: 1800000, // 30 minutes
        enableStats: true
      }
    };
  }

  /**
   * Fast search preset
   * Optimized for speed with minimal caching
   *
   * @param dimension - Vector dimension (for backward compatibility, not used)
   * @param path - Database file path
   * @returns Database configuration optimized for speed
   */
  static fastSearch(dimension?: number, path?: string): DatabaseConfig {
    return {
      path: path || undefined,
      memoryMode: !path || path === ':memory:',
      cacheSize: 50, // Minimal cache
      walMode: true,
      queryCache: {
        enabled: true,
        maxSize: 100,
        ttl: 10000, // 10 seconds
        enableStats: false
      }
    };
  }
}
