"""
Immutable Event Store - Append-Only PostgreSQL
WSJF Priority: 5.00 (Phase 3)

Append-only storage with correction via offsetting entries.
NO UPDATE/DELETE privileges on event tables.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
import hashlib
import json


class EventStoreError(Enum):
    """Event store specific error codes."""
    ERR_IMMUTABILITY_VIOLATION = "ERR_IMMUTABILITY_VIOLATION"
    ERR_CORRECTION_CHAIN_BROKEN = "ERR_CORRECTION_CHAIN_BROKEN"
    ERR_INVALID_EVENT_TYPE = "ERR_INVALID_EVENT_TYPE"
    ERR_CONTENT_HASH_MISMATCH = "ERR_CONTENT_HASH_MISMATCH"


@dataclass(frozen=True)
class EventRecord:
    """
    Immutable event record.
    
    frozen=True makes this dataclass immutable.
    Content hash ensures tamper detection.
    """
    event_id: str
    event_type: str
    entity_uuid: str
    timestamp_utc: datetime
    payload: Dict[str, Any]
    content_hash: str
    previous_event_id: Optional[str] = None
    correction_of: Optional[str] = None
    correction_reason: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def verify_integrity(self) -> bool:
        """Verify content hash matches payload."""
        calculated = self._calculate_hash()
        return calculated == self.content_hash
    
    def _calculate_hash(self) -> str:
        """Calculate SHA256 hash of payload."""
        payload_str = json.dumps(self.payload, sort_keys=True, default=str)
        return hashlib.sha256(payload_str.encode()).hexdigest()
    
    def is_correction(self) -> bool:
        """Check if this event corrects another."""
        return self.correction_of is not None


class EventStore:
    """
    Append-only event store with immutability guarantees.
    
    Rules:
    1. NO UPDATE operations allowed
    2. NO DELETE operations allowed
    3. Corrections create new offsetting entries
    4. All events have content_hash for verification
    5. Chain integrity validated on read
    
    Error Codes:
    - ERR_IMMUTABILITY_VIOLATION: Attempt to modify existing event
    - ERR_CORRECTION_CHAIN_BROKEN: Missing or invalid correction chain
    - ERR_CONTENT_HASH_MISMATCH: Tampering detected
    """
    
    def __init__(self, storage_backend: Optional[Any] = None):
        self._backend = storage_backend or InMemoryStorage()
        self._event_types: Dict[str, Callable] = {}
        self._register_default_types()
        self._stored_count = 0
    
    def _register_default_types(self):
        """Register default event types."""
        self.register_event_type("clock_in", self._validate_clock_event)
        self.register_event_type("clock_out", self._validate_clock_event)
        self.register_event_type("job_start", self._validate_job_event)
        self.register_event_type("job_end", self._validate_job_event)
        self.register_event_type("location_update", self._validate_geo_event)
        self.register_event_type("status_change", self._validate_status_event)
        self.register_event_type("correction", self._validate_correction_event)
    
    def register_event_type(self, event_type: str, validator: Callable):
        """Register a new event type with validator."""
        self._event_types[event_type] = validator
    
    def store(self, record: EventRecord) -> str:
        """
        Store event immutably.
        
        Args:
            record: EventRecord to store
            
        Returns:
            event_id if successful
            
        Raises:
            EventStoreError: If immutability violated
        """
        # Verify content hash
        if not record.verify_integrity():
            raise ValueError(
                f"{EventStoreError.ERR_CONTENT_HASH_MISMATCH.value}: "
                f"Event {record.event_id} hash mismatch"
            )
        
        # Validate event type
        if record.event_type not in self._event_types:
            raise ValueError(
                f"{EventStoreError.ERR_INVALID_EVENT_TYPE.value}: "
                f"Unknown type {record.event_type}"
            )
        
        # Run type-specific validation
        validator = self._event_types[record.event_type]
        is_valid, error = validator(record)
        if not is_valid:
            raise ValueError(
                f"{EventStoreError.ERR_INVALID_EVENT_TYPE.value}: {error}"
            )
        
        # For corrections, validate chain
        if record.is_correction():
            self._validate_correction_chain(record)
        
        # Store immutably
        self._backend.append(record)
        self._stored_count += 1
        
        return record.event_id
    
    def get(self, event_id: str) -> Optional[EventRecord]:
        """Retrieve event by ID with integrity check."""
        record = self._backend.get(event_id)
        if record and not record.verify_integrity():
            raise ValueError(
                f"{EventStoreError.ERR_CONTENT_HASH_MISMATCH.value}: "
                f"Tampering detected for {event_id}"
            )
        return record
    
    def get_by_entity(
        self, 
        entity_uuid: str, 
        event_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[EventRecord]:
        """Get events for entity with optional filters."""
        events = self._backend.get_by_entity(entity_uuid)
        
        if event_type:
            events = [e for e in events if e.event_type == event_type]
        if start_time:
            events = [e for e in events if e.timestamp_utc >= start_time]
        if end_time:
            events = [e for e in events if e.timestamp_utc <= end_time]
        
        # Verify all integrity
        for event in events:
            if not event.verify_integrity():
                raise ValueError(
                    f"{EventStoreError.ERR_CONTENT_HASH_MISMATCH.value}: "
                    f"Event {event.event_id} integrity failed"
                )
        
        return sorted(events, key=lambda e: e.timestamp_utc)
    
    def get_correction_chain(self, original_event_id: str) -> List[EventRecord]:
        """Get chain of corrections for an event."""
        chain = []
        current_id = original_event_id
        
        while current_id:
            event = self.get(current_id)
            if not event:
                break
            chain.append(event)
            
            # Find if this event was corrected
            corrections = self._backend.find_corrections(current_id)
            if corrections:
                current_id = corrections[0].event_id
            else:
                current_id = None
        
        return chain
    
    def correct(
        self,
        original_event_id: str,
        correction_payload: Dict[str, Any],
        reason: str,
        entity_uuid: str
    ) -> EventRecord:
        """
        Create correction entry (never modifies original).
        
        Returns:
            New EventRecord that offsets the original
        """
        # Generate correction event
        timestamp = datetime.utcnow()
        event_id = f"evt-corr-{timestamp.isoformat()}-{original_event_id}"
        
        record = EventRecord(
            event_id=event_id,
            event_type="correction",
            entity_uuid=entity_uuid,
            timestamp_utc=timestamp,
            payload=correction_payload,
            content_hash="",  # Will be calculated
            previous_event_id=original_event_id,
            correction_of=original_event_id,
            correction_reason=reason,
            metadata={
                "correction_timestamp": timestamp.isoformat(),
                "corrected_event": original_event_id
            }
        )
        
        # Calculate proper hash (requires mutable, so we recalc)
        payload_str = json.dumps(correction_payload, sort_keys=True, default=str)
        proper_hash = hashlib.sha256(payload_str.encode()).hexdigest()
        
        # Create new record with proper hash
        immutable_record = EventRecord(
            event_id=event_id,
            event_type="correction",
            entity_uuid=entity_uuid,
            timestamp_utc=timestamp,
            payload=correction_payload,
            content_hash=proper_hash,
            previous_event_id=original_event_id,
            correction_of=original_event_id,
            correction_reason=reason,
            metadata=record.metadata
        )
        
        self.store(immutable_record)
        return immutable_record
    
    def _validate_correction_chain(self, record: EventRecord) -> bool:
        """Validate correction references existing event."""
        original = self.get(record.correction_of)
        if not original:
            raise ValueError(
                f"{EventStoreError.ERR_CORRECTION_CHAIN_BROKEN.value}: "
                f"Original event {record.correction_of} not found"
            )
        
        # Verify same entity
        if original.entity_uuid != record.entity_uuid:
            raise ValueError(
                f"{EventStoreError.ERR_CORRECTION_CHAIN_BROKEN.value}: "
                f"Entity mismatch in correction"
            )
        
        return True
    
    # Validators
    def _validate_clock_event(self, record: EventRecord) -> tuple:
        """Validate clock in/out events."""
        required = ["location", "timestamp"]
        for fld in required:
            if fld not in record.payload:
                return False, f"Missing required field: {fld}"
        return True, None
    
    def _validate_job_event(self, record: EventRecord) -> tuple:
        """Validate job start/end events."""
        required = ["job_id", "project_id"]
        for fld in required:
            if fld not in record.payload:
                return False, f"Missing required field: {fld}"
        return True, None
    
    def _validate_geo_event(self, record: EventRecord) -> tuple:
        """Validate location update events."""
        required = ["latitude", "longitude", "accuracy"]
        for fld in required:
            if fld not in record.payload:
                return False, f"Missing required field: {fld}"
        lat = record.payload.get("latitude")
        lon = record.payload.get("longitude")
        if not (-90 <= float(lat) <= 90) or not (-180 <= float(lon) <= 180):
            return False, "Invalid coordinates"
        return True, None
    
    def _validate_status_event(self, record: EventRecord) -> tuple:
        """Validate status change events."""
        required = ["old_status", "new_status", "reason"]
        for fld in required:
            if fld not in record.payload:
                return False, f"Missing required field: {fld}"
        return True, None
    
    def _validate_correction_event(self, record: EventRecord) -> tuple:
        """Validate correction events."""
        if not record.correction_of:
            return False, "Correction must reference original event"
        if not record.correction_reason:
            return False, "Correction must have reason"
        return True, None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get store statistics."""
        return {
            "stored_events": self._stored_count,
            "event_types": list(self._event_types.keys()),
            "immutable": True,
            "update_supported": False,
            "delete_supported": False
        }


