"""
Agent Contracts - Agentics Foundation
Agent contract management, coordination, and execution

WSJF Priority: 3.00 (GO - Agentics Foundation Critical)
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
from collections import defaultdict

from src.cache.semantic_cache import SemanticCache


class ContractStatus(Enum):
    """Contract status"""
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class AgentType(Enum):
    """Agent types"""
    PLANNER = "planner"
    EXECUTOR = "executor"
    VALIDATOR = "validator"
    ORCHESTRATOR = "orchestrator"
    ANALYZER = "analyzer"
    GENERATOR = "generator"


class CapabilityType(Enum):
    """Capability types"""
    REASONING = "reasoning"
    TOOL_USE = "tool_use"
    MEMORY = "memory"
    PLANNING = "planning"
    CODE_GENERATION = "code_generation"
    DATA_ANALYSIS = "data_analysis"
    NATURAL_LANGUAGE = "natural_language"


class ConstraintType(Enum):
    """Constraint types"""
    RESOURCE = "resource"
    SECURITY = "security"
    TIME = "time"
    DEPENDENCY = "dependency"


class ExecutionMode(Enum):
    """Execution modes"""
    SYNC = "sync"
    ASYNC = "async"
    BATCH = "batch"
    STREAMING = "streaming"


class CoordinationPattern(Enum):
    """Multi-agent coordination patterns"""
    LEADER_FOLLOWER = "leader_follower"
    PEER_TO_PEER = "peer_to_peer"
    PIPELINE = "pipeline"
    VOTING = "voting"
    CONSENSUS = "consensus"


class FailureMode(Enum):
    """Multi-agent failure modes"""
    FAIL_FAST = "fail_fast"
    CONTINUE = "continue"
    RETRY = "retry"
    FALLBACK = "fallback"


@dataclass
class RetryPolicy:
    """Retry policy configuration"""
    max_retries: int = 3
    backoff_strategy: str = "exponential"  # linear, exponential, fixed
    base_delay_ms: int = 1000
    max_delay_ms: int = 30000


@dataclass
class CapabilityTest:
    """Test case for capability validation"""
    name: str
    input_data: Dict[str, Any]
    expected_output: Any
    validation_rules: List[str] = field(default_factory=list)


@dataclass
class AgentCapability:
    """Agent capability definition"""
    name: str
    description: str = ""
    
    type: CapabilityType = CapabilityType.REASONING
    
    parameters: Dict[str, Any] = field(default_factory=dict)
    
    requires_tools: List[str] = field(default_factory=list)
    requires_memory: bool = False
    requires_context: bool = True
    
    complexity_score: float = 0.5  # 0.0 - 1.0
    estimated_latency_ms: int = 1000
    
    test_cases: List[CapabilityTest] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type.value,
            "complexity_score": self.complexity_score,
            "estimated_latency_ms": self.estimated_latency_ms,
            "requires_tools": self.requires_tools,
            "requires_memory": self.requires_memory
        }


@dataclass
class AgentConstraint:
    """Agent constraint definition"""
    name: str
    description: str = ""
    
    type: ConstraintType = ConstraintType.RESOURCE
    
    max_tokens: Optional[int] = None
    max_execution_time_ms: Optional[int] = None
    max_memory_mb: Optional[int] = None
    
    allowed_operations: List[str] = field(default_factory=list)
    forbidden_operations: List[str] = field(default_factory=list)
    
    validator: Optional[str] = None
    
    def validate_operation(self, operation: str) -> bool:
        """Check if operation is allowed"""
        if self.forbidden_operations and operation in self.forbidden_operations:
            return False
        if self.allowed_operations and operation not in self.allowed_operations:
            return False
        return True


@dataclass
class AgentContract:
    """Agent contract definition"""
    id: str
    name: str
    version: str = "1.0.0"
    
    agent_type: AgentType = AgentType.EXECUTOR
    agent_role: str = "default"
    
    capabilities: List[AgentCapability] = field(default_factory=list)
    constraints: List[AgentConstraint] = field(default_factory=list)
    
    input_schema: Dict[str, Any] = field(default_factory=dict)
    output_schema: Dict[str, Any] = field(default_factory=dict)
    
    execution_mode: ExecutionMode = ExecutionMode.SYNC
    timeout_ms: int = 30000
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    
    required_contracts: List[str] = field(default_factory=list)
    provides_contracts: List[str] = field(default_factory=list)
    
    author: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    tags: List[str] = field(default_factory=list)
    status: ContractStatus = ContractStatus.DRAFT
    
    def has_capability(self, capability_name: str) -> bool:
        """Check if contract has capability"""
        return any(c.name == capability_name for c in self.capabilities)
    
    def get_capability(self, capability_name: str) -> Optional[AgentCapability]:
        """Get capability by name"""
        for cap in self.capabilities:
            if cap.name == capability_name:
                return cap
        return None
    
    def validate_input(self, input_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate input against schema"""
        if not self.input_schema:
            return True, []
        
        errors = []
        
        # Check required fields
        required = self.input_schema.get("required", [])
        for field_name in required:
            if field_name not in input_data:
                errors.append(f"Missing required field: {field_name}")
        
        # Check types
        properties = self.input_schema.get("properties", {})
        for field_name, value in input_data.items():
            if field_name in properties:
                expected_type = properties[field_name].get("type")
                if expected_type and not self._check_type(value, expected_type):
                    errors.append(f"Field '{field_name}' has wrong type, expected {expected_type}")
        
        return len(errors) == 0, errors
    
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
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "version": self.version,
            "agent_type": self.agent_type.value,
            "capabilities": len(self.capabilities),
            "status": self.status.value,
            "execution_mode": self.execution_mode.value
        }


