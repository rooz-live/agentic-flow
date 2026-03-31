#!/usr/bin/env python3
"""
Miras vs AgentDB Memory Pattern Comparison PoC
Based on: "Titans: Learning to Memorize at Test Time" (arXiv:2501.00663)
"""
import json
import argparse
import os
from datetime import datetime
from typing import Dict, List, Any
from dataclasses import dataclass, field


@dataclass
class MemoryMetrics:
    storage_efficiency: float = 0.0
    retrieval_accuracy: float = 0.0
    surprise_score: float = 0.0
    retention_rate: float = 0.0
    compression_ratio: float = 0.0


@dataclass
class MirasMemory:
    """MIRAS-style memory with surprise-based prioritization."""
    memories: List[Dict] = field(default_factory=list)
    surprise_threshold: float = 0.5
    max_capacity: int = 1000

    def compute_surprise(self, event: Dict) -> float:
        reward = event.get('reward') or {}
        if isinstance(reward, dict):
            value = reward.get('value', 0)
            components = reward.get('components') or {}
            expected = components.get('success', 0)
            # Surprise = deviation from expected + absolute magnitude
            if expected != 0:
                deviation = abs(value - expected) / abs(expected)
            else:
                deviation = abs(value)
            # Also consider status - failures are surprising
            status = reward.get('status', '')
            if status == 'failure':
                deviation += 0.5
            return min(1.0, deviation)
        return 0.1  # Default non-zero surprise for events without reward

    def store(self, event: Dict) -> bool:
        surprise = self.compute_surprise(event)
        event['_miras_surprise'] = surprise
        if surprise >= self.surprise_threshold:
            self.memories.append(event)
            if len(self.memories) > self.max_capacity:
                self.memories.sort(key=lambda x: x.get('_miras_surprise', 0), reverse=True)
                self.memories = self.memories[:self.max_capacity]
            return True
        return False

    def retrieve(self, query: Dict, k: int = 5) -> List[Dict]:
        state = query.get('state') or {}
        patterns = state.get('patterns') or {}
        circle = patterns.get('circle-risk-focus', '')
        relevant = []
        for m in self.memories:
            m_state = m.get('state') or {}
            m_patterns = m_state.get('patterns') or {}
            if m_patterns.get('circle-risk-focus', '') == circle:
                relevant.append(m)
        relevant.sort(key=lambda x: x.get('_miras_surprise', 0), reverse=True)
        return relevant[:k]


@dataclass
class AgentDBMemory:
    """AgentDB ReflexionMemory-style storage."""
    episodes: List[Dict] = field(default_factory=list)
    max_episodes: int = 1000

    def store(self, event: Dict) -> bool:
        self.episodes.append(event)
        if len(self.episodes) > self.max_episodes:
            self.episodes = self.episodes[-self.max_episodes:]
        return True

    def retrieve(self, query: Dict, k: int = 5) -> List[Dict]:
        successful = []
        for e in self.episodes:
            reward = e.get('reward') or {}
            if reward.get('value', 0) > 0:
                successful.append(e)
        successful.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return successful[:k]


def load_trajectories(path: str) -> List[Dict]:
    trajectories = []
    with open(path, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    trajectories.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return trajectories


def compute_metrics(memory_system: Any, trajectories: List[Dict]) -> MemoryMetrics:
    metrics = MemoryMetrics()
    stored_count = sum(1 for t in trajectories if memory_system.store(t))

    total_bytes = sum(len(json.dumps(t)) for t in trajectories)
    memories = getattr(memory_system, 'memories', getattr(memory_system, 'episodes', []))
    stored_bytes = sum(len(json.dumps(m)) for m in memories)

    metrics.storage_efficiency = stored_bytes / max(1, stored_count)
    metrics.compression_ratio = total_bytes / max(1, stored_bytes)
    metrics.retention_rate = stored_count / max(1, len(trajectories))

    if hasattr(memory_system, 'memories'):
        surprises = [m.get('_miras_surprise', 0) for m in memory_system.memories]
        metrics.surprise_score = sum(surprises) / max(1, len(surprises))

    correct, total = 0, 0
    for traj in trajectories[:20]:
        retrieved = memory_system.retrieve(traj, k=3)
        if retrieved:
            total += 1
            traj_reward = traj.get('reward') or {}
            traj_success = traj_reward.get('value', 0) > 0
            for r in retrieved:
                r_reward = r.get('reward') or {}
                if (r_reward.get('value', 0) > 0) == traj_success:
                    correct += 1
                    break
    metrics.retrieval_accuracy = correct / max(1, total)
    return metrics


def run_comparison(trajectories_path: str, output_dir: str) -> Dict:
    print("=" * 70)
    print("MIRAS vs AgentDB Memory Pattern Comparison PoC")
    print("=" * 70)

    trajectories = load_trajectories(trajectories_path)
    print(f"Loaded {len(trajectories)} trajectories")

    miras = MirasMemory(surprise_threshold=0.1)  # Lower threshold to capture more events
    agentdb = AgentDBMemory()

    print("\nComputing metrics...")
    miras_m = compute_metrics(miras, trajectories.copy())
    agentdb_m = compute_metrics(agentdb, trajectories.copy())

    print(f"\n{'Metric':<25} {'MIRAS':<20} {'AgentDB':<20}")
    print("-" * 65)
    print(f"{'Storage Efficiency':<25} {miras_m.storage_efficiency:,.0f} bytes      {agentdb_m.storage_efficiency:,.0f} bytes")
    print(f"{'Compression Ratio':<25} {miras_m.compression_ratio:.2f}x              {agentdb_m.compression_ratio:.2f}x")
    print(f"{'Retention Rate':<25} {miras_m.retention_rate:.1%}             {agentdb_m.retention_rate:.1%}")
    print(f"{'Retrieval Accuracy':<25} {miras_m.retrieval_accuracy:.1%}             {agentdb_m.retrieval_accuracy:.1%}")
    print(f"{'Surprise Score':<25} {miras_m.surprise_score:.3f}              N/A")

    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, 'miras_agentdb_comparison.json')
    with open(output_file, 'w') as f:
        json.dump({'timestamp': datetime.now().isoformat(), 'trajectories': len(trajectories),
                   'miras': {'memories': len(miras.memories), **vars(miras_m)},
                   'agentdb': {'episodes': len(agentdb.episodes), **vars(agentdb_m)}}, f, indent=2)
    print(f"\nResults saved to: {output_file}")
    return {'miras': miras_m, 'agentdb': agentdb_m}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--trajectories', default='.goalie/trajectories.jsonl')
    parser.add_argument('--output', default='.goalie/research')
    args = parser.parse_args()
    run_comparison(args.trajectories, args.output)
