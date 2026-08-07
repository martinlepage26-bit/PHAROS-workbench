# PHAROS Workbench

Browser-openable HTML surfaces for the PHAROS method-formation corpus.

## Live URLs (GitHub Pages)

| Surface | URL |
|---------|-----|
| Hub | https://martinlepage26-bit.github.io/PHAROS-workbench/ |
| Files | https://martinlepage26-bit.github.io/PHAROS-workbench/files/&lt;file&gt;.html |

## Layout

```text
PHAROS-workbench/
  index.html          # hub
  files/              # standalone HTML artifacts
  package/            # portable atlas markdown + manifest
  .nojekyll           # serve paths as-is on GitHub Pages
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