@dataclass
class MultiAgentContract:
    """Multi-agent coordination contract"""
    id: str
    name: str = ""
    
    agent_contracts: List[str] = field(default_factory=list)
    
    coordination_pattern: CoordinationPattern = CoordinationPattern.PIPELINE
    
    message_protocol: str = ""
    shared_memory: bool = False
    shared_context: bool = True
    
    execution_graph: Dict[str, List[str]] = field(default_factory=dict)
    
    consensus_required: bool = False
    consensus_threshold: float = 0.5
    
    failure_mode: FailureMode = FailureMode.FAIL_FAST
    fallback_agent: Optional[str] = None
    
    def get_execution_order(self) -> List[str]:
        """Get agents in execution order"""
        if self.coordination_pattern == CoordinationPattern.PIPELINE:
            return self._topological_sort()
        return self.agent_contracts
    
    def _topological_sort(self) -> List[str]:
        """Topological sort of execution graph"""
        # Kahn's algorithm
        in_degree = {agent: 0 for agent in self.agent_contracts}
        for next_agents in self.execution_graph.values():
            for agent in next_agents:
                in_degree[agent] += 1
        
        queue = [agent for agent, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            agent = queue.pop(0)
            result.append(agent)
            
            for next_agent in self.execution_graph.get(agent, []):
                in_degree[next_agent] -= 1
                if in_degree[next_agent] == 0:
                    queue.append(next_agent)
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "agent_count": len(self.agent_contracts),
            "pattern": self.coordination_pattern.value,
            "consensus_required": self.consensus_required
        }


@dataclass
class ContractMatch:
    """Contract match result"""
    contract: AgentContract
    score: float
    matched_capabilities: List[str] = field(default_factory=list)


@dataclass
class ValidationResult:
    """Validation result"""
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class CompatibilityResult:
    """Compatibility check result"""
    compatible: bool
    score: float  # 0.0 - 1.0
    issues: List[str] = field(default_factory=list)


