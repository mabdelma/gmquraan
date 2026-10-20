import { issueMagicLink } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Request a sign-in link.
 *
 * Always reports the same thing whether or not the address belongs to anyone,
 * so the form cannot be used to enumerate who works here. The link itself is
 * mailed through the notifications service; if that is unreachable the failure
 * is logged and the visitor still sees the neutral message, because telling
 * them "no such member" would defeat the point.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim();

  const url = new URL("/", req.url);
  if (!email) {
    url.searchParams.set("error", "Enter your email address first, then ask for a link.");
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  const issued = await issueMagicLink(email);
  if (issued) {
    const base = process.env.PORTAL_URL || "https://workforce.example.com";
    const link = `${base}/signin/${encodeURIComponent(issued.token)}`;
    await sendLink(issued.email, link);
  }

  url.searchParams.set("sent", "1");
  url.searchParams.set("email", email);
  return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
}

async function sendLink(to: string, url: string) {
  const base = process.env.NOTIFICATIONS_URL_INTERNAL;
  if (!base) {
    // Local development without the notifications service running.
    console.log(`[workforce] sign-in link for ${to}: ${url}`);
    return;
  }
  try {
    await fetch(`${base}/v1/notifications/email/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, template: "workforceSignIn", locale: "en", vars: { url } }),
    });
  } catch (e) {
    console.error("[workforce] sign-in link delivery failed", e);
  }
}
