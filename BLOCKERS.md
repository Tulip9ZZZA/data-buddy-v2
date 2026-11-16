# BLOCKERS — ambiguity register and blocked work

Per the ground rules: a blocked or skipped step is recorded here with its
reason, residual risk, and minimal reproduction. Nothing below is converted
into PASS.

## Q-01 · Deployment target does not exist in this environment — BLOCKED (dynamic security + live RLS)

- **What is blocked:** OWASP ZAP baseline scan, Strix pentest, k6 load test
  against a staging host, the live two-user isolation run, the deployed-build
  golden-path re-verification on a public URL.
- **Why:** this sandbox has no staging deployment and no MySQL service; the
  ground rules forbid testing third-party systems.
- **Residual risk:** dynamic findings (auth flows, header posture, rate
  limiting in practice) are unverified. Static equivalents (router-layer
  isolation test, intake guards) all pass.
- **Reproduction:** `curl $STAGING_URL` → no host. `security/costs.md` and
  `.github/workflows/ci.yml` wire these steps for the first real deploy.

## Q-02 · Brief assumed Python/FastAPI + Supabase; repo is TypeScript + MySQL — CONFLICT RESOLVED, RECORDED

- **The conflict:** method steps reference `detector.py`, pytest coverage of
  the engine, and Supabase RLS. The repository is TS/tRPC/MySQL.
- **Resolution:** ADR-02 (TypeScript engine; pytest guards the benchmark
  lab) and `security/user_isolation_test.ts` for the RLS-equivalent. Not
  silently picked — documented here and in DECISIONS.md.

## Q-03 · Knip crashes in this sandbox — BLOCKED (tool-level)

- **Reproduction:** `pnpm dlx knip` → native abort in `oxc-parser`
  (`raw-transfer/common.js:294`), sandbox-only. Config ships as
  `knip.json`; CI runs it on GitHub runners.
- **Residual risk:** unused exports/deps may exist; typecheck + 86 passing
  tests bound the blast radius.

## Q-04 · jscpd produces no report in this sandbox — BLOCKED (tool-level)

- **Reproduction:** `pnpm dlx jscpd --min-tokens 60 engine rules client/src/lib server` →
  no output file. Same native/binary constraints as Q-03; wired for CI.

## Q-05 · Trivy + Semgrep unreachable — BLOCKED (network-level)

- **Trivy:** release assets 404 from this network (v0.62.1 and v0.58.2
  both); GitHub releases API returns no asset list for the repo.
- **Semgrep:** `pip install semgrep` aborts during dependency resolution.
- **Residual risk:** container/IaC posture unverified. Gitleaks (secrets) and
  OSV (deps) ran clean/triaged; CI re-runs the full set.

## Q-06 · "200 rows labeled by you" — methodology made explicit, not a blocker

Ground truth is labeled mechanically from the documented rubric
(`benchmarks/ground_truth/LABELING_RUBRIC.md`). This measures
engine-vs-contract agreement, not subjective dirtiness; RESULTS.md states
this plainly, and the labeling loop still caught two real contract gaps
(ADR-11, ADR-12) — which is the point of the exercise.

## Q-07 · ECC / Superpowers / Matt Pocock skills / Elephant-Goldfish / Impeccable / Taste Skill — NOT INSTALLED (environment)

- **Why:** these are agent-orchestration skills from another toolchain; the
  sandbox exposes none of them and installing them is outside its network
  permissions. The upgrade therefore followed their _intent_ with built-in
  equivalents: spec→tickets→tests sequencing, fresh-context review via the
  independent vitest/pytest/playwright suites, identity lock via
  `DESIGN_LOCK.md`, and a taste-gate equivalent via rendered screenshot
  evidence at 1440/390 widths (`ui/after/`).
- **Residual risk:** none functional; process-formality only.
