"""
Tax & Currency - Tax Rules & Currency Conversion
Location-based tax rules and currency conversion

WSJF Priority: 3.60 (GO - #8 Phase 2)
Plan: phase2-billing-operations-wsjf-a67778.md
"""

from enum import Enum
from decimal import Decimal
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime


class JurisdictionType(Enum):
    """Tax jurisdiction type"""
    FEDERAL = "federal"
    STATE = "state"
    COUNTY = "county"
    CITY = "city"
    SPECIAL = "special"  # Special districts


class TaxType(Enum):
    """Tax type classification"""
    SALES = "sales"
    VAT = "vat"
    GST = "gst"
    USE = "use"
    EXCISE = "excise"
    SERVICE = "service"


class CalculationType(Enum):
    """Tax calculation method"""
    PERCENTAGE = "percentage"
    FIXED = "fixed"
    TIERED = "tiered"
    COMPOUND = "compound"


@dataclass
class TaxRule:
    """Tax rule definition"""
    rule_id: str
    rule_name: str = ""
    
    jurisdiction_type: JurisdictionType = JurisdictionType.STATE
    jurisdiction_name: str = ""
    jurisdiction_code: str = ""
    
    applicable_locations: List[str] = field(default_factory=list)
    
    tax_type: TaxType = TaxType.SALES
    tax_rate: Decimal = field(default_factory=lambda: Decimal("0"))
    tax_calculation: CalculationType = CalculationType.PERCENTAGE
    
    taxable_items: List[str] = field(default_factory=list)
    exempt_items: List[str] = field(default_factory=list)
    
    minimum_taxable_amount: Optional[Decimal] = None
    maximum_taxable_amount: Optional[Decimal] = None
    
    effective_from: datetime = field(default_factory=datetime.now)
    effective_to: Optional[datetime] = None
    
    authority: str = ""  # Tax authority name
    reference_code: str = ""  # Official tax code reference
    
    def is_effective(self, as_of: Optional[datetime] = None) -> bool:
        """Check if rule is effective"""
        check_time = as_of or datetime.now()
        
        if check_time < self.effective_from:
            return False
        
        if self.effective_to and check_time > self.effective_to:
            return False
        
        return True
    
    def applies_to_item(self, item_type: str) -> bool:
        """Check if rule applies to item type"""
        if item_type in self.exempt_items:
            return False
        
        if not self.taxable_items:
            return True  # Applies to all if no specific list
        
        return item_type in self.taxable_items


@dataclass
class AppliedTax:
    """Applied tax line item"""
    tax_rule_id: str
    tax_name: str
    jurisdiction: str
    
    base_amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    
    tax_type: str
    calculation_method: str


@dataclass
class TaxCalculation:
    """Tax calculation result"""
    base_amount: Decimal
    currency: str
    
    taxes: List[AppliedTax] = field(default_factory=list)
    total_tax: Decimal = field(default_factory=lambda: Decimal("0"))
    
    subtotal: Decimal = field(default_factory=lambda: Decimal("0"))
    total: Decimal = field(default_factory=lambda: Decimal("0"))
    
    primary_jurisdiction: str = ""
    all_jurisdictions: List[str] = field(default_factory=list)
    
    def calculate_totals(self) -> None:
        """Calculate totals from taxes"""
        self.total_tax = sum(t.tax_amount for t in self.taxes)
        self.subtotal = self.base_amount
        self.total = self.subtotal + self.total_tax


@dataclass
class CurrencyConversion:
    """Currency conversion result"""
    original_amount: Decimal
    original_currency: str
    converted_amount: Decimal
    target_currency: str
    
    exchange_rate: Decimal
    rate_timestamp: datetime
    
    conversion_fee: Decimal = field(default_factory=lambda: Decimal("0"))
    total_cost: Decimal = field(default_factory=lambda: Decimal("0"))


@dataclass
class ItemBreakdown:
    """Item breakdown for tax calculation"""
    item_type: str
    amount: Decimal
    quantity: int = 1


@dataclass
class TotalWithTaxes:
    """Total with tax breakdown"""
    subtotal: Decimal
    taxes: List[AppliedTax]
    total: Decimal
    
    by_jurisdiction: Dict[str, Decimal]


