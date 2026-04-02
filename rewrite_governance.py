import re

with open("scripts/policy/governance.py", "r") as f:
    content = f.read()

# I need to add Protocol and dataclass
if 'from dataclasses import dataclass' not in content:
    content = content.replace('from typing import Dict, Any, List, Optional', 'from dataclasses import dataclass\nfrom typing import Dict, Any, List, Optional, Protocol, Tuple')

replacement = """class SystemLoadSensor(Protocol):
    \"\"\"Dependency Injection: Defines how we read system load, allowing test injections.\"\"\"
    def get_load_percentages(self) -> Tuple[float, float]: ...

class DefaultSystemLoadSensor:
    def get_load_percentages(self) -> Tuple[float, float]:
        load1, _, _ = os.getloadavg()
        cpu_count = os.cpu_count() or 1
        load_pct = (load1 / cpu_count) * 100.0
        idle_pct = 100.0 - load_pct
        return load_pct, idle_pct

@dataclass(frozen=True)
class AdmissionConfig:
    \"\"\"Rules Design Pattern & Guard Clauses: Validates boundaries immediately upon creation.\"\"\"
    threshold_pct: float = 80.0
    backoff_sec: int = 30
    critical_threshold: float = 0.95
    warning_threshold: float = 0.80
    adaptive_throttling_enabled: bool = True
    predictive_throttling_enabled: bool = False

    def __post_init__(self):
        # Boundary & Edge Case Guard Clauses (No more silent exception swallowing)
        if not (0.0 <= self.threshold_pct <= 100.0):
            raise ValueError(f"threshold_pct {self.threshold_pct} must be between 0.0 and 100.0")
        if self.backoff_sec < 0:
            raise ValueError("backoff_sec cannot be negative")

class AdmissionController:
    \"\"\"
    Enhanced Proactive Admission Control for High System Load (R-001).
    Implements intelligent load detection, adaptive throttling, and predictive analysis
    integrated with TypeScript process governor for comprehensive CPU management.
    \"\"\"
    def __init__(self, config: AdmissionConfig = None, sensor: SystemLoadSensor = None):
        if config is None:
            # Allow env override for threshold
            env_threshold_str = os.environ.get("AF_ADMISSION_THRESHOLD_PCT")
            threshold_pct = 80.0
            if env_threshold_str:
                try:
                    threshold_pct = float(env_threshold_str)
                except ValueError:
                    pass
            critical_threshold = float(os.environ.get("AF_CPU_CRITICAL_THRESHOLD", "0.95"))
            warning_threshold = float(os.environ.get("AF_CPU_WARNING_THRESHOLD", "0.80"))
            adaptive_enabled = os.environ.get("AF_ADAPTIVE_THROTTLING_ENABLED", "true").lower() != "false"
            predictive_enabled = os.environ.get("AF_PREDICTIVE_THROTTLING", "false").lower() != "false"
            
            # Using defaults for other values or parsed values
            try:
                config = AdmissionConfig(
                    threshold_pct=threshold_pct,
                    critical_threshold=critical_threshold,
                    warning_threshold=warning_threshold,
                    adaptive_throttling_enabled=adaptive_enabled,
                    predictive_throttling_enabled=predictive_enabled
                )
            except ValueError as e:
                # Fallback to safe defaults if env vars provided invalid boundaries
                print(f"[Admission] Warning: Invalid config parameters ({e}). Falling back to safe defaults.")
                config = AdmissionConfig()
                
        self.config = config
        self.sensor = sensor if sensor is not None else DefaultSystemLoadSensor()
        
        self.consecutive_high_load = 0
        self.strike_limit = 2  # 2-strike rule (Retro improvement)

        # Enhanced load tracking
        self.load_history = []
        self.max_history_size = 10
        self.adaptive_throttling_level = 1.0
        self.predictive_load_score = 0.5

    def _update_load_history(self) -> None:
        \"\"\"Update load history for predictive analysis.\"\"\"
        try:
            load_pct, idle_pct = self.sensor.get_load_percentages()
            
            # Natural branch coverage without needing to mock `os.getloadavg()`
            clamped_load = max(0.0, min(load_pct, 100.0))
            clamped_idle = max(0.0, min(idle_pct, 100.0))

            entry = {
                "timestamp": time.time(),
                "cpu_load": clamped_load,
                "idle_percentage": clamped_idle,
            }

            self.load_history.append(entry)
            if len(self.load_history) > self.max_history_size:
                self.load_history.pop(0)

        except Exception as e:
            print(f"[Admission] Warning: Failed to update load history: {e}")

    def _calculate_predictive_score(self) -> float:
        \"\"\"Calculate predictive load score based on trends.\"\"\"
        if len(self.load_history) < 3:
            return 0.5  # Default medium load

        # Calculate trend based on recent history
        recent = self.load_history[-3:]
        load_trend = recent[2]["cpu_load"] - recent[0]["cpu_load"]

        # Predictive score: 0 = low load expected, 1 = high load expected
        trend_score = max(0.0, min(1.0, load_trend / 100.0))
        current_load_score = self.load_history[-1]["cpu_load"] / 100.0 if self.load_history else 0.5

        # Weight current load more heavily than trend
        return current_load_score * 0.7 + trend_score * 0.3

    def _calculate_adaptive_throttling(self) -> float:
        \"\"\"Calculate adaptive throttling level based on system load.\"\"\"
        if not self.config.adaptive_throttling_enabled:
            return 1.0

        current_load = self.load_history[-1]["cpu_load"] / 100.0 if self.load_history else 0.5
        predictive_score = self._calculate_predictive_score()

        # Combine current and predictive load for throttling decision
        combined_load = max(current_load, predictive_score)

        # Calculate throttling level: 1.0 = no throttling, 0.1 = maximum throttling
        throttling_level = 1.0

        if combined_load > self.config.critical_threshold:
            throttling_level = 0.1  # Severe throttling
        elif combined_load > self.config.warning_threshold:
            throttling_level = 0.3  # Moderate throttling
        elif combined_load > (self.config.threshold_pct / 100.0):
            throttling_level = 0.6  # Light throttling

        return throttling_level

    def _get_adaptive_delay(self) -> int:
        \"\"\"Get adaptive delay based on throttling level.\"\"\"
        base_delay = 200  # AF_BACKOFF_MIN_MS equivalent
        return int(base_delay * (1.0 - self.adaptive_throttling_level))

    def check_admission(self) -> bool:
        \"\"\"
        Enhanced admission control with intelligent CPU load detection and adaptive throttling.
        Returns True if admitted, False if rejected (should wait).
        \"\"\"
        # Update load history for predictive analysis
        self._update_load_history()

        # Calculate adaptive throttling level
        self.adaptive_throttling_level = self._calculate_adaptive_throttling()
        self.predictive_load_score = self._calculate_predictive_score()

        try:
            import random
            load_pct, _ = self.sensor.get_load_percentages()
            load_pct = min(max(load_pct, 0.0), 100.0)

            # Predictive load check (if enabled)
            if self.config.predictive_throttling_enabled:
                if self.predictive_load_score > self.config.critical_threshold:
                    adaptive_delay = self._get_adaptive_delay() * 2
                    print(f"[Admission] Predictive high load detected (score: {self.predictive_load_score:.2f}). Adaptive delay: {adaptive_delay}ms")
                    time.sleep(adaptive_delay / 1000.0)  # Convert to seconds
                    return False

            # Multi-tier CPU load response with adaptive delays
            if load_pct > (self.config.critical_threshold * 100.0):
                adaptive_delay = self._get_adaptive_delay()
                jitter = random.random() * 0.1  # 10% jitter
                backoff_with_jitter = adaptive_delay * (1.0 + jitter)
"""

pattern = r"class AdmissionController:[\s\S]*?(?=\s*def wait\()"
if not re.search(pattern, content):
    pattern = r"class AdmissionController:[\s\S]*?(?=\n\s*def check_admission[\s\S]*?except Exception as e:\n\s*print\(\S*\[Admission\] Warning[\s\S]*?return True)"

match = re.search(r"class AdmissionController:.*?(?=    def wait)", content, re.DOTALL)
if match:
    pass
else:
    # print the file to see how check_admission ends
    pass

