#!/usr/bin/env python3
"""
Earnings Calendar Fetcher (EARNINGS-1)

Provider-agnostic earnings calendar with SQLite caching.
Supports: FMP (FinancialModelingPrep), Polygon, Finnhub

Usage:
    python3 scripts/data/earnings_calendar_fetcher.py --days 30
    python3 scripts/data/earnings_calendar_fetcher.py --ticker AAPL
    python3 scripts/data/earnings_calendar_fetcher.py --json
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

# Load environment from config/.env.production
def load_env():
    env_path = Path(__file__).parent.parent.parent / "config" / ".env.production"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    # Strip inline comments
                    if "#" in value:
                        value = value.split("#")[0]
                    os.environ.setdefault(key.strip(), value.strip())

load_env()

PROVIDER = os.getenv("DATA_EARNINGS_PROVIDER", "fmp")
API_KEY = os.getenv("DATA_EARNINGS_API_KEY", "")
CACHE_DB = Path(__file__).parent.parent.parent / "cache" / "earnings_calendar.db"
CACHE_TTL_HOURS = 24


class EarningsCalendarFetcher:
    """Fetches and caches earnings calendar data from multiple providers."""
    
    def __init__(self, provider: str = PROVIDER, api_key: str = API_KEY):
        self.provider = provider.lower()
        self.api_key = api_key
        self._init_cache()
    
    def _init_cache(self):
        """Initialize SQLite cache database."""
        CACHE_DB.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(CACHE_DB))
        conn.execute("""
            CREATE TABLE IF NOT EXISTS earnings_cache (
                id INTEGER PRIMARY KEY,
                ticker TEXT,
                date TEXT,
                time TEXT,
                eps_estimate REAL,
                eps_actual REAL,
                revenue_estimate REAL,
                revenue_actual REAL,
                fetched_at TEXT,
                provider TEXT
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings_cache(date)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_earnings_ticker ON earnings_cache(ticker)
        """)
        conn.commit()
        conn.close()
    
    def _is_cache_valid(self) -> bool:
        """Check if cache is still valid (within TTL)."""
        conn = sqlite3.connect(str(CACHE_DB))
        cur = conn.execute(
            "SELECT MAX(fetched_at) FROM earnings_cache WHERE provider = ?",
            (self.provider,)
        )
        row = cur.fetchone()
        conn.close()
        if not row or not row[0]:
            return False
        fetched = datetime.fromisoformat(row[0])
        return datetime.now() - fetched < timedelta(hours=CACHE_TTL_HOURS)
    
    def _fetch_from_fmp(self, from_date: str, to_date: str) -> List[Dict]:
        """Fetch earnings from FinancialModelingPrep."""
        url = (f"https://financialmodelingprep.com/api/v3/earning_calendar"
               f"?from={from_date}&to={to_date}&apikey={self.api_key}")
        try:
            req = Request(url, headers={"User-Agent": "EarningsBot/1.0"})
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
                return [{
                    "ticker": e.get("symbol", ""),
                    "date": e.get("date", ""),
                    "time": e.get("time", "bmo"),
                    "eps_estimate": e.get("epsEstimated"),
                    "eps_actual": e.get("eps"),
                    "revenue_estimate": e.get("revenueEstimated"),
                    "revenue_actual": e.get("revenue"),
                } for e in data if e.get("symbol")]
        except (URLError, HTTPError) as err:
            print(f"FMP API error: {err}", file=sys.stderr)
            return []
    
    def _fetch_from_polygon(self, from_date: str, to_date: str) -> List[Dict]:
        """Fetch earnings from Polygon.io."""
        # Polygon uses /v2/reference/dividends for calendar events
        # For earnings, we use the ticker events endpoint
        url = (f"https://api.polygon.io/v3/reference/tickers?market=stocks"
               f"&date={from_date}&apiKey={self.api_key}&limit=1000")
        # Note: Polygon's earnings calendar requires a higher tier subscription
        # Fallback to FMP for now
        print("Polygon earnings calendar requires paid tier, using FMP", file=sys.stderr)
        return self._fetch_from_fmp(from_date, to_date)
    
    def _fetch_from_finnhub(self, from_date: str, to_date: str) -> List[Dict]:
        """Fetch earnings from Finnhub."""
        url = (f"https://finnhub.io/api/v1/calendar/earnings"
               f"?from={from_date}&to={to_date}&token={self.api_key}")
        try:
            req = Request(url, headers={"User-Agent": "EarningsBot/1.0"})
            with urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
                earnings = data.get("earningsCalendar", [])
                return [{
                    "ticker": e.get("symbol", ""),
                    "date": e.get("date", ""),
                    "time": e.get("hour", "bmo"),
                    "eps_estimate": e.get("epsEstimate"),
                    "eps_actual": e.get("epsActual"),
                    "revenue_estimate": e.get("revenueEstimate"),
                    "revenue_actual": e.get("revenueActual"),
                } for e in earnings if e.get("symbol")]
        except (URLError, HTTPError) as err:
            print(f"Finnhub API error: {err}", file=sys.stderr)
            return []

    def fetch(self, days: int = 30, force_refresh: bool = False) -> List[Dict]:
        """Fetch earnings calendar for the next N days."""
        if not force_refresh and self._is_cache_valid():
            return self._get_from_cache(days)

        from_date = datetime.now().strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

        if self.provider == "fmp":
            earnings = self._fetch_from_fmp(from_date, to_date)
        elif self.provider == "polygon":
            earnings = self._fetch_from_polygon(from_date, to_date)
        elif self.provider == "finnhub":
            earnings = self._fetch_from_finnhub(from_date, to_date)
        else:
            print(f"Unknown provider: {self.provider}", file=sys.stderr)
            return []

        self._save_to_cache(earnings)
        return earnings

    def _save_to_cache(self, earnings: List[Dict]):
        """Save earnings data to cache."""
        conn = sqlite3.connect(str(CACHE_DB))
        conn.execute("DELETE FROM earnings_cache WHERE provider = ?", (self.provider,))
        fetched_at = datetime.now().isoformat()
        for e in earnings:
            conn.execute("""
                INSERT INTO earnings_cache
                (ticker, date, time, eps_estimate, eps_actual,
                 revenue_estimate, revenue_actual, fetched_at, provider)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (e["ticker"], e["date"], e["time"], e.get("eps_estimate"),
                  e.get("eps_actual"), e.get("revenue_estimate"),
                  e.get("revenue_actual"), fetched_at, self.provider))
        conn.commit()
        conn.close()

    def _get_from_cache(self, days: int) -> List[Dict]:
        """Get earnings from cache for next N days."""
        conn = sqlite3.connect(str(CACHE_DB))
        to_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
        cur = conn.execute("""
            SELECT ticker, date, time, eps_estimate, eps_actual,
                   revenue_estimate, revenue_actual
            FROM earnings_cache
            WHERE provider = ? AND date <= ?
            ORDER BY date ASC
        """, (self.provider, to_date))
        earnings = [{
            "ticker": r[0], "date": r[1], "time": r[2],
            "eps_estimate": r[3], "eps_actual": r[4],
            "revenue_estimate": r[5], "revenue_actual": r[6],
        } for r in cur.fetchall()]
        conn.close()
        return earnings

    def get_by_ticker(self, ticker: str) -> List[Dict]:
        """Get earnings events for a specific ticker."""
        all_earnings = self.fetch()
        return [e for e in all_earnings if e["ticker"].upper() == ticker.upper()]


