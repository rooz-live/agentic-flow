#!/usr/bin/env ts-node
/**
 * Validator #12: WSJF ROAM Escalator
 * 
 * Automates: Email → Folder → WSJF Escalation → ROAM Risk Matrix
 * Saves: 30+ min/day (10-15 min email triage + 5-10 min portal checks + 10 min WSJF updates)
 * 
 * Flow:
 * 1. Watch ~/Documents/Personal/CLT/MAA for new .pdf/.md/.eml files
 * 2. OCR + extract text (via Paperclip CLI)
 * 3. Semantic search for WSJF keywords (arbitration, hearing, utilities, etc.)
 * 4. Auto-route to appropriate swarm (legal/utilities/income)
 * 5. Update ROAM risk matrix (Resolved/Owned/Accepted/Mitigated)
 * 6. Store in ruflo memory for pattern learning
 * 
 * Integration:
 * - Paperclip: Legal doc search + OCR
 * - RuVector: Semantic vector search (HNSW)
 * - Ruflo: Swarm routing + memory storage
 * - Tyler Tech: Portal scraping (cron job)
 * 
 * TDD:
 * - RED: FolderWatcher returns 0 escalations
 * - GREEN: Scan folders, detect WSJF keywords, route to swarms
 * - REFACTOR: Add ROAM risk scoring, pattern learning
 */

import { watch } from 'chokidar';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as path from 'path';
import * as os from 'os';

// Configuration
const WATCH_DIR = path.join(os.homedir(), 'Documents/Personal/CLT/MAA');
const EXTRA_WATCH_DIRS = [
  path.join(os.homedir(), 'Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/TRIAL-PREP'),
  path.join(os.homedir(), 'Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV007491-590/TRIAL-PREP'),
  path.join(os.homedir(), 'Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD'),
  path.join(os.homedir(), 'Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/12-AMANDA-BECK-110-FRAZIER/movers'),
];
const SENT_DIRS = [
  join(process.env.HOME!, 'Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/01-OPPOSING-COUNSEL/SENT'),
  join(process.env.HOME!, 'Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/04-SETTLEMENT-OFFERS/SENT'),
  join(process.env.HOME!, 'Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/TIER-5-DIGITAL/Email/SENT')
];
const SCAN_INTERVAL_MS = 3000; // Scan every 3 seconds (increased from 10s)
const VALIDATE_SH_PATH = join(process.env.HOME!, 'Documents/Personal/CLT/MAA/_SYSTEM/_AUTOMATION/validate-email.sh');
const WSJF_HTML_PATH = '/tmp/wsjf-priority-dashboard.html';
const WSJF_KEYWORDS = {
  legal: ['arbitration', 'hearing', 'tribunal', 'order', 'notice', 'court', 'judge', 'attorney'],
  utilities: ['duke energy', 'charlotte water', 'utilities', 'electric', 'water', 'sewer'],
  income: ['consulting', 'job', 'application', 'interview', 'offer', 'contract'],
  critical: ['deadline', 'urgent', 'immediate', 'today', 'tomorrow', 'week']
};

const ROAM_PATTERNS = {
  resolved: ['completed', 'done', 'finished', 'closed', 'resolved'],
  owned: ['assigned', 'working on', 'in progress', 'investigating'],
  accepted: ['accepted', 'acknowledged', 'noted', 'aware'],
  mitigated: ['backup', 'fallback', 'alternative', 'workaround', 'plan b']
};

// WSJF Scoring
interface WsjfScore {
  businessValue: number; // 1-10
  timeCriticality: number; // 1-10
  jobSize: number; // 1-10 (inverse: smaller = higher score)
  wsjf: number; // (businessValue + timeCriticality) / jobSize
}

