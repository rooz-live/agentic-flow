#!/usr/bin/env python3
"""
Market Data Integration - Alpha Vantage API
Deterministic test data for portfolio calculations and backtesting.

Architecture:
- Real-time market price fetching via Alpha Vantage API
- Deterministic test fixtures for reproducible tests
- Mock mode for offline development
- Rate limiting and caching support

Usage:
    python3 market_data_integration.py --symbol AAPL --price
    python3 market_data_integration.py --backtest --portfolio portfolio.json
    python3 market_data_integration.py --test-mode

API: https://www.alphavantage.co/documentation/

Definition of Ready (DoR):
- Alpha Vantage API key available or test_mode enabled
- Symbol list validated against exchange ticker format
- Cache TTL and rate-limit parameters configured
- Deterministic test fixtures defined for each tracked symbol

Definition of Done (DoD):
- All price fetches return valid PricePoint with non-null timestamp
- Cache hit/miss counters increment correctly
- Rate limiter enforces min_request_interval between API calls
- Backtesting returns match deterministic fixtures in test_mode
- Volatility calculation produces annualized value (√252 scaling)
"""

import argparse
import json
import os
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from urllib.request import urlopen, Request
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode


@dataclass
class PricePoint:
    """Single price data point"""
    symbol: str
    price: float
    timestamp: datetime
    volume: Optional[int] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    close_price: Optional[float] = None
    
    def to_dict(self) -> Dict:
        return {
            'symbol': self.symbol,
            'price': self.price,
            'timestamp': self.timestamp.isoformat(),
            'volume': self.volume,
            'open': self.open_price,
            'high': self.high_price,
            'low': self.low_price,
            'close': self.close_price
        }


@dataclass
class HistoricalData:
    """Historical price series for backtesting"""
    symbol: str
    interval: str  # 1min, 5min, 15min, 30min, 60min, daily, weekly, monthly
    time_series: List[PricePoint]
    
    def get_returns(self) -> List[float]:
        """Calculate periodic returns"""
        if len(self.time_series) < 2:
            return []
        
        returns = []
        for i in range(1, len(self.time_series)):
            prev_price = self.time_series[i-1].close_price or self.time_series[i-1].price
            curr_price = self.time_series[i].close_price or self.time_series[i].price
            if prev_price > 0:
                returns.append((curr_price - prev_price) / prev_price)
        return returns
    
    def volatility(self) -> float:
        """Calculate annualized volatility from returns"""
        import statistics
        returns = self.get_returns()
        if len(returns) < 2:
            return 0.0
        
        daily_vol = statistics.stdev(returns)
        # Annualize (252 trading days)
        return daily_vol * (252 ** 0.5)


