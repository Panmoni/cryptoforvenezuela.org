import { ExtractionSuggestionSchema } from "../../../src/lib/schema";
import type { VisionQueueMessage } from "../../telegram-webhook/src/index";

interface Env {
  DB: D1Database;
  MEDIA_PENDING: R2Bucket;
  ANTHROPIC_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_CHAT_ID?: string;
}

// Sonnet 5 per explicit choice. This is advisory pre-fill only (never a
// gate — see the module comment on extractAdvisory below), so if cost
// becomes a concern on volume this is a one-line swap back to a cheaper
// tier, e.g. "claude-haiku-4-5-20251001".
const ANTHROPIC_MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = `You are extracting a best-guess inventory of relief supplies from a photo for a
human reviewer to confirm or correct. Respond with STRICT JSON ONLY, no prose, no markdown fences,
matching exactly this shape:
{
  "category": "food" | "hygiene" | "hospital" | "water" | "shelter" | "other" | null,
  "items": [{"name": string, "count_estimate": integer}],
  "scene_description": string | null,
  "location_hint": string | null,
  "visible_date": string | null,
  "ocr_text": string | null
}
This is advisory only — a human will look at the photo themselves before anything is published, so
give your honest best guess rather than omitting uncertain fields. If you can't tell, use null or an
empty items array.`;

export default {
  async queue(batch: MessageBatch<VisionQueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processOne(message.body, env);
        message.ack();
      } catch (err) {
        console.error(`vision-extract failed for media ${message.body.mediaId}`, err);
        message.retry();
      }
    }
  },
};

async function processOne({ mediaId, fileId, caption, kind }: VisionQueueMessage, env: Env): Promise<void> {
  const { bytes, contentType } = await downloadTelegramFile(env.TELEGRAM_BOT_TOKEN, fileId);
  await env.MEDIA_PENDING.put(mediaId, bytes, {
    httpMetadata: { contentType: contentType ?? undefined },
  });

  // The Anthropic call below only understands still images — sending video/
  // document bytes mislabeled as image/jpeg just fails silently. Skip it
  // and let the admin fill the form in by hand for those.
  const suggestion = kind === "photo" ? await extractAdvisory(bytes, env.ANTHROPIC_API_KEY, caption) : null;

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO extraction (media_id, category, items_json, scene, location_hint, visible_date, ocr_text, extracted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      mediaId,
      suggestion?.category ?? null,
      suggestion ? JSON.stringify(suggestion.items) : null,
      suggestion?.scene_description ?? null,
      suggestion?.location_hint ?? null,
      suggestion?.visible_date ?? null,
      suggestion?.ocr_text ?? null,
      Date.now(),
    ),
    env.DB.prepare(`UPDATE media SET status = 'needs_review' WHERE id = ? AND status = 'pending'`).bind(mediaId),
  ]);

  if (env.ADMIN_CHAT_ID) {
    await notifyAdmin(env.TELEGRAM_BOT_TOKEN, env.ADMIN_CHAT_ID, mediaId);
  }
}

async function downloadTelegramFile(
  token: string,
  fileId: string,
): Promise<{ bytes: ArrayBuffer; contentType: string | null }> {
  const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const fileJson = (await fileRes.json()) as { ok: boolean; result?: { file_path?: string } };
  if (!fileJson.ok || !fileJson.result?.file_path) {
    throw new Error("Telegram getFile failed");
  }
  const bytesRes = await fetch(`https://api.telegram.org/file/bot${token}/${fileJson.result.file_path}`);
  if (!bytesRes.ok) {
    throw new Error(`Telegram file download failed: ${bytesRes.status}`);
  }
  return { bytes: await bytesRes.arrayBuffer(), contentType: bytesRes.headers.get("content-type") };
}

/**
 * Advisory pre-fill for the admin form. Returns null on any failure —
 * there is no retry-loop against the model and no rejection path here,
 * because this never gates publication. A null result just means the
 * admin types the fields in by hand instead of editing pre-filled ones.
 */
async function extractAdvisory(bytes: ArrayBuffer, apiKey: string, senderCaption?: string) {
  try {
    const base64 = arrayBufferToBase64(bytes);
    const instruction = senderCaption
      ? `The sender included this caption, possibly in Spanish: "${senderCaption}". Use it as context — it may name the items, the recipients, or the situation more precisely than the photo alone. Extract the JSON now.`
      : "Extract the JSON now.";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
              { type: "text", text: instruction },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((b) => b.type === "text")?.text;
    if (!text) return null;

    const stripped = text.trim().replace(/^```json?\n?/i, "").replace(/```$/, "");
    const parsed = ExtractionSuggestionSchema.safeParse(JSON.parse(stripped));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function notifyAdmin(token: string, adminChatId: string, mediaId: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: adminChatId,
      text: `New item ready for review (${mediaId}). Check /admin.`,
    }),
  }).catch(() => {});
}
