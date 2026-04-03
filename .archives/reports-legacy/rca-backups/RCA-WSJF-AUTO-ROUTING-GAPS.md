# RCA: Why Recent Files Were Not Auto-Routed to WSJF Swarms

**Generated**: 2026-03-05 18:57 EST  
**Context**: User reported that 20+ files with WSJF keywords exist but were never auto-routed to swarms

---

## 🔍 Investigation Summary

### Files Found
1. **ARBITRATION-NOTICE-MARCH-3-2026.pdf** - Root MAA directory
2. **TRIAL-DEBRIEF-MARCH-3-2026.md** - Root MAA + nested in case folder
3. **applications.json** - Root MAA directory

### Current Validator #12 Status
- **Process**: Running (PID 89730, high CPU usage during initial scan)
- **Version**: v2.0.0-enhanced  
- **Watch Directory**: `~/Documents/Personal/CLT/MAA`
- **Scan Frequency**: 3 seconds
- **SENT Folders**: 3 monitored

---

## 🚨 Root Causes Identified

### 1. **Validator #12 Was Not Running During File Creation**

**Evidence**:
- Files created: March 3-4, 2026
- Validator #12 v2.0.0: Just started at 18:54 EST today (March 5)
- Previous validator (v1.0.0): May have been stopped or not watching root directory

**Impact**: Files created **before** watcher started = never detected

**Fix**: ✅ Validator now running and will catch **new** files going forward

---

### 2. **Root Directory Files vs Nested Watchers**

**Current Watch Config** (`wsjf-roam-escalator.ts` lines 34-42):
```typescript
const WATCH_DIR = join(process.env.HOME!, 'Documents/Personal/CLT/MAA');
const SENT_DIRS = [
  join(..., 'MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/01-OPPOSING-COUNSEL/SENT'),
  join(..., 'MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/04-SETTLEMENT-OFFERS/SENT'),
  join(..., '11-ADVOCACY-PIPELINE/TIER-5-DIGITAL/Email/SENT')
];
```

**Problem**: 
- **Root files ARE watched** (WATCH_DIR covers `~/MAA/*`)
- **But**: `ignoreInitial: false` means existing files SHOULD be processed on startup
- **However**: Dashboard not yet generated = files may still be processing

**Hypothesis**: Files are **currently being processed** (high CPU = initial scan in progress)

---

### 3. **`.json` Files Not in Supported Extensions**

**Current File Type Filter** (`wsjf-roam-escalator.ts` line 242):
```typescript
if (path.endsWith('.pdf') || path.endsWith('.md') || path.endsWith('.txt') || path.endsWith('.eml'))
```

**Missing**: `.json` files!

**Impact**: `applications.json` will **never** be processed even if watcher sees it

**Fix Needed**: Add `.json` to supported file types

---

### 4. **Paperclip OCR Dependency for PDFs**

**Current PDF Processing** (`wsjf-roam-escalator.ts` lines 156-157):
```typescript
if (filePath.endsWith('.pdf')) {
  content = await extractTextWithPaperclip(filePath);
}
```

**Risk**: If Paperclip CLI not installed, PDF processing fails silently

**Check**:
```bash
which paperclip
# If not found: npm install -g @paperclip/cli
```

**Fix Needed**: Add fallback to `pdftotext` or `pdf-parse` npm package

---

### 5. **Existing Files Not Re-Scanned (No Trigger Mechanism)**

**Problem**: Validator watches for **new** files or **changes** to existing files
- Existing files with no recent changes = not re-processed
- `ignoreInitial: false` processes files **once** on startup
- If startup happens while you're away = no notification

**Fix Needed**: Manual trigger mechanism to re-scan specific files

---

## 📊 Files By Status

| File | Location | Type | Supported? | Likely Reason |
|------|----------|------|------------|---------------|
| ARBITRATION-NOTICE-MARCH-3-2026.pdf | Root MAA | PDF | ✅ Yes | Being processed (or Paperclip failure) |
| TRIAL-DEBRIEF-MARCH-3-2026.md | Root MAA | MD | ✅ Yes | Being processed (high CPU suggests scan in progress) |
| TRIAL-DEBRIEF-MARCH-3-2026.md | Nested case folder | MD | ✅ Yes | Being processed (duplicate location) |
| applications.json | Root MAA | JSON | ❌ NO | **NOT SUPPORTED** - needs .json handler added |

---

## ✅ Immediate Fixes

### Fix #1: Add `.json` File Support

```typescript
// scripts/validators/wsjf-roam-escalator.ts line 348
if (path.endsWith('.pdf') || path.endsWith('.md') || path.endsWith('.txt') || path.endsWith('.eml') || path.endsWith('.json')) {
  // Process file
}
```