class MarketDataClient:
    """Alpha Vantage API client with caching and rate limiting"""
    
    BASE_URL = "https://www.alphavantage.co/query"
    
    # Deterministic test data for offline mode
    TEST_PRICES = {
        "AAPL": {"price": 175.50, "volatility": 0.25},
        "MSFT": {"price": 380.00, "volatility": 0.22},
        "GOOGL": {"price": 140.00, "volatility": 0.28},
        "AMZN": {"price": 155.00, "volatility": 0.30},
        "TSLA": {"price": 200.00, "volatility": 0.55},
        "META": {"price": 480.00, "volatility": 0.35},
        "NVDA": {"price": 700.00, "volatility": 0.45},
        "BTC": {"price": 65000.00, "volatility": 0.65},
        "ETH": {"price": 3500.00, "volatility": 0.58},
    }
    
    def __init__(self, api_key: Optional[str] = None, test_mode: bool = False):
        self.api_key = api_key or os.environ.get('ALPHA_VANTAGE_API_KEY')
        self.test_mode = test_mode
        self.cache: Dict[str, Tuple[PricePoint, datetime]] = {}
        self.cache_ttl = timedelta(minutes=5)
        self.last_request_time: Optional[datetime] = None
        self.min_request_interval = timedelta(seconds=12)  # 5 requests per minute max
        
        # Request statistics
        self.request_count = 0
        self.cache_hits = 0
        self.errors = 0
    
    def _rate_limit(self):
        """Apply rate limiting between requests"""
        if self.last_request_time:
            elapsed = datetime.now() - self.last_request_time
            if elapsed < self.min_request_interval:
                sleep_seconds = (self.min_request_interval - elapsed).total_seconds()
                time.sleep(sleep_seconds)
        self.last_request_time = datetime.now()
    
    def _get_cache_key(self, symbol: str, function: str) -> str:
        """Generate cache key"""
        return f"{function}:{symbol.upper()}"
    
    def _get_cached(self, key: str) -> Optional[PricePoint]:
        """Get cached data if still valid"""
        if key in self.cache:
            data, cached_at = self.cache[key]
            if datetime.now() - cached_at < self.cache_ttl:
                self.cache_hits += 1
                return data
        return None
    
    def _cache_data(self, key: str, data: PricePoint):
        """Cache data with timestamp"""
        self.cache[key] = (data, datetime.now())
    
    def _make_request(self, params: Dict[str, str]) -> Dict:
        """Make API request with error handling"""
        if self.test_mode:
            raise RuntimeError("API call attempted in test mode")
        
        if not self.api_key:
            raise ValueError("Alpha Vantage API key not configured")
        
        self._rate_limit()
        
        params['apikey'] = self.api_key
        url = f"{self.BASE_URL}?{urlencode(params)}"
        
        try:
            req = Request(url, headers={'User-Agent': 'Agentic-Flow/1.0'})
            with urlopen(req, timeout=30) as response:
                self.request_count += 1
                return json.loads(response.read().decode('utf-8'))
        except HTTPError as e:
            self.errors += 1
            if e.code == 429:
                raise RuntimeError("Rate limit exceeded. Free tier: 25 requests/day, 5/minute")
            raise RuntimeError(f"HTTP {e.code}: {e.reason}")
        except URLError as e:
            self.errors += 1
            raise RuntimeError(f"Network error: {e.reason}")
        except json.JSONDecodeError as e:
            self.errors += 1
            raise RuntimeError(f"Invalid JSON response: {e}")
    
    def get_quote(self, symbol: str, use_cache: bool = True) -> PricePoint:
        """Get current quote for a symbol"""
        symbol = symbol.upper()
        cache_key = self._get_cache_key(symbol, "QUOTE")
        
        # Check cache
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                return cached
        
        # Test mode: return deterministic data
        if self.test_mode:
            if symbol in self.TEST_PRICES:
                test_data = self.TEST_PRICES[symbol]
                price_point = PricePoint(
                    symbol=symbol,
                    price=test_data["price"],
                    timestamp=datetime.now(),
                    open_price=test_data["price"] * 0.99,
                    high_price=test_data["price"] * 1.02,
                    low_price=test_data["price"] * 0.98,
                    close_price=test_data["price"]
                )
                self._cache_data(cache_key, price_point)
                return price_point
            else:
                raise ValueError(f"Unknown test symbol: {symbol}")
        
        # Real API call
        params = {
            'function': 'GLOBAL_QUOTE',
            'symbol': symbol
        }
        
        data = self._make_request(params)
        
        if 'Global Quote' not in data:
            if 'Note' in data:
                raise RuntimeError(f"API limit: {data['Note']}")
            if 'Error Message' in data:
                raise RuntimeError(f"API error: {data['Error Message']}")
            raise RuntimeError(f"Unexpected API response: {data}")
        
        quote = data['Global Quote']
        
        price_point = PricePoint(
            symbol=symbol,
            price=float(quote.get('05. price', 0)),
            timestamp=datetime.now(),
            volume=int(quote.get('06. volume', 0)),
            open_price=float(quote.get('02. open', 0)) if quote.get('02. open') else None,
            high_price=float(quote.get('03. high', 0)) if quote.get('03. high') else None,
            low_price=float(quote.get('04. low', 0)) if quote.get('04. low') else None,
            close_price=float(quote.get('08. previous close', 0)) if quote.get('08. previous close') else None
        )
        
        self._cache_data(cache_key, price_point)
        return price_point
    
    def get_intraday(self, symbol: str, interval: str = "5min", 
                     outputsize: str = "compact") -> HistoricalData:
        """Get intraday time series"""
        symbol = symbol.upper()
        
        if self.test_mode:
            # Generate deterministic test data
            return self._generate_test_time_series(symbol, interval)
        
        params = {
            'function': f'TIME_SERIES_INTRADAY',
            'symbol': symbol,
            'interval': interval,
            'outputsize': outputsize
        }
        
        data = self._make_request(params)
        
        time_series_key = f"Time Series ({interval})"
        if time_series_key not in data:
            raise RuntimeError(f"No time series data in response")
        
        time_series = []
        for timestamp_str, values in data[time_series_key].items():
            time_series.append(PricePoint(
                symbol=symbol,
                timestamp=datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S"),
                open_price=float(values.get('1. open', 0)),
                high_price=float(values.get('2. high', 0)),
                low_price=float(values.get('3. low', 0)),
                close_price=float(values.get('4. close', 0)),
                volume=int(float(values.get('5. volume', 0)))
            ))
        
        # Sort by timestamp
        time_series.sort(key=lambda x: x.timestamp)
        
        return HistoricalData(
            symbol=symbol,
            interval=interval,
            time_series=time_series
        )
    
    def _generate_test_time_series(self, symbol: str, interval: str) -> HistoricalData:
        """Generate deterministic test time series"""
        if symbol not in self.TEST_PRICES:
            raise ValueError(f"Unknown test symbol: {symbol}")
        
        base_price = self.TEST_PRICES[symbol]["price"]
        volatility = self.TEST_PRICES[symbol]["volatility"]
        
        # Generate 100 data points
        import random
        random.seed(42)  # Deterministic seed
        
        time_series = []
        current_price = base_price
        
        for i in range(100):
            # Random walk with mean reversion
            change = random.gauss(0, volatility * base_price * 0.01)
            current_price = max(current_price + change, base_price * 0.5)
            
            open_p = current_price * (1 + random.gauss(0, 0.001))
            close_p = current_price
            high_p = max(open_p, close_p) * (1 + abs(random.gauss(0, 0.002)))
            low_p = min(open_p, close_p) * (1 - abs(random.gauss(0, 0.002)))
            
            # Work backwards from now
            if interval == "1min":
                delta = timedelta(minutes=i)
            elif interval == "5min":
                delta = timedelta(minutes=i * 5)
            elif interval == "15min":
                delta = timedelta(minutes=i * 15)
            else:
                delta = timedelta(hours=i)
            
            time_series.append(PricePoint(
                symbol=symbol,
                timestamp=datetime.now() - delta,
                open_price=round(open_p, 2),
                high_price=round(high_p, 2),
                low_price=round(low_p, 2),
                close_price=round(close_p, 2),
                volume=int(random.gauss(1000000, 200000))
            ))
        
        # Sort oldest first
        time_series.sort(key=lambda x: x.timestamp)
        
        return HistoricalData(symbol=symbol, interval=interval, time_series=time_series)
    
    def get_bulk_quotes(self, symbols: List[str]) -> Dict[str, PricePoint]:
        """Get quotes for multiple symbols (with rate limiting)"""
        results = {}
        for symbol in symbols:
            try:
                results[symbol] = self.get_quote(symbol)
            except Exception as e:
                results[symbol] = None
                print(f"Error fetching {symbol}: {e}")
        return results
    
    def get_stats(self) -> Dict:
        """Get client statistics"""
        return {
            'requests_made': self.request_count,
            'cache_hits': self.cache_hits,
            'errors': self.errors,
            'cache_size': len(self.cache),
            'test_mode': self.test_mode
        }


