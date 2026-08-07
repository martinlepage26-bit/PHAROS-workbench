# PHAROS Workbench

**Secure host:** https://pharos-workbench-api.martinlepage26.workers.dev/

Operational CRUD board for PHAROS method work + **EMERAULD (Git)** vault pointers.

## Architecture

| Piece | Location |
|-------|----------|
| App UI | `backend/public/` (shell + CSS + ES modules) |
| API | `backend/src/` (Worker + D1) |
| Board schema | v3 `blocks[]` (`links` · `pipeline` · `list`) |
| Auth | HttpOnly session cookie |
| Method HTML | `backend/public/files/` |
| GitHub Pages | root redirect only |

See [BACKEND_SETUP.md](./BACKEND_SETUP.md).

## Develop

```bash
cd backend
npm test
npx wrangler dev
```

## Deploy

```bash
cd backend
unset CLOUDFLARE_API_TOKEN
npx wrangler deploy
```
