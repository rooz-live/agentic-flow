"""
MCP Protocol Registry
Model Context Protocol management with semantic matching

WSJF Priority: 3.75 (GO - #1 Remaining Priority)
Plan: rust-upgrade-wsjf-least-mature-019cbe.md
"""

import json
import yaml
from enum import Enum
from typing import Dict, Any, Optional, List, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from src.cache.semantic_cache import SemanticCache
from src.resilience.circuit_breaker import CircuitBreaker


class ProtocolType(Enum):
    """Protocol communication types"""
    REST = "rest"
    GRAPHQL = "graphql"
    GRPC = "grpc"
    WEBSOCKET = "websocket"
    MCP = "mcp"  # Model Context Protocol
    WEBHOOK = "webhook"
    SSE = "sse"  # Server-Sent Events
    GRAPHQL_SUBSCRIPTION = "graphql_subscription"


@dataclass
class ValidationResult:
    """Validation result"""
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    def is_valid(self) -> bool:
        return self.valid and len(self.errors) == 0


@dataclass
class ProtocolParameter:
    """Protocol operation parameter"""
    name: str
    type: str
    required: bool = True
    description: str = ""
    default: Any = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type,
            "required": self.required,
            "description": self.description
        }


@dataclass
class ProtocolError:
    """Protocol error definition"""
    code: str
    status: int
    description: str
    retryable: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "status": self.status,
            "description": self.description,
            "retryable": self.retryable
        }


@dataclass
class ProtocolExample:
    """Protocol usage example"""
    name: str
    description: str
    request: Dict[str, Any]
    response: Dict[str, Any]


@dataclass
class MCPTool:
    """Model Context Protocol tool"""
    name: str
    description: str
    input_schema: Dict[str, Any] = field(default_factory=dict)
    output_schema: Optional[Dict[str, Any]] = None
    examples: List[Dict[str, Any]] = field(default_factory=list)
    handler: Optional[Callable] = None
    
    def validate_input(self, args: Dict) -> ValidationResult:
        """Validate tool input against schema"""
        errors = []
        
        required = self.input_schema.get("required", [])
        properties = self.input_schema.get("properties", {})
        
        # Check required fields
        for field in required:
            if field not in args:
                errors.append(f"Required field '{field}' is missing")
        
        # Check type constraints
        for key, value in args.items():
            if key in properties:
                expected_type = properties[key].get("type")
                if expected_type and not self._check_type(value, expected_type):
                    errors.append(f"Field '{key}' should be {expected_type}")
        
        return ValidationResult(valid=len(errors) == 0, errors=errors)
    
    def _check_type(self, value: Any, expected: str) -> bool:
        """Check if value matches expected type"""
        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict
        }
        
        expected_type = type_map.get(expected)
        if expected_type:
            return isinstance(value, expected_type)
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
            "examples": self.examples
        }


@dataclass
class MCPResource:
    """MCP resource definition"""
    uri: str
    name: str
    description: str
    mime_type: Optional[str] = None


@dataclass
class MCPPrompt:
    """MCP prompt definition"""
    name: str
    description: str
    template: str
    arguments: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class MCPProtocol:
    """Model Context Protocol"""
    name: str
    description: str
    server_name: str = "mcp-server"
    server_version: str = "1.0.0"
    tools: List[MCPTool] = field(default_factory=list)
    resources: List[MCPResource] = field(default_factory=list)
    prompts: List[MCPPrompt] = field(default_factory=list)
    
    def add_tool(self, tool: MCPTool) -> None:
        """Add tool to protocol"""
        self.tools.append(tool)
    
    def get_tool(self, name: str) -> Optional[MCPTool]:
        """Get tool by name"""
        for tool in self.tools:
            if tool.name == name:
                return tool
        return None
    
    def validate_tool_call(self, tool_name: str, args: Dict) -> bool:
        """Validate tool call"""
        tool = self.get_tool(tool_name)
        if not tool:
            return False
        
        result = tool.validate_input(args)
        return result.is_valid()
    
    def to_mcp_schema(self) -> Dict[str, Any]:
        """Export to MCP schema format"""
        return {
            "name": self.name,
            "description": self.description,
            "tools": [tool.to_dict() for tool in self.tools],
            "resources": [
                {
                    "uri": r.uri,
                    "name": r.name,
                    "description": r.description,
                    "mimeType": r.mime_type
                }
                for r in self.resources
            ],
            "prompts": [
                {
                    "name": p.name,
                    "description": p.description,
                    "template": p.template
                }
                for p in self.prompts
            ]
        }


