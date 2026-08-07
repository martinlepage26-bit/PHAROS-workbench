# PHAROS Workbench API

Cloudflare Worker + D1 backend for the operational PHAROS workbench board.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | no | Liveness |
| GET | `/api/board` | yes | Load board JSON + revision |
| PUT | `/api/board` | yes | Save board (`expected_revision` for optimistic lock) |
| DELETE | `/api/board` | yes | Delete board |
| GET | `/api/board/history` | yes | Recent write events |

Auth header: `Authorization: Bearer <WORKBENCH_API_KEY>`

## Deploy

```bash
unset CLOUDFLARE_API_TOKEN   # use wrangler OAuth
wrangler d1 migrations apply pharos-workbench --remote
printf '%s' "$KEY" | wrangler secret put WORKBENCH_API_KEY
wrangler deploy
```

## Local

```bash
echo "WORKBENCH_API_KEY=dev-local-key" > .dev.vars
wrangler d1 migrations apply pharos-workbench --local
wrangler dev
```
