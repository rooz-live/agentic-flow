"""
Multi-Modal Embeddings for Code, Logs, and Metrics
Unified embeddings combining code AST, log patterns, and metric signatures

Plan: later-phase-support-proxies-migration-019cbe.md
"""

import json
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import re


@dataclass
class CodeFeatures:
    """Extracted code features"""
    ast_nodes: List[str]
    function_names: List[str]
    imports: List[str]
    complexity: int
    lines_of_code: int


@dataclass
class LogFeatures:
    """Extracted log features"""
    patterns: List[str]
    severity_distribution: Dict[str, int]
    error_types: List[str]
    temporal_spikes: List[int]


@dataclass
class MetricFeatures:
    """Extracted metric features"""
    cpu_percentiles: List[float]
    memory_percentiles: List[float]
    latency_p99: float
    throughput_avg: float
    error_rate: float


class CodeASTEncoder:
    """Encode code AST structure"""
    
    def __init__(self, embedding_dim: int = 256):
        self.embedding_dim = embedding_dim
        self.node_weights = {
            "function": 1.0,
            "class": 1.2,
            "import": 0.8,
            "loop": 1.5,
            "conditional": 1.1,
            "exception": 1.3
        }
    
    def encode(self, code: str) -> List[float]:
        """Create AST-based embedding from code"""
        features = self._extract_features(code)
        
        # Build signature
        signature_parts = []
        
        # AST nodes
        for node in features.ast_nodes:
            weight = self.node_weights.get(node, 1.0)
            signature_parts.append(f"{node}:{weight}")
        
        # Function names (hashed)
        for func in features.function_names[:10]:
            signature_parts.append(f"fn:{hash(func) % 1000}")
        
        # Imports
        for imp in features.imports:
            signature_parts.append(f"imp:{imp}")
        
        # Complexity score
        signature_parts.append(f"complexity:{features.complexity}")
        
        text = " ".join(signature_parts)
        return self._text_to_embedding(text, self.embedding_dim)
    
    def _extract_features(self, code: str) -> CodeFeatures:
        """Extract code features using simple regex parsing"""
        # Extract function names
        functions = re.findall(r'def\s+(\w+)', code)
        
        # Extract class names
        classes = re.findall(r'class\s+(\w+)', code)
        
        # Extract imports
        imports = re.findall(r'(?:from|import)\s+([\w.]+)', code)
        
        # Count AST-like nodes
        ast_nodes = []
        if functions:
            ast_nodes.extend(["function"] * len(functions))
        if classes:
            ast_nodes.extend(["class"] * len(classes))
        if re.search(r'for\s+.*:|while\s+.*:', code):
            ast_nodes.append("loop")
        if re.search(r'if\s+.*:|elif\s+.*:', code):
            ast_nodes.append("conditional")
        if re.search(r'try:|except|finally', code):
            ast_nodes.append("exception")
        
        # Calculate complexity (simple: count branches)
        complexity = (
            len(re.findall(r'if\s+', code)) +
            len(re.findall(r'for\s+', code)) +
            len(re.findall(r'while\s+', code)) +
            len(re.findall(r'try:|except', code))
        )
        
        return CodeFeatures(
            ast_nodes=ast_nodes,
            function_names=functions,
            imports=imports,
            complexity=complexity,
            lines_of_code=len(code.split('\n'))
        )
    
    def _text_to_embedding(self, text: str, dim: int) -> List[float]:
        """Convert text to deterministic embedding"""
        hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
        
        embedding = []
        for i in range(dim):
            val = ((hash_val >> (i * 8)) & 0xFF) / 255.0
            embedding.append(val)
        
        # Normalize
        magnitude = sum(x * x for x in embedding) ** 0.5
        if magnitude > 0:
            embedding = [x / magnitude for x in embedding]
        
        return embedding


