"""
Vector Search Mesh API - FastAPI Server
Headless agent-to-agent pattern retrieval with hierarchical mesh topology

Plan: next-phase-swarm-api-mesh-019cbe.md
"""

import asyncio
import os
import time
import uuid
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Mesh configuration
MESH_ROLE = os.getenv("MESH_ROLE", "worker")  # queen | worker
MESH_NODE_ID = os.getenv("MESH_NODE_ID", f"node-{uuid.uuid4().hex[:8]}")
MESH_DOMAIN = os.getenv("MESH_DOMAIN", "all")  # code | telemetry | docs | all
QUEEN_URL = os.getenv("QUEEN_URL", "http://localhost:8080")

# Request/Response Models
class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query text")
    domains: List[str] = Field(default=["code", "telemetry", "docs"], 
                              description="Domains to search")
    k: int = Field(default=10, ge=1, le=100, description="Number of results")
    threshold: float = Field(default=0.7, ge=0.0, le=1.0, 
                             description="Minimum similarity threshold")
    use_mmr: bool = Field(default=False, description="Use Maximal Marginal Relevance")
    mmr_lambda: float = Field(default=0.5, ge=0.0, le=1.0,
                              description="MMR relevance-diversity tradeoff")
    correlation_id: Optional[str] = Field(default=None, 
                                         description="Request tracing ID")
    filters: Optional[Dict[str, Any]] = Field(default=None,
                                               description="Metadata filters")


class SearchResult(BaseModel):
    id: str
    score: float
    domain: str
    source: str
    tags: List[str] = Field(default=[])
    content_preview: str = Field(default="")
    mmr_score: Optional[float] = Field(default=None)
    relevance_score: Optional[float] = Field(default=None)
    diversity_score: Optional[float] = Field(default=None)


class SearchResponse(BaseModel):
    correlation_id: str
    query: str
    results: List[SearchResult]
    total: int
    latency_ms: float
    mesh_node: str
    mesh_role: str
    domains_searched: List[str]
    strategy: str  # single | cross-domain | hierarchical


class HybridSearchRequest(SearchRequest):
    filters: Dict[str, Any] = Field(default_factory=dict,
                                    description="Metadata filters (domain, tags, timestamp)")


class HealthResponse(BaseModel):
    status: str
    node_id: str
    role: str
    domains: List[str]
    queue_depth: int
    last_search_latency_ms: float
    uptime_seconds: float
    version: str = "2.0.0"


class MeshTopology(BaseModel):
    queens: List[Dict[str, Any]]
    workers: List[Dict[str, Any]]
    routing_table: Dict[str, List[str]]


# Metrics storage
_metrics = {
    "search_count": 0,
    "total_latency_ms": 0,
    "start_time": time.time(),
    "last_latency_ms": 0,
    "queue_depth": 0
}


# Mock search implementations (replace with actual vector search)
async def search_single_domain(query: str, domain: str, k: int, threshold: float) -> List[SearchResult]:
    """Search within a single domain"""
    # Placeholder: In production, call into AgentDB vector index
    await asyncio.sleep(0.05)  # Simulate search latency
    
    # Mock results
    results = []
    for i in range(min(k, 5)):
        results.append(SearchResult(
            id=f"{domain}:result:{i}",
            score=0.95 - (i * 0.05),
            domain=domain,
            source=f"{domain}/sample/file_{i}.ts",
            tags=["pattern", "semantic"],
            content_preview=f"Mock result {i} for query: {query[:50]}..."
        ))
    
    return results


async def search_cross_domain(
    query: str, 
    domains: List[str], 
    k: int, 
    threshold: float,
    use_mmr: bool,
    mmr_lambda: float
) -> List[SearchResult]:
    """Search across multiple domains with aggregation"""
    
    # Parallel search across domains
    tasks = [
        search_single_domain(query, domain, k, threshold)
        for domain in domains
    ]
    
    domain_results = await asyncio.gather(*tasks)
    
    # Flatten results
    all_results = []
    for results in domain_results:
        all_results.extend(results)
    
    # Sort by score
    all_results.sort(key=lambda x: x.score, reverse=True)
    
    # Apply MMR if requested
    if use_mmr and len(all_results) > k:
        all_results = apply_mmr(all_results, k, mmr_lambda)
    
    return all_results[:k]


def apply_mmr(results: List[SearchResult], k: int, lambda_param: float) -> List[SearchResult]:
    """Maximal Marginal Relevance for diversity"""
    selected = []
    remaining = results.copy()
    
    while len(selected) < k and remaining:
        if not selected:
            # First item: highest relevance
            best = max(remaining, key=lambda x: x.score)
        else:
            # MMR scoring
            best_mmr_score = -1
            best = None
            
            for candidate in remaining:
                # Relevance component
                relevance = candidate.score
                
                # Diversity component (max similarity to selected)
                max_sim = 0
                for s in selected:
                    # Simplified: use score difference as proxy for similarity
                    sim = 1.0 - abs(candidate.score - s.score)
                    max_sim = max(max_sim, sim)
                
                # MMR score
                mmr_score = lambda_param * relevance - (1 - lambda_param) * max_sim
                
                if mmr_score > best_mmr_score:
                    best_mmr_score = mmr_score
                    best = candidate
                    candidate.mmr_score = mmr_score
                    candidate.relevance_score = relevance
                    candidate.diversity_score = 1 - max_sim
        
        if best:
            selected.append(best)
            remaining.remove(best)
    
    return selected


