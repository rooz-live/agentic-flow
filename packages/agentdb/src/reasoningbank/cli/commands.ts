/**
 * AgentDB CLI Commands
 *
 * Command-line interface for AgentDB ReasoningBank operations.
 * Provides 10+ commands for managing patterns, training, and optimization.
 */

import { Command } from 'commander';
import { AgentDBReasoningBankAdapter } from '../adapter/agentdb-adapter';

/**
 * Create CLI program
 */
export function createAgentDBCLI(): Command {
  const program = new Command();

  program
    .name('agentdb')
    .description('AgentDB ReasoningBank CLI')
    .version('1.0.0');

  // Initialize command
  program
    .command('init')
    .description('Initialize AgentDB database')
    .option('-p, --path <path>', 'Database path', '.agentdb/reasoningbank.db')
    .option('--dimension <dim>', 'Embedding dimension', '768')
    .action(async (options) => {
      const adapter = new AgentDBReasoningBankAdapter({
        dbPath: options.path,
      });

      await adapter.initialize();
      console.log(`✅ AgentDB initialized at ${options.path}`);
      await adapter.close();
    });

  // Insert pattern command
  program
    .command('insert')
    .description('Insert a pattern')
    .requiredOption('-e, --embedding <json>', 'Embedding vector (JSON)')
    .requiredOption('-d, --domain <domain>', 'Domain name')
    .option('-p, --pattern <json>', 'Pattern data (JSON)')
    .option('-c, --confidence <value>', 'Confidence (0-1)', '0.5')
    .action(async (options) => {
      const adapter = new AgentDBReasoningBankAdapter();
      await adapter.initialize();

      const embedding = JSON.parse(options.embedding);
      const pattern = options.pattern ? JSON.parse(options.pattern) : {};

      const id = await adapter.insertPattern({
        id: '',
        type: 'pattern',
        domain: options.domain,
        pattern_data: JSON.stringify({ embedding, pattern }),
        confidence: parseFloat(options.confidence),
        usage_count: 0,
        success_count: 0,
        created_at: Date.now(),
        last_used: Date.now(),
      });

      console.log(`✅ Pattern inserted: ${id}`);
      await adapter.close();
    });

  // Search command
  program
    .command('search')
    .description('Search for similar patterns')
    .requiredOption('-q, --query <json>', 'Query embedding (JSON)')
    .option('-l, --limit <n>', 'Result limit', '10')
    .option('-d, --domain <domain>', 'Filter by domain')
    .option('--min-confidence <value>', 'Minimum confidence')
    .action(async (options) => {
      const adapter = new AgentDBReasoningBankAdapter();
      await adapter.initialize();

      const query = JSON.parse(options.query);
      const results = await adapter.retrieveMemories({
        query,
        limit: parseInt(options.limit),
        domain: options.domain,
        minConfidence: options.minConfidence ? parseFloat(options.minConfidence) : undefined,
      });

      console.log(`\n📊 Found ${results.length} results:\n`);
      results.forEach((r, i) => {
        console.log(`${i + 1}. [${r.domain}] Confidence: ${r.confidence.toFixed(3)}`);
        console.log(`   ID: ${r.id}`);
        console.log(`   Usage: ${r.usage_count} times\n`);
      });

      await adapter.close();
    });

  // Train command
  program
    .command('train')
    .description('Train the learning model')
    .option('-e, --epochs <n>', 'Number of epochs', '50')
    .option('-b, --batch-size <n>', 'Batch size', '32')
    .action(async (options) => {
      const adapter = new AgentDBReasoningBankAdapter({
        enableLearning: true,
      });
      await adapter.initialize();

      console.log('🚀 Training model...');
      const metrics = await adapter.train({
        epochs: parseInt(options.epochs),
        batchSize: parseInt(options.batchSize),
      });

      console.log('\n✅ Training completed:');
      console.log(`   Loss: ${metrics.loss.toFixed(4)}`);
      console.log(`   Duration: ${metrics.duration}ms`);

      await adapter.close();
    });

  // Stats command
  program
    .command('stats')
    .description('Display database statistics')
    .action(async () => {
      const adapter = new AgentDBReasoningBankAdapter();
      await adapter.initialize();

      const stats = await adapter.getStats();

      console.log('\n📊 AgentDB Statistics:\n');
      console.log(`   Total Patterns: ${stats.totalPatterns}`);
      console.log(`   Total Trajectories: ${stats.totalTrajectories}`);
      console.log(`   Average Confidence: ${stats.avgConfidence.toFixed(3)}`);
      console.log(`   Domains: ${stats.domains.join(', ')}`);
      console.log(`   Database Size: ${(stats.dbSize / 1024).toFixed(2)} KB\n`);

      await adapter.close();
    });

  // Optimize command
  program
    .command('optimize')
    .description('Optimize database (consolidation, pruning)')
    .action(async () => {
      const adapter = new AgentDBReasoningBankAdapter({
        enableReasoning: true,
      });
      await adapter.initialize();

      console.log('🔧 Optimizing database...');
      await adapter.optimize();

      console.log('✅ Optimization completed');
      await adapter.close();
    });

  // Update command
  program
    .command('update <id>')
    .description('Update pattern statistics')
    .option('-c, --confidence <value>', 'New confidence value')
    .option('-u, --usage <n>', 'Usage count')
    .option('-s, --success <n>', 'Success count')
    .action(async (id, options) => {
      const adapter = new AgentDBReasoningBankAdapter();
      await adapter.initialize();

      const updates: any = {};
      if (options.confidence) updates.confidence = parseFloat(options.confidence);
      if (options.usage) updates.usage_count = parseInt(options.usage);
      if (options.success) updates.success_count = parseInt(options.success);

      await adapter.updatePattern(id, updates);
      console.log(`✅ Pattern ${id} updated`);

      await adapter.close();
    });

  // Delete command
  program
    .command('delete <id>')
    .description('Delete a pattern')
    .action(async (id) => {
      const adapter = new AgentDBReasoningBankAdapter();
      await adapter.initialize();

      await adapter.deletePattern(id);
      console.log(`✅ Pattern ${id} deleted`);

      await adapter.close();
    });

  // Migrate command
  program
    .command('migrate')
    .description('Migrate from legacy ReasoningBank')
    .requiredOption('-s, --source <path>', 'Source database path')
    .option('-d, --destination <path>', 'Destination path', '.agentdb/reasoningbank.db')
    .action(async (options) => {
      console.log('🔄 Starting migration...');
      console.log(`   Source: ${options.source}`);
      console.log(`   Destination: ${options.destination}`);

      // Migration implementation
      const { migrateLegacyDatabase } = await import('../migration/migrate');
      const result = await migrateLegacyDatabase(options.source, options.destination);

      console.log('\n✅ Migration completed:');
      console.log(`   Patterns migrated: ${result.patternsMigrated}`);
      console.log(`   Trajectories migrated: ${result.trajectoriesMigrated}`);
      console.log(`   Duration: ${result.duration}ms\n`);
    });

  // Export command
  program
    .command('export')
    .description('Export patterns to JSON')
    .option('-o, --output <file>', 'Output file', 'patterns.json')
    .option('-d, --domain <domain>', 'Filter by domain')
    .action(async (options) => {
      const adapter = new AgentDBReasoningBankAdapter();
      await adapter.initialize();

      const patterns = await adapter.retrieveMemories({
        domain: options.domain,
        limit: 10000,
      });

      const fs = await import('fs/promises');
      await fs.writeFile(
        options.output,
        JSON.stringify(patterns, null, 2)
      );

      console.log(`✅ Exported ${patterns.length} patterns to ${options.output}`);
      await adapter.close();
    });

  // Import command
  program
    .command('import <file>')
    .description('Import patterns from JSON')
    .action(async (file) => {
      const adapter = new AgentDBReasoningBankAdapter();
      await adapter.initialize();

      const fs = await import('fs/promises');
      const data = await fs.readFile(file, 'utf-8');
      const patterns = JSON.parse(data);

      console.log(`📥 Importing ${patterns.length} patterns...`);

      let count = 0;
      for (const pattern of patterns) {
        await adapter.insertPattern(pattern);
        count++;

        if (count % 100 === 0) {
          console.log(`   Progress: ${count}/${patterns.length}`);
        }
      }

      console.log(`✅ Imported ${count} patterns`);
      await adapter.close();
    });

  return program;
}

/**
 * Run CLI
 */
export async function runAgentDBCLI(args: string[]): Promise<void> {
  const program = createAgentDBCLI();
  await program.parseAsync(args);
}
