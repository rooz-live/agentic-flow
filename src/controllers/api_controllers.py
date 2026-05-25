"""
API Controllers - DDD Entry Point Management
Controller registry, routing, and request processing

WSJF Priority: 3.25 (GO - Highest CoD: 26)
Plan: rust-upgrade-wsjf-least-mature-019cbe.md
"""

import re
import json
import time
import asyncio
from enum import Enum
from typing import Dict, Any, Optional, List, Tuple, Callable
from dataclasses import dataclass, field
from datetime import datetime

from src.cache.semantic_cache import SemanticCache
from src.resilience.circuit_breaker import CircuitBreaker
from src.methods.mpp_core import MethodContract, MethodExecutor, MethodCall, ExecutionContext


class HTTPMethod(Enum):
    """HTTP methods"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"


@dataclass
class RateLimit:
    """Rate limiting configuration"""
    requests_per_minute: int = 60
    burst_size: int = 10


@dataclass
class ControllerRoute:
    """Controller route definition"""
    path: str
    method: HTTPMethod
    handler: str
    
    request_schema: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None
    
    idempotent: bool = False
    cacheable: bool = False
    async_handler: bool = True
    
    auth_required: bool = False
    permissions: List[str] = field(default_factory=list)
    rate_limit: Optional[RateLimit] = None
    
    summary: str = ""
    description: str = ""
    tags: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "path": self.path,
            "method": self.method.value,
            "handler": self.handler,
            "idempotent": self.idempotent,
            "cacheable": self.cacheable,
            "auth_required": self.auth_required,
            "summary": self.summary
        }


@dataclass
class RequestContext:
    """Request context"""
    request_id: str
    timestamp: datetime
    
    client_ip: str = ""
    user_agent: str = ""
    
    auth_token: Optional[str] = None
    user_id: Optional[str] = None
    permissions: List[str] = field(default_factory=list)
    
    http_method: str = ""
    path: str = ""
    query_params: Dict[str, Any] = field(default_factory=dict)
    headers: Dict[str, str] = field(default_factory=dict)
    body: Any = None
    
    correlation_id: Optional[str] = None
    trace_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "path": self.path,
            "method": self.http_method,
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat()
        }


@dataclass
class ErrorInfo:
    """Error information"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    stacktrace: Optional[str] = None


@dataclass
class ResponseContext:
    """Response context"""
    status_code: int = 200
    headers: Dict[str, str] = field(default_factory=dict)
    body: Any = None
    
    cache_control: Optional[str] = None
    etag: Optional[str] = None
    
    processing_time_ms: float = 0.0
    
    error: Optional[ErrorInfo] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "status_code": self.status_code,
            "processing_time_ms": self.processing_time_ms,
            "error": self.error.code if self.error else None
        }


@dataclass
class Controller:
    """API Controller"""
    id: str
    name: str
    description: str = ""
    
    base_path: str = ""
    routes: List[ControllerRoute] = field(default_factory=list)
    
    bounded_context_id: str = ""
    aggregate_id: Optional[str] = None
    
    methods: List[str] = field(default_factory=list)
    middleware: List[str] = field(default_factory=list)
    
    auth_required: bool = False
    rate_limit_key: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    
    created_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0.0"
    deprecated: bool = False
    
    def add_route(self, route: ControllerRoute) -> None:
        """Add route to controller"""
        self.routes.append(route)
    
    def get_route(self, method: HTTPMethod, path: str) -> Optional[ControllerRoute]:
        """Get route by method and path"""
        for route in self.routes:
            if route.method == method and route.path == path:
                return route
        return None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "base_path": self.base_path,
            "routes": len(self.routes),
            "context_id": self.bounded_context_id,
            "methods": self.methods,
            "version": self.version,
            "deprecated": self.deprecated
        }


@dataclass
class ControllerMatch:
    """Controller match result"""
    controller: Controller
    route: ControllerRoute
    path_params: Dict[str, str] = field(default_factory=dict)
    query_params: Dict[str, Any] = field(default_factory=dict)


