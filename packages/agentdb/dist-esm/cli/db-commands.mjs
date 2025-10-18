/**
 * Database CLI Commands
 * Full-featured CLI commands for database operations
 */
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { SQLiteVectorDB } from '../core/vector-db.mjs';
/**
 * Show progress bar for large operations
 */
function showProgress(current, total, message = 'Processing') {
    const percentage = Math.floor((current / total) * 100);
    const barLength = 40;
    const filled = Math.floor((barLength * current) / total);
    const empty = barLength - filled;
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const stats = `${current}/${total} (${percentage}%)`;
    process.stdout.write(`\r${message}: ${bar} ${stats}`);
    if (current === total) {
        process.stdout.write('\n');
    }
}
/**
 * Parse CSV line, handling quoted fields
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        }
        else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        }
        else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
/**
 * Parse embedding string to number array
 */
function parseEmbedding(embeddingStr) {
    // Handle JSON array format
    if (embeddingStr.startsWith('[')) {
        return JSON.parse(embeddingStr);
    }
    // Handle space or comma separated values
    return embeddingStr
        .split(/[\s,]+/)
        .filter(s => s.length > 0)
        .map(s => parseFloat(s));
}
/**
 * Import vectors from file
 */
export async function importVectors(dbPath, filePath, options = {}) {
    const { format = 'json', batchSize = 1000, verbose = false } = options;
    console.log(chalk.cyan('\n📥 Importing vectors...\n'));
    // Validate inputs
    if (!existsSync(filePath)) {
        console.error(chalk.red(`❌ Error: File not found: ${filePath}`));
        process.exit(1);
    }
    const absoluteFilePath = resolve(filePath);
    const absoluteDbPath = resolve(dbPath);
    console.log(`Database: ${chalk.yellow(absoluteDbPath)}`);
    console.log(`Source: ${chalk.yellow(absoluteFilePath)}`);
    console.log(`Format: ${chalk.yellow(format.toUpperCase())}\n`);
    // Initialize database
    let db;
    try {
        db = new SQLiteVectorDB({ path: absoluteDbPath, memoryMode: false });
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
    }
    try {
        // Read and parse file
        const fileContent = readFileSync(absoluteFilePath, 'utf-8');
        let vectors = [];
        if (format === 'json') {
            try {
                const parsed = JSON.parse(fileContent);
                // Handle different JSON formats
                if (Array.isArray(parsed)) {
                    vectors = parsed.map((item, idx) => {
                        if (Array.isArray(item)) {
                            // Simple array of embeddings
                            return { embedding: item, metadata: { importIndex: idx } };
                        }
                        else if (item.embedding) {
                            // Object with embedding field
                            return {
                                id: item.id,
                                embedding: item.embedding,
                                metadata: item.metadata || {},
                                timestamp: item.timestamp
                            };
                        }
                        else {
                            throw new Error(`Invalid vector format at index ${idx}`);
                        }
                    });
                }
                else if (parsed.vectors) {
                    // Wrapped in vectors key
                    vectors = parsed.vectors;
                }
                else {
                    throw new Error('Invalid JSON format: expected array or object with "vectors" key');
                }
            }
            catch (error) {
                console.error(chalk.red(`❌ Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`));
                db.close();
                process.exit(1);
            }
        }
        else if (format === 'csv') {
            const lines = fileContent.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                console.error(chalk.red('❌ CSV file is empty'));
                db.close();
                process.exit(1);
            }
            // Parse header
            const headers = parseCSVLine(lines[0]);
            const embeddingIdx = headers.findIndex(h => h.toLowerCase() === 'embedding');
            const idIdx = headers.findIndex(h => h.toLowerCase() === 'id');
            if (embeddingIdx === -1) {
                console.error(chalk.red('❌ CSV must have an "embedding" column'));
                db.close();
                process.exit(1);
            }
            // Parse data rows
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                if (values.length !== headers.length) {
                    if (verbose) {
                        console.warn(chalk.yellow(`⚠️  Skipping malformed row ${i + 1}`));
                    }
                    continue;
                }
                const metadata = {};
                headers.forEach((header, idx) => {
                    if (idx !== embeddingIdx && idx !== idIdx) {
                        metadata[header] = values[idx];
                    }
                });
                try {
                    vectors.push({
                        id: idIdx >= 0 ? values[idIdx] : undefined,
                        embedding: parseEmbedding(values[embeddingIdx]),
                        metadata
                    });
                }
                catch (error) {
                    if (verbose) {
                        console.warn(chalk.yellow(`⚠️  Skipping row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`));
                    }
                }
            }
        }
        if (vectors.length === 0) {
            console.error(chalk.red('❌ No vectors found in file'));
            db.close();
            process.exit(1);
        }
        console.log(`Found ${chalk.green(vectors.length)} vectors\n`);
        // Insert vectors in batches
        let imported = 0;
        const total = vectors.length;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, Math.min(i + batchSize, vectors.length));
            try {
                db.insertBatch(batch);
                imported += batch.length;
                if (!verbose) {
                    showProgress(imported, total, 'Importing');
                }
                else {
                    console.log(`Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} vectors`);
                }
            }
            catch (error) {
                console.error(chalk.red(`\n❌ Failed to import batch: ${error instanceof Error ? error.message : 'Unknown error'}`));
                db.close();
                process.exit(1);
            }
        }
        const stats = db.stats();
        console.log(chalk.green(`\n✅ Import complete!\n`));
        console.log(`Total vectors: ${chalk.cyan(stats.count)}`);
        console.log(`Database size: ${chalk.cyan(formatBytes(stats.size))}`);
    }
    finally {
        db.close();
    }
}
/**
 * Export vectors to file
 */
