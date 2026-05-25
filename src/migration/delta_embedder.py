"""
Migration Delta Embeddings
Vectorize code changes for migration risk assessment and rollback prediction

Plan: later-phase-support-proxies-migration-019cbe.md
"""

import json
import hashlib
from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass
from datetime import datetime
import re

from src.vector.core.types import SearchResult


@dataclass
class CodeChange:
    """Individual code change in a migration"""
    file_path: str
    change_type: str  # add, modify, delete
    lines_added: int
    lines_deleted: int
    diff_content: str
    ast_nodes_added: Optional[List[str]] = None
    ast_nodes_deleted: Optional[List[str]] = None


@dataclass
class DeltaEmbedding:
    """Vectorized migration delta"""
    migration_id: str
    code_vector: List[float]
    dependency_vector: List[float]
    risk_score: float
    rollback_likelihood: float
    estimated_duration_minutes: int
    affected_services: List[str]
    affected_databases: List[str]
    affected_queues: List[str]
    similar_migrations: List[Dict[str, Any]]
    recommendations: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "migration_id": self.migration_id,
            "risk_score": self.risk_score,
            "rollback_likelihood": self.rollback_likelihood,
            "estimated_duration_minutes": self.estimated_duration_minutes,
            "affected_services": self.affected_services,
            "affected_databases": self.affected_databases,
            "affected_queues": self.affected_queues,
            "similar_migrations": self.similar_migrations,
            "recommendations": self.recommendations
        }


@dataclass
class Migration:
    """Migration with before/after snapshots"""
    id: str
    name: str
    description: str
    timestamp: datetime
    changes: List[CodeChange]
    snapshot_before: Optional[str] = None
    snapshot_after: Optional[str] = None
    dependencies: Optional[List[str]] = None
    services_deployed: Optional[List[str]] = None
    
    def to_text(self) -> str:
        """Convert migration to searchable text"""
        parts = [
            self.name,
            self.description,
            f"Changes: {len(self.changes)} files"
        ]
        
        for change in self.changes[:5]:  # Limit to first 5 changes
            parts.append(f"  {change.file_path}: +{change.lines_added}/-{change.lines_deleted}")
        
        return "\n".join(parts)


class CodeEmbedder:
    """Embed code changes as vectors"""
    
    def __init__(self, embedding_dim: int = 384):
        self.embedding_dim = embedding_dim
    
    def embed_diff(self, change: CodeChange) -> List[float]:
        """Create embedding from code diff"""
        # Combine change metadata
        text = f"{change.file_path} {change.change_type} +{change.lines_added} -{change.lines_deleted}"
        
        # Add AST node signatures
        if change.ast_nodes_added:
            text += " " + " ".join(change.ast_nodes_added)
        if change.ast_nodes_deleted:
            text += " " + " ".join(change.ast_nodes_deleted)
        
        # Create deterministic embedding
        return self._text_to_embedding(text)
    
    def embed_migration(self, migration: Migration) -> List[float]:
        """Create embedding from full migration"""
        parts = [
            migration.name,
            migration.description,
            f"files:{len(migration.changes)}"
        ]
        
        # Add file signatures
        for change in migration.changes:
            parts.append(change.file_path)
        
        text = " ".join(parts)
        return self._text_to_embedding(text)
    
    def _text_to_embedding(self, text: str) -> List[float]:
        """Convert text to deterministic embedding"""
        hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
        
        embedding = []
        for i in range(self.embedding_dim):
            val = ((hash_val >> (i * 8)) & 0xFF) / 255.0
            embedding.append(val)
        
        # Normalize
        magnitude = sum(x * x for x in embedding) ** 0.5
        if magnitude > 0:
            embedding = [x / magnitude for x in embedding]
        
        return embedding


