# Pharos Workbench — finished architecture

## Host

**https://pharos-workbench-api.martinlepage26.workers.dev/**

## Layout (single source of truth)

```text
backend/
  src/
    index.ts           # HTTP router
    auth.ts            # cookie session, CORS allowlist, timing-safe secrets
    board.ts           # D1 read/write + event prune
    schema.ts          # v3 Block[] model + legacy upgrade
    default-board.ts   # server default board
    *.test.ts          # node:test suite
  public/              # ONLY static assets (UI + method HTML)
    index.html
    css/app.css
    js/{app,api,model,render}.js
    files/…
  wrangler.jsonc
```

Root of the git repo is GitHub Pages redirect stubs + docs only.

## Board model (v3)

```ts
{ version: 3, meta, blocks: Array<
  | { type: 'links'; id; items }
  | { type: 'pipeline'; id; title; stages }
  | { type: 'list'; id; title; layout; style; empty; items }
> }
```

Legacy `{ links, pipeline, sections }` is upgraded on read/write.

## Auth

- HttpOnly cookie `wb_session` (preferred)
- Bearer `WORKBENCH_API_KEY` for tooling
- **No** `?key=` query auth
- CORS only for origins in `CORS_ORIGINS`

```bash
KEY=$(cat ~/.secrets/pharos-workbench-api-key.txt)
xdg-open "https://pharos-workbench-api.martinlepage26.workers.dev/api/session/bootstrap?key=$KEY"
```

## Commands

```bash
cd backend
npm test
unset CLOUDFLARE_API_TOKEN
wrangler deploy
```
