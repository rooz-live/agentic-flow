# Advocate CLI Quickstart Guide

**Version**: 2.3.0  
**Status**: Production-Ready  
**Last Updated**: 2026-02-24

---

## Overview

The `advocate` CLI is a multi-provider PDF classification and trial management system designed for pro se litigants. It provides:

- **Multi-provider PDF classification** (Anthropic → OpenAI → Gemini → Local)
- **Session persistence** with trial countdown tracking
- **Auto-rename + organize** PDFs based on document type
- **Evidence bundle management**
- **API cost tracking** and usage analytics

---

## Installation

### Prerequisites

```bash
# Python 3.11+
python3 --version

# Required packages
pip3 install anthropic openai google-generativeai
```

### Setup

```bash
# 1. Clone/navigate to agentic-flow
cd ~/Documents/code/investing/agentic-flow

# 2. Make advocate executable
chmod +x ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/advocate

# 3. Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE"

# 4. Configure API keys
export ANTHROPIC_API_KEY="YOUR_ANTHROPIC_KEY_HERE"
export OPENAI_API_KEY="YOUR_OPENAI_KEY_HERE"
export GOOGLE_API_KEY="YOUR_GOOGLE_KEY_HERE"
```

---

## Core Commands

### `advocate classify`

Classify PDFs and auto-organize them.

```bash
# Basic classification
advocate classify ~/Downloads/26CV007491-590.pdf

# Auto-rename and move to appropriate directory
advocate classify ~/Downloads/*.pdf --auto-rename

# Force specific provider
advocate classify document.pdf --provider anthropic

# Set confidence threshold
advocate classify document.pdf --confidence 0.9
```

**Output Example**:
```
🔍 Classifying: 26CV007491-590.pdf

📄 Type: order
✓ Confidence: 85.0%
🏛️  Case: 26CV007491-590
🤖 Provider: anthropic
💡 Reasoning: Document contains "ORDERED" and court seal

✅ Renamed: 2026-02-24-ORDER-26CV007491-590.pdf
   Moved to: COURT-FILINGS/FILED/
```

### `advocate session`

Display session state and trial countdown.

```bash
# Show current session
advocate session restore

# Show latest classification
advocate session latest

# Export session as JSON
advocate session export
```

**Output Example**:
```
📊 Advocate Session

🏛️  Last Case: 26CV007491-590
📅 Last Classification: 2026-02-24 09:55 UTC

⏱️  Trial Countdown:
   Trial #1 (Habitability): March 3, 2026 (6 days)
   Trial #2 (Eviction): March 10, 2026 (13 days)

📁 Evidence Bundle: Complete

💰 API Usage:
   Documents classified: 7
   API calls this month: 2
   Cost: $0.00

🤖 Provider Stats:
   anthropic: 0
   openai: 0
   gemini: 0
   local: 2
```

### `advocate config`

Manage feature flags and configuration.

```bash
# Enable PDF vision mode
advocate config set FEATURE_PDF_VISION=true

# Show all config
advocate config show

# Reset to defaults
advocate config reset
```

---

## Document Type Mapping

| Document Type | Target Directory |
|---------------|------------------|
| `answer` | `COURT-FILINGS/FILED/` |
| `motion` | `COURT-FILINGS/FILED/` |
| `complaint` | `COURT-FILINGS/FILED/` |
| `order` | `COURT-FILINGS/FILED/` |
| `photo` | `EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/MOLD-PHOTOS/` |
| `email` | `CORRESPONDENCE/INBOUND/01-OPPOSING-COUNSEL/` |

---

## Architecture (ARD/DDD)

### Architecture Decision Records (ARD)

#### ADR-001: Multi-Provider Cascade

**Decision**: Use cascading provider fallback (Anthropic → OpenAI → Gemini → Local)

**Rationale**:
- **Resilience**: Single provider failure doesn't block workflow
- **Cost optimization**: Try expensive providers first (higher accuracy), fall back to cheap/free
- **Graceful degradation**: Always have local pattern matching as last resort

**Consequences**:
- Adds complexity in error handling
- Requires API key management for 3 providers
- Local fallback has lower accuracy (33% vs 85%+)

#### ADR-002: Session Persistence at ~/.advocate/

**Decision**: Store session state in `~/.advocate/session.json`

**Rationale**:
- **Context restoration**: Auto-load trial dates, case numbers, evidence status
- **Cost tracking**: Monitor API usage across multiple invocations
- **Audit trail**: Track all classifications for forensic review

**Consequences**:
- Single point of failure (file corruption)
- Not multi-user safe (file locking needed for concurrent access)

---

## Domain-Driven Design (DDD)

### Bounded Contexts

1. **Classification Context**
   - Entities: `Document`, `Classification`, `Provider`
   - Value Objects: `Confidence`, `CaseNumber`, `DocumentType`
   - Aggregates: `ClassificationResult`

