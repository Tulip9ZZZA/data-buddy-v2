# DECISIONS — the ADR record

Status vocabulary: ACCEPTED · REJECTED · DEFERRED · SUPERSEDED. Every ADR
names the day and the evidence that forced the decision. Where the upgrade
brief conflicted with the repository, the ADR records the conflict and the
choice instead of silently picking one.

## ADR-01 · Visual identity is locked; UI/UX is rebuilt on it — ACCEPTED (2026-11-11)

The brief allows IA/layout/interaction changes only. `DESIGN_LOCK.md` freezes
palette, fonts, texture, mascot, logo mark, and spacing tokens; the v2 rebuild
added three components (verdict banner, intake-error card, skip link) built
exclusively from existing tokens. Rejected in passing: dark-mode inversion and
any new accent color (no ADR number wasted on variants of this).

## ADR-02 · The stack is TypeScript/tRPC, not Python/FastAPI — ACCEPTED (2026-11-11)

The brief assumes "Python backend (FastAPI), Postgres (Supabase)". The actual
repository is TypeScript end-to-end: React/Vite client, tRPC server, **MySQL**
via drizzle (`drizzle/schema.ts` uses `mysql-core`). Building a parallel
Python engine would have produced dead code that never runs in the product.
Decision: implement the rule engine in TypeScript (`engine/`, `rules/`), keep
Python for the benchmark lab (`benchmarks/scripts/*.py`) where pandas/polars
are the comparison targets. Consequences: "pytest ≥85% coverage" maps to
**Vitest** coverage for engine code (achieved: 93.92%); pytest still runs and
guards the benchmark artifacts (`tests/python`). Supabase RLS is N/A; the
two-user isolation contract is enforced and tested at the router/db layer
(`security/user_isolation_test.ts`).

## ADR-03 · Rules are data (`rule.yaml`), registry is generated — ACCEPTED (2026-11-11)

Each rule folder carries `rule.yaml` (contract: id, severity, repair,
evidence fields/limit), a pure `detector.ts`, `test_rule.test.ts`, and
`fixtures/`. `pnpm dbuddy rules sync` generates `rules/registry.generated.ts`
from the YAML; `pnpm dbuddy rules lint` re-generates and fails on drift, so
YAML stays the single source of truth while the browser bundle imports a
plain TS module (no filesystem tricks in Vite). Deterministic IDs:
`AUDIT.<FAMILY>.<NAME>[:<scope>]`, semver'd per rule.

## ADR-04 · pandas→polars: polars everywhere server-side, no crossover found — ACCEPTED (2026-11-11)

Measured on identical pipelines (`benchmarks/results/pandas_polars.json`):
polars wins at every size — 10k: 7ms vs 31ms; 100k: 104ms vs 524ms; 500k:
629ms vs 2,776ms; 1M: 567ms vs 6,289ms. No crossover exists in the measured
range; the hypothesized "pandas until 100k" never materializes. Decision: if a
server-side ingestion path is added for >500k files (the in-browser engine's
measured ceiling), it uses polars from day one; pandas is not used in the
product. The in-browser engine stays SheetJS-based for ≤500k files.

## ADR-05 · File never mutated; remediation is preview + ledger — ACCEPTED (2026-11-11)

The engine has no file I/O. `previewRemediation` operates on a working copy,
every change/skip/exclusion is a `LedgerEntry`, and "Restore source snapshot"
reverts the working copy in one click. The strongest evidence: the adversarial
test asserts `JSON.stringify(rows)` is byte-identical before/after a full
audit run with hostile content (`tests/adversarial/adversarial.test.ts`).

## ADR-06 · No LLM chat in the product; assistant stays a metadata-only planner — ACCEPTED (2026-11-11)

The pre-existing `assistant.plan` surface receives profile metadata (column
names, types, counts — never cell values) and returns a review-first plan.
v2 did not extend it. Data Buddy's credibility is deterministic, auditable,
reproducible; chat would undermine exactly that. Promptfoo is therefore
**deliberately scoped N/A for v2**: there is no model-facing text path from
file contents to red-team. If the planner ever sees cell text, Promptfoo
red-teaming becomes a release gate first.

## ADR-07 · Verdict-first UX — ACCEPTED (2026-11-11)

The evidence page opens with a quality-decision banner (BLOCKED / REVIEW /
SAFE + engine version + row/column counts + sampled flag) before any finding
list. The verdict derives mechanically from severity counts
(`engine/contract.ts deriveVerdict`). Rationale: the design doc's own page
direction says "the risky rule first, then the rows that prove it" — the
banner is the honest top of that hierarchy.