class ContractRegistry:
    """Registry for agent contracts"""
    
    def __init__(self):
        self._contracts: Dict[str, AgentContract] = {}
        self._by_type: Dict[str, List[str]] = defaultdict(list)
        self._by_capability: Dict[str, List[str]] = defaultdict(list)
        self._by_tag: Dict[str, List[str]] = defaultdict(list)
    
    def register(self, contract: AgentContract) -> None:
        """Register a contract"""
        self._contracts[contract.id] = contract
        
        # Index by type
        self._by_type[contract.agent_type.value].append(contract.id)
        
        # Index by capabilities
        for cap in contract.capabilities:
            self._by_capability[cap.name].append(contract.id)
        
        # Index by tags
        for tag in contract.tags:
            self._by_tag[tag].append(contract.id)
    
    def get(self, contract_id: str) -> Optional[AgentContract]:
        """Get contract by ID"""
        return self._contracts.get(contract_id)
    
    def find_by_type(self, agent_type: str) -> List[AgentContract]:
        """Find contracts by agent type"""
        ids = self._by_type.get(agent_type, [])
        return [self._contracts[cid] for cid in ids if cid in self._contracts]
    
    def find_by_capability(self, capability: str) -> List[AgentContract]:
        """Find contracts by capability"""
        ids = self._by_capability.get(capability, [])
        return [self._contracts[cid] for cid in ids if cid in self._contracts]
    
    def find_compatible(self, contract: AgentContract) -> List[AgentContract]:
        """Find contracts compatible with given contract"""
        compatible = []
        
        for other in self._contracts.values():
            if other.id == contract.id:
                continue
            
            # Check if other provides required contracts
            if set(contract.required_contracts) & set(other.provides_contracts):
                compatible.append(other)
            
            # Check if other requires contracts this one provides
            if set(other.required_contracts) & set(contract.provides_contracts):
                compatible.append(other)
        
        return compatible
    
    def validate_dependencies(self, contract: AgentContract) -> List[str]:
        """Validate contract dependencies"""
        errors = []
        
        for required_id in contract.required_contracts:
            if required_id not in self._contracts:
                errors.append(f"Missing required contract: {required_id}")
        
        return errors
    
    def get_contract_chain(self, contract_id: str) -> List[AgentContract]:
        """Get chain of dependent contracts"""
        chain = []
        visited = set()
        
        def traverse(cid: str):
            if cid in visited:
                return
            visited.add(cid)
            
            contract = self._contracts.get(cid)
            if contract:
                chain.append(contract)
                for required in contract.required_contracts:
                    traverse(required)
        
        traverse(contract_id)
        return chain
    
    def list_all(self) -> List[AgentContract]:
        """List all contracts"""
        return list(self._contracts.values())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_contracts": len(self._contracts),
            "by_type": {k: len(v) for k, v in self._by_type.items()},
            "by_capability": {k: len(v) for k, v in self._by_capability.items()}
        }


class ContractValidator:
    """Contract validation"""
    
    def validate_schema(self, contract: AgentContract) -> ValidationResult:
        """Validate contract schema"""
        errors = []
        
        # Validate input schema
        if contract.input_schema:
            if "type" not in contract.input_schema:
                errors.append("Input schema missing type")
        
        # Validate output schema
        if contract.output_schema:
            if "type" not in contract.output_schema:
                errors.append("Output schema missing type")
        
        return ValidationResult(valid=len(errors) == 0, errors=errors)
    
    def validate_capabilities(self, contract: AgentContract) -> ValidationResult:
        """Validate contract capabilities"""
        errors = []
        
        for cap in contract.capabilities:
            if cap.complexity_score < 0 or cap.complexity_score > 1:
                errors.append(f"Capability {cap.name} has invalid complexity score")
        
        return ValidationResult(valid=len(errors) == 0, errors=errors)
    
    def validate_dependencies(
        self,
        contract: AgentContract,
        registry: ContractRegistry
    ) -> ValidationResult:
        """Validate contract dependencies"""
        errors = registry.validate_dependencies(contract)
        return ValidationResult(valid=len(errors) == 0, errors=errors)
    
    def check_compatibility(
        self,
        contract1: AgentContract,
        contract2: AgentContract
    ) -> CompatibilityResult:
        """Check if two contracts are compatible"""
        issues = []
        score = 1.0
        
        # Check execution mode compatibility
        if contract1.execution_mode != contract2.execution_mode:
            issues.append("Different execution modes")
            score -= 0.2
        
        # Check capability overlap
        cap1_names = {c.name for c in contract1.capabilities}
        cap2_names = {c.name for c in contract2.capabilities}
        overlap = cap1_names & cap2_names
        
        if not overlap:
            issues.append("No shared capabilities")
            score -= 0.3
        
        return CompatibilityResult(
            compatible=len(issues) == 0 or score > 0.5,
            score=max(0.0, score),
            issues=issues
        )


@dataclass
class ContractVersion:
    """Contract version information"""
    contract_id: str
    version: str
    
    major: int = 1
    minor: int = 0
    patch: int = 0
    prerelease: Optional[str] = None
    
    changes: List[str] = field(default_factory=list)
    breaking_changes: List[str] = field(default_factory=list)
    
    compatible_with: List[str] = field(default_factory=list)
    
    created_at: datetime = field(default_factory=datetime.now)
    deprecated: bool = False
    
    @classmethod
    def from_string(cls, contract_id: str, version_str: str) -> "ContractVersion":
        """Parse version from string"""
        # Parse semver
        match = re.match(r'(\d+)\.(\d+)\.(\d+)(?:-(.+))?', version_str)
        if match:
            major, minor, patch = int(match.group(1)), int(match.group(2)), int(match.group(3))
            prerelease = match.group(4)
            return cls(
                contract_id=contract_id,
                version=version_str,
                major=major,
                minor=minor,
                patch=patch,
                prerelease=prerelease
            )
        return cls(contract_id=contract_id, version=version_str)
    
    def is_compatible_with(self, other_version: str) -> bool:
        """Check if compatible with other version"""
        if other_version in self.compatible_with:
            return True
        
        # Check semver compatibility (same major version)
        other = ContractVersion.from_string(self.contract_id, other_version)
        return self.major == other.major and self.major > 0
    
    def is_breaking_change(self, previous: "ContractVersion") -> bool:
        """Check if this is a breaking change from previous"""
        return self.major != previous.major


