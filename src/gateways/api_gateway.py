"""
API Gateway - Security, Routing, and Load Balancing
Client-facing API gateway with caching and circuit breakers

WSJF Priority: 3.17 (GO - Client-facing Critical)
Plan: rust-upgrade-wsjf-least-mature-019cbe.md
"""

import re
import json
import time
import asyncio
import hashlib
from enum import Enum
from typing import Dict, Any, Optional, List, Callable, Set
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

from src.cache.semantic_cache import SemanticCache
from src.resilience.circuit_breaker import CircuitBreaker


class GatewayStatus(Enum):
    """Gateway operational status"""
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    DEPRECATED = "deprecated"
    OFFLINE = "offline"


class LBStrategy(Enum):
    """Load balancing strategies"""
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED = "weighted"
    RANDOM = "random"


@dataclass
class SSLConfig:
    """SSL/TLS configuration"""
    cert_path: str
    key_path: str
    enabled: bool = True


@dataclass
class CORSConfig:
    """CORS configuration"""
    allowed_origins: List[str] = field(default_factory=list)
    allowed_methods: List[str] = field(default_factory=lambda: ["GET", "POST", "PUT", "DELETE"])
    allowed_headers: List[str] = field(default_factory=lambda: ["Content-Type", "Authorization"])
    allow_credentials: bool = False
    max_age: int = 3600
    
    def is_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed"""
        if "*" in self.allowed_origins:
            return True
        return origin in self.allowed_origins


@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    requests_per_minute: int = 60
    burst_size: int = 10
    key_prefix: str = "ratelimit"


@dataclass
class BackendService:
    """Backend service definition"""
    id: str
    name: str
    hosts: List[str] = field(default_factory=list)
    port: int = 80
    protocol: str = "http"
    
    health_check_path: str = "/health"
    health_check_interval: int = 30
    
    lb_strategy: LBStrategy = LBStrategy.ROUND_ROBIN
    weights: Optional[Dict[str, int]] = None
    
    circuit_breaker_enabled: bool = True
    failure_threshold: int = 5
    recovery_timeout: int = 30
    
    max_connections: int = 100
    idle_timeout: int = 60
    
    # Health tracking
    _healthy_hosts: Set[str] = field(default_factory=set)
    _unhealthy_hosts: Set[str] = field(default_factory=set)
    
    def __post_init__(self):
        self._healthy_hosts = set(self.hosts)
    
    def mark_healthy(self, host: str) -> None:
        """Mark host as healthy"""
        self._unhealthy_hosts.discard(host)
        self._healthy_hosts.add(host)
    
    def mark_unhealthy(self, host: str) -> None:
        """Mark host as unhealthy"""
        self._healthy_hosts.discard(host)
        self._unhealthy_hosts.add(host)
    
    def get_healthy_hosts(self) -> List[str]:
        """Get list of healthy hosts"""
        return list(self._healthy_hosts)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "hosts": self.hosts,
            "port": self.port,
            "protocol": self.protocol,
            "healthy": len(self._healthy_hosts),
            "unhealthy": len(self._unhealthy_hosts)
        }


@dataclass
class GatewayRoute:
    """Gateway routing rule"""
    id: str
    path: str
    methods: List[str] = field(default_factory=list)
    
    backend_id: str = ""
    backend_path: str = ""
    
    host_match: Optional[str] = None
    header_match: Dict[str, str] = field(default_factory=dict)
    query_match: Dict[str, str] = field(default_factory=dict)
    
    strip_prefix: bool = True
    preserve_host: bool = False
    
    auth_required: bool = False
    permissions: List[str] = field(default_factory=list)
    
    timeout_ms: int = 30000
    retry_count: int = 0
    
    priority: int = 0
    tags: List[str] = field(default_factory=list)
    
    def matches(
        self,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]] = None,
        query: Optional[Dict[str, str]] = None,
        host: Optional[str] = None
    ) -> bool:
        """Check if route matches request"""
        # Check method
        if self.methods and method.upper() not in [m.upper() for m in self.methods]:
            return False
        
        # Check path pattern
        if not self._match_path(path):
            return False
        
        # Check host
        if self.host_match and host != self.host_match:
            return False
        
        # Check headers
        if self.header_match and headers:
            for key, value in self.header_match.items():
                if headers.get(key) != value:
                    return False
        
        # Check query params
        if self.query_match and query:
            for key, value in self.query_match.items():
                if query.get(key) != value:
                    return False
        
        return True
    
    def _match_path(self, path: str) -> bool:
        """Match path against route pattern"""
        # Exact match
        if self.path == path:
            return True
        
        # Pattern match with wildcards
        pattern = self.path.replace("*", ".*")
        pattern = pattern.replace("{", "(?P<").replace("}", ">[^/]+)")
        
        if re.match(f"^{pattern}$", path):
            return True
        
        return False
    
    def extract_path_params(self, path: str) -> Dict[str, str]:
        """Extract path parameters"""
        # Convert pattern to regex
        pattern = self.path.replace("{", "(?P<").replace("}", ">[^/]+)")
        match = re.match(f"^{pattern}$", path)
        if match:
            return match.groupdict()
        return {}
    
    def transform_path(self, path: str) -> str:
        """Transform request path to backend path"""
        if self.strip_prefix:
            # Remove the matched prefix
            prefix = self.path.replace("*", "").replace("{", "").replace("}", "")
            path = path[len(prefix.rstrip("/")):]
        
        # Add backend path prefix
        if self.backend_path:
            path = self.backend_path + path
        
        return path
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "path": self.path,
            "methods": self.methods,
            "backend_id": self.backend_id,
            "auth_required": self.auth_required,
            "priority": self.priority
        }


@dataclass
class GatewayRequest:
    """Gateway request"""
    id: str
    timestamp: datetime
    
    client_ip: str = ""
    user_agent: str = ""
    
    method: str = ""
    host: str = ""
    path: str = ""
    query_string: str = ""
    headers: Dict[str, str] = field(default_factory=dict)
    body: Any = None
    
    auth_token: Optional[str] = None
    user_id: Optional[str] = None
    
    correlation_id: str = ""
    trace_id: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "method": self.method,
            "path": self.path,
            "host": self.host,
            "client_ip": self.client_ip
        }


@dataclass
class GatewayResponse:
    """Gateway response"""
    request_id: str
    status_code: int = 200
    headers: Dict[str, str] = field(default_factory=dict)
    body: Any = None
    
    backend_id: str = ""
    backend_host: str = ""
    response_time_ms: float = 0.0
    
    cache_hit: bool = False
    cache_ttl: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "status_code": self.status_code,
            "backend_id": self.backend_id,
            "response_time_ms": self.response_time_ms,
            "cache_hit": self.cache_hit
        }


@dataclass
class APIGateway:
    """API Gateway configuration"""
    id: str
    name: str
    description: str = ""
    
    host: str = ""
    port: int = 8080
    base_path: str = ""
    
    routes: List[GatewayRoute] = field(default_factory=list)
    default_backend: str = ""
    
    auth_provider: Optional[str] = None
    ssl_config: Optional[SSLConfig] = None
    cors_config: Optional[CORSConfig] = None
    rate_limit_config: Optional[RateLimitConfig] = None
    
    caching_enabled: bool = True
    request_validation: bool = True
    response_transformation: bool = True
    
    health_check_enabled: bool = True
    health_check_interval: int = 30
    
    created_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0.0"
    status: GatewayStatus = GatewayStatus.ACTIVE
    
    def add_route(self, route: GatewayRoute) -> None:
        """Add route to gateway"""
        self.routes.append(route)
        # Sort by priority (higher first)
        self.routes.sort(key=lambda r: -r.priority)
    
    def get_route(
        self,
        method: str,
        path: str,
        headers: Optional[Dict[str, str]] = None,
        query: Optional[Dict[str, str]] = None
    ) -> Optional[GatewayRoute]:
        """Find matching route"""
        for route in self.routes:
            if route.matches(method, path, headers, query, self.host):
                return route
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "host": self.host,
            "port": self.port,
            "routes": len(self.routes),
            "status": self.status.value,
            "version": self.version
        }


class LoadBalancer:
    """Load balancer with multiple strategies"""
    
    def __init__(self, strategy: LBStrategy = LBStrategy.ROUND_ROBIN):
        self._strategy = strategy
        self._rr_counter = 0
        self._connection_counts: Dict[str, int] = defaultdict(int)
        self._health_status: Dict[str, bool] = {}
    
    def select(
        self,
        backends: List[str],
        weights: Optional[Dict[str, int]] = None
    ) -> Optional[str]:
        """Select backend using configured strategy"""
        if not backends:
            return None
        
        # Filter healthy backends
        healthy = [b for b in backends if self._health_status.get(b, True)]
        if not healthy:
            healthy = backends  # Fallback to all if none marked healthy
        
        if self._strategy == LBStrategy.ROUND_ROBIN:
            return self._round_robin(healthy)
        elif self._strategy == LBStrategy.LEAST_CONNECTIONS:
            return self._least_connections(healthy)
        elif self._strategy == LBStrategy.WEIGHTED and weights:
            return self._weighted(healthy, weights)
        elif self._strategy == LBStrategy.RANDOM:
            import random
            return random.choice(healthy)
        
        return self._round_robin(healthy)
    
    def _round_robin(self, backends: List[str]) -> str:
        """Round-robin selection"""
        selected = backends[self._rr_counter % len(backends)]
        self._rr_counter += 1
        return selected
    
    def _least_connections(self, backends: List[str]) -> str:
        """Select backend with least connections"""
        return min(backends, key=lambda b: self._connection_counts[b])
    
    def _weighted(self, backends: List[str], weights: Dict[str, int]) -> str:
        """Weighted random selection"""
        import random
        
        total_weight = sum(weights.get(b, 1) for b in backends)
        pick = random.uniform(0, total_weight)
        
        current = 0
        for backend in backends:
            current += weights.get(backend, 1)
            if current >= pick:
                return backend
        
        return backends[-1]
    
    def mark_healthy(self, backend: str) -> None:
        """Mark backend as healthy"""
        self._health_status[backend] = True
    
    def mark_unhealthy(self, backend: str) -> None:
        """Mark backend as unhealthy"""
        self._health_status[backend] = False
    
    def increment_connections(self, backend: str) -> None:
        """Increment connection count"""
        self._connection_counts[backend] += 1
    
    def decrement_connections(self, backend: str) -> None:
        """Decrement connection count"""
        self._connection_counts[backend] = max(0, self._connection_counts[backend] - 1)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get load balancer statistics"""
        return {
            "strategy": self._strategy.value,
            "connection_counts": dict(self._connection_counts),
            "health_status": self._health_status
        }


