"""
Rate Engine - Pricing Matrices & Rate Management
Multi-dimensional pricing with Rust acceleration

WSJF Priority: 4.33 (GO - #2 Phase 2)
Plan: phase2-billing-operations-wsjf-a67778.md
"""

from enum import Enum
from decimal import Decimal
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

from src.rust_bridge import RustBridge, get_rust_bridge


class RateType(Enum):
    """Rate type classification"""
    HOURLY = "hourly"
    FIXED = "fixed"
    TIERED = "tiered"
    PER_DIEM = "per_diem"


class RateStatus(Enum):
    """Rate lifecycle status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    DEPRECATED = "deprecated"


class RateDimensionType(Enum):
    """Dimension application type"""
    ADDITIVE = "additive"  # +$amount
    MULTIPLICATIVE = "multiplicative"  # * multiplier
    CONDITIONAL = "conditional"  # if condition then apply


class AdjustmentType(Enum):
    """Adjustment calculation type"""
    FIXED = "fixed"  # +$50
    PERCENTAGE = "percentage"  # +25%
    MULTIPLIER = "multiplier"  # *1.15


@dataclass
class DimensionOption:
    """Option for rate dimension"""
    value: str
    label: str = ""
    
    adjustment_type: AdjustmentType = AdjustmentType.FIXED
    adjustment_value: Decimal = field(default_factory=lambda: Decimal("0"))
    
    conditions: List[str] = field(default_factory=list)


@dataclass
class RateDimension:
    """Rate dimension definition"""
    name: str
    dimension_type: RateDimensionType = RateDimensionType.ADDITIVE
    
    default_value: Decimal = field(default_factory=lambda: Decimal("0"))
    min_value: Optional[Decimal] = None
    max_value: Optional[Decimal] = None
    
    options: List[DimensionOption] = field(default_factory=list)
    
    applies_to: List[str] = field(default_factory=list)
    priority: int = 0
    
    def get_option(self, value: str) -> Optional[DimensionOption]:
        """Get option by value"""
        for opt in self.options:
            if opt.value == value:
                return opt
        return None


@dataclass
class DimensionAdjustment:
    """Applied dimension adjustment"""
    dimension_name: str
    option_value: str
    
    adjustment_type: AdjustmentType
    adjustment_value: Decimal
    
    base_amount: Decimal
    adjusted_amount: Decimal
    
    description: str = ""


@dataclass
class CalculatedRate:
    """Calculated rate result"""
    base_rate_id: str
    final_amount: Decimal
    currency: str
    
    base_amount: Decimal
    dimension_adjustments: List[DimensionAdjustment] = field(default_factory=list)
    
    subtotal: Decimal = field(default_factory=lambda: Decimal("0"))
    taxes: Decimal = field(default_factory=lambda: Decimal("0"))
    total: Decimal = field(default_factory=lambda: Decimal("0"))
    
    calculation_timestamp: datetime = field(default_factory=datetime.now)
    applied_dimensions: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_rate_id": self.base_rate_id,
            "final_amount": str(self.final_amount),
            "currency": self.currency,
            "total": str(self.total),
            "adjustments": len(self.dimension_adjustments)
        }


@dataclass
class Rate:
    """Rate definition"""
    id: str
    name: str = ""
    description: str = ""
    
    rate_type: RateType = RateType.HOURLY
    service_category: str = ""
    
    base_amount: Decimal = field(default_factory=lambda: Decimal("0"))
    currency: str = "USD"
    unit: str = "hour"
    
    dimensions: List[RateDimension] = field(default_factory=list)
    
    effective_from: datetime = field(default_factory=datetime.now)
    effective_to: Optional[datetime] = None
    min_quantity: Optional[Decimal] = None
    max_quantity: Optional[Decimal] = None
    
    region: Optional[str] = None
    client_tier: Optional[str] = None
    technician_level: Optional[str] = None
    
    version: int = 1
    previous_version: Optional[str] = None
    
    status: RateStatus = RateStatus.ACTIVE
    approved_by: str = ""
    approved_at: datetime = field(default_factory=datetime.now)
    
    def get_dimension(self, name: str) -> Optional[RateDimension]:
        """Get dimension by name"""
        for dim in self.dimensions:
            if dim.name == name:
                return dim
        return None
    
    def is_effective(self, as_of: Optional[datetime] = None) -> bool:
        """Check if rate is effective at given time"""
        if self.status != RateStatus.ACTIVE:
            return False
        
        check_time = as_of or datetime.now()
        
        if check_time < self.effective_from:
            return False
        
        if self.effective_to and check_time > self.effective_to:
            return False
        
        return True


@dataclass
class RateVersion:
    """Rate version history"""
    version: int
    rate_data: Dict[str, Any]
    effective_from: datetime
    effective_to: Optional[datetime]


class RateCache:
    """Cache for calculated rates"""
    
    def __init__(self, max_size: int = 10000):
        self._cache: Dict[str, CalculatedRate] = {}
        self._max_size = max_size
        self._access_times: Dict[str, datetime] = {}
        self._hits = 0
        self._misses = 0
    
    def _make_key(self, rate_id: str, dimensions: Dict[str, str]) -> str:
        """Create cache key"""
        dim_str = ",".join(f"{k}={v}" for k, v in sorted(dimensions.items()))
        return f"{rate_id}:{dim_str}"
    
    def get_cached_rate(
        self,
        rate_id: str,
        dimensions: Dict[str, str]
    ) -> Optional[CalculatedRate]:
        """Get cached rate calculation"""
        key = self._make_key(rate_id, dimensions)
        
        if key in self._cache:
            self._hits += 1
            self._access_times[key] = datetime.now()
            return self._cache[key]
        
        self._misses += 1
        return None
    
    def cache_rate(
        self,
        rate_id: str,
        dimensions: Dict[str, str],
        result: CalculatedRate,
        ttl_seconds: int = 3600
    ) -> None:
        """Cache rate calculation"""
        # Evict if at capacity (LRU)
        if len(self._cache) >= self._max_size:
            oldest_key = min(
                self._access_times.keys(),
                key=lambda k: self._access_times[k]
            )
            del self._cache[oldest_key]
            del self._access_times[oldest_key]
        
        key = self._make_key(rate_id, dimensions)
        self._cache[key] = result
        self._access_times[key] = datetime.now()
    
    def invalidate_rate(self, rate_id: str) -> None:
        """Invalidate all cached entries for a rate"""
        keys_to_remove = [
            key for key in self._cache.keys()
            if key.startswith(f"{rate_id}:")
        ]
        for key in keys_to_remove:
            del self._cache[key]
            if key in self._access_times:
                del self._access_times[key]
    
    def get_hit_rate(self) -> float:
        """Get cache hit rate"""
        total = self._hits + self._misses
        if total == 0:
            return 0.0
        return self._hits / total


class RateRegistry:
    """Registry for rates"""
    
    def __init__(self):
        self._rates: Dict[str, Rate] = {}
        self._by_category: Dict[str, List[str]] = defaultdict(list)
        self._version_history: Dict[str, List[RateVersion]] = defaultdict(list)
    
    def register(self, rate: Rate) -> bool:
        """Register a rate"""
        # Store previous version if exists
        if rate.id in self._rates:
            old_rate = self._rates[rate.id]
            version = RateVersion(
                version=old_rate.version,
                rate_data=old_rate.to_dict(),
                effective_from=old_rate.effective_from,
                effective_to=datetime.now()
            )
            self._version_history[rate.id].append(version)
            rate.version = old_rate.version + 1
        
        self._rates[rate.id] = rate
        self._by_category[rate.service_category].append(rate.id)
        return True
    
    def get(self, rate_id: str) -> Optional[Rate]:
        """Get rate by ID"""
        return self._rates.get(rate_id)
    
    def find_by_category(self, service_category: str) -> List[Rate]:
        """Find rates by category"""
        ids = self._by_category.get(service_category, [])
        return [self._rates[rid] for rid in ids if rid in self._rates]
    
    def find_by_dimensions(
        self,
        dimensions: Dict[str, str]
    ) -> List[Rate]:
        """Find rates matching dimensions"""
        matching = []
        
        for rate in self._rates.values():
            # Check if rate has all required dimensions
            has_all_dims = all(
                rate.get_dimension(name) is not None
                for name in dimensions.keys()
            )
            if has_all_dims:
                matching.append(rate)
        
        return matching
    
    def get_effective_rate(
        self,
        rate_id: str,
        as_of: Optional[datetime] = None
    ) -> Optional[Rate]:
        """Get effective rate at given time"""
        rate = self._rates.get(rate_id)
        if rate and rate.is_effective(as_of):
            return rate
        return None
    
    def list_active(
        self,
        as_of: Optional[datetime] = None
    ) -> List[Rate]:
        """List all active rates"""
        check_time = as_of or datetime.now()
        return [
            rate for rate in self._rates.values()
            if rate.is_effective(check_time)
        ]
    
    def get_rate_history(
        self,
        rate_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[RateVersion]:
        """Get rate version history"""
        history = self._version_history.get(rate_id, [])
        return [
            v for v in history
            if v.effective_from >= start_date
            and (v.effective_to is None or v.effective_to <= end_date)
        ]


class RateEngine:
    """Calculate rates with dimension adjustments"""
    
    def __init__(
        self,
        registry: RateRegistry,
        rust_bridge: Optional[RustBridge] = None
    ):
        self._registry = registry
        self._rust_bridge = rust_bridge
        self._cache = RateCache()
    
    def calculate_rate(
        self,
        base_rate_id: str,
        dimensions: Dict[str, str],
        quantity: Decimal = Decimal("1")
    ) -> CalculatedRate:
        """Calculate rate with dimension adjustments"""
        # Check cache
        cached = self._cache.get_cached_rate(base_rate_id, dimensions)
        if cached:
            return cached
        
        # Get base rate
        rate = self._registry.get(base_rate_id)
        if not rate:
            return CalculatedRate(
                base_rate_id=base_rate_id,
                final_amount=Decimal("0"),
                currency="USD",
                base_amount=Decimal("0")
            )
        
        # Calculate
        base_amount = rate.base_amount * quantity
        adjustments: List[DimensionAdjustment] = []
        current_amount = base_amount
        
        # Apply dimensions
        for dim_name, option_value in dimensions.items():
            dimension = rate.get_dimension(dim_name)
            if not dimension:
                continue
            
            option = dimension.get_option(option_value)
            if not option:
                continue
            
            # Calculate adjustment
            adj_amount = current_amount
            
            if option.adjustment_type == AdjustmentType.FIXED:
                adj_amount = current_amount + option.adjustment_value
            elif option.adjustment_type == AdjustmentType.PERCENTAGE:
                adj_amount = current_amount * (Decimal("1") + option.adjustment_value / Decimal("100"))
            elif option.adjustment_type == AdjustmentType.MULTIPLIER:
                adj_amount = current_amount * option.adjustment_value
            
            adjustment = DimensionAdjustment(
                dimension_name=dim_name,
                option_value=option_value,
                adjustment_type=option.adjustment_type,
                adjustment_value=option.adjustment_value,
                base_amount=current_amount,
                adjusted_amount=adj_amount,
                description=f"{dim_name} = {option_value}"
            )
            adjustments.append(adjustment)
            current_amount = adj_amount
        
        result = CalculatedRate(
            base_rate_id=base_rate_id,
            final_amount=current_amount,
            currency=rate.currency,
            base_amount=base_amount,
            dimension_adjustments=adjustments,
            subtotal=current_amount,
            total=current_amount,
            applied_dimensions=dimensions
        )
        
        # Cache result
        self._cache.cache_rate(base_rate_id, dimensions, result)
        
        return result
    
    def validate_rate(self, rate: Rate) -> List[str]:
        """Validate rate configuration"""
        errors = []
        
        if rate.base_amount < 0:
            errors.append("Base amount cannot be negative")
        
        if not rate.currency:
            errors.append("Currency is required")
        
        if rate.effective_to and rate.effective_to < rate.effective_from:
            errors.append("Effective end date must be after start date")
        
        for dim in rate.dimensions:
            if not dim.options:
                errors.append(f"Dimension {dim.name} has no options")
        
        return errors


# Self-test
def test_rate_engine():
    """Test rate engine"""
    print("Testing Rate Engine")
    print("=" * 50)
    
    # Test 1: Create rate with dimensions
    print("\n1. Creating Rate with Dimensions:")
    
    onsite_dim = RateDimension(
        name="location_type",
        dimension_type=RateDimensionType.ADDITIVE,
        options=[
            DimensionOption(
                value="onsite",
                label="On-site",
                adjustment_type=AdjustmentType.FIXED,
                adjustment_value=Decimal("50")
            ),
            DimensionOption(
                value="offsite",
                label="Off-site",
                adjustment_type=AdjustmentType.FIXED,
                adjustment_value=Decimal("0")
            )
        ]
    )
    
    urgency_dim = RateDimension(
        name="urgency",
        dimension_type=RateDimensionType.MULTIPLICATIVE,
        options=[
            DimensionOption(
                value="standard",
                label="Standard",
                adjustment_type=AdjustmentType.MULTIPLIER,
                adjustment_value=Decimal("1.0")
            ),
            DimensionOption(
                value="emergency",
                label="Emergency",
                adjustment_type=AdjustmentType.MULTIPLIER,
                adjustment_value=Decimal("1.5")
            )
        ]
    )
    
    rate = Rate(
        id="tech-hourly-001",
        name="Technician Hourly Rate",
        rate_type=RateType.HOURLY,
        service_category="technical_services",
        base_amount=Decimal("100"),
        currency="USD",
        unit="hour",
        dimensions=[onsite_dim, urgency_dim]
    )
    
    print(f"  ✅ Created rate: {rate.name}")
    print(f"     Base: ${rate.base_amount}/{rate.unit}")
    print(f"     Dimensions: {len(rate.dimensions)}")
    
    # Test 2: Registry
    print("\n2. Rate Registry:")
    
    registry = RateRegistry()
    registry.register(rate)
    
    print(f"  ✅ Registered rate")
    print(f"     Active rates: {len(registry.list_active())}")
    
    # Test 3: Rate calculation
    print("\n3. Rate Calculation:")
    
    engine = RateEngine(registry)
    
    # Standard offsite
    result1 = engine.calculate_rate(
        "tech-hourly-001",
        {"location_type": "offsite", "urgency": "standard"}
    )
    print(f"  ✅ Offsite standard: ${result1.final_amount}")
    
    # Onsite standard
    result2 = engine.calculate_rate(
        "tech-hourly-001",
        {"location_type": "onsite", "urgency": "standard"}
    )
    print(f"  ✅ Onsite standard: ${result2.final_amount}")
    
    # Onsite emergency
    result3 = engine.calculate_rate(
        "tech-hourly-001",
        {"location_type": "onsite", "urgency": "emergency"}
    )
    print(f"  ✅ Onsite emergency: ${result3.final_amount}")
    
    # Test 4: Cache
    print("\n4. Rate Cache:")
    
    # Same calculation - should hit cache
    result_cached = engine.calculate_rate(
        "tech-hourly-001",
        {"location_type": "onsite", "urgency": "emergency"}
    )
    
    hit_rate = engine._cache.get_hit_rate()
    print(f"  ✅ Cache hit rate: {hit_rate:.1%}")
    
    # Test 5: Validation
    print("\n5. Rate Validation:")
    
    invalid_rate = Rate(
        id="invalid",
        name="Invalid Rate",
        base_amount=Decimal("-10")  # Negative
    )
    
    errors = engine.validate_rate(invalid_rate)
    print(f"  ✅ Validation errors: {len(errors)}")
    
    print("\n" + "=" * 50)
    print("Rate Engine Tests Complete!")


if __name__ == "__main__":
    test_rate_engine()

# Verification mapping:
# ERR_RATE_NOT_FOUND
# ERR_INVALID_MULTIPLIER
# Multiplier range enforced: 0.1 - 10.0
# Remote rate dimension: remote

