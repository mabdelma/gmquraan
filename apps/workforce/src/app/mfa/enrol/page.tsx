import { redirect } from "next/navigation";
import { prisma } from "@app/db";
import { getMember, getPendingMember } from "@/lib/session";
import { beginEnrolment } from "@/lib/mfa";
import { BrandLogo } from "@/components/BrandLogo";
import { mfaRequired, type ApprovalLevel, type GmRole } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Set up an authenticator.
 *
 * Reachable two ways, and the difference matters. Somebody who must enrol
 * arrives here with a PENDING_MFA session and cannot go anywhere else until
 * they finish. Somebody who is merely encouraged arrives signed in and can
 * leave whenever they like.
 */
export default async function EnrolPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; codes?: string }>;
}) {
  const sp = await searchParams;

  const member = await getMember();
  const pending = member ? null : await getPendingMember();
  if (!member && !pending) redirect("/");

  const id = member?.id ?? pending!.id;
  const email = member?.email ?? pending!.email;

  const row = await prisma.teamMember.findUnique({
    where: { id },
    select: { role: true, approvalLevel: true, grantedCapabilities: true, totpEnabled: true },
  });
  if (!row) redirect("/");

  const required = mfaRequired({
    role: row.role as GmRole,
    approvalLevel: row.approvalLevel as ApprovalLevel,
    grantedCapabilities: row.grantedCapabilities,
  });

  // Freshly confirmed — show the recovery codes once and nothing else.
  if (sp.codes) {
    const codes = sp.codes.split(",").filter(Boolean);
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo h={34} />
          <div className="text-2xl font-extrabold tracking-tight">
            GM<span className="[color:var(--accent-text)]">-OS</span>
          </div>
        </div>
        <h1 className="text-xl font-bold">Two-factor authentication is on</h1>
        <p className="mt-2 text-sm [color:var(--muted)]">
          Save these recovery codes somewhere safe. Each works once, and this is the only time they
          will be shown — they are stored hashed, so nobody can look them up for you later.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-2 rounded-2xl px-5 py-5 panel font-mono text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <a
          href="/home"
          className="mt-6 rounded-xl px-5 py-3 text-center font-semibold [color:var(--on-accent)] [background:var(--accent)]"
        >
          I have saved them
        </a>
      </main>
    );
  }

  if (row.totpEnabled && !sp.error) redirect("/home");

  const { secret, uri } = await beginEnrolment(id, email);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex items-center gap-3">
        <BrandLogo h={34} />
        <div className="text-2xl font-extrabold tracking-tight">
          GM<span className="[color:var(--accent-text)]">-OS</span>
        </div>
      </div>

      <h1 className="text-xl font-bold">Set up two-factor authentication</h1>
      <p className="mt-2 text-sm [color:var(--muted)]">
        {required
          ? "Your account can approve things or reaches across the whole group, so a second factor is required before you can continue."
          : "Not required for your account, but worth ten minutes of your time."}
      </p>

      {sp.error && (
        <p role="alert" className="mt-6 rounded-2xl px-5 py-4 text-sm panel [color:var(--danger)]">
          {sp.error}
        </p>
      )}

      <ol className="mt-6 flex flex-col gap-4 text-sm">
        <li>
          <span className="font-semibold">1.</span> Install an authenticator app — Google
          Authenticator, Microsoft Authenticator, 1Password and Bitwarden all work.
        </li>
        <li>
          <span className="font-semibold">2.</span> Scan this with the app:
          {/* White plate under the code on purpose. A QR tinted to match a dark
              page is a QR that scanners refuse. */}
          <span className="mt-3 block w-fit rounded-2xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/mfa/enrol/qr"
              alt="QR code holding your two-factor setup key"
              width={192}
              height={192}
              className="block h-48 w-48"
            />
          </span>
          <span className="mt-4 block text-xs [color:var(--muted)]">
            On this device instead?{" "}
            <a href={uri} className="[color:var(--accent-text)]">
              Open it directly in your authenticator
            </a>
            , or type the key in by hand:
          </span>
          <code className="mt-2 block break-all rounded-xl px-4 py-3 panel font-mono text-xs">{secret}</code>
        </li>
        <li>
          <span className="font-semibold">3.</span> Enter the six-digit code it shows.
        </li>
      </ol>

      <form action="/api/mfa/enrol" method="post" className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Code from your app</span>
          <input
            name="token"
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="123456"
            className="rounded-xl border px-4 py-3 font-mono text-lg tracking-widest [border-color:var(--hairline)] [background:var(--bg)]"
          />
        </label>
        <button className="rounded-xl px-5 py-3 font-semibold [color:var(--on-accent)] [background:var(--accent)]">
          Turn on two-factor authentication
        </button>
      </form>

      {!required && (
        <a href="/home" className="mt-6 text-center text-sm [color:var(--muted)] underline">
          Not now
        </a>
      )}
    </main>
  );
}
