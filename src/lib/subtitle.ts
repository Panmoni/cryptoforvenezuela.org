import { translateToEnglish } from "./translate";

/** English subtitles via Workers AI — Whisper for accurate transcription
 * with timestamps, m2m100 for translation (the same model this repo already
 * uses for caption translation). Whisper's own `task: "translate"` is
 * documented to do this in one call, but it's a no-op in practice here —
 * verified across several source-language hints, output always stayed in
 * the source language — so translation is a separate, proven step instead. */
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

interface Cue {
  start: number;
  end: number;
  text: string;
}

const MAX_CUE_CHARS = 70;

/** Whisper here returns coarse, pause-delimited segments — a single "segment"
 * can be an entire multi-sentence paragraph spanning 20+ seconds. Burned in
 * as one subtitle cue, that wraps into a wall of text covering most of the
 * frame instead of a normal caption. Split each segment into short,
 * proportionally-timed phrase cues so captions read like real subtitles —
 * a few words at a time, advancing with the speech. */
function splitIntoCues(segment: WhisperSegment): Cue[] {
  const text = segment.text?.trim();
  if (!text) return [];
  const start = segment.start ?? 0;
  const end = Math.max(segment.end ?? start + 2, start + 0.1);
  const duration = end - start;

  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const atClauseEnd = /[.,!?…]$/.test(word);
    if (candidate.length >= MAX_CUE_CHARS || (atClauseEnd && candidate.length >= MAX_CUE_CHARS / 2)) {
      chunks.push(candidate);
      current = "";
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0) || 1;
  let cursor = start;
  return chunks.map((chunk) => {
    const share = Math.max((chunk.length / totalChars) * duration, 1.2);
    const cueStart = cursor;
    const cueEnd = Math.min(end, cueStart + share);
    cursor = cueEnd;
    return { start: cueStart, end: cueEnd, text: chunk };
  });
}

function cuesToSrt(cues: Cue[]): string {
  return cues
    .filter((cue) => cue.text.trim())
    .map((cue, i) => `${i + 1}\n${srtTimestamp(cue.start)} --> ${srtTimestamp(cue.end)}\n${cue.text.trim()}\n`)
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

export async function transcribeAndTranslate(ai: Ai, audio: Blob, sourceLanguage?: string): Promise<SubtitleResult> {
  // Docs confirm this model wants a base64 string, not the `{body,
  // contentType}` object form (which 400s with an opaque "Invalid input").
  const base64 = toBase64(await audio.arrayBuffer());
  const result = (await ai.run("@cf/openai/whisper-large-v3-turbo", {
    audio: base64,
    task: "transcribe",
    ...(sourceLanguage ? { language: sourceLanguage } : {}),
  })) as WhisperOutput;

  const detectedLanguage = result.transcription_info?.language ?? sourceLanguage ?? null;
  const sourceCues = (result.segments ?? []).flatMap(splitIntoCues);

  const englishCues = await Promise.all(
    sourceCues.map(async (cue) => ({
      ...cue,
      text: (await translateToEnglish(ai, cue.text, detectedLanguage ?? undefined)) ?? cue.text,
    })),
  );

  return {
    text: englishCues.map((cue) => cue.text).join(" "),
    srt: cuesToSrt(englishCues),
    language: detectedLanguage,
  };
}