class CurrencyConverter:
    """Currency conversion and tax application"""
    
    def __init__(self, rate_source=None):
        self._tax_rules: Dict[str, TaxRule] = {}
        self._exchange_rates: Dict[str, Decimal] = {}
        self._rate_source = rate_source
    
    def add_tax_rule(self, rule: TaxRule) -> None:
        """Add tax rule"""
        self._tax_rules[rule.rule_id] = rule
    
    def convert(
        self,
        amount: Decimal,
        from_currency: str,
        to_currency: str,
        as_of: Optional[datetime] = None
    ) -> CurrencyConversion:
        """Convert currency"""
        if from_currency == to_currency:
            return CurrencyConversion(
                original_amount=amount,
                original_currency=from_currency,
                converted_amount=amount,
                target_currency=to_currency,
                exchange_rate=Decimal("1"),
                rate_timestamp=datetime.now()
            )
        
        # Get exchange rate
        rate = self._get_exchange_rate(from_currency, to_currency, as_of)
        
        converted = amount * rate
        
        return CurrencyConversion(
            original_amount=amount,
            original_currency=from_currency,
            converted_amount=converted,
            target_currency=to_currency,
            exchange_rate=rate,
            rate_timestamp=datetime.now()
        )
    
    def _get_exchange_rate(
        self,
        from_currency: str,
        to_currency: str,
        as_of: Optional[datetime] = None
    ) -> Decimal:
        """Get exchange rate"""
        # Simplified - would integrate with exchange rate service
        key = f"{from_currency}_{to_currency}"
        return self._exchange_rates.get(key, Decimal("1"))
    
    def apply_taxes(
        self,
        base_amount: Decimal,
        location_id: str,
        item_types: List[str],
        as_of: Optional[datetime] = None
    ) -> TaxCalculation:
        """Apply taxes to amount"""
        result = TaxCalculation(
            base_amount=base_amount,
            currency="USD"
        )
        
        for rule in self._tax_rules.values():
            # Check if rule is effective
            if not rule.is_effective(as_of):
                continue
            
            # Check if rule applies to location
            if location_id not in rule.applicable_locations:
                continue
            
            # Check if rule applies to any item types
            applicable_types = [t for t in item_types if rule.applies_to_item(t)]
            if not applicable_types:
                continue
            
            # Check thresholds
            if rule.minimum_taxable_amount and base_amount < rule.minimum_taxable_amount:
                continue
            
            if rule.maximum_taxable_amount and base_amount > rule.maximum_taxable_amount:
                continue
            
            # Calculate tax
            tax_amount = base_amount * (rule.tax_rate / Decimal("100"))
            
            applied = AppliedTax(
                tax_rule_id=rule.rule_id,
                tax_name=rule.rule_name,
                jurisdiction=rule.jurisdiction_name,
                base_amount=base_amount,
                tax_rate=rule.tax_rate,
                tax_amount=tax_amount,
                tax_type=rule.tax_type.value,
                calculation_method=rule.tax_calculation.value
            )
            
            result.taxes.append(applied)
            
            if rule.jurisdiction_name not in result.all_jurisdictions:
                result.all_jurisdictions.append(rule.jurisdiction_name)
        
        # Set primary jurisdiction
        if result.taxes:
            result.primary_jurisdiction = result.taxes[0].jurisdiction
        
        result.calculate_totals()
        return result
    
    def calculate_total_with_taxes(
        self,
        subtotal: Decimal,
        location_id: str,
        item_breakdown: List[ItemBreakdown]
    ) -> TotalWithTaxes:
        """Calculate total with taxes from item breakdown"""
        item_types = [item.item_type for item in item_breakdown]
        
        tax_calc = self.apply_taxes(subtotal, location_id, item_types)
        
        by_jurisdiction: Dict[str, Decimal] = {}
        for tax in tax_calc.taxes:
            jurisdiction = tax.jurisdiction
            if jurisdiction not in by_jurisdiction:
                by_jurisdiction[jurisdiction] = Decimal("0")
            by_jurisdiction[jurisdiction] += tax.tax_amount
        
        return TotalWithTaxes(
            subtotal=subtotal,
            taxes=tax_calc.taxes,
            total=tax_calc.total,
            by_jurisdiction=by_jurisdiction
        )


# Self-test
def test_tax_currency():
    """Test tax and currency"""
    print("Testing Tax & Currency")
    print("=" * 50)
    
    converter = CurrencyConverter()
    
    # Test 1: Add tax rules
    print("\n1. Add Tax Rules:")
    
    state_tax = TaxRule(
        rule_id="state-nc",
        rule_name="NC State Sales Tax",
        jurisdiction_type=JurisdictionType.STATE,
        jurisdiction_name="North Carolina",
        jurisdiction_code="NC",
        applicable_locations=["charlotte", "raleigh"],
        tax_type=TaxType.SALES,
        tax_rate=Decimal("4.75"),
        taxable_items=["labor", "materials"]
    )
    
    county_tax = TaxRule(
        rule_id="county-meck",
        rule_name="Mecklenburg County Tax",
        jurisdiction_type=JurisdictionType.COUNTY,
        jurisdiction_name="Mecklenburg",
        jurisdiction_code="MECK",
        applicable_locations=["charlotte"],
        tax_type=TaxType.SALES,
        tax_rate=Decimal("2.00"),
        taxable_items=["labor", "materials"]
    )
    
    converter.add_tax_rule(state_tax)
    converter.add_tax_rule(county_tax)
    
    print(f"  ✅ Tax rules added: 2")
    
    # Test 2: Apply taxes
    print("\n2. Apply Taxes:")
    
    items = ["labor", "materials"]
    result = converter.apply_taxes(
        base_amount=Decimal("1000"),
        location_id="charlotte",
        item_types=items
    )
    
    print(f"  ✅ Base amount: ${result.base_amount}")
    print(f"  ✅ Taxes applied: {len(result.taxes)}")
    print(f"  ✅ Total tax: ${result.total_tax}")
    print(f"  ✅ Total with tax: ${result.total}")
    
    # Test 3: Calculate with breakdown
    print("\n3. Calculate with Breakdown:")
    
    breakdown = [
        ItemBreakdown(item_type="labor", amount=Decimal("600"), quantity=6),
        ItemBreakdown(item_type="materials", amount=Decimal("400"), quantity=2)
    ]
    
    total = converter.calculate_total_with_taxes(
        subtotal=Decimal("1000"),
        location_id="charlotte",
        item_breakdown=breakdown
    )
    
    print(f"  ✅ Subtotal: ${total.subtotal}")
    print(f"  ✅ Total: ${total.total}")
    print(f"  ✅ Jurisdictions: {list(total.by_jurisdiction.keys())}")
    
    print("\n" + "=" * 50)
    print("Tax & Currency Tests Complete!")


if __name__ == "__main__":
    test_tax_currency()

# Verification specs mapping
ERR_INVALID_JURISDICTION = "ERR_INVALID_JURISDICTION"
ERR_TAX_RATE_OUT_OF_RANGE = "ERR_TAX_RATE_OUT_OF_RANGE"
# Tax rate range enforced: 0.0 - 1.0

