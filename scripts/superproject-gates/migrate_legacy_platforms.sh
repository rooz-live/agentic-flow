#!/usr/bin/env bash
set -euo pipefail

# IMMEDIATE MIGRATION: Legacy Platforms → SAFe Lean Budget Horizons
# Platforms: HostBill, OpenStack, StarlingX, Affiliate, Oro, Telnyx/Plivo
# Action: Move existing assets, establish upstream integration

WORKSPACE="$HOME/Documents/workspace"
CODE="$HOME/Documents/code"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG="$WORKSPACE/logs/platform_migration_$TIMESTAMP.log"

log() { echo -e "\033[0;32m[MIGRATE]\033[0m $1" | tee -a "$LOG"; }
warn() { echo -e "\033[0;33m[WARN]\033[0m $1" | tee -a "$LOG"; }
info() { echo -e "\033[0;34m[INFO]\033[0m $1" | tee -a "$LOG"; }

log "╔══════════════════════════════════════════════════════════════╗"
log "║  IMMEDIATE MIGRATION: Legacy Platforms → SAFe Structure      ║"
log "╚══════════════════════════════════════════════════════════════╝"
log ""

# =============================================================================
# MIGRATION 1: Platform Infrastructure (INVESTING - Production)
# =============================================================================
log "1. Platform Infrastructure (OpenStack + StarlingX) → investing/"
info "   Status: Production systems, already deployed"
info "   Budget: \$15K/month OpEx"

mkdir -p "$CODE/investing/platform-infrastructure"/{openstack,starlingx,hivelocity,scripts,docs,config,.opex}

# Move OpenStack scripts
log "   → Migrating OpenStack scripts..."
if [[ -f "$WORKSPACE/h0-actions/root-scripts/discover_openstack_services.sh" ]]; then
  cp "$WORKSPACE/h0-actions/root-scripts/discover_openstack_services.sh" \
     "$CODE/investing/platform-infrastructure/openstack/" && \
  log "     ✓ discover_openstack_services.sh"
fi

if [[ -f "$WORKSPACE/h0-actions/root-scripts/openstack_caracal_install.sh" ]]; then
  cp "$WORKSPACE/h0-actions/root-scripts/openstack_caracal_install.sh" \
     "$CODE/investing/platform-infrastructure/openstack/" && \
  log "     ✓ openstack_caracal_install.sh"
fi

# Move StarlingX scripts
log "   → Migrating StarlingX scripts..."
if [[ -f "$WORKSPACE/h0-actions/recent-files/harden-starlingx.sh" ]]; then
  cp "$WORKSPACE/h0-actions/recent-files/harden-starlingx.sh" \
     "$CODE/investing/platform-infrastructure/starlingx/" && \
  log "     ✓ harden-starlingx.sh"
fi

if [[ -f "$WORKSPACE/h0-actions/recent-files/refine-starlingx-security-fixed.sh" ]]; then
  cp "$WORKSPACE/h0-actions/recent-files/refine-starlingx-security-fixed.sh" \
     "$CODE/investing/platform-infrastructure/starlingx/" && \
  log "     ✓ refine-starlingx-security-fixed.sh"
fi

# Copy StarlingX documentation
if [[ -f "$WORKSPACE/docs/protocols/starlingx/starlingx_integration.md" ]]; then
  cp "$WORKSPACE/docs/protocols/starlingx/starlingx_integration.md" \
     "$CODE/investing/platform-infrastructure/docs/" && \
  log "     ✓ starlingx_integration.md"
fi

# Create README
cat > "$CODE/investing/platform-infrastructure/README.md" << 'EOF'
# Platform Infrastructure

**Circle**: Orchestrator (primary), Innovator (optimization)  
**Lifecycle**: Investing (Production)  
**Budget**: $15K/month OpEx  
**Last Migration**: $(date)

## Components

### OpenStack Caracal
- **Purpose**: Cloud infrastructure management
- **Scripts**: 
  - `openstack/discover_openstack_services.sh` - Service discovery
  - `openstack/openstack_caracal_install.sh` - Installation automation
- **Upstream**: https://github.com/openstack/openstack
- **Integration**: Pull upstream quarterly, contribute fixes back

### StarlingX STX-11.0
- **Purpose**: Edge cloud platform
- **Scripts**:
  - `starlingx/harden-starlingx.sh` - Security hardening
  - `starlingx/refine-starlingx-security-fixed.sh` - Security refinements
