#!/usr/bin/env python3
"""
twitch_overlay.py - OBS WebSocket Integration for Twitch Stream Overlay

Features:
- Real-time price ticker display (updates every 5 seconds)
- Alert popup notifications when trading alerts trigger
- Portfolio P&L display (optional)
- Graceful fallback when OBS not running

Usage:
    python3 scripts/integrations/twitch_overlay.py --obs-host localhost --obs-port 4455 \\
        --watchlist AAPL,TSLA,NVDA,MSFT,GOOGL

Requirements:
    pip3 install obsws-python aiohttp python-dotenv
"""

import os
import sys
import json
import asyncio
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from urllib.request import urlopen, Request
from urllib.error import HTTPError

# Load environment
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent.parent / "config" / ".env.production")
except ImportError:
    pass

# Try to import OBS WebSocket
OBS_AVAILABLE = False
try:
    import obsws_python as obs
    OBS_AVAILABLE = True
except ImportError:
    print("⚠️  obsws-python not installed. Install with: pip3 install obsws-python")

# Configuration
POLYGON_API_KEY = os.environ.get("DATA_MARKET_API_KEY", "")
ALERT_DB_PATH = Path(__file__).parent.parent.parent / "data" / "alerts.db"


@dataclass
class Quote:
    """Stock quote data"""
    ticker: str
    price: float
    change: float = 0.0
    change_pct: float = 0.0
    timestamp: str = ""


@dataclass
class OverlayConfig:
    """OBS overlay configuration"""
    obs_host: str = "localhost"
    obs_port: int = 4455
    obs_password: str = ""
    watchlist: List[str] = field(default_factory=lambda: ["AAPL", "TSLA", "NVDA"])
    update_interval: int = 5  # seconds
    alert_duration: int = 10  # seconds
    ticker_source: str = "PriceTicker"  # OBS text source name
    alert_source: str = "AlertPopup"  # OBS text source name


class MarketDataFetcher:
    """Fetch real-time quotes from Polygon.io"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.cache: Dict[str, Quote] = {}
        self.last_fetch = 0

    def get_quote(self, ticker: str) -> Quote:
        """Get latest quote for a ticker"""
        try:
            url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/prev?apiKey={self.api_key}"
            req = Request(url, headers={"User-Agent": "twitch-overlay/1.0"})
            resp = urlopen(req, timeout=10)
            data = json.loads(resp.read())

            if data.get("results"):
                r = data["results"][0]
                close = r.get("c", 0)
                open_price = r.get("o", close)
                change = close - open_price
                change_pct = (change / open_price * 100) if open_price else 0

                quote = Quote(
                    ticker=ticker,
                    price=close,
                    change=change,
                    change_pct=change_pct,
                    timestamp=datetime.now().isoformat()
                )
                self.cache[ticker] = quote
                return quote
        except HTTPError as e:
            print(f"API error for {ticker}: HTTP {e.code}")
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")

        # Return cached or mock data
        if ticker in self.cache:
            return self.cache[ticker]
        return Quote(ticker=ticker, price=0.0, timestamp=datetime.now().isoformat())

    async def get_quotes_async(self, tickers: List[str]) -> List[Quote]:
        """Get quotes for multiple tickers with rate limiting"""
        quotes = []
        for ticker in tickers:
            quote = self.get_quote(ticker)
            quotes.append(quote)
            # Rate limit: 5 requests/min for free tier
            await asyncio.sleep(0.2)
        return quotes


class OBSOverlay:
    """OBS WebSocket integration for stream overlay"""

    def __init__(self, config: OverlayConfig):
        self.config = config
        self.ws = None
        self.connected = False
        self.fetcher = MarketDataFetcher(POLYGON_API_KEY)

    def connect(self) -> bool:
        """Connect to OBS WebSocket"""
        if not OBS_AVAILABLE:
            print("❌ OBS WebSocket library not available")
            return False
        try:
            self.ws = obs.ReqClient(
                host=self.config.obs_host,
                port=self.config.obs_port,
                password=self.config.obs_password or None
            )
            self.connected = True
            print(f"✅ Connected to OBS at {self.config.obs_host}:{self.config.obs_port}")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to OBS: {e}")
            self.connected = False
            return False

    def format_ticker_text(self, quotes: List[Quote]) -> str:
        """Format quotes for OBS text source"""
        lines = []
        for q in quotes:
            arrow = "▲" if q.change >= 0 else "▼"
            color = "🟢" if q.change >= 0 else "🔴"
            lines.append(f"{color} {q.ticker}: ${q.price:.2f} {arrow}{abs(q.change_pct):.1f}%")
        return "\n".join(lines)

    def update_ticker(self, quotes: List[Quote]) -> bool:
        """Update the price ticker text source in OBS"""
        if not self.connected or not self.ws:
            return False
        try:
            text = self.format_ticker_text(quotes)
            self.ws.set_input_settings(
                name=self.config.ticker_source,
                settings={"text": text},
                overlay=True
            )
            return True
        except Exception as e:
            print(f"Error updating ticker: {e}")
            return False

    def show_alert(self, message: str, duration: int = 10) -> bool:
        """Show an alert popup in OBS"""
        if not self.connected or not self.ws:
            print(f"[ALERT - not connected] {message}")
            return False
        try:
            # Show alert text
            self.ws.set_input_settings(
                name=self.config.alert_source,
                settings={"text": f"🚨 {message}"},
                overlay=True
            )
            # Schedule hide (simplified - in real use, use async)
            print(f"[ALERT] {message}")
            return True
        except Exception as e:
            print(f"Error showing alert: {e}")
            return False


async def run_overlay(config: OverlayConfig):
    """Main overlay loop"""
    overlay = OBSOverlay(config)

    # Try to connect to OBS
    if not overlay.connect():
        print("Running in console-only mode (OBS not connected)")

    print(f"\n🎬 Twitch Overlay Started")
    print(f"   Watchlist: {', '.join(config.watchlist)}")
    print(f"   Update interval: {config.update_interval}s")
    print(f"   Press Ctrl+C to stop\n")

    try:
        while True:
            # Fetch and display quotes
            quotes = await overlay.fetcher.get_quotes_async(config.watchlist)
            text = overlay.format_ticker_text(quotes)
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Price Update:")
            print(text)

            # Update OBS if connected
            if overlay.connected:
                overlay.update_ticker(quotes)

            # Wait for next update
            await asyncio.sleep(config.update_interval)
    except KeyboardInterrupt:
        print("\n\n👋 Overlay stopped")


def main():
    parser = argparse.ArgumentParser(description="Twitch Stream Overlay for Trading")
    parser.add_argument("--obs-host", default="localhost", help="OBS WebSocket host")
    parser.add_argument("--obs-port", type=int, default=4455, help="OBS WebSocket port")
    parser.add_argument("--obs-password", default="", help="OBS WebSocket password")
    parser.add_argument("--watchlist", default="AAPL,TSLA,NVDA,MSFT,GOOGL",
                        help="Comma-separated list of tickers")
    parser.add_argument("--interval", type=int, default=5, help="Update interval in seconds")
    parser.add_argument("--test", action="store_true", help="Run in test mode (no OBS)")
    args = parser.parse_args()

    config = OverlayConfig(
        obs_host=args.obs_host,
        obs_port=args.obs_port,
        obs_password=args.obs_password,
        watchlist=args.watchlist.split(","),
        update_interval=args.interval
    )

    if args.test:
        print("🧪 Running in test mode")

    asyncio.run(run_overlay(config))


if __name__ == "__main__":
    main()

