#!/usr/bin/env ts-node
/**
 * Transform /code/numbers/ CSV files to structured JSON API format
 * Usage: npx ts-node scripts/transform-csv-to-json.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Domain validation regex
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;

interface DomainEntry {
  id: string;
  domain: string;
  cleanDomain: string;
  category: string;
  subcategory: string;
  syllables: number;
  letters: number;
  syllaletters: number;
  urls: string[];
  environment?: 'prod' | 'staging' | 'dev';
  phase?: string;
  tld: string;
  rowNum?: number;
  steamContext?: string;
  metadata: {
    source: string;
    extractedAt: string;
    rowNumber: number;
  };
}

interface APIResponse {
  version: string;
  generatedAt: string;
  count: number;
  domains: DomainEntry[];
  steamCategories: Record<string, string[]>;
  stats: {
    byTld: Record<string, number>;
    byEnvironment: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

function generateId(domain: string, index: number): string {
  return `domain-${domain.replace(/[^a-zA-Z0-9]/g, '-')}-${index}`;
}

function extractTld(domain: string): string {
  const match = domain.match(/\.[a-zA-Z]+$/);
  return match ? match[0] : '';
}

function cleanDomainString(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  // Remove common artifacts
  let cleaned = input
    .replace(/^\s*\(\s*/, '')
    .replace(/\s*\)\s*;?\s*$/, '')
    .replace(/^\s*\.\//, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Skip non-domain entries
  if (cleaned.includes('/') || cleaned.includes(' ')) {
    // Check if it's still a valid domain with path
    const domainMatch = cleaned.match(/^([a-zA-Z0-9.-]+)\//);
    if (domainMatch) {
      cleaned = domainMatch[1];
    } else {
      return null;
    }
  }

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/$/, '');

  // Validate domain format
  if (!DOMAIN_REGEX.test(cleaned)) {
    return null;
  }

  return cleaned.toLowerCase();
}

function parseDomainsCsv(filePath: string): Partial<DomainEntry>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const entries: Partial<DomainEntry>[] = [];
  let currentSteam = '';
  let rowNum = 0;

  for (const line of lines) {
    rowNum++;
    const cols = line.split(',');

    // Skip empty rows
    if (cols.length < 3) continue;

    // Check for STEAM category header
    const firstCol = cols[0]?.trim() || '';
    const steamMatch = firstCol.match(/^(\d+\s+)?(STREAM|STEAM)/i);
    if (steamMatch) {
      currentSteam = firstCol.replace(/^\s*\d+\s+/, '').replace(/\s+STREAM/i, ' STREAM');
      continue;
    }

    // Extract domain from column 2 or 3
    let domain = '';
    let category = '';
    let subcategory = '';

    // Try to find domain in any column
    for (const col of cols) {
      const cleaned = cleanDomainString(col);
      if (cleaned) {
        domain = cleaned;

        // Extract category context from row
        const fullLine = line.toLowerCase();
        if (fullLine.includes('app')) subcategory = 'App';
        else if (fullLine.includes('artisan')) subcategory = 'Artisan';
        else if (fullLine.includes('city')) subcategory = 'City';

        // Determine STEAM category from context
        if (fullLine.includes('science') || currentSteam.includes('Science')) {
          category = 'Science';
        } else if (fullLine.includes('tech') || currentSteam.includes('Tech')) {
          category = 'Technology';
        } else if (fullLine.includes('engineering') || fullLine.includes('function')) {
          category = 'Engineering';
        } else if (fullLine.includes('art') || fullLine.includes('aesthetic')) {
          category = 'Arts';
        } else if (fullLine.includes('math') || fullLine.includes('algebra')) {
          category = 'Mathematics';
        } else {
          category = 'General';
        }

        break;
      }
    }

    if (!domain) continue;

    // Extract numbers from columns
    let syllables = 0;
    let letters = 0;
    let syllaletters = 0;

    for (let i = 2; i < cols.length; i++) {
      const num = parseInt(cols[i]?.trim(), 10);
      if (!isNaN(num)) {
        if (syllables === 0) syllables = num;
        else if (letters === 0) letters = num;
        else if (syllaletters === 0) syllaletters = num;
      }
    }

    // Calculate if missing
    if (!letters && domain) letters = domain.replace(/\./g, '').length;
    if (!syllables && domain) {
      // Rough syllable count: count vowel groups
      const vowels = domain.match(/[aeiouy]+/gi);
      syllables = vowels ? vowels.length : Math.ceil(letters / 3);
    }
    if (!syllaletters) syllaletters = syllables * letters;

    entries.push({
      domain,
      category,
      subcategory,
      syllables,
      letters,
      syllaletters,
      rowNum,
      steamContext: currentSteam
    });
  }

  return entries;
}