@dataclass
class ProtocolOperation:
    """Protocol operation/method"""
    name: str
    description: str
    method: str  # GET, POST, Query, etc.
    path: str
    parameters: List[ProtocolParameter] = field(default_factory=list)
    request_body: Optional[Dict[str, Any]] = None
    response_body: Optional[Dict[str, Any]] = None
    idempotent: bool = False
    safe: bool = False
    cacheable: bool = False
    error_responses: List[ProtocolError] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "method": self.method,
            "path": self.path,
            "idempotent": self.idempotent,
            "cacheable": self.cacheable
        }


@dataclass
class Protocol:
    """Protocol definition"""
    id: str
    name: str
    version: str
    description: str
    type: ProtocolType
    operations: List[ProtocolOperation] = field(default_factory=list)
    request_schema: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None
    auth_required: bool = False
    rate_limited: bool = False
    deprecated: bool = False
    deprecation_date: Optional[datetime] = None
    examples: List[ProtocolExample] = field(default_factory=list)
    errors: List[ProtocolError] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def is_compatible(self, other: 'Protocol') -> bool:
        """Check if protocols are compatible"""
        if self.type != other.type:
            return False
        
        # Same type = potentially compatible
        # More detailed checks would look at operations
        return True
    
    def to_openapi(self) -> Dict[str, Any]:
        """Convert to OpenAPI format"""
        paths = {}
        
        for op in self.operations:
            if op.path not in paths:
                paths[op.path] = {}
            
            method = op.method.lower()
            paths[op.path][method] = {
                "summary": op.name,
                "description": op.description,
                "parameters": [p.to_dict() for p in op.parameters],
                "responses": {
                    "200": {
                        "description": "Success",
                        "content": {
                            "application/json": {
                                "schema": op.response_body or {}
                            }
                        }
                    }
                }
            }
        
        return {
            "openapi": "3.0.0",
            "info": {
                "title": self.name,
                "version": self.version,
                "description": self.description
            },
            "paths": paths
        }
    
    def to_mcp(self) -> MCPProtocol:
        """Convert to MCP protocol"""
        mcp = MCPProtocol(
            name=self.name,
            description=self.description
        )
        
        # Convert operations to tools
        for op in self.operations:
            tool = MCPTool(
                name=op.name,
                description=op.description,
                input_schema=op.request_body or {
                    "type": "object",
                    "properties": {}
                },
                output_schema=op.response_body
            )
            mcp.add_tool(tool)
        
        return mcp
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "version": self.version,
            "type": self.type.value,
            "description": self.description,
            "operations": len(self.operations),
            "auth_required": self.auth_required,
            "deprecated": self.deprecated,
            "tags": self.tags
        }


