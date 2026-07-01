import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

export const prerender = false;

/** Streams a pending-review photo from the private bucket for the admin
 * preview. Gated the same way as the rest of /admin — by Cloudflare
 * Access at the edge, not by anything in this handler. */
export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return new Response("not found", { status: 404 });

  const object = await env.MEDIA_PENDING.get(id);
  if (!object) return new Response("not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "private, max-age=60",
    },
  });
};
