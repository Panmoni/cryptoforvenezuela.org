import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { serveR2Object } from "../../../../lib/r2";

export const prerender = false;

/** Streams a pending-review photo from the private bucket for the admin
 * preview. Gated the same way as the rest of /admin — by Cloudflare
 * Access at the edge, not by anything in this handler. */
export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return new Response("not found", { status: 404 });

  return serveR2Object(env.MEDIA_PENDING, id, request, "private, max-age=60");
};