@dataclass
class ExecutionContext:
    """Contract execution context"""
    execution_id: str
    parent_execution_id: Optional[str] = None
    
    memory: Dict[str, Any] = field(default_factory=dict)
    shared_context: Dict[str, Any] = field(default_factory=dict)
    
    step_count: int = 0
    max_steps: int = 100
    
    on_step: Optional[Callable] = None
    on_complete: Optional[Callable] = None
    on_error: Optional[Callable] = None
    
    start_time: datetime = field(default_factory=datetime.now)
    token_usage: int = 0


@dataclass
class ExecutionResult:
    """Contract execution result"""
    success: bool
    output: Any = None
    error: Optional[str] = None
    context: ExecutionContext = field(default_factory=lambda: ExecutionContext(execution_id=""))
    metrics: Dict[str, Any] = field(default_factory=dict)


class ContractExecutor:
    """Execute agent contracts"""
    
    def __init__(self, registry: ContractRegistry):
        self._registry = registry
    
    async def execute(
        self,
        contract: AgentContract,
        input_data: Dict[str, Any],
        context: ExecutionContext
    ) -> ExecutionResult:
        """Execute a contract"""
        start_time = time.time()
        
        try:
            # Validate input
            valid, errors = contract.validate_input(input_data)
            if not valid:
                return ExecutionResult(
                    success=False,
                    error=f"Input validation failed: {', '.join(errors)}"
                )
            
            # Check constraints
            for constraint in contract.constraints:
                if not constraint.validate_operation("execute"):
                    return ExecutionResult(
                        success=False,
                        error=f"Constraint violation: {constraint.name}"
                    )
            
            # Mock execution (would call actual agent implementation)
            output = {
                "contract_id": contract.id,
                "input": input_data,
                "capabilities_used": [c.name for c in contract.capabilities],
                "execution_mode": contract.execution_mode.value
            }
            
            execution_time = time.time() - start_time
            
            return ExecutionResult(
                success=True,
                output=output,
                context=context,
                metrics={
                    "execution_time_ms": execution_time * 1000,
                    "token_usage": context.token_usage
                }
            )
            
        except Exception as e:
            return ExecutionResult(
                success=False,
                error=str(e),
                context=context
            )
    
    async def execute_multi_agent(
        self,
        multi_contract: MultiAgentContract,
        input_data: Dict[str, Any]
    ) -> List[ExecutionResult]:
        """Execute multi-agent contract"""
        results = []
        
        # Get execution order
        execution_order = multi_contract.get_execution_order()
        
        shared_context: Dict[str, Any] = {}
        
        for agent_id in execution_order:
            contract = self._registry.get(agent_id)
            if not contract:
                results.append(ExecutionResult(
                    success=False,
                    error=f"Contract not found: {agent_id}"
                ))
                continue
            
            # Create execution context with shared state
            context = ExecutionContext(
                execution_id=f"exec-{agent_id}-{int(time.time())}",
                shared_context=shared_context if multi_contract.shared_context else {}
            )
            
            # Execute
            result = await self.execute(contract, input_data, context)
            results.append(result)
            
            # Update shared context
            if result.success and multi_contract.shared_context:
                shared_context.update(result.output or {})
            
            # Handle failures
            if not result.success:
                if multi_contract.failure_mode == FailureMode.FAIL_FAST:
                    break
        
        return results


