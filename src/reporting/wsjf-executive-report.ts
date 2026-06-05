/**
 * WSJF Executive Report Generator
 *
 * Produces summary reports (Markdown, JSON, HTML) for leadership.
 * Covers: top-N WSJF items, PI velocity, risk distribution, completion rate.
 */

import type {
  ExecReport,
  ExecReportConfig,
  FederatedWSJFItem,
  TrendAnalysis,
} from '../api/wsjf-shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// Report generator
// ─────────────────────────────────────────────────────────────────────────────

export class ExecReportGenerator {
  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate a complete executive report in the requested format.
   */
  generate(
    config: ExecReportConfig,
    items: FederatedWSJFItem[],
    trend?: TrendAnalysis,
  ): ExecReport {
    const topItems         = this.topN(items, config.topN);
    const riskDistribution = this.riskDistribution(items);
    const completionRate   = this.completionRate(items);
    const avgWsjfScore     = this.avgScore(items);

    const report: ExecReport = {
      piId:             config.piId,
      tenantId:         config.tenantId,
      generatedAt:      new Date().toISOString(),
      topItems,
      velocityTrend:    trend,
      riskDistribution,
      completionRate,
      avgWsjfScore,
      content:          '',
    };

    report.content = config.format === 'markdown'
      ? this.generateMarkdown(report)
      : config.format === 'html'
        ? this.generateHTML(report)
        : this.generateJSON(report);

    return report;
  }

  // ── Renderers ──────────────────────────────────────────────────────────────

  generateMarkdown(report: ExecReport): string {
    const lines: string[] = [
      `# WSJF Executive Report — ${report.piId}`,
      '',
      `**Tenant:** ${report.tenantId}  `,
      `**Generated:** ${report.generatedAt}  `,
      `**Completion Rate:** ${(report.completionRate * 100).toFixed(1)}%  `,
      `**Avg WSJF Score:** ${report.avgWsjfScore.toFixed(2)}`,
      '',
      '---',
      '',
      `## Top ${report.topItems.length} Backlog Items`,
      '',
      '| # | Title | Type | WSJF | CoD | Status |',
      '|---|-------|------|------|-----|--------|',
      ...report.topItems.map((item, i) =>
        `| ${i + 1} | ${this.escape(item.title)} | ${item.type} | ${item.wsjf.score.toFixed(2)} | ${item.wsjf.costOfDelay.toFixed(1)} | ${item.status} |`,
      ),
      '',
    ];

    if (Object.keys(report.riskDistribution).length > 0) {
      lines.push('## Risk Distribution', '');
      for (const [level, count] of Object.entries(report.riskDistribution)) {
        lines.push(`- **${level}**: ${count} items`);
      }
      lines.push('');
    }

    if (report.velocityTrend) {
      const t = report.velocityTrend;
      lines.push(
        '## Velocity Trend',
        '',
        `- **Slope:** ${t.slope > 0 ? '+' : ''}${t.slope.toFixed(4)} (${t.slope > 0 ? 'improving' : t.slope < 0 ? 'declining' : 'stable'})`,
        `- **Velocity Baseline:** ${t.velocityBaseline.toFixed(1)} pts/period`,
        `- **Anomalies Detected:** ${t.anomalies.length}`,
        '',
      );
    }

    return lines.join('\n');
  }

  generateJSON(report: ExecReport): string {
    const { content: _c, ...rest } = report;
    return JSON.stringify(rest, null, 2);
  }