- **Docs**: `docs/starlingx_integration.md`
- **Upstream**: https://opendev.org/starlingx
- **Integration**: Fork → customize → PR back improvements

### Hivelocity API
- **Purpose**: Hardware provisioning
- **Status**: Integration scripts to be added
- **Upstream**: Hivelocity API (proprietary)

## Success Criteria
- 99.95% platform uptime
- <30min resource provisioning
- Auto-scaling enabled
- Monthly security patches applied

## OpEx Tracking
See: `.opex/infrastructure-costs.json`

## Upstream Integration Workflow

### Pull Changes (Monthly)
```bash
# OpenStack
cd openstack/
git remote add upstream https://github.com/openstack/openstack
git fetch upstream
git merge upstream/master --no-ff

# StarlingX
cd starlingx/
git remote add upstream https://opendev.org/starlingx/config
git fetch upstream
git rebase upstream/master
```

### Contribute Back (As needed)
```bash
# Create feature branch
git checkout -b feature/our-improvement

# Make changes, test locally
# ...

# Push to our fork
git push origin feature/our-improvement

# Create PR to upstream
# - OpenStack: https://review.opendev.org
# - StarlingX: https://review.opendev.org/starlingx
```

## Circle Ownership
- **Orchestrator**: Operations, deployments, incidents
- **Innovator**: Performance optimization, new capabilities
- **Assessor**: Security, compliance, validation

## Related Docs
- Deployment runbook: `docs/deployment_runbook.md` (to be created)
- Incident response: `docs/incident_playbook.md` (to be created)
- Security hardening: `docs/starlingx_integration.md` (exists)
EOF

# Create OpEx tracking file
cat > "$CODE/investing/platform-infrastructure/.opex/infrastructure-costs.json" << 'EOF'
{
  "project": "platform-infrastructure",
  "lifecycle": "investing",
  "tracking_period": "2025-11",
  "monthly_opex": 15000,
  "breakdown": {
    "openstack_hosting": 5000,
    "starlingx_compute": 4000,
    "hivelocity_api": 2000,
    "orchestration": 3000,
    "monitoring": 1000
  },
  "tech_debt_interest": {
    "percentage": 8,
    "monthly_cost": 1200,
    "action_required": "Monitor, acceptable level"
  },
  "upstream_integration": {
    "openstack_last_pull": null,
    "starlingx_last_pull": null,
    "contributions_ytd": 0,
    "next_review": "2025-12-01"
  }
}
EOF

log "   ✓ Platform Infrastructure migrated to investing/"

# =============================================================================
# MIGRATION 2: Affiliate Platform (EMERGING - Development)
# =============================================================================
log ""
log "2. Affiliate Platform → emerging/"
info "   Status: MVP exists, needs productization"
info "   Budget: \$6K/month CapEx"

mkdir -p "$CODE/emerging/affiliate-platform"/{src,tests,docs,config,.capex}

# Move affiliate scripts
log "   → Migrating Affiliate scripts..."
if [[ -f "$WORKSPACE/h0-actions/root-scripts/validate_affiliate_attribution.sh" ]]; then
  cp "$WORKSPACE/h0-actions/root-scripts/validate_affiliate_attribution.sh" \
     "$CODE/emerging/affiliate-platform/src/" && \
  log "     ✓ validate_affiliate_attribution.sh"
fi

# Check for legacy platform
if [[ -d "$WORKSPACE/h4-retiring/legacy-root/affiliate-platform" ]]; then
  log "   → Found legacy affiliate-platform, extracting valuable code..."
  # Copy any valuable scripts
  find "$WORKSPACE/h4-retiring/legacy-root/affiliate-platform" -name "*.sh" -o -name "*.py" -o -name "*.js" 2>/dev/null | \
  while read file; do
    cp "$file" "$CODE/emerging/affiliate-platform/src/" 2>/dev/null && \
    log "     ✓ $(basename "$file")"
  done || true
fi

# Create README
cat > "$CODE/emerging/affiliate-platform/README.md" << 'EOF'
# Affiliate Platform

**Circle**: Analyst (tracking), Innovator (features)  
**Lifecycle**: Emerging (Development)  
**Budget**: $6K/month CapEx  
**Last Migration**: $(date)

## Purpose
Partner revenue tracking, commission calculations, attribution accuracy

## MVP Status
- [x] Attribution validation script
- [ ] Web dashboard
- [ ] Real-time tracking API
- [ ] Automated commission calculations
- [ ] Partner portal

## Upstream Integration

