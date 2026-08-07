**Secure host:** https://pharos-workbench-api.martinlepage26.workers.dev/ (Worker UI + D1 + HttpOnly cookie — no API key in HTML)

# PHAROS Workbench

Browser-openable HTML surfaces for the PHAROS method-formation corpus.

## Status — SET

| Setting | Value |
|---------|--------|
| Repo | public · `martinlepage26-bit/PHAROS-workbench` |
| Pages | **enabled** · branch `main` · path `/` · HTTPS on · status `built` |
| **First interface** | `pharos_dashboard.html` (also served as `index.html`) |
| Hub homepage | https://martinlepage26-bit.github.io/PHAROS-workbench/ |
| Topics | `pharos`, `workbench`, `method-formation`, `github-pages` |
| Local / SMB | `~/docs/PHAROS-workbench` · `smb://100.102.190.26/martin-docs/PHAROS-workbench/` |

## Operational workbench

## Backend (Cloudflare Worker + D1)

Durable board API:

- **URL:** `https://pharos-workbench-api.martinlepage26.workers.dev`
- **Source:** `backend/` (Worker `pharos-workbench-api`, D1 `pharos-workbench`)
- **Auth:** `Authorization: Bearer <WORKBENCH_API_KEY>`
- **Key on this machine:** `~/.secrets/pharos-workbench-api-key.txt` (never commit)

In the workbench UI: click **Backend**, paste the API key once, enable auto-sync.
Every edit saves to D1 (with localStorage as offline cache). Use **☁ Sync now** to force.

```bash
cd backend
unset CLOUDFLARE_API_TOKEN
wrangler d1 migrations apply pharos-workbench --remote
wrangler deploy
printf '%s' "$KEY" | wrangler secret put WORKBENCH_API_KEY
```



The first interface (`index.html` / `pharos_dashboard.html`) is a **live CRUD board**:

- Add / edit / delete **items**, **sections**, **pipeline stages**, and **nav links**
- Reorder with ↑↓ / ‹›
- Inline edit titles, subtitle, timestamps, footer
- **localStorage** persistence in the browser
- **Export / Import JSON** (and drag-drop `.json`) to move machines or back up
- **Reset seed** restores the built-in starter board

Method-formation HTML artifacts remain under `files/` and `files-hub.html`.

## Live URLs (GitHub Pages)

| Surface | URL |
|---------|-----|
| **First interface (dashboard)** | https://martinlepage26-bit.github.io/PHAROS-workbench/ |
| Named dashboard | https://martinlepage26-bit.github.io/PHAROS-workbench/pharos_dashboard.html |
| Method-formation card hub | https://martinlepage26-bit.github.io/PHAROS-workbench/files-hub.html |
| Files | https://martinlepage26-bit.github.io/PHAROS-workbench/files/&lt;file&gt;.html |

## Layout

```text
PHAROS-workbench/
  index.html              # FIRST INTERFACE = pharos_dashboard
  pharos_dashboard.html   # same dashboard (SMB / direct path)
  files-hub.html          # method-formation card hub (secondary)
  files/                  # standalone HTML artifacts
  package/                # portable atlas markdown + manifest
  .nojekyll
  README.md
```

## Files

| File | Description |
|------|-------------|
| `files/paper-register.html` | The Register (ordered by role in method formation) |
| `files/corpus-full-list.html` | The Corpus, Normalized |
| `files/method-formation-atlas.html` | Unified Method Formation Atlas |
| `files/method-formation-timeline.html` | Method Formation Timeline (OFFICIAL) |
| `files/method-formation-public-timeline.html` | Public timeline narrative |
| `files/intellectual-arc.html` | Intellectual arc |
| `files/timeline-register-vs-voice-operator.html` | Register vs voice-operator comparison |
| `files/voice-operator-genealogy.html` | Voice Operator Specs — Genealogy |

## Authority

This repo is a **published workbench**, not the system of record.

- Manuscript authority: `PHAROS-OFFICIAL`, `PHAROS-CORPUS`
- Local register sources: `~/docs/_REGISTERS`
- Normalized package companions: `package/`

Sources are coordinated by file, not merged into one replacement narrative.

## Local open

```bash
cd ~/docs/PHAROS-workbench
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```

## Pages setup

GitHub Pages is configured from the `main` branch, site root (`/`).
`.nojekyll` prevents Jekyll from rewriting paths under `files/`.
