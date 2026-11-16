#!/usr/bin/env python3
"""Build the 200-row hand-labeled ground truth set.

   python3 benchmarks/scripts/make_ground_truth.py

Method (documented in ground_truth/LABELING_RUBRIC.md):
  - 75 rows sampled deterministically (seed 42) from Titanic (891 rows),
  - 85 from UCI Adult (32,561 rows): 70 random + 15 of its 24 real
    exact-duplicate rows, so AUDIT.DUPLICATE.EXACT is measured on real data,
  - 40 from the USGS monthly earthquake feed (9,826 rows).
Labels follow the rubric mechanically. source_row is the file position
(header line = row 1), matching the engine's evidence rowNumber convention.
"""
import csv
import json
import re
import random
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
GT = HERE.parent / "ground_truth"
DATASETS = HERE.parent / "datasets"

BLANKS = {"", "null", "n/a", "na", "none", "-", "?"}
FAMILIES = ["missing", "duplicate", "type_conflict", "range", "format", "outlier"]


def iqr_fences(series: pd.Series):
    clean = pd.to_numeric(series, errors="coerce").dropna()
    q1, q3 = clean.quantile(0.25), clean.quantile(0.75)
    spread = q3 - q1
    return q1 - 1.5 * spread, q3 + 1.5 * spread


def label_row(cells: list[str], fences: dict[int, tuple]) -> dict[str, int]:
    labels = {family: 0 for family in FAMILIES}
    labels["missing"] = int(any(str(cell).strip().lower() in BLANKS for cell in cells))
    # format = engine's deterministic trim policy: any cell that changes under strip()
    labels["format"] = int(any(str(cell) != str(cell).strip() for cell in cells))
    for index, cell in enumerate(cells):
        text = str(cell)
        if index in fences and text.strip() not in BLANKS:
            low, high = fences[index]
            try:
                value = float(text.replace(",", ""))
                if value < low or value > high:
                    labels["outlier"] = 1
            except ValueError:
                labels["type_conflict"] = 1
    return labels


def numeric_fences(frame: pd.DataFrame) -> dict[int, tuple]:
    """Fences for columns eligible under the IQR rule contract (rule.yaml):
    >=80% parseable, >=8 finite values, >10 distinct values, non-identifier name."""
    fences: dict[int, tuple] = {}
    for index, column in enumerate(frame.columns):
        if re.search(r"(id|name|ticket|code)", str(column), re.IGNORECASE):
            continue
        numeric = pd.to_numeric(frame[column], errors="coerce")
        finite = numeric.dropna()
        if len(finite) < 8:
            continue
        if finite.nunique() <= 10:
            continue
        fences[index] = iqr_fences(frame[column])
    return fences


def main() -> None:
    GT.mkdir(parents=True, exist_ok=True)
    labeled: list[dict] = []

    titanic = pd.read_csv(DATASETS / "titanic.csv")
    titanic_fences = numeric_fences(titanic)
    for _, row in titanic.sample(75, random_state=42).iterrows():
        cells = ["" if pd.isna(value) else str(value) for value in row.tolist()]
        labeled.append({"dataset": "titanic", "source_row": int(row.name) + 2, **label_row(cells, titanic_fences)})

    adult = pd.read_csv(DATASETS / "adult.csv", header=None)  # keep raw spacing: the engine sees it too
    random_state = 42
    sampled_adult = adult.sample(70, random_state=random_state)
    duplicate_positions = adult.index[adult.duplicated(keep="first")].tolist()
    chosen_duplicate_positions = sorted(duplicate_positions)[:15]
    for position in chosen_duplicate_positions:
        sampled_adult.loc[position] = adult.loc[position]
    adult_fences = numeric_fences(adult)
    for _, row in sampled_adult.iterrows():
        cells = [str(value) for value in row.tolist()]
        labels = label_row(cells, adult_fences)
        labels["duplicate"] = int(row.name in chosen_duplicate_positions)
        labeled.append({"dataset": "adult", "source_row": int(row.name) + 2, **labels})

    usgs = pd.read_csv(DATASETS / "usgs_earthquakes_month.csv")
    usgs_fences = numeric_fences(usgs)
    for _, row in usgs.sample(40, random_state=42).iterrows():
        cells = ["" if pd.isna(value) else str(value) for value in row.tolist()]
        labeled.append({"dataset": "usgs", "source_row": int(row.name) + 2, **label_row(cells, usgs_fences)})

    fieldnames = ["dataset", "source_row", *FAMILIES]
    with (GT / "labels.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for item in labeled[:200]:
            writer.writerow({field: item.get(field, 0) for field in fieldnames})
    counts = {family: sum(item[family] for item in labeled[:200]) for family in FAMILIES}
    counts["total"] = min(len(labeled), 200)
    (GT / "label_counts.json").write_text(json.dumps(counts, indent=2))
    print("labels:", counts)


if __name__ == "__main__":
    main()
