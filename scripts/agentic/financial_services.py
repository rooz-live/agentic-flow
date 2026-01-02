#!/usr/bin/env python3
"""
Financial Services Integration Module
TradingView, Finviz, and Interactive Brokers API integration with WSJF metrics.
"""

import os
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(PROJECT_ROOT, "scripts"))
from agentic.pattern_logger import PatternLogger

GOALIE_DIR = os.path.join(PROJECT_ROOT, ".goalie")


class DataProvider(Enum):
    TRADINGVIEW = "tradingview"
    FINVIZ = "finviz"
    IBKR = "interactive_brokers"


class AlertType(Enum):
    PRICE = "price"
    VOLUME = "volume"
    TECHNICAL = "technical"
    NEWS = "news"
    SCREENER = "screener"


@dataclass
class MarketData:
    symbol: str
    price: float
    change: float
    change_pct: float
    volume: int
    timestamp: str
    provider: DataProvider


@dataclass
class TechnicalIndicator:
    symbol: str
    indicator: str  # RSI, MACD, SMA, etc.
    value: float
    signal: str  # buy, sell, hold
    timeframe: str


@dataclass
class ScreenerResult:
    symbol: str
    name: str
    sector: str
    market_cap: float
    pe_ratio: float
    score: float
    signals: List[str]


