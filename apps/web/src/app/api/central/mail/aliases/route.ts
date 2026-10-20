import { NextResponse } from "next/server";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";
import {
  mailcowEnabled,
  listAliases,
  createAlias,
  deleteAlias,
  setAliasActive,
  MAIL_DOMAINS,
} from "@/lib/mailcow";

async function guard() {
  const admin = await getCentralAdmin();
  if (!admin)
    return { admin: null as null, res: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  if (!mailcowEnabled())
    return { admin, res: NextResponse.json({ success: false, error: "Mail API not configured" }, { status: 503 }) };
  return { admin, res: null as null };
}

export async function GET() {
  const { res } = await guard();
  if (res) return res;
  const r = await listAliases();
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 502 });
  return NextResponse.json({ success: true, aliases: r.data });
}

/** Create an alias/forwarder. Body: { localPart (or "*" for catch-all), domain, goto } */
export async function POST(req: Request) {
  const { admin, res } = await guard();
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  const domain = String(b.domain || MAIL_DOMAINS[0] || "").toLowerCase();
  if (!MAIL_DOMAINS.includes(domain))
    return NextResponse.json({ success: false, error: `Domain @${domain} is not managed here` }, { status: 400 });
  const lp = String(b.localPart || "").trim().toLowerCase();
  const address = lp === "*" || lp === "" ? `@${domain}` : `${lp.replace(/[^a-z0-9._-]/g, "")}@${domain}`;
  const goto = String(b.goto || "").trim();
  if (!goto) return NextResponse.json({ success: false, error: "Destination address required" }, { status: 400 });
  try {
    const r = await createAlias({ address, goto });
    if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 400 });
  }
  await logAudit(admin!, "alias.create", address, `→ ${goto}`);
  return NextResponse.json({ success: true });
}

/** Enable or disable an alias without deleting it. Body: { id, active } */
export async function PUT(req: Request) {
  const { admin, res } = await guard();
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!Number.isFinite(id)) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
  if (typeof b.active !== "boolean")
    return NextResponse.json({ success: false, error: "active must be a boolean" }, { status: 400 });

  // setAliasActive refuses ids outside MAIL_DOMAIN — this mailcow is shared.
  const r = await setAliasActive(id, b.active);
  if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 400 });
  await logAudit(admin!, b.active ? "alias.enable" : "alias.disable", String(id));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { admin, res } = await guard();
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!Number.isFinite(id)) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

  // deleteAlias resolves the id and refuses anything outside MAIL_DOMAIN, so a
  // crafted id cannot reach partner-one.example / partner-two.example / partner-three.example.
  const r = await deleteAlias(id);
  if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 400 });
  await logAudit(admin!, "alias.delete", String(id));
  return NextResponse.json({ success: true });
}
