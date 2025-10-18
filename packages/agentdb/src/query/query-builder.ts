/**
 * VectorQueryBuilder - Fluent API for building complex vector search queries
 * Provides type-safe filtering, sorting, and pagination with SQL injection protection
 */

import { SearchResult, SimilarityMetric, VectorMetadata } from '../types';
import { SQLiteVectorDB } from '../core/vector-db';

/**
 * Supported comparison operators
 */
export type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Filter condition
 */
interface FilterCondition {
  field: string;
  operator: Operator;
  value: any;
  isMetadata: boolean;
}

/**
 * Order clause
 */
interface OrderClause {
  field: string;
  direction: SortDirection;
  bySimilarity: boolean;
}

/**
 * VectorQueryBuilder - Fluent API for complex vector queries
 *
 * @template T - Type of metadata object
 *
 * @example
 * ```typescript
 * const results = await db.query()
 *   .similarTo(queryVector)
 *   .where('metadata.category', '=', 'tech')
 *   .whereBetween('metadata.year', 2020, 2024)
 *   .orderBySimilarity('asc')
 *   .limit(10)
 *   .execute();
 * ```
 */
export class VectorQueryBuilder<T = any> {
  private db: SQLiteVectorDB;
  private queryVector?: number[];
  private queryId?: string;
  private k: number = 10;
  private filters: FilterCondition[] = [];
  private orders: OrderClause[] = [];
  private limitValue?: number;
  private offsetValue: number = 0;
  private metric: SimilarityMetric = 'cosine';
  private threshold: number = 0.0;
  private rawSQL?: string;
  private rawParams?: any[];

  constructor(db: SQLiteVectorDB) {
    this.db = db;
  }

  /**
   * Search for vectors similar to the given vector
   *
   * @param vector - Query vector
   * @param k - Number of results to retrieve (default: 10)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query().similarTo([0.1, 0.2, 0.3], 5)
   * ```
   */
  similarTo(vector: number[], k?: number): this {
    this.queryVector = vector;
    if (k !== undefined) {
      this.k = k;
    }
    return this;
  }

  /**
   * Search for vectors similar to a vector already in the database
   *
   * @param id - ID of the reference vector
   * @param k - Number of results to retrieve (default: 10)
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query().similarToId('vector-123', 5)
   * ```
   */
  similarToId(id: string, k?: number): this {
    this.queryId = id;
    if (k !== undefined) {
      this.k = k;
    }
    return this;
  }

  /**
   * Add a filter condition
   *
   * @param field - Field name (use 'metadata.field' for metadata)
   * @param op - Comparison operator
   * @param value - Value to compare against
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query()
   *   .similarTo(vector)
   *   .where('metadata.category', '=', 'tech')
   *   .where('metadata.year', '>', 2020)
   * ```
   */
  where(field: string, op: Operator, value: any): this {
    const isMetadata = field.startsWith('metadata.');
    this.filters.push({
      field: isMetadata ? field.substring(9) : field, // Remove 'metadata.' prefix
      operator: op,
      value,
      isMetadata
    });
    return this;
  }

  /**
   * Filter where field is IN a set of values
   *
   * @param field - Field name
   * @param values - Array of values
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query()
   *   .similarTo(vector)
   *   .whereIn('metadata.tags', ['typescript', 'javascript'])
   * ```
   */
  whereIn(field: string, values: any[]): this {
    return this.where(field, 'IN', values);
  }

  /**
   * Filter where field is between min and max (inclusive)
   *
   * @param field - Field name
   * @param min - Minimum value
   * @param max - Maximum value
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query()
   *   .similarTo(vector)
   *   .whereBetween('metadata.year', 2020, 2024)
   * ```
   */
  whereBetween(field: string, min: any, max: any): this {
    this.where(field, '>=', min);
    this.where(field, '<=', max);
    return this;
  }

  /**
   * Filter metadata field (alias for where with 'metadata.' prefix)
   *
   * @param path - Metadata field path
   * @param op - Comparison operator
   * @param value - Value to compare against
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query()
   *   .similarTo(vector)
   *   .whereMetadata('author.verified', '=', true)
   * ```
   */
  whereMetadata(path: string, op: Operator, value: any): this {
    return this.where(`metadata.${path}`, op, value);
  }

