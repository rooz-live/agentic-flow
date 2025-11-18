#!/usr/bin/env python3
"""
Portfolio Technical Analysis with Momentum Indicators
Analyzes holdings for highest-probability setups with defined risk parameters
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import argparse


class TechnicalAnalyzer:
    """Technical pattern and momentum analysis for portfolio holdings"""
    
    def __init__(self):
        self.portfolio_holdings = []
        self.analysis_results = []
        
    def calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0  # Neutral if insufficient data
            
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            change = prices[i] - prices[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0
            
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return round(rsi, 2)
    
    def calculate_macd(self, prices: List[float]) -> Dict[str, float]:
        """Calculate MACD (Moving Average Convergence Divergence)"""
        if len(prices) < 26:
            return {"macd": 0, "signal": 0, "histogram": 0, "trend": "neutral"}
        
        # Simple EMA calculation
        def ema(data, period):
            multiplier = 2 / (period + 1)
            ema_values = [sum(data[:period]) / period]
            for price in data[period:]:
                ema_values.append((price - ema_values[-1]) * multiplier + ema_values[-1])
            return ema_values[-1]
        
        ema_12 = ema(prices, 12)
        ema_26 = ema(prices, 26)
        macd_line = ema_12 - ema_26
        signal_line = ema(prices[-9:], 9) if len(prices) >= 9 else 0
        histogram = macd_line - signal_line
        
        trend = "bullish" if histogram > 0 else "bearish" if histogram < 0 else "neutral"
        
        return {
            "macd": round(macd_line, 4),
            "signal": round(signal_line, 4),
            "histogram": round(histogram, 4),
            "trend": trend
        }
    
    def identify_support_resistance(self, prices: List[float], current_price: float) -> Dict[str, float]:
        """Identify key support and resistance levels"""
        if len(prices) < 20:
            return {"support": current_price * 0.95, "resistance": current_price * 1.05}
        
        # Find local highs and lows
        highs = []
        lows = []
        
        for i in range(2, len(prices) - 2):
            if prices[i] > prices[i-1] and prices[i] > prices[i+1]:
                highs.append(prices[i])
            if prices[i] < prices[i-1] and prices[i] < prices[i+1]:
                lows.append(prices[i])
        
        # Find nearest support and resistance
        resistance = min([h for h in highs if h > current_price], default=current_price * 1.05)
        support = max([l for l in lows if l < current_price], default=current_price * 0.95)
        
        return {
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "range": round(resistance - support, 2)
        }
    
    def calculate_volatility_score(self, prices: List[float]) -> Dict[str, any]:
        """Calculate volatility metrics"""
        if len(prices) < 2:
            return {"score": 0, "level": "low"}
        
        returns = [(prices[i] - prices[i-1]) / prices[i-1] for i in range(1, len(prices))]
        volatility = (sum([r**2 for r in returns]) / len(returns)) ** 0.5
        
        # Annualized volatility
        annualized_vol = volatility * (252 ** 0.5) * 100
        
        level = "extreme" if annualized_vol > 50 else "high" if annualized_vol > 30 else "moderate" if annualized_vol > 15 else "low"
        
        return {
            "score": round(annualized_vol, 2),
            "level": level,
            "daily_range": round(volatility * 100, 2)
        }
    
    def calculate_risk_reward(self, current_price: float, support: float, resistance: float) -> Dict[str, float]:
        """Calculate risk/reward ratio based on support and resistance"""
        risk = current_price - support
        reward = resistance - current_price
        
        if risk <= 0:
            risk = current_price * 0.05  # Default 5% risk
        
        ratio = reward / risk if risk > 0 else 0
        
        return {
            "risk_dollars": round(risk, 2),
            "reward_dollars": round(reward, 2),
            "ratio": round(ratio, 2),
            "quality": "excellent" if ratio >= 3 else "good" if ratio >= 2 else "fair" if ratio >= 1.5 else "poor"
        }
    
    def identify_pattern(self, prices: List[float]) -> str:
        """Identify chart patterns"""
        if len(prices) < 10:
            return "insufficient_data"
        
        recent = prices[-10:]
        trend = "uptrend" if recent[-1] > recent[0] else "downtrend"
        
        # Simple pattern recognition
        if recent[-1] < min(recent[:-1]) * 0.98:
            return "oversold_bounce_candidate"
        elif recent[-1] > max(recent[:-1]) * 1.02:
            return "breakout"
        elif max(recent) - min(recent) < recent[-1] * 0.03:
            return "consolidation"
        else:
            return trend
    
    def score_setup(self, analysis: Dict) -> Dict[str, any]:
        """Score trading setup based on multiple factors"""
        score = 0
        signals = []
        
        # RSI signals
        rsi = analysis["rsi"]
        if rsi < 30:
            score += 3
            signals.append("oversold_rsi")
        elif rsi > 70:
            score -= 2
            signals.append("overbought_rsi")
        elif 40 <= rsi <= 60:
            score += 1
            signals.append("neutral_rsi")
        
        # MACD signals
        if analysis["macd"]["trend"] == "bullish":
            score += 2
            signals.append("macd_bullish")
        elif analysis["macd"]["trend"] == "bearish":
            score -= 1
            signals.append("macd_bearish")
        
        # Risk/Reward
        rr_ratio = analysis["risk_reward"]["ratio"]
        if rr_ratio >= 3:
            score += 3
            signals.append("excellent_rr")
        elif rr_ratio >= 2:
            score += 2
            signals.append("good_rr")
        elif rr_ratio < 1:
            score -= 2
            signals.append("poor_rr")
        
        # Pattern
        pattern = analysis["pattern"]
        if "oversold" in pattern or "bounce" in pattern:
            score += 2
            signals.append("bounce_pattern")
        elif "breakout" in pattern:
            score += 2
            signals.append("breakout_pattern")
        
        # Volatility adjustment
        if analysis["volatility"]["level"] == "extreme":
            score -= 1  # Higher risk
            signals.append("extreme_volatility")
        
        rating = "strong_buy" if score >= 7 else "buy" if score >= 5 else "hold" if score >= 3 else "neutral" if score >= 0 else "avoid"
        
        return {
            "score": score,
            "rating": rating,
            "signals": signals,
            "priority": "high" if score >= 7 else "medium" if score >= 4 else "low"
        }
    
    def analyze_holding(self, symbol: str, current_price: float, prices: List[float], 
                       volume: Optional[List[int]] = None) -> Dict:
        """Comprehensive analysis of a single holding"""
        
        rsi = self.calculate_rsi(prices)
        macd = self.calculate_macd(prices)
        levels = self.identify_support_resistance(prices, current_price)
        volatility = self.calculate_volatility_score(prices)
        risk_reward = self.calculate_risk_reward(current_price, levels["support"], levels["resistance"])
        pattern = self.identify_pattern(prices)
        
        analysis = {
            "symbol": symbol,
            "current_price": current_price,
            "rsi": rsi,
            "macd": macd,
            "support_resistance": levels,
            "volatility": volatility,
            "risk_reward": risk_reward,
            "pattern": pattern,
            "timestamp": datetime.now().isoformat()
        }
        
        setup_score = self.score_setup(analysis)
        analysis["setup_score"] = setup_score
        
        return analysis
    
    def scan_portfolio(self, holdings: List[Dict]) -> List[Dict]:
        """Scan entire portfolio and rank by setup quality"""
        results = []
        
        for holding in holdings:
            try:
                analysis = self.analyze_holding(
                    holding["symbol"],
                    holding["current_price"],
                    holding["price_history"],
                    holding.get("volume_history")
                )
                results.append(analysis)
            except Exception as e:
                print(f"Error analyzing {holding.get('symbol', 'UNKNOWN')}: {e}", file=sys.stderr)
        
        # Sort by setup score (highest first)
        results.sort(key=lambda x: x["setup_score"]["score"], reverse=True)
        
        return results
    
    def generate_report(self, results: List[Dict], top_n: int = 10) -> str:
        """Generate formatted analysis report"""
        report = []
        report.append("=" * 80)
        report.append("PORTFOLIO TECHNICAL ANALYSIS - HIGHEST PROBABILITY SETUPS")
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("=" * 80)
        report.append("")
        
        # Top setups
        report.append(f"TOP {min(top_n, len(results))} HIGHEST-PRIORITY SETUPS:")
        report.append("-" * 80)
        
        for i, result in enumerate(results[:top_n], 1):
            symbol = result["symbol"]
            price = result["current_price"]
            score = result["setup_score"]
            rr = result["risk_reward"]
            levels = result["support_resistance"]
            
            report.append(f"\n{i}. {symbol} @ ${price}")
            report.append(f"   Rating: {score['rating'].upper()} | Score: {score['score']}/10 | Priority: {score['priority'].upper()}")
            report.append(f"   RSI: {result['rsi']} | Pattern: {result['pattern']}")
            report.append(f"   Risk/Reward: {rr['ratio']}:1 ({rr['quality']}) - Risk: ${rr['risk_dollars']}, Reward: ${rr['reward_dollars']}")
            report.append(f"   Support: ${levels['support']} | Resistance: ${levels['resistance']}")
            report.append(f"   Volatility: {result['volatility']['level']} ({result['volatility']['score']}% annualized)")
            report.append(f"   Signals: {', '.join(score['signals'])}")
        
        report.append("\n" + "=" * 80)
        report.append("KEY METRICS SUMMARY:")
        report.append("-" * 80)
        
        # Calculate summary statistics
        high_priority = len([r for r in results if r["setup_score"]["priority"] == "high"])
        oversold = len([r for r in results if r["rsi"] < 35])
        excellent_rr = len([r for r in results if r["risk_reward"]["ratio"] >= 3])
        
        report.append(f"High-Priority Setups: {high_priority}")
        report.append(f"Oversold Conditions: {oversold}")
        report.append(f"Excellent Risk/Reward (3:1+): {excellent_rr}")
        report.append(f"Total Holdings Analyzed: {len(results)}")
        
        report.append("=" * 80)
        
        return "\n".join(report)


def main():
    parser = argparse.ArgumentParser(description="Portfolio Technical Analysis")
    parser.add_argument("--portfolio", type=str, help="Path to portfolio JSON file")
    parser.add_argument("--output", type=str, help="Output file for results")
    parser.add_argument("--top", type=int, default=10, help="Number of top setups to display")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--demo", action="store_true", help="Run with demo data")
    
    args = parser.parse_args()
    
    analyzer = TechnicalAnalyzer()
    
    if args.demo:
        # Demo portfolio data
        import random
        holdings = []
        demo_symbols = ["NVDA", "MSFT", "GOOGL", "META", "AMZN", "TSLA", "AAPL", "AMD", "INTC", "NFLX"]
        
        for symbol in demo_symbols:
            base_price = random.uniform(50, 500)
            prices = [base_price * (1 + random.uniform(-0.02, 0.02)) for _ in range(30)]
            
            holdings.append({
                "symbol": symbol,
                "current_price": prices[-1],
                "price_history": prices,
                "volume_history": [random.randint(1000000, 10000000) for _ in range(30)]
            })
    
    elif args.portfolio:
        with open(args.portfolio, 'r') as f:
            portfolio_data = json.load(f)
            holdings = portfolio_data.get("holdings", [])
    else:
        print("Error: Must specify --portfolio or use --demo", file=sys.stderr)
        sys.exit(1)
    
    # Run analysis
    results = analyzer.scan_portfolio(holdings)
    
    if args.json:
        output = json.dumps(results, indent=2)
    else:
        output = analyzer.generate_report(results, args.top)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"Analysis saved to {args.output}")
    else:
        print(output)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
