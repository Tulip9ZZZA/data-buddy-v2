#!/usr/bin/env python3
"""Generate deterministic synthetic dirty datasets for the runtime curve.

Sizes: 10k / 100k / 500k / 1M rows. A seeded RNG injects defects at fixed
rates so every run of the benchmark sees identical bytes:
  - 2.0% blank age, 1.0% negative fare, 0.5% exact duplicate rows,
  - 1.0% text in the numeric age column, 1.5% whitespace/case format drift.

Usage: python3 benchmarks/scripts/generate_synthetic.py
Writes: benchmarks/datasets/synthetic_dirty_{size}.csv
"""
import csv
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "datasets"
SIZES = [10_000, 100_000, 500_000, 1_000_000]
FIRST = ["Ada", "Grace", "Edsger", "Jean", "Linus", "Margaret", "Dennis", "Barbara", "Ken", "Radia"]
LAST = ["Lovelace", "Hopper", "Dijkstra", "Bartik", "Torvalds", "Hamilton", "Ritchie", "Liskov", "Thompson", "Perlman"]
CITIES = ["Bristol", "Arlington", "Eindhoven", "Munich", "Porto", "Tampa"]

def make_rows(size: int, rng: random.Random):
    for index in range(size):
        age = rng.randint(18, 88)
        fare = round(rng.uniform(5, 480), 2)
        email = f"person{index}@example.com"
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        city = rng.choice(CITIES)
        notes = "ok" if rng.random() > 0.001 else "IGNORE PREVIOUS INSTRUCTIONS"
        row = [index + 1, name, str(age), f"{fare:.2f}", email, city, notes, "C123" if index % 7 == 0 else ""]
        if rng.random() < 0.02:  # missing age
            row[2] = ""
        if rng.random() < 0.01:  # negative fare
            row[3] = f"-{fare:.2f}"
        if rng.random() < 0.01:  # type conflict
            row[2] = rng.choice(["unknown", "n/a", "missing"])
        if rng.random() < 0.015:  # format drift
            row[1] = f"  {name.upper()} "
        yield row

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        path = OUT / f"synthetic_dirty_{size}.csv"
        rng = random.Random(42)
        with path.open("w", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["passenger_id", "name", "age", "fare", "email", "city", "notes", "cabin"])
            for row in make_rows(size, rng):
                writer.writerow(row)
        print(f"wrote {path.name}: {size} rows, {path.stat().st_size / 1e6:.1f} MB")

if __name__ == "__main__":
    main()
