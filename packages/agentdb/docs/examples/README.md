# Query Builder Examples

This directory contains comprehensive examples for using the SQLiteVector Query Builder.

## Files

- **query-builder-examples.ts** - Complete working examples demonstrating all query builder features

## Quick Start

```typescript
import { SQLiteVectorDB } from 'sqlite-vector';

const db = new SQLiteVectorDB({ memoryMode: true });

// Simple search
const results = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .limit(10)
  .execute();

// Complex query
const filtered = await db.query()
  .similarTo([0.1, 0.2, 0.3])
  .where('metadata.category', '=', 'tech')
  .whereBetween('metadata.year', 2020, 2024)
  .orderBySimilarity('desc')
  .limit(20)
  .execute();
```

## Example Categories

### Basic Usage
- Simple vector search
- Search with custom k value
- Search by existing vector ID

### Filtering
- Exact match filtering
- Comparison operators (>, <, >=, <=)
- Range filtering (whereBetween)
- Set membership (whereIn)
- Pattern matching (LIKE)
- Nested metadata filtering
- Multiple filters (AND logic)

### Sorting
- Sort by similarity score
- Sort by metadata fields
- Multiple sort orders
- Ascending/descending

### Pagination
- Basic limit/offset
- Skip/take aliases
- Infinite scroll pattern
- Efficient pagination

### Type Safety
- Typed metadata interfaces
- Generic type parameters
- IDE autocomplete support

### Real-World Patterns
- Semantic document search
- Product recommendations
- Faceted search
- Time-series queries
- User content filtering
- E-commerce queries

### Advanced
- Dynamic query building
- Query reuse patterns
- Error handling
- Performance optimization

## Running Examples

```bash
# Install dependencies
npm install

# Run TypeScript examples
npx ts-node docs/examples/query-builder-examples.ts

# Or import in your own code
import { semanticSearch } from './docs/examples/query-builder-examples';

await semanticSearch();
```

## Documentation

See [QUERY-BUILDER.md](../QUERY-BUILDER.md) for complete API documentation.

## Contributing

Found an issue or have a new example pattern? Please open a PR!
