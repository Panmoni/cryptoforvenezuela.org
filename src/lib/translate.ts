/** Free, in-stack machine translation via Workers AI — no paid API, no key.
 * Best-effort only: a failed or low-confidence translation must never block
 * approval, so callers get null on any error and fall back to showing just
 * the original text. */
export async function translateToEnglish(ai: Ai, text: string, sourceLang = "es"): Promise<string | null> {
  try {
    const result = await ai.run("@cf/meta/m2m100-1.2b", {
      text,
      source_lang: sourceLang,
      target_lang: "en",
    });
    const translated = (result as { translated_text?: string }).translated_text?.trim();
    return translated && translated.length > 0 ? translated : null;
  } catch {
    return null;
  }
}
