# Connect the workbench to the backend

1. Open https://martinlepage26-bit.github.io/PHAROS-workbench/
2. Click **Backend**
3. API URL (default):
   `https://pharos-workbench-api.martinlepage26.workers.dev`
4. Paste API key from this machine:
   ```bash
   cat ~/.secrets/pharos-workbench-api-key.txt
   # or
   bash ~/docs/PHAROS-workbench/backend/print-key.sh
   ```
5. Enable **Use remote backend** + **Auto-sync**
6. **Test connection** → **Save settings**
7. Status should show `backend: online · rN`

Edits write to Cloudflare D1. localStorage is the offline cache.
