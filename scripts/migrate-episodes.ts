#!/usr/bin/env node
/**
 * Episode Migration Script
 * Imports episodes from .episodes/ JSON files into SQLite database
 */

import { promises as fs } from 'fs';
import path from 'path';
import { initDatabase } from '../src/db/connection';
import EpisodeRepository, { Episode } from '../src/db/repositories/EpisodeRepository';

const ROOT_DIR = path.resolve(__dirname, '..');
const EPISODES_DIR = path.join(ROOT_DIR, '.episodes');

interface MigrationStats {
  filesProcessed: number;
  episodesImported: number;
  episodesSkipped: number;
  errors: number;
}

async function main() {
  console.log('🚀 Starting episode migration...\n');

  const stats: MigrationStats = {
    filesProcessed: 0,
    episodesImported: 0,
    episodesSkipped: 0,
    errors: 0
  };

  try {
    // Initialize database
    console.log('📊 Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized\n');

    // Check if episodes directory exists
    try {
      await fs.access(EPISODES_DIR);
    } catch {
      console.log('⚠️  Episodes directory not found, creating it...');
      await fs.mkdir(EPISODES_DIR, { recursive: true });
      console.log('✅ Episodes directory created\n');
      console.log('ℹ️  No episodes to migrate. Exiting.');
      return;
    }

    // Read all episode files
    console.log('📁 Reading episode files...');
    const files = await fs.readdir(EPISODES_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log(`Found ${jsonFiles.length} episode files\n`);

    if (jsonFiles.length === 0) {
      console.log('ℹ️  No episodes to migrate. Exiting.');
      return;
    }

    // Process files in batches
    const BATCH_SIZE = 100;
    const episodes: Episode[] = [];

    for (const file of jsonFiles) {
      stats.filesProcessed++;
      
      try {
        const filePath = path.join(EPISODES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Extract episode ID from filename: {circle}_{ceremony}_{timestamp}.json
        const episodeId = file.replace('.json', '');
        const parts = episodeId.split('_');

        if (parts.length < 3) {
          console.log(`⚠️  Skipping ${file}: invalid filename format`);
          stats.episodesSkipped++;
          continue;
        }

        const [circle, ceremony, timestampStr] = parts;
        const timestamp = parseInt(timestampStr, 10);

        if (isNaN(timestamp)) {
          console.log(`⚠️  Skipping ${file}: invalid timestamp`);
          stats.episodesSkipped++;
          continue;
        }

        // Create episode object
        const episode: Episode = {
          episode_id: episodeId,
          circle,
          ceremony,
          timestamp,
          state: data.state ? JSON.stringify(data.state) : undefined,
          action: data.action,
          reward: data.reward,
          next_state: data.next_state ? JSON.stringify(data.next_state) : undefined,
          done: data.done,
          metadata: data.metadata ? JSON.stringify(data.metadata) : JSON.stringify(data)
        };

        episodes.push(episode);

        // Process batch when full
        if (episodes.length >= BATCH_SIZE) {
          const imported = await EpisodeRepository.bulkCreateEpisodes(episodes);
          stats.episodesImported += imported;
          console.log(`✅ Imported batch: ${imported} episodes`);
          episodes.length = 0; // Clear array
        }

      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error);
        stats.errors++;
      }
    }

    // Process remaining episodes
    if (episodes.length > 0) {
      const imported = await EpisodeRepository.bulkCreateEpisodes(episodes);
      stats.episodesImported += imported;
      console.log(`✅ Imported final batch: ${imported} episodes`);
    }

    // Display statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Files processed:    ${stats.filesProcessed}`);
    console.log(`Episodes imported:  ${stats.episodesImported}`);
    console.log(`Episodes skipped:   ${stats.episodesSkipped}`);
    console.log(`Errors:             ${stats.errors}`);
    console.log('='.repeat(60));

    // Verify data
    console.log('\n🔍 Verifying migration...');
    const totalCount = await EpisodeRepository.getTotalEpisodeCount();
    const equity = await EpisodeRepository.getCircleEquity();

    console.log(`\nTotal episodes in database: ${totalCount}`);
    console.log('\nCircle equity distribution:');
    for (const circle of equity) {
      console.log(`  ${circle.circle.padEnd(12)} ${circle.episode_count.toString().padStart(4)} episodes (${circle.percentage.toFixed(1)}%)`);
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main().then(() => {
  console.log('\n👋 Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
