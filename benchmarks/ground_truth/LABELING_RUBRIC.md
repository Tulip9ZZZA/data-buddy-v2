# Ground-truth labeling rubric

The 200-row ground truth (`labels.csv`) is labeled **mechanically from this
rubric**, not by eyeballing. A row carries a `1` for a family only when the
deterministic test below says so. Consequence (stated plainly): this measures
**engine-vs-rubric agreement**, i.e. that the implementation matches the
documented contract — not subjective "dirtiness". It can still catch real
bugs: a rule that never fires, fires on the wrong rows, or disagrees with its
own contract shows up as recall/precision loss here.

## Sampling

| Dataset                   | Rows sampled | Source rows | Seed |
| ------------------------- | -----------: | ----------- | ---- |
| Titanic                   |           75 | 891         | 42   |
| UCI Adult                 |           75 | 32,561      | 42   |
| USGS monthly earthquakes  |           40 | 9,826       | 42   |
| Injected exact duplicates |           10 | —           | 42   |

`sampling.py` / `make_ground_truth.py` draw with `random.Random(42)` /
`pandas.sample(random_state=42)`; re-running reproduces the same 200 rows.

## Family tests

- **missing** — any cell whose stripped, lowercased text is in
  `{ "", "null", "n/a", "na", "none", "-", "?" }` ("?" is Adult's placeholder).
- **duplicate** — the row's full cell tuple appears earlier in the same
  dataset (10 duplicates were injected deterministically so this family is
  measurable on real data; flagged with `duplicate=1`).
- **type_conflict** — a cell in a numeric-benchmark column (Titanic `Fare`,
  USGS `mag`) that does not parse as a float.
- **range** — reserved: none of the three datasets carry a documented range
  family (no age-like column with violations), so this column stays 0 and the
  family is reported as N/A in RESULTS.md rather than invented.
- **format** — reserved for email-like columns (none exist in these three
  datasets); stays 0 and is reported as N/A.
- **outlier** — a numeric value outside the 1.5×IQR fences computed on the
  FULL dataset column (Titanic `Fare`, USGS `mag`).

`row_key` is the full cell tuple joined with U+241F so the evaluator can map
labels back to engine row numbers without assuming any ordering.