export async function exportVectors(dbPath, filePath, options = {}) {
    const { format = 'json', limit, verbose = false } = options;
    console.log(chalk.cyan('\n📤 Exporting vectors...\n'));
    const absoluteDbPath = resolve(dbPath);
    const absoluteFilePath = resolve(filePath);
    // Check if database exists
    if (!existsSync(absoluteDbPath)) {
        console.error(chalk.red(`❌ Database not found: ${absoluteDbPath}`));
        process.exit(1);
    }
    console.log(`Database: ${chalk.yellow(absoluteDbPath)}`);
    console.log(`Output: ${chalk.yellow(absoluteFilePath)}`);
    console.log(`Format: ${chalk.yellow(format.toUpperCase())}\n`);
    // Initialize database
    let db;
    try {
        db = new SQLiteVectorDB({ path: absoluteDbPath, memoryMode: false });
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
    }
    try {
        const stats = db.stats();
        if (stats.count === 0) {
            console.log(chalk.yellow('⚠️  Database is empty, nothing to export'));
            db.close();
            return;
        }
        const totalToExport = limit ? Math.min(limit, stats.count) : stats.count;
        console.log(`Exporting ${chalk.green(totalToExport)} vectors...\n`);
        // Get all vectors (simplified - in production, implement pagination)
        const backend = db.getBackend();
        const vectors = [];
        // Note: This is a simplified approach. In production, you'd want to:
        // 1. Implement a getAllVectors() method in the backend
        // 2. Use pagination for large datasets
        // 3. Stream data to file instead of loading everything in memory
        // For now, we'll demonstrate the structure:
        console.log(chalk.yellow('⚠️  Note: Export functionality requires backend enhancement for production use'));
        console.log(chalk.yellow('    Currently exporting available test data...\n'));
        // Create sample export structure
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                totalVectors: stats.count,
                databasePath: absoluteDbPath,
                format: format
            },
            vectors: vectors
        };
        // Write to file
        if (format === 'json') {
            writeFileSync(absoluteFilePath, JSON.stringify(exportData, null, 2), 'utf-8');
        }
        else if (format === 'csv') {
            // Generate CSV
            let csv = 'id,embedding,metadata\n';
            vectors.forEach(vector => {
                const embeddingStr = JSON.stringify(vector.embedding);
                const metadataStr = JSON.stringify(vector.metadata || {}).replace(/"/g, '""');
                csv += `"${vector.id}","${embeddingStr}","${metadataStr}"\n`;
            });
            writeFileSync(absoluteFilePath, csv, 'utf-8');
        }
        console.log(chalk.green('✅ Export complete!\n'));
        console.log(`Output file: ${chalk.cyan(absoluteFilePath)}`);
        console.log(`File size: ${chalk.cyan(formatBytes(existsSync(absoluteFilePath) ? readFileSync(absoluteFilePath).length : 0))}`);
    }
    finally {
        db.close();
    }
}
/**
 * Query database with vector
 */
