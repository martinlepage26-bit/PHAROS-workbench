# Spec sheet — PHAROS Workbench web page & EMERAULD knowledge graph

| Field | Value |
| --- | --- |
| **Product** | Pharos Workbench |
| **Host** | https://pharos-workbench-api.martinlepage26.workers.dev/ |
| **Repo** | `martinlepage26-bit/PHAROS-workbench` |
| **Audience** | Single operator (Martin) |
| **Register** | Product UI — Dual Register **C**: board = **Paper Pressure**; public brand (pharos-ai.ca) = **Cool Beacon** |
| **Personality** | Quiet · exact · urgent |
| **Spec status** | Living — reflects implementation as of 2026-08-08 |

Related: `PRODUCT.md`, `DESIGN.md`, `BRAND_IDENTITY.md`, `docs/obsidian-graph-view-tech.md`.

---

# Part A — Workbench web page

## A.1 Purpose

Operational **CRUD board** for PHAROS method work: capture tasks (with action links), prioritize lists, walk the paper Drive path, and open research maps / the EMERAULD graph. Cloud-persisted; session cookie after one key paste.

**Success:** open host → see what needs you → open the right link → move on.

## A.2 Surfaces (routes)

| URL | Role |
| --- | --- |
| `/` | Main board SPA (`index.html` + ES modules) |
| `/files-hub.html` | Papers / method-formation index |
| `/files/*.html` | Standalone method artifacts (register, corpus, timelines, atlas, …) |
| `/files/emerauld-graph` | EMERAULD knowledge graph (Part B) |
| `/api/*` | Worker API (auth + board) |
| Root GitHub Pages | Redirect only (not the operational host) |

## A.3 Architecture

```
Browser (same origin)
  ├── public/index.html          shell + modals
  ├── public/css/app.css         Paper Pressure tokens
  ├── public/js/app.js           dispatcher, bootstrap, modals
  ├── public/js/model.js         board normalize, links extract
  ├── public/js/render.js        paint board
  └── public/js/api.js           cookie session + board CRUD
         │
         ▼
Cloudflare Worker (backend/src)
  ├── index.ts                   routes
  ├── auth.ts                    HMAC session cookie / Bearer
  ├── board.ts                   D1 read/write + revision lock
  ├── schema.ts                  BoardV3 + content migrations
  └── default-board.ts           server-owned empty board
         │
         ▼
D1: pharos-workbench
  boards (id, data JSON, revision, …)
  board_events (history, pruned)
```

| Binding / var | Role |
| --- | --- |
| `DB` | D1 database |
| `ASSETS` | Workers static assets (`public/`) |
| `BOARD_ID` | Default board id (`main`) |
| `CORS_ORIGINS` | Allowlist for credentialed cross-origin |
| `WORKBENCH_API_KEY` | Secret — login + Bearer tooling |

## A.4 Auth

| Mechanism | Spec |
| --- | --- |
| **Preferred** | `POST /api/session/login` body `{ "key": "<WORKBENCH_API_KEY>" }` → Set-Cookie `wb_session` |
| **Cookie** | `wb_session` — HttpOnly, Secure, SameSite=Lax, Path=/ |
| **Token** | HMAC session (board id + expiry), secret = API key |
| **Tooling** | `Authorization: Bearer <WORKBENCH_API_KEY>` |
| **Forbidden** | API key in URL query (`GET /api/session/bootstrap` → **410 Gone**) |
| **Logout** | `POST|GET /api/session/logout` clears cookie |
| **Status** | `GET /api/session/status` → `{ authenticated, cookie, board }` |

Key storage on operator machine: `~/.secrets/pharos-workbench-api-key.txt` (never commit; never print in chat).

## A.5 Board API

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| GET | `/api/health` | no | Liveness |
| GET | `/api/board` | yes | Load board; if `meta.content_revision` &lt; current, **migrate + persist once** |
| PUT | `/api/board` | yes | Save full board JSON; optimistic concurrency via `If-Match` / `expected_revision` |
| DELETE | `/api/board` | yes | Delete board row |
| POST | `/api/board/reset` | yes | Replace with server default board |
| GET | `/api/board/history` | yes | Recent events |

