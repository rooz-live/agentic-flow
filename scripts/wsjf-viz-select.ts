#!/usr/bin/env tsx
/**
 * WSJF Visualization Selector CLI
 * Run with: npx tsx scripts/wsjf-viz-select.ts
 */

import { selectVisualizationForAgenticFlow } from '../src/planning/wsjf-visualization-selector';

console.log('Running WSJF Visualization Selector for agentic-flow...\n');
selectVisualizationForAgenticFlow();