@dataclass
class TradeSignal:
    signal_id: str
    symbol: str
    action: str  # buy, sell, hold
    confidence: float
    wsjf_score: float
    source: DataProvider
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class FinancialServicesHub:
    """Unified financial services integration with WSJF prioritization."""
    
    def __init__(self, tenant_id: str = "default"):
        self.logger = PatternLogger(
            mode="advisory", circle="financial",
            run_id=f"finance-{int(datetime.now().timestamp())}",
            tenant_id=tenant_id, tenant_platform="agentic-flow-core"
        )
        self.providers = self._init_providers()
        self.watchlist: List[str] = []
        self.signals: List[TradeSignal] = []
        self.alerts: List[Dict] = []
    
    def _init_providers(self) -> Dict[str, Dict]:
        """Initialize provider configurations."""
        return {
            DataProvider.TRADINGVIEW.value: {
                "name": "TradingView",
                "api_base": "https://api.tradingview.com",
                "features": ["charting", "alerts", "screener", "ideas"],
                "endpoints": {
                    "quote": "/symbols/{symbol}/quote",
                    "technicals": "/symbols/{symbol}/technicals",
                    "screener": "/screener/stock",
                    "alerts": "/alerts"
                },
                "enabled": True
            },
            DataProvider.FINVIZ.value: {
                "name": "Finviz",
                "api_base": "https://finviz.com",
                "features": ["screener", "maps", "news", "charts"],
                "endpoints": {
                    "quote": "/quote.ashx?t={symbol}",
                    "screener": "/screener.ashx",
                    "news": "/news.ashx",
                    "maps": "/map.ashx"
                },
                "enabled": True
            },
            DataProvider.IBKR.value: {
                "name": "Interactive Brokers",
                "api_base": "https://localhost:5000",  # TWS Gateway
                "features": ["trading", "portfolio", "market-data", "orders"],
                "endpoints": {
                    "portfolio": "/v1/api/portfolio/accounts",
                    "positions": "/v1/api/portfolio/{account}/positions",
                    "orders": "/v1/api/iserver/account/orders",
                    "quote": "/v1/api/iserver/marketdata/snapshot"
                },
                "enabled": False  # Requires TWS Gateway
            }
        }
    
    def add_to_watchlist(self, symbol: str) -> bool:
        """Add symbol to watchlist."""
        if symbol not in self.watchlist:
            self.watchlist.append(symbol)
            self.logger.log("watchlist_add", {
                "symbol": symbol, "watchlist_size": len(self.watchlist),
                "action": "add-watchlist", "tags": ["financial", "watchlist"]
            }, gate="general")
            return True
        return False
    
    def get_quote(self, symbol: str, provider: DataProvider = DataProvider.TRADINGVIEW) -> MarketData:
        """Get market quote for symbol (simulated)."""
        import random
        
        # Simulated market data
        base_price = random.uniform(50, 500)
        change = random.uniform(-5, 5)
        
        data = MarketData(
            symbol=symbol,
            price=round(base_price, 2),
            change=round(change, 2),
            change_pct=round(change / base_price * 100, 2),
            volume=random.randint(100000, 10000000),
            timestamp=datetime.now().isoformat(),
            provider=provider
        )
        
        self.logger.log("market_quote", {
            "symbol": symbol, "price": data.price, "change_pct": data.change_pct,
            "provider": provider.value, "action": "get-quote",
            "tags": ["financial", "market-data", provider.value]
        }, gate="general", behavioral_type="observability")
        
        return data
    
    def get_technicals(self, symbol: str) -> List[TechnicalIndicator]:
        """Get technical indicators for symbol (simulated)."""
        import random
        
        indicators = []
        for ind_name, (min_val, max_val) in [
            ("RSI", (20, 80)),
            ("MACD", (-5, 5)),
            ("SMA_50", (0.9, 1.1)),
            ("SMA_200", (0.85, 1.15)),
            ("ADX", (10, 50))
        ]:
            value = random.uniform(min_val, max_val)
            if ind_name == "RSI":
                signal = "sell" if value > 70 else "buy" if value < 30 else "hold"
            elif ind_name == "MACD":
                signal = "buy" if value > 0 else "sell"
            else:
                signal = "hold"
            
            indicators.append(TechnicalIndicator(
                symbol=symbol,
                indicator=ind_name,
                value=round(value, 2),
                signal=signal,
                timeframe="1D"
            ))
        
        return indicators
    
    def run_screener(self, criteria: Dict[str, Any] = None) -> List[ScreenerResult]:
        """Run stock screener (simulated)."""
        import random
        
        # Simulated screener results
        sample_stocks = [
            ("AAPL", "Apple Inc", "Technology"),
            ("MSFT", "Microsoft Corp", "Technology"),
            ("GOOGL", "Alphabet Inc", "Technology"),
            ("AMZN", "Amazon.com Inc", "Consumer Cyclical"),
            ("NVDA", "NVIDIA Corp", "Technology"),
            ("META", "Meta Platforms", "Technology"),
            ("TSLA", "Tesla Inc", "Consumer Cyclical"),
            ("JPM", "JPMorgan Chase", "Financial Services"),
            ("V", "Visa Inc", "Financial Services"),
            ("UNH", "UnitedHealth Group", "Healthcare"),
        ]
        
        results = []
        for symbol, name, sector in sample_stocks:
            score = random.uniform(0, 100)
            signals = []
            if score > 70:
                signals.append("strong_buy")
            elif score > 50:
                signals.append("buy")
            elif score < 30:
                signals.append("sell")
            
            results.append(ScreenerResult(
                symbol=symbol,
                name=name,
                sector=sector,
                market_cap=random.uniform(100, 3000) * 1e9,
                pe_ratio=random.uniform(10, 50),
                score=round(score, 1),
                signals=signals
            ))
        
        # Sort by score (WSJF-style prioritization)
        results.sort(key=lambda x: x.score, reverse=True)
        
        self.logger.log("screener_run", {
            "results_count": len(results), "top_score": results[0].score if results else 0,
            "criteria": criteria or {}, "action": "run-screener",
            "tags": ["financial", "screener", "analysis"]
        }, gate="calibration", behavioral_type="observability",
        economic={"cod": len(results) * 2, "wsjf_score": results[0].score if results else 0})
        
        return results
    
    def generate_signals(self, symbols: List[str] = None) -> List[TradeSignal]:
        """Generate trade signals with WSJF prioritization."""
        import random
        
        symbols = symbols or self.watchlist or ["AAPL", "MSFT", "GOOGL"]
        signals = []
        
        for symbol in symbols:
            technicals = self.get_technicals(symbol)
            buy_signals = sum(1 for t in technicals if t.signal == "buy")
            sell_signals = sum(1 for t in technicals if t.signal == "sell")
            
            if buy_signals > sell_signals:
                action = "buy"
                confidence = buy_signals / len(technicals)
            elif sell_signals > buy_signals:
                action = "sell"
                confidence = sell_signals / len(technicals)
            else:
                action = "hold"
                confidence = 0.5
            
            # Calculate WSJF score for signal prioritization
            ubv = confidence * 10  # User Business Value
            tc = random.uniform(5, 10)  # Time Criticality
            rr = (1 - confidence) * 5  # Risk Reduction
            size = random.uniform(1, 3)  # Job Size
            wsjf = (ubv + tc + rr) / size
            
            signal = TradeSignal(
                signal_id=f"sig-{symbol}-{int(datetime.now().timestamp())}",
                symbol=symbol,
                action=action,
                confidence=round(confidence, 2),
                wsjf_score=round(wsjf, 2),
                source=DataProvider.TRADINGVIEW
            )
            signals.append(signal)
        
        # Sort by WSJF score
        signals.sort(key=lambda x: x.wsjf_score, reverse=True)
        self.signals.extend(signals)
        
        self.logger.log("signals_generated", {
            "signals_count": len(signals),
            "top_signal": signals[0].symbol if signals else None,
            "top_wsjf": signals[0].wsjf_score if signals else 0,
            "action": "generate-signals",
            "tags": ["financial", "signals", "wsjf"]
        }, gate="calibration", behavioral_type="advisory",
        economic={"cod": sum(s.wsjf_score for s in signals), "wsjf_score": signals[0].wsjf_score if signals else 0})
        
        return signals
    
    def get_dashboard(self) -> Dict[str, Any]:
        """Get financial services dashboard data."""
        return {
            "providers": {k: {"name": v["name"], "enabled": v["enabled"]} 
                        for k, v in self.providers.items()},
            "watchlist": self.watchlist,
            "signals_count": len(self.signals),
            "top_signals": [{"symbol": s.symbol, "action": s.action, "wsjf": s.wsjf_score} 
                          for s in self.signals[:5]],
            "alerts_count": len(self.alerts),
            "generated_at": datetime.now().isoformat()
        }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Financial Services Hub")
    parser.add_argument("command", nargs="?", default="dashboard",
        choices=["dashboard", "quote", "technicals", "screener", "signals", "watchlist"])
    parser.add_argument("--symbol", help="Stock symbol")
    parser.add_argument("--symbols", nargs="+", help="Multiple symbols")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    
    hub = FinancialServicesHub()
    
    if args.command == "dashboard":
        result = hub.get_dashboard()
    elif args.command == "quote" and args.symbol:
        data = hub.get_quote(args.symbol)
        result = {"symbol": data.symbol, "price": data.price, "change_pct": data.change_pct}
    elif args.command == "technicals" and args.symbol:
        indicators = hub.get_technicals(args.symbol)
        result = [{"indicator": i.indicator, "value": i.value, "signal": i.signal} for i in indicators]
    elif args.command == "screener":
        results = hub.run_screener()
        result = [{"symbol": r.symbol, "name": r.name, "score": r.score, "signals": r.signals} 
                 for r in results[:10]]
    elif args.command == "signals":
        symbols = args.symbols or ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"]
        signals = hub.generate_signals(symbols)
        result = [{"symbol": s.symbol, "action": s.action, "confidence": s.confidence, "wsjf": s.wsjf_score}
                 for s in signals]
    elif args.command == "watchlist":
        result = {"watchlist": hub.watchlist}
    else:
        result = {"error": "Invalid command"}
    
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
