import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { listNeedsReview } from "../../../lib/d1";

export const prerender = false;

export const GET: APIRoute = async () => {
  const items = await listNeedsReview(env.DB);
  return Response.json({ items });
};
