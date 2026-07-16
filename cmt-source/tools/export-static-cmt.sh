#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-$ROOT_DIR/static-export}"
PORT="${PORT:-4317}"

if [[ -e "$OUTPUT_DIR" ]]; then
  echo "Output already exists: $OUTPUT_DIR" >&2
  echo "Choose another output directory or remove the old export first." >&2
  exit 1
fi

cd "$ROOT_DIR"
npm run build

LOG_FILE="$(mktemp)"
PORT="$PORT" npm start >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  rm -f "$LOG_FILE"
}
trap cleanup EXIT INT TERM

READY=0
for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$PORT/" >/dev/null; then
    READY=1
    break
  fi
  sleep 0.25
done

if [[ "$READY" != "1" ]]; then
  echo "Vinext server did not become ready." >&2
  sed -n '1,160p' "$LOG_FILE" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR/assets"
curl -fsS "http://127.0.0.1:$PORT/" >"$OUTPUT_DIR/index.html"
cp -R "$ROOT_DIR/dist/client/assets/." "$OUTPUT_DIR/assets/"
cp "$ROOT_DIR/dist/client/favicon.svg" "$OUTPUT_DIR/favicon.svg"

# Static exports are served from a subfolder such as /cmt/ or /cmt-preview/.
# Convert root-absolute asset/favicon references to document-relative paths,
# then make dynamic imports explicitly relative for mobile Safari and Chromium.
perl -pi -e 's#/assets/#assets/#g; s#/favicon\.svg#favicon.svg#g; s#import\("assets/#import("./assets/#g' "$OUTPUT_DIR/index.html"

echo "Static TikTak CMT export created at: $OUTPUT_DIR"
