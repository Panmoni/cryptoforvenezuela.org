import type { APIRoute } from "astro";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { listSocialDrafts, markDraftPosted } from "../../../lib/d1";

export const prerender = false;

export const GET: APIRoute = async () => {
  const items = await listSocialDrafts(env.DB);
  return Response.json({ items });
};

const PostedSchema = z.object({ id: z.number().int() });

export const POST: APIRoute = async ({ request }) => {
  const parsed = PostedSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: z.flattenError(parsed.error) }, { status: 400 });
  }
  await markDraftPosted(env.DB, parsed.data.id);
  return Response.json({ ok: true });
};
