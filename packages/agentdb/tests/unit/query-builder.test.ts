/**
 * Comprehensive unit tests for VectorQueryBuilder
 */

import { SQLiteVectorDB } from '../../src/core/vector-db';
import { VectorQueryBuilder } from '../../src/query/query-builder';
import { SearchResult } from '../../src/types';

// Mock data for testing
const mockVectors = [
  { id: 'vec1', embedding: [1, 0, 0], metadata: { category: 'tech', year: 2023, author: 'Alice', verified: true } },
  { id: 'vec2', embedding: [0, 1, 0], metadata: { category: 'tech', year: 2022, author: 'Bob', verified: false } },
  { id: 'vec3', embedding: [0, 0, 1], metadata: { category: 'health', year: 2024, author: 'Charlie', verified: true } },
  { id: 'vec4', embedding: [0.5, 0.5, 0], metadata: { category: 'finance', year: 2021, author: 'Alice', verified: true } },
  { id: 'vec5', embedding: [0, 0.5, 0.5], metadata: { category: 'tech', year: 2023, author: 'David', verified: false } },
];

const mockSearchResults: SearchResult[] = [
  { id: 'vec1', score: 0.95, embedding: [1, 0, 0], metadata: { category: 'tech', year: 2023, author: 'Alice', verified: true } },
  { id: 'vec2', score: 0.85, embedding: [0, 1, 0], metadata: { category: 'tech', year: 2022, author: 'Bob', verified: false } },
  { id: 'vec3', score: 0.75, embedding: [0, 0, 1], metadata: { category: 'health', year: 2024, author: 'Charlie', verified: true } },
  { id: 'vec4', score: 0.65, embedding: [0.5, 0.5, 0], metadata: { category: 'finance', year: 2021, author: 'Alice', verified: true } },
  { id: 'vec5', score: 0.55, embedding: [0, 0.5, 0.5], metadata: { category: 'tech', year: 2023, author: 'David', verified: false } },
];