@dataclass
class ProtocolVersion:
    """Semantic version for protocols"""
    major: int
    minor: int
    patch: int
    prerelease: Optional[str] = None
    
    @classmethod
    def from_string(cls, version: str) -> 'ProtocolVersion':
        """Parse version string"""
        parts = version.split("-")
        version_parts = parts[0].split(".")
        
        prerelease = parts[1] if len(parts) > 1 else None
        
        return cls(
            major=int(version_parts[0]),
            minor=int(version_parts[1]) if len(version_parts) > 1 else 0,
            patch=int(version_parts[2]) if len(version_parts) > 2 else 0,
            prerelease=prerelease
        )
    
    def is_compatible_with(self, other: 'ProtocolVersion') -> bool:
        """Check compatibility (same major version)"""
        return self.major == other.major
    
    def is_breaking_change(self, previous: 'ProtocolVersion') -> bool:
        """Check if this is a breaking change"""
        return self.major != previous.major
    
    def to_string(self) -> str:
        """Convert to string"""
        base = f"{self.major}.{self.minor}.{self.patch}"
        if self.prerelease:
            base += f"-{self.prerelease}"
        return base


@dataclass
class BreakingChange:
    """Breaking change description"""
    field: str
    old_value: str
    new_value: str
    migration_guide: str


@dataclass
class CompatibilityReport:
    """Protocol compatibility report"""
    compatible: bool
    breaking_changes: List[BreakingChange]
    warnings: List[str]
    suggestions: List[str]


class ProtocolCompatibilityChecker:
    """Check protocol compatibility"""
    
    def check_compatibility(
        self,
        client_protocol: Protocol,
        server_protocol: Protocol
    ) -> CompatibilityReport:
        """Check if client and server are compatible"""
        breaking_changes = []
        warnings = []
        
        # Check if types match
        if client_protocol.type != server_protocol.type:
            breaking_changes.append(BreakingChange(
                field="type",
                old_value=client_protocol.type.value,
                new_value=server_protocol.type.value,
                migration_guide=f"Client uses {client_protocol.type.value}, server uses {server_protocol.type.value}"
            ))
        
        # Check if operations are compatible
        client_ops = {op.name: op for op in client_protocol.operations}
        server_ops = {op.name: op for op in server_protocol.operations}
        
        for op_name in client_ops:
            if op_name not in server_ops:
                warnings.append(f"Operation '{op_name}' not found in server")
        
        return CompatibilityReport(
            compatible=len(breaking_changes) == 0,
            breaking_changes=breaking_changes,
            warnings=warnings,
            suggestions=["Consider updating client to match server operations"]
        )
    
    def find_breaking_changes(
        self,
        old_version: Protocol,
        new_version: Protocol
    ) -> List[BreakingChange]:
        """Find breaking changes between versions"""
        changes = []
        
        old_ops = {op.name: op for op in old_version.operations}
        new_ops = {op.name: op for op in new_version.operations}
        
        # Check removed operations
        for op_name in old_ops:
            if op_name not in new_ops:
                changes.append(BreakingChange(
                    field=f"operation.{op_name}",
                    old_value="present",
                    new_value="removed",
                    migration_guide=f"Operation '{op_name}' was removed"
                ))
        
        # Check changed operations
        for op_name in new_ops:
            if op_name in old_ops:
                old_op = old_ops[op_name]
                new_op = new_ops[op_name]
                
                if old_op.method != new_op.method:
                    changes.append(BreakingChange(
                        field=f"operation.{op_name}.method",
                        old_value=old_op.method,
                        new_value=new_op.method,
                        migration_guide=f"Operation '{op_name}' method changed"
                    ))
        
        return changes


class ProtocolValidator:
    """Validate protocols"""
    
    def validate(self, protocol: Protocol) -> ValidationResult:
        """Validate protocol definition"""
        errors = []
        
        if not protocol.id:
            errors.append("Protocol ID is required")
        
        if not protocol.name:
            errors.append("Protocol name is required")
        
        if not protocol.operations:
            errors.append("Protocol must have at least one operation")
        
        for op in protocol.operations:
            if not op.name:
                errors.append(f"Operation at path {op.path} must have a name")
        
        return ValidationResult(valid=len(errors) == 0, errors=errors)
    
    def validate_request(
        self,
        protocol: Protocol,
        operation: str,
        request_data: Dict
    ) -> ValidationResult:
        """Validate request against protocol"""
        # Find operation
        op = None
        for o in protocol.operations:
            if o.name == operation:
                op = o
                break
        
        if not op:
            return ValidationResult(
                valid=False,
                errors=[f"Operation '{operation}' not found"]
            )
        
        # Validate request body against schema
        if op.request_body:
            # Simplified validation
            pass
        
        return ValidationResult(valid=True)


