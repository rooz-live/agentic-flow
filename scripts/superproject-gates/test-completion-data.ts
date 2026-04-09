#!/usr/bin/env npx tsx
import { CompletionTracker } from '../src/core/completion-tracker.js';

async function test() {
  const tracker = new CompletionTracker();
  
  try {
    console.log('Testing CompletionTracker data access...\n');
    
    const system = await tracker.getSystemOverview();
    console.log('System Overview:');
    console.log(JSON.stringify(system, null, 2));
    
    console.log('\nCircle Metrics:');
    const circles = await tracker.getAllCircleMetrics();
    console.log(JSON.stringify(circles, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    tracker.close();
  }
}

test();
