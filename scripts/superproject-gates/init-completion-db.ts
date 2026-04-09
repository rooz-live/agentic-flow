#!/usr/bin/env npx tsx
/**
 * Initialize Completion Tracker Database Schema
 * 
 * Run this once to set up the required tables for ay yo interactive dashboard
 */

import { CompletionTracker } from '../src/core/completion-tracker.js';

async function initializeDatabase() {
  console.log('🔧 Initializing completion tracking database...');
  
  const tracker = new CompletionTracker();
  
  try {
    await tracker.initSchema();
    console.log('✅ Database schema initialized successfully');
    console.log('');
    console.log('Tables created:');
    console.log('  - completion_episodes');
    console.log('  - circle_metrics (view)');
    console.log('  - phase_metrics (view)');
    console.log('');
    console.log('You can now run: ay yo');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  } finally {
    tracker.close();
  }
}

initializeDatabase();