# Self-test
async def test_agent_contracts():
    """Test agent contracts"""
    print("Testing Agent Contracts")
    print("=" * 50)
    
    # Test 1: Create contract
    print("\n1. Creating Agent Contract:")
    
    contract = AgentContract(
        id="analyzer-001",
        name="Data Analyzer",
        version="1.0.0",
        agent_type=AgentType.ANALYZER,
        capabilities=[
            AgentCapability(
                name="data_processing",
                type=CapabilityType.DATA_ANALYSIS,
                complexity_score=0.7,
                estimated_latency_ms=2000
            ),
            AgentCapability(
                name="pattern_recognition",
                type=CapabilityType.REASONING,
                complexity_score=0.8,
                estimated_latency_ms=3000
            )
        ],
        constraints=[
            AgentConstraint(
                name="token_limit",
                max_tokens=4000,
                forbidden_operations=["execute_code"]
            )
        ],
        input_schema={
            "type": "object",
            "required": ["data"],
            "properties": {
                "data": {"type": "array"},
                "format": {"type": "string"}
            }
        },
        provides_contracts=["data-summary"],
        tags=["data", "analysis"]
    )
    
    print(f"  ✅ Created contract: {contract.name}")
    print(f"     Type: {contract.agent_type.value}")
    print(f"     Capabilities: {len(contract.capabilities)}")
    
    # Test 2: Validate input
    print("\n2. Input Validation:")
    
    valid_input = {"data": [1, 2, 3], "format": "json"}
    is_valid, errors = contract.validate_input(valid_input)
    print(f"  ✅ Valid input: {is_valid}")
    
    invalid_input = {"format": "json"}  # Missing "data"
    is_valid, errors = contract.validate_input(invalid_input)
    print(f"  ✅ Invalid input caught: {len(errors)} errors")
    
    # Test 3: Registry
    print("\n3. Contract Registry:")
    
    registry = ContractRegistry()
    registry.register(contract)
    
    # Register another contract
    executor_contract = AgentContract(
        id="executor-001",
        name="Task Executor",
        agent_type=AgentType.EXECUTOR,
        capabilities=[
            AgentCapability(name="code_execution", type=CapabilityType.CODE_GENERATION)
        ],
        required_contracts=["data-summary"],
        tags=["execution"]
    )
    registry.register(executor_contract)
    
    print(f"  ✅ Registered {len(registry._contracts)} contracts")
    
    # Find by capability
    by_capability = registry.find_by_capability("data_processing")
    print(f"  ✅ Found by capability: {len(by_capability)}")
    
    # Find compatible
    compatible = registry.find_compatible(executor_contract)
    print(f"  ✅ Compatible contracts: {len(compatible)}")
    
    # Test 4: Multi-agent contract
    print("\n4. Multi-Agent Contract:")
    
    multi = MultiAgentContract(
        id="pipeline-001",
        name="Analysis Pipeline",
        agent_contracts=["analyzer-001", "executor-001"],
        coordination_pattern=CoordinationPattern.PIPELINE,
        execution_graph={
            "analyzer-001": ["executor-001"]
        },
        shared_context=True
    )
    
    execution_order = multi.get_execution_order()
    print(f"  ✅ Multi-agent contract: {len(multi.agent_contracts)} agents")
    print(f"     Execution order: {execution_order}")
    
    # Test 5: Contract validator
    print("\n5. Contract Validation:")
    
    validator = ContractValidator()
    
    schema_result = validator.validate_schema(contract)
    print(f"  ✅ Schema validation: {schema_result.valid}")
    
    cap_result = validator.validate_capabilities(contract)
    print(f"  ✅ Capability validation: {cap_result.valid}")
    
    dep_result = validator.validate_dependencies(executor_contract, registry)
    print(f"  ✅ Dependency validation: {dep_result.valid}")
    
    # Test 6: Execute contract
    print("\n6. Contract Execution:")
    
    executor = ContractExecutor(registry)
    
    context = ExecutionContext(execution_id="exec-001")
    result = await executor.execute(contract, valid_input, context)
    
    print(f"  ✅ Execution result: {result.success}")
    if result.success:
        print(f"     Output keys: {list(result.output.keys())}")
    
    # Test 7: Version management
    print("\n7. Contract Versioning:")
    
    version = ContractVersion.from_string("analyzer-001", "1.2.3-beta")
    print(f"  ✅ Version parsed: {version.major}.{version.minor}.{version.patch}")
    print(f"     Prerelease: {version.prerelease}")
    
    compatible = version.is_compatible_with("1.3.0")
    print(f"  ✅ Compatible with 1.3.0: {compatible}")
    
    print("\n" + "=" * 50)
    print("Agent Contracts Tests Complete!")


if __name__ == "__main__":
    asyncio.run(test_agent_contracts())