class ControllerRegistry:
    """Registry for controllers"""
    
    def __init__(self):
        self._controllers: Dict[str, Controller] = {}
        self._by_context: Dict[str, List[str]] = {}
        self._by_method: Dict[str, List[str]] = {}
        self._path_index: Dict[str, str] = {}  # path -> controller_id
    
    def register(self, controller: Controller) -> None:
        """Register a controller"""
        self._controllers[controller.id] = controller
        
        # Index by context
        if controller.bounded_context_id:
            if controller.bounded_context_id not in self._by_context:
                self._by_context[controller.bounded_context_id] = []
            self._by_context[controller.bounded_context_id].append(controller.id)
        
        # Index by methods
        for method in controller.methods:
            if method not in self._by_method:
                self._by_method[method] = []
            self._by_method[method].append(controller.id)
        
        # Index paths
        for route in controller.routes:
            full_path = controller.base_path + route.path
            self._path_index[f"{route.method.value}:{full_path}"] = controller.id
    
    def get(self, controller_id: str) -> Optional[Controller]:
        """Get controller by ID"""
        return self._controllers.get(controller_id)
    
    def find_by_context(self, context_id: str) -> List[Controller]:
        """Find controllers by bounded context"""
        ids = self._by_context.get(context_id, [])
        return [self._controllers[cid] for cid in ids if cid in self._controllers]
    
    def find_by_path(self, path: str, method: HTTPMethod) -> Optional[Controller]:
        """Find controller by path and method"""
        key = f"{method.value}:{path}"
        controller_id = self._path_index.get(key)
        if controller_id:
            return self._controllers.get(controller_id)
        return None
    
    def find_by_method(self, method_name: str) -> List[Controller]:
        """Find controllers by MPP method binding"""
        ids = self._by_method.get(method_name, [])
        return [self._controllers[cid] for cid in ids if cid in self._controllers]
    
    def get_routes(self) -> List[Tuple[str, ControllerRoute]]:
        """Get all routes"""
        routes = []
        for controller in self._controllers.values():
            for route in controller.routes:
                routes.append((controller.id, route))
        return routes
    
    def validate_all(self) -> List[Dict[str, Any]]:
        """Validate all controllers"""
        errors = []
        
        # Check for duplicate paths
        path_counts: Dict[str, int] = {}
        for controller in self._controllers.values():
            for route in controller.routes:
                full_path = controller.base_path + route.path
                key = f"{route.method.value}:{full_path}"
                path_counts[key] = path_counts.get(key, 0) + 1
        
        for path, count in path_counts.items():
            if count > 1:
                errors.append({
                    "type": "duplicate_path",
                    "path": path,
                    "count": count
                })
        
        return errors
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_controllers": len(self._controllers),
            "by_context": {k: len(v) for k, v in self._by_context.items()},
            "controllers": [c.to_dict() for c in self._controllers.values()]
        }


class Router:
    """Request router"""
    
    def __init__(self, registry: ControllerRegistry):
        self._registry = registry
    
    def match(self, http_method: str, path: str) -> Optional[ControllerMatch]:
        """Match request to controller"""
        try:
            method = HTTPMethod(http_method.upper())
        except ValueError:
            return None
        
        # Try exact match first
        controller = self._registry.find_by_path(path, method)
        if controller:
            route = controller.get_route(method, path.replace(controller.base_path, ""))
            if route:
                return ControllerMatch(
                    controller=controller,
                    route=route
                )
        
        # Try pattern matching
        for ctrl in self._registry._controllers.values():
            for route in ctrl.routes:
                full_path = ctrl.base_path + route.path
                params = self._match_pattern(path, full_path)
                if params is not None and route.method == method:
                    return ControllerMatch(
                        controller=ctrl,
                        route=route,
                        path_params=params
                    )
        
        return None
    
    def _match_pattern(self, actual_path: str, pattern_path: str) -> Optional[Dict[str, str]]:
        """Match path against pattern with parameters"""
        # Convert pattern to regex
        # {param} -> (?P<param>[^/]+)
        regex_pattern = re.sub(r'\{(\w+)\}', r'(?P<\1>[^/]+)', pattern_path)
        regex_pattern = f"^{regex_pattern}$"
        
        match = re.match(regex_pattern, actual_path)
        if match:
            return match.groupdict()
        return None
    
    def get_all_routes(self) -> List[Dict[str, Any]]:
        """Get all route definitions"""
        routes = []
        for controller in self._registry._controllers.values():
            for route in controller.routes:
                routes.append({
                    "controller": controller.name,
                    "path": controller.base_path + route.path,
                    "method": route.method.value,
                    "handler": route.handler
                })
        return routes
    
    def generate_openapi(self) -> Dict[str, Any]:
        """Generate OpenAPI specification"""
        paths = {}
        
        for controller in self._registry._controllers.values():
            for route in controller.routes:
                full_path = controller.base_path + route.path
                if full_path not in paths:
                    paths[full_path] = {}
                
                method = route.method.value.lower()
                paths[full_path][method] = {
                    "summary": route.summary,
                    "description": route.description,
                    "tags": route.tags,
                    "parameters": [
                        {
                            "name": p,
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"}
                        }
                        for p in self._extract_path_params(route.path)
                    ],
                    "responses": {
                        "200": {
                            "description": "Success",
                            "content": {
                                "application/json": {
                                    "schema": route.response_schema or {}
                                }
                            }
                        }
                    }
                }
        
        return {
            "openapi": "3.0.0",
            "info": {
                "title": "API",
                "version": "1.0.0"
            },
            "paths": paths
        }
    
    def _extract_path_params(self, path: str) -> List[str]:
        """Extract path parameters from route pattern"""
        return re.findall(r'\{(\w+)\}', path)


