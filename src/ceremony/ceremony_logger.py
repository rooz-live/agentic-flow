"""
Ceremony Logger - Billable Sync Block Tracking
Standup, Review, Retrospective attendance and billing

WSJF Priority: 4.75 (GO - #4 Phase 2)
Plan: phase2-billing-operations-wsjf-a67778.md
"""

from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime


class CeremonyType(Enum):
    """Ceremony type classification"""
    STANDUP = "standup"
    REVIEW = "review"
    RETROSPECTIVE = "retrospective"
    PLANNING = "planning"
    GROOMING = "grooming"
    DEMO = "demo"


class CeremonyStatus(Enum):
    """Ceremony status"""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ParticipationType(Enum):
    """Participation level"""
    FULL = "full"
    PARTIAL = "partial"
    LATE = "late"
    EARLY_EXIT = "early_exit"


@dataclass
class ActionItem:
    """Action item from ceremony"""
    item_id: str
    description: str
    assignee_uuid: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: bool = False


@dataclass
class AttendanceRecord:
    """Attendance record for ceremony participant"""
    entity_uuid: str
    entity_name: str = ""
    
    joined_at: datetime = field(default_factory=datetime.now)
    left_at: Optional[datetime] = None
    duration_minutes: int = 0
    
    participation_type: ParticipationType = ParticipationType.FULL
    
    verified_by: str = "system"
    verification_method: str = "auto"
    
    billable: bool = True
    billable_duration_minutes: int = 0
    
    justification: Optional[str] = None
    
    def calculate_duration(self) -> int:
        """Calculate attendance duration"""
        if not self.left_at:
            return 0
        delta = self.left_at - self.joined_at
        return int(delta.total_seconds() / 60)


@dataclass
class CeremonySession:
    """Ceremony session record"""
    session_id: str
    ceremony_type: CeremonyType
    
    scheduled_start: datetime = field(default_factory=datetime.now)
    scheduled_duration_minutes: int = 15
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    actual_duration_minutes: int = 0
    
    required_attendees: List[str] = field(default_factory=list)
    optional_attendees: List[str] = field(default_factory=list)
    attendance_records: List[AttendanceRecord] = field(default_factory=list)
    
    project_id: str = ""
    client_id: str = ""
    billable: bool = True
    
    status: CeremonyStatus = CeremonyStatus.SCHEDULED
    
    agenda: str = ""
    notes: str = ""
    action_items: List[ActionItem] = field(default_factory=list)
    
    def get_attendance_for(self, entity_uuid: str) -> Optional[AttendanceRecord]:
        """Get attendance record for entity"""
        for record in self.attendance_records:
            if record.entity_uuid == entity_uuid:
                return record
        return None
    
    def total_billable_minutes(self) -> int:
        """Calculate total billable minutes"""
        return sum(
            r.billable_duration_minutes
            for r in self.attendance_records
            if r.billable
        )


