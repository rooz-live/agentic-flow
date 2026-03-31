"""
ConceptNet API Client
Interfaces with ConceptNet 5.7 REST API for semantic knowledge graph queries.
Supports 304 languages, 34 relations, with Redis caching and rate limiting.
"""

import os
import time
import json
import hashlib
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import requests
from datetime import datetime, timedelta

# Optional Redis integration
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class ConceptNetClient:
    """
    Client for ConceptNet 5.7 REST API with caching and rate limiting.
    
    API Endpoint: http://api.conceptnet.io
    Rate Limit: 3600 requests/hour (1 req/sec average)
    
    Supported Relations (34):
    - RelatedTo, IsA, PartOf, UsedFor, CapableOf, AtLocation
    - Causes, HasProperty, Synonym, Antonym, DistinctFrom
    - DerivedFrom, SymbolOf, DefinedAs, MannerOf, LocatedNear
    - HasContext, SimilarTo, EtymologicallyRelatedTo, etc.
    """
    
    BASE_URL = 'http://api.conceptnet.io'
    RATE_LIMIT = 3600  # requests per hour
    
    def __init__(
        self,
        redis_url: Optional[str] = None,
        cache_ttl: int = 86400,
        cache_enabled: bool = True
    ):
        """
        Initialize ConceptNet client.
        
        Args:
            redis_url: Redis connection URL (default: REDIS_URL env or localhost)
            cache_ttl: Cache time-to-live in seconds (default: 24 hours)
            cache_enabled: Enable/disable caching (default: True)
        """
        self.cache_enabled = cache_enabled and REDIS_AVAILABLE
        self.cache_ttl = cache_ttl
        
        # Initialize Redis cache if available
        self.redis_client = None
        if self.cache_enabled:
            redis_url = redis_url or os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                self.redis_client.ping()
            except Exception as e:
                print(f"Warning: Redis connection failed: {e}")
                self.cache_enabled = False
        
        # Rate limiting state
        self.request_times: List[float] = []
        self.request_window = 3600  # 1 hour in seconds
        
        # Statistics
        self.stats = {
            'requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'rate_limited': 0
        }
    
    def _rate_limit(self):
        """Enforce rate limiting (3600 req/hour)."""
        now = time.time()
        
        # Remove requests older than 1 hour
        self.request_times = [t for t in self.request_times if now - t < self.request_window]
        
        # Check if we've hit the limit
        if len(self.request_times) >= self.RATE_LIMIT:
            oldest_request = self.request_times[0]
            wait_time = self.request_window - (now - oldest_request)
            if wait_time > 0:
                self.stats['rate_limited'] += 1
                print(f"Rate limit reached. Waiting {wait_time:.2f} seconds...")
                time.sleep(wait_time)
        
        # Record this request
        self.request_times.append(now)
    
    def _get_cache_key(self, endpoint: str, params: Dict) -> str:
        """Generate cache key from endpoint and parameters."""
        key_data = f"{endpoint}:{json.dumps(params, sort_keys=True)}"
        return f"conceptnet:{hashlib.md5(key_data.encode()).hexdigest()}"
    
    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """Retrieve from cache if available."""
        if not self.cache_enabled or self.redis_client is None:
            return None
        
        try:
            cached = self.redis_client.get(cache_key)
            if cached:
                self.stats['cache_hits'] += 1
                return json.loads(cached)
        except Exception as e:
            print(f"Warning: Cache read failed: {e}")
        
        self.stats['cache_misses'] += 1
        return None
    
    def _set_cache(self, cache_key: str, data: Dict):
        """Store in cache with TTL."""
        if not self.cache_enabled or self.redis_client is None:
            return
        
        try:
            self.redis_client.setex(
                cache_key,
                self.cache_ttl,
                json.dumps(data)
            )
        except Exception as e:
            print(f"Warning: Cache write failed: {e}")
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        Make HTTP request with caching and rate limiting.
        
        Args:
            endpoint: API endpoint (e.g., '/c/en/dog')
            params: Query parameters
        
        Returns:
            JSON response as dict
        """
        params = params or {}
        cache_key = self._get_cache_key(endpoint, params)
        
        # Try cache first
        cached_result = self._get_from_cache(cache_key)
        if cached_result is not None:
            return cached_result
        
        # Rate limit
        self._rate_limit()
        
        # Make request
        url = f"{self.BASE_URL}{endpoint}"
        self.stats['requests'] += 1
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Cache successful response
            self._set_cache(cache_key, data)
            
            return data
        except requests.exceptions.RequestException as e:
            print(f"Error: ConceptNet API request failed: {e}")
            raise
    
    def get_concept(self, term: str, lang: str = 'en', limit: int = 20) -> Dict:
        """
        Get concept information and related edges.
        
        Args:
            term: Concept term (e.g., 'dog', 'common_sense')
            lang: Language code (default: 'en')
            limit: Max number of edges to return
        
        Returns:
            Concept data with edges
        """
        endpoint = f"/c/{lang}/{term}"
        return self._make_request(endpoint, {'limit': limit})
    
    def get_related_concepts(
        self,
        term: str,
        lang: str = 'en',
        limit: int = 10
    ) -> List[Dict]:
        """
        Get concepts related to the given term.
        
        Args:
            term: Source term
            lang: Language code
            limit: Max results
        
        Returns:
            List of related concepts with scores
        """
        endpoint = f"/related/c/{lang}/{term}"
        params = {
            'filter': f'/c/{lang}',
            'limit': limit
        }
        response = self._make_request(endpoint, params)
        return response.get('related', [])
    
    def get_relation(
        self,
        start: str,
        end: str,
        rel: Optional[str] = None,
        lang: str = 'en'
    ) -> List[Dict]:
        """
        Query edges between two concepts.
        
        Args:
            start: Start concept
            end: End concept
            rel: Relation type (e.g., 'IsA', 'UsedFor', 'PartOf')
            lang: Language code
        
        Returns:
            List of matching edges
        """
        params = {
            'start': f'/c/{lang}/{start}',
            'end': f'/c/{lang}/{end}'
        }
        if rel:
            params['rel'] = f'/r/{rel}'
        
        response = self._make_request('/query', params)
        return response.get('edges', [])
    
    def get_relatedness(self, term1: str, term2: str, lang: str = 'en') -> float:
        """
        Get semantic relatedness score between two terms.
        
        Uses ConceptNet's /relatedness endpoint which returns a score 
        typically between 0 and 1 (sometimes higher for very related terms).
        
        Args:
            term1: First term
            term2: Second term
            lang: Language code
        
        Returns:
            Relatedness score (0-1+)
        """
        endpoint = '/relatedness'
        params = {
            'node1': f'/c/{lang}/{term1}',
            'node2': f'/c/{lang}/{term2}'
        }
        response = self._make_request(endpoint, params)
        return response.get('value', 0.0)
    
    def search_edges(
        self,
        start: Optional[str] = None,
        end: Optional[str] = None,
        rel: Optional[str] = None,
        lang: str = 'en',
        limit: int = 20
    ) -> List[Dict]:
        """
        Search for edges matching criteria.
        
        Args:
            start: Start concept filter
            end: End concept filter
            rel: Relation filter
            lang: Language code
            limit: Max results
        
        Returns:
            List of matching edges
        """
        params = {'limit': limit}
        
        if start:
            params['start'] = f'/c/{lang}/{start}'
        if end:
            params['end'] = f'/c/{lang}/{end}'
        if rel:
            params['rel'] = f'/r/{rel}'
        
        response = self._make_request('/query', params)
        return response.get('edges', [])
    
    def get_semantic_distance(self, term1: str, term2: str, lang: str = 'en') -> float:
        """
        Calculate semantic distance (inverse of relatedness).
        
        Args:
            term1: First term
            term2: Second term
            lang: Language code
        
        Returns:
            Distance score (0-1, where 0 is identical, 1 is unrelated)
        """
        relatedness = self.get_relatedness(term1, term2, lang)
        return 1.0 - min(relatedness, 1.0)
    
    def detect_semantic_drift_with_conceptnet(
        self,
        baseline_term: str,
        current_term: str,
        lang: str = 'en',
        threshold: float = 0.5
    ) -> Dict:
        """
        Detect semantic drift using ConceptNet relatedness.
        
        Args:
            baseline_term: Reference term
            current_term: Current term to compare
            lang: Language code
            threshold: Drift threshold (distance > threshold = drift detected)
        
        Returns:
            Dict with drift_detected, distance, relatedness, timestamp
        """
        distance = self.get_semantic_distance(baseline_term, current_term, lang)
        relatedness = 1.0 - distance
        
        # Get shared relations for context
        shared_relations = []
        try:
            edges = self.get_relation(baseline_term, current_term, lang=lang)
            shared_relations = [edge.get('rel', {}).get('label', '') for edge in edges[:5]]
        except:
            pass
        
        return {
            'drift_detected': distance > threshold,
            'semantic_distance': distance,
            'relatedness': relatedness,
            'shared_relations': shared_relations,
            'baseline_term': baseline_term,
            'current_term': current_term,
            'threshold': threshold,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_concept_neighborhood(
        self,
        term: str,
        lang: str = 'en',
        depth: int = 1,
        limit_per_level: int = 5
    ) -> Dict:
        """
        Get concept neighborhood (nearby concepts in knowledge graph).
        
        Args:
            term: Center concept
            lang: Language code
            depth: How many hops away (1-2 recommended)
            limit_per_level: Max concepts per depth level
        
        Returns:
            Dict with levels of related concepts
        """
        neighborhood = {'center': term, 'levels': []}
        visited = {term}
        current_level = [term]
        
        for d in range(depth):
            next_level = []
            level_concepts = []
            
            for concept in current_level:
                try:
                    related = self.get_related_concepts(concept, lang, limit_per_level)
                    for item in related[:limit_per_level]:
                        concept_uri = item.get('@id', '')
                        if concept_uri not in visited:
                            visited.add(concept_uri)
                            next_level.append(concept_uri.split('/')[-1])
                            level_concepts.append({
                                'term': concept_uri.split('/')[-1],
                                'score': item.get('weight', 0),
                                'parent': concept
                            })
                except:
                    continue
            
            neighborhood['levels'].append(level_concepts)
            current_level = next_level
            
            if not current_level:
                break
        
        return neighborhood
    
    def get_stats(self) -> Dict:
        """Get client statistics."""
        cache_hit_rate = 0.0
        if self.stats['requests'] > 0:
            total_cache_ops = self.stats['cache_hits'] + self.stats['cache_misses']
            if total_cache_ops > 0:
                cache_hit_rate = self.stats['cache_hits'] / total_cache_ops
        
        return {
            **self.stats,
            'cache_hit_rate': cache_hit_rate,
            'cache_enabled': self.cache_enabled,
            'rate_limit_per_hour': self.RATE_LIMIT
        }
    
    def clear_cache(self):
        """Clear all cached ConceptNet data."""
        if self.cache_enabled and self.redis_client:
            try:
                keys = self.redis_client.keys('conceptnet:*')
                if keys:
                    self.redis_client.delete(*keys)
                print(f"Cleared {len(keys)} cache entries")
            except Exception as e:
                print(f"Warning: Cache clear failed: {e}")


# Convenience functions for common use cases
def get_is_a_relations(term: str, lang: str = 'en', limit: int = 10) -> List[str]:
    """Get 'IsA' relations for a term (e.g., 'dog' IsA 'animal')."""
    client = ConceptNetClient()
    edges = client.search_edges(start=term, rel='IsA', lang=lang, limit=limit)
    return [edge['end']['label'] for edge in edges]


def get_used_for(term: str, lang: str = 'en', limit: int = 10) -> List[str]:
    """Get 'UsedFor' relations for a term."""
    client = ConceptNetClient()
    edges = client.search_edges(start=term, rel='UsedFor', lang=lang, limit=limit)
    return [edge['end']['label'] for edge in edges]


def are_concepts_related(term1: str, term2: str, lang: str = 'en', threshold: float = 0.5) -> bool:
    """Check if two concepts are semantically related."""
    client = ConceptNetClient()
    relatedness = client.get_relatedness(term1, term2, lang)
    return relatedness >= threshold


# Example usage
if __name__ == '__main__':
    client = ConceptNetClient()
    
    # Example 1: Get related concepts
    print("Related to 'dog':")
    related = client.get_related_concepts('dog', limit=5)
    for item in related:
        print(f"  - {item['@id'].split('/')[-1]}: {item['weight']:.3f}")
    
    # Example 2: Check semantic relatedness
    relatedness = client.get_relatedness('dog', 'cat')
    print(f"\nRelatedness between 'dog' and 'cat': {relatedness:.3f}")
    
    # Example 3: Detect semantic drift
    drift_result = client.detect_semantic_drift_with_conceptnet('dog', 'computer')
    print(f"\nSemantic drift detection:")
    print(f"  Drift detected: {drift_result['drift_detected']}")
    print(f"  Distance: {drift_result['semantic_distance']:.3f}")
    
    # Example 4: Get concept neighborhood
    neighborhood = client.get_concept_neighborhood('dog', depth=1, limit_per_level=3)
    print(f"\nConcept neighborhood of 'dog':")
    for i, level in enumerate(neighborhood['levels']):
        print(f"  Level {i+1}:")
        for concept in level:
            print(f"    - {concept['term']} (score: {concept['score']:.3f})")
    
    # Print statistics
    print(f"\nClient statistics:")
    stats = client.get_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
