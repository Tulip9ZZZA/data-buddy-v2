# Data Buddy

**Upload a messy CSV/Excel/JSON file. Get a verdict, the exact rows that prove it, and a reversible repair preview — without your original file ever being touched.**

_An evidence-first data-quality workspace. Every finding carries a deterministic rule ID, a severity, an affected count, and source-row evidence — because a finding without evidence is a warning, not a conclusion._

---

## The problem, in two sentences

Analysts inherit spreadsheets nobody is accountable for and spend hours guessing whether a file is safe to use. Most tools silently "fix" data along the way, which makes the analysis harder to defend, not easier.

## What makes Data Buddy different

**Verdict first, evidence underneath, edits always reversible.** The audit opens with a quality decision — BLOCKED / REVIEW / SAFE — computed from deterministic rules, then shows the exact source rows behind every finding, and any repair is a preview with a before/after ledger over a working copy. The original snapshot is never mutated; there is no server-side copy to mutate.

## What v2 added (this upgrade)

| Layer               | What changed                                                                                                                                                                             | Evidence                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Rule engine         | 10 rules migrated into `rules/` as data: `rule.yaml` + pure detector + tests + fixtures; deterministic `AUDIT.*` IDs; `dbuddy rules lint` enforces the evidence contract                 | `pnpm dbuddy rules lint` → 10/10 pass                                               |
| Benchmarks          | Runtime curve (10k→500k pass, 1M = documented OOM ceiling), polars crossover, 200-row ground truth (P/R = 1.00 on measurable families, FPR 0.00), own-isolation-forest vs sklearn parity | `benchmarks/RESULTS.md` (script-generated)                                          |
| Adversarial defense | Row/column/cell bombs, workbook dimension bombs, macro workbooks, prompt injection in cells — all tested; hostile cells are data, never executed, never alter policy                     | `security/adversarial.md` (12 cases, executable)                                    |
| Test pyramid        | 86 Vitest tests (engine/rules/adversarial/UI) + 4 pytest guards + 4 Playwright journeys (golden path, invalid input, mobile) + coverage 93.92%                                           | `evidence/vitest-run.txt`, `evidence/pytest-run.txt`, `evidence/playwright-run.txt` |
| UI/UX rebuild       | Verdict-first banner, keyboard-navigable finding queue, designed SAFELY_REJECTED states, skip link, aria-live regions — same locked identity                                             | `DESIGN_LOCK.md`, `ui/baseline/` → `ui/after/`                                      |
| Security            | Gitleaks clean over full history; OSV triaged (confirmed/needs_validation/rejected); honest BLOCKED entries for what this sandbox cannot run                                             | `security/REPORT.md`                                                                |
| Decision docs       | 15 ADRs including every conflict between the brief and the repo                                                                                                                          | `DECISIONS.md`                                                                      |

## Benchmarks (measured, not claimed)

|      rows |  parse |  audit |  total | peak RSS | outcome                                        |
| --------: | -----: | -----: | -----: | -------: | ---------------------------------------------- |
|    10,000 |  308ms |  219ms |  570ms |   166 MB | pass                                           |
|   100,000 |  3.75s |  3.22s |  7.35s |   489 MB | pass                                           |
|   500,000 | 12.11s | 10.09s | 22.20s | 1,442 MB | pass                                           |
| 1,000,000 | 29.14s |      — |      — | 1,837 MB | **audit OOM — measured ceiling on 4 GB hosts** |

- **pandas vs polars:** polars wins at every size (no crossover found) — any server-side path uses polars from day one (ADR-04).
- **Ground truth (200 hand-labeled rows across Titanic, UCI Adult, USGS):** precision/recall 1.00 on every measurable rule family; false-positive rate 0.00 on all three datasets. `AUDIT.TYPE.CONFLICT` and `AUDIT.RANGE.BOUNDS` are N/A on these datasets — no such defects exist in them (covered by rule unit tests instead).
- **Isolation forest:** TS reimplementation reaches ρ 0.9821 / Jaccard 0.8919 vs scikit-learn — benchmarked, **not shipped** (ADR-13).

Full curves and methodology: **[benchmarks/RESULTS.md](benchmarks/RESULTS.md)** — every number reproduces with one command from `benchmarks/README.md`.

## Security posture (honest table)

| Check                                  | Result                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Gitleaks (working tree + full history) | clean — `evidence/gitleaks.json`                                                                                                          |
| OSV-Scanner (935 packages)             | triaged: 1 confirmed-in-range (pinned), rest needs_validation/rejected with reachability reasons — `security/REPORT.md`                   |
| Trivy / Semgrep                        | BLOCKED in this sandbox (asset/network limits) — wired into CI so the gate exists                                                         |
| ZAP / Strix / k6 (dynamic)             | SKIPPED — no staging target exists here; scripts and CI wiring ship ready                                                                 |
| Data isolation (RLS-equivalent)        | enforced in router+db layer (`server/db.ts:163`); two-user test provided, live run BLOCKED (no DB in sandbox) — MySQL has no RLS (ADR-02) |
| Prompt injection via cells             | treated as data only; registry byte-identical after hostile runs — `tests/adversarial/`                                                   |

## Try it

```bash
pnpm install
pnpm dev            # http://localhost:3000 — onboarding → upload → verdict
pnpm test           # 86 vitest tests (engine, rules, adversarial, UI)
pnpm dbuddy rules lint
pnpm build && pnpm playwright test    # golden-path + invalid-input + mobile E2E
pytest tests/python -q                # benchmark/dataset integrity gates
```

The Titanic example ships preloaded: dismiss onboarding, open **Evidence**, and the verdict is already there.

## Architecture

One diagram, `docs/architecture.md`. Short version: browser-only intake →
shared engine (`engine/`) + rules-as-data (`rules/`) → verdict + evidence →
optional reversible remediation with ledger; tRPC server persists audit
metadata per user on explicit save; MySQL via drizzle; benchmarks/security
tooling live beside the app, not inside it.

## Known limitations (stated, not hidden)

- The in-browser engine audits up to ~500k rows on a 4 GB host; 1M rows OOMs (measured). Larger files need the polars server path, which is designed (ADR-04) but not built in v2.
- The 20 MB upload cap is a browser-MVP decision, enforced in code.
- No staging deployment exists in this environment, so dynamic security testing and the live two-user run are BLOCKED, not passed. The scripts and CI gates are in place for the first real deploy.
- IQR outliers are review signals by definition — on some datasets they flag distribution tails a human will accept; the eligibility clause (ADR-12) removed the worst noise (discrete counts, identifier columns).
- Knip/jscpd crash on this sandbox's native modules — configs ship, CI runs them.

## Reading order for reviewers

1. `README.md` (this file)
2. `benchmarks/RESULTS.md` — the measured numbers
3. `rules/` + `pnpm dbuddy rules lint` — the framework
4. `security/adversarial.md` + `security/REPORT.md`
5. `DECISIONS.md` — every trade-off, including the ones against the brief

## License

MIT.
