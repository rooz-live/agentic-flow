"""
Semantic Proxy Router with Intent Classification
Intent-based traffic routing with circuit breakers and semantic caching

Plan: later-phase-support-proxies-migration-019cbe.md
"""

import json
import time
import asyncio
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from enum import Enum
import hashlib

from src.resilience.circuit_breaker import CircuitBreaker, CircuitBreakerRegistry
from src.cache.semantic_cache import SemanticCache

# Optional Rust-accelerated circuit breaker
try:
    from src.rust_bridge import get_bridge, circuit_breaker as rust_circuit_breaker
    RUST_CB_AVAILABLE = True
except ImportError:
    RUST_CB_AVAILABLE = False


class IntentType(Enum):
    """Classified intent types"""
    API_QUERY = "api_query"
    API_MUTATION = "api_mutation"
    AUTHENTICATION = "authentication"
    DATA_FETCH = "data_fetch"
    ANALYTICS = "analytics"
    WEBHOOK = "webhook"
    HEALTH_CHECK = "health_check"
    UNKNOWN = "unknown"


@dataclass
class RequestIntent:
    """Classified request intent"""
    intent_type: IntentType
    confidence: float
    target_service: str
    is_idempotent: bool
    cache_key: Optional[str] = None
    priority: int = 5  # 1-10, lower = higher priority
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RouteDecision:
    """Routing decision for request"""
    target_url: str
    strategy: str  # "direct", "cached", "load_balanced", "circuit_breaker"
    cache_ttl: Optional[int] = None
    timeout_ms: int = 5000
    retry_count: int = 0
    use_semantic_cache: bool = False


class IntentClassifier:
    """Classify request intent using semantic analysis"""
    
    def __init__(self):
        self.idempotent_methods = {"GET", "HEAD", "OPTIONS"}
        self.mutation_methods = {"POST", "PUT", "DELETE", "PATCH"}
        
        # Service routing patterns
        self.service_patterns = {
            "billing": ["/billing", "/payment", "/invoice", "/subscription"],
            "auth": ["/auth", "/login", "/logout", "/token", "/oauth"],
            "analytics": ["/analytics", "/metrics", "/report", "/dashboard"],
            "api": ["/api/v", "/graphql", "/rest"],
            "webhook": ["/webhook", "/callback", "/hook"],
            "health": ["/health", "/ping", "/status", "/ready"]
        }
    
    def classify(
        self,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]] = None,
        body_preview: Optional[str] = None
    ) -> RequestIntent:
        """
        Classify request intent based on HTTP metadata
        """
        method = method.upper()
        path_lower = path.lower()
        
        # Determine intent type
        intent_type = self._determine_intent_type(method, path_lower)
        
        # Determine target service
        target_service = self._determine_target_service(path_lower)
        
        # Check idempotency
        is_idempotent = method in self.idempotent_methods
        
        # Calculate confidence
        confidence = self._calculate_confidence(method, path, target_service)
        
        # Generate cache key for idempotent requests
        cache_key = None
        if is_idempotent:
            cache_key = self._generate_cache_key(method, path, headers, body_preview)
        
        # Determine priority
        priority = self._determine_priority(intent_type, target_service)
        
        return RequestIntent(
            intent_type=intent_type,
            confidence=confidence,
            target_service=target_service,
            is_idempotent=is_idempotent,
            cache_key=cache_key,
            priority=priority,
            metadata={
                "method": method,
                "path": path,
                "timestamp": time.time()
            }
        )
    
    def _determine_intent_type(self, method: str, path: str) -> IntentType:
        """Determine request intent type"""
        if "/health" in path or "/ping" in path or "/status" in path:
            return IntentType.HEALTH_CHECK
        
        if "/auth" in path or "/login" in path or "/token" in path:
            return IntentType.AUTHENTICATION
        
        if "/webhook" in path or "/callback" in path:
            return IntentType.WEBHOOK
        
        if "/analytics" in path or "/metrics" in path:
            return IntentType.ANALYTICS
        
        if method in self.idempotent_methods:
            return IntentType.DATA_FETCH
        
        if method in self.mutation_methods:
            return IntentType.API_MUTATION
        
        return IntentType.UNKNOWN
    
    def _determine_target_service(self, path: str) -> str:
        """Determine target service from path"""
        for service, patterns in self.service_patterns.items():
            for pattern in patterns:
                if pattern in path:
                    return service
        
        return "api"  # Default
    
    def _calculate_confidence(
        self,
        method: str,
        path: str,
        target_service: str
    ) -> float:
        """Calculate classification confidence"""
        confidence = 0.5  # Base confidence
        
        # Boost for known services
        if target_service != "api":
            confidence += 0.3
        
        # Boost for standard REST patterns
        if method in {"GET", "POST", "PUT", "DELETE"}:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _generate_cache_key(
        self,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]],
        body_preview: Optional[str]
    ) -> str:
        """Generate cache key for request"""
        key_parts = [method, path]
        
        # Include relevant headers in cache key
        if headers:
            for header in ["Accept", "Content-Type", "Authorization"]:
                if header in headers:
                    key_parts.append(f"{header}:{headers[header]}")
        
        # Include body preview hash if present
        if body_preview:
            body_hash = hashlib.sha256(body_preview[:100].encode()).hexdigest()[:8]
            key_parts.append(body_hash)
        
        full_key = "|".join(key_parts)
        return hashlib.sha256(full_key.encode()).hexdigest()[:16]
    
    def _determine_priority(
        self,
        intent_type: IntentType,
        target_service: str
    ) -> int:
        """Determine request priority (1-10, lower = higher priority)"""
        priorities = {
            IntentType.HEALTH_CHECK: 2,
            IntentType.AUTHENTICATION: 3,
            IntentType.API_MUTATION: 4,
            IntentType.DATA_FETCH: 5,
            IntentType.WEBHOOK: 6,
            IntentType.ANALYTICS: 8,
            IntentType.UNKNOWN: 7
        }
        
        base_priority = priorities.get(intent_type, 7)
        
        # Boost for critical services
        if target_service in ["auth", "billing"]:
            base_priority = max(1, base_priority - 2)
        
        return base_priority


