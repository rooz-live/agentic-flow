"""
Drift Detection System
Detects semantic, behavioral, and temporal drift in agent systems.
Integrates with risk database for tracking and response orchestration.
"""

import os
import sqlite3
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import numpy as np
from pathlib import Path

# Optional dependencies with graceful degradation
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


class DriftDetector:
    """
    Detects drift using embedding comparison and statistical methods.
    
    Drift Types:
    - Semantic: Changes in meaning/context (ConceptNet integration)
    - Behavioral: Changes in action patterns
    - Temporal: Time-series anomalies
    - Cognitive: Decision-making drift (SNN integration)
    - Performance: Degradation in metrics
    """
    
    def __init__(
        self,
        baseline_embeddings: Optional[np.ndarray] = None,
        threshold: float = 0.15,
        risk_db_path: Optional[str] = None
    ):
        """
        Initialize drift detector.
        
        Args:
            baseline_embeddings: Reference embeddings for comparison
            threshold: Drift magnitude threshold (0-1)
            risk_db_path: Path to risk database (defaults to RISK_DB_PATH env)
        """
        self.baseline = baseline_embeddings
        self.threshold = float(os.getenv('DRIFT_THRESHOLD', str(threshold)))
        self.risk_db_path = risk_db_path or os.getenv(
            'RISK_DB_PATH',
            str(Path(__file__).parent.parent.parent / 'risks.db')
        )
        
        # Initialize embedding model if available
        self.embedding_model = None
        if TRANSFORMERS_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                print(f"Warning: Failed to load embedding model: {e}")
        
        # Initialize ChromaDB if available
        self.chroma_client = None
        if CHROMADB_AVAILABLE:
            try:
                self.chroma_client = chromadb.Client(Settings(
                    persist_directory=str(Path(__file__).parent.parent.parent / '.chromadb')
                ))
            except Exception as e:
                print(f"Warning: Failed to initialize ChromaDB: {e}")
    
    def detect_semantic_drift(
        self,
        current_embeddings: np.ndarray,
        source_component: str = 'unknown'
    ) -> Dict:
        """
        Detect semantic drift using cosine similarity.
        
        Args:
            current_embeddings: Current state embeddings
            source_component: Component being monitored
        
        Returns:
            Dict with drift_detected, magnitude, confidence, timestamp
        """
        if self.baseline is None:
            raise ValueError("Baseline embeddings not set. Call set_baseline() first.")
        
        # Ensure embeddings are normalized
        baseline_norm = self.baseline / (np.linalg.norm(self.baseline, axis=1, keepdims=True) + 1e-10)
        current_norm = current_embeddings / (np.linalg.norm(current_embeddings, axis=1, keepdims=True) + 1e-10)
        
        # Compute cosine similarity
        similarity_matrix = np.dot(baseline_norm, current_norm.T)
        mean_similarity = similarity_matrix.mean()
        
        # Drift magnitude is inverse of similarity
        drift_magnitude = 1.0 - mean_similarity
        
        # Confidence based on consistency of drift across embeddings
        std_similarity = similarity_matrix.std()
        confidence = 1.0 - min(std_similarity * 2, 1.0)  # Lower std = higher confidence
        
        drift_detected = drift_magnitude > self.threshold
        
        result = {
            'drift_detected': bool(drift_detected),
            'magnitude': float(drift_magnitude),
            'confidence': float(confidence),
            'timestamp': datetime.utcnow().isoformat(),
            'source_component': source_component,
            'event_type': 'semantic'
        }
        
        # Log to risk database if drift detected
        if drift_detected:
            self._log_drift_event(result)
        
        return result
    
    def detect_behavioral_drift(
        self,
        action_sequence: List[str],
        baseline_actions: List[str],
        source_component: str = 'unknown'
    ) -> Dict:
        """
        Detect behavioral drift using sequence comparison.
        
        Args:
            action_sequence: Current action sequence
            baseline_actions: Expected action sequence
            source_component: Component being monitored
        
        Returns:
            Dict with drift_detected, magnitude, confidence, timestamp
        """
        # Compute Levenshtein distance ratio
        from difflib import SequenceMatcher
        
        matcher = SequenceMatcher(None, baseline_actions, action_sequence)
        similarity = matcher.ratio()
        drift_magnitude = 1.0 - similarity
        
        # Confidence based on sequence length
        confidence = min(len(action_sequence) / 10.0, 1.0)
        
        drift_detected = drift_magnitude > self.threshold
        
        result = {
            'drift_detected': bool(drift_detected),
            'magnitude': float(drift_magnitude),
            'confidence': float(confidence),
            'timestamp': datetime.utcnow().isoformat(),
            'source_component': source_component,
            'event_type': 'behavioral',
            'metadata': {
                'sequence_length': len(action_sequence),
                'baseline_length': len(baseline_actions)
            }
        }
        
        if drift_detected:
            self._log_drift_event(result)
        
        return result
    
    def detect_temporal_drift(
        self,
        time_series: np.ndarray,
        window_size: int = 10,
        source_component: str = 'unknown'
    ) -> Dict:
        """
        Detect temporal drift using moving average and standard deviation.
        
        Args:
            time_series: Time-series data
            window_size: Window for moving average
            source_component: Component being monitored
        
        Returns:
            Dict with drift_detected, magnitude, confidence, timestamp
        """
        if len(time_series) < window_size:
            return {
                'drift_detected': False,
                'magnitude': 0.0,
                'confidence': 0.0,
                'timestamp': datetime.utcnow().isoformat(),
                'source_component': source_component,
                'event_type': 'temporal',
                'metadata': {'error': 'Insufficient data'}
            }
        
        # Compute moving average
        moving_avg = np.convolve(time_series, np.ones(window_size) / window_size, mode='valid')
        
        # Compute deviation from moving average
        recent_values = time_series[-window_size:]
        recent_mean = recent_values.mean()
        overall_mean = moving_avg.mean()
        
        drift_magnitude = abs(recent_mean - overall_mean) / (overall_mean + 1e-10)
        drift_magnitude = min(drift_magnitude, 1.0)
        
        # Confidence based on standard deviation stability
        recent_std = recent_values.std()
        overall_std = time_series.std()
        confidence = 1.0 - min(abs(recent_std - overall_std) / (overall_std + 1e-10), 1.0)
        
        drift_detected = drift_magnitude > self.threshold
        
        result = {
            'drift_detected': bool(drift_detected),
            'magnitude': float(drift_magnitude),
            'confidence': float(confidence),
            'timestamp': datetime.utcnow().isoformat(),
            'source_component': source_component,
            'event_type': 'temporal',
            'metadata': {
                'recent_mean': float(recent_mean),
                'overall_mean': float(overall_mean),
                'window_size': window_size
            }
        }
        
        if drift_detected:
            self._log_drift_event(result)
        
        return result
    
    def set_baseline(self, embeddings: np.ndarray):
        """Set new baseline embeddings."""
        self.baseline = embeddings
    
    def embed_text(self, text: str) -> np.ndarray:
        """
        Generate embeddings for text using sentence transformer.
        
        Args:
            text: Input text
        
        Returns:
            Embedding vector
        """
        if not TRANSFORMERS_AVAILABLE or self.embedding_model is None:
            raise RuntimeError("Sentence transformers not available. Install with: pip install sentence-transformers")
        
        return self.embedding_model.encode([text])[0]
    
    def _log_drift_event(self, result: Dict):
        """Log drift event to risk database."""
        if not os.path.exists(self.risk_db_path):
            print(f"Warning: Risk database not found at {self.risk_db_path}")
            return
        
        try:
            conn = sqlite3.connect(self.risk_db_path)
            cursor = conn.cursor()
            
            event_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO drift_events (
                    id, event_type, drift_magnitude, confidence_score,
                    detected_at, source_component, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id,
                result['event_type'],
                result['magnitude'],
                result['confidence'],
                result['timestamp'],
                result['source_component'],
                str(result.get('metadata', {}))
            ))
            
            # Create corresponding risk entry if magnitude is high
            if result['magnitude'] > 0.5:
                risk_id = str(uuid.uuid4())
                severity = 'critical' if result['magnitude'] > 0.8 else 'high'
                
                # Calculate WSJF components
                business_value = 8 if result['magnitude'] > 0.7 else 6
                time_criticality = 9 if result['magnitude'] > 0.8 else 7
                risk_reduction = 8
                job_size = 4
                
                cursor.execute("""
                    INSERT INTO risks (
                        id, category, severity, detection_method,
                        business_value, time_criticality, risk_reduction, job_size,
                        source_component, metadata
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    risk_id,
                    'owned',
                    severity,
                    'drift_detector',
                    business_value,
                    time_criticality,
                    risk_reduction,
                    job_size,
                    result['source_component'],
                    str(result)
                ))
                
                # Link drift event to risk
                cursor.execute("""
                    UPDATE drift_events SET risk_id = ? WHERE id = ?
                """, (risk_id, event_id))
            
            conn.commit()
            conn.close()
        
        except Exception as e:
            print(f"Warning: Failed to log drift event to database: {e}")
    
    def _calculate_confidence(self, drift_magnitude: float) -> float:
        """
        Calculate confidence score based on drift magnitude.
        Higher drift = higher confidence in detection.
        """
        # Sigmoid function for smooth confidence curve
        confidence = 1 / (1 + np.exp(-10 * (drift_magnitude - self.threshold)))
        return float(confidence)


class DriftMonitor:
    """Continuous drift monitoring with periodic checks."""
    
    def __init__(self, detector: DriftDetector, check_interval_ms: int = 300000):
        """
        Initialize drift monitor.
        
        Args:
            detector: DriftDetector instance
            check_interval_ms: Check interval in milliseconds (default 5 minutes)
        """
        self.detector = detector
        self.check_interval_ms = check_interval_ms
        self.is_running = False
    
    async def start(self):
        """Start continuous monitoring (async)."""
        import asyncio
        
        self.is_running = True
        while self.is_running:
            # Monitoring logic would go here
            # This is a placeholder for the monitoring loop
            await asyncio.sleep(self.check_interval_ms / 1000.0)
    
    def stop(self):
        """Stop continuous monitoring."""
        self.is_running = False


def create_baseline_from_corpus(texts: List[str]) -> np.ndarray:
    """
    Create baseline embeddings from a corpus of texts.
    
    Args:
        texts: List of reference texts
    
    Returns:
        Baseline embedding matrix
    """
    if not TRANSFORMERS_AVAILABLE:
        raise RuntimeError("Sentence transformers not available. Install with: pip install sentence-transformers")
    
    model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = model.encode(texts)
    return np.array(embeddings)
