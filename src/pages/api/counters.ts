import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getCounters } from "../../lib/d1";

export const prerender = false;

export const GET: APIRoute = async () => {
  const rows = await getCounters(env.DB);
  return Response.json(
    { counters: rows },
    { headers: { "cache-control": "public, max-age=30" } },
  );
};
