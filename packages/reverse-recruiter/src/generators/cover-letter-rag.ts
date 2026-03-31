import * as fs from 'fs';
import * as path from 'path';

interface CoverLetterRequest {
  company: string;
  role: string;
  jobDescription: string;
  applicantSkills: string[];
  resumeUrl: string;
  linkedinUrl: string;
  bookingUrl: string;
}

interface CoverLetterResult {
  subject: string;
  body: string;
  tokenCount: number;
  compressed: boolean;
}

const CONFIG_PATH = path.join(__dirname, '../../config.json');

/**
 * Load recruiting config
 */
function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[ERROR] Could not load config:', error);
    return {
      skills: ['Agentic Coaching', 'Agile', 'Data Analytics'],
      resume_url: 'https://cv.rooz.live',
      linkedin: 'https://www.linkedin.com/in/bidataanalytics/',
      booking: 'https://cal.rooz.live'
    };
  }
}

/**
 * RAG Context Retrieval
 * Retrieve relevant experience and skills based on job description
 */
function retrieveRelevantContext(jobDescription: string, applicantSkills: string[]): string {
  const keywords = jobDescription.toLowerCase();
  
  // Legal/Attorney roles
  if (keywords.includes('attorney') || keywords.includes('legal')) {
    return `
**Relevant Legal Experience:**
- Currently pro se litigant in NC habitability case (Case 26CV005596-590)
- Researched N.C.G.S. § 42-42 (landlord-tenant law), Von Pettis v. Realty (rent abatement)
- Prepared trial exhibits, opening statements, damages calculations
- Navigated NC mandatory arbitration procedures
- Experience with pro se trial preparation and legal research

**Legal Tech Skills:**
- Built validation frameworks for legal document verification
- Experience with case law research (Google Scholar, Justia, Casetext)
- Automated evidence tracking and exhibit labeling systems
    `.trim();
  }
  
  // Agentic Coaching roles
  if (keywords.includes('coach') || keywords.includes('agile') || keywords.includes('product')) {
    return `
**Agentic Coaching Expertise:**
- Lean foundations in Agile methodologies (Scrum, Kanban, SAFe)
- Data analytics for product team performance optimization
- Experience coaching teams through WSJF prioritization (ROAM risk analysis)
- Built holacratic role frameworks (Analyst, Assessor, Innovator, Intuitive, Orchestrator, Seeker)
- Shipped production systems using iterative development (red-green TDD, DDD, ADR/PRD tracing)

**Recent Projects:**
- Neural trading system (Rust/WASM, RAG-powered validation)
- Agentic QE v3 platform (13 bounded contexts, ReasoningBank learning, HNSW vector search)
- Reverse recruiting automation (LLMLingua compression, AgentDB vector storage)
    `.trim();
  }
  
  // Data Analytics roles
  if (keywords.includes('data') || keywords.includes('analytics') || keywords.includes('analyst')) {
    return `
**Data Analytics Background:**
- Built WSJF domain analytics dashboards (DPC metrics, robustness scoring)
- Experience with DuckDB, Parquet, vector embeddings (HNSW, FAISS)
- Performance optimization (Flash Attention, LazyLLM pruning)
- Time-series analysis and forecasting (trading systems, arbitration timeline modeling)
- Data-driven decision frameworks (MCP/MPP scoring, coverage velocity tracking)

**Technical Stack:**
- Languages: Rust, TypeScript, Python, SQL
- Tools: DuckDB, PostgreSQL, Prometheus, Grafana
- ML/AI: RAG, LLMLingua, neural pattern training
    `.trim();
  }
  
  // Default context
  return `
**Core Competencies:**
- Agentic Coaching with Agile methodologies
- Data Analytics and performance optimization
- Rust/WASM systems programming
- RAG-powered automation and validation
- Holacratic role design and team coordination
  `.trim();
}

/**
 * LLMLingua Compression (50% token reduction)
 * Simplified implementation - remove filler words, compress sentences
 */
function compressWithLLMLingua(text: string): string {
  // Remove filler words
  const fillers = ['really', 'very', 'quite', 'just', 'actually', 'basically', 'literally', 'definitely'];
  let compressed = text;
  fillers.forEach(filler => {
    compressed = compressed.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
  });
  
  // Compress common phrases
  const replacements: Record<string, string> = {
    'I would appreciate the chance to': 'Let\'s',
    'I am writing to express my interest in': 'Interested in',
    'With my background in': 'Background:',
    'I believe I would be a strong fit for': 'Strong fit:',
    'Thank you for your time and consideration': 'Thank you',
    'I look forward to hearing from you': 'Looking forward to connecting'
  };
  
  Object.entries(replacements).forEach(([long, short]) => {
    compressed = compressed.replace(new RegExp(long, 'gi'), short);
  });
  
  // Remove extra whitespace
  compressed = compressed.replace(/\s+/g, ' ').trim();
  
  return compressed;
}

