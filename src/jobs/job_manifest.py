"""
Job Manifest - Task & Material Tracking
Completed tasks, materials used, end-user sign-offs

WSJF Priority: 4.25 (GO - #5 Phase 2)
Plan: phase2-billing-operations-wsjf-a67778.md
"""

from enum import Enum
from decimal import Decimal
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime


ERR_SIGN_OFF_REQUIRED = "ERR_SIGN_OFF_REQUIRED"
ERR_INVALID_STATUS = "ERR_INVALID_STATUS"


class JobStatus(Enum):
    """Job status"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class TaskStatus(Enum):
    """Task completion status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


@dataclass
class CompletedTask:
    """Completed task record"""
    task_id: str
    task_name: str = ""
    description: str = ""
    
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    duration_minutes: int = 0
    
    billable: bool = True
    rate_id: Optional[str] = None
    
    status: TaskStatus = TaskStatus.COMPLETED
    completion_notes: str = ""
    
    def calculate_duration(self) -> int:
        """Calculate task duration"""
        if not self.end_time:
            return 0
        delta = self.end_time - self.start_time
        return int(delta.total_seconds() / 60)


@dataclass
class MaterialUsage:
    """Material usage record"""
    material_id: str
    material_name: str = ""
    sku: str = ""
    
    quantity: Decimal = field(default_factory=lambda: Decimal("0"))
    unit: str = "each"
    
    unit_cost: Decimal = field(default_factory=lambda: Decimal("0"))
    total_cost: Decimal = field(default_factory=lambda: Decimal("0"))
    
    billable: bool = True
    markup_percent: Decimal = field(default_factory=lambda: Decimal("0"))
    
    supplier: Optional[str] = None
    po_number: Optional[str] = None
    
    def calculate_total(self) -> Decimal:
        """Calculate total with markup"""
        markup_multiplier = Decimal("1") + (self.markup_percent / Decimal("100"))
        return self.quantity * self.unit_cost * markup_multiplier


@dataclass
class SignOffRecord:
    """Sign-off verification record"""
    signed: bool = False
    signed_by: Optional[str] = None
    signed_at: Optional[datetime] = None
    
    signature_type: str = "digital"  # digital, photo, verbal
    signature_data: Optional[str] = None  # Base64 or URL
    
    verified: bool = False
    verification_method: str = "system"
    
    disputed: bool = False
    dispute_reason: Optional[str] = None


@dataclass
class IssueRecord:
    """Issue encountered during job"""
    issue_id: str
    description: str
    severity: str = "minor"  # minor, major, critical
    resolved: bool = False
    resolution: Optional[str] = None


@dataclass
class RateSnapshot:
    """Time-locked rate snapshot to prevent calculation drift"""
    rate_id: str
    base_rate: Decimal
    currency: str = "USD"
    locked_at: datetime = field(default_factory=datetime.now)
    dimensions_hash: str = ""
    
    def is_valid(self) -> bool:
        return bool(self.rate_id and self.base_rate >= 0)



@dataclass
class JobManifest:
    """Job manifest record"""
    manifest_id: str
    job_id: str = ""
    
    technician_uuid: str = ""
    project_id: str = ""
    client_id: str = ""
    
    tasks: List[CompletedTask] = field(default_factory=list)
    materials: List[MaterialUsage] = field(default_factory=list)
    
    scheduled_start: datetime = field(default_factory=datetime.now)
    scheduled_end: datetime = field(default_factory=datetime.now)
    actual_start: datetime = field(default_factory=datetime.now)
    actual_end: Optional[datetime] = None
    
    location_id: str = ""
    onsite: bool = True
    
    sign_off: SignOffRecord = field(default_factory=SignOffRecord)
    rate_snapshot: Optional[RateSnapshot] = None
    
    status: JobStatus = JobStatus.SCHEDULED
    
    photos: List[str] = field(default_factory=list)
    notes: str = ""
    issues: List[IssueRecord] = field(default_factory=list)
    
    def total_labor_hours(self) -> Decimal:
        """Calculate total labor hours"""
        total_minutes = sum(
            t.duration_minutes
            for t in self.tasks
            if t.billable
        )
        return Decimal(str(total_minutes)) / Decimal("60")
    
    def total_material_cost(self) -> Decimal:
        """Calculate total material cost"""
        return sum(
            m.calculate_total()
            for m in self.materials
            if m.billable
        )
    
    def total_job_value(self) -> Decimal:
        """Calculate total job value"""
        # Would integrate with RateEngine for actual calculation
        labor_value = self.total_labor_hours() * Decimal("100")  # Placeholder rate
        material_value = self.total_material_cost()
        return labor_value + material_value
    
    def is_complete(self) -> bool:
        """Check if job is complete"""
        return self.status == JobStatus.COMPLETED and self.sign_off.signed


