# CV Deployment CI/CD Pipeline Guide

## Overview

The CV Deployment CI/CD Pipeline implements a Build-Measure-Learn loop for automated resume deployment. This pipeline handles document conversion, URL health verification, cPanel API validation, and deployment metrics tracking.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CV DEPLOYMENT CI/CD PIPELINE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────────────┐    ┌─────────────┐ │
│  │   BUILD     │───▶│      MEASURE        │───▶│   LEARNING   │ │
│  │             │    │                     │    │             │ │
│  │ • Pandoc    │    │ • URL Health Check  │    │ • Metrics   │ │
│  │ • PDF/DOCX  │    │ • cPanel API        │    │ • Analysis  │ │
│  └─────────────┘    └─────────────────────┘    └─────────────┘ │
│        │                     │                      │          │
│        ▼                     ▼                      ▼          │
│  ┌─────────────┐    ┌─────────────────────┐    ┌─────────────┐ │
│  │  Artifacts  │    │    Validation       │    │  JSONL Log  │ │
│  │  CV_2026.*  │    │    Results          │    │  .goalie/   │ │
│  └─────────────┘    └─────────────────────┘    └─────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

```bash
# Install required tools
brew install pandoc      # Document conversion
brew install jq          # JSON parsing
brew install curl        # HTTP client (usually pre-installed)

# Optional: PDF engine
brew install wkhtmltopdf # PDF generation
```

### Environment Setup

Create or update `.env` file:

```bash
# cPanel Configuration (required for deploy and cpanel measure)
CPANEL_HOST=cpanel.rooz.live
CPANEL_USER=your_username
CPANEL_API_TOKEN=your_api_token
CPANEL_PORT=2083  # Optional, defaults to 2083

# Service type (optional, defaults to 'cpanel')
CPANEL_SERVICE=cpanel  # or 'whm'
```

### Basic Usage

```bash
cd investing/agentic-flow

# Run all phases
./scripts/cv-deploy-cicd.sh all

# Run individual phases
./scripts/cv-deploy-cicd.sh build
./scripts/cv-deploy-cicd.sh measure
./scripts/cv-deploy-cicd.sh learning

# Diagnose configuration
./scripts/cv-deploy-cicd.sh diagnose
```

## Phases

### 1. Build Phase

**Purpose**: Convert markdown source to PDF and DOCX formats.

**Source**: `docs/cv/CV_RESUME_UPGRADE_2026.md`

**Output**: 
- `docs/cv/build/CV_2026.docx`
- `docs/cv/build/CV_2026.pdf` (if PDF engine available)

**Process**:
1. Validates source file exists
2. Checks pandoc availability
3. Generates DOCX using pandoc
4. Generates PDF if PDF engine (wkhtmltopdf/pdflatex) is available
5. Logs build metrics to `.goalie/cv_deploy_metrics.jsonl`

**Metrics Logged**:
- Build success/failure status
- Artifact file sizes
- Build duration
- PDF engine availability

### 2. Measure Phase

**Purpose**: Validate deployment readiness through health checks.

#### URL Health Check

Validates the following URLs from the CV document:
- `https://cv.rooz.live` - Main CV page
- `https://cv.rooz.live/credly` - Certifications
- `https://cal.rooz.live` - Calendar
- `https://go.rooz.live/venmo` - Venmo link

**Process**:
1. Sends HTTP HEAD request to each URL
2. Checks for HTTP 200 OK response
3. Reports healthy/unhealthy status
4. Logs results to metrics file

**Metrics Logged**:
- Total URLs checked
- Healthy URL count
- Unhealthy URL count
- HTTP status codes for each URL

#### cPanel API Validation

**Purpose**: Verify cPanel API connectivity and authentication.

**Process**:
1. Validates environment variables (CPANEL_HOST, CPANEL_USER, CPANEL_API_TOKEN)
2. Tests SSL connection to cPanel
3. Tests API authentication using `listaccts` endpoint
4. Validates JSON response
5. Reports account details if successful

**Metrics Logged**:
- SSL connection status
- API authentication status
- Account count
- Any errors or warnings

### 3. Learning Phase

**Purpose**: Track deployment metrics and provide insights.

**Metrics File**: `.goalie/cv_deploy_metrics.jsonl`

**Format**: JSONL (one JSON object per line)

```json
{"timestamp": "2026-02-13T20:56:23Z", "phase": "build", "status": "success", "message": "artifacts_created:0s"}
{"timestamp": "2026-02-13T20:57:13Z", "phase": "measure", "status": "warn", "message": "url_health:3/4_healthy"}
```

**Process**:
1. Reads metrics file
2. Displays recent entries
3. Shows phase summary statistics
4. Provides trend analysis

### 4. Deploy Phase (Optional)

**Purpose**: Upload build artifacts to cPanel.

**Process**:
1. Validates cPanel credentials
2. Uploads each artifact to `public_html`
3. Reports upload status
4. Logs deployment metrics

**Metrics Logged**:
- Files uploaded
- Files failed
- Deployment status

## Command Reference

### Available Commands

| Command | Description |
|---------|-------------|
| `build` | Build phase: Export markdown to PDF and DOCX |
| `measure` | Measure phase: URL health + cPanel API validation |
| `measure-urls` | URL health check only |
| `measure-cpanel` | cPanel API validation only |
| `learning` | Learning phase: Show deployment metrics |
| `deploy` | Deploy phase: Upload artifacts to cPanel |
| `diagnose` | Diagnose: Show configuration and tool status |
| `all` | Run build + measure + learning |
| `deploy-all` | Run build + deploy + measure + learning |

### Examples

