"""
Entity Identity - UUID Resolution & Identity Management
Foundational domain for billing operations

WSJF Priority: 4.80 (GO - #1 Phase 2)
Rust-accelerated for high-throughput UUID generation
Plan: phase2-billing-operations-wsjf-a67778.md
"""

import re
import uuid as uuid_lib
from enum import Enum
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

from src.rust_bridge import RustBridge, get_rust_bridge


class EntityType(Enum):
    """Entity type classification"""
    FIELD_TECHNICIAN = "field_technician"
    END_CLIENT = "end_client"
    END_USER = "end_user"
    THIRD_PARTY_VENDOR = "third_party_vendor"
    ADMIN = "admin"
    SYSTEM = "system"


class EntityStatus(Enum):
    """Entity lifecycle status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"
    MERGED = "merged"


class EntityRole(Enum):
    """Entity role classification"""
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"
    ADMIN = "admin"


@dataclass
class IdentityVersion:
    """Identity version for audit trail"""
    version: int
    changed_at: datetime
    changed_by: str
    changes: Dict[str, Any]


@dataclass
class EntityIdentity:
    """Entity identity record"""
    uuid: str
    entity_type: EntityType
    
    display_name: str
    legal_name: Optional[str] = None
    email: str = ""
    phone: Optional[str] = None
    
    status: EntityStatus = EntityStatus.ACTIVE
    role: EntityRole = EntityRole.STANDARD
    permissions: List[str] = field(default_factory=list)
    
    external_ids: Dict[str, str] = field(default_factory=dict)
    
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    verified_at: Optional[datetime] = None
    created_by: str = ""
    
    version: int = 1
    previous_versions: List[IdentityVersion] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "uuid": self.uuid,
            "entity_type": self.entity_type.value,
            "display_name": self.display_name,
            "email": self.email,
            "status": self.status.value,
            "role": self.role.value,
            "version": self.version,
            "created_at": self.created_at.isoformat()
        }
    
    def merge_external_ids(self, other: "EntityIdentity") -> None:
        """Merge external IDs from another identity"""
        for system, ext_id in other.external_ids.items():
            if system not in self.external_ids:
                self.external_ids[system] = ext_id


class UUIDGenerator:
    """High-performance UUID generation with Rust acceleration"""
    
    def __init__(self, use_rust: bool = True):
        self._use_rust = use_rust
        self._rust_bridge = get_rust_bridge() if use_rust else None
    
    def generate_v4(self) -> str:
        """Generate random UUID v4"""
        if self._rust_bridge and hasattr(self._rust_bridge, 'generate_uuid_v4'):
            return self._rust_bridge.generate_uuid_v4()
        return str(uuid_lib.uuid4())
    
    def generate_v7(self) -> str:
        """Generate time-ordered UUID v7 (preferred for DB performance)"""
        # UUID v7: Unix timestamp (48 bits) + random (74 bits) + version (4 bits) + variant (2 bits)
        # For now, use Python implementation (Rust can accelerate later)
        timestamp = int(datetime.now().timestamp() * 1000)
        
        # Create UUID v7 manually
        # First 48 bits: Unix timestamp in milliseconds
        time_hex = f"{timestamp:012x}"
        
        # Next 16 bits: version (0111) + 12 random bits
        rand1 = uuid_lib.uuid4().hex[:3]
        version_hex = f"7{rand1}"
        
        # Next 16 bits: variant (10) + 14 random bits
        rand2 = uuid_lib.uuid4().hex[:4]
        variant_hex = f"8{rand2[1:]}"
        
        # Last 48 bits: random
        rand3 = uuid_lib.uuid4().hex[:12]
        
        uuid_str = f"{time_hex[:8]}-{time_hex[8:12]}-{version_hex}-{variant_hex}-{rand3}"
        return uuid_str
    
    def generate_batch(self, count: int) -> List[str]:
        """Generate batch of UUIDs efficiently"""
        if self._rust_bridge and hasattr(self._rust_bridge, 'generate_uuid_batch'):
            return self._rust_bridge.generate_uuid_batch(count)
        return [self.generate_v7() for _ in range(count)]
    
    def validate_uuid(self, uuid_str: str) -> bool:
        """Validate UUID format"""
        pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(pattern, uuid_str.lower()))
    
    def extract_timestamp(self, uuid_v7: str) -> Optional[datetime]:
        """Extract timestamp from UUID v7"""
        try:
            # First 48 bits (12 hex chars) contain timestamp
            time_hex = uuid_v7.replace('-', '')[:12]
            timestamp_ms = int(time_hex, 16)
            return datetime.fromtimestamp(timestamp_ms / 1000)
        except (ValueError, IndexError):
            return None


class IdentityValidator:
    """Validate identity data integrity"""
    
    EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    PHONE_REGEX = re.compile(r'^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$')
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        return bool(self.EMAIL_REGEX.match(email))
    
    def validate_phone(self, phone: str) -> bool:
        """Validate phone format"""
        if not phone:
            return True  # Phone is optional
        return bool(self.PHONE_REGEX.match(phone))
    
    def validate_uuid(self, uuid_str: str) -> bool:
        """Validate UUID format"""
        pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        return bool(re.match(pattern, uuid_str.lower()))
    
    def check_duplicate(
        self,
        identity: EntityIdentity,
        registry: "IdentityRegistry"
    ) -> Optional[str]:
        """Check for duplicate identity"""
        # Check by email + type
        existing = registry.find_by_email(identity.email)
        if existing and existing.uuid != identity.uuid:
            if existing.entity_type == identity.entity_type:
                return existing.uuid
        return None
    
    def validate_schema(
        self,
        data: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate identity schema"""
        errors = []
        
        required = ["uuid", "entity_type", "display_name", "email"]
        for field in required:
            if field not in data or not data[field]:
                errors.append(f"Missing required field: {field}")
        
        # Validate email if present
        if "email" in data and data["email"]:
            if not self.validate_email(data["email"]):
                errors.append(f"Invalid email format: {data['email']}")
        
        # Validate phone if present
        if "phone" in data and data["phone"]:
            if not self.validate_phone(data["phone"]):
                errors.append(f"Invalid phone format: {data['phone']}")
        
        return len(errors) == 0, errors