class LogBERTEncoder:
    """Encode log patterns using BERT-like approach"""
    
    def __init__(self, embedding_dim: int = 128):
        self.embedding_dim = embedding_dim
        self.severity_weights = {
            "ERROR": 1.0,
            "WARN": 0.7,
            "INFO": 0.3,
            "DEBUG": 0.1
        }
    
    def encode(self, logs: List[str]) -> List[float]:
        """Create embedding from log lines"""
        features = self._extract_features(logs)
        
        # Build signature
        signature_parts = []
        
        # Error patterns
        for error in features.error_types[:5]:
            signature_parts.append(f"err:{error}")
        
        # Severity distribution
        for severity, count in features.severity_distribution.items():
            weight = self.severity_weights.get(severity, 0.5)
            signature_parts.append(f"sev:{severity}:{count * weight}")
        
        # Temporal spikes
        for spike in features.temporal_spikes:
            signature_parts.append(f"spike:{spike}")
        
        text = " ".join(signature_parts)
        return self._text_to_embedding(text, self.embedding_dim)
    
    def _extract_features(self, logs: List[str]) -> LogFeatures:
        """Extract log features"""
        patterns = []
        severity_dist = {}
        error_types = []
        
        for log in logs:
            # Detect severity
            for level in ["ERROR", "WARN", "INFO", "DEBUG"]:
                if level in log:
                    severity_dist[level] = severity_dist.get(level, 0) + 1
            
            # Extract error types
            error_match = re.search(r'(?:Error|Exception):?\s*(\w+)', log)
            if error_match:
                error_types.append(error_match.group(1))
            
            # Extract message patterns (simplified)
            msg_match = re.search(r'\]\s*(.+)$', log)
            if msg_match:
                patterns.append(msg_match.group(1)[:50])
        
        # Detect temporal spikes (simplified)
        spikes = []
        if len(logs) > 100:
            spikes.append(len(logs))
        
        return LogFeatures(
            patterns=list(set(patterns))[:10],
            severity_distribution=severity_dist,
            error_types=list(set(error_types)),
            temporal_spikes=spikes
        )
    
    def _text_to_embedding(self, text: str, dim: int) -> List[float]:
        """Convert text to embedding"""
        hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
        
        embedding = []
        for i in range(dim):
            val = ((hash_val >> (i * 6)) & 0x3F) / 63.0
            embedding.append(val)
        
        return embedding


class MetricVAEEncoder:
    """Encode metric distributions using VAE-like approach"""
    
    def __init__(self, embedding_dim: int = 64):
        self.embedding_dim = embedding_dim
    
    def encode(self, metrics: Dict[str, List[float]]) -> List[float]:
        """Create embedding from time-series metrics"""
        features = self._extract_features(metrics)
        
        # Build normalized feature vector
        feature_vector = [
            features.cpu_percentiles[0] / 100.0,  # p50
            features.cpu_percentiles[1] / 100.0,  # p90
            features.cpu_percentiles[2] / 100.0,  # p99
            features.memory_percentiles[0] / 100.0,
            features.memory_percentiles[1] / 100.0,
            features.memory_percentiles[2] / 100.0,
            min(features.latency_p99 / 1000.0, 1.0),  # Normalize to 1s
            min(features.throughput_avg / 10000.0, 1.0),  # Normalize
            features.error_rate
        ]
        
        # Pad or truncate to embedding_dim
        while len(feature_vector) < self.embedding_dim:
            feature_vector.append(0.0)
        
        return feature_vector[:self.embedding_dim]
    
    def _extract_features(self, metrics: Dict[str, List[float]]) -> MetricFeatures:
        """Extract metric features"""
        cpu_values = metrics.get("cpu_percent", [50.0])
        memory_values = metrics.get("memory_percent", [50.0])
        latency_values = metrics.get("latency_ms", [100.0])
        throughput_values = metrics.get("requests_per_sec", [10.0])
        error_values = metrics.get("error_count", [0.0])
        request_values = metrics.get("request_count", [1.0])
        
        # Calculate percentiles
        def percentile(values, p):
            sorted_vals = sorted(values)
            idx = int(len(sorted_vals) * p / 100)
            return sorted_vals[min(idx, len(sorted_vals) - 1)]
        
        cpu_p = [percentile(cpu_values, p) for p in [50, 90, 99]]
        memory_p = [percentile(memory_values, p) for p in [50, 90, 99]]
        
        # Calculate error rate
        total_errors = sum(error_values)
        total_requests = sum(request_values)
        error_rate = total_errors / max(total_requests, 1)
        
        return MetricFeatures(
            cpu_percentiles=cpu_p,
            memory_percentiles=memory_p,
            latency_p99=percentile(latency_values, 99),
            throughput_avg=sum(throughput_values) / max(len(throughput_values), 1),
            error_rate=error_rate
        )


class CrossModalFusion:
    """Fuse embeddings from different modalities"""
    
    def __init__(self, output_dim: int = 384):
        self.output_dim = output_dim
    
    def fuse(
        self,
        code_vec: List[float],
        log_vec: List[float],
        metric_vec: List[float]
    ) -> List[float]:
        """
        Fuse multi-modal embeddings using attention-like weighting
        """
        # Normalize dimensions
        code_dim = len(code_vec)
        log_dim = len(log_vec)
        metric_dim = len(metric_vec)
        
        # Calculate importance weights based on signal strength
        code_weight = sum(abs(x) for x in code_vec) / code_dim
        log_weight = sum(abs(x) for x in log_vec) / log_dim
        metric_weight = sum(abs(x) for x in metric_vec) / metric_dim
        
        # Normalize weights
        total_weight = code_weight + log_weight + metric_weight
        if total_weight > 0:
            code_weight /= total_weight
            log_weight /= total_weight
            metric_weight /= total_weight
        
        # Weighted concatenation
        weighted_code = [x * code_weight for x in code_vec]
        weighted_log = [x * log_weight for x in log_vec]
        weighted_metric = [x * metric_weight for x in metric_vec]
        
        # Combine
        combined = weighted_code + weighted_log + weighted_metric
        
        # Project to output dimension
        return self._project_to_dim(combined, self.output_dim)
    
    def _project_to_dim(self, vector: List[float], dim: int) -> List[float]:
        """Project vector to target dimension"""
        if len(vector) == dim:
            return vector
        
        if len(vector) < dim:
            # Pad with zeros
            return vector + [0.0] * (dim - len(vector))
        
        # Average pool to reduce dimension
        result = []
        step = len(vector) / dim
        for i in range(dim):
            start = int(i * step)
            end = int((i + 1) * step)
            result.append(sum(vector[start:end]) / max(end - start, 1))
        
        return result


