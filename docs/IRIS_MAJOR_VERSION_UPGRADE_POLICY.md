# IRIS Major Version Upgrade Policy

**Effective Date**: December 8, 2025  
**Version**: 1.0.0  
**Owner**: rooz-live  
**Review Cycle**: Quarterly

---

## Overview

This document outlines the comprehensive policy and procedures for upgrading `@foxruv/iris` to new major versions. Major version upgrades require careful planning, validation, and coordination due to their potential impact on governance systems, decision-making processes, and integration points.

### Definition of Major Version

A **major version** is defined as any version change that:
- Increments the first digit (e.g., 1.x.x → 2.0.0)
- Contains breaking changes in the API
- Modifies core governance or decision-making behavior
- Requires changes to integration interfaces
- Updates data schemas or storage formats

---

## Pre-Upgrade Assessment

### 1. Release Analysis

Before initiating any major version upgrade, the following analysis must be completed:

#### Release Notes Review
- [ ] **Breaking Changes Identification**
  - Document all API breaking changes
  - Identify deprecated features
  - Note configuration changes required
  - Assess impact on existing integrations

- [ ] **Security Assessment**
  - Review security improvements
  - Identify new security requirements
  - Assess impact on current security posture
  - Plan for any new security configurations

- [ ] **Performance Impact Analysis**
  - Benchmark current performance metrics
  - Analyze expected performance changes
  - Identify resource requirement changes
  - Plan for capacity adjustments

#### Dependency Compatibility Check
- [ ] **Direct Dependencies**
  - Verify compatibility with `@anthropic-ai/*` packages
  - Check `@supabase/*` integration compatibility
  - Validate TypeScript version requirements
  - Confirm Node.js runtime compatibility

- [ ] **Indirect Dependencies**
  - Review `agentic-flow/reasoningbank` integration
  - Check `sharp` and `better-sqlite3` compatibility
  - Validate MCP orchestration compatibility
  - Assess dashboard integration impact

### 2. Risk Assessment

#### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| API Breaking Changes | High | High | Comprehensive testing, gradual rollout |
| Performance Regression | Medium | High | Benchmarking, capacity planning |
| Data Migration Issues | Low | Critical | Backup procedures, rollback plan |
| Integration Failures | Medium | Medium | Integration testing, monitoring |

#### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| Governance Downtime | Medium | High | Maintenance windows, communication |
| Decision Quality Impact | High | Critical | Calibration, validation |
| User Disruption | Medium | Medium | Training, documentation |

---

## Upgrade Planning

### 1. Upgrade Strategy Selection

Based on risk assessment, select appropriate upgrade strategy:

#### Strategy A: Blue-Green Deployment (Recommended for Production)
- **When to Use**: High-risk upgrades, critical systems
- **Process**: 
  1. Deploy new version in parallel (Green)
  2. Run validation on Green environment
  3. Switch traffic to Green when validated
  4. Maintain Blue as rollback option
- **Advantages**: Zero downtime, immediate rollback
- **Disadvantages**: Double resource requirements

#### Strategy B: Rolling Upgrade (Recommended for Staging)
- **When to Use**: Lower-risk upgrades, resource constraints
- **Process**:
  1. Upgrade components incrementally
  2. Validate each component before proceeding
  3. Monitor for issues throughout process
- **Advantages**: Resource efficient
- **Disadvantages**: Longer upgrade window, complex rollback

#### Strategy C: Canary Deployment (Special Cases)
- **When to Use**: Experimental features, limited impact testing
- **Process**:
  1. Deploy to small subset of users
  2. Monitor for issues
  3. Gradually expand if successful
- **Advantages**: Limited exposure, early issue detection
- **Disadvantages**: Complex management, longer timeline

### 2. Timeline Planning

#### Standard Major Version Upgrade Timeline
```
Week 1: Assessment and Planning
├── Day 1-2: Release analysis and dependency check
├── Day 3-4: Risk assessment and strategy selection
└── Day 5-7: Detailed planning and resource preparation

Week 2: Preparation and Testing
├── Day 8-10: Environment setup and test deployment
├── Day 11-12: Integration testing and validation
└── Day 13-14: Documentation update and stakeholder review

Week 3: Production Deployment
├── Day 15-17: Production upgrade execution
├── Day 18-19: Post-deployment validation
└── Day 20-21: Performance monitoring and optimization

Week 4: Stabilization and Documentation
├── Day 22-24: Issue resolution and fine-tuning
├── Day 25-26: Documentation finalization
└── Day 27-28: Lessons learned and process improvement
```

