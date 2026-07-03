/** English subtitles via Workers AI Whisper — same free/cheap in-stack model
 * family as translateToEnglish, just the speech model instead of the text
 * one. `task: "translate"` gets Whisper to output English directly from
 * Spanish (or any source language) audio in one call, with per-segment
 * timestamps we turn into an .srt. */
export interface SubtitleResult {
  text: string;
  srt: string;
  language: string | null;
}

interface WhisperSegment {
  start?: number;
  end?: number;
  text?: string;
}

interface WhisperOutput {
  text: string;
  segments?: WhisperSegment[];
  transcription_info?: { language?: string };
}

function srtTimestamp(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const msRem = ms % 1000;
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(msRem, 3)}`;
}

function segmentsToSrt(segments: WhisperSegment[]): string {
  return segments
    .filter((s) => s.text?.trim())
    .map((s, i) => {
      const start = srtTimestamp(s.start ?? 0);
      const end = srtTimestamp(s.end ?? (s.start ?? 0) + 2);
      return `${i + 1}\n${start} --> ${end}\n${s.text!.trim()}\n`;
    })
    .join("\n");
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function transcribeAndTranslate(ai: Ai, audio: Blob): Promise<SubtitleResult> {
  // Docs confirm this model wants a base64 string, not the `{body,
  // contentType}` object form (which 400s with an opaque "Invalid input").
  const base64 = toBase64(await audio.arrayBuffer());
  // Cloudflare's own example pairs task:"translate" with language:"en" —
  // without it, translate is silently ignored and output stays in the
  // source language (confirmed empirically against item #9's Spanish clip).
  const result = (await ai.run("@cf/openai/whisper-large-v3-turbo", {
    audio: base64,
    task: "translate",
    language: "en",
  })) as WhisperOutput;

  return {
    text: result.text ?? "",
    srt: segmentsToSrt(result.segments ?? []),
    language: result.transcription_info?.language ?? null,
  };
}
