---
name: Pharos Workbench
description: Paper Pressure operator board — dual register C (public Cool Beacon stays on pharos-ai.ca)
colors:
  bg: "#faf9f7"
  panel: "#ffffff"
  panel-2: "#f7f5f1"
  ink: "#1c1b1a"
  soft: "#57534e"
  faint: "#8b8681"
  line: "#e7e3dd"
  line-2: "#efece7"
  accent: "#6d28d9"
  accent-hover: "#5b21b6"
  accent-soft: "#f3eefc"
  accent-mid: "#8b5cf6"
  ok: "#0f7a52"
  ok-soft: "#e6f4ee"
  warn: "#8a6d1f"
  warn-soft: "#f7f0dc"
  danger: "#9f1239"
  danger-soft: "#fbe9ee"
  on-accent: "#ffffff"
  # Cool Beacon (public room — do not mix into this CSS)
  cool-field: "#f3f6fc"
  cool-ink: "#10203f"
  cool-action: "#1b4dff"
  cool-light: "#0eb9a5"
typography:
  display:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "2.15rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  button:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "18px"
  xl: "28px"
  page-x: "20px"
  page-y: "28px"
  max-width: "980px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 14px"
  action-btn-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "6px 11px"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "15px"
  card-alert:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

## Overview

Pharos Workbench is the **Paper Pressure** room of the **Dual Register** PHAROS system (Direction C, locked 2026-08-08).

- **This product:** warm paper field, violet beam on primary actions and the *Needs you* zone, serif only for the Pharos title and card titles, Inter for UI, mono for codes/status.
- **Public brand (Cool Beacon):** lives on [pharos-ai.ca](https://pharos-ai.ca) — cool field `#f3f6fc`, action blue `#1b4dff`, teal light `#0eb9a5`, Sora/Manrope/Plex. **Do not import Cool Beacon blues into this CSS.**
- **Shared house rules:** lighthouse = orientation under uncertainty; accent only on action; no gradient text; no decorative side-stripes; radius ≤12px; pick one room per deck/PDF and stay there.

Personality: **quiet · exact · urgent**. See `PRODUCT.md` and `BRAND_IDENTITY.md`.

## Colors

**Paper Pressure (normative for this repo)**

| Token | Hex | Role |
| --- | --- | --- |
| `bg` | `#faf9f7` | Page field (paper) |
| `panel` | `#ffffff` | Cards, modals |
| `panel-2` | `#f7f5f1` | Nested wells, pipeline steps |
| `ink` | `#1c1b1a` | Body text |
| `soft` | `#57534e` | Secondary text |
| `faint` | `#8b8681` | Meta, empty states (keep ≥4.5:1 where used as text) |
| `line` / `line-2` | `#e7e3dd` / `#efece7` | Borders / row dividers |
| `accent` | `#6d28d9` | Primary actions, charged needs, Go |
| `accent-soft` | `#f3eefc` | Soft fill under pressure zones only |
| `ok` / `warn` / `danger` | green / amber / crimson families | Semantic tags only |

**Cool Beacon (reference only — other room)**  
Field `#f3f6fc` · ink `#10203f` · action `#1b4dff` · light `#0eb9a5`.

Single soft violet wash on the page is enough atmosphere. Do not stack a second indigo wash (that was dual-accent glare).

## Typography

| Role | Stack | Notes |
| --- | --- | --- |
| Wordmark / card titles | Iowan Old Style → Palatino → Georgia | Serif is PHAROS grain, not body |
| UI body / buttons | Inter, system-ui | Fixed rem scale, not fluid display |
| Codes / when / status | ui-monospace | Short labels only; sentence case preferred over shouty ALL CAPS where possible |
| Letter-spacing | ≥ −0.04em on display | Titles use ~−0.02em |

Do not pair a second geometric sans with Inter. Do not use Sora/Manrope inside the workbench.

## Elevation

- Cards: 1px `line` border + hairline shadow `0 1px 0 rgba(28,27,26,0.03)` — **not** both a heavy border and a ≥16px soft drop shadow.
- Dropdowns: light shadow max ~8–12px blur.
- Modals: scrim `rgba(28,27,26,0.35)` + panel border; keep shadow restrained.
- Alert card (*Needs you*): soft top wash of `accent-soft` into panel — the charged zone.

## Components

- **Primary button / primary action link:** solid `accent`, white label.
- **Secondary button:** panel + line border; hover into `accent-soft`.
- **Chips (nav):** pill, accent text, line border; not filled purple.
- **Rows:** time mono · what · action buttons · icon tools on hover/focus.
- **Pipeline steps:** panel-2 tiles; code in accent mono; label soft.
- **Focus:** 2px accent outline, 2px offset (or 3px soft ring on inputs).
- **Motion:** 120–150ms ease on color/border only; honor `prefers-reduced-motion`.

## Do's and Don'ts

**Do**

- Put pressure on *Needs you* and action links; keep everything else quiet.
- Surface Go / Email / Drive links on actionable items.
- Stay in Paper Pressure for any screen under this repo.
- Prefer short labels (Add, Go, Save, Clear.).

**Don't**

- Mix Cool Beacon blues into this UI.
- Flood every card with accent fill or dual purple+indigo gradients.
- Use Notion sprawl patterns, SaaS metric heroes, confetti/todo toys.
- Put tech stack words (D1, cookie names) in human chrome.
- Invent a third palette for “just this one screen.”
