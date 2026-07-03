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

export async function transcribeAndTranslate(ai: Ai, audio: Blob, contentType: string): Promise<SubtitleResult> {
  const result = (await ai.run("@cf/openai/whisper-large-v3-turbo", {
    audio: { body: audio, contentType },
    task: "translate",
  })) as WhisperOutput;

  return {
    text: result.text ?? "",
    srt: segmentsToSrt(result.segments ?? []),
    language: result.transcription_info?.language ?? null,
  };
}
