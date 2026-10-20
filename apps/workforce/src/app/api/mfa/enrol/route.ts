import { getMember, getPendingMember } from "@/lib/session";
import { completeSession, confirmEnrolment } from "@/lib/mfa";

export const dynamic = "force-dynamic";

/**
 * Finish enrolment.
 *
 * Enrolling from a half-finished session also completes it — proving the
 * authenticator works is a stronger demonstration than the code they were
 * about to be asked for, so asking again immediately would be theatre.
 */
export async function POST(req: Request) {
  const member = await getMember();
  const pending = member ? null : await getPendingMember();
  if (!member && !pending) return new Response(null, { status: 303, headers: { Location: "/" } });

  const id = member?.id ?? pending!.id;
  const form = await req.formData();
  const token = String(form.get("token") || "").trim();

  const result = await confirmEnrolment(id, token);
  if (!result.ok) {
    const url = new URL("/mfa/enrol", req.url);
    url.searchParams.set("error", result.error);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  if (pending) await completeSession(pending.tokenHash);

  const url = new URL("/mfa/enrol", req.url);
  url.searchParams.set("codes", result.recoveryCodes.join(","));
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}
