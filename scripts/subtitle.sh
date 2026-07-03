#!/usr/bin/env bash
# Fetch a live media file, get English subtitles from the Workers AI Whisper
# tool endpoint, and burn them into a copy of the video.
#
# Usage: scripts/subtitle.sh <media-id> [output-dir]
set -euo pipefail

MEDIA_ID="${1:?usage: scripts/subtitle.sh <media-id> [output-dir]}"
OUT_DIR="${2:-./subtitled}"
SITE_BASE="https://cryptoforvenezuela.org"

cd "$(dirname "$0")/.."
mkdir -p "$OUT_DIR"

if [ ! -f .env ] || ! grep -q '^SUBTITLES_TOOL_SECRET=' .env; then
  echo "SUBTITLES_TOOL_SECRET not found in .env — run 'wrangler secret put SUBTITLES_TOOL_SECRET' first" >&2
  exit 1
fi
SECRET="$(grep '^SUBTITLES_TOOL_SECRET=' .env | cut -d= -f2-)"

VIDEO="$OUT_DIR/$MEDIA_ID.mp4"
AUDIO="$OUT_DIR/$MEDIA_ID.mp3"
RESPONSE="$OUT_DIR/$MEDIA_ID.json"
SRT="$OUT_DIR/$MEDIA_ID.srt"
SUBBED="$OUT_DIR/$MEDIA_ID.subtitled.mp4"

echo "Downloading $MEDIA_ID..."
curl -sf "$SITE_BASE/api/media/$MEDIA_ID" -o "$VIDEO"

echo "Extracting audio..."
ffmpeg -y -loglevel error -i "$VIDEO" -vn -ac 1 -ar 16000 -q:a 4 "$AUDIO"

echo "Transcribing + translating (Workers AI Whisper)..."
curl -sf -X POST "$SITE_BASE/api/tools/subtitles" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: audio/mpeg" \
  --data-binary "@$AUDIO" \
  -o "$RESPONSE"

python3 - "$RESPONSE" "$SRT" <<'PY'
import json, sys
resp_path, srt_path = sys.argv[1], sys.argv[2]
d = json.load(open(resp_path))
if "error" in d:
    print("subtitle request failed:", d["error"], file=sys.stderr)
    sys.exit(1)
open(srt_path, "w").write(d["srt"])
print("language detected:", d.get("language"))
print("text:", d["text"][:300])
PY

echo "Burning subtitles into video..."
ffmpeg -y -loglevel error -i "$VIDEO" \
  -vf "subtitles=$SRT:force_style='FontName=DejaVu Sans,FontSize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,MarginV=40'" \
  -c:a copy "$SUBBED"

echo "Done: $SUBBED"