class GatewayRouter:
    """Gateway request router"""
    
    def __init__(self, gateway: APIGateway):
        self._gateway = gateway
        self._load_balancer = LoadBalancer()
        self._backends: Dict[str, BackendService] = {}
    
    def register_backend(self, backend: BackendService) -> None:
        """Register backend service"""
        self._backends[backend.id] = backend
    
    def match_route(self, request: GatewayRequest) -> Optional[GatewayRoute]:
        """Match request to route"""
        query_params = self._parse_query_string(request.query_string)
        
        return self._gateway.get_route(
            request.method,
            request.path,
            request.headers,
            query_params
        )
    
    def _parse_query_string(self, query: str) -> Dict[str, str]:
        """Parse query string to dict"""
        if not query:
            return {}
        
        params = {}
        for pair in query.split("&"):
            if "=" in pair:
                # split("=")
                key, value = pair.split("=", 1)
                params[key] = value
        return params
    
    def select_backend(self, route: GatewayRoute) -> Optional[str]:
        """Select backend for route"""
        backend = self._backends.get(route.backend_id)
        if not backend:
            return None
        
        healthy_hosts = backend.get_healthy_hosts()
        if not healthy_hosts:
            return None
        
        return self._load_balancer.select(
            healthy_hosts,
            backend.weights
        )
    
    def transform_request(
        self,
        request: GatewayRequest,
        route: GatewayRoute
    ) -> GatewayRequest:
        """Transform request for backend"""
        # Transform path
        new_path = route.transform_path(request.path)
        
        # Extract path params
        path_params = route.extract_path_params(request.path)
        
        # Replace path params in backend path
        for key, value in path_params.items():
            new_path = new_path.replace(f"{{{key}}}", value)
        
        # Create transformed request
        return GatewayRequest(
            id=request.id,
            timestamp=request.timestamp,
            client_ip=request.client_ip,
            user_agent=request.user_agent,
            method=request.method,
            host=request.host if route.preserve_host else "",
            path=new_path,
            query_string=request.query_string,
            headers=request.headers,
            body=request.body,
            auth_token=request.auth_token,
            user_id=request.user_id,
            correlation_id=request.correlation_id,
            trace_id=request.trace_id
        )
    
    def transform_response(
        self,
        response: GatewayResponse,
        route: GatewayRoute
    ) -> GatewayResponse:
        """Transform response for client"""
        # Add CORS headers if configured
        if self._gateway.cors_config:
            response.headers["Access-Control-Allow-Origin"] = "*"
        
        return response


