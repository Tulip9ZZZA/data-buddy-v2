# Benchmarks

Evidence lab for Data Buddy: runtime, memory, engine-vs-library comparisons,
and ground-truth accuracy. Every published number in `RESULTS.md` is produced
by a script in `scripts/` and stored as JSON in `results/`.

## Reproduce (one command each)

```bash
# 0. verify the dataset snapshots match the manifest (sha256)
python3 benchmarks/scripts/fetch_datasets.py

# 1. synthetic dirty datasets (deterministic, seed 42): 10k → 1M rows
python3 benchmarks/scripts/generate_synthetic.py

# 2. engine runtime + peak RSS curve (Node, SheetJS intake path)
node --max-old-space-size=3072 node_modules/tsx/dist/cli.mjs benchmarks/scripts/bench_engine.mjs

#    …or probe a single size with a different heap (500k / 1M ceiling checks)
node --max-old-space-size=3584 node_modules/tsx/dist/cli.mjs benchmarks/scripts/bench_single.mjs 500000

# 3. pandas vs polars crossover on identical pipelines
python3 benchmarks/scripts/bench_pandas_polars.py

# 4. precision/recall vs the 200-row hand-labeled ground truth
python3 benchmarks/scripts/make_ground_truth.py          # regenerate labels (seeded)
pnpm tsx benchmarks/scripts/evaluate_ground_truth.mts    # engine vs labels

# 5. own isolation forest vs scikit-learn parity
python3 benchmarks/scripts/bench_isolation_forest.py

# 6. render RESULTS.md + charts from the JSONs above
python3 benchmarks/scripts/make_results.py
```

## What lives where

```
benchmarks/
  RESULTS.md            # published numbers (generated — never hand-edited)
  datasets/             # pinned public CSVs + synthetic files + manifest.json
  ground_truth/         # LABELING_RUBRIC.md + labels.csv (200 rows)
  results/              # JSON artifacts + PNG charts (script outputs)
  scripts/              # every benchmark/label/eval script
```

## Notes

- Python deps: `pandas polars scikit-learn matplotlib scipy` (see `scripts/requirements.txt`).
- The engine benchmark measures the **full intake path** the browser app uses
  (SheetJS parse → normalise → rule audit), not just the rules.
- On a 4 GB host the in-browser engine audits 500k rows but OOMs at 1M; the
  measured numbers and the polars fallback decision live in `RESULTS.md` and
  `DECISIONS.md` (ADR-04).
