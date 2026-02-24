#!/usr/bin/env python3
"""
Governance Connectome Schema

Maps organizational governance structure as a network for:
- Dynamic circle role assignment based on network topology
- Causal emergence analysis for governance optimization
- Betweenness centrality for coordinator identification
"""

import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from enum import Enum
from pathlib import Path


class NodeType(Enum):
    ROLE = "role"
    PURPOSE = "purpose"
    DOMAIN = "domain"
    ACCOUNTABILITY = "accountability"
    AGENT = "agent"


class EdgeType(Enum):
    DELEGATION = "delegation"
    ALIGNMENT = "alignment"
    DEPENDENCY = "dependency"
    COORDINATION = "coordination"
    REPORTING = "reporting"


@dataclass
class ConnectomeNode:
    id: str
    node_type: NodeType
    name: str
    responsibilities: List[str]
    metadata: Dict = None

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.node_type.value,
            "name": self.name,
            "responsibilities": self.responsibilities,
            "metadata": self.metadata or {}
        }


@dataclass
class ConnectomeEdge:
    source: str
    target: str
    edge_type: EdgeType
    weight: float
    metadata: Dict = None

    def to_dict(self):
        return {
            "source": self.source,
            "target": self.target,
            "type": self.edge_type.value,
            "weight": self.weight,
            "metadata": self.metadata or {}
        }


class GovernanceConnectome:
    """Organizational connectome for governance network analysis"""

    def __init__(self):
        self.nodes: Dict[str, ConnectomeNode] = {}
        self.edges: List[ConnectomeEdge] = []

    def add_node(self, node: ConnectomeNode) -> None:
        self.nodes[node.id] = node

    def add_edge(self, edge: ConnectomeEdge) -> None:
        self.edges.append(edge)

    def get_neighbors(self, node_id: str) -> List[str]:
        """Get all connected nodes"""
        neighbors = set()
        for edge in self.edges:
            if edge.source == node_id:
                neighbors.add(edge.target)
            elif edge.target == node_id:
                neighbors.add(edge.source)
        return list(neighbors)

    def calculate_betweenness_centrality(self) -> Dict[str, float]:
        """Simple betweenness centrality approximation"""
        centrality = {node_id: 0.0 for node_id in self.nodes}
        node_ids = list(self.nodes.keys())
        for source in node_ids:
            for target in node_ids:
                if source != target:
                    path = self._find_shortest_path(source, target)
                    if path and len(path) > 2:
                        for intermediate in path[1:-1]:
                            centrality[intermediate] += 1.0
        max_val = max(centrality.values()) if centrality.values() else 1
        return {k: v / max_val for k, v in centrality.items()}

    def _find_shortest_path(self, source: str, target: str) -> Optional[List[str]]:
        """BFS for shortest path"""
        if source == target:
            return [source]
        visited = {source}
        queue = [(source, [source])]
        while queue:
            current, path = queue.pop(0)
            for neighbor in self.get_neighbors(current):
                if neighbor == target:
                    return path + [neighbor]
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))
        return None

    def get_coordinators(self, top_n: int = 3) -> List[str]:
        """Get top N nodes by centrality as coordinators"""
        centrality = self.calculate_betweenness_centrality()
        sorted_nodes = sorted(centrality.items(), key=lambda x: x[1], reverse=True)
        return [node_id for node_id, _ in sorted_nodes[:top_n]]

    def to_json(self) -> str:
        return json.dumps({
            "nodes": [n.to_dict() for n in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges]
        }, indent=2)

    def save(self, path: Path) -> None:
        path.write_text(self.to_json())

    @classmethod
    def load(cls, path: Path) -> "GovernanceConnectome":
        data = json.loads(path.read_text())
        connectome = cls()
        for n in data["nodes"]:
            node = ConnectomeNode(
                id=n["id"], node_type=NodeType(n["type"]),
                name=n["name"], responsibilities=n["responsibilities"],
                metadata=n.get("metadata")
            )
            connectome.add_node(node)
        for e in data["edges"]:
            edge = ConnectomeEdge(
                source=e["source"], target=e["target"],
                edge_type=EdgeType(e["type"]), weight=e["weight"],
                metadata=e.get("metadata")
            )
            connectome.add_edge(edge)
        return connectome

