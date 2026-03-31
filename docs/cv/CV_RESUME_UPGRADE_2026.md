# CV / Resume Upgrade 2026

**Source for**: [cv.rooz.live](https://cv.rooz.live)  
**Prior review**: [cv.rooz.live](https://cv.rooz.live) | [cv.rooz.live/credly](https://cv.rooz.live/credly)

> If cv.rooz.live is unreachable, this doc is the canonical resume upgrade source.

---

## Methodology Highlights (New School AI + TDD/ADR/DDD)

### TDD-First Development
- **Test-Driven Development**: Regression tests before implementation for validation logic, document extraction, governance council
- **Coverage**: pytest for Python (governance, dashboard, extraction); Jest for TypeScript
- **Fixtures**: Sample .eml, .txt, .pdf, .docx for reproducible validation

### ADR (Architecture Decision Records)
- **ADR-0001**: Multi-format document extraction (PDF, Word, .eml) — `docs/designs/ADR-0001-multi-format-document-extraction.md`
- Decisions documented before implementation; rationale and consequences tracked

### DDD (Domain-Driven Design)
- **Document Extraction Service**: `vibesthinker/document_extractor.py` — domain service for .txt, .md, .eml, .pdf, .docx
- **21-Role Governance Council**: Bounded contexts (Circles, Legal Roles, Government Counsel, Software Patterns)
- **VibeThinker AI**: Strategy generation, MGPO selection, entropy-guided optimization

### New School AI
- **Agentic systems**: 21-role legal validation, adversarial review (Judge/Prosecutor/Defense)
- **VibeThinker SFT→RL pipeline**: Strategic diversity, Pass@K optimization, MGPO entropy selection
- **Real-time validation**: TUI dashboard, file watcher, systemic scores (MAA, Apex, US Bank)

### Document Processing (Word / PDF)
- **Multi-format extraction**: pypdf (PDF), python-docx (Word), native .eml/.txt/.md
- **Validation pipeline**: advocate CLI, dashboard, governance council accept PDF/Word input
- **Lease comparator**: pypdf-based PDF text comparison

---

## Technical Skills (Resume Lines)

```
• TDD-first development (pytest, Jest); regression fixtures for .eml, .pdf, .docx
• ADR/DDD: Architecture Decision Records; domain services (document extraction)
• New school AI: Agentic validation (21 roles), VibeThinker SFT/RL, MGPO
• Document processing: Word (.docx), PDF extraction; validation pipeline
• URLs: cv.rooz.live | credly | cal.rooz.live | s@rooz.live
```

---

## URLs (cv.rooz.live Ecosystem)

| Link | URL |
|------|-----|
| CV / Resume | https://cv.rooz.live |
| Credly | https://cv.rooz.live/credly |
| Calendar | https://cal.rooz.live |
| Venmo | https://go.rooz.live/venmo |
| Email | s@rooz.live |

---

## CICD: Continuous Build / Measure / Learning

| Phase | Action | DoR | DoD |
|-------|--------|-----|-----|
| **Build** | Export CV (pandoc) | Markdown source exists | CV_2026.pdf, CV_2026.docx |
| **Measure** | Verify URLs | URLs listed | All reachable (200) or documented |
| **Measure** | Test cPanel API | Token in env | `listaccts` returns valid JSON |
| **Learning** | Log deployment | Build artifacts | `.goalie/cv_deploy_metrics.jsonl` |

### Script: `scripts/cv-deploy-cicd.sh`
```bash
./scripts/cv-deploy-cicd.sh all    # Build + Measure + Learning
./scripts/cv-deploy-cicd.sh build  # pandoc export only
./scripts/cv-deploy-cicd.sh measure # URL + cPanel API check
```

### Manual Flow
```bash
# 1. Build
pandoc docs/cv/CV_RESUME_UPGRADE_2026.md -o CV_2026.pdf
pandoc docs/cv/CV_RESUME_UPGRADE_2026.md -o CV_2026.docx

# 2. Measure (URL health)
curl -s -o /dev/null -w "%{http_code}" https://cv.rooz.live
curl -s -o /dev/null -w "%{http_code}" https://cv.rooz.live/credly

# 3. Measure (cPanel API)
curl -k -H "Authorization: cpanel $CPANEL_USER:$CPANEL_API_TOKEN" \
  "https://$CPANEL_HOST:2083/json-api/listaccts?api.version=1" | jq .

# 4. Learning (log)
echo '{"phase":"cv_build","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","artifacts":["CV_2026.pdf","CV_2026.docx"]}' >> .goalie/cv_deploy_metrics.jsonl
```

---

## Before Deploying to cPanel

### 1. Verify URLs (prior review)
- [cv.rooz.live](https://cv.rooz.live) — CV / Resume
- [cv.rooz.live/credly](https://cv.rooz.live/credly) — Credly badges
- [cal.rooz.live](https://cal.rooz.live) — Calendar
- [go.rooz.live/venmo](https://go.rooz.live/venmo) — Venmo

### 2. cPanel API Token (create before deploy)
- [How to Use cPanel API Tokens](https://docs.cpanel.net/knowledge-base/security/how-to-use-cpanel-api-tokens/)
- [Manage API Tokens in cPanel](https://docs.cpanel.net/cpanel/security/manage-api-tokens-in-cpanel/)

Create token: **cPanel » Home » Security » Manage API Tokens**

### 3. Test cPanel API (WHM listaccts)
```bash
curl -k \
  -H "Authorization: cpanel cpanel_username:api_token" \
  "https://54.241.233.105:2083/json-api/listaccts?api.version=1"
```

For UAPI/cPanel API 2:
```bash
curl -k -H "Authorization: cpanel username:APITOKEN" \
  "https://example.com:2083/execute/Module/function?parameter=value"
```

---

## Export Formats (Word / PDF)

```bash
# Via CICD script (output: docs/cv/build/)
./scripts/cv-deploy-cicd.sh build

# Manual pandoc
pandoc docs/cv/CV_RESUME_UPGRADE_2026.md -o docs/cv/build/CV_2026.pdf
pandoc docs/cv/CV_RESUME_UPGRADE_2026.md -o docs/cv/build/CV_2026.docx
```
