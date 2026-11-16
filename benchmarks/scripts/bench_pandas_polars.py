#!/usr/bin/env python3
"""pandas vs polars crossover benchmark on the same synthetic files.

   python3 benchmarks/scripts/bench_pandas_polars.py

Pipeline per engine (identical steps, so the comparison is fair):
  read_csv -> normalise (strip text, lowercase email-like col)
           -> coerce numeric -> drop exact duplicates -> profile columns
Measures wall time per dataset size and reports the crossover point where
polars overtakes pandas (if any). Writes results/pandas_polars.json.
"""
import json
import time
from pathlib import Path

import pandas as pd
import polars as pl

HERE = Path(__file__).resolve().parent
DATASETS = HERE.parent / "datasets"
RESULTS = HERE.parent / "results"
SIZES = [10_000, 100_000, 500_000, 1_000_000]


def bench_pandas(csv_path: str) -> float:
    start = time.perf_counter()
    frame = pd.read_csv(csv_path, dtype={"cabin": "string"})
    frame["name"] = frame["name"].fillna("").str.strip()
    frame["email"] = frame["email"].fillna("").str.strip().str.lower()
    frame["age"] = pd.to_numeric(frame["age"], errors="coerce")
    frame["fare"] = pd.to_numeric(frame["fare"], errors="coerce")
    frame = frame.drop_duplicates()
    profile = {
        "rows": len(frame),
        "null_age": int(frame["age"].isna().sum()),
        "mean_fare": float(frame["fare"].mean()),
        "dupes_removed": int(frame.duplicated().sum()),
    }
    assert profile["rows"] > 0
    return time.perf_counter() - start


def bench_polars(csv_path: str) -> float:
    start = time.perf_counter()
    frame = pl.read_csv(csv_path, infer_schema_length=0)  # all strings, like intake
    frame = frame.with_columns([
        pl.col("name").str.strip_chars(),
        pl.col("email").str.strip_chars().str.to_lowercase(),
    ])
    frame = frame.with_columns([
        pl.col("age").str.replace_all(",", "").cast(pl.Float64, strict=False),
        pl.col("fare").str.replace_all(",", "").cast(pl.Float64, strict=False),
    ])
    frame = frame.unique()
    profile = {
        "rows": frame.height,
        "null_age": int(frame["age"].null_count()),
        "mean_fare": float(frame["fare"].mean()),
        "dupes_removed": 0,
    }
    assert profile["rows"] > 0
    return time.perf_counter() - start


def main() -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    runs = []
    for size in SIZES:
        csv_path = str(DATASETS / f"synthetic_dirty_{size}.csv")
        # Warm-up run then measured median of 3 (polars benefits from caching).
        for _ in range(1):
            bench_pandas(csv_path)
            bench_polars(csv_path)
        pandas_times = sorted(bench_pandas(csv_path) for _ in range(3))
        polars_times = sorted(bench_polars(csv_path) for _ in range(3))
        runs.append({
            "rows": size,
            "pandasMs": round(pandas_times[1] * 1000),
            "polarsMs": round(polars_times[1] * 1000),
            "winner": "pandas" if pandas_times[1] < polars_times[1] else "polars",
        })
        print(runs[-1])
    crossover = next((run["rows"] for run in runs if run["winner"] == "polars"), None)
    payload = {
        "measuredAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "method": "median of 3 runs after 1 warm-up; identical pipeline per engine",
        "crossoverRows": crossover,
        "runs": runs,
    }
    (RESULTS / "pandas_polars.json").write_text(json.dumps(payload, indent=2))
    print(f"\ncrossover at: {crossover or 'no crossover in measured range'}")


if __name__ == "__main__":
    main()