class SemanticProxy:
    """
    Intent-based traffic routing with resilience patterns
    """
    
    def __init__(
        self,
        circuit_registry: Optional[CircuitBreakerRegistry] = None,
        cache: Optional[SemanticCache] = None
    ):
        self.intent_classifier = IntentClassifier()
        self.circuit_registry = circuit_registry or CircuitBreakerRegistry()
        self.cache = cache or SemanticCache()
        
        # Service endpoints
        self.service_endpoints = {
            "api": ["http://api-1:8000", "http://api-2:8000"],
            "auth": ["http://auth-1:8000"],
            "billing": ["http://billing-1:8000", "http://billing-2:8000"],
            "analytics": ["http://analytics-1:8000"],
            "webhook": ["http://webhook-1:8000"]
        }
        
        # Round-robin counters
        self._rr_counters: Dict[str, int] = {}
    
    async def route_request(
        self,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]] = None,
        body: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Route request with full semantic pipeline
        """
        # Classify intent
        intent = self.intent_classifier.classify(
            method=method,
            path=path,
            headers=headers,
            body_preview=body[:1000] if body else None
        )
        
        # Check circuit breaker
        if self.circuit_registry.is_open(intent.target_service):
            return await self._fallback_response(intent)
        
        # Check cache for idempotent requests
        if intent.is_idempotent and intent.cache_key:
            cached = await self.cache.local_cache.get(intent.cache_key)
            if cached:
                return {
                    "source": "cache",
                    "intent": intent.intent_type.value,
                    "data": cached,
                    "latency_ms": 0
                }
        
        # Make routing decision
        decision = self._make_routing_decision(intent)
        
        # Execute with resilience
        start_time = time.time()
        
        try:
            result = await self._execute_with_resilience(
                decision,
                intent,
                method,
                path,
                headers,
                body
            )
            
            latency_ms = (time.time() - start_time) * 1000
            
            # Cache result if idempotent
            if intent.is_idempotent and intent.cache_key:
                await self.cache.local_cache.set(
                    intent.cache_key,
                    result,
                    ttl=decision.cache_ttl or 300
                )
            
            return {
                "source": "upstream",
                "intent": intent.intent_type.value,
                "service": intent.target_service,
                "data": result,
                "latency_ms": round(latency_ms, 2),
                "circuit_status": "closed"
            }
            
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            
            return {
                "source": "error",
                "intent": intent.intent_type.value,
                "error": str(e),
                "latency_ms": round(latency_ms, 2),
                "circuit_status": "open" if self.circuit_registry.is_open(intent.target_service) else "closed"
            }
    
    def _make_routing_decision(self, intent: RequestIntent) -> RouteDecision:
        """Make routing decision based on intent"""
        endpoints = self.service_endpoints.get(intent.target_service, ["http://api-1:8000"])
        
        # Select endpoint (round-robin)
        target_url = self._select_endpoint(intent.target_service, endpoints)
        
        # Determine strategy
        if intent.is_idempotent:
            strategy = "cached"
            cache_ttl = 300
        elif intent.priority <= 3:
            strategy = "circuit_breaker"
            cache_ttl = None
        else:
            strategy = "direct"
            cache_ttl = None
        
        # Determine timeout based on priority
        timeout_ms = 5000 if intent.priority <= 5 else 10000
        
        return RouteDecision(
            target_url=target_url,
            strategy=strategy,
            cache_ttl=cache_ttl,
            timeout_ms=timeout_ms,
            retry_count=1 if intent.priority <= 3 else 0,
            use_semantic_cache=intent.is_idempotent
        )
    
    def _select_endpoint(self, service: str, endpoints: List[str]) -> str:
        """Select endpoint using round-robin"""
        if service not in self._rr_counters:
            self._rr_counters[service] = 0
        
        idx = self._rr_counters[service] % len(endpoints)
        self._rr_counters[service] += 1
        
        return endpoints[idx]
    
    async def _execute_with_resilience(
        self,
        decision: RouteDecision,
        intent: RequestIntent,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]],
        body: Optional[str]
    ) -> Any:
        """Execute request with circuit breaker protection"""
        breaker = self.circuit_registry.register(
            name=intent.target_service,
            failure_threshold=5,
            recovery_timeout=30.0
        )
        
        async def do_request():
            # In production, make actual HTTP request
            # For now, simulate
            await asyncio.sleep(0.01)
            return {
                "status": "success",
                "service": intent.target_service,
                "endpoint": decision.target_url
            }
        
        return await breaker.call(do_request)
    
    async def _fallback_response(self, intent: RequestIntent) -> Dict[str, Any]:
        """Generate fallback response when circuit is open"""
        return {
            "source": "fallback",
            "intent": intent.intent_type.value,
            "error": f"Circuit breaker open for {intent.target_service}",
            "fallback_data": self._generate_fallback_data(intent),
            "circuit_status": "open"
        }
    
    def _generate_fallback_data(self, intent: RequestIntent) -> Optional[Dict]:
        """Generate fallback data based on intent type"""
        if intent.intent_type == IntentType.HEALTH_CHECK:
            return {"status": "degraded", "reason": "circuit_open"}
        
        if intent.intent_type == IntentType.DATA_FETCH:
            return {"data": [], "fallback": True}
        
        return None
    
    def health_report(self) -> Dict[str, Any]:
        """Generate health report"""
        return {
            "circuit_breakers": self.circuit_registry.health_report(),
            "cache_stats": self.cache.local_cache.get_stats(),
            "service_endpoints": {
                service: len(endpoints)
                for service, endpoints in self.service_endpoints.items()
            }
        }


# FastAPI integration
async def create_proxy_app(proxy: Optional[SemanticProxy] = None):
    """Create FastAPI app for proxy server"""
    try:
        from fastapi import FastAPI, Request, Response
        from fastapi.responses import JSONResponse
    except ImportError:
        return None
    
    app = FastAPI(title="Semantic Proxy Router")
    proxy = proxy or SemanticProxy()
    
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def catch_all(request: Request, path: str):
        """Catch-all route with semantic routing"""
        # Extract request data
        method = request.method
        body = await request.body()
        headers = dict(request.headers)
        
        # Route request
        result = await proxy.route_request(
            method=method,
            path=f"/{path}",
            headers=headers,
            body=body.decode() if body else None
        )
        
        return JSONResponse(content=result)
    
    @app.get("/proxy/health")
    async def proxy_health():
        """Proxy health check"""
        return proxy.health_report()
    
    return app


if __name__ == "__main__":
    async def test_semantic_proxy():
        """Test semantic proxy"""
        proxy = SemanticProxy()
        
        test_requests = [
            ("GET", "/api/v1/users", None),
            ("POST", "/api/v1/orders", '{"item": "test"}'),
            ("GET", "/health", None),
            ("POST", "/auth/login", '{"username": "test"}'),
            ("GET", "/analytics/dashboard", None),
            ("POST", "/webhook/stripe", '{"event": "payment"}')
        ]
        
        print("Testing Semantic Proxy Router:")
        print()
        
        for method, path, body in test_requests:
            result = await proxy.route_request(method, path, body=body)
            
            print(f"{method} {path}")
            print(f"  Intent: {result['intent']}")
            print(f"  Source: {result['source']}")
            if 'service' in result:
                print(f"  Service: {result['service']}")
            if 'latency_ms' in result:
                print(f"  Latency: {result['latency_ms']}ms")
            print()
        
        # Show health report
        print("Health Report:")
        health = proxy.health_report()
        print(json.dumps(health, indent=2, default=str))
    
    asyncio.run(test_semantic_proxy())