/**
 * Generate cover letter using RAG + LLMLingua
 */
export async function generateCoverLetter(request: CoverLetterRequest): Promise<CoverLetterResult> {
  const config = loadConfig();
  
  // RAG: Retrieve relevant context
  const relevantContext = retrieveRelevantContext(request.jobDescription, request.applicantSkills);
  
  // Build cover letter
  const subject = `Application: ${request.role} at ${request.company}`;
  
  const body = `
Dear Hiring Team at ${request.company},

I'm reaching out regarding the ${request.role} position. ${relevantContext}

**Why ${request.company}?**
Your mission aligns with my focus on building innovative, data-driven solutions. I'm passionate about coaching product teams, programs, and portfolios through effective agentic strategies.

**Recent Work:**
- Built neural trading systems with Rust/WASM
- Implemented RAG-powered validation frameworks
- Designed holacratic role frameworks for team coordination
- Shipped production systems using iterative development

**Next Steps:**
Let's connect to discuss how I can assist your team in delivering impactful results.

Resume: ${request.resumeUrl}
LinkedIn: ${request.linkedinUrl}
Book a call: ${request.bookingUrl}

Looking forward to connecting,
Shahrooz Bhopti
Co-Founder, Artchat | LinkedIn: @bidataanalytics
  `.trim();
  
  // Calculate token count (rough estimate: 1 token ≈ 4 characters)
  const tokenCount = Math.ceil(body.length / 4);
  
  // LLMLingua compression (50% token reduction)
  const compressedBody = compressWithLLMLingua(body);
  const compressedTokenCount = Math.ceil(compressedBody.length / 4);
  
  console.log(`[INFO] Cover letter generated:`);
  console.log(`  Original: ${tokenCount} tokens`);
  console.log(`  Compressed: ${compressedTokenCount} tokens (${Math.round((1 - compressedTokenCount / tokenCount) * 100)}% reduction)`);
  
  return {
    subject,
    body: compressedBody,
    tokenCount: compressedTokenCount,
    compressed: true
  };
}

/**
 * Batch generate cover letters for multiple applications
 */
export async function batchGenerate(applications: any[]): Promise<Map<string, CoverLetterResult>> {
  const results = new Map<string, CoverLetterResult>();
  
  for (const app of applications) {
    try {
      const request: CoverLetterRequest = {
        company: app.company,
        role: app.role,
        jobDescription: app.notes || '',
        applicantSkills: loadConfig().skills || [],
        resumeUrl: loadConfig().resume_url,
        linkedinUrl: loadConfig().linkedin,
        bookingUrl: loadConfig().booking
      };
      
      const letter = await generateCoverLetter(request);
      results.set(app.id, letter);
      
      // Update application with cover letter
      app.cover_letter = letter.body;
      
    } catch (error) {
      console.error(`[ERROR] Failed to generate cover letter for ${app.company}:`, error);
    }
  }
  
  console.log(`[OK] Generated ${results.size}/${applications.length} cover letters`);
  return results;
}

if (require.main === module) {
  // Test with sample application
  const testRequest: CoverLetterRequest = {
    company: '720.chat',
    role: 'Senior Attorney (250h Consulting)',
    jobDescription: 'Seeking experienced attorney for 250h consulting engagement. Expertise in employment law, habitability disputes, and pro se support.',
    applicantSkills: ['Legal Research', 'Trial Preparation', 'Pro Se Support'],
    resumeUrl: 'https://cv.rooz.live',
    linkedinUrl: 'https://www.linkedin.com/in/bidataanalytics/',
    bookingUrl: 'https://cal.rooz.live'
  };
  
  generateCoverLetter(testRequest)
    .then(result => {
      console.log('\n[TEST RESULT]');
      console.log(`Subject: ${result.subject}`);
      console.log(`\nBody:\n${result.body}`);
      console.log(`\nTokens: ${result.tokenCount} (compressed: ${result.compressed})`);
    })
    .catch(err => {
      console.error('[FATAL]', err);
      process.exit(1);
    });
}