### PostAffiliatePro (If using)
- **Upstream**: https://www.postaffiliatepro.com/
- **Integration**: API-based, monthly SDK updates
- **Fork**: N/A (SaaS)

### Custom Implementation
- **Status**: In development
- **Stack**: TBD (Python/Node.js?)
- **Database**: TBD (PostgreSQL?)

## Promotion to Investing DoD
- [ ] 10+ affiliate partners tested
- [ ] Real-time tracking working
- [ ] Commission accuracy 99%+
- [ ] OpEx plan documented
- [ ] SLA defined (tracking latency <5s)
- [ ] Innovator → Assessor handoff completed

## CapEx Tracking
See: `.capex/mvp-costs.json`

## Circle Ownership
- **Analyst**: Tracking logic, metrics, reporting
- **Innovator**: Feature development, API design
- **Orchestrator**: Deployment automation (when ready)
EOF

# Create CapEx tracking
cat > "$CODE/emerging/affiliate-platform/.capex/mvp-costs.json" << 'EOF'
{
  "project": "affiliate-platform",
  "lifecycle": "emerging",
  "tracking_period": "2025-11",
  "monthly_capex": 6000,
  "breakdown": {
    "development_hours": 4500,
    "hours": 225,
    "hourly_rate": 20,
    "testing": 1000,
    "integration": 500
  },
  "promotion_target": "2026-Q1",
  "mvp_progress": {
    "features_complete": 1,
    "features_remaining": 4,
    "completion_percentage": 20
  }
}
EOF

log "   ✓ Affiliate Platform migrated to emerging/"

# =============================================================================
# MIGRATION 3: HostBill Integration (INVESTING - Production)
# =============================================================================
log ""
log "3. HostBill Integration → investing/"
info "   Status: Production billing system"
info "   Budget: \$8K/month OpEx"

mkdir -p "$CODE/investing/hostbill-integration"/{src,config,docs,tests,.opex}

# Search for HostBill scripts
log "   → Searching for HostBill scripts..."
find "$WORKSPACE" -name "*hostbill*" -type f \( -name "*.sh" -o -name "*.py" -o -name "*.js" \) 2>/dev/null | \
while read file; do
  cp "$file" "$CODE/investing/hostbill-integration/src/" 2>/dev/null && \
  log "     ✓ $(basename "$file")"
done || log "     ⚠ No HostBill scripts found in workspace"

# Create README
cat > "$CODE/investing/hostbill-integration/README.md" << 'EOF'
# HostBill Integration

**Circle**: Orchestrator (ops), Assessor (compliance)  
**Lifecycle**: Investing (Production)  
**Budget**: $8K/month OpEx  
**Last Migration**: $(date)

## Purpose
Customer billing, product provisioning, subscription management, revenue tracking

## Components
- Billing API integration
- Provisioning automation
- Subscription lifecycle management
- Invoice generation
- Payment gateway integration

## Upstream Integration

### HostBill Core
- **Vendor**: ModulesGarden
- **Upstream**: https://hostbillapp.com/
- **Version**: TBD (check current installation)
- **Updates**: Monthly security patches
- **License**: Commercial

### Integration Approach
1. **Plugin/Module Development**: Custom modules in own repo
2. **API Integration**: Use HostBill API, don't fork core
3. **Updates**: Pull vendor updates monthly, test in staging
4. **Customizations**: Maintain separate from core

## Success Criteria
- 99.9% uptime
- <5min provisioning time
- $0 billing errors
- <2hr incident response

## OpEx Tracking
See: `.opex/monthly-costs.json`

## Circle Ownership
- **Orchestrator**: Daily operations, provisioning
- **Assessor**: Billing accuracy, compliance, audits
- **Analyst**: Revenue reporting, metrics

## Related Systems
- Payment gateways: Square (primary), Stripe, PayPal
- CRM: TBD (Oro evaluation pending)
- Customer portal: HostBill native
EOF

# Create OpEx tracking
cat > "$CODE/investing/hostbill-integration/.opex/monthly-costs.json" << 'EOF'
{
  "project": "hostbill-integration",
  "lifecycle": "investing",
  "tracking_period": "2025-11",
  "monthly_opex": 8000,
  "breakdown": {
    "cloud_hosting": 2000,
    "database": 1500,
    "support_hours": 3000,
    "security_patches": 1000,
    "monitoring": 500
  },
  "tech_debt_interest": {
    "percentage": 12,
    "monthly_cost": 960,
    "action_required": "Schedule refactoring sprint (Q1 2026)"
  },
  "vendor_costs": {
    "hostbill_license": "TBD",
    "payment_gateway_fees": "Variable (2-3% of transactions)"
  }
}
EOF

