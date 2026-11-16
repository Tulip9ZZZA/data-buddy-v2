# DESIGN LOCK — the immutable visual identity

This file is the contract that makes the brand out of scope for change. Every
value below ships in `client/src/index.css` (`:root`) and
`design-system/data-buddy/MASTER.md`; the v2 rebuild consumes the same tokens
and adds **no new colors, fonts, or mascot variants**.

## Locked inventory (verified token-for-token against v1 baseline)

| Token        | Value                            | Locked role                                 |
| ------------ | -------------------------------- | ------------------------------------------- |
| `--canvas`   | `#FAFAFA`                        | working surface                             |
| `--paper`    | `#FFFFFF`                        | cards, popovers, mascot panels              |
| `--ink`      | `#171717`                        | reading text, primary actions, blocker rail |
| `--graphite` | `#3F3F46`                        | single decorative accent, focus ring base   |
| `--mist`     | `#F1F1F0`                        | hover fills, selected surface               |
| `--rule`     | `#E8E8E6`                        | soft dividers                               |
| `--quiet`    | `#71717A`                        | secondary text                              |
| `--signal`   | `#5F6B5A`                        | positive/safe status only                   |
| `--warning`  | `#A16207`                        | review/warning status only                  |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | all motion                                  |

**Typography (locked):** Archivo Black (display/wordmark), Inter (interface +
body 14–16px, 1.5 line height), Playwrite DE LA Guides (reassurance flourish
only), JetBrains Mono (mascot lenses, rule IDs, machine values).

**Mascot (locked):** the hand-drawn file-folder character
(`client/src/components/DataBuddyMascot.tsx`) with its four lens states —
`IDLE/OK`, `WORK/…`, `CHECK/?`, `DONE/✓` — stroke weights, and idle drift.
Byte-identical component; untouched in v2.

**Spacing/layout (locked):** 264px sidebar; 1480px max canvas; 18–22px card
radii; 24–32px content gaps; 1px `--rule` dividers; no ornamental chrome.

## What v2 added — using only locked tokens

| New element                             | Tokens used                                                  | Why                                     |
| --------------------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| Verdict banner (`.buddy-verdict-*`)     | ink/warning/signal rails, Archivo Black, JetBrains Mono meta | verdict-first decision header (ADR-07)  |
| Intake-error card (`.buddy-error-card`) | warning tint via `color-mix`, Inter                          | designed SAFELY_REJECTED state (ADR-09) |
| Skip link (`.buddy-skip-link`)          | paper/ink, graphite focus ring                               | keyboard entry point (A11y commitment)  |

## Baseline vs rebuild evidence

- `ui/baseline/` — 8 screenshots of the v1 app captured before any change
  (desktop 1440×900: onboarding, evidence, evidence detail, cleaning,
  documents, datasets; mobile 390×844: overview, evidence).
- `ui/after/` — 5 screenshots of the v2 app on the same day: verdict-first
  evidence page, datasets, mobile evidence, onboarding, overview.
- Palette/texture/font/mascot/spacing are unchanged between the two sets;
  the visible deltas are the new banner, rule IDs (`AUDIT.*`), and the
  redesigned finding queue semantics — all approved scope.

## Explicitly rejected (see DECISIONS.md ADR-01)

Dark-mode inversion, new accent colors, mascot redesign, replacing Inter,
denser dashboard grids — every suggestion of that kind is a rejected ADR, and
the audit rail keeps its graphite/amber/ink encoding so status never relies
on color alone.
