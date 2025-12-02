#!/usr/bin/env python3
"""
Portfolio Risk Dashboard (PORTFOLIO-1)

Real-time portfolio risk monitoring with diversification analysis.
Metrics: beta, VaR, sector concentration, correlation matrix, Greeks aggregation.

Usage:
    python3 scripts/portfolio_risk_dashboard.py --portfolio default
    python3 scripts/portfolio_risk_dashboard.py --ticker AAPL,TSLA,NVDA --json
    python3 scripts/portfolio_risk_dashboard.py --var 0.95
"""

import argparse
import json
import math
import os
import sys
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError


def load_env():
    env_path = Path(__file__).parent.parent / "config" / ".env.production"
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

# Sector mappings
SECTOR_MAP = {
    "AAPL": "Technology", "MSFT": "Technology", "GOOGL": "Technology",
    "AMZN": "Consumer Discretionary", "TSLA": "Consumer Discretionary",
    "NVDA": "Technology", "AMD": "Technology", "META": "Technology",
    "JPM": "Financial", "BAC": "Financial", "GS": "Financial",
    "XOM": "Energy", "CVX": "Energy", "COP": "Energy",
    "JNJ": "Healthcare", "UNH": "Healthcare", "PFE": "Healthcare",
    "PG": "Consumer Staples", "KO": "Consumer Staples", "PEP": "Consumer Staples",
}


@dataclass
class Position:
    ticker: str
    shares: float
    avg_cost: float
    current_price: float = 0.0
    market_value: float = 0.0
    pnl: float = 0.0
    pnl_pct: float = 0.0
    sector: str = ""
    beta: float = 1.0
    weight: float = 0.0


@dataclass
class OptionsPosition:
    ticker: str
    type: str  # call/put
    strike: float
    expiry: str
    quantity: int
    delta: float = 0.0
    gamma: float = 0.0
    theta: float = 0.0
    vega: float = 0.0


@dataclass
class PortfolioRisk:
    total_value: float
    positions: List[Position]
    options: List[OptionsPosition] = field(default_factory=list)
    portfolio_beta: float = 1.0
    var_95: float = 0.0
    var_99: float = 0.0
    sector_concentration: Dict[str, float] = field(default_factory=dict)
    correlation_matrix: Dict[str, Dict[str, float]] = field(default_factory=dict)
    total_delta: float = 0.0
    total_gamma: float = 0.0
    total_theta: float = 0.0
    total_vega: float = 0.0
    max_drawdown_estimate: float = 0.0


class MarketDataFetcher:
    """Fetch market data from Polygon."""

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
            req = Request(url, headers={"User-Agent": "PortfolioRisk/1.0"})
            with urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                self._cache[endpoint] = data
                return data
        except (URLError, HTTPError) as err:
            print(f"API error: {err}", file=sys.stderr)
            return None

    def get_price(self, ticker: str) -> Optional[float]:
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/prev")
        if data and data.get("results"):
            return data["results"][0].get("c")
        return None

    def get_historical_prices(self, ticker: str, days: int = 252) -> List[float]:
        end = datetime.now().strftime("%Y-%m-%d")
        start = (datetime.now() - timedelta(days=days + 30)).strftime("%Y-%m-%d")
        data = self._api_call(f"/v2/aggs/ticker/{ticker}/range/1/day/{start}/{end}")
        if data and data.get("results"):
            return [r["c"] for r in data["results"][-days:]]
        return []

    def get_spy_prices(self, days: int = 252) -> List[float]:
        return self.get_historical_prices("SPY", days)


