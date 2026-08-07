#!/usr/bin/env bash
set -euo pipefail
KEYFILE="${HOME}/.secrets/pharos-workbench-api-key.txt"
[[ -f "$KEYFILE" ]] || { echo "missing $KEYFILE" >&2; exit 1; }
cat "$KEYFILE"; echo
