import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { unpublishMedia } from "../../../lib/d1";

export const prerender = false;

const BodySchema = z.object({ mediaId: z.string().min(1) });

export const POST: APIRoute = async ({ request }) => {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: z.flattenError(parsed.error) }, { status: 400 });
  }
  const result = await unpublishMedia(env.DB, parsed.data.mediaId);
  if (!result.found) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  await Promise.all(result.r2PublicKeys.map((key) => env.MEDIA_PUBLIC.delete(key)));
  return Response.json({ ok: true });
};
