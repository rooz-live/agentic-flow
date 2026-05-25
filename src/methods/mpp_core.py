"""
Method Pattern Protocol (MPP) Core
Standardized method definitions with pattern matching, validation, and execution

Plan: rust-upgrade-wsjf-least-mature-019cbe.md
"""

import json
import asyncio
from enum import Enum
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime
from functools import wraps

from src.resilience.circuit_breaker import CircuitBreaker
from src.cache.semantic_cache import SemanticCache


class MethodPattern(Enum):
    """Standard method patterns"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"
    QUERY = "QUERY"  # GraphQL query
    MUTATION = "MUTATION"  # GraphQL mutation
    SUBSCRIPTION = "SUBSCRIPTION"  # WebSocket subscription
    RPC = "RPC"  # gRPC method
    STREAM = "STREAM"  # Streaming data
    BATCH = "BATCH"  # Batch operations


@dataclass
class RateLimit:
    """Rate limiting configuration"""
    requests_per_second: int = 10
    burst_size: int = 20
    window_seconds: int = 60


@dataclass
class RetryPolicy:
    """Retry policy configuration"""
    max_attempts: int = 3
    backoff_strategy: str = "exponential"  # exponential, linear, fixed
    initial_delay_ms: int = 100
    max_delay_ms: int = 5000
    retryable_status_codes: List[int] = field(default_factory=lambda: [500, 502, 503, 504])
    retryable_exceptions: List[str] = field(default_factory=lambda: ["TimeoutError", "ConnectionError"])
    
    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for retry attempt"""
        if self.backoff_strategy == "exponential":
            delay = self.initial_delay_ms * (2 ** (attempt - 1))
        elif self.backoff_strategy == "linear":
            delay = self.initial_delay_ms * attempt
        else:  # fixed
            delay = self.initial_delay_ms
        
        return min(delay, self.max_delay_ms) / 1000.0  # Convert to seconds


@dataclass
class MethodContract:
    """Method contract specification"""
    name: str
    pattern: MethodPattern
    input_schema: Dict[str, Any] = field(default_factory=dict)
    output_schema: Dict[str, Any] = field(default_factory=dict)
    idempotent: bool = False
    safe: bool = False
    cacheable: bool = False
    timeout_ms: int = 5000
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    rate_limit: RateLimit = field(default_factory=RateLimit)
    auth_required: bool = False
    permissions: List[str] = field(default_factory=list)
    description: str = ""
    version: str = "1.0.0"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert contract to dictionary"""
        return {
            "name": self.name,
            "pattern": self.pattern.value,
            "idempotent": self.idempotent,
            "safe": self.safe,
            "cacheable": self.cacheable,
            "timeout_ms": self.timeout_ms,
            "auth_required": self.auth_required,
            "permissions": self.permissions,
            "description": self.description,
            "version": self.version
        }


@dataclass
class ExecutionContext:
    """Execution context for method calls"""
    caller_id: str
    caller_type: str  # user, service, system
    auth_token: Optional[str] = None
    request_id: str = ""
    client_ip: str = ""
    user_agent: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MethodCall:
    """Method call representation"""
    contract: MethodContract
    args: List[Any] = field(default_factory=list)
    kwargs: Dict[str, Any] = field(default_factory=dict)
    context: ExecutionContext = field(default_factory=lambda: ExecutionContext(
        caller_id="anonymous",
        caller_type="system"
    ))
    trace_id: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    
    @property
    def cache_key(self) -> str:
        """Generate cache key for this call"""
        import hashlib
        key_parts = [
            self.contract.name,
            json.dumps(self.args, sort_keys=True, default=str),
            json.dumps(self.kwargs, sort_keys=True, default=str)
        ]
        key_str = "|".join(key_parts)
        return hashlib.sha256(key_str.encode()).hexdigest()[:16]


@dataclass
class ValidationResult:
    """Validation result"""
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    sanitized_args: Optional[Dict[str, Any]] = None
    
    def is_valid(self) -> bool:
        return self.valid and len(self.errors) == 0


@dataclass
class TraceStage:
    """Execution trace stage"""
    name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str = "pending"  # pending, success, failure, retry
    details: Dict[str, Any] = field(default_factory=dict)
    
    def complete(self, status: str, details: Optional[Dict] = None):
        """Mark stage as complete"""
        self.end_time = datetime.now()
        self.status = status
        if details:
            self.details.update(details)
    
    @property
    def duration_ms(self) -> float:
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds() * 1000
        return 0.0


@dataclass
class ExecutionTrace:
    """Complete execution trace"""
    trace_id: str
    start_time: datetime
    stages: List[TraceStage] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    end_time: Optional[datetime] = None
    
    def add_stage(self, name: str) -> TraceStage:
        """Add a new trace stage"""
        stage = TraceStage(name=name, start_time=datetime.now())
        self.stages.append(stage)
        return stage
    
    def complete(self):
        """Mark trace as complete"""
        self.end_time = datetime.now()
    
    @property
    def duration_ms(self) -> float:
        end = self.end_time or datetime.now()
        return (end - self.start_time).total_seconds() * 1000
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert trace to dictionary"""
        return {
            "trace_id": self.trace_id,
            "duration_ms": self.duration_ms,
            "stages": [
                {
                    "name": s.name,
                    "status": s.status,
                    "duration_ms": s.duration_ms,
                    "details": s.details
                }
                for s in self.stages
            ],
            "metadata": self.metadata
        }


