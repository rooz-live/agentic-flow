const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { mdToPdf } = require('md-to-pdf');

const PORT = 8888;
const MAA_PATH = '/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/DENOVO/2026-04-16-MAA-DENOVO-MASTER.md';
const WWC_PATH = '/Users/shahroozbhopti/.gemini/antigravity/brain/f00a67df-f568-4d48-a506-dcb91f20ddc2/2026-04-16-WWC-INTERVIEW-PREP-MASTER.md';

const CSS_THEMES = {
  raw: '',
  legal: `<style>
    body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; margin: 15px 30px; }
    h1 { font-size: 18px; text-transform: uppercase; margin-bottom: 5px; color: #000; text-align: center; }
    h2 { font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3px; }
    blockquote { border: 2px solid #555; background: #fdfdfd; padding: 15px 20px; font-size: 14px; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .page-break { page-break-before: always; }
  </style>`,
  mesh: `<style>
    body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; color: #111827; line-height: 1.5; margin: 15px 30px; background-color: #ffffff; }
    h1 { font-size: 20px; text-transform: uppercase; margin-bottom: 15px; border-bottom: 3px solid #111827; padding-bottom: 5px;}
    h2 { font-size: 14px; text-transform: uppercase; color: #374151; }
    blockquote { border-left: 5px solid #2563eb; background: #f0fdfa; padding: 15px; margin: 15px 0; box-shadow: -4px 0 0 #1e40af; font-family: 'Courier New', monospace; font-size: 13px;}
    .page-break { page-break-before: always; }
  </style>`
};

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    try {
      const maaData = fs.readFileSync(MAA_PATH, 'utf8');
      const wwcData = fs.readFileSync(WWC_PATH, 'utf8');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Systemic Payload Compiler | ROI MAX</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
          
          <!-- TOAST UI Editor Core & Dark Theme -->
          <link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css" />
          <link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/theme/toastui-editor-dark.min.css" />
          <script src="https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js"></script>

          <style>
            :root {
              --bg-primary: #030712;
              --bg-glass: rgba(17, 24, 39, 0.7);
              --border-glow: rgba(99, 102, 241, 0.2);
              --accent-fuchsia: #d946ef;
              --accent-indigo: #4f46e5;
            }
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; padding: 0; 
              background-color: var(--bg-primary); 
              color: #f3f4f6; 
              min-height: 100vh;
              overflow: auto;
              display: flex;
            }
            .cyber-grid {
              position: absolute;
              inset: 0;
              background-size: 40px 40px;
              background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
              z-index: -1;
              pointer-events: none;
            }
            .sidebar-mesh {
              width: 250px;
              border-right: 1px solid rgba(255,255,255,0.1);
              background: #050505;
              display: flex;
              flex-direction: column;
              z-index: 10;
              flex-shrink: 0;
              overflow-y: auto;
            }
            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-width: 0;
              min-height: 0;
            }
            .lateral-header {
              min-height: 60px;
              height: auto;
              border-bottom: 1px solid rgba(255,255,255,0.1);
              background: rgba(10,10,10,0.8);
              backdrop-filter: blur(12px);
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 20px;
              flex-wrap: wrap;
              gap: 10px;
            }
            .editor-frame {
              flex: 1;
              display: flex;
              gap: 2px;
              background: #000;
              min-height: 0;
            }
            /* Toast UI Customizations */
            #editor-container { flex: 1; min-height: 600px; display: flex; flex-direction: column; background: #0f172a; }
            .toastui-editor-defaultUI { border: none !important; display: flex; flex-direction: column; height: 100%; border-radius: 0; min-height: 0; }
            .toastui-editor-toolbar { background: #1e293b !important; border-bottom: 1px solid #334155 !important; }
            .toastui-editor-main-container { flex: 1; height: auto !important; min-height: 0; }
            .toastui-editor-md-container, .toastui-editor-ww-container { background: #0f172a !important; }
            
            iframe { flex: 1; height: 100%; background: #111; border: none; border-left: 1px solid rgba(255,255,255,0.05); }
            
            .nav-item {
              padding: 12px 20px;
              cursor: pointer;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              font-weight: 600;
              color: #64748b;
              border-left: 3px solid transparent;
              transition: all 0.3s ease;
            }
            .nav-item:hover { background: rgba(255,255,255,0.02); color: #cbd5e1; }
            .nav-item.active {
              background: linear-gradient(90deg, rgba(79,70,229,0.1) 0%, transparent 100%);
              border-left: 3px solid var(--accent-indigo);
              color: #fff;
            }
            .mesh-tag {
              font-size: 10px;
              padding: 2px 6px;
              border: 1px solid rgba(99,102,241,0.3);
              background: rgba(99,102,241,0.1);
              color: #818cf8;
              border-radius: 4px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .action-btn {
              background: linear-gradient(135deg, var(--accent-indigo), var(--accent-fuchsia));
              color: white;
              font-weight: 800;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border: none;
              padding: 10px 24px;
              border-radius: 6px;
              cursor: pointer;
              transition: box-shadow 0.3s;
              box-shadow: 0 0 15px rgba(217, 70, 239, 0.3);
            }
            .action-btn:hover { box-shadow: 0 0 25px rgba(217, 70, 239, 0.6); }
            select {
              background: #1e293b;
              border: 1px solid #334155;
              color: #f8fafc;
              font-family: inherit;
              font-size: 12px;
              padding: 6px 10px;
              border-radius: 4px;
              outline: none;
            }
          </style>
        </head>
        <body>
          <div class="cyber-grid"></div>

          <!-- VERTICALLY INTEGRATED MENU -->
          <div class="sidebar-mesh">
            <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
               <div style="font-family: 'JetBrains Mono'; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.15em; color: #fff;">
                 Systemic.OS
               </div>
               <div style="font-size: 10px; color: #475569; margin-top: 4px;">WYSIWYG PAYLOAD COMPILER</div>
            </div>

            <div style="padding: 15px 20px 5px; font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.1em;">Target Arrays</div>
            <div class="nav-item active" id="tab-maa" onclick="switchTab('maa', 'VDD/DDD/ADR Spec Editor')">
               Legal Payload (MAA)
            </div>
            <div class="nav-item" id="tab-wwc" onclick="switchTab('wwc', 'PRD/Operations Editor')">
               Interview Prep (WWC)
            </div>
            
            <div style="padding: 25px 20px 5px; font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.1em;">Editor Specs</div>
            <div class="nav-item" onclick="executeMacro('VDD')"><span style="color: #10b981;">●</span> VDD - Visual Box</div>
            <div class="nav-item" onclick="executeMacro('DDD')"><span style="color: #8b5cf6;">●</span> DDD - Highlight</div>
            <div class="nav-item" onclick="executeMacro('ADR')"><span style="color: #f59e0b;">●</span> ADR - Spec Alert</div>
            <div class="nav-item" onclick="executeMacro('PRD')"><span style="color: #3b82f6;">●</span> PRD - Target Pitch</div>
          </div>

          <div class="main-content">
            <!-- HORIZONTALLY LATERAL NAV -->
            <div class="lateral-header">
               <div style="display: flex; align-items: center; gap: 15px;">
                 <span class="mesh-tag" id="header-context">VDD/DDD/ADR Spec Editor</span>
                 <span style="font-family: 'JetBrains Mono'; font-size: 13px; color: #94a3b8;">Compile Target Configuration</span>
               </div>

               <div style="display: flex; align-items: center; gap: 15px;">
                  <span style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold;">UI Vector:</span>
                  <select id="theme-selector">
                    <option value="mesh">Hierarchical Mesh Dashboard (CICD)</option>
                    <option value="legal">Elite Corporate Legal Boundary</option>
                    <option value="raw">Raw Markdown Matrix</option>
                  </select>
                  <span id="save-status" style="font-size: 10px; color: #10b981; font-weight: 800; opacity: 0; transition: opacity 0.5s;">● SAVED</span>
                  <button class="action-btn" onclick="saveData(this)" style="background: transparent; border: 1px solid var(--accent-indigo); box-shadow: none;">SAVE SRC</button>
                  <button class="action-btn" onclick="regeneratePdf(this)">REGENERATE PDF</button>
               </div>
            </div>

            <div class="editor-frame">
              <div id="editor-container"></div>
              <iframe id="pdf-preview" src=""></iframe>
            </div>
          </div>

          <!-- Store raw values secretly -->
          <textarea id="raw-maa" style="display:none;">${maaData.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
          <textarea id="raw-wwc" style="display:none;">${wwcData.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>

          <script>
            let currentTab = 'maa';
            let editor;
            
            document.addEventListener('DOMContentLoaded', () => {
              // Initialize Toast UI Editor with WYSIWYG toggle
              editor = new toastui.Editor({
                el: document.querySelector('#editor-container'),
                height: '100%',
                initialEditType: 'wysiwyg',
                previewStyle: 'vertical',
                theme: 'dark',
                initialValue: document.getElementById('raw-maa').value,
                toolbarItems: [
                  ['heading', 'bold', 'italic', 'strike'],
                  ['hr', 'quote'],
                  ['ul', 'ol', 'task', 'indent', 'outdent'],
                  ['table', 'link'],
                  ['code', 'codeblock']
                ]
              });
              
              // AUTOSAVE LOGIC
              setInterval(() => {
                const content = editor.getMarkdown();
                const lastRaw = document.getElementById('raw-' + currentTab).value;
                if (content !== lastRaw && content.trim() !== '') {
                  saveData(null);
                }
              }, 5000);
            });
            
            async function saveData(btn) {
              const content = editor.getMarkdown();
              document.getElementById('raw-' + currentTab).value = content;
              
              if(btn) btn.innerText = 'SAVING...';
              document.getElementById('save-status').style.opacity = '1';
              
              await fetch('/autosave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: currentTab, content: content })
              });
              
              if(btn) btn.innerText = 'SAVE SRC';
              setTimeout(() => { document.getElementById('save-status').style.opacity = '0'; }, 2000);
            }
            
            function executeMacro(target) {
              if(!editor) return;
              
              const currentStatus = document.getElementById('header-context');
              const oldText = currentStatus.innerText;
              
              let injection = '';
              if(target === 'VDD') {
                 injection = '\\n<div style="border: 2px solid #10b981; padding: 15px; border-radius: 4px; background: rgba(16,185,129,0.05); margin: 10px 0;">\\n<b>[VDD Visual Boundary]</b><br>\\n[PAYLOAD_INSERT]\\n</div>\\n';
              } else if(target === 'DDD') {
                 injection = '<span style="background: rgba(139,92,246,0.2); border-bottom: 2px solid #8b5cf6; font-weight: bold; padding: 0 4px;"> [DOMAIN_LOGIC] </span>';
              } else if(target === 'ADR') {
                 injection = '\\n> [!IMPORTANT]\\n> **[ADR] Architectural Rule Enforcement**\\n> [RULE_DEFINITION]\\n';
              } else if(target === 'PRD') {
                 injection = '\\n**Target:** Product | Operations\\n**Pitch:** "[PITCH_DEFINITION]"\\n';
              }
              
              editor.insertText(injection);
              
              currentStatus.innerHTML = '<span style="color: #10b981; font-weight: bold;">[SYS: ' + target + ' LOGIC INJECTED]</span>';
              saveData(null);
              setTimeout(() => { currentStatus.innerText = oldText; }, 3000);
            }

            function switchTab(tab, context) {
              if (currentTab === tab) return;
              
              // Save state of current tab before switching
              document.getElementById('raw-' + currentTab).value = editor.getMarkdown();
              
              currentTab = tab;
              document.getElementById('tab-maa').classList.toggle('active', tab === 'maa');
              document.getElementById('tab-wwc').classList.toggle('active', tab === 'wwc');
              document.getElementById('header-context').innerText = context;
              
              // Load new state
              editor.setMarkdown(document.getElementById('raw-' + tab).value);
            }

            async function regeneratePdf(btn) {
              const originalText = btn.innerText;
              btn.innerText = 'EXECUTING CICD...';
              
              // get the markdown directly from the WYSIWYG component
              const content = editor.getMarkdown();
              const theme = document.getElementById('theme-selector').value;
              
              const response = await fetch('/regenerate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: currentTab, content: content, theme: theme })
              });
              
              const result = await response.json();
              if (result.success) {
                btn.innerText = 'PAYLOAD SUCCESS';
                // append timestamp to bust cache
                document.getElementById('pdf-preview').src = result.pdfPath + '&t=' + Date.now();
                setTimeout(() => btn.innerText = originalText, 3000);
              } else {
                alert('Execution Failed: ' + result.error);
                btn.innerText = originalText;
              }
            }
          </script>
        </body>
        </html>
      `);
    } catch (err) {
      res.writeHead(500);
      res.end('Error reading source files: ' + err.message);
    }
  } 
  else if (req.method === 'POST' && req.url === '/regenerate') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const targetPath = payload.target === 'maa' ? MAA_PATH : WWC_PATH;
        
        fs.writeFileSync(targetPath, payload.content);

        const injectedContent = CSS_THEMES[payload.theme] + '\n\n' + payload.content;
        const workDir = path.dirname(targetPath);
        const finalPdf = targetPath.replace('.md', '.pdf');

        (async () => {
          try {
            await mdToPdf(
              { content: injectedContent },
              { 
                dest: finalPdf, 
                basedir: workDir,
                launch_options: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
              }
            );
            exec('open "' + finalPdf + '"'); // Physical Execution
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, pdfPath: '/preview?target=' + payload.target }));
          } catch (err) {
            console.error('Programmatic Execution Error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.stack || err.message }));
          }
        })();
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
  } else if (req.method === 'GET' && req.url.startsWith('/preview')) {
    const url = new URL(req.url, 'http://localhost:8888');
    const target = url.searchParams.get('target');
    const targetPath = target === 'maa' ? MAA_PATH : WWC_PATH;
    const finalPdf = targetPath.replace('.md', '.pdf');
    try {
        if (fs.existsSync(finalPdf)) {
            res.writeHead(200, { 'Content-Type': 'application/pdf' });
            fs.createReadStream(finalPdf).pipe(res);
        } else {
            res.writeHead(404);
            res.end('PDF not found');
        }
    } catch(e) {
        res.writeHead(500);
        res.end(e.message);
    }
  } else if (req.method === 'POST' && req.url === '/autosave') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const targetPath = payload.target === 'maa' ? MAA_PATH : WWC_PATH;
        fs.writeFileSync(targetPath, payload.content);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[SYSTEMIC.OS] Visual IDE Layer operational on http://localhost:${PORT}`);
});