# FastAPI App
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print(f"🚀 Starting Vector Search Mesh API")
    print(f"   Node ID: {MESH_NODE_ID}")
    print(f"   Role: {MESH_ROLE}")
    print(f"   Domain: {MESH_DOMAIN}")
    
    if MESH_ROLE == "queen":
        print(f"   Queen node - routing enabled")
    else:
        print(f"   Worker node - serving domain: {MESH_DOMAIN}")
    
    yield
    
    print(f"👋 Shutting down node {MESH_NODE_ID}")


app = FastAPI(
    title="Vector Search Mesh API",
    description="Hierarchical mesh topology for semantic search across code, telemetry, and docs",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/v1/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """
    Cross-domain semantic search with mesh routing.
    
    - Single domain: Routed to domain-specific worker
    - Multi-domain: Aggregated by queen node with optional MMR
    """
    start_time = time.time()
    correlation_id = request.correlation_id or str(uuid.uuid4())
    
    try:
        # Update metrics
        _metrics["queue_depth"] += 1
        
        # Determine strategy
        if len(request.domains) == 1:
            # Single domain search
            if MESH_ROLE == "worker" and request.domains[0] != MESH_DOMAIN:
                # Wrong worker - proxy to correct one
                raise HTTPException(
                    status_code=400,
                    detail=f"Worker serves {MESH_DOMAIN}, not {request.domains[0]}"
                )
            
            results = await search_single_domain(
                request.query,
                request.domains[0],
                request.k,
                request.threshold
            )
            strategy = "single"
        else:
            # Cross-domain search
            if MESH_ROLE == "worker":
                # Workers can't do cross-domain - proxy to queen
                raise HTTPException(
                    status_code=400,
                    detail="Cross-domain search requires queen node"
                )
            
            results = await search_cross_domain(
                request.query,
                request.domains,
                request.k,
                request.threshold,
                request.use_mmr,
                request.mmr_lambda
            )
            strategy = "cross-domain" if not request.use_mmr else "mmr"
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Update metrics
        _metrics["search_count"] += 1
        _metrics["total_latency_ms"] += latency_ms
        _metrics["last_latency_ms"] = latency_ms
        _metrics["queue_depth"] = max(0, _metrics["queue_depth"] - 1)
        
        return SearchResponse(
            correlation_id=correlation_id,
            query=request.query,
            results=results,
            total=len(results),
            latency_ms=round(latency_ms, 2),
            mesh_node=MESH_NODE_ID,
            mesh_role=MESH_ROLE,
            domains_searched=request.domains,
            strategy=strategy
        )
    
    except Exception as e:
        _metrics["queue_depth"] = max(0, _metrics["queue_depth"] - 1)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/search/hybrid", response_model=SearchResponse)
async def hybrid_search(request: HybridSearchRequest):
    """
    Hybrid search: Semantic similarity + metadata filters
    """
    # For now, delegate to regular search
    # In production: apply filters post-search or use filtered index
    return await semantic_search(request)


@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    """
    Mesh health status for load balancers and monitoring
    """
    uptime = time.time() - _metrics["start_time"]
    avg_latency = (_metrics["total_latency_ms"] / max(1, _metrics["search_count"]))
    
    return HealthResponse(
        status="healthy",
        node_id=MESH_NODE_ID,
        role=MESH_ROLE,
        domains=[MESH_DOMAIN] if MESH_DOMAIN != "all" else ["code", "telemetry", "docs"],
        queue_depth=_metrics["queue_depth"],
        last_search_latency_ms=round(avg_latency, 2),
        uptime_seconds=round(uptime, 0)
    )


@app.get("/api/v1/mesh/topology")
async def mesh_topology():
    """
    Return current mesh topology for visualization and coordination
    """
    # Mock topology - in production, discover from service registry
    return {
        "queens": [
            {
                "id": "queen-1",
                "url": "http://mesh.bhopti.com:8080",
                "status": "healthy",
                "workers_connected": 3
            }
        ],
        "workers": [
            {"id": "worker-code-1", "domain": "code", "status": "healthy"},
            {"id": "worker-tel-1", "domain": "telemetry", "status": "healthy"},
            {"id": "worker-docs-1", "domain": "docs", "status": "healthy"}
        ],
        "routing_table": {
            "code": ["worker-code-1"],
            "telemetry": ["worker-tel-1"],
            "docs": ["worker-docs-1"]
        },
        "this_node": {
            "id": MESH_NODE_ID,
            "role": MESH_ROLE,
            "domain": MESH_DOMAIN
        }
    }


@app.get("/api/v1/stats")
async def get_stats():
    """
    Vector database statistics
    """
    return {
        "search_count": _metrics["search_count"],
        "avg_latency_ms": round(_metrics["total_latency_ms"] / max(1, _metrics["search_count"]), 2),
        "last_latency_ms": _metrics["last_latency_ms"],
        "uptime_seconds": round(time.time() - _metrics["start_time"], 0),
        "node_id": MESH_NODE_ID,
        "role": MESH_ROLE
    }


@app.post("/api/v1/index")
async def index_source(path: str, domain: str, background_tasks: BackgroundTasks):
    """
    Index a source file or directory (async)
    """
    # In production: trigger background indexing job
    return {
        "status": "queued",
        "path": path,
        "domain": domain,
        "job_id": str(uuid.uuid4())
    }


# CLI entry point
def main():
    """Run the API server"""
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