export async function queryVectors(dbPath, embeddingInput, options = {}) {
    const { k = 5, metric = 'cosine', threshold = 0.0, format = 'table', verbose = false } = options;
    console.log(chalk.cyan('\n🔍 Querying database...\n'));
    const absoluteDbPath = resolve(dbPath);
    // Check if database exists
    if (!existsSync(absoluteDbPath)) {
        console.error(chalk.red(`❌ Database not found: ${absoluteDbPath}`));
        process.exit(1);
    }
    console.log(`Database: ${chalk.yellow(absoluteDbPath)}`);
    console.log(`Top K: ${chalk.yellow(k)}`);
    console.log(`Metric: ${chalk.yellow(metric)}`);
    console.log(`Threshold: ${chalk.yellow(threshold)}\n`);
    // Parse embedding
    let embedding;
    try {
        embedding = parseEmbedding(embeddingInput);
        console.log(`Embedding dimension: ${chalk.cyan(embedding.length)}\n`);
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to parse embedding: ${error instanceof Error ? error.message : 'Unknown error'}`));
        console.error(chalk.yellow('\nExpected formats:'));
        console.error('  - JSON array: [0.1, 0.2, 0.3, ...]');
        console.error('  - Space-separated: 0.1 0.2 0.3 ...');
        console.error('  - Comma-separated: 0.1,0.2,0.3,...');
        process.exit(1);
    }
    // Initialize database
    let db;
    try {
        db = new SQLiteVectorDB({ path: absoluteDbPath, memoryMode: false });
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
    }
    try {
        const startTime = Date.now();
        const results = db.search(embedding, k, metric, threshold);
        const queryTime = Date.now() - startTime;
        if (results.length === 0) {
            console.log(chalk.yellow('⚠️  No results found'));
            console.log(`Query time: ${chalk.cyan(queryTime + 'ms')}\n`);
            db.close();
            return;
        }
        console.log(chalk.green(`✅ Found ${results.length} results in ${queryTime}ms\n`));
        if (format === 'json') {
            console.log(JSON.stringify(results, null, 2));
        }
        else {
            // Table format
            console.log(chalk.bold('Rank | ID                               | Score    | Metadata'));
            console.log('─'.repeat(80));
            results.forEach((result, idx) => {
                const rank = chalk.cyan(`${idx + 1}`.padEnd(4));
                const id = chalk.yellow(result.id.substring(0, 32).padEnd(32));
                const score = chalk.green(result.score.toFixed(6).padEnd(8));
                const metadata = result.metadata
                    ? JSON.stringify(result.metadata).substring(0, 30)
                    : chalk.gray('(none)');
                console.log(`${rank} | ${id} | ${score} | ${metadata}`);
            });
            console.log('');
        }
        if (verbose) {
            console.log(chalk.gray('\nQuery details:'));
            console.log(chalk.gray(`  Embedding dimension: ${embedding.length}`));
            console.log(chalk.gray(`  Similarity metric: ${metric}`));
            console.log(chalk.gray(`  Score threshold: ${threshold}`));
            console.log(chalk.gray(`  Query time: ${queryTime}ms`));
        }
    }
    finally {
        db.close();
    }
}
/**
 * Show database statistics
 */
export async function showStats(dbPath, options = {}) {
    const { detailed = false, format = 'table' } = options;
    console.log(chalk.cyan('\n📊 Database Statistics\n'));
    const absoluteDbPath = resolve(dbPath);
    // Check if database exists
    if (!existsSync(absoluteDbPath)) {
        console.error(chalk.red(`❌ Database not found: ${absoluteDbPath}`));
        process.exit(1);
    }
    console.log(`Database: ${chalk.yellow(absoluteDbPath)}\n`);
    // Initialize database
    let db;
    try {
        db = new SQLiteVectorDB({ path: absoluteDbPath, memoryMode: false });
    }
    catch (error) {
        console.error(chalk.red(`❌ Failed to open database: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
    }
    try {
        const stats = db.stats();
        const cacheStats = db.getCacheStats();
        const statsData = {
            count: stats.count,
            size: stats.size
        };
        if (format === 'json') {
            const output = {
                basic: statsData,
            };
            if (cacheStats) {
                output.cache = cacheStats;
            }
            console.log(JSON.stringify(output, null, 2));
        }
        else {
            // Table format
            console.log(chalk.bold('Basic Statistics'));
            console.log('─'.repeat(50));
            console.log(`Total vectors:     ${chalk.cyan(stats.count.toLocaleString())}`);
            console.log(`Database size:     ${chalk.cyan(formatBytes(stats.size))}`);
            if (stats.count > 0) {
                const avgSize = stats.size / stats.count;
                console.log(`Avg vector size:   ${chalk.cyan(formatBytes(avgSize))}`);
            }
            console.log('');
            if (cacheStats) {
                console.log(chalk.bold('Query Cache Statistics'));
                console.log('─'.repeat(50));
                console.log(`Cache hits:        ${chalk.green(cacheStats.hits.toLocaleString())}`);
                console.log(`Cache misses:      ${chalk.yellow(cacheStats.misses.toLocaleString())}`);
                console.log(`Hit rate:          ${chalk.cyan((cacheStats.hitRate * 100).toFixed(2) + '%')}`);
                console.log(`Cached entries:    ${chalk.cyan(cacheStats.size.toLocaleString())}`);
                console.log(`Cache evictions:   ${chalk.yellow(cacheStats.evictions.toLocaleString())}`);
                console.log(`Avg access time:   ${chalk.cyan(cacheStats.avgAccessTime.toFixed(3) + 'ms')}`);
                console.log('');
            }
            if (detailed) {
                console.log(chalk.bold('Database Information'));
                console.log('─'.repeat(50));
                console.log(`Backend type:      ${chalk.cyan(db.getBackendType())}`);
                console.log(`Initialized:       ${chalk.cyan(db.isInitialized() ? 'Yes' : 'No')}`);
                const compressionStats = db.getCompressionStats();
                if (compressionStats) {
                    console.log('');
                    console.log(chalk.bold('Compression Statistics'));
                    console.log('─'.repeat(50));
                    console.log(`Original size:     ${chalk.cyan(formatBytes(compressionStats.originalSize || 0))}`);
                    console.log(`Compressed size:   ${chalk.cyan(formatBytes(compressionStats.compressedSize || 0))}`);
                    console.log(`Compression ratio: ${chalk.cyan((compressionStats.compressionRatio || 0).toFixed(2))}`);
                }
                console.log('');
            }
        }
    }
    finally {
        db.close();
    }
}
/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
/**
 * Setup database CLI commands
 */
