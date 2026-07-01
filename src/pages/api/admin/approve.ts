import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { ApproveRequestSchema } from "../../../lib/schema";
import { approveMediaGroup, getPendingMediaBatch, insertSocialDrafts } from "../../../lib/d1";
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
    await MEDIA_PUBLIC.put(row.r2_pending_key, publicBytes, {
      httpMetadata: { contentType: object.httpMetadata?.contentType ?? "image/jpeg" },
    });
    r2PublicKeys[row.id] = row.r2_pending_key;
  }

  await approveMediaGroup(DB, req, r2PublicKeys);
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
