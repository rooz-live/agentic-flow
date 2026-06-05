"""
Semantic Cache with Redis and Vector Similarity
Sub-10ms responses for frequent queries with fallback chain

Plan: later-phase-support-proxies-migration-019cbe.md
"""

import json
import hashlib
import time
from typing import Any, Optional, Callable, Dict, List, Tuple
from dataclasses import dataclass
import asyncio

# Optional Redis import - graceful degradation if unavailable
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

import sys
sys.path.insert(0, '/Users/shahroozbhopti/Documents/code')

from src.vector.core.types import SearchResult


@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    value: Any
    timestamp: float
    query_hash: str
    vector: Optional[List[float]] = None
    ttl: int = 300
    
    def is_expired(self) -> bool:
        return time.time() - self.timestamp > self.ttl


class LocalCache:
    """In-memory cache with LRU eviction"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, CacheEntry] = {}
        self._access_times: Dict[str, float] = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from local cache"""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        
        if entry.is_expired():
            del self._cache[key]
            del self._access_times[key]
            return None
        
        # Update access time for LRU
        self._access_times[key] = time.time()
        return entry.value
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        vector: Optional[List[float]] = None
    ):
        """Set value in local cache"""
        # Evict if at capacity
        if len(self._cache) >= self.max_size:
            self._evict_lru()
        
        entry = CacheEntry(
            value=value,
            timestamp=time.time(),
            query_hash=key,
            vector=vector,
            ttl=ttl or self.default_ttl
        )
        
        self._cache[key] = entry
        self._access_times[key] = time.time()
    
    async def delete(self, key: str):
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            del self._access_times[key]
    
    async def clear(self):
        """Clear all cache entries"""
        self._cache.clear()
        self._access_times.clear()
    
    def _evict_lru(self):
        """Evict least recently used entry"""
        if not self._access_times:
            return
        
        # Find oldest accessed key
        oldest_key = min(self._access_times, key=self._access_times.get)
        del self._cache[oldest_key]
        del self._access_times[oldest_key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "ttl_seconds": self.default_ttl
        }


