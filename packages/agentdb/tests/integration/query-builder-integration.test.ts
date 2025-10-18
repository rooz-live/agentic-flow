/**
 * Integration tests for VectorQueryBuilder with real SQLiteVectorDB
 * Tests end-to-end functionality with actual database operations
 */

import { SQLiteVectorDB } from '../../src/core/vector-db';

interface BlogPost {
  title: string;
  author: string;
  category: string;
  year: number;
  tags: string[];
  verified: boolean;
}

describe('VectorQueryBuilder Integration', () => {
  let db: SQLiteVectorDB;

  beforeEach(() => {
    // Create fresh in-memory database for each test
    db = new SQLiteVectorDB({ memoryMode: true });

    // Insert test data
    const testPosts: Array<{ embedding: number[]; metadata: BlogPost }> = [
      {
        embedding: [1.0, 0.0, 0.0],
        metadata: {
          title: 'Introduction to TypeScript',
          author: 'Alice',
          category: 'tech',
          year: 2023,
          tags: ['typescript', 'programming'],
          verified: true
        }
      },
      {
        embedding: [0.9, 0.1, 0.0],
        metadata: {
          title: 'Advanced TypeScript Patterns',
          author: 'Alice',
          category: 'tech',
          year: 2024,
          tags: ['typescript', 'advanced'],
          verified: true
        }
      },
      {
        embedding: [0.0, 1.0, 0.0],
        metadata: {
          title: 'Getting Started with Python',
          author: 'Bob',
          category: 'tech',
          year: 2022,
          tags: ['python', 'beginners'],
          verified: false
        }
      },
      {
        embedding: [0.0, 0.9, 0.1],
        metadata: {
          title: 'Python Data Science',
          author: 'Bob',
          category: 'tech',
          year: 2023,
          tags: ['python', 'data-science'],
          verified: true
        }
      },
      {
        embedding: [0.0, 0.0, 1.0],
        metadata: {
          title: 'Healthy Living Tips',
          author: 'Charlie',
          category: 'health',
          year: 2024,
          tags: ['health', 'lifestyle'],
          verified: true
        }
      },
      {
        embedding: [0.5, 0.5, 0.0],
        metadata: {
          title: 'Finance 101',
          author: 'David',
          category: 'finance',
          year: 2021,
          tags: ['finance', 'education'],
          verified: false
        }
      }
    ];

    testPosts.forEach(post => {
      db.insert(post);
    });
  });

  afterEach(() => {
    db.close();
  });

  describe('Basic Vector Search', () => {
    it('should find similar vectors', async () => {
      const results = await db.query()
        .similarTo([1.0, 0.0, 0.0])
        .limit(3)
        .execute();

      expect(results.length).toBe(3);
      expect(results[0].metadata?.title).toContain('TypeScript');
    });

    it('should respect k parameter', async () => {
      const results = await db.query()
        .similarTo([1.0, 0.0, 0.0], 2)
        .execute();

      expect(results.length).toBe(2);
    });
  });

  describe('Filtering', () => {
    it('should filter by category', async () => {
      const results = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([0.5, 0.5, 0.0])
        .where('metadata.category', '=', 'tech')
        .execute();

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.metadata?.category).toBe('tech');
      });
    });

    it('should filter by year range', async () => {
      const results = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([0.5, 0.5, 0.0])
        .whereBetween('metadata.year', 2023, 2024)
        .execute();

      results.forEach(r => {
        expect(r.metadata?.year).toBeGreaterThanOrEqual(2023);
        expect(r.metadata?.year).toBeLessThanOrEqual(2024);
      });
    });

    it('should filter by author list', async () => {
      const results = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([0.5, 0.5, 0.0])
        .whereIn('metadata.author', ['Alice', 'Bob'])
        .execute();

      results.forEach(r => {
        expect(['Alice', 'Bob']).toContain(r.metadata?.author);
      });
    });

    it('should combine multiple filters', async () => {
      const results = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([0.5, 0.5, 0.0])
        .where('metadata.category', '=', 'tech')
        .where('metadata.verified', '=', true)
        .where('metadata.year', '>=', 2023)
        .execute();

      results.forEach(r => {
        expect(r.metadata?.category).toBe('tech');
        expect(r.metadata?.verified).toBe(true);
        expect(r.metadata?.year).toBeGreaterThanOrEqual(2023);
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by similarity score', async () => {
      const results = await db.query()
        .similarTo([1.0, 0.0, 0.0])
        .orderBySimilarity('desc')
        .execute();

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should sort by metadata field', async () => {
      const results = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([0.5, 0.5, 0.0])
        .where('metadata.category', '=', 'tech')
        .orderBy('metadata.year', 'desc')
        .execute();

      for (let i = 0; i < results.length - 1; i++) {
        const year1 = results[i].metadata?.year || 0;
        const year2 = results[i + 1].metadata?.year || 0;
        expect(year1).toBeGreaterThanOrEqual(year2);
      }
    });
  });

  describe('Pagination', () => {
    it('should paginate results', async () => {
      const page1 = await db.query()
        .similarTo([0.5, 0.5, 0.0])
        .limit(2)
        .execute();

      const page2 = await db.query()
        .similarTo([0.5, 0.5, 0.0])
        .offset(2)
        .limit(2)
        .execute();

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('Execution Methods', () => {
    it('should get first result', async () => {
      const result = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([1.0, 0.0, 0.0])
        .where('metadata.category', '=', 'tech')
        .first();

      expect(result).not.toBeNull();
      expect(result?.metadata?.category).toBe('tech');
    });

    it('should count results', async () => {
      const count = await db.query()
        .similarTo([0.5, 0.5, 0.0])
        .where('metadata.category', '=', 'tech')
        .count();

      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe metadata access', async () => {
      const results = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([1.0, 0.0, 0.0])
        .where('metadata.verified', '=', true)
        .execute();

      results.forEach(result => {
        // TypeScript should provide autocomplete here
        expect(typeof result.metadata?.title).toBe('string');
        expect(typeof result.metadata?.author).toBe('string');
        expect(typeof result.metadata?.year).toBe('number');
        expect(Array.isArray(result.metadata?.tags)).toBe(true);
        expect(typeof result.metadata?.verified).toBe('boolean');
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should search for recent tech articles by Alice', async () => {
      const results = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([1.0, 0.0, 0.0])
        .where('metadata.category', '=', 'tech')
        .where('metadata.author', '=', 'Alice')
        .where('metadata.year', '>=', 2023)
        .where('metadata.verified', '=', true)
        .orderBy('metadata.year', 'desc')
        .limit(5)
        .execute();

      results.forEach(r => {
        expect(r.metadata?.category).toBe('tech');
        expect(r.metadata?.author).toBe('Alice');
        expect(r.metadata?.year).toBeGreaterThanOrEqual(2023);
        expect(r.metadata?.verified).toBe(true);
      });
    });

    it('should find similar content with tag filtering', async () => {
      // Find TypeScript-related content
      const results = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([1.0, 0.0, 0.0])
        .where('metadata.category', '=', 'tech')
        .orderBySimilarity('desc')
        .limit(3)
        .execute();

      // Should find TypeScript articles first
      expect(results[0].metadata?.title).toContain('TypeScript');
    });

    it('should support recommendation system pattern', async () => {
      // User liked "Introduction to TypeScript"
      const likedPost = await db.query()
        .withMetadata<BlogPost>()
        .similarTo([1.0, 0.0, 0.0])
        .where('metadata.title', '=', 'Introduction to TypeScript')
        .first();

      if (!likedPost) {
        throw new Error('Liked post not found');
      }

      // Find similar posts (excluding the liked one)
      const recommendations = await db.query()
        .withMetadata<BlogPost>()
        .similarTo(likedPost.embedding)
        .where('metadata.category', '=', 'tech')
        .where('metadata.verified', '=', true)
        .orderBySimilarity('desc')
        .limit(5)
        .execute();

      expect(recommendations.length).toBeGreaterThan(0);

      // Should recommend similar tech content
      recommendations.forEach(rec => {
        expect(rec.metadata?.category).toBe('tech');
        expect(rec.metadata?.verified).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle no matches gracefully', async () => {
      const results = await db.query()
        .similarTo([1.0, 0.0, 0.0])
        .where('metadata.category', '=', 'nonexistent')
        .execute();

      expect(results).toEqual([]);
    });

    it('should handle first() with no results', async () => {
      const result = await db.query()
        .similarTo([1.0, 0.0, 0.0])
        .where('metadata.category', '=', 'nonexistent')
        .first();

      expect(result).toBeNull();
    });

    it('should handle count with no matches', async () => {
      const count = await db.query()
        .similarTo([1.0, 0.0, 0.0])
        .where('metadata.category', '=', 'nonexistent')
        .count();

      expect(count).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle large result sets efficiently', async () => {
      // Insert more test data
      for (let i = 0; i < 100; i++) {
        db.insert({
          embedding: [Math.random(), Math.random(), Math.random()],
          metadata: {
            title: `Post ${i}`,
            author: `Author${i % 5}`,
            category: i % 2 === 0 ? 'tech' : 'other',
            year: 2020 + (i % 5),
            tags: ['tag1', 'tag2'],
            verified: i % 3 === 0
          }
        });
      }

      const start = Date.now();
      const results = await db.query()
        .similarTo([0.5, 0.5, 0.0], 100)
        .where('metadata.category', '=', 'tech')
        .orderBy('metadata.year', 'desc')
        .limit(20)
        .execute();
      const duration = Date.now() - start;

      expect(results.length).toBeLessThanOrEqual(20);
      expect(duration).toBeLessThan(1000); // Should be fast
    });
  });
});
