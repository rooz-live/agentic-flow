#!/usr/bin/env python3
"""
Cache Client for TUI Dashboard
================================
Python client for Rust Cache Service via HTTP/JSON API

Usage:
    from cache_client import CacheClient
    
    client = CacheClient("http://localhost:3000")
    client.insert("vector_123", [1.0, 2.0, 3.0])
    vector = client.get("vector_123")
    stats = client.get_stats()

Definition of Ready (DoR):
- Rust cache service running and accessible at base_url
- HTTP/JSON API endpoints /api/cache/* available
- requests library installed in Python environment

Definition of Done (DoD):
- insert/get/clear/hash operations return correct success/failure status
- get_stats returns valid dictionary with hits, misses, evictions, hit_rate
- health_check returns True only when service responds with status=ok
- All HTTP errors handled gracefully with fallback return values
"""

import requests
from typing import List, Optional, Dict
import json


class CacheClient:
    """Python client for Rust Cache Service (NAPI-RS)"""
    
    def __init__(self, base_url: str = "http://localhost:3000"):
        """
        Initialize cache client.
        
        Args:
            base_url: Base URL of cache service (default: http://localhost:3000)
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def insert(self, key: str, value: List[float]) -> bool:
        """
        Insert vector into cache.
        
        Args:
            key: Cache key
            value: Vector data (list of floats)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            response = self.session.post(
                f"{self.base_url}/api/cache/insert",
                json={"key": key, "value": value},
                timeout=5
            )
            response.raise_for_status()
            return response.json().get("success", False)
        except Exception as e:
            print(f"Cache insert error: {e}")
            return False
    
    def get(self, key: str) -> Optional[List[float]]:
        """
        Get vector from cache.
        
        Args:
            key: Cache key
        
        Returns:
            Vector data if found, None otherwise
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/cache/get/{key}",
                timeout=5
            )
            
            if response.status_code == 404:
                return None
            
            response.raise_for_status()
            return response.json().get("value")
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    def get_stats(self) -> Dict:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        try:
            response = self.session.get(
                f"{self.base_url}/api/cache/stats",
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Cache stats error: {e}")
            return {
                "hits": 0,
                "misses": 0,
                "evictions": 0,
                "overflow_writes": 0,
                "hit_rate": 0.0,
                "capacity_mb": 0,
                "size_mb": 0,
                "entries": 0,
                "is_empty": True
            }
    
    def clear(self) -> bool:
        """
        Clear all cache entries.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            response = self.session.post(
                f"{self.base_url}/api/cache/clear",
                timeout=5
            )
            response.raise_for_status()
            return response.json().get("success", False)
        except Exception as e:
            print(f"Cache clear error: {e}")
            return False
    
    def hash_vector(self, data: List[float]) -> Optional[str]:
        """
        Hash vector using BLAKE3.
        
        Args:
            data: Vector data
        
        Returns:
            BLAKE3 hash string if successful, None otherwise
        """
        try:
            response = self.session.post(
                f"{self.base_url}/api/cache/hash",
                json={"data": data},
                timeout=5
            )
            response.raise_for_status()
            return response.json().get("hash")
        except Exception as e:
            print(f"Cache hash error: {e}")
            return None
    
    def health_check(self) -> bool:
        """
        Check if cache service is healthy.
        
        Returns:
            True if service is healthy, False otherwise
        """
        try:
            response = self.session.get(
                f"{self.base_url}/health",
                timeout=2
            )
            response.raise_for_status()
            return response.json().get("status") == "ok"
        except Exception:
            return False


# Example usage
if __name__ == "__main__":
    client = CacheClient()
    
    # Health check
    if not client.health_check():
        print("❌ Cache service not available")
        print("Start service with: ./scripts/start-cache-service.sh")
        exit(1)
    
    print("✅ Cache service healthy")
    
    # Insert vector
    client.insert("test_vector", [1.0, 2.0, 3.0, 4.0])
    print("✓ Inserted test_vector")
    
    # Get vector
    vector = client.get("test_vector")
    print(f"✓ Retrieved: {vector}")
    
    # Get stats
    stats = client.get_stats()
    print(f"✓ Stats: {json.dumps(stats, indent=2)}")
    
    # Hash vector
    hash_val = client.hash_vector([1.0, 2.0, 3.0])
    print(f"✓ Hash: {hash_val}")

