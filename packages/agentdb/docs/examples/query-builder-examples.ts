/**
 * Comprehensive examples of using VectorQueryBuilder
 * Demonstrates all query builder features and patterns
 */

import { SQLiteVectorDB, VectorQueryBuilder } from '../../src';

// ============================================================================
// BASIC USAGE
// ============================================================================

async function basicVectorSearch() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Simple vector search
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .execute();

  console.log('Basic search results:', results.length);
}

async function vectorSearchWithLimit() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Search with custom k value
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3], 5)
    .execute();

  console.log('Top 5 results:', results.length);
}

async function searchByExistingVector() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Insert a vector
  const id = db.insert({
    embedding: [0.1, 0.2, 0.3],
    metadata: { name: 'reference' }
  });

  // Search for similar vectors
  const results = await db.query()
    .similarToId(id)
    .limit(10)
    .execute();

  console.log('Similar to reference:', results.length);
}

// ============================================================================
// FILTERING
// ============================================================================

async function simpleFiltering() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Filter by exact match
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.category', '=', 'tech')
    .execute();

  console.log('Tech category results:', results.length);
}

async function comparisonFilters() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Greater than filter
  const recentPosts = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.year', '>', 2022)
    .execute();

  // Less than or equal filter
  const oldPosts = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.year', '<=', 2020)
    .execute();

  console.log('Recent:', recentPosts.length, 'Old:', oldPosts.length);
}

async function multipleFilters() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Combine multiple filters (AND logic)
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.category', '=', 'tech')
    .where('metadata.year', '>=', 2023)
    .where('metadata.verified', '=', true)
    .execute();

  console.log('Filtered results:', results.length);
}

async function rangeFilters() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Filter by range
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .whereBetween('metadata.year', 2020, 2024)
    .execute();

  console.log('Results in range:', results.length);
}

async function inFilters() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Filter by set membership
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .whereIn('metadata.author', ['Alice', 'Bob', 'Charlie'])
    .execute();

  console.log('Results from specific authors:', results.length);
}

async function likeFilters() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Pattern matching
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.title', 'LIKE', 'Introduction to%')
    .execute();

  console.log('Titles matching pattern:', results.length);
}

async function nestedMetadataFiltering() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Filter nested metadata
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .whereMetadata('author.verified', '=', true)
    .whereMetadata('author.reputation', '>', 100)
    .execute();

  console.log('Verified high-reputation authors:', results.length);
}

// ============================================================================
// SORTING
// ============================================================================

async function sortBySimilarity() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Sort by similarity score (descending - most similar first)
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .orderBySimilarity('desc')
    .execute();

  console.log('Most similar first:', results[0].score);

  // Sort ascending (least similar first)
  const reversed = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .orderBySimilarity('asc')
    .execute();

  console.log('Least similar first:', reversed[0].score);
}

async function sortByMetadata() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Sort by metadata field
  const newestFirst = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .orderBy('metadata.timestamp', 'desc')
    .execute();

  const oldestFirst = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .orderBy('metadata.timestamp', 'asc')
    .execute();

  console.log('Newest:', newestFirst.length, 'Oldest:', oldestFirst.length);
}

async function multipleOrderBy() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Sort by multiple fields
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .orderBy('metadata.category', 'asc')
    .orderBy('metadata.year', 'desc')
    .orderBySimilarity('desc')
    .execute();

  console.log('Multi-sorted results:', results.length);
}

// ============================================================================
// PAGINATION
// ============================================================================

async function basicPagination() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Get first page (results 0-9)
  const page1 = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .limit(10)
    .execute();

  // Get second page (results 10-19)
  const page2 = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .offset(10)
    .limit(10)
    .execute();

  console.log('Page 1:', page1.length, 'Page 2:', page2.length);
}

async function skipTake() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Using skip/take aliases
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .skip(20)
    .take(10)
    .execute();

  console.log('Results 21-30:', results.length);
}

async function infiniteScrollPattern() {
  const db = new SQLiteVectorDB({ memoryMode: true });
  const pageSize = 20;
  let page = 0;
  let allResults = [];

  // Simulate infinite scroll
  while (true) {
    const results = await db.query()
      .similarTo([0.1, 0.2, 0.3])
      .offset(page * pageSize)
      .limit(pageSize)
      .execute();

    if (results.length === 0) break;

    allResults.push(...results);
    page++;

    if (page >= 5) break; // Safety limit for example
  }

  console.log('Total loaded:', allResults.length);
}