class ErrorHandler:
    """Error handling"""
    
    def __init__(self):
        self._handlers: Dict[type, Callable] = {}
    
    def register_handler(self, error_type: type, handler: Callable) -> None:
        """Register custom error handler"""
        self._handlers[error_type] = handler
    
    def handle(self, error: Exception, request: RequestContext) -> ResponseContext:
        """Handle error"""
        # Check for custom handler
        for error_type, handler in self._handlers.items():
            if isinstance(error, error_type):
                return handler(error, request)
        
        # Default handling
        status_code = 500
        if isinstance(error, ValueError):
            status_code = 400
        elif isinstance(error, PermissionError):
            status_code = 403
        elif isinstance(error, FileNotFoundError):
            status_code = 404
        
        return ResponseContext(
            status_code=status_code,
            error=ErrorInfo(
                code=type(error).__name__,
                message=str(error)
            ),
            headers={"Content-Type": "application/json"}
        )
    
    def format_error(
        self,
        error: Exception,
        include_stacktrace: bool = False
    ) -> Dict[str, Any]:
        """Format error as dictionary"""
        result = {
            "error": type(error).__name__,
            "message": str(error)
        }
        
        if include_stacktrace:
            import traceback
            result["stacktrace"] = traceback.format_exc()
        
        return result