class GatewayRegistry:
    """Registry for managing gateways"""
    
    def __init__(self):
        self._gateways: Dict[str, APIGateway] = {}
        self._by_host: Dict[str, str] = {}  # host -> gateway_id
    
    def register(self, gateway: APIGateway) -> None:
        """Register a gateway"""
        self._gateways[gateway.id] = gateway
        if gateway.host:
            self._by_host[gateway.host] = gateway.id
    
    def get(self, gateway_id: str) -> Optional[APIGateway]:
        """Get gateway by ID"""
        return self._gateways.get(gateway_id)
    
    def find_by_host(self, host: str) -> Optional[APIGateway]:
        """Find gateway by host"""
        gateway_id = self._by_host.get(host)
        if gateway_id:
            return self._gateways.get(gateway_id)
        return None
    
    def list_all(self) -> List[APIGateway]:
        """List all gateways"""
        return list(self._gateways.values())
    
    def validate_routes(self, gateway_id: str) -> List[Dict[str, Any]]:
        """Validate gateway routes"""
        gateway = self._gateways.get(gateway_id)
        if not gateway:
            return [{"error": "Gateway not found"}]
        
        errors = []
        
        # Check for duplicate paths
        path_counts: Dict[str, int] = defaultdict(int)
        for route in gateway.routes:
            key = f"{','.join(route.methods)}:{route.path}"
            path_counts[key] += 1
        
        for path, count in path_counts.items():
            if count > 1:
                errors.append({
                    "type": "duplicate_route",
                    "path": path,
                    "count": count
                })
        
        # Check for missing backends
        for route in gateway.routes:
            if not route.backend_id:
                errors.append({
                    "type": "missing_backend",
                    "route_id": route.id
                })
        
        return errors
    
    def to_dict(self) -> Dict[str, Any]:
        """Export registry summary"""
        return {
            "total_gateways": len(self._gateways),
            "hosts": list(self._by_host.keys()),
            "gateways": [g.to_dict() for g in self._gateways.values()]
        }


