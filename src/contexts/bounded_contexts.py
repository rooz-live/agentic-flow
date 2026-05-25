"""DDD Strategic Patterns"""
# Bounded Contexts - DDD Strategic Patterns
# DDD context boundaries, relationships, and anti-corruption layers
# 
# WSJF Priority: 3.80 (GO - #1 Remaining Priority)
# Plan: rust-upgrade-wsjf-least-mature-019cbe.md

import json
import re
from enum import Enum
from typing import Dict, Any, Optional, List, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from collections import defaultdict

from src.cache.semantic_cache import SemanticCache
from src.resilience.circuit_breaker import CircuitBreaker


class ContextDomain(Enum):
    """Domain classification per DDD"""
    CORE = "core"              # Key differentiator, competitive advantage
    SUPPORTING = "supporting"  # Supports core, no competitive advantage
    GENERIC = "generic"        # Available off-the-shelf


class ContextRelationship(Enum):
    """Strategic DDD relationship patterns"""
    PARTNERSHIP = "partnership"          # Mutual dependency
    SHARED_KERNEL = "shared_kernel"      # Shared model between contexts
    CUSTOMER_SUPPLIER = "customer_supplier"  # Upstream/downstream power dynamic
    CONFORMIST = "conformist"            # Downstream conforms to upstream
    ANTI_CORRUPTION = "anti_corruption"  # ACL protects from foreign model
    OPEN_HOST = "open_host"              # Published language for integration
    SEPARATE_WAYS = "separate_ways"      # No relationship, duplication OK


@dataclass
class TermDefinition:
    """Definition of ubiquitous language term"""
    term: str
    definition: str
    context_id: str
    aliases: List[str] = field(default_factory=list)
    examples: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "term": self.term,
            "definition": self.definition,
            "aliases": self.aliases,
            "examples": self.examples
        }


class UbiquitousLanguage:
    """Ubiquitous language for a context"""
    
    def __init__(self, context_id: str):
        self.context_id = context_id
        self.terms: Dict[str, TermDefinition] = {}
    
    def add_term(
        self,
        term: str,
        definition: str,
        aliases: Optional[List[str]] = None,
        examples: Optional[List[str]] = None
    ) -> None:
        """Add term to ubiquitous language"""
        self.terms[term] = TermDefinition(
            term=term,
            definition=definition,
            context_id=self.context_id,
            aliases=aliases or [],
            examples=examples or []
        )
    
    def get_term(self, term: str) -> Optional[TermDefinition]:
        """Get term definition"""
        return self.terms.get(term)
    
    def find_ambiguous_terms(self) -> List[str]:
        """Find terms with overlapping meanings"""
        ambiguous = []
        terms_list = list(self.terms.values())
        
        for i, term1 in enumerate(terms_list):
            for term2 in terms_list[i+1:]:
                # Check for similar definitions
                if self._similar_definitions(term1.definition, term2.definition):
                    ambiguous.append(f"{term1.term} vs {term2.term}")
        
        return ambiguous
    
    def _similar_definitions(self, def1: str, def2: str) -> bool:
        """Check if definitions are similar"""
        # Simple similarity check - shared keywords
        words1 = set(def1.lower().split())
        words2 = set(def2.lower().split())
        intersection = words1 & words2
        return len(intersection) > 3  # Arbitrary threshold
    
    def check_consistency_across_contexts(
        self,
        other: 'UbiquitousLanguage'
    ) -> List[Dict[str, Any]]:
        """Check for term conflicts with another context"""
        conflicts = []
        
        for term, definition in self.terms.items():
            if term in other.terms:
                other_def = other.terms[term]
                if definition.definition != other_def.definition:
                    conflicts.append({
                        "term": term,
                        "this_context": self.context_id,
                        "this_definition": definition.definition,
                        "other_context": other.context_id,
                        "other_definition": other_def.definition
                    })
        
        return conflicts
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "context_id": self.context_id,
            "terms": {k: v.to_dict() for k, v in self.terms.items()}
        }


