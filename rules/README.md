# Rules

Every Data Buddy finding comes from a **rule package** in this folder. A rule is
data first: a `rule.yaml` declares what the rule means, how severe it is by
default, which reversible repair it offers, and the evidence contract its
findings must satisfy. The detector is a pure function over the dataset.

```
rules/
  AUDIT.MISSING.VALUES/
    rule.yaml          # single source of truth for the rule contract
    detector.ts        # pure detector: (context) => finding(s) | null
    test_rule.test.ts  # Vitest tests running against the real yaml + fixtures
    fixtures/          # tiny CSV inputs, one behaviour per file
  ...
  registry.generated.ts  # GENERATED — do not edit; run `pnpm dbuddy rules sync`
```

## Commands

```bash
pnpm dbuddy rules sync   # regenerate registry.generated.ts from the yaml files
pnpm dbuddy rules lint   # validate every rule against the evidence contract
pnpm vitest run rules    # run every rule's test suite
```

## The evidence contract

A finding is only a conclusion if it carries proof. Every finding must include:

- `rule` — the deterministic rule ID (`AUDIT.<FAMILY>.<NAME>`), stable across versions
- `severity` — `blocker` | `review` | `info`
- `affectedCount` — how many rows/cells are implicated
- `evidence[]` — up to `evidenceLimit` rows, each with `rowNumber`, `value`,
  `message`, and `column` when the rule is column-scoped, matching the
  `evidenceFields` declared in `rule.yaml`

`pnpm dbuddy rules lint` enforces all of the above (ID format, folder match,
semver, contract fields, fixture presence, test presence, registry sync) and
fails the build on any violation.

## Adding a rule

1. Create `rules/AUDIT.<FAMILY>.<NAME>/` (folder name = rule ID).
2. Write `rule.yaml` (copy any existing one and edit).
3. Implement `detector.ts` as a pure function — no I/O, no date/random, no DOM.
4. Add `test_rule.test.ts` and at least one positive and one negative fixture.
5. Run `pnpm dbuddy rules sync` and commit the regenerated registry.

Rule IDs are immutable once published: if detector behaviour changes in a
breaking way, bump `version` and document it in `DECISIONS.md`.