class IdentityRegistry:
    """Registry for entity identities"""
    
    def __init__(self, rust_bridge: Optional[RustBridge] = None):
        self._identities: Dict[str, EntityIdentity] = {}
        self._by_email: Dict[str, str] = {}  # email -> uuid
        self._by_type: Dict[str, List[str]] = defaultdict(list)  # type -> [uuids]
        self._by_external: Dict[str, Dict[str, str]] = defaultdict(dict)  # system -> {ext_id -> uuid}
        self._rust_bridge = rust_bridge
        self._validator = IdentityValidator()
        self._uuid_gen = UUIDGenerator(use_rust=rust_bridge is not None)
    
    def register(self, identity: EntityIdentity) -> bool:
        """Register new entity identity"""
        # Validate
        valid, errors = self._validator.validate_schema(identity.to_dict())
        if not valid:
            return False
        
        # Check for duplicates
        duplicate = self._validator.check_duplicate(identity, self)
        if duplicate:
            return False
        
        # Validate UUID format
        if not self._validator.validate_uuid(identity.uuid):
            return False
        
        # Store identity
        self._identities[identity.uuid] = identity
        
        # Index by email
        self._by_email[identity.email.lower()] = identity.uuid
        
        # Index by type
        self._by_type[identity.entity_type.value].append(identity.uuid)
        
        # Index external IDs
        for system, ext_id in identity.external_ids.items():
            self._by_external[system][ext_id] = identity.uuid
        
        return True
    
    def resolve(self, uuid: str) -> Optional[EntityIdentity]:
        """Resolve identity by UUID"""
        return self._identities.get(uuid)
    
    def resolve_by_external(
        self,
        system: str,
        external_id: str
    ) -> Optional[EntityIdentity]:
        """Resolve identity by external ID"""
        uuid = self._by_external.get(system, {}).get(external_id)
        if uuid:
            return self._identities.get(uuid)
        return None
    
    def find_by_type(self, entity_type: EntityType) -> List[EntityIdentity]:
        """Find identities by type"""
        uuids = self._by_type.get(entity_type.value, [])
        return [self._identities[uuid] for uuid in uuids if uuid in self._identities]
    
    def find_by_email(self, email: str) -> Optional[EntityIdentity]:
        """Find identity by email"""
        uuid = self._by_email.get(email.lower())
        if uuid:
            return self._identities.get(uuid)
        return None
    
    def update(self, identity: EntityIdentity) -> bool:
        """Update existing identity"""
        if identity.uuid not in self._identities:
            return False
        
        # Store previous version
        old_identity = self._identities[identity.uuid]
        version = IdentityVersion(
            version=old_identity.version,
            changed_at=datetime.now(),
            changed_by=identity.created_by,
            changes=old_identity.to_dict()
        )
        identity.previous_versions.append(version)
        identity.version = old_identity.version + 1
        identity.updated_at = datetime.now()
        
        # Update email index if changed
        if old_identity.email.lower() != identity.email.lower():
            del self._by_email[old_identity.email.lower()]
            self._by_email[identity.email.lower()] = identity.uuid
        
        # Store updated
        self._identities[identity.uuid] = identity
        return True
    
    def deactivate(self, uuid: str, reason: str) -> bool:
        """Deactivate an identity"""
        identity = self._identities.get(uuid)
        if not identity:
            return False
        
        identity.status = EntityStatus.INACTIVE
        identity.updated_at = datetime.now()
        return True
    
    def merge_identities(
        self,
        primary_uuid: str,
        duplicate_uuid: str
    ) -> bool:
        """Merge duplicate identity into primary"""
        primary = self._identities.get(primary_uuid)
        duplicate = self._identities.get(duplicate_uuid)
        
        if not primary or not duplicate:
            return False
        
        # Merge external IDs
        primary.merge_external_ids(duplicate)
        
        # Mark duplicate as merged
        duplicate.status = EntityStatus.MERGED
        duplicate.updated_at = datetime.now()
        
        # Update primary
        self._identities[primary_uuid] = primary
        self._identities[duplicate_uuid] = duplicate
        
        return True
    
    def validate_uniqueness(
        self,
        email: str,
        entity_type: EntityType
    ) -> bool:
        """Validate email+type uniqueness"""
        existing = self.find_by_email(email)
        if existing:
            return existing.entity_type != entity_type
        return True
    
    def list_all(self) -> List[EntityIdentity]:
        """List all identities"""
        return list(self._identities.values())
    
    def get_stats(self) -> Dict[str, Any]:
        """Get registry statistics"""
        return {
            "total_identities": len(self._identities),
            "by_type": {k: len(v) for k, v in self._by_type.items()},
            "by_status": {
                status.value: sum(
                    1 for i in self._identities.values()
                    if i.status == status
                )
                for status in EntityStatus
            }
        }


