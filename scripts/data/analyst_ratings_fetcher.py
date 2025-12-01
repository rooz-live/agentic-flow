#!/usr/bin/env python3
"""
Analyst Ratings Fetcher (SCANNER-2)

Fetches analyst ratings and recommendations from Finnhub.
Integrates with oversold scanner to filter by buy ratings.

Usage:
    python3 scripts/data/analyst_ratings_fetcher.py --ticker AAPL
    python3 scripts/data/analyst_ratings_fetcher.py --tickers AAPL,MSFT,GOOGL
    python3 scripts/data/analyst_ratings_fetcher.py --json
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

# Load environment
def load_env():
    env_path = Path(__file__).parent.parent.parent / "config" / ".env.production"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    if "#" in value:
                        value = value.split("#")[0]
                    os.environ.setdefault(key.strip(), value.strip())

load_env()

FINNHUB_API_KEY = os.getenv("DATA_ANALYST_API_KEY", "")
CACHE_DB = Path(__file__).parent.parent.parent / "cache" / "analyst_ratings.db"
CACHE_TTL_HOURS = 12


class AnalystRatingsFetcher:
    """Fetches and caches analyst ratings from Finnhub."""
    
    def __init__(self, api_key: str = FINNHUB_API_KEY):
        self.api_key = api_key
        self.base_url = "https://finnhub.io/api/v1"
        self._init_cache()
    
    def _init_cache(self):
        """Initialize SQLite cache."""
        CACHE_DB.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(CACHE_DB))
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ratings_cache (
                ticker TEXT PRIMARY KEY,
                buy_count INTEGER,
                hold_count INTEGER,
                sell_count INTEGER,
                strong_buy INTEGER,
                strong_sell INTEGER,
                price_target REAL,
                target_high REAL,
                target_low REAL,
                consensus TEXT,
                fetched_at TEXT
            )
        """)
        conn.commit()
        conn.close()
    
    def _api_call(self, endpoint: str) -> Optional[Dict]:
        """Make API call to Finnhub."""
        url = f"{self.base_url}{endpoint}&token={self.api_key}"
        try:
            req = Request(url, headers={"User-Agent": "AnalystBot/1.0"})
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except (URLError, HTTPError) as err:
            print(f"Finnhub API error: {err}", file=sys.stderr)
            return None
    
    def _get_from_cache(self, ticker: str) -> Optional[Dict]:
        """Get rating from cache if valid."""
        conn = sqlite3.connect(str(CACHE_DB))
        cur = conn.execute(
            "SELECT * FROM ratings_cache WHERE ticker = ?", (ticker.upper(),)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        fetched = datetime.fromisoformat(row[10])
        if datetime.now() - fetched > timedelta(hours=CACHE_TTL_HOURS):
            return None
        return {
            "ticker": row[0],
            "buy_count": row[1],
            "hold_count": row[2],
            "sell_count": row[3],
            "strong_buy": row[4],
            "strong_sell": row[5],
            "price_target": row[6],
            "target_high": row[7],
            "target_low": row[8],
            "consensus": row[9],
        }
    
    def _save_to_cache(self, rating: Dict):
        """Save rating to cache."""
        conn = sqlite3.connect(str(CACHE_DB))
        conn.execute("""
            INSERT OR REPLACE INTO ratings_cache
            (ticker, buy_count, hold_count, sell_count, strong_buy, strong_sell,
             price_target, target_high, target_low, consensus, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rating["ticker"], rating["buy_count"], rating["hold_count"],
            rating["sell_count"], rating["strong_buy"], rating["strong_sell"],
            rating["price_target"], rating["target_high"], rating["target_low"],
            rating["consensus"], datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()
    
    def get_rating(self, ticker: str) -> Optional[Dict]:
        """Get analyst rating for a ticker."""
        # Check cache first
        cached = self._get_from_cache(ticker)
        if cached:
            return cached
        
        # Fetch recommendation trends
        recs = self._api_call(f"/recommendation?symbol={ticker.upper()}")
        if not recs or not isinstance(recs, list) or len(recs) == 0:
            return None
        
        latest = recs[0]  # Most recent month
        
        # Fetch price target
        target_data = self._api_call(f"/price-target?symbol={ticker.upper()}")
        price_target = target_data.get("targetMean") if target_data else None
        target_high = target_data.get("targetHigh") if target_data else None
        target_low = target_data.get("targetLow") if target_data else None

        # Determine consensus
        buy = latest.get("buy", 0) + latest.get("strongBuy", 0)
        sell = latest.get("sell", 0) + latest.get("strongSell", 0)
        hold = latest.get("hold", 0)
        total = buy + sell + hold
        if total == 0:
            consensus = "N/A"
        elif buy > sell * 2:
            consensus = "Strong Buy"
        elif buy > sell:
            consensus = "Buy"
        elif sell > buy:
            consensus = "Sell"
        else:
            consensus = "Hold"

        rating = {
            "ticker": ticker.upper(),
            "buy_count": buy,
            "hold_count": hold,
            "sell_count": sell,
            "strong_buy": latest.get("strongBuy", 0),
            "strong_sell": latest.get("strongSell", 0),
            "price_target": price_target,
            "target_high": target_high,
            "target_low": target_low,
            "consensus": consensus,
        }

        self._save_to_cache(rating)
        return rating

    def get_ratings(self, tickers: List[str]) -> List[Dict]:
        """Get ratings for multiple tickers."""
        results = []
        for ticker in tickers:
            rating = self.get_rating(ticker)
            if rating:
                results.append(rating)
        return results


def main():
    parser = argparse.ArgumentParser(
        description="Fetch analyst ratings from Finnhub",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --ticker AAPL            # Single ticker
  %(prog)s --tickers AAPL,MSFT      # Multiple tickers
  %(prog)s --json                   # Output as JSON
        """
    )
    parser.add_argument("--ticker", type=str, help="Single ticker")
    parser.add_argument("--tickers", type=str, help="Comma-separated tickers")
    parser.add_argument("--json", action="store_true", help="JSON output")

    args = parser.parse_args()

    if not FINNHUB_API_KEY:
        print("Error: DATA_ANALYST_API_KEY not set", file=sys.stderr)
        return 1

    fetcher = AnalystRatingsFetcher()

    if args.ticker:
        tickers = [args.ticker]
    elif args.tickers:
        tickers = args.tickers.split(",")
    else:
        print("Error: Specify --ticker or --tickers", file=sys.stderr)
        return 1

    results = fetcher.get_ratings(tickers)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"\n📊 ANALYST RATINGS")
        print("=" * 70)
        hdr = f"{'Ticker':<8} {'Buy':>6} {'Hold':>6} {'Sell':>6} {'Target':>10} {'Consensus':<12}"
        print(hdr)
        print("-" * 70)
        for r in results:
            target = f"${r['price_target']:.2f}" if r["price_target"] else "N/A"
            print(f"{r['ticker']:<8} {r['buy_count']:>6} {r['hold_count']:>6} "
                  f"{r['sell_count']:>6} {target:>10} {r['consensus']:<12}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

