import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { listPublicMedia } from "../lib/d1";
import { buildFeedItems, SITE_URL } from "../lib/feed";

export const prerender = false;

/** JSON Feed 1.1 (jsonfeed.org) of approved evidence — same data as
 * feed.xml, in a format that's trivial to consume without an XML parser. */
export const GET: APIRoute = async () => {
  const groups = await listPublicMedia(env.DB, { limit: 50 });
  const items = buildFeedItems(groups);

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Crypto for Venezuela — Evidence",
    home_page_url: `${SITE_URL}/`,
    feed_url: `${SITE_URL}/feed.json`,
    description: "Photo- and video-verified relief deliveries in Venezuela, approved by a human before publishing.",
    items: items.map((item) => ({
      id: item.id,
      url: `${SITE_URL}/#gallery`,
      title: item.title,
      content_text: item.summary,
      date_published: new Date(item.dateMs).toISOString(),
      attachments: item.attachments.map((a) => ({ url: a.url, mime_type: a.mimeType })),
    })),
  };

  return Response.json(feed, {
    headers: { "content-type": "application/feed+json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
};