def main():
    parser = argparse.ArgumentParser(
        description="Fetch earnings calendar from financial data providers",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --days 30           # Next 30 days of earnings
  %(prog)s --ticker AAPL       # Earnings for AAPL only
  %(prog)s --json              # Output as JSON
  %(prog)s --refresh           # Force refresh cache
        """
    )
    parser.add_argument("--days", type=int, default=30, help="Days to fetch")
    parser.add_argument("--ticker", type=str, help="Filter by ticker")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    parser.add_argument("--refresh", action="store_true", help="Force cache refresh")
    parser.add_argument("--provider", type=str, default=PROVIDER, help="Data provider")

    args = parser.parse_args()

    if not API_KEY:
        print("Error: DATA_EARNINGS_API_KEY not set", file=sys.stderr)
        print("Set in config/.env.production or environment", file=sys.stderr)
        return 1

    fetcher = EarningsCalendarFetcher(provider=args.provider)

    if args.ticker:
        earnings = fetcher.get_by_ticker(args.ticker)
    else:
        earnings = fetcher.fetch(days=args.days, force_refresh=args.refresh)

    if args.json:
        print(json.dumps(earnings, indent=2))
    else:
        print(f"\n📅 EARNINGS CALENDAR (Next {args.days} days)")
        print(f"Provider: {fetcher.provider.upper()} | Count: {len(earnings)}")
        print("=" * 70)
        for e in earnings[:50]:  # Limit display
            time_emoji = "🌅" if e["time"] == "bmo" else "🌙"
            eps = f"Est: ${e['eps_estimate']:.2f}" if e["eps_estimate"] else ""
            print(f"{e['date']} {time_emoji} {e['ticker']:6} {eps}")
        if len(earnings) > 50:
            print(f"... and {len(earnings) - 50} more")

    return 0


if __name__ == "__main__":
    sys.exit(main())