// ============================================================================
// EXECUTION METHODS
// ============================================================================

async function getAllResults() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Execute and get all results
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.category', '=', 'tech')
    .execute();

  console.log('All results:', results.length);
}

async function getFirstResult() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Get only the best match
  const best = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .orderBySimilarity('desc')
    .first();

  if (best) {
    console.log('Best match:', best.id, 'Score:', best.score);
  } else {
    console.log('No results found');
  }
}

async function countResults() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Count without retrieving
  const count = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.category', '=', 'tech')
    .count();

  console.log('Matching documents:', count);
}

// ============================================================================
// TYPE SAFETY
// ============================================================================

interface BlogPost {
  title: string;
  author: string;
  tags: string[];
  publishedAt: string;
  verified: boolean;
}

async function typedMetadata() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Type-safe query with metadata interface
  const posts = await db.query()
    .withMetadata<BlogPost>()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.verified', '=', true)
    .execute();

  // TypeScript knows the metadata structure
  posts.forEach(post => {
    if (post.metadata) {
      console.log('Title:', post.metadata.title);
      console.log('Author:', post.metadata.author);
      console.log('Tags:', post.metadata.tags.join(', '));
    }
  });
}

interface ProductMetadata {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  rating: number;
}

async function ecommerceQuery() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  const products = await db.query()
    .withMetadata<ProductMetadata>()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.inStock', '=', true)
    .whereBetween('metadata.price', 10, 100)
    .where('metadata.rating', '>=', 4.0)
    .orderBy('metadata.price', 'asc')
    .execute();

  products.forEach(product => {
    if (product.metadata) {
      console.log(`${product.metadata.name} - $${product.metadata.price}`);
    }
  });
}

// ============================================================================
// SIMILARITY METRICS AND THRESHOLDS
// ============================================================================

async function differentMetrics() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Cosine similarity (default)
  const cosineResults = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .useSimilarityMetric('cosine')
    .execute();

  // Euclidean distance
  const euclideanResults = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .useSimilarityMetric('euclidean')
    .execute();

  // Dot product
  const dotResults = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .useSimilarityMetric('dot')
    .execute();

  console.log('Cosine:', cosineResults.length);
  console.log('Euclidean:', euclideanResults.length);
  console.log('Dot:', dotResults.length);
}

async function withThreshold() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Only return results with similarity >= 0.7
  const highQualityMatches = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .withThreshold(0.7)
    .execute();

  console.log('High-quality matches:', highQualityMatches.length);
}

// ============================================================================
// COMPLEX REAL-WORLD EXAMPLES
// ============================================================================

async function semanticSearch() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Semantic document search with filters
  const documents = await db.query()
    .similarTo([0.1, 0.2, 0.3], 50) // Search top 50
    .where('metadata.language', '=', 'en')
    .where('metadata.contentType', '=', 'article')
    .whereBetween('metadata.wordCount', 500, 5000)
    .whereMetadata('author.verified', '=', true)
    .useSimilarityMetric('cosine')
    .withThreshold(0.6)
    .orderBySimilarity('desc')
    .limit(10)
    .execute();

  console.log('Relevant documents:', documents.length);
}

async function recommendationSystem() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Product recommendations
  const recommendations = await db.query()
    .withMetadata<ProductMetadata>()
    .similarToId('user-favorite-product')
    .where('metadata.inStock', '=', true)
    .where('metadata.category', '!=', 'electronics') // Exclude category
    .whereBetween('metadata.price', 20, 200)
    .where('metadata.rating', '>=', 4.0)
    .orderBySimilarity('desc')
    .limit(20)
    .execute();

  console.log('Recommended products:', recommendations.length);
}

async function facetedSearch() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Multi-faceted product search
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .whereIn('metadata.brand', ['Nike', 'Adidas', 'Puma'])
    .whereIn('metadata.size', ['M', 'L', 'XL'])
    .whereBetween('metadata.price', 50, 150)
    .where('metadata.onSale', '=', true)
    .orderBy('metadata.discount', 'desc')
    .orderBySimilarity('desc')
    .limit(20)
    .execute();

  console.log('Faceted search results:', results.length);
}

