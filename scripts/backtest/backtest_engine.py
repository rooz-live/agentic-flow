#!/usr/bin/env python3
"""
Strategy Backtesting Engine (BACKTEST-1)

Backtest trading strategies with realistic slippage and commissions.
Supports: long/short equity, options strategies via YAML config.

Usage:
    python3 scripts/backtest/backtest_engine.py --strategy config/strategies/oversold_bounce.yaml --start 2024-01-01
    python3 scripts/backtest/backtest_engine.py --strategy config/strategies/momentum.yaml --end 2024-12-01
"""

import argparse
import json
import math
import os
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

import yaml


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
class Trade:
    """Single trade record."""
    date: str
    ticker: str
    action: str  # BUY, SELL, SHORT, COVER
    shares: float
    price: float
    commission: float
    slippage: float
    pnl: float = 0.0


@dataclass
class Position:
    """Current position in a security."""
    ticker: str
    shares: float
    avg_cost: float
    side: str  # LONG or SHORT


@dataclass 
class BacktestResult:
    """Backtest performance results."""
    strategy_name: str
    start_date: str
    end_date: str
    initial_capital: float
    final_value: float
    total_return: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    profit_factor: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    max_drawdown_pct: float
    total_commissions: float
    total_slippage: float
    trades: List[Trade] = field(default_factory=list)
    equity_curve: List[float] = field(default_factory=list)


@dataclass
class StrategyConfig:
    """Strategy configuration from YAML."""
    name: str
    tickers: List[str]
    position_size: float  # fraction of capital per trade
    entry_rules: Dict[str, Any]
    exit_rules: Dict[str, Any]
    commission_flat: float = 0.0
    commission_pct: float = 0.0
    slippage_pct: float = 0.001  # 0.1% default
    stop_loss_pct: float = 0.0
    take_profit_pct: float = 0.0
    max_positions: int = 5


class MarketDataFetcher:
    """Fetch historical market data."""

    def __init__(self, api_key: str = POLYGON_API_KEY):
        self.api_key = api_key
        self.base_url = "https://api.polygon.io"
        self._cache = {}

    def _api_call(self, endpoint: str) -> Optional[Dict]:
        if endpoint in self._cache:
            return self._cache[endpoint]
        url = f"{self.base_url}{endpoint}"
        url += f"&apiKey={self.api_key}" if "?" in url else f"?apiKey={self.api_key}"
        try:
            req = Request(url, headers={"User-Agent": "BacktestEngine/1.0"})
            with urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                self._cache[endpoint] = data
                return data
        except (URLError, HTTPError) as err:
            print(f"API error: {err}", file=sys.stderr)
            return None

    def get_historical_bars(self, ticker: str, start: str, end: str) -> List[Dict]:
        """Get daily OHLCV bars."""
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/range/1/day/{start}/{end}?limit=500")
        if data and data.get("results"):
            return data["results"]
        return self._generate_mock_bars(ticker, start, end)

    def _generate_mock_bars(self, ticker: str, start: str, end: str) -> List[Dict]:
        """Generate mock data for testing when API unavailable."""
        base_prices = {"AAPL": 180, "TSLA": 250, "NVDA": 130, "AMD": 120, "MSFT": 380}
        base = base_prices.get(ticker, 100)
        bars = []
        current = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d")
        price = base
        while current <= end_dt:
            if current.weekday() < 5:
                change = (hash(f"{ticker}{current}") % 100 - 50) / 500
                price = max(price * (1 + change), 1)
                bars.append({
                    "t": int(current.timestamp() * 1000),
                    "o": price * 0.995, "h": price * 1.01,
                    "l": price * 0.99, "c": price, "v": 1000000
                })
            current += timedelta(days=1)
        return bars


class TechnicalIndicators:
    """Calculate technical indicators for strategy signals."""

    @staticmethod
    def rsi(closes: List[float], period: int = 14) -> float:
        if len(closes) < period + 1:
            return 50.0
        deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
        gains = [d if d > 0 else 0 for d in deltas[-period:]]
        losses = [-d if d < 0 else 0 for d in deltas[-period:]]
        avg_gain, avg_loss = sum(gains)/period, sum(losses)/period
        if avg_loss == 0:
            return 100.0
        return 100 - (100 / (1 + avg_gain / avg_loss))

    @staticmethod
    def sma(closes: List[float], period: int) -> float:
        if len(closes) < period:
            return closes[-1] if closes else 0
        return sum(closes[-period:]) / period

    @staticmethod
    def macd(closes: List[float]) -> Tuple[float, float]:
        if len(closes) < 26:
            return 0.0, 0.0
        def ema(data, period):
            mult = 2 / (period + 1)
            e = data[0]
            for p in data[1:]:
                e = (p - e) * mult + e
            return e
        ema12, ema26 = ema(closes, 12), ema(closes, 26)
        macd_line = ema12 - ema26
        signal = ema(closes[-9:], 9) if len(closes) >= 9 else macd_line
        return macd_line, signal


