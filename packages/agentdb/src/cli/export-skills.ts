#!/usr/bin/env node
/**
 * export-skills.ts - Export skills from AgentDB to JSON cache
 * 
 * Usage:
 *   npx tsx src/cli/export-skills.ts --circle orchestrator --output .cache/skills/orchestrator.json
 *   npx tsx src/cli/export-skills.ts --all --output-dir .cache/skills
 */

import { SkillLibrary } from '../controllers/SkillLibrary.js';
import fs from 'fs';
import path from 'path';

interface ExportOptions {
  circle?: string;
  all?: boolean;
  outputDir?: string;
  outputFile?: string;
  dbPath?: string;
}

const CIRCLES = ['orchestrator', 'assessor', 'innovator', 'analyst', 'seeker', 'intuitive'];

async function exportSkills(options: ExportOptions): Promise<void> {
  const dbPath = options.dbPath || './data/agentdb.sqlite';
  const skillLib = new SkillLibrary(dbPath);

  if (options.all) {
    // Export all circles
    const outputDir = options.outputDir || '.cache/skills';
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📦 Exporting skills for all circles to ${outputDir}...`);

    for (const circle of CIRCLES) {
      try {
        const skills = await skillLib.querySkills({ circle });
        
        const cache = {
          circle,
          skills: skills.map(s => ({
            name: s.name,
            description: s.description || '',
            parameters: s.parameters || {},
            learnedAt: s.learnedAt
          })),
          cached_at: new Date().toISOString(),
          source: 'agentdb'
        };

        const outputPath = path.join(outputDir, `${circle}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(cache, null, 2));
        console.log(`  ✅ ${circle}: ${skills.length} skills exported`);
      } catch (err) {
        console.error(`  ❌ ${circle}: Export failed - ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Skills export complete`);
  } else if (options.circle) {
    // Export single circle
    const skills = await skillLib.querySkills({ circle: options.circle });
    
    const cache = {
      circle: options.circle,
      skills: skills.map(s => ({
        name: s.name,
        description: s.description || '',
        parameters: s.parameters || {},
        learnedAt: s.learnedAt
      })),
      cached_at: new Date().toISOString(),
      source: 'agentdb'
    };

    const outputFile = options.outputFile || `.cache/skills/${options.circle}.json`;
    const outputDir = path.dirname(outputFile);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(cache, null, 2));
    console.log(`✅ Exported ${skills.length} skills for ${options.circle} to ${outputFile}`);
  } else {
    console.error('❌ Error: Must specify --circle <name> or --all');
    process.exit(1);
  }
}

// Parse CLI arguments
function parseArgs(): ExportOptions {
  const args = process.argv.slice(2);
  const options: ExportOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--circle':
        options.circle = args[++i];
        break;
      case '--all':
        options.all = true;
        break;
      case '--output':
      case '-o':
        options.outputFile = args[++i];
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--db-path':
        options.dbPath = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: export-skills [options]

Options:
  --circle <name>       Export skills for a specific circle
  --all                 Export skills for all circles
  --output, -o <file>   Output file path (for single circle)
  --output-dir <dir>    Output directory (for --all)
  --db-path <path>      Path to AgentDB SQLite database
  --help, -h            Show this help message

Examples:
  export-skills --circle orchestrator --output ./cache/orchestrator.json
  export-skills --all --output-dir ./.cache/skills
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  
  exportSkills(options)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Export failed:', err.message);
      process.exit(1);
    });
}

export { exportSkills };
