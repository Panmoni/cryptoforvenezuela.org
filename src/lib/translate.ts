/** m2m100 has no glossary/domain-hint support, and post-hoc-correcting its
 * English output is unreliable — it mistranslates "carpa" (tent) inconsistently
 * ("carpet", "carpes", etc), so matching known-bad outputs is whack-a-mole.
 * Instead, swap the source term for a numeric placeholder m2m100 has no
 * reason to translate or garble, then restore the correct English word
 * after translation. */
const GLOSSARY_TERMS: Array<{ pattern: RegExp; singular: string; plural: string }> = [
  // Venezuelan-Spanish disaster-relief testimony: "carpa(s)" always means tent(s).
  { pattern: /\bcarpas?\b/gi, singular: "tent", plural: "tents" },
  // "pañalitis" (diaper rash, from "pañal" = diaper) is colloquial, not a
  // formal medical term — m2m100 mistranslates it inconsistently ("paniculitis",
  // "panalitis") or leaves it untranslated. Singular/plural intentionally
  // identical: the word already ends in "s", which would otherwise trip the
  // plural-detection heuristic below.
  { pattern: /\bpañalitis\b/gi, singular: "diaper rash", plural: "diaper rash" },
  // "talco" (talcum/baby powder) — plain word m2m100 has repeatedly left
  // untranslated verbatim in this testimony's supply-request lists.
  { pattern: /\btalcos?\b/gi, singular: "baby powder", plural: "baby powder" },
];

function protectGlossaryTerms(text: string): { text: string; restore: (translated: string) => string } {
  const replacements: { token: string; word: string }[] = [];
  const protectedText = GLOSSARY_TERMS.reduce(
    (acc, { pattern, singular, plural }) =>
      acc.replace(pattern, (match) => {
        const token = `90210${replacements.length}`;
        replacements.push({ token, word: /s$/i.test(match) ? plural : singular });
        return token;
      }),
    text,
  );
  return {
    text: protectedText,
    restore: (translated) => replacements.reduce((acc, { token, word }) => acc.split(token).join(word), translated),
  };
}

/** Free, in-stack machine translation via Workers AI — no paid API, no key.
 * Best-effort only: a failed or low-confidence translation must never block
 * approval, so callers get null on any error and fall back to showing just
 * the original text. */
export async function translateToEnglish(ai: Ai, text: string, sourceLang = "es"): Promise<string | null> {
  try {
    const { text: protectedText, restore } = protectGlossaryTerms(text);
    const result = await ai.run("@cf/meta/m2m100-1.2b", {
      text: protectedText,
      source_lang: sourceLang,
      target_lang: "en",
    });
    const translated = (result as { translated_text?: string }).translated_text?.trim();
    return translated && translated.length > 0 ? restore(translated) : null;
  } catch {
    return null;
  }
}