**Concurrency:** ETag `W/"{revision}"`; conflict → **409**.

**Payload cap:** ~4.5 MB JSON on write.

## A.6 Data model — Board v3

```ts
BoardV3 {
  version: 3
  meta: {
    title, subtitle, asOf, windowNewest, snap, footer
    content_revision?: number   // product migrations (server)
  }
  blocks: Block[]
}

Block =
  | { type: "links"; id; items: { id, label, url }[] }
  | { type: "pipeline"; id; title; stages: { id, code, label, url }[] }
  | { type: "list"; id; title; layout: "half"|"full"; style: "normal"|"alert";
      empty; linkLabel?; linkUrl?; items: ListItem[] }

ListItem {
  id, time, source, text, tag, tagKind, kind, url
  links?: { label, url }[]   // multi action buttons
}
```

| Content revision | Meaning |
| --- | --- |
| **Current** | `CONTENT_REVISION = 1` in `schema.ts` |
| **On load** | `toBoardV3` upgrades legacy v1/v2 shapes; runs `migrateBoardContent` if stamp stale |
| **Client** | Does **not** rewrite product copy; paints server truth |

**Default board sections (server):** nav chips (Papers, Register, Corpus, Atlas, Timeline, EMERAULD) · Paper path pipeline (Drive 00–07) · Needs you · Meetings · This week · Mail · EMERAULD (graph CTAs).

**Link as unit of work:** free-text URLs (and mailto) extracted into `item.links[]` with host-aware labels (Email, Drive, GitHub, …).

## A.7 UI specification (board)

### Layout

- Max width ~980px, centered paper field.
- **Topbar:** brand (serif title **Pharos**, subtitle **What needs you**) · status pill · Add / New list / More.
- **Session banner:** when unauthenticated — key field + Continue.
- **Quick links:** chip row from `links` block.
- **Grid:** cards for pipeline (full width) + list blocks (half/full).
- **Modals:** task, list, paper step, shortcut (data-action dispatcher).

### Visual tokens — Paper Pressure

| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | `#faf9f7` | Page field |
| `--panel` | `#ffffff` | Cards |
| `--ink` | `#1c1b1a` | Body |
| `--soft` / `--faint` | `#57534e` / `#8b8681` | Secondary / meta |
| `--accent` | `#6d28d9` | Primary actions, needs zone |
| `--accent-soft` | `#f3eefc` | Soft fills |
| Radius | ≤12px cards | |
| Type | Inter UI · Iowan/Palatino title · mono for codes/status | |

**Do:** accent on action only; charged *Needs you* zone.  
**Don’t:** Cool Beacon blues; dual indigo wash; tech jargon in chrome.

### Interaction

| Action | Behavior |
| --- | --- |
| Add / edit task | Modal → list + what + from + when + where to act + links |
| Save | Debounced schedule → `PUT /api/board` |
| Offline | localStorage cache `pharos-workbench-v3-cache` |
| Conflict | Prompt to pull newer board |
| Escape | Close modals |
| Ctrl/Cmd+S | Force sync |

### Copy principles

Short labels (Add, Go, Save, Clear.). Pressure on needs; empty states minimal. Diamond Eyes / product voice — not SaaS dashboard copy.

## A.8 Client modules

| File | Responsibility |
| --- | --- |
| `app.js` | Bootstrap, session, data-action map, modals, sync |
| `model.js` | `normalizeBoard`, `normalizeItemLinks`, block helpers |
| `render.js` | DOM paint from state |
| `api.js` | Fetch with credentials, revision, retries on 5xx/1042 |

**Invariant:** `openModal` must not clear `editCtx` (Save depends on it).

## A.9 Accessibility

- WCAG **AA** target for body/controls on paper field.
- Visible focus rings on interactive controls.
- `prefers-reduced-motion` respected in board CSS transitions.
- Keyboard: Escape modals; form fields operable without mouse.

## A.10 Non-goals (board)

- Multi-tenant / multi-user boards.
- Real-time collaborative cursors.
- Replacing PHAROS-OFFICIAL or the full EMERAULD vault as source of truth.
- Public marketing page (that is Cool Beacon / pharos-ai.ca).

