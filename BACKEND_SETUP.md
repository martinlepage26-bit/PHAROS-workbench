# Pharos Workbench — architecture (post-remediation)

## Canonical host

**https://pharos-workbench-api.martinlepage26.workers.dev/**

| Layer | Path |
|-------|------|
| UI shell | `backend/public/index.html` |
| Styles | `backend/public/css/app.css` |
| Client JS | `backend/public/js/{app,api,model,render}.js` |
| API | `backend/src/{index,auth,board,default-board}.ts` |
| DB | D1 `pharos-workbench` |
| Auth | HttpOnly cookie `wb_session` (or Bearer for tools) |

Board data is **server-owned**. Client SEED is gone; empty boards get `defaultBoardData()` from the Worker.

## Login

```bash
KEY=$(cat ~/.secrets/pharos-workbench-api-key.txt)
# browser form on the site, or:
curl -X POST https://pharos-workbench-api.martinlepage26.workers.dev/api/session/login \
  -H 'content-type: application/json' \
  -d "{\"key\":\"$KEY\"}" -c cookies.txt
# break-glass bootstrap (sets cookie + redirect):
xdg-open "https://pharos-workbench-api.martinlepage26.workers.dev/api/session/bootstrap?key=$KEY"
```

## Deploy

```bash
cd ~/docs/PHAROS-workbench/backend
unset CLOUDFLARE_API_TOKEN
wrangler deploy
```