  /**
   * Set similarity metric
   *
   * @param metric - Similarity metric ('cosine', 'euclidean', 'dot')
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query().similarTo(vector).useSimilarityMetric('euclidean')
   * ```
   */
  useSimilarityMetric(metric: SimilarityMetric): this {
    this.metric = metric;
    return this;
  }

  /**
   * Set minimum similarity threshold
   *
   * @param threshold - Minimum score threshold
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query().similarTo(vector).withThreshold(0.7)
   * ```
   */
  withThreshold(threshold: number): this {
    this.threshold = threshold;
    return this;
  }

  /**
   * Order results by a field
   *
   * @param field - Field name
   * @param direction - Sort direction ('asc' or 'desc')
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query()
   *   .similarTo(vector)
   *   .orderBy('metadata.timestamp', 'desc')
   * ```
   */
  orderBy(field: string, direction: SortDirection = 'asc'): this {
    this.orders.push({
      field,
      direction,
      bySimilarity: false
    });
    return this;
  }

  /**
   * Order results by similarity score
   *
   * @param direction - Sort direction ('asc' or 'desc', default: 'desc')
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query()
   *   .similarTo(vector)
   *   .orderBySimilarity('asc') // Least similar first
   * ```
   */
  orderBySimilarity(direction: SortDirection = 'desc'): this {
    this.orders.push({
      field: 'score',
      direction,
      bySimilarity: true
    });
    return this;
  }

  /**
   * Limit number of results
   *
   * @param n - Maximum number of results
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query().similarTo(vector).limit(10)
   * ```
   */
  limit(n: number): this {
    if (n < 0) {
      throw new Error('Limit must be non-negative');
    }
    this.limitValue = n;
    return this;
  }

  /**
   * Skip first n results
   *
   * @param n - Number of results to skip
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query().similarTo(vector).offset(20).limit(10) // Get results 21-30
   * ```
   */
  offset(n: number): this {
    if (n < 0) {
      throw new Error('Offset must be non-negative');
    }
    this.offsetValue = n;
    return this;
  }

  /**
   * Alias for offset
   */
  skip(n: number): this {
    return this.offset(n);
  }

  /**
   * Alias for limit
   */
  take(n: number): this {
    return this.limit(n);
  }

  /**
   * Execute raw SQL query (advanced usage)
   *
   * @param sql - Raw SQL query
   * @param params - Query parameters
   * @returns this for chaining
   *
   * @example
   * ```typescript
   * db.query()
   *   .raw('SELECT * FROM vectors WHERE metadata->>"$.category" = ?', ['tech'])
   *   .execute()
   * ```
   */
  raw(sql: string, params?: any[]): this {
    this.rawSQL = sql;
    this.rawParams = params;
    return this;
  }

  /**
   * Type-safe metadata wrapper
   *
   * @returns QueryBuilder with typed metadata
   *
   * @example
   * ```typescript
   * interface BlogPost {
   *   title: string;
   *   author: string;
   * }
   *
   * const posts = await db.query()
   *   .withMetadata<BlogPost>()
   *   .similarTo(vector)
   *   .execute();
   *
   * // posts[0].metadata.title is typed as string
   * ```
   */
  withMetadata<M>(): VectorQueryBuilder<M> {
    return this as any as VectorQueryBuilder<M>;
  }

  /**
   * Execute the query and return all results
   *
   * @returns Promise resolving to array of search results
   *
   * @example
   * ```typescript
   * const results = await db.query()
   *   .similarTo(vector)
   *   .where('metadata.category', '=', 'tech')
   *   .limit(10)
   *   .execute();
   * ```
   */
  async execute(): Promise<SearchResult<T>[]> {
    // If raw SQL is provided, use it (advanced usage)
    if (this.rawSQL) {
      return this.executeRaw();
    }

    // Get query vector
    let vector = this.queryVector;
    if (this.queryId) {
      const refVector = this.db.get(this.queryId);
      if (!refVector) {
        throw new Error(`Vector with ID ${this.queryId} not found`);
      }
      vector = refVector.embedding;
    }

    if (!vector) {
      throw new Error('Must specify query vector using similarTo() or similarToId()');
    }

    // Perform initial vector search
    let results = this.db.search(vector, this.k, this.metric, this.threshold) as SearchResult<T>[];

    // Apply filters
    results = this.applyFilters(results);

    // Apply sorting
    results = this.applySorting(results);

    // Apply pagination
    results = this.applyPagination(results);

    return results;
  }

