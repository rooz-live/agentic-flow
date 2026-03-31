# GitLab Migration Runbook
## Migrating from gitlab.yocloud.com to gitlab.interface.splitcite.com

**Migration Date:** TBD  
**Migration Owner:** rooz-live  
**GitLab Environment Toolkit (GET) Version:** Latest from https://gitlab.com/gitlab-org/gitlab-environment-toolkit

---

## Table of Contents
1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Environment Setup](#environment-setup)
3. [Backup Procedures](#backup-procedures)
4. [Migration Execution](#migration-execution)
5. [Post-Migration Validation](#post-migration-validation)
6. [Rollback Plan](#rollback-plan)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Migration Checklist

### 1. Current Environment Assessment
- [ ] Document current GitLab version on `gitlab.yocloud.com`
  ```bash
  # SSH into current GitLab instance
  ssh gitlab.yocloud.com
  sudo gitlab-rake gitlab:env:info
  ```
- [ ] Inventory all repositories, users, and CI/CD pipelines
- [ ] Document current storage usage and resource requirements
- [ ] Identify all integrations (webhooks, API tokens, OAuth apps)
- [ ] List all active CI/CD runners and their configurations

### 2. Target Environment Preparation
- [ ] Provision infrastructure for `gitlab.interface.splitcite.com`
- [ ] Ensure target GitLab version is compatible (same or newer than source)
- [ ] Configure DNS records (but don't activate yet)
- [ ] Set up SSL/TLS certificates for new domain
- [ ] Prepare backup storage location

### 3. Stakeholder Communication
- [ ] Notify all users of planned migration window
- [ ] Schedule maintenance window (recommend weekend or off-hours)
- [ ] Prepare rollback communication plan
- [ ] Document expected downtime (target: < 4 hours)

---

## Environment Setup

### 1. Clone GitLab Environment Toolkit
```bash
cd /tmp
git clone https://gitlab.com/gitlab-org/gitlab-environment-toolkit.git
cd gitlab-environment-toolkit

# Review documentation
cat README.md
ls -la docs/
```

### 2. Configure GET for Migration
Create `config/migration.yml`:
```yaml
# GitLab Migration Configuration
source:
  url: https://gitlab.yocloud.com
  version: "16.x.x"  # Update with actual version
  backup_path: /var/opt/gitlab/backups

target:
  url: https://gitlab.interface.splitcite.com
  version: "16.x.x"  # Same or newer
  infrastructure:
    provider: "aws"  # or "gcp", "azure", "on-prem"
    region: "us-east-1"
    instance_type: "m5.xlarge"

migration:
  method: "backup-restore"  # or "geo-replication" for zero-downtime
  include:
    - repositories
    - users
    - groups
    - projects
    - ci_cd_variables
    - runners
    - webhooks
  exclude:
    - container_registry  # Migrate separately if large
```

### 3. Install GET Dependencies
```bash
# Install Terraform (if using cloud provider)
brew install terraform  # macOS
# or: sudo apt-get install terraform  # Linux

# Install Ansible
brew install ansible  # macOS
# or: sudo apt-get install ansible  # Linux

# Verify installations
terraform --version
ansible --version
```

---

## Backup Procedures

### 1. Create Full Backup of Source GitLab
```bash
# SSH into gitlab.yocloud.com
ssh gitlab.yocloud.com

# Create backup (this may take hours for large instances)
sudo gitlab-backup create STRATEGY=copy

# Verify backup
ls -lh /var/opt/gitlab/backups/
# Should see: <timestamp>_gitlab_backup.tar

# Copy backup to secure location
scp /var/opt/gitlab/backups/<timestamp>_gitlab_backup.tar \
    backup-server:/secure/backups/gitlab/

# Backup GitLab secrets
sudo gitlab-ctl backup-etc
# Creates: /etc/gitlab/config_backup/gitlab_config_<timestamp>.tar
```

### 2. Document Current Configuration
```bash
# Export GitLab configuration
sudo cat /etc/gitlab/gitlab.rb > gitlab.rb.backup
sudo cat /etc/gitlab/gitlab-secrets.json > gitlab-secrets.json.backup

# Export runner configurations
gitlab-runner list
gitlab-runner verify

# Document all CI/CD variables (manual review required)
# Navigate to: Settings > CI/CD > Variables in GitLab UI
```

### 3. Verify Backup Integrity
```bash
# Test backup restoration on a test instance (highly recommended)
# This validates backup before actual migration
```

---

## Migration Execution

### Phase 1: Provision Target Infrastructure (Day 1)
```bash
cd gitlab-environment-toolkit

# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan -var-file=config/migration.yml

# Apply infrastructure (creates target GitLab instance)
terraform apply -var-file=config/migration.yml

# Verify target instance is accessible
curl -I https://gitlab.interface.splitcite.com
```

### Phase 2: Restore Backup to Target (Day 1-2)
```bash
# Copy backup to target instance
scp /secure/backups/gitlab/<timestamp>_gitlab_backup.tar \
    gitlab.interface.splitcite.com:/var/opt/gitlab/backups/

# SSH into target instance
ssh gitlab.interface.splitcite.com

# Stop GitLab services (except PostgreSQL)
sudo gitlab-ctl stop puma
sudo gitlab-ctl stop sidekiq

# Restore backup
sudo gitlab-backup restore BACKUP=<timestamp>

# Restore secrets
sudo cp gitlab-secrets.json.backup /etc/gitlab/gitlab-secrets.json
sudo gitlab-ctl reconfigure
sudo gitlab-ctl restart

# Verify restoration
sudo gitlab-rake gitlab:check SANITIZE=true
```

### Phase 3: Update DNS and SSL (Day 2)
```bash
# Update DNS A record
# gitlab.interface.splitcite.com -> <new-ip-address>

# Wait for DNS propagation (check with)
dig gitlab.interface.splitcite.com

# Update SSL certificate
sudo certbot certonly --nginx -d gitlab.interface.splitcite.com

# Update GitLab external URL
sudo vi /etc/gitlab/gitlab.rb
# Set: external_url 'https://gitlab.interface.splitcite.com'

sudo gitlab-ctl reconfigure
```

### Phase 4: Migrate CI/CD Runners (Day 2)
```bash
# On each runner machine, update GitLab URL
sudo vi /etc/gitlab-runner/config.toml
# Update: url = "https://gitlab.interface.splitcite.com"

# Re-register runners (if needed)
sudo gitlab-runner verify
sudo gitlab-runner restart
```

---

## Post-Migration Validation

### 1. Functional Validation
- [ ] Verify all repositories are accessible
  ```bash
  git clone https://gitlab.interface.splitcite.com/group/project.git
  ```
- [ ] Test user authentication (LDAP, OAuth, local)
- [ ] Verify CI/CD pipelines trigger correctly
- [ ] Test webhook deliveries
- [ ] Validate API access with existing tokens

### 2. Dependency Update Automation Validation
- [ ] Verify Dependabot/Renovate configuration is active
  ```bash
  # Check .github/dependabot.yml or renovate.json
  test -f .github/dependabot.yml && cat .github/dependabot.yml
  test -f renovate.json && cat renovate.json
  ```
- [ ] Confirm scheduled CI jobs for `@foxruv/iris` updates are running
  ```bash
  # Check .github/workflows/dependency-update-validation.yml
  cat .github/workflows/dependency-update-validation.yml
  ```
- [ ] Test IRIS governance + DT calibration test suite
  ```bash
  cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
  python -m pytest tests/policy/test_governance_iris_integration.py -v
  python -m pytest tests/analysis/test_iris_prod_cycle_integration.py -v
  ```
 - [ ] Run ReasoningBank public API TS consumer test
   ```bash
   cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
   npm run test:reasoningbank-public-api
   ```

### 3. Update Hardcoded References
Search and replace all references to old GitLab URL:
```bash
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow

# Find all references to old URL
grep -r "gitlab.yocloud.com" .

# Update CI/CD configuration files
find .github/workflows -name "*.yml" -exec sed -i '' 's/gitlab.yocloud.com/gitlab.interface.splitcite.com/g' {} \;

# Update documentation
find docs -name "*.md" -exec sed -i '' 's/gitlab.yocloud.com/gitlab.interface.splitcite.com/g' {} \;

# Update environment variables (if any)
# Check .env, .env.example, config files
```

### 4. Performance Validation
- [ ] Run baseline performance tests
- [ ] Monitor resource usage (CPU, memory, disk I/O)
- [ ] Verify backup jobs are scheduled and running
- [ ] Test disaster recovery procedures

---

## Rollback Plan

### If Migration Fails (Within 24 Hours)
1. **Revert DNS**: Point `gitlab.interface.splitcite.com` back to old IP or use `gitlab.yocloud.com`
2. **Restore Old Instance**: Ensure `gitlab.yocloud.com` is still operational
3. **Communicate**: Notify users of rollback and new migration date
4. **Root Cause Analysis**: Document what went wrong before next attempt

### If Issues Discovered After 24 Hours
1. **Parallel Operation**: Keep both instances running temporarily
2. **Incremental Fix**: Address issues on new instance while old remains available
3. **Gradual Cutover**: Migrate teams/projects incrementally

---

## Troubleshooting

### Common Issues

#### 1. Backup Restoration Fails
```bash
# Check PostgreSQL version compatibility
sudo gitlab-psql --version

# Review restoration logs
sudo tail -f /var/log/gitlab/gitlab-rails/production.log
```

#### 2. CI/CD Pipelines Not Triggering
```bash
# Verify runner connectivity
sudo gitlab-runner verify

# Check runner logs
sudo journalctl -u gitlab-runner -f
```

#### 3. Authentication Issues
```bash
# Reconfigure LDAP/OAuth settings
sudo vi /etc/gitlab/gitlab.rb
sudo gitlab-ctl reconfigure

# Test LDAP connection
sudo gitlab-rake gitlab:ldap:check
```

#### 4. Webhook Failures
- Verify webhook URLs are updated to new domain
- Check firewall rules allow outbound connections
- Test webhook delivery manually from GitLab UI

---

## Success Criteria
- [ ] Zero data loss (all repos, users, CI/CD configs migrated)
- [ ] All CI/CD pipelines operational on new instance
- [ ] Dependency update automation (Dependabot) active
- [ ] IRIS + DT test suites passing
- [ ] DNS fully propagated (< 24 hours)
- [ ] All users can authenticate and access their projects
- [ ] Downtime < 4 hours (target: 2 hours)

---

## Post-Migration Tasks
1. Monitor new instance for 7 days
2. Decommission old instance after 30-day grace period
3. Update all external documentation and links
4. Archive migration logs and backup files
5. Conduct post-mortem and document lessons learned

---

**Migration Support:**
- GitLab Environment Toolkit Docs: https://gitlab.com/gitlab-org/gitlab-environment-toolkit/-/tree/main/docs
- GitLab Migration Guide: https://docs.gitlab.com/ee/administration/backup_restore/
- Emergency Contact: rooz-live

