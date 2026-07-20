#!/usr/bin/env bash
cd "$(dirname "$0")/.." || exit 1
for ep in 21-1 22-2 28-1 28-2 31-3 27-3; do
  echo "=== EPISODE $ep 시작 $(date +%H:%M) ==="
  npm run episode -- "$ep" || echo "FAIL $ep"
done
echo "REBUILDDONE $(date +%H:%M)"
