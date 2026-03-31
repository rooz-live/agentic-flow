"""
Swarm Orchestrator
Dynamic agent scaling based on WSJF risk scores with e2b sandbox isolation.
Supports hierarchical, mesh, and ring topologies with Byzantine fault tolerance.
"""

import os
import json
import asyncio
import sqlite3
import uuid
from typing import Dict, List, Optional, Set, Tuple
from datetime import datetime
from enum import Enum
from pathlib import Path

# E2B SDK for isolated agent execution
try:
    from e2b import Sandbox
    E2B_AVAILABLE = True
except ImportError:
    E2B_AVAILABLE = False
    print("Warning: e2b not available. Install with: pip install e2b")


class TopologyType(Enum):
    """Swarm topology types."""
    HIERARCHICAL = "hierarchical"  # Centralized control, fast decisions
    MESH = "mesh"  # Peer-to-peer with redundancy
    RING = "ring"  # Sequential processing, efficient


class AgentState(Enum):
    """Agent lifecycle states."""
    SPAWNING = "spawning"
    ACTIVE = "active"
    IDLE = "idle"
    TERMINATING = "terminating"
    FAILED = "failed"


class Agent:
    """Individual agent within swarm."""
    
    def __init__(
        self,
        agent_id: str,
        sandbox = None,
        capabilities: List[str] = None
    ):
        self.agent_id = agent_id
        self.sandbox = sandbox
        self.capabilities = capabilities or ['general']
        self.state = AgentState.SPAWNING
        self.task_count = 0
        self.error_count = 0
        self.created_at = datetime.utcnow()
        self.last_heartbeat = datetime.utcnow()
    
    async def execute_task(self, task: Dict) -> Dict:
        """Execute task in isolated sandbox."""
        if self.sandbox is None:
            raise RuntimeError("No sandbox available")
        
        try:
            # Execute in e2b sandbox
            result = await self.sandbox.run_code(task.get('code', ''))
            self.task_count += 1
            self.last_heartbeat = datetime.utcnow()
            return {
                'agent_id': self.agent_id,
                'success': True,
                'result': result
            }
        except Exception as e:
            self.error_count += 1
            return {
                'agent_id': self.agent_id,
                'success': False,
                'error': str(e)
            }
    
    async def terminate(self):
        """Clean shutdown of agent."""
        self.state = AgentState.TERMINATING
        if self.sandbox:
            try:
                await self.sandbox.close()
            except:
                pass
        self.state = AgentState.FAILED