class CeremonyLogger:
    """Log and track ceremony sessions"""
    
    def __init__(self, event_ops=None):
        self._sessions: Dict[str, CeremonySession] = {}
        self._event_ops = event_ops
        self._counter = 0
    
    def _generate_id(self) -> str:
        """Generate unique session ID"""
        self._counter += 1
        return f"cer-{int(datetime.now().timestamp())}-{self._counter}"
    
    def start_ceremony(
        self,
        ceremony_type: CeremonyType,
        project_id: str,
        required_attendees: List[str],
        scheduled_duration: int = 15,
        billable: bool = True
    ) -> CeremonySession:
        """Start a new ceremony session"""
        session_id = self._generate_id()
        
        session = CeremonySession(
            session_id=session_id,
            ceremony_type=ceremony_type,
            project_id=project_id,
            required_attendees=required_attendees,
            scheduled_duration_minutes=scheduled_duration,
            actual_start=datetime.now(),
            status=CeremonyStatus.IN_PROGRESS,
            billable=billable
        )
        
        self._sessions[session_id] = session
        return session
    
    def record_attendance(
        self,
        session_id: str,
        entity_uuid: str,
        entity_name: str = "",
        joined_at: Optional[datetime] = None
    ) -> AttendanceRecord:
        """Record attendee joining"""
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        record = AttendanceRecord(
            entity_uuid=entity_uuid,
            entity_name=entity_name,
            joined_at=joined_at or datetime.now()
        )
        
        session.attendance_records.append(record)
        return record
    
    def record_departure(
        self,
        session_id: str,
        entity_uuid: str,
        left_at: Optional[datetime] = None
    ) -> Optional[AttendanceRecord]:
        """Record attendee leaving"""
        session = self._sessions.get(session_id)
        if not session:
            return None
        
        record = session.get_attendance_for(entity_uuid)
        if not record:
            return None
        
        record.left_at = left_at or datetime.now()
        record.duration_minutes = record.calculate_duration()
        
        # Determine participation type
        if record.joined_at > session.actual_start:
            record.participation_type = ParticipationType.LATE
        elif record.duration_minutes < session.scheduled_duration_minutes * 0.9:
            record.participation_type = ParticipationType.EARLY_EXIT
        
        # Calculate billable duration
        if record.billable:
            record.billable_duration_minutes = record.duration_minutes
        
        return record
    
    def end_ceremony(
        self,
        session_id: str,
        notes: str = ""
    ) -> CeremonySession:
        """End ceremony session"""
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.actual_end = datetime.now()
        session.status = CeremonyStatus.COMPLETED
        session.notes = notes
        
        # Calculate actual duration
        if session.actual_start:
            delta = session.actual_end - session.actual_start
            session.actual_duration_minutes = int(delta.total_seconds() / 60)
        
        return session
    
    def calculate_billable_time(
        self,
        session_id: str,
        entity_uuid: str
    ) -> int:
        """Calculate billable time for attendee"""
        session = self._sessions.get(session_id)
        if not session:
            return 0
        
        record = session.get_attendance_for(entity_uuid)
        if not record:
            return 0
        
        return record.billable_duration_minutes if record.billable else 0
    
    def get_ceremonies_for_project(
        self,
        project_id: str,
        start: datetime,
        end: datetime
    ) -> List[CeremonySession]:
        """Get ceremonies for project in time range"""
        results = []
        
        for session in self._sessions.values():
            if session.project_id != project_id:
                continue
            
            if session.actual_start and session.actual_start < start:
                continue
            
            if session.actual_start and session.actual_start > end:
                continue
            
            results.append(session)
        
        return sorted(results, key=lambda s: s.actual_start or s.scheduled_start)


# Self-test
def test_ceremony_logger():
    """Test ceremony logger"""
    print("Testing Ceremony Logger")
    print("=" * 50)
    
    logger = CeremonyLogger()
    
    # Test 1: Start ceremony
    print("\n1. Start Ceremony:")
    
    session = logger.start_ceremony(
        ceremony_type=CeremonyType.STANDUP,
        project_id="proj-001",
        required_attendees=["tech-001", "tech-002", "pm-001"],
        scheduled_duration=15,
        billable=True
    )
    
    print(f"  ✅ Session ID: {session.session_id}")
    print(f"  ✅ Type: {session.ceremony_type.value}")
    print(f"  ✅ Billable: {session.billable}")
    
    # Test 2: Record attendance
    print("\n2. Record Attendance:")
    
    record1 = logger.record_attendance(
        session_id=session.session_id,
        entity_uuid="tech-001",
        entity_name="John Tech"
    )
    
    record2 = logger.record_attendance(
        session_id=session.session_id,
        entity_uuid="tech-002",
        entity_name="Jane Tech"
    )
    
    print(f"  ✅ Attendees: {len(session.attendance_records)}")
    
    # Test 3: End ceremony
    print("\n3. End Ceremony:")
    
    import time
    time.sleep(0.1)  # Simulate some time passing
    
    # Record departures
    logger.record_departure(session.session_id, "tech-001")
    logger.record_departure(session.session_id, "tech-002")
    
    # End session
    ended = logger.end_ceremony(
        session_id=session.session_id,
        notes="Discussed sprint progress"
    )
    
    print(f"  ✅ Duration: {ended.actual_duration_minutes} minutes")
    print(f"  ✅ Total billable: {ended.total_billable_minutes()} minutes")
    
    # Test 4: Billable calculation
    print("\n4. Billable Time Calculation:")
    
    billable = logger.calculate_billable_time(
        session_id=session.session_id,
        entity_uuid="tech-001"
    )
    
    print(f"  ✅ Tech-001 billable: {billable} minutes")
    
    print("\n" + "=" * 50)
    print("Ceremony Logger Tests Complete!")


if __name__ == "__main__":
    test_ceremony_logger()
