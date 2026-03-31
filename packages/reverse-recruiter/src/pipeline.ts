#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { runScraper as runSimplifyJobsScraper } from './scrapers/simplify';
import { runCustomScrapers, convertToApplications } from './scrapers/custom-scrapers';
import { batchGenerate } from './generators/cover-letter-rag';

const TRACKER_PATH = path.join(process.env.HOME!, 'Documents/Personal/CLT/MAA/applications.json');

interface ApplicationTracker {
  applications: Application[];
  stats: {
    total: number;
    pending: number;
    submitted: number;
    interview: number;
    offer: number;
    rejected: number;
    last_updated: string;
  };
}

interface Application {
  id: string;
  company: string;
  role: string;
  apply_url: string;
  applied_date: string;
  status: 'pending' | 'submitted' | 'interview' | 'offer' | 'rejected';
  cover_letter: string;
  notes: string;
}

/**
 * Load or create application tracker
 */
async function loadTracker(): Promise<ApplicationTracker> {
  try {
    if (fs.existsSync(TRACKER_PATH)) {
      const data = fs.readFileSync(TRACKER_PATH, 'utf-8');
      const tracker = JSON.parse(data);
      
      // Migrate old format if needed
      if (!tracker.stats) {
        tracker.stats = calculateStats(tracker.applications || []);
      }
      
      return tracker;
    }
  } catch (error) {
    console.warn('[WARN] Could not load tracker, creating new:', error);
  }
  
  return {
    applications: [],
    stats: {
      total: 0,
      pending: 0,
      submitted: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      last_updated: new Date().toISOString()
    }
  };
}

/**
 * Calculate statistics from applications
 */
function calculateStats(applications: Application[]) {
  return {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer: applications.filter(a => a.status === 'offer').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    last_updated: new Date().toISOString()
  };
}

/**
 * Save tracker to disk
 */
async function saveTracker(tracker: ApplicationTracker): Promise<void> {
  const dir = path.dirname(TRACKER_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  tracker.stats = calculateStats(tracker.applications);
  fs.writeFileSync(TRACKER_PATH, JSON.stringify(tracker, null, 2));
  
  console.log(`\n[INFO] Tracker saved: ${TRACKER_PATH}`);
  console.log(`  Total applications: ${tracker.stats.total}`);
  console.log(`  Pending: ${tracker.stats.pending}`);
  console.log(`  Submitted: ${tracker.stats.submitted}`);
}

/**
 * Main pipeline execution
 */
async function runPipeline() {
  console.log('='.repeat(60));
  console.log('REVERSE RECRUITER PIPELINE');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log();
  
  // Load tracker
  const tracker = await loadTracker();
  console.log(`[INFO] Loaded tracker: ${tracker.applications.length} existing applications`);
  
  // Phase 1: Scrape Simplify.jobs
  console.log('\n[PHASE 1] Scraping Simplify.jobs...');
  try {
    const simplifyApps = await runSimplifyJobsScraper();
    console.log(`  Found ${simplifyApps.length} new applications`);
    
    // Add to tracker (avoiding duplicates)
    for (const app of simplifyApps) {
      const exists = tracker.applications.find(a => a.company === app.company && a.role === app.role);
      if (!exists) {
        tracker.applications.push(app);
      }
    }
  } catch (error) {
    console.error('[ERROR] Simplify.jobs scraping failed:', error);
  }
  
  // Phase 2: Scrape custom targets
  console.log('\n[PHASE 2] Scraping custom targets (720.chat, TAG.VOTE, O-GOV.com)...');
  try {
    const customJobs = await runCustomScrapers();
    const customApps = convertToApplications(customJobs);
    console.log(`  Found ${customApps.length} custom opportunities`);
    
    // Add to tracker (avoiding duplicates)
    for (const app of customApps) {
      const exists = tracker.applications.find(a => a.company === app.company && a.role === app.role);
      if (!exists) {
        tracker.applications.push(app);
      }
    }
  } catch (error) {
    console.error('[ERROR] Custom scraping failed:', error);
  }
  
  // Phase 3: Generate cover letters
  console.log('\n[PHASE 3] Generating cover letters...');
  const pendingApps = tracker.applications.filter(app => app.status === 'pending' && !app.cover_letter);
  
  if (pendingApps.length > 0) {
    console.log(`  Generating ${pendingApps.length} cover letters...`);
    try {
      await batchGenerate(pendingApps);
    } catch (error) {
      console.error('[ERROR] Cover letter generation failed:', error);
    }
  } else {
    console.log('  No pending applications need cover letters');
  }
  
  // Phase 4: Save tracker
  console.log('\n[PHASE 4] Saving tracker...');
  await saveTracker(tracker);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('PIPELINE COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total applications: ${tracker.stats.total}`);
  console.log(`Ready to submit: ${tracker.applications.filter(a => a.status === 'pending' && a.cover_letter).length}`);
  console.log(`Pending cover letters: ${tracker.applications.filter(a => a.status === 'pending' && !a.cover_letter).length}`);
  console.log();
  
  // Display first 3 ready applications
  const readyApps = tracker.applications.filter(a => a.status === 'pending' && a.cover_letter).slice(0, 3);
  if (readyApps.length > 0) {
    console.log('NEXT STEPS: Submit these applications:');
    readyApps.forEach((app, i) => {
      console.log(`\n${i + 1}. ${app.company} - ${app.role}`);
      console.log(`   URL: ${app.apply_url}`);
      console.log(`   Cover letter: ${app.cover_letter.slice(0, 100)}...`);
    });
  }
  
  console.log(`\nTracker saved: ${TRACKER_PATH}`);
  console.log(`Finished: ${new Date().toLocaleString()}`);
}

if (require.main === module) {
  runPipeline().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}

export { runPipeline, loadTracker, saveTracker };
