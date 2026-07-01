const PLATFORMS = ["tiktok", "reels", "shorts"] as const;

/** Plain template, not a model call — a caption this simple doesn't need
 * an LLM, and it keeps draft generation free and instant on every Approve. */
export function generateCaption(category: string, items: { name: string; count: number }[]): string {
  const subject = items.length ? items.map((i) => `${i.count} ${i.name}`).join(", ") : "This delivery";
  return `${subject} just reached families in Venezuela — 100% wallet-to-wallet, photo-verified. cryptoforvenezuela.org #Venezuela #${category}`;
}

export interface DraftInput {
  mediaId: string;
  category: string;
  items: { name: string; count: number }[];
  mediaKey: string;
}

export function buildDrafts(input: DraftInput) {
  const caption = generateCaption(input.category, input.items);
  return PLATFORMS.map((platform) => ({
    mediaId: input.mediaId,
    platform,
    caption,
    mediaKey: input.mediaKey,
  }));
}
