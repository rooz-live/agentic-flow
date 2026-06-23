import os
import requests
import pytest
from pytest_bdd import scenarios, given, when, then

# Load all scenarios from the feature file
scenarios('features/oro_crm_workflow.feature')

# Global fixtures
LIVE = os.environ.get('LIVE_EDGE_TEST') == 'true'
ORO_URL = os.environ.get('ORO_URL', 'https://crm.bhopti.com')

# Skip if not live edge
@pytest.fixture(autouse=True)
def skip_if_not_live():
    if not LIVE:
        pytest.skip("Skipping network boundary test because LIVE_EDGE_TEST!=true")

@given('the OroCommerce CRM is active on the network')
def crm_is_active():
    pass

@when('I check the "/health" endpoint', target_fixture="response")
def check_health_endpoint():
    return requests.get(f"{ORO_URL}/health", timeout=10)

@then('the response status should be less than 500')
def response_status_less_than_500(response):
    assert response.status_code < 500

@when('I visit the "/user/login" page', target_fixture="response")
def visit_login_page():
    return requests.get(f"{ORO_URL}/user/login", timeout=10)

@then('the page should contain the text "OroCommerce" or "Sovereign Swarm" or "Login"')
def page_contains_text(response):
    text = response.text
    assert "OroCommerce" in text or "Sovereign Swarm" in text or "Login" in text

@when('I POST to "/api/login_check" with test credentials', target_fixture="response")
def post_login_check():
    return requests.post(
        f"{ORO_URL}/api/login_check",
        json={"username": "admin", "password": "sovereign_swarm_root"},
        timeout=10
    )

@then('the API should respond with an authorized or expected unauthorized status')
def api_responds_authorized_or_unauthorized(response):
    assert response.status_code in [200, 401, 403]
