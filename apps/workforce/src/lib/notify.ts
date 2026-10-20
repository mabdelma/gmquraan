import { prisma } from "@app/db";

/**
 * Telling people things happened.
 *
 * The portal only worked if somebody remembered to visit it, and nobody did —
 * six of eight people had never signed in at all. Work reaching them by email
 * is the difference between a system people use and one they are told about
 * once.
 *
 * Every send is best-effort and never blocks the action that caused it. A
 * failed notification must not roll back an approved leave request; the work
 * is done either way, and the failure is logged rather than surfaced as though
 * the decision itself failed.
 */

type Notice = {
  to: string;
  subject: string;
  /** Plain sentences. This is read on a phone, in a hurry. */
  body: string;
  /** Where to go. Always absolute — an email has no origin. */
  link?: string;
};

function portalUrl(): string {
  return process.env.PORTAL_URL || "https://workforce.example.com";
}

async function send(n: Notice): Promise<boolean> {
  const base = process.env.NOTIFICATIONS_URL_INTERNAL;
  if (!base) {
    console.log(`[notify] not configured; would send to ${n.to}: ${n.subject}`);
    return false;
  }
  try {
    const res = await fetch(`${base}/v1/notifications/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to: n.to,
        template: "systemAlert",
        locale: "en",
        fromName: "Unskinned",
        vars: { subject: n.subject, message: n.body, url: n.link ?? portalUrl() },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[notify] ${n.to}: service returned ${res.status}`);
    return res.ok;
  } catch (e) {
    console.error("[notify] send failed", e);
    return false;
  }
}

/** Fire and forget — the caller has already done the work that matters. */
function background(p: Promise<unknown>) {
  void p.catch((e) => console.error("[notify] unhandled", e));
}

// ── The events worth an email ──────────────────────────────────────────────

export function taskAssigned(assigneeId: string, task: { id: string; ref: string; title: string }, by: string) {
  background(
    (async () => {
      const m = await prisma.teamMember.findUnique({
        where: { id: assigneeId },
        select: { email: true, name: true },
      });
      // Nobody is emailed about work they assigned to themselves.
      if (!m) return;
      await send({
        to: m.email,
        subject: `${task.ref} — assigned to you`,
        body: `${by} has assigned you "${task.title}". Open it in the portal to see what is expected and when it is due.`,
        link: `${portalUrl()}/tasks/${task.id}`,
      });
    })()
  );
}

export function leaveDecided(
  memberId: string,
  decision: "APPROVED" | "REJECTED",
  range: string,
  decidedBy: string,
  note?: string | null
) {
  background(
    (async () => {
      const m = await prisma.teamMember.findUnique({
        where: { id: memberId },
        select: { email: true },
      });
      if (!m) return;
      await send({
        to: m.email,
        subject: `Your leave request was ${decision.toLowerCase()}`,
        body:
          `${decidedBy} ${decision === "APPROVED" ? "approved" : "declined"} your leave for ${range}.` +
          (note ? ` They said: ${note}` : ""),
        link: `${portalUrl()}/leave`,
      });
    })()
  );
}

/**
 * An approval waiting on somebody.
 *
 * Sent to everyone who could actually decide it, minus whoever raised it —
 * asking somebody to approve their own request is noise, and the endpoint
 * would refuse it anyway. The AI-COMP request sat unseen for eight days
 * precisely because nothing told its approvers it existed.
 */
export function approvalRaised(request: {
  id: string;
  summary: string;
  minLevel: string;
  requestedByRef: string;
}) {
  background(
    (async () => {
      const order = ["A0", "A1", "A2", "A3", "A4"];
      const eligible = order.slice(order.indexOf(request.minLevel));
      const deciders = await prisma.teamMember.findMany({
        where: {
          status: "ACTIVE",
          approvalLevel: { in: eligible as never },
          id: { not: request.requestedByRef },
        },
        select: { email: true },
      });
      for (const d of deciders) {
        await send({
          to: d.email,
          subject: "Something needs your decision",
          body: `${request.summary}\n\nYou are one of the people who can decide this.`,
          link: `${portalUrl()}/approvals`,
        });
      }
    })()
  );
}

export function packItemVerified(memberId: string, name: string, outcome: "verified" | "rejected") {
  background(
    (async () => {
      const m = await prisma.teamMember.findUnique({ where: { id: memberId }, select: { email: true } });
      if (!m) return;
      await send({
        to: m.email,
        subject: outcome === "verified" ? `${name} accepted` : `${name} needs re-supplying`,
        body:
          outcome === "verified"
            ? `People have checked and accepted your ${name}. Nothing further is needed.`
            : `Your ${name} was not accepted and the requirement is open again. Upload a replacement in the portal.`,
        link: `${portalUrl()}/me`,
      });
    })()
  );
}