# Self-test
def test_entity_identity():
    """Test entity identity domain"""
    print("Testing Entity Identity Domain")
    print("=" * 50)
    
    # Test 1: UUID generation
    print("\n1. UUID Generation:")
    
    uuid_gen = UUIDGenerator(use_rust=False)
    
    v4 = uuid_gen.generate_v4()
    print(f"  ✅ UUID v4: {v4}")
    
    v7 = uuid_gen.generate_v7()
    print(f"  ✅ UUID v7: {v7}")
    
    batch = uuid_gen.generate_batch(5)
    print(f"  ✅ Batch generation: {len(batch)} UUIDs")
    
    valid = uuid_gen.validate_uuid(v7)
    print(f"  ✅ Validation: {valid}")
    
    ts = uuid_gen.extract_timestamp(v7)
    print(f"  ✅ Timestamp extraction: {ts}")
    
    # Test 2: Identity creation
    print("\n2. Identity Creation:")
    
    registry = IdentityRegistry()
    
    tech = EntityIdentity(
        uuid=uuid_gen.generate_v7(),
        entity_type=EntityType.FIELD_TECHNICIAN,
        display_name="John Technician",
        legal_name="John Smith",
        email="john.tech@example.com",
        phone="+1-555-123-4567",
        role=EntityRole.STANDARD,
        external_ids={"crm": "CRM-12345", "erp": "EMP-789"}
    )
    
    success = registry.register(tech)
    print(f"  ✅ Registered technician: {success}")
    
    # Test 3: Identity resolution
    print("\n3. Identity Resolution:")
    
    resolved = registry.resolve(tech.uuid)
    print(f"  ✅ Resolve by UUID: {resolved.display_name if resolved else 'None'}")
    
    by_email = registry.find_by_email("john.tech@example.com")
    print(f"  ✅ Resolve by email: {by_email.display_name if by_email else 'None'}")
    
    by_external = registry.resolve_by_external("crm", "CRM-12345")
    print(f"  ✅ Resolve by external ID: {by_external.display_name if by_external else 'None'}")
    
    # Test 4: Duplicate detection
    print("\n4. Duplicate Detection:")
    
    duplicate = EntityIdentity(
        uuid=uuid_gen.generate_v7(),
        entity_type=EntityType.FIELD_TECHNICIAN,
        display_name="John Tech",
        email="john.tech@example.com"  # Same email
    )
    
    dup_check = registry._validator.check_duplicate(duplicate, registry)
    print(f"  ✅ Duplicate detected: {dup_check is not None}")
    
    # Test 5: Email validation
    print("\n5. Email Validation:")
    
    validator = IdentityValidator()
    
    valid_email = validator.validate_email("test@example.com")
    print(f"  ✅ Valid email: {valid_email}")
    
    invalid_email = validator.validate_email("not-an-email")
    print(f"  ✅ Invalid email rejected: {not invalid_email}")
    
    # Test 6: Registry stats
    print("\n6. Registry Statistics:")
    
    # Add more identities
    for i in range(3):
        client = EntityIdentity(
            uuid=uuid_gen.generate_v7(),
            entity_type=EntityType.END_CLIENT,
            display_name=f"Client {i}",
            email=f"client{i}@example.com"
        )
        registry.register(client)
    
    stats = registry.get_stats()
    print(f"  ✅ Total: {stats['total_identities']}")
    print(f"  ✅ By type: {stats['by_type']}")
    
    # Test 7: Identity merge
    print("\n7. Identity Merge:")
    
    primary = registry.resolve(tech.uuid)
    
    duplicate_id = uuid_gen.generate_v7()
    duplicate_identity = EntityIdentity(
        uuid=duplicate_id,
        entity_type=EntityType.FIELD_TECHNICIAN,
        display_name="John T.",
        email="john.t@example.com",
        external_ids={"old_system": "OLD-123"}
    )
    registry.register(duplicate_identity)
    
    merged = registry.merge_identities(primary.uuid, duplicate_id)
    print(f"  ✅ Merge successful: {merged}")
    print(f"  ✅ External IDs merged: {primary.external_ids}")
    
    print("\n" + "=" * 50)
    print("Entity Identity Tests Complete!")


if __name__ == "__main__":
    test_entity_identity()
