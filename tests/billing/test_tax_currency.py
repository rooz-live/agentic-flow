#!/usr/bin/env python3
"""
Unit tests for src/tax/tax_currency.py

Tax & Currency — WSJF 3.60 (Phase 2)
Structural model: tests/unit/test_convergence_calculator.py
"""

import sys
from pathlib import Path

# Add project root to path for local imports
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from decimal import Decimal

import pytest

# ─── Safe imports with skip guards ──────────────────────────────────────────

try:
    from src.tax.tax_currency import (
        CurrencyConverter,
        TaxRule,
        TaxCalculation,
        TaxType,
        JurisdictionType,
        CalculationType,
        AppliedTax,
        CurrencyConversion,
    )
    _HAS_TAX = True
except ImportError:
    _HAS_TAX = False

pytestmark = pytest.mark.skipif(
    not _HAS_TAX, reason="tax_currency module not importable"
)


# ─── Helpers ────────────────────────────────────────────────────────────────

def _nc_state_rule() -> TaxRule:
    """North Carolina state sales tax rule fixture."""
    return TaxRule(
        rule_id="state-nc",
        rule_name="NC State Sales Tax",
        jurisdiction_type=JurisdictionType.STATE,
        jurisdiction_name="North Carolina",
        jurisdiction_code="NC",
        applicable_locations=["charlotte", "raleigh"],
        tax_type=TaxType.SALES,
        tax_rate=Decimal("4.75"),
        taxable_items=["labor", "materials"],
    )


def _zero_rate_rule() -> TaxRule:
    """Zero-rate jurisdiction rule (e.g. Oregon — no sales tax)."""
    return TaxRule(
        rule_id="state-or",
        rule_name="Oregon No Sales Tax",
        jurisdiction_type=JurisdictionType.STATE,
        jurisdiction_name="Oregon",
        jurisdiction_code="OR",
        applicable_locations=["portland"],
        tax_type=TaxType.SALES,
        tax_rate=Decimal("0"),
        taxable_items=["labor", "materials"],
    )


# ─── TestTaxEngineInstantiation ─────────────────────────────────────────────

class TestTaxEngineInstantiation:
    """Can import CurrencyConverter (the tax engine) from src.tax.tax_currency."""

    def test_import_currency_converter(self):
        """CurrencyConverter is importable."""
        assert CurrencyConverter is not None

    def test_instantiate_converter(self):
        """CurrencyConverter() can be instantiated with no arguments."""
        converter = CurrencyConverter()
        assert converter is not None

    def test_has_apply_taxes_method(self):
        """CurrencyConverter exposes apply_taxes()."""
        converter = CurrencyConverter()
        assert hasattr(converter, "apply_taxes")
        assert callable(converter.apply_taxes)

    def test_has_convert_method(self):
        """CurrencyConverter exposes convert()."""
        converter = CurrencyConverter()
        assert hasattr(converter, "convert")
        assert callable(converter.convert)

    def test_has_add_tax_rule_method(self):
        """CurrencyConverter exposes add_tax_rule()."""
        converter = CurrencyConverter()
        assert hasattr(converter, "add_tax_rule")
        assert callable(converter.add_tax_rule)


# ─── TestJurisdictionTax ────────────────────────────────────────────────────

class TestJurisdictionTax:
    """Calculate tax for a known jurisdiction returns correct rate."""

    def test_nc_state_tax_rate(self):
        """NC 4.75% sales tax on $1000 base = $47.50 tax."""
        converter = CurrencyConverter()
        converter.add_tax_rule(_nc_state_rule())

        result = converter.apply_taxes(
            base_amount=Decimal("1000"),
            location_id="charlotte",
            item_types=["labor"],
        )
        assert isinstance(result, TaxCalculation)
        assert result.total_tax == Decimal("47.50") or result.total_tax == Decimal("47.5")

    def test_tax_result_has_correct_total(self):
        """total = base_amount + total_tax."""
        converter = CurrencyConverter()
        converter.add_tax_rule(_nc_state_rule())

        result = converter.apply_taxes(
            base_amount=Decimal("1000"),
            location_id="charlotte",
            item_types=["labor"],
        )
        expected_total = Decimal("1000") + result.total_tax
        assert result.total == expected_total

    def test_tax_applied_for_matching_location(self):
        """Tax is applied when location matches applicable_locations."""
        converter = CurrencyConverter()
        converter.add_tax_rule(_nc_state_rule())

        result = converter.apply_taxes(
            base_amount=Decimal("500"),
            location_id="raleigh",
            item_types=["materials"],
        )
        assert len(result.taxes) == 1
        assert result.taxes[0].jurisdiction == "North Carolina"

    def test_no_tax_for_non_matching_location(self):
        """No tax applied when location doesn't match."""
        converter = CurrencyConverter()
        converter.add_tax_rule(_nc_state_rule())

        result = converter.apply_taxes(
            base_amount=Decimal("500"),
            location_id="portland",
            item_types=["labor"],
        )
        assert len(result.taxes) == 0
        assert result.total_tax == Decimal("0")