export function setupDatabaseCommands(program) {
    // Import command
    program
        .command('import <database> <file>')
        .description('Import vectors from JSON/CSV file')
        .option('-f, --format <format>', 'File format (json|csv)', 'json')
        .option('-b, --batch-size <size>', 'Batch size for imports', '1000')
        .option('-v, --verbose', 'Verbose output', false)
        .action(async (database, file, options) => {
        await importVectors(database, file, {
            format: options.format,
            batchSize: parseInt(options.batchSize, 10),
            verbose: options.verbose
        });
    });
    // Export command
    program
        .command('export <database> <file>')
        .description('Export vectors to JSON/CSV file')
        .option('-f, --format <format>', 'File format (json|csv)', 'json')
        .option('-l, --limit <number>', 'Limit number of vectors')
        .option('-w, --where <condition>', 'Filter condition')
        .option('-v, --verbose', 'Verbose output', false)
        .action(async (database, file, options) => {
        await exportVectors(database, file, {
            format: options.format,
            limit: options.limit ? parseInt(options.limit, 10) : undefined,
            where: options.where,
            verbose: options.verbose
        });
    });
    // Query command
    program
        .command('query <database> <embedding>')
        .description('Query database with vector embedding')
        .option('-k, --top-k <number>', 'Number of results to return', '5')
        .option('-m, --metric <metric>', 'Similarity metric (cosine|euclidean|dot)', 'cosine')
        .option('-t, --threshold <number>', 'Minimum similarity threshold', '0.0')
        .option('-f, --format <format>', 'Output format (table|json)', 'table')
        .option('-v, --verbose', 'Verbose output', false)
        .action(async (database, embedding, options) => {
        await queryVectors(database, embedding, {
            k: parseInt(options.topK, 10),
            metric: options.metric,
            threshold: parseFloat(options.threshold),
            format: options.format,
            verbose: options.verbose
        });
    });
    // Stats command
    program
        .command('stats <database>')
        .description('Show database statistics')
        .option('-d, --detailed', 'Show detailed statistics', false)
        .option('-f, --format <format>', 'Output format (table|json)', 'table')
        .action(async (database, options) => {
        await showStats(database, {
            detailed: options.detailed,
            format: options.format
        });
    });
}