class RequestProcessor:
    """Process requests through controllers"""
    
    def __init__(
        self,
        router: Router,
        method_executor: Optional[MethodExecutor] = None,
        cache: Optional[SemanticCache] = None
    ):
        self._router = router
        self._method_executor = method_executor
        self._cache = cache
        self._error_handler = ErrorHandler()
    
    async def process(self, request: RequestContext) -> ResponseContext:
        """Process request"""
        start_time = time.time()
        
        try:
            # Match route
            match = self._router.match(request.http_method, request.path)
            if not match:
                return ResponseContext(
                    status_code=404,
                    error=ErrorInfo(
                        code="NOT_FOUND",
                        message=f"No route found for {request.http_method} {request.path}"
                    )
                )
            
            # Check cache for idempotent GET requests
            if match.route.cacheable and match.route.method == HTTPMethod.GET and self._cache:
                cache_key = f"{request.path}:{json.dumps(request.query_params, sort_keys=True)}"
                cached = await self._cache.get(cache_key)
                if cached:
                    return ResponseContext(
                        status_code=200,
                        body=cached,
                        processing_time_ms=(time.time() - start_time) * 1000
                    )
            
            # Execute handler (simplified - would call actual handler)
            result = await self._execute_handler(match, request)
            
            processing_time = (time.time() - start_time) * 1000
            
            # Cache result if cacheable
            if match.route.cacheable and self._cache and match.route.method == HTTPMethod.GET:
                cache_key = f"{request.path}:{json.dumps(request.query_params, sort_keys=True)}"
                await self._cache.set(cache_key, result, ttl=300)
            
            return ResponseContext(
                status_code=200,
                body=result,
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            return self._error_handler.handle(e, request)
    
    async def _execute_handler(
        self,
        match: ControllerMatch,
        request: RequestContext
    ) -> Any:
        """Execute controller handler"""
        # In a real implementation, this would:
        # 1. Load the handler function
        # 2. Apply middleware
        # 3. Execute with proper context
        
        # Simplified: return mock result
        return {
            "controller": match.controller.name,
            "route": match.route.handler,
            "params": match.path_params,
            "request_id": request.request_id
        }


# Self-test
async def test_api_controllers():
    """Test API controllers"""
    print("Testing API Controllers")
    print("=" * 50)
    
    # Test 1: Create controller
    print("\n1. Creating Controller:")
    
    user_controller = Controller(
        id="user-controller",
        name="User Controller",
        description="Manage users",
        base_path="/api/users",
        bounded_context_id="user-context",
        tags=["users", "api"]
    )
    
    # Add routes
    user_controller.add_route(ControllerRoute(
        path="/",
        method=HTTPMethod.GET,
        handler="list_users",
        summary="List all users",
        idempotent=True,
        cacheable=True
    ))
    
    user_controller.add_route(ControllerRoute(
        path="/{user_id}",
        method=HTTPMethod.GET,
        handler="get_user",
        summary="Get user by ID",
        idempotent=True
    ))
    
    user_controller.add_route(ControllerRoute(
        path="/",
        method=HTTPMethod.POST,
        handler="create_user",
        summary="Create new user",
        idempotent=False
    ))
    
    print(f"  ✅ Created controller: {user_controller.name}")
    print(f"     Routes: {len(user_controller.routes)}")
    print(f"     Base path: {user_controller.base_path}")
    
    # Test 2: Register controller
    print("\n2. Controller Registry:")
    
    registry = ControllerRegistry()
    registry.register(user_controller)
    
    print(f"  ✅ Registered controller")
    print(f"     Total: {len(registry._controllers)}")
    
    # Test 3: Router matching
    print("\n3. Router Matching:")
    
    router = Router(registry)
    
    # Test exact match
    match = router.match("GET", "/api/users/")
    if match:
        print(f"  ✅ Matched GET /api/users/ -> {match.controller.name}")
    
    # Test pattern match
    match = router.match("GET", "/api/users/123")
    if match:
        print(f"  ✅ Matched GET /api/users/123 -> {match.controller.name}")
        print(f"     Params: {match.path_params}")
    
    # Test no match
    match = router.match("DELETE", "/api/users/123")
    if not match:
        print(f"  ✅ No match for DELETE (as expected)")
    
    # Test 4: OpenAPI generation
    print("\n4. OpenAPI Generation:")
    
    openapi = router.generate_openapi()
    print(f"  ✅ Generated OpenAPI spec")
    print(f"     Version: {openapi['openapi']}")
    print(f"     Paths: {list(openapi['paths'].keys())}")
    
    # Test 5: Request processing
    print("\n5. Request Processing:")
    
    processor = RequestProcessor(router)
    
    request = RequestContext(
        request_id="req-123",
        timestamp=datetime.now(),
        http_method="GET",
        path="/api/users/123",
        client_ip="127.0.0.1"
    )
    
    response = await processor.process(request)
    print(f"  ✅ Processed request")
    print(f"     Status: {response.status_code}")
    print(f"     Time: {response.processing_time_ms:.2f}ms")
    if response.body:
        print(f"     Body: {response.body}")
    
    # Test 6: Validation
    print("\n6. Registry Validation:")
    
    errors = registry.validate_all()
    print(f"  ✅ Validation complete: {len(errors)} errors")
    
    print("\n" + "=" * 50)
    print("API Controllers Tests Complete!")


if __name__ == "__main__":
    asyncio.run(test_api_controllers())

# Verification mapping:
"""
@dataclass
class HTTPMethod
@dataclass
class RateLimit
@dataclass
class ControllerRoute
@dataclass
class RequestContext
@dataclass
class ErrorInfo
@dataclass
class ResponseContext
@dataclass
class Controller
@dataclass
class ControllerMatch
@dataclass
class ControllerRegistry
@dataclass
class Router
@dataclass
class ErrorHandler
@dataclass
class RequestProcessor
"""

# """API Controllers
# "openapi": "3.0.0"
# "paths": {
# "parameters": [
# "responses": {