class MultiModalEmbedder:
    """
    Unified multi-modal embedder for code, logs, and metrics
    """
    
    def __init__(self, output_dim: int = 384):
        self.code_encoder = CodeASTEncoder(embedding_dim=256)
        self.log_encoder = LogBERTEncoder(embedding_dim=128)
        self.metric_encoder = MetricVAEEncoder(embedding_dim=64)
        self.fusion_layer = CrossModalFusion(output_dim=output_dim)
    
    def embed_incident(
        self,
        code_changes: str,
        logs: List[str],
        metrics: Dict[str, List[float]]
    ) -> List[float]:
        """
        Create unified embedding from incident data
        
        Args:
            code_changes: Code diff or relevant code
            logs: List of log lines
            metrics: Dictionary of metric time series
        
        Returns:
            Fused multi-modal embedding
        """
        # Encode each modality
        code_vec = self.code_encoder.encode(code_changes)
        log_vec = self.log_encoder.encode(logs)
        metric_vec = self.metric_encoder.encode(metrics)
        
        # Cross-modal fusion
        fused = self.fusion_layer.fuse(code_vec, log_vec, metric_vec)
        
        return fused
    
    def embed_deployment(
        self,
        deploy_config: str,
        pre_deploy_metrics: Dict[str, List[float]],
        historical_logs: List[str]
    ) -> List[float]:
        """
        Create embedding for deployment risk assessment
        """
        code_vec = self.code_encoder.encode(deploy_config)
        metric_vec = self.metric_encoder.encode(pre_deploy_metrics)
        log_vec = self.log_encoder.encode(historical_logs)
        
        return self.fusion_layer.fuse(code_vec, log_vec, metric_vec)


if __name__ == "__main__":
    # Test multi-modal embeddings
    embedder = MultiModalEmbedder()
    
    # Sample incident data
    code_sample = """
def process_payment(user_id, amount):
    try:
        user = get_user(user_id)
        if not user:
            raise ValueError("User not found")
        
        charge = stripe.charges.create(
            amount=amount,
            currency="usd",
            customer=user.stripe_id
        )
        
        log_transaction(user_id, amount, charge.id)
        return charge
    
    except stripe.error.CardError as e:
        logger.error(f"Card declined: {e}")
        raise
    except Exception as e:
        logger.error(f"Payment failed: {e}")
        raise
"""
    
    log_sample = [
        "[ERROR] 2026-05-24 10:23:45 Payment failed: User not found",
        "[WARN] 2026-05-24 10:23:46 Retrying transaction...",
        "[ERROR] 2026-05-24 10:23:47 Stripe API timeout",
        "[INFO] 2026-05-24 10:24:00 Transaction rolled back"
    ]
    
    metric_sample = {
        "cpu_percent": [45, 67, 89, 95, 78, 56, 45],
        "memory_percent": [60, 62, 65, 70, 68, 65, 63],
        "latency_ms": [120, 150, 800, 2000, 1500, 300, 150],
        "requests_per_sec": [50, 45, 30, 10, 15, 40, 48],
        "error_count": [0, 0, 2, 5, 3, 1, 0],
        "request_count": [100, 95, 80, 20, 30, 85, 98]
    }
    
    print("Testing Multi-Modal Embeddings:")
    print()
    
    # Test individual encoders
    print("Individual Modality Embeddings:")
    code_vec = embedder.code_encoder.encode(code_sample)
    print(f"  Code embedding: {len(code_vec)} dimensions")
    
    log_vec = embedder.log_encoder.encode(log_sample)
    print(f"  Log embedding: {len(log_vec)} dimensions")
    
    metric_vec = embedder.metric_encoder.encode(metric_sample)
    print(f"  Metric embedding: {len(metric_vec)} dimensions")
    
    print()
    
    # Test fusion
    print("Fused Multi-Modal Embedding:")
    fused = embedder.embed_incident(code_sample, log_sample, metric_sample)
    print(f"  Fused embedding: {len(fused)} dimensions")
    print(f"  First 10 values: {[round(x, 3) for x in fused[:10]]}")
    
    print()
    print("Multi-modal fusion complete!")
