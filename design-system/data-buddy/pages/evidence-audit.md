# Evidence Audit — Page Direction

## Job

Help an analyst decide whether the current source file is safe enough for analysis by showing **the risky rule first, then the rows that prove it, then a reversible preview**.

## Layout

```text
┌──────────────────── quality decision ─────────────────────────────────────┐
│ blockers / review / information      source snapshot unchanged            │
├───────────────────────────────────┬──────────────────────────────────────┤
│ severity-ranked finding queue     │ selected finding                       │
│ [BLOCKS] age has type conflicts   │ Rule AUDIT.TYPE.CONFLICT:age          │
│ [REVIEW] 2 exact duplicates       │ Why it matters / affected count        │
│ [INFO]    email formatting drift  │ evidence rows / reversible action      │
└───────────────────────────────────┴──────────────────────────────────────┘
```

## Signature element

Use a thin vertical **audit rail** on each finding: graphite for information, muted amber for review, and near-black for blockers. The rail, written severity label, and icon work together; never rely on color alone.

## Interaction

Selecting a finding changes only the evidence pane. The remediation action must say **Preview repair** before any working-copy change and must show an error ledger before the user applies it.
