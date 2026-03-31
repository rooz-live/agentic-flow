#!/usr/bin/env python3
"""
Discord Bot Health Check
Uses only Python stdlib - no external dependencies
"""

import sys
import json
import urllib.request
import urllib.error
from datetime import datetime

def check_health(url: str = "https://go.rooz.live/api/discord/health", timeout: int = 5) -> bool:
    """
    Perform health check on Discord bot endpoint
    
    Args:
        url: Health check endpoint URL
        timeout: Request timeout in seconds
        
    Returns:
        True if healthy, False otherwise
    """
    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Discord-Bot-HealthCheck/1.0')
        
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status != 200:
                print(f"❌ HTTP {response.status}: Expected 200", file=sys.stderr)
                return False
            
            # Read and parse JSON response
            body = response.read().decode('utf-8')
            try:
                data = json.loads(body)
            except json.JSONDecodeError as e:
                print(f"❌ Invalid JSON response: {e}", file=sys.stderr)
                return False
            
            # Validate response structure
            if not isinstance(data, dict):
                print("❌ Response is not a JSON object", file=sys.stderr)
                return False
            
            # Check status field
            status = data.get('status')
            if status != 'ok':
                print(f"❌ Status is '{status}', expected 'ok'", file=sys.stderr)
                return False
            
            # Print success metrics
            print("✅ Health check passed!")
            print(f"  Status: {status}")
            print(f"  Version: {data.get('version', 'unknown')}")
            print(f"  Timestamp: {data.get('time', 'unknown')}")
            
            # Optional metrics
            if 'uptime' in data:
                print(f"  Uptime: {data['uptime']}s")
            if 'requests' in data:
                print(f"  Requests: {data['requests']}")
            
            return True
            
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        return False
    except urllib.error.URLError as e:
        print(f"❌ URL Error: {e.reason}", file=sys.stderr)
        return False
    except TimeoutError:
        print(f"❌ Timeout after {timeout}s", file=sys.stderr)
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}", file=sys.stderr)
        return False


def main():
    """Main health check entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Discord Bot Health Check")
    parser.add_argument(
        '--url',
        default='https://go.rooz.live/api/discord/health',
        help='Health check endpoint URL'
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=5,
        help='Request timeout in seconds'
    )
    parser.add_argument(
        '--continuous',
        action='store_true',
        help='Run continuous health checks'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=60,
        help='Interval between continuous checks (seconds)'
    )
    
    args = parser.parse_args()
    
    print(f"Discord Bot Health Check")
    print(f"Target: {args.url}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("-" * 50)
    
    if args.continuous:
        import time
        print(f"Running continuous checks every {args.interval}s (Ctrl+C to stop)")
        
        try:
            while True:
                healthy = check_health(args.url, args.timeout)
                if not healthy:
                    print("⚠️  Health check failed, will retry...")
                print(f"\nNext check in {args.interval}s...")
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\n\nHealth check monitoring stopped")
            sys.exit(0)
    else:
        # Single health check
        healthy = check_health(args.url, args.timeout)
        sys.exit(0 if healthy else 1)


if __name__ == '__main__':
    main()
