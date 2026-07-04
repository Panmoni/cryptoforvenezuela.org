import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { transcribeAndTranslate } from "../../../lib/subtitle";

export const prerender = false;

/** Internal tool, not part of the public site or the human-facing /admin —
 * scripted callers only, so it's gated the same way as the Telegram/chain
 * webhooks (a shared-secret header) rather than Cloudflare Access, which
 * expects a browser SSO session. POST the raw audio bytes (extract the
 * track with ffmpeg first — Whisper here takes audio, not a video
 * container) and get back English text plus an .srt ready to burn in. */
export const POST: APIRoute = async ({ request, url }) => {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!env.SUBTITLES_TOOL_SECRET || secret !== env.SUBTITLES_TOOL_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  const audio = await request.blob();
  if (audio.size === 0) {
    return Response.json({ error: "empty body" }, { status: 400 });
  }
  const sourceLanguage = url.searchParams.get("lang") ?? undefined;

  try {
    const result = await transcribeAndTranslate(env.AI, audio, sourceLanguage);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "transcription failed" }, { status: 502 });
  }
};
