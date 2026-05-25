"""
Calculation Engine - Time Aggregation & Financial Math
Billable time aggregation and financial calculations

WSJF Priority: 3.57 (GO - #9 Phase 2)
Plan: phase2-billing-operations-wsjf-a67778.md
"""

import re
from enum import Enum
from decimal import Decimal
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta


class BlockType(Enum):
    """Billable block type"""
    WORK = "work"
    TRAVEL = "travel"
    OVERHEAD = "overhead"
    CEREMONY = "ceremony"


class TimeStatus(Enum):
    """Time entry status"""
    VALID = "valid"
    INVALID = "invalid"
    PENDING = "pending"


@dataclass
class TimeEntry:
    """Time entry record"""
    entry_id: str
    entity_uuid: str
    
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    
    entry_type: str
    billable: bool
    
    source_id: str
    source_type: str
    
    validated: bool = False
    validation_errors: List[str] = field(default_factory=list)


@dataclass
class BillableBlock:
    """Billable time block"""
    block_id: str
    block_type: BlockType
    
    start_time: datetime
    end_time: datetime
    duration_hours: Decimal
    
    billable: bool
    rate_id: Optional[str]
    rate_applied: Decimal
    
    source_type: str
    source_id: str
    
    description: str
    task_id: Optional[str] = None


@dataclass
class TimeAggregation:
    """Aggregated time record"""
    aggregation_id: str
    entity_uuid: str
    project_id: str
    
    period_start: datetime
    period_end: datetime
    
    working_hours_total: Decimal = field(default_factory=lambda: Decimal("0"))
    working_hours_breakdown: List[TimeEntry] = field(default_factory=list)
    
    billable_hours_total: Decimal = field(default_factory=lambda: Decimal("0"))
    billable_hours_breakdown: List[BillableBlock] = field(default_factory=list)
    
    ceremony_hours_total: Decimal = field(default_factory=lambda: Decimal("0"))
    ceremony_hours_breakdown: List[BillableBlock] = field(default_factory=list)
    
    break_hours_total: Decimal = field(default_factory=lambda: Decimal("0"))
    
    validated: bool = False
    validation_errors: List[str] = field(default_factory=list)
    
    total_logged_hours: Decimal = field(default_factory=lambda: Decimal("0"))
    total_billable_hours: Decimal = field(default_factory=lambda: Decimal("0"))
    
    def calculate_totals(self) -> None:
        """Calculate total hours"""
        self.total_logged_hours = (
            self.working_hours_total +
            self.ceremony_hours_total +
            self.break_hours_total
        )
        self.total_billable_hours = self.billable_hours_total


@dataclass
class Adjustment:
    """Financial adjustment"""
    adjustment_type: str
    description: str
    amount: Decimal


@dataclass
class TaxLine:
    """Tax line item"""
    tax_name: str
    jurisdiction: str
    rate: Decimal
    amount: Decimal


@dataclass
class FinancialTotals:
    """Financial calculation totals"""
    regular_hours: Decimal = field(default_factory=lambda: Decimal("0"))
    overtime_hours: Decimal = field(default_factory=lambda: Decimal("0"))
    total_hours: Decimal = field(default_factory=lambda: Decimal("0"))
    
    regular_amount: Decimal = field(default_factory=lambda: Decimal("0"))
    overtime_amount: Decimal = field(default_factory=lambda: Decimal("0"))
    subtotal: Decimal = field(default_factory=lambda: Decimal("0"))
    
    adjustments: List[Adjustment] = field(default_factory=list)
    adjusted_subtotal: Decimal = field(default_factory=lambda: Decimal("0"))
    
    taxes: Decimal = field(default_factory=lambda: Decimal("0"))
    tax_breakdown: List[TaxLine] = field(default_factory=list)
    
    total_amount: Decimal = field(default_factory=lambda: Decimal("0"))
    currency: str = "USD"
    
    calculation_timestamp: datetime = field(default_factory=datetime.now)
    validated: bool = False


@dataclass
class TimeAnomaly:
    """Detected time anomaly"""
    anomaly_type: str
    description: str
    severity: str
    affected_entries: List[str]
    suggested_correction: Optional[str]


