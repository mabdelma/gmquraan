import { prisma } from "@app/db";
import { getCentralAdmin } from "@/lib/central-session";

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (headers: string[], rows: (unknown[])[]) =>
  [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");

/** Export central data as CSV. ?type=leads|transactions|payouts (central admin only). */
export async function GET(req: Request) {
  if (!(await getCentralAdmin())) return new Response("Forbidden", { status: 403 });
  const type = new URL(req.url).searchParams.get("type") || "leads";

  let csv = "";
  if (type === "leads") {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    csv = toCsv(
      ["name", "email", "company", "phone", "status", "source", "createdAt"],
      leads.map((l) => [l.name, l.email, l.company, l.phone, l.status, l.source, l.createdAt.toISOString()])
    );
  } else if (type === "transactions") {
    const txns = await prisma.paymentTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    csv = toCsv(
      ["id", "userId", "plan", "amountCents", "currency", "method", "status", "couponId", "createdAt"],
      txns.map((t) => [t.id, t.userId, t.plan, t.amount, t.currency, t.method, t.status, t.couponId, t.createdAt.toISOString()])
    );
  } else if (type === "payouts") {
    const payouts = await prisma.payout.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      include: { reseller: { select: { email: true } } }
    });
    csv = toCsv(
      ["id", "resellerEmail", "amountCents", "currency", "status", "paidAt", "createdAt"],
      payouts.map((p) => [p.id, p.reseller.email, p.amount, p.currency, p.status, p.paidAt?.toISOString(), p.createdAt.toISOString()])
    );
  } else {
    return new Response("Unknown export type", { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="app-${type}-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
