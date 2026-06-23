import os
import subprocess
import pytest
from pytest_bdd import scenario, given, when, then

HARNESS_DIR = "apps/agent-harness"

@scenario('features/agent_harness.feature', 'The generated harness is healthy and passes the doctor check')
def test_agent_harness_healthy():
    pass

@given('the repository root contains the "apps/agent-harness" directory')
def check_harness_directory():
    assert os.path.isdir(HARNESS_DIR), f"Directory {HARNESS_DIR} does not exist. Run metaharness first."

@when('I run "npm run doctor" within the harness directory', target_fixture='doctor_result')
def run_harness_doctor():
    # Execute harness doctor and capture result
    result = subprocess.run(
        ["npm", "run", "doctor"],
        cwd=HARNESS_DIR,
        capture_output=True,
        text=True
    )
    return result

@then('it should exit successfully')
def check_doctor_success(doctor_result):
    assert doctor_result.returncode == 0, f"Doctor failed:\nSTDOUT:\n{doctor_result.stdout}\nSTDERR:\n{doctor_result.stderr}"

@then('the ".harness/manifest.json" file should exist')
def check_manifest_exists():
    manifest_path = os.path.join(HARNESS_DIR, ".harness", "manifest.json")
    assert os.path.isfile(manifest_path), f"Manifest file not found at {manifest_path}"