class BacktestEngine:
    """Main backtesting engine."""

    def __init__(self, config: StrategyConfig, initial_capital: float = 100000):
        self.config = config
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.positions: Dict[str, Position] = {}
        self.trades: List[Trade] = []
        self.equity_curve: List[float] = []
        self.fetcher = MarketDataFetcher()
        self.indicators = TechnicalIndicators()

    def calculate_commission(self, shares: float, price: float) -> float:
        """Calculate total commission for trade."""
        return self.config.commission_flat + (shares * price * self.config.commission_pct)

    def calculate_slippage(self, shares: float, price: float, is_buy: bool) -> float:
        """Calculate slippage cost."""
        slip = price * self.config.slippage_pct
        return slip if is_buy else -slip

    def evaluate_entry(self, ticker: str, bars: List[Dict], idx: int) -> Optional[str]:
        """Evaluate entry rules. Returns 'LONG', 'SHORT', or None."""
        if idx < 50:
            return None
        closes = [b["c"] for b in bars[:idx+1]]
        rules = self.config.entry_rules
        signals = []
        if "rsi_below" in rules:
            rsi = self.indicators.rsi(closes)
            signals.append(rsi < rules["rsi_below"])
        if "rsi_above" in rules:
            rsi = self.indicators.rsi(closes)
            signals.append(rsi > rules["rsi_above"])
        if "price_above_sma" in rules:
            sma = self.indicators.sma(closes, rules["price_above_sma"])
            signals.append(closes[-1] > sma)
        if "price_below_sma" in rules:
            sma = self.indicators.sma(closes, rules["price_below_sma"])
            signals.append(closes[-1] < sma)
        if "macd_cross_above" in rules and rules["macd_cross_above"]:
            macd, sig = self.indicators.macd(closes)
            prev_macd, prev_sig = self.indicators.macd(closes[:-1])
            signals.append(macd > sig and prev_macd <= prev_sig)
        if all(signals) and signals:
            return rules.get("direction", "LONG")
        return None

    def evaluate_exit(self, ticker: str, position: Position,
                      bars: List[Dict], idx: int) -> bool:
        """Evaluate exit rules. Returns True if should exit."""
        closes = [b["c"] for b in bars[:idx+1]]
        current_price = closes[-1]
        rules = self.config.exit_rules
        # Stop loss
        if self.config.stop_loss_pct > 0:
            if position.side == "LONG":
                if current_price < position.avg_cost * (1 - self.config.stop_loss_pct):
                    return True
            else:
                if current_price > position.avg_cost * (1 + self.config.stop_loss_pct):
                    return True
        # Take profit
        if self.config.take_profit_pct > 0:
            if position.side == "LONG":
                if current_price > position.avg_cost * (1 + self.config.take_profit_pct):
                    return True
            else:
                if current_price < position.avg_cost * (1 - self.config.take_profit_pct):
                    return True
        # RSI exit
        if "rsi_above" in rules:
            rsi = self.indicators.rsi(closes)
            if rsi > rules["rsi_above"]:
                return True
        if "rsi_below" in rules:
            rsi = self.indicators.rsi(closes)
            if rsi < rules["rsi_below"]:
                return True
        # Holding period
        if "max_days" in rules:
            pass  # Would need entry date tracking
        return False

    def run(self, start: str, end: str) -> BacktestResult:
        """Run the backtest."""
        print(f"\n🔬 Running backtest: {self.config.name}")
        print(f"   Period: {start} to {end}")
        print(f"   Capital: ${self.initial_capital:,.0f}")
        all_bars = {}
        for ticker in self.config.tickers:
            bars = self.fetcher.get_historical_bars(ticker, start, end)
            if bars:
                all_bars[ticker] = bars
                print(f"   {ticker}: {len(bars)} bars loaded")
        if not all_bars:
            raise ValueError("No data available for any ticker")
        # Find common date range
        min_len = min(len(bars) for bars in all_bars.values())
        total_commissions = 0.0
        total_slippage = 0.0
        for i in range(min_len):
            # Record equity
            portfolio_val = self.capital
            for pos in self.positions.values():
                bars = all_bars[pos.ticker]
                price = bars[i]["c"]
                if pos.side == "LONG":
                    portfolio_val += pos.shares * price
                else:
                    portfolio_val += pos.shares * (2 * pos.avg_cost - price)
            self.equity_curve.append(portfolio_val)
            # Check exits first
            for ticker in list(self.positions.keys()):
                pos = self.positions[ticker]
                if self.evaluate_exit(ticker, pos, all_bars[ticker], i):
                    price = all_bars[ticker][i]["c"]
                    slippage = self.calculate_slippage(pos.shares, price, False)
                    commission = self.calculate_commission(pos.shares, price)
                    total_commissions += commission
                    total_slippage += abs(slippage)
                    if pos.side == "LONG":
                        pnl = (price - pos.avg_cost) * pos.shares - commission - abs(slippage)
                        self.capital += pos.shares * price - commission
                    else:
                        pnl = (pos.avg_cost - price) * pos.shares - commission - abs(slippage)
                        self.capital += pos.shares * (2 * pos.avg_cost - price) - commission
                    date_str = datetime.fromtimestamp(all_bars[ticker][i]["t"]/1000).strftime("%Y-%m-%d")
                    self.trades.append(Trade(date_str, ticker, "SELL" if pos.side == "LONG" else "COVER",
                                             pos.shares, price, commission, slippage, pnl))
                    del self.positions[ticker]
            # Check entries
            if len(self.positions) < self.config.max_positions:
                for ticker in self.config.tickers:
                    if ticker in self.positions:
                        continue
                    direction = self.evaluate_entry(ticker, all_bars[ticker], i)
                    if direction:
                        price = all_bars[ticker][i]["c"]
                        position_value = self.capital * self.config.position_size
                        shares = position_value / price
                        slippage = self.calculate_slippage(shares, price, True)
                        commission = self.calculate_commission(shares, price)
                        total_commissions += commission
                        total_slippage += abs(slippage)
                        cost = shares * (price + slippage) + commission
                        if cost <= self.capital:
                            self.capital -= cost
                            self.positions[ticker] = Position(ticker, shares, price + slippage, direction)
                            date_str = datetime.fromtimestamp(all_bars[ticker][i]["t"]/1000).strftime("%Y-%m-%d")
                            self.trades.append(Trade(date_str, ticker, "BUY" if direction == "LONG" else "SHORT",
                                                     shares, price, commission, slippage, 0))
        # Calculate final metrics
        return self._calculate_metrics(start, end, total_commissions, total_slippage)

    def _calculate_metrics(self, start: str, end: str, commissions: float, slippage: float) -> BacktestResult:
        """Calculate performance metrics."""
        final_val = self.equity_curve[-1] if self.equity_curve else self.initial_capital
        total_ret = (final_val - self.initial_capital) / self.initial_capital
        winning = [t for t in self.trades if t.pnl > 0]
        losing = [t for t in self.trades if t.pnl < 0]
        win_rate = len(winning) / len(self.trades) if self.trades else 0
        gross_profit = sum(t.pnl for t in winning)
        gross_loss = abs(sum(t.pnl for t in losing))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
        # Drawdown
        peak = self.equity_curve[0] if self.equity_curve else self.initial_capital
        max_dd = 0
        for val in self.equity_curve:
            if val > peak:
                peak = val
            dd = (peak - val) / peak
            if dd > max_dd:
                max_dd = dd
        # Sharpe & Sortino
        if len(self.equity_curve) > 1:
            returns = [(self.equity_curve[i] - self.equity_curve[i-1]) / self.equity_curve[i-1]
                       for i in range(1, len(self.equity_curve))]
            avg_ret = sum(returns) / len(returns)
            std_ret = (sum((r - avg_ret)**2 for r in returns) / len(returns)) ** 0.5
            sharpe = (avg_ret * 252) / (std_ret * math.sqrt(252)) if std_ret > 0 else 0
            neg_returns = [r for r in returns if r < 0]
            downside_std = (sum(r**2 for r in neg_returns) / len(neg_returns)) ** 0.5 if neg_returns else 0
            sortino = (avg_ret * 252) / (downside_std * math.sqrt(252)) if downside_std > 0 else 0
        else:
            sharpe, sortino = 0, 0
        return BacktestResult(
            strategy_name=self.config.name, start_date=start, end_date=end,
            initial_capital=self.initial_capital, final_value=final_val,
            total_return=total_ret, total_trades=len(self.trades),
            winning_trades=len(winning), losing_trades=len(losing),
            win_rate=win_rate, profit_factor=profit_factor,
            sharpe_ratio=sharpe, sortino_ratio=sortino,
            max_drawdown=peak - min(self.equity_curve) if self.equity_curve else 0,
            max_drawdown_pct=max_dd, total_commissions=commissions,
            total_slippage=slippage, trades=self.trades, equity_curve=self.equity_curve
        )


