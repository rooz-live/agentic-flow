#!/usr/bin/env python3
"""
Integration Tests for Hook Orchestrator
========================================

Tests the complete PreToolUse → Execute → PostToolUse lifecycle
with all plugins integrated.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Direct imports (not relative)
from agentdb.plugins.security_guardian import SecurityGuardian
from agentdb.plugins.agent_coordinator import AgentCoordinator
from agentdb.plugins.beam_dimension_mapper import BEAMDimensionMapper
from agentdb.plugins.collect_tdd_metrics import TDDMetricsCollector

# Import hook orchestrator components
import json
import sqlite3
import time
import hashlib
from datetime import datetime
from typing import Dict, Optional, Any
from dataclasses import dataclass, asdict


@dataclass
class ExecutionContext:
    """Immutable execution context"""
    context_id: str
    timestamp: str
    command: str
    file_context: Dict[str, Any]
    system_state: Dict[str, Any]
    security_scan: Optional[Dict] = None
    agent_assignment: Optional[Dict] = None
    beam_dimensions: Optional[Dict] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class ExecutionOutcome:
    """Immutable execution outcome"""
    context_id: str
    timestamp: str
    success: bool
    duration_ms: float
    tribe: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return asdict(self)


class SimpleHookOrchestrator:
    """Simplified orchestrator for testing"""
    
    def __init__(self, db_path: str = '.agentdb/agentdb.sqlite'):
        self.security_guardian = SecurityGuardian(db_path)
        self.agent_coordinator = AgentCoordinator(db_path)
        self.beam_mapper = BEAMDimensionMapper(db_path)
    
    def pre_tool_use(self, command: str) -> ExecutionContext:
        """PreToolUse hook chain"""
        start_time = time.perf_counter()
        context_id = hashlib.sha256(f"{command}{time.time()}".encode()).hexdigest()[:16]
        
        # Phase 1: Security scan
        security_result = self.security_guardian.scan_command(command)
        
        if security_result['action'] == 'deny':
            raise Exception(f"Security: {security_result['reasoning']}")
        
        # Phase 2: Agent assignment
        agent_result = self.agent_coordinator.assign_task(command)
        
        # Phase 3: BEAM extraction
        beam_result = self.beam_mapper.extract_dimensions(command)
        
        end_time = time.perf_counter()
        overhead_ms = (end_time - start_time) * 1000
        
        context = ExecutionContext(
            context_id=context_id,
            timestamp=datetime.now().isoformat(),
            command=command,
            file_context={},
            system_state={},
            security_scan=security_result,
            agent_assignment=agent_result,
            beam_dimensions=beam_result
        )
        
        print(f"✅ PreToolUse complete ({overhead_ms:.2f}ms)")
        print(f"   Security: {security_result['action'].upper()}")
        print(f"   Agent: {agent_result['agent']}")
        print(f"   Tribe: {beam_result['tribe']}")
        print(f"   BEAM Confidence: {beam_result['confidence']:.1%}")
        
        return context
    
    def post_tool_use(self, context: ExecutionContext, success: bool, duration_ms: float) -> ExecutionOutcome:
        """PostToolUse hook chain"""
        start_time = time.perf_counter()
        
        # Phase 1: Update expertise
        self.agent_coordinator.update_task_outcome(
            task_description=context.command,
            success=success,
            duration_ms=duration_ms
        )
        
        # Phase 2: Tribal routing
        tribe = context.beam_dimensions.get('tribe')
        
        end_time = time.perf_counter()
        overhead_ms = (end_time - start_time) * 1000
        
        outcome = ExecutionOutcome(
            context_id=context.context_id,
            timestamp=datetime.now().isoformat(),
            success=success,
            duration_ms=duration_ms,
            tribe=tribe
        )
        
        print(f"✅ PostToolUse complete ({overhead_ms:.2f}ms)")
        print(f"   Success: {success}")
        print(f"   Tribal Output: {tribe}")
        
        return outcome


def test_full_lifecycle():
    """Test complete PreToolUse → Execute → PostToolUse"""
    print("=" * 60)
    print("Integration Test: Hook Orchestrator")
    print("=" * 60)
    print()
    
    orchestrator = SimpleHookOrchestrator()
    
    # Test 1: Safe command
    print("Test 1: Safe deployment command")
    print("-" * 60)
    context = orchestrator.pre_tool_use("Deploy API to production via CI/CD pipeline")
    time.sleep(0.1)  # Simulate execution
    outcome = orchestrator.post_tool_use(context, success=True, duration_ms=234)
    print()
    
    # Test 2: Security threat
    print("Test 2: Dangerous command (should be blocked)")
    print("-" * 60)
    try:
        context = orchestrator.pre_tool_use("rm -rf /tmp/important")
        print("❌ FAIL: Command should have been blocked")
    except Exception as e:
        print(f"✅ PASS: Command blocked as expected")
        print(f"   Reason: {str(e)}")
    print()
    
    # Test 3: Neural trading command
    print("Test 3: Trading command (tribe: neural-trading)")
    print("-" * 60)
    context = orchestrator.pre_tool_use("Execute trade for AAPL with risk assessment")
    time.sleep(0.05)
    outcome = orchestrator.post_tool_use(context, success=True, duration_ms=123)
    print()
    
    # Test 4: Security infrastructure
    print("Test 4: Security command (tribe: security-infrastructure)")
    print("-" * 60)
    context = orchestrator.pre_tool_use("Run security audit and authentication scan")
    time.sleep(0.05)
    outcome = orchestrator.post_tool_use(context, success=True, duration_ms=456)
    print()
    
    print("=" * 60)
    print("✅ All integration tests complete!")
    print("=" * 60)


if __name__ == '__main__':
    test_full_lifecycle()