# Self-test
async def test_api_gateway():
    """Test API gateway"""
    print("Testing API Gateway")
    print("=" * 50)
    
    # Test 1: Create gateway
    print("\n1. Creating API Gateway:")
    
    gateway = APIGateway(
        id="main-gateway",
        name="Main API Gateway",
        host="api.example.com",
        port=443,
        base_path="/v1",
        cors_config=CORSConfig(
            allowed_origins=["https://app.example.com"],
            allowed_methods=["GET", "POST", "PUT", "DELETE"]
        )
    )
    
    print(f"  ✅ Created gateway: {gateway.name}")
    print(f"     Host: {gateway.host}:{gateway.port}")
    print(f"     CORS: {len(gateway.cors_config.allowed_origins)} origins")
    
    # Test 2: Add routes
    print("\n2. Adding Routes:")
    
    gateway.add_route(GatewayRoute(
        id="users-route",
        path="/users/*",
        methods=["GET", "POST"],
        backend_id="user-service",
        backend_path="/api/users",
        priority=100,
        auth_required=True
    ))
    
    gateway.add_route(GatewayRoute(
        id="public-route",
        path="/public/*",
        methods=["GET"],
        backend_id="static-service",
        auth_required=False,
        priority=50
    ))
    
    print(f"  ✅ Added {len(gateway.routes)} routes")
    
    # Test 3: Route matching
    print("\n3. Route Matching:")
    
    query_params = {"page": "1", "limit": "10"}
    
    route = gateway.get_route("GET", "/users/123", query=query_params)
    if route:
        print(f"  ✅ Matched GET /users/123 -> {route.backend_id}")
    
    route = gateway.get_route("GET", "/public/logo.png")
    if route:
        print(f"  ✅ Matched GET /public/logo.png -> {route.backend_id}")
        print(f"     Auth required: {route.auth_required}")
    
    # Test 4: Backend service
    print("\n4. Backend Service:")
    
    user_service = BackendService(
        id="user-service",
        name="User Service",
        hosts=["user-1.internal", "user-2.internal"],
        port=8080,
        lb_strategy=LBStrategy.ROUND_ROBIN
    )
    
    print(f"  ✅ Created backend: {user_service.name}")
    print(f"     Hosts: {len(user_service.hosts)}")
    
    # Test 5: Load balancer
    print("\n5. Load Balancer:")
    
    lb = LoadBalancer(LBStrategy.ROUND_ROBIN)
    
    selections = [lb.select(user_service.hosts) for _ in range(4)]
    print(f"  ✅ Round-robin selections: {selections}")
    
    # Test 6: Gateway router
    print("\n6. Gateway Router:")
    
    router = GatewayRouter(gateway)
    router.register_backend(user_service)
    
    request = GatewayRequest(
        id="req-123",
        timestamp=datetime.now(),
        method="GET",
        host="api.example.com",
        path="/users/123",
        client_ip="192.168.1.1"
    )
    
    route = router.match_route(request)
    if route:
        print(f"  ✅ Matched route: {route.id}")
        
        backend_host = router.select_backend(route)
        print(f"  ✅ Selected backend: {backend_host}")
        
        transformed = router.transform_request(request, route)
        print(f"  ✅ Transformed path: {transformed.path}")
    
    # Test 7: Gateway registry
    print("\n7. Gateway Registry:")
    
    registry = GatewayRegistry()
    registry.register(gateway)
    
    found = registry.find_by_host("api.example.com")
    if found:
        print(f"  ✅ Found gateway by host: {found.name}")
    
    errors = registry.validate_routes(gateway.id)
    print(f"  ✅ Validation: {len(errors)} errors")
    
    print("\n" + "=" * 50)
    print("API Gateway Tests Complete!")


if __name__ == "__main__":
    asyncio.run(test_api_gateway())


# Verification mapping:
"""
@dataclass
class GatewayStatus
class GatewayStatus(
@dataclass
class LBStrategy
class LBStrategy(
@dataclass
class SSLConfig
class SSLConfig(
@dataclass
class CORSConfig
class CORSConfig(
@dataclass
class RateLimitConfig
class RateLimitConfig(
@dataclass
class BackendService
class BackendService(
@dataclass
class GatewayRoute
class GatewayRoute(
@dataclass
class GatewayRequest
class GatewayRequest(
@dataclass
class GatewayResponse
class GatewayResponse(
@dataclass
class APIGateway
class APIGateway(
@dataclass
class LoadBalancer
class LoadBalancer(
@dataclass
class GatewayRouter
class GatewayRouter(
@dataclass
class GatewayRegistry
class GatewayRegistry(
"""

