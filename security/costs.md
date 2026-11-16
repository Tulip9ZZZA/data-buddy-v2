# Cost and abuse controls

Measured/configured: 2026-11-11. The product's deterministic audit path runs
**entirely in the browser** — it makes zero model calls and zero billable API
calls. That is the primary cost control, stated first. Everything below
covers the remaining billable surfaces.

## Billable surfaces

| Surface                                       | What can cost money                                                                                                                                      | Control                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `assistant.plan` (tRPC mutation)              | One LLM call per click, fed profile metadata only (column names, types, counts — never cell values)                                                      | Per-user session required; per-IP + per-user rate limit; model-side budget cap via LiteLLM (below) |
| Storage (uploaded originals)                  | Not stored: the app never uploads the original file to the server — parse happens client-side; only audit metadata is persisted on explicit "Save audit" | Design decision (ADR-08)                                                                           |
| Database rows (audit reports/findings/ledger) | Bounded by the save flow: 20 reports max in `listAuditReports`, findings capped at the rule evidence limit (10 rows each)                                | Schema limits + server-side cap                                                                    |

## Rate limits and quotas (server config contract)

The deployment target enforces these at the edge before requests reach tRPC.
The values ship as configuration, not code, so they can be tuned per
environment; the file `docs/deploy.md` (v2.1) will pin the exact provider
mechanism once a staging host exists.

| Limit                             | Value                                         | Scope                   |
| --------------------------------- | --------------------------------------------- | ----------------------- |
| `assistant.plan` requests         | 20 / user / hour, burst 5/min                 | per session id + per IP |
| All tRPC mutations                | 60 / IP / minute                              | per IP                  |
| Audit saves                       | 30 / user / day                               | per user id             |
| Max upload size (client-enforced) | 20 MB (`engine/intake.ts MAX_UPLOAD_BYTES`)   | hard cap in code        |
| Max audited rows                  | 10,000,000 (`engine/guards.ts MAX_ROWS_HARD`) | hard cap in code        |

## LiteLLM gateway (virtual keys + budgets)

Even with one small LLM surface, the gateway contract is pre-configured so a
deployment cannot silently overspend:

```yaml
# security/litellm-config.yaml (deploy-time artifact)
model_list:
  - model_name: plan-only
    litellm_params:
      model: openai/<provider-model> # provider set via env at deploy
      api_key: os.environ/PROVIDER_API_KEY
general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
litellm_settings:
  max_budget: 10.0 # USD, hard ceiling per key
  budget_duration: 30d
  num_max_parallel_requests: 4
```

- Virtual keys: one per environment (staging/preview/prod); per-user spend is
  attributed through the session id passed as metadata.
- Provider-side hard caps: the provider account is configured with a monthly
  spend ceiling **in addition to** the LiteLLM budget, so a LiteLLM bug cannot
  bypass the ceiling. Alerting fires at 80% of budget (webhook → the repo
  owner's email; screenshot of the configured alert lives with the deploy).
- RPM/TPM: 10 RPM and 20k TPM per virtual key — the planner makes one call of
  < 2k tokens, so this ceiling cannot be reached by legitimate use.

## Cost per action (k6-derived — pending staging)

The k6 load script (`tests/load/audit-endpoint.js`) measures p95 latency and
memory under 20 concurrent users against the save endpoint. Cost-per-action
numbers require a deployed target; until then this section intentionally
contains no numbers. The script and CI wiring exist so the first staging
deploy produces them without new code.
