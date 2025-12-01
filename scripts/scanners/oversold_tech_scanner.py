#!/usr/bin/env python3
"""
Oversold Technical Scanner (SCANNER-1)

Scans tech sector for oversold conditions using RSI, MACD, and Stochastic.
Uses Polygon.io for market data and technical indicators.

Usage:
    python3 scripts/scanners/oversold_tech_scanner.py
    python3 scripts/scanners/oversold_tech_scanner.py --rsi-max 25
    python3 scripts/scanners/oversold_tech_scanner.py --with-analyst-ratings
    python3 scripts/scanners/oversold_tech_scanner.py --json
"""

import argparse
import json
import os
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

POLYGON_API_KEY = os.getenv("DATA_MARKET_API_KEY", "")

# Tech-heavy stocks to scan (NASDAQ-100 + major tech)
TECH_UNIVERSE = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "INTC",
    "NFLX", "ADBE", "CRM", "ORCL", "CSCO", "AVGO", "QCOM", "TXN", "MU",
    "AMAT", "LRCX", "KLAC", "ASML", "NOW", "SNOW", "PLTR", "CRWD", "ZS",
    "PANW", "DDOG", "NET", "MDB", "OKTA", "TWLO", "SQ", "SHOP", "UBER",
    "LYFT", "ABNB", "COIN", "RBLX", "U", "TEAM", "WDAY", "ZM", "DOCU"
]


class OversoldScanner:
    """Scans tech stocks for oversold conditions."""
    
    def __init__(self, api_key: str = POLYGON_API_KEY):
        self.api_key = api_key
        self.base_url = "https://api.polygon.io"
    
    def _api_call(self, endpoint: str) -> Optional[Dict]:
        """Make API call to Polygon."""
        url = f"{self.base_url}{endpoint}"
        if "?" in url:
            url += f"&apiKey={self.api_key}"
        else:
            url += f"?apiKey={self.api_key}"
        try:
            req = Request(url, headers={"User-Agent": "OversoldScanner/1.0"})
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except (URLError, HTTPError) as err:
            print(f"API error for {endpoint}: {err}", file=sys.stderr)
            return None
    
    def get_rsi(self, ticker: str, window: int = 14) -> Optional[float]:
        """Get RSI for a ticker using Polygon's technical indicator."""
        data = self._api_call(
            f"/v1/indicators/rsi/{ticker}?timespan=day&window={window}&limit=1"
        )
        if data and data.get("results", {}).get("values"):
            return data["results"]["values"][0].get("value")
        return None
    
    def get_macd(self, ticker: str) -> Optional[Dict]:
        """Get MACD for a ticker."""
        data = self._api_call(
            f"/v1/indicators/macd/{ticker}?timespan=day&limit=1"
        )
        if data and data.get("results", {}).get("values"):
            v = data["results"]["values"][0]
            return {
                "macd": v.get("value"),
                "signal": v.get("signal"),
                "histogram": v.get("histogram"),
            }
        return None
    
    def get_sma(self, ticker: str, window: int = 50) -> Optional[float]:
        """Get SMA for a ticker."""
        data = self._api_call(
            f"/v1/indicators/sma/{ticker}?timespan=day&window={window}&limit=1"
        )
        if data and data.get("results", {}).get("values"):
            return data["results"]["values"][0].get("value")
        return None
    
    def get_quote(self, ticker: str) -> Optional[Dict]:
        """Get current quote for a ticker."""
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/prev")
        if data and data.get("results"):
            r = data["results"][0]
            return {
                "price": r.get("c"),
                "open": r.get("o"),
                "high": r.get("h"),
                "low": r.get("l"),
                "volume": r.get("v"),
                "vwap": r.get("vw"),
            }
        return None
    
    def scan(self, rsi_max: int = 30, stoch_max: int = 20,
             tickers: List[str] = None) -> List[Dict]:
        """Scan tickers for oversold conditions."""
        tickers = tickers or TECH_UNIVERSE
        oversold = []
        
        print(f"Scanning {len(tickers)} tickers...", file=sys.stderr)
        for i, ticker in enumerate(tickers):
            if (i + 1) % 10 == 0:
                print(f"Progress: {i+1}/{len(tickers)}", file=sys.stderr)
            
            rsi = self.get_rsi(ticker)
            if rsi is None or rsi > rsi_max:
                continue
            
            quote = self.get_quote(ticker)
            macd = self.get_macd(ticker)
            sma50 = self.get_sma(ticker, 50)
            sma200 = self.get_sma(ticker, 200)
            
            # Calculate stochastic approximation from price data
            stoch = None
            if quote and quote.get("high") and quote.get("low"):
                h, l, c = quote["high"], quote["low"], quote["price"]
                if h != l:
                    stoch = ((c - l) / (h - l)) * 100
            
            # Check MACD bearish crossover (histogram negative = bearish)
            macd_bearish = macd and macd.get("histogram", 0) < 0
            
            result = {
                "ticker": ticker,
                "price": quote.get("price") if quote else None,
                "rsi": round(rsi, 2),
                "stochastic": round(stoch, 2) if stoch else None,
                "macd_bearish": macd_bearish,
                "macd_histogram": macd.get("histogram") if macd else None,
                "sma50": round(sma50, 2) if sma50 else None,
                "sma200": round(sma200, 2) if sma200 else None,
                "volume": quote.get("volume") if quote else None,
            }
            oversold.append(result)
        
        # Sort by RSI (most oversold first)
        oversold.sort(key=lambda x: x["rsi"])
        return oversold


