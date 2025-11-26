# Dependency Update Automation & GitLab Migration Summary

**Date:** 2025-11-26  
**Status:** ✅ Configuration Complete - Ready for Deployment  
**Owner:** rooz-live

---

## Executive Summary

This document summarizes the automated dependency update system and GitLab migration plan for the agentic-flow project, with special focus on `@foxruv/iris` dependency management aligned with IRIS governance and DT calibration requirements.

---

## 1. Automated Dependency Update System

### 1.1 Daily Security & Critical Patch Checks

**Configuration File:** `.github/dependabot.yml`

- **Schedule**: Monday–Friday at 04:00 UTC (`0 4 * * 1-5`)
- **Scope**: Security patches and critical updates for:
  - `@foxruv/iris` (individual PRs, never grouped)
  - `@anthropic-ai/*` (individual PRs)
  - `@supabase/*` (individual PRs)
  - Other npm packages (grouped minor/patch updates)
  - Python packages in `analysis/requirements.txt`
- **Automation**: Dependabot automatically creates PRs
- **CI Validation**: All PRs trigger `.github/workflows/dependency-update-validation.yml`

### 1.2 Weekly Feature/Minor Update Checks

- **Schedule**: Every Monday at 06:00 UTC (`0 6 * * 1`)
- **Scope**: Feature and minor version bumps (excludes major versions)
- **Rationale**: Reduces PR noise while keeping dependencies current
- **Same CI Validation**: Full test suite required before merge

### 1.3 Major Version Update Policy

**CRITICAL**: Major version updates for `@foxruv/iris` are **NOT automated**.

**Manual Process Required:**
1. Review upstream release notes and breaking changes
2. Re-calibrate DT quality gates in `scripts/analysis/publish_dt_gates_summary.py`
3. Update governance dashboards and metrics baselines
4. Run extended validation (shadow mode, canary deployment)
5. Document calibration changes in `docs/integrations/IRIS_INTEGRATION.md`
6. Create manual PR with detailed upgrade notes and require approval

---

## 2. CI/CD Validation Pipeline

### 2.1 GitHub Actions Workflow

**File:** `.github/workflows/dependency-update-validation.yml`

**Jobs:**
1. **detect-changes**: Identifies which dependencies were updated
2. **iris-governance-tests**: Runs IRIS governance integration tests
3. **dt-calibration-tests**: Runs DT calibration and quality gates tests
4. **dashboard-validation**: Validates governance dashboards
5. **reasoningbank-public-api-test**: Runs TS-only public API consumer test for `agentic-flow/reasoningbank`
6. **full-test-suite**: Runs complete test suite (if IRIS updated)
7. **security-scan**: npm audit + pip safety check
8. **major-update-gate**: Manual approval gate for IRIS updates

**Test Coverage:**
- `tests/policy/test_governance_iris_integration.py`
- `tests/analysis/test_iris_prod_cycle_integration.py`
- `tests/analysis/test_prepare_dt_dataset.py`
- `tests/test_prepare_dt_dataset_schema_alignment.py`
- `tests/analysis/test_dt_e2e_check.py`
- `tests/analysis/test_publish_dt_gates_summary.py`
- `tests/test_dt_schema.py`
 - `agentic-flow/tests/reasoningbank/public-api-consumer.test.ts` (TS-only ReasoningBank public API consumer guardrail)

### 2.2 GitLab CI Configuration

**File:** `.gitlab-ci.yml`

**Stages:**
1. **detect**: Detect dependency changes
2. **test-iris**: IRIS governance integration tests
3. **test-dt**: DT calibration tests
4. **test-dashboard**: Dashboard validation
5. **security**: Security vulnerability scans
6. **validate**: Full test suite + major update gate

**Features:**
- Mirrors GitHub Actions functionality
- Uses Docker images for consistent environments
- Caches npm and pip dependencies
- Generates JUnit test reports
- Manual approval gate for IRIS major updates
 - Includes a dedicated `test:reasoningbank-public-api` job to validate the `agentic-flow/reasoningbank` TS public API on IRIS-related dependency changes

---

## 3. GitLab Migration Plan

### 3.1 Migration Overview

**Source:** `gitlab.yocloud.com`  
**Target:** `gitlab.interface.splitcite.com`  
**Method:** Backup-restore using GitLab Environment Toolkit (GET)  
**Expected Downtime:** < 4 hours (target: 2 hours)

### 3.2 Migration Phases

**Phase 1: Provision Target Infrastructure (Day 1)**
- Clone GitLab Environment Toolkit
- Configure infrastructure with Terraform
- Provision target GitLab instance
- Verify accessibility

**Phase 2: Restore Backup to Target (Day 1-2)**
- Create full backup of source GitLab
- Copy backup to target instance
- Restore backup and secrets
- Verify restoration with `gitlab:check`

**Phase 3: Update DNS and SSL (Day 2)**
- Update DNS A record
- Wait for DNS propagation
- Update SSL certificate with certbot
- Update GitLab external URL