---

# Part B — EMERAULD knowledge graph

## B.1 Purpose

Obsidian-class **wikilink constellation** for the EMERAULD vault: explore notes as a force-directed graph without opening GitHub or Obsidian. Linked from the board EMERAULD section and nav chip.

**URL:** https://pharos-workbench-api.martinlepage26.workers.dev/files/emerauld-graph

## B.2 Architecture (aligned with Obsidian Graph View *kind*)

| Piece | Spec | Notes |
| --- | --- | --- |
| **Renderer** | **PixiJS v7** (CDN) | WebGL; same family as Obsidian built-in Graph View |
| **Layout** | **Custom force-directed** | Repulsion + link springs + center gravity + damping — *not* Obsidian’s closed source |
| **Not primary** | D3.js, vis-network | D3 reserved conceptually for the separate 3D Graph *plugin* ecosystem, not this page |
| **Data model** | Nodes = notes/pages; edges = `[[wikilinks]]` | Built from vault `.graph_store` |

Reference: `docs/obsidian-graph-view-tech.md`.

## B.3 Files

| Path | Role |
| --- | --- |
| `public/files/emerauld-graph.html` | Shell (header, aside, graph host) |
| `public/css/emerauld-graph.css` | Navy / mauve chrome |
| `public/js/emerauld-graph-app.js` | Pixi app, force sim, interaction |
| `public/js/emerauld-graph-data.js` | Generated `window.__EMERAULD_GRAPH__` |
| `public/files/emerauld-graph-data.json` | Debug twin of payload |
| `scripts/build-emerauld-graph.mjs` | Rebuild from vault graph store |

```bash
node scripts/build-emerauld-graph.mjs
# optional: --vault /path/to/EMERAULD
# optional: --from-json path/to/payload.json
```

Default vault path: `EMERAULD_VAULT` or `/home/martin/work/EMERAULD` → `.graph_store/{nodes,edges}.json`.

## B.4 Data payload

```json
{
  "generated_from": "…",
  "built_at": "ISO-8601",
  "pruned": true,
  "node_count": 347,
  "edge_count": 1800,
  "areas": { "Hub": "#…", "PHAROS": "#…", … },
  "nodes": [
    {
      "id": "…",
      "label": "short",
      "title": "full",
      "path": "Areas/…",
      "type": "moc|note|…",
      "area": "Writing|PHAROS|Hub|…",
      "color": "#…",
      "size": 7–28,
      "degree": 0,
      "backlinks": 0
    }
  ],
  "edges": [
    { "source": "id", "target": "id", "weight": 1–12 }
  ]
}
```

### Pruning policy (build script)

| Rule | Value |
| --- | --- |
| Prefer | `Areas/**`, hubs/MOCs, high degree (≥8) |
| Cap nodes | ~320 (+ up to 40 one-hop expansion) |
| Cap edges | Top **1800** by weight |
| Areas | Hub, PHAROS, Writing, Lavoie, Personal, Wiki, Resources, Governance, Skills, Projects, Other |

Typical live prune: **~347 nodes · 1800 edges**.

## B.5 Visual specification

### Field (dark navy + mauve)

| Token | Approx | Role |
| --- | --- | --- |
| Background | `#0b1020` → `#12182c` | Deep navy with mauve blooms |
| Panel | `rgba(18,22,40,0.88)` | Glass sidebar |
| Ink | `#f0eef8` | Text |
| Mauve | `#c4a4d4` / `#e0c4f0` | Accent, nodes, links |

### Nodes

- Small filled circles; radius scales gently with degree.
- Fill/border: mauve family; hubs brighter (`#e8d0f5` … `#c4a4d4`).
- Soft glow under nodes; stronger on hover/select.
- Labels: hubs / high-degree / hover / selection only (avoid clutter).

### Edges

- Hairline lavender (`~rgba(180,150,210,0.16)`).
- Highlight when incident to selected node.

### Layout chrome

