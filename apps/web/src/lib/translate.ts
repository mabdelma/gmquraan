import type { Locale } from "./i18n";

/**
 * Dynamic-string translation shim.
 *
 * The AI translation backend (an OpenAI call with a DB cache) was removed with
 * the rest of the AI from this app. The public site is Arabic-only and its copy
 * is hand-written, so there is no machine translation any more: these return
 * their input unchanged — which is exactly what they already did at runtime,
 * since no OpenAI key was ever configured here.
 *
 * The functions are kept rather than deleted so the dozen pages that still call
 * them need no edit, and so hand-written translation could be layered in here
 * later without touching a single caller.
 */
export async function translateBatch(texts: string[], _locale: Locale): Promise<string[]> {
  return texts;
}

/** Convenience: translate a single string. */
export async function translateText(text: string, _locale: Locale): Promise<string> {
  return text;
}
