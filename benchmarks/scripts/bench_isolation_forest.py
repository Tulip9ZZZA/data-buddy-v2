#!/usr/bin/env python3
"""Isolation forest parity benchmark: our TypeScript implementation vs scikit-learn.

   python3 benchmarks/scripts/bench_isolation_forest.py

Data: Titanic rows with both Age and Fare present (real data, real outliers).
Protocol: both implementations use n_estimators=100, max_samples=256,
seed 42, contamination 0.05. Parity = Jaccard overlap of the flagged top-5%
sets + Spearman rank correlation of the anomaly scores. Writes
results/isolation_forest.json.
"""
import json
import subprocess
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.ensemble import IsolationForest

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
RESULTS = HERE.parent / "results"
CONTAMINATION = 0.05


def main() -> int:
    RESULTS.mkdir(parents=True, exist_ok=True)
    titanic = pd.read_csv(ROOT / "benchmarks/datasets/titanic.csv")
    frame = titanic[["Age", "Fare"]].dropna()
    matrix = frame.to_numpy().tolist()
    n = len(matrix)
    payload = {"matrix": matrix}
    features_path = RESULTS / "iforest_features.json"
    scores_path = RESULTS / "iforest_ts_scores.json"
    features_path.write_text(json.dumps(payload))

    started = time.perf_counter()
    sklearn_model = IsolationForest(n_estimators=100, max_samples=256, random_state=42, contamination=CONTAMINATION)
    sklearn_labels = sklearn_model.fit_predict(np.asarray(matrix))
    sklearn_ms = round((time.perf_counter() - started) * 1000)
    sklearn_scores = -sklearn_model.score_samples(np.asarray(matrix))  # higher = more anomalous

    subprocess.run(
        ["pnpm", "tsx", str(HERE / "isolation_forest.mts"), str(features_path), str(scores_path)],
        check=True,
        cwd=ROOT,
    )
    ts = json.loads(scores_path.read_text())
    ts_scores = np.asarray(ts["scores"])
    ts_ms = ts["elapsedMs"]

    k = int(n * CONTAMINATION)
    sklearn_flagged = set(np.argsort(-sklearn_scores)[:k].tolist())
    ts_flagged = set(np.argsort(-ts_scores)[:k].tolist())
    jaccard = len(sklearn_flagged & ts_flagged) / len(sklearn_flagged | ts_flagged)
    rho = float(spearmanr(sklearn_scores, ts_scores).statistic)

    result = {
        "measuredAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "data": {"dataset": "titanic", "columns": ["Age", "Fare"], "rows": n},
        "params": {"n_estimators": 100, "max_samples": 256, "seed": 42, "contamination": CONTAMINATION},
        "sklearn": {"flagged": len(sklearn_flagged), "elapsedMs": sklearn_ms},
        "typescript": {"flagged": len(ts_flagged), "elapsedMs": ts_ms},
        "parity": {"jaccardTop5pct": round(jaccard, 4), "spearmanRankCorrelation": round(rho, 4)},
        "note": "Jaccard >= 0.7 and rho >= 0.9 are treated as parity for a bounded, single-threaded reimplementation.",
    }
    (RESULTS / "isolation_forest.json").write_text(json.dumps(result, indent=2))
    print(json.dumps(result["parity"], indent=1))
    print(f"sklearn {sklearn_ms}ms vs typescript {ts_ms}ms on {n} rows")
    (RESULTS / "iforest_features.json").unlink(missing_ok=True)
    (RESULTS / "iforest_ts_scores.json").unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
