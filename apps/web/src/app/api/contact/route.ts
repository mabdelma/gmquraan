import { NextResponse } from "next/server";
import { limited } from "@/lib/rate-limit";
import { notifyAdmins } from "@/lib/push";

/**
 * Contact-form lead capture. Forwards to the engagement service
 * (POST /v1/engagement/leads) when ENGAGEMENT_URL_INTERNAL is set; otherwise
 * logs and accepts (so the marketing site works before engagement is wired up).
 */
export async function POST(req: Request) {
  const tooMany = limited(req, "contact", 5, 60_000);
  if (tooMany) return tooMany;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  if (!name || !email || !message) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  const base = process.env.ENGAGEMENT_URL_INTERNAL;
  if (base) {
    try {
      await fetch(`${base}/v1/engagement/leads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: body.company ?? null,
          message,
          source: "contact_form",
        }),
      });
    } catch {
      // fall through — don't lose the lead because the service is momentarily down
    }
  } else {
    console.log("[contact] lead captured (no engagement service):", { name, email });
  }

  // Best-effort push to admins (no-op until push creds are configured).
  void notifyAdmins({ title: "New contact message", body: `${name} <${email}>`, data: { type: "contact", url: "/central/leads" } });

  return NextResponse.json({ success: true });
}
