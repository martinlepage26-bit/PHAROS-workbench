# PHAROS Workbench — Research Operations and Knowledge Mapping

PHAROS Workbench organizes research method work into an editable board and connects it to corpus registers, timelines, and knowledge maps. It pairs a browser interface with a TypeScript API on Cloudflare Workers and D1.

## Review the implementation

| Concern | Source |
| --- | --- |
| Board validation and schema tests | [Schema](backend/src/schema.ts), [tests](backend/src/schema.test.ts) |
| Session authentication | [Authentication](backend/src/auth.ts), [tests](backend/src/auth.test.ts) |
| API and persistence | [Worker](backend/src/index.ts), [migrations](backend/migrations/) |
| Browser interface | [UI modules](backend/public/js/), [styles](backend/public/css/) |
| Product and design decisions | [Product](PRODUCT.md), [design](DESIGN.md) |

The project demonstrates research workflow modeling, schema validation, session-based access, and a serverless application structure. The hosted workspace may require authentication; it is not an anonymous sample-data demo.

## Hosted workspace

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
