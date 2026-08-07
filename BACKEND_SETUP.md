# Pharos Workbench — secure host

## Canonical URL

**https://pharos-workbench-api.martinlepage26.workers.dev/**

- Same-origin UI + API on Cloudflare Worker
- Auth: **HttpOnly / Secure / SameSite=Lax** cookie `wb_session`
- No API key in page source
- Board state: Cloudflare **D1** `pharos-workbench`

## Bootstrap (once per browser)

```bash
KEY=$(cat ~/.secrets/pharos-workbench-api-key.txt)
xdg-open "https://pharos-workbench-api.martinlepage26.workers.dev/api/session/bootstrap?key=${KEY}"
```

Or open that URL manually. It sets the cookie and redirects to `/`.

## GitHub Pages

https://martinlepage26-bit.github.io/PHAROS-workbench/ redirects to the Worker.

## Deploy

```bash
cd ~/docs/PHAROS-workbench/backend
unset CLOUDFLARE_API_TOKEN
wrangler deploy
```
