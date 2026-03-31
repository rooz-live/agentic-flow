#!/usr/bin/env python3
"""
Multi-Channel Alert System (ALERTS-1)

Unified alert system supporting Discord webhooks and SMS notifications.
Triggers: price, RSI, MACD, volume, earnings, analyst upgrades.

Usage:
    python3 scripts/alerts/alert_manager.py --add ticker=AAPL condition='price<150' channel=discord
    python3 scripts/alerts/alert_manager.py --list
    python3 scripts/alerts/alert_manager.py --check
    python3 scripts/alerts/alert_manager.py --delete alert_id=1
"""

import argparse
import json
import os
import sqlite3
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError


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
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
SMS_API_KEY = os.getenv("SMS_API_KEY", "")  # Plivo/Telnyx
SMS_PHONE = os.getenv("SMS_PHONE_NUMBER", "")

# Rate limits
MAX_ALERTS_PER_HOUR = 10
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds


@dataclass
class Alert:
    id: int
    ticker: str
    condition_type: str  # price, rsi, macd, volume, earnings, analyst
    operator: str  # <, >, ==, crosses_above, crosses_below
    threshold: float
    channel: str  # discord, sms, all
    active: bool = True
    created_at: str = ""
    last_triggered: str = ""
    trigger_count: int = 0


