import type { ApproveRequest, Category } from "./schema";

export interface NeedsReviewPhoto {
  id: string;
  media_kind: string;
  r2_pending_key: string;
  scene: string | null;
}

/** One review card per Telegram post — a multi-photo album shares a single
 * `media_group_id` and is reviewed/approved/rejected as one unit, so an
 * album never produces duplicate impact entries or duplicate social drafts. */
export interface NeedsReviewGroup {
  groupId: string;
  mediaIds: string[];
  photos: NeedsReviewPhoto[];
  received_at: number;
  sender_caption: string | null;
  category: string | null;
  items_json: string | null;
  location_hint: string | null;
  visible_date: string | null;
  ocr_text: string | null;
}

export interface LiveItem {
  id: string;
  received_at: number;
  r2_public_key: string | null;
  category: string;
  items: { name: string; count: number }[];
}

export async function listNeedsReview(db: D1Database): Promise<NeedsReviewGroup[]> {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.received_at, m.media_kind, m.r2_pending_key, m.sender_caption, m.media_group_id,
              e.category, e.items_json, e.scene, e.location_hint, e.visible_date, e.ocr_text
       FROM media m
       LEFT JOIN extraction e ON e.media_id = m.id
       WHERE m.status = 'needs_review'
       ORDER BY m.received_at ASC`,
    )
    .all<{
      id: string;
      received_at: number;
      media_kind: string;
      r2_pending_key: string;
      sender_caption: string | null;
      media_group_id: string | null;
      category: string | null;
      items_json: string | null;
      scene: string | null;
      location_hint: string | null;
      visible_date: string | null;
      ocr_text: string | null;
    }>();

  const groups = new Map<string, NeedsReviewGroup>();
  for (const row of results) {
    const groupId = row.media_group_id ?? row.id;
    let group = groups.get(groupId);
    if (!group) {
      group = {
        groupId,
        mediaIds: [],
        photos: [],
        received_at: row.received_at,
        sender_caption: row.sender_caption,
        category: row.category,
        items_json: null,
        location_hint: row.location_hint,
        visible_date: row.visible_date,
        ocr_text: row.ocr_text,
      };
      groups.set(groupId, group);
    }
    group.mediaIds.push(row.id);
    group.photos.push({ id: row.id, media_kind: row.media_kind, r2_pending_key: row.r2_pending_key, scene: row.scene });
    group.sender_caption ??= row.sender_caption;
    group.category ??= row.category;
    group.location_hint ??= row.location_hint;
    group.visible_date ??= row.visible_date;
    group.ocr_text ??= row.ocr_text;

    if (row.items_json) {
      try {
        const parsed: unknown = JSON.parse(row.items_json);
        const existing = group.items_json ? JSON.parse(group.items_json) : [];
        group.items_json = JSON.stringify([...existing, ...(Array.isArray(parsed) ? parsed : [])]);
      } catch {
        // Malformed extraction JSON for this one photo — the rest of the
        // group's suggestions still merge fine.
      }
    }
  }
  return [...groups.values()];
}

export async function listLive(db: D1Database, limit = 50): Promise<LiveItem[]> {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.received_at, m.r2_public_key, i.category, i.item_name, i.count
       FROM media m
       JOIN impact i ON i.media_id = m.id
       WHERE m.status = 'live'
       ORDER BY m.received_at DESC
       LIMIT ?`,
    )
    .bind(limit * 10) // generous row cap; grouped down to `limit` media items below
    .all<{
      id: string;
      received_at: number;
      r2_public_key: string | null;
      category: string;
      item_name: string;
      count: number;
    }>();

  const byMedia = new Map<string, LiveItem>();
  for (const row of results) {
    let entry = byMedia.get(row.id);
    if (!entry) {
      entry = {
        id: row.id,
        received_at: row.received_at,
        r2_public_key: row.r2_public_key,
        category: row.category,
        items: [],
      };
      byMedia.set(row.id, entry);
    }
    entry.items.push({ name: row.item_name, count: row.count });
  }
  return [...byMedia.values()].slice(0, limit);
}

/**
 * Approve is the one write path that promotes a group of photos (one
 * Telegram post, possibly a multi-photo album) to public. It's always a
 * human action from /admin — see src/pages/api/admin/approve.ts — never
 * called from the extraction worker. `impact` rows are written once,
 * against `mediaIds[0]`, regardless of how many photos are in the group —
 * writing them per-photo would double- (or triple-)count the same
 * donation every time it's documented with more than one image.
 */
