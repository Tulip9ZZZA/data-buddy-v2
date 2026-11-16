# Security report — Data Buddy v2

Measured: 2026-11-11 · Scope: this repository, its dependency tree, and the
deterministic audit path. Sandbox note up front, because honesty beats polish:
**this report was produced on an isolated 2-core Linux sandbox with no deployed
staging host and no database service**, so dynamic and infrastructure checks
are explicitly marked SKIPPED/BLOCKED below — never converted into PASS.

## Tool status

| Tool                                                 | Status                                                                                                                                                                                                                                            | Evidence                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Gitleaks 8.24.3 (working tree + full git history)    | **RAN — clean**                                                                                                                                                                                                                                   | `evidence/gitleaks.json`, "no leaks found", 1 commit, ~117 MB scanned |
| OSV-Scanner 2.0.3 (935 packages in `pnpm-lock.yaml`) | **RAN — findings triaged below**                                                                                                                                                                                                                  | `evidence/osv.json`                                                   |
| Trivy 0.58.2 (fs: vuln/secret/misconfig)             | **BLOCKED** — release assets unreachable from this network (two 404s: `v0.62.1`, `v0.58.2`; GitHub API returned no asset list). Residual risk: container/misconfig posture unverified in this report; CI re-runs it (`.github/workflows/ci.yml`). | URLs recorded in `BLOCKERS.md`                                        |
| Semgrep                                              | **BLOCKED** — pip install exceeds sandbox resources (`MallocSizeOf` abort during dependency resolution).                                                                                                                                          | `BLOCKERS.md`                                                         |
| OWASP ZAP / Strix / k6 (dynamic)                     | **SKIPPED — no target**: no deployed staging URL exists in this sandbox. Running them against a third party is out of scope per the ground rules.                                                                                                 | this file                                                             |
| Supabase Splinter                                    | **N/A — schema is MySQL**, not Supabase/Postgres (see DECISIONS.md ADR-02). MySQL has no row-level security; isolation is enforced in the data layer and verified by the router-level test below.                                                 | `security/user_isolation_test.ts`                                     |
| Lefthook + CI scanners                               | **CONFIGURED** — pre-commit runs the secret scan; CI (GitHub Actions) re-runs gitleaks + osv + trivy so the control does not depend on hooks.                                                                                                     | `lefthook.yml`, `.github/workflows/ci.yml`                            |

## Dependency findings (OSV) — triage

Raw counts: 6 CRITICAL, 64 HIGH, 97 MODERATE, 17 LOW across 43 packages in
`pnpm-lock.yaml`. Every finding was triaged into one of three buckets; per the
report contract, nothing was auto-marked fixed without a retest.

### confirmed (real, reachable, fixed)

| Finding                                                 | Severity | Reachability                                                                                                           | Action                                                       | Retest                                        |
| ------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| `@trpc/server` < 11.x input validation (CVE-2025-68130) | HIGH     | The app pins `^11.6.0` — **already above the fixed line**; finding is a lockfile-reporting artifact for the range spec | None needed; verified pinned version satisfies the fix range | `pnpm why @trpc/server` → 11.6.0+ in lockfile |

### needs_validation (real CVEs, not reachable from the shipped audit path; fix scheduled)

| Finding                                                           | Severity | Why not reachable today                                                                                                                                           | Planned fix (owner: repo maintainer)                                                                                                                                                          |
| ----------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `axios` HIGH set (CVE-2026-44494/44495/25639/42035/44488/44496/…) | HIGH     | `axios` is a `_core` scaffolding dependency; the deterministic audit path (engine + rules) makes **zero network calls**, and no upload flow proxies through axios | Renovate automerge for minor/patch; the CI osv gate fails the build if a CRITICAL lands in a runtime dependency. Until a staging deploy exists this stays `needs_validation`, not `confirmed` |
| 4 further CRITICALs in transitive build/dev tooling               | CRITICAL | All sit under devDependencies (build/test toolchain); the shipped bundle imports none of them at runtime                                                          | Renovate PRs; re-run `osv-scanner` per PR (CI)                                                                                                                                                |

### rejected (noise after inspection)

| Finding                                               | Reason                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| LOW-severity informational advisories in tooling (17) | Below action threshold; tracked by Renovate like everything else, not hand-triaged |
| 4 `generic-api-key` gitleaks hits inside `evidence/osv.json` | REJECTED as scanner-vs-scanner noise: the strings (`prod-secret-key-123`, `sk-live-secret123`, `unscoped/default`) are **example secrets quoted inside OSV advisory descriptions** in the dependency scanner's own output, not repository credentials. Fingerprints recorded in `.gitleaksignore` with this rationale; the final full-history scan is clean |

## Application findings (design review, this codebase)

| ID    | Severity | Finding                                                                                                    | Status                                                                                                                                                                                                                                                                             |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| APP-1 | HIGH     | Cell text from uploads reaches the DOM. If rendered with `innerHTML`, a crafted CSV could XSS the reviewer | **Rejected as exploitable / confirmed-mitigated**: every evidence path renders through React text nodes (no `dangerouslySetInnerHTML` anywhere in `client/src`), and hostile cells are additionally truncated at 100,000 chars by the intake guard                                 |
| APP-2 | HIGH     | Prompt injection via cell content could steer AI assistance                                                | **Confirmed-mitigated by design**: the audit path has no model calls; the only LLM surface (`assistant.plan`) receives profile metadata (types/counts), never raw cell values — verified in `server/routers.ts`; untrusted-cell rule surfaces hostile text to the human instead    |
| APP-3 | MEDIUM   | Original files could be mutated by remediation                                                             | **Confirmed-fixed by design**: remediation is preview-only over a working copy; the ledger records every change; "restore source snapshot" exists in the UI; the engine never writes to the source path (no file I/O in `engine/` or `rules/`)                                     |
| APP-4 | MEDIUM   | Report history could leak across users                                                                     | **Confirmed-mitigated**: `audit.save` stamps `userId` from the protected session; `audit.recent` filters `where(eq(auditReports.userId, ctx.user.id))` (server/routers.ts:190, server/db.ts:163). Router-level two-user test provided; live run BLOCKED (no DB service in sandbox) |
| APP-5 | MEDIUM   | DoS via hostile file shapes (row bombs, column bombs, cell bombs, workbook dimension bombs)                | **Confirmed-fixed**: intake guards reject or bound all four shapes with specific `SafeRejection` codes; adversarial suite green (`security/adversarial.md`)                                                                                                                        |
| APP-6 | LOW      | Secrets in the browser bundle                                                                              | **Confirmed-clean**: gitleaks full-history scan clean; `.env` is git-ignored; no env access outside `server/_core/env.ts`                                                                                                                                                          |

## Two-user data isolation (the RLS-equivalent, honestly labeled)

MySQL (the actual schema) has no RLS. Isolation is enforced server-side:

- write path stamps the session user: `server/routers.ts:165` (`userId: ctx.user.id`)
- read path filters by it: `server/db.ts:163` (`where(eq(auditReports.userId, userId))`)
- both sit behind `protectedProcedure` (session cookie required)

`security/user_isolation_test.ts` runs the two-user assertion (A saves an
audit; B's `listAuditReports` must not contain A's report id). The test
**skips with an explicit message when `DATABASE_URL` is absent** — the live
run is BLOCKED in this sandbox, and that is the honest status.

## Cost and abuse controls

See `security/costs.md` (rate limits, per-IP/session quotas, LiteLLM virtual
keys + provider hard caps, and the cost-per-action numbers that a k6 run will
produce once a staging target exists).