  generateHTML(report: ExecReport): string {
    const tableRows = report.topItems.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${this.escapeHTML(item.title)}</td>
        <td><span class="badge badge-${item.type}">${item.type}</span></td>
        <td class="score">${item.wsjf.score.toFixed(2)}</td>
        <td>${item.wsjf.costOfDelay.toFixed(1)}</td>
        <td><span class="status status-${item.status}">${item.status.replace('_', ' ')}</span></td>
      </tr>`).join('');

    const riskRows = Object.entries(report.riskDistribution)
      .map(([lvl, cnt]) => `<tr><td>${lvl}</td><td>${cnt}</td></tr>`)
      .join('');

    const trendSection = report.velocityTrend ? `
      <section>
        <h2>Velocity Trend</h2>
        <dl>
          <dt>Slope</dt><dd>${report.velocityTrend.slope.toFixed(4)}</dd>
          <dt>Baseline</dt><dd>${report.velocityTrend.velocityBaseline.toFixed(1)} pts/period</dd>
          <dt>Anomalies</dt><dd>${report.velocityTrend.anomalies.length}</dd>
        </dl>
      </section>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WSJF Executive Report — ${this.escapeHTML(report.piId)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 960px; margin: 2rem auto; color: #1a1a2e; }
    h1   { color: #3b82f6; border-bottom: 2px solid #3b82f620; padding-bottom: 0.5rem; }
    h2   { color: #6366f1; margin-top: 2rem; }
    .meta { display: flex; gap: 2rem; background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .meta dt { font-weight: 600; font-size: 0.8rem; color: #6b7280; text-transform: uppercase; }
    .meta dd { font-size: 1.1rem; margin: 0; }
    table  { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th     { background: #f1f5f9; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; }
    .score { font-weight: 700; color: #3b82f6; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-feature   { background: #dbeafe; color: #1d4ed8; }
    .badge-bug       { background: #fee2e2; color: #b91c1c; }
    .badge-tech-debt { background: #fef3c7; color: #92400e; }
    .badge-spike     { background: #ede9fe; color: #6d28d9; }
    .badge-enabler   { background: #dcfce7; color: #15803d; }
    .status          { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
    .status-done     { background: #dcfce7; color: #15803d; }
    .status-new      { background: #f1f5f9; color: #374151; }
    .status-in_progress { background: #dbeafe; color: #1d4ed8; }
    .status-blocked  { background: #fee2e2; color: #b91c1c; }
    dl { display: grid; grid-template-columns: max-content auto; gap: 0.4rem 1rem; }
    dt { font-weight: 600; color: #6b7280; }
  </style>
</head>
<body>
  <h1>WSJF Executive Report — ${this.escapeHTML(report.piId)}</h1>
  <dl class="meta">
    <dt>Tenant</dt><dd>${this.escapeHTML(report.tenantId)}</dd>
    <dt>Generated</dt><dd>${report.generatedAt}</dd>
    <dt>Completion Rate</dt><dd>${(report.completionRate * 100).toFixed(1)}%</dd>
    <dt>Avg WSJF Score</dt><dd>${report.avgWsjfScore.toFixed(2)}</dd>
  </dl>

  <section>
    <h2>Top ${report.topItems.length} Backlog Items</h2>
    <table>
      <thead><tr><th>#</th><th>Title</th><th>Type</th><th>WSJF</th><th>CoD</th><th>Status</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </section>

  ${riskRows ? `<section><h2>Risk Distribution</h2><table><thead><tr><th>Level</th><th>Items</th></tr></thead><tbody>${riskRows}</tbody></table></section>` : ''}

  ${trendSection}
</body>
</html>`;
  }

  // ── Computation helpers ───────────────────────────────────────────────────

  private topN(items: FederatedWSJFItem[], n: number): FederatedWSJFItem[] {
    return [...items]
      .sort((a, b) => b.wsjf.score - a.wsjf.score)
      .slice(0, n);
  }

  private riskDistribution(items: FederatedWSJFItem[]): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const item of items) {
      const confidence = item.wsjf.confidence ?? 0;
      const level = confidence >= 0.8 ? 'low' : confidence >= 0.5 ? 'medium' : 'high';
      dist[level] = (dist[level] ?? 0) + 1;
    }
    return dist;
  }

  private completionRate(items: FederatedWSJFItem[]): number {
    if (items.length === 0) return 0;
    const done = items.filter(i => i.status === 'done').length;
    return done / items.length;
  }

  private avgScore(items: FederatedWSJFItem[]): number {
    if (items.length === 0) return 0;
    return items.reduce((s, i) => s + i.wsjf.score, 0) / items.length;
  }

  private escape(s: string): string {
    return s.replace(/\|/g, '\\|');
  }

  private escapeHTML(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const execReportGenerator = new ExecReportGenerator();