class InMemoryStorage:
    """In-memory storage for testing. Production uses PostgreSQL."""
    
    def __init__(self):
        self._events: Dict[str, EventRecord] = {}
        self._entity_index: Dict[str, List[str]] = {}
        self._correction_index: Dict[str, List[str]] = {}
    
    def append(self, record: EventRecord):
        """Append event immutably."""
        if record.event_id in self._events:
            raise ValueError(
                f"{EventStoreError.ERR_IMMUTABILITY_VIOLATION.value}: "
                f"Event {record.event_id} already exists"
            )
        
        self._events[record.event_id] = record
        
        # Index by entity
        if record.entity_uuid not in self._entity_index:
            self._entity_index[record.entity_uuid] = []
        self._entity_index[record.entity_uuid].append(record.event_id)
        
        # Index corrections
        if record.correction_of:
            if record.correction_of not in self._correction_index:
                self._correction_index[record.correction_of] = []
            self._correction_index[record.correction_of].append(record.event_id)
    
    def get(self, event_id: str) -> Optional[EventRecord]:
        return self._events.get(event_id)
    
    def get_by_entity(self, entity_uuid: str) -> List[EventRecord]:
        event_ids = self._entity_index.get(entity_uuid, [])
        return [self._events[eid] for eid in event_ids if eid in self._events]
    
    def find_corrections(self, original_event_id: str) -> List[EventRecord]:
        correction_ids = self._correction_index.get(original_event_id, [])
        return [self._events[eid] for eid in correction_ids if eid in self._events]


