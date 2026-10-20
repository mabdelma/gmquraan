import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { translateBatch } from "@/lib/translate";

export default async function NotFound() {
  const locale = await getLocale();
  const [heading, body, back] = await translateBatch(
    ["Page not found", "The page you're looking for doesn't exist or has moved.", "Back home"],
    locale
  );
  return (
    <section className="mx-auto max-w-xl px-5 py-32 text-center">
      <div className="text-6xl font-extrabold app-gradient-text">404</div>
      <h1 className="text-2xl font-bold mt-4">{heading}</h1>
      <p className="text-[color:var(--ink)]/60 mt-2">{body}</p>
      <Link href="/" className="inline-block mt-8 app-gradient text-[color:var(--on-accent)] font-bold px-6 py-3 rounded-xl">
        {back}
      </Link>
    </section>
  );
}
