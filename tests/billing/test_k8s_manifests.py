"""
K8s billing manifests — symbol-contract tests.
Verifies the manifests exist and contain required symbols.
No cluster connection required.
"""
from pathlib import Path
import pytest

K8S = Path(__file__).parent.parent.parent / "k8s" / "billing"


def _read(name: str) -> str:
    return (K8S / name).read_text()


class TestNamespaceManifest:
    def test_namespace_file_exists(self):
        assert (K8S / "namespace.yaml").exists()

    def test_namespace_is_billing(self):
        assert "name: billing" in _read("namespace.yaml")


class TestDeploymentManifest:
    def test_deployment_file_exists(self):
        assert (K8S / "deployment.yaml").exists()

    def test_billing_gateway_deployment(self):
        content = _read("deployment.yaml")
        assert "name: billing-gateway" in content

    def test_invoice_engine_deployment(self):
        assert "name: invoice-engine" in _read("deployment.yaml")

    def test_secrets_referenced_not_inlined(self):
        content = _read("deployment.yaml")
        assert "secretKeyRef" in content
        assert "PLACEHOLDER" not in content  # no hardcoded creds in deployment

    def test_resource_limits_set(self):
        assert "limits:" in _read("deployment.yaml")

    def test_health_probes_set(self):
        content = _read("deployment.yaml")
        assert "readinessProbe" in content
        assert "livenessProbe" in content


class TestServiceManifest:
    def test_service_file_exists(self):
        assert (K8S / "service.yaml").exists()

    def test_billing_gateway_service(self):
        assert "name: billing-gateway" in _read("service.yaml")

    def test_orocrm_bridge_fqdn(self):
        assert "crm.bhopti.com" in _read("service.yaml")

    def test_hostbill_bridge_fqdn(self):
        assert "billing.bhopti.com" in _read("service.yaml")


class TestIngressManifest:
    def test_ingress_file_exists(self):
        assert (K8S / "ingress.yaml").exists()

    def test_public_fqdn_billing_bhopti(self):
        assert "billing.bhopti.com" in _read("ingress.yaml")

    def test_stripe_webhook_path(self):
        assert "/webhooks/stripe" in _read("ingress.yaml")

    def test_tls_configured(self):
        assert "tls:" in _read("ingress.yaml")

    def test_cert_manager_annotation(self):
        assert "cert-manager.io/cluster-issuer" in _read("ingress.yaml")

    def test_rate_limiting_at_edge(self):
        # Anti-tampering: rate limit enforced at ingress, not just app layer
        assert "limit-rps" in _read("ingress.yaml")

    def test_ssl_redirect_enforced(self):
        assert "ssl-redirect" in _read("ingress.yaml")


class TestSecretsTemplate:
    def test_secrets_template_exists(self):
        assert (K8S / "secrets-template.yaml").exists()

    def test_no_real_secrets_committed(self):
        content = _read("secrets-template.yaml")
        # Placeholders must be present, not real values
        assert "PLACEHOLDER" in content

    def test_github_secrets_documented(self):
        content = _read("secrets-template.yaml")
        assert "HOSTBILL_API_KEY" in content
        assert "STRIPE_WEBHOOK_SECRET" in content
