# Data Buddy — Visual System

## Product thesis

**Data Buddy is the calm, explicit companion for data that needs care.** The interface should make complex quality work feel legible and reversible: open space, clear evidence, gentle hierarchy, and one distinctive character who visibly shares the work.

## Design direction

The structure is **Notion-inspired, not a Notion copy**: a quiet left rail, broad work canvas, lightweight cards, soft dividers, and almost no ornamental chrome. The signature move is Data Buddy, a file-folder character whose status lenses change with the user’s context: `IDLE / OK` while waiting, `WORK / ...` while processing, `CHECK / ?` when review is needed, and `DONE / ✓` when a task completes.

```text
┌───────────────────┬────────────────────────────────────────────────────┐
│ logo + workspace  │  breadcrumb / action                                │
│                  │  ─────────────────────────────────────────────────  │
│ overview          │  quiet welcome + Data Buddy speech bubble           │
│ datasets          │  ┌────────────────┐ ┌──────────────────────────┐   │
│ cleaning          │  │ quality signal │ │ review / next action     │   │
│ analysis          │  └────────────────┘ └──────────────────────────┘   │
│ documents         │                                                      │
│                  │  cards carry content; dividers establish structure   │
└───────────────────┴────────────────────────────────────────────────────┘
```

## Tokens

| Role | Token | Value | Intent |
|---|---:|---:|---|
| Canvas | `--canvas` | `#FAFAFA` | Near-white working surface |
| Paper | `--paper` | `#FFFFFF` | Cards, popovers, mascot panels |
| Ink | `--ink` | `#171717` | Near-black reading and primary actions |
| Graphite | `--graphite` | `#3F3F46` | Single muted dark accent |
| Mist | `--mist` | `#F1F1F0` | Hover fills, selected surface |
| Rule | `--rule` | `#E8E8E6` | Soft dividers, restrained borders |
| Quiet text | `--quiet` | `#71717A` | Secondary text and metadata |
| Signal | `--signal` | `#5F6B5A` | Muted olive for positive/safe status only |
| Warning | `--warning` | `#A16207` | Restricted warnings and anomalies only |

Only `--graphite` is used as a decorative accent. Status colours appear only when they encode a condition; colour never carries the meaning alone.

## Typography

| Role | Typeface | Usage |
|---|---|---|
| Display | Archivo Black | Product wordmark, large page title, one highlighted number or phrase per screen |
| Interface / body | Inter | All UI labels, controls, tables, descriptive and long-form text |
| Accent | Playwrite DE LA Guides | Loading-state reassurance, a small hand-drawn note, or a single welcome flourish; never body text, control labels, or data |
| Mascot display | JetBrains Mono | Embedded inside Data Buddy’s status lenses only |

The display face remains intentional and compact. Cards and dense data surfaces use Inter at 14–16px with a 1.5 line height. Playwrite only appears where users are not expected to scan information quickly.

## Layout and surfaces

Use a 264px desktop sidebar and a maximum main canvas width of 1480px. Primary content is arranged with 24–32px gaps and cards use 18–22px corner radii. Most surfaces have no shadow; selected or floating elements may use one low-opacity shadow. Use 1px `--rule` dividers rather than visible boxed-in grids.

## Motion and interaction

Interactions use `cubic-bezier(0.23, 1, 0.32, 1)` and settle in 160–280ms. Data Buddy has a slow vertical idle drift and lens cursor blink. Cards, menu items, and list entries reveal with an 8–12px rise and 30–60ms stagger. All decorative motion is disabled for reduced-motion preferences; functional feedback stays immediate and textual.

## Accessibility commitments

Body text meets a 4.5:1 contrast target. Interactive targets are at least 44px tall on touch layouts. Focus states use a visible graphite ring with no reliance on hover. Every chart has a readable adjacent summary and every status pairs its colour with text and an icon.

## Explicitly avoid

Avoid heavy black panels, neon AI gradients, dense information grids, pill overuse, dashboard gamification, and generic floating-orb illustrations. The space around the information is part of the design.