## ADR-08 · Original files are never stored server-side — ACCEPTED (2026-11-11)

Parsing happens in the browser; only audit metadata (counts, findings,
ledger) is persisted on explicit save. Cheaper privacy story, no object
storage, and it keeps the "never mutated" promise absolute — there is no
server-side copy to mutate.

## ADR-09 · Adversarial handling is a first-class feature (guards + SafeRejection) — ACCEPTED (2026-11-11)

Rather than scattered try/catch, intake bounds live in `engine/guards.ts` and
`engine/intake.ts` with named rejection codes (`ROWS_ABOVE_HARD_LIMIT`,
`COLUMNS_ABOVE_LIMIT`, `WORKBOOK_DIMENSION_BOMB`, `EXTENSION_NOT_ALLOWED`,
`EMPTY_FILE`, `FILE_TOO_LARGE`). The UI renders SAFELY_REJECTED as a designed
error card with the code, not a toast. Duplicate detection switches to
documented sampled mode above 2M rows. Every guard has a test in
`tests/adversarial/` and a row in `security/adversarial.md`.

## ADR-10 · Deterministic IDs replaced v1 slugs — ACCEPTED (2026-11-11)

v1 IDs (`type-conflict:age`) became `AUDIT.TYPE.CONFLICT:age`. Migration
touched every call site (UI, tests, benchmarks). Cost: mechanical. Benefit:
rule families group in tooling, IDs are collision-proof across teams, and the
design doc's own example (`AUDIT.TYPE.CONFLICT:age`) finally matches the code.

## ADR-11 · `"?"` joins the blank-token set — ACCEPTED (2026-11-11)

Ground-truth evaluation (recall 0.92 on missing values) surfaced that UCI
Adult's `"?"` placeholder was invisible to `AUDIT.MISSING.VALUES`. Adding `"?"`
to `blankValues` closed the gap (final recall 1.00); a rule test pins the
behavior. This is the benchmark lab doing its job: a real contract gap found
and fixed by measurement, not vibes.

## ADR-12 · IQR outlier rule gains an eligibility clause — ACCEPTED (2026-11-11)

The ground-truth loop also showed the IQR rule flooding the queue: fences on
discrete count columns (Parch/SibSp: 7 distinct values) and identifier
columns (Ticket) are statistically meaningless. The rule now requires >10
distinct values and a non-identifier name (`rule.yaml` documents the
eligibility as contract). Result: outlier precision vs the aligned rubric
went 0.20 → 1.00 with recall unchanged at 1.00, and FPR across all three
datasets is 0.00.

## ADR-13 · Isolation forest is benchmarked but NOT shipped — DEFERRED (2026-11-11)

A bounded TS isolation forest (`benchmarks/scripts/isolation_forest.mts`)
reaches ρ=0.9821 rank agreement and 0.8919 Jaccard parity with scikit-learn
on Titanic Age+Fare, at 34ms for 714 rows. Shipping it as a rule would add a
probabilistic finding class to a product whose wedge is deterministic
evidence; without a separate review tier and an accuracy story per domain it
would dilute trust. Deferred until v3 with a dedicated "statistical signals"
finding class. The benchmark stays reproducible via
`benchmarks/scripts/bench_isolation_forest.py`.

## ADR-14 · Repo layout keeps `client/`+`server/`; evidence folders added at top level — ACCEPTED (2026-11-11)

The brief sketches `web/`, `api/`, `tests/`. Renaming `client/` would churn
every import, the Vite config, and the alias map for zero functional gain,
one week before submission. Decision: keep the working layout, add
`rules/`, `engine/`, `benchmarks/`, `security/`, `tests/`, `ui/`, `quality/`,
`docs/` at top level. The README shows the reviewer the intended reading
order instead.

## ADR-15 · Promptfoo installed-but-N/A; Lefthook/Renovate/Knip/jscpd configured — PARTIALLY BLOCKED (2026-11-11)

Lefthook and Renovate ship real config (`lefthook.yml`, `renovate.json`).
Knip and jscpd configs ship (`knip.json`, `quality/`), but both crash on this
sandbox (oxc-parser native abort; see `BLOCKERS.md` Q-03/Q-04) — recorded as
BLOCKED, never as PASS. CI runs them on GitHub runners where native modules
build normally.