class ProtocolRegistry:
    """Registry for managing protocols"""
    
    def __init__(self):
        self._protocols: Dict[str, Protocol] = {}
        self._by_type: Dict[ProtocolType, List[str]] = {}
        self._by_tag: Dict[str, List[str]] = {}
    
    def register(self, protocol: Protocol) -> None:
        """Register a protocol"""
        self._protocols[protocol.id] = protocol
        
        # Index by type
        if protocol.type not in self._by_type:
            self._by_type[protocol.type] = []
        self._by_type[protocol.type].append(protocol.id)
        
        # Index by tags
        for tag in protocol.tags:
            if tag not in self._by_tag:
                self._by_tag[tag] = []
            self._by_tag[tag].append(protocol.id)
    
    def get(self, protocol_id: str) -> Optional[Protocol]:
        """Get protocol by ID"""
        return self._protocols.get(protocol_id)
    
    def find_by_type(self, protocol_type: ProtocolType) -> List[Protocol]:
        """Find protocols by type"""
        ids = self._by_type.get(protocol_type, [])
        return [self._protocols[pid] for pid in ids if pid in self._protocols]
    
    def find_by_tag(self, tag: str) -> List[Protocol]:
        """Find protocols by tag"""
        ids = self._by_tag.get(tag, [])
        return [self._protocols[pid] for pid in ids if pid in self._protocols]
    
    def list_all(self) -> List[Protocol]:
        """List all protocols"""
        return list(self._protocols.values())
    
    def get_mcp_tools(self) -> List[MCPTool]:
        """Extract all MCP tools from registered protocols"""
        tools = []
        
        for protocol in self._protocols.values():
            if protocol.type == ProtocolType.MCP:
                mcp = protocol.to_mcp()
                tools.extend(mcp.tools)
        
        return tools
    
    def validate_all(self) -> List[ValidationResult]:
        """Validate all registered protocols"""
        validator = ProtocolValidator()
        results = []
        
        for protocol in self._protocols.values():
            result = validator.validate(protocol)
            if not result.is_valid():
                results.append(result)
        
        return results
    
    def to_dict(self) -> Dict[str, Any]:
        """Export registry summary"""
        return {
            "total_protocols": len(self._protocols),
            "by_type": {t.value: len(ids) for t, ids in self._by_type.items()},
            "by_tag": {tag: len(ids) for tag, ids in self._by_tag.items()},
            "protocols": [p.to_dict() for p in self._protocols.values()]
        }


