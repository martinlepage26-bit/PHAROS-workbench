# CSS specs — PHAROS Workbench & EMERAULD graph

Source of truth in code:

| Surface | File |
| --- | --- |
| Board (Paper Pressure) | `backend/public/css/app.css` |
| Knowledge graph (navy / mauve) | `backend/public/css/emerauld-graph.css` |
| Design tokens (YAML) | `DESIGN.md` |

---

# 1. Board — Paper Pressure (`app.css`)

## 1.1 Color tokens (light — default)

```css
:root {
  --bg: #faf9f7;           /* page field (paper) */
  --panel: #ffffff;        /* cards, modals */
  --panel-2: #f7f5f1;      /* nested wells, pipeline steps */
  --ink: #1c1b1a;          /* body text */
  --soft: #57534e;         /* secondary text */
  --faint: #8b8681;        /* meta, empty states */
  --line: #e7e3dd;         /* borders */
  --line-2: #efece7;       /* row dividers */

  /* Violet beam — primary actions + charged “Needs you” only */
  --accent: #6d28d9;
  --accent-hover: #5b21b6;
  --accent-soft: #f3eefc;
  --accent-mid: #8b5cf6;

  /* Semantic */
  --pub: #0f7a52;
  --pub-bg: #e6f4ee;
  --draft: #8a6d1f;
  --draft-bg: #f7f0dc;
  --danger: #9f1239;
  --danger-soft: #fbe9ee;
  --warn: #8a6d1f;
  --warn-soft: #f7f0dc;
  --ok: #0f7a52;
  --ok-soft: #e6f4ee;

  --radius: 12px;          /* cards, modals — max */
  --radius-sm: 8px;
  --shadow: 0 1px 0 rgba(28, 27, 26, 0.03);
  --z-dropdown: 40;
  --z-modal: 100;
}
```

### Dark (system preference)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #151312;
    --panel: #1e1b19;
    --panel-2: #24201d;
    --ink: #f0ece6;
    --soft: #b8b1a8;
    --faint: #8b847b;
    --line: #332f2b;
    --line-2: #282420;
    --accent: #c4b5fd;
    --accent-hover: #ddd6fe;
    --accent-soft: #2a2140;
    --accent-mid: #a78bfa;
    --pub: #4ade9f;
    --pub-bg: #12352a;
    --draft: #e3c46b;
    --draft-bg: #38300f;
    --danger: #fb7185;
    --danger-soft: #3d1522;
    --warn: #e3c46b;
    --warn-soft: #38300f;
    --ok: #4ade9f;
    --ok-soft: #12352a;
    --shadow: none;
  }
}
```

### Cool Beacon (public site only — do not use on board)

| Role | Hex |
| --- | --- |
| Field | `#f3f6fc` |
| Ink | `#10203f` |
| Action | `#1b4dff` |
| Light / pulse | `#0eb9a5` |

## 1.2 Typography

```css
--sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
--mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

| Role | Family | Size | Weight | Line-height | Letter-spacing |
| --- | --- | --- | --- | --- | --- |
| Page title (h1) | serif | `clamp(1.7rem, 2.6vw, 2.15rem)` | 600 | 1.15 | −0.02em |
| Card title | serif | ~1.05rem | 600 | 1.25 | −0.015em |
| Body | sans | **15.5px** | 400 | **1.55** | normal |
| Button | sans | 0.9rem | 600 | ~1.2 | normal |
| Status / codes | mono | ~0.7–0.72rem | 600 | — | 0.04–0.06em |
| Modal labels | mono | 0.7rem | 600 | — | 0.06em uppercase |

**Rules:** letter-spacing floor ≥ −0.04em on display; serif only for brand/card titles; mono for short status/codes, not body.

## 1.3 Layout & spacing

```css
.wrap {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 20px 64px;   /* mobile: 20px 14px 56px */
}
```

| Token (DESIGN.md) | Value |
| --- | --- |
| xs | 4px |
| sm | 8px |
| md | 14px |
| lg | 18px |
| xl | 28px |
| Grid gap | 14px |
| Columns | `1fr 1fr` → `1fr` @ ≤760px |

## 1.4 Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-sm` / sm | 8px | small controls |
| md | 10px | buttons, fields |
| `--radius` / lg | **12px** | cards, modals (ceiling) |
| pill | 999px | chips, status, action links |

## 1.5 Elevation & motion

| Element | Spec |
| --- | --- |
| Card | `1px solid var(--line)` + hairline `--shadow` — **not** border + ≥16px blur |
| Dropdown | shadow ≤ ~8–12px blur |
| Modal scrim | `rgba(28, 27, 26, 0.35)` |
| Transitions | ~120–150ms on color/border |
| Reduced motion | `prefers-reduced-motion: reduce` → near-zero duration |

## 1.6 Components (key)

| Component | Background | Text | Border | Radius | Padding |
| --- | --- | --- | --- | --- | --- |
| `.btn.primary` | `--accent` | `#fff` | transparent | 10px | 9px 14px |
| `.btn` secondary | `--panel` | `--ink` | `--line` | 10px | 9px 14px |
| `.btn:hover` | `--accent-soft` | — | `#c4b5fd` | — | — |
| Focus visible | outline 2px `--accent`, offset 2px | | | | |
| `.action-btn.primary` | `--accent` | `#fff` | — | pill | 6px 11px |
| `.action-btn` | `--accent-soft` | `--accent` | `#ddd6fe` | pill | 6px 11px |
| `.card` | `--panel` | `--ink` | `--line` | 12px | 15px |
| `.card.alert` | gradient `--accent-soft` → panel | | soft violet edge | 12px | |
| `.chip-link` | `--panel` | `--accent` | `--line` | pill | 6px 12px |
| `.status-pill.ok` | `--ok-soft` | `--ok` | | pill | |
| `.status-pill.warn` | `--warn-soft` | `--warn` | | pill | |
| Tag money | `--danger-soft` / `--danger` | | | | |
| Tag decision | `--draft-bg` / `--draft` | | | | |
| Tag ok | `--ok-soft` / `--ok` | | | | |

