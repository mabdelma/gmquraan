import { prisma } from "@app/db";
import { memberOr401 } from "@/lib/guard";
import { issueMagicLink } from "@/lib/auth";
import { isGroupWide } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * Invite somebody to the portal.
 *
 * Deliberately reuses the magic-link token rather than inventing a second
 * single-use credential. Two token systems is two expiry policies, two revoke
 * paths and two chances to get one of them wrong; an invitation is a sign-in
 * link with different words around it.
 *
 * The accounts have existed since the seed. Six of eight people had never
 * signed in because nobody had ever told them the portal was there — which is
 * the whole reason this exists.
 */
export async function POST(req: Request) {
  const auth = await memberOr401();
  if (!auth) return new Response(null, { status: 303, headers: { Location: "/" } });

  const url = new URL("/admin/people", req.url);
  const fail = (m: string) => {
    url.searchParams.set("error", m);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  };

  const mayInvite = isGroupWide(auth.member.role) || auth.member.departmentId === "PEO";
  if (!mayInvite) return fail("You cannot invite people.");

  const form = await req.formData();
  const memberId = String(form.get("memberId") || "");
  const all = String(form.get("all") || "") === "1";

  const targets = all
    ? await prisma.teamMember.findMany({
        where: { status: "ACTIVE", lastLoginAt: null },
        select: { id: true, email: true, name: true },
      })
    : await prisma.teamMember.findMany({
        where: { id: memberId, status: "ACTIVE" },
        select: { id: true, email: true, name: true },
      });

  if (targets.length === 0) {
    return fail(all ? "Everybody active has already signed in at least once." : "No such person.");
  }

  const base = process.env.PORTAL_URL || "https://workforce.example.com";
  let sent = 0;
  const failed: string[] = [];

  for (const t of targets) {
    const issued = await issueMagicLink(t.email);
    if (!issued) {
      failed.push(t.name);
      continue;
    }

    const link = `${base}/signin/${encodeURIComponent(issued.token)}`;
    const ok = await sendInvite(t.email, t.name, link, auth.member.name);
    if (!ok) {
      failed.push(t.name);
      continue;
    }

    await prisma.teamMember.update({
      where: { id: t.id },
      data: { invitedAt: new Date(), invitedById: auth.member.id },
    });
    sent++;
  }

  // Reported honestly rather than as a blanket success: an invitation that
  // silently failed to send is somebody who never arrives and nobody chases.
  if (failed.length) {
    url.searchParams.set(
      "error",
      `${sent} invitation(s) sent. Could not send to: ${failed.join(", ")} — check the mail service.`
    );
  } else {
    url.searchParams.set("done", `${sent} invitation(s) sent.`);
  }
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}

/**
 * Send through the notifications service.
 *
 * Returns whether it was accepted, so a failure is surfaced instead of being
 * swallowed — the caller reports which people could not be reached.
 */
async function sendInvite(to: string, name: string, link: string, invitedBy: string): Promise<boolean> {
  const base = process.env.NOTIFICATIONS_URL_INTERNAL;
  if (!base) {
    console.log(`[invite] no notifications service configured; link for ${to}: ${link}`);
    return false;
  }
  try {
    const res = await fetch(`${base}/v1/notifications/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to,
        template: "invite",
        locale: "en",
        fromName: "Unskinned",
        vars: {
          url: link,
          name,
          invitedBy,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch (e) {
    console.error("[invite] send failed", e);
    return false;
  }
}
