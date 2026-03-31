# Systematic CLI & IDE Upgrade Roadmap

**Goal:** Make PDF classification and legal document automation available across all temporal sessions with feature flags.

**Date:** 2026-02-23  
**Status:** POST-TRIAL implementation (after March 10)

---

## Problem Statement

**What worked today:**
- Manual `sips` conversion + Claude vision API read
- Ad-hoc Python scripts in conversation
- One-time successful PDF classification (6 documents)

**What's missing:**
- Permanent CLI tool accessible from any directory
- IDE extensions for VSCode/Cursor/Windsurf
- Feature flags to enable/disable capabilities
- Persistent configuration across sessions

---

## Phase 1: CLI Tool Upgrade (2-4 hours)

### 1.1 Install Dependencies

```bash
cd ~/Documents/code/investing/agentic-flow

# Use python3.13 (already confirmed working)
/usr/local/opt/python@3.13/bin/python3.13 -m pip install anthropic

# Or create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install anthropic click rich
```

### 1.2 Add `advocate classify` Subcommand

**File:** `vibesthinker/advocate_cli.py` (line ~400)

```python
@cli.command()
@click.argument('path')
@click.option('--case', help='Case number for context')
@click.option('--output', '-o', help='Output JSON file')
@click.option('--auto-rename', is_flag=True, help='Automatically rename files')
@click.option('--feature-flag', default='pdf-vision', help='Feature flag to check')
def classify(path, case, output, auto_rename, feature_flag):
    """Classify legal PDFs using Claude vision"""
    from .pdf_classifier import PDFClassifier
    
    # Check feature flag
    if not is_feature_enabled(feature_flag):
        click.echo(f"⚠️  Feature '{feature_flag}' is disabled")
        click.echo("   Enable in config/.env: FEATURE_PDF_VISION=true")
        return
    
    # Initialize classifier
    try:
        classifier = PDFClassifier()
        results = classifier.classify_batch(Path(path), case)
        
        # Auto-rename if requested
        if auto_rename:
            for result in results:
                # Move and rename based on classification
                pass
        
        # Output results
        if output:
            Path(output).write_text(json.dumps(results, indent=2))
            click.echo(f"✓ Results saved to {output}")
        else:
            click.echo(json.dumps(results, indent=2))
    
    except Exception as e:
        click.echo(f"✗ Error: {e}", err=True)
        sys.exit(1)
```

### 1.3 Feature Flag System

**File:** `config/.env.template`

```bash
# Feature Flags (enable/disable capabilities)
FEATURE_PDF_VISION=true
FEATURE_VOICE_INPUT=false
FEATURE_AUTO_FILE_ORGANIZATION=true
FEATURE_TEMPORAL_SESSION_MEMORY=false
FEATURE_MULTI_CASE_TRACKING=true
```

**File:** `vibesthinker/feature_flags.py`

```python
import os
from typing import Dict

FEATURES = {
    "pdf-vision": "FEATURE_PDF_VISION",
    "voice-input": "FEATURE_VOICE_INPUT",
    "auto-file-organization": "FEATURE_AUTO_FILE_ORGANIZATION",
    "temporal-session-memory": "FEATURE_TEMPORAL_SESSION_MEMORY",
    "multi-case-tracking": "FEATURE_MULTI_CASE_TRACKING"
}

def is_feature_enabled(feature_name: str) -> bool:
    """Check if feature is enabled via environment variable"""
    env_var = FEATURES.get(feature_name)
    if not env_var:
        return False
    return os.getenv(env_var, "false").lower() == "true"

def list_features() -> Dict[str, bool]:
    """List all features and their status"""
    return {name: is_feature_enabled(name) for name in FEATURES}
```

### 1.4 Usage Examples

```bash
# Classify single PDF
advocate classify ~/Downloads/26CV007491-590.pdf --case 26CV007491-590

# Classify entire directory
advocate classify ~/Downloads/ --case 26CV007491-590 --output classifications.json

# Auto-rename and organize
advocate classify ~/Downloads/ --case 26CV007491-590 --auto-rename

# Check feature flags
advocate config features

# Enable/disable features
advocate config set FEATURE_PDF_VISION=true
```

---

## Phase 2: IDE Extensions (4-8 hours)

### 2.1 VSCode Extension

**File:** `.vscode/extensions/legal-docs/package.json`

```json
{
  "name": "legal-document-classifier",
  "displayName": "Legal Document Classifier",
  "description": "Classify legal PDFs using Claude vision",
  "version": "0.1.0",
  "engines": { "vscode": "^1.80.0" },
  "activationEvents": ["onCommand:legalDocs.classify"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [{
      "command": "legalDocs.classify",
      "title": "Legal Docs: Classify PDF"
    }],
    "configuration": {
      "title": "Legal Document Classifier",
      "properties": {
        "legalDocs.anthropicApiKey": {
          "type": "string",
          "default": "",
          "description": "Anthropic API key"
        },
        "legalDocs.autoOrganize": {
          "type": "boolean",
          "default": true,
          "description": "Automatically organize classified PDFs"
        }
      }
    }
  }
}
```

**File:** `.vscode/extensions/legal-docs/src/extension.ts`

```typescript
import * as vscode from 'vscode';
import { execSync } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        'legalDocs.classify',
        async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return;
            
            // Get PDF files
            const pdfs = await vscode.workspace.findFiles('**/*.pdf');
            
            // Run advocate classify
            const result = execSync(
                `advocate classify ${pdfs[0].fsPath} --output /tmp/classification.json`
            ).toString();
            
            // Show results
            vscode.window.showInformationMessage(result);
        }
    );
    
    context.subscriptions.push(disposable);
}
```