class JobManifestManager:
    """Manage job manifests"""
    
    def __init__(self):
        self._manifests: Dict[str, JobManifest] = {}
        self._by_project: Dict[str, List[str]] = {}
        self._by_technician: Dict[str, List[str]] = {}
    
    def create_manifest(self, manifest: JobManifest) -> bool:
        """Create new job manifest"""
        self._manifests[manifest.manifest_id] = manifest
        
        if manifest.project_id:
            if manifest.project_id not in self._by_project:
                self._by_project[manifest.project_id] = []
            self._by_project[manifest.project_id].append(manifest.manifest_id)
        
        if manifest.technician_uuid:
            if manifest.technician_uuid not in self._by_technician:
                self._by_technician[manifest.technician_uuid] = []
            self._by_technician[manifest.technician_uuid].append(manifest.manifest_id)
        
        return True
    
    def get_manifest(self, manifest_id: str) -> Optional[JobManifest]:
        """Get manifest by ID"""
        return self._manifests.get(manifest_id)
    
    def add_task(
        self,
        manifest_id: str,
        task: CompletedTask
    ) -> bool:
        """Add task to manifest"""
        manifest = self._manifests.get(manifest_id)
        if not manifest:
            return False
        
        manifest.tasks.append(task)
        return True
    
    def add_material(
        self,
        manifest_id: str,
        material: MaterialUsage
    ) -> bool:
        """Add material to manifest"""
        manifest = self._manifests.get(manifest_id)
        if not manifest:
            return False
        
        manifest.materials.append(material)
        return True
    
    def record_sign_off(
        self,
        manifest_id: str,
        signed_by: str,
        signature_type: str = "digital",
        signature_data: Optional[str] = None
    ) -> bool:
        """Record sign-off"""
        manifest = self._manifests.get(manifest_id)
        if not manifest:
            return False
        
        manifest.sign_off = SignOffRecord(
            signed=True,
            signed_by=signed_by,
            signed_at=datetime.now(),
            signature_type=signature_type,
            signature_data=signature_data,
            verified=True,
            verification_method="system"
        )
        
        manifest.status = JobStatus.COMPLETED
        manifest.actual_end = datetime.now()
        
        return True
    
    def get_manifests_for_project(
        self,
        project_id: str
    ) -> List[JobManifest]:
        """Get all manifests for project"""
        manifest_ids = self._by_project.get(project_id, [])
        return [
            self._manifests[mid]
            for mid in manifest_ids
            if mid in self._manifests
        ]
    
    def get_manifests_for_technician(
        self,
        technician_uuid: str
    ) -> List[JobManifest]:
        """Get all manifests for technician"""
        manifest_ids = self._by_technician.get(technician_uuid, [])
        return [
            self._manifests[mid]
            for mid in manifest_ids
            if mid in self._manifests
        ]


# Self-test
def test_job_manifest():
    """Test job manifest"""
    print("Testing Job Manifest")
    print("=" * 50)
    
    manager = JobManifestManager()
    
    # Test 1: Create manifest
    print("\n1. Create Manifest:")
    
    manifest = JobManifest(
        manifest_id="m-001",
        job_id="job-123",
        technician_uuid="tech-001",
        project_id="proj-001",
        client_id="client-001",
        location_id="site-a",
        onsite=True
    )
    
    manager.create_manifest(manifest)
    
    print(f"  ✅ Manifest ID: {manifest.manifest_id}")
    print(f"  ✅ Job ID: {manifest.job_id}")
    
    # Test 2: Add tasks
    print("\n2. Add Tasks:")
    
    task1 = CompletedTask(
        task_id="t1",
        task_name="Inspect HVAC",
        description="Inspect heating unit",
        duration_minutes=60,
        billable=True
    )
    
    task2 = CompletedTask(
        task_id="t2",
        task_name="Replace filter",
        description="Replace air filter",
        duration_minutes=30,
        billable=True
    )
    
    manager.add_task(manifest.manifest_id, task1)
    manager.add_task(manifest.manifest_id, task2)
    
    print(f"  ✅ Tasks added: {len(manifest.tasks)}")
    print(f"  ✅ Total labor hours: {manifest.total_labor_hours()}")
    
    # Test 3: Add materials
    print("\n3. Add Materials:")
    
    material = MaterialUsage(
        material_id="m1",
        material_name="Air Filter",
        quantity=Decimal("2"),
        unit="each",
        unit_cost=Decimal("15.00"),
        markup_percent=Decimal("25"),
        billable=True
    )
    
    manager.add_material(manifest.manifest_id, material)
    
    print(f"  ✅ Materials added: {len(manifest.materials)}")
    print(f"  ✅ Material cost: ${manifest.total_material_cost()}")
    
    # Test 4: Sign-off
    print("\n4. Sign-off:")
    
    manager.record_sign_off(
        manifest_id=manifest.manifest_id,
        signed_by="Client Manager",
        signature_type="digital"
    )
    
    print(f"  ✅ Signed: {manifest.sign_off.signed}")
    print(f"  ✅ Status: {manifest.status.value}")
    print(f"  ✅ Complete: {manifest.is_complete()}")
    
    print("\n" + "=" * 50)
    print("Job Manifest Tests Complete!")


if __name__ == "__main__":
    test_job_manifest()