def main():
    parser = argparse.ArgumentParser(
        description='Market Data Integration - Alpha Vantage API'
    )
    
    parser.add_argument('--symbol', '-s', help='Stock/crypto symbol')
    parser.add_argument('--price', '-p', action='store_true', help='Get current price')
    parser.add_argument('--intraday', '-i', action='store_true', help='Get intraday series')
    parser.add_argument('--interval', default='5min', 
                       choices=['1min', '5min', '15min', '30min', '60min'],
                       help='Intraday interval')
    parser.add_argument('--test-mode', '-t', action='store_true',
                       help='Use deterministic test data (no API calls)')
    parser.add_argument('--portfolio', help='Portfolio JSON file for bulk quotes')
    parser.add_argument('--export', '-e', help='Export results to JSON file')
    parser.add_argument('--stats', action='store_true', help='Show client statistics')
    
    args = parser.parse_args()
    
    # Initialize client
    client = MarketDataClient(test_mode=args.test_mode)
    
    results = {}
    
    if args.test_mode:
        print("🧪 TEST MODE: Using deterministic mock data")
        print()
    
    if args.symbol and args.price:
        try:
            quote = client.get_quote(args.symbol)
            print(f"📈 {quote.symbol}")
            print(f"   Price: ${quote.price:.2f}")
            if quote.volume:
                print(f"   Volume: {quote.volume:,}")
            if quote.open_price:
                change = ((quote.price - quote.open_price) / quote.open_price) * 100
                print(f"   Change: {change:+.2f}%")
            results['quote'] = quote.to_dict()
        except Exception as e:
            print(f"❌ Error: {e}")
            return 1
    
    elif args.symbol and args.intraday:
        try:
            data = client.get_intraday(args.symbol, args.interval)
            returns = data.get_returns()
            
            print(f"📊 {data.symbol} Intraday ({data.interval})")
            print(f"   Data points: {len(data.time_series)}")
            print(f"   Volatility: {data.volatility():.1%}")
            
            if returns:
                import statistics
                print(f"   Mean return: {statistics.mean(returns):+.4f}")
                print(f"   Std dev: {statistics.stdev(returns):.4f}")
            
            results['intraday'] = {
                'symbol': data.symbol,
                'interval': data.interval,
                'points': len(data.time_series),
                'volatility': data.volatility()
            }
        except Exception as e:
            print(f"❌ Error: {e}")
            return 1
    
    elif args.portfolio:
        try:
            with open(args.portfolio) as f:
                portfolio = json.load(f)
            
            symbols = [h.get('symbol', h.get('ticker')) for h in portfolio.get('holdings', [])]
            symbols = [s for s in symbols if s]
            
            print(f"📋 Portfolio with {len(symbols)} holdings")
            print()
            
            quotes = client.get_bulk_quotes(symbols)
            
            total_value = 0
            for symbol, quote in quotes.items():
                if quote:
                    # Find holding quantity
                    qty = next((h.get('quantity', 0) for h in portfolio['holdings'] 
                               if h.get('symbol') == symbol or h.get('ticker') == symbol), 0)
                    value = quote.price * qty
                    total_value += value
                    print(f"{symbol}: ${quote.price:.2f} × {qty} = ${value:,.2f}")
            
            print(f"\n💰 Total Value: ${total_value:,.2f}")
            results['portfolio_value'] = total_value
            results['quotes'] = {s: q.to_dict() if q else None for s, q in quotes.items()}
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return 1
    
    elif args.stats:
        stats = client.get_stats()
        print("📊 Client Statistics")
        for key, value in stats.items():
            print(f"   {key}: {value}")
        results['stats'] = stats
    
    else:
        parser.print_help()
        return 0
    
    # Export results
    if args.export and results:
        with open(args.export, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Exported to {args.export}")
    
    return 0


if __name__ == '__main__':
    exit(main())
