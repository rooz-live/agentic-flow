# Environment Files Documentation

## Overview

This document describes the environment configuration management across the agentic-flow ecosystem. All environment variables are centrally managed through `config/env.catalog.json` which serves as the source of truth.

## Quick Reference Table

| Project | Primary env | Template | Purpose |
|---------|-------------|----------|---------|
| `investing/agentic-flow` | `.env` | `.env.example` | Main agentic-flow project |
| `agentic-flow-core` | `.env` | `.env.example` | Core library and shared code |
| `config/` (root) | `config/.env` | `config/secrets/.envrc.template` | Global configuration |
| `lionagi-qe-fleet` | — | `.env.example` | QE fleet (root + docker + database) |

## Environment File Naming Conventions

### Standardized cPanel Variables

The following naming conventions are used consistently across all projects:

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `CPANEL_HOST` | cPanel host | `cpanel.rooz.live` |
| `CPANEL_API_TOKEN` | cPanel API token | (required) |
| `CPANEL_USER` | cPanel username | `rooz` |

**Note:** Previously used `CPANEL_API_KEY` and `CPANEL_USERNAME` have been deprecated in favor of `CPANEL_API_TOKEN` and `CPANEL_USER`.

## Environment Catalog

The `config/env.catalog.json` file is the authoritative source for all environment variables. It contains:

```json
{
  "VARIABLE_NAME": {
    "secret": true|false,
    "default": "default_value",
    "desc": "Description of the variable"
  }
}
```

### Key Environment Variables

#### AWS Configuration
- `AWS_REGION`: Default AWS region (default: `us-west-1`)
- `AWS_ACCESS_KEY_ID`: AWS access key (required for S3/EC2)
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

#### AI/LLM API Keys
- `ANTHROPIC_API_KEY`: Anthropic Claude API key
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_API_KEY`: Google AI API key

#### Infrastructure
- `HIVELOCITY_API_KEY`: Hivelocity infrastructure API key
- `GITLAB_HOST`: GitLab host (default: `gitlab.rooz.live`)
- `GITLAB_TOKEN`: GitLab personal access token
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token
- `CLOUDFLARE_API_KEY`: Cloudflare API key (legacy)

#### cPanel Configuration
- `CPANEL_HOST`: cPanel host (default: `cpanel.rooz.live`)
- `CPANEL_API_TOKEN`: cPanel API token
- `CPANEL_USER`: cPanel username (default: `rooz`)

#### Database Configuration
- `POSTGRES_HOST`: PostgreSQL host (default: `localhost`)
- `POSTGRES_PORT`: PostgreSQL port (default: `5432`)
- `POSTGRES_USER`: PostgreSQL user (default: `postgres`)
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_DB`: PostgreSQL database name (default: `agentic_flow`)

#### Redis Configuration
- `REDIS_HOST`: Redis host (default: `localhost`)
- `REDIS_PORT`: Redis port (default: `6379`)

#### Payment Gateways
- `STRIPE_SECRET_KEY`: Stripe payment gateway secret key
- `STRIPE_PUBLIC_KEY`: Stripe payment gateway public key
- `PAYPAL_CLIENT_ID`: PayPal client ID
- `PAYPAL_CLIENT_SECRET`: PayPal client secret
- `KLARNA_USERNAME`: Klarna payment gateway username
- `KLARNA_PASSWORD`: Klarna payment gateway password

#### Communication Services
- `DISCORD_TOKEN`: Discord bot token
- `DISCORD_CLIENT_ID`: Discord application client ID
- `DISCORD_CLIENT_SECRET`: Discord application client secret
- `PLIVO_AUTH_ID`: Plivo SMS auth ID
- `PLIVO_AUTH_TOKEN`: Plivo SMS auth token
- `TELNYX_API_KEY`: Telnyx SMS API key

## Setup Scripts

### cpanel-env-setup.sh

The main script for synchronizing environment configuration across the ecosystem.

**Usage:**
```bash
cd investing/agentic-flow
./scripts/cpanel-env-setup.sh           # Update local .env only
./scripts/cpanel-env-setup.sh --all     # Propagate to agentic-flow-core and config
```

**What it does:**
1. Runs `generate_env_config.py` to generate `.env.example` from `env.catalog.json`
2. Runs `setup_secrets.sh` to prompt for missing secret values
3. If `--all` is specified, copies the `.env` file to:
   - `agentic-flow-core/.env`
   - `config/.env`

### generate_env_config.py

Python script that generates `.env.example` from `config/env.catalog.json`.

**Usage:**
```bash
cd investing/agentic-flow
python3 scripts/generate_env_config.py
```

### setup_secrets.sh

Bash script that prompts for missing secret values defined in `env.catalog.json`.

**Usage:**
```bash
cd investing/agentic-flow
./scripts/setup_secrets.sh
```

## Git Ignore Configuration

All projects have `.gitignore` entries for environment files:

```
# Environment & Secrets
.env
.env.local
.env.production
.env.unified
.env*.local
.env.backup
.env.bak
.env.yolife
```

## cPanel API Validation

To validate your cPanel API token configuration:

```bash
curl -k \
  -H "Authorization: cpanel cpanel_username:api_token" \
  "https://cpanel.rooz.live:2083/json-api/listaccts?api.version=1"
```

Replace `cpanel_username` and `api_token` with your actual credentials.

## Environment File Templates

### Main Project (.env.example)

Generated from `config/env.catalog.json` and contains all environment variables with:
- Default values for non-secret variables
- Empty values for secret variables (to be filled in by user)

### cPanel Template (.env.cpanel.template)

Contains cPanel-specific configuration for deployment:
```
CPANEL_USER=rooz
CPANEL_API_TOKEN=your_api_token_here
CPANEL_HOST=cpanel.rooz.live
```

### YOLIFE Configuration (.env.yolife)

Contains YOLIFE deployment configuration including cPanel API settings:
```bash
export CPANEL_USER="root"
export CPANEL_API_TOKEN="${CPANEL_API_TOKEN:-your_cpanel_api_token_here}"
```

## Best Practices

1. **Never commit `.env` files** - Use `.env.example` as templates
2. **Keep `env.catalog.json` updated** - This is the source of truth
3. **Use consistent naming** - All projects use the same variable names
4. **Run setup scripts** - Use `cpanel-env-setup.sh` to sync changes
5. **Validate API tokens** - Test cPanel API connectivity after setup
6. **Secure secrets** - Use password managers or secret management tools

## Troubleshooting

### Missing Environment Variables

If you see errors about missing environment variables:
1. Run `./scripts/cpanel-env-setup.sh` to update your `.env` file
2. Check that `config/env.catalog.json` exists and is valid JSON
3. Ensure all required secrets are set in your `.env` file

### cPanel API Errors

If you encounter cPanel API errors:
1. Verify `CPANEL_API_TOKEN` is correct
2. Check that `CPANEL_USER` and `CPANEL_HOST` are correct
3. Test connectivity with the curl command above
4. Ensure the API token has the required permissions

### Propagation Issues

If changes don't propagate to other projects:
1. Run `./scripts/cpanel-env-setup.sh --all` to force propagation
2. Check that target directories exist
3. Verify file permissions allow copying

## Backup Files

Backup files are moved to `/tmp/env-backups/` to keep the repository clean while preserving data:
- `.env.backup`
- `.env.bak`
- `.env.backup.bak`
- `.env.backup.bak.bak`

These files are excluded from version control via `.gitignore`.
