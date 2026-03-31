# GitLab Migration Scripts

Automation scripts for migrating GitLab from `gitlab.yocloud.com` to `gitlab.interface.splitcite.com`.

## Migration Date
**Saturday, November 29, 2025, 06:00-14:00 EST**

## Scripts Overview

| Script | Purpose | When to Run |
|--------|---------|-------------|
| `pre_migration_check.sh` | Validate migration readiness | Friday night (Nov 28) |
| `execute_migration.sh` | Execute the migration | Saturday morning (Nov 29) |
| `post_migration_validate.sh` | Validate migration success | After migration |
| `setup_monitoring.sh` | Configure monitoring/alerts | Before or after migration |

## Quick Start

```bash
# 1. Friday night - validate readiness
./scripts/migration/pre_migration_check.sh --verbose

# 2. Saturday morning - execute migration
./scripts/migration/execute_migration.sh --verbose

# 3. After migration - validate
./scripts/migration/post_migration_validate.sh

# 4. Setup monitoring
./scripts/migration/setup_monitoring.sh
```

## Script Details

### pre_migration_check.sh
Validates that all prerequisites are met before migration.

```bash
./pre_migration_check.sh [--dry-run] [--verbose] [--skip-backup-test]
```

**Checks performed:**
- SSH connectivity to source and target instances
- GitLab version and health status
- Storage usage and capacity
- CI/CD runner status
- Backup capacity verification
- Configuration export

**Output:** JSON report at `.goalie/pre_migration_report.json`

### execute_migration.sh
Executes the 6-phase migration with automatic rollback on failure.

```bash
./execute_migration.sh [--dry-run] [--verbose] [--phase N]
```

**Phases:**
0. Pre-flight checks
1. Full backup of source GitLab
2. Restore backup to target
3. DNS and SSL configuration (requires manual confirmation)
4. CI/CD runner migration
5. Post-migration validation

**Features:**
- Progress dashboard at `logs/migration/migration_dashboard.txt`
- Checkpoints for each phase
- Automatic rollback on critical failures
- Slack/email notifications

### post_migration_validate.sh
Comprehensive validation of the migrated instance.

```bash
./post_migration_validate.sh [--dry-run] [--verbose] [--quick]
```

**Validations:**
- Repository cloning from new instance
- GitLab health endpoint
- CI/CD pipeline functionality
- IRIS governance tests
- Dependabot configuration
- Old URL reference check

**Output:** JSON report at `.goalie/post_migration_report.json`

### setup_monitoring.sh
Configures health checks, alerts, and dashboard.

```bash
./setup_monitoring.sh [--dry-run] [--verbose] [--alerts-only] [--dashboard-only]
```

**Creates:**
- `config/monitoring/gitlab_health_check.sh` - Health check script
- `config/monitoring/gitlab_health_check.cron` - Cron configuration
- `config/monitoring/dashboard.html` - Monitoring dashboard

**Alert thresholds:**
- Disk space < 20% free
- Memory > 90% used
- CPU > 80% for > 5 minutes
- Service downtime (Puma, Sidekiq, PostgreSQL, Redis)

## Configuration

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications |
| `NOTIFICATION_EMAIL` | Email for alerts |
| `VPC_ID` | AWS VPC ID (for infrastructure) |
| `SUBNET_ID` | AWS Subnet ID |
| `SG_GITLAB` | Security Group ID |
| `ROUTE53_ZONE_ID` | DNS Zone ID |

### GitLab Configuration
See `config/gitlab-migration.yml` for full GET configuration.

## Goalie Integration
All scripts log to `.goalie/cycle_log.jsonl` for tracking.

## Rollback
If migration fails:
1. Revert DNS to point back to `gitlab.yocloud.com`
2. Ensure source is running: `sudo gitlab-ctl start`
3. Notify users of rollback

## Files Created

```
scripts/migration/
├── README.md                    # This file
├── pre_migration_check.sh       # Pre-migration validation
├── execute_migration.sh         # Migration execution
├── post_migration_validate.sh   # Post-migration validation
└── setup_monitoring.sh          # Monitoring setup

config/
├── gitlab-migration.yml         # GET configuration
└── monitoring/
    ├── gitlab_health_check.sh   # Health check script
    ├── gitlab_health_check.cron # Cron configuration
    └── dashboard.html           # Monitoring dashboard

logs/migration/
├── checkpoints/                 # Phase checkpoints
├── backup_output.log            # Backup logs
├── restore_output.log           # Restore logs
└── migration_dashboard.txt      # Live dashboard

.goalie/
├── pre_migration_report.json    # Pre-migration report
├── post_migration_report.json   # Post-migration report
└── cycle_log.jsonl              # All migration events
```