2. **Session Context**
   - Entities: `Session`, `Trial`, `APIUsage`
   - Value Objects: `TrialDate`, `Cost`, `ProviderStats`
   - Aggregates: `SessionState`

3. **Evidence Context**
   - Entities: `EvidenceBundle`, `Exhibit`
   - Value Objects: `FilePath`, `ExhibitNumber`
   - Aggregates: `TrialEvidence`

### Domain Events

- `DocumentClassified(document_id, type, confidence, provider)`
- `SessionRestored(session_id, trial_dates)`
- `TrialDeadlineApproaching(trial_id, days_remaining)`
- `EvidenceBundleCompleted(bundle_id)`

---

## Method Pattern Protocol (MPP)

### Pattern: Graceful Degradation

**Intent**: Maintain functionality despite provider failures

**Structure**:
```python
for provider in [anthropic, openai, gemini, local]:
    try:
        result = classify_with(provider)
        if result.confidence >= threshold:
            return result
    except ProviderError:
        continue
return local_fallback()
```

**Usage**: Applied to all external API calls

---

## Product Requirements Document (PRD)

### User Stories

**US-001**: As a pro se litigant, I want to classify court documents automatically so I can organize evidence without manual filing.

**Acceptance Criteria**:
- [x] PDFs classified with ≥80% confidence
- [x] Auto-renamed with date + type + case number
- [x] Moved to appropriate directory structure
- [x] Cost tracked per classification

**US-002**: As a trial attorney, I want to see my trial countdown on every session so I can prioritize tasks.

**Acceptance Criteria**:
- [x] Trial dates displayed with days remaining
- [x] Session auto-restores on CLI invocation
- [x] Evidence bundle status visible

---

## Test-Driven Development (TDD)

### Test Coverage

#### Unit Tests

```python
def test_local_fallback_answer():
    """Test local pattern matching for Answer documents"""
    pdf = create_test_pdf_with_text("DEFENDANT'S ANSWER TO COMPLAINT")
    result = classifier._local_fallback(pdf)
    assert result["type"] == "answer"
    assert result["confidence"] > 0.0

def test_auto_rename_collision():
    """Test filename collision handling"""
    existing = Path("2026-02-24-ORDER-26CV007491-590.pdf")
    existing.touch()
    new_path = auto_rename(pdf, classification)
    assert new_path.name == "2026-02-24-ORDER-26CV007491-590-1.pdf"
```

#### Integration Tests

```bash
# Test full cascade
advocate classify test_order.pdf --auto-rename
# Expected: Anthropic classifies → Auto-renames → Moves to COURT-FILINGS/FILED/

# Test provider fallback
ANTHROPIC_API_KEY="" advocate classify test.pdf
# Expected: Skips Anthropic → Falls back to OpenAI
```

---

## Troubleshooting

### Issue: "404 model not found" (Anthropic)

**Cause**: Model name outdated

**Fix**:
```python
# In pdf_classifier_multi_provider.py line 134
model="claude-3-5-sonnet-latest"  # Always uses latest
```

### Issue: "401 Invalid API key" (OpenAI)

**Cause**: Placeholder API key in environment

**Fix**:
```bash
# Get real key from https://platform.openai.com/api-keys
export OPENAI_API_KEY="YOUR_OPENAI_KEY_HERE"
```

### Issue: Local fallback has low confidence (33%)

**Cause**: PDF is scanned image (no extractable text)

**Fix**:
```bash
# Enable vision mode
advocate config set FEATURE_PDF_VISION=true
# Or use --provider anthropic to force vision API
```

---

## Roadmap

### Phase 3: Webhooks (In Progress)
- Discord/Telegram/X/GitHub notifications
- `advocate notify --platforms discord,telegram`

### Phase 4: NAPI-RS Integration
- Rust-based EXIF/PDF validation (10-100x speedup)
- `npm install @ruvector/evidence-validator`

### Phase 5: VibeThinker RL
- Counter-argument generation
- Systemic indifference scoring
- `advocate analyze --vibesthinker`

---

## Contributing

### Commit Format

```bash
git commit -m "feat(classify): Add Gemini provider support

- Add _classify_gemini() method
- Update PROVIDERS list
- Add GOOGLE_API_KEY to env

Co-Authored-By: Oz <oz-agent@warp.dev>"
```

### WSJF Prioritization

All features prioritized using **Weighted Shortest Job First**:

```
WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size
```

Example scores:
- Fix API providers: 45.0 (HIGH: Blocks all classifications)
- Documentation: 35.0 (MEDIUM: Enables team adoption)
- Webhooks: 30.0 (LOW: Nice-to-have notifications)

---

## License

MIT License - See LICENSE file for details

---

## Support

- GitHub Issues: https://github.com/rooz-live/agentic-flow/issues
- Email: yo@720.chat
- Telegram: @rooz_live

---

**Built with ❤️ for pro se litigants fighting systemic injustice**