class DependencyGraph:
    """Build and embed service dependency graph"""
    
    def __init__(self):
        self.dependencies: Dict[str, Set[str]] = {}
    
    def add_dependency(self, from_service: str, to_service: str):
        """Add dependency between services"""
        if from_service not in self.dependencies:
            self.dependencies[from_service] = set()
        self.dependencies[from_service].add(to_service)
    
    def embed_dependencies(
        self,
        services: List[str],
        databases: List[str],
        queues: List[str]
    ) -> List[float]:
        """Create dependency graph embedding"""
        # Build dependency signature
        parts = []
        
        # Service dependencies
        for service in services:
            parts.append(f"svc:{service}")
            if service in self.dependencies:
                for dep in self.dependencies[service]:
                    parts.append(f"dep:{service}->{dep}")
        
        # Database connections
        for db in databases:
            parts.append(f"db:{db}")
        
        # Queue connections
        for queue in queues:
            parts.append(f"queue:{queue}")
        
        text = " ".join(parts)
        return self._text_to_embedding(text)
    
    def _text_to_embedding(self, text: str) -> List[float]:
        """Convert text to embedding"""
        hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
        
        embedding_dim = 128
        embedding = []
        for i in range(embedding_dim):
            val = ((hash_val >> (i * 4)) & 0xF) / 15.0
            embedding.append(val)
        
        return embedding
    
    def find_dependent_services(self, service: str) -> Set[str]:
        """Find all services that depend on given service"""
        dependent = set()
        
        for svc, deps in self.dependencies.items():
            if service in deps:
                dependent.add(svc)
                # Recursively find dependents
                dependent.update(self.find_dependent_services(svc))
        
        return dependent


class RiskPredictor:
    """Predict migration risk and rollback likelihood"""
    
    def __init__(self):
        self.risk_patterns = self._load_risk_patterns()
        self.historical_migrations: List[Tuple[Migration, bool]] = []  # (migration, was_rolled_back)
    
    def _load_risk_patterns(self) -> List[Dict[str, Any]]:
        """Load known risk patterns"""
        return [
            {
                "name": "database_schema_change",
                "keywords": ["migration", "schema", "table", "column", "index"],
                "risk_multiplier": 2.0,
                "rollback_likelihood": 0.3
            },
            {
                "name": "api_breaking_change",
                "keywords": ["api", "endpoint", "breaking", "deprecated"],
                "risk_multiplier": 1.8,
                "rollback_likelihood": 0.4
            },
            {
                "name": "configuration_change",
                "keywords": ["config", "env", "setting", "feature flag"],
                "risk_multiplier": 1.2,
                "rollback_likelihood": 0.1
            },
            {
                "name": "critical_path",
                "keywords": ["auth", "payment", "billing", "security"],
                "risk_multiplier": 2.5,
                "rollback_likelihood": 0.5
            },
            {
                "name": "large_deployment",
                "keywords": ["many files", "large", "refactor"],
                "threshold_lines": 1000,
                "risk_multiplier": 1.5,
                "rollback_likelihood": 0.35
            }
        ]
    
    def calculate_risk(
        self,
        migration: Migration,
        patterns: List[Dict[str, Any]],
        similarity_score: float
    ) -> float:
        """Calculate migration risk score (0.0 - 1.0)"""
        base_risk = 0.3  # Base risk
        
        # Factor 1: Change size
        total_lines = sum(c.lines_added + c.lines_deleted for c in migration.changes)
        size_risk = min(total_lines / 1000, 0.3)  # Max 0.3 for size
        
        # Factor 2: Pattern matches
        pattern_risk = 0.0
        text = migration.to_text().lower()
        
        for pattern in patterns:
            match_score = 0
            for keyword in pattern["keywords"]:
                if keyword in text:
                    match_score += 1
            
            if match_score > 0:
                pattern_risk += (match_score / len(pattern["keywords"])) * 0.2
        
        pattern_risk = min(pattern_risk, 0.4)  # Cap at 0.4
        
        # Factor 3: Similarity to failed migrations
        similarity_risk = (1 - similarity_score) * 0.2
        
        # Factor 4: Critical services
        critical_risk = 0.0
        critical_services = {"auth", "billing", "payment", "security"}
        if migration.services_deployed:
            for service in migration.services_deployed:
                if service in critical_services:
                    critical_risk = 0.3
                    break
        
        # Combine risks
        total_risk = base_risk + size_risk + pattern_risk + similarity_risk + critical_risk
        
        return min(total_risk, 1.0)
    
    def predict_rollback(
        self,
        risk_score: float,
        similar_migrations: List[Dict[str, Any]]
    ) -> float:
        """Predict rollback likelihood (0.0 - 1.0)"""
        # Base on risk score
        base_likelihood = risk_score * 0.7
        
        # Adjust based on similar migrations
        if similar_migrations:
            rollback_rate = sum(
                1 for m in similar_migrations
                if m.get("was_rolled_back", False)
            ) / len(similar_migrations)
            
            # Weighted average
            return (base_likelihood * 0.6) + (rollback_rate * 0.4)
        
        return base_likelihood
    
    def estimate_duration(
        self,
        migration: Migration,
        similar_migrations: List[Dict[str, Any]]
    ) -> int:
        """Estimate migration duration in minutes"""
        # Base estimate from change size
        total_lines = sum(c.lines_added + c.lines_deleted for c in migration.changes)
        base_minutes = max(5, total_lines / 50)  # 50 lines per minute
        
        # Adjust based on similar migrations
        if similar_migrations:
            avg_duration = sum(
                m.get("duration_minutes", base_minutes)
                for m in similar_migrations
            ) / len(similar_migrations)
            
            # Weighted average
            return int((base_minutes * 0.4) + (avg_duration * 0.6))
        
        return int(base_minutes)
    
    def generate_recommendations(
        self,
        migration: Migration,
        risk_score: float,
        rollback_likelihood: float
    ) -> List[str]:
        """Generate migration recommendations"""
        recommendations = []
        
        if risk_score > 0.7:
            recommendations.append("HIGH RISK: Consider breaking into smaller migrations")
            recommendations.append("Schedule during low-traffic window")
        
        if rollback_likelihood > 0.4:
            recommendations.append("Prepare rollback script before deployment")
            recommendations.append("Test rollback procedure in staging")
        
        # Check for specific patterns
        text = migration.to_text().lower()
        
        if "database" in text or "schema" in text:
            recommendations.append("Database changes: Backup before migration")
            recommendations.append("Plan for zero-downtime if possible")
        
        if "api" in text and ("breaking" in text or "v2" in text):
            recommendations.append("API changes: Update documentation before deploy")
            recommendations.append("Notify API consumers in advance")
        
        if not recommendations:
            recommendations.append("Standard deployment procedures apply")
        
        return recommendations


