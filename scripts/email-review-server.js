#!/usr/bin/env node
/**
 * Email Review Server - Serves dashboard with live .eml file listing
 * Provides API endpoint for client-side email panel
 * 
 * Usage: node email-review-server.js
 * Port: 9000 (avoids conflict with nginx on 8080)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 9000;
const DASHBOARD_DIR = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD';
const EMAILS_DIR = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/02-EMAILS';
const AISP_STATUS_PATH = process.env.AISP_STATUS_PATH || path.join(__dirname, '..', 'reports', 'aisp-status.json');

// Additional scan locations for auto-discovery
const ADDITIONAL_SCAN_PATHS = [
  '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-CORRESPONDENCE',
  '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/03-EXHIBITS',
  '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/04-FILINGS',
  '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/05-PLEADINGS',
  '/Users/shahroozbhopti/Documents/code/investing/agentic-flow/emails',
  '/Users/shahroozbhopti/Documents/code/investing/agentic-flow/correspondence',
  '/Users/shahroozbhopti/Documents/code/investing/agentic-flow/legal-docs',
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.eml', '.pdf', '.msg'];

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.eml': 'message/rfc822',
  '.pdf': 'application/pdf',
  '.msg': 'application/vnd.ms-outlook'
};

function getEmailsFromDirectory(dirPath, status) {
  try {
    const fullPath = path.join(EMAILS_DIR, dirPath);
    if (!fs.existsSync(fullPath)) return [];
    
    return fs.readdirSync(fullPath)
      .filter(f => SCAN_EXTENSIONS.some(ext => f.toLowerCase().endsWith(ext)))
      .map(f => {
        const filePath = path.join(fullPath, f);
        const stats = fs.statSync(filePath);
        const ext = path.extname(f).toLowerCase();
        
        // For .eml files, parse content
        let content = '';
        let to = 'Unknown';
        let from = 'Unknown';
        let subject = 'No subject';
        let issues = [];
        
        if (ext === '.eml') {
          try {
            content = fs.readFileSync(filePath, 'utf8');
            
            // Parse email headers - handle multi-line continuation (RFC 822)
            // Headers can continue on next line if it starts with whitespace
            const normalizeHeaders = (text) => {
              return text.replace(/\r?\n[ \t]+/g, ' '); // Fold continuation lines
            };
            
            const normalizedContent = normalizeHeaders(content);
            
            // Match To: field - handles "Name <email>" or just "email"
            const toMatch = normalizedContent.match(/To:\s*([^\r\n]+)/);
            const subjectMatch = normalizedContent.match(/Subject:\s*([^\r\n]+)/);
            const fromMatch = normalizedContent.match(/From:\s*([^\r\n]+)/);
            
            // Extract email address from To: field
            let toRaw = toMatch ? toMatch[1].trim() : '';
            let fromRaw = fromMatch ? fromMatch[1].trim() : '';
            
            // Extract email from formats like:
            // "Doug Grimes" <dgrimes@shumaker.com>
            // Doug Grimes <dgrimes@shumaker.com>
            // dgrimes@shumaker.com
            const extractEmail = (field) => {
              if (!field) return 'Unknown';
              // Try to extract <email@domain.com>
              const angleMatch = field.match(/<([^>]+@[^>]+)>/);
              if (angleMatch) return angleMatch[1].trim();
              // Try plain email regex
              const plainMatch = field.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (plainMatch) return plainMatch[1].trim();
              // Return raw if nothing else matches
              return field.length > 100 ? field.substring(0, 100) : field;
            };
            
            to = extractEmail(toRaw);
            from = extractEmail(fromRaw);
            subject = subjectMatch ? subjectMatch[1].trim() : 'No subject';
            
            // Debug logging for problematic files
            if (to === 'Unknown' || !to.includes('@')) {
              console.log(`⚠️ Email parse issue: ${f}`);
              console.log(`   Raw To: "${toRaw.substring(0, 80)}"`);
              console.log(`   Parsed: "${to}"`);
            }
            
            if (content.includes('[YOUR_')) issues.push('Placeholder detected');
            if (!content.includes('Pro Se')) issues.push('Missing Pro Se signature');
            if (!content.match(/N\.C\.G\.S\.?\s*§?\s*\d+/)) issues.push('No legal citations');
          } catch (e) {
            issues.push('Error parsing email');
            console.error(`Error parsing ${f}:`, e.message);
          }
        }
        
        if (stats.size < 1000) issues.push('File may be truncated');
        
        return {
          name: f,
          status: status,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          to: to,
          from: from,
          subject: subject,
          issues: issues,
          path: `/api/emails/${status}/${encodeURIComponent(f)}`,
          location: 'BHOPTI-LEGAL/02-EMAILS',
          type: ext === '.pdf' ? 'PDF' : ext === '.msg' ? 'Outlook' : 'Email'
        };
      });
  } catch (e) {
    console.error(`Error reading ${dirPath}:`, e.message);
    return [];
  }
}

// Scan additional locations for .eml and .pdf files
function scanAdditionalLocations() {
  const foundFiles = [];
  
  ADDITIONAL_SCAN_PATHS.forEach(scanPath => {
    try {
      if (!fs.existsSync(scanPath)) {
        console.log(`Scan path not found: ${scanPath}`);
        return;
      }
      
      const files = fs.readdirSync(scanPath, { recursive: true });
      
      files.forEach(file => {
        const fullPath = path.join(scanPath, file);
        const stats = fs.statSync(fullPath);
        
        if (!stats.isFile()) return;
        
        const ext = path.extname(file).toLowerCase();
        if (!SCAN_EXTENSIONS.includes(ext)) return;
        
        // Determine status based on path
        let status = 'pending';
        if (scanPath.includes('sent') || scanPath.includes('SENT')) status = 'sent';
        else if (scanPath.includes('draft') || scanPath.includes('DRAFT')) status = 'draft';
        else if (scanPath.includes('archive') || scanPath.includes('ARCHIVE')) status = 'archived';
        
        // Parse email if .eml
        let to = 'Unknown';
        let from = 'Unknown';
        let subject = 'No subject';
        let issues = [];
        
        if (ext === '.eml') {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Parse email headers - handle multi-line continuation
            const normalizeHeaders = (text) => {
              return text.replace(/\r?\n[ \t]+/g, ' ');
            };
            const normalizedContent = normalizeHeaders(content);
            
            const toMatch = normalizedContent.match(/To:\s*([^\r\n]+)/);
            const subjectMatch = normalizedContent.match(/Subject:\s*([^\r\n]+)/);
            const fromMatch = normalizedContent.match(/From:\s*([^\r\n]+)/);
            
            let toRaw = toMatch ? toMatch[1].trim() : '';
            let fromRaw = fromMatch ? fromMatch[1].trim() : '';
            
            const extractEmail = (field) => {
              if (!field) return 'Unknown';
              const angleMatch = field.match(/<([^>]+@[^>]+)>/);
              if (angleMatch) return angleMatch[1].trim();
              const plainMatch = field.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
              if (plainMatch) return plainMatch[1].trim();
              return field;
            };
            
            to = extractEmail(toRaw);
            from = extractEmail(fromRaw);
            subject = subjectMatch ? subjectMatch[1].trim() : 'No subject';
          } catch (e) {
            issues.push('Error parsing');
          }
        }
        
        foundFiles.push({
          name: path.basename(file),
          status: status,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          to: to,
          from: from,
          subject: subject,
          issues: issues,
          path: `/api/file/${encodeURIComponent(fullPath)}`,
          location: scanPath.replace('/Users/shahroozbhopti/', ''),
          type: ext === '.pdf' ? 'PDF' : ext === '.msg' ? 'Outlook' : 'Email'
        });
      });
      
      console.log(`Scanned ${scanPath}: found ${foundFiles.length} files`);
    } catch (e) {
      console.error(`Error scanning ${scanPath}:`, e.message);
    }
  });
  
  return foundFiles;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API: List all emails (including additional scan locations)
  if (pathname === '/api/emails') {
    const mainEmails = [
      ...getEmailsFromDirectory('validated', 'validated'),
      ...getEmailsFromDirectory('sent', 'sent'),
      ...getEmailsFromDirectory('drafts', 'draft'),
      ...getEmailsFromDirectory('pending', 'pending')
    ];
    
    // Scan additional locations
    const additionalFiles = scanAdditionalLocations();
    
    const allEmails = [...mainEmails, ...additionalFiles];
    
    // Group by location for reporting
    const byLocation = {};
    allEmails.forEach(e => {
      const loc = e.location || 'BHOPTI-LEGAL/02-EMAILS';
      if (!byLocation[loc]) byLocation[loc] = 0;
      byLocation[loc]++;
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      emails: allEmails, 
      count: allEmails.length,
      byLocation: byLocation,
      scanPaths: ADDITIONAL_SCAN_PATHS.length + 1 // +1 for main EMAILS_DIR
    }, null, 2));
    return;
  }
  
  // API: AISP status (mode SA/FA for blocked-send behavior)
  if (pathname === '/api/aisp-status') {
    try {
      const content = fs.readFileSync(AISP_STATUS_PATH, 'utf8');
      const aisp = JSON.parse(content);
      const mode = (aisp.aisp_header && aisp.aisp_header.mode) || 'SA';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ mode, aisp_header: aisp.aisp_header || {} }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ mode: 'SA', error: 'aisp-status not found' }));
    }
    return;
  }

  // API: Mover-email stats (drafted/validated/sent/confirmed counts)
  if (pathname === '/api/mover-stats') {
    const moverStats = { drafted: 0, validated: 0, sent: 0, confirmed: 0 };
    const moversPath = path.join(path.dirname(EMAILS_DIR), '12-AMANDA-BECK-110-FRAZIER', 'movers');
    const countEmlInDir = (dir) => {
      try {
        if (!fs.existsSync(dir)) return 0;
        return fs.readdirSync(dir)
          .filter(f => f.toLowerCase().endsWith('.eml'))
          .length;
      } catch (e) {
        return 0;
      }
    };
    moverStats.drafted = countEmlInDir(path.join(EMAILS_DIR, 'drafts'));
    moverStats.validated = countEmlInDir(path.join(EMAILS_DIR, 'validated'));
    moverStats.sent = countEmlInDir(path.join(EMAILS_DIR, 'sent'));
    moverStats.confirmed = countEmlInDir(moversPath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(moverStats));
    return;
  }

  // API: Get scan status and watched paths
  if (pathname === '/api/scan-status') {
    const scanStatus = {
      mainPath: EMAILS_DIR,
      additionalPaths: ADDITIONAL_SCAN_PATHS,
      extensions: SCAN_EXTENSIONS,
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(scanStatus, null, 2));
    return;
  }
  
  // API: Get specific email content (from main or additional locations)
  if (pathname.startsWith('/api/emails/')) {
    const parts = pathname.split('/');
    const status = parts[3];
    const filename = decodeURIComponent(parts[4] || '');
    
    if (status && filename) {
      // Try main EMAILS_DIR first
      const mainPath = path.join(EMAILS_DIR, status, filename);
      if (fs.existsSync(mainPath)) {
        const content = fs.readFileSync(mainPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ filename, content, size: content.length, location: 'main' }));
        return;
      }
      
      // Try to find in additional locations
      for (const scanPath of ADDITIONAL_SCAN_PATHS) {
        const altPath = path.join(scanPath, filename);
        if (fs.existsSync(altPath)) {
          const content = fs.readFileSync(altPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ filename, content, size: content.length, location: scanPath }));
          return;
        }
      }
    }
    
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Email not found' }));
    return;
  }
  
  // API: Serve file from any location
  if (pathname.startsWith('/api/file/')) {
    const encodedPath = pathname.replace('/api/file/', '');
    const filePath = decodeURIComponent(encodedPath);
    
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      if (ext === '.eml' || ext === '.msg') {
        const content = fs.readFileSync(filePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          filename: path.basename(filePath), 
          content, 
          size: content.length,
          location: filePath 
        }));
      } else {
        // For PDFs and others, stream the file
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
      return;
    }
    
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }
  
  // Serve static files from dashboard directory
  let filePath = pathname === '/' ? '/WSJF-LIVE-V4-INTERACTIVE.html' : pathname;
  filePath = path.join(DASHBOARD_DIR, filePath);
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end(`Server error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Email Review Server running on http://localhost:${PORT}`);
  console.log(`📧 Dashboard: http://localhost:${PORT}/WSJF-LIVE-V4-INTERACTIVE.html`);
  console.log(`🔌 API: http://localhost:${PORT}/api/emails`);
});

module.exports = server;