@dataclass
class ExecutionResult:
    """Method execution result"""
    success: bool
    result: Any = None
    error: Optional[str] = None
    error_type: Optional[str] = None
    duration_ms: float = 0.0
    attempts: int = 0
    trace: Optional[ExecutionTrace] = None
    cached: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary"""
        return {
            "success": self.success,
            "error": self.error,
            "error_type": self.error_type,
            "duration_ms": self.duration_ms,
            "attempts": self.attempts,
            "cached": self.cached,
            "trace": self.trace.to_dict() if self.trace else None
        }


class MethodMatcher:
    """Match HTTP methods to patterns"""
    
    def match(self, http_method: str, path: str) -> MethodPattern:
        """Match HTTP method and path to pattern"""
        http_method = http_method.upper()
        path_lower = path.lower()
        
        # GraphQL
        if "graphql" in path_lower:
            if http_method == "POST":
                return MethodPattern.MUTATION
            return MethodPattern.QUERY
        
        # WebSocket
        if "ws" in path_lower or "websocket" in path_lower:
            return MethodPattern.SUBSCRIPTION
        
        # gRPC
        if "grpc" in path_lower:
            return MethodPattern.RPC
        
        # Streaming
        if "stream" in path_lower:
            return MethodPattern.STREAM
        
        # Standard REST
        pattern_map = {
            "GET": MethodPattern.GET,
            "POST": MethodPattern.POST,
            "PUT": MethodPattern.PUT,
            "DELETE": MethodPattern.DELETE,
            "PATCH": MethodPattern.PATCH,
            "HEAD": MethodPattern.HEAD,
            "OPTIONS": MethodPattern.OPTIONS
        }
        
        return pattern_map.get(http_method, MethodPattern.RPC)


class SchemaValidator:
    """Validate data against JSON schemas"""
    
    def __init__(self):
        self._schemas: Dict[str, Dict[str, Any]] = {}
    
    def register_schema(self, name: str, schema: Dict[str, Any]):
        """Register a schema"""
        self._schemas[name] = schema
    
    def validate(self, data: Any, schema_name: str) -> ValidationResult:
        """Validate data against schema"""
        schema = self._schemas.get(schema_name)
        if not schema:
            return ValidationResult(
                valid=False,
                errors=[f"Schema '{schema_name}' not found"]
            )
        
        # Simplified validation - check required fields
        errors = []
        warnings = []
        
        required = schema.get("required", [])
        if isinstance(data, dict):
            for field in required:
                if field not in data:
                    errors.append(f"Required field '{field}' missing")
        
        # Type checking
        properties = schema.get("properties", {})
        if isinstance(data, dict):
            for key, value in data.items():
                if key in properties:
                    expected_type = properties[key].get("type")
                    if expected_type and not self._check_type(value, expected_type):
                        errors.append(f"Field '{key}' should be {expected_type}")
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            sanitized_args=data if isinstance(data, dict) else {}
        )
    
    def _check_type(self, value: Any, expected_type: str) -> bool:
        """Check if value matches expected type"""
        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict
        }
        
        expected = type_map.get(expected_type)
        if expected:
            return isinstance(value, expected)
        return True


class ContractValidator:
    """Validate method calls against contracts"""
    
    def __init__(self):
        self._schema_validator = SchemaValidator()
        self._rate_limiters: Dict[str, Any] = {}
    
    def validate_input(
        self,
        contract: MethodContract,
        args: List[Any],
        kwargs: Dict[str, Any]
    ) -> ValidationResult:
        """Validate input against contract schema"""
        # Convert args/kwargs to dict for validation
        input_data = dict(enumerate(args))
        input_data.update(kwargs)
        
        if contract.input_schema:
            return self._schema_validator.validate(input_data, contract.name)
        
        return ValidationResult(valid=True)
    
    def validate_output(
        self,
        contract: MethodContract,
        result: Any
    ) -> ValidationResult:
        """Validate output against contract schema"""
        if contract.output_schema:
            return self._schema_validator.validate(
                {"result": result},
                f"{contract.name}_output"
            )
        
        return ValidationResult(valid=True)
    
    def check_rate_limit(self, contract: MethodContract, caller: str) -> bool:
        """Check if caller is within rate limit"""
        key = f"{contract.name}:{caller}"
        # Simplified rate limiting - always allow for now
        return True
    
    def check_permissions(
        self,
        contract: MethodContract,
        caller_permissions: List[str]
    ) -> bool:
        """Check if caller has required permissions"""
        if not contract.permissions:
            return True
        
        return all(
            perm in caller_permissions
            for perm in contract.permissions
        )


class ContractRegistry:
    """Registry for method contracts"""
    
    def __init__(self):
        self._contracts: Dict[str, MethodContract] = {}
        self._by_pattern: Dict[MethodPattern, List[str]] = {}
    
    def register(self, contract: MethodContract):
        """Register a method contract"""
        self._contracts[contract.name] = contract
        
        if contract.pattern not in self._by_pattern:
            self._by_pattern[contract.pattern] = []
        self._by_pattern[contract.pattern].append(contract.name)
    
    def get(self, name: str) -> Optional[MethodContract]:
        """Get contract by name"""
        return self._contracts.get(name)
    
    def find_by_pattern(self, pattern: MethodPattern) -> List[MethodContract]:
        """Find contracts by pattern"""
        names = self._by_pattern.get(pattern, [])
        return [self._contracts[name] for name in names if name in self._contracts]
    
    def list_all(self) -> List[MethodContract]:
        """List all contracts"""
        return list(self._contracts.values())
    
    def validate(self, call: MethodCall) -> ValidationResult:
        """Validate a method call"""
        validator = ContractValidator()
        return validator.validate_input(call.contract, call.args, call.kwargs)


class MethodExecutor:
    """Execute method calls with contracts"""
    
    def __init__(
        self,
        registry: Optional[ContractRegistry] = None,
        validator: Optional[ContractValidator] = None
    ):
        self._registry = registry or ContractRegistry()
        self._validator = validator or ContractValidator()
    
    async def execute(
        self,
        call: MethodCall,
        implementation: Callable
    ) -> ExecutionResult:
        """Execute a method call"""
        trace = ExecutionTrace(
            trace_id=call.trace_id or f"trace-{datetime.now().timestamp()}",
            start_time=datetime.now()
        )
        
        start = datetime.now()
        attempts = 0
        
        try:
            # Validate input
            validation_stage = trace.add_stage("validation")
            validation = self._validator.validate_input(
                call.contract, call.args, call.kwargs
            )
            
            if not validation.is_valid():
                validation_stage.complete("failure", {"errors": validation.errors})
                trace.complete()
                return ExecutionResult(
                    success=False,
                    error=f"Validation failed: {validation.errors}",
                    error_type="ValidationError",
                    duration_ms=trace.duration_ms,
                    attempts=0,
                    trace=trace
                )
            
            validation_stage.complete("success")
            
            # Execute
            execution_stage = trace.add_stage("execution")
            
            if asyncio.iscoroutinefunction(implementation):
                result = await implementation(*call.args, **call.kwargs)
            else:
                result = implementation(*call.args, **call.kwargs)
            
            execution_stage.complete("success", {"result_type": type(result).__name__})
            
            trace.complete()
            
            return ExecutionResult(
                success=True,
                result=result,
                duration_ms=trace.duration_ms,
                attempts=1,
                trace=trace
            )
            
        except Exception as e:
            trace.complete()
            return ExecutionResult(
                success=False,
                error=str(e),
                error_type=type(e).__name__,
                duration_ms=trace.duration_ms,
                attempts=attempts,
                trace=trace
            )
    
    async def execute_with_retry(
        self,
        call: MethodCall,
        implementation: Callable,
        policy: Optional[RetryPolicy] = None
    ) -> ExecutionResult:
        """Execute with retry policy"""
        policy = policy or call.contract.retry_policy
        
        last_error = None
        attempts = 0
        
        for attempt in range(1, policy.max_attempts + 1):
            attempts = attempt
            result = await self.execute(call, implementation)
            
            if result.success:
                result.attempts = attempts
                return result
            
            last_error = result.error
            
            # Check if error is retryable
            if result.error_type not in policy.retryable_exceptions:
                break
            
            if attempt < policy.max_attempts:
                delay = policy.calculate_delay(attempt)
                await asyncio.sleep(delay)
        
        return ExecutionResult(
            success=False,
            error=last_error,
            error_type="MaxRetriesExceeded",
            attempts=attempts
        )


# Decorators

def mpp_method(
    pattern: MethodPattern = MethodPattern.RPC,
    input_schema: Optional[Dict[str, Any]] = None,
    output_schema: Optional[Dict[str, Any]] = None,
    idempotent: bool = False,
    safe: bool = False,
    cacheable: bool = False,
    timeout_ms: int = 5000,
    retry_policy: Optional[RetryPolicy] = None,
    auth_required: bool = False,
    permissions: Optional[List[str]] = None,
    description: str = "",
    registry: Optional[ContractRegistry] = None
):
    """Decorator to register a method with MPP"""
    def decorator(func: Callable) -> Callable:
        # Create contract
        contract = MethodContract(
            name=func.__name__,
            pattern=pattern,
            input_schema=input_schema or {},
            output_schema=output_schema or {},
            idempotent=idempotent,
            safe=safe,
            cacheable=cacheable,
            timeout_ms=timeout_ms,
            retry_policy=retry_policy or RetryPolicy(),
            auth_required=auth_required,
            permissions=permissions or [],
            description=description or func.__doc__ or ""
        )
        
        # Register
        reg = registry or _default_registry
        reg.register(contract)
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create method call
            call = MethodCall(
                contract=contract,
                args=list(args),
                kwargs=kwargs,
                trace_id=f"{func.__name__}-{datetime.now().timestamp()}"
            )
            
            # Execute
            executor = MethodExecutor(registry=reg)
            return await executor.execute_with_retry(call, func)
        
        # Attach contract to function
        wrapper._mpp_contract = contract
        return wrapper
    
    return decorator


def validate_input(schema: Dict[str, Any]):
    """Decorator to validate input against schema"""
    def decorator(func: Callable) -> Callable:
        validator = SchemaValidator()
        validator.register_schema(func.__name__, schema)
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Validate
            input_data = dict(enumerate(args))
            input_data.update(kwargs)
            
            result = validator.validate(input_data, func.__name__)
            if not result.is_valid():
                raise ValueError(f"Validation failed: {result.errors}")
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# Default registry
_default_registry = ContractRegistry()


def get_default_registry() -> ContractRegistry:
    """Get default contract registry"""
    return _default_registry


# Self-test
async def test_mpp_core():
    """Test MPP core functionality"""
    print("Testing Method Pattern Protocol (MPP) Core")
    print("=" * 50)
    
    # Test 1: Method pattern matching
    print("\n1. Method Pattern Matching:")
    matcher = MethodMatcher()
    
    test_cases = [
        ("GET", "/api/users", MethodPattern.GET),
        ("POST", "/graphql", MethodPattern.MUTATION),
        ("GET", "/ws/stream", MethodPattern.SUBSCRIPTION),
        ("POST", "/grpc/method", MethodPattern.RPC),
    ]
    
    for method, path, expected in test_cases:
        result = matcher.match(method, path)
        status = "✅" if result == expected else "❌"
        print(f"  {status} {method} {path} -> {result.value}")
    
    # Test 2: Contract registration
    print("\n2. Contract Registration:")
    registry = ContractRegistry()
    
    contract = MethodContract(
        name="get_user",
        pattern=MethodPattern.GET,
        idempotent=True,
        cacheable=True,
        input_schema={"required": ["user_id"]},
        description="Get user by ID"
    )
    
    registry.register(contract)
    retrieved = registry.get("get_user")
    
    if retrieved and retrieved.name == "get_user":
        print("  ✅ Contract registered and retrieved")
    else:
        print("  ❌ Contract registration failed")
    
    # Test 3: Decorator
    print("\n3. @mpp_method Decorator:")
    
    @mpp_method(
        pattern=MethodPattern.GET,
        idempotent=True,
        description="Get order by ID",
        registry=registry
    )
    async def get_order(order_id: str) -> dict:
        return {"order_id": order_id, "status": "complete"}
    
    # Check contract attached
    if hasattr(get_order, '_mpp_contract'):
        print(f"  ✅ Decorator attached contract: {get_order._mpp_contract.name}")
    else:
        print("  ❌ Decorator failed to attach contract")
    
    # Execute
    result = await get_order("ORD-123")
    if result.success and result.result["order_id"] == "ORD-123":
        print(f"  ✅ Method execution successful (trace: {result.trace.trace_id})")
    else:
        print(f"  ❌ Method execution failed: {result.error}")
    
    # Test 4: Retry policy
    print("\n4. Retry Policy:")
    policy = RetryPolicy(
        max_attempts=3,
        backoff_strategy="exponential",
        initial_delay_ms=100
    )
    
    delays = [policy.calculate_delay(i) for i in range(1, 4)]
    print(f"  Exponential delays: {[f'{d:.3f}s' for d in delays]}")
    
    if delays[0] < delays[1] < delays[2]:
        print("  ✅ Exponential backoff working")
    else:
        print("  ❌ Backoff calculation incorrect")
    
    print("\n" + "=" * 50)
    print("MPP Core Tests Complete!")


if __name__ == "__main__":
    asyncio.run(test_mpp_core())

# Verification mapping:
# """Method Pattern Protocol
# """Standard method patterns"""
# """Decorator to register

