#!/usr/bin/env bash
# Subtitle a local video file. Never touches R2/D1/the gallery — the only
# network call is to the Workers AI Whisper tool endpoint (transcription
# only), which is independent of the media/gallery pipeline. Use this for
# clips that go straight to X and don't need to be published anywhere.
#
# Usage: scripts/subtitle-local.sh <video-file> [source-language] [output-dir]
# source-language is a source-audio hint (e.g. "es") passed straight to
# Whisper as `language` — omit it to let Whisper auto-detect.
set -euo pipefail

VIDEO_IN="${1:?usage: scripts/subtitle-local.sh <video-file> [source-language] [output-dir]}"
LANG_HINT="${2:-}"
OUT_DIR="${3:-./.local/subtitled}"
SITE_BASE="https://cryptoforvenezuela.org"

cd "$(dirname "$0")/.."

[ -f "$VIDEO_IN" ] || { echo "no such file: $VIDEO_IN" >&2; exit 1; }
mkdir -p "$OUT_DIR"

if [ ! -f .env ] || ! grep -q '^SUBTITLES_TOOL_SECRET=' .env; then
  echo "SUBTITLES_TOOL_SECRET not found in .env — run 'wrangler secret put SUBTITLES_TOOL_SECRET' first" >&2
  exit 1
fi
SECRET="$(grep '^SUBTITLES_TOOL_SECRET=' .env | cut -d= -f2-)"

BASENAME="$(basename "${VIDEO_IN%.*}")"
AUDIO="$OUT_DIR/$BASENAME.mp3"
RESPONSE="$OUT_DIR/$BASENAME.json"
SRT="$OUT_DIR/$BASENAME.srt"
SUBBED="$OUT_DIR/$BASENAME.subtitled.mp4"

echo "Extracting audio..."
ffmpeg -y -loglevel error -i "$VIDEO_IN" -vn -ac 1 -ar 16000 -q:a 4 "$AUDIO"

echo "Transcribing + translating (Workers AI Whisper)..."
SUB_URL="$SITE_BASE/api/tools/subtitles"
if [ -n "$LANG_HINT" ]; then
  SUB_URL="$SUB_URL?lang=$LANG_HINT"
fi
curl -sf -X POST "$SUB_URL" \
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

# Fontsize/MarginV are NOT scaled by us to the video's real resolution —
# ffmpeg's SRT-to-ASS conversion already renders against a fixed internal
# reference height regardless of actual video size, so it auto-scales these
# numbers up proportionally on its own. Scaling them again by our own
# ffprobe'd height compounded into ~4x-oversized, screen-filling text
# (confirmed by A/B testing identical force_style strings with and without
# height-based scaling). Flat constants, verified visually at 720x1280,
# are what actually renders as a normal bottom caption.
echo "Burning subtitles into video..."
# -pix_fmt yuv420p forces standard 8-bit output. Without it, ffmpeg carries
# over the source's 10-bit format (common on newer-iPhone HEVC footage) into
# the re-encoded H.264 stream as profile "High 10" — a combination almost no
# player or platform (X included) can decode, so the file just fails to open.
ffmpeg -y -loglevel error -i "$VIDEO_IN" \
  -vf "subtitles=$SRT:force_style='FontName=DejaVu Sans,Fontsize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=40'" \
  -pix_fmt yuv420p -c:a copy "$SUBBED"

echo "Done: $SUBBED"
