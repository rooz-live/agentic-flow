#!/usr/bin/env ts-node
/**
 * Transform /code/numbers/ CSV files to structured JSON API format
 * Usage: npx ts-node scripts/transform-numbers-csv.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Domain validation regex
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;

// Valid TLDs from the data
const VALID_TLDS = ['.com', '.app', '.ooo', '.life', '.art', '.city', '.co', '.news', '.net', '.pub', '.live', '.vote', '.earth', '.in', '.xyz', '.org', '.dev', '.bio', '.fun', '.cool', '.beer', '.place', '.fans'];

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
  
  // Validate it's a real domain
  if (!DOMAIN_REGEX.test(cleaned)) {
    return null;
  }
  
  // Must have a valid TLD
  const tld = extractTld(cleaned);
  if (!VALID_TLDS.includes(tld.toLowerCase())) {
    // Try looser validation
    if (!tld.match(/^\.[a-zA-Z]{2,}$/)) {
      return null;
    }
  }
  
  return cleaned.toLowerCase();
}

function parseEnvironment(text: string): 'prod' | 'staging' | 'dev' | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower.includes('prod environment')) return 'prod';
  if (lower.includes('staging environment')) return 'staging';
  if (lower.includes('dev environment')) return 'dev';
  return undefined;
}

function parsePhase(text: string): string | undefined {
  if (!text) return undefined;
  const phases = [
    'Stealth Pre-Alpha',
    'Coming soon (Developer Alpha)',
    'Developer Beta',
    'Private Alpha',
    'Private Beta',
    'Public Alpha',
    'Public Beta',
    'Official Release'
  ];
  
  for (const phase of phases) {
    if (text.includes(phase)) {
      return phase.replace('Coming soon (', '').replace(')', '');
    }
  }
  return undefined;
}

function parseCategoryFromSteam(steam: string): string {
  if (!steam) return 'uncategorized';
  if (steam.includes('[App]')) return 'app';
  if (steam.includes('[Artisan]')) return 'artisan';
  if (steam.includes('[City]')) return 'city';
  if (steam.includes('[Colocation]')) return 'colocation';
  if (steam.includes('[Com]')) return 'com';
  if (steam.includes('[Network]')) return 'network';
  if (steam.includes('[Org]')) return 'org';
  return 'uncategorized';
}

function parseSubcategory(steam: string): string {
  if (!steam) return '';
  // Extract the descriptive part after the category code
  const match = steam.match(/\[.*?\]\s*(.+?)(?:\s*\(|$)/);
  return match ? match[1].trim() : '';
}

function parseDomainsCSV(filepath: string): DomainEntry[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n');
  const entries: DomainEntry[] = [];
  const seenDomains = new Set<string>();
  
  let currentSteam = '';
  let currentCategory = 'uncategorized';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rowNum = i + 1;
    
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Parse CSV line (handling quoted values)
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    
    // Check if this is a STEAM header row
    const cell0 = cells[0] || '';
    const cell1 = cells[1] || '';
    
    // Match header patterns like "1. [App] SySTEM..." or " 1. [App] SySTEM..."
    if (cell0.match(/^\s*\d+\.\s*\[/) || cell0.match(/^\s*\d+\s+STREAM/) || cell0.match(/^\s*\d+\s+STEAM/)) {
      currentSteam = cell0.trim();
      currentCategory = parseCategoryFromSteam(currentSteam);
      continue;
    }
    // Check column 1 for headers with leading comma
    if (cell1.match(/^\s*\d+\.\s*\[/) || cell1.includes('[App]') || cell1.includes('[Artisan]') || 
        cell1.includes('[City]') || cell1.includes('[Colocation]') || cell1.includes('[Com]') ||
        cell1.includes('[Network]') || cell1.includes('[Org]')) {
      currentSteam = cell1.trim();
      currentCategory = parseCategoryFromSteam(currentSteam);
      continue;
    }
    
    // Extract domain from column 2 or 3
    const domainCell = cells[2] || cells[1] || '';
    const cleanDomain = cleanDomainString(domainCell);
    
    if (!cleanDomain || seenDomains.has(cleanDomain)) {
      continue;
    }
    
    seenDomains.add(cleanDomain);
    
    // Parse additional columns
    const syllables = parseInt(cells[3]) || 0;
    const letters = parseInt(cells[4]) || cleanDomain.length;
    const syllaletters = parseInt(cells[5]) || (syllables * letters);
    const description = cells[6] || '';
    const urlCell = cells[8] || '';
    
    const urls: string[] = [];
    if (urlCell && urlCell.includes('alpha.request.classic')) {
      urls.push(urlCell);
    }
    
    const entry: DomainEntry = {
      id: generateId(cleanDomain, entries.length),
      domain: cleanDomain,
      cleanDomain: cleanDomain,
      category: currentCategory,
      subcategory: parseSubcategory(currentSteam),
      syllables,
      letters,
      syllaletters,
      urls,
      environment: parseEnvironment(description),
      phase: parsePhase(description),
      tld: extractTld(cleanDomain),
      metadata: {
        source: 'numbers/Domains.csv',
        extractedAt: new Date().toISOString(),
        rowNumber: rowNum,
      },
    };
    
    entries.push(entry);
  }
  
  return entries;
}

function generateSteamCategories(): Record<string, string[]> {
  return {
    science: ['Physical', 'Biological', 'Cognitive', 'Cosmic', 'Quantum'],
    technology: ['Digital', 'Biological', 'Informational', 'AI/ML', 'Cybersecurity', 'Quantum'],
    engineering: ['Mechanical', 'Electrical', 'Civil', 'Computer', 'Aerospace', 'Biomedical'],
    art: ['Visual', 'Performing', 'Digital', 'Conceptual', 'Interactive', 'Public'],
    math: ['Algebraic', 'Geometric', 'Analytic', 'Discrete', 'Probability', 'Logic'],
  };
}

function generateStats(domains: DomainEntry[]) {
  const byTld: Record<string, number> = {};
  const byEnvironment: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  
  for (const domain of domains) {
    byTld[domain.tld] = (byTld[domain.tld] || 0) + 1;
    const env = domain.environment || 'unknown';
    byEnvironment[env] = (byEnvironment[env] || 0) + 1;
    byCategory[domain.category] = (byCategory[domain.category] || 0) + 1;
  }
  
  return { byTld, byEnvironment, byCategory };
}

function main() {
  const inputPath = '/Users/shahroozbhopti/Documents/code/numbers/Domains.csv';
  const outputPath = '/Users/shahroozbhopti/Documents/code/numbers_domains_api.json';
  
  console.log('[Transform] Parsing Domains.csv...');
  const domains = parseDomainsCSV(inputPath);
  console.log(`[Transform] Extracted ${domains.length} unique domains`);
  
  const response: APIResponse = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    count: domains.length,
    domains,
    steamCategories: generateSteamCategories(),
    stats: generateStats(domains),
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(response, null, 2));
  console.log(`[Transform] Written to ${outputPath}`);
  
  // Print summary
  console.log('\n[Summary]');
  console.log(`  Total domains: ${domains.length}`);
  console.log(`  By TLD: ${JSON.stringify(response.stats.byTld, null, 2).replace(/\n/g, '\n  ')}`);
  console.log(`  By Environment: ${JSON.stringify(response.stats.byEnvironment, null, 2).replace(/\n/g, '\n  ')}`);
  console.log(`  By Category: ${JSON.stringify(response.stats.byCategory, null, 2).replace(/\n/g, '\n  ')}`);
}

main();
