import type { ApproveRequest, Category } from "./schema";

export interface NeedsReviewItem {
  id: string;
  received_at: number;
  media_kind: string;
  r2_pending_key: string;
  sender_caption: string | null;
  category: string | null;
  items_json: string | null;
  scene: string | null;
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

export async function listNeedsReview(db: D1Database): Promise<NeedsReviewItem[]> {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.received_at, m.media_kind, m.r2_pending_key, m.sender_caption,
              e.category, e.items_json, e.scene, e.location_hint, e.visible_date, e.ocr_text
       FROM media m
       LEFT JOIN extraction e ON e.media_id = m.id
       WHERE m.status = 'needs_review'
       ORDER BY m.received_at ASC`,
    )
    .all<NeedsReviewItem>();
  return results;
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
 * Approve is the one write path that promotes a photo to public. It's
 * always a human action from /admin — see src/pages/api/admin/approve.ts —
 * never called from the extraction worker.
 */
export async function approveMedia(db: D1Database, req: ApproveRequest, r2PublicKey: string): Promise<void> {
  const statements = [
    db
      .prepare(`UPDATE media SET status = 'live', r2_public_key = ? WHERE id = ? AND status = 'needs_review'`)
      .bind(r2PublicKey, req.mediaId),
    ...req.items.map((item) =>
      db
        .prepare(`INSERT INTO impact (media_id, category, item_name, count) VALUES (?, ?, ?, ?)`)
        .bind(req.mediaId, req.category, item.name, item.count),
    ),
  ];
  await db.batch(statements);
}

/** Pulls a wrongly-approved item back out of `live` for correction. Clears
 * its impact rows (the counters must never include it while it's back in
 * the queue) and returns it to `needs_review` so the fix goes through the
 * normal Approve path again rather than a second, parallel write path. */
export async function unpublishMedia(
  db: D1Database,
  mediaId: string,
): Promise<{ found: boolean; r2PublicKey: string | null }> {
  const row = await db.prepare(`SELECT r2_public_key FROM media WHERE id = ? AND status = 'live'`).bind(mediaId).first<{
    r2_public_key: string | null;
  }>();
  if (!row) return { found: false, r2PublicKey: null };

  await db.batch([
    db.prepare(`DELETE FROM impact WHERE media_id = ?`).bind(mediaId),
    db.prepare(`UPDATE media SET status = 'needs_review', r2_public_key = NULL WHERE id = ?`).bind(mediaId),
  ]);
  return { found: true, r2PublicKey: row.r2_public_key };
}

export interface PendingMediaRow {
  r2_pending_key: string;
  media_kind: string;
}

export async function getPendingMedia(db: D1Database, mediaId: string): Promise<PendingMediaRow | null> {
  return db
    .prepare(`SELECT r2_pending_key, media_kind FROM media WHERE id = ? AND status = 'needs_review'`)
    .bind(mediaId)
    .first<PendingMediaRow>();
}

export async function rejectMedia(db: D1Database, mediaId: string, reason?: string): Promise<void> {
  await db
    .prepare(`UPDATE media SET status = 'rejected', reject_reason = ? WHERE id = ? AND status = 'needs_review'`)
    .bind(reason ?? null, mediaId)
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

export interface PublicMediaItem {
  id: string;
  received_at: number;
  r2_public_key: string;
  category: string;
  items: { name: string; count: number }[];
}

/** Public gallery feed — every counter on /impact links back here, filtered
 * to the exact category/item that makes up that number. This is the
 * decomposition that makes a counter auditable rather than asserted. */
export async function listPublicMedia(
  db: D1Database,
  opts: { category?: string; limit?: number; offset?: number } = {},
): Promise<PublicMediaItem[]> {
  const limit = opts.limit ?? 24;
  const offset = opts.offset ?? 0;

  const distinctIds = opts.category
    ? await db
        .prepare(
          `SELECT DISTINCT m.id, m.received_at
           FROM media m JOIN impact i ON i.media_id = m.id
           WHERE m.status = 'live' AND i.category = ?
           ORDER BY m.received_at DESC LIMIT ? OFFSET ?`,
        )
        .bind(opts.category, limit, offset)
        .all<{ id: string; received_at: number }>()
    : await db
        .prepare(
          `SELECT id, received_at FROM media WHERE status = 'live' ORDER BY received_at DESC LIMIT ? OFFSET ?`,
        )
        .bind(limit, offset)
        .all<{ id: string; received_at: number }>();

  if (distinctIds.results.length === 0) return [];

  const ids = distinctIds.results.map((r) => r.id);
  const placeholders = ids.map(() => "?").join(",");
  const { results: impactRows } = await db
    .prepare(
      `SELECT m.id, m.r2_public_key, i.category, i.item_name, i.count
       FROM media m JOIN impact i ON i.media_id = m.id
       WHERE m.id IN (${placeholders})`,
    )
    .bind(...ids)
    .all<{ id: string; r2_public_key: string; category: string; item_name: string; count: number }>();

  const byId = new Map<string, PublicMediaItem>();
  for (const row of distinctIds.results) {
    byId.set(row.id, { id: row.id, received_at: row.received_at, r2_public_key: "", category: "", items: [] });
  }
  for (const row of impactRows) {
    const entry = byId.get(row.id)!;
    entry.r2_public_key = row.r2_public_key;
    entry.category = row.category;
    entry.items.push({ name: row.item_name, count: row.count });
  }
  return ids.map((id) => byId.get(id)!);
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
