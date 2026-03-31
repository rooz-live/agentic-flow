
import pytest
from src.infrastructure.provider_selection import (
    ProviderSelector,
    AWSLightsailProvider,
    HivelocityProvider,
    WSJFScore,
    ServerSpec
)

@pytest.fixture
def selector():
    return ProviderSelector([
        AWSLightsailProvider(),
        HivelocityProvider()
    ])

def test_aws_lightsail_selection(selector):
    """
    AWS Lightsail has JS=1, Hivelocity has JS=3.
    Given same CoD params, AWS should win on WSJF score.
    """
    provider, spec = selector.select_best_provider()

    assert provider is not None
    assert provider.get_name() == "AWS Lightsail"
    assert spec is not None
    assert spec.price_monthly <= 10.0
    assert spec.vcpu >= 1
    assert spec.ram_gb >= 1

def test_constraints_filtering():
    """Ensure expensive options are filtered out."""
    aws = AWSLightsailProvider()

    # Test strict budget
    spec = aws.get_available_server(max_price=4.0, min_vcpu=1, min_ram=1, min_disk=1)
    assert spec is None # Cheapest is $5

    # Test strict RAM
    # Cheapest $5 has 1GB RAM. If we need 2GB, we should get the $10 one.
    spec = aws.get_available_server(max_price=10.0, min_vcpu=1, min_ram=2, min_disk=1)
    assert spec is not None
    assert spec.ram_gb == 2
    assert spec.price_monthly == 10.0

def test_wsjf_calculation():
    aws = AWSLightsailProvider()
    spec = ServerSpec(1, 1, 40, "ubuntu", 5.0, "us-east-1")
    score = aws.calculate_wsjf(spec)

    # CoD = 5 + 8 + 5 = 18
    # JS = 1
    # Score = 18.0
    assert score.cost_of_delay == 18
    assert score.score == 18.0

    hv = HivelocityProvider()
    score_hv = hv.calculate_wsjf(spec)
    # CoD = 18
    # JS = 3
    # Score = 6.0
    assert score_hv.score == 6.0

def test_no_provider_available():
    """If budget is too low for all providers."""
    selector = ProviderSelector([AWSLightsailProvider(), HivelocityProvider()])
    provider, spec = selector.select_best_provider(max_price=1.0) # $1 budget

    assert provider is None
    assert spec is None
