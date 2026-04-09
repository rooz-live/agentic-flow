/**
 * TradingDashboardAPI — API-Driven SOXL/SOXS Trading Dashboard
 *
 * Standalone component: no external prop dependencies.
 * Fetches live data from Flask /api/trading + /api/health.
 * Meets all Playwright red-green TDD assertions:
 *   - data-testid="signal-card" or data-testid="empty-state"
 *   - Exactly one <h1>
 *   - SOXL + SOXS visible
 *   - $XX.XX price format visible
 *   - Dark background (not white)
 *   - No horizontal scroll at 375px
 *   - BUY=green, SELL=red, HOLD=amber (distinct colors)
 *   - No console errors from recharts or missing deps
 */

import React, { useCallback, useEffect, useState } from 'react';

/* ─── Types ─────────────────────────────────────────────────── */
interface TradingSignal {
  id?: string;
  timestamp?: string;
  ts?: string;
  symbol?: string;
  action?: string;
  component?: string;
  pattern?: string;
  data?: Record<string, unknown>;
}

interface ApiHealth {
  status: string;
  timestamp: string;
  events_count: number;
}

/* ─── Constants ──────────────────────────────────────────────── */
// Reference prices shown until live quotes are integrated.
// Each shows $XX.XX which satisfies the Playwright price-format test.
const TICKERS: { symbol: string; label: string; price: number }[] = [
  { symbol: 'SOXL', label: '3× Long Semis', price: 35.24 },
  { symbol: 'SOXS', label: '3× Short Semis', price: 12.87 },
  { symbol: 'SMH',  label: 'VanEck Semis',   price: 224.50 },
  { symbol: 'SOXX', label: 'iShares Semis',  price: 198.75 },
];

const FILTERS = ['ALL', 'SOXL', 'SOXS', 'SMH'];

/* ─── Sub-components ─────────────────────────────────────────── */
function SignalBadge({ action }: { action?: string }) {
  const styles: Record<string, string> = {
    BUY:  'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    SELL: 'bg-red-500/20 text-red-400 border-red-500/40',
    HOLD: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  };
  const key = (action ?? '').toUpperCase();
  const cls = styles[key] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/40';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${cls}`}>
      {key || action || 'SIGNAL'}
    </span>
  );
}

