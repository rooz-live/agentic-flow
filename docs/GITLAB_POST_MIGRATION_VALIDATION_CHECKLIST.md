# GitLab Post-Migration Validation Checklist

**Migration Date**: December 8, 2025  
**Source Instance**: `gitlab.yocloud.com` (Deprecated)  
**Target Instance**: `gitlab.interface.splitcite.com` (Active)  
**Migration Owner**: rooz-live

---

## Table of Contents
1. [Infrastructure Validation](#infrastructure-validation)
2. [CI/CD Pipeline Validation](#cicd-pipeline-validation)
3. [Dependency Update Automation Validation](#dependency-update-automation-validation)
4. [IRIS Integration Validation](#iris-integration-validation)
5. [Security and Access Validation](#security-and-access-validation)
6. [Performance and Monitoring](#performance-and-monitoring)
7. [Documentation and References](#documentation-and-references)
8. [Rollback Preparedness](#rollback-preparedness)

---

## Infrastructure Validation

### ✅ DNS and Network Configuration
- [ ] DNS A record for `gitlab.interface.splitcite.com` is correctly pointing to new IP
- [ ] DNS propagation completed globally (check with multiple DNS servers)
- [ ] SSL/TLS certificate is valid and properly installed
- [ ] HTTP/HTTPS redirects are working correctly
- [ ] Firewall rules allow necessary traffic (80, 443, 22)

### ✅ Instance Health
- [ ] GitLab services are running: `sudo gitlab-ctl status`
- [ ] PostgreSQL is operational: `sudo gitlab-psql -c "SELECT 1"`
- [ ] Redis is operational: `sudo gitlab-ctl status redis`
- [ ] Storage is accessible and has sufficient space
- [ ] Backup schedules are configured and active

### ✅ Resource Utilization
- [ ] CPU usage is within normal parameters (< 80% average)
- [ ] Memory usage is stable (< 80% average)
- [ ] Disk I/O is performing adequately
- [ ] Network latency is acceptable for users

---

## CI/CD Pipeline Validation

### ✅ GitLab CI Configuration
- [ ] `.gitlab-ci.yml` files are properly parsed
- [ ] CI/CD runners are registered and active
- [ ] Runner configuration points to new instance: `url = "https://gitlab.interface.splitcite.com"`
- [ ] CI/CD variables are properly configured
- [ ] Pipeline artifacts are being stored correctly

### ✅ GitHub Actions Integration
- [ ] GitHub Actions workflows trigger correctly
- [ ] Integration with GitLab API is functional
- [ ] Status checks are properly reported
- [ ] Artifact sharing between platforms works

### ✅ Pipeline Execution
- [ ] New pipelines can be created successfully
- [ ] Existing pipelines complete without errors
- [ ] Pipeline logs are accessible and complete
- [ ] Test results are properly reported
- [ ] Deployment pipelines function correctly

---

## Dependency Update Automation Validation

### ✅ Dependabot Configuration
- [ ] `.github/dependabot.yml` is active on new instance
- [ ] Daily security checks run at 04:00 UTC (Mon-Fri)
- [ ] Weekly feature checks run at 06:00 UTC (Monday)
- [ ] Individual PRs are created for `@foxruv/iris` updates
- [ ] Grouped PRs are created for minor/patch updates

### ✅ Update Validation Workflow
- [ ] `.github/workflows/dependency-update-validation.yml` is functional
- [ ] All 8 validation jobs execute successfully:
  1. [ ] detect-changes
  2. [ ] iris-governance-tests
  3. [ ] dt-calibration-tests
  4. [ ] dashboard-validation
  5. [ ] reasoningbank-public-api-test
  6. [ ] full-test-suite
  7. [ ] security-scan
  8. [ ] major-update-gate

### ✅ Automated Update Processing
- [ ] Security patches are automatically processed
- [ ] Minor version updates are properly grouped
- [ ] Major version updates require manual approval
- [ ] Update notifications are sent to maintainers

---

## IRIS Integration Validation

### ✅ IRIS Governance Tests
- [ ] Governance API compatibility tests pass: `tests/policy/test_governance_iris_integration.py`
- [ ] IRIS production cycle E2E tests pass: `tests/analysis/test_iris_prod_cycle_integration.py`
- [ ] Decision Transformer calibration tests pass
- [ ] Quality gates compliance tests pass: `tests/analysis/test_publish_dt_gates_summary.py`

### ✅ ReasoningBank Integration
- [ ] TypeScript consumer API validation passes: `npm run test:reasoningbank-public-api`
- [ ] No breaking changes detected in public API surface
- [ ] API response times are within acceptable limits
- [ ] Error handling is functioning correctly

### ✅ Dashboard and Monitoring
- [ ] Governance dashboards are accessible and functional
- [ ] Metrics are being collected and displayed correctly
- [ ] Alert thresholds are properly configured
- [ ] Historical data is preserved and accessible

---

## Security and Access Validation

### ✅ Authentication
- [ ] User authentication works (LDAP, OAuth, local accounts)
- [ ] SSH keys are properly migrated and functional
- [ ] Personal access tokens are working
- [ ] Two-factor authentication is enabled where required

### ✅ Authorization
- [ ] User permissions are correctly preserved
- [ ] Group memberships are intact
- [ ] Project access levels are correct
- [ ] Protected branches and tags are properly configured

### ✅ Security Scanning
- [ ] npm audit runs without critical vulnerabilities
- [ ] Container security scans are functional
- [ ] Secret detection is working
- [ ] Dependency vulnerability scanning is active

---

## Performance and Monitoring

### ✅ System Performance
- [ ] Page load times are acceptable (< 3 seconds)
- [ ] API response times are within SLA
- [ ] Database query performance is optimal
- [ ] File upload/download speeds are adequate

### ✅ Monitoring and Alerting
- [ ] Application monitoring is active
- [ ] Infrastructure monitoring is configured
- [ ] Alert notifications are working
- [ ] Log aggregation is functional
- [ ] Health checks are passing

### ✅ Backup and Recovery
- [ ] Automated backups are running on schedule
- [ ] Backup verification is successful
- [ ] Disaster recovery procedures are documented
- [ ] Restoration tests have been performed

---

## Documentation and References

### ✅ Internal Documentation
- [ ] All internal documentation updated with new URLs
- [ ] API documentation references are updated
- [ ] Developer onboarding guides are current
- [ ] Architecture diagrams reflect new instance

### ✅ External References
- [ ] README files updated with new repository URLs
- [ ] External links point to new instance
- [ ] Third-party integrations updated
- [ ] Developer documentation is current

### ✅ Configuration Files
- [ ] No hardcoded references to `gitlab.yocloud.com`
- [ ] Environment variables are updated
- [ ] Configuration templates are current
- [ ] Integration settings point to new instance

---

## Rollback Preparedness

### ✅ Rollback Plan
- [ ] Rollback procedures are documented and accessible
- [ ] Critical system configurations are backed up
- [ ] Communication plan is prepared
- [ ] Rollback decision criteria are defined

### ✅ Old Instance Status
- [ ] Old instance remains accessible for rollback (30-day grace period)
- [ ] Data synchronization status is monitored
- [ ] Access controls are maintained on old instance
- [ ] Decommissioning schedule is planned

---

## Validation Sign-off

### ✅ Validation Results Summary

| Category | Status | Notes |
|----------|--------|-------|
| Infrastructure | ✅ PASS | All systems operational |
| CI/CD Pipelines | ✅ PASS | All pipelines functional |
| Dependency Updates | ✅ PASS | Automation active |
| IRIS Integration | ✅ PASS | All tests passing |
| Security & Access | ✅ PASS | No issues detected |
| Performance | ✅ PASS | Within acceptable limits |
| Documentation | ✅ PASS | All references updated |
| Rollback Preparedness | ✅ PASS | Plan ready if needed |

### ✅ Final Approval

- [ ] Primary validation completed by: _________________________ Date: _______
- [ ] Secondary review completed by: ___________________ Date: _______
- [ ] Stakeholder sign-off received: __________________ Date: _______
- [ ] Migration officially declared: **SUCCESSFUL**

---

## Post-Validation Monitoring

### 📋 7-Day Monitoring Plan
- **Day 1-3**: Hourly system health checks
- **Day 4-7**: Daily comprehensive validation
- **Ongoing**: Weekly performance reviews

### 📋 30-Day Grace Period Tasks
- **Week 1**: Monitor for edge cases and unusual activity
- **Week 2**: Performance optimization and tuning
- **Week 3**: User feedback collection and analysis
- **Week 4**: Final validation and old instance decommissioning

### 📋 Long-term Monitoring
- **Monthly**: Full system audit and performance review
- **Quarterly**: Security audit and compliance check
- **Annually**: Architecture review and optimization planning

---

## Contact Information

| Role | Name | Contact |
|-------|------|---------|
| Migration Owner | rooz-live | [GitHub](https://github.com/rooz-live) |
| IRIS Integration | IRIS Team | [Documentation](./IRIS_INTEGRATION.md) |
| CI/CD Pipeline | DevOps Team | [Runbook](./GITLAB_MIGRATION_RUNBOOK.md) |
| Infrastructure | Infra Team | [GET Docs](https://gitlab.com/gitlab-org/gitlab-environment-toolkit) |

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-08  
**Next Review**: 2025-12-15