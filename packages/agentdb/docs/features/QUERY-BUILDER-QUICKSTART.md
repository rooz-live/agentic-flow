# Query Builder Quick Start

## Installation

```bash
npm install sqlite-vector
```

## Basic Usage

```typescript
import { SQLiteVectorDB } from 'sqlite-vector';

const db = new SQLiteVectorDB({ memoryMode: true });

// Insert some vectors
db.insert({
  embedding: [0.1, 0.2, 0.3],
  metadata: { title: 'Hello World', category: 'tech' }
});

// Simple search
const results = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .limit(10)
  .execute();
```

## Common Patterns

### 1. Filtered Search

```typescript
const results = await db.query()
  .similarTo(queryVector)
  .where('metadata.category', '=', 'tech')
  .where('metadata.year', '>=', 2023)
  .limit(10)
  .execute();
```

### 2. Range Query

```typescript
const results = await db.query()
  .similarTo(queryVector)
  .whereBetween('metadata.price', 10, 100)
  .execute();
```

### 3. Multiple Values

```typescript
const results = await db.query()
  .similarTo(queryVector)
  .whereIn('metadata.author', ['Alice', 'Bob', 'Charlie'])
  .execute();
```

### 4. Sorting

```typescript
// Sort by similarity (most similar first)
const results = await db.query()
  .similarTo(queryVector)
  .orderBySimilarity('desc')
  .execute();

// Sort by metadata field
const results = await db.query()
  .similarTo(queryVector)
  .orderBy('metadata.timestamp', 'desc')
  .execute();
```

### 5. Pagination

```typescript
// Get page 2 (results 21-40)
const results = await db.query()
  .similarTo(queryVector)
  .offset(20)
  .limit(20)
  .execute();
```

### 6. Get First Result

```typescript
const best = await db.query()
  .similarTo(queryVector)
  .orderBySimilarity('desc')
  .first();

if (best) {
  console.log('Best match:', best.id);
}
```

### 7. Count Results

```typescript
const count = await db.query()
  .similarTo(queryVector)
  .where('metadata.category', '=', 'tech')
  .count();

console.log(`Found ${count} results`);
```

## Type-Safe Queries

```typescript
interface Article {
  title: string;
  author: string;
  publishedAt: string;
  tags: string[];
}

const articles = await db.query()
  .withMetadata<Article>()
  .similarTo(queryVector)
  .where('metadata.author', '=', 'Alice')
  .execute();

// TypeScript knows the metadata structure
articles.forEach(article => {
  console.log(article.metadata?.title);
  console.log(article.metadata?.author);
});
```

## Complex Query Example

```typescript
const results = await db.query()
  .similarTo(queryVector, 50)           // Get top 50 candidates
  .where('metadata.category', '=', 'tech')
  .whereBetween('metadata.year', 2020, 2024)
  .where('metadata.verified', '=', true)
  .useSimilarityMetric('cosine')
  .withThreshold(0.6)                    // Min similarity
  .orderBySimilarity('desc')
  .orderBy('metadata.timestamp', 'desc')
  .offset(0)
  .limit(10)                             // Return only 10
  .execute();
```

## All Available Methods

### Vector Search
- `similarTo(vector, k?)` - Search for similar vectors
- `similarToId(id, k?)` - Search similar to existing vector
- `useSimilarityMetric(metric)` - Set metric (cosine/euclidean/dot)
- `withThreshold(threshold)` - Set minimum similarity

### Filtering
- `where(field, operator, value)` - Filter by condition
- `whereIn(field, values)` - Filter by set membership
- `whereBetween(field, min, max)` - Filter by range
- `whereMetadata(path, operator, value)` - Filter metadata (shorthand)

### Sorting
- `orderBySimilarity(direction?)` - Sort by similarity score
- `orderBy(field, direction?)` - Sort by field

### Pagination
- `limit(n)` - Limit results
- `offset(n)` - Skip results
- `skip(n)` - Alias for offset
- `take(n)` - Alias for limit

### Execution
- `execute()` - Get all results
- `first()` - Get first result (or null)
- `count()` - Count results

### Advanced
- `withMetadata<T>()` - Enable type-safe metadata
- `raw(sql, params?)` - Raw SQL (not yet implemented)

## Operators

- `=` - Equal
- `!=` - Not equal
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `LIKE` - Pattern matching (use `%` and `_` wildcards)
- `IN` - Set membership (used by `whereIn`)

## Error Handling

```typescript
try {
  const results = await db.query()
    .similarTo(vector)
    .execute();
} catch (error) {
  console.error('Query failed:', error.message);
}
```

## Performance Tips

1. **Use appropriate k values**: Get more candidates when filtering
   ```typescript
   db.query()
     .similarTo(vector, 100)  // Get 100 candidates
     .where('metadata.category', '=', 'tech')
     .limit(10)  // Return only 10
   ```

2. **Use thresholds**: Filter out low-quality matches
   ```typescript
   db.query()
     .similarTo(vector)
     .withThreshold(0.7)
   ```

3. **Count before fetching**: Check result count for pagination
   ```typescript
   const count = await db.query().similarTo(vector).count();
   if (count > 0) {
     const results = await db.query().similarTo(vector).execute();
   }
   ```

4. **Use appropriate metrics**: Choose based on your data
   - `cosine` - Best for normalized vectors (text embeddings)
   - `euclidean` - Best when magnitude matters (images)
   - `dot` - Fastest, good for binary vectors

## Next Steps

- Read the [full API documentation](./QUERY-BUILDER.md)
- See [comprehensive examples](./examples/query-builder-examples.ts)
- Check out [integration tests](../tests/integration/query-builder-integration.test.ts) for more patterns

## Support

- GitHub Issues: https://github.com/ruvnet/agentic-flow/issues
- Documentation: https://github.com/ruvnet/agentic-flow/tree/main/packages/sqlite-vector
