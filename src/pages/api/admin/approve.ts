import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { ApproveRequestSchema } from "../../../lib/schema";
import { approveMedia, getPendingMedia, insertSocialDrafts } from "../../../lib/d1";
import { stripJpegExif } from "../../../lib/exif";
import { buildDrafts } from "../../../lib/social";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const parsed = ApproveRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: z.flattenError(parsed.error) }, { status: 400 });
  }
  const req = parsed.data;
  const { DB, MEDIA_PENDING, MEDIA_PUBLIC } = env;

  const pending = await getPendingMedia(DB, req.mediaId);
  if (!pending) {
    return Response.json({ error: "not found or already decided" }, { status: 404 });
  }

  const object = await MEDIA_PENDING.get(pending.r2_pending_key);
  if (!object) {
    return Response.json({ error: "media file missing from storage" }, { status: 500 });
  }

  const originalBytes = await object.arrayBuffer();
  const publicBytes = pending.media_kind === "photo" ? stripJpegExif(originalBytes) : originalBytes;
  const r2PublicKey = pending.r2_pending_key;

  await MEDIA_PUBLIC.put(r2PublicKey, publicBytes, {
    httpMetadata: { contentType: object.httpMetadata?.contentType ?? "image/jpeg" },
  });
  await approveMedia(DB, req, r2PublicKey);
  await insertSocialDrafts(
    DB,
    buildDrafts({ mediaId: req.mediaId, category: req.category, items: req.items, mediaKey: r2PublicKey }),
  );

  return Response.json({ ok: true });
};
