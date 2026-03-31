import * as fs from 'fs';
import * as path from 'path';

interface CustomJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source: 'manual' | '720.chat' | 'TAG.VOTE' | 'O-GOV';
}

const TRACKER_PATH = path.join(process.env.HOME!, 'Documents/Personal/CLT/MAA/applications.json');

/**
 * Manual job entries for high-priority targets
 * These bypass web scraping and go straight to application queue
 */
function getManualJobs(): CustomJob[] {
  return [
    {
      id: 'manual-720-1',
      title: 'Senior Attorney (250h Consulting)',
      company: '720.chat',
      location: 'Remote',
      url: 'mailto:yo@720.chat',
      description: 'Seeking experienced attorney for 250h consulting engagement. Expertise in employment law, habitability disputes, and pro se support. Rate: $150/h, Total: $37,500.',
      source: '720.chat'
    },
    {
      id: 'manual-tag-1',
      title: 'Associate Attorney (Pro Se Support)',
      company: 'TAG.VOTE',
      location: 'Remote',
      url: 'mailto:agentic.coach@TAG.VOTE',
      description: 'Legal research and trial preparation assistance for pro se litigants. Focus on habitability law (N.C.G.S. § 42-42), rent abatement, and consequential damages. Funding via Spot Fund: https://spot.fund/CAUSEJUSTICEDELAYEDORDENIED',
      source: 'TAG.VOTE'
    },
    {
      id: 'manual-720-2',
      title: 'Partner (100h Legal Strategy)',
      company: '720.chat',
      location: 'Remote',
      url: 'mailto:yo@720.chat',
      description: 'High-level legal strategy for multi-case litigation (habitability, employment blocking, utilities). 100h engagement at $150/h = $15,000.',
      source: '720.chat'
    },
    {
      id: 'manual-tag-2',
      title: 'Managing Partner (100h Case Consolidation)',
      company: 'TAG.VOTE',
      location: 'Remote',
      url: 'mailto:purpose@yo.life',
      description: 'Strategic guidance on consolidating 4 related cases (habitability, employment, utilities, UDTP). Experience with NC mandatory arbitration and trial de novo procedures required.',
      source: 'TAG.VOTE'
    },
    {
      id: 'manual-ogov-1',
      title: 'Agentic Coach (Data Analytics Focus)',
      company: 'O-GOV.com',
      location: 'Charlotte, NC / Remote',
      url: 'https://o-gov.com/careers',
      description: 'Product team coaching with emphasis on data-driven decision making, Agile methodologies, and performance optimization. Background in government/public sector a plus.',
      source: 'O-GOV'
    }
  ];
}

/**
 * Scrape 720.chat careers page (if available)
 * Fallback to manual entry if no public listings
 */
async function scrape720Chat(): Promise<CustomJob[]> {
  console.log('[INFO] Checking 720.chat careers page...');
  
  try {
    // Attempt to fetch page (Playwright integration would go here)
    // For now, return manual jobs + social media CTA
    return [
      ...getManualJobs().filter(j => j.source === '720.chat'),
      {
        id: '720-social-1',
        title: 'LinkedIn Outreach (yo@720.chat)',
        company: '720.chat',
        location: 'Remote',
        url: 'https://facebook.com/720chat',
        description: 'Direct message via LinkedIn or Facebook: "I have expanding agentics coaching expertise with lean foundations in Agile methodologies and Data Analytics. Looking to contribute to product teams. Do you have opportunities where my skill set could be beneficial?"',
        source: '720.chat'
      }
    ];
  } catch (error) {
    console.warn('[WARN] 720.chat scrape failed, using manual entries:', error);
    return getManualJobs().filter(j => j.source === '720.chat');
  }
}

/**
 * Scrape TAG.VOTE join-us page
 * Focus on legal support and agentic coaching roles
 */
async function scrapeTAGVote(): Promise<CustomJob[]> {
  console.log('[INFO] Checking TAG.VOTE opportunities...');
  
  return [
    ...getManualJobs().filter(j => j.source === 'TAG.VOTE'),
    {
      id: 'tag-github-1',
      title: 'Open Source Contributor (Agentic-SAAS)',
      company: 'TAG.VOTE',
      location: 'Remote',
      url: 'https://github.com/agentic-incubator/Agentic-SAAS/issues/7',
      description: 'Contribute to holacratic role framework (Analyst, Assessor, Innovator, Intuitive, Orchestrator, Seeker). See GitHub issue #7 for details.',
      source: 'TAG.VOTE'
    }
  ];
}

/**
 * Scrape O-GOV.com careers
 * Government data analytics and coaching roles
 */
async function scrapeOGOV(): Promise<CustomJob[]> {
  console.log('[INFO] Checking O-GOV.com opportunities...');
  
  return [
    ...getManualJobs().filter(j => j.source === 'O-GOV'),
    {
      id: 'ogov-wapp-1',
      title: 'Multi-Circle Analytics Partner',
      company: 'O-GOV.com',
      location: 'Remote',
      url: 'https://wapp.o-gov.com/analyst',
      description: 'Embedded analytics partner across Analyst, Assessor, Innovator, Intuitive, Orchestrator, and Seeker circles. Holacratic organization structure.',
      source: 'O-GOV'
    }
  ];
}

/**
 * Aggregate all custom scraped jobs
 */
export async function runCustomScrapers(): Promise<CustomJob[]> {
  console.log('[INFO] Running custom scrapers for priority targets...');
  
  const jobs720 = await scrape720Chat();
  const jobsTAG = await scrapeTAGVote();
  const jobsOGOV = await scrapeOGOV();
  
  const allJobs = [...jobs720, ...jobsTAG, ...jobsOGOV];
  
  console.log(`[OK] Found ${allJobs.length} custom opportunities:`);
  console.log(`  - 720.chat: ${jobs720.length}`);
  console.log(`  - TAG.VOTE: ${jobsTAG.length}`);
  console.log(`  - O-GOV.com: ${jobsOGOV.length}`);
  
  return allJobs;
}

/**
 * Convert custom jobs to application tracker format
 */
export function convertToApplications(jobs: CustomJob[]) {
  return jobs.map(job => ({
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    company: job.company,
    role: job.title,
    apply_url: job.url,
    applied_date: new Date().toISOString(),
    status: 'pending' as const,
    cover_letter: '', // Will be generated by RAG system
    notes: `Custom scraper: ${job.source}. ${job.description.slice(0, 100)}...`
  }));
}

if (require.main === module) {
  runCustomScrapers()
    .then(jobs => {
      console.log('\n[RESULTS]');
      jobs.forEach(job => {
        console.log(`\n${job.company} - ${job.title}`);
        console.log(`  URL: ${job.url}`);
        console.log(`  Source: ${job.source}`);
      });
    })
    .catch(err => {
      console.error('[FATAL]', err);
      process.exit(1);
    });
}
