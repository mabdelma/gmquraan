import { NextResponse } from "next/server";
import { getCentralAdmin } from "@/lib/central-session";
import { logAudit } from "@/lib/audit";
import { setMailboxPhoto } from "@/lib/settings";
import {
  mailcowEnabled,
  listMailboxes,
  createMailbox,
  setMailboxPassword,
  setMailboxActive,
  editMailbox,
  deleteMailbox,
  MAIL_DOMAINS,
} from "@/lib/mailcow";

async function guard() {
  const admin = await getCentralAdmin();
  if (!admin) return { admin: null as null, res: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  if (!mailcowEnabled())
    return { admin, res: NextResponse.json({ success: false, error: "Mail API not configured" }, { status: 503 }) };
  return { admin, res: null as null };
}

/** List mailboxes. */
export async function GET() {
  const { res } = await guard();
  if (res) return res;
  const r = await listMailboxes();
  // 502: the console is fine, the mail server is not — don't report an empty
  // domain when we simply could not reach it.
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 502 });
  return NextResponse.json({ success: true, mailboxes: r.data });
}

/** Create a mailbox. */
export async function POST(req: Request) {
  const { admin, res } = await guard();
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  if (!b.password || String(b.password).length < 8)
    return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
  const domain = String(b.domain || MAIL_DOMAINS[0] || "").toLowerCase();
  if (!MAIL_DOMAINS.includes(domain))
    return NextResponse.json({ success: false, error: `Domain @${domain} is not managed here` }, { status: 400 });
  const email = `${String(b.localPart || "").trim().toLowerCase()}@${domain}`;
  const r = await createMailbox({
    localPart: String(b.localPart || ""),
    name: String(b.name || ""),
    password: String(b.password),
    quotaMb: Math.max(64, Math.round(Number(b.quotaMb) || 2048)),
    domain,
  });
  if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 400 });
  if (b.photo !== undefined) await setMailboxPhoto(email, String(b.photo || ""));
  await logAudit(admin!, "mail.create", email);
  return NextResponse.json({ success: true });
}

/** Reset password, or suspend/enable a mailbox. */
export async function PUT(req: Request) {
  const { admin, res } = await guard();
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "");
  try {
    if (typeof b.active === "boolean") {
      const r = await setMailboxActive(email, b.active);
      if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 400 });
      await logAudit(admin!, b.active ? "mail.enable" : "mail.suspend", email);
      return NextResponse.json({ success: true });
    }
    // Edit display name, quota, and/or photo.
    if (b.name !== undefined || b.quotaMb !== undefined || b.photo !== undefined) {
      if (b.name !== undefined || b.quotaMb !== undefined) {
        const r = await editMailbox(email, {
          name: b.name !== undefined ? String(b.name) : undefined,
          quotaMb: b.quotaMb !== undefined ? Number(b.quotaMb) : undefined,
        });
        if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 400 });
      }
      if (b.photo !== undefined) await setMailboxPhoto(email, String(b.photo || ""));
      await logAudit(admin!, "mail.edit", email);
      return NextResponse.json({ success: true });
    }
    if (!b.password || String(b.password).length < 8)
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
    const r = await setMailboxPassword(email, String(b.password));
    if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 400 });
  }
  await logAudit(admin!, "mail.password", email);
  return NextResponse.json({ success: true });
}

/** Delete a mailbox. */
export async function DELETE(req: Request) {
  const { admin, res } = await guard();
  if (res) return res;
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "");
  try {
    const r = await deleteMailbox(email);
    if (!r.ok) return NextResponse.json({ success: false, error: r.message }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 400 });
  }
  await logAudit(admin!, "mail.delete", email);
  return NextResponse.json({ success: true });
}