class SemanticCache:
    """
    Semantic cache with Redis primary and local fallback.
    Uses vector similarity for approximate matching.
    """
    
    def __init__(
        self,
        redis_url: Optional[str] = None,
        similarity_threshold: float = 0.95,
        default_ttl: int = 300,
        local_cache_size: int = 1000
    ):
        self.similarity_threshold = similarity_threshold
        self.default_ttl = default_ttl
        self.local_cache = LocalCache(max_size=local_cache_size)
        
        # Redis connection
        self._redis: Optional[Any] = None
        self._redis_available = False
        
        if REDIS_AVAILABLE and redis_url:
            try:
                self._redis = redis.from_url(redis_url)
                self._redis_available = True
            except Exception as e:
                print(f"Redis connection failed: {e}. Using local cache only.")
    
    def _compute_query_hash(self, query: str) -> str:
        """Compute hash for query string"""
        return hashlib.sha256(query.encode()).hexdigest()[:16]
    
    def _compute_similarity(
        self,
        vec1: List[float],
        vec2: List[float]
    ) -> float:
        """Compute cosine similarity between two vectors"""
        if len(vec1) != len(vec2):
            return 0.0
        
        # Dot product
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        
        # Magnitudes
        mag1 = sum(a * a for a in vec1) ** 0.5
        mag2 = sum(b * b for b in vec2) ** 0.5
        
        if mag1 == 0 or mag2 == 0:
            return 0.0
        
        return dot_product / (mag1 * mag2)
    
    async def get_or_compute(
        self,
        query: str,
        compute_func: Callable[[str], Any],
        embed_func: Optional[Callable[[str], List[float]]] = None,
        ttl: Optional[int] = None
    ) -> Tuple[Any, str]:  # (result, source)
        """
        Get from cache or compute and cache result.
        Returns (result, source) where source indicates cache hit level.
        """
        start_time = time.time()
        query_hash = self._compute_query_hash(query)
        ttl = ttl or self.default_ttl
        
        # Try exact match in local cache first (fastest)
        cached = await self.local_cache.get(query_hash)
        if cached is not None:
            return cached, "local_exact"
        
        # Try Redis if available
        if self._redis_available and self._redis:
            try:
                redis_key = f"semantic:cache:{query_hash}"
                cached_data = await self._redis.get(redis_key)
                
                if cached_data:
                    result = json.loads(cached_data)
                    # Promote to local cache
                    await self.local_cache.set(query_hash, result, ttl)
                    return result, "redis_exact"
            except Exception:
                pass  # Fall through to semantic matching
        
        # Try semantic similarity match
        if embed_func:
            query_vector = embed_func(query)
            
            # Search local cache for similar queries
            similar_result = await self._find_semantic_match(
                query_vector, self.local_cache
            )
            if similar_result:
                return similar_result, "local_semantic"
        
        # Compute result
        try:
            if asyncio.iscoroutinefunction(compute_func):
                result = await compute_func(query)
            else:
                result = compute_func(query)
        except Exception as e:
            return {"error": str(e)}, "error"
        
        # Cache result
        await self._cache_result(
            query_hash, result, ttl,
            embed_func(query) if embed_func else None
        )
        
        return result, "computed"
    
    async def _find_semantic_match(
        self,
        query_vector: List[float],
        cache: LocalCache
    ) -> Optional[Any]:
        """Find semantically similar cached result"""
        for key, entry in cache._cache.items():
            if entry.vector and not entry.is_expired():
                similarity = self._compute_similarity(query_vector, entry.vector)
                
                if similarity >= self.similarity_threshold:
                    # Update access time
                    cache._access_times[key] = time.time()
                    return entry.value
        
        return None
    
    async def _cache_result(
        self,
        query_hash: str,
        result: Any,
        ttl: int,
        vector: Optional[List[float]] = None
    ):
        """Cache result in both local and Redis"""
        # Cache locally
        await self.local_cache.set(query_hash, result, ttl, vector)
        
        # Cache in Redis if available
        if self._redis_available and self._redis:
            try:
                redis_key = f"semantic:cache:{query_hash}"
                await self._redis.setex(
                    redis_key,
                    ttl,
                    json.dumps(result, default=str)
                )
            except Exception:
                pass  # Local cache is sufficient
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern"""
        # Local cache
        keys_to_delete = [
            key for key in self.local_cache._cache.keys()
            if pattern in key
        ]
        for key in keys_to_delete:
            await self.local_cache.delete(key)
        
        # Redis
        if self._redis_available and self._redis:
            try:
                # Use SCAN to find matching keys
                cursor = 0
                while True:
                    cursor, keys = await self._redis.scan(
                        cursor,
                        match=f"semantic:cache:*{pattern}*"
                    )
                    if keys:
                        await self._redis.delete(*keys)
                    if cursor == 0:
                        break
            except Exception:
                pass
    
    async def health_check(self) -> Dict[str, Any]:
        """Check cache health"""
        health = {
            "local_cache": self.local_cache.get_stats(),
            "redis_available": self._redis_available,
            "similarity_threshold": self.similarity_threshold
        }
        
        if self._redis_available and self._redis:
            try:
                await self._redis.ping()
                health["redis_connected"] = True
            except Exception as e:
                health["redis_connected"] = False
                health["redis_error"] = str(e)
        
        return health
    
    async def close(self):
        """Close Redis connection"""
        if self._redis:
            await self._redis.close()


# Convenience function for simple caching
async def cached_search(
    cache: SemanticCache,
    query: str,
    search_func: Callable[[str], List[SearchResult]],
    embed_func: Callable[[str], List[float]],
    ttl: int = 300
) -> Tuple[List[SearchResult], str]:
    """
    Cached semantic search with automatic embedding
    """
    return await cache.get_or_compute(
        query=query,
        compute_func=search_func,
        embed_func=embed_func,
        ttl=ttl
    )


if __name__ == "__main__":
    async def test_semantic_cache():
        """Test semantic cache functionality"""
        cache = SemanticCache(default_ttl=60)
        
        # Mock embedding function
        def mock_embed(query: str) -> List[float]:
            """Simple hash-based embedding for testing"""
            hash_val = hash(query)
            return [(hash_val % 100) / 100.0] * 10
        
        # Mock search function
        call_count = 0
        def mock_search(query: str) -> Dict[str, Any]:
            nonlocal call_count
            call_count += 1
            return {
                "query": query,
                "results": [f"result_{i}" for i in range(5)],
                "timestamp": time.time()
            }
        
        print("Testing Semantic Cache:")
        print()
        
        # First call - should compute
        result1, source1 = await cache.get_or_compute(
            "ROAM risk mitigation",
            mock_search,
            mock_embed
        )
        print(f"Call 1: {source1} (compute calls: {call_count})")
        
        # Second call with same query - should hit local cache
        result2, source2 = await cache.get_or_compute(
            "ROAM risk mitigation",
            mock_search,
            mock_embed
        )
        print(f"Call 2: {source2} (compute calls: {call_count})")
        
        # Third call with similar query - semantic match
        result3, source3 = await cache.get_or_compute(
            "ROAM risk pattern",
            mock_search,
            mock_embed
        )
        print(f"Call 3: {source3} (compute calls: {call_count})")
        
        print()
        print("Health check:")
        health = await cache.health_check()
        print(json.dumps(health, indent=2))
    
    asyncio.run(test_semantic_cache())