### Fix #2: Add JSON Content Extraction

```typescript
// After line 159
} else if (filePath.endsWith('.json')) {
  const jsonContent = readFileSync(filePath, 'utf-8');
  // Extract searchable text from JSON values
  const parsed = JSON.parse(jsonContent);
  content = JSON.stringify(parsed, null, 2); // Pretty-print for readability
}
```

### Fix #3: Add Paperclip Fallback

```typescript
// Replace lines 92-104
async function extractTextWithPaperclip(filePath: string): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      const process = spawn('paperclip', ['extract', '--file', filePath, '--ocr-enabled']);
      let output = '';
      
      process.stdout.on('data', (data) => { output += data.toString(); });
      process.stderr.on('data', (data) => { console.error(`Paperclip error: ${data}`); });
      process.on('close', (code) => {
        if (code === 0) resolve(output);
        else reject(new Error(`Paperclip exited with code ${code}`));
      });
    });
  } catch (error) {
    console.warn(`Paperclip failed, trying pdftotext fallback: ${error}`);
    // Fallback to pdftotext
    return new Promise((resolve) => {
      const process = spawn('pdftotext', [filePath, '-']);
      let output = '';
      process.stdout.on('data', (data) => { output += data.toString(); });
      process.on('close', () => resolve(output || '[PDF text extraction failed]'));
    });
  }
}
```

### Fix #4: Manual Re-Scan Trigger

```bash
# Create script to touch files and force re-processing
#!/usr/bin/env bash
# scripts/validators/force-rescan.sh

WATCH_DIR="$HOME/Documents/Personal/CLT/MAA"

echo "🔄 Force re-scanning files..."

# Touch files to trigger watcher
find "$WATCH_DIR" -maxdepth 1 \( -name "*.pdf" -o -name "*.md" -o -name "*.json" \) -mtime -7 -exec touch {} \;

echo "✅ Files touched - watcher will re-process them"
```

---

## 🔬 Verification Steps

### Step 1: Wait for Initial Scan to Complete

```bash
# Monitor CPU usage - should drop to <5% when scan complete
watch -n 2 'ps aux | grep wsjf-roam-escalator | grep -v grep'

# Check dashboard generation
ls -lh /tmp/wsjf-priority-dashboard.html

# Expected: Dashboard created with 20+ files listed
```

### Step 2: Check Logs for Processing Evidence

```bash
# Look for file processing messages
grep -E "Processing|Processed|WSJF|Routed" ~/Library/Logs/validator-12-enhanced.log | tail -50

# Look for errors
grep -i "error\|fail" ~/Library/Logs/validator-12-enhanced.log | tail -20
```

### Step 3: Verify Paperclip Availability

```bash
which paperclip
# If not found:
npm install -g @paperclip/cli

# Test PDF extraction
paperclip extract --file ~/Documents/Personal/CLT/MAA/ARBITRATION-NOTICE-MARCH-3-2026.pdf --ocr-enabled
```

### Step 4: Manual Re-Scan After Fixes

```bash
# After adding .json support, restart validator
pkill -f wsjf-roam-escalator
nohup npx ts-node scripts/validators/wsjf-roam-escalator.ts >> ~/Library/Logs/validator-12-enhanced.log 2>&1 &

# Force re-scan
./scripts/validators/force-rescan.sh
```

---

## 📈 Expected Outcomes

After fixes:
1. **applications.json** processed and WSJF scored
2. **PDF extraction** works with fallback if Paperclip unavailable
3. **Dashboard** shows all 20+ files ranked by WSJF
4. **Logs** show routing to appropriate swarms (legal/utilities/income)

---

## 🚀 Expanded Folder Coverage (Next TODO)

### High-Value Directories to Add

1. **Movers Folder**
   ```
   ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/12-AMANDA-BECK-110-FRAZIER/movers/
   ```

2. **All SENT/RECEIVED Folders**
   ```bash
   find ~/Documents/Personal/CLT/MAA -type d -name "SENT" -o -name "RECEIVED"
   ```

3. **Root MAA Directory** (already watched, but verify)
   ```
   ~/Documents/Personal/CLT/MAA/*.{pdf,md,json,eml}
   ```

4. **Legal Dashboard**
   ```
   ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD/
   ```

---

## 💡 Recommendations

1. **Add .json support** (5 min fix)
2. **Install Paperclip** or add `pdftotext` fallback (10 min)
3. **Wait 5-10 min** for initial scan to complete
4. **Check dashboard** to see if files now appear
5. **If not**, run manual re-scan script
6. **Then**, expand folder coverage to movers/legal-dashboard dirs

---

*Generated by: Oz*  
*Next: Apply fixes + verify processing*