class PortfolioRiskAnalyzer:
    """Analyze portfolio risk metrics."""

    def __init__(self):
        self.fetcher = MarketDataFetcher()

    def calculate_returns(self, prices: List[float]) -> List[float]:
        if len(prices) < 2:
            return []
        return [(prices[i] - prices[i-1]) / prices[i-1]
                for i in range(1, len(prices))]

    def calculate_beta(self, ticker: str, benchmark: str = "SPY") -> float:
        """Calculate beta vs benchmark."""
        stock_prices = self.fetcher.get_historical_prices(ticker)
        bench_prices = self.fetcher.get_historical_prices(benchmark)
        if not stock_prices or not bench_prices:
            return 1.0
        min_len = min(len(stock_prices), len(bench_prices))
        stock_ret = self.calculate_returns(stock_prices[-min_len:])
        bench_ret = self.calculate_returns(bench_prices[-min_len:])
        if not stock_ret or not bench_ret:
            return 1.0
        n = len(stock_ret)
        mean_s = sum(stock_ret) / n
        mean_b = sum(bench_ret) / n
        cov = sum((stock_ret[i] - mean_s) * (bench_ret[i] - mean_b) for i in range(n)) / n
        var_b = sum((bench_ret[i] - mean_b) ** 2 for i in range(n)) / n
        return cov / var_b if var_b > 0 else 1.0

    def calculate_var(self, returns: List[float], confidence: float = 0.95) -> float:
        """Calculate Value at Risk (VaR) using historical method."""
        if not returns:
            return 0.0
        sorted_ret = sorted(returns)
        idx = int((1 - confidence) * len(sorted_ret))
        return abs(sorted_ret[idx]) if idx < len(sorted_ret) else 0.0

    def calculate_correlation(self, tickers: List[str]) -> Dict[str, Dict[str, float]]:
        """Calculate correlation matrix for tickers."""
        returns_map = {}
        for t in tickers:
            prices = self.fetcher.get_historical_prices(t, days=60)
            returns_map[t] = self.calculate_returns(prices)
        matrix = {}
        for t1 in tickers:
            matrix[t1] = {}
            for t2 in tickers:
                if t1 == t2:
                    matrix[t1][t2] = 1.0
                else:
                    r1, r2 = returns_map[t1], returns_map[t2]
                    min_len = min(len(r1), len(r2))
                    if min_len < 5:
                        matrix[t1][t2] = 0.0
                        continue
                    r1, r2 = r1[-min_len:], r2[-min_len:]
                    m1, m2 = sum(r1)/len(r1), sum(r2)/len(r2)
                    cov = sum((r1[i]-m1)*(r2[i]-m2) for i in range(min_len))/min_len
                    std1 = (sum((x-m1)**2 for x in r1)/len(r1))**0.5
                    std2 = (sum((x-m2)**2 for x in r2)/len(r2))**0.5
                    matrix[t1][t2] = cov/(std1*std2) if std1*std2 > 0 else 0.0
        return matrix

    def analyze_portfolio(self, holdings: Dict[str, Tuple[float, float]],
                          options: List[OptionsPosition] = None) -> PortfolioRisk:
        """Analyze full portfolio. holdings = {ticker: (shares, avg_cost)}."""
        positions = []
        all_returns = []
        total_value = 0.0

        for ticker, (shares, avg_cost) in holdings.items():
            price = self.fetcher.get_price(ticker) or avg_cost
            mkt_val = shares * price
            pnl = mkt_val - (shares * avg_cost)
            pnl_pct = (price - avg_cost) / avg_cost * 100 if avg_cost else 0
            beta = self.calculate_beta(ticker)
            pos = Position(
                ticker=ticker, shares=shares, avg_cost=avg_cost,
                current_price=price, market_value=mkt_val,
                pnl=pnl, pnl_pct=pnl_pct,
                sector=SECTOR_MAP.get(ticker, "Other"), beta=beta
            )
            positions.append(pos)
            total_value += mkt_val
            prices = self.fetcher.get_historical_prices(ticker, days=60)
            all_returns.extend(self.calculate_returns(prices))

        # Calculate weights
        for pos in positions:
            pos.weight = pos.market_value / total_value if total_value else 0

        # Portfolio beta (weighted average)
        port_beta = sum(p.beta * p.weight for p in positions)

        # Sector concentration
        sectors = {}
        for p in positions:
            sectors[p.sector] = sectors.get(p.sector, 0) + p.weight

        # VaR calculation
        var_95 = self.calculate_var(all_returns, 0.95) * total_value
        var_99 = self.calculate_var(all_returns, 0.99) * total_value

        # Correlation matrix
        tickers = list(holdings.keys())
        corr_matrix = self.calculate_correlation(tickers) if len(tickers) > 1 else {}

        # Options Greeks aggregation
        opts = options or []
        total_delta = sum(o.delta * o.quantity * 100 for o in opts)
        total_gamma = sum(o.gamma * o.quantity * 100 for o in opts)
        total_theta = sum(o.theta * o.quantity * 100 for o in opts)
        total_vega = sum(o.vega * o.quantity * 100 for o in opts)

        return PortfolioRisk(
            total_value=total_value, positions=positions, options=opts,
            portfolio_beta=port_beta, var_95=var_95, var_99=var_99,
            sector_concentration=sectors, correlation_matrix=corr_matrix,
            total_delta=total_delta, total_gamma=total_gamma,
            total_theta=total_theta, total_vega=total_vega,
            max_drawdown_estimate=var_99 * 2.5  # Rough estimate
        )


