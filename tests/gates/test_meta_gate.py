"""Unit tests for scripts/gates/meta_gate.py (referenced-script existence gate)."""

import importlib.util
import pathlib


def _load_meta():
    here = pathlib.Path(__file__).resolve()
    for parent in here.parents:
        cand = parent / "scripts" / "gates" / "meta_gate.py"
        if cand.exists():
            spec = importlib.util.spec_from_file_location("meta_gate", cand)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod
    raise RuntimeError("meta_gate.py not found above test file")


meta = _load_meta()


def _write(path: pathlib.Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def test_referenced_scripts_extracts_paths(tmp_path):
    wf = tmp_path / ".github/workflows/ci.yml"
    _write(wf, "steps:\n  - run: ./scripts/one.sh ci\n")
    refs = meta.referenced_scripts([str(wf)])
    assert "scripts/one.sh" in refs


def test_find_missing_flags_absent(tmp_path):
    _write(tmp_path / ".github/workflows/ci.yml", "run: ./scripts/one.sh ci\n")
    _write(tmp_path / ".pre-commit-config.yaml", "entry: bash scripts/hooks/x.sh\n")
    missing = meta.find_missing(str(tmp_path))
    assert "scripts/one.sh" in missing
    assert "scripts/hooks/x.sh" in missing


def test_find_missing_passes_when_present(tmp_path):
    _write(tmp_path / ".github/workflows/ci.yml", "run: ./scripts/one.sh ci\n")
    _write(tmp_path / "scripts/one.sh", "#!/usr/bin/env bash\n")
    assert meta.find_missing(str(tmp_path)) == {}


def test_pre_commit_python_reference_detected(tmp_path):
    _write(
        tmp_path / ".pre-commit-config.yaml",
        "entry: python3 scripts/gates/scorecard_gate.py --precommit\n",
    )
    missing = meta.find_missing(str(tmp_path))
    assert "scripts/gates/scorecard_gate.py" in missing
