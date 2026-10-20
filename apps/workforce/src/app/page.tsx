import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale } from "@/lib/i18n.server";
import { getUi } from "@/lib/ui-i18n";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Sign in.
 *
 * Two routes to the same place. The password field takes the member's real
 * mailbox password, checked against the mail server and never stored; the link
 * button mails a one-time link to that same mailbox, which is the way back in
 * when someone is locked out or on a device where they do not know the
 * password.
 *
 * Both forms post to plain endpoints and re-render with `?error=` — no client
 * JavaScript is involved in authenticating, so the CSP can stay strict.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>;
}) {
  if (await getMember()) redirect("/home");
  const sp = await searchParams;
  const locale = await getLocale();
  const t = getUi(locale);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <div className="mb-6 flex items-center justify-end gap-2">
          <ThemeToggle />
          <LanguageSwitcher current={locale} />
        </div>
        <div className="flex items-center gap-3">
          <BrandLogo h={34} />
          <div className="text-2xl font-extrabold tracking-tight">
            GM<span className="[color:var(--accent-text)]">-OS</span>
          </div>
        </div>
        <h1 className="mt-4 text-xl font-bold">{t.signInTitle}</h1>
        <p className="mt-2 text-sm [color:var(--muted)]">
          {t.signInIntro}
        </p>
      </div>

      {sp.sent && (
        <p
          role="status"
          className="mb-4 rounded-xl px-4 py-3 text-sm panel"
        >
          If that address belongs to a team member, a sign-in link is on its way. It works once and
          expires in 15 minutes.
        </p>
      )}

      {sp.error && (
        <p role="alert" className="mb-4 rounded-xl px-4 py-3 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      <form action="/api/login" method="post" className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="email">
          {t.workEmail}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={sp.email || ""}
          placeholder="you@example.com"
          className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
        />

        <label className="mt-2 text-sm font-medium" htmlFor="password">
          {t.password}
        </label>
        {/* Not `required`: the same form feeds the magic-link button, which
            needs the email and nothing else. The endpoint validates instead. */}
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="rounded-xl border px-4 py-3 [border-color:var(--hairline)] [background:var(--bg)]"
        />

        <button
          type="submit"
          className="mt-4 rounded-xl px-4 py-3 font-semibold [color:var(--on-accent)] [background:var(--accent)]"
        >
          {t.signIn}
        </button>

        <button
          type="submit"
          formAction="/api/magic"
          formNoValidate
          className="mt-1 rounded-xl border px-4 py-3 text-sm [border-color:var(--hairline)]"
        >
          {t.emailLink}
        </button>
      </form>

      <p className="mt-8 text-xs [color:var(--muted)]">
        {t.passwordNote}
      </p>
    </main>
  );
}
