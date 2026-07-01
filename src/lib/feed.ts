import type { PublicMediaGroup } from "./d1";

const SITE_URL = "https://cryptoforvenezuela.org";

export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  dateMs: number;
  attachments: { url: string; mimeType: string }[];
}

function mimeTypeFor(mediaKind: string): string {
  if (mediaKind === "photo") return "image/jpeg";
  if (mediaKind === "video") return "video/mp4";
  return "application/octet-stream";
}

/** Shared shaping for both feed formats — one place that decides what a
 * feed item's title/summary look like for a group, itemized or not (see
 * approveMediaGroup's general-evidence support). */
export function buildFeedItems(groups: PublicMediaGroup[]): FeedItem[] {
  return groups.map((group) => {
    const itemsText = group.items.length ? group.items.map((i) => `${i.count} ${i.name}`).join(", ") : null;
    return {
      id: group.groupId,
      title: `${itemsText ?? "General evidence"} — ${group.category}`,
      summary: group.senderCaption ?? itemsText ?? "General evidence",
      dateMs: group.received_at,
      attachments: group.photos.map((p) => ({
        url: `${SITE_URL}/api/media/${p.r2_public_key}`,
        mimeType: mimeTypeFor(p.media_kind),
      })),
    };
  });
}

export { SITE_URL };
