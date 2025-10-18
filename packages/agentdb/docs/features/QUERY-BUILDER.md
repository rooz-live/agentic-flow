# Query Builder API Documentation

The `VectorQueryBuilder` provides a fluent, type-safe API for building complex vector search queries with filtering, sorting, and pagination.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Vector Search](#vector-search)
  - [Filtering](#filtering)
  - [Sorting](#sorting)
  - [Pagination](#pagination)
  - [Execution](#execution)
  - [Advanced](#advanced)
- [Type Safety](#type-safety)
- [Best Practices](#best-practices)
- [Performance Tips](#performance-tips)
- [Examples](#examples)

## Quick Start

```typescript
import { SQLiteVectorDB } from 'sqlite-vector';

const db = new SQLiteVectorDB({ memoryMode: true });

// Simple vector search
const results = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .limit(10)
  .execute();

// Complex query with filters
const filtered = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .where('metadata.category', '=', 'tech')
  .whereBetween('metadata.year', 2020, 2024)
  .orderBySimilarity('desc')
  .limit(20)
  .execute();
```

## API Reference

### Vector Search

#### `similarTo(vector: number[], k?: number): this`

Search for vectors similar to the given vector.

```typescript
db.query().similarTo([0.1, 0.2, 0.3], 10)
```

**Parameters:**
- `vector` - Query vector (array of numbers)
- `k` - Number of nearest neighbors to retrieve (default: 10)

#### `similarToId(id: string, k?: number): this`

Search for vectors similar to a vector already in the database.

```typescript
db.query().similarToId('vector-123', 5)
```

**Parameters:**
- `id` - ID of the reference vector
- `k` - Number of nearest neighbors to retrieve (default: 10)

#### `useSimilarityMetric(metric: SimilarityMetric): this`

Set the similarity metric for vector comparison.

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .useSimilarityMetric('euclidean')
```

**Supported Metrics:**
- `'cosine'` - Cosine similarity (default)
- `'euclidean'` - Euclidean distance
- `'dot'` - Dot product

#### `withThreshold(threshold: number): this`

Set minimum similarity threshold.

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .withThreshold(0.7)
```

### Filtering

#### `where(field: string, op: Operator, value: any): this`

Add a filter condition.

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .where('metadata.category', '=', 'tech')
  .where('metadata.year', '>', 2020)
```

**Operators:**
- `'='` - Equal
- `'!='` - Not equal
- `'>'` - Greater than
- `'>='` - Greater than or equal
- `'<'` - Less than
- `'<='` - Less than or equal
- `'LIKE'` - Pattern matching (SQL LIKE)
- `'IN'` - Set membership

**Field Names:**
- Use `'metadata.fieldName'` to filter metadata fields
- Supports nested paths: `'metadata.author.name'`

#### `whereIn(field: string, values: any[]): this`

Filter where field is in a set of values.

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .whereIn('metadata.author', ['Alice', 'Bob', 'Charlie'])
```

#### `whereBetween(field: string, min: any, max: any): this`

Filter where field is between min and max (inclusive).

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .whereBetween('metadata.year', 2020, 2024)
```

#### `whereMetadata(path: string, op: Operator, value: any): this`

Filter metadata field (alias for `where` with automatic `'metadata.'` prefix).

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .whereMetadata('category', '=', 'tech')
  .whereMetadata('author.verified', '=', true)
```

### Sorting

#### `orderBy(field: string, direction?: SortDirection): this`

Order results by a field.

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .orderBy('metadata.timestamp', 'desc')
  .orderBy('metadata.title', 'asc')
```

**Parameters:**
- `field` - Field name (use `'metadata.fieldName'` for metadata)
- `direction` - `'asc'` or `'desc'` (default: `'asc'`)

#### `orderBySimilarity(direction?: SortDirection): this`

Order results by similarity score.

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .orderBySimilarity('desc') // Most similar first
```

**Parameters:**
- `direction` - `'asc'` or `'desc'` (default: `'desc'`)

### Pagination

#### `limit(n: number): this`

Limit number of results.

```typescript
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .limit(20)
```

#### `offset(n: number): this` / `skip(n: number): this`

Skip first n results.

```typescript
// Get results 21-30
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .offset(20)
  .limit(10)

// Same using skip alias
db.query()
  .similarTo([0.1, 0.2, 0.3])
  .skip(20)
  .take(10)
```

#### `take(n: number): this`

Alias for `limit(n)`.

### Execution

#### `execute(): Promise<SearchResult<T>[]>`

Execute the query and return all results.

```typescript
const results = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .where('metadata.category', '=', 'tech')
  .execute();

console.log(results.length);
results.forEach(r => console.log(r.id, r.score));
```

**Returns:**
```typescript
interface SearchResult<T = any> {
  id: string;
  score: number;
  embedding: number[];
  metadata?: T;
}
```

#### `first(): Promise<SearchResult<T> | null>`

Execute query and return first result.

```typescript
const best = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .orderBySimilarity('desc')
  .first();

if (best) {
  console.log('Best match:', best.id, 'Score:', best.score);
}
```

#### `count(): Promise<number>`

Count results without retrieving them.

```typescript
const count = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .where('metadata.category', '=', 'tech')
  .count();

console.log('Matching documents:', count);
```

### Advanced

#### `withMetadata<M>(): VectorQueryBuilder<M>`

Enable type-safe metadata access.

```typescript
interface BlogPost {
  title: string;
  author: string;
  tags: string[];
}

const posts = await db.query()
  .withMetadata<BlogPost>()
  .similarTo([0.1, 0.2, 0.3])
  .execute();

// TypeScript knows metadata structure
posts.forEach(post => {
  console.log(post.metadata?.title);
  console.log(post.metadata?.author);
});
```

#### `raw(sql: string, params?: any[]): this`

Execute raw SQL query (advanced, not yet implemented).

```typescript
// Future feature
db.query()
  .raw('SELECT * FROM vectors WHERE ...')
  .execute()
```

## Type Safety

### Basic Usage

```typescript
// Without type safety
const results = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .execute();

// metadata is typed as any
console.log(results[0].metadata?.someField);
```

### With Type Safety

```typescript
interface Article {
  title: string;
  author: string;
  publishedAt: string;
  tags: string[];
  verified: boolean;
}

const articles = await db.query()
  .withMetadata<Article>()
  .similarTo([0.1, 0.2, 0.3])
  .where('metadata.verified', '=', true)
  .execute();

// TypeScript provides autocomplete and type checking
articles.forEach(article => {
  console.log(article.metadata?.title); // ✓ Type-safe
  console.log(article.metadata?.author); // ✓ Type-safe
  // console.log(article.metadata?.invalid); // ✗ TypeScript error
});
```

### Generic Types

```typescript
interface Product {
  name: string;
  price: number;
  inStock: boolean;
}

class ProductSearch {
  private db: SQLiteVectorDB;

  async search(query: number[]): Promise<SearchResult<Product>[]> {
    return this.db.query()
      .withMetadata<Product>()
      .similarTo(query)
      .where('metadata.inStock', '=', true)
      .execute();
  }
}
```

## Best Practices

### 1. Use Type Safety

Always define interfaces for your metadata:

```typescript
interface DocumentMetadata {
  title: string;
  category: string;
  author: string;
  timestamp: number;
}

const docs = await db.query()
  .withMetadata<DocumentMetadata>()
  .similarTo(vector)
  .execute();
```

### 2. Filter Early

Apply filters before sorting and pagination:

```typescript
// ✓ Good - filter first
db.query()
  .similarTo(vector)
  .where('metadata.category', '=', 'tech')
  .whereBetween('metadata.year', 2020, 2024)
  .orderBy('metadata.timestamp', 'desc')
  .limit(10)

// ✗ Less efficient - filter after sorting
db.query()
  .similarTo(vector)
  .orderBy('metadata.timestamp', 'desc')
  .where('metadata.category', '=', 'tech')
  .limit(10)
```

### 3. Use Appropriate k Values

Increase k when using filters to ensure enough results:

```typescript
// ✓ Good - larger k for filtering
db.query()
  .similarTo(vector, 100) // Get 100 candidates
  .where('metadata.category', '=', 'tech')
  .limit(10) // Return only 10

// ✗ May not return enough results
db.query()
  .similarTo(vector, 10) // Only 10 candidates
  .where('metadata.category', '=', 'tech')
  .limit(10)
```

### 4. Handle Empty Results

Always check for empty results:

```typescript
const result = await db.query()
  .similarTo(vector)
  .first();

if (result) {
  console.log('Found:', result.id);
} else {
  console.log('No results found');
}
```

### 5. Reuse Query Logic

Extract common query patterns:

```typescript
function createTechQuery(db: SQLiteVectorDB, vector: number[]) {
  return db.query()
    .similarTo(vector)
    .where('metadata.category', '=', 'tech')
    .where('metadata.verified', '=', true);
}

// Use in different contexts
const recent = await createTechQuery(db, vector)
  .orderBy('metadata.timestamp', 'desc')
  .limit(10)
  .execute();

const popular = await createTechQuery(db, vector)
  .orderBy('metadata.views', 'desc')
  .limit(10)
  .execute();
```

## Performance Tips

### 1. Use Thresholds

Filter out low-quality matches:

```typescript
db.query()
  .similarTo(vector)
  .withThreshold(0.7) // Only similarity >= 0.7
  .execute()
```

### 2. Pagination for Large Results

Don't load all results at once:

```typescript
const pageSize = 20;
const page = 1;

const results = await db.query()
  .similarTo(vector)
  .offset((page - 1) * pageSize)
  .limit(pageSize)
  .execute();
```

### 3. Count Before Fetching

Check result count for pagination:

```typescript
const count = await db.query()
  .similarTo(vector)
  .where('metadata.category', '=', 'tech')
  .count();

const totalPages = Math.ceil(count / pageSize);

if (requestedPage <= totalPages) {
  const results = await db.query()
    .similarTo(vector)
    .where('metadata.category', '=', 'tech')
    .offset((requestedPage - 1) * pageSize)
    .limit(pageSize)
    .execute();
}
```

### 4. Choose Right Similarity Metric

- **Cosine**: Best for normalized vectors, direction matters
- **Euclidean**: Best when magnitude matters
- **Dot Product**: Fastest, good for binary vectors

```typescript
// For text embeddings (usually normalized)
db.query()
  .similarTo(vector)
  .useSimilarityMetric('cosine')

// For image features
db.query()
  .similarTo(vector)
  .useSimilarityMetric('euclidean')
```

## Examples

See [query-builder-examples.ts](./examples/query-builder-examples.ts) for comprehensive examples including:

- Basic vector search
- Complex filtering
- Sorting and pagination
- Type-safe queries
- Real-world patterns (e-commerce, recommendations, search)
- Error handling
- Performance optimization

## Error Handling

```typescript
try {
  const results = await db.query()
    .similarTo(vector)
    .execute();
} catch (error) {
  if (error instanceof Error) {
    console.error('Query failed:', error.message);
  }
}

// Common errors:
// - "Must specify query vector" - missing similarTo() or similarToId()
// - "Vector with ID X not found" - invalid ID in similarToId()
// - "Limit must be non-negative" - invalid pagination parameters
```

## Migration from Direct API

### Before (Direct Search)

```typescript
const results = db.search([0.1, 0.2, 0.3], 10, 'cosine', 0.7);

// Manual filtering
const filtered = results.filter(r =>
  r.metadata?.category === 'tech' &&
  r.metadata?.year >= 2020
);

// Manual sorting
filtered.sort((a, b) => b.score - a.score);

// Manual pagination
const page = filtered.slice(0, 10);
```

### After (Query Builder)

```typescript
const results = await db.query()
  .similarTo([0.1, 0.2, 0.3], 10)
  .useSimilarityMetric('cosine')
  .withThreshold(0.7)
  .where('metadata.category', '=', 'tech')
  .where('metadata.year', '>=', 2020)
  .orderBySimilarity('desc')
  .limit(10)
  .execute();
```

## API Stability

The Query Builder API is **stable** and follows semantic versioning:

- ✓ All documented methods are stable
- ✓ Backward compatibility guaranteed
- ⚠ `raw()` method marked as experimental
- 🚧 Advanced SQL features may be added in future versions

## Contributing

Found a bug or have a feature request? Please open an issue on GitHub.

## License

MIT OR Apache-2.0