def main():
    parser = argparse.ArgumentParser(
        description="Scan tech stocks for oversold conditions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                      # Default scan (RSI < 30)
  %(prog)s --rsi-max 25         # More aggressive (RSI < 25)
  %(prog)s --tickers AAPL,MSFT  # Specific tickers
  %(prog)s --json               # Output as JSON
        """
    )
    parser.add_argument("--rsi-max", type=int, default=30,
                        help="Maximum RSI threshold (default: 30)")
    parser.add_argument("--stoch-max", type=int, default=20,
                        help="Maximum Stochastic threshold (default: 20)")
    parser.add_argument("--tickers", type=str,
                        help="Comma-separated list of tickers")
    parser.add_argument("--json", action="store_true",
                        help="Output as JSON")
    parser.add_argument("--with-analyst-ratings", action="store_true",
                        help="Include analyst ratings (SCANNER-2)")
    parser.add_argument("--min-buys", type=int, default=3,
                        help="Min buy ratings (with --with-analyst-ratings)")

    args = parser.parse_args()

    if not POLYGON_API_KEY:
        print("Error: DATA_MARKET_API_KEY not set", file=sys.stderr)
        print("Set in config/.env.production or environment", file=sys.stderr)
        return 1

    scanner = OversoldScanner()

    tickers = args.tickers.split(",") if args.tickers else None
    results = scanner.scan(rsi_max=args.rsi_max, stoch_max=args.stoch_max,
                           tickers=tickers)

    # Add analyst ratings if requested (SCANNER-2 integration)
    if args.with_analyst_ratings:
        try:
            from scripts.data.analyst_ratings_fetcher import AnalystRatingsFetcher
            analyst = AnalystRatingsFetcher()
            for r in results:
                rating = analyst.get_rating(r["ticker"])
                r["analyst_rating"] = rating
            # Filter by min buys
            results = [r for r in results
                       if r.get("analyst_rating", {}).get("buy_count", 0) >= args.min_buys]
        except ImportError:
            print("Warning: analyst_ratings_fetcher not available", file=sys.stderr)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"\n🔍 OVERSOLD TECH SCANNER (RSI < {args.rsi_max})")
        print(f"Found: {len(results)} oversold stocks")
        print("=" * 70)
        print(f"{'Ticker':<8} {'Price':>10} {'RSI':>6} {'Stoch':>7} {'MACD':>8} {'SMA50':>10}")
        print("-" * 70)
        for r in results[:20]:
            price = f"${r['price']:.2f}" if r["price"] else "N/A"
            stoch = f"{r['stochastic']:.1f}" if r["stochastic"] else "N/A"
            macd = "📉" if r["macd_bearish"] else "📈"
            sma50 = f"${r['sma50']:.2f}" if r["sma50"] else "N/A"
            print(f"{r['ticker']:<8} {price:>10} {r['rsi']:>6.1f} {stoch:>7} {macd:>8} {sma50:>10}")
        if len(results) > 20:
            print(f"... and {len(results) - 20} more")

        # Summary
        print("\n📊 SUMMARY")
        print("-" * 40)
        avg_rsi = sum(r["rsi"] for r in results) / len(results) if results else 0
        macd_bearish = sum(1 for r in results if r["macd_bearish"])
        print(f"Average RSI: {avg_rsi:.1f}")
        print(f"MACD Bearish: {macd_bearish}/{len(results)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