  /**
   * Execute query and return first result
   *
   * @returns Promise resolving to first result or null
   *
   * @example
   * ```typescript
   * const best = await db.query()
   *   .similarTo(vector)
   *   .first();
   * ```
   */
  async first(): Promise<SearchResult<T> | null> {
    const results = await this.limit(1).execute();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Count results without retrieving them
   *
   * @returns Promise resolving to count
   *
   * @example
   * ```typescript
   * const count = await db.query()
   *   .similarTo(vector)
   *   .where('metadata.category', '=', 'tech')
   *   .count();
   * ```
   */
  async count(): Promise<number> {
    const results = await this.execute();
    return results.length;
  }

  /**
   * Apply filters to results
   */
  private applyFilters(results: SearchResult<T>[]): SearchResult<T>[] {
    if (this.filters.length === 0) {
      return results;
    }

    return results.filter(result => {
      return this.filters.every(filter => {
        const value = filter.isMetadata
          ? this.getNestedValue(result.metadata, filter.field)
          : (result as any)[filter.field];

        return this.matchesCondition(value, filter.operator, filter.value);
      });
    });
  }

  /**
   * Get nested object value by path
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Check if value matches condition
   */
  private matchesCondition(value: any, operator: Operator, target: any): boolean {
    if (value === undefined || value === null) {
      return operator === '!=' && target !== undefined && target !== null;
    }

    switch (operator) {
      case '=':
        return value === target;
      case '!=':
        return value !== target;
      case '>':
        return value > target;
      case '>=':
        return value >= target;
      case '<':
        return value < target;
      case '<=':
        return value <= target;
      case 'LIKE':
        if (typeof value !== 'string' || typeof target !== 'string') {
          return false;
        }
        const pattern = target.replace(/%/g, '.*').replace(/_/g, '.');
        return new RegExp(`^${pattern}$`, 'i').test(value);
      case 'IN':
        if (!Array.isArray(target)) {
          throw new Error('IN operator requires array value');
        }
        return target.includes(value);
      default:
        return false;
    }
  }

  /**
   * Apply sorting to results
   */
  private applySorting(results: SearchResult<T>[]): SearchResult<T>[] {
    if (this.orders.length === 0) {
      return results;
    }

    return [...results].sort((a, b) => {
      for (const order of this.orders) {
        let aVal: any;
        let bVal: any;

        if (order.bySimilarity) {
          aVal = a.score;
          bVal = b.score;
        } else if (order.field.startsWith('metadata.')) {
          const field = order.field.substring(9);
          aVal = this.getNestedValue(a.metadata, field);
          bVal = this.getNestedValue(b.metadata, field);
        } else {
          aVal = (a as any)[order.field];
          bVal = (b as any)[order.field];
        }

        // Handle null/undefined
        if (aVal === undefined || aVal === null) {
          return order.direction === 'asc' ? 1 : -1;
        }
        if (bVal === undefined || bVal === null) {
          return order.direction === 'asc' ? -1 : 1;
        }

        // Compare values
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;

        if (comparison !== 0) {
          return order.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  /**
   * Apply pagination to results
   */
  private applyPagination(results: SearchResult<T>[]): SearchResult<T>[] {
    let paginated = results;

    if (this.offsetValue > 0) {
      paginated = paginated.slice(this.offsetValue);
    }

    if (this.limitValue !== undefined) {
      paginated = paginated.slice(0, this.limitValue);
    }

    return paginated;
  }

  /**
   * Execute raw SQL query (advanced)
   */
  private async executeRaw(): Promise<SearchResult<T>[]> {
    // This would require direct database access
    // For now, throw an error - can be implemented later with backend support
    throw new Error('Raw SQL queries not yet implemented. Use standard query methods.');
  }
}