class MigrationIndex:
    """Index for storing and searching historical migrations"""
    
    def __init__(self, max_size: int = 1000):
        self.migrations: Dict[str, Tuple[Migration, DeltaEmbedding]] = {}
        self.max_size = max_size
    
    def add(self, migration: Migration, embedding: DeltaEmbedding):
        """Add migration to index"""
        if len(self.migrations) >= self.max_size:
            # Remove oldest (simplified)
            oldest = min(self.migrations.keys())
            del self.migrations[oldest]
        
        self.migrations[migration.id] = (migration, embedding)
    
    def search(
        self,
        code_vector: List[float],
        k: int = 5
    ) -> List[Tuple[Migration, DeltaEmbedding, float]]:
        """Find similar migrations"""
        results = []
        
        for migration, embedding in self.migrations.values():
            similarity = self._cosine_similarity(code_vector, embedding.code_vector)
            results.append((migration, embedding, similarity))
        
        # Sort by similarity
        results.sort(key=lambda x: x[2], reverse=True)
        return results[:k]
    
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Compute cosine similarity"""
        # Pad or truncate to match dimensions
        min_len = min(len(a), len(b))
        a = a[:min_len]
        b = b[:min_len]
        
        dot = sum(x * y for x, y in zip(a, b))
        mag_a = sum(x * x for x in a) ** 0.5
        mag_b = sum(x * x for x in b) ** 0.5
        
        if mag_a == 0 or mag_b == 0:
            return 0.0
        
        return dot / (mag_a * mag_b)


class MigrationDeltaEmbedder:
    """
    Main class for migration delta embedding and risk assessment
    """
    
    def __init__(self):
        self.code_embedder = CodeEmbedder()
        self.dependency_graph = DependencyGraph()
        self.risk_predictor = RiskPredictor()
        self.migration_index = MigrationIndex()
        
        # Load some sample dependencies
        self._load_sample_dependencies()
    
    def _load_sample_dependencies(self):
        """Load sample service dependencies"""
        deps = [
            ("api", "auth"),
            ("api", "billing"),
            ("billing", "database"),
            ("auth", "database"),
            ("webhook", "api"),
            ("analytics", "api"),
            ("analytics", "database")
        ]
        
        for from_svc, to_svc in deps:
            self.dependency_graph.add_dependency(from_svc, to_svc)
    
    async def embed_delta(self, migration: Migration) -> DeltaEmbedding:
        """
        Create delta embedding for migration with risk assessment
        """
        # Embed code changes
        code_vector = self.code_embedder.embed_migration(migration)
        
        # Build dependency vector
        services = migration.services_deployed or []
        databases = self._extract_databases(migration)
        queues = self._extract_queues(migration)
        
        dependency_vector = self.dependency_graph.embed_dependencies(
            services, databases, queues
        )
        
        # Find similar migrations
        similar = self.migration_index.search(code_vector, k=5)
        
        similar_list = [
            {
                "id": m.id,
                "name": m.name,
                "similarity": round(score, 3),
                "was_rolled_back": embedding.rollback_likelihood > 0.5,
                "duration_minutes": embedding.estimated_duration_minutes
            }
            for m, embedding, score in similar
        ]
        
        # Calculate risk
        patterns = self._match_risk_patterns(migration)
        
        # Get best similarity score
        best_similarity = similar[0][2] if similar else 0.0
        
        risk_score = self.risk_predictor.calculate_risk(
            migration, patterns, best_similarity
        )
        
        # Predict rollback
        rollback_likelihood = self.risk_predictor.predict_rollback(
            risk_score, similar_list
        )
        
        # Estimate duration
        duration = self.risk_predictor.estimate_duration(migration, similar_list)
        
        # Generate recommendations
        recommendations = self.risk_predictor.generate_recommendations(
            migration, risk_score, rollback_likelihood
        )
        
        embedding = DeltaEmbedding(
            migration_id=migration.id,
            code_vector=code_vector,
            dependency_vector=dependency_vector,
            risk_score=risk_score,
            rollback_likelihood=rollback_likelihood,
            estimated_duration_minutes=duration,
            affected_services=services,
            affected_databases=databases,
            affected_queues=queues,
            similar_migrations=similar_list,
            recommendations=recommendations
        )
        
        # Add to index for future matching
        self.migration_index.add(migration, embedding)
        
        return embedding
    
    def _extract_databases(self, migration: Migration) -> List[str]:
        """Extract database references from migration"""
        text = migration.to_text().lower()
        databases = []
        
        db_keywords = ["postgres", "mysql", "redis", "mongo", "dynamodb"]
        for keyword in db_keywords:
            if keyword in text:
                databases.append(keyword)
        
        return databases
    
    def _extract_queues(self, migration: Migration) -> List[str]:
        """Extract queue references from migration"""
        text = migration.to_text().lower()
        queues = []
        
        queue_keywords = ["kafka", "rabbitmq", "sqs", "pubsub"]
        for keyword in queue_keywords:
            if keyword in text:
                queues.append(keyword)
        
        return queues
    
    def _match_risk_patterns(self, migration: Migration) -> List[Dict[str, Any]]:
        """Match migration against risk patterns"""
        text = migration.to_text().lower()
        matches = []
        
        for pattern in self.risk_predictor.risk_patterns:
            score = 0
            for keyword in pattern["keywords"]:
                if keyword in text:
                    score += 1
            
            if score > 0:
                matches.append({
                    "pattern": pattern["name"],
                    "score": score / len(pattern["keywords"]),
                    "risk_multiplier": pattern["risk_multiplier"]
                })
        
        return matches


if __name__ == "__main__":
    import asyncio
    
    async def test_migration_embedder():
        """Test migration delta embedder"""
        embedder = MigrationDeltaEmbedder()
        
        # Create test migrations
        migrations = [
            Migration(
                id="MIG-001",
                name="Add user authentication",
                description="Implement OAuth2 login flow with JWT tokens",
                timestamp=datetime.now(),
                changes=[
                    CodeChange("auth/login.py", "add", 150, 0, "new OAuth flow"),
                    CodeChange("auth/middleware.py", "modify", 50, 20, "JWT validation")
                ],
                services_deployed=["auth", "api"]
            ),
            Migration(
                id="MIG-002",
                name="Database schema migration",
                description="Add orders table with indexes",
                timestamp=datetime.now(),
                changes=[
                    CodeChange("migrations/001_add_orders.sql", "add", 100, 0, "CREATE TABLE orders"),
                    CodeChange("models/order.py", "add", 80, 0, "Order model")
                ],
                services_deployed=["api", "billing"]
            ),
            Migration(
                id="MIG-003",
                name="API v2 breaking changes",
                description="Update API responses to new format",
                timestamp=datetime.now(),
                changes=[
                    CodeChange("api/v2/handlers.py", "modify", 200, 150, "Response format changes")
                ],
                services_deployed=["api"]
            )
        ]
        
        print("Testing Migration Delta Embedder:")
        print()
        
        for migration in migrations:
            embedding = await embedder.embed_delta(migration)
            
            print(f"Migration: {migration.name}")
            print(f"  Risk Score: {embedding.risk_score:.2f}")
            print(f"  Rollback Likelihood: {embedding.rollback_likelihood:.2f}")
            print(f"  Est. Duration: {embedding.estimated_duration_minutes} min")
            print(f"  Affected Services: {', '.join(embedding.affected_services)}")
            print(f"  Recommendations:")
            for rec in embedding.recommendations[:3]:
                print(f"    - {rec}")
            print()
    
    asyncio.run(test_migration_embedder())