log "   ✓ HostBill Integration migrated to investing/"

# =============================================================================
# MIGRATION 4: Communications Platform (EMERGING - Development)
# =============================================================================
log ""
log "4. Communications Platform (Telnyx/Plivo/SMS/IVR) → emerging/"
info "   Status: Need to build integrations"
info "   Budget: \$4K/month CapEx"

mkdir -p "$CODE/emerging/communications-platform"/{telnyx,plivo,ivr,docs,.capex}

# Create README
cat > "$CODE/emerging/communications-platform/README.md" << 'EOF'
# Communications Platform

**Circle**: Innovator (integration), Orchestrator (reliability)  
**Lifecycle**: Emerging (Development)  
**Budget**: $4K/month CapEx  
**Last Migration**: $(date)

## Purpose
Multi-channel customer communications: SMS, Voice, IVR, TTS

## Integrations

### Telnyx (Primary)
- **Upstream**: https://github.com/team-telnyx
- **API Docs**: https://developers.telnyx.com/
- **SDK**: Python, Node.js available
- **Features**: SMS, Voice, Number provisioning
- **Integration**: SDK + REST API

### Plivo (Backup)
- **Upstream**: https://github.com/plivo
- **API Docs**: https://www.plivo.com/docs/
- **SDK**: Python, Node.js available
- **Features**: SMS, Voice (backup for Telnyx)
- **Integration**: SDK + REST API

### Fish Speech TTS
- **Purpose**: Text-to-speech for IVR
- **Upstream**: https://github.com/fishaudio/fish-speech
- **Integration**: Self-hosted or API

## MVP Status
- [ ] Telnyx SDK integration
- [ ] SMS send/receive
- [ ] Voice calling
- [ ] Plivo failover configuration
- [ ] IVR basic flow
- [ ] TTS integration

## Upstream Integration Workflow

### Pull SDK Updates (Monthly)
```bash
# Telnyx Python SDK
pip install --upgrade telnyx

# Plivo Python SDK  
pip install --upgrade plivo

# Fish Speech TTS
cd fish-speech/
git pull upstream master
```

### Contribute Back
- Bug fixes → PR to SDKs
- Feature requests → GitHub issues
- Integration examples → Documentation

## Promotion to Investing DoD
- [ ] 100+ messages sent successfully
- [ ] <2s message delivery time
- [ ] 99.5% delivery rate
- [ ] Cost per message <$0.01
- [ ] Failover tested (Telnyx → Plivo)
- [ ] IVR flows operational
- [ ] OpEx plan documented

## CapEx Tracking
See: `.capex/integration-costs.json`

## Circle Ownership
- **Innovator**: SDK integration, feature development
- **Orchestrator**: Deployment, failover configuration
- **Assessor**: Delivery rate monitoring, cost optimization (future)
EOF

# Create CapEx tracking
cat > "$CODE/emerging/communications-platform/.capex/integration-costs.json" << 'EOF'
{
  "project": "communications-platform",
  "lifecycle": "emerging",
  "tracking_period": "2025-11",
  "monthly_capex": 4000,
  "breakdown": {
    "telnyx_integration": 2000,
    "plivo_integration": 1000,
    "testing": 1000
  },
  "promotion_target": "2026-Q2",
  "mvp_progress": {
    "features_complete": 0,
    "features_remaining": 6,
    "completion_percentage": 0
  }
}
EOF

log "   ✓ Communications Platform structure created in emerging/"

# =============================================================================
# MIGRATION 5: Oro CRM Evaluation (EVALUATING - Spike)
# =============================================================================
log ""
log "5. Oro CRM + Symfony → evaluating/"
info "   Status: Needs evaluation spike"
info "   Budget: \$2K/month CapEx"

mkdir -p "$CODE/evaluating/oro-crm-spike"/{research,poc,docs,.capex}

# Create README
cat > "$CODE/evaluating/oro-crm-spike/README.md" << 'EOF'
# Oro CRM + Symfony Evaluation Spike

**Circle**: Seeker (research), Analyst (feasibility)  
**Lifecycle**: Evaluating (Spike)  
**Budget**: $2K/month CapEx  
**Decision Gate**: 2025-12-15  
**Last Migration**: $(date)

## Purpose
Evaluate Oro CRM + Symfony for enterprise customer relationship management