---

## Validation Requirements

### 1. Pre-Upgrade Validation

#### IRIS Governance Tests
```bash
# Run governance integration tests
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
python -m pytest tests/policy/test_governance_iris_integration.py -v

# Expected: All tests pass with new IRIS version
```

#### Decision Transformer Calibration
```bash
# Run DT calibration tests
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
python -m pytest tests/analysis/test_iris_prod_cycle_integration.py -v

# Expected: Calibration within acceptable thresholds
```

#### Quality Gates Validation
```bash
# Run quality gates tests
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
python -m pytest tests/analysis/test_publish_dt_gates_summary.py -v

# Expected: All quality gates pass
```

#### ReasoningBank API Test
```bash
# Run TypeScript API consumer test
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow
npm run test:reasoningbank-public-api

# Expected: Public API compatibility maintained
```

### 2. Post-Upgrade Validation

#### Functional Validation
- [ ] **Governance API Compatibility**
  - All governance endpoints functional
  - Policy enforcement working correctly
  - Metrics collection operational
  - Alert systems functioning

- [ ] **Decision-Making Accuracy**
  - Decision quality within acceptable ranges
  - No regression in decision patterns
  - Performance metrics maintained or improved
  - Learning systems functioning correctly

- [ ] **Integration Points**
  - ReasoningBank integration stable
  - MCP orchestration functional
  - Dashboard connectivity maintained
  - Database operations normal

#### Performance Validation
- [ ] **Response Time Metrics**
  - API response times ≤ previous baseline
  - Decision processing time ≤ previous baseline
  - Memory usage within acceptable limits
  - CPU utilization efficient

- [ ] **Reliability Metrics**
  - Error rate ≤ previous baseline
  - Availability ≥ 99.9%
  - No data corruption or loss
  - Consistent behavior under load

---

## Rollback Procedures

### 1. Rollback Triggers

Immediate rollback required if any of the following occur:
- Critical governance failures
- Data corruption or loss
- Security vulnerabilities in production
- Performance degradation > 50%
- User impact affecting > 25% of users

### 2. Rollback Process

#### Immediate Response (First 30 Minutes)
1. **Declare Emergency**: Notify all stakeholders
2. **Initiate Rollback**: Execute pre-planned rollback procedures
3. **Monitor Systems**: Track rollback progress
4. **Communicate Status**: Regular updates to stakeholders

#### Full Rollback (First 2 Hours)
1. **Restore Previous Version**: Deploy backup of previous version
2. **Validate Restoration**: Confirm system functionality
3. **Data Integrity Check**: Verify no data corruption
4. **Performance Validation**: Confirm acceptable performance
5. **User Communication**: Notify users of resolution

#### Post-Rollback Analysis
1. **Root Cause Analysis**: Identify failure cause
2. **Documentation Update**: Record lessons learned
3. **Process Improvement**: Update upgrade procedures
4. **Stakeholder Review**: Present findings and improvements

---

## Documentation Requirements

### 1. Pre-Upgrade Documentation

#### Release Notes Summary
- [ ] **Executive Summary**
  - Business impact assessment
  - Key features and improvements
  - Risk summary and mitigation
  - Resource requirements

- [ ] **Technical Documentation**
  - Detailed change log
  - API documentation updates
  - Configuration requirements
  - Integration guide updates

#### Upgrade Plan
- [ ] **Detailed Timeline**
  - Phase-by-phase schedule
  - Resource allocation plan
  - Risk mitigation strategies
  - Communication plan

### 2. Post-Upgrade Documentation

#### Upgrade Summary Report
- [ ] **Execution Summary**
  - Timeline adherence
  - Issues encountered and resolved
  - Performance metrics comparison
  - User impact assessment

- [ ] **Lessons Learned**
  - Process improvements identified
  - Risk assessment accuracy
  - Validation effectiveness
  - Stakeholder feedback

---

## Approval Process

### 1. Approval Gates

