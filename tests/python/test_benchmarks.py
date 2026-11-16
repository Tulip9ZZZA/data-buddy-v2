"""Python-side test pyramid: benchmark + dataset integrity gates.

  pytest tests/python -q

These complement the Vitest suites (which own the engine) by guarding the
benchmark lab: manifests must match bytes, labels must be well-formed, and
the generator must be deterministic.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "benchmarks" / "scripts"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_dataset_manifest_matches_files():
    manifest = json.loads((ROOT / "benchmarks/datasets/manifest.json").read_text())
    for dataset in manifest["datasets"]:
        path = ROOT / "benchmarks/datasets" / dataset["file"]
        assert path.exists(), f"missing dataset file: {path.name} (fetch via {dataset['url']})"
        assert sha256(path) == dataset["sha256"], f"sha256 mismatch for {path.name}"


def test_ground_truth_has_200_labeled_rows():
    labels = (ROOT / "benchmarks/ground_truth/labels.csv").read_text().strip().splitlines()
    assert len(labels) == 201  # header + 200 rows
    families = labels[0].split(",")[2:]
    assert set(families) == {"missing", "duplicate", "type_conflict", "range", "format", "outlier"}


def test_synthetic_generator_is_deterministic(tmp_path):
    script = ROOT / "benchmarks/scripts/generate_synthetic.py"
    # Generate a 10k dataset twice and compare bytes.
    out = ROOT / "benchmarks/datasets"
    first = (out / "synthetic_dirty_10000.csv").read_bytes()
    subprocess.run([sys.executable, str(script)], check=True, capture_output=True)
    second = (out / "synthetic_dirty_10000.csv").read_bytes()
    assert first == second, "generator output changed between runs (seed broke)"


def test_results_md_numbers_come_from_json():
    """No invented numbers: every table row in RESULTS.md must trace to a JSON artifact."""
    results = (ROOT / "benchmarks/RESULTS.md").read_text()
    curve = json.loads((ROOT / "benchmarks/results/runtime_curve.json").read_text())
    for run in curve["runs"]:
        if run.get("totalMs"):
            assert f"{run['rows']:,}" in results, f"runtime row for {run['rows']} missing from RESULTS.md"
    precision = json.loads((ROOT / "benchmarks/results/precision_recall.json").read_text())
    for family, stats in precision["perFamily"].items():
        if stats["precision"] is not None:
            assert f"{stats['precision']:.2f}" in results, f"precision for {family} missing from RESULTS.md"
