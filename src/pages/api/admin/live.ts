import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { listLive } from "../../../lib/d1";

export const prerender = false;

export const GET: APIRoute = async () => {
  const items = await listLive(env.DB);
  return Response.json({ items });
};
