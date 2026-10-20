import { redirect } from "next/navigation";
import { getMember, getPendingMember } from "@/lib/session";
import { BrandLogo } from "@/components/BrandLogo";

export const dynamic = "force-dynamic";

/**
 * The second-factor challenge.
 *
 * Reached only with a session in PENDING_MFA, which authenticates nothing else.
 * Somebody who lands here without one is either already in or not signed in at
 * all, and is sent to the right place rather than shown an empty form.
 */
export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getMember()) redirect("/home");
  const pending = await getPendingMember();
  if (!pending) redirect("/");

  const sp = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <BrandLogo h={34} />
        <div className="text-2xl font-extrabold tracking-tight">
          GM<span className="[color:var(--accent-text)]">-OS</span>
        </div>
      </div>

      <h1 className="text-xl font-bold">Enter your authentication code</h1>
      <p className="mt-2 text-sm [color:var(--muted)]">
        Signing in as {pending.email}. Open your authenticator app and enter the current six-digit
        code, or use one of your recovery codes.
      </p>

      {sp.error && (
        <p role="alert" className="mt-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      <form action="/api/mfa" method="post" className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Code</span>
          <input
            name="token"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="123456"
            className="rounded-xl border px-4 py-3 font-mono text-lg tracking-widest [border-color:var(--hairline)] [background:var(--bg)]"
          />
        </label>
        <button className="rounded-xl px-5 py-3 font-semibold [color:var(--on-accent)] [background:var(--accent)]">
          Continue
        </button>
      </form>

      <form action="/api/logout" method="post" className="mt-6">
        <button className="text-sm [color:var(--muted)] underline">Sign in as somebody else</button>
      </form>
    </main>
  );
}
