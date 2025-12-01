#!/usr/bin/env python3
"""
Earnings Options Strategy Analyzer (EARNINGS-2)

Analyzes optimal options strategies for upcoming earnings events.
Supports: straddle, strangle, iron condor, calendar spread

Usage:
    python3 scripts/analysis/earnings_options_strategy.py --ticker TSLA --expiry 2025-01-24
    python3 scripts/analysis/earnings_options_strategy.py --ticker AAPL --strategy straddle
    python3 scripts/analysis/earnings_options_strategy.py --ticker NVDA --json
"""

import argparse
import json
import math
import os
import sys
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


@dataclass
class OptionLeg:
    """Single option leg in a strategy."""
    type: str  # 'call' or 'put'
    strike: float
    expiry: str
    premium: float
    action: str  # 'buy' or 'sell'
    quantity: int = 1


@dataclass
class StrategyResult:
    """Analysis result for an options strategy."""
    name: str
    ticker: str
    current_price: float
    expiry: str
    legs: List[Dict]
    cost_basis: float
    max_profit: float
    max_loss: float
    breakeven_points: List[float]
    risk_reward_ratio: float
    expected_move: float
    implied_move: float
    iv_rank: float
    recommendation: str


class EarningsOptionsAnalyzer:
    """Analyzes options strategies for earnings plays."""

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
            req = Request(url, headers={"User-Agent": "EarningsOptionsAnalyzer/1.0"})
            with urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except (URLError, HTTPError) as err:
            print(f"Polygon API error: {err}", file=sys.stderr)
            return None

    def get_stock_price(self, ticker: str) -> Optional[float]:
        """Get current stock price."""
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/prev")
        if data and data.get("results"):
            return data["results"][0].get("c")  # closing price
        return None

    def get_options_chain(self, ticker: str, expiry: str) -> List[Dict]:
        """Get options chain for ticker and expiry."""
        data = self._api_call(
            f"/v3/reference/options/contracts?underlying_ticker={ticker}"
            f"&expiration_date={expiry}&limit=100"
        )
        if data and data.get("results"):
            return data["results"]
        return []

    def estimate_iv(self, ticker: str) -> float:
        """Estimate implied volatility from recent price action."""
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/range/1/day/2024-01-01/{datetime.now().strftime('%Y-%m-%d')}")
        if not data or not data.get("results"):
            return 0.35  # Default 35% IV
        prices = [r["c"] for r in data["results"][-30:]]  # Last 30 days
        if len(prices) < 2:
            return 0.35
        returns = [math.log(prices[i] / prices[i - 1]) for i in range(1, len(prices))]
        daily_vol = (sum(r ** 2 for r in returns) / len(returns)) ** 0.5
        return daily_vol * math.sqrt(252)  # Annualize

    def calculate_expected_move(self, price: float, iv: float, days_to_expiry: int) -> float:
        """Calculate expected move based on IV."""
        return price * iv * math.sqrt(days_to_expiry / 365)

    def calculate_implied_move(self, atm_call: float, atm_put: float) -> float:
        """Calculate implied move from straddle price."""
        return atm_call + atm_put

    def _estimate_option_price(self, price: float, strike: float, iv: float,
                                days: int, is_call: bool) -> float:
        """Simple Black-Scholes-like option price estimate."""
        time_value = iv * price * math.sqrt(days / 365) * 0.4
        if is_call:
            intrinsic = max(0, price - strike)
        else:
            intrinsic = max(0, strike - price)
        return intrinsic + time_value * math.exp(-abs(price - strike) / price)

    def analyze_straddle(self, ticker: str, price: float, expiry: str,
                         iv: float, days: int) -> StrategyResult:
        """Analyze ATM straddle strategy."""
        strike = round(price / 5) * 5  # Round to nearest $5
        call_price = self._estimate_option_price(price, strike, iv, days, True)
        put_price = self._estimate_option_price(price, strike, iv, days, False)
        cost = call_price + put_price
        expected_move = self.calculate_expected_move(price, iv, days)
        implied_move = cost
        return StrategyResult(
            name="ATM Straddle",
            ticker=ticker, current_price=price, expiry=expiry,
            legs=[asdict(OptionLeg("call", strike, expiry, call_price, "buy")),
                  asdict(OptionLeg("put", strike, expiry, put_price, "buy"))],
            cost_basis=cost, max_profit=float("inf"), max_loss=cost,
            breakeven_points=[strike - cost, strike + cost],
            risk_reward_ratio=expected_move / cost if cost > 0 else 0,
            expected_move=expected_move, implied_move=implied_move,
            iv_rank=min(iv / 0.5, 1.0),  # Normalize to 50% IV
            recommendation=self._straddle_recommendation(expected_move, implied_move)
        )

    def _straddle_recommendation(self, expected: float, implied: float) -> str:
        """Generate straddle recommendation."""
        if implied < expected * 0.8:
            return "BUY - Implied move underpriced vs expected"
        elif implied > expected * 1.2:
            return "AVOID - Premium too expensive"
        return "NEUTRAL - Fair value"

    def analyze_strangle(self, ticker: str, price: float, expiry: str,
                         iv: float, days: int, width: float = 0.05) -> StrategyResult:
        """Analyze OTM strangle strategy."""
        call_strike = round(price * (1 + width) / 5) * 5
        put_strike = round(price * (1 - width) / 5) * 5
        call_price = self._estimate_option_price(price, call_strike, iv, days, True)
        put_price = self._estimate_option_price(price, put_strike, iv, days, False)
        cost = call_price + put_price
        expected_move = self.calculate_expected_move(price, iv, days)
        return StrategyResult(
            name=f"Strangle ({int(width*100)}% OTM)",
            ticker=ticker, current_price=price, expiry=expiry,
            legs=[asdict(OptionLeg("call", call_strike, expiry, call_price, "buy")),
                  asdict(OptionLeg("put", put_strike, expiry, put_price, "buy"))],
            cost_basis=cost, max_profit=float("inf"), max_loss=cost,
            breakeven_points=[put_strike - cost, call_strike + cost],
            risk_reward_ratio=expected_move / cost if cost > 0 else 0,
            expected_move=expected_move, implied_move=cost,
            iv_rank=min(iv / 0.5, 1.0),
            recommendation="CHEAPER than straddle, needs larger move"
        )

    def analyze_iron_condor(self, ticker: str, price: float, expiry: str,
                            iv: float, days: int, width: float = 0.10) -> StrategyResult:
        """Analyze iron condor (sell volatility) strategy."""
        inner_put = round(price * (1 - width / 2) / 5) * 5
        outer_put = round(price * (1 - width) / 5) * 5
        inner_call = round(price * (1 + width / 2) / 5) * 5
        outer_call = round(price * (1 + width) / 5) * 5
        # Sell inner, buy outer
        sell_put = self._estimate_option_price(price, inner_put, iv, days, False)
        buy_put = self._estimate_option_price(price, outer_put, iv, days, False)
        sell_call = self._estimate_option_price(price, inner_call, iv, days, True)
        buy_call = self._estimate_option_price(price, outer_call, iv, days, True)
        credit = (sell_put - buy_put) + (sell_call - buy_call)
        spread_width = inner_call - outer_call if inner_call > outer_call else inner_put - outer_put
        max_loss = spread_width - credit
        expected_move = self.calculate_expected_move(price, iv, days)
        return StrategyResult(
            name="Iron Condor",
            ticker=ticker, current_price=price, expiry=expiry,
            legs=[
                asdict(OptionLeg("put", outer_put, expiry, buy_put, "buy")),
                asdict(OptionLeg("put", inner_put, expiry, sell_put, "sell")),
                asdict(OptionLeg("call", inner_call, expiry, sell_call, "sell")),
                asdict(OptionLeg("call", outer_call, expiry, buy_call, "buy")),
            ],
            cost_basis=-credit,  # Net credit
            max_profit=credit, max_loss=max_loss,
            breakeven_points=[inner_put - credit, inner_call + credit],
            risk_reward_ratio=credit / max_loss if max_loss > 0 else 0,
            expected_move=expected_move, implied_move=spread_width,
            iv_rank=min(iv / 0.5, 1.0),
            recommendation="SELL if expecting low vol post-earnings"
        )

    def analyze_calendar_spread(self, ticker: str, price: float, near_expiry: str,
                                 far_expiry: str, iv: float, near_days: int,
                                 far_days: int) -> StrategyResult:
        """Analyze calendar spread (vol crush play)."""
        strike = round(price / 5) * 5
        near_call = self._estimate_option_price(price, strike, iv * 1.3, near_days, True)
        far_call = self._estimate_option_price(price, strike, iv, far_days, True)
        debit = far_call - near_call
        max_profit = near_call * 0.7  # Approximate
        return StrategyResult(
            name="Calendar Spread (Vol Crush)",
            ticker=ticker, current_price=price, expiry=f"{near_expiry}/{far_expiry}",
            legs=[
                asdict(OptionLeg("call", strike, near_expiry, near_call, "sell")),
                asdict(OptionLeg("call", strike, far_expiry, far_call, "buy")),
            ],
            cost_basis=debit, max_profit=max_profit, max_loss=debit,
            breakeven_points=[strike - debit * 0.5, strike + debit * 0.5],
            risk_reward_ratio=max_profit / debit if debit > 0 else 0,
            expected_move=self.calculate_expected_move(price, iv, near_days),
            implied_move=near_call - far_call * (near_days / far_days),
            iv_rank=min(iv / 0.5, 1.0),
            recommendation="PLAY vol crush: sell high pre-earnings IV"
        )

    def analyze_all_strategies(self, ticker: str, expiry: str) -> List[StrategyResult]:
        """Analyze all earnings strategies for a ticker."""
        price = self.get_stock_price(ticker)
        if not price:
            price = self._get_mock_price(ticker)
        iv = self.estimate_iv(ticker)
        expiry_date = datetime.strptime(expiry, "%Y-%m-%d")
        days = max(1, (expiry_date - datetime.now()).days)
        far_expiry = (expiry_date + timedelta(days=30)).strftime("%Y-%m-%d")
        far_days = days + 30
        strategies = [
            self.analyze_straddle(ticker, price, expiry, iv, days),
            self.analyze_strangle(ticker, price, expiry, iv, days),
            self.analyze_iron_condor(ticker, price, expiry, iv, days),
            self.analyze_calendar_spread(ticker, price, expiry, far_expiry, iv, days, far_days),
        ]
        return sorted(strategies, key=lambda s: s.risk_reward_ratio, reverse=True)

    def _get_mock_price(self, ticker: str) -> float:
        """Return mock prices for testing when API is unavailable."""
        mock_prices = {
            "TSLA": 350.0, "AAPL": 280.0, "NVDA": 140.0, "AMD": 125.0,
            "GOOGL": 175.0, "AMZN": 200.0, "META": 560.0, "MSFT": 425.0,
        }
        return mock_prices.get(ticker.upper(), 100.0)


