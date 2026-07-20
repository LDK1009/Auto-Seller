#!/usr/bin/env bash
# 7월 숏츠 배치 빌드 — 순차 실행, 실패해도 다음 편 계속
cd "$(dirname "$0")/.." || exit 1

EPISODES=(
  20-3 21-1 21-2 21-3 22-1 22-2 22-3
  23-1 23-2 23-3 24-1 24-2 24-3
  25-1 25-2 25-3 26-1 26-2 26-3
  27-1 27-2 27-3 28-1 28-2 28-3
  29-1 29-2 29-3 30-1 30-2 30-3
  31-1 31-2 31-3
)

for ep in "${EPISODES[@]}"; do
  echo "=== EPISODE $ep 시작 $(date +%H:%M) ==="
  if ! npm run episode -- "$ep"; then
    echo "FAIL $ep"
  fi
done
echo "ALLDONE $(date +%H:%M)"