export async function approveMediaGroup(
  db: D1Database,
  req: ApproveRequest,
  r2PublicKeys: Record<string, string>,
): Promise<void> {
  const primaryId = req.mediaIds[0];
  const statements = [
    ...req.mediaIds.map((id) =>
      db
        .prepare(`UPDATE media SET status = 'live', r2_public_key = ? WHERE id = ? AND status = 'needs_review'`)
        .bind(r2PublicKeys[id], id),
    ),
    ...req.items.map((item) =>
      db
        .prepare(`INSERT INTO impact (media_id, category, item_name, count) VALUES (?, ?, ?, ?)`)
        .bind(primaryId, req.category, item.name, item.count),
    ),
  ];
  await db.batch(statements);
}

/** Pulls a wrongly-approved post back out of `live` for correction —
 * reverts every photo in its group, not just the one carrying the impact
 * row, so the group re-appears in the review queue as one card instead of
 * leaving orphaned `live` photos behind with no impact entry. Clears the
 * impact rows (the counters must never include it while it's back in the
 * queue) and returns it to `needs_review` so the fix goes through the
 * normal Approve path again rather than a second, parallel write path. */
export async function unpublishMedia(
  db: D1Database,
  mediaId: string,
): Promise<{ found: boolean; r2PublicKeys: string[] }> {
  const row = await db
    .prepare(`SELECT r2_public_key, media_group_id FROM media WHERE id = ? AND status = 'live'`)
    .bind(mediaId)
    .first<{ r2_public_key: string | null; media_group_id: string | null }>();
  if (!row) return { found: false, r2PublicKeys: [] };

  const groupSiblings = row.media_group_id
    ? await db
        .prepare(`SELECT r2_public_key FROM media WHERE media_group_id = ? AND status = 'live'`)
        .bind(row.media_group_id)
        .all<{ r2_public_key: string | null }>()
    : null;
  const r2PublicKeys = (groupSiblings ? groupSiblings.results.map((r) => r.r2_public_key) : [row.r2_public_key]).filter(
    (k): k is string => k !== null,
  );

  const revertGroup = row.media_group_id
    ? db
        .prepare(`UPDATE media SET status = 'needs_review', r2_public_key = NULL WHERE media_group_id = ? AND status = 'live'`)
        .bind(row.media_group_id)
    : db.prepare(`UPDATE media SET status = 'needs_review', r2_public_key = NULL WHERE id = ?`).bind(mediaId);

  await db.batch([db.prepare(`DELETE FROM impact WHERE media_id = ?`).bind(mediaId), revertGroup]);
  return { found: true, r2PublicKeys };
}

export interface PendingMediaRow {
  id: string;
  r2_pending_key: string;
  media_kind: string;
}

export async function getPendingMediaBatch(db: D1Database, mediaIds: string[]): Promise<PendingMediaRow[]> {
  const placeholders = mediaIds.map(() => "?").join(",");
  const { results } = await db
    .prepare(`SELECT id, r2_pending_key, media_kind FROM media WHERE id IN (${placeholders}) AND status = 'needs_review'`)
    .bind(...mediaIds)
    .all<PendingMediaRow>();
  return results;
}

export async function rejectMediaGroup(db: D1Database, mediaIds: string[], reason?: string): Promise<void> {
  const placeholders = mediaIds.map(() => "?").join(",");
  await db
    .prepare(`UPDATE media SET status = 'rejected', reject_reason = ? WHERE id IN (${placeholders}) AND status = 'needs_review'`)
    .bind(reason ?? null, ...mediaIds)
    .run();
}

export interface CounterRow {
  category: Category;
  item_name: string;
  total: number;
}

export async function getCounters(db: D1Database): Promise<CounterRow[]> {
  const { results } = await db
    .prepare(
      `SELECT i.category, i.item_name, SUM(i.count) AS total
       FROM impact i
       JOIN media m ON m.id = i.media_id
       WHERE m.status = 'live'
       GROUP BY i.category, i.item_name
       ORDER BY total DESC`,
    )
    .all<CounterRow>();
  return results;
}

export interface PublicMediaGroup {
  groupId: string;
  received_at: number;
  category: string;
  items: { name: string; count: number }[];
  senderCaption: string | null;
  photos: { id: string; r2_public_key: string }[];
}

