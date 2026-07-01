import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { listPublicMedia } from "../../lib/d1";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const category = url.searchParams.get("category") ?? undefined;
  const offset = Number(url.searchParams.get("offset") ?? "0") || 0;
  const items = await listPublicMedia(env.DB, { category, offset });
  return Response.json({ items }, { headers: { "cache-control": "public, max-age=30" } });
};