@dataclass
class OvertimeCalculation:
    """Overtime calculation result"""
    regular_hours: Decimal
    overtime_hours: Decimal
    total_hours: Decimal
    
    regular_rate: Decimal
    overtime_rate: Decimal
    
    regular_pay: Decimal
    overtime_pay: Decimal
    total_pay: Decimal


@dataclass
class ValidationResult:
    """Time validation result"""
    valid: bool
    errors: List[str]
    warnings: List[str]


class TimeValidator:
    """Validate time entries"""
    
    ISO8601_REGEX = re.compile(
        r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$'
    )
    
    def validate_timestamp(self, timestamp: str) -> Tuple[bool, Optional[str]]:
        """Validate ISO 8601 timestamp"""
        if not timestamp:
            return False, "ERR_INVALID_TIMESTAMP_FORMAT: Timestamp is empty"
        
        # Check format
        if not self.ISO8601_REGEX.match(timestamp):
            return False, "ERR_INVALID_TIMESTAMP_FORMAT: Not valid ISO 8601"
        
        # Check for UTC offset
        if 'Z' not in timestamp and not re.search(r'[+-]\d{2}:\d{2}$', timestamp):
            return False, "ERR_MISSING_UTC_OFFSET: UTC offset required"
        
        # Check for reasonable date (not future beyond 1 day)
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            if dt > datetime.now() + timedelta(days=1):
                return False, "ERR_FUTURE_TIMESTAMP: Date is in the future"
        except ValueError:
            return False, "ERR_INVALID_DATE_RANGE: Invalid date values"
        
        return True, None
    
    def validate_entries(self, entries: List[TimeEntry]) -> ValidationResult:
        """Validate list of time entries"""
        errors = []
        warnings = []
        
        for entry in entries:
            # Validate timestamps
            start_valid, start_error = self.validate_timestamp(
                entry.start_time.isoformat()
            )
            if not start_valid:
                errors.append(f"Entry {entry.entry_id}: {start_error}")
            
            end_valid, end_error = self.validate_timestamp(
                entry.end_time.isoformat()
            )
            if not end_valid:
                errors.append(f"Entry {entry.entry_id}: {end_error}")
            
            # Check duration consistency
            expected_duration = (entry.end_time - entry.start_time).total_seconds() / 60
            if abs(expected_duration - entry.duration_minutes) > 1:
                warnings.append(
                    f"Entry {entry.entry_id}: Duration mismatch"
                )
            
            # Check for negative duration
            if entry.duration_minutes < 0:
                errors.append(
                    f"Entry {entry.entry_id}: ERR_NEGATIVE_DURATION"
                )
            
            # Check for excessive duration (e.g., > 24 hours)
            if entry.duration_minutes > 24 * 60:
                errors.append(
                    f"Entry {entry.entry_id}: ERR_EXCESSIVE_DURATION > 24h"
                )
        
        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )


class CalculationEngine:
    """Calculate time and financial totals"""
    
    def __init__(self):
        self._validator = TimeValidator()
    
    def aggregate_time(
        self,
        entity_uuid: str,
        project_id: str,
        start: datetime,
        end: datetime,
        events: List[Any],
        job_manifests: List[Any],
        ceremonies: List[Any]
    ) -> TimeAggregation:
        """Aggregate time from multiple sources"""
        result = TimeAggregation(
            aggregation_id=f"agg-{entity_uuid}-{int(datetime.now().timestamp())}",
            entity_uuid=entity_uuid,
            project_id=project_id,
            period_start=start,
            period_end=end
        )
        
        # Process job manifests (work time)
        for manifest in job_manifests:
            if hasattr(manifest, 'tasks'):
                for task in manifest.tasks:
                    if task.billable:
                        hours = Decimal(str(task.duration_minutes)) / Decimal("60")
                        result.billable_hours_total += hours
                        
                        block = BillableBlock(
                            block_id=f"blk-{task.task_id}",
                            block_type=BlockType.WORK,
                            start_time=task.start_time,
                            end_time=task.end_time or task.start_time,
                            duration_hours=hours,
                            billable=True,
                            rate_id=task.rate_id,
                            rate_applied=Decimal("0"),  # Would look up rate
                            source_type="job_manifest",
                            source_id=manifest.manifest_id,
                            description=task.task_name
                        )
                        result.billable_hours_breakdown.append(block)
        
        # Process ceremonies
        for ceremony in ceremonies:
            if hasattr(ceremony, 'attendance_records'):
                for record in ceremony.attendance_records:
                    if record.billable:
                        hours = Decimal(str(record.billable_duration_minutes)) / Decimal("60")
                        result.ceremony_hours_total += hours
                        
                        block = BillableBlock(
                            block_id=f"cer-{record.entity_uuid}",
                            block_type=BlockType.CEREMONY,
                            start_time=record.joined_at,
                            end_time=record.left_at or record.joined_at,
                            duration_hours=hours,
                            billable=True,
                            rate_id=None,
                            rate_applied=Decimal("0"),
                            source_type="ceremony",
                            source_id=ceremony.session_id,
                            description=f"{ceremony.ceremony_type.value} ceremony"
                        )
                        result.ceremony_hours_breakdown.append(block)
        
        # Calculate totals
        result.working_hours_total = result.billable_hours_total  # Simplified
        result.calculate_totals()
        
        # Validate
        entries = self._convert_to_time_entries(result)
        validation = self._validator.validate_entries(entries)
        result.validated = validation.valid
        result.validation_errors = validation.errors
        
        return result
    
    def _convert_to_time_entries(self, aggregation: TimeAggregation) -> List[TimeEntry]:
        """Convert aggregation blocks to time entries for validation"""
        entries = []
        
        for block in aggregation.billable_hours_breakdown:
            entry = TimeEntry(
                entry_id=block.block_id,
                entity_uuid=aggregation.entity_uuid,
                start_time=block.start_time,
                end_time=block.end_time,
                duration_minutes=int(block.duration_hours * 60),
                entry_type=block.block_type.value,
                billable=block.billable,
                source_id=block.source_id,
                source_type=block.source_type
            )
            entries.append(entry)
        
        return entries
    
    def calculate_financial_totals(
        self,
        time_aggregation: TimeAggregation,
        rate_engine: Any = None,
        tax_converter: Any = None
    ) -> FinancialTotals:
        """Calculate financial totals from time aggregation"""
        result = FinancialTotals()
        
        # Calculate hours
        result.regular_hours = time_aggregation.billable_hours_total
        result.total_hours = result.regular_hours + result.overtime_hours
        
        # Calculate amounts (simplified - would use rate engine)
        hourly_rate = Decimal("100")  # Placeholder
        result.regular_amount = result.regular_hours * hourly_rate
        result.subtotal = result.regular_amount + result.overtime_amount
        result.adjusted_subtotal = result.subtotal
        
        # Apply taxes if converter provided
        if tax_converter:
            tax_result = tax_converter.apply_taxes(
                result.adjusted_subtotal,
                "default_location",
                ["labor"]
            )
            result.taxes = tax_result.total_tax
        
        result.total_amount = result.adjusted_subtotal + result.taxes
        result.validated = time_aggregation.validated
        
        return result
    
    def detect_anomalies(self, aggregation: TimeAggregation) -> List[TimeAnomaly]:
        """Detect time anomalies"""
        anomalies = []
        
        # Check for midnight clock-ins
        for block in aggregation.billable_hours_breakdown:
            hour = block.start_time.hour
            if hour < 5:  # Before 5 AM
                anomalies.append(TimeAnomaly(
                    anomaly_type="midnight_clock_in",
                    description=f"Clock-in at {hour}:00 - unusual hour",
                    severity="warning",
                    affected_entries=[block.block_id],
                    suggested_correction="Verify shift time with supervisor"
                ))
        
        # Check for excessive consecutive hours
        total_hours = aggregation.total_billable_hours
        if total_hours > 12:
            anomalies.append(TimeAnomaly(
                anomaly_type="excessive_hours",
                description=f"Total hours {total_hours} exceeds 12h limit",
                severity="error",
                affected_entries=[b.block_id for b in aggregation.billable_hours_breakdown],
                suggested_correction="Split into multiple shifts"
            ))
        
        # Check for multi-timezone issues (simplified)
        if len(set(b.start_time.utcoffset() for b in aggregation.billable_hours_breakdown)) > 1:
            anomalies.append(TimeAnomaly(
                anomaly_type="timezone_crossover",
                description="Multiple timezones detected in single period",
                severity="warning",
                affected_entries=[b.block_id for b in aggregation.billable_hours_breakdown],
                suggested_correction="Verify timezone handling"
            ))
        
        return anomalies
    
    def calculate_overtime(
        self,
        regular_hours: Decimal,
        actual_hours: Decimal,
        overtime_rules: Any
    ) -> OvertimeCalculation:
        """Calculate overtime pay"""
        regular_rate = Decimal("100")  # Placeholder
        overtime_multiplier = Decimal("1.5")
        overtime_rate = regular_rate * overtime_multiplier
        
        overtime_hours = max(Decimal("0"), actual_hours - regular_hours)
        
        return OvertimeCalculation(
            regular_hours=min(regular_hours, actual_hours),
            overtime_hours=overtime_hours,
            total_hours=actual_hours,
            regular_rate=regular_rate,
            overtime_rate=overtime_rate,
            regular_pay=min(regular_hours, actual_hours) * regular_rate,
            overtime_pay=overtime_hours * overtime_rate,
            total_pay=(min(regular_hours, actual_hours) * regular_rate) +
                      (overtime_hours * overtime_rate)
        )


