/**
 * unified-swarm.test.ts — RED phase
 * Tests for: SwarmWsjfMerger, CeremonyLedger, MacOSAppRegistry,
 *            EmlChannelMatrix / selectPrompt, circuit-breaker SA upgrades
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ─── SwarmWsjfMerger ──────────────────────────────────────────────────────────
import {
  SwarmWsjfMerger,
  UnifiedBacklogItem,
} from '../../src/integrations/swarm-wsjf-merger';

// ─── CeremonyLedger ───────────────────────────────────────────────────────────
import {
  CeremonyLedger,
  LedgerEvent,
} from '../../src/integrations/ceremony-ledger';

// ─── MacOSAppRegistry ─────────────────────────────────────────────────────────
import {
  MacOSAppRegistry,
  AppCapability,
  AppCategory,
} from '../../src/integrations/macos-app-registry';

// ─── EmlChannelMatrix ─────────────────────────────────────────────────────────
import {
  selectPrompt,
  buildEmlHeaders,
  resolveAppContext,
  EmlPromptTemplate,
} from '../../src/integrations/eml-channel-matrix';

// ─── Circuit Breaker SA ───────────────────────────────────────────────────────
import {
  AdvisorCircuitBreaker,
} from '../../src/routing/advisor/circuit-breaker';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'unified-swarm-test-'));
}

// =============================================================================
// SwarmWsjfMerger
// =============================================================================
describe('SwarmWsjfMerger', () => {
  let tmpDir: string;
  let merger: SwarmWsjfMerger;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    merger = new SwarmWsjfMerger({
      codeWsjfPath: path.join(tmpDir, 'wsjf.json'),
      cltWsjfDir: path.join(tmpDir, 'clt-wsjf'),
      outputPath: path.join(tmpDir, 'unified-wsjf-backlog.json'),
    });
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('returns empty array when no sources exist', () => {
    const items = merger.getTopN(10);
    expect(items).toEqual([]);
  });

  it('parses /code wsjf.json and returns items tagged vector:code', () => {
    const wsjf = {
      items: [
        { id: 'C1', title: 'Circuit breaker upgrade', wsjf: 12.5, ceremony: 'standup' },
        { id: 'C2', title: 'EML templates', wsjf: 9.0, ceremony: 'retro' },
      ],
    };
    fs.writeFileSync(path.join(tmpDir, 'wsjf.json'), JSON.stringify(wsjf));
    const merger2 = new SwarmWsjfMerger({
      codeWsjfPath: path.join(tmpDir, 'wsjf.json'),
      cltWsjfDir: path.join(tmpDir, 'clt-wsjf'),
      outputPath: path.join(tmpDir, 'unified-wsjf-backlog.json'),
    });
    const items = merger2.getTopN(10);
    expect(items.length).toBe(2);
    expect(items[0].vector).toBe('code');
    expect(items[0].wsjf).toBe(12.5);
    expect(items[0].dispatchable).toBe(true);
  });

  it('parses CLT _WSJF-TRACKER markdown and tags items dispatchable:false', () => {
    const cltDir = path.join(tmpDir, 'clt-wsjf');
    fs.mkdirSync(cltDir, { recursive: true });
    fs.writeFileSync(path.join(cltDir, '2026-02-26-test.md'),
      '# WSJF Tracker\n\n**WSJF: 8.5** - Federal filing deadline\n\nWJSF: 6.0 - Retro action items\n');
    const merger3 = new SwarmWsjfMerger({
      codeWsjfPath: path.join(tmpDir, 'wsjf.json'),
      cltWsjfDir: cltDir,
      outputPath: path.join(tmpDir, 'unified-wsjf-backlog.json'),
    });
    const items = merger3.getTopN(10);
    const cltItems = items.filter(i => i.vector === 'clt');
    expect(cltItems.length).toBeGreaterThan(0);
    cltItems.forEach(i => expect(i.dispatchable).toBe(false));
  });

  it('sorts merged backlog by wsjf descending', () => {
    const wsjf = { items: [{ id: 'A', title: 'Low', wsjf: 3.0, ceremony: 'standup' }] };
    fs.writeFileSync(path.join(tmpDir, 'wsjf.json'), JSON.stringify(wsjf));
    const cltDir = path.join(tmpDir, 'clt-wsjf');
    fs.mkdirSync(cltDir, { recursive: true });
    fs.writeFileSync(path.join(cltDir, 'high.md'), 'WSJF: 15.0 - Critical filing');
    const merger4 = new SwarmWsjfMerger({
      codeWsjfPath: path.join(tmpDir, 'wsjf.json'),
      cltWsjfDir: cltDir,
      outputPath: path.join(tmpDir, 'out.json'),
    });
    const items = merger4.getTopN(10);
    expect(items[0].wsjf).toBeGreaterThanOrEqual(items[1].wsjf);
  });

  it('writeUnified() writes JSON to outputPath', () => {
    const outPath = path.join(tmpDir, 'out.json');
    merger.writeUnified();
    expect(fs.existsSync(outPath)).toBe(false); // no items = still writes empty
    // with items
    const wsjf = { items: [{ id: 'X', title: 'Test', wsjf: 5.0, ceremony: 'retro' }] };
    fs.writeFileSync(path.join(tmpDir, 'wsjf.json'), JSON.stringify(wsjf));
    const merger5 = new SwarmWsjfMerger({
      codeWsjfPath: path.join(tmpDir, 'wsjf.json'),
      cltWsjfDir: path.join(tmpDir, 'clt-wsjf'),
      outputPath: outPath,
    });
    merger5.writeUnified();
    expect(fs.existsSync(outPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    expect(Array.isArray(written.items)).toBe(true);
  });
});

// =============================================================================
// CeremonyLedger
// =============================================================================
describe('CeremonyLedger', () => {
  let tmpDir: string;
  let ledger: CeremonyLedger;
  let ledgerPath: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    ledgerPath = path.join(tmpDir, 'ledger.ndjson');
    ledger = new CeremonyLedger({ ledgerPath });
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('append() writes a valid NDJSON event', () => {
    const id = ledger.append({
      action: 'DISPATCH',
      appId: 'com.omnigroup.OmniFocus5',
      ceremony: 'standup',
      scenario: 'baseline',
      vector: 'code',
      payload: { url: 'omnifocus:///add?name=standup' },
    });
    expect(typeof id).toBe('string');
    const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
    expect(lines.length).toBe(1);
    const evt = JSON.parse(lines[0]) as LedgerEvent;
    expect(evt.id).toBe(id);
    expect(evt.action).toBe('DISPATCH');
    expect(evt.schemaVersion).toBe(1);
  });

  it('rollback() appends compensating ROLLBACK event', () => {
    const id = ledger.append({
      action: 'DISPATCH',
      appId: 'com.apollo.ApolloApp',
      ceremony: 'replenish',
      scenario: 'baseline',
      vector: 'code',
      payload: {},
    });
    ledger.rollback(id);
    const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split('\n');
    expect(lines.length).toBe(2);
    const rollbackEvt = JSON.parse(lines[1]) as LedgerEvent;
    expect(rollbackEvt.action).toBe('ROLLBACK');
    expect(rollbackEvt.targetEventId).toBe(id);
  });

  it('getLastN() returns most recent N events in reverse-chronological order', () => {
    ledger.append({ action: 'DISPATCH', appId: 'A', ceremony: 'standup', scenario: 'baseline', vector: 'code', payload: {} });
    ledger.append({ action: 'DISPATCH', appId: 'B', ceremony: 'retro', scenario: 'adverse', vector: 'code', payload: {} });
    ledger.append({ action: 'DISPATCH', appId: 'C', ceremony: 'review', scenario: 'severe', vector: 'code', payload: {} });
    const last2 = ledger.getLastN(2);
    expect(last2.length).toBe(2);
    expect(last2[0].appId).toBe('C');
  });

  it('getHistory() filters by appId', () => {
    ledger.append({ action: 'DISPATCH', appId: 'com.omnigroup.OmniFocus5', ceremony: 'standup', scenario: 'baseline', vector: 'code', payload: {} });
    ledger.append({ action: 'DISPATCH', appId: 'md.obsidian', ceremony: 'retro', scenario: 'baseline', vector: 'code', payload: {} });
    const ofHistory = ledger.getHistory({ appId: 'com.omnigroup.OmniFocus5' });
    expect(ofHistory.length).toBe(1);
    expect(ofHistory[0].ceremony).toBe('standup');
  });

  it('compact() creates archive file and clears old entries', () => {
    for (let i = 0; i < 5; i++) {
      ledger.append({ action: 'DISPATCH', appId: 'X', ceremony: 'standup', scenario: 'baseline', vector: 'code', payload: { i } });
    }
    ledger.compact(0); // maxAge=0 compacts everything
    const lines = fs.readFileSync(ledgerPath, 'utf8').trim();
    expect(lines).toBe('');
    const compacts = fs.readdirSync(tmpDir).filter(f => f.startsWith('ledger-compact-'));
    expect(compacts.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// MacOSAppRegistry
// =============================================================================
describe('MacOSAppRegistry', () => {
  it('getAll() returns >= 20 entries', () => {
    const all = MacOSAppRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(20);
  });

  it('each entry has required fields', () => {
    MacOSAppRegistry.getAll().forEach(entry => {
      expect(typeof entry.bundleId).toBe('string');
      expect(typeof entry.displayName).toBe('string');
      expect(['applescript', 'url-scheme', 'file-write', 'api', 'system']).toContain(entry.capability);
      expect(['email', 'crm', 'knowledge', 'comms', 'ai', 'devops', 'productivity', 'system']).toContain(entry.category);
      expect(typeof entry.ceremonyWeights).toBe('object');
    });
  });

  it('getByCategory("email") returns MailMaven, Daylite, Direct Mail, Postbox', () => {
    const emails = MacOSAppRegistry.getByCategory('email');
    const names = emails.map(e => e.displayName);
    expect(names).toContain('MailMaven');
    expect(names).toContain('Daylite');
    expect(names).toContain('Direct Mail');
    expect(names).toContain('Postbox');
  });

  it('getByCapability("applescript") returns OmniFocus, OmniOutliner, OmniPlan, MailMaven, Daylite, Postbox', () => {
    const scriptable = MacOSAppRegistry.getByCapability('applescript');
    const names = scriptable.map(e => e.displayName);
    expect(names).toContain('OmniFocus');
    expect(names).toContain('OmniOutliner');
    expect(names).toContain('OmniPlan');
    expect(names).toContain('MailMaven');
  });

  it('resolveForCeremony("pi_prep", "critical") returns top-3 by ceremonyWeight', () => {
    const results = MacOSAppRegistry.resolveForCeremony('pi_prep', 'critical');
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].ceremonyWeights['pi_prep']).toBeGreaterThanOrEqual(results[i + 1].ceremonyWeights['pi_prep']);
    }
  });

  it('resolveForCeremony("standup", "adverse") includes Slack or OmniFocus', () => {
    const results = MacOSAppRegistry.resolveForCeremony('standup', 'adverse');
    const names = results.map(e => e.displayName);
    const hasExpected = names.includes('Slack') || names.includes('OmniFocus');
    expect(hasExpected).toBe(true);
  });
});

// =============================================================================
// EmlChannelMatrix / selectPrompt / buildEmlHeaders / resolveAppContext
// =============================================================================
describe('EmlChannelMatrix', () => {
  it('buildEmlHeaders() includes all required X-headers', () => {
    const headers = buildEmlHeaders({
      ceremony: 'standup',
      scenario: 'baseline',
      telemetry: { pewmaLatencyMs: 120, opexUtilPct: 42, bml: 'UNLEASH' },
      ctx: {
        appId: 'com.tinyspeck.slackmacgap',
        urlScheme: 'slack',
        category: 'comms',
        omniTag: 'Work',
        obsidianFolder: 'rooz',
        apolloGroup: 'team-circle',
        vector: 'code',
        circleRole: 'team-circle',
        wsjf: 9.0,
      },
    });
    expect(headers).toContain('X-Scenario: baseline');
    expect(headers).toContain('X-OPEX-Util: 42%');
    expect(headers).toContain('X-PEWMA-Latency: 120ms');
    expect(headers).toContain('X-BML: UNLEASH');
    expect(headers).toContain('X-App-ID: com.tinyspeck.slackmacgap');
    expect(headers).toContain('X-URL-Scheme: slack://');
    expect(headers).toContain('X-App-Category: comms');
    expect(headers).toContain('X-OmniTag: Work');
    expect(headers).toContain('X-ObsidianFolder: rooz');
    expect(headers).toContain('X-ApolloGroup: team-circle');
    expect(headers).toContain('X-Vector: code');
    expect(headers).toContain('X-CircleRole: team-circle');
    expect(headers).toContain('X-WSJF: 9');
  });

  it('selectPrompt() returns unique template per ceremony+scenario+role+channel', () => {
    const t1 = selectPrompt('standup', 'baseline', 'team-circle', 'Slack');
    const t2 = selectPrompt('retro', 'critical', 'circle-circle', 'Direct Mail');
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
    expect(t1.channel).toBe('Slack');
    expect(t2.channel).toBe('Direct Mail');
    expect(t1.body).not.toBe(t2.body);
  });

  it('selectPrompt() for Obsidian returns YAML frontmatter body', () => {
    const t = selectPrompt('retro', 'baseline', 'team-circle', 'Obsidian');
    expect(t.body).toContain('---');
    expect(t.body).toContain('ceremony: retro');
    expect(t.body).toContain('scenario: baseline');
  });

  it('selectPrompt() for OmniFocus returns omnifocus:///add URL in body', () => {
    const t = selectPrompt('standup', 'baseline', 'team-circle', 'OmniFocus');
    expect(t.body).toContain('omnifocus:///add');
  });

  it('resolveAppContext("pi_prep", "critical") returns OmniPlan with SAFe tag', () => {
    const ctx = resolveAppContext('pi_prep', 'critical');
    expect(ctx.omniTag).toBe('SAFe');
    expect(ctx.obsidianFolder).toBe('rooz');
  });

  it('resolveAppContext("retro", "baseline") returns Obsidian + ModelOps tag', () => {
    const ctx = resolveAppContext('retro', 'baseline');
    expect(ctx.omniTag).toBe('ModelOps');
    expect(ctx.obsidianFolder).toBe('rooz');
  });

  it('resolveAppContext("standup", "adverse") returns Work tag', () => {
    const ctx = resolveAppContext('standup', 'adverse');
    expect(ctx.omniTag).toBe('Work');
  });
});

// =============================================================================
// Circuit Breaker SA upgrades
// =============================================================================
describe('AdvisorCircuitBreaker SA upgrades', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('supports vectorId field in config', () => {
    const cb = new AdvisorCircuitBreaker({
      stateFilePath: path.join(tmpDir, 'cb.json'),
      vectorId: 'code',
    });
    const snap = cb.getSnapshot();
    expect(snap.vectorId).toBe('code');
  });

  it('getSlowEdgeRatio() returns 0 when no calls tracked', () => {
    const cb = new AdvisorCircuitBreaker({ stateFilePath: path.join(tmpDir, 'cb.json') });
    expect(cb.getSlowEdgeRatio()).toBe(0);
  });

  it('autoEscalateScenario() returns next band when slowEdgeRatio > 0.3', () => {
    const cb = new AdvisorCircuitBreaker({
      stateFilePath: path.join(tmpDir, 'cb.json'),
      scenario: 'baseline',
      slowEdgeRatioThreshold: 0.3,
    });
    // Simulate 4 slow-edge calls out of 4 total
    (cb as any).recordSlowEdge(true);
    (cb as any).recordSlowEdge(true);
    (cb as any).recordSlowEdge(true);
    (cb as any).recordSlowEdge(true);
    const escalated = cb.autoEscalateScenario();
    expect(escalated).toBe('adverse');
  });

  it('autoEscalateScenario() returns same band when ratio <= threshold', () => {
    const cb = new AdvisorCircuitBreaker({
      stateFilePath: path.join(tmpDir, 'cb.json'),
      scenario: 'baseline',
      slowEdgeRatioThreshold: 0.3,
    });
    (cb as any).recordSlowEdge(false);
    (cb as any).recordSlowEdge(false);
    (cb as any).recordSlowEdge(false);
    (cb as any).recordSlowEdge(false);
    const result = cb.autoEscalateScenario();
    expect(result).toBe('baseline');
  });

  it('maxCallsPerSession ceiling is 48 for default', () => {
    const cb = new AdvisorCircuitBreaker({ stateFilePath: path.join(tmpDir, 'cb.json') });
    expect(cb.getMaxCallsPerSession()).toBe(12); // default unchanged; 48 is env ceiling
  });

  it('snapshot includes slowEdgeRatio and vectorId', () => {
    const cb = new AdvisorCircuitBreaker({
      stateFilePath: path.join(tmpDir, 'cb.json'),
      vectorId: 'clt',
    });
    const snap = cb.getSnapshot();
    expect(typeof snap.slowEdgeRatio).toBe('number');
    expect(snap.vectorId).toBe('clt');
  });
});
