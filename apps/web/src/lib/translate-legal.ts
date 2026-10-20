import { translateBatch } from "./translate";
import type { Locale } from "./i18n";

const BULLET = "• ";
const CHUNK = 12;

/**
 * Translate legal strings into the target locale (cached, best-effort), preserving
 * leading "• " bullet markers so the renderer still detects list items. English
 * passes through unchanged; English remains the governing legal version.
 *
 * Legal documents are long, so we split the strings into small chunks translated
 * in parallel — each call stays well under the model timeout, and results are
 * cached per-string so subsequent renders are instant.
 */
export async function localizeLegalStrings(strings: string[], locale: Locale): Promise<string[]> {
  if (locale === "en") return strings;
  const bullets = strings.map((s) => s.startsWith(BULLET));
  const stripped = strings.map((s, i) => (bullets[i] ? s.slice(BULLET.length) : s));

  const chunks: string[][] = [];
  for (let i = 0; i < stripped.length; i += CHUNK) chunks.push(stripped.slice(i, i + CHUNK));
  const translated = (await Promise.all(chunks.map((c) => translateBatch(c, locale)))).flat();

  return translated.map((s, i) => (bullets[i] ? BULLET + s : s));
}
