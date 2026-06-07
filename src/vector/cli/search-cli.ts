/**
 * Search CLI
 * Node.js entry point for semantic search operations
 */

import { UnifiedSemanticSearch, initGlobalSearch } from '../search/unified-search';
import { CodePatternAdapter } from '../adapters/code-adapter';
import { TelemetryAdapter } from '../adapters/telemetry-adapter';
import { DocumentAdapter } from '../adapters/document-adapter';
import { globalEmbeddingRegistry, initDefaultEmbedding } from '../core/embedding';

interface SearchOptions {
  query: string;
  domains?: string[];
  k?: number;
  threshold?: number;
  useMMR?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options: SearchOptions = { query: '', k: 10, threshold: 0.7 };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--query':
      case '-q':
        options.query = args[++i];
        break;
      case '--domains':
      case '-d':
        options.domains = args[++i].split(',');
        break;
      case '--k':
      case '-k':
        options.k = parseInt(args[++i], 10);
        break;
      case '--threshold':
      case '-t':
        options.threshold = parseFloat(args[++i]);
        break;
      case '--mmr':
      case '-m':
        options.useMMR = true;
        break;
    }
  }

  if (!options.query) {
    console.error('Error: --query required');
    process.exit(1);
  }

  // Initialize embedding
  initDefaultEmbedding();

  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not set');
    process.exit(1);
  }

  // Initialize search
  const dbPath = process.env.AGENTDB_PATH || './.agentdb/vectors.db';
  const search = initGlobalSearch(dbPath);

  // Register adapters
  await search.addDomain(new CodePatternAdapter());
  await search.addDomain(new TelemetryAdapter());
  await search.addDomain(new DocumentAdapter());

  try {
    const results = await search.query(options.query, {
      domains: options.domains,
      k: options.k,
      threshold: options.threshold,
      useMMR: options.useMMR
    });

    const output = {
      query: options.query,
      results: results.map(r => ({
        id: r.id,
        score: r.score,
        domain: r.metadata.domain,
        source: r.metadata.source,
        tags: r.metadata.tags,
        ...(r.mmrScore && { mmrScore: r.mmrScore })
      })),
      total: results.length
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    search.close();
  }
}

main();
