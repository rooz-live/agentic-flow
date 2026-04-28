import json
from dataclasses import dataclass
from typing import Dict, List, Any

@dataclass
class InfraEmbedding:
    systemic_state: str
    drift_score: float
    healing_targets: List[str]
    vector_signature: str

def generate_infra_embedding_bead(mcp_manifest: Dict) -> InfraEmbedding:
    """
    ATOMIC BEAD: Infrastructure State Embedder
    Clean room tested. Ingests raw MCP manifest data and calculates
    an agentic embedding score (drift) without executing any side effects.
    """
    factors = mcp_manifest.get("factors", {})
    
    total_drift_mins = 0.0
    healing_targets = []
    
    for orchestrator, data in factors.items():
        age = data.get("temporal_age_minutes", 9999)
        total_drift_mins += age
        
        # If older than 24 hours (1440 mins) or RED, it needs healing
        if age > 1440 or data.get("status") == "RED":
            healing_targets.append(orchestrator)
            
    # Calculate a normalized drift score (0.0 to 1.0) based on a 7-day max tolerance
    max_tolerance = 10080.0 * max(1, len(factors)) # 7 days per orchestrator
    drift_score = min(total_drift_mins / max_tolerance, 1.0)
    
    # Determine systemic state
    if len(healing_targets) > 0 or mcp_manifest.get("systemic_state") == "RED":
        systemic_state = "COMPROMISED"
    else:
        systemic_state = "SOVEREIGN"
        
    return InfraEmbedding(
        systemic_state=systemic_state,
        drift_score=drift_score,
        healing_targets=healing_targets,
        vector_signature=f"INFRA_VECTOR_[{systemic_state}]_[{drift_score:.2f}]"
    )
