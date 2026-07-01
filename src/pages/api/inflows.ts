import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getInflows } from "../../lib/d1";

export const prerender = false;

export const GET: APIRoute = async () => {
  const rows = await getInflows(env.DB);
  const totals = rows.reduce<Record<string, number>>((acc, r) => {
    const key = `${r.chain}:${r.token}`;
    acc[key] = (acc[key] ?? 0) + Number(r.amount);
    return acc;
  }, {});
  return Response.json({ recent: rows, totals }, { headers: { "cache-control": "public, max-age=30" } });
};
