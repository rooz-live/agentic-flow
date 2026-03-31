# Governance & Audit System

Comprehensive governance, audit, review, retrospective, and replenishment system for agentic-flow.

## Overview

This system provides automated and manual governance capabilities across multiple dimensions:

- **Review System**: Security, architecture, performance, dependencies, and compliance reviews
- **Retrospective System**: Sprint/iteration analysis with action item generation
- **Refinement System**: Actionable plans based on reviews and retrospectives
- **Replenishment System**: Resource and backlog management

## Quick Start

```bash
# Run comprehensive governance audit
npm run governance:audit

# Individual commands
npm run governance:review
npm run governance:retrospective
npm run governance:report
```

## Features

### 1. Review System

Conducts multi-dimensional reviews of your codebase:

#### Security Review
- npm audit integration
- Vulnerability scanning
- Secret detection recommendations
- Security score calculation

#### Architecture Review
- Project structure validation
- Documentation completeness checks
- Best practices compliance

#### Performance Review
- Benchmark availability
- Performance metrics tracking

#### Dependency Review
- Dependency count analysis
- Update recommendations
- Bloat detection

#### Compliance Review
- License verification
- Code of conduct checks
- Legal compliance

### 2. Retrospective System

Structured retrospectives following Agile methodologies:

- **What Went Well**: Success analysis
- **What Could Improve**: Areas for improvement
- **Action Items**: Prioritized tasks with due dates
- **Metrics**: Quantitative performance indicators

### 3. Actionable Refinement System

Generates prioritized action plans:

- Extracts recommendations from reviews
- Converts retrospective insights into tasks
- Assigns priorities and due dates
- Tracks implementation status

### 4. Replenishment System

Manages resources and backlog health:

- Backlog health monitoring
- Resource allocation tracking
- Technical debt analysis
- Dependency update planning

## Report Structure

Each governance audit generates comprehensive reports:

```json
{
  "timestamp": "ISO-8601 timestamp",
  "summary": {
    "securityScore": 95,
    "actionItemsCount": 4,
    "criticalIssues": 1
  },
  "review": { /* Review findings */ },
  "retrospective": { /* Retrospective analysis */ },
  "refinementPlan": { /* Action items */ },
  "replenishment": { /* Resource analysis */ }
}
```

## Output Locations

- **Reports**: `logs/governance/`
- **Configuration**: `config/governance/`

### Generated Files

- `comprehensive-report-{timestamp}.json` - Full governance report
- `review-{type}-{timestamp}.json` - Individual review results
- `retrospective-{timestamp}.json` - Sprint retrospectives
- `refinement-plan-{timestamp}.json` - Action plans
- `replenishment-{timestamp}.json` - Resource analysis

## Scheduled Reviews

The system recommends review intervals:

- **Security**: Every 7 days
- **Dependencies**: Every 7 days
- **Performance**: Every 14 days
- **Architecture**: Every 30 days
- **Compliance**: Every 90 days

## Integration with CI/CD

Add to your workflow:

```yaml
# .github/workflows/governance.yml
name: Governance Audit

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run governance:audit
      - uses: actions/upload-artifact@v3
        with:
          name: governance-reports
          path: logs/governance/
```

## Action Item Prioritization

### Priority Levels

- **Critical**: Immediate action required (security vulnerabilities)
- **High**: Address within 7 days (blocking issues)
- **Medium**: Address within 14 days (improvements)
- **Low**: Address within 30 days (nice-to-haves)

### Effort Estimation

- **Low**: < 4 hours
- **Medium**: 4-16 hours
- **High**: 16+ hours

## Metrics & Scoring

### Security Score
- Base: 100 points
- High severity: -20 points
- Medium severity: -10 points
- Low severity: -5 points

### Architecture Score
- Calculated as: (present_items / total_items) × 100

## Customization

Extend the system by modifying `scripts/governance-audit-system.js`:

```javascript
import GovernanceAuditSystem from './scripts/governance-audit-system.js';

const system = new GovernanceAuditSystem();

// Custom review
await system.conductReview('custom-type');

// Custom retrospective period
await system.conductRetrospective('quarterly');

// Generate specific report
await system.generateComprehensiveReport();
```

## Best Practices

1. **Regular Audits**: Run weekly governance audits
2. **Action Tracking**: Review and update action items in each sprint
3. **Trend Analysis**: Compare reports over time
4. **Team Review**: Discuss findings in team meetings
5. **Continuous Improvement**: Implement refinement plans progressively

## Example Workflow

```bash
# Week 1: Initial audit
npm run governance:audit

# Week 2: Address high-priority items
# Review: logs/governance/comprehensive-report-*.json

# Week 3: Follow-up audit
npm run governance:audit

# Compare reports to track improvement
```

## Troubleshooting

### No npm audit results
- Ensure `npm` is installed and accessible
- Check network connectivity for registry access

### Missing directories
- System creates required directories automatically
- Check file permissions if issues persist

### Report not generated
- Review console output for errors
- Check disk space availability
- Verify write permissions in logs/ directory

## Integration with Existing Tools

### Jira/Linear Integration
Export action items to your project management tool:

```javascript
const report = await system.generateComprehensiveReport();
const actionItems = report.refinementPlan.refinements;

// Export to your PM tool
actionItems.forEach(item => {
  // createTicket(item)
});
```

### Slack Notifications

```javascript
// Send summary to Slack
fetch(SLACK_WEBHOOK, {
  method: 'POST',
  body: JSON.stringify({
    text: `Governance Audit Complete!
    Security Score: ${report.summary.securityScore}
    Action Items: ${report.summary.actionItemsCount}
    Critical Issues: ${report.summary.criticalIssues}`
  })
});
```

## Contributing

Extend the governance system:

1. Add new review types in `conductReview()`
2. Enhance metrics in `gatherMetrics()`
3. Add custom analyzers
4. Implement integrations

## License

MIT - See LICENSE file

## Support

For issues or questions:
- GitHub Issues: https://github.com/ruvnet/agentic-flow/issues
- Documentation: https://github.com/ruvnet/agentic-flow#readme