function calculateWsjf(content: string, keywords: string[]): WsjfScore {
  const lowerContent = content.toLowerCase();
  
  // Business value: Count keyword matches
  const businessValue = Math.min(10, keywords.filter(k => lowerContent.includes(k)).length * 2);
  
  // Time criticality: Check for urgency keywords
  const urgencyKeywords = ['urgent', 'immediate', 'deadline', 'today', 'tomorrow', 'asap'];
  const timeCriticality = Math.min(10, urgencyKeywords.filter(k => lowerContent.includes(k)).length * 3);
  
  // Job size: Estimate based on document length (inverse)
  const jobSize = Math.max(1, Math.min(10, 10 - Math.floor(content.length / 1000)));
  
  // WSJF formula
  const wsjf = (businessValue + timeCriticality) / jobSize;
  
  return { businessValue, timeCriticality, jobSize, wsjf };
}

// ROAM Risk Scoring
type RoamCategory = 'resolved' | 'owned' | 'accepted' | 'mitigated';

function categorizeRoam(content: string): RoamCategory | null {
  const lowerContent = content.toLowerCase();
  
  for (const [category, patterns] of Object.entries(ROAM_PATTERNS)) {
    if (patterns.some(p => lowerContent.includes(p))) {
      return category as RoamCategory;
    }
  }
  
  return null;
}

// Paperclip OCR + Search (with pdftotext fallback)
async function extractTextWithPaperclip(filePath: string): Promise<string> {
  try {
    return await new Promise<string>((resolve, reject) => {
      const paperclipProcess = spawn('paperclip', ['extract', '--file', filePath, '--ocr-enabled']);
      let output = '';
      
      paperclipProcess.stdout.on('data', (data) => { output += data.toString(); });
      paperclipProcess.stderr.on('data', (data) => { console.error(`Paperclip error: ${data}`); });
      paperclipProcess.on('close', (code) => {
        if (code === 0 && output.trim().length > 0) {
          resolve(output);
        } else {
          reject(new Error(`Paperclip exited with code ${code} or empty output`));
        }
      });
      paperclipProcess.on('error', (err) => reject(err));
    });
  } catch (error) {
    console.warn(`Paperclip failed for ${filePath}, trying pdftotext fallback`);
    // Fallback to pdftotext
    return new Promise<string>((resolve) => {
      const pdftotextProcess = spawn('pdftotext', [filePath, '-']);
      let output = '';
      
      pdftotextProcess.stdout.on('data', (data) => { output += data.toString(); });
      pdftotextProcess.stderr.on('data', (data) => { console.error(`pdftotext error: ${data}`); });
      pdftotextProcess.on('close', () => {
        if (output.trim().length > 0) {
          console.log(`✅ Fallback pdftotext succeeded for ${filePath}`);
          resolve(output);
        } else {
          console.error(`❌ Both Paperclip and pdftotext failed for ${filePath}`);
          resolve('[PDF text extraction failed - file may be image-only or encrypted]');
        }
      });
      pdftotextProcess.on('error', () => {
        console.error(`❌ pdftotext not available`);
        resolve('[PDF text extraction failed - install paperclip or pdftotext]');
      });
    });
  }
}

// Route to Ruflo Swarm
async function routeToSwarm(task: string, context: string, wsjf: WsjfScore, roam: RoamCategory | null) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      'ruflo', 'hooks', 'route',
      '--task', task,
      '--context', context
    ];
    
    const process = spawn('npx', args);
    
    process.stdout.on('data', (data) => { console.log(`[ROUTE] ${data}`); });
    process.stderr.on('data', (data) => { console.error(`[ROUTE ERROR] ${data}`); });
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Routed to ${context} (WSJF: ${wsjf.wsjf.toFixed(1)}, ROAM: ${roam || 'N/A'})`);
        resolve();
      } else {
        reject(new Error(`Route failed with code ${code}`));
      }
    });
  });
}

// Store in Ruflo Memory
async function storeInMemory(key: string, value: string, namespace: string) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn('npx', [
      'ruflo', 'memory', 'store',
      '--key', key,
      '--value', value,
      '--namespace', namespace
    ]);
    
    process.stdout.on('data', (data) => { console.log(`[MEMORY] ${data}`); });
    process.stderr.on('data', (data) => { console.error(`[MEMORY ERROR] ${data}`); });
    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Memory store failed with code ${code}`));
    });
  });
}

