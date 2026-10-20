import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { limited } from "@/lib/rate-limit";
import { tenantSlugProblem } from "@app/core";

export const dynamic = "force-dynamic";

/**
 * An enquiry from core.gmquran.com.
 *
 * Written straight to the lead register rather than forwarded to the engagement
 * service. The contact form forwards, and when that service is not running it
 * falls through to a console.log — which is fine for a marketing form and not
 * fine for somebody asking to buy the platform. A lead that only exists in a
 * container's stdout is a lead that has been lost.
 *
 * The workspace address is validated here even though nothing is provisioned
 * yet, so somebody is not told their chosen address is fine and then told
 * otherwise after a sales call.
 */
export async function POST(req: Request) {
  const tooMany = limited(req, "core-enquiry", 5, 60_000);
  if (tooMany) return tooMany;

  const form = await req.formData();
  const back = (params: Record<string, string>) => {
    const q = new URLSearchParams(params);
    return new NextResponse(null, {
      status: 303,
      headers: { Location: `/core?${q.toString()}#enquiry`, "cache-control": "no-store" },
    });
  };

  const name = String(form.get("name") || "").trim().slice(0, 120);
  const email = String(form.get("email") || "").trim().slice(0, 200);
  const company = String(form.get("company") || "").trim().slice(0, 160);
  const slug = String(form.get("slug") || "").trim().toLowerCase().slice(0, 40);
  const people = String(form.get("people") || "").trim().slice(0, 40);
  const message = String(form.get("message") || "").trim().slice(0, 4000);

  if (!name || !email || !company) return back({ error: "Name, work email and company are needed." });
  // Deliberately shallow: an address with an @ and a dot after it. Anything
  // stricter rejects real addresses, and the only proof that matters is a reply
  // arriving.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return back({ error: "Check the email address." });

  if (slug) {
    const problem = tenantSlugProblem(slug);
    if (problem) return back({ error: `Workspace address: ${problem}` });
  }

  const detail = [
    people ? `Around ${people} people.` : null,
    slug ? `Wants ${slug}.gmquran.com.` : null,
    message || null,
  ]
    .filter(Boolean)
    .join("\n\n");

  await prisma.lead.create({
    data: {
      name,
      email,
      company,
      message: detail || "Asked about GM-OS.",
      source: "core",
    },
  });

  return back({ sent: "1" });
}
