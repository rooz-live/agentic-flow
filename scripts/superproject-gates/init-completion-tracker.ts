#!/usr/bin/env npx tsx
/**
 * Initialize CompletionTracker schema
 */

import { CompletionTracker } from '../src/core/completion-tracker.js';

async function initSchema() {
  console.log('🔧 Initializing CompletionTracker schema...\n');
  
  try {
    const tracker = new CompletionTracker();
    await tracker.initSchema();
    console.log('✅ Schema initialized successfully');
    
    // Verify tables and views were created
    const tables = await (tracker as any).agentdb.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%completion%'"
    );
    console.log(`\n📊 Created tables: ${tables.map((t: any) => t.name).join(', ')}`);
    
    const views = await (tracker as any).agentdb.query(
      "SELECT name FROM sqlite_master WHERE type='view' AND name LIKE '%metrics%'"
    );
    console.log(`📈 Created views: ${views.map((v: any) => v.name).join(', ')}`);
    
    tracker.close();
  } catch (error) {
    console.error('\n❌ Error initializing schema:', error);
    process.exit(1);
  }
}

initSchema();
