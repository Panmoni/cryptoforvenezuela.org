import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { serveR2Object } from "../../../lib/r2";

export const prerender = false;

/** Serves the approved, EXIF-stripped public copy. No auth — this bucket is
 * the public evidence store by design. For real CDN caching at scale, point
 * a custom domain directly at the R2 bucket instead (see SETUP.md); this
 * endpoint is what makes the gallery work without that extra setup step. */
export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (!id) return new Response("not found", { status: 404 });

  return serveR2Object(env.MEDIA_PUBLIC, id, request, "public, max-age=86400");
};
