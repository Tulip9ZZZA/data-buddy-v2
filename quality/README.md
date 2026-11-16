# Quality tooling outputs

Artifacts from the code-quality layer. Where a tool could not run in the
build sandbox, the raw failure is preserved here as evidence (never a fake
PASS) and the tool is wired into CI where it runs on standard runners.

| Tool                                            | Status                                                                           | Artifact                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------- |
| Vitest + coverage (engine/rules/lib)            | 93.92% lines / 90.02% branches / 86 tests green                                  | `../evidence/vitest-coverage.txt` |
| pytest (benchmark + dataset integrity)          | 4 passed                                                                         | `../evidence/pytest-run.txt`      |
| Playwright (golden path, invalid input, mobile) | 4 passed                                                                         | `../evidence/playwright-run.log`  |
| tsc --noEmit                                    | clean                                                                            | CI step `pnpm check`              |
| `dbuddy rules lint`                             | 10/10 rules satisfy the evidence contract                                        | CI step                           |
| Gitleaks                                        | clean (full history)                                                             | `../evidence/gitleaks.json`       |
| OSV-Scanner                                     | 43 packages with findings, triaged in `../security/REPORT.md`                    | `../evidence/osv.json`            |
| Knip                                            | BLOCKED in sandbox (oxc-parser native abort) — config `../knip.json`, runs in CI | `../evidence/knip.txt`            |
| jscpd                                           | BLOCKED in sandbox (no output) — wired into CI                                   | `../evidence/` (absence recorded) |
| Lefthook                                        | config ships; hooks are convenience, CI repeats checks                           | `../lefthook.yml`                 |
| Renovate                                        | config ships (weekly, automerge dev-patch, security labels)                      | `../renovate.json`                |