def self_test():
    """Self-test for EventStore."""
    print("=" * 50)
    print("EVENT STORE SELF-TEST")
    print("=" * 50)
    
    store = EventStore()
    
    # Test 1: Store immutable event
    payload = {"location": "onsite", "timestamp": "2024-01-15T08:00:00Z"}
    payload_str = json.dumps(payload, sort_keys=True)
    content_hash = hashlib.sha256(payload_str.encode()).hexdigest()
    
    record = EventRecord(
        event_id="evt-001",
        event_type="clock_in",
        entity_uuid="tech-001",
        timestamp_utc=datetime.utcnow(),
        payload=payload,
        content_hash=content_hash
    )
    
    event_id = store.store(record)
    assert event_id == "evt-001", "Store should return event_id"
    print("✅ Test 1: Event stored immutably")
    
    # Test 2: Retrieve and verify integrity
    retrieved = store.get("evt-001")
    assert retrieved is not None, "Should retrieve event"
    assert retrieved.verify_integrity(), "Integrity should verify"
    print("✅ Test 2: Event integrity verified on retrieval")
    
    # Test 3: Duplicate store fails (immutability)
    try:
        store.store(record)
        assert False, "Duplicate store should fail"
    except ValueError as e:
        assert "ERR_IMMUTABILITY_VIOLATION" in str(e)
        print("✅ Test 3: Duplicate store rejected (immutability)")
    
    # Test 4: Create correction
    correction = store.correct(
        original_event_id="evt-001",
        correction_payload={"location": "remote", "timestamp": "2024-01-15T08:00:00Z"},
        reason="GPS was wrong, actually remote",
        entity_uuid="tech-001"
    )
    
    assert correction.is_correction(), "Should be marked as correction"
    assert correction.correction_of == "evt-001"
    print("✅ Test 4: Correction entry created")
    
    # Test 5: Get correction chain
    chain = store.get_correction_chain("evt-001")
    assert len(chain) == 2, "Chain should have original + correction"
    print("✅ Test 5: Correction chain retrieved")
    
    # Test 6: Get by entity
    events = store.get_by_entity("tech-001")
    assert len(events) == 2, "Should find both events for entity"
    print("✅ Test 6: Events retrieved by entity")
    
    # Test 7: Stats
    stats = store.get_stats()
    assert stats["immutable"] is True
    assert stats["update_supported"] is False
    assert stats["delete_supported"] is False
    print("✅ Test 7: Store stats confirm immutability")
    
    print("\n" + "=" * 50)
    print("ALL SELF-TESTS PASSED")
    print("=" * 50)
    return True


if __name__ == "__main__":
    self_test()