function parseInterdisciplinarityCsv(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const steamMap: Record<string, string> = {};

  for (const line of lines.slice(1)) { // Skip header
    const cols = line.split(',');
    if (cols.length < 2) continue;

    const groupSpace = cols[0]?.trim();
    if (!groupSpace || groupSpace.startsWith('May mythological')) continue;

    // Map group to STEAM category
    let steamCategory = 'General';
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('physical') && lowerLine.includes('spacetime')) {
      steamCategory = 'Science';
    } else if (lowerLine.includes('digital') || lowerLine.includes('algorithm')) {
      steamCategory = 'Technology';
    } else if (lowerLine.includes('mechanical') && lowerLine.includes('materials')) {
      steamCategory = 'Engineering';
    } else if (lowerLine.includes('visual') || lowerLine.includes('aesthetic')) {
      steamCategory = 'Arts';
    } else if (lowerLine.includes('algebraic') || lowerLine.includes('geometric')) {
      steamCategory = 'Mathematics';
    }

    if (groupSpace) {
      steamMap[groupSpace] = steamCategory;
    }
  }

  return steamMap;
}

function buildApiResponse(entries: Partial<DomainEntry>[]): APIResponse {
  const seenDomains = new Set<string>();
  const domains: DomainEntry[] = [];
  const steamCategories: Record<string, string[]> = {
    Science: [],
    Technology: [],
    Engineering: [],
    Arts: [],
    Mathematics: [],
    General: []
  };

  const byTld: Record<string, number> = {};
  const byEnvironment: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.domain) continue;

    // Skip duplicates
    if (seenDomains.has(entry.domain)) continue;
    seenDomains.add(entry.domain);

    const tld = extractTld(entry.domain);

    // Determine environment from context
    let environment: 'prod' | 'staging' | 'dev' = 'dev';
    if (entry.domain.includes('prod') || entry.domain.includes('live')) {
      environment = 'prod';
    } else if (entry.domain.includes('staging') || entry.domain.includes('beta')) {
      environment = 'staging';
    }

    // Determine phase
    let phase = 'alpha';
    if (entry.domain.includes('beta')) phase = 'beta';
    if (entry.domain.includes('release') || entry.domain.includes('rtm')) phase = 'release';

    const cleanDomain = entry.domain.replace(/\.[a-zA-Z]+$/, '');

    const domainEntry: DomainEntry = {
      id: generateId(entry.domain, i),
      domain: entry.domain,
      cleanDomain,
      category: entry.category || 'General',
      subcategory: entry.subcategory || '',
      syllables: entry.syllables || 0,
      letters: entry.letters || 0,
      syllaletters: entry.syllaletters || 0,
      urls: [`https://${entry.domain}`],
      environment,
      phase,
      tld,
      metadata: {
        source: 'Domains.csv',
        extractedAt: new Date().toISOString(),
        rowNumber: entry.rowNum || 0
      }
    };

    domains.push(domainEntry);

    // Update stats
    steamCategories[entry.category || 'General']?.push(entry.domain);
    byTld[tld] = (byTld[tld] || 0) + 1;
    byEnvironment[environment] = (byEnvironment[environment] || 0) + 1;
    byCategory[entry.category || 'General'] = (byCategory[entry.category || 'General'] || 0) + 1;
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    count: domains.length,
    domains,
    steamCategories,
    stats: {
      byTld,
      byEnvironment,
      byCategory
    }
  };
}

function main() {
  const codeDir = '/Users/shahroozbhopti/Documents/code';
  const numbersDir = path.join(codeDir, 'numbers');
  const outputPath = path.join(codeDir, 'numbers_domains_api.json');

  console.log('🚀 Starting CSV to JSON transformation...\n');

  // Parse Domains.csv
  console.log('📖 Reading Domains.csv...');
  const domainEntries = parseDomainsCsv(path.join(numbersDir, 'Domains.csv'));
  console.log(`   Found ${domainEntries.length} domain entries\n`);

  // Parse Interdisciplinarity CSV for STEAM mapping
  console.log('📖 Reading Interdisciplinarity CSV...');
  const steamMap = parseInterdisciplinarityCsv(
    path.join(numbersDir, 'Interdisciplinarity Abstraction - Universality Emergence.csv')
  );
  console.log(`   Found ${Object.keys(steamMap).length} STEAM mappings\n`);

  // Build API response
  console.log('🔧 Building API response...');
  const apiResponse = buildApiResponse(domainEntries);

  // Write output
  console.log(`💾 Writing to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(apiResponse, null, 2), 'utf-8');

  // Success report
  console.log('\n✅ Transformation complete!\n');
  console.log('📊 Statistics:');
  console.log(`   Total domains: ${apiResponse.count}`);
  console.log(`   Unique TLDs: ${Object.keys(apiResponse.stats.byTld).length}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);

  console.log('📁 Output files:');
  console.log(`   ${outputPath}`);
  console.log(`   ${path.join(codeDir, 'scripts', 'transform-csv-to-json.ts')}\n`);

  // STEAM breakdown
  console.log('🎨 STEAM Categories:');
  for (const [category, domains] of Object.entries(apiResponse.steamCategories)) {
    if (domains.length > 0) {
      console.log(`   ${category}: ${domains.length} domains`);
    }
  }
}

main();
