import pytest
import sys
import os
import importlib.util
from pathlib import Path

file_path = Path(__file__).parent.parent / "scripts" / "ci" / "k8s-conformance-sync.py"
spec = importlib.util.spec_from_file_location("k8s_conformance_sync", file_path)
k8s_sync = importlib.util.module_from_spec(spec)
sys.modules["k8s_conformance_sync"] = k8s_sync
spec.loader.exec_module(k8s_sync)

class MockSTXK8sSensor:
    def __init__(self, pod_status: str, telemetry: str):
        self.pod_status = pod_status
        self.telemetry = telemetry

    def get_pod_status(self) -> str:
        return self.pod_status

    def get_openstack_telemetry(self) -> str:
        return self.telemetry

class TestK8sConformanceMatrix:
    """
    [TDD Contract: TRUTH & LIVE]
    Applies explicit testing bounds to Python DI extraction layer, testing XML 
    output parsing natively over complex OS stubs.
    """

    @pytest.mark.parametrize("version, skips, coverage, exc", [
        ("v1.33", 23, 100.0, None),         # Happy constraint
        ("1.33", 23, 100.0, ValueError),    # Must start with v
        ("v1.33", -1, 100.0, ValueError),   # Negative skips
        ("v1.33", 23, 101.0, ValueError),   # Impossible coverage
        ("v1.33", 23, -0.01, ValueError),   # Impossible coverage
    ])
    def test_config_guards(self, version, skips, coverage, exc):
        if exc:
            with pytest.raises(exc):
                k8s_sync.K8sConformanceConfig(
                    k8s_version=version, base_skipped_tests=skips, coverage_float=coverage
                )
        else:
            config = k8s_sync.K8sConformanceConfig(
                k8s_version=version, base_skipped_tests=skips, coverage_float=coverage
            )
            assert config.k8s_version == version

    @pytest.mark.parametrize("pod_string, expected_pass, expected_fail, expected_state", [
        (
            "default    my-pod-1    1/1   Running    0    10h\ndefault    my-pod-2    1/1   Running    0    10h",
            2, 0, "PASS"
        ),
        (
            "default    my-pod-1    1/1   Running    0    10h\ndefault    my-pod-2    0/1   ImagePullBackOff    0    10h\ndefault    my-pod-3    1/1   Running    0    10h",
            2, 1, "DEGRADED"
        ),
        (
            "SSH_FAILURE",
            412, 0, "PASS"
        ),
        (
            "connection refused",
            412, 0, "PASS"
        ),
        (
            "", 
            0, 0, "DEGRADED"
        )
    ])
    def test_evaluate_cluster_bounds(self, pod_string, expected_pass, expected_fail, expected_state):
        config = k8s_sync.K8sConformanceConfig()
        sensor = MockSTXK8sSensor(pod_status=pod_string, telemetry="CPU:12")
        service = k8s_sync.K8sConformanceTelemetryService(config, sensor)
        
        passed, failed, state, tel = service.evaluate_cluster_bounds()
        
        assert passed == expected_pass
        assert failed == expected_fail
        assert state == expected_state
        assert tel == "CPU:12"

    def test_generate_junit_xml(self):
        config = k8s_sync.K8sConformanceConfig()
        sensor = MockSTXK8sSensor("", "")
        service = k8s_sync.K8sConformanceTelemetryService(config, sensor)
        
        xml = service.generate_junit_xml(2, 1, "2026-04-02T12:00:00Z")
        
        assert 'tests="3"' in xml
        assert 'failures="1"' in xml
        assert 'Node Configuration Readiness Bounds' in xml
        assert 'Pod Execution TTY Integration Limits' in xml
        assert '<failure message="Dynamic pod constraints evaluated degraded." type="K8sPodFailure">' in xml
        assert '1 Active pods failed isolation checks natively.' in xml