@dataclass
class TranslationRule:
    """Rule for translating between contexts"""
    source_entity: str
    target_entity: str
    field_mappings: Dict[str, str]  # source_field -> target_field
    transformations: List[str]  # e.g., "uppercase", "format_date"


@dataclass
class TranslationLayer:
    """Anti-corruption layer translation"""
    id: str
    source_context: str
    target_context: str
    direction: str  # "inbound" or "outbound"
    
    # Translation rules
    entity_mappings: Dict[str, str] = field(default_factory=dict)
    value_object_mappings: Dict[str, str] = field(default_factory=dict)
    event_mappings: Dict[str, str] = field(default_factory=dict)
    rules: List[TranslationRule] = field(default_factory=list)
    
    # Metrics
    translation_count: int = 0
    error_count: int = 0
    avg_latency_ms: float = 0.0
    
    def translate_entity(self, entity_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Translate entity from source to target context"""
        self.translation_count += 1
        
        # Find mapping
        target_type = self.entity_mappings.get(entity_type, entity_type)
        
        # Apply field mappings
        result = {"_type": target_type}
        
        for source_field, value in data.items():
            # Find target field
            target_field = None
            for rule in self.rules:
                if rule.source_entity == entity_type and source_field in rule.field_mappings:
                    target_field = rule.field_mappings[source_field]
                    break
            
            if target_field:
                result[target_field] = value
            else:
                # Pass through if no mapping
                result[source_field] = value
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source_context": self.source_context,
            "target_context": self.target_context,
            "direction": self.direction,
            "entity_mappings": self.entity_mappings,
            "translation_count": self.translation_count,
            "error_count": self.error_count
        }


@dataclass
class AggregateRoot:
    """Aggregate root within bounded context"""
    id: str
    name: str
    context_id: str
    
    # Consistency boundary
    entities: List[str] = field(default_factory=list)  # Child entity IDs
    value_objects: List[str] = field(default_factory=list)
    
    # Invariants - business rules that must always hold
    invariants: List[str] = field(default_factory=list)
    
    # Operations
    allowed_operations: List[str] = field(default_factory=list)
    
    # Events
    domain_events: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "context_id": self.context_id,
            "entities": self.entities,
            "invariants": self.invariants,
            "allowed_operations": self.allowed_operations,
            "domain_events": self.domain_events
        }


@dataclass
class BoundedContext:
    """DDD Bounded Context"""
    id: str
    name: str
    description: str
    domain: ContextDomain
    team: str
    responsibilities: List[str] = field(default_factory=list)
    
    # Boundaries
    public_interface: List[str] = field(default_factory=list)  # Exposed capabilities
    internal_implementation: List[str] = field(default_factory=list)  # Hidden details
    
    # Relationships
    upstream_contexts: List[str] = field(default_factory=list)
    downstream_contexts: List[str] = field(default_factory=list)
    
    # Anti-corruption layers
    acl_inbound: List[TranslationLayer] = field(default_factory=list)
    acl_outbound: List[TranslationLayer] = field(default_factory=list)
    
    # Aggregates
    aggregates: List[AggregateRoot] = field(default_factory=list)
    
    # Ubiquitous language
    language: UbiquitousLanguage = field(default_factory=lambda: UbiquitousLanguage(""))
    
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0.0"
    
    def __post_init__(self):
        if not self.language.context_id:
            self.language.context_id = self.id
    
    def add_aggregate(self, aggregate: AggregateRoot) -> None:
        """Add aggregate root to context"""
        aggregate.context_id = self.id
        self.aggregates.append(aggregate)
    
    def expose_capability(self, capability: str) -> None:
        """Add to public interface"""
        if capability not in self.public_interface:
            self.public_interface.append(capability)
    
    def add_acl_inbound(self, layer: TranslationLayer) -> None:
        """Add inbound anti-corruption layer"""
        layer.direction = "inbound"
        self.acl_inbound.append(layer)
    
    def add_acl_outbound(self, layer: TranslationLayer) -> None:
        """Add outbound anti-corruption layer"""
        layer.direction = "outbound"
        self.acl_outbound.append(layer)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "domain": self.domain.value,
            "team": self.team,
            "responsibilities": self.responsibilities,
            "public_interface": self.public_interface,
            "upstream": self.upstream_contexts,
            "downstream": self.downstream_contexts,
            "aggregates": [a.to_dict() for a in self.aggregates],
            "language": self.language.to_dict(),
            "version": self.version
        }


@dataclass
class ContextRelationshipLine:
    """Relationship between two contexts"""
    source: str
    target: str
    relationship: ContextRelationship
    description: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source,
            "target": self.target,
            "relationship": self.relationship.value,
            "description": self.description
        }


class ContextMap:
    """Map of bounded contexts and their relationships"""
    
    def __init__(self):
        self.contexts: Dict[str, BoundedContext] = {}
        self.relationships: List[ContextRelationshipLine] = []
    
    def add_context(self, context: BoundedContext) -> None:
        """Add context to map"""
        self.contexts[context.id] = context
    
    def get_context(self, context_id: str) -> Optional[BoundedContext]:
        """Get context by ID"""
        return self.contexts.get(context_id)
    
    def connect(
        self,
        upstream: str,
        downstream: str,
        relationship: ContextRelationship,
        description: str = ""
    ) -> None:
        """Connect two contexts with relationship"""
        # Update context relationships
        if upstream in self.contexts:
            if downstream not in self.contexts[upstream].downstream_contexts:
                self.contexts[upstream].downstream_contexts.append(downstream)
        
        if downstream in self.contexts:
            if upstream not in self.contexts[downstream].upstream_contexts:
                self.contexts[downstream].upstream_contexts.append(upstream)
        
        # Add relationship line
        self.relationships.append(ContextRelationshipLine(
            source=upstream,
            target=downstream,
            relationship=relationship,
            description=description
        ))
    
    def get_upstream(self, context_id: str) -> List[BoundedContext]:
        """Get contexts this context depends on"""
        if context_id not in self.contexts:
            return []
        
        upstream_ids = self.contexts[context_id].upstream_contexts
        return [self.contexts[uid] for uid in upstream_ids if uid in self.contexts]
    
    def get_downstream(self, context_id: str) -> List[BoundedContext]:
        """Get contexts depending on this context"""
        if context_id not in self.contexts:
            return []
        
        downstream_ids = self.contexts[context_id].downstream_contexts
        return [self.contexts[uid] for uid in downstream_ids if uid in self.contexts]
    
    def detect_cycles(self) -> Optional[List[str]]:
        """Detect cycles in context dependencies"""
        visited = set()
        rec_stack = set()
        
        def dfs(cid: str, path: List[str]) -> Optional[List[str]]:
            visited.add(cid)
            rec_stack.add(cid)
            
            if cid in self.contexts:
                for downstream in self.contexts[cid].downstream_contexts:
                    if downstream not in visited:
                        result = dfs(downstream, path + [downstream])
                        if result:
                            return result
                    elif downstream in rec_stack:
                        # Found cycle
                        if downstream in path:
                            cycle_start = path.index(downstream)
                            return path[cycle_start:] + [downstream]
            
            rec_stack.remove(cid)
            return None
        
        for cid in self.contexts:
            if cid not in visited:
                result = dfs(cid, [cid])
                if result:
                    return result
        
        return None
    
    def critical_path(self, from_id: str, to_id: str) -> List[str]:
        """Find critical path between two contexts"""
        # BFS to find shortest path
        visited = {from_id}
        queue = [(from_id, [from_id])]
        
        while queue:
            current, path = queue.pop(0)
            
            if current == to_id:
                return path
            
            if current in self.contexts:
                for downstream in self.contexts[current].downstream_contexts:
                    if downstream not in visited:
                        visited.add(downstream)
                        queue.append((downstream, path + [downstream]))
        
        return []
    
    def to_mermaid(self) -> str:
        """Export to Mermaid diagram format"""
        lines = ["graph TD"]
        
        # Add contexts
        for cid, context in self.contexts.items():
            style = self._get_mermaid_style(context.domain)
            lines.append(f"    {cid}[{context.name}]:::${context.domain.value}")
        
        # Add relationships
        for rel in self.relationships:
            arrow = self._get_mermaid_arrow(rel.relationship)
            lines.append(f"    {rel.source} {arrow}|{rel.relationship.value}| {rel.target}")
        
        # Add styling
        lines.append("    classDef core fill:#f96,stroke:#333,stroke-width:2px")
        lines.append("    classDef supporting fill:#69f,stroke:#333,stroke-width:1px")
        lines.append("    classDef generic fill:#9f9,stroke:#333,stroke-width:1px")
        
        return "\n".join(lines)
    
    def _get_mermaid_style(self, domain: ContextDomain) -> str:
        """Get Mermaid style class for domain"""
        return domain.value
    
    def _get_mermaid_arrow(self, relationship: ContextRelationship) -> str:
        """Get Mermaid arrow for relationship"""
        arrows = {
            ContextRelationship.PARTNERSHIP: "<-->",
            ContextRelationship.SHARED_KERNEL: "--",
            ContextRelationship.CUSTOMER_SUPPLIER: "-->",
            ContextRelationship.CONFORMIST: "..>",
            ContextRelationship.ANTI_CORRUPTION: "--x",
            ContextRelationship.OPEN_HOST: "--o",
            ContextRelationship.SEPARATE_WAYS: "-.-"
        }
        return arrows.get(relationship, "-->")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "contexts": {k: v.to_dict() for k, v in self.contexts.items()},
            "relationships": [r.to_dict() for r in self.relationships]
        }


class RelationshipAnalyzer:
    """Analyze context relationships"""
    
    def __init__(self, context_map: ContextMap):
        self._map = context_map
    
    def find_tight_coupling(self) -> List[Tuple[str, str]]:
        """Find tightly coupled contexts"""
        tightly_coupled = []
        
        for cid, context in self._map.contexts.items():
            # Many upstream dependencies = tight coupling
            if len(context.upstream_contexts) > 5:
                for upstream in context.upstream_contexts:
                    tightly_coupled.append((upstream, cid))
        
        return tightly_coupled
    
    def find_orphan_contexts(self) -> List[str]:
        """Find contexts with no relationships"""
        orphans = []
        
        for cid, context in self._map.contexts.items():
            total_relationships = len(context.upstream_contexts) + len(context.downstream_contexts)
            if total_relationships == 0:
                orphans.append(cid)
        
        return orphans
    
    def calculate_stability(self, context_id: str) -> float:
        """Calculate stability metric (0-1)"""
        if context_id not in self._map.contexts:
            return 0.0
        
        context = self._map.contexts[context_id]
        
        # Stability = outgoing / (incoming + outgoing)
        incoming = len(context.upstream_contexts)
        outgoing = len(context.downstream_contexts)
        
        if incoming + outgoing == 0:
            return 1.0  # No dependencies = perfectly stable
        
        return outgoing / (incoming + outgoing)
    
    def calculate_instability(self, context_id: str) -> float:
        """Calculate instability metric (0-1)"""
        return 1.0 - self.calculate_stability(context_id)
    
    def suggest_refactoring(self) -> List[Dict[str, Any]]:
        """Suggest refactoring opportunities"""
        suggestions = []
        
        # Check for tight coupling
        for upstream, downstream in self.find_tight_coupling():
            suggestions.append({
                "type": "reduce_coupling",
                "description": f"{downstream} depends on many upstream contexts. Consider ACL.",
                "contexts": [upstream, downstream]
            })
        
        # Check for cycles
        cycles = self._map.detect_cycles()
        if cycles:
            suggestions.append({
                "type": "break_cycle",
                "description": f"Circular dependency detected: {' -> '.join(cycles)}",
                "contexts": cycles
            })
        
        return suggestions


# Self-test
def test_bounded_contexts():
    """Test bounded contexts system"""
    print("Testing Bounded Contexts")
    print("=" * 50)
    
    # Test 1: Create contexts
    print("\n1. Creating Bounded Contexts:")
    
    order_context = BoundedContext(
        id="order",
        name="Order Management",
        description="Handles order lifecycle",
        domain=ContextDomain.CORE,
        team="Order Team",
        responsibilities=["Create orders", "Process payments", "Track fulfillment"]
    )
    
    inventory_context = BoundedContext(
        id="inventory",
        name="Inventory Management",
        description="Manages stock levels",
        domain=ContextDomain.SUPPORTING,
        team="Inventory Team",
        responsibilities=["Track stock", "Manage warehouses", "Handle replenishment"]
    )
    
    print(f"  ✅ Created {order_context.name} ({order_context.domain.value})")
    print(f"  ✅ Created {inventory_context.name} ({inventory_context.domain.value})")
    
    # Test 2: Add aggregates
    print("\n2. Adding Aggregates:")
    
    order_aggregate = AggregateRoot(
        id="order-agg",
        name="Order",
        context_id="order",
        entities=["OrderLine", "ShippingAddress"],
        invariants=["Order must have at least one line", "Total must be positive"],
        allowed_operations=["create", "cancel", "ship"],
        domain_events=["OrderCreated", "OrderShipped", "OrderCancelled"]
    )
    
    order_context.add_aggregate(order_aggregate)
    print(f"  ✅ Added aggregate: {order_aggregate.name}")
    print(f"     Invariants: {len(order_aggregate.invariants)}")
    print(f"     Events: {len(order_aggregate.domain_events)}")
    
    # Test 3: Ubiquitous language
    print("\n3. Ubiquitous Language:")
    
    order_context.language.add_term(
        term="Order",
        definition="A request from a customer to purchase products",
        aliases=["Purchase Order", "Customer Order"],
        examples=["Order #12345 for customer ABC Corp"]
    )
    
    term = order_context.language.get_term("Order")
    print(f"  ✅ Added term: {term.term}")
    print(f"     Definition: {term.definition[:50]}...")
    
    # Test 4: Context map
    print("\n4. Context Map:")
    
    context_map = ContextMap()
    context_map.add_context(order_context)
    context_map.add_context(inventory_context)
    
    # Connect contexts
    context_map.connect(
        upstream="inventory",
        downstream="order",
        relationship=ContextRelationship.CUSTOMER_SUPPLIER,
        description="Order checks inventory availability"
    )
    
    upstream = context_map.get_upstream("order")
    downstream = context_map.get_downstream("inventory")
    
    print(f"  ✅ Connected contexts: inventory -> order")
    print(f"  ✅ Order upstream: {[c.name for c in upstream]}")
    print(f"  ✅ Inventory downstream: {[c.name for c in downstream]}")
    
    # Test 5: Mermaid export
    print("\n5. Mermaid Diagram Export:")
    mermaid = context_map.to_mermaid()
    print(f"  ✅ Generated {len(mermaid)} characters")
    print("  First 200 chars:")
    print(f"  {mermaid[:200]}...")
    
    # Test 6: Relationship analysis
    print("\n6. Relationship Analysis:")
    
    analyzer = RelationshipAnalyzer(context_map)
    
    stability = analyzer.calculate_stability("inventory")
    instability = analyzer.calculate_instability("inventory")
    
    print(f"  ✅ Inventory stability: {stability:.2f}")
    print(f"  ✅ Inventory instability: {instability:.2f}")
    
    # Test 7: Cycle detection
    print("\n7. Cycle Detection:")
    
    cycles = context_map.detect_cycles()
    if cycles:
        print(f"  ⚠️  Cycles detected: {' -> '.join(cycles)}")
    else:
        print("  ✅ No cycles detected")
    
    print("\n" + "=" * 50)
    print("Bounded Contexts Tests Complete!")


if __name__ == "__main__":
    test_bounded_contexts()

# Verification specs mapping:
# """Single compilation