#### Technical Approval
- [ ] **IRIS Team Review**
  - Governance compatibility confirmed
  - Decision-making accuracy validated
  - Integration stability verified
  - Performance benchmarks met

- [ ] **Security Team Review**
  - Security assessment completed
  - Vulnerabilities addressed
  - Security requirements met
  - Compliance maintained

#### Business Approval
- [ ] **Product Owner Review**
  - Business impact assessed
  - User experience evaluated
  - Feature benefits confirmed
  - Risk acceptance documented

- [ ] **Executive Approval**
  - Business case approved
  - Resource allocation confirmed
  - Timeline acceptance
  - Risk tolerance acknowledged

### 2. Approval Documentation

#### Approval Record
```
Major Version Upgrade Approval Record

Version: [Previous Version] → [New Version]
Date: [Approval Date]
Approvers: [List of Approvers]
Approvals:
□ Technical Approval: [Name/Date]
□ Security Approval: [Name/Date]
□ Business Approval: [Name/Date]
□ Executive Approval: [Name/Date]

Risk Assessment: [Summary of risks]
Mitigation Plan: [Summary of mitigations]
Rollback Plan: [Reference to rollback procedures]
```

---

## Communication Plan

### 1. Stakeholder Communication

#### Pre-Upgrade Communication (2 Weeks Before)
- [ ] **Stakeholder Notification**
  - Upgrade schedule and timeline
  - Expected impact and duration
  - Risk assessment summary
  - Contact information for issues

- [ ] **User Communication**
  - Upgrade notification and schedule
  - Expected service impact
  - Alternative access arrangements
  - Support contact information

#### During Upgrade Communication
- [ ] **Progress Updates**
  - Regular status updates
  - Issue notifications and resolutions
  - Timeline adjustments
  - Emergency contact information

#### Post-Upgrade Communication
- [ ] **Completion Notification**
  - Successful upgrade confirmation
  - New features and improvements
  - Performance improvements
  - Issue resolution status

### 2. Support Preparation

#### Support Team Readiness
- [ ] **Training Completed**
  - New version features and changes
  - Common issues and resolutions
  - Escalation procedures
  - Communication templates

- [ ] **Documentation Available**
  - Troubleshooting guides updated
  - FAQ for common issues
  - Contact procedures and escalation
  - System status page updates

---

## Appendix

### Appendix A: Major Version Upgrade Checklist

#### Pre-Upgrade Checklist
- [ ] Release notes reviewed and understood
- [ ] Breaking changes identified and documented
- [ ] Dependency compatibility verified
- [ ] Risk assessment completed
- [ ] Upgrade strategy selected and documented
- [ ] Timeline and resources planned
- [ ] Stakeholder approvals obtained
- [ ] Support team trained and ready
- [ ] Documentation updated and available
- [ ] Rollback plan tested and validated
- [ ] Communication plan prepared and distributed

#### During Upgrade Checklist
- [ ] Pre-upgrade validations completed successfully
- [ ] Upgrade execution started according to plan
- [ ] Progress monitored and documented
- [ ] Issues identified and addressed promptly
- [ ] Stakeholders kept informed of progress
- [ ] Rollback triggers monitored continuously
- [ ] Post-upgrade validations completed

#### Post-Upgrade Checklist
- [ ] All systems functioning correctly
- [ ] Performance metrics within acceptable ranges
- [ ] User issues resolved or addressed
- [ ] Documentation completed and distributed
- [ ] Lessons learned documented
- [ ] Process improvements identified
- [ ] Stakeholder review completed
- [ ] Next steps planned and scheduled

### Appendix B: Contact Information

| Role | Name | Contact | Backup Contact |
|-------|------|---------|---------------|
| IRIS Team Lead | IRIS Team | iris-team@company.com | backup-iris@company.com |
| Technical Lead | Technical Team | tech-lead@company.com | backup-tech@company.com |
| Security Lead | Security Team | security@company.com | backup-security@company.com |
| Product Owner | Product Team | product@company.com | backup-product@company.com |
| Executive Sponsor | Executive Team | executive@company.com | backup-exec@company.com |

---

**Document Version**: 1.0  
**Last Updated**: 2025-12-08  
**Next Review**: 2026-03-08  
**Approved By**: rooz-live