/** Public gallery feed — every counter on /impact links back here, filtered
 * to the exact category/item that makes up that number. This is the
 * decomposition that makes a counter auditable rather than asserted.
 *
 * Grouped by the same media_group_id used in admin review (see
 * listNeedsReview / approveMediaGroup) — a multi-photo Telegram post shows
 * as one card here too, not as separate unrelated tiles, and carries the
 * sender's own caption alongside the AI-derived item breakdown. Impact
 * rows live only on the group's primary media id, but every photo in the
 * group still shows up as supporting evidence. Dataset is small (a
 * pro-bono relief site, not a high-volume feed), so this groups and
 * paginates in JS rather than a multi-way SQL join. */
export async function listPublicMedia(
  db: D1Database,
  opts: { category?: string; limit?: number; offset?: number } = {},
): Promise<PublicMediaGroup[]> {
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;

  const [{ results: liveRows }, { results: impactRows }] = await Promise.all([
    db
      .prepare(
        `SELECT id, received_at, r2_public_key, media_group_id, sender_caption FROM media WHERE status = 'live' ORDER BY received_at DESC`,
      )
      .all<{
        id: string;
        received_at: number;
        r2_public_key: string | null;
        media_group_id: string | null;
        sender_caption: string | null;
      }>(),
    db
      .prepare(`SELECT media_id, category, item_name, count FROM impact`)
      .all<{ media_id: string; category: string; item_name: string; count: number }>(),
  ]);

  const impactByMedia = new Map<string, { category: string; items: { name: string; count: number }[] }>();
  for (const row of impactRows) {
    let entry = impactByMedia.get(row.media_id);
    if (!entry) {
      entry = { category: row.category, items: [] };
      impactByMedia.set(row.media_id, entry);
    }
    entry.items.push({ name: row.item_name, count: row.count });
  }

  const impactByGroup = new Map<string, { category: string; items: { name: string; count: number }[] }>();
  for (const row of liveRows) {
    const key = row.media_group_id ?? row.id;
    const own = impactByMedia.get(row.id);
    if (own && !impactByGroup.has(key)) impactByGroup.set(key, own);
  }

  const groups = new Map<string, PublicMediaGroup>();
  const order: string[] = [];
  for (const row of liveRows) {
    if (!row.r2_public_key) continue;
    const key = row.media_group_id ?? row.id;
    const impact = impactByGroup.get(key);
    if (!impact) continue; // orphaned live row with no group impact — shouldn't happen, but don't surface it
    if (opts.category && impact.category !== opts.category) continue;

    let group = groups.get(key);
    if (!group) {
      group = {
        groupId: key,
        received_at: row.received_at,
        category: impact.category,
        items: impact.items,
        senderCaption: row.sender_caption,
        photos: [],
      };
      groups.set(key, group);
      order.push(key);
    }
    group.photos.push({ id: row.id, r2_public_key: row.r2_public_key });
    group.senderCaption ??= row.sender_caption;
  }

  return order.slice(offset, offset + limit).map((k) => groups.get(k)!);
}

export interface InflowRow {
  tx_hash: string;
  chain: "solana" | "ethereum";
  from_addr: string;
  amount: string;
  token: string;
  confirmed_at: number;
}

export async function getInflows(db: D1Database, limit = 50): Promise<InflowRow[]> {
  const { results } = await db
    .prepare(
      `SELECT tx_hash, chain, from_addr, amount, token, confirmed_at
       FROM inflows
       ORDER BY confirmed_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<InflowRow>();
  return results;
}

export interface SocialDraftInsert {
  mediaId: string;
  platform: string;
  caption: string;
  mediaKey: string;
}

export async function insertSocialDrafts(db: D1Database, drafts: SocialDraftInsert[]): Promise<void> {
  if (drafts.length === 0) return;
  await db.batch(
    drafts.map((d) =>
      db
        .prepare(`INSERT INTO social_drafts (media_id, platform, caption, media_key, status) VALUES (?, ?, ?, ?, 'draft')`)
        .bind(d.mediaId, d.platform, d.caption, d.mediaKey),
    ),
  );
}

export interface SocialDraftRow {
  id: number;
  media_id: string;
  platform: string;
  caption: string;
  media_key: string;
  status: string;
}

export async function listSocialDrafts(db: D1Database): Promise<SocialDraftRow[]> {
  const { results } = await db
    .prepare(`SELECT id, media_id, platform, caption, media_key, status FROM social_drafts WHERE status = 'draft' ORDER BY id DESC`)
    .all<SocialDraftRow>();
  return results;
}

export async function markDraftPosted(db: D1Database, id: number): Promise<void> {
  await db.prepare(`UPDATE social_drafts SET status = 'posted' WHERE id = ?`).bind(id).run();
}