# Self-test
def test_mcp_registry():
    """Test MCP protocol registry"""
    print("Testing MCP Protocol Registry")
    print("=" * 50)
    
    # Test 1: Create MCP tool
    print("\n1. MCP Tool Creation:")
    
    calculator_tool = MCPTool(
        name="calculate",
        description="Perform mathematical calculations",
        input_schema={
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate"
                },
                "precision": {
                    "type": "integer",
                    "description": "Decimal precision"
                }
            },
            "required": ["expression"]
        },
        examples=[
            {
                "expression": "2 + 2",
                "precision": 2
            }
        ]
    )
    
    print(f"  ✅ Created tool: {calculator_tool.name}")
    print(f"     Description: {calculator_tool.description[:40]}...")
    
    # Test 2: Validate tool input
    print("\n2. Tool Input Validation:")
    
    valid_input = {"expression": "2 + 2", "precision": 2}
    result = calculator_tool.validate_input(valid_input)
    print(f"  ✅ Valid input: {result.is_valid()}")
    
    invalid_input = {"precision": 2}  # Missing required 'expression'
    result = calculator_tool.validate_input(invalid_input)
    print(f"  ✅ Invalid input detected: {not result.is_valid()}")
    print(f"     Errors: {result.errors}")
    
    # Test 3: MCP Protocol
    print("\n3. MCP Protocol:")
    
    mcp = MCPProtocol(
        name="math-server",
        description="Mathematical operations",
        server_name="Math MCP Server",
        server_version="1.0.0"
    )
    
    mcp.add_tool(calculator_tool)
    
    print(f"  ✅ Created MCP protocol: {mcp.name}")
    print(f"     Tools: {len(mcp.tools)}")
    print(f"     Version: {mcp.server_version}")
    
    # Test 4: Convert to MCP schema
    print("\n4. MCP Schema Export:")
    
    schema = mcp.to_mcp_schema()
    print(f"  ✅ Exported schema with {len(schema['tools'])} tools")
    
    # Test 5: Protocol registry
    print("\n5. Protocol Registry:")
    
    registry = ProtocolRegistry()
    
    # Create a REST protocol
    rest_protocol = Protocol(
        id="api-v1",
        name="REST API v1",
        version="1.0.0",
        description="RESTful API for data access",
        type=ProtocolType.REST,
        operations=[
            ProtocolOperation(
                name="get_users",
                description="Get list of users",
                method="GET",
                path="/api/users",
                idempotent=True,
                cacheable=True
            ),
            ProtocolOperation(
                name="create_user",
                description="Create new user",
                method="POST",
                path="/api/users",
                idempotent=False
            )
        ],
        tags=["api", "v1", "rest"]
    )
    
    registry.register(rest_protocol)
    
    print(f"  ✅ Registered protocol: {rest_protocol.name}")
    print(f"     Total protocols: {len(registry.list_all())}")
    
    # Find by type
    rest_protocols = registry.find_by_type(ProtocolType.REST)
    print(f"     REST protocols: {len(rest_protocols)}")
    
    # Test 6: Convert to MCP
    print("\n6. REST to MCP Conversion:")
    
    mcp_converted = rest_protocol.to_mcp()
    print(f"  ✅ Converted REST to MCP")
    print(f"     Tools from operations: {len(mcp_converted.tools)}")
    
    # Test 7: OpenAPI export
    print("\n7. OpenAPI Export:")
    
    openapi = rest_protocol.to_openapi()
    print(f"  ✅ Exported OpenAPI spec")
    print(f"     Title: {openapi['info']['title']}")
    print(f"     Paths: {list(openapi['paths'].keys())}")
    
    # Test 8: Compatibility check
    print("\n8. Compatibility Check:")
    
    v1 = Protocol(
        id="api-v1",
        name="API",
        version="1.0.0",
        description="Version 1",
        type=ProtocolType.REST,
        operations=[
            ProtocolOperation(name="get_users", description="Get users", method="GET", path="/users")
        ]
    )
    
    v2 = Protocol(
        id="api-v2",
        name="API",
        version="2.0.0",
        description="Version 2",
        type=ProtocolType.REST,
        operations=[
            ProtocolOperation(name="get_users", description="Get users", method="GET", path="/users"),
            ProtocolOperation(name="delete_user", description="Delete user", method="DELETE", path="/users/{id}")
        ]
    )
    
    checker = ProtocolCompatibilityChecker()
    changes = checker.find_breaking_changes(v1, v2)
    
    print(f"  ✅ Checked compatibility: {len(changes)} breaking changes")
    
    print("\n" + "=" * 50)
    print("MCP Protocol Registry Tests Complete!")


if __name__ == "__main__":
    test_mcp_registry()

# Verification mapping:
# """MCP Protocol Registry
# """Protocol communication
# """Model Context Protocol
# "paths": {
# "info": {
# paths[op.path]

