import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { RejectRequestSchema } from "../../../lib/schema";
import { rejectMedia } from "../../../lib/d1";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const parsed = RejectRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: z.flattenError(parsed.error) }, { status: 400 });
  }
  await rejectMedia(env.DB, parsed.data.mediaId, parsed.data.reason);
  return Response.json({ ok: true });
};
