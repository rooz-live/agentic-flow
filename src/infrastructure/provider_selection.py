from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional
import decimal

@dataclass
class WSJFScore:
    user_business_value: int
    time_criticality: int
    risk_reduction: int
    job_size: int

    @property
    def cost_of_delay(self) -> int:
        return self.user_business_value + self.time_criticality + self.risk_reduction

    @property
    def score(self) -> float:
        if self.job_size == 0:
            return float('inf')
        return self.cost_of_delay / self.job_size

@dataclass
class ServerSpec:
    vcpu: int
    ram_gb: int
    disk_gb: int
    os: str
    price_monthly: float
    region: str

class CloudProvider(ABC):
    @abstractmethod
    def get_name(self) -> str:
        pass

    @abstractmethod
    def get_available_server(self, max_price: float, min_vcpu: int, min_ram: int, min_disk: int) -> Optional[ServerSpec]:
        pass

    @abstractmethod
    def calculate_wsjf(self, spec: ServerSpec) -> WSJFScore:
        pass

class AWSLightsailProvider(CloudProvider):
    def get_name(self) -> str:
        return "AWS Lightsail"

    def get_available_server(self, max_price: float, min_vcpu: int, min_ram: int, min_disk: int) -> Optional[ServerSpec]:
        # Hardcoded for Phase 1 simulation/API stub
        # "Reality check: AWS Lightsail: clean API + predictable bundles/pricing. Great for automation."
        candidates = [
            ServerSpec(1, 1, 40, "ubuntu_22_04", 5.00, "us-east-1"), # $5 bundle
            ServerSpec(2, 2, 60, "ubuntu_22_04", 10.00, "us-east-1"), # $10 bundle
            ServerSpec(2, 4, 80, "ubuntu_22_04", 20.00, "us-east-1"), # $20 bundle - Too expensive
        ]

        best_candidate = None
        for c in candidates:
            if c.price_monthly <= max_price and c.vcpu >= min_vcpu and c.ram_gb >= min_ram and c.disk_gb >= min_disk:
                 # Prefer cheapest compliance
                 if best_candidate is None or c.price_monthly < best_candidate.price_monthly:
                     best_candidate = c

        return best_candidate

    def calculate_wsjf(self, spec: ServerSpec) -> WSJFScore:
        # WSJF Scoring based on user rules:
        # CoD = BV + TC + RR/OE (constant for same task)
        # Job Size (JS) differentiates. Lightsail has low JS (mature API).

        # Arbitrary fixed values for the project goal
        bv = 5
        tc = 8
        rr = 5
        # JS: 1 (Very low complexity/effort)
        js = 1

        return WSJFScore(bv, tc, rr, js)

class HivelocityProvider(CloudProvider):
    def get_name(self) -> str:
        return "Hivelocity"

    def get_available_server(self, max_price: float, min_vcpu: int, min_ram: int, min_disk: int) -> Optional[ServerSpec]:
        # "Reality check: Hivelocity... A 'VPS ordering' API may or may not exist."
        # Stubbing as "None/Expensive" effectively making it lose unless manual override
        # Or if we assume there IS a VPS option but it might be pricier or harder to automate.

        # Let's say there is a hypothetical VPS at $8
        candidates = [
             ServerSpec(1, 2, 50, "ubuntu_22_04", 8.00, "nyc1"),
        ]

        best_candidate = None
        for c in candidates:
             if c.price_monthly <= max_price and c.vcpu >= min_vcpu and c.ram_gb >= min_ram and c.disk_gb >= min_disk:
                   if best_candidate is None or c.price_monthly < best_candidate.price_monthly:
                     best_candidate = c
        return best_candidate

    def calculate_wsjf(self, spec: ServerSpec) -> WSJFScore:
         # Hivelocity might have higher JS due to "integration complexity / operational burden"
        bv = 5
        tc = 8
        rr = 5
        # JS: 3 (Higher effort to integrate/maintain if API is less mature or manual)
        js = 3

        return WSJFScore(bv, tc, rr, js)

class ProviderSelector:
    def __init__(self, providers: List[CloudProvider]):
        self.providers = providers

    def select_best_provider(self, max_price: float = 10.0, min_vcpu: int = 1, min_ram: int = 1, min_disk: int = 25) -> tuple[Optional[CloudProvider], Optional[ServerSpec]]:
        best_provider = None
        best_spec = None
        best_wsjf = -1.0

        for provider in self.providers:
            spec = provider.get_available_server(max_price, min_vcpu, min_ram, min_disk)
            if spec:
                wsjf_obj = provider.calculate_wsjf(spec)
                score = wsjf_obj.score

                # Tie breaking: cost?
                if score > best_wsjf:
                    best_wsjf = score
                    best_provider = provider
                    best_spec = spec
                elif score == best_wsjf and best_spec:
                    if spec.price_monthly < best_spec.price_monthly:
                         best_provider = provider
                         best_spec = spec

        return best_provider, best_spec