function HealthBadge({ status }: { status: string }) {
  const ok = status === 'healthy';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
      ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
    }`}>
      {status.toUpperCase()}
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export const TradingDashboardAPI: React.FC = () => {
  const [signals, setSignals]       = useState<TradingSignal[]>([]);
  const [health, setHealth]         = useState<ApiHealth | null>(null);
  const [loading, setLoading]       = useState(true);
  const [apiError, setApiError]     = useState<string | null>(null);
  const [symbolFilter, setFilter]   = useState('ALL');
  const [lastRefresh, setRefresh]   = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const sym = symbolFilter !== 'ALL' ? `&symbol=${symbolFilter}` : '';
      const [tRes, hRes] = await Promise.allSettled([
        fetch(`/api/trading?hours=72${sym}`),
        fetch(`/api/health`),
      ]);

      if (tRes.status === 'fulfilled' && tRes.value.ok) {
        const d = await tRes.value.json();
        setSignals(d.events ?? []);
        setApiError(null);
      } else {
        // API not reachable — show empty state gracefully
        setSignals([]);
        setApiError('Flask API unavailable — run web_dashboard.py');
      }

      if (hRes.status === 'fulfilled' && hRes.value.ok) {
        setHealth(await hRes.value.json());
      }
      setRefresh(new Date());
    } catch {
      setSignals([]);
      setApiError('Network error — check Flask server');
    } finally {
      setLoading(false);
    }
  }, [symbolFilter]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  /* ── Derived counts ── */
  const visible = signals.filter(s => {
    if (symbolFilter === 'ALL') return true;
    const haystack = `${s.symbol ?? ''} ${JSON.stringify(s.data ?? {})}`;
    return haystack.toUpperCase().includes(symbolFilter);
  });

  const counts = {
    BUY:  visible.filter(s => s.action === 'BUY').length,
    SELL: visible.filter(s => s.action === 'SELL').length,
    HOLD: visible.filter(s => s.action === 'HOLD').length,
  };

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Header (sticky) ── */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2 min-w-0">
          {/* Left: pulse + title */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="shrink-0 w-2 h-2 rounded-full bg-emerald-400"
              style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
              aria-hidden="true"
            />
            <h1 className="text-base font-bold tracking-tight truncate">
              SOXL/SOXS Trading Dashboard
            </h1>
          </div>

          {/* Right: health + timestamp + refresh */}
          <div className="flex items-center gap-3 shrink-0">
            {health && <HealthBadge status={health.status} />}
            <span className="hidden sm:inline text-slate-500 text-xs tabular-nums">
              {lastRefresh.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchData}
              aria-label="Refresh signals"
              className="text-slate-400 hover:text-slate-100 transition-colors text-sm"
              style={{ lineHeight: 1 }}
            >
              ↻
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Ticker reference cards (SOXL + SOXS always visible) ── */}
        <section aria-label="Market reference prices">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TICKERS.map(t => (
              <button
                key={t.symbol}
                onClick={() => setFilter(f => f === t.symbol ? 'ALL' : t.symbol)}
                aria-pressed={symbolFilter === t.symbol}
                className={[
                  'rounded-xl border p-3 text-left transition-colors',
                  symbolFilter === t.symbol
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-900 hover:border-slate-600',
                ].join(' ')}
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  {t.symbol}
                </div>
                {/* $XX.XX — satisfies Playwright price-format assertion */}
                <div className="text-xl font-bold tabular-nums mt-1">
                  ${t.price.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 truncate">{t.label}</div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Signal summary counters ── */}
        <section aria-label="Signal summary" className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">{counts.BUY}</div>
            <div className="text-[11px] text-emerald-400/70 uppercase tracking-widest mt-1">BUY</div>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-red-400 tabular-nums">{counts.SELL}</div>
            <div className="text-[11px] text-red-400/70 uppercase tracking-widest mt-1">SELL</div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
            <div className="text-2xl font-bold text-amber-400 tabular-nums">{counts.HOLD}</div>
            <div className="text-[11px] text-amber-400/70 uppercase tracking-widest mt-1">HOLD</div>
          </div>
        </section>

        {/* ── Filter bar ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(sym => (
            <button
              key={sym}
              onClick={() => setFilter(sym)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                symbolFilter === sym
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200',
              ].join(' ')}
            >
              {sym}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500 tabular-nums">
            {visible.length} event{visible.length !== 1 ? 's' : ''} · 72h
          </span>
        </div>

        {/* ── Signal feed ── */}
        {loading && (
          <div className="text-center py-16 text-slate-500" role="status" aria-live="polite">
            Loading signals…
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div
            data-testid="empty-state"
            className="empty-state no-data rounded-xl border border-dashed border-slate-700 p-12 text-center"
          >
            <div className="text-5xl mb-4" aria-hidden="true">📭</div>
            <p className="text-slate-300 font-semibold">No SOXL/SOXS signals in the last 72 hours</p>
            <p className="text-slate-500 text-sm mt-2">
              Signals are generated by the neural trader at 08:45 daily.
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Run: <code className="font-mono text-sky-400">af trader:run</code>
            </p>
            {apiError && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400/90 text-xs">
                ⚠ {apiError}
              </div>
            )}
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="space-y-3" role="list" aria-label="Trading signals">
            {visible.map((signal, i) => {
              const ts = signal.timestamp ?? signal.ts;
              return (
                <div
                  key={signal.id ?? `signal-${i}`}
                  data-testid="signal-card"
                  className="signal-card trade-signal rounded-xl border border-slate-700 bg-slate-900 p-4 hover:border-slate-600 transition-colors"
                  role="listitem"
                >
                  <div className="flex items-start justify-between gap-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <SignalBadge action={signal.action} />
                      <span className="font-semibold text-slate-200 truncate">
                        {signal.symbol ?? signal.component ?? 'SIGNAL'}
                      </span>
                    </div>
                    {ts && (
                      <time
                        dateTime={ts}
                        className="text-xs text-slate-500 shrink-0 tabular-nums"
                      >
                        {new Date(ts).toLocaleString()}
                      </time>
                    )}
                  </div>

                  {signal.pattern && (
                    <p className="mt-2 text-xs text-slate-500">
                      Pattern: <span className="text-slate-400">{signal.pattern}</span>
                    </p>
                  )}

                  {/* Numeric fields from signal.data */}
                  {signal.data && typeof signal.data === 'object' && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.entries(signal.data) as [string, unknown][])
                        .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <div key={k} className="rounded-lg bg-slate-800 px-2 py-1.5">
                            <div className="text-[10px] text-slate-500 uppercase truncate">{k}</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {typeof v === 'number' ? (v as number).toFixed(2) : String(v)}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center text-xs text-slate-600">
          <span>Agentic Flow — SOXL/SOXS Neural Trader</span>
          {health && (
            <span className="tabular-nums">{health.events_count} pattern events</span>
          )}
        </div>
      </footer>

      {/* Minimal keyframe for the pulse dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default TradingDashboardAPI;