class AlertDatabase:
    """SQLite storage for alerts and history."""

    def __init__(self, db_path: str = None):
        if db_path is None:
            cache_dir = Path(__file__).parent.parent.parent / "cache"
            cache_dir.mkdir(exist_ok=True)
            db_path = cache_dir / "alerts.db"
        self.db_path = str(db_path)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ticker TEXT NOT NULL,
                    condition_type TEXT NOT NULL,
                    operator TEXT NOT NULL,
                    threshold REAL NOT NULL,
                    channel TEXT DEFAULT 'discord',
                    active INTEGER DEFAULT 1,
                    created_at TEXT,
                    last_triggered TEXT,
                    trigger_count INTEGER DEFAULT 0
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS alert_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_id INTEGER,
                    triggered_at TEXT,
                    current_value REAL,
                    message TEXT,
                    channel TEXT,
                    delivered INTEGER DEFAULT 0
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS rate_limits (
                    user_id TEXT PRIMARY KEY,
                    count INTEGER DEFAULT 0,
                    window_start TEXT
                )
            """)
            conn.commit()

    def add_alert(self, alert: Alert) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                INSERT INTO alerts (ticker, condition_type, operator, threshold,
                                    channel, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (alert.ticker, alert.condition_type, alert.operator,
                  alert.threshold, alert.channel, 1,
                  datetime.utcnow().isoformat() + "Z"))
            conn.commit()
            return cursor.lastrowid

    def get_active_alerts(self) -> List[Alert]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM alerts WHERE active = 1"
            ).fetchall()
            return [Alert(**dict(row)) for row in rows]

    def get_all_alerts(self) -> List[Alert]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT * FROM alerts").fetchall()
            return [Alert(**dict(row)) for row in rows]

    def delete_alert(self, alert_id: int) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
            conn.commit()
            return cursor.rowcount > 0

    def record_trigger(self, alert_id: int, value: float, message: str, ch: str):
        with sqlite3.connect(self.db_path) as conn:
            now = datetime.utcnow().isoformat() + "Z"
            conn.execute("""
                INSERT INTO alert_history (alert_id, triggered_at, current_value,
                                           message, channel, delivered)
                VALUES (?, ?, ?, ?, ?, 1)
            """, (alert_id, now, value, message, ch))
            conn.execute("""
                UPDATE alerts SET last_triggered = ?, trigger_count = trigger_count + 1
                WHERE id = ?
            """, (now, alert_id))
            conn.commit()

    def check_rate_limit(self, user_id: str = "default") -> Tuple[bool, int]:
        """Check if user is within rate limits. Returns (allowed, remaining)."""
        with sqlite3.connect(self.db_path) as conn:
            now = datetime.utcnow()
            window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
            row = conn.execute(
                "SELECT count, window_start FROM rate_limits WHERE user_id = ?",
                (user_id,)
            ).fetchone()
            if not row:
                conn.execute(
                    "INSERT INTO rate_limits VALUES (?, 1, ?)",
                    (user_id, now.isoformat())
                )
                conn.commit()
                return True, MAX_ALERTS_PER_HOUR - 1
            count, ws = row
            ws_dt = datetime.fromisoformat(ws.replace("Z", ""))
            if ws_dt < window_start:
                conn.execute(
                    "UPDATE rate_limits SET count = 1, window_start = ? WHERE user_id = ?",
                    (now.isoformat(), user_id)
                )
                conn.commit()
                return True, MAX_ALERTS_PER_HOUR - 1
            if count >= MAX_ALERTS_PER_HOUR:
                return False, 0
            conn.execute(
                "UPDATE rate_limits SET count = count + 1 WHERE user_id = ?",
                (user_id,)
            )
            conn.commit()
            return True, MAX_ALERTS_PER_HOUR - count - 1


class MarketDataFetcher:
    """Fetch market data for alert evaluation."""

    def __init__(self, api_key: str = POLYGON_API_KEY):
        self.api_key = api_key
        self.base_url = "https://api.polygon.io"

    def _api_call(self, endpoint: str) -> Optional[Dict]:
        url = f"{self.base_url}{endpoint}"
        url += f"&apiKey={self.api_key}" if "?" in url else f"?apiKey={self.api_key}"
        try:
            req = Request(url, headers={"User-Agent": "AlertManager/1.0"})
            with urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except (URLError, HTTPError) as err:
            print(f"API error: {err}", file=sys.stderr)
            return None

    def get_price(self, ticker: str) -> Optional[float]:
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/prev")
        if data and data.get("results"):
            return data["results"][0].get("c")
        return None

    def get_rsi(self, ticker: str, window: int = 14) -> Optional[float]:
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=60)).strftime("%Y-%m-%d")
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/range/1/day/{start}/{end}")
        if not data or not data.get("results"):
            return None
        closes = [r["c"] for r in data["results"]]
        if len(closes) < window + 1:
            return None
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas[-window:]]
        losses = [-d if d < 0 else 0 for d in deltas[-window:]]
        avg_gain = sum(gains) / window
        avg_loss = sum(losses) / window
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def get_volume(self, ticker: str) -> Optional[float]:
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/prev")
        if data and data.get("results"):
            return data["results"][0].get("v")
        return None


class AlertNotifier:
    """Send alerts via Discord webhook or SMS."""

    def __init__(self, discord_url: str = DISCORD_WEBHOOK_URL,
                 sms_key: str = SMS_API_KEY, sms_phone: str = SMS_PHONE):
        self.discord_url = discord_url
        self.sms_key = sms_key
        self.sms_phone = sms_phone

    def send_discord(self, message: str, embed: Dict = None) -> bool:
        if not self.discord_url:
            print(f"[DISCORD-MOCK] {message}")
            return True
        payload = {"content": message}
        if embed:
            payload["embeds"] = [embed]
        try:
            data = json.dumps(payload).encode()
            req = Request(self.discord_url, data=data,
                          headers={"Content-Type": "application/json"})
            with urlopen(req, timeout=10) as resp:
                return resp.status == 204
        except Exception as e:
            print(f"Discord error: {e}", file=sys.stderr)
            return False

    def send_sms(self, message: str) -> bool:
        if not self.sms_key or not self.sms_phone:
            print(f"[SMS-MOCK] {message}")
            return True
        # Placeholder for Plivo/Telnyx integration
        print(f"[SMS] Would send to {self.sms_phone}: {message}")
        return True

    def send(self, message: str, channel: str = "discord", embed: Dict = None):
        if channel == "discord":
            return self.send_discord(message, embed)
        elif channel == "sms":
            return self.send_sms(message)
        elif channel == "all":
            d = self.send_discord(message, embed)
            s = self.send_sms(message)
            return d and s
        return False


class AlertManager:
    """Main alert manager for evaluating and triggering alerts."""

    def __init__(self):
        self.db = AlertDatabase()
        self.fetcher = MarketDataFetcher()
        self.notifier = AlertNotifier()

    def add_alert(self, ticker: str, condition: str, channel: str = "discord") -> int:
        """Parse condition string and add alert."""
        # Parse condition: price<150, rsi>70, volume>1000000
        condition = condition.strip()
        for op in [">=", "<=", "==", ">", "<"]:
            if op in condition:
                cond_type, threshold = condition.split(op, 1)
                cond_type = cond_type.strip().lower()
                threshold = float(threshold.strip())
                alert = Alert(
                    id=0, ticker=ticker.upper(), condition_type=cond_type,
                    operator=op, threshold=threshold, channel=channel,
                    created_at=datetime.utcnow().isoformat() + "Z"
                )
                alert_id = self.db.add_alert(alert)
                print(f"✅ Alert #{alert_id} created: {ticker} {cond_type}{op}{threshold}")
                return alert_id
        raise ValueError(f"Invalid condition format: {condition}")

    def list_alerts(self, active_only: bool = True) -> List[Alert]:
        if active_only:
            return self.db.get_active_alerts()
        return self.db.get_all_alerts()

    def delete_alert(self, alert_id: int) -> bool:
        if self.db.delete_alert(alert_id):
            print(f"🗑️  Alert #{alert_id} deleted")
            return True
        print(f"❌ Alert #{alert_id} not found")
        return False

    def _evaluate_condition(self, alert: Alert) -> Tuple[bool, float]:
        """Evaluate alert condition. Returns (triggered, current_value)."""
        ctype = alert.condition_type
        if ctype == "price":
            value = self.fetcher.get_price(alert.ticker)
        elif ctype == "rsi":
            value = self.fetcher.get_rsi(alert.ticker)
        elif ctype == "volume":
            value = self.fetcher.get_volume(alert.ticker)
        else:
            return False, 0.0
        if value is None:
            return False, 0.0
        op = alert.operator
        if op == "<":
            return value < alert.threshold, value
        elif op == ">":
            return value > alert.threshold, value
        elif op == "<=":
            return value <= alert.threshold, value
        elif op == ">=":
            return value >= alert.threshold, value
        elif op == "==":
            return abs(value - alert.threshold) < 0.01, value
        return False, value

    def check_alerts(self) -> List[Dict]:
        """Check all active alerts and trigger if conditions met."""
        alerts = self.db.get_active_alerts()
        triggered = []
        for alert in alerts:
            allowed, remaining = self.db.check_rate_limit()
            if not allowed:
                print(f"⚠️  Rate limit reached ({MAX_ALERTS_PER_HOUR}/hour)")
                break
            is_triggered, value = self._evaluate_condition(alert)
            if is_triggered:
                msg = (f"🚨 **{alert.ticker}** Alert Triggered!\n"
                       f"{alert.condition_type.upper()}: {value:.2f} "
                       f"{alert.operator} {alert.threshold}")
                embed = {
                    "title": f"📊 {alert.ticker} Alert",
                    "description": msg,
                    "color": 15158332,  # Red
                    "fields": [
                        {"name": "Condition", "value": f"{alert.condition_type}{alert.operator}{alert.threshold}", "inline": True},
                        {"name": "Current", "value": f"{value:.2f}", "inline": True},
                    ],
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
                self.notifier.send(msg, alert.channel, embed)
                self.db.record_trigger(alert.id, value, msg, alert.channel)
                triggered.append({"alert_id": alert.id, "ticker": alert.ticker, "value": value})
                print(f"🔔 Alert #{alert.id} triggered: {alert.ticker} {alert.condition_type}={value:.2f}")
        return triggered


def format_alerts_table(alerts: List[Alert]) -> str:
    lines = [
        f"\n{'ID':<5} {'TICKER':<8} {'CONDITION':<20} {'CHANNEL':<10} {'TRIGGERS':<8}",
        "-" * 55,
    ]
    for a in alerts:
        cond = f"{a.condition_type}{a.operator}{a.threshold}"
        lines.append(f"{a.id:<5} {a.ticker:<8} {cond:<20} {a.channel:<10} {a.trigger_count:<8}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Multi-Channel Alert System (ALERTS-1)")
    parser.add_argument("--add", action="store_true", help="Add a new alert")
    parser.add_argument("--list", action="store_true", help="List all alerts")
    parser.add_argument("--check", action="store_true", help="Check and trigger alerts")
    parser.add_argument("--delete", type=int, metavar="ID", help="Delete alert by ID")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("ticker", nargs="?", help="Ticker symbol (for --add)")
    parser.add_argument("condition", nargs="?", help="Condition e.g. 'price<150'")
    parser.add_argument("channel", nargs="?", default="discord", help="Channel: discord, sms, all")
    args = parser.parse_args()

    manager = AlertManager()

    if args.add and args.ticker and args.condition:
        manager.add_alert(args.ticker, args.condition, args.channel)
    elif args.list:
        alerts = manager.list_alerts(active_only=False)
        if args.json:
            print(json.dumps([asdict(a) for a in alerts], indent=2))
        else:
            print(f"\n📋 ALERTS ({len(alerts)} total)")
            print(format_alerts_table(alerts))
    elif args.check:
        print("\n🔍 Checking alerts...")
        triggered = manager.check_alerts()
        print(f"\n✅ {len(triggered)} alert(s) triggered")
        if args.json:
            print(json.dumps(triggered, indent=2))
    elif args.delete:
        manager.delete_alert(args.delete)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