def format_strategy_table(strategies: List[StrategyResult]) -> str:
    """Format strategies as a terminal table."""
    lines = [
        f"\n{'='*70}",
        f"{'STRATEGY':<25} {'COST':>10} {'MAX P/L':>15} {'R:R':>8} {'REC':<15}",
        f"{'-'*70}",
    ]
    for s in strategies:
        cost = f"${s.cost_basis:.2f}" if s.cost_basis >= 0 else f"-${abs(s.cost_basis):.2f}"
        max_pl = f"${s.max_profit:.2f}/-${s.max_loss:.2f}"
        rr = f"{s.risk_reward_ratio:.2f}"
        rec = s.recommendation[:15]
        lines.append(f"{s.name:<25} {cost:>10} {max_pl:>15} {rr:>8} {rec:<15}")
    lines.append(f"{'='*70}")
    return "\n".join(lines)


def format_strategy_detail(s: StrategyResult) -> str:
    """Format detailed strategy output."""
    lines = [
        f"\n{'='*60}",
        f"  {s.name} - {s.ticker}",
        f"{'='*60}",
        f"  Current Price: ${s.current_price:.2f}",
        f"  Expiry: {s.expiry}",
        f"  IV Rank: {s.iv_rank*100:.1f}%",
        f"\n  LEGS:",
    ]
    for leg in s.legs:
        action = "BUY " if leg["action"] == "buy" else "SELL"
        lines.append(f"    {action} {leg['type'].upper()} ${leg['strike']:.0f} @ ${leg['premium']:.2f}")
    lines.extend([
        f"\n  RISK/REWARD:",
        f"    Cost Basis: ${s.cost_basis:.2f}",
        f"    Max Profit: ${s.max_profit:.2f}" if s.max_profit != float("inf") else "    Max Profit: Unlimited",
        f"    Max Loss: ${s.max_loss:.2f}",
        f"    Risk:Reward: {s.risk_reward_ratio:.2f}",
        f"\n  BREAKEVEN: {', '.join(f'${b:.2f}' for b in s.breakeven_points)}",
        f"\n  MOVE ANALYSIS:",
        f"    Expected Move: ${s.expected_move:.2f} ({s.expected_move/s.current_price*100:.1f}%)",
        f"    Implied Move: ${s.implied_move:.2f} ({s.implied_move/s.current_price*100:.1f}%)",
        f"\n  RECOMMENDATION: {s.recommendation}",
        f"{'='*60}",
    ])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Earnings Options Strategy Analyzer (EARNINGS-2)"
    )
    parser.add_argument("--ticker", required=True, help="Stock ticker symbol")
    parser.add_argument("--expiry", default=(datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                        help="Options expiry date (YYYY-MM-DD)")
    parser.add_argument("--strategy", choices=["straddle", "strangle", "iron_condor", "calendar", "all"],
                        default="all", help="Strategy to analyze")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--detail", action="store_true", help="Show detailed analysis")
    args = parser.parse_args()

    analyzer = EarningsOptionsAnalyzer()
    ticker = args.ticker.upper()

    print(f"\n📊 EARNINGS OPTIONS STRATEGY ANALYZER")
    print(f"Ticker: {ticker} | Expiry: {args.expiry}")

    strategies = analyzer.analyze_all_strategies(ticker, args.expiry)

    if args.strategy != "all":
        strategy_map = {"straddle": 0, "strangle": 1, "iron_condor": 2, "calendar": 3}
        idx = strategy_map.get(args.strategy, 0)
        strategies = [strategies[idx]] if idx < len(strategies) else strategies[:1]

    if args.json:
        output = {
            "ticker": ticker,
            "expiry": args.expiry,
            "analyzed_at": datetime.utcnow().isoformat() + "Z",
            "strategies": [asdict(s) for s in strategies],
        }
        print(json.dumps(output, indent=2, default=str))
    elif args.detail:
        for s in strategies:
            print(format_strategy_detail(s))
    else:
        print(format_strategy_table(strategies))
        print(f"\nBest R:R: {strategies[0].name} ({strategies[0].risk_reward_ratio:.2f})")
        print(f"Recommendation: {strategies[0].recommendation}")


if __name__ == "__main__":
    main()