describe('VectorQueryBuilder', () => {
  let db: SQLiteVectorDB;
  let queryBuilder: VectorQueryBuilder;

  beforeEach(() => {
    // Create in-memory database
    db = new SQLiteVectorDB({ memoryMode: true });

    // Mock the search method to return controlled results
    jest.spyOn(db, 'search').mockReturnValue([...mockSearchResults]);

    // Mock get method for similarToId
    jest.spyOn(db, 'get').mockImplementation((id: string) => {
      const vec = mockVectors.find(v => v.id === id);
      return vec || null;
    });

    queryBuilder = new VectorQueryBuilder(db);
  });

  describe('Basic Vector Search', () => {
    it('should create query with similarTo', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .execute();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(db.search).toHaveBeenCalledWith([1, 0, 0], 10, 'cosine', 0.0);
    });

    it('should support custom k value', async () => {
      await queryBuilder
        .similarTo([1, 0, 0], 5)
        .execute();

      expect(db.search).toHaveBeenCalledWith([1, 0, 0], 5, 'cosine', 0.0);
    });

    it('should support similarToId', async () => {
      const results = await queryBuilder
        .similarToId('vec1')
        .execute();

      expect(db.get).toHaveBeenCalledWith('vec1');
      expect(db.search).toHaveBeenCalledWith([1, 0, 0], 10, 'cosine', 0.0);
      expect(results).toBeDefined();
    });

    it('should throw error if vector not found with similarToId', async () => {
      jest.spyOn(db, 'get').mockReturnValue(null);

      await expect(
        queryBuilder.similarToId('nonexistent').execute()
      ).rejects.toThrow('Vector with ID nonexistent not found');
    });

    it('should throw error if no query vector specified', async () => {
      await expect(
        queryBuilder.execute()
      ).rejects.toThrow('Must specify query vector');
    });
  });

  describe('Filter Operations', () => {
    it('should filter with where equals', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.category', '=', 'tech')
        .execute();

      expect(results).toHaveLength(3);
      expect(results.every(r => r.metadata?.category === 'tech')).toBe(true);
    });

    it('should filter with where not equals', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.category', '!=', 'tech')
        .execute();

      expect(results).toHaveLength(2);
      expect(results.every(r => r.metadata?.category !== 'tech')).toBe(true);
    });

    it('should filter with greater than', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.year', '>', 2022)
        .execute();

      expect(results.every(r => (r.metadata?.year as number) > 2022)).toBe(true);
    });

    it('should filter with greater than or equal', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.year', '>=', 2023)
        .execute();

      expect(results.every(r => (r.metadata?.year as number) >= 2023)).toBe(true);
    });

    it('should filter with less than', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.year', '<', 2023)
        .execute();

      expect(results.every(r => (r.metadata?.year as number) < 2023)).toBe(true);
    });

    it('should filter with less than or equal', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.year', '<=', 2022)
        .execute();

      expect(results.every(r => (r.metadata?.year as number) <= 2022)).toBe(true);
    });

    it('should filter with LIKE operator', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.author', 'LIKE', 'A%')
        .execute();

      expect(results.every(r =>
        typeof r.metadata?.author === 'string' && r.metadata.author.startsWith('A')
      )).toBe(true);
    });

    it('should filter with whereIn', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .whereIn('metadata.author', ['Alice', 'Bob'])
        .execute();

      expect(results.every(r =>
        r.metadata?.author === 'Alice' || r.metadata?.author === 'Bob'
      )).toBe(true);
    });

    it('should filter with whereBetween', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .whereBetween('metadata.year', 2022, 2023)
        .execute();

      expect(results.every(r => {
        const year = r.metadata?.year as number;
        return year >= 2022 && year <= 2023;
      })).toBe(true);
    });

    it('should filter with whereMetadata', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .whereMetadata('verified', '=', true)
        .execute();

      expect(results.every(r => r.metadata?.verified === true)).toBe(true);
    });

    it('should support multiple filters (AND logic)', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.category', '=', 'tech')
        .where('metadata.year', '>=', 2023)
        .where('metadata.verified', '=', true)
        .execute();

      expect(results).toHaveLength(1);
      expect(results[0].metadata?.category).toBe('tech');
      expect(results[0].metadata?.year).toBeGreaterThanOrEqual(2023);
      expect(results[0].metadata?.verified).toBe(true);
    });

    it('should handle nested metadata paths', async () => {
      // Add mock data with nested metadata
      const nestedResults: SearchResult[] = [
        {
          id: 'vec1',
          score: 0.95,
          embedding: [1, 0, 0],
          metadata: { author: { name: 'Alice', verified: true } }
        }
      ];

      jest.spyOn(db, 'search').mockReturnValue(nestedResults);

      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.author.verified', '=', true)
        .execute();

      expect(results).toHaveLength(1);
    });
  });

  describe('Sorting', () => {
    it('should sort by similarity score descending (default)', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .orderBySimilarity()
        .execute();

      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
    });

    it('should sort by similarity score ascending', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .orderBySimilarity('asc')
        .execute();

      expect(results[0].score).toBeLessThanOrEqual(results[1].score);
      expect(results[1].score).toBeLessThanOrEqual(results[2].score);
    });

    it('should sort by metadata field ascending', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .orderBy('metadata.year', 'asc')
        .execute();

      for (let i = 0; i < results.length - 1; i++) {
        const year1 = results[i].metadata?.year as number;
        const year2 = results[i + 1].metadata?.year as number;
        expect(year1).toBeLessThanOrEqual(year2);
      }
    });

    it('should sort by metadata field descending', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .orderBy('metadata.year', 'desc')
        .execute();

      for (let i = 0; i < results.length - 1; i++) {
        const year1 = results[i].metadata?.year as number;
        const year2 = results[i + 1].metadata?.year as number;
        expect(year1).toBeGreaterThanOrEqual(year2);
      }
    });

    it('should support multiple sort orders', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .orderBy('metadata.category', 'asc')
        .orderBy('metadata.year', 'desc')
        .execute();

      // Verify primary sort by category
      for (let i = 0; i < results.length - 1; i++) {
        const cat1 = results[i].metadata?.category as string;
        const cat2 = results[i + 1].metadata?.category as string;

        if (cat1 === cat2) {
          // If categories are same, verify secondary sort by year
          const year1 = results[i].metadata?.year as number;
          const year2 = results[i + 1].metadata?.year as number;
          expect(year1).toBeGreaterThanOrEqual(year2);
        } else {
          expect(cat1.localeCompare(cat2)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should handle null values in sorting', async () => {
      const resultsWithNull: SearchResult[] = [
        { id: 'vec1', score: 0.95, embedding: [1, 0, 0], metadata: { year: 2023 } },
        { id: 'vec2', score: 0.85, embedding: [0, 1, 0], metadata: {} },
      ];

      jest.spyOn(db, 'search').mockReturnValue(resultsWithNull);

      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .orderBy('metadata.year', 'asc')
        .execute();

      expect(results).toHaveLength(2);
      // Null values should be sorted to the end
      expect(results[0].metadata?.year).toBeDefined();
    });
  });

  describe('Pagination', () => {
    it('should limit results', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .limit(3)
        .execute();

      expect(results).toHaveLength(3);
    });

    it('should skip results with offset', async () => {
      const allResults = await queryBuilder
        .similarTo([1, 0, 0])
        .execute();

      const offsetResults = await queryBuilder
        .similarTo([1, 0, 0])
        .offset(2)
        .execute();

      expect(offsetResults[0].id).toBe(allResults[2].id);
    });

    it('should combine offset and limit', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .offset(1)
        .limit(2)
        .execute();

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('vec2');
      expect(results[1].id).toBe('vec3');
    });

    it('should support skip alias', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .skip(2)
        .execute();

      const offsetResults = await queryBuilder
        .similarTo([1, 0, 0])
        .offset(2)
        .execute();

      expect(results).toEqual(offsetResults);
    });

    it('should support take alias', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .take(3)
        .execute();

      expect(results).toHaveLength(3);
    });

    it('should throw error for negative limit', () => {
      expect(() => queryBuilder.limit(-1)).toThrow('Limit must be non-negative');
    });

    it('should throw error for negative offset', () => {
      expect(() => queryBuilder.offset(-1)).toThrow('Offset must be non-negative');
    });
  });

  describe('Execution Methods', () => {
    it('should execute and return all results', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .execute();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return first result', async () => {
      const result = await queryBuilder
        .similarTo([1, 0, 0])
        .orderBySimilarity()
        .first();

      expect(result).toBeDefined();
      expect(result?.id).toBe('vec1');
      expect(result?.score).toBe(0.95);
    });

    it('should return null if no results', async () => {
      jest.spyOn(db, 'search').mockReturnValue([]);

      const result = await queryBuilder
        .similarTo([1, 0, 0])
        .first();

      expect(result).toBeNull();
    });

    it('should count results', async () => {
      const count = await queryBuilder
        .similarTo([1, 0, 0])
        .count();

      expect(count).toBe(5);
    });

    it('should count filtered results', async () => {
      const count = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.category', '=', 'tech')
        .count();

      expect(count).toBe(3);
    });
  });

  describe('Similarity Metrics and Threshold', () => {
    it('should support cosine similarity metric', async () => {
      await queryBuilder
        .similarTo([1, 0, 0])
        .useSimilarityMetric('cosine')
        .execute();

      expect(db.search).toHaveBeenCalledWith([1, 0, 0], 10, 'cosine', 0.0);
    });

    it('should support euclidean similarity metric', async () => {
      await queryBuilder
        .similarTo([1, 0, 0])
        .useSimilarityMetric('euclidean')
        .execute();

      expect(db.search).toHaveBeenCalledWith([1, 0, 0], 10, 'euclidean', 0.0);
    });

    it('should support dot product similarity metric', async () => {
      await queryBuilder
        .similarTo([1, 0, 0])
        .useSimilarityMetric('dot')
        .execute();

      expect(db.search).toHaveBeenCalledWith([1, 0, 0], 10, 'dot', 0.0);
    });

    it('should support threshold', async () => {
      await queryBuilder
        .similarTo([1, 0, 0])
        .withThreshold(0.7)
        .execute();

      expect(db.search).toHaveBeenCalledWith([1, 0, 0], 10, 'cosine', 0.7);
    });
  });

  describe('Type Safety', () => {
    it('should support typed metadata', async () => {
      interface BlogPost {
        title: string;
        author: string;
        tags: string[];
      }

      const builder = queryBuilder.withMetadata<BlogPost>();

      // TypeScript should infer correct types
      const results = await builder
        .similarTo([1, 0, 0])
        .execute();

      // Runtime check
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Complex Queries', () => {
    it('should handle complex query with all features', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0], 50)
        .where('metadata.category', '=', 'tech')
        .whereBetween('metadata.year', 2022, 2024)
        .whereMetadata('verified', '=', true)
        .useSimilarityMetric('cosine')
        .withThreshold(0.5)
        .orderBySimilarity('desc')
        .orderBy('metadata.year', 'desc')
        .offset(0)
        .limit(10)
        .execute();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should chain methods fluently', async () => {
      const query = queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.category', '=', 'tech')
        .orderBy('metadata.year', 'desc')
        .limit(5);

      expect(query).toBeInstanceOf(VectorQueryBuilder);

      const results = await query.execute();
      expect(results).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty results', async () => {
      jest.spyOn(db, 'search').mockReturnValue([]);

      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .execute();

      expect(results).toEqual([]);
    });

    it('should handle filters that match nothing', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .where('metadata.category', '=', 'nonexistent')
        .execute();

      expect(results).toEqual([]);
    });

    it('should handle offset beyond results', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .offset(1000)
        .execute();

      expect(results).toEqual([]);
    });

    it('should handle limit of 0', async () => {
      const results = await queryBuilder
        .similarTo([1, 0, 0])
        .limit(0)
        .execute();

      expect(results).toEqual([]);
    });
  });

  describe('Raw SQL (Not Yet Implemented)', () => {
    it('should throw error for raw SQL queries', async () => {
      await expect(
        queryBuilder
          .raw('SELECT * FROM vectors')
          .execute()
      ).rejects.toThrow('Raw SQL queries not yet implemented');
    });
  });
});
