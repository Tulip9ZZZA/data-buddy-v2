#!/usr/bin/env python3
"""Fetch the public benchmark datasets and verify their sha256 against the manifest.

Usage:  python3 benchmarks/scripts/fetch_datasets.py
Fails loudly if a file is missing or its hash does not match manifest.json,
so RESULTS.md numbers can always be tied to exact bytes.
"""
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATASETS = HERE.parent / "datasets"
MANIFEST = DATASETS / "manifest.json"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    manifest = json.loads(MANIFEST.read_text())
    failures = 0
    for dataset in manifest["datasets"]:
        path = DATASETS / dataset["file"]
        if not path.exists():
            print(f"MISSING  {dataset['name']}: {path.name} (download from {dataset['url']})")
            failures += 1
            continue
        actual = sha256(path)
        status = "OK      " if actual == dataset["sha256"] else "MISMATCH"
        if actual != dataset["sha256"]:
            failures += 1
        print(f"{status}  {dataset['name']}: {path.name} sha256={actual[:16]}…")
    if failures:
        print(f"\n{failures} dataset check(s) failed — do not trust cached RESULTS.md numbers.")
        return 1
    print("\nAll datasets match the manifest.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