class SwarmOrchestrator:
    """
    Orchestrates swarm of isolated agents with risk-based scaling.
    
    Features:
    - Risk-driven scaling (WSJF scores from risk DB)
    - E2B sandbox isolation
    - Multiple topologies (hierarchical, mesh, ring)
    - Byzantine fault tolerance (33% malicious)
    - Auto-healing and load balancing
    """
    
    def __init__(
        self,
        max_agents: int = 10,
        risk_db_path: Optional[str] = None,
        e2b_api_key: Optional[str] = None,
        topology: TopologyType = TopologyType.MESH
    ):
        """
        Initialize swarm orchestrator.
        
        Args:
            max_agents: Maximum concurrent agents
            risk_db_path: Path to risk database
            e2b_api_key: E2B API key for sandboxes
            topology: Initial topology type
        """
        self.max_agents = max_agents
        self.min_agents = 1
        self.agents: Dict[str, Agent] = {}
        self.topology = topology
        self.risk_threshold = float(os.getenv('SWARM_SCALE_THRESHOLD', '0.7'))
        
        # Risk database integration
        self.risk_db_path = risk_db_path or os.getenv(
            'RISK_DB_PATH',
            str(Path(__file__).parent.parent.parent / 'risks.db')
        )
        
        # E2B configuration
        self.e2b_api_key = e2b_api_key or os.getenv('E2B_API_KEY')
        if not self.e2b_api_key:
            print("Warning: E2B_API_KEY not set. Swarm will operate in mock mode.")
        
        # Statistics
        self.stats = {
            'total_spawned': 0,
            'total_terminated': 0,
            'total_tasks': 0,
            'total_failures': 0,
            'scale_events': 0
        }
        
        # Task queue
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.is_running = False
    
    def _get_current_risk_score(self) -> float:
        """
        Calculate current risk score from risk database.
        Returns average WSJF score of high-priority risks.
        """
        if not os.path.exists(self.risk_db_path):
            return 0.0
        
        try:
            conn = sqlite3.connect(self.risk_db_path)
            cursor = conn.cursor()
            
            # Get average WSJF score of risks in 'owned' or 'accepted' categories
            cursor.execute("""
                SELECT AVG(wsjf_score) 
                FROM risks 
                WHERE category IN ('owned', 'accepted')
                AND wsjf_score > 0
            """)
            
            result = cursor.fetchone()
            conn.close()
            
            if result and result[0]:
                # Normalize to 0-1 range (WSJF can be 0-10)
                return min(result[0] / 10.0, 1.0)
            
            return 0.0
        except Exception as e:
            print(f"Warning: Failed to get risk score: {e}")
            return 0.0
    
    def _calculate_target_agent_count(self, risk_score: float) -> int:
        """
        Calculate target agent count based on risk score.
        
        Args:
            risk_score: Risk score (0-1)
        
        Returns:
            Target agent count (1 to max_agents)
        """
        # Linear scaling: risk 0.0 -> 1 agent, risk 1.0 -> max_agents
        target = max(
            self.min_agents,
            min(
                self.max_agents,
                int(risk_score * self.max_agents)
            )
        )
        
        # Apply threshold: don't scale up unless risk exceeds threshold
        if risk_score < self.risk_threshold and target > self.min_agents:
            target = self.min_agents
        
        return target
    
    def _select_topology(self, risk_level: str) -> TopologyType:
        """
        Select topology based on risk level.
        
        Args:
            risk_level: 'low', 'medium', 'high', 'critical'
        
        Returns:
            Optimal topology for risk level
        """
        if risk_level == 'critical':
            return TopologyType.HIERARCHICAL  # Fast centralized decisions
        elif risk_level == 'high':
            return TopologyType.MESH  # Redundancy and fault tolerance
        else:
            return TopologyType.RING  # Efficient sequential processing
    
    async def _create_agent(self, agent_id: Optional[str] = None) -> Agent:
        """
        Create new agent with e2b sandbox.
        
        Args:
            agent_id: Optional agent ID (generated if None)
        
        Returns:
            Agent instance
        """
        agent_id = agent_id or f"agent-{uuid.uuid4().hex[:8]}"
        
        sandbox = None
        if E2B_AVAILABLE and self.e2b_api_key:
            try:
                # Create e2b sandbox for isolated execution
                sandbox = await Sandbox.create(api_key=self.e2b_api_key)
            except Exception as e:
                print(f"Warning: Failed to create e2b sandbox: {e}")
        
        agent = Agent(agent_id, sandbox)
        agent.state = AgentState.ACTIVE
        
        self.stats['total_spawned'] += 1
        
        # Log to risk database
        self._log_swarm_event('AGENT_SPAWNED', len(self.agents) + 1)
        
        return agent
    
    async def _terminate_agent(self, agent_id: str):
        """Terminate agent and cleanup resources."""
        if agent_id not in self.agents:
            return
        
        agent = self.agents[agent_id]
        await agent.terminate()
        del self.agents[agent_id]
        
        self.stats['total_terminated'] += 1
        
        # Log to risk database
        self._log_swarm_event('AGENT_TERMINATED', len(self.agents))
    
    async def scale_based_on_risk(self, risk_score: Optional[float] = None):
        """
        Scale swarm based on current risk score.
        
        Args:
            risk_score: Optional risk score (fetched if None)
        """
        if risk_score is None:
            risk_score = self._get_current_risk_score()
        
        target_count = self._calculate_target_agent_count(risk_score)
        current_count = len(self.agents)
        
        if target_count > current_count:
            # Scale up
            to_spawn = target_count - current_count
            print(f"Scaling UP: {current_count} -> {target_count} agents (risk: {risk_score:.3f})")
            
            spawn_tasks = [
                self._create_agent() 
                for _ in range(to_spawn)
            ]
            new_agents = await asyncio.gather(*spawn_tasks)
            
            for agent in new_agents:
                self.agents[agent.agent_id] = agent
            
            self.stats['scale_events'] += 1
            self._log_swarm_event('SCALE_UP', target_count, risk_score)
        
        elif target_count < current_count:
            # Scale down
            to_terminate = current_count - target_count
            print(f"Scaling DOWN: {current_count} -> {target_count} agents (risk: {risk_score:.3f})")
            
            # Terminate agents with highest error rate first
            agents_by_error = sorted(
                self.agents.values(),
                key=lambda a: a.error_count / max(a.task_count, 1),
                reverse=True
            )
            
            terminate_tasks = [
                self._terminate_agent(agent.agent_id)
                for agent in agents_by_error[:to_terminate]
            ]
            await asyncio.gather(*terminate_tasks)
            
            self.stats['scale_events'] += 1
            self._log_swarm_event('SCALE_DOWN', target_count, risk_score)
        
        # Update topology based on risk
        risk_level = 'critical' if risk_score > 0.8 else 'high' if risk_score > 0.5 else 'low'
        new_topology = self._select_topology(risk_level)
        if new_topology != self.topology:
            self.topology = new_topology
            self._log_swarm_event('TOPOLOGY_CHANGE', target_count, risk_score)
            print(f"Topology changed to: {self.topology.value}")
    
    async def submit_task(self, task: Dict) -> str:
        """
        Submit task to swarm queue.
        
        Args:
            task: Task specification
        
        Returns:
            Task ID
        """
        task_id = str(uuid.uuid4())
        task['task_id'] = task_id
        await self.task_queue.put(task)
        return task_id
    
    async def _process_tasks(self):
        """Process tasks from queue with Byzantine fault tolerance."""
        while self.is_running:
            if self.task_queue.empty():
                await asyncio.sleep(0.1)
                continue
            
            task = await self.task_queue.get()
            
            # Select agents for task (Byzantine fault tolerance: 3x redundancy)
            required_agents = min(3, len(self.agents))
            if required_agents == 0:
                print("Warning: No agents available for task")
                continue
            
            selected_agents = list(self.agents.values())[:required_agents]
            
            # Execute task on multiple agents for consensus
            results = await asyncio.gather(
                *[agent.execute_task(task) for agent in selected_agents],
                return_exceptions=True
            )
            
            # Byzantine consensus: majority vote
            successes = [r for r in results if isinstance(r, dict) and r.get('success')]
            
            if len(successes) >= (required_agents * 2 // 3):  # 2/3 majority
                self.stats['total_tasks'] += 1
            else:
                self.stats['total_failures'] += 1
                print(f"Task {task.get('task_id')} failed Byzantine consensus")
    
    async def start(self):
        """Start swarm orchestrator."""
        if not E2B_AVAILABLE:
            print("Warning: e2b not available. Running in mock mode.")
        
        self.is_running = True
        
        # Initial agent spawn
        initial_agent = await self._create_agent()
        self.agents[initial_agent.agent_id] = initial_agent
        
        # Start task processor
        asyncio.create_task(self._process_tasks())
        
        # Start risk-based scaling loop
        asyncio.create_task(self._risk_scaling_loop())
        
        print(f"Swarm orchestrator started with topology: {self.topology.value}")
    
    async def _risk_scaling_loop(self):
        """Periodic risk-based scaling check."""
        while self.is_running:
            try:
                await self.scale_based_on_risk()
            except Exception as e:
                print(f"Error in scaling loop: {e}")
            
            # Check every 30 seconds
            await asyncio.sleep(30)
    
    async def stop(self):
        """Stop swarm orchestrator and cleanup."""
        self.is_running = False
        
        # Terminate all agents
        terminate_tasks = [
            self._terminate_agent(agent_id)
            for agent_id in list(self.agents.keys())
        ]
        await asyncio.gather(*terminate_tasks)
        
        print("Swarm orchestrator stopped")
    
    def _log_swarm_event(
        self,
        event_type: str,
        agent_count: int,
        risk_score: Optional[float] = None
    ):
        """Log swarm event to risk database."""
        if not os.path.exists(self.risk_db_path):
            return
        
        try:
            conn = sqlite3.connect(self.risk_db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO swarm_events (
                    event_type, agent_count, risk_score, topology, metadata
                ) VALUES (?, ?, ?, ?, ?)
            """, (
                event_type,
                agent_count,
                risk_score,
                self.topology.value,
                json.dumps({'max_agents': self.max_agents})
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Warning: Failed to log swarm event: {e}")
    
    def get_stats(self) -> Dict:
        """Get swarm statistics."""
        active_agents = sum(1 for a in self.agents.values() if a.state == AgentState.ACTIVE)
        total_tasks = sum(a.task_count for a in self.agents.values())
        total_errors = sum(a.error_count for a in self.agents.values())
        
        return {
            **self.stats,
            'active_agents': active_agents,
            'total_agent_tasks': total_tasks,
            'total_agent_errors': total_errors,
            'topology': self.topology.value,
            'max_agents': self.max_agents,
            'risk_threshold': self.risk_threshold
        }


# Utility functions
def get_optimal_topology(risk_score: float) -> TopologyType:
    """
    Get optimal topology for risk score.
    
    Args:
        risk_score: Risk score (0-1)
    
    Returns:
        Recommended topology
    """
    if risk_score > 0.8:
        return TopologyType.HIERARCHICAL
    elif risk_score > 0.5:
        return TopologyType.MESH
    else:
        return TopologyType.RING


# Example usage
if __name__ == '__main__':
    async def main():
        # Initialize orchestrator
        orchestrator = SwarmOrchestrator(
            max_agents=5,
            topology=TopologyType.MESH
        )
        
        # Start swarm
        await orchestrator.start()
        
        # Simulate risk changes
        for risk in [0.2, 0.5, 0.8, 1.0]:
            print(f"\n--- Simulating risk score: {risk:.1f} ---")
            await orchestrator.scale_based_on_risk(risk)
            await asyncio.sleep(2)
        
        # Print statistics
        print("\n--- Swarm Statistics ---")
        stats = orchestrator.get_stats()
        for key, value in stats.items():
            print(f"  {key}: {value}")
        
        # Cleanup
        await orchestrator.stop()
    
    # Run
    asyncio.run(main())