def load_strategy(path: str) -> StrategyConfig:
    """Load strategy configuration from YAML."""
    with open(path) as f:
        data = yaml.safe_load(f)
    return StrategyConfig(
        name=data.get("name", "Unnamed Strategy"),
        tickers=data.get("tickers", ["AAPL"]),
        position_size=data.get("position_size", 0.2),
        entry_rules=data.get("entry_rules", {}),
        exit_rules=data.get("exit_rules", {}),
        commission_flat=data.get("commission_flat", 1.0),
        commission_pct=data.get("commission_pct", 0.0005),
        slippage_pct=data.get("slippage_pct", 0.001),
        stop_loss_pct=data.get("stop_loss_pct", 0.05),
        take_profit_pct=data.get("take_profit_pct", 0.10),
        max_positions=data.get("max_positions", 5),
    )


def print_results(result: BacktestResult, json_output: bool = False):
    """Print backtest results."""
    if json_output:
        output = asdict(result)
        output.pop("trades", None)
        output.pop("equity_curve", None)
        print(json.dumps(output, indent=2, default=str))
        return
    print("\n" + "="*60)
    print(f"📊 BACKTEST RESULTS: {result.strategy_name}")
    print("="*60)
    print(f"Period:           {result.start_date} to {result.end_date}")
    print(f"Initial Capital:  ${result.initial_capital:,.2f}")
    print(f"Final Value:      ${result.final_value:,.2f}")
    print(f"Total Return:     {result.total_return*100:+.2f}%")
    print("-"*60)
    print(f"Total Trades:     {result.total_trades}")
    print(f"Winning:          {result.winning_trades}")
    print(f"Losing:           {result.losing_trades}")
    print(f"Win Rate:         {result.win_rate*100:.1f}%")
    print(f"Profit Factor:    {result.profit_factor:.2f}")
    print("-"*60)
    print(f"Sharpe Ratio:     {result.sharpe_ratio:.2f}")
    print(f"Sortino Ratio:    {result.sortino_ratio:.2f}")
    print(f"Max Drawdown:     ${result.max_drawdown:,.2f} ({result.max_drawdown_pct*100:.1f}%)")
    print("-"*60)
    print(f"Total Commissions: ${result.total_commissions:,.2f}")
    print(f"Total Slippage:    ${result.total_slippage:,.2f}")
    print("="*60)
    if result.trades:
        print("\n📝 TRADE LOG (last 10):")
        print(f"{'DATE':<12} {'TICKER':<6} {'ACTION':<6} {'SHARES':>8} {'PRICE':>10} {'P/L':>12}")
        print("-"*60)
        for t in result.trades[-10:]:
            print(f"{t.date:<12} {t.ticker:<6} {t.action:<6} {t.shares:>8.1f} ${t.price:>9.2f} ${t.pnl:>+11.2f}")


def main():
    parser = argparse.ArgumentParser(description="Strategy Backtesting Engine")
    parser.add_argument("--strategy", "-s", required=True, help="Path to strategy YAML config")
    parser.add_argument("--start", default="2024-01-01", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", default=datetime.now().strftime("%Y-%m-%d"), help="End date")
    parser.add_argument("--capital", type=float, default=100000, help="Initial capital")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()
    try:
        config = load_strategy(args.strategy)
        engine = BacktestEngine(config, args.capital)
        result = engine.run(args.start, args.end)
        print_results(result, args.json)
    except FileNotFoundError:
        print(f"Error: Strategy file not found: {args.strategy}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