## Spike Questions
1. Is Oro CRM actively maintained? (Check GitHub commits)
2. Integration complexity with HostBill?
3. License costs for production?
4. Migration effort from current CRM (if any)?
5. Symfony 6.x/7.x compatibility?

## Upstream Integration

### Oro CRM
- **Upstream**: https://github.com/oroinc/crm
- **Docs**: https://doc.oroinc.com/
- **License**: OSL 3.0 (Open Software License)
- **Community**: Active? Check recent commits

### Symfony
- **Upstream**: https://github.com/symfony/symfony
- **Version**: Target 7.x (LTS)
- **Integration**: Oro is built on Symfony
- **Learning curve**: Moderate (if team knows PHP)

## Research Tasks
- [ ] Check Oro CRM GitHub activity (last 30 days)
- [ ] Review license compatibility
- [ ] Estimate hosting costs (self-hosted)
- [ ] Test Oro installation locally
- [ ] Evaluate API capabilities
- [ ] Check Symfony ecosystem health

## Success Criteria (Go Decision)
- [ ] Active community (>10 commits/month)
- [ ] Integration feasible (<40 development hours)
- [ ] Total cost <$10K/year
- [ ] ROI >2x in 12 months
- [ ] Symfony learning curve acceptable

## Deliverables (by 2025-11-30)
- [ ] Spike report with recommendation
- [ ] POC deployment (if green light)
- [ ] Cost-benefit analysis
- [ ] Alternative CRM comparison (if No-Go)

## If Go Decision → Promote to Emerging
- Move to `code/emerging/oro-crm-implementation/`
- Allocate $8K/month CapEx for development
- Target: Production in Q2 2026

## If No-Go → Evaluate Alternatives
- HubSpot CRM
- Salesforce
- Zoho CRM
- Custom build on Django/Rails

## CapEx Tracking
See: `.capex/spike-hours.json`
EOF

# Create CapEx tracking
cat > "$CODE/evaluating/oro-crm-spike/.capex/spike-hours.json" << 'EOF'
{
  "project": "oro-crm-spike",
  "lifecycle": "evaluating",
  "tracking_period": "2025-11",
  "monthly_capex": 2000,
  "breakdown": {
    "research_hours": 1500,
    "hours": 75,
    "hourly_rate": 20,
    "poc_deployment": 500
  },
  "decision_gate": "2025-12-15",
  "spike_status": {
    "started": false,
    "research_complete": false,
    "poc_deployed": false,
    "decision": null
  }
}
EOF

log "   ✓ Oro CRM Evaluation spike structure created in evaluating/"

# =============================================================================
# SUMMARY & NEXT STEPS
# =============================================================================
log ""
log "═══════════════════════════════════════════════════════════════"
log "           MIGRATION COMPLETE - 5 Platforms Activated          "
log "═══════════════════════════════════════════════════════════════"
log ""

log "✓ Platform Infrastructure → code/investing/platform-infrastructure/"
log "✓ Affiliate Platform → code/emerging/affiliate-platform/"
log "✓ HostBill Integration → code/investing/hostbill-integration/"
log "✓ Communications Platform → code/emerging/communications-platform/"
log "✓ Oro CRM Spike → code/evaluating/oro-crm-spike/"
log ""

log "📊 Budget Summary:"
log "  Investing (OpEx):  \$23K/month (Platform \$15K + HostBill \$8K)"
log "  Emerging (CapEx):  \$10K/month (Affiliate \$6K + Comms \$4K)"
log "  Evaluating (CapEx): \$2K/month (Oro CRM spike)"
log "  TOTAL: \$35K/month"
log ""

log "🔄 Upstream Integration Next Steps:"
log "  1. Add git remotes for OpenStack/StarlingX"
log "  2. Install Telnyx/Plivo SDKs"
log "  3. Clone Oro CRM for evaluation"
log "  4. Document HostBill version & update process"
log "  5. Create monthly upstream sync schedule"
log ""

log "📋 Circle Assignments:"
log "  Orchestrator: Platform Infrastructure, HostBill, Communications (ops)"
log "  Innovator: Affiliate, Communications (dev), Platform (optimization)"
log "  Analyst: Affiliate (tracking), Oro CRM (feasibility)"
log "  Seeker: Oro CRM (research)"
log "  Assessor: Platform (security), HostBill (compliance)"
log ""

log "Migration log: $LOG"
log ""
log "Next: Run upstream integration setup:"
log "  bash ~/Documents/code/scripts/setup_upstream_integration.sh"
