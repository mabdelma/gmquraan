import { NextResponse } from "next/server";
import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";
import { notifyUser } from "@/lib/push";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Admin prices & sends a quote to the client (status -> SENT), or declines it. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCentralAdmin();
  if (!admin) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const quote = await prisma.quote.findUnique({ where: { id }, select: { clientId: true, title: true } });
  if (!quote) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (b.amountCents !== undefined) data.amountCents = b.amountCents === null ? null : Math.max(0, Math.round(Number(b.amountCents)));
  if (b.currency !== undefined) data.currency = String(b.currency || "EUR").slice(0, 3).toUpperCase();
  if (b.note !== undefined) data.note = b.note ? String(b.note).slice(0, 2000) : null;
  if (b.status !== undefined && ["SENT", "DECLINED", "REQUESTED"].includes(String(b.status))) data.status = String(b.status);

  await prisma.quote.update({ where: { id }, data: data as never });

  if (data.status === "SENT") {
    void notifyUser(quote.clientId, {
      title: "You have a new quote",
      body: quote.title,
      data: { type: "quote", url: "/central/quotes" },
    });
  }
  await logAudit(admin, "quote.update", quote.title, Object.keys(data).join(", "));
  return NextResponse.json({ success: true });
}