### 2.2 Cursor/Windsurf Integration

**File:** `.cursor/commands/classify-pdf.md`

```markdown
# Classify PDF Command

Trigger: `@classify-pdf <path>`

Action: Run `advocate classify` on the specified PDF

Output: Classification result with recommended filename
```

### 2.3 Zed Integration

**File:** `.zed/commands.json`

```json
{
  "commands": {
    "classify_pdf": {
      "command": "advocate",
      "args": ["classify", "$FILE"],
      "description": "Classify legal PDF"
    }
  }
}
```

---

## Phase 3: Persistent Configuration (1-2 hours)

### 3.1 Session Memory

**File:** `~/.advocate/session.json`

```json
{
  "last_case": "26CV007491-590",
  "last_classification": "2026-02-23T18:00:00Z",
  "document_count": 6,
  "feature_flags": {
    "pdf-vision": true,
    "auto-organize": true
  },
  "api_usage": {
    "classify_calls": 6,
    "last_month_cost": 0.12
  }
}
```

### 3.2 Case Context Tracking

**File:** `~/.advocate/cases/26CV007491-590.json`

```json
{
  "case_number": "26CV007491-590",
  "created": "2026-02-09",
  "parties": {
    "plaintiff": "MAA Uptown",
    "defendant": "Shahrooz Bhopti"
  },
  "documents": {
    "classified": 6,
    "pending": 0
  },
  "trial_dates": [
    "2026-03-03",
    "2026-03-10"
  ]
}
```

---

## Phase 4: Multi-Tool Integration (8-16 hours)

### 4.1 Mail.app Integration

**Auto-classify PDFs from legal emails**

```applescript
-- .advocate/mail-hooks/classify-attachments.scpt
tell application "Mail"
    set selectedMessages to selection
    repeat with theMessage in selectedMessages
        set attachmentList to attachments of theMessage
        repeat with theAttachment in attachmentList
            if name of theAttachment ends with ".pdf" then
                set pdfPath to "/tmp/" & name of theAttachment
                save theAttachment in pdfPath
                
                do shell script "advocate classify " & pdfPath & " --auto-rename"
            end if
        end repeat
    end repeat
end tell
```

### 4.2 Photos.app Integration

**Classify scanned documents from Photos**

```bash
#!/bin/bash
# .advocate/photos-export.sh

osascript << 'EOF'
tell application "Photos"
    set selectedPhotos to selection
    repeat with photo in selectedPhotos
        export photo to "/tmp/photo-export/"
    end repeat
end tell
EOF

advocate classify /tmp/photo-export/ --case "$1" --auto-rename
```

### 4.3 Telegram Bot Integration

**Send PDFs to Telegram bot for classification**

```python
# vibesthinker/telegram_classifier.py
from telegram import Update
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters

def classify_pdf(update: Update, context):
    """Handle PDF classification via Telegram"""
    file = update.message.document
    file_path = file.download()
    
    # Classify
    classifier = PDFClassifier()
    result = classifier.classify_pdf(Path(file_path))
    
    # Send result
    update.message.reply_text(
        f"Document type: {result['document_type']}\n"
        f"Confidence: {result['confidence']:.0%}\n"
        f"Recommended filename: {result['recommended_filename']}"
    )
```

---

## Implementation Schedule

| Phase | Task | Hours | Priority | Blocker |
|-------|------|-------|----------|---------|
| **Phase 1** | CLI tool + feature flags | 2-4 | HIGH | None |
| **Phase 2** | VSCode extension | 4-8 | MEDIUM | Phase 1 |
| **Phase 3** | Session persistence | 1-2 | MEDIUM | Phase 1 |
| **Phase 4** | Multi-tool integration | 8-16 | LOW | Trial complete |

**Start date:** March 11, 2026 (after trials)

---

## Success Criteria

### MVP (Phase 1)
- [ ] `advocate classify` command works
- [ ] Feature flags system functional
- [ ] PDF-to-PNG conversion automated
- [ ] Claude vision API integration

### Full (Phase 2-3)
- [ ] VSCode extension installed
- [ ] Session memory persists across conversations
- [ ] Case context automatically loaded
- [ ] Auto-rename based on classification

### Advanced (Phase 4)
- [ ] Mail.app auto-classification
- [ ] Photos.app integration
- [ ] Telegram bot operational
- [ ] Multi-case tracking

---

## Cost Estimation

| Resource | Cost/Month | Usage | Total |
|----------|------------|-------|-------|
| Claude API (vision) | $3/1K images | 100 PDFs/mo | $0.30 |
| Storage | $0.02/GB | 1GB | $0.02 |
| Development time | $0 (self) | 16 hours | - |

**Total recurring:** ~$0.50/month

---

## Rollback Plan

If PDF classification fails:
1. Feature flag: `FEATURE_PDF_VISION=false`
2. Fallback to manual inspection
3. Keep `/tmp/*.png` files for manual review
4. Log errors to `.advocate/errors.log`

---

## Next Steps (POST-TRIAL)

1. **Tonight:** Document this roadmap ✅
2. **March 11:** Implement Phase 1 (CLI tool)
3. **March 12:** Test with real PDFs from trial
4. **March 15:** Add feature flags
5. **March 20:** Start Phase 2 (IDE extensions)

---

**Filed on time. Now automate the rest.**