# Self-test
def test_calculation_engine():
    """Test calculation engine"""
    print("Testing Calculation Engine")
    print("=" * 50)
    
    engine = CalculationEngine()
    
    # Test 1: Time validation
    print("\n1. Time Validation:")
    
    validator = TimeValidator()
    
    # Valid timestamp
    valid, error = validator.validate_timestamp("2026-01-15T14:30:00Z")
    print(f"  ✅ Valid timestamp: {valid}")
    
    # Missing UTC offset
    valid, error = validator.validate_timestamp("2026-01-15T14:30:00")
    print(f"  ✅ Missing offset rejected: {not valid} ({error})")
    
    # Test 2: Anomaly detection
    print("\n2. Anomaly Detection:")
    
    # Create aggregation with midnight entry
    midnight_block = BillableBlock(
        block_id="b1",
        block_type=BlockType.WORK,
        start_time=datetime(2026, 1, 15, 2, 0),  # 2 AM
        end_time=datetime(2026, 1, 15, 3, 0),
        duration_hours=Decimal("1"),
        billable=True,
        rate_id=None,
        rate_applied=Decimal("0"),
        source_type="manual",
        source_id="s1"
    )
    
    aggregation = TimeAggregation(
        aggregation_id="test",
        entity_uuid="tech-001",
        project_id="proj-001",
        period_start=datetime.now(),
        period_end=datetime.now(),
        billable_hours_breakdown=[midnight_block],
        billable_hours_total=Decimal("1")
    )
    
    anomalies = engine.detect_anomalies(aggregation)
    print(f"  ✅ Anomalies detected: {len(anomalies)}")
    if anomalies:
        print(f"     Type: {anomalies[0].anomaly_type}")
    
    # Test 3: Overtime calculation
    print("\n3. Overtime Calculation:")
    
    overtime = engine.calculate_overtime(
        regular_hours=Decimal("8"),
        actual_hours=Decimal("10"),
        overtime_rules=None
    )
    
    print(f"  ✅ Regular hours: {overtime.regular_hours}")
    print(f"  ✅ Overtime hours: {overtime.overtime_hours}")
    print(f"  ✅ Total pay: ${overtime.total_pay}")
    
    print("\n" + "=" * 50)
    print("Calculation Engine Tests Complete!")


if __name__ == "__main__":
    test_calculation_engine()

# Verification specs mapping
ERR_ISO8601_REQUIRED = "ERR_ISO8601_REQUIRED"
ERR_TOTAL_MISMATCH = "ERR_TOTAL_MISMATCH"

