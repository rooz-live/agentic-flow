"""
Semantic Support Triage System
Vector-based incident classification and intelligent routing

Plan: later-phase-support-proxies-migration-019cbe.md
"""

import json
import re
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import hashlib

from src.cache.semantic_cache import SemanticCache
from src.resilience.circuit_breaker import CircuitBreaker, circuit_breaker


@dataclass
class Incident:
    """Support incident with multi-modal data"""
    id: str
    title: str
    description: str
    logs: Optional[str] = None
    stack_trace: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    source: str = "unknown"  # email, chat, api, alert
    timestamp: Optional[datetime] = None
    tags: List[str] = None
    priority: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        if self.tags is None:
            self.tags = []
    
    def to_text(self) -> str:
        """Convert incident to searchable text"""
        parts = [self.title, self.description]
        
        if self.logs:
            parts.append(self.logs[:2000])  # Limit log size
        
        if self.stack_trace:
            parts.append(self.stack_trace[:1000])
        
        return "\n\n".join(parts)


@dataclass
class TriageResult:
    """Result of incident triage"""
    incident_id: str
    priority: str  # critical, high, medium, low
    team: str
    suggested_fix: Optional[str]
    confidence: float
    similar_incidents: List[Dict[str, Any]]
    routing_reason: str
    estimated_resolution_time: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "incident_id": self.incident_id,
            "priority": self.priority,
            "team": self.team,
            "suggested_fix": self.suggested_fix,
            "confidence": self.confidence,
            "similar_incidents": self.similar_incidents,
            "routing_reason": self.routing_reason,
            "estimated_resolution_time": self.estimated_resolution_time
        }


class IncidentEmbedder:
    """Multi-modal incident embedding"""
    
    def __init__(self, embedding_dim: int = 384):
        self.embedding_dim = embedding_dim
    
    def embed(self, incident: Incident) -> List[float]:
        """
        Create deterministic embedding from incident
        In production, use transformer-based embeddings
        """
        text = incident.to_text()
        
        # Create deterministic hash-based embedding
        hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
        
        # Generate embedding dimensions from hash
        embedding = []
        for i in range(self.embedding_dim):
            # Use different parts of hash for each dimension
            val = ((hash_val >> (i * 8)) & 0xFF) / 255.0
            embedding.append(val)
        
        # Normalize
        magnitude = sum(x * x for x in embedding) ** 0.5
        if magnitude > 0:
            embedding = [x / magnitude for x in embedding]
        
        return embedding


class PatternMatcher:
    """Match incidents against known patterns"""
    
    def __init__(self):
        self.patterns = self._load_patterns()
    
    def _load_patterns(self) -> List[Dict[str, Any]]:
        """Load known incident patterns"""
        return [
            {
                "name": "memory_leak",
                "keywords": ["memory", "leak", "oom", "out of memory", "heap"],
                "team": "platform",
                "priority": "high",
                "suggested_fix": "Check for unclosed connections or large object retention"
            },
            {
                "name": "database_connection",
                "keywords": ["connection", "timeout", "database", "postgres", "mysql"],
                "team": "database",
                "priority": "critical",
                "suggested_fix": "Verify connection pool settings and database health"
            },
            {
                "name": "api_latency",
                "keywords": ["slow", "latency", "timeout", "response time"],
                "team": "api",
                "priority": "medium",
                "suggested_fix": "Check rate limiting and downstream service health"
            },
            {
                "name": "authentication",
                "keywords": ["auth", "login", "token", "unauthorized", "403", "401"],
                "team": "security",
                "priority": "high",
                "suggested_fix": "Verify token validity and authentication service"
            },
            {
                "name": "deployment_failure",
                "keywords": ["deploy", "deployment", "rollback", "failed", "build"],
                "team": "devops",
                "priority": "critical",
                "suggested_fix": "Check CI/CD pipeline logs and deployment configuration"
            }
        ]
    
    def match(self, incident: Incident) -> List[Dict[str, Any]]:
        """Match incident against known patterns"""
        text = incident.to_text().lower()
        matches = []
        
        for pattern in self.patterns:
            score = 0
            for keyword in pattern["keywords"]:
                if keyword in text:
                    score += 1
            
            if score > 0:
                matches.append({
                    "pattern": pattern["name"],
                    "score": score / len(pattern["keywords"]),
                    "team": pattern["team"],
                    "priority": pattern["priority"],
                    "suggested_fix": pattern["suggested_fix"]
                })
        
        # Sort by score
        matches.sort(key=lambda x: x["score"], reverse=True)
        return matches


