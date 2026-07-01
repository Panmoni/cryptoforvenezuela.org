import { TelegramUpdateSchema } from "../../../src/lib/schema";

interface Env {
  DB: D1Database;
  MEDIA_PENDING: R2Bucket;
  VISION_QUEUE: Queue<VisionQueueMessage>;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
}

export interface VisionQueueMessage {
  mediaId: string;
  fileId: string;
  chatId: number;
  caption?: string;
  kind: "photo" | "video" | "document";
}

const TELEGRAM_MAX_BOT_API_FILE_BYTES = 20 * 1024 * 1024;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("not found", { status: 404 });
    }

    // This header check is the entire authentication boundary for
    // ingestion — anyone who doesn't know TELEGRAM_WEBHOOK_SECRET gets
    // rejected before their payload is parsed at all.
    const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }

    let update;
    try {
      update = TelegramUpdateSchema.parse(await request.json());
    } catch {
      // Malformed body from something claiming to be Telegram — ack anyway
      // so nothing retries forever, but do nothing with it.
      return new Response("ok", { status: 200 });
    }

    const message = update.message;
    if (!message) {
      return new Response("ok", { status: 200 });
    }

    const chatId = message.chat.id;
    const allowed = await isAllowlisted(env.DB, chatId);
    if (!allowed) {
      // Silent 200 — same response shape as success, so probing this
      // endpoint doesn't reveal whether the allowlist check is what
      // rejected the request.
      return new Response("ok", { status: 200 });
    }

    const media = pickMedia(message);
    if (!media) {
      // Text-only message from an allowed sender — nothing to ingest.
      return new Response("ok", { status: 200 });
    }

    if (media.file_size && media.file_size > TELEGRAM_MAX_BOT_API_FILE_BYTES) {
      await sendMessage(
        env.TELEGRAM_BOT_TOKEN,
        chatId,
        "That file's too large for the bot to fetch (20MB limit) — a lower-res clip or a photo instead of a full video works.",
      );
      return new Response("ok", { status: 200 });
    }

    const mediaId = crypto.randomUUID();
    const r2PendingKey = `${mediaId}`;
    const mediaGroupId = message.media_group_id ?? null;

    // Telegram sends each photo in a multi-image post as a separate update,
    // and only ONE of them carries the caption. If this one didn't get it,
    // check whether a sibling in the same album already did.
    let caption = message.caption ?? null;
    if (!caption && mediaGroupId) {
      const sibling = await env.DB.prepare(
        `SELECT sender_caption FROM media WHERE media_group_id = ? AND sender_caption IS NOT NULL LIMIT 1`,
      )
        .bind(mediaGroupId)
        .first<{ sender_caption: string }>();
      caption = sibling?.sender_caption ?? null;
    }

    // INSERT OR IGNORE on the update_id unique index is the dedupe: a
    // Telegram-redelivered update silently no-ops here instead of
    // double-ingesting the same photo.
    const insert = await env.DB.prepare(
      `INSERT OR IGNORE INTO media (id, update_id, source_user, received_at, media_kind, r2_pending_key, status, sender_caption, media_group_id)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
      .bind(mediaId, update.update_id, String(chatId), Date.now(), media.kind, r2PendingKey, caption, mediaGroupId)
      .run();

    if (insert.meta.changes === 0) {
      // Already ingested this update_id — nothing new to enqueue.
      return new Response("ok", { status: 200 });
    }

    // Delivery order within an album isn't guaranteed — if THIS message is
    // the one that carried the caption, backfill any siblings that already
    // landed without it.
    if (message.caption && mediaGroupId) {
      await env.DB.prepare(
        `UPDATE media SET sender_caption = ? WHERE media_group_id = ? AND id != ? AND sender_caption IS NULL`,
      )
        .bind(message.caption, mediaGroupId, mediaId)
        .run();
    }

    await env.VISION_QUEUE.send({ mediaId, fileId: media.file_id, chatId, caption: caption ?? undefined, kind: media.kind });
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, "Got it — in the review queue now.");

    return new Response("ok", { status: 200 });
  },
};

async function isAllowlisted(db: D1Database, chatId: number): Promise<boolean> {
  const row = await db.prepare(`SELECT 1 FROM allowlist WHERE chat_id = ?`).bind(String(chatId)).first();
  return row !== null;
}

function pickMedia(
  message: NonNullable<ReturnType<typeof TelegramUpdateSchema.parse>["message"]>,
): { file_id: string; file_size?: number; kind: "photo" | "video" | "document" } | null {
  if (message.photo && message.photo.length > 0) {
    // Telegram sends multiple resolutions; the last is the largest.
    const largest = message.photo[message.photo.length - 1];
    return { file_id: largest.file_id, file_size: largest.file_size, kind: "photo" };
  }
  if (message.video) {
    return { file_id: message.video.file_id, file_size: message.video.file_size, kind: "video" };
  }
  if (message.animation) {
    // Telegram delivers GIFs as an MP4 under `animation`; store/preview it
    // the same way as `video`.
    return { file_id: message.animation.file_id, file_size: message.animation.file_size, kind: "video" };
  }
  if (message.document) {
    return { file_id: message.document.file_id, file_size: message.document.file_size, kind: "document" };
  }
  return null;
}

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {
    // Best-effort ack to the sender — losing this doesn't lose the photo,
    // which is already durably enqueued by this point.
  });
}
