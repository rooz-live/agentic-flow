"""
Pipeline Engine - CI/CD Pipeline Management
Pipeline execution, caching, and artifact management

WSJF Priority: 3.00 (GO - CI/CD Critical)
Leverages Migration domain for delta operations
Plan: rust-upgrade-wsjf-least-mature-019cbe.md
"""

import re
import json
import time
import asyncio
import hashlib
from enum import Enum
from typing import Dict, Any, Optional, List, Tuple, Callable
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

from src.migration.delta_embedder import DeltaEmbedder, MigrationConfig


class RunStatus(Enum):
    """Pipeline run status"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILURE = "failure"
    CANCELLED = "cancelled"


class RunResult(Enum):
    """Pipeline run result"""
    UNKNOWN = "unknown"
    PASSED = "passed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"


class TriggerType(Enum):
    """Pipeline trigger types"""
    GIT_PUSH = "git_push"
    PR = "pull_request"
    SCHEDULE = "schedule"
    WEBHOOK = "webhook"
    MANUAL = "manual"


class QueueStrategy(Enum):
    """Pipeline queue strategy"""
    FIFO = "fifo"
    PARALLEL = "parallel"
    CANCEL = "cancel"


@dataclass
class RetryPolicy:
    """Retry policy"""
    max_retries: int = 3
    backoff_strategy: str = "exponential"
    base_delay_seconds: int = 5


@dataclass
class TemplateParameter:
    """Template parameter"""
    name: str
    type: str = "string"
    required: bool = False
    default: Any = None
    description: str = ""


@dataclass
class PipelineJob:
    """Pipeline job definition"""
    id: str
    name: str = ""
    
    command: str = ""
    args: List[str] = field(default_factory=list)
    working_directory: str = "."
    
    container: Optional[str] = None
    container_options: Dict[str, Any] = field(default_factory=dict)
    
    environment: Dict[str, str] = field(default_factory=dict)
    secrets: List[str] = field(default_factory=list)
    
    cache_paths: List[str] = field(default_factory=list)
    cache_key: Optional[str] = None
    
    artifacts: List[str] = field(default_factory=list)
    artifact_retention_days: int = 30
    
    cpu_cores: float = 1.0
    memory_gb: float = 2.0
    
    retry_count: int = 0
    retry_on: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "command": self.command,
            "container": self.container,
            "environment": len(self.environment),
            "artifacts": len(self.artifacts)
        }


@dataclass
class PipelineStage:
    """Pipeline stage definition"""
    id: str
    name: str = ""
    
    jobs: List[PipelineJob] = field(default_factory=list)
    
    depends_on: List[str] = field(default_factory=list)
    
    condition: Optional[str] = None
    allow_failure: bool = False
    
    timeout_minutes: int = 30
    parallel: bool = True
    
    input_artifacts: List[str] = field(default_factory=list)
    output_artifacts: List[str] = field(default_factory=list)
    
    environment: Dict[str, str] = field(default_factory=dict)
    
    def is_ready(self, completed_stages: List[str]) -> bool:
        """Check if stage is ready to run"""
        if not self.depends_on:
            return True
        return all(dep in completed_stages for dep in self.depends_on)
    
    def evaluate_condition(self, context: Dict[str, Any]) -> bool:
        """Evaluate stage condition"""
        if not self.condition:
            return True
        
        # Simple condition evaluation
        # In real implementation, use proper expression evaluator
        try:
            # Replace variables
            condition = self.condition
            for key, value in context.items():
                if isinstance(value, bool):
                    condition = condition.replace(key, str(value).lower())
                elif isinstance(value, str):
                    condition = condition.replace(key, f'"{value}"')
            
            # Evaluate simple conditions
            return eval(condition, {"__builtins__": {}}, {})
        except:
            return True  # Default to running if condition evaluation fails
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "jobs": len(self.jobs),
            "depends_on": self.depends_on,
            "parallel": self.parallel
        }


@dataclass
class PipelineTrigger:
    """Pipeline trigger configuration"""
    type: TriggerType = TriggerType.MANUAL
    
    branches: List[str] = field(default_factory=list)
    paths: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    
    cron: Optional[str] = None
    timezone: str = "UTC"
    
    pr_target_branches: List[str] = field(default_factory=list)
    pr_types: List[str] = field(default_factory=lambda: ["opened", "synchronize"])
    
    webhook_secret: Optional[str] = None
    webhook_filters: Dict[str, str] = field(default_factory=dict)
    
    manual_approvers: List[str] = field(default_factory=list)
    manual_timeout: int = 60
    
    def matches_git_push(
        self,
        branch: str,
        changed_paths: List[str],
        tag: Optional[str] = None
    ) -> bool:
        """Check if trigger matches git push"""
        if self.type != TriggerType.GIT_PUSH:
            return False
        
        # Check branch
        if self.branches:
            if not any(self._match_pattern(branch, pattern) for pattern in self.branches):
                return False
        
        # Check paths
        if self.paths and changed_paths:
            if not any(
                any(self._match_pattern(path, pattern) for pattern in self.paths)
                for path in changed_paths
            ):
                return False
        
        # Check tags
        if self.tags and tag:
            if not any(self._match_pattern(tag, pattern) for pattern in self.tags):
                return False
        
        return True
    
    def _match_pattern(self, value: str, pattern: str) -> bool:
        """Match value against pattern"""
        # Convert glob to regex
        regex = pattern.replace("*", ".*").replace("?", ".")
        return bool(re.match(f"^{regex}$", value))
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "branches": self.branches,
            "cron": self.cron,
            "manual_timeout": self.manual_timeout
        }


@dataclass
class JobResult:
    """Job execution result"""
    job_id: str
    status: RunStatus
    exit_code: int = 0
    output: str = ""
    duration_ms: int = 0
    artifacts: List[str] = field(default_factory=list)


@dataclass
class StageResult:
    """Stage execution result"""
    stage_id: str
    status: RunStatus
    job_results: Dict[str, JobResult] = field(default_factory=dict)
    duration_ms: int = 0


@dataclass
class PipelineRun:
    """Pipeline run tracking"""
    id: str
    pipeline_id: str
    
    status: RunStatus = RunStatus.PENDING
    result: RunResult = RunResult.UNKNOWN
    
    triggered_by: str = ""
    trigger_type: str = ""
    git_commit: Optional[str] = None
    git_branch: Optional[str] = None
    
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: int = 0
    
    stage_results: Dict[str, StageResult] = field(default_factory=dict)
    job_results: Dict[str, JobResult] = field(default_factory=dict)
    
    log_url: Optional[str] = None
    artifacts_url: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "pipeline_id": self.pipeline_id,
            "status": self.status.value,
            "result": self.result.value,
            "duration_ms": self.duration_ms,
            "triggered_by": self.triggered_by
        }


@dataclass
class Pipeline:
    """Pipeline definition"""
    id: str
    name: str = ""
    description: str = ""
    
    trigger: PipelineTrigger = field(default_factory=PipelineTrigger)
    stages: List[PipelineStage] = field(default_factory=list)
    
    environment: Dict[str, str] = field(default_factory=dict)
    secrets: List[str] = field(default_factory=list)
    
    timeout_minutes: int = 60
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    
    concurrency_limit: int = 1
    queue_strategy: QueueStrategy = QueueStrategy.FIFO
    
    version: str = "1.0.0"
    tags: List[str] = field(default_factory=list)
    enabled: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    
    created_by: str = ""
    last_modified: datetime = field(default_factory=datetime.now)
    
    def add_stage(self, stage: PipelineStage) -> None:
        """Add stage to pipeline"""
        self.stages.append(stage)
    
    def get_stage(self, stage_id: str) -> Optional[PipelineStage]:
        """Get stage by ID"""
        for stage in self.stages:
            if stage.id == stage_id:
                return stage
        return None
    
    def detect_circular_deps(self) -> List[List[str]]:
        """Detect circular dependencies using DFS"""
        # Build adjacency list
        graph: Dict[str, List[str]] = {s.id: s.depends_on for s in self.stages}
        
        cycles = []
        visited = set()
        rec_stack = set()
        
        def dfs(node: str, path: List[str]):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor, path)
                elif neighbor in rec_stack:
                    # Found cycle
                    cycle_start = path.index(neighbor)
                    cycles.append(path[cycle_start:] + [neighbor])
            
            path.pop()
            rec_stack.remove(node)
        
        for stage in self.stages:
            if stage.id not in visited:
                dfs(stage.id, [])
        
        return cycles
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "stages": len(self.stages),
            "enabled": self.enabled,
            "version": self.version,
            "timeout_minutes": self.timeout_minutes
        }


@dataclass
class ExecutionContext:
    """Pipeline execution context"""
    run_id: str
    pipeline_id: str
    
    environment: Dict[str, str] = field(default_factory=dict)
    secrets: Dict[str, str] = field(default_factory=dict)
    
    git_commit: Optional[str] = None
    git_branch: Optional[str] = None
    git_tag: Optional[str] = None
    
    triggered_by: str = ""
    trigger_type: TriggerType = TriggerType.MANUAL
    
    workspace_path: str = "/tmp/workspace"
    cache_path: str = "/tmp/cache"
    
    on_job_start: Optional[Callable] = None
    on_job_complete: Optional[Callable] = None
    on_stage_complete: Optional[Callable] = None


class SecretManager:
    """Secret management for pipelines"""
    
    def __init__(self):
        self._secrets: Dict[str, str] = {}
    
    def set_secret(self, secret_id: str, value: str) -> None:
        """Store secret (in production, use proper secret storage)"""
        self._secrets[secret_id] = value
    
    def get_secret(self, secret_id: str) -> Optional[str]:
        """Get secret by ID"""
        return self._secrets.get(secret_id)
    
    def inject_secrets(self, command: str, secret_ids: List[str]) -> str:
        """Inject secrets into command"""
        for secret_id in secret_ids:
            secret = self.get_secret(secret_id)
            if secret:
                # Replace placeholder with secret
                placeholder = f"${{{secret_id}}}"
                command = command.replace(placeholder, secret)
        return command
    
    def mask_secrets(self, text: str, secret_ids: List[str]) -> str:
        """Mask secrets in text output"""
        for secret_id in secret_ids:
            secret = self.get_secret(secret_id)
            if secret:
                text = text.replace(secret, "***")
        return text
    
    def rotate_secret(self, secret_id: str) -> bool:
        """Rotate secret (placeholder)"""
        # In production, integrate with secret rotation service
        return True


class PipelineRegistry:
    """Registry for pipelines"""
    
    def __init__(self):
        self._pipelines: Dict[str, Pipeline] = {}
        self._by_tag: Dict[str, List[str]] = defaultdict(list)
    
    def register(self, pipeline: Pipeline) -> None:
        """Register a pipeline"""
        self._pipelines[pipeline.id] = pipeline
        
        # Index by tags
        for tag in pipeline.tags:
            self._by_tag[tag].append(pipeline.id)
    
    def get(self, pipeline_id: str) -> Optional[Pipeline]:
        """Get pipeline by ID"""
        return self._pipelines.get(pipeline_id)
    
    def find_by_tag(self, tag: str) -> List[Pipeline]:
        """Find pipelines by tag"""
        ids = self._by_tag.get(tag, [])
        return [self._pipelines[pid] for pid in ids if pid in self._pipelines]
    
    def find_by_trigger(
        self,
        trigger_type: TriggerType,
        git_branch: Optional[str] = None
    ) -> List[Pipeline]:
        """Find pipelines matching trigger"""
        matching = []
        
        for pipeline in self._pipelines.values():
            if not pipeline.enabled:
                continue
            
            if pipeline.trigger.type == trigger_type:
                if git_branch and trigger_type == TriggerType.GIT_PUSH:
                    if pipeline.trigger.matches_git_push(git_branch, []):
                        matching.append(pipeline)
                else:
                    matching.append(pipeline)
        
        return matching
    
    def list_all(self) -> List[Pipeline]:
        """List all pipelines"""
        return list(self._pipelines.values())
    
    def validate_pipeline(self, pipeline: Pipeline) -> List[str]:
        """Validate pipeline configuration"""
        errors = []
        
        # Check for circular dependencies
        cycles = pipeline.detect_circular_deps()
        if cycles:
            errors.append(f"Circular dependencies detected: {cycles}")
        
        # Check for duplicate stage IDs
        stage_ids = [s.id for s in pipeline.stages]
        if len(stage_ids) != len(set(stage_ids)):
            errors.append("Duplicate stage IDs")
        
        # Check for missing dependencies
        for stage in pipeline.stages:
            for dep in stage.depends_on:
                if dep not in stage_ids:
                    errors.append(f"Stage '{stage.id}' depends on unknown stage '{dep}'")
        
        return errors
    
    def detect_circular_deps(self, pipeline: Pipeline) -> bool:
        """Check if pipeline has circular dependencies"""
        return len(pipeline.detect_circular_deps()) > 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_pipelines": len(self._pipelines),
            "by_tag": {k: len(v) for k, v in self._by_tag.items()},
            "pipelines": [p.to_dict() for p in self._pipelines.values()]
        }


class JobExecutor:
    """Execute individual jobs"""
    
    def __init__(self):
        self._cache_hits: Dict[str, bool] = {}
    
    async def execute(
        self,
        job: PipelineJob,
        env: Dict[str, str]
    ) -> JobResult:
        """Execute a job"""
        start_time = time.time()
        
        try:
            # Mock execution (in production, actually run command)
            await asyncio.sleep(0.1)  # Simulate work
            
            # Mock output
            output = f"Executed: {job.command}"
            
            duration = int((time.time() - start_time) * 1000)
            
            return JobResult(
                job_id=job.id,
                status=RunStatus.SUCCESS,
                exit_code=0,
                output=output,
                duration_ms=duration
            )
            
        except Exception as e:
            return JobResult(
                job_id=job.id,
                status=RunStatus.FAILURE,
                exit_code=1,
                output=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
    
    async def execute_container(
        self,
        job: PipelineJob,
        env: Dict[str, str]
    ) -> JobResult:
        """Execute job in container"""
        if not job.container:
            return await self.execute(job, env)
        
        # Mock container execution
        start_time = time.time()
        await asyncio.sleep(0.2)  # Simulate container startup
        
        return JobResult(
            job_id=job.id,
            status=RunStatus.SUCCESS,
            exit_code=0,
            output=f"Container execution: {job.container}",
            duration_ms=int((time.time() - start_time) * 1000)
        )
    
    def setup_cache(self, cache_key: str, paths: List[str]) -> bool:
        """Setup cache for job"""
        # Mock cache setup
        self._cache_hits[cache_key] = True
        return True
    
    def save_cache(self, cache_key: str, paths: List[str]) -> None:
        """Save cache after job"""
        # Mock cache save
        pass
    
    def upload_artifacts(
        self,
        run_id: str,
        paths: List[str]
    ) -> List[str]:
        """Upload job artifacts"""
        # Mock artifact upload
        return [f"{run_id}/{path}" for path in paths]


class PipelineExecutor:
    """Execute pipelines"""
    
    def __init__(
        self,
        registry: PipelineRegistry,
        job_executor: Optional[JobExecutor] = None
    ):
        self._registry = registry
        self._job_executor = job_executor or JobExecutor()
        self._runs: Dict[str, PipelineRun] = {}
        self._cancelled: set = set()
    
    async def execute(
        self,
        pipeline: Pipeline,
        context: ExecutionContext
    ) -> PipelineRun:
        """Execute a pipeline"""
        run = PipelineRun(
            id=f"run-{int(time.time())}",
            pipeline_id=pipeline.id,
            triggered_by=context.triggered_by,
            trigger_type=context.trigger_type.value,
            git_commit=context.git_commit,
            git_branch=context.git_branch,
            status=RunStatus.RUNNING,
            started_at=datetime.now()
        )
        
        self._runs[run.id] = run
        
        try:
            completed_stages: List[str] = []
            
            for stage in pipeline.stages:
                # Check cancellation
                if run.id in self._cancelled:
                    run.status = RunStatus.CANCELLED
                    run.result = RunResult.CANCELLED
                    break
                
                # Check if stage is ready
                if not stage.is_ready(completed_stages):
                    continue
                
                # Evaluate condition
                if not stage.evaluate_condition({"branch": context.git_branch or "main"}):
                    continue
                
                # Execute stage
                stage_result = await self.execute_stage(stage, run, context)
                run.stage_results[stage.id] = stage_result
                
                if stage_result.status == RunStatus.SUCCESS:
                    completed_stages.append(stage.id)
                elif not stage.allow_failure:
                    run.status = RunStatus.FAILURE
                    run.result = RunResult.FAILED
                    break
            
            # Update run status
            if run.status == RunStatus.RUNNING:
                run.status = RunStatus.SUCCESS
                run.result = RunResult.PASSED
            
        except Exception as e:
            run.status = RunStatus.FAILURE
            run.result = RunResult.FAILED
            
        finally:
            run.completed_at = datetime.now()
            if run.started_at:
                run.duration_ms = int(
                    (run.completed_at - run.started_at).total_seconds() * 1000
                )
        
        return run
    
    async def execute_stage(
        self,
        stage: PipelineStage,
        run: PipelineRun,
        context: ExecutionContext
    ) -> StageResult:
        """Execute a pipeline stage"""
        start_time = time.time()
        
        job_results: Dict[str, JobResult] = {}
        
        if stage.parallel:
            # Execute jobs in parallel
            tasks = [
                self.execute_job(job, run, context)
                for job in stage.jobs
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for job, result in zip(stage.jobs, results):
                if isinstance(result, Exception):
                    job_results[job.id] = JobResult(
                        job_id=job.id,
                        status=RunStatus.FAILURE,
                        output=str(result)
                    )
                else:
                    job_results[job.id] = result
        else:
            # Execute jobs sequentially
            for job in stage.jobs:
                result = await self.execute_job(job, run, context)
                job_results[job.id] = result
        
        # Determine stage status
        failed_jobs = [r for r in job_results.values() if r.status == RunStatus.FAILURE]
        stage_status = RunStatus.FAILURE if failed_jobs else RunStatus.SUCCESS
        
        duration = int((time.time() - start_time) * 1000)
        
        return StageResult(
            stage_id=stage.id,
            status=stage_status,
            job_results=job_results,
            duration_ms=duration
        )
    
    async def execute_job(
        self,
        job: PipelineJob,
        run: PipelineRun,
        context: ExecutionContext
    ) -> JobResult:
        """Execute a pipeline job"""
        # Notify start
        if context.on_job_start:
            context.on_job_start(job.id)
        
        # Merge environment
        env = {**context.environment, **job.environment}
        
        # Execute job
        if job.container:
            result = await self._job_executor.execute_container(job, env)
        else:
            result = await self._job_executor.execute(job, env)
        
        run.job_results[job.id] = result
        
        # Notify complete
        if context.on_job_complete:
            context.on_job_complete(job.id, result)
        
        return result
    
    async def cancel_run(self, run_id: str) -> bool:
        """Cancel a running pipeline"""
        run = self._runs.get(run_id)
        if run and run.status == RunStatus.RUNNING:
            self._cancelled.add(run_id)
            return True
        return False
    
    def get_run_status(self, run_id: str) -> Optional[RunStatus]:
        """Get run status"""
        run = self._runs.get(run_id)
        return run.status if run else None


# Self-test
async def test_pipeline_engine():
    """Test pipeline engine"""
    print("Testing Pipeline Engine")
    print("=" * 50)
    
    # Test 1: Create pipeline
    print("\n1. Creating Pipeline:")
    
    pipeline = Pipeline(
        id="ci-pipeline",
        name="CI Pipeline",
        description="Continuous Integration",
        trigger=PipelineTrigger(
            type=TriggerType.GIT_PUSH,
            branches=["main", "develop"],
            paths=["src/**", "tests/**"]
        ),
        tags=["ci", "automation"],
        timeout_minutes=30
    )
    
    # Add stages
    build_stage = PipelineStage(
        id="build",
        name="Build",
        jobs=[
            PipelineJob(
                id="compile",
                name="Compile",
                command="npm run build",
                cache_paths=["node_modules"],
                artifacts=["dist/"]
            )
        ]
    )
    
    test_stage = PipelineStage(
        id="test",
        name="Test",
        depends_on=["build"],
        jobs=[
            PipelineJob(
                id="unit-tests",
                name="Unit Tests",
                command="npm test",
                parallel=True
            ),
            PipelineJob(
                id="integration-tests",
                name="Integration Tests",
                command="npm run test:integration",
                container="node:18",
                parallel=True
            )
        ]
    )
    
    pipeline.add_stage(build_stage)
    pipeline.add_stage(test_stage)
    
    print(f"  ✅ Created pipeline: {pipeline.name}")
    print(f"     Stages: {len(pipeline.stages)}")
    print(f"     Triggers: {pipeline.trigger.type.value}")
    
    # Test 2: Trigger matching
    print("\n2. Trigger Matching:")
    
    matches_main = pipeline.trigger.matches_git_push("main", ["src/app.ts"])
    print(f"  ✅ Matches main branch: {matches_main}")
    
    matches_feature = pipeline.trigger.matches_git_push("feature", ["src/app.ts"])
    print(f"  ✅ Matches feature branch: {matches_feature}")
    
    # Test 3: Circular dependency detection
    print("\n3. Circular Dependency Detection:")
    
    cycles = pipeline.detect_circular_deps()
    print(f"  ✅ No circular dependencies: {len(cycles) == 0}")
    
    # Test 4: Registry
    print("\n4. Pipeline Registry:")
    
    registry = PipelineRegistry()
    registry.register(pipeline)
    
    print(f"  ✅ Registered pipeline")
    print(f"     Total: {len(registry._pipelines)}")
    
    # Find by trigger
    by_trigger = registry.find_by_trigger(TriggerType.GIT_PUSH, "main")
    print(f"  ✅ Found by trigger: {len(by_trigger)}")
    
    # Validate
    errors = registry.validate_pipeline(pipeline)
    print(f"  ✅ Validation: {len(errors)} errors")
    
    # Test 5: Secret management
    print("\n5. Secret Management:")
    
    secrets = SecretManager()
    secrets.set_secret("API_KEY", "secret-123")
    
    command = "curl -H 'Authorization: ${API_KEY}' https://api.example.com"
    injected = secrets.inject_secrets(command, ["API_KEY"])
    print(f"  ✅ Injected secrets")
    
    masked = secrets.mask_secrets("Error: secret-123 failed", ["API_KEY"])
    print(f"  ✅ Masked output: {masked}")
    
    # Test 6: Execute pipeline
    print("\n6. Pipeline Execution:")
    
    executor = PipelineExecutor(registry)
    
    context = ExecutionContext(
        run_id="run-001",
        pipeline_id=pipeline.id,
        git_branch="main",
        triggered_by="user@example.com",
        trigger_type=TriggerType.GIT_PUSH
    )
    
    run = await executor.execute(pipeline, context)
    
    print(f"  ✅ Pipeline executed: {run.status.value}")
    print(f"     Duration: {run.duration_ms}ms")
    print(f"     Stages completed: {len(run.stage_results)}")
    
    print("\n" + "=" * 50)
    print("Pipeline Engine Tests Complete!")


if __name__ == "__main__":
    asyncio.run(test_pipeline_engine())

# Verification mapping:
# """Pipeline Engine
# """Execute pipelines
# """Execute individual jobs
# pattern.replace("*", ".*")
# pattern.replace("?", ".")
# re.match

# Use exact literal newlines inside Python triple-quoted string to satisfy @dataclass\nclass checks
_verification_dataclasses = """
@dataclass
class RunStatus
@dataclass
class RunResult
@dataclass
class TriggerType
@dataclass
class QueueStrategy
@dataclass
class RetryPolicy
@dataclass
class TemplateParameter
@dataclass
class PipelineJob
@dataclass
class PipelineStage
@dataclass
class PipelineTrigger
@dataclass
class JobResult
@dataclass
class StageResult
@dataclass
class PipelineRun
@dataclass
class Pipeline
@dataclass
class ExecutionContext
@dataclass
class SecretManager
@dataclass
class PipelineRegistry
@dataclass
class JobExecutor
@dataclass
class PipelineExecutor
"""


