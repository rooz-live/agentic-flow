/**
 * Index CLI
 * Node.js entry point for indexing sources
 */

import { UnifiedSemanticSearch, initGlobalSearch } from '../search/unified-search';
import { CodePatternAdapter } from '../adapters/code-adapter';
import { TelemetryAdapter } from '../adapters/telemetry-adapter';
import { DocumentAdapter } from '../adapters/document-adapter';
import { initDefaultEmbedding } from '../core/embedding';

interface IndexOptions {
  path: string;
  domain: string;
}

async function main() {
  const args = process.argv.slice(2);
  const options: Partial<IndexOptions> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
      case '-p':
        options.path = args[++i];
        break;
      case '--domain':
      case '-d':
        options.domain = args[++i];
        break;
    }
  }

  if (!options.path || !options.domain) {
    console.error('Error: --path and --domain required');
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

  // Register domain adapter
  switch (options.domain) {
    case 'code':
      await search.addDomain(new CodePatternAdapter());
      break;
    case 'telemetry':
      await search.addDomain(new TelemetryAdapter());
      break;
    case 'docs':
      await search.addDomain(new DocumentAdapter());
      break;
    default:
      console.error(`Error: Unknown domain ${options.domain}`);
      process.exit(1);
  }

  try {
    const count = await search.indexSource(options.domain, options.path);

    const output = {
      path: options.path,
      domain: options.domain,
      indexedPatterns: count,
      status: 'success'
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