async function timeSeriesQuery() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Time-based vector search
  const recentEvents = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.timestamp', '>', Date.now() - 86400000) // Last 24h
    .where('metadata.importance', '>=', 7)
    .orderBy('metadata.timestamp', 'desc')
    .execute();

  console.log('Recent important events:', recentEvents.length);
}

async function userContentFiltering() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Content filtering for specific user
  const personalizedFeed = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .whereIn('metadata.tags', ['javascript', 'typescript', 'nodejs'])
    .where('metadata.difficulty', '=', 'intermediate')
    .where('metadata.premium', '=', false) // Free content only
    .orderBy('metadata.views', 'desc')
    .orderBySimilarity('desc')
    .limit(50)
    .execute();

  console.log('Personalized feed:', personalizedFeed.length);
}

// ============================================================================
// CHAINING AND REUSABILITY
// ============================================================================

async function queryReuse() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Build base query
  const baseQuery = db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.category', '=', 'tech')
    .where('metadata.verified', '=', true);

  // Use base query with different sorting
  const newestFirst = await baseQuery
    .orderBy('metadata.timestamp', 'desc')
    .limit(10)
    .execute();

  // Note: In practice, you'd need to create new query instances
  // This example shows the conceptual pattern
  console.log('Newest tech posts:', newestFirst.length);
}

async function dynamicQueryBuilding() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Build query dynamically based on user input
  const userFilters = {
    category: 'tech',
    minYear: 2020,
    verified: true,
    authors: ['Alice', 'Bob'],
    sortBy: 'timestamp'
  };

  let query = db.query().similarTo([0.1, 0.2, 0.3]);

  if (userFilters.category) {
    query = query.where('metadata.category', '=', userFilters.category);
  }

  if (userFilters.minYear) {
    query = query.where('metadata.year', '>=', userFilters.minYear);
  }

  if (userFilters.verified !== undefined) {
    query = query.where('metadata.verified', '=', userFilters.verified);
  }

  if (userFilters.authors.length > 0) {
    query = query.whereIn('metadata.author', userFilters.authors);
  }

  if (userFilters.sortBy) {
    query = query.orderBy(`metadata.${userFilters.sortBy}`, 'desc');
  }

  const results = await query.limit(20).execute();
  console.log('Dynamic query results:', results.length);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

async function errorHandling() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  try {
    // This will throw - no query vector specified
    await db.query().execute();
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }

  try {
    // This will throw - vector not found
    await db.query().similarToId('nonexistent').execute();
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }

  try {
    // This will throw - negative limit
    db.query().limit(-1);
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

// ============================================================================
// PERFORMANCE PATTERNS
// ============================================================================

async function efficientPagination() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Efficient pagination with count
  const totalCount = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.category', '=', 'tech')
    .count();

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  console.log(`Total: ${totalCount}, Pages: ${totalPages}`);

  // Fetch specific page
  const page = 2;
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3])
    .where('metadata.category', '=', 'tech')
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .execute();

  console.log(`Page ${page} results:`, results.length);
}

async function prefilteringOptimization() {
  const db = new SQLiteVectorDB({ memoryMode: true });

  // Increase k to get more candidates before filtering
  const results = await db.query()
    .similarTo([0.1, 0.2, 0.3], 100) // Get top 100
    .where('metadata.category', '=', 'tech')
    .where('metadata.verified', '=', true)
    .limit(10) // Return only 10
    .execute();

  console.log('Filtered results:', results.length);
}

// Export all examples
export {
  basicVectorSearch,
  vectorSearchWithLimit,
  searchByExistingVector,
  simpleFiltering,
  comparisonFilters,
  multipleFilters,
  rangeFilters,
  inFilters,
  likeFilters,
  nestedMetadataFiltering,
  sortBySimilarity,
  sortByMetadata,
  multipleOrderBy,
  basicPagination,
  skipTake,
  infiniteScrollPattern,
  getAllResults,
  getFirstResult,
  countResults,
  typedMetadata,
  ecommerceQuery,
  differentMetrics,
  withThreshold,
  semanticSearch,
  recommendationSystem,
  facetedSearch,
  timeSeriesQuery,
  userContentFiltering,
  queryReuse,
  dynamicQueryBuilding,
  errorHandling,
  efficientPagination,
  prefilteringOptimization
};