def format_dashboard(risk: PortfolioRisk) -> str:
    lines = [
        f"\n{'='*65}",
        f"  📊 PORTFOLIO RISK DASHBOARD",
        f"{'='*65}",
        f"  Total Value: ${risk.total_value:,.2f}",
        f"  Portfolio Beta: {risk.portfolio_beta:.2f}",
        f"\n  📉 VALUE AT RISK:",
        f"    VaR 95%: ${risk.var_95:,.2f} ({risk.var_95/risk.total_value*100:.1f}%)",
        f"    VaR 99%: ${risk.var_99:,.2f} ({risk.var_99/risk.total_value*100:.1f}%)",
        f"    Max Drawdown Est: ${risk.max_drawdown_estimate:,.2f}",
        f"\n  🏢 SECTOR CONCENTRATION:",
    ]
    for sector, weight in sorted(risk.sector_concentration.items(), key=lambda x: -x[1]):
        bar = "█" * int(weight * 20)
        lines.append(f"    {sector:<25} {weight*100:5.1f}% {bar}")

    lines.append(f"\n  📈 POSITIONS:")
    lines.append(f"  {'TICKER':<8} {'SHARES':>8} {'PRICE':>10} {'VALUE':>12} {'P&L':>10} {'BETA':>6}")
    lines.append(f"  {'-'*58}")
    for p in sorted(risk.positions, key=lambda x: -x.market_value):
        pnl_str = f"{'+'if p.pnl>=0 else ''}{p.pnl:,.0f}"
        lines.append(f"  {p.ticker:<8} {p.shares:>8.0f} ${p.current_price:>8.2f} "
                     f"${p.market_value:>10,.0f} {pnl_str:>10} {p.beta:>6.2f}")

    if risk.options:
        lines.append(f"\n  📊 OPTIONS GREEKS:")
        lines.append(f"    Total Delta: {risk.total_delta:+,.0f}")
        lines.append(f"    Total Gamma: {risk.total_gamma:+,.2f}")
        lines.append(f"    Total Theta: {risk.total_theta:+,.2f}/day")
        lines.append(f"    Total Vega:  {risk.total_vega:+,.2f}")

    lines.append(f"{'='*65}")
    return "\n".join(lines)


# Default portfolio for testing
DEFAULT_PORTFOLIO = {
    "AAPL": (100, 150.0), "TSLA": (50, 200.0), "NVDA": (75, 100.0),
    "MSFT": (80, 350.0), "GOOGL": (30, 140.0), "AMD": (100, 100.0),
}


def main():
    parser = argparse.ArgumentParser(description="Portfolio Risk Dashboard (PORTFOLIO-1)")
    parser.add_argument("--portfolio", default="default", help="Portfolio name or 'default'")
    parser.add_argument("--tickers", help="Comma-separated tickers with shares:cost")
    parser.add_argument("--var", type=float, default=0.95, help="VaR confidence level")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    analyzer = PortfolioRiskAnalyzer()

    if args.tickers:
        holdings = {}
        for item in args.tickers.split(","):
            parts = item.strip().split(":")
            if len(parts) == 3:
                holdings[parts[0]] = (float(parts[1]), float(parts[2]))
    else:
        holdings = DEFAULT_PORTFOLIO

    print(f"\n🔍 Analyzing portfolio ({len(holdings)} positions)...")
    risk = analyzer.analyze_portfolio(holdings)

    if args.json:
        output = asdict(risk)
        print(json.dumps(output, indent=2, default=str))
    else:
        print(format_dashboard(risk))


if __name__ == "__main__":
    main()

