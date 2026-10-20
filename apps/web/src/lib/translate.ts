import crypto from "crypto";
import { prisma } from "@app/db";
import type { Locale } from "./i18n";

const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", ar: "Arabic", fr: "French", 
  pt: "Portuguese"     
};

const hashKey = (locale: string, text: string) =>
  crypto.createHash("sha256").update(`${locale}\n${text}`).digest("hex");

/**
 * Translate dynamic/DB strings into the target locale, best-effort.
 * - Source language is assumed English; `en` (and empty strings) pass through.
 * - Each unique (locale, text) is translated once and cached in the Translation
 *   table, so repeat views are a single DB lookup with no model cost.
 * - On any failure (no API key, network, parse) the original text is returned,
 *   so rendering never breaks.
 */
export async function translateBatch(texts: string[], locale: Locale): Promise<string[]> {
  if (locale === "en" || texts.length === 0) return texts;

  // De-duplicate non-empty strings.
  const unique = Array.from(new Set(texts.filter((t) => t && t.trim())));
  if (unique.length === 0) return texts;

  const out = new Map<string, string>();

  // 1) Cache hits.
  try {
    const hashes = unique.map((t) => hashKey(locale, t));
    const cached = await prisma.translation.findMany({ where: { hash: { in: hashes } } });
    const byHash = new Map(cached.map((c) => [c.hash, c.text]));
    for (const t of unique) {
      const hit = byHash.get(hashKey(locale, t));
      if (hit) out.set(t, hit);
    }
  } catch {
    /* DB unavailable — fall through, translate what we can */
  }

  // 2) Translate the misses via the model (one batched call).
  const misses = unique.filter((t) => !out.has(t));
  const key = process.env.OPENAI_API_KEY;
  if (misses.length && key) {
    try {
      const lang = LANG_NAMES[locale] ?? "English";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.OPENAI_TRANSLATE_MODEL || "gpt-4o-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                `You are a professional translator. Translate each value of the JSON object's "items" array into ${lang}. ` +
                `Preserve meaning and tone. Keep brand/product names (e.g. Unskinned) and technical terms unchanged. ` +
                `Return a JSON object {"items":[...]} with the translations in the SAME order and SAME length.`
            },
            { role: "user", content: JSON.stringify({ items: misses }) }
          ]
        }),
        signal: AbortSignal.timeout(45_000)
      });
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      const parsed = content ? JSON.parse(content) : null;
      const items: unknown = parsed?.items;
      if (Array.isArray(items) && items.length === misses.length) {
        const rows = misses.map((src, i) => ({ hash: hashKey(locale, src), locale, text: String(items[i] ?? src) }));
        for (let i = 0; i < misses.length; i++) out.set(misses[i], rows[i].text);
        // Persist (best-effort; ignore races on the unique hash).
        prisma.translation
          .createMany({ data: rows, skipDuplicates: true })
          .catch(() => {});
      }
    } catch {
      /* leave misses as originals */
    }
  }

  return texts.map((t) => (t && out.has(t) ? out.get(t)! : t));
}

/** Convenience: translate a single string. */
export async function translateText(text: string, locale: Locale): Promise<string> {
  return (await translateBatch([text], locale))[0];
}