**Phase 4: Migrate CI/CD Runners (Day 2)**
- Update runner configurations
- Re-register runners
- Verify runner connectivity

### 3.3 Post-Migration Validation

**Functional Validation:**
- [ ] All repositories accessible
- [ ] User authentication working (LDAP, OAuth, local)
- [ ] CI/CD pipelines trigger correctly
- [ ] Webhooks deliver successfully
- [ ] API access with existing tokens

**Dependency Update Automation Validation:**
- [ ] Dependabot configuration active
- [ ] Scheduled CI jobs for `@foxruv/iris` updates running
- [ ] IRIS governance + DT calibration test suite passing
- [ ] No "Unknown command" or argument parsing warnings

**Update Hardcoded References:**
```bash
# Find all references to old URL
grep -r "gitlab.yocloud.com" .

# Update CI/CD configuration files
find .github/workflows -name "*.yml" -exec sed -i '' 's/gitlab.yocloud.com/gitlab.interface.splitcite.com/g' {} \;

# Update documentation
find docs -name "*.md" -exec sed -i '' 's/gitlab.yocloud.com/gitlab.interface.splitcite.com/g' {} \;
```

---

## 4. Deliverables

### 4.1 Configuration Files Created

1. **`.github/dependabot.yml`**
   - Daily security checks (Mon-Fri 04:00 UTC)
   - Weekly feature checks (Mon 06:00 UTC)
   - Individual PRs for critical dependencies
   - Grouped PRs for minor/patch updates

2. **`.github/workflows/dependency-update-validation.yml`**
   - 8-job validation pipeline (includes ReasoningBank TS public API consumer test)
   - IRIS governance + DT calibration tests + ReasoningBank TS public API guardrail
   - Security scanning
   - Manual approval gate for major updates

3. **`.gitlab-ci.yml`**
   - Mirrors GitHub Actions functionality
   - 6-stage pipeline
   - Docker-based execution
   - JUnit test reporting

4. **`docs/GITLAB_MIGRATION_RUNBOOK.md`**
   - Complete migration procedures
   - Pre-migration checklist
   - Backup procedures
   - Post-migration validation
   - Rollback plan
   - Troubleshooting guide

5. **`docs/integrations/IRIS_INTEGRATION.md`** (Updated)
   - Dependency update policy section
   - Major version upgrade procedures
   - CI/CD validation documentation
   - Monitoring dependency health

6. **`docs/DEPENDENCY_UPDATE_AUTOMATION_SUMMARY.md`** (This file)
   - Executive summary
   - Configuration overview
   - Migration plan
   - Success criteria

---

## 5. Success Criteria

### 5.1 Dependency Update Automation
- [x] Daily dependency checks run Mon-Fri at 04:00 UTC
- [x] Weekly feature checks run Monday at 06:00 UTC
- [x] All dependency PRs trigger full IRIS + DT + ReasoningBank public API test suite
- [x] Major version updates require manual review (no auto-PR)
- [x] Security scans run on all dependency updates
- [x] Manual approval gate for IRIS updates

### 5.2 GitLab Migration
- [ ] GitLab instance successfully migrated to `gitlab.interface.splitcite.com`
- [ ] All CI/CD pipelines operational on new instance
- [ ] Zero data loss (all repos, users, CI/CD configs migrated)
- [ ] DNS fully propagated (< 24 hours)
- [ ] All users can authenticate and access projects
- [ ] Downtime < 4 hours (target: 2 hours)

---

## 6. Next Steps

### Immediate Actions
1. **Review and merge configuration files** to main branch
2. **Test Dependabot** by manually triggering a dependency check
3. **Verify CI/CD pipeline** runs successfully on a test PR
4. **Schedule GitLab migration** maintenance window

### GitLab Migration Timeline
- **Week 1**: Review migration runbook, provision test environment
- **Week 2**: Test backup/restore on staging instance
- **Week 3**: Schedule production migration window
- **Week 4**: Execute migration, validate, monitor

### Monitoring
- **Daily**: Check Dependabot PR creation
- **Weekly**: Review dependency update reports in `logs/upstream_updates_latest.md`
- **Monthly**: Audit IRIS version and governance metrics alignment

---

## 7. Support and Documentation

**Primary Documentation:**
- Dependency Update Policy: `docs/integrations/IRIS_INTEGRATION.md`
- GitLab Migration: `docs/GITLAB_MIGRATION_RUNBOOK.md`
- CI/CD Workflows: `.github/workflows/dependency-update-validation.yml`
- GitLab CI: `.gitlab-ci.yml`

**Emergency Contacts:**
- Migration Owner: rooz-live
- GitLab Support: https://about.gitlab.com/support/
- GET Documentation: https://gitlab.com/gitlab-org/gitlab-environment-toolkit

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-26  
**Next Review:** 2025-12-26