```bash
# Build only
./scripts/cv-deploy-cicd.sh build

# Check URL health only
./scripts/cv-deploy-cicd.sh measure-urls

# Test cPanel API only
./scripts/cv-deploy-cicd.sh measure-cpanel

# Full pipeline with deployment
./scripts/cv-deploy-cicd.sh deploy-all

# View metrics
./scripts/cv-deploy-cicd.sh learning

# Diagnose issues
./scripts/cv-deploy-cicd.sh diagnose
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `CPANEL_HOST` | Deploy/Measure | cPanel hostname | - |
| `CPANEL_USER` | Deploy/Measure | cPanel username | - |
| `CPANEL_API_TOKEN` | Deploy/Measure | cPanel API token | - |
| `CPANEL_PORT` | Optional | cPanel port | `2083` |
| `CPANEL_SERVICE` | Optional | Service type | `cpanel` |

## File Structure

```
investing/agentic-flow/
├── scripts/
│   └── cv-deploy-cicd.sh          # Main pipeline script
├── docs/
│   └── cv/
│       ├── CV_RESUME_UPGRADE_2026.md  # Source markdown
│       ├── build/                     # Build output directory
│       │   ├── CV_2026.docx
│       │   └── CV_2026.pdf
│       └── CV_DEPLOY_CICD_GUIDE.md    # This guide
└── .goalie/
    └── cv_deploy_metrics.jsonl   # Metrics log
```

## Troubleshooting

### Build Phase Issues

**Issue**: `pandoc not found`
```bash
# Solution: Install pandoc
brew install pandoc
```

**Issue**: PDF generation fails
```bash
# Solution: Install PDF engine
brew install wkhtmltopdf
# Or use LaTeX
brew install mactex
```

**Issue**: Source file not found
```bash
# Verify source exists
ls -la docs/cv/CV_RESUME_UPGRADE_2026.md
```

### Measure Phase Issues

**Issue**: URL health check fails
- Verify URLs are correct in the CV document
- Check network connectivity
- Verify DNS resolution

**Issue**: cPanel API authentication fails
```bash
# Verify credentials
./scripts/cv-deploy-cicd.sh diagnose

# Check token permissions
# Ensure token has 'Fileman' and appropriate permissions
```

**Issue**: SSL connection fails
- Verify CPANEL_HOST is correct
- Check firewall settings
- Verify port (2083 for cPanel, 2087 for WHM)

### Deploy Phase Issues

**Issue**: Upload fails
```bash
# Verify cPanel credentials
# Check token permissions (needs Fileman::upload_files)
# Verify target directory exists
```

### Learning Phase Issues

**Issue**: Metrics file not found
```bash
# The file is created automatically on first run
# Verify .goalie directory exists
mkdir -p .goalie
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: CV Deployment

on:
  push:
    branches: [main]
    paths:
      - 'docs/cv/CV_RESUME_UPGRADE_2026.md'

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: |
          brew install pandoc jq
          
      - name: Build CV
        run: |
          cd investing/agentic-flow
          ./scripts/cv-deploy-cicd.sh build
          
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: cv-artifacts
          path: docs/cv/build/CV_2026.*
```

### GitLab CI Example

```yaml
cv-deploy:
  image: pandoc/core:latest
  script:
    - apk add --no-cache curl jq bash
    - cd investing/agentic-flow
    - ./scripts/cv-deploy-cicd.sh build
    - ./scripts/cv-deploy-cicd.sh measure
  artifacts:
    paths:
      - docs/cv/build/CV_2026.*
    expire_in: 1 week
```

## Best Practices

1. **Run `diagnose` first**: Always run `diagnose` before deployment to verify configuration
2. **Test locally**: Run `all` command locally before using `deploy-all`
3. **Monitor metrics**: Regularly review `.goalie/cv_deploy_metrics.jsonl` for trends
4. **Version control**: Keep the CV source in version control
5. **Environment security**: Never commit `.env` file with credentials
6. **URL validation**: Update URL list in script when adding new links to CV
7. **Regular updates**: Run pipeline after CV changes to ensure artifacts are current

## Metrics Analysis

### Viewing Metrics

```bash
# View all metrics
cat .goalie/cv_deploy_metrics.jsonl | jq .

# View recent metrics
tail -n 10 .goalie/cv_deploy_metrics.jsonl | jq .

# Filter by phase
grep '"phase": "build"' .goalie/cv_deploy_metrics.jsonl | jq .

# Count by status
cat .goalie/cv_deploy_metrics.jsonl | jq -r '.status' | sort | uniq -c
```

### Metrics Interpretation

| Status | Meaning | Action |
|--------|---------|--------|
| `success` | Phase completed successfully | No action needed |
| `warn` | Phase completed with warnings | Review and address if needed |
| `fail` | Phase failed | Investigate and fix |

## Security Considerations

1. **API Tokens**: Never commit API tokens to version control
2. **Token Permissions**: Use minimum required permissions for cPanel tokens
3. **Token Rotation**: Rotate API tokens regularly
4. **HTTPS**: Always use HTTPS for cPanel connections
5. **Access Logs**: Monitor cPanel access logs for unauthorized access

## Support

For issues or questions:

1. Run `./scripts/cv-deploy-cicd.sh diagnose` for configuration check
2. Review metrics in `.goalie/cv_deploy_metrics.jsonl`
3. Check this guide for common issues
4. Verify environment variables are set correctly

## Changelog

### 2026-02-13
- Initial implementation
- Build phase with pandoc conversion
- Measure phase with URL health and cPanel API validation
- Learning phase with metrics tracking
- Deploy phase for cPanel upload
- Diagnose command for troubleshooting
