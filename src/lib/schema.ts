import { z } from "zod";

/** Advisory-only vision extraction output. Never gates anything — a human
 * always reviews the underlying photo before any of this becomes public.
 * Every field is optional/nullable on purpose: a partial or failed
 * extraction just means the admin fills in more by hand. */
export const ExtractionSuggestionSchema = z.object({
  category: z.enum(["food", "hygiene", "hospital", "water", "shelter", "other"]).nullable(),
  items: z
    .array(
      z.object({
        name: z.string(),
        count_estimate: z.number().int().nonnegative(),
      }),
    )
    .default([]),
  scene_description: z.string().nullable(),
  location_hint: z.string().nullable(),
  visible_date: z.string().nullable(),
  ocr_text: z.string().nullable(),
});
export type ExtractionSuggestion = z.infer<typeof ExtractionSuggestionSchema>;

export const CATEGORIES = ["food", "hygiene", "hospital", "water", "shelter", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const MediaStatusSchema = z.enum(["pending", "needs_review", "live", "rejected"]);
export type MediaStatus = z.infer<typeof MediaStatusSchema>;

/** Body for POST /api/admin/approve — what the admin actually confirmed,
 * which may differ from the model's suggestion (they can edit any field
 * before approving). This is the shape that becomes `impact` rows. */
export const ApproveRequestSchema = z.object({
  mediaId: z.string().min(1),
  category: z.enum(CATEGORIES),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        count: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});
export type ApproveRequest = z.infer<typeof ApproveRequestSchema>;

export const RejectRequestSchema = z.object({
  mediaId: z.string().min(1),
  reason: z.string().optional(),
});
export type RejectRequest = z.infer<typeof RejectRequestSchema>;

/** Telegram update shape, narrowed to only what the webhook actually reads. */
export const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      chat: z.object({ id: z.number() }),
      caption: z.string().optional(),
      media_group_id: z.string().optional(),
      photo: z.array(z.object({ file_id: z.string(), file_size: z.number().optional() })).optional(),
      video: z.object({ file_id: z.string(), file_size: z.number().optional() }).optional(),
      document: z
        .object({ file_id: z.string(), file_size: z.number().optional(), mime_type: z.string().optional() })
        .optional(),
    })
    .optional(),
});
export type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;