# ─── TestCurrencyConversion ─────────────────────────────────────────────────

class TestCurrencyConversion:
    """If conversion method exists, test known conversion."""

    def test_same_currency_no_conversion(self):
        """USD -> USD returns same amount with rate=1."""
        converter = CurrencyConverter()
        result = converter.convert(
            amount=Decimal("100.00"),
            from_currency="USD",
            to_currency="USD",
        )
        assert isinstance(result, CurrencyConversion)
        assert result.converted_amount == Decimal("100.00")
        assert result.exchange_rate == Decimal("1")

    def test_conversion_returns_currency_conversion_object(self):
        """convert() returns a CurrencyConversion dataclass."""
        converter = CurrencyConverter()
        result = converter.convert(
            amount=Decimal("250.00"),
            from_currency="USD",
            to_currency="EUR",
        )
        assert isinstance(result, CurrencyConversion)
        assert result.original_currency == "USD"
        assert result.target_currency == "EUR"

    def test_conversion_preserves_original_amount(self):
        """Original amount is preserved in conversion result."""
        converter = CurrencyConverter()
        result = converter.convert(
            amount=Decimal("999.99"),
            from_currency="USD",
            to_currency="GBP",
        )
        assert result.original_amount == Decimal("999.99")


# ─── TestZeroTaxJurisdiction ────────────────────────────────────────────────

class TestZeroTaxJurisdiction:
    """Jurisdiction with 0% rate returns tax_amount=0."""

    def test_zero_rate_produces_zero_tax(self):
        """Oregon 0% tax rate results in $0 tax on any amount."""
        converter = CurrencyConverter()
        converter.add_tax_rule(_zero_rate_rule())

        result = converter.apply_taxes(
            base_amount=Decimal("5000"),
            location_id="portland",
            item_types=["labor"],
        )
        assert result.total_tax == Decimal("0")

    def test_zero_rate_total_equals_subtotal(self):
        """With 0% tax, total == subtotal."""
        converter = CurrencyConverter()
        converter.add_tax_rule(_zero_rate_rule())

        result = converter.apply_taxes(
            base_amount=Decimal("1234.56"),
            location_id="portland",
            item_types=["materials"],
        )
        assert result.total == result.subtotal

    def test_zero_rate_still_records_tax_line(self):
        """Zero-rate jurisdiction still generates a tax line (for audit)."""
        converter = CurrencyConverter()
        converter.add_tax_rule(_zero_rate_rule())

        result = converter.apply_taxes(
            base_amount=Decimal("100"),
            location_id="portland",
            item_types=["labor"],
        )
        # Zero-rate rules still apply and produce a tax line
        assert len(result.taxes) == 1
        assert result.taxes[0].tax_amount == Decimal("0")


# ─── TestUnknownJurisdiction ────────────────────────────────────────────────

class TestUnknownJurisdiction:
    """Unknown jurisdiction returns 0 tax or raises known error."""

    def test_no_rules_returns_zero_tax(self):
        """No tax rules loaded -> total_tax is 0."""
        converter = CurrencyConverter()
        result = converter.apply_taxes(
            base_amount=Decimal("1000"),
            location_id="unknown-location",
            item_types=["labor"],
        )
        assert result.total_tax == Decimal("0")

    def test_no_rules_total_equals_base(self):
        """With no applicable rules, total == base_amount."""
        converter = CurrencyConverter()
        result = converter.apply_taxes(
            base_amount=Decimal("500"),
            location_id="nowhere",
            item_types=["labor"],
        )
        assert result.total == Decimal("500")

    def test_unmatched_location_returns_zero_tax(self):
        """Rules exist but location doesn't match -> 0 tax."""
        converter = CurrencyConverter()
        converter.add_tax_rule(_nc_state_rule())

        result = converter.apply_taxes(
            base_amount=Decimal("1000"),
            location_id="unknown-city",
            item_types=["labor"],
        )
        assert result.total_tax == Decimal("0")
        assert len(result.taxes) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