## 1.7 Page background wash

```css
background:
  radial-gradient(1000px 400px at 6% -10%, var(--accent-soft) 0%, transparent 58%),
  var(--bg);
/* single violet wash only — no second indigo wash */
```

## 1.8 Theme meta

```html
<meta name="theme-color" content="#faf9f7">
```

---

# 2. Knowledge graph — navy / mauve (`emerauld-graph.css`)

## 2.1 Color tokens

```css
:root {
  --bg: #0b1020;                              /* deep navy */
  --bg-mid: #12182c;
  --panel: rgba(18, 22, 40, 0.88);            /* glass aside */
  --panel-solid: #151b30;
  --ink: #f0eef8;
  --soft: #b8b3c9;
  --faint: #7e7890;
  --line: rgba(196, 181, 253, 0.12);
  --line-strong: rgba(196, 181, 253, 0.2);

  --mauve: #c4a4d4;
  --mauve-bright: #e0c4f0;
  --mauve-deep: #9b7bb0;
  --mauve-glow: rgba(196, 164, 212, 0.45);
  --navy: #0b1020;
  --accent: #c4a4d4;
}
```

### Canvas field (CSS background under WebGL)

```css
#graph {
  background:
    radial-gradient(ellipse 70% 55% at 50% 40%, rgba(90, 60, 120, 0.28) 0%, transparent 58%),
    radial-gradient(ellipse 45% 40% at 15% 20%, rgba(120, 80, 140, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse 40% 35% at 88% 78%, rgba(50, 70, 130, 0.22) 0%, transparent 48%),
    radial-gradient(ellipse 80% 70% at 50% 100%, rgba(8, 12, 28, 0.9) 0%, transparent 55%),
    linear-gradient(165deg, #12182c 0%, #0b1020 42%, #0a0e1c 100%);
}
```

## 2.2 Typography (graph chrome)

| Role | Spec |
| --- | --- |
| Body | sans, **14px**, line-height 1.45 |
| Title h1 | serif ~1.2rem, weight 600; gradient text ink → mauve |
| Mono meta | 0.65–0.7rem, letter-spacing 0.12em uppercase for section labels |
| Node labels (Pixi) | Inter 11px, fill `#f0eef8`, dark drop shadow |

## 2.3 Layout

```css
html, body { height: 100%; height: 100dvh; overflow: hidden; }
.layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr minmax(240px, 300px);
}
/* ≤760px: 1fr / minmax(180px, 32vh) */
#graph { position: absolute; inset: 0; width: 100%; height: 100%; }
header { padding: 12px 20px; }
```

## 2.4 Graph node / edge colors (Pixi — not CSS vars)

| Element | Spec |
| --- | --- |
| Node fill (low degree) | `#c4a4d4` |
| Node fill (mid) | `#d4b4e8` |
| Node fill (hub) | `#e8d0f5` |
| Node border / glow | `#e0c4f0` → `#f6ecff` |
| Node radius | ~2.8–9 px (scaled by degree) |
| Edge default | `rgba(180, 150, 210, 0.16)` / hex ~`#b496d2` @ low alpha |
| Edge highlight | `#e0c4f0` @ ~0.55 |
| Selection glow | `rgba(232, 208, 245, 0.85)` |

## 2.5 Theme meta

```html
<meta name="theme-color" content="#0b1020">
```

---

# 3. Shared type stacks (both surfaces)

```css
--sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
--mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

---

# 4. Do / don’t (CSS)

| Do | Don’t |
| --- | --- |
| Board: paper + violet accent only on action | Mix Cool Beacon blues into board |
| Graph: navy + mauve constellation | Gold-on-paper on the graph page |
| Radius ≤ 12px on cards | 24–40px “AI rounded” cards |
| Hairline shadow **or** light border | Border + 16px+ soft drop shadow |
| One charged wash on board | Dual purple + indigo page washes |
| `prefers-reduced-motion` | Motion required for content to appear |

---

# 5. Copy-paste starter (board)

```css
:root {
  --bg: #faf9f7;
  --panel: #ffffff;
  --ink: #1c1b1a;
  --soft: #57534e;
  --faint: #8b8681;
  --line: #e7e3dd;
  --accent: #6d28d9;
  --accent-hover: #5b21b6;
  --accent-soft: #f3eefc;
  --radius: 12px;
  --sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --serif: "Iowan Old Style", Palatino, Georgia, serif;
}
```

# 6. Copy-paste starter (graph)

```css
:root {
  --bg: #0b1020;
  --panel: rgba(18, 22, 40, 0.88);
  --ink: #f0eef8;
  --soft: #b8b3c9;
  --faint: #7e7890;
  --mauve: #c4a4d4;
  --mauve-bright: #e0c4f0;
  --line: rgba(196, 181, 253, 0.12);
  --sans: Inter, ui-sans-serif, system-ui, sans-serif;
  --serif: "Iowan Old Style", Palatino, Georgia, serif;
}
```