class IncidentIndex:
    """Simple in-memory incident index for similarity search"""
    
    def __init__(self, max_size: int = 10000):
        self.incidents: Dict[str, Tuple[Incident, List[float]]] = {}
        self.max_size = max_size
    
    def add(self, incident: Incident, embedding: List[float]):
        """Add incident to index"""
        if len(self.incidents) >= self.max_size:
            # Remove oldest
            oldest = min(self.incidents.keys())
            del self.incidents[oldest]
        
        self.incidents[incident.id] = (incident, embedding)
    
    def search(
        self,
        embedding: List[float],
        k: int = 5
    ) -> List[Tuple[Incident, float]]:
        """Find similar incidents"""
        results = []
        
        for incident, emb in self.incidents.values():
            similarity = self._cosine_similarity(embedding, emb)
            results.append((incident, similarity))
        
        # Sort by similarity
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:k]
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Compute cosine similarity"""
        dot = sum(x * y for x, y in zip(a, b))
        mag_a = sum(x * x for x in a) ** 0.5
        mag_b = sum(x * x for x in b) ** 0.5
        
        if mag_a == 0 or mag_b == 0:
            return 0.0
        
        return dot / (mag_a * mag_b)


class SemanticTriage:
    """
    Vector-based incident classification and routing
    """
    
    def __init__(self, cache: Optional[SemanticCache] = None):
        self.embedder = IncidentEmbedder()
        self.pattern_matcher = PatternMatcher()
        self.incident_index = IncidentIndex()
        self.cache = cache or SemanticCache()
        
        # Circuit breaker for triage operations
        self.triage_breaker = CircuitBreaker(
            name="semantic_triage",
            failure_threshold=5,
            recovery_timeout=30.0
        )
        
        # Team routing rules
        self.team_routes = {
            "platform": ["infrastructure", "performance", "scaling"],
            "api": ["endpoint", "rest", "graphql", "webhook"],
            "database": ["sql", "query", "migration", "schema"],
            "security": ["auth", "encryption", "vulnerability"],
            "devops": ["deploy", "ci/cd", "pipeline", "build"],
            "frontend": ["ui", "component", "react", "css"]
        }
    
    async def classify_incident(self, incident: Incident) -> TriageResult:
        """
        Classify incident and route to appropriate team
        """
        try:
            return await self.triage_breaker.call(
                self._classify_with_fallback,
                incident
            )
        except Exception as e:
            # Fallback to simple keyword matching
            return self._fallback_classification(incident, str(e))
    
    async def _classify_with_fallback(self, incident: Incident) -> TriageResult:
        """Internal classification with full pipeline"""
        # Check cache first
        cache_key = f"triage:{incident.id}"
        
        async def compute_triage(_):
            return await self._compute_triage(incident)
        
        result, source = await self.cache.get_or_compute(
            cache_key,
            compute_triage,
            ttl=300
        )
        
        return result
    
    async def _compute_triage(self, incident: Incident) -> TriageResult:
        """Compute triage result"""
        # Embed incident
        embedding = self.embedder.embed(incident)
        
        # Find similar historical incidents
        similar = self.incident_index.search(embedding, k=5)
        
        # Match against known patterns
        patterns = self.pattern_matcher.match(incident)
        
        # Determine priority
        priority = self._infer_priority(incident, patterns, similar)
        
        # Route to team
        team = self._route_to_team(incident, patterns, similar)
        
        # Suggest resolution
        suggested_fix = self._suggest_resolution(patterns, similar)
        
        # Calculate confidence
        confidence = self._calculate_confidence(patterns, similar)
        
        # Estimate resolution time
        est_time = self._estimate_resolution_time(priority, similar)
        
        # Build similar incidents list
        similar_list = [
            {
                "id": inc.id,
                "title": inc.title,
                "similarity": round(score, 3),
                "resolution": getattr(inc, 'resolution', 'unknown')
            }
            for inc, score in similar[:3]
        ]
        
        # Build routing reason
        if patterns:
            routing_reason = f"Pattern match: {patterns[0]['pattern']}"
        elif similar:
            routing_reason = f"Similar to resolved incident: {similar[0][0].id}"
        else:
            routing_reason = f"Keyword match: {team} team"
        
        result = TriageResult(
            incident_id=incident.id,
            priority=priority,
            team=team,
            suggested_fix=suggested_fix,
            confidence=confidence,
            similar_incidents=similar_list,
            routing_reason=routing_reason,
            estimated_resolution_time=est_time
        )
        
        # Add to index for future matching
        self.incident_index.add(incident, embedding)
        
        return result
    
    def _fallback_classification(
        self,
        incident: Incident,
        error: str
    ) -> TriageResult:
        """Simple fallback classification"""
        text = incident.to_text().lower()
        
        # Simple keyword matching
        if any(word in text for word in ["crash", "down", "outage", "failure"]):
            priority = "critical"
            team = "platform"
        elif any(word in text for word in ["slow", "timeout", "latency"]):
            priority = "high"
            team = "api"
        elif any(word in text for word in ["error", "exception", "bug"]):
            priority = "medium"
            team = "platform"
        else:
            priority = "low"
            team = "support"
        
        return TriageResult(
            incident_id=incident.id,
            priority=priority,
            team=team,
            suggested_fix=f"Auto-triage failed ({error}). Manual review required.",
            confidence=0.5,
            similar_incidents=[],
            routing_reason="Fallback classification",
            estimated_resolution_time="unknown"
        )
    
    def _infer_priority(
        self,
        incident: Incident,
        patterns: List[Dict],
        similar: List[Tuple[Incident, float]]
    ) -> str:
        """Infer incident priority"""
        # Check for critical indicators
        text = incident.to_text().lower()
        
        critical_keywords = [
            "outage", "down", "crash", "failure", "critical",
            "security", "breach", "leak", "unauthorized"
        ]
        
        for keyword in critical_keywords:
            if keyword in text:
                return "critical"
        
        # Use pattern match if available
        if patterns and patterns[0]["score"] > 0.5:
            return patterns[0]["priority"]
        
        # Use similar incident priority
        if similar:
            # Check resolved similar incidents
            pass
        
        # Default based on source
        if incident.source == "alert":
            return "high"
        elif incident.source == "api":
            return "medium"
        
        return "low"
    
    def _route_to_team(
        self,
        incident: Incident,
        patterns: List[Dict],
        similar: List[Tuple[Incident, float]]
    ) -> str:
        """Route incident to appropriate team"""
        # Use pattern match team
        if patterns and patterns[0]["score"] > 0.5:
            return patterns[0]["team"]
        
        # Use similar incident team
        if similar:
            similar_incident = similar[0][0]
            # In production, lookup team from incident metadata
            pass
        
        # Keyword-based routing
        text = incident.to_text().lower()
        
        for team, keywords in self.team_routes.items():
            for keyword in keywords:
                if keyword in text:
                    return team
        
        return "platform"  # Default team
    
    def _suggest_resolution(
        self,
        patterns: List[Dict],
        similar: List[Tuple[Incident, float]]
    ) -> Optional[str]:
        """Suggest resolution based on patterns and history"""
        # Use pattern suggestion
        if patterns and patterns[0]["score"] > 0.5:
            return patterns[0]["suggested_fix"]
        
        # Use resolution from similar incident
        if similar and similar[0][1] > 0.8:
            similar_incident = similar[0][0]
            # In production, fetch resolution from incident
            pass
        
        return None
    
    def _calculate_confidence(
        self,
        patterns: List[Dict],
        similar: List[Tuple[Incident, float]]
    ) -> float:
        """Calculate confidence in triage decision"""
        confidence = 0.5  # Base confidence
        
        # Boost from pattern match
        if patterns:
            confidence += patterns[0]["score"] * 0.3
        
        # Boost from similar incidents
        if similar:
            confidence += similar[0][1] * 0.2
        
        return min(confidence, 1.0)
    
    def _estimate_resolution_time(
        self,
        priority: str,
        similar: List[Tuple[Incident, float]]
    ) -> str:
        """Estimate time to resolve"""
        time_estimates = {
            "critical": "< 1 hour",
            "high": "< 4 hours",
            "medium": "< 24 hours",
            "low": "< 1 week"
        }
        
        return time_estimates.get(priority, "unknown")


# Example usage
if __name__ == "__main__":
    async def test_semantic_triage():
        """Test semantic triage system"""
        triage = SemanticTriage()
        
        # Create test incidents
        incidents = [
            Incident(
                id="INC-001",
                title="API response timeout",
                description="Users reporting slow response times on checkout endpoint",
                logs="Connection timeout after 30s",
                source="alert"
            ),
            Incident(
                id="INC-002",
                title="Database connection pool exhausted",
                description="Application cannot connect to database",
                stack_trace="SQLException: Too many connections",
                source="api"
            ),
            Incident(
                id="INC-003",
                title="Memory usage increasing",
                description="Server memory growing over time",
                logs="Heap usage at 85%",
                source="alert"
            )
        ]
        
        print("Testing Semantic Triage:")
        print()
        
        for incident in incidents:
            result = await triage.classify_incident(incident)
            
            print(f"Incident: {incident.title}")
            print(f"  Priority: {result.priority}")
            print(f"  Team: {result.team}")
            print(f"  Confidence: {result.confidence:.2f}")
            print(f"  Suggested fix: {result.suggested_fix}")
            print(f"  Routing reason: {result.routing_reason}")
            print()
        
        # Show circuit breaker metrics
        print("Circuit Breaker Status:")
        metrics = triage.triage_breaker.metrics
        print(f"  State: {metrics.state.value}")
        print(f"  Total calls: {metrics.total_calls}")
    
    asyncio.run(test_semantic_triage())
