import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { ApproveRequestSchema } from "../../../lib/schema";
import { approveMediaGroup, getPendingMediaBatch, insertSocialDrafts } from "../../../lib/d1";
import { stripJpegExif } from "../../../lib/exif";
import { buildDrafts } from "../../../lib/social";
import { translateToEnglish } from "../../../lib/translate";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const parsed = ApproveRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: z.flattenError(parsed.error) }, { status: 400 });
  }
  const req = parsed.data;
  const { DB, MEDIA_PENDING, MEDIA_PUBLIC, AI } = env;

  const pending = await getPendingMediaBatch(DB, req.mediaIds);
  if (pending.length !== req.mediaIds.length) {
    return Response.json({ error: "one or more items not found or already decided" }, { status: 404 });
  }

  const r2PublicKeys: Record<string, string> = {};
  for (const row of pending) {
    const object = await MEDIA_PENDING.get(row.r2_pending_key);
    if (!object) {
      return Response.json({ error: `media file missing from storage: ${row.id}` }, { status: 500 });
    }
    const originalBytes = await object.arrayBuffer();
    const publicBytes = row.media_kind === "photo" ? stripJpegExif(originalBytes) : originalBytes;
    // Ingestion (workers/vision-extract) stores the real content-type from
    // Telegram's file response; this default only covers the unlikely case
    // that's missing, and must match the kind — a video served as
    // image/jpeg won't play in a <video> element.
    const fallbackContentType =
      row.media_kind === "photo" ? "image/jpeg" : row.media_kind === "video" ? "video/mp4" : "application/octet-stream";
    await MEDIA_PUBLIC.put(row.r2_pending_key, publicBytes, {
      httpMetadata: { contentType: object.httpMetadata?.contentType ?? fallbackContentType },
    });
    r2PublicKeys[row.id] = row.r2_pending_key;
  }

  // Translate once, at approve time, so it's never redone per pageview —
  // best-effort: a failed translation still lets the post publish with just
  // the original Spanish caption.
  const senderCaption = pending.map((row) => row.sender_caption).find((c): c is string => c !== null);
  const senderCaptionEn = senderCaption ? await translateToEnglish(AI, senderCaption) : null;

  await approveMediaGroup(DB, req, r2PublicKeys, senderCaptionEn);
  await insertSocialDrafts(
    DB,
    buildDrafts({
      mediaId: req.mediaIds[0],
      category: req.category,
      items: req.items,
      mediaKey: r2PublicKeys[req.mediaIds[0]],
    }),
  );

  return Response.json({ ok: true });
};
