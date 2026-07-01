import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { RejectRequestSchema } from "../../../lib/schema";
import { rejectMediaGroup } from "../../../lib/d1";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const parsed = RejectRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: z.flattenError(parsed.error) }, { status: 400 });
  }
  await rejectMediaGroup(env.DB, parsed.data.mediaIds, parsed.data.reason);
  return Response.json({ ok: true });
};