- Slim header: back to board · title · search · stats.
- Full-viewport canvas (minus header + ~280px aside).
- Aside: selected note meta + connected list + area legend (toggle filter).

## B.6 Force layout (custom)

| Parameter | Role (approx current) |
| --- | --- |
| Repulsion | Inverse-square between visible nodes |
| Springs | Per edge; rest length ~78 + weight |
| Center | Weak pull to origin |
| Damping | ~0.9 (smooth) |
| Cooling | Starts ~0.85; decays **0.9975** / tick (slow settle) |
| Cap | ~1400 ticks or cooling floor |
| Frame | **1** force step per animation frame |

After settle: auto-`fitView`; user can pan/zoom; dragging a node re-warms a short settle.

## B.7 Interaction

| Input | Behavior |
| --- | --- |
| Wheel | Zoom toward cursor |
| Drag empty | Pan world |
| Drag node | Pin position; light re-settle |
| Click node | Select; show meta + neighbors |
| Neighbor button | Focus that node |
| Search | Focus first title/path match |
| Legend area | Toggle area visibility + re-warm layout |

## B.8 Performance & constraints

- Designed for **pruned** hundreds of nodes, not full vault unfiltered.
- WebGL via PixiJS; requires modern browser + CDN for Pixi (jsDelivr).
- Graph data shipped as **classic script** under `/js/` (Workers Assets on this host have been unreliable for some `/files/*` non-HTML and bare `.json` assets).
- Offline vault rebuild requires access to `.graph_store` on the build machine.

## B.9 Non-goals (graph)

- Opening note bodies inside the page (no vault file server).
- Full Obsidian plugin API or live vault sync.
- 3D graph (that’s a different product; would use a different stack).
- Exact clone of Obsidian’s closed-source layout algorithm.

## B.10 Relationship to board

| Board element | Target |
| --- | --- |
| Nav chip **EMERAULD** | `files/emerauld-graph` |
| List **EMERAULD** · Open graph | same |
| Method hub / Papers | separate HTML maps (not the force graph) |

Server migration `CONTENT_REVISION ≥ 1` rewrites old GitHub EMERAULD URLs → local graph.

---

# Part C — Quality bars & ops

## C.1 Tests

```bash
cd backend && npm test
```

Covers auth, schema upgrade, content migration (incl. EMERAULD → graph), list helpers.

## C.2 Deploy

```bash
cd backend
unset CLOUDFLARE_API_TOKEN   # use wrangler OAuth for D1-capable deploy
npx wrangler deploy
```

After vault changes affecting the graph:

```bash
node scripts/build-emerauld-graph.mjs
npx wrangler deploy
```

## C.3 Security checklist

- [x] No API key in query strings  
- [x] HttpOnly session cookie  
- [x] CORS allowlist  
- [x] Revision lock on board writes  
- [ ] Rotate key if ever leaked in HTML/logs  
- [ ] Do not commit `~/.secrets/*`

## C.4 Change control

| Change type | Where |
| --- | --- |
| Board copy / structure defaults | `default-board.ts` + bump `CONTENT_REVISION` + `migrateBoardContent` |
| Board UI | `public/index.html`, `css/app.css`, `js/*` |
| Graph look / force feel | `emerauld-graph.css`, `emerauld-graph-app.js` |
| Graph membership / prune | `scripts/build-emerauld-graph.mjs` then rebuild data |
| Brand dual register | `BRAND_IDENTITY.md`, `DESIGN.md` |

---

# Part D — Acceptance criteria (summary)

### Board

1. Authenticated user loads board from D1; unauthenticated sees sign-in + optional local cache.  
2. Add task with link → appears on board → persists after refresh when signed in.  
3. Action links open; pipeline stages open Drive; Papers/Register/graph open correct local pages.  
4. No Notion/Slack surface; no key in URL.

### Graph

1. Page fills viewport; navy field; mauve nodes; force settles calmly.  
2. PixiJS WebGL path (no vis-network dependency).  
3. Pan, zoom, select, search, area filter work.  
4. Stats reflect pruned node/edge counts from generated data.  
5. Linked from board EMERAULD section without GitHub as primary CTA.

---

*End of spec sheet.*