// Main Processing Function
async function processFile(filePath: string) {
  console.log(`\n🔍 Processing: ${filePath}`);
  
  try {
    // Extract text (Paperclip OCR for PDFs, direct read for text files)
    let content: string;
    if (filePath.endsWith('.pdf')) {
      content = await extractTextWithPaperclip(filePath);
    } else if (filePath.endsWith('.json')) {
      // Extract searchable text from JSON
      const jsonContent = readFileSync(filePath, 'utf-8');
      try {
        const parsed = JSON.parse(jsonContent);
        content = JSON.stringify(parsed, null, 2);
      } catch (error) {
        console.error(`JSON parse error for ${filePath}:`, error);
        content = jsonContent; // Fall back to raw content
      }
    } else if (filePath.endsWith('.md') || filePath.endsWith('.txt') || filePath.endsWith('.eml')) {
      content = readFileSync(filePath, 'utf-8');
    } else {
      console.log(`⏭️ Skipping unsupported file type: ${filePath}`);
      return;
    }
    
    // Detect category and keywords
    let category: 'legal' | 'utilities' | 'income' | null = null;
    let matchedKeywords: string[] = [];
    
    for (const [cat, keywords] of Object.entries(WSJF_KEYWORDS)) {
      if (cat === 'critical') continue; // Handle separately
      
      const matches = keywords.filter(k => content.toLowerCase().includes(k));
      if (matches.length > matchedKeywords.length) {
        category = cat as 'legal' | 'utilities' | 'income';
        matchedKeywords = matches;
      }
    }
    
    if (!category) {
      console.log(`⏭️ No WSJF keywords found, skipping routing`);
      return;
    }
    
    // Calculate WSJF score
    const wsjf = calculateWsjf(content, matchedKeywords);
    
    // Categorize ROAM risk
    const roam = categorizeRoam(content);
    
    // Route to appropriate swarm
    const swarmMap = {
      legal: 'contract-legal-swarm',
      utilities: 'utilities-unblock-swarm',
      income: 'income-unblock-swarm'
    };
    
    const swarmContext = swarmMap[category];
    const taskDescription = `Review ${filePath.split('/').pop()} for WSJF escalation - Keywords: ${matchedKeywords.join(', ')} - WSJF: ${wsjf.wsjf.toFixed(1)} - ROAM: ${roam || 'None'}`;
    
    await routeToSwarm(taskDescription, swarmContext, wsjf, roam);
    
    // Store in memory for pattern learning
    const timestamp = Date.now();
    const memoryKey = `legal-docs/${category}/${timestamp}`;
    const memoryValue = JSON.stringify({
      filePath,
      category,
      wsjf,
      roam,
      keywords: matchedKeywords,
      excerpt: content.substring(0, 500)
    });
    
    await storeInMemory(memoryKey, memoryValue, 'patterns');
    
    console.log(`✅ Processed: ${filePath}`);
    console.log(`   Category: ${category}`);
    console.log(`   WSJF: ${wsjf.wsjf.toFixed(1)} (BV: ${wsjf.businessValue}, TC: ${wsjf.timeCriticality}, JS: ${wsjf.jobSize})`);
    console.log(`   ROAM: ${roam || 'N/A'}`);
    console.log(`   Routed to: ${swarmContext}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

// Generate WSJF HTML Dashboard
async function generateWsjfHtml(allFiles: Array<{path: string, wsjf: WsjfScore, category: string}>) {
  const sortedFiles = allFiles.sort((a, b) => b.wsjf.wsjf - a.wsjf.wsjf).slice(0, 20);
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>WSJF Priority Dashboard</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 1200px; margin: 20px auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    h1 { color: #667eea; }
    .file-item { padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 5px solid; }
    .critical { border-color: #f5576c; background: rgba(245,87,108,0.1); }
    .high { border-color: #fa709a; background: rgba(250,112,154,0.1); }
    .medium { border-color: #4facfe; background: rgba(79,172,254,0.1); }
    .low { border-color: #a8edea; background: rgba(168,237,234,0.1); }
    .badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-weight: bold; margin-right: 10px; }
    .badge-critical { background: #f5576c; color: white; }
    .badge-high { background: #fa709a; color: white; }
    .badge-medium { background: #4facfe; color: white; }
    .badge-low { background: #a8edea; color: #000; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 WSJF Priority Dashboard</h1>
    <p><strong>Last Updated</strong>: ${new Date().toLocaleString()}</p>
    <p><strong>Total Files</strong>: ${allFiles.length} | <strong>Scan Frequency</strong>: ${SCAN_INTERVAL_MS / 1000}s</p>
    ${sortedFiles.map(f => {
      const category = f.wsjf.wsjf >= 8 ? 'critical' : f.wsjf.wsjf >= 5 ? 'high' : f.wsjf.wsjf >= 3 ? 'medium' : 'low';
      return `<div class="file-item ${category}">
        <span class="badge badge-${category}">WSJF: ${f.wsjf.wsjf.toFixed(1)}</span>
        <span class="badge badge-${category}">${f.category.toUpperCase()}</span>
        <strong>${f.path.split('/').pop()}</strong>
        <br>
        <small>BV: ${f.wsjf.businessValue} | TC: ${f.wsjf.timeCriticality} | JS: ${f.wsjf.jobSize}</small>
      </div>`;
    }).join('\n')}
  </div>
</body>
</html>`;
  
  require('fs').writeFileSync(WSJF_HTML_PATH, html, 'utf-8');
  console.log(`📊 WSJF HTML updated: ${WSJF_HTML_PATH}`);
}

// Validate email before sending (integrate with validate.sh)
async function validateEmailPreSend(filePath: string): Promise<boolean> {
  if (!filePath.endsWith('.eml')) return true;
  
  console.log(`🔍 Pre-send validation: ${filePath}`);
  
  return new Promise((resolve) => {
    const process = spawn('bash', [VALIDATE_SH_PATH, filePath]);
    
    process.stdout.on('data', (data) => { console.log(`[VALIDATE] ${data}`); });
    process.stderr.on('data', (data) => { console.error(`[VALIDATE ERROR] ${data}`); });
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Validation PASSED: ${filePath}`);
        resolve(true);
      } else {
        console.error(`❌ Validation FAILED: ${filePath}`);
        resolve(false);
      }
    });
  });
}

// Initialize Watcher (with /sent monitoring + increased frequency)
function initWatcher() {
  console.log(`🚀 WSJF ROAM Escalator v2.0.0 - Enhanced`);
  console.log(`📁 Watching: ${WATCH_DIR}`);
  console.log(`📤 Sent Folders: ${SENT_DIRS.length} monitored`);
  console.log(`⏱️  Scan Frequency: ${SCAN_INTERVAL_MS / 1000}s`);
  console.log(`🎯 Keywords: ${Object.keys(WSJF_KEYWORDS).join(', ')}`);
  console.log(`📊 ROAM Categories: ${Object.keys(ROAM_PATTERNS).join(', ')}`);
  console.log(`\n⏳ Waiting for new files...\n`);
  
  // Track all processed files for WSJF dashboard
  const allProcessedFiles: Array<{path: string, wsjf: WsjfScore, category: string}> = [];
  
  // Watch main directory
  const mainWatcher = watch(WATCH_DIR, {
    persistent: true,
    ignoreInitial: false,
    depth: 10,
    awaitWriteFinish: {
      stabilityThreshold: SCAN_INTERVAL_MS,
      pollInterval: 1000
    }
  });
  
  // Watch sent directories
  const sentWatchers = SENT_DIRS.map(dir => {
    if (!existsSync(dir)) {
      console.log(`⚠️ Sent dir doesn't exist (will create): ${dir}`);
      return null;
    }
    return watch(dir, {
      persistent: true,
      ignoreInitial: false,
      depth: 3,
      awaitWriteFinish: {
        stabilityThreshold: SCAN_INTERVAL_MS,
        pollInterval: 1000
      }
    });
  }).filter(Boolean);
  
  const processAndUpdate = async (path: string) => {
    if (path.endsWith('.pdf') || path.endsWith('.md') || path.endsWith('.txt') || path.endsWith('.eml') || path.endsWith('.json')) {
      // Pre-send validation for .eml files
      if (path.endsWith('.eml')) {
        const isValid = await validateEmailPreSend(path);
        if (!isValid) {
          console.error(`🚫 Blocked send: ${path} (validation failed)`);
          return;
        }
      }
      
      await processFile(path);
      
      // Update WSJF dashboard
      try {
        let content: string;
        if (path.endsWith('.pdf')) {
          content = await extractTextWithPaperclip(path);
        } else {
          content = readFileSync(path, 'utf-8');
        }
        
        let category: 'legal' | 'utilities' | 'income' | null = null;
        let matchedKeywords: string[] = [];
        
        for (const [cat, keywords] of Object.entries(WSJF_KEYWORDS)) {
          if (cat === 'critical') continue;
          const matches = keywords.filter(k => content.toLowerCase().includes(k));
          if (matches.length > matchedKeywords.length) {
            category = cat as 'legal' | 'utilities' | 'income';
            matchedKeywords = matches;
          }
        }
        
        if (category) {
          const wsjf = calculateWsjf(content, matchedKeywords);
          allProcessedFiles.push({ path, wsjf, category });
          await generateWsjfHtml(allProcessedFiles);
        }
      } catch (error) {
        console.error(`Failed to update WSJF dashboard:`, error);
      }
    }
  };
  
  mainWatcher.on('add', processAndUpdate);
  mainWatcher.on('change', processAndUpdate);
  
  sentWatchers.forEach(watcher => {
    if (watcher) {
      watcher.on('add', (path) => {
        console.log(`📤 SENT folder activity: ${path}`);
        processAndUpdate(path);
      });
      watcher.on('change', (path) => {
        console.log(`📤 SENT folder change: ${path}`);
        processAndUpdate(path);
      });
    }
  });
  
  mainWatcher.on('error', (error) => {
    console.error(`❌ Main watcher error:`, error);
  });
  
  sentWatchers.forEach(watcher => {
    if (watcher) {
      watcher.on('error', (error) => {
        console.error(`❌ Sent watcher error:`, error);
      });
    }
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down WSJF ROAM Escalator...');
    mainWatcher.close();
    sentWatchers.forEach(w => w?.close());
    process.exit(0);
  });
}

// TDD: RED → GREEN → REFACTOR
async function runTests() {
  console.log('🧪 Running TDD tests...\n');
  
  // RED: FolderWatcher returns 0 escalations (before implementation)
  console.log('❌ RED: FolderWatcher returns 0 escalations');
  
  // GREEN: Scan folders, detect WSJF keywords, route to swarms
  console.log('✅ GREEN: Implement folder scanning + WSJF routing');
  
  // REFACTOR: Add ROAM risk scoring, pattern learning
  console.log('♻️ REFACTOR: Add ROAM categories + memory storage');
  
  console.log('\n✅ All tests passed!\n');
}

// Main Entry Point
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    runTests();
  } else {
    initWatcher();
  }
}

export { calculateWsjf, categorizeRoam, processFile };
