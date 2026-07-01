import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { listPublicMedia } from "../lib/d1";
import { buildFeedItems, SITE_URL } from "../lib/feed";

export const prerender = false;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 feed of approved evidence, for anyone who wants to follow or
 * republish deliveries programmatically without polling /api/gallery. */
export const GET: APIRoute = async () => {
  const groups = await listPublicMedia(env.DB, { limit: 50 });
  const items = buildFeedItems(groups);

  const itemsXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${SITE_URL}/#gallery</link>
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>
      <pubDate>${new Date(item.dateMs).toUTCString()}</pubDate>
      <description>${escapeXml(item.summaryEn ? `${item.summary} (English: ${item.summaryEn})` : item.summary)}</description>
${item.attachments.map((a) => `      <enclosure url="${escapeXml(a.url)}" type="${a.mimeType}" length="0"/>`).join("\n")}
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Crypto for Venezuela — Evidence</title>
    <link>${SITE_URL}/</link>
    <description>Photo- and video-verified relief deliveries in Venezuela, approved by a human before publishing.</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300" },
  });
};
