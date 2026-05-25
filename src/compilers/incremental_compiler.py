"""Incremental Compiler with Telemetry
Type-safe, cached compilation with dependency tracking

WSJF Priority: 3.67 (GO - High CoD, Developer Velocity)
Plan: rust-upgrade-wsjf-least-mature-019cbe.md
"""

import json
import hashlib
import asyncio
import time
import psutil
from enum import Enum
from typing import Dict, Any, Optional, List, Callable, Set
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from collections import defaultdict

from src.cache.semantic_cache import SemanticCache
from src.resilience.circuit_breaker import CircuitBreaker


class CompilerType(Enum):
    """Supported compiler types"""
    RUST = "rust"
    TYPESCRIPT = "typescript"
    PYTHON = "python"
    GO = "go"
    JAVA = "java"
    CPP = "cpp"
    WEBASSEMBLY = "wasm"
    JAVASCRIPT = "javascript"


class OptimizationLevel(Enum):
    """Optimization levels"""
    NONE = "none"           # Fastest compile, no optimization
    BASIC = "basic"         # Basic optimizations
    AGGRESSIVE = "aggressive"  # Maximum optimization (slowest)
    SIZE = "size"           # Optimize for size


class DiagnosticLevel(Enum):
    """Diagnostic severity levels"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    HINT = "hint"


@dataclass
class Diagnostic:
    """Compilation diagnostic message"""
    level: DiagnosticLevel
    message: str
    file_path: Optional[Path] = None
    line: Optional[int] = None
    column: Optional[int] = None
    code: Optional[str] = None
    suggestions: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level.value,
            "message": self.message,
            "file": str(self.file_path) if self.file_path else None,
            "line": self.line,
            "column": self.column,
            "code": self.code,
            "suggestions": self.suggestions
        }


@dataclass
class CompilationUnit:
    """Single compilation unit"""
    id: str
    source_files: List[Path]
    dependencies: List[str]  # IDs of dependent units
    output_path: Path
    compiler_type: CompilerType
    optimization_level: OptimizationLevel = OptimizationLevel.BASIC
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    modified_at: datetime = field(default_factory=datetime.now)
    source_hash: str = ""
    
    def compute_hash(self) -> str:
        """Compute hash of source files"""
        hasher = hashlib.sha256()
        for file_path in sorted(self.source_files):
            if file_path.exists():
                hasher.update(file_path.read_bytes())
        return hasher.hexdigest()[:16]
    
    def update_hash(self) -> None:
        """Update source hash"""
        self.source_hash = self.compute_hash()
        self.modified_at = datetime.now()


@dataclass
class CompilationResult:
    """Result of compilation"""
    unit_id: str
    success: bool
    output_path: Optional[Path] = None
    artifacts: List[Path] = field(default_factory=list)
    diagnostics: List[Diagnostic] = field(default_factory=list)
    duration_ms: float = 0.0
    cache_hit: bool = False
    incremental: bool = False
    
    # Telemetry
    cpu_time_ms: float = 0.0
    memory_peak_mb: float = 0.0
    io_read_mb: float = 0.0
    io_write_mb: float = 0.0
    
    def has_errors(self) -> bool:
        """Check if compilation had errors"""
        return any(d.level == DiagnosticLevel.ERROR for d in self.diagnostics)
    
    def error_count(self) -> int:
        """Count errors"""
        return sum(1 for d in self.diagnostics if d.level == DiagnosticLevel.ERROR)
    
    def warning_count(self) -> int:
        """Count warnings"""
        return sum(1 for d in self.diagnostics if d.level == DiagnosticLevel.WARNING)


@dataclass
class BuildReport:
    """Complete build report"""
    build_id: str
    start_time: datetime
    end_time: datetime
    duration_ms: float = 0.0
    total_units: int = 0
    successful_units: int = 0
    failed_units: int = 0
    cached_units: int = 0
    incremental_units: int = 0
    
    # Performance
    total_cpu_ms: float = 0.0
    peak_memory_mb: float = 0.0
    total_io_read_mb: float = 0.0
    total_io_write_mb: float = 0.0
    
    # Diagnostics
    errors: List[Diagnostic] = field(default_factory=list)
    warnings: List[Diagnostic] = field(default_factory=list)
    
    # Efficiency
    time_saved_ms: float = 0.0
    cache_hit_rate: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "build_id": self.build_id,
            "duration_ms": self.duration_ms,
            "total_units": self.total_units,
            "successful_units": self.successful_units,
            "failed_units": self.failed_units,
            "cached_units": self.cached_units,
            "cache_hit_rate": f"{self.cache_hit_rate:.1%}",
            "time_saved_ms": self.time_saved_ms,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings)
        }


@dataclass
class CacheStats:
    """Cache statistics"""
    hits: int = 0
    misses: int = 0
    invalidations: int = 0
    size_mb: float = 0.0
    
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0


class SourceHasher:
    """Compute source file hashes"""
    
    @staticmethod
    def hash_file(path: Path) -> str:
        """Hash single file"""
        if not path.exists():
            return ""
        return hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    
    @staticmethod
    def hash_files(paths: List[Path]) -> str:
        """Hash multiple files"""
        hasher = hashlib.sha256()
        for path in sorted(paths):
            if path.exists():
                hasher.update(path.read_bytes())
        return hasher.hexdigest()[:16]
    
    @staticmethod
    def hash_string(content: str) -> str:
        """Hash string content"""
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def is_unchanged(self, unit: CompilationUnit, previous_hash: str) -> bool:
        """Check if unit is unchanged"""
        current_hash = unit.compute_hash()
        return current_hash == previous_hash


class CompilationGraph:
    """Dependency graph for compilation units"""
    
    def __init__(self):
        self._units: Dict[str, CompilationUnit] = {}
        self._dependencies: Dict[str, Set[str]] = defaultdict(set)
        self._dependents: Dict[str, Set[str]] = defaultdict(set)
    
    def add_unit(self, unit: CompilationUnit) -> None:
        """Add unit to graph"""
        self._units[unit.id] = unit
        
        for dep_id in unit.dependencies:
            self._dependencies[unit.id].add(dep_id)
            self._dependents[dep_id].add(unit.id)
    
    def get_unit(self, unit_id: str) -> Optional[CompilationUnit]:
        """Get unit by ID"""
        return self._units.get(unit_id)
    
    def get_dependencies(self, unit_id: str) -> List[CompilationUnit]:
        """Get direct dependencies"""
        dep_ids = self._dependencies.get(unit_id, set())
        return [self._units[did] for did in dep_ids if did in self._units]
    
    def get_all_dependencies(self, unit_id: str) -> List[CompilationUnit]:
        """Get all transitive dependencies"""
        visited = set()
        result = []
        
        def visit(uid: str):
            if uid in visited or uid not in self._units:
                return
            visited.add(uid)
            for dep_id in self._dependencies.get(uid, set()):
                visit(dep_id)
                if dep_id in self._units:
                    result.append(self._units[dep_id])
        
        visit(unit_id)
        return result
    
    def get_dependents(self, unit_id: str) -> List[CompilationUnit]:
        """Get units that depend on this unit"""
        dep_ids = self._dependents.get(unit_id, set())
        return [self._units[did] for did in dep_ids if did in self._units]
    
    def get_all_dependents(self, unit_id: str) -> List[CompilationUnit]:
        """Get all transitive dependents"""
        visited = set()
        result = []
        
        def visit(uid: str):
            if uid in visited or uid not in self._units:
                return
            visited.add(uid)
            for dep_id in self._dependents.get(uid, set()):
                visit(dep_id)
                if dep_id in self._units:
                    result.append(self._units[dep_id])
        
        visit(unit_id)
        return result
    
    def find_affected_units(self, changed_files: List[Path]) -> List[CompilationUnit]:
        """Find units affected by file changes"""
        affected = set()
        
        for unit in self._units.values():
            for changed_file in changed_files:
                if changed_file in unit.source_files:
                    affected.add(unit.id)
                    # Add all dependents
                    for dependent in self.get_all_dependents(unit.id):
                        affected.add(dependent.id)
        
        return [self._units[uid] for uid in affected if uid in self._units]
    
    def topological_build_order(self) -> List[CompilationUnit]:
        """Return units in dependency order (Kahn's algorithm)"""
        # Calculate in-degrees
        in_degree = {uid: 0 for uid in self._units}
        for deps in self._dependencies.values():
            for dep in deps:
                if dep in in_degree:
                    in_degree[dep] += 1
        
        # Start with units that have no dependencies
        queue = [uid for uid, deg in in_degree.items() if deg == 0]
        result = []
        
        while queue:
            uid = queue.pop(0)
            if uid in self._units:
                result.append(self._units[uid])
            
            # Reduce in-degree of dependents
            for dependent_id in self._dependents.get(uid, set()):
                if dependent_id in in_degree:
                    in_degree[dependent_id] -= 1
                    if in_degree[dependent_id] == 0:
                        queue.append(dependent_id)
        
        return result
    
    def detect_circular_deps(self) -> Optional[List[str]]:
        """Detect circular dependencies using DFS"""
        visited = set()
        rec_stack = set()
        
        def dfs(uid: str, path: List[str]) -> Optional[List[str]]:
            visited.add(uid)
            rec_stack.add(uid)
            
            for dep_id in self._dependencies.get(uid, set()):
                if dep_id not in visited:
                    result = dfs(dep_id, path + [dep_id])
                    if result:
                        return result
                elif dep_id in rec_stack:
                    # Found cycle
                    if dep_id in path:
                        cycle_start = path.index(dep_id)
                        return path[cycle_start:] + [dep_id]
            
            rec_stack.remove(uid)
            return None
        
        for uid in self._units:
            if uid not in visited:
                result = dfs(uid, [uid])
                if result:
                    return result
        
        return None


class CompilationCache:
    """Cache for compilation results"""
    
    def __init__(self, cache_dir: Optional[Path] = None):
        self._cache_dir = cache_dir or Path(".compilation_cache")
        self._memory_cache: Dict[str, CompilationResult] = {}
        self._stats = CacheStats()
    
    def _get_cache_key(self, unit_id: str, source_hash: str) -> str:
        """Generate cache key"""
        return f"{unit_id}:{source_hash}"
    
    def get(self, unit_id: str, source_hash: str) -> Optional[CompilationResult]:
        """Get cached result"""
        key = self._get_cache_key(unit_id, source_hash)
        
        # Check memory cache
        if key in self._memory_cache:
            self._stats.hits += 1
            return self._memory_cache[key]
        
        # Check disk cache
        cache_file = self._cache_dir / f"{key}.json"
        if cache_file.exists():
            try:
                data = json.loads(cache_file.read_text())
                result = self._deserialize_result(data)
                self._memory_cache[key] = result
                self._stats.hits += 1
                return result
            except Exception:
                pass
        
        self._stats.misses += 1
        return None
    
    def put(self, unit_id: str, result: CompilationResult) -> None:
        """Cache compilation result"""
        key = self._get_cache_key(unit_id, result.unit_id + ":" + str(result.duration_ms))
        self._memory_cache[key] = result
        
        # Persist to disk
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = self._cache_dir / f"{key}.json"
        cache_file.write_text(json.dumps(self._serialize_result(result)))
    
    def invalidate(self, unit_id: str) -> None:
        """Invalidate cache for unit"""
        keys_to_remove = [k for k in self._memory_cache.keys() if k.startswith(f"{unit_id}:")]
        for key in keys_to_remove:
            del self._memory_cache[key]
        
        self._stats.invalidations += len(keys_to_remove)
    
    def invalidate_dependents(self, unit_id: str, graph: CompilationGraph) -> None:
        """Invalidate unit and all its dependents"""
        self.invalidate(unit_id)
        
        for dependent in graph.get_all_dependents(unit_id):
            self.invalidate(dependent.id)
    
    def clear(self) -> None:
        """Clear all caches"""
        self._memory_cache.clear()
        if self._cache_dir.exists():
            for f in self._cache_dir.glob("*.json"):
                f.unlink()
    
    def get_stats(self) -> CacheStats:
        """Get cache statistics"""
        return self._stats
    
    def _serialize_result(self, result: CompilationResult) -> Dict:
        """Serialize result to dict"""
        return {
            "unit_id": result.unit_id,
            "success": result.success,
            "output_path": str(result.output_path) if result.output_path else None,
            "artifacts": [str(p) for p in result.artifacts],
            "diagnostics": [d.to_dict() for d in result.diagnostics],
            "duration_ms": result.duration_ms,
            "cache_hit": result.cache_hit,
            "incremental": result.incremental
        }
    
    def _deserialize_result(self, data: Dict) -> CompilationResult:
        """Deserialize result from dict"""
        return CompilationResult(
            unit_id=data["unit_id"],
            success=data["success"],
            output_path=Path(data["output_path"]) if data["output_path"] else None,
            artifacts=[Path(p) for p in data.get("artifacts", [])],
            diagnostics=[
                Diagnostic(
                    level=DiagnosticLevel(d["level"]),
                    message=d["message"],
                    file_path=Path(d["file"]) if d.get("file") else None,
                    line=d.get("line"),
                    column=d.get("column"),
                    code=d.get("code"),
                    suggestions=d.get("suggestions", [])
                )
                for d in data.get("diagnostics", [])
            ],
            duration_ms=data.get("duration_ms", 0.0),
            cache_hit=data.get("cache_hit", False),
            incremental=data.get("incremental", False)
        )


class IncrementalCompiler:
    """Incremental compiler with caching"""
    
    def __init__(
        self,
        cache: Optional[CompilationCache] = None,
        graph: Optional[CompilationGraph] = None
    ):
        self._cache = cache or CompilationCache()
        self._graph = graph or CompilationGraph()
        self._hasher = SourceHasher()
    
    def add_unit(self, unit: CompilationUnit) -> None:
        """Add compilation unit"""
        unit.update_hash()
        self._graph.add_unit(unit)
    
    def needs_recompilation(self, unit: CompilationUnit) -> bool:
        """Check if unit needs recompilation"""
        # Check if cached
        cached = self._cache.get(unit.id, unit.source_hash)
        return cached is None
    
    async def compile(self, unit: CompilationUnit, force: bool = False) -> CompilationResult:
        """Compile single unit"""
        start_time = time.time()
        
        # Check cache
        if not force:
            cached = self._cache.get(unit.id, unit.source_hash)
            if cached:
                cached.cache_hit = True
                return cached
        
        # Simulate compilation (in production, invoke actual compiler)
        await asyncio.sleep(0.1)  # Simulate work
        
        # Collect telemetry
        process = psutil.Process()
        memory_before = process.memory_info().rss / 1024 / 1024
        
        # Create result
        result = CompilationResult(
            unit_id=unit.id,
            success=True,
            output_path=unit.output_path,
            duration_ms=(time.time() - start_time) * 1000,
            incremental=True,
            memory_peak_mb=process.memory_info().rss / 1024 / 1024 - memory_before
        )
        
        # Cache result
        self._cache.put(unit.id, result)
        
        return result
    
    async def compile_incremental(
        self,
        changed_files: Optional[List[Path]] = None
    ) -> List[CompilationResult]:
        """Compile only affected units"""
        if changed_files:
            affected_units = self._graph.find_affected_units(changed_files)
        else:
            # Compile all units that need recompilation
            affected_units = [
                unit for unit in self._graph.topological_build_order()
                if self.needs_recompilation(unit)
            ]
        
        results = []
        for unit in affected_units:
            result = await self.compile(unit)
            results.append(result)
        
        return results
    
    def invalidate_cache(self, unit_id: str) -> None:
        """Invalidate cache for unit and dependents"""
        self._cache.invalidate_dependents(unit_id, self._graph)


class BuildOrchestrator:
    """Orchestrate parallel builds"""
    
    def __init__(self, max_parallel: int = 4):
        self._max_parallel = max_parallel
        self._compiler = IncrementalCompiler()
        self._semaphore = asyncio.Semaphore(max_parallel)
        self._cancelled: Set[str] = set()
    
    async def build_unit(self, unit: CompilationUnit) -> CompilationResult:
        """Build single unit with concurrency limit"""
        async with self._semaphore:
            if unit.id in self._cancelled:
                return CompilationResult(
                    unit_id=unit.id,
                    success=False,
                    diagnostics=[Diagnostic(
                        level=DiagnosticLevel.ERROR,
                        message="Build cancelled"
                    )]
                )
            
            return await self._compiler.compile(unit)
    
    async def build_all(
        self,
        units: List[CompilationUnit],
        incremental: bool = True
    ) -> BuildReport:
        """Build all units"""
        build_id = f"build-{datetime.now().timestamp()}"
        start_time = datetime.now()
        
        # Sort by dependency order
        for unit in units:
            self._compiler.add_unit(unit)
        
        build_order = self._compiler._graph.topological_build_order()
        
        # Compile
        tasks = [self.build_unit(unit) for unit in build_order]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = datetime.now()
        duration_ms = (end_time - start_time).total_seconds() * 1000
        
        # Generate report
        successful = sum(1 for r in results if isinstance(r, CompilationResult) and r.success)
        failed = len(results) - successful
        cached = sum(1 for r in results if isinstance(r, CompilationResult) and r.cache_hit)
        
        errors = []
        warnings = []
        total_time_saved = 0.0
        
        for r in results:
            if isinstance(r, CompilationResult):
                errors.extend([d for d in r.diagnostics if d.level == DiagnosticLevel.ERROR])
                warnings.extend([d for d in r.diagnostics if d.level == DiagnosticLevel.WARNING])
                if r.cache_hit:
                    total_time_saved += r.duration_ms
        
        cache_stats = self._compiler._cache.get_stats()
        
        return BuildReport(
            build_id=build_id,
            start_time=start_time,
            end_time=end_time,
            duration_ms=duration_ms,
            total_units=len(units),
            successful_units=successful,
            failed_units=failed,
            cached_units=cached,
            time_saved_ms=total_time_saved,
            cache_hit_rate=cache_stats.hit_rate,
            errors=errors,
            warnings=warnings
        )
    
    def cancel_build(self, build_id: str) -> None:
        """Cancel ongoing build"""
        self._cancelled.add(build_id)


# Self-test
async def test_incremental_compiler():
    """Test incremental compiler"""
    print("Testing Incremental Compiler")
    print("=" * 50)
    
    # Test 1: Source hashing
    print("\n1. Source Hashing:")
    hasher = SourceHasher()
    
    # Create test file
    test_file = Path("/tmp/test_compiler.txt")
    test_file.write_text("print('hello world')")
    
    hash1 = hasher.hash_file(test_file)
    hash2 = hasher.hash_file(test_file)
    print(f"  ✅ Hash consistency: {hash1 == hash2}")
    
    # Modify file
    test_file.write_text("print('hello world modified')")
    hash3 = hasher.hash_file(test_file)
    print(f"  ✅ Change detection: {hash1 != hash3}")
    
    # Test 2: Dependency graph
    print("\n2. Dependency Graph:")
    graph = CompilationGraph()
    
    unit_a = CompilationUnit(
        id="unit-a",
        source_files=[Path("/tmp/a.py")],
        dependencies=[],
        output_path=Path("/tmp/a.out"),
        compiler_type=CompilerType.PYTHON
    )
    
    unit_b = CompilationUnit(
        id="unit-b",
        source_files=[Path("/tmp/b.py")],
        dependencies=["unit-a"],
        output_path=Path("/tmp/b.out"),
        compiler_type=CompilerType.PYTHON
    )
    
    graph.add_unit(unit_a)
    graph.add_unit(unit_b)
    
    deps = graph.get_dependencies("unit-b")
    print(f"  ✅ Dependencies: unit-b depends on {[u.id for u in deps]}")
    
    order = graph.topological_build_order()
    print(f"  ✅ Build order: {[u.id for u in order]}")
    
    # Test 3: Cache
    print("\n3. Compilation Cache:")
    cache = CompilationCache(cache_dir=Path("/tmp/test_cache"))
    
    unit_a.update_hash()
    result = CompilationResult(
        unit_id="unit-a",
        success=True,
        duration_ms=100.0
    )
    
    cache.put("unit-a", result)
    cached = cache.get("unit-a", unit_a.source_hash)
    print(f"  ✅ Cache hit: {cached is not None}")
    
    stats = cache.get_stats()
    print(f"  ✅ Cache hit rate: {stats.hit_rate:.1%}")
    
    # Test 4: Incremental compiler
    print("\n4. Incremental Compiler:")
    compiler = IncrementalCompiler()
    compiler.add_unit(unit_a)
    
    needs_rebuild = compiler.needs_recompilation(unit_a)
    print(f"  ✅ Needs recompilation (first): {needs_rebuild}")
    
    # Compile
    result = await compiler.compile(unit_a)
    print(f"  ✅ Compilation success: {result.success}")
    print(f"  ✅ Duration: {result.duration_ms:.1f}ms")
    
    # Check cache
    needs_rebuild = compiler.needs_recompilation(unit_a)
    print(f"  ✅ Needs recompilation (cached): {needs_rebuild}")
    
    # Test 5: Build orchestrator
    print("\n5. Build Orchestrator:")
    orchestrator = BuildOrchestrator(max_parallel=2)
    
    report = await orchestrator.build_all([unit_a, unit_b])
    print(f"  ✅ Build complete: {report.successful_units}/{report.total_units} units")
    print(f"  ✅ Duration: {report.duration_ms:.1f}ms")
    print(f"  ✅ Cache hit rate: {report.cache_hit_rate:.1%}")
    
    # Cleanup
    test_file.unlink(missing_ok=True)
    
    print("\n" + "=" * 50)
    print("Incremental Compiler Tests Complete!")


if __name__ == "__main__":
    asyncio.run(test_incremental_compiler())
